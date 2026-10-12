/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
/** @import { RfpAwardLine } from '@services/sourcing/types' */
/** @import { RfpAwardView, RfpOfferRoundView } from '@services/sourcing/views' */
import { awardItemsOfRfp } from '@services/sourcing/rfpAward';
import { money, qty } from '../../rfxDisplay';
/** @import { ItemModel, PanelCommon } from '../types' */
import { awardableFirmPrices, optionsOfRounds } from '../utils';
import { ItemAwardForm } from './ItemAwardForm';

// ── The RFP panel (D3) ───────────────────────────────────────────────────────

/**
 * `status`:  The RFP's stored status (`Partly awarded` decides the settle-rest rule).
 * `rounds`:  Every firm-offer round of this RFP, with its offers (the buyer's read).
 * `inForce`:  The awards of this RFP still in force (not cancelled).
 * `nowIso`:  The clock a firm offer's validity is judged at (the verb's `rfxNow`).
 *
 * @typedef {PanelCommon<RfpAwardLine> & {
 *     rfpId: string;
 *     status: string;
 *     currency: string;
 *     rounds: readonly RfpOfferRoundView[];
 *     inForce: readonly RfpAwardView[];
 *     nowIso: string;
 *   }} RfpAwardPanelProps
 */

/**
 * The RFP award panel: builds the RFP's item model (its options, the firm
 * prices in force from closed rounds, and the lines) and renders the shared
 * form with it.
 * @type {React.FC<RfpAwardPanelProps>}
 */
export const RfpAwardPanel = ({ rfpId, status, currency, rounds, inForce, nowIso, ...common }) => {
  const { t } = useTranslation();
  const options = optionsOfRounds(rounds);
  const offers = rounds.flatMap((r) => r.offers);
  const prices = awardableFirmPrices(rounds);
  /**
   * @param {string} supplierId
   * @param {string} ref
   * @param {number} breakQty
   */
  const priceAt = (supplierId, ref, breakQty) =>
    prices.find((p) => p.supplierId === supplierId && p.optionRef === ref && p.qty === breakQty);
  /** @type {ItemModel<RfpAwardLine>} */
  const model = {
    items: awardItemsOfRfp({ id: rfpId }, rounds, offers, {
      nowIso,
      options,
      priorAwards: inForce.map((a) => ({ ...a, reason: a.reason ?? '' }))
    }),
    partlyAwarded: status === 'Partly awarded',
    quotes: [],
    defaultBreak: null,
    reasonAlways: true,
    // BL-130 (REQ-E03-04 BR-16f) — the RFP verb takes a final award with no
    // lines when it marks every open option "Will not award", as the RFQ's does.
    offerSettleRest: true,
    settleRestHelpKey: 'rfx.rfpAward.willNotRestHelp',
    hintKey: 'rfx.rfpAward.hint',
    partialNoteKey: 'rfx.rfpAward.partialNote',
    label: (item) => options.find((o) => o.ref === item.key)?.title ?? item.key,
    bidsFor: (item) =>
      [...new Set(prices.filter((p) => p.optionRef === item.key).map((p) => p.supplierId))].map(
        (supplierId) => ({
          key: supplierId,
          supplierId
        })
      ),
    priceHeader: (_item, brk) => t('rfx.rfpAward.priceAt', { qty: qty(brk.qty) }),
    priceCell: (item, bid, brk) => {
      const p = priceAt(bid.supplierId, item.key, brk.qty);
      return p ? (
        <span className="flex flex-col">
          <Data>{money(p.unitPrice, currency)}</Data>
          <span className="text-xs text-text-tertiary">
            {t('rfx.firm.validUntil', { date: formatDate(p.validUntil) })}
          </span>
        </span>
      ) : (
        <span className="text-xs text-text-tertiary">{t('rfx.rfpAward.noFirmPrice')}</span>
      );
    },
    uomOf: () => '',
    lineOf: (item, bid, brk, v) => {
      // The offer the supplier's price in force comes from: the rule refuses a
      // line naming any other (an older offer, or none at this point).
      const p =
        priceAt(bid.supplierId, item.key, brk.qty) ??
        prices.find((x) => x.supplierId === bid.supplierId && x.optionRef === item.key);
      const offer = p
        ? offers.find((o) => o.roundId === p.roundId && o.supplierId === bid.supplierId)
        : undefined;
      return {
        supplierId: bid.supplierId,
        optionRef: item.key,
        firmOfferId: offer?.id ?? '',
        sharePct: v.sharePct,
        quantity: v.quantity,
        splitBasis: v.basis,
        awardTierQty: brk.qty
      };
    },
    bidKeyOf: (line) => line.supplierId,
    // An RFP award is not judged against a best score: its reason is always required.
    bestOf: () => null
  };
  return <ItemAwardForm model={model} {...common} showBestMarker={() => false} />;
};
