/** @import React from 'react' */
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import NotFound from '../NotFound';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import {
  useInviteeCandidates,
  useRfpAwards,
  useRfpEvents,
  useRfpOfferRounds,
  useRFQs
} from '@services/query/hooks';
import { useRfxCommand } from '@services/query/commandHooks';
/** @import { RfxCommandVars } from '@services/query/commandHooks' */
/** @import { GateResult } from '@services/sourcing/complianceGate' */
import { rfpSettledOptionRefs } from '@services/sourcing/rfpAward';
import { daysToDeadline, isPastDeadline } from '@services/transitions/rfxRules';
import { awardRecordsInForce } from '../rfx/RfpAwardSection';
import RfpCreateWizard from '../rfx/RfpCreateWizard';
import RfxStageBar from '../rfx/RfxStageBar';
import { RFP_STAGE_STEPS, rfpStageOf } from '../rfx/rfxEventStage';
import { rfxNow } from '../rfx/rfxDisplay';
import RfpDetail from './components/RfpDetail';

// ─────────────────────────────────────────────────────────────────────────────
// ONE PROPOSAL REQUEST — REQ-E03-04 (BUY), on its own page.
//
// RFx UX 2A (B-09, owner ruling Q2 2026-10-19): the RFP detail used to render
// under the list, below the fold. It is now this page at `/buyer/rfp/:rfpId`,
// shaped like the RFQ event page: a header with the status and the deadline
// with days left, a stage bar, and a sticky "Jump to" nav with counts beside
// the sections. The list's rows open it; `/buyer/rfp?open=<id>` redirects here;
// `?section=<id>` lands on one section.
//
// RFx UX 2G (owner ruling 2026-10-20): under the actions row the detail is
// three tabs — Overview, Compare, By supplier — kept in the URL (`?tab=`,
// `&supplier=`); `?section=<id>` selects the tab holding that section, and the
// "Jump to" nav lists the active tab's sections only (`RfpDetail`).
//
// Everything the inline detail held is kept, with the state, queries and verb
// runner that `BuyerRfp` held for it: the lifecycle offered BY STATE (Send on a
// Draft, Close on an Open one through its confirmation sheet, Extend), Edit
// draft (BL-93, `rfp:create`), the terms comparison and indicative pricing,
// "Firm up the prices" (B-07), the award panel and the supplier files.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CR-23 for a supplier the candidate read does not list (suspended, blacklisted, unknown).
 * @type {GateResult}
 */
const NOT_SELECTABLE = { passes: false, failed: ['status'] };

/** @type {React.FC} */
const BuyerRfpEvent = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { rfpId = '' } = useParams();
  const [params] = useSearchParams();
  const events = useRfpEvents();
  const publish = useVerbAvailability('rfp:publish');
  const create = useVerbAvailability('rfp:create');
  const command = useRfxCommand();
  const offerRounds = useRfpOfferRounds();
  const rfpAwards = useRfpAwards();
  // RFX-D15 — the RFQs created from an RFP settle the options they source.
  const rfqs = useRFQs();
  // CR-23 on an RFP judges no material (it names none): the candidate read's
  // gate, with no material codes, is the gate the round and award policies use.
  const candidates = useInviteeCandidates();
  const [editing, setEditing] = useState(false);

  const crumb = [t('hub.nav.section.sourcing')];
  const open = (events.data?.items ?? []).find((e) => e.id === rfpId) ?? null;

  // `?section=<id>` lands on one section, as the RFQ page's `?section=award` does.
  const section = params.get('section');
  useEffect(() => {
    if (open && section) document.getElementById(section)?.scrollIntoView?.({ block: 'start' });
  }, [open, section]);

  // The rounds, awards and RFQs decide which options "Firm up the prices"
  // still offers, so the page waits for them rather than painting a picker
  // that would change under the buyer's hand.
  if (events.isPending || offerRounds.isPending || rfpAwards.isPending || rfqs.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;
  if (!open) return <NotFound />;

  /**
   * One runner for every RFP verb this page offers — one refusal path, not four.
   * @param {RfxCommandVars} vars
   * @param {string} successKey
   */
  const run = (vars, successKey) =>
    command.mutate(vars, {
      onSuccess: (res) =>
        toast(
          res.status === 'failed'
            ? { variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) }
            : { variant: 'success', title: t(successKey) }
        ),
      onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) })
    });

  /**
   * @param {string} supplierId
   * @returns {GateResult}
   */
  const gateOf = (supplierId) =>
    (candidates.data?.items ?? []).find((c) => c.supplierId === supplierId)?.gate ?? NOT_SELECTABLE;
  const openRounds = (offerRounds.data?.items ?? []).filter((r) => r.rfpId === open.id);
  const openAwards = (rfpAwards.data?.items ?? []).filter((a) => a.eventId === open.id);
  // RFX-D15 — the options a new firm-offer round may no longer name, by the
  // rule the round policy judges with (`rfpSettledOptionRefs`).
  const openSettled = rfpSettledOptionRefs(
    open.id,
    awardRecordsInForce(openAwards),
    rfqs.data?.items ?? []
  );
  /**
   * @param {string} supplierId
   * @returns {string}
   */
  const supplierName = (supplierId) =>
    open.invitedSuppliers.find((i) => i.supplierId === supplierId)?.supplierName ?? supplierId;

  const now = rfxNow();
  const daysLeft = daysToDeadline(open.responseDeadline, now);
  const invited = open.invitedSuppliers.length;
  const responded = open.responses.length;
  const inForce = awardRecordsInForce(openAwards);
  const stage = rfpStageOf({
    status: open.status,
    invited,
    responded,
    deadlinePassed: isPastDeadline(open.responseDeadline, now),
    priced: !!open.pricing
  });
  /** @type {Record<(typeof RFP_STAGE_STEPS)[number], string>} */
  const stageDetail = {
    sent: t('rfx.stage.d.suppliers', { count: invited }),
    proposalsIn: t('rfx.stage.d.quoted', { quoted: responded, invited }),
    closed: open.status === 'Draft' || open.status === 'Open' ? '' : t('rfx.status.Closed'),
    award: inForce.length > 0 ? t(`rfx.status.${open.status}`) : '',
    done: ''
  };
  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={open.title} subtitle={open.eventNumber} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(now)}</Data>
        <span className="ml-3">
          {t('rfx.deadline')} <Data>{formatDate(open.responseDeadline)}</Data>
          {open.status === 'Open' && (
            <span className="ml-1" data-testid="rfp-event-days-left">
              ·{' '}
              {daysLeft >= 0 ? t('rfx.stage.daysLeft', { count: daysLeft }) : t('rfx.stage.passed')}
            </span>
          )}
        </span>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          to="/buyer/rfp"
          className="text-sm text-action-hover hover:underline"
          data-testid="rfp-event-back"
        >
          {t('rfx.event.backRfp')}
        </Link>
        <span data-testid="rfp-event-status">
          <StatusPill variant={open.closed ? 'neutral' : 'info'}>
            {t(`rfx.status.${open.status}`)}
          </StatusPill>
        </span>
      </div>

      <RfxStageBar
        steps={RFP_STAGE_STEPS.map((key) => ({
          key,
          labelKey: `rfx.stage.${key}`,
          detail: stageDetail[key]
        }))}
        current={stage.current}
        next={stage.next}
        testId="rfp-event-stage"
      />

      <RfpDetail
        open={open}
        create={create}
        publish={publish}
        run={run}
        pending={command.isPending}
        onEdit={() => setEditing(true)}
        supplierName={supplierName}
        gateOf={gateOf}
        openRounds={openRounds}
        openAwards={openAwards}
        openSettled={openSettled}
        awardCount={inForce.length > 0 ? t(`rfx.status.${open.status}`) : t('rfx.nav.notYet')}
      />

      {!!editing && open.status === 'Draft' && create.kind === 'held' && (
        <RfpCreateWizard
          key={`edit-${open.id}`}
          editing={open}
          canPublish={publish.kind === 'held'}
          onCancel={() => setEditing(false)}
          onCreated={() => setEditing(false)}
        />
      )}
    </AppShellV2>
  );
};

export default BuyerRfpEvent;
