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
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate } from '@lib/format';
import { useRfiEvents } from '@services/query/hooks';
import RfiCreateWizard from './rfx/RfiCreateWizard';
import { DeadlinePill, EmptyRow, rfxNow } from './rfx/rfxDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PTI INFORMATION REQUESTS — REQ-E03-02 (BUY): the list.
//
// The buyer's RFIs, who was invited and how many have answered. Each event's
// detail — invitees, answers side by side, the lifecycle, extend, carry
// forward — is its own page, `BuyerRfiEvent` at `/buyer/rfi/:rfiId`
// (RFx UX 2A, B-09, owner ruling Q2 2026-10-19). A row's "Open" goes there,
// and the old deep link `/buyer/rfi?open=<id>` (tasks, toasts, notifications)
// redirects there, so it still lands on the event.
//
// ⚠️ **THE EVENT IS RAISED HERE (section 3.6a).** "New RFI" opens the wizard,
// a modal as before; after "Save draft" or "Send to suppliers" the buyer lands
// ON the new event's page rather than on a board they then have to search.
// A seat without `rfi:create` reads whose act it is (§72a).
//
// RFx UX 2A (B-08): the row button reads "Open" for every event. It read
// "Answer" — the supplier's verb — and "Close" when the row was expanded,
// 300 px from "Close the event"; with the detail on its own page there is no
// expanded row and no toggle.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerRfi = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const events = useRfiEvents();
  const publish = useVerbAvailability('rfi:publish');
  const create = useVerbAvailability('rfi:create');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [params] = useSearchParams();

  // The eyebrow is the menu section alone (the `PageHeader` rule).
  const crumb = [t('hub.nav.section.sourcing')];
  const items = useMemo(() => events.data?.items ?? [], [events.data]);

  // The old deep link `?open=<id>` (the RFQ event page's "Created from RFI-…",
  // tasks, notifications) lands on the event's own page.
  const openParam = params.get('open');
  if (openParam) return <Navigate replace to={`/buyer/rfi/${encodeURIComponent(openParam)}`} />;

  if (events.isPending) return <LoadingState breadcrumb={crumb} />;
  if (events.isError)
    return <ErrorState breadcrumb={crumb} error={events.error} onRetry={() => events.refetch()} />;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfx.rfi.title')}
        count={items.length}
        subtitle={t('rfx.rfi.subtitle')}
      />
      <PageMetaLine className="-mt-6 mb-4">
        {t('rfx.asOf')} <Data>{formatDate(rfxNow())}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* CE-01 — the buyer raises the event. A seat without `rfi:create` reads
          WHOSE act it is rather than losing the affordance silently (§72a). */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
        {publish.kind !== 'held' && (
          <HandoffNotice availability={publish} testId="handoff-rfi-publish" />
        )}
        {create.kind === 'held' ? (
          <Button variant="outline" onClick={() => setWizardOpen(true)} data-testid="rfi-new">
            {t('rfx.rfi.new')}
          </Button>
        ) : (
          <HandoffNotice availability={create} testId="handoff-rfi-create" />
        )}
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfx.rfi.eventTitle')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.deadline')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.rfi.template')}</TableHeaderCell>
            <TableHeaderCell>{t('rfx.response.submitted')}</TableHeaderCell>
            <TableHeaderCell>{''}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {items.map((event) => (
              <TableRow key={event.id} data-testid={`rfi-row-${event.id}`}>
                <TableCell className="align-top">
                  <Data className="font-semibold">{event.eventNumber}</Data>
                  <div className="text-sm text-text-primary">{event.title}</div>
                  <StatusPill variant={event.closed ? 'neutral' : 'info'} className="mt-1">
                    {t(`rfx.status.${event.status}`)}
                  </StatusPill>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <DeadlinePill deadline={event.responseDeadline} done={event.closed} />
                  {event.extensions.length > 0 && (
                    <div className="text-xs text-text-tertiary mt-1">{t('rfx.extended')}</div>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm text-text-secondary">
                  {t(`rfx.template.${event.templateId}`)}
                  <div className="text-xs text-text-tertiary">
                    {t('rfx.rfi.questions', { count: event.questions.length })}
                  </div>
                </TableCell>
                <TableCell className="align-top text-sm">
                  {t('rfx.rfi.responses', { count: event.responses.length })}
                </TableCell>
                <TableCell className="align-top text-right">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/buyer/rfi/${encodeURIComponent(event.id)}`)}
                    data-testid={`rfi-open-${event.id}`}
                  >
                    {t('rfx.row.open')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <EmptyRow colSpan={5} testId="rfi-empty">
                {t('rfx.rfi.empty')}
              </EmptyRow>
            )}
          </tbody>
        </Table>
      </div>

      {!!wizardOpen && (
        <RfiCreateWizard
          pastEvents={items}
          canPublish={publish.kind === 'held'}
          onCancel={() => setWizardOpen(false)}
          onCreated={(rfiId) => {
            // B-09 — land the buyer ON the new event's page: the act they just
            // performed is the one in view.
            setWizardOpen(false);
            navigate(`/buyer/rfi/${encodeURIComponent(rfiId)}`);
          }}
        />
      )}
    </AppShellV2>
  );
};

export default BuyerRfi;
