/** @import React from 'react' */
/** @import { SupplierDocument } from '@services/data/types' */
/** @import { DeclarationForm, PanelMode } from '../const' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { CheckCircle2, Upload } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useTranslation } from 'react-i18next';
import { declarationComplete } from '../utils';
import DeclarationFields from './DeclarationFields';

/**
 * @typedef {object} DeclarationPanelProps
 * @property {PanelMode} panelMode  `closed` hides the panel.
 * @property {string} panelTitle  New declaration, or "declare <document>".
 * @property {SupplierDocument | null} activeDoc  The document being answered, if any.
 * @property {boolean} uploaded  The declaration was recorded; the panel shows the receipt.
 * @property {DeclarationForm} form
 * @property {React.Dispatch<React.SetStateAction<DeclarationForm>>} setForm
 * @property {VerbAvailability} supplyAvailability  Whether the seat holds the verb in play.
 * @property {boolean} pending  Either supply verb is in flight.
 * @property {() => void} closePanel
 * @property {() => Promise<void>} recordDeclaration
 */

/**
 * The declaration side panel: the document it answers (when one is active),
 * the form or the "declaration recorded" receipt, and a footer with Cancel /
 * Close plus either the submit button or the handoff notice for a seat that
 * does not hold the verb. State and handlers come from `useDeclarationPanel`
 * in the page. Moved out of `SupplierDocuments.jsx` by the Phase 5 page split
 * (no behaviour change).
 * @type {React.FC<DeclarationPanelProps>}
 */
const DeclarationPanel = ({
  panelMode,
  panelTitle,
  activeDoc,
  uploaded,
  form,
  setForm,
  supplyAvailability,
  pending,
  closePanel,
  recordDeclaration
}) => {
  const { t } = useTranslation();
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
                disabled={!declarationComplete(form) || pending}
                onClick={() => {
                  void recordDeclaration();
                }}
              >
                {t('supplierDocuments.action.submit')}
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
              {t('supplierDocuments.panel.document')}
            </h3>
            {/* i18n-defer: mock/sample data (fixture document name) */}
            <div className="text-sm font-semibold text-text-primary">{activeDoc.name}</div>
            <div className="text-xs text-text-tertiary mt-0.5">
              {t('supplierDocuments.row.linked', { value: activeDoc.linkedTo })}
            </div>
            {activeDoc.notes && (
              <div className="mt-2 bg-warning-soft border-l-2 border-warning rounded px-3 py-2 text-xs text-warning-hover">
                {activeDoc.notes}
              </div>
            )}
          </section>
        )}

        {!uploaded ? (
          <DeclarationFields form={form} setForm={setForm} />
        ) : (
          <section
            className="bg-success-soft border-l-2 border-success rounded px-4 py-3 text-sm text-success font-semibold flex items-center gap-2"
            data-testid="declaration-recorded"
          >
            <CheckCircle2 size={16} />
            {t('supplierDocuments.panel.declaredMsg')}
          </section>
        )}
      </div>
    </SidePanel>
  );
};

export default DeclarationPanel;
