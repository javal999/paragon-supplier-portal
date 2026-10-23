/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PoRejectionCause } from '@services/data/types' */
/** @import { useReasonLabel } from '../../admin/reasonCodeDisplay' */
import { inputClass, labelClass } from '../const';

/**
 * @typedef {object} RejectFormProps
 * @property {string[]} rejectCauseCodes  The active `poReject` cause codes (BL-32).
 * @property {PoRejectionCause[]} rejectCauses  The causes ticked so far.
 * @property {React.Dispatch<React.SetStateAction<PoRejectionCause[]>>} setRejectCauses
 * @property {ReturnType<typeof useReasonLabel>} reasonLabel
 * @property {string} responseComment  The optional comment sent with the answer.
 * @property {(v: string) => void} setResponseComment
 * @property {TFunction} t
 */

/**
 * The reject form (REQ-E07-02): one checkbox per active cause, the hint when
 * none is ticked, and the optional comment. Rendered in `rejecting` mode.
 * Moved out of `SupplierOrders.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<RejectFormProps>}
 */
const RejectForm = ({
  rejectCauseCodes,
  rejectCauses,
  setRejectCauses,
  reasonLabel,
  responseComment,
  setResponseComment,
  t
}) => (
  <section data-testid="po-reject-form">
    <h3 className="text-label text-text-tertiary uppercase mb-2">{t('oc.reject.title')}</h3>
    <fieldset>
      <legend className="text-xs text-text-secondary mb-2">{t('oc.reject.hint')}</legend>
      <div className="flex flex-wrap gap-4">
        {rejectCauseCodes.map((cause) => (
          <label key={cause} className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={rejectCauses.includes(cause)}
              onChange={(e) =>
                setRejectCauses((prev) =>
                  e.target.checked ? [...prev, cause] : prev.filter((c) => c !== cause)
                )
              }
            />
            {reasonLabel('poReject', cause)}
          </label>
        ))}
      </div>
    </fieldset>
    {rejectCauses.length === 0 && (
      <p className="mt-2 text-xs text-text-secondary">{t('oc.reject.needCause')}</p>
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

export default RejectForm;
