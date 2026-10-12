/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useDocumentReview } from '../hooks/useDocumentReview' */
import Button from '@components/ui-v2/Button';

/**
 * @typedef {object} RejectReasonFormProps
 * @property {string} docId The queued document the form refuses.
 * @property {ReturnType<typeof useDocumentReview>} reviewer The reason, its setter, the open-row
 *   setter, the busy row and `runReject`.
 * @property {TFunction} t
 */

/**
 * The inline reject form under a queued document: the required reason, a
 * hint, Cancel (closes the form and clears the reason) and Record refusal
 * (disabled until a reason is typed or while the row is busy). Moved out of
 * `BuyerCompliance.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<RejectReasonFormProps>}
 */
const RejectReasonForm = ({ docId, reviewer, t }) => {
  const { rejectReason, setRejectReason, setRejecting, busyId, runReject } = reviewer;
  return (
    <div className="mt-3 bg-bg-hover rounded px-3 py-3" data-testid={`doc-reject-form-${docId}`}>
      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('compliance.queue.reject.label')}
        </span>
        <textarea
          rows={2}
          data-testid="doc-reject-reason"
          className="w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary"
          placeholder={t('compliance.queue.reject.placeholder')}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </label>
      <p className="text-xs text-text-tertiary mt-1">{t('compliance.queue.reject.hint')}</p>
      <div className="flex justify-end gap-2 mt-2">
        <Button
          variant="secondary"
          onClick={() => {
            setRejecting(null);
            setRejectReason('');
          }}
        >
          {t('compliance.queue.action.cancel')}
        </Button>
        <Button
          variant="outline"
          disabled={rejectReason.trim() === '' || busyId === docId}
          onClick={() => {
            void runReject(docId);
          }}
        >
          {t('compliance.queue.action.confirmReject')}
        </Button>
      </div>
    </div>
  );
};

export default RejectReasonForm;
