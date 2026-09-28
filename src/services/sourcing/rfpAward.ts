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
import type { AwardItem, AwardRefusal } from './awardShape';
import { firmPricesInForce } from './rfpFirmOffer';
import type { AwardRecord, RfpAwardRecord, RfpFirmOffer, RfpOfferRound } from './types';

/** An option's ref and the words it is shown in (`RfpRoundOptionView`). */
export interface RfpAwardOptionName {
  readonly ref: string;
  readonly title: string;
}

/** What `awardItemsOfRfp` reads besides the rounds and offers. */
export interface RfpAwardContext {
  /** The clock the offers' validity is judged at. */
  readonly nowIso: string;
  /** The options' titles, so a refusal names an option in its own words. */
  readonly options?: readonly RfpAwardOptionName[];
  /** The awards IN FORCE on this RFP (cancelled ones left out by the caller). */
  readonly priorAwards?: readonly AwardRecord[];
}

/** How a refusal names an option: its title, else its ref. */
export const rfpOptionName = (ref: string, options: readonly RfpAwardOptionName[] = []): string =>
  `option "${options.find((o) => o.ref === ref)?.title ?? ref}"`;

/**
 * The items of an RFP, as the award rule sees them: one per option named in a
 * CLOSED firm-offer round of this RFP, in the order the rounds first name
 * them. An option's breaks are the quantity points of the closed rounds that
 * named it. An item a prior award in force already awarded carries its id in
 * `awardedIn`.
 */
export function awardItemsOfRfp(
  rfp: { readonly id: string },
  rounds: readonly RfpOfferRound[],
  offers: readonly RfpFirmOffer[],
  context: RfpAwardContext,
): readonly AwardItem[] {
  const closed = rounds
    .filter((r) => r.rfpId === rfp.id && r.closedAt !== undefined)
    .sort((a, b) => a.roundNumber - b.roundNumber);
  const numberOf = new Map(closed.map((r) => [r.id, r.roundNumber] as const));
  const counted = offers.filter((o) => numberOf.has(o.roundId));
  // NR-2 BR-04 — the last firm offer per supplier and option, across the
  // CLOSED rounds only: a price in a round still open is not yet an offer the
  // buyer can hold the supplier to.
  const inForce = firmPricesInForce(counted.map((o) => ({ ...o, roundNumber: numberOf.get(o.roundId)! })));
  const refs = [...new Set(closed.flatMap((r) => r.optionRefs))];
  const priorAwards = context.priorAwards ?? [];
  return refs.map((ref) => {
    const points = [
      ...new Set(closed.filter((r) => r.optionRefs.includes(ref)).flatMap((r) => r.quantityPoints)),
    ].sort((a, b) => a - b);
    const name = rfpOptionName(ref, context.options);
    const prior = priorAwards.find((a) => a.eventType === 'rfp' && a.lines.some((l) => l.optionRef === ref));
    const item: AwardItem = {
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
          (p) => p.supplierId === line.supplierId && p.optionRef === ref && p.qty === breakQty,
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
          return { code: 'AWARD_OFFER_EXPIRED', item: name, detail: `${offer.id} (valid until ${price.validUntil})` };
        }
        return null;
      },
    };
    return prior ? { ...item, awardedIn: prior.id } : item;
  });
}

/** The option refs the RFP awards in force name, each with the award that names it. */
export function rfpAwardedOptionRefs(awardsInForce: readonly AwardRecord[]): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const award of awardsInForce) {
    if (award.eventType !== 'rfp') continue;
    for (const line of award.lines) if (!out.has(line.optionRef)) out.set(line.optionRef, award.id);
  }
  return out;
}

/** The fields of an RFQ the double-award guard reads. */
export interface RfqSourcingShape {
  readonly rfqNumber: string;
  readonly status: string;
  readonly sourceRfpId?: string;
  readonly sourceRfpOptionRefs?: readonly string[];
}

/**
 * The option refs of one RFP that RFQs created from it source, each with the
 * RFQ number. A CANCELLED RFQ sources nothing, so its options are free again.
 */
export function rfqSourcedOptionRefs(rfqs: readonly RfqSourcingShape[], rfpId: string): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const rfq of rfqs) {
    if (rfq.sourceRfpId !== rfpId || rfq.status === 'Cancelled') continue;
    for (const ref of rfq.sourceRfpOptionRefs ?? []) if (!out.has(ref)) out.set(ref, rfq.rfqNumber);
  }
  return out;
}

/** How one RFP option was settled: awarded on the RFP, or sourced by an RFQ created from it. */
export type RfpOptionSettlement =
  | { readonly by: 'award'; readonly awardId: string }
  | { readonly by: 'rfq'; readonly rfqNumber: string };

/**
 * RFX-D15 — the options of one RFP that are no longer OPEN, each with how it
 * was settled: named by an RFP award in force (`rfpAwardedOptionRefs`), or
 * sourced by a live RFQ created from the RFP (`rfqSourcedOptionRefs`). These
 * are the same two reads the RFP award and the RFQ create policy judge BR-08
 * by, so a firm-offer round, its policy and the page's option picker all ask
 * one rule which options a new round may still name.
 */
export function rfpSettledOptionRefs(
  rfpId: string,
  awardsInForce: readonly AwardRecord[],
  rfqs: readonly RfqSourcingShape[],
): ReadonlyMap<string, RfpOptionSettlement> {
  const out = new Map<string, RfpOptionSettlement>();
  for (const [ref, awardId] of rfpAwardedOptionRefs(awardsInForce.filter((a) => a.eventId === rfpId))) {
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
 */
export function rfpOptionSourcedRefusal(
  refs: readonly string[],
  taken: ReadonlyMap<string, string>,
  how: (where: string) => string,
  options: readonly RfpAwardOptionName[] = [],
): AwardRefusal | null {
  const ref = refs.find((r) => taken.has(r));
  return ref === undefined
    ? null
    : { code: 'AWARD_OPTION_SOURCED_ELSEWHERE', item: rfpOptionName(ref, options), detail: how(taken.get(ref)!) };
}

/** An award record of the RFP arm (a type guard for store reads). */
export const isRfpAward = (a: AwardRecord): a is RfpAwardRecord => a.eventType === 'rfp';
