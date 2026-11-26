/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { SupplierDocument } from '@services/data/types' */
/** @import { useDocumentReview } from '../hooks/useDocumentReview' */
import { CheckCircle2, XCircle } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { certTypeLabelKey } from '@lib/complianceView';
import DeclarationDetails from './DeclarationDetails';
import RejectReasonForm from './RejectReasonForm';

/**
 * @typedef {object} ReviewQueueItemProps
 * @property {SupplierDocument} doc The document awaiting review.
 * @property {string | null} supplierName The supplier's roster name, or null when
 *   the roster no longer resolves the id (shown as the id alone).
 * @property {ReturnType<typeof useDocumentReview>} reviewer Verify / reject availability, the
 *   open reject form, the busy row and the two runners.
 * @property {TFunction} t
 */

/**
 * One row of the review queue: the declared certificate (or the COA, or the
 * document name for a seeded row with no declaration), its supplier and
 * number, the sentence that says nothing was uploaded and what to check, the
 * declaration details, the Confirm / Refuse buttons — each replaced by its own
 * handoff notice when the seat does not hold the verb — and the reject form
 * when it is open on this row.
 *
 * UCX-P5 — the check sentence is the answer to UCX-F18: until file storage
 * exists (BL-27), the officer confirms a record the portal cannot verify, so
 * the panel says what to check instead.
 * @type {React.FC<ReviewQueueItemProps>}
 */
const ReviewQueueItem = ({ doc, supplierName, reviewer, t }) => {
  const { review, busyId, rejecting, setRejecting, runVerify } = reviewer;
  return (
    <div className="px-5 py-4" data-testid={`doc-review-${doc.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text-primary">
            {doc.coaDeclaration
              ? t('compliance.queue.kind.coa')
              : doc.declaration
                ? t(certTypeLabelKey(doc.declaration.certType))
                : /* i18n-defer: mock/sample data (fixture document name) */
                  doc.name}
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">
            {/* i18n-defer: mock/sample data (supplier name and id) */}
            {supplierName ? <span>{supplierName} · </span> : null}
            <Data>{doc.supplierId}</Data>
            {doc.declaration && (
              <>
                {' · '}
                <Data>{doc.declaration.certNumber}</Data>
              </>
            )}
            {doc.coaDeclaration && (
              <>
                {' · '}
                <Data>{doc.coaDeclaration.coaNumber}</Data>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-text-secondary" data-testid="review-check">
            {t('compliance.queue.check')}
          </p>
          {doc.declaration || doc.coaDeclaration ? (
            <DeclarationDetails doc={doc} t={t} />
          ) : (
            /* A seeded row that predates the verb: it reached `Under
               Review` before declarations existed, so there is nothing
               to show and the surface says so rather than rendering
               empty labels over blanks. */
            <p className="mt-2 text-xs text-text-tertiary">{t('compliance.queue.noDeclaration')}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {review.verify.kind === 'held' ? (
            <Button
              variant="outline"
              icon={CheckCircle2}
              disabled={busyId === doc.id}
              onClick={() => {
                void runVerify(doc.id);
              }}
            >
              {t('compliance.queue.action.verify')}
            </Button>
          ) : (
            <HandoffNotice availability={review.verify} testId="handoff-supplierdoc-verify" />
          )}
          {review.reject.kind === 'held' ? (
            <Button
              variant="secondary"
              icon={XCircle}
              disabled={busyId === doc.id}
              onClick={() => setRejecting((r) => (r === doc.id ? null : doc.id))}
            >
              {t('compliance.queue.action.reject')}
            </Button>
          ) : (
            <HandoffNotice availability={review.reject} testId="handoff-supplierdoc-reject" />
          )}
        </div>
      </div>

      {/* ⚠️ THE REASON IS REQUIRED AT THE VERB, SO IT IS REQUIRED HERE.
          `t_supplierdoc_reject` declares `requiredFields:
          ['rejectionReason']` and the dispatcher refuses a blank one —
          this input is not the guard, it is the surface honouring a
          guard that already exists. §80 built the supplier-facing
          refusal screen on the promise that a reason always travels
          with the refusal; this is the end of the wire that keeps it. */}
      {rejecting === doc.id && review.reject.kind === 'held' && (
        <RejectReasonForm docId={doc.id} reviewer={reviewer} t={t} />
      )}
    </div>
  );
};

export default ReviewQueueItem;
