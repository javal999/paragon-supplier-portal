/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_GRID } from '@lib/chartPalette';
import { MONTHLY_SPEND, TOKEN_MUTED, TOKEN_SUCCESS, TOKEN_TEAL } from '../const';
import ChartTooltip from './ChartTooltip';
import MatchTile from './MatchTile';

/**
 * @typedef {object} AnalyticsTabProps
 * @property {{ matched: number; pendingGr: number; qtyMismatch: number; priceVariance: number }} matchCounts
 *   Invoices per 3-way match status (computed by the page).
 * @property {TFunction} t
 */

/**
 * The analytics tab: the monthly payment-flow bar chart (released vs pending,
 * fixture data) and the four 3-way match summary tiles. Moved out of
 * `BuyerInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<AnalyticsTabProps>}
 */
const AnalyticsTab = ({ matchCounts, t }) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
      <h3 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
        {t('buyerInvoices.analytics.monthlyFlow')}
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={MONTHLY_SPEND} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
          <YAxis tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="paid"
            fill={TOKEN_SUCCESS}
            name={t('buyerInvoices.chart.released')}
            radius={[4, 4, 0, 0]}
            stackId="a"
          />
          <Bar
            dataKey="pending"
            fill={TOKEN_TEAL}
            name={t('buyerInvoices.chart.pending')}
            radius={[4, 4, 0, 0]}
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>
    </section>

    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
      <h3 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
        {t('buyerInvoices.analytics.matchSummary')}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <MatchTile
          label={t('buyerInvoices.matchTile.autoMatched')}
          count={matchCounts.matched}
          variant="success"
        />
        <MatchTile
          label={t('buyerInvoices.matchTile.pendingGr')}
          count={matchCounts.pendingGr}
          variant="neutral"
        />
        <MatchTile
          label={t('buyerInvoices.matchTile.qtyMismatch')}
          count={matchCounts.qtyMismatch}
          variant="danger"
        />
        <MatchTile
          label={t('buyerInvoices.matchTile.priceVariance')}
          count={matchCounts.priceVariance}
          variant="danger"
        />
      </div>
    </section>
  </div>
);

export default AnalyticsTab;
