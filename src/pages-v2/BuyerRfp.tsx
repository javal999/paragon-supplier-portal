import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../lib/format';
import { useRfiEvents, useRfpEvents, useRFQs } from '../services/query/hooks';
import { useRfxCommand } from '../services/query/commandHooks';
import { RFP_TERM_GROUP_ORDER, rfpTerm } from '../services/sourcing/rfxConfig';
import { rfpScoringOf } from './rfx/rfpScoring';
import type { RfpEventView } from '../services/sourcing/views';
import RfxTabs from './rfx/RfxTabs';
import { DeadlinePill, EmptyRow, OtifOrNoHistory, ResponseStatePill, rfxNow } from './rfx/rfxDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PTI PROPOSAL REQUESTS — REQ-E03-04 (BUY).
//
// An RFP asks for TERMS, not a price, so the comparison is shaped the way the
// requirement specifies and not the way a quote comparison is: TERMS ARE ROWS,
// SUPPLIERS ARE COLUMNS, and every deviation is highlighted with the comment the
// supplier had to write for it.
//
// Where the RFP carries a price basis and a standard lead time — the two terms
// the standard list marks scorable — the proposals are ALSO scored with CR-15,
// reliability read from each supplier's OTIF. An RFP that carries neither is not
// scored at all, and says so: a weighted number invented from prose would be the
// fabricated-score defect in a new document.
// ─────────────────────────────────────────────────────────────────────────────

const BuyerRfp: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const events = useRfpEvents();
  const rfis = useRfiEvents();
  const rfqs = useRFQs();
  const publish = useVerbAvailability('rfp:publish');
  const command = useRfxCommand();
  const [openId, setOpenId] = useState<string | null>(null);
  const [extendTo, setExtendTo] = useState<Record<string, string>>({});

  const crumb = [t('hub.nav.section.sourcing'), t('rfx.rfp.title')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  const open = items.find((e) => e.id === openId) ?? null;

  const extend = (event: RfpEventView) =>
    command.mutate(
      { verb: 'extendRfp', rfpId: event.id, deadline: extendTo[event.id] ?? '' },
      {
        onSuccess: (res) =>
          toast(
            res.status === 'failed'
              ? { variant: 'error', title: t('rfx.toast.refused', { reason: res.reason ?? '' }) }
              : { variant: 'success', title: t('rfx.toast.extended') },
          ),
        onError: () => toast({ variant: 'error', title: t('rfx.toast.refused', { reason: '' }) }),
      },
    );

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('rfx.rfp.title')} subtitle={t('rfx.rfp.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <RfxTabs
        persona="buyer"
        active="rfp"
        counts={{ rfi: rfis.data?.items.length ?? 0, rfq: rfqs.data?.items.length ?? 0, rfp: items.length }}
      />

      {publish.kind !== 'held' && (
        <div className="mb-4">
          <HandoffNotice availability={publish} testId="handoff-rfp-publish" />
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfx.rfi.eventTitle')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.deadline')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
            <TableHeaderCell>{''}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {items.map((event) => (
              <TableRow key={event.id} data-testid={`rfp-row-${event.id}`}>
                <TableCell className="align-top">
                  <Data className="font-semibold">{event.eventNumber}</Data>
                  <div className="text-sm text-text-primary">{event.title}</div>
                  <StatusPill variant={event.closed ? 'neutral' : 'info'} className="mt-1">
                    {t(`rfx.status.${event.status}`)}
                  </StatusPill>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <DeadlinePill deadline={event.responseDeadline} done={event.closed} />
                </TableCell>
                <TableCell className="align-top text-sm">
                  {t('rfx.rfp.terms', { count: event.terms.length })}
                </TableCell>
                <TableCell className="align-top text-sm">
                  {t('rfx.rfp.proposals', { count: event.responses.length })}
                </TableCell>
                <TableCell className="align-top text-right">
                  <Button
                    variant="secondary"
                    onClick={() => setOpenId(openId === event.id ? null : event.id)}
                    data-testid={`rfp-open-${event.id}`}
                  >
                    {openId === event.id ? t('rfx.close') : t('rfx.rfp.compare')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <EmptyRow colSpan={5} testId="rfp-empty">
                {t('rfx.rfp.empty')}
              </EmptyRow>
            )}
          </tbody>
        </Table>
      </div>

      {open && (
        <section className="mt-6 space-y-6" data-testid={`rfp-detail-${open.id}`}>
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-semibold text-text-primary">{t('rfx.rfp.scope')}</h3>
            <p className="text-sm text-text-secondary mt-1">{open.scope}</p>
            <div className="flex flex-wrap items-end gap-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1" htmlFor={`rfp-extend-${open.id}`}>
                  {t('rfx.rfi.extend')}
                </label>
                <input
                  id={`rfp-extend-${open.id}`}
                  type="date"
                  value={extendTo[open.id] ?? ''}
                  onChange={(e) => setExtendTo((prev) => ({ ...prev, [open.id]: e.target.value }))}
                  className="bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
              </div>
              <Button
                variant="outline"
                disabled={publish.kind !== 'held' || !extendTo[open.id]}
                onClick={() => extend(open)}
                data-testid={`rfp-extend-btn-${open.id}`}
              >
                {t('rfx.rfi.extendAll')}
              </Button>
            </div>
          </div>

          <RfpInvitees event={open} />
          <RfpComparison event={open} />
        </section>
      )}
    </AppShellV2>
  );
};

const RfpInvitees: React.FC<{ event: RfpEventView }> = ({ event }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.invite.col.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.invite.col.otif')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.deadline.own')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {event.invitedSuppliers.map((invitee) => (
            <TableRow key={invitee.supplierId} data-testid={`rfp-invitee-${invitee.supplierId}`}>
              <TableCell>{invitee.supplierName}</TableCell>
              <TableCell>
                <OtifOrNoHistory otif={invitee.otif} testId={`rfp-otif-${invitee.supplierId}`} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <DeadlinePill deadline={invitee.deadline} done={invitee.responseState === 'submitted'} />
              </TableCell>
              <TableCell>
                <ResponseStatePill state={invitee.responseState} />
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

/** REQ-E03-04 — terms as rows, suppliers as columns, deviations highlighted. */
const RfpComparison: React.FC<{ event: RfpEventView }> = ({ event }) => {
  const { t } = useTranslation();
  const scoring = rfpScoringOf(event);
  const scoreById = new Map(
    scoring?.kind === 'scored' ? scoring.scores.map((s) => [s.quoteId, s] as const) : [],
  );

  if (event.responses.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-text-tertiary" data-testid="rfp-no-proposals">
        {t('rfx.rfp.empty')}
      </p>
    );
  }

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('rfx.rfp.col.term')}</TableHeaderCell>
          <TableHeaderCell>{t('rfx.rfp.col.requested')}</TableHeaderCell>
          {event.responses.map((r) => (
            <TableHeaderCell key={r.id}>
              {r.supplierName}
              <div className="text-xs font-normal normal-case text-text-tertiary">
                {t('rfx.rfp.deviations', { count: r.deviationCount })}
                {scoreById.has(r.id) && (
                  <>
                    {' · '}
                    {t('rfx.rfp.scored')} <Data>{scoreById.get(r.id)!.composite}</Data>
                    {scoreById.get(r.id)!.topRanked && (
                      <StatusPill variant="success" className="ml-1">
                        {t('rfx.cmp.best')}
                      </StatusPill>
                    )}
                  </>
                )}
              </div>
            </TableHeaderCell>
          ))}
        </TableHeader>
        <tbody>
          {RFP_TERM_GROUP_ORDER.flatMap((group) => {
            const rows = event.terms.filter((row) => rfpTerm(row.termId)?.group === group);
            if (rows.length === 0) return [];
            return rows.map((row, index) => (
              <TableRow key={row.termId} data-testid={`rfp-term-${row.termId}`}>
                <TableCell className="align-top">
                  {index === 0 && (
                    <div className="text-xs uppercase tracking-wide text-text-tertiary">
                      {t(`rfx.group.${group}`)}
                    </div>
                  )}
                  <div className="text-sm text-text-primary">{t(rfpTerm(row.termId)!.labelKey)}</div>
                </TableCell>
                <TableCell className="align-top text-sm text-text-secondary">
                  <Data>{row.requestedValue}</Data>
                </TableCell>
                {event.responses.map((r) => {
                  const a = r.answers.find((x) => x.termId === row.termId);
                  const deviates = a?.stance === 'deviate';
                  return (
                    <TableCell
                      key={r.id}
                      className={`align-top ${deviates ? 'bg-warning-soft' : ''}`}
                      data-testid={`rfp-cell-${row.termId}-${r.supplierId}`}
                    >
                      <div className="text-sm text-text-primary">
                        <Data>{a?.proposedValue ?? '—'}</Data>
                      </div>
                      {a && (
                        <StatusPill variant={deviates ? 'warning' : 'success'} className="mt-1">
                          {t(`rfx.stance.${a.stance}`)}
                        </StatusPill>
                      )}
                      {deviates && a?.comment && (
                        <div className="text-xs text-warning-hover mt-1">{a.comment}</div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ));
          })}
          {/* REQ-E03-04 edge case — the free-text terms a supplier added. */}
          <TableRow data-testid="rfp-other-terms">
            <TableCell className="align-top">
              <div className="text-xs uppercase tracking-wide text-text-tertiary">{t('rfx.group.other')}</div>
              <div className="text-sm text-text-primary">{t('rfx.rfp.otherTerms')}</div>
            </TableCell>
            <TableCell className="align-top text-sm text-text-tertiary">—</TableCell>
            {event.responses.map((r) => (
              <TableCell key={r.id} className="align-top text-sm text-text-secondary">
                {r.otherTerms ?? '—'}
              </TableCell>
            ))}
          </TableRow>
        </tbody>
      </Table>
      {scoring === null && (
        <p className="px-4 py-3 text-xs text-text-tertiary border-t border-border-subtle" data-testid="rfp-not-scorable">
          {t('rfx.rfp.notScorable')}
        </p>
      )}
    </div>
  );
};

export default BuyerRfp;
