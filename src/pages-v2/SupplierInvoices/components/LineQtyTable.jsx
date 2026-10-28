/** @import React from 'react' */
/** @import { InvoiceLine } from '@services/data/types' */
import Data from '@components/ui-v2/Data';
import { useTranslation } from 'react-i18next';
import { fmtIdr, readQty } from '../../invoices/InvoiceCollaboration';
import { inputCls } from '../const';
import { lineKey } from '../utils';

/**
 * Editable quantities over a set of invoice lines, each bounded by what is left.
 * Used by both the new-invoice and the correct-and-resubmit panels; `entries`
 * holds the typed text per line (`lineKey`), and `onChange` writes one entry.
 * Moved out of `SupplierInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ lines: readonly (InvoiceLine & { remaining: number | null })[]; entries: Record<string, string>; onChange: (key: string, v: string) => void; }>}
 */
const LineQtyTable = ({ lines, entries, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-tertiary uppercase">
            <th className="text-left py-1 pr-2">{t('fc.inv.new.col.receipt')}</th>
            <th className="text-left py-1 pr-2">{t('fc.inv.new.col.material')}</th>
            <th className="text-left py-1 pr-2">{t('fc.inv.new.col.quantity')}</th>
            <th className="text-right py-1">{t('fc.inv.new.col.unitPrice')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const key = lineKey(l);
            const raw = entries[key] ?? String(l.quantity);
            const q = readQty(raw);
            const bad = !(Number.isFinite(q) && q > 0);
            const over = !bad && l.remaining !== null && q > l.remaining;
            return (
              <tr key={key} className="border-t border-border-subtle align-top">
                <td className="py-1.5 pr-2">
                  <Data>{l.grNumber}</Data>
                </td>
                <td className="py-1.5 pr-2">
                  <Data as="div" className="text-[length:var(--fs-label-3)] text-text-tertiary">
                    {l.materialCode}
                  </Data>
                  <div className="text-text-primary">{l.description}</div>
                </td>
                <td className="py-1.5 pr-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`${inputCls} min-w-[96px]`}
                    aria-label={t('fc.inv.new.quantityFor', {
                      material: l.materialCode,
                      grNumber: l.grNumber
                    })}
                    aria-invalid={bad || over}
                    value={raw}
                    onChange={(e) => onChange(key, e.target.value)}
                  />
                  {l.remaining !== null && (
                    <div className="mt-0.5 text-[length:var(--fs-label-3)] text-text-tertiary">
                      {t('fc.inv.new.upTo', {
                        qty: `${l.remaining.toLocaleString('en-US')} ${l.uom ?? ''}`
                      })}
                    </div>
                  )}
                  {bad && (
                    <div className="text-[length:var(--fs-label-3)] text-danger">
                      {t('fc.inv.new.qtyInvalid')}
                    </div>
                  )}
                  {over && (
                    <div role="alert" className="text-[length:var(--fs-label-3)] text-danger">
                      {t('fc.inv.new.overInvoiced')}
                    </div>
                  )}
                </td>
                <td className="py-1.5 text-right whitespace-nowrap">
                  <Data>{fmtIdr(l.unitPrice)}</Data>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LineQtyTable;
