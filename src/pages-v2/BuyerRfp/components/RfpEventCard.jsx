/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { rfxFamilyForCategory } from '@services/sourcing/rfxConfig';
import { rfpTemplateStore } from '@services/sourcing/rfxTemplates';
import RfxSaveTemplate from '../../rfx/RfxSaveTemplate';
import { rfxNow } from '../../rfx/rfxDisplay';
import RfpEventSummary from './RfpEventSummary';
import RfpEventActions from './RfpEventActions';

/**
 * The open event's card: its identity and state-allowed acts, the draft
 * notice, scope, attachments, confidentiality and T&C, the deadline extension
 * and "Save as template". `extendTo` lives in the page so a typed date survives
 * closing and reopening the detail.
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{
 *   open: RfpEventView;
 *   create: VerbAvailability;
 *   publish: VerbAvailability;
 *   run: (vars: RfxCommandVars, successKey: string) => void;
 *   setEditingId: (id: string | null) => void;
 *   extendTo: Record<string, string>;
 *   setExtendTo: React.Dispatch<React.SetStateAction<Record<string, string>>>;
 *   extend: (event: RfpEventView) => void;
 *   supplierName: (supplierId: string) => string;
 * }>}
 */
const RfpEventCard = ({
  open,
  create,
  publish,
  run,
  setEditingId,
  extendTo,
  setExtendTo,
  extend,
  supplierName
}) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4">
      {/* — The event, and the acts its STATE allows. — */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <RfpEventSummary open={open} supplierName={supplierName} />
        <RfpEventActions
          open={open}
          create={create}
          publish={publish}
          run={run}
          setEditingId={setEditingId}
        />
      </div>
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
      <div className="flex flex-wrap items-end gap-3 mt-4">
        <div>
          <label
            className="block text-xs font-semibold text-text-secondary mb-1"
            htmlFor={`rfp-extend-${open.id}`}
          >
            {t('rfx.rfi.extend')}
          </label>
          <input
            id={`rfp-extend-${open.id}`}
            type="date"
            value={extendTo[open.id] ?? ''}
            onChange={(e) => setExtendTo((prev) => ({ ...prev, [open.id]: e.target.value }))}
            className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          />
        </div>
        <Button
          variant="outline"
          disabled={publish.kind !== 'held' || !extendTo[open.id]}
          onClick={() => extend(open)}
          data-testid={`rfp-extend-btn-${open.id}`}
        >
          {t('rfx.rfi.extendAll')}
        </Button>
      </div>
      <div className="mt-4">
        <RfxSaveTemplate
          key={open.id}
          testIdPrefix={`rfp-${open.id}`}
          defaultName={open.title}
          onSave={(name) =>
            rfpTemplateStore.save(
              name,
              {
                familyId: rfxFamilyForCategory(open.materialCategory)?.id ?? '',
                scope: open.scope,
                currency: open.currency,
                terms: open.terms,
                questions: open.questions ?? [],
                customSections: open.customSections ?? [],
                ...(open.pricing ? { pricing: open.pricing } : {}),
                confidential: !!open.confidentiality,
                ...(open.confidentiality?.terms
                  ? { confidentialityTerms: open.confidentiality.terms }
                  : {}),
                ...(open.termsDocument?.text ? { termsText: open.termsDocument.text } : {})
              },
              rfxNow()
            )
          }
        />
      </div>
    </div>
  );
};

export default RfpEventCard;
