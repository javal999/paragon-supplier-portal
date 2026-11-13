/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { useInvoiceCreate, useInvoiceSubmit } from '@services/query/commandHooks' */
/** @import { NewInvoiceForm } from '../hooks/useNewInvoice' */
import { Send } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import Data from '@components/ui-v2/Data';
import { fmtIdr } from '../../invoices/InvoiceCollaboration';
import { inputCls, labelCls } from '../const';
import { fmtDate } from '../utils';
import LineQtyTable from './LineQtyTable';
import { NewTotalField, amountRefusalKey } from './AmountFields';

/**
 * @typedef {object} NewInvoicePanelProps
 * @property {NewInvoiceForm} nw  The form state and its derived reads (`useNewInvoice`).
 * @property {ReturnType<typeof useInvoiceCreate>} createMutation  Dispatches `t_invoice_create`.
 * @property {ReturnType<typeof useInvoiceSubmit>} submitMutation  Dispatches `t_invoice_submit`
 *   (the "submit" half of create-and-submit; shared with the table's draft submit).
 * @property {UseToastReturn['toast']} toast  The page's toast function.
 * @property {(title: string, reason?: string) => void} failToast  The page's refusal toast.
 * @property {TFunction} t
 */

/**
 * The new-invoice side panel (REQ-E07-07): PO, receipts, pre-filled line
 * quantities and billed amounts, invoice number, date, tax invoice and the computed total, with "create draft"
 * and "create and submit" in the footer. `createNewInvoice` lives here because
 * only this panel's footer calls it. Moved out of `SupplierInvoices.jsx` by the
 * Phase 5 page split (no behaviour change).
 * @type {React.FC<NewInvoicePanelProps>}
 */
const NewInvoicePanel = ({ nw, createMutation, submitMutation, toast, failToast, t }) => {
  const {
    newOpen,
    setNewOpen,
    newPoRef,
    setNewPoRef,
    newReceiptIds,
    setNewReceiptIds,
    newLineQty,
    setNewLineQty,
    newInvoiceNumber,
    setNewInvoiceNumber,
    newInvoiceDate,
    setNewInvoiceDate,
    newTaxFile,
    setNewTaxFile,
    newLineAmount,
    setNewLineAmount,
    invoiceablePos,
    newPo,
    receiptOptions,
    prefilled,
    newExpected,
    newDuplicate,
    newAmounts,
    newReady,
    resetNew
  } = nw;

  /** @param {boolean} andSubmit */
  const createNewInvoice = async (andSubmit) => {
    // Each cause gets its OWN translated message.
    if (!newPoRef) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t('supplierInvoices.new.po.required')
      });
      return;
    }
    // Each cause gets its own message: the first unreadable line amount, then
    // the first one not above zero.
    const unreadable = newAmounts.reads.find((r) => !r.ok);
    if (unreadable && !unreadable.ok) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t(amountRefusalKey(unreadable.reason))
      });
      return;
    }
    // The pre-existing `> 0` rule, now per line.
    if (newAmounts.reads.some((r) => r.ok && r.value <= 0)) {
      toast({
        variant: 'warning',
        title: t('invoice.create.failed.title'),
        description: t('supplierInvoices.new.amount.mustExceedZero')
      });
      return;
    }
    // The total is the sum of the lines (BL-75), so it cannot differ from them.
    const amount = newAmounts.total;
    const invoiceNumber = newInvoiceNumber.trim();
    try {
      const res = await createMutation.mutateAsync({
        poReference: newPoRef,
        amount,
        lines: newAmounts.lines,
        invoiceNumber,
        invoiceDate: newInvoiceDate,
        taxInvoiceFile: newTaxFile
      });
      if (res.status === 'failed' || !res.entityId) {
        failToast(t('invoice.create.failed.title'), res.reason);
        return;
      }
      if (andSubmit) {
        const sub = await submitMutation.mutateAsync({ invoiceId: res.entityId, amount });
        if (sub.status === 'failed') {
          failToast(t('invoice.submit.failed.title', { invoiceNumber }), sub.reason);
        } else {
          toast({ variant: 'success', title: t('fc.inv.submit.success', { invoiceNumber }) });
        }
      } else {
        toast({
          variant: 'success',
          title: t('invoice.create.success.title', { invoiceNumber }),
          description: t('invoice.create.success.desc', { poNumber: newPoRef })
        });
      }
      setNewOpen(false);
      resetNew();
    } catch {
      toast({
        variant: 'error',
        title: t('invoice.denied.title'),
        description: t('invoice.denied.desc')
      });
    }
  };

  return (
    <SidePanel
      open={newOpen}
      onClose={() => setNewOpen(false)}
      title={t('supplierInvoices.new.title')}
      footerActions={
        <>
          <Button variant="secondary" onClick={() => setNewOpen(false)}>
            {t('supplierInvoices.new.cancel')}
          </Button>
          {/* Disabled-under-refusal is UX; the verb's policies are the law. */}
          <Button
            variant="secondary"
            disabled={createMutation.isPending || !newReady}
            onClick={() => createNewInvoice(false)}
          >
            {t('supplierInvoices.new.createDraft')}
          </Button>
          <Button
            variant="outline"
            icon={Send}
            disabled={createMutation.isPending || submitMutation.isPending || !newReady}
            onClick={() => createNewInvoice(true)}
          >
            {t('fc.inv.new.submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-text-secondary">{t('supplierInvoices.new.intro')}</p>
        <div>
          <label htmlFor="new-po" className={labelCls}>
            {t('supplierInvoices.new.poLabel')}
          </label>
          <select
            id="new-po"
            className={inputCls}
            value={newPoRef}
            onChange={(e) => {
              setNewPoRef(e.target.value);
              setNewReceiptIds([]);
              setNewLineQty({});
            }}
          >
            <option value="">{t('supplierInvoices.new.poPlaceholder')}</option>
            {invoiceablePos.map((po) => (
              <option key={po.id} value={po.poNumber}>
                {po.poNumber}
              </option>
            ))}
          </select>
          {invoiceablePos.length === 0 && (
            <div className="mt-1 text-xs text-text-tertiary">{t('supplierInvoices.new.noPos')}</div>
          )}
        </div>

        {newPo && (
          <fieldset>
            <legend className={labelCls}>{t('fc.inv.new.receipts')}</legend>
            {receiptOptions.length === 0 ? (
              <div className="text-xs text-text-tertiary">{t('fc.inv.new.noReceipts')}</div>
            ) : (
              <div className="space-y-1.5">
                {receiptOptions.map((gr) => (
                  <label key={gr.id} className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      className="accent-action"
                      checked={newReceiptIds.includes(gr.id)}
                      onChange={(e) =>
                        setNewReceiptIds((ids) =>
                          e.target.checked ? [...ids, gr.id] : ids.filter((x) => x !== gr.id)
                        )
                      }
                    />
                    {t('fc.inv.new.receiptOption', {
                      grNumber: gr.grNumber,
                      date: fmtDate(gr.receivedDate)
                    })}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {prefilled.length > 0 && (
          <div>
            <div className={labelCls}>{t('fc.inv.new.lines')}</div>
            <LineQtyTable
              lines={prefilled}
              entries={newLineQty}
              onChange={(k, v) => setNewLineQty((m) => ({ ...m, [k]: v }))}
              amounts={newLineAmount}
              onAmountChange={(k, v) => setNewLineAmount((m) => ({ ...m, [k]: v }))}
            />
            <div className="mt-2 text-xs text-text-secondary">
              {t('fc.inv.new.expected')}: <Data>{fmtIdr(newExpected)}</Data>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="new-invoice-number" className={labelCls}>
              {t('fc.inv.new.invoiceNumber')}
            </label>
            <input
              id="new-invoice-number"
              type="text"
              className={inputCls}
              value={newInvoiceNumber}
              aria-invalid={newDuplicate}
              onChange={(e) => setNewInvoiceNumber(e.target.value)}
            />
            {newDuplicate && (
              <div
                role="alert"
                data-testid="invoice-number-duplicate"
                className="mt-1 text-[length:var(--fs-label-3)] text-danger"
              >
                {t('fc.inv.new.duplicate')}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="new-invoice-date" className={labelCls}>
              {t('fc.inv.new.invoiceDate')}
            </label>
            <input
              id="new-invoice-date"
              type="date"
              className={inputCls}
              value={newInvoiceDate}
              onChange={(e) => setNewInvoiceDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="new-tax-invoice" className={labelCls}>
            {t('fc.inv.new.taxInvoice')}
          </label>
          <input
            id="new-tax-invoice"
            type="file"
            className="text-sm text-text-secondary"
            onChange={(e) => setNewTaxFile(e.target.files?.[0]?.name ?? '')}
          />
          <div className="mt-1 text-xs text-text-tertiary">
            {newTaxFile || t('fc.inv.new.noFile')}
          </div>
        </div>

        <NewTotalField total={newAmounts.total} t={t} />
      </div>
    </SidePanel>
  );
};

export default NewInvoicePanel;
