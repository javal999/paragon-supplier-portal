import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import CycleSteps from '@components/forecast/CycleSteps';
import { FORECAST_PAGES, forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import {
  currentVersions,
  failingChecks,
  recommendedOrders,
  firstReleaseWeek,
  openExceptions,
  publishWithheld,
  weeksOverCapacity,
  type CycleStepId
} from '@components/forecast/cycleCounts';
import { formatDate } from '@lib/format';
import { isoWeek } from '@services/engine/dates';
import { sdcClock } from '@services/sdc/clock';
import {
  useDataHealth,
  useForecastCommitments,
  useForecastVersions,
  useOrderPlan,
  useReschedule
} from '@services/query/hooks';

// ─────────────────────────────────────────────────────────────────────────────
// THIS WEEK — Forecast UX phase 2, task B1 (F-02, F-03, F-05; evaluation §4–§5).
//
// The weekly cycle's visible starting point, first item of Weekly plan. My
// tasks (`/buyer/home`) stays the landing page and links here.
//
// An input check card (the Data health verdict, counted by the same function
// as the result pages' chip) and one card per step in cycle order, each with
// its menu label, one number and a link. Every number is read from the hook
// its page already uses, by the rule that page applies (`cycleCounts.ts`).
//
// FUX2-R3 — nothing is stored. A step is never marked done; Publish reads
// withheld only while the registry says the engine data is simulated.
// Read-only (FUX-R1); every figure is on the engine's sample data (FUX-R3).
// ─────────────────────────────────────────────────────────────────────────────

type StepCardId = Exclude<CycleStepId, 'thisWeek'>;

interface StepCardProps {
  readonly id: StepCardId;
  readonly children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({ id, children }) => {
  const { t } = useTranslation();
  const page = FORECAST_PAGES[id];
  const name = t(page.titleKey);
  return (
    <section
      className="flex flex-col rounded-lg border border-border-subtle bg-bg-surface p-4"
      data-testid={`tw-card-${id}`}
    >
      <h3 className="text-section text-text-primary">{name}</h3>
      <p className="mb-2 text-xs text-text-tertiary">{t(`fux.thisWeek.card.${id}`)}</p>
      <div className="flex-1 text-sm text-text-primary" data-testid={`tw-figure-${id}`}>
        {children}
      </div>
      <Link
        to={page.path}
        className="mt-3 text-sm text-action-hover hover:underline"
        data-testid={`tw-link-${id}`}
      >
        {t('fux.thisWeek.open', { page: name })}
      </Link>
    </section>
  );
};

const BuyerThisWeek: React.FC = () => {
  const { t } = useTranslation();
  const health = useDataHealth();
  const orderPlan = useOrderPlan();
  const reschedule = useReschedule();
  const versions = useForecastVersions();
  const lines = useForecastCommitments();
  const crumb = forecastCrumb(t, 'thisWeek');
  const report = health.data ?? null;
  const withheld = publishWithheld();
  const failing = report ? failingChecks(report) : null;
  const pending = <span className="text-text-tertiary">—</span>;
  const current = versions.data ? currentVersions(versions.data.items) : null;
  // The page's "Release in" column labels a week `W<iso week>` (BuyerOrderPlan's weekLabel).
  const firstRelease = orderPlan.data ? firstReleaseWeek(orderPlan.data) : null;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'thisWeek')} />
      <PurposeHeader page="thisWeek" />
      <CycleSteps current="thisWeek" />
      <SimulatedDataBanner capability="engineDataset" />
      <DataAsOf date={report?.asOf ?? null} withTime />

      <section
        className="mb-6 rounded-lg border border-border-subtle bg-bg-surface p-4"
        data-testid="tw-input-check"
      >
        <h2 className="text-section text-text-primary">{t('fux.thisWeek.input.title')}</h2>
        <p className="mb-3 max-w-prose text-xs text-text-tertiary">
          {t('fux.thisWeek.input.intro')}
        </p>
        <p className="flex flex-wrap items-center gap-3 text-sm">
          {failing === null ? (
            <StatusPill variant="neutral">{t('fux.thisWeek.input.unknown')}</StatusPill>
          ) : failing > 0 ? (
            <StatusPill variant="warning">
              <span data-testid="tw-input-verdict">
                {t('fux.thisWeek.input.failing', { count: failing })}
              </span>
            </StatusPill>
          ) : (
            <StatusPill variant="success">
              <span data-testid="tw-input-verdict">{t('fux.thisWeek.input.pass')}</span>
            </StatusPill>
          )}
          <Link
            to={FORECAST_PAGES.dataHealth.path}
            className="text-action-hover hover:underline"
            data-testid="tw-input-link"
          >
            {t('fux.thisWeek.open', { page: t(FORECAST_PAGES.dataHealth.titleKey) })}
          </Link>
        </p>
      </section>

      <h2 className="mb-3 text-section text-text-primary">{t('fux.thisWeek.steps.title')}</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StepCard id="whatToOrder">
          {orderPlan.data ? (
            <>
              <Data data-testid="tw-count-whatToOrder">
                {t('fux.count.toOrder', { count: recommendedOrders(orderPlan.data) })}
              </Data>
              {firstRelease !== null && (
                <p className="mt-1 text-xs text-text-secondary" data-testid="tw-first-release">
                  <Data>
                    {t('fux.count.firstRelease', {
                      week: `W${isoWeek(firstRelease)}`,
                      date: formatDate(firstRelease)
                    })}
                  </Data>
                </p>
              )}
            </>
          ) : (
            pending
          )}
        </StepCard>
        <StepCard id="makeRoom">
          {reschedule.data ? (
            <Data data-testid="tw-count-makeRoom">
              {t('fux.count.overCapacity', { count: weeksOverCapacity(reschedule.data) })}
            </Data>
          ) : (
            pending
          )}
        </StepCard>
        <StepCard id="publish">
          {current === null ? (
            pending
          ) : (
            <ul className="space-y-1">
              {current.map((v) => (
                <li key={v.publicationId} data-testid={`tw-published-${v.stream}`}>
                  {t('stb.publish.last', { stream: t(`fc.stream.${v.stream}`) })}{' '}
                  <Data>{t('fc.version', { version: v.version })}</Data>,{' '}
                  <Data>{formatDate(v.publishedAt)}</Data>
                </li>
              ))}
              {current.length === 0 && <li>{t('stb.publish.lastNone')}</li>}
            </ul>
          )}
          <p
            className={`mt-2 text-xs ${withheld ? 'text-warning-hover' : 'text-text-secondary'}`}
            data-testid="tw-publish-state"
          >
            {t(withheld ? 'fux.thisWeek.publish.withheld' : 'fux.thisWeek.publish.open')}
          </p>
        </StepCard>
        <StepCard id="responses">
          {lines.data ? (
            <Data data-testid="tw-count-responses">
              {t('fux.count.exceptions', {
                count: openExceptions(lines.data.items, sdcClock.now())
              })}
            </Data>
          ) : (
            pending
          )}
        </StepCard>
      </div>

      <AboutThisPage>
        <p>{t('fux.thisWeek.about.counts')}</p>
        <p>{t('fux.thisWeek.about.blocked')}</p>
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerThisWeek;
