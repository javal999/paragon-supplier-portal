import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import KpiCard from '../../components/ui-v2/KpiCard';
import StatusPill from '../../components/ui-v2/StatusPill';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import { formatDate, formatNumber } from '../../lib/format';
import type { DemandRangeRun, RangeExperience, SeriesRange } from '../../services/engine/demandRange';

// ─────────────────────────────────────────────────────────────────────────────
// DEMAND RANGE — REQ-E14-09 on the Demand forecast page (BL-111). Experience:
// "P50 and P90 per SKU and material, and how often actual sales have fallen
// outside the range"; AC-02 "the recent share of weeks above P90 for each
// group". Read-only, planner only; every figure is the service's own. One
// forecast week is shown at a time (a range does not add up over weeks).
// ─────────────────────────────────────────────────────────────────────────────

/** A share as a percentage with one decimal, or null with nothing checked. */
export const sharePct = (part: number, whole: number): string | null =>
  whole > 0 ? `${formatNumber(Math.round((part / whole) * 1000) / 10)}%` : null;

const levelPct = (u: number) => Math.round(u * 100);
const idxOf = (levels: readonly number[], u: number) => levels.findIndex((l) => Math.abs(l - u) < 1e-9);

/** P90 above P50 for one week, as a percentage of P50. */
const widthAt = (s: SeriesRange, levels: readonly number[], i: number): string => {
  const p50 = s.bands[idxOf(levels, 0.5)]?.values[i];
  const p90 = s.bands[idxOf(levels, 0.9)]?.values[i];
  if (p50 === null || p50 === undefined || p90 === null || p90 === undefined || p50 <= 0) return '—';
  return `+${formatNumber(Math.round(((p90 - p50) / p50) * 1000) / 10)}%`;
};

const Above: React.FC<{ e: RangeExperience; p90: number; testId: string }> = ({ e, p90, testId }) => {
  const { t } = useTranslation();
  const share = sharePct(e.above[p90], e.checked);
  return (
    <span data-testid={testId} className="whitespace-nowrap">
      {share === null ? (
        <span className="text-xs text-text-tertiary">{t('df.range.noChecks')}</span>
      ) : (
        <Data>{t('df.range.above', { share, checked: formatNumber(e.checked) })}</Data>
      )}
    </span>
  );
};

const Values: React.FC<{ s: SeriesRange; i: number; prefix: string }> = ({ s, i, prefix }) => (
  <>
    {s.bands.map((b) => (
      <TableCell key={b.level}>
        <Data data-testid={`${prefix}-p${levelPct(b.level)}`}>{b.values[i] === null ? '—' : formatNumber(b.values[i]!)}</Data>
      </TableCell>
    ))}
  </>
);

const DemandRangeSection: React.FC<{ range: DemandRangeRun }> = ({ range }) => {
  const { t } = useTranslation();
  const [week, setWeek] = useState(0);
  const levels = range.levels;
  const p90 = idxOf(levels, 0.9);
  const p50 = idxOf(levels, 0.5);
  const all = range.skuExperience.find((x) => x.key === 'total')!.experience;
  const totalP50 = range.total.bands[p50].values.reduce<number>((a, v) => a + (v ?? 0), 0);
  const totalP90 = range.total.bands[p90].values.reduce<number>((a, v) => a + (v ?? 0), 0);
  const pHeads = levels.map((u) => <TableHeaderCell key={u}>{t('df.range.col.p', { level: levelPct(u) })}</TableHeaderCell>);

  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="df-range">
      <h2 className="text-section text-text-primary mb-1">{t('df.range.title')}</h2>
      <p className="text-xs text-text-tertiary mb-1">{t('df.range.intro', { retrain: range.options.retrainWeeks })}</p>
      {range.origins.first && range.origins.last && (
        <p className="text-xs text-text-tertiary mb-1" data-testid="df-range-replay">
          {t('df.range.replay', { count: range.origins.count, first: formatDate(range.origins.first), last: formatDate(range.origins.last) })}
        </p>
      )}
      <p className="text-xs text-text-secondary mb-4" data-testid="df-range-not-published">
        {t('df.range.notPublished')}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5" data-testid="df-range-kpis">
        <KpiCard
          eyebrow={t('df.range.kpi.aboveP90')}
          value={<span data-testid="df-range-kpi-p90">{sharePct(all.above[p90], all.checked) ?? '—'}</span>}
          subtitle={<span className="text-text-tertiary">{t('df.range.kpi.aboveP90.sub', { checked: formatNumber(all.checked) })}</span>}
        />
        <KpiCard
          eyebrow={t('df.range.kpi.aboveP50')}
          value={<span data-testid="df-range-kpi-p50">{sharePct(all.above[p50], all.checked) ?? '—'}</span>}
          subtitle={<span className="text-text-tertiary">{t('df.range.kpi.aboveP50.sub')}</span>}
        />
        <KpiCard
          eyebrow={t('df.range.kpi.uncorrected')}
          value={<span data-testid="df-range-kpi-uncorrected">{sharePct(all.aboveUncorrected[p90], all.checked) ?? '—'}</span>}
          subtitle={<span className="text-text-tertiary">{t('df.range.kpi.uncorrected.sub')}</span>}
        />
        <KpiCard
          eyebrow={t('df.range.kpi.width')}
          value={<span data-testid="df-range-kpi-width">{totalP50 > 0 ? `+${formatNumber(Math.round(((totalP90 - totalP50) / totalP50) * 1000) / 10)}%` : '—'}</span>}
          subtitle={<span className="text-text-tertiary">{t('df.range.kpi.width.sub', { weeks: range.weeks.length })}</span>}
        />
      </div>

      <div className="mb-4 max-w-xs">
        <label htmlFor="df-range-week" className="block text-label text-text-tertiary uppercase mb-1">
          {t('df.range.week')}
        </label>
        <select
          id="df-range-week"
          className="w-full px-3 py-2 text-sm font-mono text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action"
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          data-testid="df-range-week"
        >
          {range.weeks.map((w, i) => (
            <option key={w} value={i}>
              {formatDate(w)}
            </option>
          ))}
        </select>
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-1">{t('df.range.levels.title')}</h3>
      <p className="text-xs text-text-tertiary mb-2">{t('df.range.levels.intro')}</p>
      <div className="overflow-x-auto mb-5">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('df.range.col.level')}</TableHeaderCell>
            <TableHeaderCell>{t('df.range.col.forecast')}</TableHeaderCell>
            {pHeads}
            <TableHeaderCell>{t('df.range.col.width')}</TableHeaderCell>
            <TableHeaderCell>{t('df.range.col.above')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {[range.total, ...range.brands].map((l) => (
              <TableRow key={l.key} data-testid={`df-range-level-${l.key}`}>
                <TableCell className="text-sm text-text-primary">{l.key === 'total' ? t('df.levels.total') : l.key}</TableCell>
                <TableCell>
                  <Data>{formatNumber(l.forecast[week])}</Data>
                </TableCell>
                <Values s={l} i={week} prefix={`df-range-level-${l.key}`} />
                <TableCell>
                  <Data>{widthAt(l, levels, week)}</Data>
                </TableCell>
                <TableCell>
                  <Above e={l.experience} p90={p90} testId={`df-range-level-above-${l.key}`} />
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-1">{t('df.range.skus.title')}</h3>
      <p className="text-xs text-text-tertiary mb-2">{t('df.range.skus.intro')}</p>
      <div className="overflow-x-auto mb-5">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('df.range.col.sku')}</TableHeaderCell>
            <TableHeaderCell>{t('df.range.col.source')}</TableHeaderCell>
            <TableHeaderCell>{t('df.range.col.forecast')}</TableHeaderCell>
            {pHeads}
            <TableHeaderCell>{t('df.range.col.width')}</TableHeaderCell>
            <TableHeaderCell>{t('df.range.col.above')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {range.skus.map((s) => {
              const src = s.source[week];
              return (
                <TableRow key={s.key} data-testid={`df-range-sku-${s.key}`}>
                  <TableCell>
                    <Data>{s.key}</Data>
                    <div className="text-xs text-text-secondary">{s.brand}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span data-testid={`df-range-sku-source-${s.key}`}>
                      <StatusPill variant={src === 'own' ? 'neutral' : 'warning'}>
                        {src === 'none' ? t('df.range.source.none') : t(`df.range.source.${s.basis}.${src}`)}
                      </StatusPill>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Data>{formatNumber(s.forecast[week])}</Data>
                  </TableCell>
                  <Values s={s} i={week} prefix={`df-range-sku-${s.key}`} />
                  <TableCell>
                    <Data>{widthAt(s, levels, week)}</Data>
                  </TableCell>
                  <TableCell>
                    <Above e={s.experience} p90={p90} testId={`df-range-sku-above-${s.key}`} />
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-1">{t('df.range.materials.title')}</h3>
      <p className="text-xs text-text-tertiary mb-2">{t('df.range.materials.intro')}</p>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('df.range.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('df.range.col.source')}</TableHeaderCell>
            <TableHeaderCell>{t('df.range.col.need')}</TableHeaderCell>
            {pHeads}
            <TableHeaderCell>{t('df.range.col.width')}</TableHeaderCell>
            <TableHeaderCell>{t('df.range.col.above')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {range.materials.map((m) => {
              const src = m.source[week];
              return (
                <TableRow key={m.key} data-testid={`df-range-mat-${m.key}`}>
                  <TableCell>
                    <Data>{m.key}</Data>
                    <div className="text-xs text-text-secondary">
                      {t(`df.range.kind.${m.kind}`)} · <Data>{m.uom}</Data>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusPill variant={src === 'own' ? 'neutral' : 'warning'}>
                      {src === 'none' ? t('df.range.source.none') : t(`df.range.source.material.${src}`)}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <Data>{formatNumber(m.forecast[week])}</Data>
                  </TableCell>
                  <Values s={m} i={week} prefix={`df-range-mat-${m.key}`} />
                  <TableCell>
                    <Data>{widthAt(m, levels, week)}</Data>
                  </TableCell>
                  <TableCell>
                    <Above e={m.experience} p90={p90} testId={`df-range-mat-above-${m.key}`} />
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

export default DemandRangeSection;
