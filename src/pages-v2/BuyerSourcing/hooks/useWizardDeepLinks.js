/** @import { PurchaseRequisition } from '@services/data/types' */
/** @import { RequisitionPrefill } from '../../sourcing/requisitionPrefill' */
/** @import { RfqDraftSeed } from '../../sourcing/rfqDraft' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@hooks/useToast';
import { useRfiEvents, useRfpEvents, useRfpAwards } from '@services/query/hooks';
import { prefillRfqFromRfi, prefillRfqItemsFromRfp } from '@services/sourcing/rfxPrefill';
import { prefillFromRequisition } from '../../sourcing/requisitionPrefill';
import { seedFromRfiPrefill, seedFromRfp } from '../../sourcing/rfqDraft';
import { awardedRefsOf } from '../../rfx/RfpAwardSection';

/**
 * The three deep links that open the RFQ wizard on arrival, each consumed once
 * and then cleared from the address so a refresh or a back-navigation does not
 * re-open a wizard the buyer closed: a requisition id in router state (C.3),
 * `?rfi=<id>` (RFI → RFQ) and `?rfp=<id>&options=…` (RFP → RFQ). Moved out of
 * `SourcingWorkspace` by the Phase 5 page split (no behaviour change; the three
 * effects keep their order).
 * @param {{
 *   sourceablePrs: readonly PurchaseRequisition[];
 *   openWizard: (prefill?: RequisitionPrefill) => void;
 *   openWizardFromSeed: (seed: RfqDraftSeed) => void;
 *   rfqCreateAvailability: VerbAvailability;
 * }} args
 */
export const useWizardDeepLinks = ({
  sourceablePrs,
  openWizard,
  openWizardFromSeed,
  rfqCreateAvailability
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();

  // ⚠️ **C.3's DEEP LINK — A THIRD CALLER OF `openWizard`, NOT A SECOND ENTRY
  // SHAPE.** The requisition surface navigates here with a requisition ID in
  // router state; this resolves it against the SAME `sourceablePrs` the picker
  // offers and calls the SAME `openWizard(prefill)`. Nothing about the signature
  // changed to accommodate it, which is the decomposition's constraint: C.3 must
  // not rewrite C.2.
  //
  // ⚠️ **THE ID TRAVELS, NOT THE PREFILL.** Sending the built prefill through
  // history state would ship a SNAPSHOT taken on another page — stale the moment
  // the requisition moves, and un-revalidatable here. Sending the id means this
  // page derives the prefill from its own live read, and an id that no longer
  // qualifies (already sourced, since withdrawn) simply opens an ordinary
  // wizard rather than one prefilled from a document that has moved on.
  const location = useLocation();
  const navigate = useNavigate();
  const consumedDeepLink = useRef(/** @type {string | null | null} */ (null));
  const deepLinkId =
    typeof (
      /** @type {{ sourceRequisitionId?: unknown } | null} */ (location.state)?.sourceRequisitionId
    ) === 'string'
      ? /** @type {{ sourceRequisitionId: string }} */ (location.state).sourceRequisitionId
      : null;

  useEffect(() => {
    if (!deepLinkId || consumedDeepLink.current === deepLinkId) return;
    consumedDeepLink.current = deepLinkId;
    const pr = sourceablePrs.find((r) => r.id === deepLinkId);
    openWizard(pr ? prefillFromRequisition(pr) : undefined);
    // Clear the state so a re-render, a back-navigation, or a refresh does not
    // re-open a wizard the buyer has already closed. `replace` keeps the history
    // entry rather than adding one.
    navigate(location.pathname + location.search, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId, sourceablePrs]);

  // ⚠️ **RFI → RFQ (REQ-E03-03 BR-02), AND IT WAS BROKEN UNTIL NOW.** The RFI's
  // "Create RFQ" button has always navigated to `/buyer/rfq?rfi=<id>`, and
  // nothing here read the parameter, so `prefillRfqFromRfi` had no caller. The
  // id travels, not the prefill (the requisition rule above): this page reads
  // the RFI from its own live query, builds the prefill through the existing
  // pure function, and opens the wizard through the generic seed entrance.
  // The parameter is then removed so a refresh or a back-navigation does not
  // re-open a wizard the buyer already closed.
  const [searchParams, setSearchParams] = useSearchParams();
  const rfiParam = searchParams.get('rfi');
  const rfiEvents = useRfiEvents();
  const consumedRfi = useRef(/** @type {string | null | null} */ (null));
  useEffect(() => {
    if (!rfiParam || consumedRfi.current === rfiParam || rfiEvents.isPending) return;
    consumedRfi.current = rfiParam;
    const event = (rfiEvents.data?.items ?? []).find((e) => e.id === rfiParam);
    if (event) {
      openWizardFromSeed(
        seedFromRfiPrefill(prefillRfqFromRfi(event, event.responses), event.eventNumber)
      );
    } else {
      toast({
        variant: 'error',
        title: t('rfqAuthoring.prefill.rfiMissing.title'),
        description: t('rfqAuthoring.prefill.rfiMissing.desc', { id: rfiParam })
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('rfi');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfiParam, rfiEvents.isPending, rfiEvents.data]);

  // RFP → RFQ (spec D3) — the same entrance as `?rfi=`, and the same rule: the
  // ids travel, not the prefill. `?rfp=<id>&options=<id>,<id>` names the RFP and
  // the options the buyer chose on it (PTI's or a supplier's own); this page
  // reads the RFP from its own live query, runs the existing pure
  // `prefillRfqItemsFromRfp`, and opens the wizard through the generic seed. An
  // RFP it cannot find, or options that name nothing on it, open NOTHING
  // pre-filled and say so — never a blank wizard that looks like a pre-fill.
  const rfpParam = searchParams.get('rfp');
  const optionsParam = searchParams.get('options');
  const rfpEvents = useRfpEvents();
  // RFx D3 (NR-2 BR-08) — the RFP's awards in force: an option one of them
  // placed is left out of the pre-fill, by the rule the create policy refuses it by.
  const rfpAwards = useRfpAwards();
  const consumedRfp = useRef(/** @type {string | null | null} */ (null));
  useEffect(() => {
    if (!rfpParam || consumedRfp.current === rfpParam || rfpEvents.isPending || rfpAwards.isPending)
      return;
    consumedRfp.current = rfpParam;
    const event = (rfpEvents.data?.items ?? []).find((e) => e.id === rfpParam);
    const chosen = (optionsParam ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const awarded = [
      ...awardedRefsOf((rfpAwards.data?.items ?? []).filter((a) => a.eventId === rfpParam)).keys()
    ];
    const seed = event ? prefillRfqItemsFromRfp(event, event.responses, chosen, awarded) : null;
    if (rfqCreateAvailability.kind !== 'held') {
      // The entrance is the unit (§84): a seat without `rfq:create` does not get
      // a wizard the dispatcher would refuse at the end. The page header's
      // handoff notice already names whose act it is.
    } else if (event && seed && seed.items.length > 0) {
      openWizardFromSeed(seedFromRfp(seed, event.eventNumber));
    } else {
      toast({
        variant: 'error',
        title: t('rfqAuthoring.prefill.rfpMissing.title'),
        description: t('rfqAuthoring.prefill.rfpMissing.desc', { id: rfpParam })
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('rfp');
    next.delete('options');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfpParam, rfpEvents.isPending, rfpEvents.data, rfpAwards.isPending, rfpAwards.data]);
};
