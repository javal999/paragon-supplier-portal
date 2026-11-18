import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { isSourceFile, isTestFile, scriptKindOf } from '@test/sourceFiles';

// ─────────────────────────────────────────────────────────────────────────────
// BL-50 · EVERY DEADLINE IN THE HUB READS THE HUB'S CALENDAR (§3.4, Q-18).
//
// ⚠️ **THE POPULATION IS DERIVED FROM THE AST, NEVER FROM A LIST.** A deadline
// module that counted working days on the frozen base calendar would ignore
// every ruling the administrator makes — two calendars, which is what Q-18
// ruled out — and nothing on screen would say so. So this gate walks every
// non-test module under `src/` and derives two populations:
//
//   1. WORKING-DAY ARITHMETIC — every call of the calendar functions
//      (`addWorkingDays`, `nextWorkingInstant`, `documentInstant`,
//      `isWorkingDay`) outside the arithmetic module itself. EVERY call must
//      pass a calendar argument (an omitted one falls back to the frozen base),
//      every `WorkingCalendar` parameter default must be `hubWorkingCalendar()`,
//      and the frozen base may be NAMED only by the store that composes it.
//
//   2. CALENDAR-DAY DEADLINES — day arithmetic (`DAY_MS`, `86_400_000`,
//      `addDays(…)`, `daysBetween(…)` …) inside a statement or function whose
//      identifiers say deadline (due, deadline, overdue, expiry, grace, missed,
//      reminder, late, escalat…). These count CALENDAR days on purpose or by
//      mistake, and the gate cannot tell which — so each one is pinned in
//      `CALENDAR_DAY_ALLOWLIST` WITH ITS REASON, bilaterally: a new one is red
//      until somebody decides, and a removed one is red until its row goes.
//
// ⚠️ **WHY THE AST AND NOT A LINE GREP (rule 1, measured):** the line grep that
// opened BL-50 missed `poResponseProjection.responseDeadline`, whose arithmetic
// line carries no deadline word — the word is in the function name, three lines
// up. The enclosing FUNCTION NAME is read here for exactly that reason.
// ─────────────────────────────────────────────────────────────────────────────

const SRC = path.resolve(__dirname, '..');
const ARITHMETIC_MODULE = 'lib/workingCalendar.js';
const CALENDAR_STORE = 'services/transitions/workingCalendarStore.js';

/**
 * The calendar functions, and the argument count that includes the calendar.
 * @type {Readonly<Record<string, number>>}
 */
const CALENDAR_FNS = {
  addWorkingDays: 3,
  nextWorkingInstant: 2,
  documentInstant: 2,
  isWorkingDay: 2
};
/**
 * Own-key membership (`Object.hasOwn` needs lib es2022; the spec tsconfig is older).
 * @param {object} o
 * @param {string} k
 * @returns {boolean}
 */
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const FROZEN_BASE = ['DEFAULT_WORKING_CALENDAR', 'INDONESIA_HOLIDAYS_2026'];

const DAY_CONSTANTS = /^(DAY_MS|MS_PER_DAY)$/;
const DAY_CALLS = new Set(['addDays', 'addDaysIso', 'addDay', 'daysBetween', 'daysFrom']);
const DEADLINE_WORDS = new Set([
  'due',
  'deadline',
  'deadlines',
  'overdue',
  'expiry',
  'expires',
  'expired',
  'expiring',
  'escalate',
  'escalated',
  'escalation',
  'grace',
  'missed',
  'remind',
  'reminder',
  'late',
  'lateness',
  'outstanding'
]);

/**
 * @param {string} rel
 * @param {string} text
 * @returns {ts.SourceFile}
 */
const parse = (rel, text) =>
  ts.createSourceFile(rel, text, ts.ScriptTarget.ES2020, true, scriptKindOf(rel));

/** @returns {ReadonlyMap<string, ts.SourceFile>} */
function sources() {
  const out = /** @type {Map<string, ts.SourceFile>} */ (new Map());
  /**
   * @param {string} dir
   * @returns {void}
   */
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'test' && e.name !== '__tests__') walk(p);
        continue;
      }
      if (!isSourceFile(e.name) || isTestFile(e.name)) continue;
      const rel = path.relative(SRC, p).split(path.sep).join('/');
      out.set(rel, parse(rel, fs.readFileSync(p, 'utf8')));
    }
  };
  walk(SRC);
  return out;
}

/**
 * Split identifiers and words into lower-case tokens (camelCase and SNAKE_CASE).
 * @param {string} text
 * @returns {string[]}
 */
const tokens = (text) =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());

/**
 * The name of the function a node sits in (declaration, method, or const = arrow).
 * @param {ts.Node} node
 * @returns {string}
 */
function enclosingFunctionName(node) {
  for (let n = /** @type {ts.Node | undefined} */ (node.parent); n; n = n.parent) {
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name)
      return n.name.getText();
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent) {
      const p = n.parent;
      if (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p))
        return p.name.getText();
    }
  }
  return '(module)';
}

/**
 * The statement-level node a node belongs to.
 * @param {ts.Node} node
 * @returns {ts.Node}
 */
function enclosingStatement(node) {
  /** @type {ts.Node} */
  let n = node;
  while (
    n.parent &&
    !ts.isBlock(n.parent) &&
    !ts.isSourceFile(n.parent) &&
    !ts.isCaseClause(n.parent)
  ) {
    if (ts.isArrowFunction(n.parent) && n.parent.body === n) return n;
    n = n.parent;
  }
  return n;
}

/**
 * `workingDayCalls`:  `file#function` → the calls that carry (or omit) the calendar.
 *
 * @typedef {{
 *   readonly workingDayCalls: { key: string; fn: string; args: number }[];
 *   readonly calendarDefaults: { key: string; initializer: string }[];
 *   readonly frozenRefs: { file: string; name: string }[];
 *   readonly calendarDaySites: Set<string>;
 * }} Derived
 */

// ⚠️ Membership is an OWN-key check, never `in`: `in` walks the prototype chain,
// so a call to a local `valueOf(…)` or `toString(…)` counted as calendar
// arithmetic (hit in RFx D3, PR #67). Probed below.
/**
 * @param {ReadonlyMap<string, ts.SourceFile>} [files]
 * @returns {Derived}
 */
function derive(files = sources()) {
  /** @type {Derived} */
  const out = {
    workingDayCalls: [],
    calendarDefaults: [],
    frozenRefs: [],
    calendarDaySites: new Set()
  };
  for (const [file, sf] of files) {
    /**
     * @param {ts.Node} node
     * @returns {void}
     */
    const visit = (node) => {
      if (file !== ARITHMETIC_MODULE) {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          hasOwn(CALENDAR_FNS, node.expression.text)
        ) {
          out.workingDayCalls.push({
            key: `${file}#${enclosingFunctionName(node)}`,
            fn: node.expression.text,
            args: node.arguments.length
          });
        }
        // The parameter's type in EITHER form: the TS annotation (`cal:
        // WorkingCalendar = …`) or, once converted, its JSDoc `@param
        // {WorkingCalendar} [cal]` (ts.getJSDocType). Phase 7 converted the
        // last TS defaults, which emptied the TS-only population.
        const paramType = ts.isParameter(node) ? (node.type ?? ts.getJSDocType(node)) : undefined;
        if (
          ts.isParameter(node) &&
          paramType &&
          paramType.getText() === 'WorkingCalendar' &&
          node.initializer
        ) {
          out.calendarDefaults.push({
            key: `${file}#${enclosingFunctionName(node.name)}`,
            initializer: node.initializer.getText()
          });
        }
        if (
          ts.isIdentifier(node) &&
          FROZEN_BASE.includes(node.text) &&
          !ts.isImportSpecifier(node.parent)
        ) {
          out.frozenRefs.push({ file, name: node.text });
        }
      }
      const isDayArithmetic =
        (ts.isIdentifier(node) &&
          DAY_CONSTANTS.test(node.text) &&
          !ts.isVariableDeclaration(node.parent)) ||
        (ts.isNumericLiteral(node) &&
          Number(node.text.replace(/_/g, '')) === 86_400_000 &&
          !ts.isVariableDeclaration(node.parent)) ||
        (ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          DAY_CALLS.has(node.expression.text));
      if (isDayArithmetic) {
        const fnName = enclosingFunctionName(node);
        const words = new Set([...tokens(enclosingStatement(node).getText()), ...tokens(fnName)]);
        if ([...words].some((w) => DEADLINE_WORDS.has(w)))
          out.calendarDaySites.add(`${file}#${fnName}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return out;
}

const D = derive();

// ─── The reasoned allowlist of CALENDAR-day deadline arithmetic ──────────────
//
// Every row is a place that counts days WITHOUT the working calendar, and says
// why that is right. A row may only leave by its site leaving.
/** @type {Readonly<Record<string, string>>} */
const CALENDAR_DAY_ALLOWLIST = {
  'services/delivery/fulfillment.js#statusForUnmatched':
    'CR-07 — "Missed: nothing received 3 days after the need date": a physical delivery window in calendar days, not a response deadline.',
  'services/transitions/callOffRules.js#deliveryResults':
    'CR-07 again — the call-off side of the same missed-delivery window (calendar days).',
  'services/transitions/callOffRules.js#checkTolerance':
    'CR-05 — how many calendar days a confirmed delivery date sits before or after the need date: a comparison of two dates, not a deadline anybody answers.',
  'services/transitions/callOffRules.js#isDueWithoutHeadsUp':
    'CR-09 — the reminder 7 calendar days before a need date when no heads-up exists: counted back from a delivery date.',
  'services/data/invoiceProjection.js#daysOutstanding':
    'CR-14 — days outstanding = today minus the due date: a payment term counted in calendar days.',
  'services/data/mock/MockCommandService.js#create':
    'CR-14 — invoice due date = submission + 30 days, stamped when an invoice is created: a payment term, calendar days.',
  'services/data/mock/MockCommandService.js#applyTransition':
    'CR-14 — the same 30-day payment term, restamped when a corrected invoice is resubmitted.',
  'services/data/complianceProjection.js#daysRemaining':
    'Days until a certificate expires — a validity period, not a response deadline.',
  'services/transitions/rfxRules.js#daysToDeadline':
    'An RFI/RFQ/RFP deadline is a DATE THE BUYER SETS on the event (CE-07); nothing computes it, so no calendar ruling can move it. This is a calendar-day countdown to that chosen date for the "closing soon" band.',
  'services/sdc/consolidation.js#chaseList':
    "The superseded SDC design's interim chase threshold (RESPONSE_DUE_DAYS) on /buyer/chase, a route hidden from the MVP menu (NV-06) and replaced by REQ-E06-03. No Supplier Hub rule defines it, so changing it would invent one. Reported as a follow-up rather than left silently.",
  'services/engine/requirement.js#openReceipts':
    'REQ-E14-03 — an open PO line whose confirmed delivery date passed more than the grace window (14 calendar days) is treated as closed in netting: a physical delivery window counted in calendar days, like CR-07, not a response deadline anybody answers.',
  'services/data/mock/rescheduleReadModel.js#callOffOrderLines':
    'REQ-E14-13 — the same E14-03 grace window applied to an open call-off (ENG-B10): a delivery date passed more than 14 calendar days ago is treated as closed. A physical delivery window, not a response deadline.',
  'pages-v2/home/taskSeverity.js#assess':
    'SC-01 Home severity — it computes no deadline. It reads deadlines the lanes already computed (on the hub calendar where they are working-day deadlines) and counts how many calendar days ago they passed, and how many calendar days a stock-out precedes today + the supplier lead time. Cover and lead time are calendar days (CR-01 / CR-24), so the ranking compares like with like.'
};

describe('BL-50 · the deadline population reads the hub calendar', () => {
  it('POPULATION — the derivation found what it must find, and not what it must not (rule 1)', () => {
    const readers = new Set(D.workingDayCalls.map((c) => c.key.split('#')[0]));
    // Known-true members: the three response deadlines of §3.4.
    expect(readers).toContain('services/transitions/forecastRules.js');
    expect(readers).toContain('services/data/poResponseProjection.js');
    expect(readers).toContain('services/transitions/callOffRules.js');
    // Known-false: the invoice projection counts calendar days (CR-14).
    expect(readers).not.toContain('services/data/invoiceProjection.js');
    // And the calendar-day side has both a known member and a known non-member.
    expect(D.calendarDaySites).toContain('services/delivery/fulfillment.js#statusForUnmatched');
    expect(D.calendarDaySites).not.toContain(
      'services/data/poResponseProjection.js#responseDeadline'
    );
    // BL-48 — the commitment deadline no longer counts calendar days.
    expect(D.calendarDaySites).not.toContain(
      'services/transitions/forecastRules.js#commitmentDueAt'
    );
  });

  it('PROBE — a prototype-chain name is not a calendar function; a real one is', () => {
    const probe = derive(
      new Map([
        [
          'probe/probe.ts',
          parse(
            'probe/probe.ts',
            [
              'const valueOf = (ref: string, point: number) => point;',
              "export function priced() { return valueOf('r', 1) + toString(1) + hasOwnProperty(2) + constructor(3); }",
              'export function due() { return addWorkingDays(now, 3, cal); }'
            ].join('\n')
          )
        ]
      ])
    );
    const fns = probe.workingDayCalls.map((c) => `${c.key} → ${c.fn}`);
    // Known-bad: Object.prototype names must NOT count.
    for (const name of ['valueOf', 'toString', 'hasOwnProperty', 'constructor']) {
      expect(
        fns.some((f) => f.endsWith(`→ ${name}`)),
        name
      ).toBe(false);
    }
    // Known-good: the real calendar call MUST count.
    expect(fns).toEqual(['probe/probe.ts#due → addWorkingDays']);
  });

  it('the modules doing working-day arithmetic are exactly these (the derived list, pinned)', () => {
    const readers = [...new Set(D.workingDayCalls.map((c) => c.key.split('#')[0]))].sort();
    expect(readers).toEqual([
      'services/data/poResponseProjection.js',
      'services/transitions/callOffRules.js',
      'services/transitions/forecastRules.js',
      // AIB-2 BR-05 (BL-350) — the Expeditor's acknowledgment is due within
      // one working day of the inbound.
      'services/transitions/inboundRules.js',
      // PEX-7 — the PO On Hold grace period counts working days (owner, 2026-11-09).
      'services/transitions/poOnHold.js',
      'services/transitions/stockMovement.js',
      // Material B1 — the weekly stock update cutoff moves off a non-working day (MR-1 BR-03).
      // Material B3 — an API week is judged on the cycle's working days (MR-2 BR-02).
      'services/transitions/updateCompliance.js',
      'services/transitions/updateCycle.js',
      'services/transitions/workingCalendarStore.js',
      // BL-283 — a month's capacity is spread to its weeks by working days (PEX-1 BR-02).
      'services/transitions/zoneCapacityLeftRules.js'
    ]);
  });

  it('EVERY working-day call passes a calendar — an omitted one would count on the frozen base', () => {
    const omitted = D.workingDayCalls
      .filter((c) => c.args < CALENDAR_FNS[c.fn])
      .map((c) => `${c.key} → ${c.fn}(…${c.args} args)`);
    expect(omitted, "working-day arithmetic that ignores the administrator's rulings").toEqual([]);
  });

  it('EVERY WorkingCalendar parameter defaults to the hub calendar', () => {
    expect(D.calendarDefaults.length, 'the parameter defaults were found').toBeGreaterThan(0);
    const wrong = D.calendarDefaults.filter((d) => d.initializer !== 'hubWorkingCalendar()');
    expect(wrong, 'a deadline defaulting to a calendar other than the one in force').toEqual([]);
  });

  it('the frozen base calendar is named only by the store that composes the hub calendar', () => {
    const outside = D.frozenRefs
      .filter((r) => r.file !== CALENDAR_STORE)
      .map((r) => `${r.file}: ${r.name}`);
    expect(outside).toEqual([]);
    expect(
      D.frozenRefs.some((r) => r.file === CALENDAR_STORE),
      'control: the store does name it'
    ).toBe(true);
  });

  it('CALENDAR-day deadline arithmetic is exactly the reasoned allowlist, both ways', () => {
    const derived = [...D.calendarDaySites].sort();
    const unexplained = derived.filter((k) => !hasOwn(CALENDAR_DAY_ALLOWLIST, k));
    const stale = Object.keys(CALENDAR_DAY_ALLOWLIST).filter((k) => !D.calendarDaySites.has(k));
    expect(unexplained, 'a deadline counting calendar days with no stated reason').toEqual([]);
    expect(stale, 'an allowlist row whose site no longer exists').toEqual([]);
  });
});
