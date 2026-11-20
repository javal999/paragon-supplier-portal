// ────────────────────────────────────────────────────────────────────────────
// Invoice match rollup (v2.2 Step 4 batch iii — census G2, DR-7 ruling 1).
//
// The 3-way match is the invoice's parallel sub-axis (`invoiceMatch.flow.js`).
// Its rolled-up terminal is carried on the canonical invoice as `matchStatus`
// and surfaced on the buyer read as a computed projection (ruling 1: matchStatus
// is a read-layer concern, not a stored second lifecycle). This module is the
// ONE home for the rollup predicate, so the SAME computation gates the header
// advance (the `invoice_rollup_matched` policy hook on `t_invoice_match`) — the
// header can never assert `Matched` against a mismatched line.
// ────────────────────────────────────────────────────────────────────────────

/** @import { Invoice, InvoiceStatus, GRStatus } from '../data/types' */
import { invoicePriceTolerance } from './fulfilmentConfig';

/**
 * True when the match sub-flow has rolled up to a clean 3-way `Matched`.
 * @param {Invoice} inv
 * @returns {boolean}
 */
export function isMatched(inv) {
  return inv.matchStatus === 'Matched';
}

// ── 3-way match verdict (F0.2 — GR-post → invoice-match cascade) ──────────────
// The three terminal verdicts a posted GR produces on the invoice sharing its PO.
// A subset of `InvoiceMatchStatus` (the pre-GR states 'Pending' / 'Pending GR'
// are not verdicts a completed GR yields).
/** @typedef {'Matched' | 'Qty Mismatch' | 'Price Variance'} MatchVerdict */

// ── CR-12 price tolerance (BL-44, owner decision 2026-09-21) ─────────────────
//
// ⚠️ `MATCH_TOLERANCE = 0.01` (a flat 1%) IS RETIRED. CR-12 now has two rules,
// chosen per line by whether its PO price comes from a contract:
//   • contract price → 0%: the billed amount must equal quantity × PO price;
//   • otherwise      → within 2% of quantity × PO price AND within the absolute
//                      rupiah cap (owner-approved default 2026-11-20, BL-54;
//                      Finance may change it).
// The numbers live in `fulfilmentConfig.js`, never here.

/** Which CR-12 rule a price is checked under. */
/** @typedef {'contract' | 'standard'} PriceRule */

/**
 * The result of one price check, in business terms:
 *   exact            — billed exactly the expected value (passes under both rules)
 *   withinTolerance  — no contract price; within 2% and within the cap (passes)
 *   contractDiffers  — contract price; billed differs by any amount (held)
 *   overPercent      — no contract price; more than 2% off (held)
 *   overCap          — no contract price; within 2% but more than the cap (held)
 *   noBasis          — nothing to compare against (expected value 0; held)
 */
/**
 * @typedef {| 'exact'
 *   | 'withinTolerance'
 *   | 'contractDiffers'
 *   | 'overPercent'
 *   | 'overCap'
 *   | 'noBasis'} PriceCheckOutcome
 */

/**
 * @typedef {object} PriceCheck
 * @property {PriceRule} rule
 * @property {number} expected -  Quantity × PO unit price.
 * @property {number} billed -  What the supplier billed.
 * @property {number} difference -  billed − expected (negative = billed below).
 * @property {number | null} percent -  |difference| ÷ expected × 100; null when there is no basis.
 * @property {PriceCheckOutcome} outcome
 * @property {boolean} held -  True when the outcome makes the invoice a Price variance exception.
 */

/**
 * Rupiah amounts are compared to the sen, so float noise never decides a match.
 * @param {number} n
 * @returns {number}
 */
const toSen = (n) => Math.round(n * 100) / 100;

/**
 * CR-12 — check one billed amount against its expected value under a rule.
 * PURE. The percentage test is written as |diff| × 100 ≤ expected × pct so the
 * boundary (exactly 2%) is decided exactly, not by a float division.
 * @param {PriceRule} rule
 * @param {number} expected
 * @param {number} billed
 * @returns {PriceCheck}
 */
export function checkPrice(rule, expected, billed) {
  const difference = toSen(billed - expected);
  const abs = Math.abs(difference);
  const base = { rule, expected, billed, difference };
  if (!(expected > 0)) return { ...base, percent: null, outcome: 'noBasis', held: true };
  const percent = (abs / expected) * 100;
  /** @param {number} pct */
  const withinPct = (pct) => abs * 100 <= expected * pct;
  // The administrator's values in force at THIS check (BL-32), never a copy.
  const tol = invoicePriceTolerance();
  if (abs === 0) return { ...base, percent, outcome: 'exact', held: false };
  if (rule === 'contract') {
    return withinPct(tol.contractPricePct)
      ? { ...base, percent, outcome: 'withinTolerance', held: false }
      : { ...base, percent, outcome: 'contractDiffers', held: true };
  }
  if (!withinPct(tol.standardPct)) {
    return { ...base, percent, outcome: 'overPercent', held: true };
  }
  if (abs > tol.standardCapIdr) {
    return { ...base, percent, outcome: 'overCap', held: true };
  }
  return { ...base, percent, outcome: 'withinTolerance', held: false };
}

/**
 * Derive the honest 3-way verdict from real data (F0.2, census G2 semantics):
 *   • the GR carries a rejection            → 'Qty Mismatch' (CR-13)
 *   • the invoiced amount passes CR-12 under `rule` → 'Matched'
 *   • otherwise                              → 'Price Variance'
 * PURE — no store reads, no clock. `expectedValue` is Σ(confirmedQty × unitPrice)
 * from the parent PO; the caller gathers it (adapter side), and the caller
 * chooses the rule — for a whole-invoice check that is 'contract' when any line
 * of the order carries a contract price, because a difference that is not split
 * by line cannot be shown to fall on a line allowed 2%.
 * @param {number} expectedValue
 * @param {number} invoicedAmount
 * @param {boolean} grHasRejects
 * @param {PriceRule} rule
 * @returns {MatchVerdict}
 */
export function deriveMatchVerdict(expectedValue, invoicedAmount, grHasRejects, rule) {
  if (grHasRejects) return 'Qty Mismatch';
  return checkPrice(rule, expectedValue, invoicedAmount).held ? 'Price Variance' : 'Matched';
}

// ── THE PAIRING, BOTH DIRECTIONS ─────────────────────────────────────────────
//
// ⚠️ **WHY THIS EXISTS: THE PAIRING WAS REAL AND UNNAMED, AND AN UNNAMED
// RELATION CAN ONLY BE ASKED IN THE DIRECTION SOMEBODY HAPPENED TO WRITE.** The
// GR-post cascade resolver carried the whole relation inline, as one clause of a
// `for` loop in `MockCommandService.resolveCascades`:
//
//     if (inv.poNumber !== gr.poNumber || inv.status !== 'Submitted') continue;
//
// That clause IS the pairing. Living inside the receipt-side resolver, it could
// only ever answer *"which invoices does this receipt match?"* — so the mirror
// question, *"which receipt does this invoice match?"*, had no home and no test,
// and **an invoice that arrives after its receipt is matched by nothing.**
// Extracting the relation is what makes the second question askable at all.
//
// ⚠️ **THE TWO DIRECTIONS ARE NOT SYMMETRICAL, AND THE ASYMMETRY IS THE PART
// WORTH READING — IT IS NOT AN OVERSIGHT TO BE TIDIED AWAY LATER.**
// `invoicesForReceipt` deliberately does **NOT** filter on the receipt's own
// status, and it must not: it is called from the `t_gr_post` cascade, which runs
// POST-APPLY, so the receipt's state at that moment is the SAP interim
// `'Posting to SAP'` and not `'Posted to SAP'`. **The landing is the caller's
// premise there** — the receipt is landing, that is why the resolver is running.
// The invoice direction has no such premise and therefore has to ASK, which is
// why only `receiptsForInvoice` consults `RECEIPT_LANDED_STATES`. Adding a
// receipt-status filter to the receipt direction would silently empty the live
// cascade; `invoiceMatchPairing.test.js` pins that both ways.
//
// ⚠️ **NOTHING DISPATCHES THE INVOICE DIRECTION, AND THAT IS STATED RATHER THAN
// IMPLIED.** `receiptsForInvoice` has no caller in shipped code today. It is a
// pure function with a test and no producer — which is a weaker thing than a
// wired mechanism and a stronger thing than a comment, and it is deliberately
// the former rather than the latter, because the questions it would need
// answered to be wired are rulings and not derivations:
//
//   1. **WHICH receipt**, when a PO carries more than one landed receipt.
//      `invoicesForReceipt` never faces this — its receipt is given. Today the
//      corpus has 14 receipts across 14 distinct POs, so the case is
//      unreachable; partial delivery makes it ordinary.
//   2. **THE OVERWRITE.** The GR-post resolver writes `matchStatus` with no
//      guard on its current value, so a later receipt fully overwrites an
//      earlier verdict — and a `Qty Mismatch` leaves the invoice `Submitted` by
//      design, so it stays in the population and is erased with no event. That
//      is a live property of the shipped path, not something this module
//      introduces, and it must be ruled before a SECOND writer exists.
//   3. **THE SECOND ENTRANCE.** `t_invoice_resolve` (`Disputed → Submitted`) is
//      a second door into the state a match verdict is written for, and any
//      trigger hung on `t_invoice_submit` alone would miss it (§84 — the
//      entrance is the unit, on the machine side).
//
// ⚠️ **AND A CASCADE REGISTRY ENTRY WAS CONSIDERED AND IS NOT WHAT IS MISSING.**
// `CASCADES` (`cascades.js`) is `Record<sourceTransitionId, CascadeLink[]>` and
// holds five distinct source keys today, so a `t_invoice_submit` key would be a
// SIXTH key and collides with nothing — the registry is not the obstacle, and a
// future reader reaching for it should not re-derive that. What stops it is (1)
// and (2) above, which are rulings; the shape of the registry is not a reason.

/** The minimum an invoice must expose to be paired. Real `Invoice` satisfies it. */
/**
 * @typedef {{
 *   readonly poNumber: string;
 *   readonly status: InvoiceStatus;
 * }} PairableInvoice
 */

/** The minimum a receipt must expose to be paired. Real `GoodsReceipt` satisfies it. */
/**
 * @typedef {{
 *   readonly poNumber: string;
 *   readonly status: GRStatus;
 * }} PairableReceipt
 */

/**
 * The invoice state a match verdict is written FOR. Not a list: the header
 * advance `t_invoice_match` is `from: ['Submitted']`, so any other state is one
 * the verdict could not be acted on from.
 * @type {InvoiceStatus}
 */
export const INVOICE_AWAITING_MATCH = 'Submitted';

/**
 * Receipt states in which the goods have LANDED — i.e. a receipt an invoice can
 * be matched against after the fact.
 *
 * ⚠️ **THE NARROWEST HONEST READING, AND THE ALTERNATIVES ARE NAMED RATHER THAN
 * SILENTLY EXCLUDED.** `'Posted to SAP'` is the settled state — the material
 * document exists. `'Posting to SAP'` is the Option-B interim: the act is in
 * flight and no document has been minted, so treating it as landed would assert
 * a receipt that has not settled. `'Approved'` / `'Partially Approved'` mean
 * INSPECTED, not received into SAP. Widening this set is a RULING and not a
 * derivation, and it costs nothing today because no dispatcher consumes this
 * function — which is precisely why the narrow choice is the safe one to ship.
 * @type {readonly GRStatus[]}
 */
export const RECEIPT_LANDED_STATES = Object.freeze(['Posted to SAP']);

/**
 * RECEIPT → INVOICES. Which invoices does this receipt match?
 *
 * The shipped GR-post direction, extracted verbatim: same PO, and awaiting a
 * verdict. **Deliberately does not read `receipt.status`** — see the asymmetry
 * note above; the caller's premise is that this receipt is landing.
 * @template {PairableInvoice} I
 * @param {PairableReceipt} receipt
 * @param {readonly I[]} invoices
 * @returns {readonly I[]}
 */
export function invoicesForReceipt(receipt, invoices) {
  return invoices.filter(
    (inv) => inv.poNumber === receipt.poNumber && inv.status === INVOICE_AWAITING_MATCH
  );
}

/**
 * INVOICE → RECEIPTS. Which receipts can this invoice be matched against?
 *
 * The mirror, and the direction the tree could not ask before. Same PO, and the
 * receipt must have LANDED — because here nothing has established that it did.
 * Returns every candidate rather than choosing one: **choosing is a ruling this
 * function must not make silently** (see (1) above).
 * @template {PairableReceipt} R
 * @param {PairableInvoice} invoice
 * @param {readonly R[]} receipts
 * @returns {readonly R[]}
 */
export function receiptsForInvoice(invoice, receipts) {
  return receipts.filter(
    (gr) => gr.poNumber === invoice.poNumber && RECEIPT_LANDED_STATES.includes(gr.status)
  );
}
