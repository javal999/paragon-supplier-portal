/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
/** @import { SupplierApplication } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { ApplicationReview } from '../hooks/useApplicationReview' */

/**
 * @typedef {object} ApplicationActsProps
 * @property {SupplierApplication} selected          the application being acted on
 * @property {ApplicationReview} review              confirm-step state and the three verbs (page state)
 * @property {VerbAvailability} reviewAvailability   the seat's hold on `application:review`
 * @property {VerbAvailability} decideAvailability   the seat's hold on `application:decide`
 */

/**
 * THE ACTS. Each in its OWN slot, gated on its OWN atom: start review on a
 * `Submitted` row; approve / reject on an `Under Review` row, each behind its
 * own confirm step (reject requires authored text). Moved out of
 * `BuyerSupplierApplications` by the Phase 5 page split.
 * @type {React.FC<ApplicationActsProps>}
 */
const ApplicationActs = ({ selected, review, reviewAvailability, decideAvailability }) => {
  const { t } = useTranslation();
  const {
    pending,
    setPending,
    reason,
    setReason,
    canCommitReject,
    startReviewPending,
    approvePending,
    rejectPending,
    startReviewSelected,
    approveSelected,
    rejectSelected
  } = review;

  return (
    <>
      {selected.status === 'Submitted' && (
        <div className="flex items-center gap-3">
          {reviewAvailability.kind === 'held' ? (
            <Button
              variant="outline"
              onClick={startReviewSelected}
              disabled={startReviewPending}
              data-testid="application-start-review"
            >
              {t('applications.action.startReview')}
            </Button>
          ) : (
            <HandoffNotice availability={reviewAvailability} testId="handoff-application-review" />
          )}
        </div>
      )}

      {selected.status === 'Under Review' && pending === null && (
        <div className="flex items-center gap-3">
          {decideAvailability.kind === 'held' ? (
            <>
              <Button
                variant="outline"
                onClick={() => setPending('approve')}
                data-testid="application-approve"
              >
                {t('applications.action.approve')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPending('reject')}
                data-testid="application-reject"
              >
                {t('applications.action.reject')}
              </Button>
            </>
          ) : (
            <HandoffNotice availability={decideAvailability} testId="handoff-application-decide" />
          )}
        </div>
      )}

      {/* CONFIRM BEFORE COMMIT — approve. No text box: nothing to author. */}
      {selected.status === 'Under Review' && pending === 'approve' && (
        <div
          className="rounded-md border border-border-subtle bg-bg-hover p-4 space-y-3"
          data-testid="application-approve-confirm"
        >
          <div className="text-sm font-bold text-text-primary">
            {t('applications.confirm.approve.title')}
          </div>
          <p className="text-sm text-text-secondary">
            {t('applications.confirm.approve.body', { company: selected.companyName })}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={approveSelected}
              disabled={approvePending}
              data-testid="application-approve-commit"
            >
              {t('applications.confirm.approve.commit')}
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              {t('applications.action.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* CONFIRM BEFORE COMMIT — reject, and the reason is required. */}
      {selected.status === 'Under Review' && pending === 'reject' && (
        <div
          className="rounded-md border border-border-subtle bg-bg-hover p-4 space-y-3"
          data-testid="application-reject-confirm"
        >
          <div className="text-sm font-bold text-text-primary">
            {t('applications.confirm.reject.title')}
          </div>
          <p className="text-sm text-text-secondary">
            {t('applications.confirm.reject.body', { company: selected.companyName })}
          </p>
          <label className="block text-sm">
            <span className="text-text-secondary">
              {t('applications.confirm.reject.reasonLabel')}
            </span>
            <textarea
              className="mt-1 w-full rounded-md border border-border-subtle bg-white p-2 text-sm"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('applications.confirm.reject.reasonPlaceholder')}
              data-testid="application-reject-reason"
            />
          </label>
          <p className="text-xs text-text-tertiary">
            {t('applications.confirm.reject.reasonHint')}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={rejectSelected}
              disabled={!canCommitReject || rejectPending}
              data-testid="application-reject-commit"
            >
              {t('applications.confirm.reject.commit')}
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              {t('applications.action.cancel')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ApplicationActs;
