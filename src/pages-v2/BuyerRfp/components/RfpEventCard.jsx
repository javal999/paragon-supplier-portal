/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
import { useTranslation } from 'react-i18next';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import RfpEventSummary from './RfpEventSummary';
import RfpEventActions from './RfpEventActions';

/**
 * The open event's card: its identity, ONE row of the acts its state allows
 * (RFx UX 2A, B-10: Edit, Send, Discard, Close, Extend, and "Save as a
 * template" in the "More actions" menu), the draft notice, scope, attachments,
 * confidentiality and T&C.
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split.
 * @type {React.FC<{
 *   open: RfpEventView;
 *   create: VerbAvailability;
 *   publish: VerbAvailability;
 *   run: (vars: RfxCommandVars, successKey: string) => void;
 *   onEdit: () => void;
 *   supplierName: (supplierId: string) => string;
 * }>}
 */
const RfpEventCard = ({ open, create, publish, run, onEdit, supplierName }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4">
      {/* — The event, and the acts its STATE allows. — */}
      <RfpEventSummary open={open} supplierName={supplierName} />
      <RfpEventActions open={open} create={create} publish={publish} run={run} onEdit={onEdit} />
      {open.status === 'Draft' && (
        <p className="text-xs text-text-tertiary mt-3" data-testid={`rfp-draft-notice-${open.id}`}>
          {t('rfx.status.draftHiddenFromSuppliers')}
        </p>
      )}
      <h4 className="text-xs uppercase tracking-wide text-text-tertiary mt-4">
        {t('rfx.rfp.scope')}
      </h4>
      <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{open.scope}</p>
      {(open.attachments ?? []).length > 0 && (
        <div className="mt-3">
          <SessionAttachments
            value={open.attachments ?? []}
            label={t('rfxa.att.buyer')}
            testId={`rfp-attachments-${open.id}`}
          />
        </div>
      )}
      {open.confidentiality && (
        <p className="text-xs text-text-tertiary mt-3" data-testid={`rfp-confidential-${open.id}`}>
          {t('rfxa.conf.buyerNote')}
        </p>
      )}
      {open.termsDocument && (
        <div className="mt-3" data-testid={`rfp-tc-${open.id}`}>
          <h4 className="text-xs uppercase tracking-wide text-text-tertiary">
            {t('rfxa.tc.title')}
          </h4>
          {open.termsDocument.text && (
            <p className="text-sm text-text-secondary whitespace-pre-line">
              {open.termsDocument.text}
            </p>
          )}
          {open.termsDocument.attachment && (
            <SessionAttachments
              value={[open.termsDocument.attachment]}
              label={t('rfxa.tc.file')}
              testId={`rfp-tc-file-${open.id}`}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default RfpEventCard;
