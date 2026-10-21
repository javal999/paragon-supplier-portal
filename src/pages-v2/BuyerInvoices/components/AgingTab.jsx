/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Database } from 'lucide-react';
import { CHART_GRID } from '@lib/chartPalette';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import { TOKEN_MUTED, TOKEN_TEAL } from '../const';
import ChartTooltip from './ChartTooltip';
import AgingRow from './AgingRow';

// Declared in the file that `.map()`s it: the module-scope-literal gate keys
// its grandfathered row on `file::CONST` (`grandfathered.js`).
const AGING_DATA = [
  {
    bucket: 'Current',
    amount: 3195,
    count: 3,
    risk: /** @type {const} */ ('success'),
    riskLabel: 'Low'
  },
  {
    bucket: '1–30d',
    amount: 320,
    count: 1,
    risk: /** @type {const} */ ('warning'),
    riskLabel: 'Medium'
  },
  {
    bucket: '31–60d',
    amount: 410,
    count: 1,
    risk: /** @type {const} */ ('danger'),
    riskLabel: 'High'
  },
  {
    bucket: '61–90d',
    amount: 0,
    count: 0,
    risk: /** @type {const} */ ('danger'),
    riskLabel: 'High'
  },
  { bucket: '>90d', amount: 0, count: 0, risk: /** @type {const} */ ('danger'), riskLabel: 'High' }
];

/**
 * @typedef {object} AgingTabProps
 * @property {(bucket: string) => string} agingBucketLabel  The bucket's display label (only
 *   'Current' localizes; the numeric ranges are stable chart keys).
 * @property {TFunction} t
 */

/**
 * The aging tab: the AP aging bar chart, the bucket table and the phase-2
 * note. The figures are fixture data (`AGING_DATA`). Moved out of
 * `BuyerInvoices.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<AgingTabProps>}
 */
const AgingTab = ({ agingBucketLabel, t }) => (
  <div className="flex flex-col gap-5">
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
      <h3 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
        {t('buyerInvoices.aging.reportTitle')}
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={AGING_DATA} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis
            dataKey="bucket"
            tickFormatter={agingBucketLabel}
            tick={{ fontSize: 11, fill: TOKEN_MUTED }}
          />
          <YAxis tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="amount"
            fill={TOKEN_TEAL}
            name={t('buyerInvoices.chart.amount')}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </section>

    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('buyerInvoices.aging.bucket')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('buyerInvoices.aging.count')}</TableHeaderCell>
          <TableHeaderCell className="text-right">
            {t('buyerInvoices.aging.amount')}
          </TableHeaderCell>
          <TableHeaderCell className="text-right">{t('buyerInvoices.aging.pctAp')}</TableHeaderCell>
          <TableHeaderCell>{t('buyerInvoices.aging.risk')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {AGING_DATA.map((row) => {
            const total = AGING_DATA.reduce((a, b) => a + b.amount, 0);
            const pct = total > 0 ? ((row.amount / total) * 100).toFixed(1) : '0.0';
            return (
              <AgingRow key={row.bucket} row={row} pct={pct} agingBucketLabel={agingBucketLabel} />
            );
          })}
        </tbody>
      </Table>
    </div>

    <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
      <Database size={14} className="text-info shrink-0 mt-0.5" />
      <span>
        <strong className="text-info">{t('buyerInvoices.aging.phase2.label')}</strong>{' '}
        {t('buyerInvoices.aging.phase2.body')}
      </span>
    </div>
  </div>
);

export default AgingTab;
