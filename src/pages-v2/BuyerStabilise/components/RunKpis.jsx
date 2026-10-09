/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import KpiCard from '@components/ui-v2/KpiCard';
import TermTip from '@components/forecast/TermTip';
import { formatNumber } from '@lib/format';
/** @import { StabiliseRunView } from '@services/data/types' */
import { pctShare, ratio } from '../utils';

/**
 * The four plan-change measures of one run, raw → stabilised: MASC, the share
 * of weeks changed inside the lead time, Trade-off revisions inside the band,
 * and the weeks a rule held (with the weeks beyond the band that need a reason).
 * `totals` is the run's own totals (`run.totals`).
 * @type {React.FC<{ totals: StabiliseRunView['totals'] }>}
 */
const RunKpis = ({ totals }) => {
  const { t } = useTranslation();
  const { raw, stabilised, counts, beyondBand } = totals;
  const latestHeld = {
    firm: counts.firmFrozen,
    band: counts.bandHeld + counts.cumulativeHeld,
    damped: counts.damped
  };
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"
      data-testid="stb-kpis"
    >
      <KpiCard
        eyebrow={t('stb.kpi.masc')}
        value={
          <span>
            <span data-testid="stb-kpi-masc-raw">{ratio(raw.masc)}</span> →{' '}
            <span data-testid="stb-kpi-masc-stab">{ratio(stabilised.masc)}</span>
          </span>
        }
        subtitle={
          <span className="text-text-tertiary">
            {t('stb.kpi.masc.sub', { count: raw.mascPairs })} <TermTip term="MASC" />
            <span className="block" data-testid="stb-scale-hint">
              {t('fux.scale.masc')}
            </span>
          </span>
        }
      />
      <KpiCard
        eyebrow={t('stb.kpi.share')}
        value={
          <span>
            <span data-testid="stb-kpi-share-raw">{pctShare(raw.insideLeadTime.share)}</span> →{' '}
            <span data-testid="stb-kpi-share-stab">
              {pctShare(stabilised.insideLeadTime.share)}
            </span>
          </span>
        }
        subtitle={
          <span className="text-text-tertiary">
            {t('stb.kpi.share.sub', { count: raw.insideLeadTime.schedules })}
          </span>
        }
      />
      <KpiCard
        eyebrow={t('stb.kpi.band')}
        value={
          <span data-testid="stb-kpi-band-stab">
            {t('stb.kpi.band.value', {
              n: stabilised.tradeOff.withinBand,
              m: stabilised.tradeOff.revisions
            })}
          </span>
        }
        subtitle={
          <span className="text-text-tertiary" data-testid="stb-kpi-band-raw">
            {t('stb.kpi.band.sub', { n: raw.tradeOff.withinBand, m: raw.tradeOff.revisions })}
          </span>
        }
      />
      <KpiCard
        eyebrow={t('stb.kpi.held')}
        value={
          <span data-testid="stb-kpi-held">
            {formatNumber(latestHeld.firm + latestHeld.band + latestHeld.damped)}
          </span>
        }
        subtitle={
          <span className="text-text-tertiary">
            {t('stb.kpi.held.sub', latestHeld)}
            {beyondBand > 0 && (
              <span className="block text-warning-hover" data-testid="stb-kpi-reason">
                {t('stb.kpi.reason', { count: beyondBand })}
              </span>
            )}
          </span>
        }
      />
    </div>
  );
};

export default RunKpis;
