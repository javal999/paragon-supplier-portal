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
/** @import { WarehouseRescheduleView } from '@services/data/types' */
import { STANDARD } from '../const';
import { weekLabel } from '../utils';

const TOKEN_NOW = CHART_SERIES[1];
const TOKEN_SELECTED = CHART_SERIES[0];
const TOKEN_ON_HAND = CHART_SERIES[4];
const TOKEN_CAPACITY = CHART_SEMANTIC.danger;
const TOKEN_STANDARD = CHART_SEMANTIC.warning;

/**
 * The warehouse fill chart: the fill now, after the selected proposals, and of
 * the stock already on hand, against the capacity and standard lines.
 * @type {React.FC<{ w: WarehouseRescheduleView; selected: readonly number[] }>}
 */
const FillChart = ({ w, selected }) => {
  const { t } = useTranslation();
  const data = w.weeks.map((wk, i) => ({
    week: weekLabel(wk.weekStart),
    now: Math.round(wk.fill * 1000) / 10,
    selected: Math.round(selected[i] * 1000) / 10,
    onHand: Math.round(wk.onHandFill * 1000) / 10
  }));
  const top = Math.max(120, ...data.map((d) => d.now));
  return (
    <div className="h-64" data-testid="rs-fill-chart">
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
          <ReferenceLine y={100} stroke={TOKEN_CAPACITY} strokeDasharray="4 2" />
          <ReferenceLine y={STANDARD * 100} stroke={TOKEN_STANDARD} strokeDasharray="4 2" />
          <Line
            type="monotone"
            dataKey="now"
            name={t('rs.fill.series.now')}
            stroke={TOKEN_NOW}
            strokeDasharray="5 3"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="selected"
            name={t('rs.fill.series.selected')}
            stroke={TOKEN_SELECTED}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="onHand"
            name={t('rs.fill.series.onHand')}
            stroke={TOKEN_ON_HAND}
            strokeDasharray="2 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FillChart;
