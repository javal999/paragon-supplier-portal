/** @import React from 'react' */
/** @import { SupplierDocument } from '@services/data/types' */
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
import { useTranslation } from 'react-i18next';

/**
 * ⚠️ **THE REFUSAL BLOCK — REASON, TIMESTAMP, AND THE LINE THAT SAYS NOBODY CAN
 * BE NAMED.** It renders the SAME grammar the dispute lane set one tenancy over
 * (`DisputeLedger`, `SupplierForecasts.jsx`): a coloured left rule, an uppercase
 * label, a `Data` timestamp, then the buyer's authored text — read by the party
 * the text is about.
 *
 * ⚠️ **THREE THINGS IT DELIBERATELY DOES NOT DO.**
 * 1. **It does not name a person.** `rejectedBy` is `ActorAttribution`, always
 *    `UNATTRIBUTED` in this tree, so the component renders the REASON rather
 *    than a name — and says so in words instead of leaving the slot blank.
 * 2. **It offers no remedy affordance.** A "resubmit" button here would be a
 *    forward promise with no handler: `supplierdoc:upload` is unauthored, and
 *    the atom belongs to the back-office lane by ruling. The refusal text
 *    carries the instruction; the platform makes no claim about what happens
 *    next (`FORWARD-PROMISE-HAS-NO-HANDLER-01`).
 * 3. **It does not fabricate a time of day.** `rejectedAt` is a full instant,
 *    but `formatDate` is date-only and no shared datetime formatter exists in
 *    this tree — so the surface shows the DATE and claims nothing finer.
 *
 * Moved out of `SupplierDocuments.jsx` by the Phase 5 page split (no behaviour
 * change); rendered by `DocumentRow` under each document's name.
 * @type {React.FC<{ doc: SupplierDocument }>}
 */
const RefusalBlock = ({ doc }) => {
  const { t } = useTranslation();
  // ⚠️ CO-PRESENCE IS CHECKED HERE TOO, NOT ONLY IN THE FIXTURE GATE. A reason
  // with no timestamp is an accusation with no date; rendering half of one is
  // worse than rendering none, so the block is all-or-nothing.
  if (!doc.rejectionReason || !doc.rejectedAt) return null;
  // ⚠️ **AND THE STATE GATE, ADDED AT §82 BY BROWSER QA — THE PRESENCE OF A
  // REASON IS NOT THE SAME QUESTION AS WHETHER THE DOCUMENT IS REFUSED NOW.**
  // Until §82 nothing could leave `Rejected`, so the two questions had the same
  // answer and the field check stood in for the state check. `t_supplierdoc_
  // submit` now accepts `Rejected` as a `from` — and the store DELIBERATELY
  // keeps the refusal fields, because a refusal was a recorded act and a
  // correction does not un-happen it. The result, caught on the built bundle
  // and invisible to the suite: a re-declared document sat in `Under Review`
  // with a red block reading "REFUSED" above it, while the page banner (which
  // IS status-gated) had already dropped its count. Two parts of one page
  // disagreeing about the same document.
  //
  // The stored fields stay; only this render is gated. Showing a supplier a
  // present-tense refusal for a document they have already corrected is the
  // false-affordance class facing backwards — a stale accusation instead of a
  // false promise.
  if (doc.status !== 'Rejected') return null;
  return (
    <div
      className="mt-1.5 border-l-2 border-l-danger pl-3 py-1 max-w-[22rem]"
      data-testid={`doc-refusal-${doc.id}`}
    >
      <div className="text-label uppercase mb-0.5">
        <span className="text-danger">{t('supplierDocuments.refusal.label')}</span>{' '}
        <Data className="text-text-tertiary normal-case">{formatDate(doc.rejectedAt)}</Data>
      </div>
      {/* i18n-defer: mock/sample data (fixture refusal text) */}
      <div className="text-xs text-text-secondary">
        <span className="font-semibold text-text-primary">
          {t('supplierDocuments.refusal.reasonLabel')}:
        </span>{' '}
        {doc.rejectionReason}
      </div>
      {doc.rejectedBy?.kind === 'UNATTRIBUTED' && (
        <div className="text-xs text-text-tertiary mt-0.5 italic">
          {t('supplierDocuments.refusal.unattributed')}
        </div>
      )}
    </div>
  );
};

export default RefusalBlock;
