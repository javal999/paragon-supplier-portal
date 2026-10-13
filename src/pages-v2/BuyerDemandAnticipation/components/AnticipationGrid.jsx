/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import WeekGrid from '@components/ui-v2/WeekGrid';
import { formatDate, formatNumber } from '@lib/format';
/** @import { DemandAnticipationRow, DemandAnticipationWeekView } from '@services/transitions/demandAnticipationRules' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */
import { signedDelta } from '../display';
import { consumptionRows } from '../consumptionRows';

// ─────────────────────────────────────────────────────────────────────────────
// CAP-10 — one supplier × material's weeks as columns (CAP-1 WeekGrid).
//
// Rows for step A: LTP, PTI stock share, reorder point share (both counted once,
// in the current week), Demand anticipation (the frozen figure with a lock in a
// frozen week, today's figure otherwise) and Would be (frozen weeks only, read
// only: today's recomputation and its difference, BR-03). A frozen column
// carries a "Frozen" marker in its header.
//
// Later rows, NOT built here: recorded consumption and absorbed (CAP-11), open
// supply and gap (CAP-12). Each is one more entry in `rows` below.
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
  const first = row.weeks[0]?.week;
  /**
   * Stock and reorder point count once, in the current week.
   * @param {string} week
   * @param {'stockShare' | 'ropShare'} field
   */
  const onceValue = (week, field) =>
    week === first ? (weekOf(week).inputs?.[field] ?? null) : null;

  /** @type {WeekGridRow[]} */
  const rows = [
    {
      id: 'ltp',
      label: t('demandAnt.row.ltp'),
      unit: row.uom,
      combine: 'sum',
      value: (week) => weekOf(week).inputs?.ltp ?? 0,
      cell: (week) => {
        const v = weekOf(week).inputs?.ltp;
        return v === undefined ? (
          dash
        ) : (
          <Data data-testid={`dant-ltp-${rowKey}-${week}`}>{formatNumber(v)}</Data>
        );
      }
    },
    ...[
      /** @type {const} */ (['stockShare', 'demandAnt.row.stockShare']),
      /** @type {const} */ (['ropShare', 'demandAnt.row.ropShare'])
    ].map(
      ([field, labelKey]) =>
        /** @type {WeekGridRow} */ ({
          id: field,
          label: t(labelKey),
          unit: row.uom,
          combine: 'sum',
          value: (week) => onceValue(week, field) ?? 0,
          monthNote: t('demandAnt.row.onceNote'),
          cell: (week) => {
            const v = onceValue(week, field);
            return v === null ? (
              dash
            ) : (
              <Data data-testid={`dant-${field}-${rowKey}`}>{formatNumber(v)}</Data>
            );
          }
        })
    ),
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
        if (!w.frozen || w.frozenBy === null)
          return <Data data-testid={`dant-figure-${rowKey}-${week}`}>{formatNumber(w.qty)}</Data>;
        const inputs = w.frozenBy.inputs;
        return (
          <span
            className="inline-flex items-center gap-1"
            data-testid={`dant-figure-${rowKey}-${week}`}
            data-frozen="true"
            title={t('demandAnt.frozenInputs', {
              date: formatDate(w.frozenBy.publishedAt),
              ltp: formatNumber(inputs.ltp),
              stock: formatNumber(inputs.stockShare),
              rop: formatNumber(inputs.ropShare)
            })}
          >
            <Lock size={12} aria-hidden="true" className="text-text-tertiary" />
            <span className="sr-only">{t('demandAnt.frozen')} </span>
            <Data className="font-semibold">{formatNumber(w.qty)}</Data>
          </span>
        );
      }
    },
    {
      id: 'wouldBe',
      label: t('demandAnt.row.wouldBe'),
      unit: row.uom,
      cell: (week) => {
        const w = weekOf(week);
        if (!w.frozen || w.wouldBe === null || w.delta === null) return dash;
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
    ...consumptionRows(row, rowKey, weekOf, t)
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
        headerAttrs: { 'data-frozen': w.frozen ? 'true' : undefined },
        marker: w.frozen ? (
          <StatusPill variant="neutral">
            <span className="inline-flex items-center gap-1">
              <Lock size={10} aria-hidden="true" />
              {t('demandAnt.frozen')}
            </span>
          </StatusPill>
        ) : undefined
      }))}
      rows={rows}
    />
  );
};

export default AnticipationGrid;
