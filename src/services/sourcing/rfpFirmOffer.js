// ────────────────────────────────────────────────────────────────────────────
// NR-2 — THE FIRM-OFFER ROUND ON AN RFP (decision D-1, option A).
//
// An RFP price is INDICATIVE (RFX-D4). An award binds, so it rests on a FIRM
// price, and a firm price comes from a firm-offer round inside the RFP: the
// buyer names options, quantity points and the suppliers asked; each asked
// supplier sends firm prices with a validity date and may revise them until
// the round closes.
//
// Pure, like `rfxRules`: no store, no clock of its own. The policy hooks and a
// page's pre-check call the SAME functions (RFX-R2), and each refusal starts
// with its code.
// ────────────────────────────────────────────────────────────────────────────

import { isCalendarDate } from '@lib/workingCalendar';
import { isAttachmentMeta } from '../attachments/sessionAttachments';
import { isPastDeadline } from '../transitions/rfxRules';
/** @import { GateResult } from './complianceGate' */
import { gateRefusal } from './complianceGate';
/** @import { RfpFirmOffer, RfpFirmPrice } from './types' */

/** The id prefix a supplier gives its own proposed options (`RfpPricingAnswer.proposedOptions`). */
const PROPOSED_PREFIX = 'sup-opt-';

/**
 * THE ONE NAME FOR AN RFP OPTION IN A ROUND OR A FIRM PRICE.
 *
 * A buyer option id (`RfpPricingRequest.options`) is unique on its RFP and is
 * its own ref. A supplier-proposed id (`sup-opt-N`) is unique only within ONE
 * supplier's response, so two suppliers' `sup-opt-1` are two different options;
 * its ref is `${proposerSupplierId}:${optionId}`, which says whose option it is.
 * @param {string} optionId
 * @param {string} [proposerSupplierId]
 * @returns {string}
 */
export function rfpOptionRef(optionId, proposerSupplierId) {
  return proposerSupplierId ? `${proposerSupplierId}:${optionId}` : optionId;
}

/**
 * The option a ref names. Only `<supplier>:sup-opt-…` reads as supplier-proposed;
 * anything else is a buyer option id, taken as-is.
 * @param {string} ref
 * @returns {{ readonly optionId: string; readonly proposerSupplierId?: string }}
 */
export function parseRfpOptionRef(ref) {
  const at = ref.indexOf(':');
  if (at > 0 && ref.slice(at + 1).startsWith(PROPOSED_PREFIX)) {
    return { optionId: ref.slice(at + 1), proposerSupplierId: ref.slice(0, at) };
  }
  return { optionId: ref };
}

/**
 * @param {unknown} v
 * @returns {readonly string[] | null}
 */
const strings = (v) =>
  Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length > 0)
    ? /** @type {string[]} */ (v)
    : null;

/** What the buyer asks for when opening a round (the verb payload, unchecked). */
/**
 * @typedef {object} RfpRoundRequest
 * @property {unknown} optionRefs
 * @property {unknown} quantityPoints
 * @property {unknown} invitedSupplierIds
 * @property {unknown} deadline
 */

/** What the RFP says about who and what may enter a round. */
/**
 * @typedef {object} RfpRoundFacts
 * @property {string | null} rfpStatus -  The RFP's stored status; null when there is no such RFP.
 * @property {readonly string[]} knownOptionRefs -  Refs of the RFP's own options plus those suppliers proposed in a SUBMITTED response.
 * @property {readonly string[]} settledOptionRefs RFX-D15 — refs no longer OPEN on this RFP: named by an RFP award in force
 *   or sourced by a live RFQ created from the RFP (`rfpSettledOptionRefs`).
 * @property {readonly string[]} respondedSupplierIds -  Suppliers with a SUBMITTED response to this RFP.
 * @property {(supplierId: string) => GateResult} gate -  CR-23 for one supplier on this RFP.
 */

/**
 * RFX-D15 — the RFP statuses a firm-offer round may open on.
 * @type {readonly string[]}
 */
export const RFP_ROUND_READY_STATUSES = ['Closed', 'Partly awarded'];

/**
 * NR-2 BR-02 — the refusal a firm-offer round earns, or null.
 *
 * The RFP is Closed or Partly awarded (RFX-D15: proposals are in, and the round
 * changes neither status); the options exist on the RFP or in a submitted
 * proposal (edge case 3) and are still OPEN, neither awarded on the RFP nor
 * sourced by an RFQ created from it; the quantity points are above zero; and
 * every invitee submitted a response and passes CR-23.
 * @param {RfpRoundRequest} req
 * @param {RfpRoundFacts} facts
 * @returns {string | null}
 */
export function rfpOfferRoundRefusal(req, facts) {
  if (facts.rfpStatus === null) return 'RFP_NOT_FOUND: the round names no RFP this hub holds';
  if (!RFP_ROUND_READY_STATUSES.includes(facts.rfpStatus)) {
    return `RFP_NOT_ROUND_READY: a firm-offer round opens on a Closed or Partly awarded RFP; this one is ${facts.rfpStatus}`;
  }
  if (typeof req.deadline !== 'string' || !isCalendarDate(req.deadline)) {
    return 'BAD_DEADLINE: the round needs a deadline date';
  }
  const optionRefs = strings(req.optionRefs);
  if (!optionRefs || optionRefs.length === 0) return 'ROUND_NO_OPTIONS: name at least one option';
  // A bare `sup-opt-N` is not a ref (whose option?), so it is unknown here too.
  const unknown = optionRefs.filter((ref) => !facts.knownOptionRefs.includes(ref));
  if (unknown.length > 0) return `ROUND_OPTION_UNKNOWN: ${unknown.join(', ')}`;
  // RFX-D15 — a settled option takes no new firm prices: its award (or RFQ)
  // already placed it, and the RFP award would refuse it anyway (NR-2 BR-08).
  const settled = optionRefs.filter((ref) => facts.settledOptionRefs.includes(ref));
  if (settled.length > 0) return `ROUND_OPTION_SETTLED: ${settled.join(', ')}`;
  const points = req.quantityPoints;
  if (
    !Array.isArray(points) ||
    points.length === 0 ||
    points.some((q) => typeof q !== 'number' || !Number.isFinite(q) || q <= 0)
  ) {
    return 'ROUND_QTY_INVALID: every quantity point is a number above zero';
  }
  const invited = strings(req.invitedSupplierIds);
  if (!invited || invited.length === 0)
    return 'ROUND_NO_INVITEES: a round invites at least one supplier';
  const silent = invited.filter((sid) => !facts.respondedSupplierIds.includes(sid));
  if (silent.length > 0)
    return `ROUND_NOT_RESPONDED: ${silent.join(', ')} did not submit a response`;
  for (const sid of invited) {
    const gate = facts.gate(sid);
    if (!gate.passes) return gateRefusal(sid, gate.failed);
  }
  return null;
}

/** What a firm offer is checked against: the round as stored. */
/**
 * @typedef {object} FirmOfferRoundFacts
 * @property {readonly string[]} optionRefs
 * @property {readonly number[]} quantityPoints
 * @property {readonly string[]} invitedSupplierIds
 * @property {string} deadline
 * @property {boolean} closed
 */

/** A firm offer as sent (the verb payload, unchecked). */
/**
 * @typedef {object} FirmOfferInput
 * @property {unknown} prices
 * @property {unknown} validUntil
 * @property {unknown} [documents]
 */

/**
 * NR-2 BR-01 / BR-03 — the refusal a firm offer (or a revision of one) earns,
 * or null.
 *
 * ⚠️ **AN UNKNOWN ROUND AND A ROUND THE SUPPLIER WAS NOT ASKED TO ARE ONE
 * REFUSAL.** Told apart, the refusal would tell a supplier which round ids
 * exist on other suppliers' shortlists — the existence oracle §86 closed on the
 * dispatcher. So `ROUND_NOT_INVITED` is judged first, and covers both.
 *
 * `validUntil` must reach the round deadline (edge case 2): an offer that
 * lapses before the buyer can award it is not a firm offer.
 * @param {FirmOfferRoundFacts | null} round
 * @param {string} supplierId
 * @param {FirmOfferInput} offer
 * @param {string} nowIso
 * @returns {string | null}
 */
export function firmOfferRefusal(round, supplierId, offer, nowIso) {
  if (!round || !round.invitedSupplierIds.includes(supplierId)) {
    return 'ROUND_NOT_INVITED: this supplier was not asked for a firm offer in this round';
  }
  if (round.closed || isPastDeadline(round.deadline, nowIso)) {
    return `ROUND_CLOSED: the firm-offer round closed on ${round.deadline}`;
  }
  const prices = offer.prices;
  if (!Array.isArray(prices) || prices.length === 0)
    return 'OFFER_EMPTY: give at least one firm price';
  const cells = /** @type {Set<string>} */ (new Set());
  for (const raw of /** @type {unknown[]} */ (prices)) {
    const p = /** @type {Partial<RfpFirmPrice>} */ (raw ?? {});
    if (
      typeof p.optionRef !== 'string' ||
      typeof p.qty !== 'number' ||
      !round.optionRefs.includes(p.optionRef) ||
      !round.quantityPoints.includes(p.qty)
    ) {
      return `OFFER_OUTSIDE_ROUND: ${String(p.optionRef)} at ${String(p.qty)} is not asked in this round`;
    }
    if (typeof p.unitPrice !== 'number' || !Number.isFinite(p.unitPrice) || p.unitPrice <= 0) {
      return `OFFER_PRICE_INVALID: ${p.optionRef} at ${p.qty} needs a unit price above zero`;
    }
    const cell = `${p.optionRef}@${p.qty}`;
    if (cells.has(cell)) return `OFFER_PRICE_DUPLICATE: ${cell}`;
    cells.add(cell);
  }
  const valid = offer.validUntil;
  if (
    typeof valid !== 'string' ||
    !isCalendarDate(valid) ||
    valid.slice(0, 10) < round.deadline.slice(0, 10)
  ) {
    return `OFFER_VALIDITY_MISSING: a firm offer is valid until a date on or after ${round.deadline}`;
  }
  if (offer.documents !== undefined) {
    if (!Array.isArray(offer.documents) || !offer.documents.every(isAttachmentMeta)) {
      return 'ATTACHMENT_MALFORMED: every document is a file record (name, size, type)';
    }
  }
  return null;
}

/** A firm offer with the number of the round it was sent in. */
/**
 * @typedef {RfpFirmOffer & {
 *     readonly roundNumber: number;
 *   }} NumberedFirmOffer
 */

/** One firm price in force, with where it came from. */
/**
 * @typedef {object} FirmPriceInForce
 * @property {string} supplierId
 * @property {string} roundId
 * @property {number} roundNumber
 * @property {string} optionRef
 * @property {number} qty
 * @property {number} unitPrice
 * @property {string} validUntil
 * @property {string} submittedAt
 */

/**
 * NR-2 BR-04 — the LAST firm offer per supplier and option counts. For each
 * supplier × option REF, the offer from the latest round that priced the option
 * (a later version within a round is already the offer's own top fields)
 * supplies every price for that option; earlier rounds' prices for it lapse.
 * @param {readonly NumberedFirmOffer[]} offers
 * @returns {readonly FirmPriceInForce[]}
 */
export function firmPricesInForce(offers) {
  const latest = /** @type {Map<string, NumberedFirmOffer>} */ (new Map());
  /**
   * @param {NumberedFirmOffer} a
   * @param {NumberedFirmOffer} b
   */
  const later = (a, b) =>
    a.roundNumber !== b.roundNumber ? a.roundNumber > b.roundNumber : a.submittedAt > b.submittedAt;
  for (const offer of offers) {
    for (const optionRef of new Set(offer.prices.map((p) => p.optionRef))) {
      const key = `${offer.supplierId}|${optionRef}`;
      const held = latest.get(key);
      if (!held || later(offer, held)) latest.set(key, offer);
    }
  }
  return [...latest.entries()].flatMap(([key, offer]) => {
    const optionRef = key.slice(key.indexOf('|') + 1);
    return offer.prices
      .filter((p) => p.optionRef === optionRef)
      .map((p) => ({
        supplierId: offer.supplierId,
        roundId: offer.roundId,
        roundNumber: offer.roundNumber,
        optionRef,
        qty: p.qty,
        unitPrice: p.unitPrice,
        validUntil: offer.validUntil,
        submittedAt: offer.submittedAt
      }));
  });
}
