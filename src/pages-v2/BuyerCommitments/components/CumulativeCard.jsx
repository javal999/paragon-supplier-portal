/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import Data from '@components/ui-v2/Data';
import { CHART_SERIES } from '@lib/chartPalette';
import { cumulativeCommitment } from '@services/transitions/forecastRules';
import { pctText, qtyText } from '../../forecasts/forecastDisplay';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

/**
 * BR-03 — one material's cumulative commitment against cumulative forecast:
 * the material code, a summary of the last period (how far behind or ahead),
 * and the two-line chart, or a note when there is nothing to plot.
 * @type {React.FC<{
 *   code: string;
 *   lines: readonly ForecastCommitmentLine[];
 *   periodLabel: (bucket: string) => string;
 * }>}
 */
const CumulativeCard = ({ code, lines, periodLabel }) => {
  const { t } = useTranslation();
  const series = cumulativeCommitment(lines).map((p) => ({
    ...p,
    label: periodLabel(p.periodBucket)
  }));
  const last = series[series.length - 1];
  const behind =
    last && last.cumulativeForecast > 0
      ? (last.cumulativeCommitment - last.cumulativeForecast) / last.cumulativeForecast
      : 0;
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg p-4"
      data-testid={`fc-cumulative-${code}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <Data className="font-semibold">{code}</Data>
        {last && (
          <span
            className="text-xs text-text-secondary"
            data-testid={`fc-cumulative-summary-${code}`}
          >
            {t('fc.pti.gaps.cumulativeSummary', {
              commit: qtyText(last.cumulativeCommitment),
              forecast: qtyText(last.cumulativeForecast),
              pct: pctText(behind),
              period: last.label
            })}
          </span>
        )}
      </div>
      {series.length > 0 ? (
        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={64} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumulativeForecast"
                name={t('fc.pti.gaps.cumForecast')}
                stroke={CHART_SERIES[1]}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cumulativeCommitment"
                name={t('fc.pti.gaps.cumCommitment')}
                stroke={CHART_SERIES[0]}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-text-tertiary">{t('fc.pti.gaps.cumulativeNone')}</p>
      )}
    </div>
  );
};

export default CumulativeCard;
