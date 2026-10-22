/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { SupplierInvoice } from '@services/data/types' */
/** @import { useNextAct, useVerbAvailability } from '@hooks/useVerbAvailability' */
/** @import { PanelMode } from './InvoiceRow' */
import { Download, Receipt } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import SidePanel from '@components/ui-v2/SidePanel';
import Timeline from '@components/ui-v2/Timeline';
import { InvoiceLinesSection, MatchResult } from '../../invoices/InvoiceCollaboration';
import { buildTimeline } from '../utils';
import DetailKeyFacts from './DetailKeyFacts';
import RemittanceSection from './RemittanceSection';

/**
 * @typedef {object} InvoiceDetailPanelProps
 * @property {SupplierInvoice | null} selected  The invoice shown; `null` closes the panel.
 * @property {PanelMode} panelMode  Detail (facts, match, lines, lifecycle) or remittance.
 * @property {(mode: PanelMode) => void} setPanelMode  Switches to the remittance view.
 * @property {() => void} closePanel  Clears the selection and resets the mode.
 * @property {(inv: SupplierInvoice) => void} openFix  Opens the correct-and-resubmit panel.
 * @property {ReturnType<typeof useVerbAvailability>} invoiceAvailability  `invoice:submit`,
 *   which withholds the footer's resubmit.
 * @property {ReturnType<typeof useNextAct>} nextAct  Who acts next on the selected invoice.
 * @property {UseToastReturn['toast']} toast  The page's toast function (PDF download).
 * @property {TFunction} t
 */

/**
 * The invoice detail side panel: key facts, the returned reason, the match
 * result, the per-line rules, the lifecycle timeline, or — in remittance mode —
 * the remittance advice; footer actions close, switch to remittance, resubmit
 * a returned invoice, or download the remittance PDF. Moved out of
 * `SupplierInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<InvoiceDetailPanelProps>}
 */
const InvoiceDetailPanel = ({
  selected,
  panelMode,
  setPanelMode,
  closePanel,
  openFix,
  invoiceAvailability,
  nextAct,
  toast,
  t
}) => (
  <SidePanel
    open={selected !== null}
    onClose={closePanel}
    title={
      selected
        ? t('supplierInvoices.panel.detail.title', {
            invoiceNumber: selected.invoiceNumber
          })
        : ''
    }
    footerActions={
      selected && (
        <>
          <Button variant="secondary" onClick={closePanel}>
            {t('supplierInvoices.panel.close')}
          </Button>
          {panelMode === 'detail' && selected.stage === 'Paid' && (
            <Button variant="outline" icon={Receipt} onClick={() => setPanelMode('remittance')}>
              {t('supplierInvoices.panel.viewRemittance')}
            </Button>
          )}
          {panelMode === 'detail' &&
            selected.stage === 'Returned' &&
            invoiceAvailability.kind === 'held' && (
              <Button variant="outline" onClick={() => openFix(selected)}>
                {t('fc.inv.resubmit.action')}
              </Button>
            )}
          {panelMode === 'remittance' && (
            <Button
              variant="outline"
              icon={Download}
              onClick={() =>
                toast({
                  title: t('supplierInvoices.toast.downloadPdf.title')
                })
              }
            >
              {t('supplierInvoices.panel.downloadPdf')}
            </Button>
          )}
        </>
      )
    }
  >
    {selected && (
      <div className="space-y-6">
        <DetailKeyFacts selected={selected} nextAct={nextAct} t={t} />

        {selected.stage === 'Returned' && (
          <div
            role="status"
            className="bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-xs text-danger"
          >
            <strong>{t('fc.inv.detail.returned')}:</strong>{' '}
            {selected.returnReason ?? t('supplierInvoices.note.disputed')}
          </div>
        )}

        {panelMode === 'detail' && selected.stage !== 'Draft' && (
          <MatchResult status={selected.matchStatus} />
        )}

        {/* CR-12 (BL-44) — per line: which rule applied and why it is held. */}
        {panelMode === 'detail' && (
          <InvoiceLinesSection
            lines={selected.lines}
            invoiceDate={selected.invoiceDate}
            taxInvoiceFile={selected.taxInvoiceFile}
            amount={selected.amount}
            matchStatus={selected.matchStatus}
          />
        )}

        {panelMode === 'detail' && (
          <section>
            <h3 className="text-label text-text-tertiary uppercase mb-3">
              {t('supplierInvoices.section.lifecycle')}
            </h3>
            <Timeline events={buildTimeline(selected, t)} />
            {selected.overdue && (
              <div className="mt-3 bg-danger-soft border-l-2 border-danger rounded px-3 py-2 text-xs text-danger">
                {t('supplierInvoices.note.overdue')}
              </div>
            )}
          </section>
        )}

        {panelMode === 'remittance' && <RemittanceSection selected={selected} t={t} />}
      </div>
    )}
  </SidePanel>
);

export default InvoiceDetailPanel;
