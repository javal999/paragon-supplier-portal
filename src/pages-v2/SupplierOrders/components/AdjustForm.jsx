/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PoLineResponse, PoReasonCode, PurchaseOrder } from '@services/data/types' */
/** @import { CounterOfferRefusal } from '@services/transitions/policies' */
/** @import { useReasonLabel } from '../../admin/reasonCodeDisplay' */
/** @import { AdjustDraft } from '../const' */
import Data from '@components/ui-v2/Data';
import { poLineQuantityText } from '../../orders/poLineQuantity';
import { inputClass, labelClass } from '../const';

/** @type {Record<CounterOfferRefusal, string>} */
const ADJUST_REFUSAL_KEY = {
  unknownLine: 'oc.adjust.refusal.unknownLine',
  reason: 'oc.adjust.refusal.reason',
  note: 'oc.adjust.refusal.note',
  quantity: 'oc.adjust.refusal.quantity',
  date: 'oc.adjust.refusal.date'
};

/**
 * @typedef {object} AdjustFormProps
 * @property {PurchaseOrder} selected  The PO open in the panel.
 * @property {Record<string, AdjustDraft>} adjustDrafts  Each line's adjust draft, by line id.
 * @property {{ lineId: string; read: Partial<PoLineResponse>; refusal: CounterOfferRefusal | null }[]} adjustLines
 *   The ticked lines, read, with the policy's refusal (the courtesy mirror).
 * @property {(lineId: string, patch: Partial<AdjustDraft>) => void} updateDraft
 * @property {string[]} adjustReasons  The active `poAdjust` reason codes (BL-32).
 * @property {ReturnType<typeof useReasonLabel>} reasonLabel
 * @property {string} responseComment  The optional comment sent with the answer.
 * @property {(v: string) => void} setResponseComment
 * @property {TFunction} t
 */

/**
 * The adjust form (REQ-E07-02): one card per line with a toggle and, when on,
 * the reason, the note for `other`, the counter quantity and date, and the
 * line's refusal; then the optional comment. Rendered in `adjusting` mode.
 * Moved out of `SupplierOrders.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<AdjustFormProps>}
 */
const AdjustForm = ({
  selected,
  adjustDrafts,
  adjustLines,
  updateDraft,
  adjustReasons,
  reasonLabel,
  responseComment,
  setResponseComment,
  t
}) => (
  <section data-testid="po-adjust-form">
    <h3 className="text-label text-text-tertiary uppercase mb-2">{t('oc.adjust.title')}</h3>
    <p className="text-xs text-text-secondary mb-3">{t('oc.adjust.hint')}</p>
    <div className="space-y-3">
      {selected.lineItems.map((li) => {
        const d = adjustDrafts[li.id];
        if (!d) return null;
        const refusal = adjustLines.find((l) => l.lineId === li.id)?.refusal ?? null;
        return (
          <div key={li.id} className="border border-border-subtle rounded-md p-3">
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={d.on}
                onChange={(e) => updateDraft(li.id, { on: e.target.checked })}
              />
              <span>{t('oc.adjust.lineToggle')}</span>
              <Data>{li.materialCode}</Data>
              <span className="text-text-tertiary">
                (<Data>{poLineQuantityText(t, li)}</Data>)
              </span>
            </label>
            {d.on && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className={labelClass} htmlFor={`adj-reason-${li.id}`}>
                    {t('oc.adjust.reason')}
                  </label>
                  <select
                    id={`adj-reason-${li.id}`}
                    className={inputClass}
                    value={d.reasonCode}
                    onChange={(e) =>
                      updateDraft(li.id, {
                        reasonCode: /** @type {PoReasonCode | ''} */ (e.target.value)
                      })
                    }
                  >
                    <option value="">{t('oc.adjust.reasonPlaceholder')}</option>
                    {adjustReasons.map((code) => (
                      <option key={code} value={code}>
                        {reasonLabel('poAdjust', code)}
                      </option>
                    ))}
                  </select>
                </div>
                {d.reasonCode === 'other' && (
                  <div>
                    <label className={labelClass} htmlFor={`adj-note-${li.id}`}>
                      {t('oc.adjust.note')}
                    </label>
                    <input
                      id={`adj-note-${li.id}`}
                      type="text"
                      className={inputClass}
                      value={d.note}
                      onChange={(e) => updateDraft(li.id, { note: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className={labelClass} htmlFor={`adj-qty-${li.id}`}>
                    {t('oc.adjust.qty')}
                  </label>
                  <input
                    id={`adj-qty-${li.id}`}
                    type="text"
                    inputMode="decimal"
                    className={inputClass}
                    value={d.qty}
                    onChange={(e) => updateDraft(li.id, { qty: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor={`adj-date-${li.id}`}>
                    {t('oc.adjust.date')}
                  </label>
                  <input
                    id={`adj-date-${li.id}`}
                    type="date"
                    className={inputClass}
                    value={d.date}
                    onChange={(e) => updateDraft(li.id, { date: e.target.value })}
                  />
                </div>
                {refusal && (
                  <div
                    role="alert"
                    data-testid={`po-adjust-refusal-${li.id}`}
                    className="sm:col-span-2 text-[length:var(--fs-label-3)] text-danger"
                  >
                    {t(ADJUST_REFUSAL_KEY[refusal], {
                      ordered: li.quantity,
                      uom: li.uom
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
    {adjustLines.length === 0 && (
      <p className="mt-2 text-xs text-text-secondary">{t('oc.adjust.needLine')}</p>
    )}
    <label className={`${labelClass} mt-3`} htmlFor="po-response-comment">
      {t('oc.response.commentOptional')}
    </label>
    <textarea
      id="po-response-comment"
      className={`${inputClass} min-h-[72px] resize-y`}
      value={responseComment}
      onChange={(e) => setResponseComment(e.target.value)}
    />
  </section>
);

export default AdjustForm;
