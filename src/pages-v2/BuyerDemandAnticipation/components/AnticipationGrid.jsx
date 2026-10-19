/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import WeekGrid from '@components/ui-v2/WeekGrid';
import { formatDate, formatNumber } from '@lib/format';
/** @import { DemandAnticipationRow, DemandAnticipationWeekView } from '@services/transitions/demandAnticipationRules' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */
import { signedDelta, weekLabel } from '../display';
import { supplyRows } from './supplyRows';
import { consumptionRows } from '../consumptionRows';
import { ltpFgDemandRows } from './ltpFgDemandRows';

// ─────────────────────────────────────────────────────────────────────────────
// DRC-2 (BL-188) — one supplier × material's weeks as columns (CAP-1 WeekGrid).
//
// Rows: LTP; the DRC-18 rows (FG demand, LTP − FG demand, consumption
// average); Safety order (week 1 [Default A1]); Carried in (remainders earlier
// planning weeks moved here, with the week they came from); Demand
// anticipation (the figure in force over the horizon: published, or today's);
// Would be (today's recomputation beside a published figure, read only);
// Absorbed (DRC-4 BR-02: the surplus the horizon's last week took); Recorded
// consumption (CAP-11, kept); Open supply and Gap (CAP-12, reading the rolling
// figure). Weeks in the horizon carry a marker in their header: "Published"
// when the planning week's publication holds them, "Horizon" otherwise.
// No figure is computed here; every number is the read's.
// ─────────────────────────────────────────────────────────────────────────────

const dash = <span className="text-text-tertiary">—</span>;

/**
 * @type {React.FC<{ row: DemandAnticipationRow; rowKey: string; currentWeek: string }>}
 */
const AnticipationGrid = ({ row, rowKey, currentWeek }) => {
  const { t } = useTranslation();
  /** @param {string} week */
  const weekOf = (week) =>
    /** @type {DemandAnticipationWeekView} */ (row.weeks.find((w) => w.week === week));

  /** @type {WeekGridRow[]} */
  const rows = [
    {
      id: 'ltp',
      label: t('demandAnt.row.ltp'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => weekOf(week).inputs.ltp,
      cell: (week) => (
        <Data data-testid={`dant-ltp-${rowKey}-${week}`}>
          {formatNumber(weekOf(week).inputs.ltp)}
        </Data>
      )
    },
    // DRC-18 (BL-203) — FG demand, LTP − FG demand, consumption 13-week average (read only).
    ...ltpFgDemandRows(row, rowKey, t),
    {
      id: 'safety',
      label: t('demandAnt.row.safety'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => weekOf(week).inputs.safety,
      cell: (week) => {
        const v = weekOf(week).inputs.safety;
        return v === 0 ? (
          dash
        ) : (
          <Data data-testid={`dant-safety-${rowKey}-${week}`}>{formatNumber(v)}</Data>
        );
      }
    },
    {
      id: 'carriedIn',
      label: t('demandAnt.row.carriedIn'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => weekOf(week).inputs.carriedIn.reduce((n, c) => n + c.qty, 0),
      cell: (week) => {
        const parts = weekOf(week).inputs.carriedIn;
        if (parts.length === 0) return dash;
        return (
          <Data
            data-testid={`dant-carried-${rowKey}-${week}`}
            title={parts
              .map((c) =>
                t('demandAnt.row.carriedFrom', {
                  qty: formatNumber(c.qty),
                  week: weekLabel(c.fromWeek)
                })
              )
              .join(' · ')}
          >
            {formatNumber(parts.reduce((n, c) => n + c.qty, 0))}
          </Data>
        );
      }
    },
    {
      id: 'figure',
      label: t('demandAnt.row.figure'),
      unit: row.uom,
      emphasis: true,
      combine: 'sum',
      value: (week) => weekOf(week).qty ?? 0,
      cell: (week) => {
        const w = weekOf(week);
        if (w.qty === null) return dash;
        if (w.published === null || w.publishedBy === null)
          return <Data data-testid={`dant-figure-${rowKey}-${week}`}>{formatNumber(w.qty)}</Data>;
        return (
          <Data
            className="font-semibold"
            data-testid={`dant-figure-${rowKey}-${week}`}
            data-published="true"
            title={t('demandAnt.publishedParts', {
              date: formatDate(w.publishedBy.publishedAt),
              ltp: formatNumber(w.inputs.ltp),
              safety: formatNumber(w.inputs.safety),
              carried: formatNumber(w.inputs.carriedIn.reduce((n, c) => n + c.qty, 0))
            })}
          >
            {formatNumber(w.qty)}
          </Data>
        );
      }
    },
    {
      id: 'wouldBe',
      label: t('demandAnt.row.wouldBe'),
      unit: row.uom,
      cell: (week) => {
        const w = weekOf(week);
        if (w.published === null || w.wouldBe === null || w.delta === null) return dash;
        const delta = signedDelta(w.delta);
        return (
          <span
            className="text-xs text-text-secondary whitespace-nowrap"
            data-testid={`dant-wouldbe-${rowKey}-${week}`}
          >
            <Data className="text-text-secondary">{formatNumber(w.wouldBe)}</Data>{' '}
            {delta === null ? (
              `(${t('demandAnt.noChange')})`
            ) : (
              <Data className="text-text-secondary">{`(${delta})`}</Data>
            )}
          </span>
        );
      }
    },
    {
      id: 'absorbed',
      label: t('demandAnt.row.absorbed'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => weekOf(week).absorbed,
      cell: (week) => {
        const v = weekOf(week).absorbed;
        if (v === 0) return dash;
        return (
          <span
            className="text-xs text-text-secondary"
            data-testid={`dant-absorbed-${rowKey}-${week}`}
          >
            {t('demandAnt.row.absorbedCell', { qty: formatNumber(v) })}
          </span>
        );
      }
    },
    ...consumptionRows(row, rowKey, weekOf, t),
    ...supplyRows(row, rowKey, t)
  ];

  return (
    <WeekGrid
      label={`${row.supplierName} · ${row.materialCode}`}
      corner={t('demandAnt.grid.corner')}
      currentWeek={currentWeek}
      testId={`dant-grid-${rowKey}`}
      viewKey="buyerDemandAnticipation"
      weeks={row.weeks.map((w) => ({
        week: w.week,
        testId: `dant-week-${rowKey}-${w.week}`,
        headerAttrs: {
          'data-in-horizon': w.inHorizon ? 'true' : undefined,
          'data-published': w.published !== null ? 'true' : undefined
        },
        marker: w.inHorizon ? (
          <StatusPill variant="neutral">
            {w.published !== null ? t('demandAnt.published') : t('demandAnt.horizon')}
          </StatusPill>
        ) : undefined
      }))}
      rows={rows}
    />
  );
};

export default AnticipationGrid;
