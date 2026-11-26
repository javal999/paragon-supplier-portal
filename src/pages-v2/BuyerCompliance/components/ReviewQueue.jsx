/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { SupplierDocument } from '@services/data/types' */
/** @import { useDocumentReview } from '../hooks/useDocumentReview' */
import { Inbox } from 'lucide-react';
import ReviewQueueItem from './ReviewQueueItem';

/**
 * @typedef {object} ReviewQueueProps
 * @property {SupplierDocument[]} reviewQueue Documents in `Under Review`; the page renders this
 *   section only when there is at least one.
 * @property {ReturnType<typeof useDocumentReview>} reviewer The page's verify / reject state and
 *   runners, threaded to each row.
 * @property {(supplierId: string) => string | null} supplierNameOf UCX-P5 — resolves a
 *   document's supplier id to the roster name the reviewer checks.
 * @property {TFunction} t
 */

/**
 * Compliance's review queue (§82): a card listing every supplier declaration
 * awaiting a decision, one `ReviewQueueItem` per document. Moved out of
 * `BuyerCompliance.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ReviewQueueProps>}
 */
const ReviewQueue = ({ reviewQueue, reviewer, supplierNameOf, t }) => (
  <div
    className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-6 overflow-hidden"
    data-testid="doc-review-queue"
  >
    <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
      <Inbox size={16} className="text-action shrink-0" aria-hidden="true" />
      <div>
        <div className="text-sm font-bold text-text-primary">{t('compliance.queue.title')}</div>
        <div className="text-xs text-text-tertiary mt-0.5">
          {reviewQueue.length === 1
            ? t('compliance.queue.subtitle.one', { count: reviewQueue.length })
            : t('compliance.queue.subtitle.other', { count: reviewQueue.length })}
        </div>
      </div>
    </div>

    <div className="divide-y divide-border-subtle">
      {reviewQueue.map((doc) => (
        <ReviewQueueItem
          key={doc.id}
          doc={doc}
          supplierName={supplierNameOf(doc.supplierId)}
          reviewer={reviewer}
          t={t}
        />
      ))}
    </div>
  </div>
);

export default ReviewQueue;
