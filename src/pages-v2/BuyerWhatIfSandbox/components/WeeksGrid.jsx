// ─────────────────────────────────────────────────────────────────────────────
// DRC-17 BR-02 / BR-03 (BL-202) — the horizon week by week in the hub's
// WeekGrid: LTP (editable), demand anticipation of the current plan and of the
// scenario, the call-offs the trigger drafts, what arrives, the PR it
// recommends, and projected SOH of both. A shortage week is tinted (G-08); a
// festive week (where the uplift applies) is marked in its header (G-09).
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */
/** @import { WhatIfInputs, WhatIfRun } from '@services/transitions/whatIfSandboxRules' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import WeekGrid from '@components/ui-v2/WeekGrid';
import { formatNumber } from '@lib/format';
import { weekLabel } from '../../BuyerDemandAnticipation/display';
import { Section } from '../display';

const DASH = <span className="text-text-tertiary">—</span>;

/**
 * @param {number | null} n
 * @param {string} [testId]
 */
const num = (n, testId) =>
  n === null ? DASH : <Data data-testid={testId}>{formatNumber(n)}</Data>;

/**
 * @type {React.FC<{
 *   inputs: WhatIfInputs;
 *   onLtp: (index: number, value: number) => void;
 *   plan: WhatIfRun;
 *   run: WhatIfRun;
 *   uom: string;
 * }>}
 */
const WeeksGrid = ({ inputs, onLtp, plan, run, uom }) => {
  const { t } = useTranslation();
  /** @type {WeekGridRow[]} */
  const rows = [
    {
      id: 'ltp',
      label: t('whatIf.grid.ltp'),
      unit: uom,
      combine: 'sum',
      value: (_, i) => inputs.ltp[i],
      cell: (week, i) => (
        <input
          type="number"
          min="0"
          className="w-24 text-right border border-border-subtle rounded px-1 py-0.5 text-sm"
          aria-label={t('whatIf.grid.ltpCell', { week: weekLabel(week) })}
          data-testid={`wi-ltp-${week}`}
          value={inputs.ltp[i]}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value !== '' && Number.isFinite(n) && n >= 0) onLtp(i, n);
          }}
        />
      )
    },
    {
      id: 'daPlan',
      label: t('whatIf.grid.daPlan'),
      unit: uom,
      combine: 'sum',
      value: (_, i) => plan.weeks[i]?.da ?? 0,
      cell: (_, i) => num(plan.weeks[i]?.da ?? null)
    },
    {
      id: 'da',
      label: t('whatIf.grid.da'),
      unit: uom,
      emphasis: true,
      combine: 'sum',
      value: (_, i) => run.weeks[i].da ?? 0,
      cell: (week, i) => num(run.weeks[i].da, `wi-da-${week}`)
    },
    {
      id: 'drafted',
      label: t('whatIf.grid.drafted'),
      unit: uom,
      combine: 'sum',
      value: (_, i) => run.weeks[i].drafted,
      cell: (week, i) =>
        run.weeks[i].drafted === 0 ? DASH : num(run.weeks[i].drafted, `wi-drafted-${week}`)
    },
    {
      id: 'incoming',
      label: t('whatIf.grid.incoming'),
      unit: uom,
      combine: 'sum',
      value: (_, i) => run.weeks[i].incoming,
      cell: (_, i) => (run.weeks[i].incoming === 0 ? DASH : num(run.weeks[i].incoming))
    },
    {
      id: 'prQty',
      label: t('whatIf.grid.prQty'),
      unit: uom,
      combine: 'sum',
      value: (_, i) => run.weeks[i].prQty,
      cell: (_, i) => (run.weeks[i].prQty === 0 ? DASH : num(run.weeks[i].prQty))
    },
    {
      id: 'sohPlan',
      label: t('whatIf.grid.sohPlan'),
      unit: uom,
      cell: (_, i) => num(plan.weeks[i]?.soh ?? null)
    },
    {
      id: 'soh',
      label: t('whatIf.grid.soh'),
      unit: uom,
      emphasis: true,
      cell: (week, i) => num(run.weeks[i].soh, `wi-soh-${week}`)
    }
  ];
  return (
    <Section title={t('whatIf.section.weeks')} testId="wi-weeks">
      <WeekGrid
        label={t('whatIf.section.weeks')}
        corner={t('whatIf.grid.week')}
        currentWeek={inputs.planningWeek}
        testId="wi-grid"
        viewKey="buyerWhatIfSandbox"
        editable
        weeks={run.weeks.map((w) => ({
          week: w.week,
          gap: w.shortage,
          testId: `wi-week-${w.week}`,
          ...(inputs.festiveWeeks.includes(w.week)
            ? {
                marker: (
                  <span className="text-xs text-text-tertiary">{t('whatIf.grid.festive')}</span>
                )
              }
            : {})
        }))}
        rows={rows}
      />
    </Section>
  );
};

export default WeeksGrid;
