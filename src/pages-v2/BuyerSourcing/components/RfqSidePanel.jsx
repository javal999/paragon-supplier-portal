// ────────────────────────────────────────────────────────────────────────────
// The RFQ side panel — a WORKSPACE on the selected RFQ (§76): the event-page
// link, save-as-template, invitees' engagement, the award summary, the RFQ
// summary, the lifecycle acts, the timeline, the quote comparison and the link
// to the award. Moved out of `BuyerSourcing.jsx` by the Phase 5 page split (no
// behaviour change); every section keeps its order.
// ────────────────────────────────────────────────────────────────────────────
/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { NextAct } from '@services/transitions/nextAct' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfqTemplateContent } from '@services/sourcing/rfqTemplates' */
/** @import { PinDraft } from '../const' */
/** @import { useQuoteComparison } from '../hooks/useQuoteComparison' */
/** @import { useRfqPanelActions } from '../hooks/useRfqPanelActions' */
import { Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import SidePanel from '@components/ui-v2/SidePanel';
import Timeline from '@components/ui-v2/Timeline';
import Button from '@components/ui-v2/Button';
import { useToast } from '@hooks/useToast';
import { templateContentFromRfq } from '../../sourcing/rfqDraft';
import RfqEngagementSection from '../../sourcing/RfqEngagementSection';
import { buildTimeline, FOOTER_ACTION, FOOTER_LABEL, FOOTER_VARIANT } from '../utils';
import AwardSummary from './AwardSummary';
import RfqSummary from './RfqSummary';
import RfqLifecycleActions from './RfqLifecycleActions';
import QuoteComparison from './QuoteComparison';
import PanelAwardSection from './PanelAwardSection';

/**
 * @typedef {object} RfqSidePanelProps
 * @property {RFQ | null} selectedRfq The open RFQ; null closes the panel.
 * @property {() => void} closePanel
 * @property {(scope: readonly RFQ[], filename: string) => void} exportComparison The CSV export.
 * @property {Map<string, string>} supplierNameById
 * @property {NextAct | null} nextAct Who acts next on the selected RFQ (S2a).
 * @property {VerbAvailability} rfqCreateAvailability `rfq:create` (edit draft).
 * @property {Readonly<Record<'publish' | 'reopen' | 'cancel' | 'award' | 'review' | 'fxPin', VerbAvailability>>} rfqVerbs
 * @property {ReturnType<typeof useRfqPanelActions>} actions The panel's dispatches and their mutations.
 * @property {ReturnType<typeof useQuoteComparison>} comparison The selected RFQ's quote comparison.
 * @property {(rfq: RFQ) => void} openWizardForEdit
 * @property {(t: { content: RfqTemplateContent; name: string }) => void} setTemplateToSave
 * @property {(d: PinDraft) => void} setPinDraft
 * @property {TFunction} t
 */

/**
 * The side panel's footer: the comparison export, and the one act the footer
 * offers for this status (`FOOTER_ACTION`), if any.
 * @type {React.FC<{ selectedRfq: RFQ; exportComparison: RfqSidePanelProps['exportComparison']; t: TFunction }>}
 */
const PanelFooter = ({ selectedRfq, exportComparison, t }) => {
  const navigate = useNavigate();
  return (
    <>
      <Button
        variant="secondary"
        icon={Download}
        data-testid="panel-export-comparison"
        onClick={() => exportComparison([selectedRfq], `${selectedRfq.rfqNumber}-comparison.csv`)}
      >
        {t('sourcing.panel.exportComparison')}
      </Button>
      {FOOTER_ACTION(selectedRfq) && (
        <Button
          variant={FOOTER_VARIANT(selectedRfq)}
          data-testid="panel-footer-action"
          onClick={() =>
            navigate(
              /** @type {NonNullable<ReturnType<typeof FOOTER_ACTION>>} */ (
                FOOTER_ACTION(selectedRfq)
              ).to
            )
          }
        >
          {FOOTER_LABEL(selectedRfq, t)}
        </Button>
      )}
    </>
  );
};

/**
 * The panel's first lines: the link to the event page, and "Save as template".
 * @type {React.FC<{ selectedRfq: RFQ; setTemplateToSave: RfqSidePanelProps['setTemplateToSave']; t: TFunction }>}
 */
const PanelLinks = ({ selectedRfq, setTemplateToSave, t }) => {
  const { toast } = useToast();
  return (
    <>
      {/* REQ-E03-05 — the comparison, negotiation rounds and the split
          award live on the event's own page, where a round and an award
          can be read beside the bids they act on. */}
      <Link
        to={`/buyer/rfq/${selectedRfq.id}`}
        className="text-sm text-action hover:underline"
        data-testid="open-sourcing-event"
      >
        {t('rfx.cmp.title')} · {t('rfx.neg.title')} · {t('rfx.award.title')}
      </Link>
      {/* D2 — keep this RFQ's content as a template. Holds no atom: a
          template is the buyer's own authoring aid in this browser, and
          starting an RFQ from it is what the create gate guards. */}
      <div>
        <Button
          variant="secondary"
          data-testid="panel-save-template"
          onClick={() => {
            const content = templateContentFromRfq(selectedRfq);
            if (!content) {
              toast({
                variant: 'error',
                title: t('rfqAuthoring.template.save.failed'),
                description: t('rfqAuthoring.template.save.nothing')
              });
              return;
            }
            setTemplateToSave({
              content,
              name: selectedRfq.projectName ?? selectedRfq.title
            });
          }}
        >
          {t('rfqAuthoring.template.saveAs')}
        </Button>
      </div>
    </>
  );
};

/**
 * The side panel.
 * @type {React.FC<RfqSidePanelProps>}
 */
const RfqSidePanel = ({
  selectedRfq,
  closePanel,
  exportComparison,
  supplierNameById,
  nextAct,
  rfqCreateAvailability,
  rfqVerbs,
  actions,
  comparison,
  openWizardForEdit,
  setTemplateToSave,
  setPinDraft,
  t
}) => (
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
    footerActions={
      selectedRfq && (
        <PanelFooter selectedRfq={selectedRfq} exportComparison={exportComparison} t={t} />
      )
    }
  >
    {selectedRfq && (
      <div className="space-y-6">
        <PanelLinks selectedRfq={selectedRfq} setTemplateToSave={setTemplateToSave} t={t} />
        <RfqEngagementSection rfq={selectedRfq} nameOf={(id) => supplierNameById.get(id) ?? id} />
        {selectedRfq.status === 'Awarded' && (
          <AwardSummary
            selectedRfq={selectedRfq}
            awardedQuote={comparison.awardedQuote}
            supplierNameById={supplierNameById}
            t={t}
          />
        )}

        <RfqSummary selectedRfq={selectedRfq} nextAct={nextAct} t={t} />

        {/* Lifecycle actions (F0.3): the non-award sourcing verbs, gated on
            the machine's legal from-states — cancel from Draft/Open/Closed
            (not a terminal Awarded/Cancelled), reopen from Closed only. */}
        {(selectedRfq.status === 'Draft' ||
          selectedRfq.status === 'Open' ||
          selectedRfq.status === 'Closed') && (
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
            t={t}
          />
        )}

        <section>
          <h3 className="text-label text-text-tertiary uppercase mb-3">
            {t('sourcing.panel.lifecycle')}
          </h3>
          <Timeline events={buildTimeline(selectedRfq, t)} />
        </section>

        <QuoteComparison
          selectedRfq={selectedRfq}
          comparison={comparison}
          supplierNameById={supplierNameById}
          reviewAvailability={rfqVerbs.review}
          handleReview={actions.handleReview}
          reviewPending={actions.reviewMutation.isPending}
          setPinDraft={setPinDraft}
          t={t}
        />

        {/* RFx C3 (AR-03, NR-3 BR-07) — the award lives on the event page;
            see `PanelAwardSection`. */}
        {(selectedRfq.status === 'Open' ||
          selectedRfq.status === 'Closed' ||
          selectedRfq.status === 'Partly awarded') &&
          comparison.quotesForSelected.length > 0 && (
            <PanelAwardSection
              selectedRfq={selectedRfq}
              noneAwardable={comparison.noneAwardable}
              awardAvailability={rfqVerbs.award}
              t={t}
            />
          )}
      </div>
    )}
  </SidePanel>
);

export default RfqSidePanel;
