/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { useInvoiceResubmit } from '@services/query/commandHooks' */
/** @import { SupplierInvoice } from '@services/data/types' */
/** @import { FixInvoiceForm } from '../hooks/useFixInvoice' */
import { Send } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import Data from '@components/ui-v2/Data';
import { expectedInvoiceValue } from '@services/transitions/fulfilmentRules';
import { fmtIdr } from '../../invoices/InvoiceCollaboration';
import { inputCls, labelCls } from '../const';
import LineQtyTable from './LineQtyTable';
import { FixAmountField } from './AmountFields';

/**
 * @typedef {object} FixInvoicePanelProps
 * @property {FixInvoiceForm} fx  The correction state and its derived reads (`useFixInvoice`).
 * @property {ReturnType<typeof useInvoiceResubmit>} resubmitMutation  Dispatches `t_invoice_resubmit`.
 * @property {UseToastReturn['toast']} toast  The page's toast function.
 * @property {(title: string, reason?: string) => void} failToast  The page's refusal toast.
 * @property {(inv: SupplierInvoice | null) => void} setSelected  Closes the detail panel on success.
 * @property {TFunction} t
 */

/**
 * The correct-and-resubmit side panel for a returned invoice: Finance's return
 * reason, the line quantities, number, date, tax invoice and amount, with the
 * resubmit in the footer. `doResubmit` lives here because only this panel's
 * footer calls it. Moved out of `SupplierInvoices.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<FixInvoicePanelProps>}
 */
const FixInvoicePanel = ({ fx, resubmitMutation, toast, failToast, setSelected, t }) => {
  const {
    fixTarget,
    setFixTarget,
    fixAmount,
    setFixAmount,
    fixNumber,
    setFixNumber,
    fixDate,
    setFixDate,
    fixTaxFile,
    setFixTaxFile,
    fixLineQty,
    setFixLineQty,
    fixLines,
    fixRead,
    fixAmountRead,
    fixDuplicate,
    fixReady
  } = fx;

  const doResubmit = () => {
    if (!fixTarget || !fixAmountRead.ok) return;
    const invoiceNumber = fixNumber.trim();
    resubmitMutation.mutate(
      {
        invoiceId: fixTarget.id,
        amount: fixAmountRead.value,
        ...(fixTarget.lines.length > 0 ? { lines: fixRead.lines } : {}),
        invoiceNumber,
        ...(fixDate ? { invoiceDate: fixDate } : {}),
        ...(fixTaxFile ? { taxInvoiceFile: fixTaxFile } : {})
      },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            failToast(t('fc.inv.resubmit.failed', { invoiceNumber }), res.reason);
            return;
          }
          toast({ variant: 'success', title: t('fc.inv.resubmit.success', { invoiceNumber }) });
          setFixTarget(null);
          setSelected(null);
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('invoice.denied.title'),
            description: t('invoice.denied.desc')
          })
      }
    );
  };

  return (
    <SidePanel
      open={fixTarget !== null}
      onClose={() => setFixTarget(null)}
      title={
        fixTarget ? t('fc.inv.resubmit.title', { invoiceNumber: fixTarget.invoiceNumber }) : ''
      }
      footerActions={
        <>
          <Button variant="secondary" onClick={() => setFixTarget(null)}>
            {t('fc.inv.cancel')}
          </Button>
          <Button
            variant="outline"
            icon={Send}
            disabled={resubmitMutation.isPending || !fixReady}
            onClick={doResubmit}
          >
            {t('fc.inv.resubmit.confirm')}
          </Button>
        </>
      }
    >
      {fixTarget && (
        <div className="space-y-5">
          <div className="bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-sm text-danger">
            <strong>{t('fc.inv.resubmit.reason')}:</strong>{' '}
            {fixTarget.returnReason ?? t('supplierInvoices.note.disputed')}
          </div>
          {fixLines.length > 0 && (
            <div>
              <div className={labelCls}>{t('fc.inv.new.lines')}</div>
              <LineQtyTable
                lines={fixLines}
                entries={fixLineQty}
                onChange={(k, v) => setFixLineQty((m) => ({ ...m, [k]: v }))}
              />
              <div className="mt-2 text-xs text-text-secondary">
                {t('fc.inv.new.expected')}:{' '}
                <Data>{fmtIdr(expectedInvoiceValue(fixRead.valid ? fixRead.lines : []))}</Data>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="fix-invoice-number" className={labelCls}>
                {t('fc.inv.new.invoiceNumber')}
              </label>
              <input
                id="fix-invoice-number"
                type="text"
                className={inputCls}
                value={fixNumber}
                aria-invalid={fixDuplicate}
                // BL-84 — the duplicate refusal is tied to the number field.
                aria-describedby={fixDuplicate ? 'fix-invoice-number-duplicate' : undefined}
                onChange={(e) => setFixNumber(e.target.value)}
              />
              {fixDuplicate && (
                <div
                  id="fix-invoice-number-duplicate"
                  role="alert"
                  className="mt-1 text-[length:var(--fs-label-3)] text-danger"
                >
                  {t('fc.inv.new.duplicate')}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="fix-invoice-date" className={labelCls}>
                {t('fc.inv.new.invoiceDate')}
              </label>
              <input
                id="fix-invoice-date"
                type="date"
                className={inputCls}
                value={fixDate}
                onChange={(e) => setFixDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="fix-tax-invoice" className={labelCls}>
              {t('fc.inv.new.taxInvoice')}
            </label>
            <input
              id="fix-tax-invoice"
              type="file"
              className="text-sm text-text-secondary"
              onChange={(e) => setFixTaxFile(e.target.files?.[0]?.name ?? fixTaxFile)}
            />
            <div className="mt-1 text-xs text-text-tertiary">
              {fixTaxFile || t('fc.inv.new.noFile')}
            </div>
          </div>
          <FixAmountField
            fixAmount={fixAmount}
            setFixAmount={setFixAmount}
            fixAmountRead={fixAmountRead}
            t={t}
          />
        </div>
      )}
    </SidePanel>
  );
};

export default FixInvoicePanel;
