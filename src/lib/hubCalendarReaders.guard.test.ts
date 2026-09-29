import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

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
const ARITHMETIC_MODULE = 'lib/workingCalendar.ts';
const CALENDAR_STORE = 'services/transitions/workingCalendarStore.ts';

/** The calendar functions, and the argument count that includes the calendar. */
const CALENDAR_FNS: Readonly<Record<string, number>> = {
  addWorkingDays: 3,
  nextWorkingInstant: 2,
  documentInstant: 2,
  isWorkingDay: 2,
};
const FROZEN_BASE = ['DEFAULT_WORKING_CALENDAR', 'INDONESIA_HOLIDAYS_2026'];

const DAY_CONSTANTS = /^(DAY_MS|MS_PER_DAY)$/;
const DAY_CALLS = new Set(['addDays', 'addDaysIso', 'addDay', 'daysBetween', 'daysFrom']);
const DEADLINE_WORDS = new Set([
  'due', 'deadline', 'deadlines', 'overdue', 'expiry', 'expires', 'expired', 'expiring',
  'escalate', 'escalated', 'escalation', 'grace', 'missed', 'remind', 'reminder', 'late',
  'lateness', 'outstanding',
]);

function sources(): ReadonlyMap<string, ts.SourceFile> {
  const out = new Map<string, ts.SourceFile>();
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'test' && e.name !== '__tests__') walk(p);
        continue;
      }
      if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name) || /\.d\.ts$/.test(e.name)) continue;
      const rel = path.relative(SRC, p).split(path.sep).join('/');
      const text = fs.readFileSync(p, 'utf8');
      out.set(rel, ts.createSourceFile(rel, text, ts.ScriptTarget.ES2020, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
    }
  };
  walk(SRC);
  return out;
}

/** Split identifiers and words into lower-case tokens (camelCase and SNAKE_CASE). */
const tokens = (text: string): string[] =>
  text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());

/** The name of the function a node sits in (declaration, method, or const = arrow). */
function enclosingFunctionName(node: ts.Node): string {
  for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name) return n.name.getText();
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent) {
      const p = n.parent;
      if (ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) return p.name.getText();
    }
  }
  return '(module)';
}

/** The statement-level node a node belongs to. */
function enclosingStatement(node: ts.Node): ts.Node {
  let n: ts.Node = node;
  while (n.parent && !ts.isBlock(n.parent) && !ts.isSourceFile(n.parent) && !ts.isCaseClause(n.parent)) {
    if (ts.isArrowFunction(n.parent) && n.parent.body === n) return n;
    n = n.parent;
  }
  return n;
}

interface Derived {
  /** `file#function` → the calls that carry (or omit) the calendar. */
  readonly workingDayCalls: { key: string; fn: string; args: number }[];
  readonly calendarDefaults: { key: string; initializer: string }[];
  readonly frozenRefs: { file: string; name: string }[];
  readonly calendarDaySites: Set<string>;
}

function derive(): Derived {
  const out: Derived = { workingDayCalls: [], calendarDefaults: [], frozenRefs: [], calendarDaySites: new Set() };
  for (const [file, sf] of sources()) {
    const visit = (node: ts.Node): void => {
      if (file !== ARITHMETIC_MODULE) {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text in CALENDAR_FNS) {
          out.workingDayCalls.push({
            key: `${file}#${enclosingFunctionName(node)}`,
            fn: node.expression.text,
            args: node.arguments.length,
          });
        }
        if (
          ts.isParameter(node) &&
          node.type &&
          node.type.getText() === 'WorkingCalendar' &&
          node.initializer
        ) {
          out.calendarDefaults.push({ key: `${file}#${enclosingFunctionName(node.name)}`, initializer: node.initializer.getText() });
        }
        if (ts.isIdentifier(node) && FROZEN_BASE.includes(node.text) && !ts.isImportSpecifier(node.parent)) {
          out.frozenRefs.push({ file, name: node.text });
        }
      }
      const isDayArithmetic =
        (ts.isIdentifier(node) && DAY_CONSTANTS.test(node.text) && !ts.isVariableDeclaration(node.parent)) ||
        (ts.isNumericLiteral(node) && Number(node.text.replace(/_/g, '')) === 86_400_000 && !ts.isVariableDeclaration(node.parent)) ||
        (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && DAY_CALLS.has(node.expression.text));
      if (isDayArithmetic) {
        const fnName = enclosingFunctionName(node);
        const words = new Set([...tokens(enclosingStatement(node).getText()), ...tokens(fnName)]);
        if ([...words].some((w) => DEADLINE_WORDS.has(w))) out.calendarDaySites.add(`${file}#${fnName}`);
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
const CALENDAR_DAY_ALLOWLIST: Readonly<Record<string, string>> = {
  'services/delivery/fulfillment.ts#statusForUnmatched':
    'CR-07 — "Missed: nothing received 3 days after the need date": a physical delivery window in calendar days, not a response deadline.',
  'services/transitions/callOffRules.ts#deliveryResults':
    'CR-07 again — the call-off side of the same missed-delivery window (calendar days).',
  'services/transitions/callOffRules.ts#checkTolerance':
    'CR-05 — how many calendar days a confirmed delivery date sits before or after the need date: a comparison of two dates, not a deadline anybody answers.',
  'services/transitions/callOffRules.ts#isDueWithoutHeadsUp':
    'CR-09 — the reminder 7 calendar days before a need date when no heads-up exists: counted back from a delivery date.',
  'services/data/invoiceProjection.ts#daysOutstanding':
    'CR-14 — days outstanding = today minus the due date: a payment term counted in calendar days.',
  'services/data/mock/MockCommandService.ts#create':
    'CR-14 — invoice due date = submission + 30 days, stamped when an invoice is created: a payment term, calendar days.',
  'services/data/mock/MockCommandService.ts#applyTransition':
    'CR-14 — the same 30-day payment term, restamped when a corrected invoice is resubmitted.',
  'services/data/complianceProjection.ts#daysRemaining':
    'Days until a certificate expires — a validity period, not a response deadline.',
  'services/transitions/rfxRules.ts#daysToDeadline':
    'An RFI/RFQ/RFP deadline is a DATE THE BUYER SETS on the event (CE-07); nothing computes it, so no calendar ruling can move it. This is a calendar-day countdown to that chosen date for the "closing soon" band.',
  'services/sdc/consolidation.ts#chaseList':
    "The superseded SDC design's interim chase threshold (RESPONSE_DUE_DAYS) on /buyer/chase, a route hidden from the MVP menu (NV-06) and replaced by REQ-E06-03. No Supplier Hub rule defines it, so changing it would invent one. Reported as a follow-up rather than left silently.",
  'services/engine/requirement.ts#openReceipts':
    'REQ-E14-03 — an open PO line whose confirmed delivery date passed more than the grace window (14 calendar days) is treated as closed in netting: a physical delivery window counted in calendar days, like CR-07, not a response deadline anybody answers.',
  'services/data/mock/rescheduleReadModel.ts#callOffOrderLines':
    'REQ-E14-13 — the same E14-03 grace window applied to an open call-off (ENG-B10): a delivery date passed more than 14 calendar days ago is treated as closed. A physical delivery window, not a response deadline.',
};

describe('BL-50 · the deadline population reads the hub calendar', () => {
  it('POPULATION — the derivation found what it must find, and not what it must not (rule 1)', () => {
    const readers = new Set(D.workingDayCalls.map((c) => c.key.split('#')[0]));
    // Known-true members: the three response deadlines of §3.4.
    expect(readers).toContain('services/transitions/forecastRules.ts');
    expect(readers).toContain('services/data/poResponseProjection.ts');
    expect(readers).toContain('services/transitions/callOffRules.ts');
    // Known-false: the invoice projection counts calendar days (CR-14).
    expect(readers).not.toContain('services/data/invoiceProjection.ts');
    // And the calendar-day side has both a known member and a known non-member.
    expect(D.calendarDaySites).toContain('services/delivery/fulfillment.ts#statusForUnmatched');
    expect(D.calendarDaySites).not.toContain('services/data/poResponseProjection.ts#responseDeadline');
    // BL-48 — the commitment deadline no longer counts calendar days.
    expect(D.calendarDaySites).not.toContain('services/transitions/forecastRules.ts#commitmentDueAt');
  });

  it('the modules doing working-day arithmetic are exactly these (the derived list, pinned)', () => {
    const readers = [...new Set(D.workingDayCalls.map((c) => c.key.split('#')[0]))].sort();
    expect(readers).toEqual([
      'services/data/poResponseProjection.ts',
      'services/transitions/callOffRules.ts',
      'services/transitions/forecastRules.ts',
      // Material B1 — the weekly stock update cutoff moves off a non-working day (MR-1 BR-03).
      // Material B3 — an API week is judged on the cycle's working days (MR-2 BR-02).
      'services/transitions/updateCompliance.ts',
      'services/transitions/updateCycle.ts',
      'services/transitions/workingCalendarStore.ts',
    ]);
  });

  it('EVERY working-day call passes a calendar — an omitted one would count on the frozen base', () => {
    const omitted = D.workingDayCalls
      .filter((c) => c.args < CALENDAR_FNS[c.fn])
      .map((c) => `${c.key} → ${c.fn}(…${c.args} args)`);
    expect(omitted, 'working-day arithmetic that ignores the administrator\'s rulings').toEqual([]);
  });

  it('EVERY WorkingCalendar parameter defaults to the hub calendar', () => {
    expect(D.calendarDefaults.length, 'the parameter defaults were found').toBeGreaterThan(0);
    const wrong = D.calendarDefaults.filter((d) => d.initializer !== 'hubWorkingCalendar()');
    expect(wrong, 'a deadline defaulting to a calendar other than the one in force').toEqual([]);
  });

  it('the frozen base calendar is named only by the store that composes the hub calendar', () => {
    const outside = D.frozenRefs.filter((r) => r.file !== CALENDAR_STORE).map((r) => `${r.file}: ${r.name}`);
    expect(outside).toEqual([]);
    expect(D.frozenRefs.some((r) => r.file === CALENDAR_STORE), 'control: the store does name it').toBe(true);
  });

  it('CALENDAR-day deadline arithmetic is exactly the reasoned allowlist, both ways', () => {
    const derived = [...D.calendarDaySites].sort();
    const unexplained = derived.filter((k) => !(k in CALENDAR_DAY_ALLOWLIST));
    const stale = Object.keys(CALENDAR_DAY_ALLOWLIST).filter((k) => !D.calendarDaySites.has(k));
    expect(unexplained, 'a deadline counting calendar days with no stated reason').toEqual([]);
    expect(stale, 'an allowlist row whose site no longer exists').toEqual([]);
  });
});
