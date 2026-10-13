/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
/** @import { AwardLine, AwardRecord } from '@services/sourcing/types' */
import { itemCostAt, itemOfLine } from '@services/sourcing/rfqComparison';
/** @import { AwardItem } from '@services/sourcing/awardShape' */
import { awardItemsOf } from '@services/sourcing/awardShape';
import { money, qty } from '../../rfxDisplay';
/** @import { ItemModel, PanelCommon } from '../types' */
import { itemLabel } from '../utils';
import { ItemAwardForm } from './ItemAwardForm';

// ── The RFQ panel (C3) ───────────────────────────────────────────────────────

/**
 * `quotes`:  The CURRENT version of each bid on the event.
 * `inForce`:  The awards of this event still in force (not cancelled).
 * `defaultBreak`:  The break a tiered item is awarded at unless the buyer picks another.
 * `bestOf`:  The best-scored quote for an item at a break, or null (none, or a tie).
 *
 * @typedef {PanelCommon<AwardLine> & {
 *     rfq: RFQ;
 *     quotes: readonly Quotation[];
 *     inForce: readonly AwardRecord[];
 *     defaultBreak: number | null;
 *     bestOf: (item: AwardItem, breakQty: number) => string | null;
 *   }} AwardPanelProps
 */

/**
 * The RFQ award panel: builds the RFQ's item model (its quotes, prices and
 * lines) and renders the shared form with it.
 * @type {React.FC<AwardPanelProps>}
 */
export const AwardPanel = ({ rfq, quotes, inForce, defaultBreak, bestOf, ...common }) => {
  const { t } = useTranslation();
  const byId = new Map(quotes.map((q) => /** @type {const} */ ([q.id, q])));
  /** @type {ItemModel<AwardLine>} */
  const model = {
    items: awardItemsOf(rfq, inForce),
    partlyAwarded: rfq.status === 'Partly awarded',
    quotes,
    defaultBreak,
    reasonAlways: false,
    offerSettleRest: true,
    settleRestHelpKey: 'rfqCompare.award.willNotRestHelp',
    hintKey: 'rfqCompare.award.hint',
    partialNoteKey: 'rfqCompare.award.partialNote',
    label: (item) => itemLabel(t, rfq, item),
    // A tiered item's quoting suppliers; every bid on a legacy one.
    bidsFor: (item) =>
      (item.tiered
        ? quotes.filter((q) => (q.itemQuotes ?? []).some((iq) => iq.itemLineNo === item.lineNo))
        : quotes
      ).map((q) => ({ key: q.id, supplierId: q.supplierId })),
    priceHeader: (item, brk) =>
      item.tiered
        ? t('rfqCompare.cmp.col.totalAtBreak', { qty: qty(brk.qty) })
        : t('rfx.cmp.row.unitPrice'),
    priceCell: (item, bid, brk) => {
      const q = /** @type {Quotation} */ (byId.get(bid.key));
      const rfqItem = item.tiered ? itemOfLine(rfq, item.lineNo) : undefined;
      if (item.tiered) {
        const cost = rfqItem ? itemCostAt(rfq, rfqItem, q, brk.qty) : null;
        return cost ? (
          <Data>{money(cost.total, q.currency ?? rfq.currency)}</Data>
        ) : (
          <span className="text-xs text-text-tertiary">{t('rfqCompare.cmp.notPriced')}</span>
        );
      }
      const lineUnit =
        q.lines?.find((l) => l.materialCode === item.itemCode)?.unitPrice ?? q.unitPrice;
      return <Data>{money(lineUnit, q.currency ?? rfq.currency)}</Data>;
    },
    uomOf: (item) =>
      (item.tiered ? itemOfLine(rfq, item.lineNo)?.uom : undefined) ??
      rfq.lineItems?.find((l) => l.materialCode === item.itemCode)?.uom ??
      rfq.uom,
    lineOf: (item, bid, brk, v) => ({
      supplierId: bid.supplierId,
      quotationId: bid.key,
      itemCode: item.itemCode,
      ...(item.tiered ? { itemLineNo: item.lineNo } : {}),
      sharePct: v.sharePct,
      quantity: v.quantity,
      splitBasis: v.basis,
      awardTierQty: brk.qty
    }),
    bidKeyOf: (line) => line.quotationId,
    // The "Best scored" marker is a tiered RFQ's, per item and break.
    bestOf
  };
  return <ItemAwardForm model={model} {...common} showBestMarker={(item) => item.tiered} />;
};
