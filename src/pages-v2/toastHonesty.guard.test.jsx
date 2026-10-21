// ─────────────────────────────────────────────────────────────────────────────
// R1 · THE UNBACKED-TOAST HONESTY GUARD — the class, gated.
//
// ⚠️ **THE CLASS THIS EXISTS FOR: THE PAGES DISCLAIM THEIR DATA AND ASSERT THEIR
// ACTS.** `BuyerRisk` says EVERY FIGURE IS ILLUSTRATIVE, then offers an "Export
// Report" that produces a toast. Every honest-marking arc this portal has run
// covered DATA — D-CENSUS-8 marked what a page SAYS. NOTHING marked what a page
// CLAIMS TO HAVE DONE, and a claim about an act is the one a user acts on.
//
// ── THE RULE, AND IT IS BILATERAL BY CONSTRUCTION ──────────────────────────
//   IF an affordance's handler performs NO REAL ACT, its toast MUST ADMIT that.
//
//   Both halves derive; neither is a list:
//     · THE POPULATION derives from the page sources — every `toast(` whose
//       BRANCH contains none of the call shapes in `PERFORMS_REAL_ACT`. Add an
//       unbacked affordance tomorrow and it is IN, without anybody editing this
//       file (`CENSUS-MUST-DERIVE-01`).
//     · THE VERDICT derives from the SHIPPED i18n bundle (`resources`), not from
//       a regex over the fragment files — the guard judges the string a user
//       actually sees, in BOTH locales.
//
//   ⚠️ **THERE IS NO EXEMPTION LIST, DELIBERATELY.** An exemption list is the
//   thing that rots (`C9-STALE-BY-FIX-01`): wire the affordance and the row
//   outlives its subject. Here, wiring an affordance removes it from the
//   population automatically, because the branch then contains a real act.
//   The only way to pass is to be honest or to be real.
//
// ── THE UNIT WAS THE HANDLER BODY, AND THAT IS HOW #352's DEFECT ESCAPED ────
//
// ⚠️ **A CLAIM IS MADE BY A BRANCH. UNTIL THIS CHANGE THE ACQUITTAL WAS DECIDED
// BY THE WHOLE HANDLER BODY, SO ONE REAL ACT IN ONE BRANCH ACQUITTED EVERY OTHER
// BRANCH IN THE SAME HANDLER.** The sentence that stood here said the population
// was every toast "whose affordance handler's OWN BODY TEXT" lacked a real act,
// and the mismatch between the unit that ACTS and the unit that CLAIMS is the
// whole defect.
//
// **MEASURED ON THE TREE, NOT ARGUED.** `BuyerInvoices.handleFooterAction` is a
// chain of `if (…) { …; return; }` clauses. Two of them perform real acts
// (`setPanelMode('confirming')`, `setPanelMode('remittance')`); two only fire a
// toast. Under the body unit the two setters acquitted the whole handler, so the
// `Overdue` clause announced *"{{invoiceNumber}} escalated / Routed to Finance
// Controller for urgent action"* — a claim about an act that does not occur —
// **with this guard green the entire time.** It was found by hand and fixed at
// #352; nothing here could have found it, and that is what this unit changes.
//
// ── WHAT A BRANCH IS, DERIVED BY PROPERTY RATHER THAN LISTED ────────────────
//
// **A BRANCH IS THE CODE THAT CO-EXECUTES WITH THE TOAST: the handler body with
// (a) every CONDITIONALLY-EXECUTED REGION that does not contain the toast
// blanked, and (b) everything after the toast's own path terminates blanked.**
//
// A conditionally-executed region is any region whose execution is NOT implied
// by reaching the statement enclosing it. That property — not a list of
// keywords — is what `conditionalRegions` below enumerates, so a construct this
// tree does not use today is handled on the day it appears:
//   · `if` — the then-branch and the else-branch, each separately
//   · `switch` — each `case` / `default` clause's statements
//   · `try` / `catch` — the CATCH block (the try block is entered
//     unconditionally, so it is NOT a region; blanking it would accuse a
//     handler of nothing more than having error handling)
//   · a ternary's two arms
//   · the right-hand side of `&&`, `||`, `??`
//   · a `for` / `for…of` / `for…in` / `while` body (may run zero times)
// **Half (b) is not optional and is the half the defect needed.** The shape is
// `if (a) { toast({…}); return; } … dispatch(…)`: the dispatch is not inside any
// conditional region, so (a) alone keeps it, and a clause that returns would go
// on being acquitted by code it can never reach. Derived today across
// `src/pages-v2/*.tsx`: the constructs that actually enclose a `toast(` are
// `if`, `try` and `catch` — the rest are carried because the rule is a property.
//
// **THE CLAIM IS SCOPED TO THE SAME UNIT, AND THAT CLOSED A SECOND LEAK OF THE
// SAME DEFECT.** Keys and literals used to be collected from the whole body too,
// so a sibling branch whose copy DID admit satisfied `claims.some(admits)` for a
// branch whose copy did not. One unit now decides both.
//
// ── THE ONE EXCLUSION: THE REFUSAL CLASS, AND IT IS STRUCTURAL ──────────────
//
// **A BRANCH IS A REFUSAL WHEN IT IS A GUARD CLAUSE STANDING IN FRONT OF THE
// HANDLER'S OWN ACT:**
//   1. the toast's branch TERMINATES — a `return` or `throw` is reached from
//      the statement holding the toast; AND
//   2. a real act appears in the handler body AFTER that `if` statement ends;
//      AND
//   3. **the `if` condition and that act READ AT LEAST ONE IDENTIFIER IN
//      COMMON** — OR (#229) the toast declares `variant: 'error'`, for a
//      validation guard whose condition reaches the act only through a local.
//      The argument for that arm, and the alternative it beat, is at
//      `refusalOf`.
//
// **(3) IS THE WHOLE PROPERTY; (1) AND (2) ONLY ESTABLISH THE SHAPE.** Sharing
// an identifier is what makes the clause a precondition of the act rather than a
// coincidence of ordering: it tests the very input the act consumes, so it fires
// exactly when the act cannot run. Such a toast REPORTS A PRECONDITION — it
// claims no act, and asking it for an ADMISSION asks it the wrong question.
// Derived today: `if (!answer.trim()) { toast(…); return; }` in front of
// `resolveMutation.mutate({ resolutionReason: answer.trim() }, …)`.
//
// ⚠️ **IT IS STRUCTURAL BECAUSE THE COPY-BASED ALTERNATIVE WAS MEASURED AND
// REJECTED, NOT BECAUSE STRUCTURE WAS EASIER.** A DEFERRAL — a branch that
// truthfully says the act happens elsewhere — is NOT excluded by this class and
// cannot be, because `BuyerInvoices`' `Pending Match` clause and the `Overdue`
// clause #352 repaired are **the same branch shape**: same handler, same
// `if (selected.status === …) { toast({variant:'info', …}); return; }`, same
// terminal position after every act the handler performs, neither guarding
// anything. Only their COPY differs, and a copy classifier was measured
// disqualified on both routes:
//   · per locale — Indonesian `di-` marks the PASSIVE VOICE, not completion, so
//     *dapat dibaca* ("can be read") and *diposting* ("is posted") are
//     morphologically identical to *dieskalasi* ("was escalated"). 3 of 3 false
//     convictions.
//   · EN-only — a `-ed` suffix test separates the four subjects correctly and
//     then **silently stops checking 8 members whose EN copy carries no `-ed`
//     word**, every one of them currently honest ("will open in a future
//     release", "nothing was sent to SAP"). Buying 3 exclusions by un-checking 8
//     is this guard's own defect one layer up.
// **So a deferral must earn its pass at the admission test like anything else,
// which is what `invoice.match.deferred` now does.**
//
// ── WHAT THIS GUARD DOES NOT REACH ─────────────────────────────────────────
//   It reads TEXT, in one handler, and follows nothing:
//     · no call is followed. A handler that dispatches THROUGH A HELPER is
//       invisible to the acquittal and lands in the population.
//       **THE RESIDUE IS MEASURED, NOT GUESSED: five members call a local
//       helper** — `SupplierDashboard.dismiss` (×1), `SupplierOrders.
//       openOrderPanel` (×4).
//
//       ⚠️ **AND FOLLOWING THEM WOULD MAKE THIS GUARD WORSE, WHICH IS WHY IT DOES
//       NOT.** Both helpers are PURE STATE SETTERS — `dismiss` calls
//       `setDismissedActions`; `openOrderPanel` calls seven setters and nothing
//       else. A setter already counts as an act, so a one-hop resolver would
//       ACQUIT all five and silently delete five CORRECT members. The reach is
//       one body deep BY RULING, and the claim above now says so rather than
//       implying a dispatch analysis this file does not perform.
//     · the body is bounded at 8000 chars by `balancedEnd`.
//     · a React state setter counts as an act — the under-reach argued on
//       `PERFORMS_REAL_ACT` below.
//
// ── WHY A CLOSED ADMISSION VOCABULARY ──────────────────────────────────────
//   `ADMISSIONS` is a closed set of phrases already shipping in the tree — the
//   register `shipments.toast.reminder` and `carrierAlerted` established. It is
//   NOT free text: a blanket "not implemented" would satisfy a checker while
//   telling a user nothing, which is the failure mode this guard exists to
//   prevent. The honest strings name THE ACT, say it did not happen, and say
//   what is missing.
// ─────────────────────────────────────────────────────────────────────────────
//
// ═══ PIN REACH ═════════════════════════════════════════════════════════════
// Stated in the convention `docs/contracts/*` use for their pins, and for the
// same reason: **a reader who assumes this guard covers a claim it does not
// reach is the failure the block is built against.**
//
// **GUARDED — these assertions, and nothing else:**
//   · the derivation examined something — a non-empty population
//   · the refusal class excluded something — an exclusion that excludes nothing
//     is never exercised, and would read green for the same reason
//   · an unbacked affordance admits it in EN
//   · an unbacked affordance admits it in ID
//   · every user-visible toast string is externalised (no hardcoded copy)
//   · the retired #352 claim admits nothing
//   · the Overdue branch is convicted by the branch unit, acquitted by the body
//     unit, and NOT excluded by the refusal class
//   · a NAMED function is a handler when an `on*` prop in the same file names it
//     (`onClick={name}` / `onClick: name`) — found when unbacked, not found when
//     it acts, not found when nothing wires it; `ScenarioTab.sendToWarRoom` is
//     the real-tree member
//
// ⚠️ **NOT GUARDED — AND THIS HALF IS WHY THE BLOCK EXISTS, BECAUSE A LIST OF
// GUARDED THINGS READS AS COMPLETENESS.**
//   · **"THE SIDE EFFECT MATCHES THE CLAIM."** This guard judges "no side effect
//     at all". A branch that does something SMALLER than it claims is acquitted
//     — `SupplierDashboard`'s briefing card dismissing itself while announcing
//     "workflow initiated" was found by a human at R1, not by this rule.
//   · **AN EXCLUDED REFUSAL IS NOT CHECKED AT ALL — ITS COPY IS UNGUARDED.** A
//     refusal that MISSTATES WHY IT REFUSED ("needs an answer" when what is
//     missing is a supplier id) passes, because the class removes it from the
//     population before any copy is read. The exclusion buys silence about a
//     wrong question; it does not buy a right answer.
//   · **AND THE SAME HOLE TAKES A CLAIM, NOT ONLY A WRONG REASON — MEASURED,
//     NOT FEARED.** A guard clause whose copy asserts the act OCCURRED
//     ("Resolution sent to the supplier.") is excluded and therefore ACQUITTED,
//     because this class reads structure and structure cannot see a lie. It is
//     probed in exactly that direction (P3) and the probe's finding is this
//     bullet. Closing it needs the copy dimension that was measured
//     disqualified above — so it is a STATED REACH LIMIT, not an oversight.
//   · **A DECLARED ERROR EXCLUDES.** A guard clause in front of an act whose
//     toast says `variant: 'error'` is excluded whatever its copy says, so an
//     error toast that claims the act OCCURRED would pass. The variant is
//     trusted as the toast's own statement; nothing here checks it.
//   · **AN INCIDENTAL SHARED IDENTIFIER EXCLUDES.** Condition (3) counts any
//     identifier, so a method name is enough: `answer.trim()` in the condition
//     and `answer.trim()` in the act share BOTH `answer` and `trim`, and a
//     clause that merely happened to call `.trim()` on something unrelated
//     would be excluded on `trim` alone. The property is deliberately not
//     narrowed to the receiver, because narrowing it is a judgement about which
//     identifier "really" matters and this file has no way to check such a
//     judgement.
//   · **A NON-GUARDING TERMINATING BRANCH IS CHECKED ONLY THROUGH THE ADMISSION
//     TEST.** That is the `:410` / specimen shape — the class does not reach it
//     by design, so the whole verdict rests on `ADMISSIONS`, and a claim phrased
//     outside that closed register passes.
//   · **THE SPECIMEN CONTROL PROVES THE CLASS DOES NOT ACQUIT #352's RETIRED
//     COPY. IT DOES NOT PROVE THE CLASS IS MINIMAL.** Nothing here shows that
//     no narrower class would also have excluded the two refusals.
//   · **DEFERRED EXECUTION IS NOT BRANCHING.** A callback passed to `setTimeout`
//     or `.forEach` is NOT blanked: it is not conditional, it is later, and the
//     act it performs is real. Treating it as a branch would manufacture
//     accusations against working code (derivation rule 2).
//   · **NO CALL IS FOLLOWED** — see the residue measured above.
//   · **A REGION STRADDLING `balancedEnd`'s BOUND IS NOT BLANKED.** The body
//     span is the existing bracket-balanced one, capped at 8000 chars; a
//     conditional region only partly inside it is left intact, which errs toward
//     ACQUITTAL and therefore toward silence, never toward a false accusation.
//   · **COPY COMPUTED OUTSIDE THE BRANCH.** Claims are read from the branch; a
//     description assembled before the handler's first conditional is seen, one
//     assembled in a sibling branch is not — correctly, but a key built by
//     concatenation is invisible to both.
//   · **THIS BLOCK IS PROSE AND IS NOT ITSELF ASSERTED.** The contract pins are
//     self-pinned against their `describe` titles; this one is not, and saying
//     so is the difference between a stated reason and an enforced one.
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { resources } from '@lib/i18n';
import { scriptKindOf } from '@test/sourceFiles';
import { folderSourceFiles, pageFiles as pagesOf, pagesDirFolders } from '@test/pageFiles';
import { routedPageFiles } from '@test/routerPages';

const PAGES_DIR = __dirname;

/**
 * Every page file: top-level pages and page folders (`pagesOf`), PLUS every file
 * a route renders (`routedPageFiles`). A routed page in a feature folder
 * (`admin/AdminSuppliers.jsx`, `admin/AdminRuleValues/`) is a page; `pagesOf`
 * alone left it out, so its toasts were never read (2026-10-13).
 * @param {string} dir
 * @returns {string[]}
 */
const pageFiles = (dir) => [...new Set([...pagesOf(dir), ...routedPageFiles(dir)])].sort();

/**
 * A real act. If a BRANCH does ANY of these, its toast is OUT of this guard's
 * population.
 *
 * ⚠️ **THE LIMIT, STATED: THIS GUARD JUDGES "NO SIDE EFFECT AT ALL", NEVER
 * "THE SIDE EFFECT MATCHES THE CLAIM."** A React state setter counts as a real
 * act here because for a UI affordance it usually IS one — expanding a dock
 * panel, loading parsed XLSX rows into a grid. That is deliberate under-reach:
 * without it the guard accuses a working import of lying, which would train
 * people to weaken it. The residue it cannot see — a handler that does
 * something SMALLER than it claims, like `SupplierDashboard`'s briefing card
 * dismissing itself while announcing "workflow initiated" — is a HUMAN review
 * question, and that one was found and fixed by hand at R1, not by this rule.
 */
/**
 * ⚠️ **COMMENTS ARE BLANKED BEFORE ANYTHING IS READ, AND UNTIL THIS EXISTED A
 * COMMENT COULD REMOVE A MEMBER FROM THE POPULATION.** Every claim below is made
 * about CODE. Two independent mechanisms turned prose into evidence, and the
 * second is the one that actually fired:
 *
 *   1. `PERFORMS_REAL_ACT` ran against raw text, so a comment MENTIONING a call
 *      shape acquitted the handler.
 *   2. `balancedEnd` counts brackets, and **a comment's brackets counted too** —
 *      so `// TODO: dispatch(t_alt_activate)` opened and closed a paren, ended
 *      the body at the comment, and the `body.includes('toast')` guard dropped
 *      the member before the acquittal test was ever reached.
 *
 * **MEASURED, NOT ARGUED, AND THE FIRST FIX WAS WRONG.** Stripping only before
 * the acquittal test left (2) live: adding that one line inside
 * `BuyerRisk.jsx:612`'s `onClick` still moved the population 56 → 55, dropped
 * that member, and **the suite stayed GREEN** (114 → 112 collected). `it.each`
 * had one fewer case, and 112 still clears the floor, so neither this guard nor
 * `scripts/floor.json` could see it. Stripping at READ closes both.
 *
 * ⚠️ **IT IS LENGTH-PRESERVING ON PURPOSE.** A comment becomes the SAME NUMBER
 * of spaces and every newline survives, so byte offsets and LINE NUMBERS are
 * unchanged — `balancedEnd` slices the same span, each member keeps the
 * `file:line` name it is reported under, **and the TypeScript positions used by
 * `coExecutingRegion` index the same characters**, which is what lets an AST
 * parsed over the RAW source address offsets found in the stripped source.
 *
 * ⚠️ **THIRD INSTRUMENT IN THIS TREE TO NEED THIS, FIFTH TO WRITE ITS OWN
 * STRIPPER.** `chaosAmbience.test.js` states the class exactly — *"a mutant that
 * had DELETED the gate and kept the comment: the assertion was satisfied by prose
 * describing the mechanism rather than by the mechanism"* — and `fixturePresent`,
 * `registrationHonesty`, `contractRaisedElsewhere` and
 * `SupplierCertsExpiringWidget` each carry a private copy. **There is no shared
 * helper and no convention that a code claim is made against stripped source**,
 * which is why each instrument re-learns this by being burned. Filed, not fixed
 * here: unifying them is a sweep and needs a ruling.
 *
 * The block form runs first; the line form is guarded with `(^|[^:])` so it
 * cannot eat the `//` in a `https://` URL — `chaosAmbience`'s refinement, copied
 * rather than re-derived. `SupplierCertsExpiringWidget` records why the
 * line-PREFIX form is wrong: it misses a JSX comment and produces a FALSE
 * ACCUSATION, which is rule 2 in the other direction.
 * @param {string} m
 * @returns {string}
 */
const blanks = (m) => m.replace(/[^\n]/g, ' ');
/**
 * @param {string} s
 * @returns {string}
 */
const codeOnly = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, blanks)
    .replace(
      /(^|[^:])(\/\/[^\n]*)/g,
      /** @param {string} p1 @param {string} c */ (_m, p1, c) => p1 + blanks(c)
    );

const PERFORMS_REAL_ACT =
  /\b(?:\w*[Mm]utation\.mutate|\w*[Mm]utateAsync|dispatch|navigate|window\.open|createObjectURL|setSearchParams|location\.assign|fetch|set[A-Z]\w*|refetch|invalidateQueries)\s*\(/;

/**
 * Affordance handlers. `on<Something>` — but NEVER a react-query lifecycle
 * callback: a toast inside `onSuccess` is fired BY a real dispatch and is
 * backed by construction. Treating `onSuccess` as an affordance mis-attributes
 * the body and reports the RFQ-create toast — which is fully wired — as a lie.
 */
const AFFORDANCE = new RegExp(
  [
    // inline JSX/prop handler: onClick={() => …}, onQualify={() => …}
    String.raw`\bon(?!Success|Error|Settled|Mutate)[A-Z][A-Za-z0-9]*\s*[:=]\s*\{?\s*\([^)]*\)\s*=>`,
    // NAMED handler hoisted out of the JSX: `const handleExport = () => …`.
    // Without this the guard has a hole exactly where the biggest pages put
    // their affordances — `BuyerGoodsReceipt.handleExport` sat in it.
    String.raw`\bconst\s+handle[A-Za-z0-9]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>`
  ].join('|'),
  'g'
);

/**
 * A NAME WIRED AS A HANDLER: `on<X>={name}` in JSX, or `on<X>: name` in an object
 * of actions. Same lifecycle exclusion as `AFFORDANCE` — `onSuccess: notify`
 * wires a react-query callback, not an affordance.
 *
 * ⚠️ **THE HOLE THIS CLOSES WAS MEASURED ON THE TREE, NOT IMAGINED.**
 * `AFFORDANCE` only sees a named handler whose name starts with `handle`.
 * `BuyerRisk/components/ScenarioTab.jsx` declared `const sendToWarRoom = () => {
 * toast(…) }` and wired it as `onClick={sendToWarRoom}`; its toast claimed the
 * scenario was "dispatched to procurement leadership" while sending nothing,
 * with this guard green the entire time. Found by hand, fixed at #228.
 */
const WIRED_NAME =
  /\bon(?!Success|Error|Settled|Mutate)[A-Z][A-Za-z0-9]*\s*(?:=\s*\{\s*([A-Za-z_$][\w$]*)\s*\}|:\s*([A-Za-z_$][\w$]*)\s*(?=[,}\n]))/g;

/** @param {string} s */
const escapeRe = (s) => s.replace(/[$]/g, '\\$');

/**
 * THE NAMED-HANDLER MATCHER FOR ONE FILE, built from the names that file wires
 * (`WIRED_NAME`). It matches the DEFINITION of each wired name — `const name =
 * (…) =>`, `const name = useCallback((…) =>`, `function name(…)` — so the body
 * is read exactly as an inline handler's is. **A function holding a toast that
 * no `on*` prop names is NOT matched**: a helper called from `onSuccess` is
 * backed by the dispatch that fires it, and matching every function would be
 * derivation rule 2's widening.
 *
 * Returns null when the file wires no name, so no matcher runs over nothing.
 * @param {string} src comment-blanked source
 * @returns {RegExp | null}
 */
function namedHandlerDefs(src) {
  const names = new Set();
  for (const m of src.matchAll(WIRED_NAME)) names.add(m[1] ?? m[2]);
  if (names.size === 0) return null;
  const alt = [...names].map(escapeRe).join('|');
  return new RegExp(
    [
      String.raw`\bconst\s+(?:${alt})\s*=\s*(?:useCallback\s*\(\s*)?(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>`,
      String.raw`\b(?:async\s+)?function\s+(?:${alt})\s*\([^)]*\)`
    ].join('|'),
    'g'
  );
}

/**
 * The honest register, EN + ID. Phrases that ADMIT the act did not happen.
 * Closed on purpose — see the header.
 * @type {readonly RegExp[]}
 */
const ADMISSIONS = [
  /not available yet/i,
  /future release/i,
  /coming in (?:Phase|a )/i,
  /\(mock\)/i,
  /\(tiruan\)/i,
  /simulated/i,
  /simulasi/i,
  /nothing was/i,
  /not wired/i,
  /pending live/i,
  /will send once/i,
  /will open/i,
  /no .{1,40} was (?:opened|sent|created|queued)/i,
  /belum tersedia/i,
  /rilis mendatang/i,
  /akan hadir|hadir pada/i,
  /tidak ada/i,
  /belum tersambung/i,
  /menunggu kanal/i,
  /akan dikirim setelah/i
];

/** @param {string} s */
const admits = (s) => ADMISSIONS.some((r) => r.test(s));

/**
 * @typedef {{
 *     readonly file: string;
 *     readonly line: number;
 *     readonly keys: readonly string[];
 *     readonly literals: readonly string[];
 *   }} Site
 */

/**
 * Balance ( { [ from `from`, returning the end index of the expression.
 * @param {string} src
 * @param {number} from
 * @returns {number}
 */
function balancedEnd(src, from) {
  let depth = 0;
  let seen = false;
  for (let i = from; i < Math.min(src.length, from + 8000); i++) {
    const c = src[i];
    if (c === '(' || c === '{' || c === '[') {
      depth++;
      seen = true;
    } else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (seen && depth <= 0) return i + 1;
      if (depth < 0) return i;
    }
  }
  return Math.min(src.length, from + 8000);
}

/**
 * The regions of `n` whose execution is NOT implied by reaching the statement
 * that encloses `n`. This is the BRANCH definition, by property.
 *
 * ⚠️ **`try` IS ABSENT ON PURPOSE AND ITS ABSENCE IS THE LOAD-BEARING PART.** A
 * try block is entered unconditionally; only the CATCH is conditional. Blanking
 * a try block would put every handler that wraps its own dispatch in error
 * handling into the population, which is derivation rule 2 — a widening that
 * manufactures accusations against working code.
 * @param {ts.Node} n
 * @returns {ts.Node[]}
 */
function conditionalRegions(n) {
  /** @type {(ts.Node | undefined)[]} */
  const out = [];
  if (ts.isIfStatement(n)) {
    out.push(n.thenStatement, n.elseStatement);
  } else if (ts.isCaseClause(n) || ts.isDefaultClause(n)) {
    out.push(...n.statements);
  } else if (ts.isCatchClause(n)) {
    out.push(n.block);
  } else if (ts.isConditionalExpression(n)) {
    out.push(n.whenTrue, n.whenFalse);
  } else if (
    ts.isBinaryExpression(n) &&
    (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      n.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      n.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  ) {
    out.push(n.right);
  } else if (
    ts.isForStatement(n) ||
    ts.isForOfStatement(n) ||
    ts.isForInStatement(n) ||
    ts.isWhileStatement(n)
  ) {
    out.push(n.statement);
  }
  return out.filter(/** @returns {x is ts.Node} */ (x) => x !== undefined);
}

/**
 * @param {ts.Node} s
 * @returns {boolean}
 */
const TERMINATES = (s) =>
  ts.isReturnStatement(s) ||
  ts.isThrowStatement(s) ||
  ts.isBreakStatement(s) ||
  ts.isContinueStatement(s);

/**
 * The innermost AST node covering `pos`.
 * @param {ts.SourceFile} sf
 * @param {number} pos
 * @returns {ts.Node}
 */
function nodeAt(sf, pos) {
  /** @type {ts.Node} */
  let cur = sf;
  for (;;) {
    const next = cur.getChildren(sf).find((c) => pos >= c.getStart(sf) && pos < c.getEnd());
    if (!next) return cur;
    cur = next;
  }
}

/**
 * THE BRANCH. `body` is the handler span starting at `bodyStart`; `pos` is the
 * absolute offset of the `toast(` inside it. Returns the body with everything
 * that does NOT co-execute with `pos` blanked — LENGTH-PRESERVING, so the
 * caller's offsets and reported line numbers are unchanged.
 * @param {ts.SourceFile} sf
 * @param {string} body
 * @param {number} bodyStart
 * @param {number} pos
 * @returns {string}
 */
function coExecutingRegion(sf, body, bodyStart, pos) {
  const chars = body.split('');
  const bodyEnd = bodyStart + body.length;
  /**
   * @param {number} from
   * @param {number} to
   */
  const blank = (from, to) => {
    for (let i = Math.max(0, from - bodyStart); i < Math.min(chars.length, to - bodyStart); i++) {
      if (chars[i] !== '\n') chars[i] = ' ';
    }
  };

  // (a) every conditional region that does not contain the toast.
  (
    /** @param {ts.Node} n */ function walk(n) {
      if (n.getEnd() < bodyStart || n.getStart(sf) > bodyEnd) return;
      if (n.getStart(sf) >= bodyStart && n.getEnd() <= bodyEnd) {
        for (const r of conditionalRegions(n)) {
          if (pos < r.getStart(sf) || pos >= r.getEnd()) blank(r.getStart(sf), r.getEnd());
        }
      }
      n.forEachChild(walk);
    }
  )(sf);

  // (b) everything after the toast's own path terminates. Without this a clause
  // that returns goes on being acquitted by code it can never reach.
  let terminated = false;
  /** @type {ts.Node | undefined} */
  let cur = nodeAt(sf, pos);
  while (cur && cur.parent && cur.getStart(sf) >= bodyStart) {
    /** @type {ts.Node} */
    const p = cur.parent;
    /** @type {readonly ts.Statement[] | null} */
    const stmts = ts.isBlock(p)
      ? p.statements
      : ts.isCaseClause(p) || ts.isDefaultClause(p)
        ? p.statements
        : null;
    if (stmts) {
      const i = stmts.findIndex((s) => s === cur);
      if (i >= 0) {
        if (terminated) {
          blank(stmts[i].getEnd(), p.getEnd());
        } else {
          for (let k = i; k < stmts.length; k++) {
            if (TERMINATES(stmts[k])) {
              blank(stmts[k].getEnd(), p.getEnd());
              terminated = true;
              break;
            }
          }
        }
      }
    }
    cur = p;
  }
  return chars.join('');
}

/**
 * Every identifier NAME read anywhere inside `n`.
 * @param {ts.Node} n
 * @returns {Set<string>}
 */
function identifiersOf(n) {
  const out = /** @type {Set<string>} */ (new Set());
  (
    /** @param {ts.Node} x */ function walk(x) {
      if (ts.isIdentifier(x)) out.add(x.text);
      x.forEachChild(walk);
    }
  )(n);
  return out;
}

/**
 * The innermost `if` between the toast and the handler's start.
 * @param {ts.SourceFile} sf
 * @param {number} hStart
 * @param {number} pos
 * @returns {ts.IfStatement | null}
 */
function enclosingIf(sf, hStart, pos) {
  /** @type {ts.Node | undefined} */
  let cur = nodeAt(sf, pos);
  while (cur && cur.getStart(sf) >= hStart) {
    if (ts.isIfStatement(cur)) return cur;
    cur = cur.parent;
  }
  return null;
}

/**
 * Does the statement list holding `pos` reach a return/throw at or after it?
 * @param {ts.SourceFile} sf
 * @param {number} hStart
 * @param {number} pos
 * @returns {boolean}
 */
function terminates(sf, hStart, pos) {
  /** @type {ts.Node | undefined} */
  let cur = nodeAt(sf, pos);
  while (cur && cur.parent && cur.getStart(sf) >= hStart) {
    /** @type {ts.Node} */
    const p = cur.parent;
    if (ts.isBlock(p)) {
      const i = p.statements.findIndex((s) => s === cur);
      if (i >= 0) return p.statements.slice(i).some(TERMINATES);
    }
    cur = p;
  }
  return false;
}

/**
 * A `.mutate(` / `.mutateAsync(` on a name bound from a hook: `const changeEta =
 * useAdvanceShipNoticeChangeEta()` then `changeEta.mutate(…)`.
 *
 * ⚠️ **`PERFORMS_REAL_ACT` KNEW ONLY `…Mutation.mutate(`, SO A COMMAND HOOK
 * BOUND UNDER ANY OTHER NAME WAS INVISIBLE.** `SupplierShipments/components/
 * AsnEtaChange.jsx`'s `run` dispatches `t_asn_change_eta` through `changeEta.
 * mutate(…)`, and #229 measured it convicted as a handler that does nothing. The
 * test is the BINDING, not the text: `.mutate(` on a local object (`const api =
 * { mutate() {} }`) is not a hook and stays unrecognised.
 *
 * Returns null when the file binds no hook result.
 * @param {string} src comment-blanked source
 * @returns {RegExp | null}
 */
function hookMutateOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*use[A-Z]\w*\s*\(/g)) {
    names.add(m[1]);
  }
  if (names.size === 0) return null;
  return new RegExp(String.raw`\b(?:${[...names].map(escapeRe).join('|')})\.mutate(?:Async)?\s*\(`);
}

/**
 * The FIRST real act in `text`, by either instrument, or null.
 * @param {string} text
 * @param {RegExp | null} hookMutate from `hookMutateOf`
 * @returns {RegExpMatchArray | null}
 */
function realActIn(text, hookMutate) {
  const a = text.match(PERFORMS_REAL_ACT);
  const b = hookMutate ? text.match(hookMutate) : null;
  if (!a) return b;
  if (!b) return a;
  return (a.index ?? 0) <= (b.index ?? 0) ? a : b;
}

/**
 * The `variant` the toast at `pos` declares, when it is a string literal.
 * @param {ts.SourceFile} sf
 * @param {number} pos
 * @returns {string | null}
 */
function declaredVariant(sf, pos) {
  /** @type {ts.Node | undefined} */
  let n = nodeAt(sf, pos);
  while (n && !ts.isCallExpression(n)) n = n.parent;
  const arg = n && ts.isCallExpression(n) ? n.arguments[0] : undefined;
  if (!arg || !ts.isObjectLiteralExpression(arg)) return null;
  for (const p of arg.properties) {
    if (
      ts.isPropertyAssignment(p) &&
      p.name.getText(sf) === 'variant' &&
      ts.isStringLiteralLike(p.initializer)
    ) {
      return p.initializer.text;
    }
  }
  return null;
}

/** The reason an exclusion names when the declared variant decided it. */
const ERROR_VARIANT = "variant: 'error'";

/**
 * THE REFUSAL CLASS — see the header. Returns WHY the branch is a refusal — the
 * identifiers the condition and the act READ IN COMMON, or `ERROR_VARIANT` —
 * or null when the branch is not a refusal.
 *
 * ⚠️ **THE RULE, IN ONE SENTENCE: A TERMINATING `if` BRANCH IN FRONT OF A REAL
 * ACT LATER IN THE SAME HANDLER IS A REFUSAL WHEN ITS CONDITION SHARES AN
 * IDENTIFIER WITH THAT ACT, OR WHEN ITS TOAST DECLARES `variant: 'error'`.**
 *
 * The second arm was added at #229, which measured seven validation guards the
 * first arm missed because the condition reaches the act only through a local
 * (`if (!confirmQty.ok) …` → `const payload = build…({ confirmedQty:
 * confirmQty.value })` → `mutateAsync({ payload })`), or not syntactically at
 * all (`contractNumbers` and `draft` are both destructured from one hook call).
 * Following locals was considered and rejected: the contracts link needs
 * sibling bindings of one declaration tied together, and that same step ties
 * `const [selected, setSelected] = useState()` — every state read to every
 * setter — which would excuse #352's Overdue shape. An error toast REPORTS that
 * the act did not run, which is the refusal claim; a success claim cannot hide
 * there without contradicting its own variant. Conditions (1) and (2) still bind
 * both arms, so an early-return toast with NO act after it is never excluded,
 * whatever its variant.
 *
 * ⚠️ **IT RETURNS A REASON RATHER THAN A BOOLEAN ON PURPOSE: AN EXCLUSION THAT
 * CANNOT SAY WHY IT EXCLUDED IS INDISTINGUISHABLE FROM A SKIP**, and a skip is
 * the thing this guard's header refuses to carry.
 * @param {ts.SourceFile} sf
 * @param {string} src
 * @param {number} hStart
 * @param {number} bodyEnd
 * @param {number} pos
 * @param {RegExp | null} [hookMutate] from `hookMutateOf`
 * @returns {string[] | null}
 */
function refusalOf(sf, src, hStart, bodyEnd, pos, hookMutate = null) {
  if (!terminates(sf, hStart, pos)) return null;
  const gate = enclosingIf(sf, hStart, pos);
  if (!gate) return null;
  const after = src.slice(gate.getEnd(), bodyEnd);
  const act = realActIn(after, hookMutate);
  if (!act) return null;
  /** @type {ts.Node | undefined} */
  let call = nodeAt(sf, gate.getEnd() + (act.index ?? 0));
  while (call && !ts.isCallExpression(call)) call = call.parent;
  if (!call) return null;
  const used = identifiersOf(call);
  const shared = [...identifiersOf(gate.expression)].filter((i) => used.has(i));
  if (shared.length) return shared;
  return declaredVariant(sf, pos) === 'error' ? [ERROR_VARIANT] : null;
}

/**
 * @typedef {{
 *     readonly file: string;
 *     readonly line: number;
 *     readonly shared: readonly string[];
 *   }} Excluded
 */

/** @type {Excluded[]} */
const EXCLUSIONS = [];

/**
 * DERIVE every unbacked toast site across the shipped pages.
 * @returns {Site[]}
 */
function deriveUnbackedSites() {
  /** @type {Site[]} */
  const out = [];
  // Every page, single-file AND split into a folder: a top-level `readdirSync`
  // stopped at `SupplierRFQs/`, so a split page's handlers left the population
  // (frontend-standard Phase 5, PAGE-SPLIT-GUIDE).
  const files = pageFiles(PAGES_DIR);
  for (const file of files) {
    out.push(...sitesIn(file, readFileSync(join(PAGES_DIR, file), 'utf8'), EXCLUSIONS));
  }
  return out;
}

/**
 * The unbacked toast sites of ONE file. Split out of `deriveUnbackedSites` so
 * the matcher probes run the SHIPPED derivation over a synthetic source string,
 * not a copy of it.
 * @param {string} file
 * @param {string} raw
 * @param {Excluded[]} exclusions sink for the refusal class
 * @returns {Site[]}
 */
function sitesIn(file, raw, exclusions) {
  /** @type {Site[]} */
  const out = [];
  const src = codeOnly(raw);
  const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, scriptKindOf(file));
  const named = namedHandlerDefs(src);
  const hookMutate = hookMutateOf(src);
  for (const m of src.matchAll(/\btoast\s*\(\s*\{/g)) {
    const idx = m.index ?? 0;
    const pre = src.slice(0, idx);
    // The nearest handler start before the toast, inline OR named-and-wired.
    const handlers = [...pre.matchAll(AFFORDANCE), ...(named ? pre.matchAll(named) : [])].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0)
    );
    const h = handlers[handlers.length - 1];
    if (!h) continue;
    const hStart = h.index ?? 0;
    const bodyEnd = balancedEnd(src, hStart + h[0].length);
    const body = src.slice(hStart, bodyEnd);
    if (!body.includes('toast')) continue;
    // THE UNIT: the branch, not the body. A real act in a SIBLING clause of
    // the same handler no longer acquits the claim made here.
    const branch = coExecutingRegion(sf, body, hStart, idx);
    if (realActIn(branch, hookMutate)) continue; // backed — not this guard's business
    const line0 = pre.split('\n').length;
    if (out.some((s) => s.file === file && s.line === line0)) continue;
    // THE ONE EXCLUSION: a guard clause in front of the handler's own act
    // claims no act, so the admission test asks it the wrong question.
    const shared = refusalOf(sf, src, hStart, bodyEnd, idx, hookMutate);
    if (shared) {
      exclusions.push({ file, line: line0, shared });
      continue;
    }
    const keys = [...branch.matchAll(/t\('([^']+)'/g)].map((k) => k[1]);
    const literals = [...branch.matchAll(/(?:title|description):\s*[`'"]([^`'"]{4,})[`'"]/g)].map(
      (k) => k[1]
    );
    out.push({ file, line: line0, keys, literals });
  }
  return out;
}

const EN = /** @type {Record<string, string>} */ (resources.en.translation ?? {});
const ID = /** @type {Record<string, string>} */ (resources.id.translation ?? {});

const SITES = deriveUnbackedSites();

describe('unbacked-toast honesty guard (R1)', () => {
  it('derives a non-empty population — a guard over nothing guards nothing', () => {
    expect(SITES.length).toBeGreaterThan(10);
  });

  // A page split into a folder keeps its sites (PAGE-SPLIT-GUIDE): the Export
  // EDI toast stood in `SupplierShipments.jsx` and now stands in its index.
  // Before `pageFiles`, the top-level scan dropped it with nothing going red.
  it('a page split into a folder is still in the population', () => {
    const shipments = SITES.filter((s) => s.file.startsWith('SupplierShipments/'));
    expect(shipments.map((s) => s.file)).toContain('SupplierShipments/index.jsx');
    expect(shipments.flatMap((s) => s.keys)).toContain('supplierShipments.toast.export.title');
  });

  // ── Page folders are DERIVED from the tree (PAGE-SPLIT-GUIDE). A split adds
  // no line here. Membership is asserted on the scanned FILES, not on SITES:
  // most split pages hold no unbacked site (their toasts are backed, or they
  // have none), and a file the scan never reads can never become one.
  // `pagesDirFolders` reads the tree itself, not through `pageFiles`, so a
  // `pageFiles` that stopped descending into page folders goes red by name.
  const { pages: PAGE_FOLDERS, features: FEATURE_FOLDERS } = pagesDirFolders(PAGES_DIR);

  it('the page folders are derived — by membership, never by count', () => {
    expect(PAGE_FOLDERS.length).toBeGreaterThan(0);
    expect(PAGE_FOLDERS).toContain('BuyerSourcing');
    expect(PAGE_FOLDERS).toContain('SupplierShipments');
    expect(PAGE_FOLDERS).not.toContain('contracts');
    expect(FEATURE_FOLDERS).toContain('contracts');
  });

  it.each(PAGE_FOLDERS)('%s/ — every shipped file of the page folder is scanned', (page) => {
    const scanned = new Set(pageFiles(PAGES_DIR));
    const files = folderSourceFiles(PAGES_DIR, page);
    expect(files).toContain(`${page}/index.jsx`);
    const missing = files.filter((f) => !scanned.has(f));
    expect(missing, `not scanned: ${missing.join(', ')}`).toEqual([]);
  });

  it('KNOWN-BAD: no feature-folder file is scanned, and no split page left its old file', () => {
    const scanned = pageFiles(PAGES_DIR);
    const featureFiles = FEATURE_FOLDERS.flatMap((d) => folderSourceFiles(PAGES_DIR, d));
    expect(featureFiles).toContain('forecasts/forecastDisplay.jsx');
    expect(featureFiles).toContain('contracts/RaisedElsewhere.jsx');
    // A feature-folder file is scanned only when a route renders it.
    const routed = new Set(routedPageFiles(PAGES_DIR));
    expect(routed.has('contracts/RaisedElsewhere.jsx')).toBe(false);
    expect(scanned).toContain('admin/AdminSuppliers.jsx');
    expect(scanned).toContain('admin/AdminRuleValues/index.jsx');
    const leaked = scanned.filter((f) => featureFiles.includes(f) && !routed.has(f));
    expect(leaked, `feature files scanned as pages: ${leaked.join(', ')}`).toEqual([]);
    const folders = new Set(PAGE_FOLDERS);
    const stale = scanned.filter((f) => folders.has(f.replace(/\.[jt]sx$/, '')));
    expect(stale, `old page files beside their folder: ${stale.join(', ')}`).toEqual([]);
  });

  // CONTENT checks, not membership: the files a split moved toasts into still
  // hold them. Every one is backed (a `mutateAsync` or `run(` in the branch),
  // so none is a SITE; if the toast moved again, these say where to look.
  //  · BuyerReschedule: proposal acts in `hooks/useProposalActions.js`, the
  //    decision save in `components/DecisionControl.jsx`.
  //  · BuyerOrderPlan: draft toasts in `hooks/useDraftCallOff.js`.
  //  · SupplierForecastCommitments: Submit all in `hooks/useCommitmentActions.js`.
  it('the files a split moved toasts into still hold them', () => {
    for (const f of [
      'BuyerReschedule/hooks/useProposalActions.js',
      'BuyerReschedule/components/DecisionControl.jsx',
      'BuyerOrderPlan/hooks/useDraftCallOff.js',
      'SupplierForecastCommitments/hooks/useCommitmentActions.js'
    ]) {
      expect(readFileSync(join(PAGES_DIR, f), 'utf8'), f).toMatch(/\btoast\s*\(\s*\{/);
    }
  });

  // BuyerStabilise's two refusal toasts sit in the publish handler beside its
  // `mutateAsync`, so they are backed and never in SITES.
  it('the split publish page still holds its two toasts', () => {
    const src = readFileSync(join(PAGES_DIR, 'BuyerStabilise/index.jsx'), 'utf8');
    expect(src.match(/\btoast\s*\(\s*\{/g) ?? []).toHaveLength(2);
  });

  /**
   * ⚠️ **AN EXCLUSION THAT EXCLUDES NOTHING READS EXACTLY LIKE A WORKING ONE.**
   * If the refusal property stopped matching — a renamed identifier, a changed
   * act shape — every member would simply stay in the population and the suite
   * would pass, so the class would be dead code claiming to be a rule. This is
   * the anti-vacuity half; the specimen control below is the other direction.
   * It asserts MEMBERSHIP with the reason attached, never a count.
   */
  it('the refusal class excluded something, and can say why', () => {
    expect(EXCLUSIONS.length).toBeGreaterThan(0);
    for (const e of EXCLUSIONS) {
      expect(
        e.shared.length,
        `${e.file}:${e.line} was excluded without naming a shared identifier`
      ).toBeGreaterThan(0);
    }
  });

  it.each(SITES.map((s) => /** @type {const} */ ([`${s.file}:${s.line}`, s])))(
    'an unbacked affordance admits it in EN — %s',
    (_at, site) => {
      const claims = [...site.keys.map((k) => EN[k]).filter(Boolean), ...site.literals];
      if (claims.length === 0) return; // nothing user-visible to judge
      expect(
        claims.some(admits),
        `No claim admits the act did not happen. Claims: ${JSON.stringify(claims)}`
      ).toBe(true);
    }
  );

  it.each(SITES.map((s) => /** @type {const} */ ([`${s.file}:${s.line}`, s])))(
    'an unbacked affordance admits it in ID — %s',
    (_at, site) => {
      const claims = site.keys.map((k) => ID[k]).filter(Boolean);
      if (claims.length === 0) return;
      expect(
        claims.some(admits),
        `ID locale asserts an act with no admission. Claims: ${JSON.stringify(claims)}`
      ).toBe(true);
    }
  );

  it('every user-visible toast string is externalised (no hardcoded copy)', () => {
    const hardcoded = SITES.filter((s) =>
      s.literals.some((l) => !l.startsWith('t(') && /[a-z]{4}/.test(l))
    ).map((s) => `${s.file}:${s.line} → ${s.literals.join(' | ')}`);
    expect(
      hardcoded,
      `Hardcoded toast copy bypasses both locales:\n${hardcoded.join('\n')}`
    ).toEqual([]);
  });
});

/**
 * ⚠️ **THE PROBE FIRES AT A DEFECT THIS TREE REALLY CARRIED, NOT AT A SYNTHETIC
 * ONE** (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`). A subject built to be found
 * agrees with the matcher by construction; only the geometry the tree actually
 * occupied was aimed by something other than the seat that aimed the matcher.
 *
 * The input is #352's retired copy, re-injected into the branch it was retired
 * from. It must be CONVICTED by the branch unit and ACQUITTED by the body unit —
 * both directions in one run, because a probe that only shows the new unit
 * firing cannot show that the old unit was the thing at fault.
 */
/**
 * NAMED HANDLERS — the matcher probed BOTH WAYS on synthetic sources, then fired
 * at the defect the tree really carried (`ScenarioTab.sendToWarRoom`, #228).
 * Every probe runs the SHIPPED `sitesIn`, never a copy of it.
 */
describe('a named function wired to an on* prop is an affordance', () => {
  /** @param {string} body */
  const page = (body) => `const Page = () => {\n${body}\n};\n`;
  /** @param {string} src */
  const keysOf = (src) => sitesIn('Probe.jsx', src, []).flatMap((s) => s.keys);
  const UNBACKED = `toast({ variant: 'success', title: t('probe.sent.title') });`;

  it.each([
    ['const arrow, onClick={name}', `const send = () => { ${UNBACKED} };`, '{send}'],
    ['async arrow', `const send = async () => { ${UNBACKED} };`, '{send}'],
    ['function declaration', `function send() { ${UNBACKED} }`, '{send}'],
    ['useCallback', `const send = useCallback(() => { ${UNBACKED} }, []);`, '{send}']
  ])('FOUND — %s with an unbacked success toast', (_shape, def, wire) => {
    const src = page(`${def}\nreturn <Button onClick=${wire}>Send</Button>;`);
    // The gap was real: the inline matcher alone sees no handler here.
    expect([...codeOnly(src).matchAll(AFFORDANCE)]).toEqual([]);
    expect(keysOf(src)).toContain('probe.sent.title');
  });

  it('FOUND — a name wired as `onClick: name` in an object of actions', () => {
    const src = page(
      `const send = () => { ${UNBACKED} };\nconst actions = [{ label: 'Send', onClick: send }];`
    );
    expect(keysOf(src)).toContain('probe.sent.title');
  });

  it.each([
    ['mutateAsync', `await sendMutation.mutateAsync({ id });`],
    ['dispatch', `dispatch({ type: 'send' });`]
  ])('NOT a site — the named handler performs a real act (%s)', (_act, act) => {
    const src = page(
      `const send = async () => { ${act} ${UNBACKED} };\nreturn <Button onClick={send}>Send</Button>;`
    );
    expect(keysOf(src)).toEqual([]);
  });

  it('NOT a site — a toast helper no on* prop names, e.g. one fired from onSuccess', () => {
    const helper = `const notify = () => { ${UNBACKED} };\nconst save = useSaveMutation({ onSuccess: notify });`;
    const unwired = page(`${helper}\nreturn <Button onClick={() => save.mutate()}>Save</Button>;`);
    expect(keysOf(unwired)).toEqual([]);
    // The same helper, wired to a click, IS a site — so the empty result above
    // is the wiring test speaking, not a matcher that finds nothing.
    const wired = page(`${helper}\nreturn <Button onClick={notify}>Save</Button>;`);
    expect(keysOf(wired)).toContain('probe.sent.title');
  });

  // POSITIVE CONTROL ON THE DEFECT THE TREE REALLY HAD: #228's war-room
  // handler. IA P-10 (owner ruled 2026-10-21) retired its page (BuyerRisk), so
  // the shipped matcher is fired at the handler's last shipped source, quoted
  // here verbatim, and its repaired copy (still in the i18n layer) must admit.
  it('ScenarioTab.sendToWarRoom, as last shipped, is a site, and its copy admits', () => {
    const shipped = [
      'const ScenarioTab = () => {',
      '  const sendToWarRoom = () => {',
      '    toast({',
      "      variant: 'warning',",
      "      title: t('risk.toast.warRoomNotSent.title'),",
      "      description: t('risk.toast.warRoomNotSent.desc', { title: featured.title })",
      '    });',
      '  };',
      '  return (',
      '    <Button variant="outline" icon={Send} onClick={sendToWarRoom} className="shrink-0">',
      "      {t('risk.scenario.sendWarRoom')}",
      '    </Button>',
      '  );',
      '};'
    ].join('\n');
    const site = sitesIn('BuyerRisk/components/ScenarioTab.jsx', shipped, []).find((x) =>
      x.keys.includes('risk.toast.warRoomNotSent.title')
    );
    expect(site, 'the named war-room handler must be a site').toBeDefined();
    const keys = site?.keys ?? [];
    expect(keys.map((k) => EN[k]).some(admits), 'EN must admit').toBe(true);
    expect(keys.map((k) => ID[k]).some(admits), 'ID must admit').toBe(true);
  });
});

/**
 * #229's two widenings, probed BOTH WAYS on synthetic sources and then asserted
 * by membership on the tree they were measured against.
 */
describe('the refusal class reads a declared error; a hook-bound mutate is an act', () => {
  /** @param {string} body */
  const page = (body) => `const Page = () => {\n${body}\n};\n`;
  /** @param {string} src */
  const run = (src) => {
    /** @type {Excluded[]} */
    const excluded = [];
    const keys = sitesIn('Probe.jsx', src, excluded).flatMap((s) => s.keys);
    return { keys, excluded: excluded.map((e) => e.shared) };
  };
  /** @param {string} variant */
  const guard = (variant) =>
    `if (!qty.ok) { toast({ variant: '${variant}', title: t('probe.refused') }); return; }`;
  // The ConfirmPanel shape: the condition reaches the act only through `payload`.
  const ACT = `const payload = build({ confirmedQty: qty.value });\nawait saveMutation.mutateAsync({ payload });`;

  it('EXCLUDED — an error toast in a guard clause before the act, reached through a local', () => {
    const r = run(
      page(
        `const submit = async () => { ${guard('error')}\n${ACT} };\nreturn <B onClick={submit} />;`
      )
    );
    expect(r.keys).toEqual([]);
    expect(r.excluded).toEqual([[ERROR_VARIANT]]);
  });

  it('STILL A SITE — the same early-return error toast with NO act after it in the handler', () => {
    const r = run(
      page(`const submit = () => { ${guard('error')}\nclose(); };\nreturn <B onClick={submit} />;`)
    );
    expect(r.keys).toContain('probe.refused');
    expect(r.excluded).toEqual([]);
  });

  it('STILL A SITE — a success toast in the same guard position, before the act', () => {
    const r = run(
      page(
        `const submit = async () => { ${guard('success')}\n${ACT} };\nreturn <B onClick={submit} />;`
      )
    );
    expect(r.keys).toContain('probe.refused');
    expect(r.excluded).toEqual([]);
  });

  const TOAST = `toast({ variant: 'warning', title: t('probe.result') });`;

  it('BACKED — `.mutate(` on a name bound from a hook (the AsnEtaChange shape)', () => {
    const r = run(
      page(
        `const changeEta = useAdvanceShipNoticeChangeEta();\nconst go = () => changeEta.mutate({ eta }, { onSuccess: () => { ${TOAST} } });\nreturn <B onClick={go} />;`
      )
    );
    expect(r.keys).toEqual([]);
  });

  it('NOT BACKED — `.mutate(` on a local object that no hook bound', () => {
    const r = run(
      page(
        `const api = { mutate() {} };\nconst go = () => { api.mutate({ eta }); ${TOAST} };\nreturn <B onClick={go} />;`
      )
    );
    expect(r.keys).toContain('probe.result');
  });

  // MEMBERSHIP on the real tree, by name: the eight #229 measured.
  const at = (/** @type {{ file: string; line: number }} */ s) => `${s.file}:${s.line}`;
  const siteFiles = new Set(SITES.map((s) => s.file));
  const excludedByVariant = EXCLUSIONS.filter((e) => e.shared.includes(ERROR_VARIANT)).map(at);

  it.each([
    'BuyerContracts/index.jsx',
    'SupplierForecasts/components/ConfirmPanel.jsx',
    'SupplierForecasts/components/ShipmentReportPanel.jsx'
  ])('%s — its validation guards are refusals, not sites', (file) => {
    expect(siteFiles.has(file), `${file} still contributes a site`).toBe(false);
    expect(excludedByVariant.some((e) => e.startsWith(`${file}:`))).toBe(true);
  });

  it('the seven guard clauses are excluded by name, with the reason attached', () => {
    /** @type {Record<string, number>} */
    const perFile = {};
    for (const e of excludedByVariant) {
      const f = e.replace(/:\d+$/, '');
      perFile[f] = (perFile[f] ?? 0) + 1;
    }
    // One per guard clause: the contract-number refusal, ConfirmPanel's
    // quantity + root cause, ShipmentReportPanel's material / direction /
    // quantity / ASN.
    expect(perFile).toMatchObject({
      'BuyerContracts/index.jsx': 1,
      'SupplierForecasts/components/ConfirmPanel.jsx': 2,
      'SupplierForecasts/components/ShipmentReportPanel.jsx': 4
    });
  });

  it('AsnEtaChange.run is backed by its hook dispatch, so it is neither a site nor an exclusion', () => {
    const file = 'SupplierShipments/components/AsnEtaChange.jsx';
    expect(pageFiles(PAGES_DIR)).toContain(file);
    expect(siteFiles.has(file)).toBe(false);
    expect(EXCLUSIONS.map((e) => e.file)).not.toContain(file);
  });
});

describe('the branch unit, fired at the defect it was built for (#352)', () => {
  const SRC = join(PAGES_DIR, 'BuyerInvoices.jsx');
  const RETIRED_EN = 'Routed to Finance Controller for urgent action.';

  it('the retired claim would not have admitted anything', () => {
    expect(admits(RETIRED_EN)).toBe(false);
  });

  it('the Overdue branch is in the population, and the handler body is not', () => {
    const raw = readFileSync(SRC, 'utf8');
    const src = codeOnly(raw);
    const sf = ts.createSourceFile(
      'BuyerInvoices.jsx',
      raw,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const idx = src.indexOf("t('buyerInvoices.toast.escalate.title'");
    expect(idx, 'the Overdue branch must still be findable').toBeGreaterThan(0);
    const pre = src.slice(0, idx);
    const handlers = [...pre.matchAll(AFFORDANCE)];
    const h = handlers[handlers.length - 1];
    const hStart = h?.index ?? 0;
    const body = src.slice(hStart, balancedEnd(src, hStart + (h?.[0].length ?? 0)));
    const branch = coExecutingRegion(sf, body, hStart, src.lastIndexOf('toast', idx));

    // The OLD unit acquits: a sibling clause calls setPanelMode.
    expect(PERFORMS_REAL_ACT.test(body), 'the handler BODY performs a real act').toBe(true);
    // The NEW unit convicts: this clause performs none.
    expect(PERFORMS_REAL_ACT.test(branch), 'the Overdue BRANCH performs none').toBe(false);
    // And the narrowing is real, not a parse that returned nothing.
    expect(branch.trim().length, 'the branch must not be empty').toBeGreaterThan(0);
    expect(branch.length).toBe(body.length); // length-preserving

    // ⚠️ AND THE ONE EXCLUSION MUST NOT REACH IT. The Overdue clause guards no
    // act — nothing follows it in the handler — so it is not a refusal, and
    // #352's defect cannot be excluded on its way past the admission test.
    const bodyEnd = hStart + body.length;
    expect(
      refusalOf(sf, src, hStart, bodyEnd, src.lastIndexOf('toast', idx)),
      'the refusal class must NOT exclude the branch #352 repaired'
    ).toBeNull();
    // Positive control on that instrument in the same run: it DOES exclude the
    // refusals it was derived from, so a null above means "not a refusal"
    // rather than "this function never returns anything".
    expect(EXCLUSIONS.length, 'refusalOf must be capable of excluding').toBeGreaterThan(0);
  });
});
