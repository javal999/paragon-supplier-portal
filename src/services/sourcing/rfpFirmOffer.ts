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

import { isCalendarDate } from '../../lib/workingCalendar';
import { isAttachmentMeta } from '../attachments/sessionAttachments';
import { isPastDeadline } from '../transitions/rfxRules';
import { gateRefusal, type GateResult } from './complianceGate';
import type { RfpFirmOffer, RfpFirmPrice } from './types';

const strings = (v: unknown): readonly string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === 'string' && x.length > 0) ? (v as string[]) : null;

/** What the buyer asks for when opening a round (the verb payload, unchecked). */
export interface RfpRoundRequest {
  readonly optionIds: unknown;
  readonly quantityPoints: unknown;
  readonly invitedSupplierIds: unknown;
  readonly deadline: unknown;
}

/** What the RFP says about who and what may enter a round. */
export interface RfpRoundFacts {
  /** The RFP's stored status; null when there is no such RFP. */
  readonly rfpStatus: string | null;
  /** The RFP's own options plus the options suppliers proposed in a SUBMITTED response. */
  readonly knownOptionIds: readonly string[];
  /** Suppliers with a SUBMITTED response to this RFP. */
  readonly respondedSupplierIds: readonly string[];
  /** CR-23 for one supplier on this RFP. */
  readonly gate: (supplierId: string) => GateResult;
}

/**
 * NR-2 BR-02 — the refusal a firm-offer round earns, or null.
 *
 * The RFP is Closed (proposals are in, and the round does not reopen it); the
 * options exist on the RFP or in a submitted proposal (edge case 3); the
 * quantity points are above zero; and every invitee submitted a response and
 * passes CR-23.
 */
export function rfpOfferRoundRefusal(req: RfpRoundRequest, facts: RfpRoundFacts): string | null {
  if (facts.rfpStatus === null) return 'RFP_NOT_FOUND: the round names no RFP this hub holds';
  if (facts.rfpStatus !== 'Closed') {
    return `RFP_NOT_CLOSED: a firm-offer round opens on a Closed RFP; this one is ${facts.rfpStatus}`;
  }
  if (typeof req.deadline !== 'string' || !isCalendarDate(req.deadline)) {
    return 'BAD_DEADLINE: the round needs a deadline date';
  }
  const optionIds = strings(req.optionIds);
  if (!optionIds || optionIds.length === 0) return 'ROUND_NO_OPTIONS: name at least one option';
  const unknown = optionIds.filter((id) => !facts.knownOptionIds.includes(id));
  if (unknown.length > 0) return `ROUND_OPTION_UNKNOWN: ${unknown.join(', ')}`;
  const points = req.quantityPoints;
  if (
    !Array.isArray(points) ||
    points.length === 0 ||
    points.some((q) => typeof q !== 'number' || !Number.isFinite(q) || q <= 0)
  ) {
    return 'ROUND_QTY_INVALID: every quantity point is a number above zero';
  }
  const invited = strings(req.invitedSupplierIds);
  if (!invited || invited.length === 0) return 'ROUND_NO_INVITEES: a round invites at least one supplier';
  const silent = invited.filter((sid) => !facts.respondedSupplierIds.includes(sid));
  if (silent.length > 0) return `ROUND_NOT_RESPONDED: ${silent.join(', ')} did not submit a response`;
  for (const sid of invited) {
    const gate = facts.gate(sid);
    if (!gate.passes) return gateRefusal(sid, gate.failed);
  }
  return null;
}

/** What a firm offer is checked against: the round as stored. */
export interface FirmOfferRoundFacts {
  readonly optionIds: readonly string[];
  readonly quantityPoints: readonly number[];
  readonly invitedSupplierIds: readonly string[];
  readonly deadline: string;
  readonly closed: boolean;
}

/** A firm offer as sent (the verb payload, unchecked). */
export interface FirmOfferInput {
  readonly prices: unknown;
  readonly validUntil: unknown;
  readonly documents?: unknown;
}

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
 */
export function firmOfferRefusal(
  round: FirmOfferRoundFacts | null,
  supplierId: string,
  offer: FirmOfferInput,
  nowIso: string,
): string | null {
  if (!round || !round.invitedSupplierIds.includes(supplierId)) {
    return 'ROUND_NOT_INVITED: this supplier was not asked for a firm offer in this round';
  }
  if (round.closed || isPastDeadline(round.deadline, nowIso)) {
    return `ROUND_CLOSED: the firm-offer round closed on ${round.deadline}`;
  }
  const prices = offer.prices;
  if (!Array.isArray(prices) || prices.length === 0) return 'OFFER_EMPTY: give at least one firm price';
  const cells = new Set<string>();
  for (const raw of prices as unknown[]) {
    const p = (raw ?? {}) as Partial<RfpFirmPrice>;
    if (
      typeof p.optionId !== 'string' ||
      typeof p.qty !== 'number' ||
      !round.optionIds.includes(p.optionId) ||
      !round.quantityPoints.includes(p.qty)
    ) {
      return `OFFER_OUTSIDE_ROUND: ${String(p.optionId)} at ${String(p.qty)} is not asked in this round`;
    }
    if (typeof p.unitPrice !== 'number' || !Number.isFinite(p.unitPrice) || p.unitPrice <= 0) {
      return `OFFER_PRICE_INVALID: ${p.optionId} at ${p.qty} needs a unit price above zero`;
    }
    const cell = `${p.optionId}@${p.qty}`;
    if (cells.has(cell)) return `OFFER_PRICE_DUPLICATE: ${cell}`;
    cells.add(cell);
  }
  const valid = offer.validUntil;
  if (typeof valid !== 'string' || !isCalendarDate(valid) || valid.slice(0, 10) < round.deadline.slice(0, 10)) {
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
export interface NumberedFirmOffer extends RfpFirmOffer {
  readonly roundNumber: number;
}

/** One firm price in force, with where it came from. */
export interface FirmPriceInForce {
  readonly supplierId: string;
  readonly roundId: string;
  readonly roundNumber: number;
  readonly optionId: string;
  readonly qty: number;
  readonly unitPrice: number;
  readonly validUntil: string;
  readonly submittedAt: string;
}

/**
 * NR-2 BR-04 — the LAST firm offer per supplier and option counts. For each
 * supplier × option, the offer from the latest round that priced the option
 * (a later version within a round is already the offer's own top fields)
 * supplies every price for that option; earlier rounds' prices for it lapse.
 */
export function firmPricesInForce(offers: readonly NumberedFirmOffer[]): readonly FirmPriceInForce[] {
  const latest = new Map<string, NumberedFirmOffer>();
  const later = (a: NumberedFirmOffer, b: NumberedFirmOffer) =>
    a.roundNumber !== b.roundNumber ? a.roundNumber > b.roundNumber : a.submittedAt > b.submittedAt;
  for (const offer of offers) {
    for (const optionId of new Set(offer.prices.map((p) => p.optionId))) {
      const key = `${offer.supplierId}|${optionId}`;
      const held = latest.get(key);
      if (!held || later(offer, held)) latest.set(key, offer);
    }
  }
  return [...latest.entries()].flatMap(([key, offer]) => {
    const optionId = key.slice(key.indexOf('|') + 1);
    return offer.prices
      .filter((p) => p.optionId === optionId)
      .map((p) => ({
        supplierId: offer.supplierId,
        roundId: offer.roundId,
        roundNumber: offer.roundNumber,
        optionId,
        qty: p.qty,
        unitPrice: p.unitPrice,
        validUntil: offer.validUntil,
        submittedAt: offer.submittedAt,
      }));
  });
}
