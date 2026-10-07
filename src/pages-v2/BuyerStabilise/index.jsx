/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SubTabs from '@components/ui-v2/SubTabs';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate } from '@lib/format';
import { useForecastVersions, useStabilisedPlan } from '@services/query/hooks';
import { useForecastCommand } from '@services/query/commandHooks';
import { isLive } from '@services/liveness';
import { POLICY_HOOKS } from '@services/transitions/policyHooks';
import { refusedByPolicy } from '@services/transitions/refusalMessage';
import DataHealthChip from '@components/forecast/DataHealthChip';
import PurposeHeader from '@components/forecast/PurposeHeader';
import CycleSteps from '@components/forecast/CycleSteps';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { currentVersions } from '@components/forecast/cycleCounts';
import PublishedVersions from '../BuyerForecasts';
/** @import { Source, Tab } from './const' */
import { TAB_PARAM } from './const';
import { tabOf } from './utils';
import RunSection from './components/RunSection';
import SettingsSection from './components/SettingsSection';
import PublishSection from './components/PublishSection';

// ─────────────────────────────────────────────────────────────────────────────
// STABILISE AND PUBLISH — REQ-E14-06, the Material Planner's view before a plan
// goes to suppliers.
//
// Per supplier × material and week (AC-03): the engine's value, the last and
// first values the supplier saw, the damped value, the allowed range, what
// would be published and which rule set it — Firm kept (BR-03), Trade-off
// damped (BR-04) and held to the ENG-D8 band (BR-05), a week beyond the band
// flagged as needing a reason. The effect on E14-02's plan-change measures
// (MASC, weeks changed inside the lead time, Trade-off revisions inside the
// band) is shown raw against stabilised, on two sources: the engine's own plan
// (replayed, ENG-B30) and SAP's plan history suppliers already saw (ENG-B33).
//
// BR-06's range: E14-09 is built (BL-111) and shown on the Demand forecast
// page; it is not published beside these quantities (ENG-B99), and the page
// says so with a link to it.
// Publishing goes through the EXISTING verb (`t_forecastversion_publish`,
// `source: 'engine'`) and is refused while the engine dataset is simulated
// (X-03) — the page says so in place of the act — and, once live, until SOMO
// ratifies C8 §8 (ENG-B35). Every figure is computed by the engine at read
// time on its SYNTHETIC dataset (the `engineDataset` pill).
//
// FUX-D1 (2026-10-05): this is the only publish point — the SAP-plan
// re-publish on Forecasts is removed. Above the act the page shows the last
// published version per stream, read from the published versions. The version
// record carries no source (SAP plan or engine) and no next-due date, so the
// line shows neither rather than infer them.
//
// FUX phase 2 B2 (F-01, F-13): one page for publishing. Two tabs, kept in the
// address: "Version to publish" (the content above) and "Published versions"
// (`?tab=versions`, the list that was its own page at `/buyer/forecasts`, which
// now redirects here — FUX2-R1). Above the publish act a checklist shows
// whether the week is ready: inputs (Data health), recommended orders, weeks
// over warehouse capacity and held Trade-off weeks without a reason. Each item
// is derived at render from data the hooks already return, by the counting
// rules the linked pages apply (`cycleCounts.js`); nothing is stored (FUX2-R3).
// It adds no gate to the verb (FUX-R1): the act and its refusal are unchanged.
//
// Split into a folder (frontend-standard Phase 5, PAGE-SPLIT-GUIDE): this file
// keeps the page — its reads, the tab in the address, the publish handler and
// the shell. The sections live in `components/`, the checklist's derivation in
// `hooks/usePublishChecklist.js`, the helpers in `utils.js` and the constants
// and typedefs in `const.js`.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerStabilise = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const query = useStabilisedPlan();
  const forecastCommand = useForecastCommand();
  const publishAvailability = useVerbAvailability('forecast:publish');
  const versionsQuery = useForecastVersions();
  const [source, setSource] = useState(/** @type {Source} */ ('engine'));
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params.get(TAB_PARAM));
  const crumb = forecastCrumb(t, 'publish');
  // X-03 — the registry's own answer, read at render; the verb reads it again.
  const withheld = !isLive('engineDataset');

  // The tab shown decides which read the page waits for.
  const shownQuery = tab === 'versions' ? versionsQuery : query;
  if (shownQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (shownQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={shownQuery.error}
        onRetry={() => void shownQuery.refetch()}
      />
    );
  const plan = query.data ?? null;
  const versions = versionsQuery.data?.items ?? [];
  /** @param {Tab} next */
  const selectTab = (next) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next === 'versions') out.set(TAB_PARAM, 'versions');
        else out.delete(TAB_PARAM);
        return out;
      },
      { replace: true }
    );

  /** @param {'packaging' | 'rawMaterial'} stream */
  const publish = async (stream) => {
    try {
      const res = await forecastCommand.mutateAsync({ verb: 'publish', stream, source: 'engine' });
      if (res.status === 'failed') {
        const byHook = refusedByPolicy(res.reason, POLICY_HOOKS.FORECAST_ENGINE_PUBLISH_ALLOWED);
        const description = byHook
          ? res.reason?.includes('ENGINE_DATA_SIMULATED')
            ? t('stb.refusal.simulated')
            : t('stb.refusal.c8')
          : (refusalText(res.reason) ?? res.reason ?? '');
        toast({ variant: 'warning', title: t('stb.toast.refused'), description });
      }
    } catch {
      toast({ variant: 'error', title: t('stb.toast.refused') });
    }
  };

  const run = plan ? plan[source] : null;
  // FUX-D1 · F-13 — the current published version of each stream.
  const lastPublished = currentVersions(versions);
  const pv = plan?.versions;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'publish')} />
      <PurposeHeader page="publish" />
      <CycleSteps current="publish" />
      {/* One banner, for the figures the tab shows: the engine's plan, or the
          published versions (FUX-R3). */}
      <SimulatedDataBanner
        capability={tab === 'versions' ? 'forecastPublications' : 'engineDataset'}
      />
      <div className="mb-4">
        <SubTabs
          options={[
            { id: 'publish', label: t('stb.tab.publish') },
            { id: 'versions', label: t('stb.tab.versions'), count: versions.length }
          ]}
          value={tab}
          onChange={selectTab}
        />
      </div>

      {/* C2 (WCAG 1.3.1): the tab's content is its tab panel. */}
      <div
        role="tabpanel"
        aria-label={t(tab === 'versions' ? 'stb.tab.versions' : 'stb.tab.publish')}
        data-testid="stb-tabpanel"
      >
        {tab === 'versions' ? (
          <PublishedVersions versions={versions} />
        ) : (
          <>
            <DataAsOf
              date={plan?.planMadeAt ?? null}
              detail={
                plan?.planMadeAt
                  ? pv && pv.packaging.length > 0
                    ? t('stb.meta.versions', {
                        packaging: pv.packaging.length,
                        raw: pv.rawMaterial.length,
                        from: formatDate(pv.packaging[0])
                      })
                    : null
                  : t('stb.meta.noPlan')
              }
            />
            {/* F-02 — the published quantities are the material net requirement, so the
              chip counts the checks that reach Material requirement (and Safety stock,
              which feeds it). */}
            <DataHealthChip step="E14-03" className="mb-3" />

            <div className="mb-4">
              <FilterChipsBar
                options={[
                  { id: 'engine', label: t('stb.source.engine') },
                  { id: 'sapHistory', label: t('stb.source.sapHistory') }
                ]}
                value={source}
                onChange={setSource}
              />
            </div>

            {run && <RunSection key={source} run={run} source={source} />}

            {plan && <SettingsSection params={plan.params} />}

            <PublishSection
              lastPublished={lastPublished}
              versionsLoaded={versionsQuery.isSuccess}
              engineRun={plan?.engine ?? null}
              publishAvailability={publishAvailability}
              withheld={withheld}
              isPending={forecastCommand.isPending}
              publish={publish}
            />

            <section
              className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2"
              data-testid="stb-definitions"
            >
              <h2 className="text-section text-text-primary">{t('stb.def.title')}</h2>
              <p>{t('stb.def.quantity')}</p>
              <p>{t('stb.def.zones')}</p>
              <p>{t('stb.def.masc')}</p>
              <p>{t('stb.def.share')}</p>
            </section>
          </>
        )}
      </div>

      <AboutThisPage>
        {tab === 'versions' ? (
          <p>{t('fc.pti.versions.subtitle')}</p>
        ) : (
          <>
            <p>{t('stb.subtitle')}</p>
            <p data-testid="stb-synthetic-note">{t('stb.synthetic')}</p>
            {withheld && <p data-testid="stb-withheld-note">{t('stb.withheld')}</p>}
            <p data-testid="stb-range-note">
              {t('stb.range')}{' '}
              <Link
                to="/buyer/demand-forecast"
                className="text-action-hover hover:underline"
                data-testid="stb-range-link"
              >
                {t('stb.range.link')}
              </Link>
            </p>
            <p>{t('stb.replay')}</p>
          </>
        )}
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerStabilise;
