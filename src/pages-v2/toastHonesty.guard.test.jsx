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
//      COMMON.**
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
import { pageFiles } from '@test/pageFiles';

const PAGES_DIR = __dirname;

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
 * THE REFUSAL CLASS — see the header. Returns the identifiers the condition and
 * the act READ IN COMMON, or null when the branch is not a refusal.
 *
 * ⚠️ **IT RETURNS THE NAMES RATHER THAN A BOOLEAN ON PURPOSE: AN EXCLUSION THAT
 * CANNOT SAY WHY IT EXCLUDED IS INDISTINGUISHABLE FROM A SKIP**, and a skip is
 * the thing this guard's header refuses to carry.
 * @param {ts.SourceFile} sf
 * @param {string} src
 * @param {number} hStart
 * @param {number} bodyEnd
 * @param {number} pos
 * @returns {string[] | null}
 */
function refusalOf(sf, src, hStart, bodyEnd, pos) {
  if (!terminates(sf, hStart, pos)) return null;
  const gate = enclosingIf(sf, hStart, pos);
  if (!gate) return null;
  const after = src.slice(gate.getEnd(), bodyEnd);
  const act = after.match(PERFORMS_REAL_ACT);
  if (!act) return null;
  /** @type {ts.Node | undefined} */
  let call = nodeAt(sf, gate.getEnd() + (act.index ?? 0));
  while (call && !ts.isCallExpression(call)) call = call.parent;
  if (!call) return null;
  const used = identifiersOf(call);
  const shared = [...identifiersOf(gate.expression)].filter((i) => used.has(i));
  return shared.length ? shared : null;
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
    const raw = readFileSync(join(PAGES_DIR, file), 'utf8');
    const src = codeOnly(raw);
    const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, scriptKindOf(file));
    for (const m of src.matchAll(/\btoast\s*\(\s*\{/g)) {
      const idx = m.index ?? 0;
      const pre = src.slice(0, idx);
      const handlers = [...pre.matchAll(AFFORDANCE)];
      const h = handlers[handlers.length - 1];
      if (!h) continue;
      const hStart = h.index ?? 0;
      const bodyEnd = balancedEnd(src, hStart + h[0].length);
      const body = src.slice(hStart, bodyEnd);
      if (!body.includes('toast')) continue;
      // THE UNIT: the branch, not the body. A real act in a SIBLING clause of
      // the same handler no longer acquits the claim made here.
      const branch = coExecutingRegion(sf, body, hStart, idx);
      if (PERFORMS_REAL_ACT.test(branch)) continue; // backed — not this guard's business
      const line0 = pre.split('\n').length;
      if (out.some((s) => s.file === file && s.line === line0)) continue;
      // THE ONE EXCLUSION: a guard clause in front of the handler's own act
      // claims no act, so the admission test asks it the wrong question.
      const shared = refusalOf(sf, src, hStart, bodyEnd, idx);
      if (shared) {
        EXCLUSIONS.push({ file, line: line0, shared });
        continue;
      }
      const keys = [...branch.matchAll(/t\('([^']+)'/g)].map((k) => k[1]);
      const literals = [...branch.matchAll(/(?:title|description):\s*[`'"]([^`'"]{4,})[`'"]/g)].map(
        (k) => k[1]
      );
      out.push({ file, line: line0, keys, literals });
    }
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
    // `BuyerContracts` contributes no site and no exclusion (measured before
    // and after its split), so its membership is asserted on the scanned FILES:
    // its index, which holds its one toast, and a hook the split moved
    // handlers into.
    const scanned = pageFiles(PAGES_DIR);
    expect(scanned).toContain('BuyerContracts/index.jsx');
    expect(scanned).toContain('BuyerContracts/hooks/useContractDraft.js');
  });

  // `/register` holds no toast site, so its folder is pinned in the FILE
  // population the sites are derived from rather than in the sites.
  it('the SupplierRegistration folder is in the scanned files', () => {
    const files = pageFiles(PAGES_DIR);
    expect(files).toContain('SupplierRegistration/index.jsx');
    expect(files).toContain('SupplierRegistration/components/ContactsStep.jsx');
    expect(files).not.toContain('SupplierRegistration.jsx');
  });

  // BuyerCommitments has no `toast({` site of its own (its toasts are the
  // success texts `run` shows), so its split is asserted on the FILE population:
  // the hook that now holds the submit handler is read like the page was.
  it('a split page with no toast site still has its handler files in the population', () => {
    const files = pageFiles(PAGES_DIR);
    expect(files).toContain('BuyerCommitments/index.jsx');
    expect(files).toContain('BuyerCommitments/hooks/useCommitmentAction.js');
    expect(files).not.toContain('BuyerCommitments.jsx');
  });

  // BuyerReschedule's proposal acts toast from `hooks/useProposalActions.js`
  // and its decision save from `components/DecisionControl.jsx`. Every one is
  // backed (a `mutateAsync` in the branch), so none is a SITE; the scan must
  // still read both files, or a future unbacked toast there would go unseen.
  it('a split page’s hook and component files are scanned', () => {
    const files = pageFiles(PAGES_DIR);
    for (const f of [
      'BuyerReschedule/hooks/useProposalActions.js',
      'BuyerReschedule/components/DecisionControl.jsx'
    ]) {
      expect(files).toContain(f);
      expect(readFileSync(join(PAGES_DIR, f), 'utf8')).toMatch(/\btoast\s*\(\s*\{/);
    }
    expect(files).toContain('BuyerReschedule/index.jsx');
    // A split page's HOOKS are scanned too: `BuyerOrderPlan`'s draft toasts
    // moved from the page file into `hooks/useDraftCallOff.js`.
    const files = pageFiles(PAGES_DIR);
    expect(files).toContain('BuyerOrderPlan/index.jsx');
    expect(files).toContain('BuyerOrderPlan/hooks/useDraftCallOff.js');
    expect(files).not.toContain('BuyerOrderPlan.jsx');
  });

  // BuyerStabilise was split the same way. Its two refusal toasts sit in the
  // publish handler beside its `mutateAsync`, so they are backed and never in
  // SITES — which is why membership is asserted on the SCANNED files instead:
  // the index that holds those toasts must still be read by the scan.
  it('the split publish page is still scanned, toasts and all', () => {
    const files = pageFiles(PAGES_DIR);
    expect(files).toContain('BuyerStabilise/index.jsx');
    expect(files).not.toContain('BuyerStabilise.jsx');
    const src = readFileSync(join(PAGES_DIR, 'BuyerStabilise/index.jsx'), 'utf8');
    expect(src.match(/\btoast\s*\(\s*\{/g) ?? []).toHaveLength(2);
  });

  // SupplierForecastCommitments' Submit all toasts moved from the page file to
  // `hooks/useCommitmentActions.js`. They are backed (each follows a `run(`),
  // so they are not SITES before or after the split; what must hold is that
  // the hook is still READ, or a future unbacked toast there would go unjudged.
  it('a split page’s hooks are still scanned — SupplierForecastCommitments', () => {
    const files = pageFiles(PAGES_DIR);
    expect(files).toContain('SupplierForecastCommitments/index.jsx');
    expect(files).toContain('SupplierForecastCommitments/hooks/useCommitmentActions.js');
    expect(
      readFileSync(
        join(PAGES_DIR, 'SupplierForecastCommitments/hooks/useCommitmentActions.js'),
        'utf8'
      )
    ).toMatch(/\btoast\s*\(\s*\{/);
    expect(files).not.toContain('forecasts/forecastDisplay.jsx');
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
