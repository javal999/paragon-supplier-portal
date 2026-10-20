/** @import React from 'react' */
/** @import { RfpAwardView, RfpEventView, RfpOfferRoundView } from '@services/sourcing/views' */
/** @import { GateResult } from '@services/sourcing/complianceGate' */
/** @import { RfpOptionSettlement } from '@services/sourcing/rfpAward' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
/** @import { RfxEventTab } from '../../rfx/rfxCompare' */
/** @import { NavEntry } from '../../BuyerSourcingEvent/components/EventSectionNav' */
import { useTranslation } from 'react-i18next';
import { RfpAwardSection } from '../../rfx/RfpAwardSection';
import { RfpPricingComparison } from '../../rfx/RfpPricing';
import { SupplierDocumentsPanel } from '../../rfx/SupplierDocumentsPanel';
import { rfpScoringOf } from '../../rfx/rfpScoring';
import { inviteeTally, rfpSummaryCards } from '../../rfx/rfxCompare';
import {
  InviteeTallyLine,
  RfxEventTabBar,
  RfxTabEmpty,
  useRfxEventTab
} from '../../rfx/RfxEventTabs';
import { QuestionsSent } from '../../rfx/RfxProposalViews';
import EventSectionNav from '../../BuyerSourcingEvent/components/EventSectionNav';
import RfpEventCard from './RfpEventCard';
import RfpEventActions from './RfpEventActions';
import RfpInvitees from './RfpInvitees';
import RfpComparison, { RfpTermsSent, rfpComparisonTermCount } from './RfpComparison';
import RfpFirmUp from './RfpFirmUp';
import RfpQuestionAnswers from './RfpQuestionAnswers';
import { RfpSummaryStrip, RfpSupplierView } from './RfpProposals';

/**
 * Which optional sections the detail renders for this event — read by the
 * detail AND by its section nav, so a nav entry never points at a section
 * that is not there.
 * @param {RfpEventView} open
 */
export const rfpSectionsShown = (open) => ({
  pricing: !!open.pricing && open.responses.length > 0,
  firmUp: open.status !== 'Draft' && !!open.pricing,
  // Edge case 6 — an RFP with no pricing step says it cannot be awarded; a
  // priced one shows the section once it is past Open.
  award: open.status !== 'Draft' && (open.status !== 'Open' || !open.pricing),
  questions: (open.questions ?? []).length > 0 && open.responses.length > 0,
  questionsSent: (open.questions ?? []).length > 0
});

/**
 * RFx UX 2G — the tab that holds each section, so a `?section=<id>` deep
 * link selects it. Every section id the page renders is here.
 * @type {Readonly<Record<string, RfxEventTab>>}
 */
export const RFP_SECTION_TAB = {
  'rfp-event-about': 'overview',
  'rfp-event-terms': 'overview',
  'rfp-event-questions-sent': 'overview',
  'rfp-event-invitees': 'overview',
  'rfp-event-firmup': 'overview',
  'rfp-event-award': 'overview',
  'rfp-event-documents': 'overview',
  'rfp-event-summary': 'compare',
  'rfp-event-comparison': 'compare',
  'rfp-event-pricing': 'compare',
  'rfp-event-questions': 'compare',
  'rfp-supplier-terms': 'supplier',
  'rfp-supplier-pricing': 'supplier',
  'rfp-supplier-questions': 'supplier',
  'rfp-supplier-documents': 'supplier',
  'rfp-supplier-versions': 'supplier'
};

/**
 * The "Jump to" entries of ONE tab: only the sections that tab shows, each
 * with the count of what it lists (RFx UX 2F).
 * @param {RfpEventView} open
 * @param {RfxEventTab} tab
 * @param {{ rounds: number; awardCount: string }} extra
 * @returns {NavEntry[]}
 */
export const rfpNavEntries = (open, tab, { rounds, awardCount }) => {
  const shown = rfpSectionsShown(open);
  const termCount = rfpComparisonTermCount(open);
  const submitted = open.responses.length;
  const terms = termCount === null ? '' : String(termCount);
  const questions = String((open.questions ?? []).length);
  if (tab === 'overview')
    return [
      { id: 'rfp-event-about', labelKey: 'rfx.nav.about', count: '' },
      { id: 'rfp-event-terms', labelKey: 'rfx.nav.terms', count: terms },
      ...(shown.questionsSent
        ? [{ id: 'rfp-event-questions-sent', labelKey: 'rfx.nav.questions', count: questions }]
        : []),
      {
        id: 'rfp-event-invitees',
        labelKey: 'rfx.nav.invited',
        count: String(open.invitedSuppliers.length)
      },
      // The firm-offer rounds; no count before the first round, since "0"
      // beside two choices reads as missing data.
      ...(shown.firmUp
        ? [
            {
              id: 'rfp-event-firmup',
              labelKey: 'rfx.nav.firmUp',
              count: rounds > 0 ? String(rounds) : ''
            }
          ]
        : []),
      ...(shown.award
        ? [{ id: 'rfp-event-award', labelKey: 'rfx.nav.award', count: awardCount }]
        : []),
      {
        id: 'rfp-event-documents',
        labelKey: 'rfx.nav.documents',
        count: String(open.responses.reduce((n, r) => n + (r.documents ?? []).length, 0))
      }
    ];
  if (submitted === 0) return [];
  if (tab === 'compare')
    return [
      { id: 'rfp-event-summary', labelKey: 'rfx.nav.summary', count: String(submitted) },
      { id: 'rfp-event-comparison', labelKey: 'rfx.nav.comparison', count: terms },
      ...(shown.pricing && open.pricing
        ? [
            {
              id: 'rfp-event-pricing',
              labelKey: 'rfx.nav.pricing',
              count: String(open.pricing.options.length)
            }
          ]
        : []),
      ...(shown.questions
        ? [{ id: 'rfp-event-questions', labelKey: 'rfx.nav.questions', count: questions }]
        : [])
    ];
  return [
    { id: 'rfp-supplier-terms', labelKey: 'rfx.nav.terms', count: terms },
    ...(open.pricing
      ? [{ id: 'rfp-supplier-pricing', labelKey: 'rfx.nav.pricing', count: '' }]
      : []),
    ...(shown.questionsSent
      ? [{ id: 'rfp-supplier-questions', labelKey: 'rfx.nav.questions', count: questions }]
      : []),
    { id: 'rfp-supplier-documents', labelKey: 'rfx.nav.documents', count: '' },
    { id: 'rfp-supplier-versions', labelKey: 'rfx.nav.versions', count: '' }
  ];
};

/**
 * The open event's detail. RFx UX 2A (B-09) put it on its own page; RFx UX
 * 2G (owner ruling 2026-10-20) splits it into tabs under ONE actions row:
 *   · Overview — about the event (scope, attachments, confidentiality, T&C),
 *     the terms and questions sent, the invited suppliers, "Firm up the
 *     prices", the award section and the supplier files;
 *   · Compare — the summary strip, the invitee one-liner, the terms grid,
 *     the indicative prices and the question answers;
 *   · By supplier — one proposal at a time.
 * Default: Compare once a proposal is in, Overview before. The page computes
 * the event's rounds, awards and settled options (it holds the queries).
 * @type {React.FC<{
 *   open: RfpEventView;
 *   create: VerbAvailability;
 *   publish: VerbAvailability;
 *   run: (vars: RfxCommandVars, successKey: string) => void;
 *   pending: boolean;
 *   onEdit: () => void;
 *   supplierName: (supplierId: string) => string;
 *   gateOf: (supplierId: string) => GateResult;
 *   openRounds: readonly RfpOfferRoundView[];
 *   openAwards: readonly RfpAwardView[];
 *   openSettled: ReadonlyMap<string, RfpOptionSettlement>;
 *   awardCount: string;
 * }>}
 */
const RfpDetail = ({
  open,
  create,
  publish,
  run,
  pending,
  onEdit,
  supplierName,
  gateOf,
  openRounds,
  openAwards,
  openSettled,
  awardCount
}) => {
  const { t } = useTranslation();
  const submitted = open.responses.length;
  const { tab, supplier, select } = useRfxEventTab({ submitted, sectionTab: RFP_SECTION_TAB });
  const shown = rfpSectionsShown(open);
  const cards = rfpSummaryCards(open, rfpScoringOf(open));
  const current =
    cards.find((c) => c.response.supplierId === supplier)?.response.supplierId ??
    cards[0]?.response.supplierId ??
    '';
  const entries = rfpNavEntries(open, tab, { rounds: openRounds.length, awardCount });
  const firmPrices = openRounds[0]?.firmPrices ?? [];

  return (
    <section data-testid={`rfp-detail-${open.id}`}>
      {/* The acts the event's state allows stay above the tabs. */}
      <div className="mb-4 bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4">
        <RfpEventActions open={open} create={create} publish={publish} run={run} onEdit={onEdit} />
      </div>

      <RfxEventTabBar tab={tab} submitted={submitted} onSelect={(next) => select(next)} />

      <div
        className={entries.length > 0 ? 'lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-6' : ''}
      >
        {entries.length > 0 ? <EventSectionNav entries={entries} /> : null}
        <div className="min-w-0 space-y-6" role="tabpanel" data-testid={`rfp-tab-${tab}`}>
          {tab === 'overview' ? (
            <>
              <div id="rfp-event-about" className="scroll-mt-4">
                <RfpEventCard open={open} supplierName={supplierName} />
              </div>
              <div id="rfp-event-terms" className="scroll-mt-4">
                <RfpTermsSent event={open} />
              </div>
              {!!shown.questionsSent && (
                <div id="rfp-event-questions-sent" className="scroll-mt-4">
                  <QuestionsSent
                    title={t('rfx.questionsSent')}
                    questions={open.questions ?? []}
                    customSections={open.customSections}
                    testId={`rfp-questions-sent-${open.id}`}
                  />
                </div>
              )}
              <div id="rfp-event-invitees" className="scroll-mt-4">
                <RfpInvitees event={open} />
              </div>
              {!!shown.firmUp && (
                <div id="rfp-event-firmup" className="scroll-mt-4">
                  <RfpFirmUp
                    event={open}
                    rounds={openRounds}
                    awards={openAwards}
                    gateOf={gateOf}
                    settled={openSettled}
                    pending={pending}
                    run={run}
                  />
                </div>
              )}
              {!!shown.award && (
                <div id="rfp-event-award" className="scroll-mt-4">
                  <RfpAwardSection
                    event={open}
                    rounds={openRounds}
                    awards={openAwards}
                    gateOf={gateOf}
                    supplierName={supplierName}
                    pending={pending}
                    run={run}
                  />
                </div>
              )}
              {/* RFx B5 — every supplier file, submitted proposals only (NR-1 buyer step 5). */}
              <div id="rfp-event-documents" className="scroll-mt-4">
                <SupplierDocumentsPanel
                  requests={open.documentRequests}
                  responses={open.responses}
                  deadlineFor={(supplierId) =>
                    open.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ??
                    open.responseDeadline
                  }
                  testId={`rfp-documents-${open.id}`}
                />
              </div>
            </>
          ) : submitted === 0 ? (
            <RfxTabEmpty text={t('rfx.tab.noProposals')} testId={`rfp-tab-empty-${tab}`} />
          ) : tab === 'compare' ? (
            <>
              <div id="rfp-event-summary" className="scroll-mt-4 space-y-2">
                <RfpSummaryStrip
                  event={open}
                  cards={cards}
                  onView={(id) => select('supplier', { supplier: id })}
                />
                <InviteeTallyLine
                  tally={inviteeTally(open.invitedSuppliers)}
                  onOpen={() => select('overview', { section: 'rfp-event-invitees' })}
                  testId={`rfp-tally-${open.id}`}
                />
              </div>
              <div id="rfp-event-comparison" className="scroll-mt-4">
                <RfpComparison event={open} />
              </div>
              {!!shown.pricing && !!open.pricing && (
                <div id="rfp-event-pricing" className="scroll-mt-4">
                  <RfpPricingComparison
                    request={open.pricing}
                    currency={open.currency}
                    responses={open.responses}
                    testId={`rfp-pricing-${open.id}`}
                    firmPrices={firmPrices}
                    markLowest
                  />
                </div>
              )}
              {!!shown.questions && (
                <div id="rfp-event-questions" className="scroll-mt-4">
                  <RfpQuestionAnswers event={open} />
                </div>
              )}
            </>
          ) : (
            <RfpSupplierView
              event={open}
              cards={cards}
              supplierId={current}
              onPick={(id) => select('supplier', { supplier: id })}
              firmPrices={firmPrices}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default RfpDetail;
