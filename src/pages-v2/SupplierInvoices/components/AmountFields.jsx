/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { QtyRefusalReason } from '@lib/localeNumber' */
/** @import { readInvoiceAmount } from '../../invoices/invoiceAmountModel' */
import { invoicePriceTolerance } from '@services/transitions/fulfilmentConfig';
import { fmtIdr } from '../../invoices/InvoiceCollaboration';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { inputCls, labelCls } from '../const';

// The amount fields of each invoice form, and the refusal map they read. The map
// and every use of it sit in this one file because GL-1's chip-coverage guard
// pairs a map's uses with its declaration in one file (the pattern
// `BuyerContracts/components/WizardTermsStep.jsx` set). Moved out of
// `SupplierInvoices.jsx` by the Phase 5 page split (no behaviour change).

// CP-0 · W1 · 2f-d — each refusal names what to type instead. Replaces a
// hard-coded English literal ('PO and a positive amount are required') that
// covered three distinct causes in one untranslated sentence.
/** @type {Record<QtyRefusalReason, string>} */
const INVOICE_AMOUNT_REFUSAL_KEY = {
  EMPTY_QTY: 'supplierInvoices.new.amount.refused.empty',
  NOT_NUMERIC: 'supplierInvoices.new.amount.refused.notNumeric',
  AMBIGUOUS_QTY: 'supplierInvoices.new.amount.refused.ambiguous'
};

/**
 * The i18n key of an amount refusal — the new-invoice create guard's toast
 * reads it. It lives beside the map it reads (see the file header).
 * @param {QtyRefusalReason} reason
 * @returns {string}
 */
export const amountRefusalKey = (reason) => INVOICE_AMOUNT_REFUSAL_KEY[reason];

/** @typedef {ReturnType<typeof readInvoiceAmount>} AmountRead */

/**
 * BL-75 [Proposed] — one invoice line's billed amount: the text input and its
 * two inline refusals (unreadable, and not above zero). Text + inputMode, so
 * the parser stays the one read of what was typed (Ruling 6.2).
 * @type {React.FC<{ id: string; label: string; value: string; read: AmountRead; onChange: (v: string) => void; t: TFunction }>}
 */
export const LineAmountCell = ({ id, label, value, read, onChange, t }) => (
  <>
    <input
      id={id}
      type="text"
      inputMode="decimal"
      className={`${inputCls} min-w-[120px]`}
      aria-label={label}
      aria-invalid={!read.ok || read.value <= 0}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {!read.ok && value.trim() !== '' && (
      <div
        role="alert"
        data-testid="invoice-amount-refusal"
        className="text-[length:var(--fs-label-3)] text-danger"
      >
        {t(INVOICE_AMOUNT_REFUSAL_KEY[read.reason])}{' '}
        <GlossaryTermChip refTo={{ sourceType: 'QtyRefusalReason', term: read.reason }} />
      </div>
    )}
    {read.ok && read.value <= 0 && (
      <div
        role="alert"
        data-testid="invoice-amount-zero"
        className="text-[length:var(--fs-label-3)] text-danger"
      >
        {t('supplierInvoices.new.amount.mustExceedZero')}
      </div>
    )}
  </>
);

/**
 * BL-75 [Proposed] — the new invoice's total: the sum of the line amounts,
 * read-only, with the price-tolerance hint. It is not typed, so it cannot
 * differ from its lines.
 * @type {React.FC<{ total: number; t: TFunction }>}
 */
export const NewTotalField = ({ total, t }) => (
  <div>
    <div id="new-amount-label" className={labelCls}>
      {t('supplierInvoices.new.amountLabel')}
    </div>
    <output
      id="new-amount"
      aria-labelledby="new-amount-label"
      data-testid="invoice-total"
      className="block text-sm font-medium text-text-primary"
    >
      {fmtIdr(total)}
    </output>
    <div className="mt-1 text-xs text-text-tertiary">{t('supplierInvoices.new.totalNote')}</div>
    <div className="mt-1 text-xs text-text-tertiary">
      {t('fc.inv.new.tolerance', {
        contractPct: invoicePriceTolerance().contractPricePct,
        pct: invoicePriceTolerance().standardPct,
        cap: fmtIdr(invoicePriceTolerance().standardCapIdr)
      })}
    </div>
  </div>
);

/**
 * The corrected invoice's amount: the text input and its two inline refusals
 * (unreadable, and not above zero).
 * @type {React.FC<{ fixAmount: string; setFixAmount: (v: string) => void; fixAmountRead: AmountRead; t: TFunction }>}
 */
export const FixAmountField = ({ fixAmount, setFixAmount, fixAmountRead, t }) => (
  <div>
    <label htmlFor="fix-amount" className={labelCls}>
      {t('supplierInvoices.new.amountLabel')}
    </label>
    <input
      id="fix-amount"
      type="text"
      inputMode="decimal"
      className={inputCls}
      value={fixAmount}
      aria-invalid={fixAmount.trim() !== '' && !fixAmountRead.ok}
      onChange={(e) => setFixAmount(e.target.value)}
    />
    {fixAmount.trim() !== '' && !fixAmountRead.ok && (
      <div role="alert" className="mt-1 text-[length:var(--fs-label-3)] text-danger">
        {t(INVOICE_AMOUNT_REFUSAL_KEY[fixAmountRead.reason])}{' '}
        <GlossaryTermChip refTo={{ sourceType: 'QtyRefusalReason', term: fixAmountRead.reason }} />
      </div>
    )}
    {fixAmountRead.ok && fixAmountRead.value <= 0 ? (
      <div
        role="alert"
        data-testid="invoice-fix-amount-zero"
        className="mt-1 text-[length:var(--fs-label-3)] text-danger"
      >
        {t('supplierInvoices.new.amount.mustExceedZero')}
      </div>
    ) : null}
  </div>
);
