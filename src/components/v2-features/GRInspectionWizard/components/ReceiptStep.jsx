/** @import * as React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '../../../ui-v2/FormSection';
import Data from '../../../ui-v2/Data';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../../../ui-v2/GlossaryTermChip';
import { BlockedStockMarker } from '@pages-v2/shipments/ShelfLifeParts';
import { labelFor, inputCls } from './fieldParts';
import { formatNumber } from '../utils';
/** @import { LineDraft } from '../utils' */
/** @import { GrLineQtyOutcome } from '../../grLineQuantities' */
/** @import { QtyRefusalReason } from '@lib/localeNumber' */

// CP-0 · W1 · 2f-a — each quantity refusal names its own rule. A blank, an
// unreadable token and a cross-convention token are three different mistakes on
// a value that becomes inventory, and the blank message says what to type
// instead: 0 is a real receipt of none, blank is not a statement at all.
/** @type {Record<QtyRefusalReason, string>} */
const GR_QTY_REFUSAL_KEY = {
  EMPTY_QTY: 'goodsReceipt.wizard.qty.refused.empty',
  NOT_NUMERIC: 'goodsReceipt.wizard.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'goodsReceipt.wizard.qty.refused.ambiguous'
};

// i18n-defer: ROLES is submitted verbatim as the `receivedBy` field on
// t_gr_create — the option label IS the stored data value, so translating the
// display would corrupt the recorded receiver. Defer until receivedBy carries a
// stable role code separate from its display label.
export const ROLES = ['Warehouse Supervisor', 'QC Inspector', 'Operations Manager'];

// i18n-defer: warehouse facility names / codes (proper nouns) — out of scope
// like material/brand data.
export const LOCATIONS = ['NDC J6 Jakarta', 'RM Warehouse', 'PM Warehouse'];

/**
 * @typedef {object} ReceiptStepProps
 * @property {string} receivedDate
 * @property {(value: string) => void} setReceivedDate
 * @property {string} receivedBy
 * @property {(value: string) => void} setReceivedBy
 * @property {string} warehouse
 * @property {(value: string) => void} setWarehouse
 * @property {string} notes
 * @property {(value: string) => void} setNotes
 * @property {LineDraft[]} lines
 * @property {GrLineQtyOutcome[]} lineQtys -  The ONE parse of every line's quantity pair, index-aligned with `lines`.
 * @property {Set<string>} blockedCodes -  Materials Quality approved into blocked stock on this source's ASN.
 * @property {(idx: number, patch: Partial<LineDraft>) => void} updateLine
 */

/**
 * Step 2 — receipt details: date, receiver, warehouse and notes, then each
 * line's received and accepted quantity with its refusal and rejection reason.
 * @type {React.FC<ReceiptStepProps>}
 */
const ReceiptStep = ({
  receivedDate,
  setReceivedDate,
  receivedBy,
  setReceivedBy,
  warehouse,
  setWarehouse,
  notes,
  setNotes,
  lines,
  lineQtys,
  blockedCodes,
  updateLine
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <FormSection title={t('goodsReceipt.wizard.section.receiptInfo')}>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            {labelFor(t('goodsReceipt.wizard.field.receivedDate'))}
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            {labelFor(t('goodsReceipt.wizard.field.receivedBy'))}
            <select
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            {labelFor(t('goodsReceipt.wizard.field.warehouseLocation'))}
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              className={inputCls}
            >
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block col-span-2">
            {labelFor(t('goodsReceipt.wizard.field.notes'))}
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('goodsReceipt.wizard.placeholder.notes')}
              className={inputCls}
            />
          </label>
        </div>
      </FormSection>

      <FormSection title={t('goodsReceipt.wizard.section.lineItems')}>
        {lines.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('goodsReceipt.wizard.lines.empty')}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {lines.map((l, i) => {
              const qty = lineQtys[i];
              // Only ASKABLE of a readable pair — an unreadable line shows no
              // rejected figure rather than a product of a guessed value.
              const rejected = qty.ok ? Math.max(0, qty.received - qty.accepted) : null;
              return (
                <div key={l.lineKey} className="border border-border-subtle rounded-md p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <Data as="div" className="text-sm text-text-primary">
                        {l.materialCode}
                      </Data>
                      <div className="text-xs text-text-tertiary">{l.description}</div>
                      {blockedCodes.has(l.materialCode) ? (
                        <div className="mt-1">
                          <BlockedStockMarker testId={`gr-blocked-stock-${l.materialCode}`} />
                        </div>
                      ) : null}
                    </div>
                    <div className="text-xs text-text-tertiary text-right">
                      {t('goodsReceipt.wizard.field.expected')}
                      <div className="font-semibold text-text-primary">
                        <Data>{formatNumber(l.qtyExpected)}</Data>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      {labelFor(t('goodsReceipt.wizard.field.received'))}
                      {/* Ruling 6.2, and load-bearing twice over here. A number
                          input REJECTS a comma-grouped token outright — "1,500"
                          leaves `.value` empty in en-US, no id-ID browser
                          required — and the empty string then took the `Number`
                          path to a silent zero that satisfied every guard.
                          `min` goes with the type: `received >= 0` is enforced
                          in `receiptValid`, where it is actually checked. */}
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={t('goodsReceipt.wizard.aria.received', {
                          code: l.materialCode
                        })}
                        aria-invalid={!qty.ok && qty.field === 'received'}
                        value={l.qtyReceivedRaw}
                        onChange={(e) => updateLine(i, { qtyReceivedRaw: e.target.value })}
                        className={inputCls}
                      />
                      {!qty.ok && qty.field === 'received' && (
                        <div
                          role="alert"
                          data-testid={`gr-received-refusal-${i}`}
                          className="mt-1 text-[length:var(--fs-label-3)] text-danger"
                        >
                          {t(GR_QTY_REFUSAL_KEY[qty.reason])}{' '}
                          <GlossaryTermChip
                            refTo={{ sourceType: 'QtyRefusalReason', term: qty.reason }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      {labelFor(t('goodsReceipt.wizard.field.accepted'))}
                      {/* `max` went with the type too — `accepted <= received`
                          is enforced in `receiptValid`. An input attribute that
                          vanishes with the type change was never the guarantee
                          (the 2e-b-4b precedent). */}
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={t('goodsReceipt.wizard.aria.accepted', {
                          code: l.materialCode
                        })}
                        aria-invalid={!qty.ok && qty.field === 'accepted'}
                        value={l.qtyAcceptedRaw}
                        onChange={(e) => updateLine(i, { qtyAcceptedRaw: e.target.value })}
                        className={inputCls}
                      />
                      {!qty.ok && qty.field === 'accepted' && (
                        <div
                          role="alert"
                          data-testid={`gr-accepted-refusal-${i}`}
                          className="mt-1 text-[length:var(--fs-label-3)] text-danger"
                        >
                          {t(GR_QTY_REFUSAL_KEY[qty.reason])}{' '}
                          <GlossaryTermChip
                            refTo={{ sourceType: 'QtyRefusalReason', term: qty.reason }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      {labelFor(t('goodsReceipt.wizard.field.rejected'))}
                      <div className="rounded-md border border-border-input bg-bg-hover px-3 py-2 text-sm text-text-secondary">
                        <Data>{rejected === null ? '—' : formatNumber(rejected)}</Data>
                      </div>
                    </div>
                    <div className="col-span-4">
                      {/* The reason field is only ASKABLE of a readable pair —
                          nobody can be asked to justify a rejection derived from
                          a quantity that does not exist. Same principle as the
                          receipt guard, applied to the surface. */}
                      {rejected !== null && rejected > 0 && (
                        <>
                          {labelFor(t('goodsReceipt.wizard.field.rejectionReason'))}
                          <textarea
                            rows={2}
                            aria-label={t('goodsReceipt.wizard.aria.rejectionReason', {
                              code: l.materialCode
                            })}
                            value={l.rejectionReason}
                            onChange={(e) =>
                              updateLine(i, {
                                rejectionReason: e.target.value
                              })
                            }
                            placeholder={t('goodsReceipt.wizard.placeholder.rejectionReason')}
                            className={inputCls}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );
};

export default ReceiptStep;
