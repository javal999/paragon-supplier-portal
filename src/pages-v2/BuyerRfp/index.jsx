/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate } from '@lib/format';
import { useRfiEvents, useRfpEvents } from '@services/query/hooks';
import { prefillRfpFromRfi } from '@services/sourcing/rfxPrefill';
import RfpCreateWizard from '../rfx/RfpCreateWizard';
import { rfxNow } from '../rfx/rfxDisplay';
import RfpEventTable from './components/RfpEventTable';

// ─────────────────────────────────────────────────────────────────────────────
// PTI PROPOSAL REQUESTS — REQ-E03-04 (BUY).
//
// An RFP asks for TERMS, not a price, so the comparison is shaped the way the
// requirement specifies and not the way a quote comparison is: TERMS ARE ROWS,
// SUPPLIERS ARE COLUMNS, and every deviation is highlighted with the comment the
// supplier had to write for it. A CUSTOM term (the buyer's own, RFx authoring)
// sits in its group beside the standard ones, labelled in the buyer's words.
//
// Where the RFP carries a price basis and a standard lead time — the two terms
// the standard list marks scorable — the proposals are ALSO scored with CR-15,
// reliability read from each supplier's OTIF. An RFP that carries neither is not
// scored at all, and says so: a weighted number invented from prose would be the
// fabricated-score defect in a new document.
//
// ⚠️ **INDICATIVE PRICING (D4) IS COMPARED OPTIONS × SUPPLIERS AND IS NEVER
// SCORED.** Every price there is labelled Indicative, and a supplier's own
// option is shown as proposed by that supplier.
//
// ⚠️ **AND THE EVENT IS RAISED HERE (section 3.6a).** "New RFP" opens the wizard;
// the lifecycle is offered BY STATE — Send on a Draft, Close on an Open one,
// Extend where `t_rfp_extend` legally runs (Open AND Closed, because reopening a
// window somebody asked for is not a state change). A seat without `rfp:publish`
// reads whose act it is rather than a button the dispatcher would refuse.
//
// `?rfi=<id>` opens the wizard pre-filled from that RFI (D3); the created RFP
// records `sourceRfiId` and the detail shows "Created from RFI-…".
//
// BL-93 — a Draft offers **Edit draft** (`rfp:create`, the create wizard
// re-opened on every stored field, saving through `t_rfp_revise_draft`); a seat
// without the atom reads whose act it is in the button's own slot.
//
// RFx D3 (NR-2) — a Closed or Partly awarded RFP (RFX-D15) offers "Ask for firm
// offers" (`rfp:negotiate`) for its options still open, and lists its
// firm-offer rounds; the pricing comparison shows each firm
// price labelled Firm with its validity beside the Indicative ones; the award
// section is the shared award panel over the options of the closed rounds
// (`rfp:award`), with the recorded awards, cancel and "Raised in SAP"; and
// "Create RFQ from this RFP" leaves out every option an award in force
// placed (NR-2 BR-08), naming the options by ref.
//
// Phase 5 page split: the list table, the open event's detail and its
// sections live in `components/`.
//
// RFx UX 2A (B-09, owner ruling Q2 2026-10-19): this file is the LIST. An
// event's detail is its own page, `BuyerRfpEvent` at `/buyer/rfp/:rfpId`,
// which holds the event's state, its queries and the verb runner. A row's
// "Open" goes there; `/buyer/rfp?open=<id>` redirects there; the wizard, still
// a modal opened here, lands the buyer on the new event's page after saving.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerRfp = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const events = useRfpEvents();
  const rfis = useRfiEvents();
  const publish = useVerbAvailability('rfp:publish');
  const create = useVerbAvailability('rfp:create');
  const [params, setParams] = useSearchParams();
  const [wizardOpen, setWizardOpen] = useState(false);

  // The eyebrow is the menu section alone (the `PageHeader` rule): it read
  // "Sourcing · Proposal requests" above the title "Proposal requests".
  const crumb = [t('hub.nav.section.sourcing')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  // D3 — `?rfi=<id>` asks for an RFP pre-filled from that RFI. Only a seat
  // holding `rfp:create` gets the wizard; the others read whose act it is.
  const sourceRfiId = params.get('rfi');
  const sourceRfi = sourceRfiId
    ? (rfis.data?.items ?? []).find((e) => e.id === sourceRfiId)
    : undefined;
  const prefill = useMemo(
    () =>
      sourceRfi
        ? {
            ...prefillRfpFromRfi(sourceRfi, sourceRfi.responses),
            sourceRfiNumber: sourceRfi.eventNumber
          }
        : undefined,
    [sourceRfi]
  );

  // The old deep link `?open=<id>` (the RFQ event page's "Created from RFP-…",
  // tasks, notifications) lands on the event's own page.
  const openParam = params.get('open');
  if (openParam) return <Navigate replace to={`/buyer/rfp/${encodeURIComponent(openParam)}`} />;

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const showWizard = create.kind === 'held' && (wizardOpen || !!prefill);

  const closeWizard = () => {
    setWizardOpen(false);
    if (sourceRfiId) setParams({}, { replace: true });
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfx.rfp.title')}
        count={items.length}
        subtitle={t('rfx.rfp.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* CE-01 — the buyer raises the event; a seat without `rfp:create` reads
          WHOSE act it is rather than losing the affordance silently (§72a). */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
        {publish.kind !== 'held' && (
          <HandoffNotice availability={publish} testId="handoff-rfp-publish" />
        )}
        {create.kind === 'held' ? (
          <Button variant="outline" onClick={() => setWizardOpen(true)} data-testid="rfp-new">
            {t('rfx.rfp.new')}
          </Button>
        ) : (
          <HandoffNotice availability={create} testId="handoff-rfp-create" />
        )}
      </div>

      <RfpEventTable items={items} />

      {create.kind !== 'held' && !!sourceRfiId && (
        <div className="mt-4">
          <HandoffNotice availability={create} testId="handoff-rfp-from-rfi" />
        </div>
      )}

      {!!showWizard && (
        <RfpCreateWizard
          key={prefill?.sourceRfiId ?? 'blank'}
          pastEvents={items}
          prefill={prefill}
          canPublish={publish.kind === 'held'}
          onCancel={closeWizard}
          onCreated={(rfpId) => {
            // B-09 — land the buyer ON the new event's page: the act just
            // performed is in view.
            setWizardOpen(false);
            navigate(`/buyer/rfp/${encodeURIComponent(rfpId)}`, { replace: !!sourceRfiId });
          }}
        />
      )}
    </AppShellV2>
  );
};

export default BuyerRfp;
