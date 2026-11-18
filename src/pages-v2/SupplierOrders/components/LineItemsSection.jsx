/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { QtyRefusalReason } from '@lib/localeNumber' */
/** @import { PanelMode } from '../const' */
/** @import { readConfirmedQty } from '../../orders/poConfirmModel' */
import Data from '@components/ui-v2/Data';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { poLineQuantityText } from '../../orders/poLineQuantity';
import { inputClass } from '../const';
import TermLabel from '@components/ui-v2/TermLabel';

// CP-0 · W1 · 2f-c — each refusal names what to type instead (the arc-wide
// copy discipline: "invalid input" teaches nothing to a buyer whose number
// reads correctly to them).
/** @type {Record<QtyRefusalReason, string>} */
const PO_QTY_REFUSAL_KEY = {
  EMPTY_QTY: 'supplierOrders.confirm.qty.refused.empty',
  NOT_NUMERIC: 'supplierOrders.confirm.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'supplierOrders.confirm.qty.refused.ambiguous'
};

/**
 * @typedef {object} LineItemsSectionProps
 * @property {PurchaseOrder} selected  The PO open in the panel.
 * @property {PanelMode} effectivePanelMode  `editing` adds the Confirmed column.
 * @property {string[]} confirmedQtyRaws  The raw text of each confirm cell, by line index.
 * @property {React.Dispatch<React.SetStateAction<string[]>>} setConfirmedQtyRaws
 * @property {ReturnType<typeof readConfirmedQty>[]} lineReads  Each cell's parse.
 * @property {boolean[]} lineBounds  Each read cell is within its line's bound.
 * @property {TFunction} t
 */

/**
 * The order panel's line-items table. In `editing` mode each line gets a
 * Confirmed cell (text input) with its parse refusal and glossary chip, or the
 * out-of-bounds mirror. Moved out of `SupplierOrders.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<LineItemsSectionProps>}
 */
const LineItemsSection = ({
  selected,
  effectivePanelMode,
  confirmedQtyRaws,
  setConfirmedQtyRaws,
  lineReads,
  lineBounds,
  t
}) => (
  <section>
    <h3 className="text-label text-text-tertiary uppercase mb-3">
      {effectivePanelMode === 'editing'
        ? t('supplierOrders.panel.lineItemsConfirm')
        : t('supplierOrders.panel.lineItems')}
    </h3>
    <div className="relative min-w-0 border border-border-subtle rounded-md overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">
              {t('supplierOrders.panel.col.material')}
            </th>
            <th className="text-right px-3 py-2 font-semibold">
              <TermLabel term="orderedQty" />
            </th>
            {effectivePanelMode === 'editing' && (
              <th className="text-right px-3 py-2 font-semibold">
                <TermLabel term="supConfirmed" />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {selected.lineItems.map((li, idx) => (
            <tr key={li.id} className="border-t border-border-subtle">
              <td className="px-3 py-2">
                <Data as="div" className="text-xs text-text-tertiary">
                  {li.materialCode}
                </Data>
                <div className="text-text-primary mt-0.5">
                  {/* i18n-defer: mock/sample data (fixture line-item description) */}
                  {li.description}
                </div>
              </td>
              <td className="px-3 py-2 text-right text-text-secondary whitespace-nowrap">
                <Data>{poLineQuantityText(t, li)}</Data>
              </td>
              {effectivePanelMode === 'editing' && (
                <td className="px-3 py-2 text-right">
                  {/* Ruling 6.2: text + inputMode, never type="number" —
                      the browser must not adjudicate the separators
                      this cell's parser exists to adjudicate. min/max
                      were number-input affordances that never bound
                      anything; the bound is enforced by the policy and
                      mirrored below. */}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={confirmedQtyRaws[idx] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setConfirmedQtyRaws((prev) => {
                        const next = [...prev];
                        next[idx] = v;
                        return next;
                      });
                    }}
                    aria-label={`${t('supplierOrders.panel.col.confirmed')} ${li.materialCode}`}
                    aria-invalid={!(lineReads[idx]?.ok ?? true) || !lineBounds[idx]}
                    // BL-84 — one cell, two refusals; the association follows
                    // the one on screen.
                    aria-describedby={
                      lineReads[idx] && !lineReads[idx].ok
                        ? `po-confirm-refusal-${idx}`
                        : lineReads[idx]?.ok && !lineBounds[idx]
                          ? `po-confirm-bounds-${idx}`
                          : undefined
                    }
                    className={`${inputClass} text-right`}
                    style={{ width: 100, display: 'inline-block' }}
                  />
                  {/* Seeded cells: every blank is operator-cleared, so
                      a refusal shows whenever the cell does not read
                      (the GR-wizard display rule, not the 2e-a
                      untouched-blank rule). */}
                  {lineReads[idx] && !lineReads[idx].ok && (
                    <div
                      id={`po-confirm-refusal-${idx}`}
                      role="alert"
                      data-testid={`po-confirm-refusal-${idx}`}
                      className="mt-1 text-[length:var(--fs-label-3)] text-danger text-right"
                    >
                      {t(
                        PO_QTY_REFUSAL_KEY[
                          /** @type {{ reason: QtyRefusalReason }} */ (lineReads[idx]).reason
                        ]
                      )}{' '}
                      <GlossaryTermChip
                        refTo={{
                          sourceType: 'QtyRefusalReason',
                          term: /** @type {{ reason: QtyRefusalReason }} */ (lineReads[idx]).reason
                        }}
                      />
                    </div>
                  )}
                  {/* The bounds mirror — courtesy, not law (see the
                      derivation block). Renders only for a READ number
                      the policy would refuse, in the operator's
                      language with the line's own bound. */}
                  {lineReads[idx]?.ok && !lineBounds[idx] && (
                    <div
                      id={`po-confirm-bounds-${idx}`}
                      role="alert"
                      data-testid={`po-confirm-bounds-${idx}`}
                      className="mt-1 text-[length:var(--fs-label-3)] text-danger text-right"
                    >
                      {t('supplierOrders.confirm.qty.outOfBounds', {
                        ordered: li.quantity,
                        uom: li.uom
                      })}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export default LineItemsSection;
