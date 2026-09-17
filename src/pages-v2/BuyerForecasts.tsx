import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import SubTabs from '../components/ui-v2/SubTabs';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { formatDate, formatDateTime } from '../lib/format';
import { useForecastVersions } from '../services/query/hooks';
import type { ForecastStream } from '../services/sdc/types';
import { forecastNow, useForecastRunner } from './forecasts/forecastDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PTI FORECASTS — REQ-E06-01 (MP).
//
// Every published version per stream (packaging weekly, raw material monthly),
// newest first, with the suppliers it carries, when each supplier first opened
// it, and how many of their periods moved against the previous version. The
// planner re-publishes: on the cadence, or as an emergency re-publication; each
// is a new version and suppliers get a Home task until they open it. In the
// prototype the SAP planning run is simulated from sample demand.
// ─────────────────────────────────────────────────────────────────────────────

const BuyerForecasts: React.FC = () => {
  const { t } = useTranslation();
  const versionsQuery = useForecastVersions();
  const publish = useVerbAvailability('forecast:publish');
  const { run, pending } = useForecastRunner();
  const [stream, setStream] = useState<ForecastStream>('packaging');
  const nowIso = forecastNow();
  const crumb = [t('hub.nav.section.forecast'), t('fc.pti.versions.title')];

  const versions = useMemo(() => versionsQuery.data?.items ?? [], [versionsQuery.data]);

  if (versionsQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (versionsQuery.isError)
    return <ErrorState breadcrumb={crumb} error={versionsQuery.error} onRetry={() => versionsQuery.refetch()} />;

  const shown = versions.filter((v) => v.stream === stream);
  const current = shown.find((v) => v.isCurrent);
  const notViewed = current ? current.suppliers.filter((s) => s.viewedAt === null) : [];

  const republish = (emergency: boolean) =>
    void run(
      { verb: 'publish', stream, ...(emergency ? { emergency: true } : {}) },
      t(emergency ? 'fc.pti.versions.toast.emergency' : 'fc.pti.versions.toast.published'),
    );

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('fc.pti.versions.title')} subtitle={t('fc.pti.versions.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('fc.asOf')} <Data>{formatDate(nowIso)}</Data>
        <span className="ml-3 text-xs text-text-tertiary">{t('fc.pti.versions.simulated')}</span>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {notViewed.length > 0 && (
        <div role="status" data-testid="fc-pti-versions-banner" className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 text-sm text-warning-hover">
          {t('fc.pti.versions.banner', { count: notViewed.length, version: current?.version ?? '' })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SubTabs<ForecastStream>
          options={(['packaging', 'rawMaterial'] as ForecastStream[]).map((s) => ({
            id: s,
            label: t(`fc.stream.${s}`),
            count: versions.filter((v) => v.stream === s).length,
          }))}
          value={stream}
          onChange={setStream}
        />
        {publish.kind === 'held' ? (
          <div className="flex gap-2">
            <Button variant="secondary" disabled={pending} onClick={() => republish(true)} data-testid="fc-republish-emergency">
              {t('fc.pti.versions.emergency')}
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => republish(false)} data-testid="fc-republish">
              {t('fc.pti.versions.republish')}
            </Button>
          </div>
        ) : (
          <HandoffNotice availability={publish} testId="handoff-forecast-publish" />
        )}
      </div>
      <p className="text-sm text-text-secondary mb-4">{t(`fc.cadence.${stream}`)}</p>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('fc.pti.versions.col.version')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.pti.versions.col.published')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.pti.versions.col.kind')}</TableHeaderCell>
            <TableHeaderCell>{t('fc.pti.versions.col.suppliers')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {shown.map((v) => (
              <TableRow key={v.publicationId} data-testid={`fc-version-${v.publicationId}`}>
                <TableCell className="whitespace-nowrap align-top">
                  <Data className="font-semibold">{t('fc.version', { version: v.version })}</Data>
                  {v.isCurrent && (
                    <StatusPill variant="info" className="ml-2">
                      {t('fc.pti.versions.current')}
                    </StatusPill>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap align-top">
                  <Data>{formatDateTime(v.publishedAt)}</Data>
                </TableCell>
                <TableCell className="align-top">
                  {v.changeNote ? (
                    <div className="text-sm text-text-primary">
                      {t('fc.pti.versions.kind.moved')}
                      <div className="text-xs text-text-secondary">{v.changeNote}</div>
                    </div>
                  ) : v.emergency ? (
                    <StatusPill variant="warning">{t('fc.emergency')}</StatusPill>
                  ) : (
                    <span className="text-sm text-text-secondary">{t('fc.pti.versions.kind.scheduled')}</span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <ul className="space-y-1">
                    {v.suppliers.map((s) => (
                      <li key={s.supplierId} className="text-sm flex flex-wrap items-center gap-2" data-testid={`fc-viewed-${v.publicationId}-${s.supplierId}`}>
                        <span className="text-text-primary">{s.supplierName}</span>
                        {s.viewedAt ? (
                          <StatusPill variant="success">
                            {t('fc.pti.versions.viewed')} <Data>{formatDateTime(s.viewedAt)}</Data>
                          </StatusPill>
                        ) : (
                          <StatusPill variant="neutral">{t('fc.pti.versions.notViewed')}</StatusPill>
                        )}
                        {v.version > 1 && (
                          <span className="text-xs text-text-tertiary">{t('fc.pti.versions.changed', { count: s.changedPeriods })}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-sm text-text-tertiary py-10">
                  {t('fc.pti.versions.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </AppShellV2>
  );
};

export default BuyerForecasts;
