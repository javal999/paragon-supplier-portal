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
 * The open event's detail, in render order: the event card, invitees, the
 * terms comparison, indicative pricing, "Firm up the prices" (firm-offer
 * rounds beside "Create RFQ from this RFP", RFx UX B-07), the award section,
 * the question answers and the supplier files. RFx UX B-06 — before the first
 * proposal the terms comparison shows the terms and options sent, so the
 * indicative-pricing grid (supplier columns only) waits for a proposal.
 * The page computes the event's rounds, awards and settled options (it holds
 * the queries) and passes them in.
 * Moved out of `BuyerRfp.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{
 *   open: RfpEventView;
 *   create: VerbAvailability;
 *   publish: VerbAvailability;
 *   run: (vars: RfxCommandVars, successKey: string) => void;
 *   pending: boolean;
 *   setEditingId: (id: string | null) => void;
 *   extendTo: Record<string, string>;
 *   setExtendTo: React.Dispatch<React.SetStateAction<Record<string, string>>>;
 *   extend: (event: RfpEventView) => void;
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
  setEditingId,
  extendTo,
  setExtendTo,
  extend,
  supplierName,
  gateOf,
  openRounds,
  openAwards,
  openSettled
}) => (
  <section className="mt-6 space-y-6" data-testid={`rfp-detail-${open.id}`}>
    <RfpEventCard
      open={open}
      create={create}
      publish={publish}
      run={run}
      setEditingId={setEditingId}
      extendTo={extendTo}
      setExtendTo={setExtendTo}
      extend={extend}
      supplierName={supplierName}
    />

    <RfpInvitees event={open} />
    <RfpComparison event={open} />
    {!!open.pricing && (open.responses.length > 0 || open.status === 'Draft') && (
      <RfpPricingComparison
        request={open.pricing}
        currency={open.currency}
        responses={open.responses}
        testId={`rfp-pricing-${open.id}`}
        firmPrices={openRounds[0]?.firmPrices ?? []}
      />
    )}
    {open.status !== 'Draft' && !!open.pricing && (
      <RfpFirmUp
        event={open}
        rounds={openRounds}
        awards={openAwards}
        gateOf={gateOf}
        settled={openSettled}
        pending={pending}
        run={run}
      />
    )}
    {/* Edge case 6 — an RFP with no pricing step says it cannot be
        awarded; a priced one shows the section once it is past Open. */}
    {open.status !== 'Draft' && (open.status !== 'Open' || !open.pricing) && (
      <RfpAwardSection
        event={open}
        rounds={openRounds}
        awards={openAwards}
        gateOf={gateOf}
        supplierName={supplierName}
        pending={pending}
        run={run}
      />
    )}
    {(open.questions ?? []).length > 0 && <RfpQuestionAnswers event={open} />}
    {/* RFx B5 — every supplier file, submitted proposals only (NR-1 buyer step 5). */}
    <SupplierDocumentsPanel
      requests={open.documentRequests}
      responses={open.responses}
      deadlineFor={(supplierId) =>
        open.invitedSuppliers.find((i) => i.supplierId === supplierId)?.deadline ??
        open.responseDeadline
      }
      testId={`rfp-documents-${open.id}`}
    />
  </section>
);

export default RfpDetail;
