/** @import React from 'react' */
/** @import { RfpAwardView, RfpEventView, RfpOfferRoundView } from '@services/sourcing/views' */
/** @import { GateResult } from '@services/sourcing/complianceGate' */
/** @import { RfpOptionSettlement } from '@services/sourcing/rfpAward' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
import { RfpAwardSection } from '../../rfx/RfpAwardSection';
import { RfpPricingComparison } from '../../rfx/RfpPricing';
import { SupplierDocumentsPanel } from '../../rfx/SupplierDocumentsPanel';
import RfpEventCard from './RfpEventCard';
import RfpInvitees from './RfpInvitees';
import RfpComparison from './RfpComparison';
import RfpFirmUp from './RfpFirmUp';
import RfpQuestionAnswers from './RfpQuestionAnswers';

/**
 * Which optional sections the detail renders for this event — read by the
 * detail AND by the event page's section nav, so a nav entry never points at a
 * section that is not there.
 * @param {RfpEventView} open
 */
export const rfpSectionsShown = (open) => ({
  pricing: !!open.pricing && (open.responses.length > 0 || open.status === 'Draft'),
  firmUp: open.status !== 'Draft' && !!open.pricing,
  // Edge case 6 — an RFP with no pricing step says it cannot be awarded; a
  // priced one shows the section once it is past Open.
  award: open.status !== 'Draft' && (open.status !== 'Open' || !open.pricing),
  questions: (open.questions ?? []).length > 0 && open.responses.length > 0
});

/**
 * The open event's detail, in render order: the event card, invitees, the
 * terms comparison, indicative pricing, "Firm up the prices" (firm-offer
 * rounds beside "Create RFQ from this RFP", RFx UX B-07), the award section,
 * the question answers and the supplier files. RFx UX B-06 — before the first
 * proposal the terms comparison shows the terms and options sent, so the
 * indicative-pricing grid (supplier columns only) waits for a proposal.
 * RFx UX 2A (B-09) — rendered on the event's own page; each section sits in
 * the element the page's "Jump to" nav scrolls to (`rfp-event-*`).
 * The page computes the event's rounds, awards and settled options (it holds
 * the queries) and passes them in.
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
  openSettled
}) => {
  const shown = rfpSectionsShown(open);
  return (
    <section className="space-y-6" data-testid={`rfp-detail-${open.id}`}>
      <div id="rfp-event-about" className="scroll-mt-4">
        <RfpEventCard
          open={open}
          create={create}
          publish={publish}
          run={run}
          onEdit={onEdit}
          supplierName={supplierName}
        />
      </div>

      <div id="rfp-event-invitees" className="scroll-mt-4">
        <RfpInvitees event={open} />
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
            firmPrices={openRounds[0]?.firmPrices ?? []}
          />
        </div>
      )}
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
      {!!shown.questions && (
        <div id="rfp-event-questions" className="scroll-mt-4">
          <RfpQuestionAnswers event={open} />
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
    </section>
  );
};

export default RfpDetail;
