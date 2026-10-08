/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
/** @import { StabiliseRunView } from '@services/data/types' */
/** @import { Source } from '../const' */
import RunKpis from './RunKpis';
import RuleCounts from './RuleCounts';
import SeriesSection from './SeriesSection';

/**
 * One source's stabilised run — the engine's own plan (replayed) or SAP's plan
 * history: its intro line, the plan-change measures, the rule counts and the
 * series table. The page keys it by `source`, so switching source starts the
 * series filter and the open row afresh.
 * `run` is that source's run; `source` names it (for the intro and the test id).
 * @type {React.FC<{ run: StabiliseRunView; source: Source }>}
 */
const RunSection = ({ run, source }) => {
  const { t } = useTranslation();
  const { counts, replayCounts } = run.totals;
  return (
    <div data-testid={`stb-run-${source}`}>
      <p className="text-xs text-text-tertiary mb-4">{t(`stb.source.${source}.intro`)}</p>

      <RunKpis totals={run.totals} />

      <RuleCounts counts={counts} replayCounts={replayCounts} />

      <SeriesSection series={run.series} />
    </div>
  );
};

export default RunSection;
