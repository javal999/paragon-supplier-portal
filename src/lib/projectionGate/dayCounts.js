// ─────────────────────────────────────────────────────────────────────────────
// THE NUMERIC ARM — stored DAY-COUNTS, the half `displayStates.js` is blind to.
//
// ── ⚠️ WHY THE STATE ARM COULD NEVER HAVE SEEN THESE ────────────────────────
//   `displayStates.js` derives its population from CLOSED STRING UNIONS: a
//   display state is a union member, so the members ARE the population and a new
//   one cannot hide. **A number has no union.** `daysUntilExpiry: number` admits
//   every integer, so there is nothing to enumerate and nothing for that gate to
//   catch — it was blind to this class BY CONSTRUCTION, for the whole life of
//   the constant, which is exactly why this population grew unobserved while a
//   bilateral, mutation-probed gate sat next to it reading green.
//
//   That blindness is the finding, not an oversight: a gate built for law 0.5
//   that cannot see half of law 0.5's subject. The vocabulary below is the same
//   (`computed-at-read` / `stored-in-fixtures`), because the LAW is the same.
//
// ── ⚠️ AND THE DISCRIMINATOR BELOW IS NARROWER THAN THE LAW IT SERVES ──────────────────────────────
//   `STORED-VALUE-DERIVABLE-FROM-STORED-DATA-01` (`docs/findings.md` §102d).
//   *"A stored value must not be a function of the READ INSTANT"* names ONE
//   independent variable. **Another STORED COLLECTION is another, and it fails
//   the same way** — two sources, nothing making them meet.
//   `Contract.obligationCount` / `obligationsMet` were exactly that shape and
//   were retired at §102 onto `services/data/obligationRollup.ts`; this gate
//   could never have seen them, and not only because of the `days` matcher —
//   **the discriminator below would have ACQUITTED them**, since neither reads
//   a clock.
//
//   ⚠️ **THAT ARM IS NAMED, NOT GATED, AND DELIBERATELY SO** (operator ruling:
//   no instrument lane on a two-field batch). Its open members are listed at
//   §102d — `PurchaseOrder.totalValue` is the consequential one, 7 of 21
//   disagreeing with its own lines and READ at 26 sites, pinned as an exact set
//   in `asnRefIntegrity.test.ts`. **Do not widen the matcher here to reach
//   them**; widening creates false accusations as readily as narrowing creates
//   blind spots, and this file already carries four scars from one widening.
//
// ── ⚠️ THE DISCRIMINATOR, AND IT IS NOT "NUMBER VS STATE" ───────────────────
//   **A stored value must not be a function of the READ instant.** A difference
//   between two STORED dates is a durable fact and may be stored; a difference
//   against `now` is wrong tomorrow. That axis is what puts `daysUntilExpiry`
//   (endpoint = now) in a different class from `noticeRequiredDays` (a contract
//   term) and `daysOfSupply` (stock ÷ burn — not a date difference at all),
//   even though all three are numbers with `days` in the name.
//
// ── ⚠️ THE FOURTH GROUP, WHICH THE STATE ARM NEVER NEEDED ───────────────────
//   `mintedAtWrite` is not a group but a MARKER, and it records the worst shape
//   available: a value COMPUTED FROM THE CLOCK AND THEN STORED. It looks like
//   `computed-at-read` from the producer side (a real non-fixture file computes
//   it) and like `stored-in-fixtures` from the data side, and it is neither — it
//   is the defect wearing the fix's clothes. Today exactly one field carries it.
//   The gate asserts the named write site EXISTS, so the marker can only be
//   removed by removing the write; it cannot rot into a stale comment.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { scriptKindOf } from '@test/sourceFiles';

/** Where a stored day-count sits on the law-0.5 axis. */
/**
 *  Derived at read from an INJECTED `now`. Law 0.5 honoured.
 *  A fixture literal. A DATA DEFECT held honestly, not a design.
 *  Not a difference against `now` at all — acquitted, and it must say why.
 *
 * @typedef {| 'computed-at-read'
 *   | 'stored-in-fixtures'
 *   | 'not-a-clock-difference'} DayCountGroup
 */

/**
 * `owner`:  The type that declares the field — the storage site, not a view model.
 * `against`: The date this count is measured against. REQUIRED for the two clock groups and FORBIDDEN for an acquittal: naming the other endpoint is what makes the classification checkable rather than asserted.
 * `producer`:  `computed-at-read` only: the module that produces it, which must take an  injected `now` — a producer with its own clock would be law 0.5's defect  wearing this group's name.
 * `reason`:  `not-a-clock-difference` only: why it is acquitted.
 * `mintedAtWrite`: ⚠️ A non-fixture file that COMPUTES this from the clock and STORES it. The gate asserts the file exists and writes the field; removing the write is the only way to remove this marker.
 * `factWhenPresent`: The count is a durable FACT whenever this date is present, and a decaying projection when it is not — one field with two meanings. Recorded because that split is more dangerous than a uniformly wrong number: half the rows are correct, so no row you spot-check reveals the other half.
 *
 * @typedef {{
 *   readonly owner: string;
 *   readonly field: string;
 *   readonly group: DayCountGroup;
 *   readonly against?: string;
 *   readonly producer?: string;
 *   readonly reason?: string;
 *   readonly mintedAtWrite?: string;
 *   readonly factWhenPresent?: string;
 * }} DayCountRow
 */

/**
 * ⚠️ **DECLARED. The gate pins this EQUAL to the derivation, both directions.**
 * A new `…days…: number` in the storage scope must appear here or the gate is
 * red; a row here that the tree no longer declares is equally red.
 * @type {readonly DayCountRow[]}
 */
export const DAY_COUNTS = [
  // ── computed at read, law 0.5 honoured ────────────────────────────────────
  {
    owner: 'BuyerInvoice',
    field: 'daysOutstanding',
    group: 'computed-at-read',
    against: 'dueDate',
    producer: 'src/services/data/invoiceProjection.ts'
  },
  // MR-9 BR-03 — the alert order within a class. Derived with the alert from an
  // injected `nowIso`, never stored. Mixed by rule: a capacity alert counts to
  // its first gap `week` (named here), stale data from `lastUpdatedAt` + SLA,
  // and the stock rules are stock ÷ burn (no clock endpoint).
  {
    owner: 'InventoryAlert',
    field: 'daysToImpact',
    group: 'computed-at-read',
    against: 'week',
    producer: 'src/services/transitions/inventoryAlertRules.ts'
  },

  // ── ⚠️ TWO ROWS LEFT THIS TABLE BY BEING RETIRED, NOT BY BEING EXCUSED ────
  //   `Contract.daysUntilExpiry` and `ComplianceRow.daysLeft` were both here as
  //   `stored-in-fixtures`, and `daysUntilExpiry` carried the only
  //   `mintedAtWrite` marker in the tree. Both fields no longer EXIST, so they
  //   leave the population entirely — that is the bilateral assertion doing its
  //   job, not a gap. Re-declare either as `…: number` on a DTO and this gate
  //   goes red until somebody classifies it again.
  //
  // ── ⚠️ TWO MORE ROWS LEFT BY BEING RETIRED, AND THE REASON THEY STAYED IS ─
  // ── QUOTED RATHER THAN DELETED, BECAUSE IT WAS TRUE WHEN IT WAS WRITTEN ───
  //   `Shipment.daysInTransit` and `Shipment.delayDays` sat here as
  //   `stored-in-fixtures` under this reasoning:
  //
  //     > ⚠️ THE FOUR THAT REMAIN ARE DELIBERATE. Each back-solves to the SAME
  //     > authoring date as the fixture around it (shipments 2026-05-20, POs
  //     > their own), so computing them at read would publish FIXTURE AGE as
  //     > operational lateness — a shipment "in transit 116 days", a PO "496
  //     > days late". The disposal is the DATA, and the fixture refresh is its
  //     > own batch; retiring the field first would ship a true number about a
  //     > false world.
  //
  //   ⚠️ **THE FIXTURE REFRESH IT WAS WAITING FOR HAPPENED — #319/#320 — AND
  //   NOBODY CAME BACK HERE.** `shiftFields` re-times the shipment family to
  //   `DECLARED_PRESENT`, so "in transit 116 days" is no longer reachable:
  //   measured before retiring them, the computed values reproduce all 16
  //   authored literals EXACTLY at the declared present. The condition was met
  //   by a batch that had no reason to look at this table, which is why the
  //   quote stays — a deferral whose precondition is satisfied elsewhere does
  //   not announce itself.
  //
  //   ⚠️ **THE TWO PO ROWS BELOW ARE NOT RIDING, AND THE REASON CHANGED WITHOUT
  //   THE ANSWER CHANGING.** The sentence here read, verbatim:
  //
  //       "`purchaseOrder` HAS NO ENTRY IN `FAMILY_ANCHORS`, so its dates are
  //        still the raw literals and the quoted reasoning still binds them
  //        exactly. '496 days late' remains the live risk for a PO … Anchor
  //        that family first; the fields are downstream of the anchoring, never
  //        the other way round."
  //
  //   **THE PRECONDITION IS NOW MET.** The demo-data batch anchored
  //   `purchaseOrder` (`services/data/fixturePresent.ts`), so "496 days late"
  //   is no longer reachable for a PO either, exactly as it stopped being
  //   reachable for a shipment at #319/#320.
  //
  //   The two rows STAY `stored-in-fixtures` all the same, and that is a
  //   disposal rather than an oversight: unlike `daysInTransit`, `daysOverdue`
  //   is not a difference against `now` at all — it is
  //   `confirmedDeliveryDate − requestedDeliveryDate`, two STORED dates, which
  //   is why `factWhenPresent` names one of them. Retiring it is a computation
  //   over the fixture, not a clock projection, and it belongs to whichever
  //   batch owns the field. What this batch removes is the EXCUSE, not the row.
  {
    owner: 'PurchaseOrder',
    field: 'daysOverdue',
    group: 'stored-in-fixtures',
    against: 'requestedDeliveryDate',
    factWhenPresent: 'confirmedDeliveryDate'
  },
  {
    owner: 'POSummary',
    field: 'daysOverdue',
    group: 'stored-in-fixtures',
    against: 'requestedDeliveryDate',
    factWhenPresent: 'confirmedDeliveryDate'
  },

  // ── acquitted — NOT differences against `now` ─────────────────────────────
  // ⚠️ These are the CONTROLS. A gate probed only against the fields it
  // convicts has never been shown to acquit, and every one of these has `days`
  // in its name — so a name-shaped matcher that quietly started condemning them
  // would go red here rather than in review.
  {
    owner: 'Contract',
    field: 'noticeRequiredDays',
    group: 'not-a-clock-difference',
    reason: 'A contract TERM — how much notice the agreement requires. No clock endpoint.'
  },
  {
    owner: 'Quotation',
    field: 'leadTimeDays',
    group: 'not-a-clock-difference',
    reason: 'A quoted DURATION the supplier commits to. Not measured from today.'
  },
  {
    owner: 'ProductionLineRow',
    field: 'coverDays',
    group: 'not-a-clock-difference',
    reason: 'Stock ÷ consumption rate. Decays because stock does, never because the clock moves.'
  },
  {
    owner: 'ForecastCoverageRow',
    field: 'principalLeadTimeDays',
    group: 'not-a-clock-difference',
    reason:
      'A principal’s delivery lead time to the distributor (REQ-E06-03 BR-07). A duration, not measured from today.'
  },
  {
    owner: 'CallOffWarningDetail',
    field: 'days',
    group: 'not-a-clock-difference',
    reason:
      'MR-6 BR-10 — the ASN’s ETA against the call-off’s agreed date: two document dates, no clock endpoint.'
  }
  // `InventoryRecord.daysOfSupply` LEFT BY BEING RETIRED (REQ-E08-01): days of
  // supply is CR-01, computed at read by `inventoryRules.daysOfSupply` and never
  // stored on a DTO, so it has no row here.
];

// ─────────────────────────────────────────────────────────────────────────────
// THE DERIVATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ⚠️ **THE STORAGE SCOPE, AND IT IS A CLAIM WORTH STATING.** A field is STORED
 * only where an entity DTO or a fixture declares it. A page-local view model
 * (`OpenRFQ.daysRemaining`) is rebuilt on every render from data it does not
 * own — it is a projection output, and counting it as storage would condemn the
 * correct pattern alongside the defect.
 * @type {readonly string[]}
 */
export const STORAGE_SCOPE = ['src/data', 'src/services/data/types.ts', 'src/types'];

/**
 * Day-count field DECLARATIONS in the storage scope.
 *
 * ⚠️ **THE MATCHER IS NARROWED TO `days`/`Days` ON PURPOSE, AND THE SCARS ARE
 * THE REASON.** A first pass matched `[Dd]ays|[Aa]ge|[Tt]ransit|…` and returned
 * `transitionId` (on *transit*), `message`, `stage` and `packageCount` (on
 * *age*) — four false accusations from one widening. A second matched
 * `:\s*number` and caught the ASSIGNMENT `noticeRequiredDays: numbers.notice…`
 * because `numbers.` begins with `number`. Both are pinned as negative controls
 * in the gate.
 *
 * ⚠️ **THE LIMIT, STATED RATHER THAN IMPLIED:** a clock difference named in
 * another unit (`hoursOverdue`, `weeksLate`) is INVISIBLE here. `PurchaseOrder.
 * acknowledgmentTimeHours` is exactly that shape and is acquitted by hand, not
 * by this matcher. A census that hides its blind spots is worse than a narrow one.
 * @param {(f: string) => string} [read]
 * @param {readonly string[]} [files]
 * @returns {{ file: string; field: string }[]}
 */
export function declaredDayCountFields(read = (f) => readFileSync(f, 'utf8'), files = []) {
  const decl = /^\s*(?:readonly\s+)?(\w*[Dd]ays\w*)\??:\s*number(?:\s*\|\s*null)?\s*;/;
  /** @type {{ file: string; field: string }[]} */
  const out = [];
  for (const f of files) {
    const text = read(f);
    // Split on /\r?\n/: `core.autocrlf` is on in this repo, so a bare '\n'
    // split leaves a '\r' on every line and the `;` anchor never matches.
    for (const raw of text.split(/\r?\n/)) {
      const m = decl.exec(raw);
      if (m) out.push({ file: f, field: m[1] });
    }
    // ⚠️ AND THE JSDOC FORM (frontend-standard Phase 4). A converted file
    // declares the same field as `@property {number} noticeRequiredDays`, or as
    // a member of a `@typedef {{ … }}` type literal behind a ` * ` prefix — and
    // the line regex above, anchored on `^\s*<name>`, sees neither. Read through
    // the TypeScript parser rather than widened, because a widened line regex
    // is how this matcher earned its four false accusations.
    for (const field of jsDocDayCountFields(f, text)) {
      if (!out.some((o) => o.file === f && o.field === field)) out.push({ file: f, field });
    }
  }
  return out;
}

/**
 * `number` or `number | null` — the same two types the line regex accepts.
 * @param {ts.TypeNode | undefined} t
 * @returns {boolean}
 */
function isDayCountType(t) {
  if (!t) return false;
  if (ts.isParenthesizedTypeNode(t)) return isDayCountType(t.type);
  if (t.kind === ts.SyntaxKind.NumberKeyword) return true;
  return (
    ts.isUnionTypeNode(t) &&
    t.types.length === 2 &&
    t.types.some((m) => m.kind === ts.SyntaxKind.NumberKeyword) &&
    t.types.some((m) => ts.isLiteralTypeNode(m) && m.literal.kind === ts.SyntaxKind.NullKeyword)
  );
}

/**
 * Day-count fields DECLARED IN JSDOC: `@property {number} xDays` on a typedef,
 * or `xDays: number;` inside a `@typedef {{ … }}` type literal. Only nodes INSIDE
 * a JSDoc comment are read — the TypeScript form stays the line regex's, so the
 * two arms cannot double-count or disagree about it.
 * @param {string} file
 * @param {string} text
 * @returns {string[]}
 */
function jsDocDayCountFields(file, text) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindOf(file));
  const found = /** @type {Set<string>} */ (new Set());
  /**
   * @param {string} n
   * @returns {boolean}
   */
  const isDayName = (n) => /[Dd]ays/.test(n);
  /**
   * @param {ts.Node} doc
   * @returns {void}
   */
  const inJsDoc = (doc) => {
    if (ts.isJSDocPropertyTag(doc) && ts.isIdentifier(doc.name) && isDayName(doc.name.text)) {
      if (isDayCountType(doc.typeExpression?.type)) found.add(doc.name.text);
    }
    if (ts.isPropertySignature(doc) && ts.isIdentifier(doc.name) && isDayName(doc.name.text)) {
      if (isDayCountType(doc.type)) found.add(doc.name.text);
    }
    ts.forEachChild(doc, inJsDoc);
  };
  // ⚠️ `node.jsDoc`, NOT `ts.getJSDocCommentsAndTags(node)`: the public helper
  // returns only the LAST comment above a statement, and a converted file
  // stacks several typedefs above one (`mockContracts.js` has four above its
  // first `const`) — the public call reported `noticeRequiredDays` absent.
  /**
   * @param {ts.Node} n
   * @returns {void}
   */
  const visit = (n) => {
    for (const doc of /** @type {{ jsDoc?: readonly ts.JSDoc[] }} */ (n).jsDoc ?? []) inJsDoc(doc);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return [...found];
}

/** Does `file` inject its clock rather than read one? The property that
 * @param {string} file
 * @param {(f: string) => string} [read]
 * @returns {boolean}
 *  separates a real `computed-at-read` producer from law 0.5's defect. */
export function takesInjectedNow(file, read = (f) => readFileSync(f, 'utf8')) {
  return /\b(nowIso|now)\s*:\s*(string|Date)/.test(read(file));
}

/**
 * Does `file` write `field` — as `field: <expr>` or as ES6 shorthand `field,`?
 *
 * ⚠️ **TWO SHAPES ARE LOAD-BEARING AND BOTH WERE MISSED ON THE FIRST PASS.**
 *   · **Shorthand.** `BuyerContracts` mints `daysUntilExpiry` with ES6
 *     shorthand, so a `field:`-only matcher reports the sole `mintedAtWrite`
 *     site in the tree as ABSENT — a clean-looking gate over a real defect.
 *   · **Mid-line.** `buyerRisk.ts` writes whole rows on ONE line
 *     (`{ supplier: '…', expires: '…', daysLeft: -24, … }`), so a `^\s*`-anchored
 *     matcher finds no writer for `ComplianceRow.daysLeft` and the row reads as
 *     `produced-by-nothing`. Anchoring on `{` / `,` instead is what sees it.
 *
 * A DECLARATION (`field: number;`) is excluded by the `number` lookahead: a type
 * is not a write, and counting it as one would acquit every stored field on the
 * strength of its own interface.
 * @param {string} file
 * @param {string} field
 * @param {(f: string) => string} [read]
 * @returns {boolean}
 */
export function writesField(file, field, read = (f) => readFileSync(f, 'utf8')) {
  const head = `(?:^\\s*|[{,]\\s*)`;
  const assign = new RegExp(`${head}${field}\\s*:\\s*(?!number\\b)\\S`);
  const shorthand = new RegExp(`${head}${field}\\s*,`);
  return read(file)
    .split(/\r?\n/)
    .some((raw) => {
      const code = raw.replace(/\/\/.*$/, '');
      return assign.test(code) || shorthand.test(code);
    });
}
