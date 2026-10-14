/** @import React from 'react' */
/** @import { Commodity } from '@services/data/types' */
import { useTranslation } from 'react-i18next';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import CommoditySparkTooltip from './CommoditySparkTooltip';

/**
 * The "Commodity prices" tab body: one card per commodity (current price, YTD
 * change, sparkline, alert threshold) and the impact-alerts list below.
 *
 * Props: `commodities` (the fixture rows from `useCommodities`).
 * @type {React.FC<{ commodities: Commodity[] }>}
 */
const CommodityTab = ({ commodities }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* i18n-defer: mock/sample data — commodity name/unit seeded from fixtures */}
        {commodities.map((c) => {
          const up = c.change > 0;
          const breached = c.alertDir === 'above' && c.current >= c.alert;
          return (
            <div
              key={c.name}
              className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5"
              style={{ borderLeft: `4px solid ${c.color}` }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-text-primary">{c.name}</div>
                  <div className="text-xs text-text-tertiary">{c.unit}</div>
                </div>
                <div className="text-right shrink-0">
                  <Data as="div" className="text-kpi" style={{ color: c.color }}>
                    {c.current > 1000 ? c.current.toLocaleString() : c.current}
                  </Data>
                  <div className={`text-xs font-semibold ${up ? 'text-danger' : 'text-success'}`}>
                    {up ? (
                      <TrendingUp size={12} className="inline-block mr-1" />
                    ) : (
                      <TrendingDown size={12} className="inline-block mr-1" />
                    )}
                    {t('risk.commodity.ytd', { pct: Math.abs(c.change) })}
                  </div>
                </div>
              </div>
              <div className="h-14 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={c.spark} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={c.color}
                      dot={false}
                      strokeWidth={2}
                    />
                    <Tooltip content={<CommoditySparkTooltip unit={c.unit} name={c.name} />} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-tertiary">
                  {t('risk.commodity.alertIf', {
                    dir:
                      c.alertDir === 'above'
                        ? t('risk.commodity.dirAbove')
                        : t('risk.commodity.dirBelow')
                  })}
                </span>
                <span className="font-bold" style={{ color: c.color }}>
                  {c.alert > 1000 ? c.alert.toLocaleString() : c.alert} {c.unit}
                </span>
                <span className="ml-auto">
                  {breached ? (
                    <span className="text-danger font-semibold">
                      {t('risk.commodity.thresholdBreached')}
                    </span>
                  ) : (
                    <span className="text-success font-semibold">
                      {t('risk.commodity.withinRange')}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <div className="text-sm font-semibold text-text-primary mb-3">
          {t('risk.commodity.impactAlertsTitle')}
        </div>
        <div className="flex flex-col gap-1.5">
          {commodities.map((c) => {
            const over = c.alertDir === 'above' && c.current >= c.alert;
            return (
              <div key={c.name} className="flex items-center gap-2 text-sm text-text-secondary">
                <span className={over ? 'text-danger font-bold' : 'text-success font-bold'}>
                  {over ? '⚠' : '✓'}
                </span>
                <span className="font-semibold text-text-primary">{c.name}</span>
                <span className="text-text-tertiary">—</span>
                <span className={over ? 'text-danger' : 'text-text-secondary'}>
                  {over
                    ? t('risk.commodity.alertTriggered', {
                        current: c.current,
                        threshold: c.alert
                      })
                    : t('risk.commodity.withinThreshold', {
                        current: c.current,
                        threshold: c.alert,
                        unit: c.unit
                      })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommodityTab;
