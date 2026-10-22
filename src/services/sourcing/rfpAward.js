// ────────────────────────────────────────────────────────────────────────────
// THE RFP AWARD — per option, on firm offers (RFx D2; NR-2 BR-01, BR-05 to
// BR-08; NR-3 BR-01). Pure: no store, no clock of its own.
//
// An RFP is awarded by the SAME rule as an RFQ (`awardShapeRefusal`). What
// differs is the item list and the offer lookup, and both live here:
//
//   · an ITEM is an option named in a CLOSED firm-offer round of the RFP, keyed
//     by its ref (`rfpOptionRef`), with that round's quantity points as its
//     breaks (NR-2 BR-05);
//   · a line COUNTS when its firm offer is the supplier's price in force for
//     the option at the line's point — the latest offer in a closed round
//     (NR-2 BR-04) — and has not lapsed (edge case 2). Otherwise the item
//     refuses AWARD_ITEM_NOT_QUOTED or AWARD_OFFER_EXPIRED.
//
// And the one guard an RFP needs that an RFQ does not: an option is placed
// through ONE route (NR-2 BR-08). `rfpOptionSourcedRefusal` is called by the
// RFP award (an option an RFQ created from the RFP already sources), by the
// RFQ create policy and by the RFP → RFQ pre-fill (an option already awarded
// on the RFP), so the two directions cannot drift.
// ────────────────────────────────────────────────────────────────────────────

import { isPastDeadline } from '../transitions/rfxRules';
/** @import { AwardItem, AwardRefusal } from './awardShape' */
import { firmPricesInForce } from './rfpFirmOffer';
/** @import { AwardRecord, RfpFirmOffer, RfpOfferRound } from './types' */

/** An option's ref and the words it is shown in (`RfpRoundOptionView`). */
/**
 * @typedef {{
 *   readonly ref: string;
 *   readonly title: string;
 * }} RfpAwardOptionName
 */

/** What `awardItemsOfRfp` reads besides the rounds and offers. */
/**
 * `nowIso`:  The clock the offers' validity is judged at.
 * `options`:  The options' titles, so a refusal names an option in its own words.
 * `priorAwards`:  The awards IN FORCE on this RFP (cancelled ones left out by the caller).
 *
 * @typedef {{
 *   readonly nowIso: string;
 *   readonly options?: readonly RfpAwardOptionName[];
 *   readonly priorAwards?: readonly AwardRecord[];
 * }} RfpAwardContext
 */

/**
 * How a refusal names an option: its title, else its ref.
 * @param {string} ref
 * @param {readonly RfpAwardOptionName[]} [options]
 * @returns {string}
 */
export const rfpOptionName = (ref, options = []) =>
  `option "${options.find((o) => o.ref === ref)?.title ?? ref}"`;

/**
 * The items of an RFP, as the award rule sees them: one per option named in a
 * CLOSED firm-offer round of this RFP, in the order the rounds first name
 * them. An option's breaks are the quantity points of the closed rounds that
 * named it. An item a prior award in force already awarded carries its id in
 * `awardedIn`.
 * @param {{ readonly id: string }} rfp
 * @param {readonly RfpOfferRound[]} rounds
 * @param {readonly RfpFirmOffer[]} offers
 * @param {RfpAwardContext} context
 * @returns {readonly AwardItem[]}
 */
export function awardItemsOfRfp(rfp, rounds, offers, context) {
  const closed = rounds
    .filter((r) => r.rfpId === rfp.id && r.closedAt !== undefined)
    .sort((a, b) => a.roundNumber - b.roundNumber);
  const numberOf = new Map(closed.map((r) => /** @type {const} */ ([r.id, r.roundNumber])));
  const counted = offers.filter((o) => numberOf.has(o.roundId));
  // NR-2 BR-04 — the last firm offer per supplier and option, across the
  // CLOSED rounds only: a price in a round still open is not yet an offer the
  // buyer can hold the supplier to.
  const inForce = firmPricesInForce(
    counted.map((o) => ({
      ...o,
      roundNumber: /** @type {NonNullable<ReturnType<typeof numberOf.get>>} */ (
        numberOf.get(o.roundId)
      )
    }))
  );
  const refs = [...new Set(closed.flatMap((r) => r.optionRefs))];
  const priorAwards = context.priorAwards ?? [];
  return refs.map((ref) => {
    const points = [
      ...new Set(closed.filter((r) => r.optionRefs.includes(ref)).flatMap((r) => r.quantityPoints))
    ].sort((a, b) => a - b);
    const name = rfpOptionName(ref, context.options);
    const prior = priorAwards.find(
      (a) => a.eventType === 'rfp' && a.lines.some((l) => l.optionRef === ref)
    );
    /** @type {AwardItem} */
    const item = {
      key: ref,
      name,
      itemCode: '',
      // Like a tiered item, a line must record the point it was awarded at.
      tiered: true,
      optionRef: ref,
      breaks: points.map((qty) => ({ qty, pieces: qty })),
      // Not read: `lineRefusal` judges an RFP line's offer instead of a quote.
      priced: () => false,
      lineRefusal: (line, breakQty) => {
        const price = inForce.find(
          (p) => p.supplierId === line.supplierId && p.optionRef === ref && p.qty === breakQty
        );
        const offer = price
          ? counted.find((o) => o.roundId === price.roundId && o.supplierId === price.supplierId)
          : undefined;
        // The line must name the offer the price in force comes from: an older
        // offer, another supplier's offer or no offer at all is not a firm
        // price this supplier holds at this point.
        if (!price || !offer || offer.id !== line.firmOfferId) {
          return { code: 'AWARD_ITEM_NOT_QUOTED', item: name, detail: line.supplierId };
        }
        if (isPastDeadline(price.validUntil, context.nowIso)) {
          return {
            code: 'AWARD_OFFER_EXPIRED',
            item: name,
            detail: `${offer.id} (valid until ${price.validUntil})`
          };
        }
        return null;
      }
    };
    return prior ? { ...item, awardedIn: prior.id } : item;
  });
}

/**
 * The option refs the RFP awards in force name, each with the award that names it.
 * @param {readonly AwardRecord[]} awardsInForce
 * @returns {ReadonlyMap<string, string>}
 */
export function rfpAwardedOptionRefs(awardsInForce) {
  const out = /** @type {Map<string, string>} */ (new Map());
  for (const award of awardsInForce) {
    if (award.eventType !== 'rfp') continue;
    for (const line of award.lines) if (!out.has(line.optionRef)) out.set(line.optionRef, award.id);
  }
  return out;
}

/** The fields of an RFQ the double-award guard reads. */
/**
 * @typedef {{
 *   readonly rfqNumber: string;
 *   readonly status: string;
 *   readonly sourceRfpId?: string;
 *   readonly sourceRfpOptionRefs?: readonly string[];
 * }} RfqSourcingShape
 */

/**
 * The option refs of one RFP that RFQs created from it source, each with the
 * RFQ number. A CANCELLED RFQ sources nothing, so its options are free again.
 * @param {readonly RfqSourcingShape[]} rfqs
 * @param {string} rfpId
 * @returns {ReadonlyMap<string, string>}
 */
export function rfqSourcedOptionRefs(rfqs, rfpId) {
  const out = /** @type {Map<string, string>} */ (new Map());
  for (const rfq of rfqs) {
    if (rfq.sourceRfpId !== rfpId || rfq.status === 'Cancelled') continue;
    for (const ref of rfq.sourceRfpOptionRefs ?? []) if (!out.has(ref)) out.set(ref, rfq.rfqNumber);
  }
  return out;
}

/** How one RFP option was settled: awarded on the RFP, or sourced by an RFQ created from it. */
/**
 * @typedef {| { readonly by: 'award'; readonly awardId: string }
 *   | { readonly by: 'rfq'; readonly rfqNumber: string }} RfpOptionSettlement
 */

/**
 * RFX-D15 — the options of one RFP that are no longer OPEN, each with how it
 * was settled: named by an RFP award in force (`rfpAwardedOptionRefs`), or
 * sourced by a live RFQ created from the RFP (`rfqSourcedOptionRefs`). These
 * are the same two reads the RFP award and the RFQ create policy judge BR-08
 * by, so a firm-offer round, its policy and the page's option picker all ask
 * one rule which options a new round may still name.
 * @param {string} rfpId
 * @param {readonly AwardRecord[]} awardsInForce
 * @param {readonly RfqSourcingShape[]} rfqs
 * @returns {ReadonlyMap<string, RfpOptionSettlement>}
 */
export function rfpSettledOptionRefs(rfpId, awardsInForce, rfqs) {
  const out = /** @type {Map<string, RfpOptionSettlement>} */ (new Map());
  for (const [ref, awardId] of rfpAwardedOptionRefs(
    awardsInForce.filter((a) => a.eventId === rfpId)
  )) {
    out.set(ref, { by: 'award', awardId });
  }
  for (const [ref, rfqNumber] of rfqSourcedOptionRefs(rfqs, rfpId)) {
    if (!out.has(ref)) out.set(ref, { by: 'rfq', rfqNumber });
  }
  return out;
}

/**
 * NR-2 BR-08 — the refusal for the first of `refs` already placed through the
 * other route, or null. `taken` maps a ref to where it went; `how` words it
 * ("sourced by RFQ-…" / "awarded on the RFP"). ONE function for both
 * directions and for the pre-fill, so the three cannot drift.
 * @param {readonly string[]} refs
 * @param {ReadonlyMap<string, string>} taken
 * @param {(where: string) => string} how
 * @param {readonly RfpAwardOptionName[]} [options]
 * @returns {AwardRefusal | null}
 */
export function rfpOptionSourcedRefusal(refs, taken, how, options = []) {
  const ref = refs.find((r) => taken.has(r));
  return ref === undefined
    ? null
    : {
        code: 'AWARD_OPTION_SOURCED_ELSEWHERE',
        item: rfpOptionName(ref, options),
        detail: how(/** @type {NonNullable<ReturnType<typeof taken.get>>} */ (taken.get(ref)))
      };
}

/**
 * An award record of the RFP arm (a type guard for store reads).
 * @param {AwardRecord} a
 * @returns {a is import('./types').RfpAwardRecord} (inline: tsc does not count a name used only
 *   in a JSDoc type predicate as a use of its `@import`)
 */
export const isRfpAward = (a) => a.eventType === 'rfp';

/**
 * OWNER RULING Q1 (2026-10-19, RFx UX B-07) — the options of one RFP that any
 * of its firm-offer rounds names, open or closed, each with the number of the
 * first round that named it. Such an option is firmed up inside the RFP (the
 * full-service and ODM path), so the RFQ path is closed for it.
 * @param {readonly Pick<RfpOfferRound, 'rfpId' | 'roundNumber' | 'optionRefs'>[]} rounds
 * @param {string} rfpId
 * @returns {ReadonlyMap<string, number>}
 */
export function rfpRoundedOptionRefs(rounds, rfpId) {
  const out = /** @type {Map<string, number>} */ (new Map());
  for (const round of [...rounds]
    .filter((r) => r.rfpId === rfpId)
    .sort((a, b) => a.roundNumber - b.roundNumber)) {
    for (const ref of round.optionRefs) if (!out.has(ref)) out.set(ref, round.roundNumber);
  }
  return out;
}

/**
 * OWNER RULING Q1 — the refusal an RFQ created from an RFP earns when it names
 * an option a firm-offer round of that RFP already names
 * (`RFQ_OPTION_IN_FIRM_ROUND`), or null. Called by the RFQ create policy; the
 * RFP page leaves the same options unpickable through `rfpRoundedOptionRefs`.
 * @param {readonly string[]} refs
 * @param {ReadonlyMap<string, number>} rounded
 * @param {string} rfpNumber
 * @param {readonly RfpAwardOptionName[]} [options]
 * @returns {string | null}
 */
export function rfqOptionInRoundRefusal(refs, rounded, rfpNumber, options = []) {
  const ref = refs.find((r) => rounded.has(r));
  return ref === undefined
    ? null
    : `RFQ_OPTION_IN_FIRM_ROUND: ${rfpOptionName(ref, options)} is in firm-offer round ${rounded.get(ref)} on ${rfpNumber}; its prices are firmed up there, not in an RFQ`;
}
