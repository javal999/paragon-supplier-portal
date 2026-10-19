/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
import { useTranslation } from 'react-i18next';
import { EventSourcingType, QualificationWarningsNote } from '../../rfx/eligibilityDisplay';
import { DraftRevisionNote } from '../../rfx/draftEdit';

/**
 * The open event's identity block: sourcing type, the published qualification
 * warnings, the RFI it came from and the last edit. The number, title and
 * status are the page header's, so the card does not repeat them (RFx UX 2F).
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split.
 * @type {React.FC<{ open: RfpEventView; supplierName: (supplierId: string) => string }>}
 */
const RfpEventSummary = ({ open, supplierName }) => {
  const { t } = useTranslation();
  return (
    <div>
      {/* Material G2 (MR-10 BR-06) — the type, fixed at publish. */}
      <div>
        <EventSourcingType
          event={{
            kind: 'rfp',
            status: open.status,
            materialCategory: open.materialCategory,
            ...(open.purchasingGroup ? { purchasingGroup: open.purchasingGroup } : {}),
            ...(open.sourcingType ? { sourcingType: open.sourcingType } : {})
          }}
          testId={`rfp-sourcing-type-${open.id}`}
        />
      </div>
      {/* BL-147 — the invitees published below the level on placeholder rules, as recorded. */}
      {!!open.qualificationWarnings && open.qualificationWarnings.length > 0 && (
        <div className="mt-2">
          <QualificationWarningsNote
            kind="published"
            warnings={open.qualificationWarnings}
            supplierName={supplierName}
            testId={`rfp-published-warnings-${open.id}`}
          />
        </div>
      )}
      {open.sourceRfiNumber && (
        <p className="text-xs text-text-tertiary mt-1" data-testid={`rfp-from-rfi-${open.id}`}>
          {t('rfx.event.fromRfi', { event: open.sourceRfiNumber })}
        </p>
      )}
      <DraftRevisionNote revisions={open.revisions} testId={`rfp-last-edited-${open.id}`} />
    </div>
  );
};

export default RfpEventSummary;
