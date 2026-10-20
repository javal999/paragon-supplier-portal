/** @import React from 'react' */
/** @import { RfpEventView } from '@services/sourcing/views' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { rfxFamilyForCategory } from '@services/sourcing/rfxConfig';
import { rfpTemplateStore } from '@services/sourcing/rfxTemplates';
import { ConfirmSheet, closeEffects } from '../../rfx/ConfirmSheet';
import RfxMoreMenu from '../../rfx/RfxMoreMenu';
import RfxSaveTemplate from '../../rfx/RfxSaveTemplate';
import { rfxNow } from '../../rfx/rfxDisplay';
import { extendOffered } from '../../rfx/rfxExtend';

/**
 * The acts the open event's STATE allows, in ONE row (RFx UX 2A, B-10),
 * above the page's tabs (RFx UX 2G):
 * Edit draft / Send / Discard on a Draft, Close on an Open one, the deadline
 * extension, and "More actions" holding "Save as a template". `create` gates
 * Edit (`rfp:create`), `publish` gates the rest (`rfp:publish`); every verb
 * goes through the page's `run`. "Create RFQ from this RFP" stays in "Firm up
 * the prices" (B-07), where its rule ("Close the RFP first") is stated.
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split.
 * @type {React.FC<{
 *   open: RfpEventView;
 *   create: VerbAvailability;
 *   publish: VerbAvailability;
 *   run: (vars: RfxCommandVars, successKey: string) => void;
 *   onEdit: () => void;
 * }>}
 */
const RfpEventActions = ({ open, create, publish, run, onEdit }) => {
  const { t } = useTranslation();
  // RFx UX 1C (B-05) — "Close the event" opens a confirmation sheet; the
  // close is dispatched only from the sheet.
  const [confirmClose, setConfirmClose] = useState(false);
  const [extendTo, setExtendTo] = useState('');
  // RFx UX 2A (B-10) — "Save as a template" is opened from the menu.
  const [saveTemplate, setSaveTemplate] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-end gap-3" data-testid={`rfp-actions-${open.id}`}>
        {open.status === 'Draft' &&
          (create.kind === 'held' ? (
            <Button variant="secondary" onClick={onEdit} data-testid={`rfp-edit-${open.id}`}>
              {t('rfxEdit.edit')}
            </Button>
          ) : (
            <HandoffNotice availability={create} testId={`handoff-rfp-edit-${open.id}`} />
          ))}
        {/* A seat without `rfp:publish` reads whose act Send, Discard, Close and
            Extend are — the list's notice, carried onto the event's own page. */}
        {publish.kind !== 'held' && (
          <HandoffNotice availability={publish} testId="handoff-rfp-publish" />
        )}
        {open.status === 'Draft' && (
          <Button
            variant="outline"
            disabled={publish.kind !== 'held'}
            data-testid={`rfp-send-${open.id}`}
            onClick={() => run({ verb: 'publishRfp', rfpId: open.id }, 'rfx.toast.published')}
          >
            {t('rfx.rfp.publish')}
          </Button>
        )}
        {/* BL-93 — DISCARD a draft: the existing `t_rfp_cancel` (legal
            from Draft), the same `rfp:publish` atom as Send; a seat
            without it reads the page's publish notice. */}
        {open.status === 'Draft' && (
          <Button
            variant="secondary"
            className="text-danger"
            disabled={publish.kind !== 'held'}
            data-testid={`rfp-discard-${open.id}`}
            onClick={() => run({ verb: 'discardRfp', rfpId: open.id }, 'rfxEdit.toast.discarded')}
          >
            {t('rfxEdit.discard')}
          </Button>
        )}
        {open.status === 'Open' && (
          <Button
            variant="secondary"
            disabled={publish.kind !== 'held'}
            data-testid={`rfp-close-${open.id}`}
            onClick={() => setConfirmClose(true)}
          >
            {t('rfx.rfp.closeEvent')}
          </Button>
        )}
        {/* BL-219 — the deadline extension, only where `t_rfp_extend` accepts the status. */}
        {extendOffered('t_rfp_extend', open.status) ? (
          <>
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
                value={extendTo}
                onChange={(e) => setExtendTo(e.target.value)}
                className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
            </div>
            <Button
              variant="outline"
              disabled={publish.kind !== 'held' || !extendTo}
              onClick={() =>
                run({ verb: 'extendRfp', rfpId: open.id, deadline: extendTo }, 'rfx.toast.extended')
              }
              data-testid={`rfp-extend-btn-${open.id}`}
            >
              {t('rfx.rfi.extendAll')}
            </Button>
          </>
        ) : null}
        <RfxMoreMenu
          testId={`rfp-more-${open.id}`}
          items={[
            {
              key: 'template',
              label: t('rfx.actions.saveTemplate'),
              onSelect: () => setSaveTemplate(true)
            }
          ]}
        />
      </div>
      {!!confirmClose && open.status === 'Open' && (
        <div className="mt-3">
          <ConfirmSheet
            title={t('rfx.confirm.close.title')}
            effects={closeEffects(t, {
              invited: open.invitedSuppliers.length,
              responded: open.responses.length
            })}
            confirmLabel={t('rfx.rfp.closeEvent')}
            confirmDisabled={publish.kind !== 'held'}
            onConfirm={() => {
              setConfirmClose(false);
              run({ verb: 'closeRfp', rfpId: open.id }, 'rfx.toast.closed');
            }}
            onBack={() => setConfirmClose(false)}
            testId={`rfp-close-sheet-${open.id}`}
            confirmTestId={`rfp-close-confirm-${open.id}`}
          />
        </div>
      )}
      {!!saveTemplate && (
        <div className="mt-3">
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
      )}
    </>
  );
};

export default RfpEventActions;
