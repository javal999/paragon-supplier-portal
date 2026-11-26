/** @import React from 'react' */
/** @import { SupplierDocument } from '@services/data/types' */
/** @import { CoaForm, DeclarationForm, PanelMode } from '../const' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { CheckCircle2, Upload } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@lib/format';
import { coaComplete, declarationComplete } from '../utils';
import DeclarationFields from './DeclarationFields';
import CoaDeclarationFields from './CoaDeclarationFields';

/**
 * @typedef {object} DeclarationPanelProps
 * @property {PanelMode} panelMode  `closed` hides the panel; `answer-coa` and
 *   `renew` are UCX-P5's two modes.
 * @property {string} panelTitle  New declaration, "declare <document>", the COA
 *   answer, or the renewal.
 * @property {SupplierDocument | null} activeDoc  The document being answered, if any.
 * @property {boolean} uploaded  The declaration was recorded; the panel shows the receipt.
 * @property {DeclarationForm} form
 * @property {React.Dispatch<React.SetStateAction<DeclarationForm>>} setForm
 * @property {CoaForm} coaForm  The COA answer's own form (UCX-P5).
 * @property {React.Dispatch<React.SetStateAction<CoaForm>>} setCoaForm
 * @property {VerbAvailability} supplyAvailability  Whether the seat holds the verb in play.
 * @property {boolean} pending  A supply verb is in flight.
 * @property {() => void} closePanel
 * @property {() => Promise<void>} recordDeclaration
 */

/**
 * The declaration side panel: the document it answers (when one is active),
 * the form or the "declaration recorded" receipt, and a footer with Cancel /
 * Close plus either the submit button or the handoff notice for a seat that
 * does not hold the verb. State and handlers come from `useDeclarationPanel`
 * in the page.
 *
 * UCX-P5 — two extra modes, each with its own body and its own words: the COA
 * answer (batch, number, issuer, date — no certificate scheme) and the renewal
 * (the certificate declaration prefilled from the expiring record).
 * @type {React.FC<DeclarationPanelProps>}
 */
const DeclarationPanel = ({
  panelMode,
  panelTitle,
  activeDoc,
  uploaded,
  form,
  setForm,
  coaForm,
  setCoaForm,
  supplyAvailability,
  pending,
  closePanel,
  recordDeclaration
}) => {
  const { t } = useTranslation();
  const complete = panelMode === 'answer-coa' ? coaComplete(coaForm) : declarationComplete(form);
  const submitLabel =
    panelMode === 'answer-coa'
      ? t('supplierDocuments.action.sendAnswer')
      : t('supplierDocuments.action.submit');
  return (
    <SidePanel
      open={panelMode !== 'closed'}
      onClose={closePanel}
      title={panelTitle}
      footerActions={
        <>
          <Button variant="secondary" onClick={closePanel}>
            {uploaded ? t('supplierDocuments.action.close') : t('supplierDocuments.action.cancel')}
          </Button>
          {!uploaded &&
            (supplyAvailability.kind === 'held' ? (
              <Button
                variant="outline"
                icon={Upload}
                disabled={!complete || pending}
                onClick={() => {
                  void recordDeclaration();
                }}
              >
                {submitLabel}
              </Button>
            ) : (
              // The seat may READ this panel and not hold the verb — a
              // commercial or fulfilment lane, once a supplier seat is
              // narrowed. Render the wait with its owner, never an absent
              // affordance (the handoff constraint).
              <HandoffNotice
                availability={supplyAvailability}
                testId="handoff-supplierdoc-supply"
              />
            ))}
        </>
      }
    >
      <div className="space-y-5">
        {activeDoc && (
          <section>
            <h3 className="text-label text-text-tertiary uppercase mb-2">
              {panelMode === 'renew'
                ? t('supplierDocuments.panel.replaces')
                : t('supplierDocuments.panel.document')}
            </h3>
            {/* i18n-defer: mock/sample data (fixture document name) */}
            <div className="text-sm font-semibold text-text-primary">{activeDoc.name}</div>
            <div className="text-xs text-text-tertiary mt-0.5">
              {panelMode === 'renew' && activeDoc.expiryDate
                ? t('supplierDocuments.panel.replacesLine', {
                    id: activeDoc.id,
                    date: formatDate(activeDoc.expiryDate)
                  })
                : t('supplierDocuments.row.linked', { value: activeDoc.linkedTo })}
            </div>
            {activeDoc.notes && (
              <div className="mt-2 bg-warning-soft border-l-2 border-warning rounded px-3 py-2 text-xs text-warning-hover">
                {activeDoc.notes}
              </div>
            )}
          </section>
        )}

        {panelMode === 'answer-coa' && activeDoc?.notes && (
          <section
            className="bg-bg-hover border-l-2 border-action rounded px-4 py-3"
            data-testid="coa-ask-note"
          >
            <div className="text-label text-text-tertiary uppercase mb-1">
              {t('supplierDocuments.coa.ask')}
            </div>
            {/* i18n-defer: buyer-authored free text, rendered word for word. */}
            <p className="text-sm text-text-secondary">{activeDoc.notes}</p>
          </section>
        )}

        {!uploaded ? (
          panelMode === 'answer-coa' ? (
            <CoaDeclarationFields form={coaForm} setForm={setCoaForm} />
          ) : (
            <DeclarationFields form={form} setForm={setForm} />
          )
        ) : (
          <>
            <section
              className="bg-success-soft border-l-2 border-success rounded px-4 py-3 text-sm text-success font-semibold flex items-center gap-2"
              data-testid="declaration-recorded"
            >
              <CheckCircle2 size={16} />
              {t('supplierDocuments.panel.declaredMsg')}
            </section>
            {panelMode === 'renew' && (
              // UCX-SG10 — the expiring record itself now reads "Under Review";
              // the supplier is told what that means before they leave.
              <p className="text-xs text-text-secondary" data-testid="renewal-recorded">
                {t('supplierDocuments.panel.renewedMsg')}
              </p>
            )}
          </>
        )}
      </div>
    </SidePanel>
  );
};

export default DeclarationPanel;
