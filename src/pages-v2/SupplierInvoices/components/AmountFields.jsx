/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { QtyRefusalReason } from '@lib/localeNumber' */
/** @import { readInvoiceAmount } from '../../invoices/invoiceAmountModel' */
import { invoicePriceTolerance } from '@services/transitions/fulfilmentConfig';
import { fmtIdr } from '../../invoices/InvoiceCollaboration';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { inputCls, labelCls } from '../const';

// The amount field of each invoice form, and the refusal map both read. The map
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
 * The new invoice's amount: the text input, the price-tolerance hint, and the
 * two inline refusals (unreadable, and not above zero).
 * @type {React.FC<{ newAmount: string; setNewAmount: (v: string) => void; amountRead: AmountRead; t: TFunction }>}
 */
export const NewAmountField = ({ newAmount, setNewAmount, amountRead, t }) => (
  <div>
    <label htmlFor="new-amount" className={labelCls}>
      {t('supplierInvoices.new.amountLabel')}
    </label>
    {/* Ruling 6.2: text + inputMode. A negative is refused by
        `normalizeQty` as NOT_NUMERIC, where it is actually enforced. */}
    <input
      id="new-amount"
      type="text"
      inputMode="decimal"
      className={inputCls}
      placeholder={t('supplierInvoices.new.amountPlaceholder')}
      value={newAmount}
      aria-invalid={newAmount.trim() !== '' && !amountRead.ok}
      onChange={(e) => setNewAmount(e.target.value)}
    />
    <div className="mt-1 text-xs text-text-tertiary">
      {t('fc.inv.new.tolerance', {
        contractPct: invoicePriceTolerance().contractPricePct,
        pct: invoicePriceTolerance().standardPct,
        cap: fmtIdr(invoicePriceTolerance().standardCapIdr)
      })}
    </div>
    {/* UNSEEDED field, so the 2e-a rule applies: an untouched blank does
        not nag on sight. */}
    {newAmount.trim() !== '' && !amountRead.ok && (
      <div
        role="alert"
        data-testid="invoice-amount-refusal"
        className="mt-1 text-[length:var(--fs-label-3)] text-danger"
      >
        {t(INVOICE_AMOUNT_REFUSAL_KEY[amountRead.reason])}{' '}
        <GlossaryTermChip refTo={{ sourceType: 'QtyRefusalReason', term: amountRead.reason }} />
      </div>
    )}
    {amountRead.ok && amountRead.value <= 0 && (
      <div
        role="alert"
        data-testid="invoice-amount-zero"
        className="mt-1 text-[length:var(--fs-label-3)] text-danger"
      >
        {t('supplierInvoices.new.amount.mustExceedZero')}
      </div>
    )}
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
