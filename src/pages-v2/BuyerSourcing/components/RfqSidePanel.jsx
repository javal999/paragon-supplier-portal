// ────────────────────────────────────────────────────────────────────────────
// The RFQ side panel — a SUMMARY of the selected RFQ (RFx UX B-02): status and
// who acts next, the response deadline, invited/quoted counts, three links to
// the event page (Open event · Comparison · Award), the lifecycle acts with
// "Save as template", the award slot, and the timeline.
//
// Owner ruling 2026-10-19 (B-02): review, FX rate and clarifications moved to
// the event page. "Move to review" (`quotation:review`), recording an FX rate
// (`rfq:fx-pin`) and answering clarifications (`rfqclarification:answer`) now
// live on `/buyer/rfq/:id` with their handoff notices; the panel's legacy quote
// comparison is gone, so the board has one evaluation surface. This overrules
// the §76 reading of the panel as a WORKSPACE for those acts only: the
// lifecycle acts and the award slot keep one notice per verb, in the verb's
// own slot, here.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { NextAct } from '@services/transitions/nextAct' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfqTemplateContent } from '@services/sourcing/rfqTemplates' */
/** @import { AwardView } from '@services/sourcing/views' */
/** @import { usePanelQuotes } from '../hooks/usePanelQuotes' */
/** @import { useRfqPanelActions } from '../hooks/useRfqPanelActions' */
import { useNavigate } from 'react-router-dom';
import SidePanel from '@components/ui-v2/SidePanel';
import Timeline from '@components/ui-v2/Timeline';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { templateContentFromRfq } from '../../sourcing/rfqDraft';
import { buildTimeline, FOOTER_ACTION, FOOTER_LABEL, FOOTER_VARIANT } from '../utils';
import RfqPanelSummary from './RfqPanelSummary';
import RfqLifecycleActions from './RfqLifecycleActions';
import PanelAwardSection from './PanelAwardSection';

/**
 * @typedef {object} RfqSidePanelProps
 * @property {RFQ | null} selectedRfq The open RFQ; null closes the panel.
 * @property {() => void} closePanel
 * @property {Map<string, string>} supplierNameById
 * @property {NextAct | null} nextAct Who acts next on the selected RFQ (S2a).
 * @property {VerbAvailability} rfqCreateAvailability `rfq:create` (edit draft).
 * @property {Readonly<Record<'publish' | 'reopen' | 'cancel' | 'award', VerbAvailability>>} rfqVerbs
 * @property {ReturnType<typeof useRfqPanelActions>} actions The panel's dispatches and their mutations.
 * @property {ReturnType<typeof usePanelQuotes>} panelQuotes The selected RFQ's quotes.
 * @property {readonly AwardView[]} awards Every award record; the panel reads this RFQ's in force.
 * @property {(rfq: RFQ) => void} openWizardForEdit
 * @property {(t: { content: RfqTemplateContent; name: string }) => void} setTemplateToSave
 * @property {TFunction} t
 */

/**
 * The side panel's footer: the one act the footer offers for this status
 * (`FOOTER_ACTION`), if any — it opens the event page at the award.
 * @type {React.FC<{ selectedRfq: RFQ; t: TFunction }>}
 */
const PanelFooter = ({ selectedRfq, t }) => {
  const navigate = useNavigate();
  const action = FOOTER_ACTION(selectedRfq);
  return action ? (
    <Button
      variant={FOOTER_VARIANT(selectedRfq)}
      data-testid="panel-footer-action"
      onClick={() => navigate(action.to)}
    >
      {FOOTER_LABEL(selectedRfq, t)}
    </Button>
  ) : null;
};

/**
 * The side panel.
 * @type {React.FC<RfqSidePanelProps>}
 */
const RfqSidePanel = ({
  selectedRfq,
  closePanel,
  supplierNameById,
  nextAct,
  rfqCreateAvailability,
  rfqVerbs,
  actions,
  panelQuotes,
  awards,
  openWizardForEdit,
  setTemplateToSave,
  t
}) => {
  const { toast } = useToast();
  const saveTemplate = () => {
    if (!selectedRfq) return;
    const content = templateContentFromRfq(selectedRfq);
    if (!content) {
      toast({
        variant: 'error',
        title: t('rfqAuthoring.template.save.failed'),
        description: t('rfqAuthoring.template.save.nothing')
      });
      return;
    }
    setTemplateToSave({ content, name: selectedRfq.projectName ?? selectedRfq.title });
  };
  const awardsInForce = selectedRfq
    ? awards.filter(
        (a) => a.eventType === 'rfq' && a.eventId === selectedRfq.id && a.status !== 'Cancelled'
      )
    : [];
  return (
    <SidePanel
      open={selectedRfq !== null}
      onClose={closePanel}
      title={
        selectedRfq
          ? t('sourcing.panel.title', {
              number: selectedRfq.rfqNumber,
              title: selectedRfq.title
            })
          : ''
      }
      footerActions={selectedRfq ? <PanelFooter selectedRfq={selectedRfq} t={t} /> : null}
    >
      {!!selectedRfq && (
        <div className="space-y-6">
          <RfqPanelSummary
            selectedRfq={selectedRfq}
            nextAct={nextAct}
            quotes={panelQuotes.quotesForSelected}
            awardedQuote={panelQuotes.awardedQuote}
            awards={awardsInForce}
            supplierNameById={supplierNameById}
            t={t}
          />

          {/* Lifecycle actions (F0.3): the non-award sourcing verbs, each in
              its own from-states, and "Save as template". */}
          <RfqLifecycleActions
            selectedRfq={selectedRfq}
            rfqCreateAvailability={rfqCreateAvailability}
            rfqVerbs={rfqVerbs}
            openWizardForEdit={openWizardForEdit}
            handlePublish={actions.handlePublish}
            handleReopen={actions.handleReopen}
            handleCancel={actions.handleCancel}
            publishPending={actions.publishMutation.isPending}
            reopenPending={actions.reopenMutation.isPending}
            cancelPending={actions.cancelMutation.isPending}
            onSaveTemplate={saveTemplate}
            t={t}
          />

          {/* RFx C3 (AR-03, NR-3 BR-07) — the award slot: the link to the
              event page's award, the BL-64 notice when no bidder can win, and
              the `rfq:award` notice for a seat without the atom. */}
          {(selectedRfq.status === 'Open' ||
            selectedRfq.status === 'Closed' ||
            selectedRfq.status === 'Partly awarded') &&
            panelQuotes.quotesForSelected.length > 0 && (
              <PanelAwardSection
                selectedRfq={selectedRfq}
                noneAwardable={panelQuotes.noneAwardable}
                awardAvailability={rfqVerbs.award}
                t={t}
              />
            )}

          <section>
            <h3 className="text-label text-text-tertiary uppercase mb-3">
              {t('sourcing.panel.lifecycle')}
            </h3>
            <Timeline events={buildTimeline(selectedRfq, t)} />
          </section>
        </div>
      )}
    </SidePanel>
  );
};

export default RfqSidePanel;
