/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { compareReceipt } from '@services/transitions/fulfilmentRules' */
/** @import { GoodsReceipt } from '@services/data/types' */
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import ReceiptToleranceNote from '../../receipts/ReceiptToleranceNote';
import { CHECK_VARIANT } from '../const';
import { formatNumber } from '../utils';

/**
 * @typedef {object} GrLineItemsProps
 * @property {GoodsReceipt} selected The GR open in the side panel.
 * @property {ReturnType<typeof compareReceipt>} selectedChecks Each line's quantity check
 *   (CR-25 / BL-45), against the ASN when the hub has it.
 * @property {TFunction} t
 */

/**
 * The side panel's line items: one row per inspected material with the
 * expected / received / accepted / rejected quantities and the V/P/H/B check
 * pills, the legend, and each line's quantity check below the table. Moved
 * out of `BuyerGoodsReceipt.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<GrLineItemsProps>}
 */
const GrLineItems = ({ selected, selectedChecks, t }) => (
  <section>
    <div className="text-label text-text-tertiary uppercase mb-2">
      {t('goodsReceipt.panel.lineItems')}
    </div>
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('goodsReceipt.panel.col.material')}</TableHeaderCell>
          <TableHeaderCell className="text-right" term="grExpected" />
          <TableHeaderCell className="text-right" term="grReceived" />
          <TableHeaderCell className="text-right" term="grAccepted" />
          <TableHeaderCell className="text-right" term="grRejectedLine" />
          <TableHeaderCell term="grChecks" />
        </TableHeader>
        <tbody>
          {/* Key: materialCode — a receipt inspects one line per
              material of its ASN (SupplierGoodsReceipts keys the
              same lines the same way). */}
          {selected.inspectionResults.map((r) => (
            <TableRow key={r.materialCode}>
              <TableCell>
                <Data as="div" className="text-xs text-text-primary">
                  {r.materialCode}
                </Data>
                <div className="text-xs text-text-tertiary">{r.description}</div>
                {r.rejectionReason && (
                  <div className="text-xs text-danger mt-1">{r.rejectionReason}</div>
                )}
              </TableCell>
              <TableCell className="text-right text-xs">
                <Data>{formatNumber(r.qtyExpected)}</Data>
              </TableCell>
              <TableCell className="text-right text-xs">
                <Data>{formatNumber(r.qtyReceived)}</Data>
              </TableCell>
              <TableCell className="text-right text-xs text-success">
                <Data>{formatNumber(r.qtyAccepted)}</Data>
              </TableCell>
              <TableCell className="text-right text-xs text-danger">
                <Data>{formatNumber(r.qtyRejected)}</Data>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <StatusPill variant={CHECK_VARIANT[r.visualCheck] ?? 'neutral'}>V</StatusPill>
                  <StatusPill variant={CHECK_VARIANT[r.packagingCheck] ?? 'neutral'}>P</StatusPill>
                  {r.halalSealCheck && (
                    <StatusPill variant={CHECK_VARIANT[r.halalSealCheck] ?? 'neutral'}>
                      H
                    </StatusPill>
                  )}
                  {r.bpomLotCheck && (
                    <StatusPill variant={CHECK_VARIANT[r.bpomLotCheck] ?? 'neutral'}>B</StatusPill>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
    <div className="text-xs text-text-tertiary mt-2">{t('goodsReceipt.panel.legend')}</div>
    {/* CR-25 (BL-45) — each line's quantity check, below the table so
        it wraps inside the panel rather than scrolling out of it. */}
    {selectedChecks.length > 0 && (
      <div className="mt-3" data-testid="buyer-gr-qty-checks">
        <div className="text-label text-text-tertiary uppercase mb-1">
          {t('fc.gr.col.qtyCheck')}
        </div>
        <ul className="space-y-1">
          {selectedChecks.map((c) => (
            <li key={c.materialCode} className="text-xs">
              <Data className="text-[length:var(--fs-label-3)] text-text-tertiary mr-2">
                {c.materialCode}
              </Data>
              <ReceiptToleranceNote
                line={c}
                testId={`buyer-gr-qty-check-${selected.id}-${c.materialCode}`}
              />
            </li>
          ))}
        </ul>
      </div>
    )}
  </section>
);

export default GrLineItems;
