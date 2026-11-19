/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import WeekGrid from '@components/ui-v2/WeekGrid';
import TermLabel from '@components/ui-v2/TermLabel';
import { formatIDR, formatNumber } from '@lib/format';
/** @import { WarehousePlanView } from '@services/data/types' */
import { STANDARD } from '../const';
import { pct } from '../utils';

// ─────────────────────────────────────────────────────────────────────────────
// The weekly fill table under the chart: per week the fill and pallets under
// this plan, the interim and lowest fills, a status against capacity and the
// 80% standard, the rented pallets (and any beyond the administrator's cap)
// and the rent they cost.
//
// CAP-1 wave 2 (Table F) — the weeks are columns of the shared `WeekGrid` and
// the six metrics are rows (BR-02), oldest week on the left. Every figure and
// pill is the one the week rows showed (AC-05); the grid computes nothing.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'within' | 'above' | 'over'} FillState */

/**
 * CAP-2 BR-03 — a status row combines by its worst week.
 * @param {string} state
 * @returns {number}
 */
const fillSeverity = (state) => (state === 'over' ? 2 : state === 'above' ? 1 : 0);

/** @type {React.FC<{ state: FillState }>} */
const FillStatePill = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusPill variant={state === 'over' ? 'danger' : state === 'above' ? 'warning' : 'success'}>
      {t(`op.fill.status.${state}`)}
    </StatusPill>
  );
};

/**
 * @type {React.FC<{ w: WarehousePlanView; asOf: string | undefined }>}
 */
const FillTable = ({ w, asOf }) => {
  const { t } = useTranslation();
  /**
   * The week's status against capacity and the 80% standard, as the week row
   * read it; null when the week has no fill figure.
   * @param {number} i
   * @returns {FillState | null}
   */
  const stateOf = (i) => {
    const fill = w.weeks[i].fill;
    if (fill === null) return null;
    return fill > 1 ? 'over' : fill > STANDARD ? 'above' : 'within';
  };
  /** @param {number} n */
  const pallets = (n) => formatNumber(Math.round(n));
  return (
    <WeekGrid
      label={t('op.fill.title')}
      corner={t('op.fill.col.week')}
      currentWeek={asOf}
      testId="op-fill-weeks"
      viewKey="buyerOrderPlan"
      weeks={w.weeks.map((wk) => ({ week: wk.weekStart, testId: `op-fill-${wk.weekStart}` }))}
      rows={[
        {
          id: 'fillPlan',
          label: <TermLabel term="fillOrderPlan" />,
          combine: 'last',
          value: (_week, i) => w.weeks[i].fill,
          format: pct,
          // CAP-2 BR-03 — the month's last week, with the pallets it holds.
          monthCell: (/** @type {number | null} */ v, m) => {
            const last = w.weeks.find((wk) => wk.weekStart === m.lastMonday);
            return (
              <>
                <Data>{pct(v)}</Data>
                {last ? (
                  <div className="text-xs text-text-tertiary">
                    <Data>{t('op.warehouse.pallets', { value: pallets(last.pallets) })}</Data>
                  </div>
                ) : null}
              </>
            );
          },
          cell: (_week, i) => {
            const wk = w.weeks[i];
            return (
              <>
                <Data data-testid={`op-fill-plan-${wk.weekStart}`}>{pct(wk.fill)}</Data>
                <div className="text-xs text-text-tertiary">
                  <Data>{t('op.warehouse.pallets', { value: pallets(wk.pallets) })}</Data>
                </div>
              </>
            );
          }
        },
        {
          id: 'fillInterim',
          label: <TermLabel term="fillInterim" />,
          combine: 'last',
          value: (_week, i) => w.weeks[i].interimFill,
          format: pct,
          cell: (_week, i) => (
            <Data
              className="text-text-secondary"
              data-testid={`op-fill-interim-${w.weeks[i].weekStart}`}
            >
              {pct(w.weeks[i].interimFill)}
            </Data>
          )
        },
        {
          id: 'fillLowest',
          label: <TermLabel term="fillLowest" />,
          combine: 'min',
          value: (_week, i) => w.weeks[i].lowestFill,
          format: pct,
          cell: (_week, i) => (
            <Data
              className="text-text-secondary"
              data-testid={`op-fill-lowest-${w.weeks[i].weekStart}`}
            >
              {pct(w.weeks[i].lowestFill)}
            </Data>
          )
        },
        {
          id: 'fillStatus',
          label: <TermLabel term="fillAgainst80" />,
          align: 'start',
          combine: 'status',
          value: (_week, i) => stateOf(i),
          severity: fillSeverity,
          monthCell: (/** @type {string} */ state) => (
            <FillStatePill state={/** @type {FillState} */ (state)} />
          ),
          cell: (_week, i) => {
            const state = stateOf(i);
            return state ? (
              <span data-testid={`op-fill-status-${w.weeks[i].weekStart}`}>
                <FillStatePill state={state} />
              </span>
            ) : null;
          }
        },
        {
          id: 'fillRented',
          label: <TermLabel term="fillRented" />,
          combine: 'sum',
          value: (_week, i) => w.weeks[i].rentedPallets,
          format: pallets,
          cell: (_week, i) => {
            const wk = w.weeks[i];
            return (
              <>
                <Data data-testid={`op-rented-${wk.weekStart}`}>
                  {formatNumber(Math.round(wk.rentedPallets))}
                </Data>
                {wk.beyondCapPallets > 0 && (
                  <div className="text-xs text-danger" data-testid={`op-beyond-${wk.weekStart}`}>
                    {t('op.fill.beyondCap', {
                      value: formatNumber(Math.round(wk.beyondCapPallets))
                    })}
                  </div>
                )}
              </>
            );
          }
        },
        {
          id: 'rentCost',
          label: <TermLabel term="rentCost" />,
          combine: 'sum',
          value: (_week, i) => w.weeks[i].rentIdr,
          format: (/** @type {number} */ n) => formatIDR(Math.round(n)),
          cell: (_week, i) => (
            <Data data-testid={`op-rent-${w.weeks[i].weekStart}`}>
              {formatIDR(Math.round(w.weeks[i].rentIdr))}
            </Data>
          )
        }
      ]}
    />
  );
};

export default FillTable;
