/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { CHART_AXIS, CHART_GRID, CHART_SEMANTIC, CHART_SERIES } from '@lib/chartPalette';
/** @import { WarehousePlanView } from '@services/data/types' */
import { STANDARD } from '../const';
import { weekLabel } from '../utils';

// Chart paint, from the palette (DP2-PALETTE-01).
const TOKEN_PLAN = CHART_SERIES[0];
const TOKEN_INTERIM = CHART_SERIES[3];
const TOKEN_LOWEST = CHART_SERIES[4];
const TOKEN_CAPACITY = CHART_SEMANTIC.danger;
const TOKEN_STANDARD = CHART_SEMANTIC.warning;

/**
 * The warehouse fill chart: per week, the fill under this plan, under the
 * interim round-up it replaces and the lowest any plan could reach, against
 * owned capacity (100%) and the 80% standard.
 * @type {React.FC<{ w: WarehousePlanView }>}
 */
const FillChart = ({ w }) => {
  const { t } = useTranslation();
  const data = w.weeks.map((wk) => ({
    week: weekLabel(wk.weekStart),
    plan: wk.fill === null ? null : Math.round(wk.fill * 1000) / 10,
    interim: wk.interimFill === null ? null : Math.round(wk.interimFill * 1000) / 10,
    lowest: wk.lowestFill === null ? null : Math.round(wk.lowestFill * 1000) / 10
  }));
  const top = Math.max(120, ...data.map((d) => Math.max(d.plan ?? 0, d.interim ?? 0)));
  return (
    <div className="h-64" data-testid="op-fill-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: CHART_AXIS }} interval={1} />
          <YAxis
            domain={[0, Math.ceil(top / 10) * 10]}
            tick={{ fontSize: 10, fill: CHART_AXIS }}
            unit="%"
          />
          <Tooltip formatter={(v) => `${String(v)}%`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine
            y={100}
            stroke={TOKEN_CAPACITY}
            strokeDasharray="4 2"
            label={{
              value: t('op.fill.line.capacity'),
              fill: TOKEN_CAPACITY,
              fontSize: 9,
              position: 'insideTopRight'
            }}
          />
          <ReferenceLine
            y={STANDARD * 100}
            stroke={TOKEN_STANDARD}
            strokeDasharray="4 2"
            label={{
              value: t('op.fill.line.standard'),
              fill: TOKEN_STANDARD,
              fontSize: 9,
              position: 'insideBottomRight'
            }}
          />
          <Line
            type="monotone"
            dataKey="plan"
            name={t('op.fill.series.plan')}
            stroke={TOKEN_PLAN}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="interim"
            name={t('op.fill.series.interim')}
            stroke={TOKEN_INTERIM}
            strokeDasharray="5 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="lowest"
            name={t('op.fill.series.lowest')}
            stroke={TOKEN_LOWEST}
            strokeDasharray="2 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FillChart;
