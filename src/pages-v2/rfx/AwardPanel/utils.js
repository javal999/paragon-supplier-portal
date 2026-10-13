// Pure helpers of the award panel (no React): the refusal and item wording,
// the RFP's options and firm prices, and the lines one item's draft describes.

/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { AnyAwardLine } from '@services/sourcing/types' */
/** @import { RfpOfferRoundView, RfpRoundOptionView } from '@services/sourcing/views' */
/** @import { AwardItem, AwardItemBreak, AwardRefusal } from '@services/sourcing/awardShape' */
/** @import { FirmPriceInForce } from '@services/sourcing/rfpFirmOffer' */
/** @import { AwardBid, ItemDraft, ItemModel } from './types' */
import { itemOfLine, splitQuantities } from '@services/sourcing/rfqComparison';
import { firmPricesInForce } from '@services/sourcing/rfpFirmOffer';
import { qty } from '../rfxDisplay';
import { vendorNames } from '../eligibilityDisplay';

/**
 * @param {number} n
 * @returns {number}
 */
export const round2 = (n) => Math.round(n * 100) / 100;

/**
 * A shape refusal in the reader's language.
 * @param {TFunction} t
 * @param {AwardRefusal} r
 * @param {(id: string) => string} supplierName
 * @returns {string}
 */
export const awardRefusalMessage = (t, r, supplierName) =>
  r.unqualified
    ? t(
        r.code === 'AWARD_SUPPLIER_NOT_QUALIFIED'
          ? 'rfqCompare.refusal.AWARD_SUPPLIER_NOT_QUALIFIED'
          : 'elig.refusal.reasonRequired',
        {
          vendors: vendorNames(r.unqualified)
        }
      )
    : r.code === 'AWARD_SPLIT_INCOMPLETE' && r.total !== undefined
      ? t('rfqCompare.refusal.AWARD_SPLIT_INCOMPLETE_QTY', {
          item: r.item ?? '',
          total: qty(r.total),
          breakQty: qty(r.breakQty ?? 0)
        })
      : t(`rfqCompare.refusal.${r.code}`, {
          item: r.item ?? '',
          pct: r.pct ?? 0,
          detail: r.detail ? supplierName(r.detail) : ''
        });

/**
 * An item as the reader sees it: "Item 1 · Oslo front sticker" (a tiered item
 * or a legacy line), or "The whole event" for a legacy RFQ with no lines.
 * @param {TFunction} t
 * @param {RFQ} rfq
 * @param {AwardItem} item
 * @returns {string}
 */
export function itemLabel(t, rfq, item) {
  if (item.tiered) {
    const it = itemOfLine(rfq, item.lineNo);
    return `${t('rfqCompare.content.item', { n: item.lineNo })} · ${it?.description ?? ''}`;
  }
  const li = rfq.lineItems?.find((l) => l.materialCode === item.itemCode);
  return li
    ? `${t('rfqCompare.content.item', { n: li.lineNo })} · ${li.description}`
    : t('rfqCompare.award.wholeEvent');
}

/**
 * Each option once, by its ref, from the rounds that name it.
 * @param {readonly RfpOfferRoundView[]} rounds
 * @returns {readonly RfpRoundOptionView[]}
 */
export const optionsOfRounds = (rounds) => [
  ...new Map(
    rounds.flatMap((r) => r.options).map((o) => /** @type {const} */ ([o.ref, o]))
  ).values()
];

/**
 * The firm prices the award reads: the LAST offer per supplier and option
 * across the CLOSED rounds only (NR-2 BR-04), exactly as `awardItemsOfRfp`
 * judges a line.
 * @param {readonly RfpOfferRoundView[]} rounds
 * @returns {readonly FirmPriceInForce[]}
 */
export function awardableFirmPrices(rounds) {
  const closed = rounds.filter((r) => r.closedAt !== undefined);
  return firmPricesInForce(
    closed.flatMap((r) => r.offers.map((o) => ({ ...o, roundNumber: r.roundNumber })))
  );
}

/**
 * The breaks an item is awarded at in this draft.
 * @param {AwardItem} item
 * @param {ItemDraft} draft
 * @param {number | null} defaultBreak
 * @returns {AwardItemBreak | undefined}
 */
export function breakOfDraft(item, draft, defaultBreak) {
  const wanted = draft.breakQty ?? defaultBreak ?? undefined;
  return item.breaks.find((b) => b.qty === wanted) ?? item.breaks[0];
}

/**
 * The award lines one item's draft describes: a share derives its quantity
 * (`splitQuantities`, remainder unit on the first line, as the rule derives
 * it); a quantity derives its share over the break. Blank or zero is no line.
 * @template {AnyAwardLine} L
 * @param {ItemModel<L>} model
 * @param {AwardItem} item
 * @param {ItemDraft} draft
 * @param {AwardItemBreak} brk
 * @param {readonly AwardBid[]} bids
 * @returns {L[]}
 */
export function linesOfItem(model, item, draft, brk, bids) {
  const picked = bids.flatMap((bid) => {
    const v = Number(draft.values[bid.key]);
    return Number.isFinite(v) && v > 0 ? [{ bid, v }] : [];
  });
  const qtys =
    draft.basis === 'pct'
      ? splitQuantities(
          brk.pieces,
          picked.map((p) => p.v)
        )
      : [];
  return picked.map(({ bid, v }, i) =>
    model.lineOf(item, bid, brk, {
      sharePct: draft.basis === 'pct' ? v : round2((v * 100) / brk.pieces),
      quantity:
        draft.basis === 'pct' ? /** @type {NonNullable<(typeof qtys)[number]>} */ (qtys[i]) : v,
      basis: draft.basis
    })
  );
}
