/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import WeekGrid from '@components/ui-v2/WeekGrid';
import TermLabel from '@components/ui-v2/TermLabel';
import { CollapsedSection } from '@components/forecast/AboutThisPage';
/** @import { WarehouseRescheduleView } from '@services/data/types' */
/** @import { SelectionEffect } from '@services/engine/reschedule' */
import { STANDARD } from '../const';
import { pct } from '../utils';
import FillChart from './FillChart';

// ─────────────────────────────────────────────────────────────────────────────
// The fill section, the whole of the "Warehouse fill" tab (P-12), so it opens
// shown: the chart, then the weeks as columns of the shared `WeekGrid` — the
// fill now, after the selection, after every relief proposal, the fill from
// stock on hand, and each week's status against capacity and the standard.
//
// CAP-1 wave 2 (Table E) — metrics per row, weeks per column (BR-02), sticky
// labels, sideways scroll inside the card (BR-07). Every figure and pill is
// the one the week rows showed (AC-05); the grid computes nothing.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'within' | 'above' | 'over' | 'onHand'} FillState */

/**
 * CAP-2 BR-03 — a status row combines by its worst week: both red states rank
 * above "above standard", which ranks above "within".
 * @param {string} state
 * @returns {number}
 */
const fillSeverity = (state) =>
  state === 'over' || state === 'onHand' ? 2 : state === 'above' ? 1 : 0;

/** @type {React.FC<{ state: FillState }>} */
const FillStatePill = ({ state }) => {
  const { t } = useTranslation();
  return (
    <StatusPill variant={state === 'within' ? 'success' : state === 'above' ? 'warning' : 'danger'}>
      {t(`rs.fill.status.${state}`)}
    </StatusPill>
  );
};

/**
 * @type {React.FC<{ w: WarehouseRescheduleView; effect: SelectionEffect; asOf: string | undefined }>}
 */
const FillSection = ({ w, effect, asOf }) => {
  const { t } = useTranslation();
  /**
   * The week's status, in the order the week row read it: the pallets on hand
   * come first, then the selected fill against capacity and the standard.
   * @param {number} i
   * @returns {FillState}
   */
  const stateOf = (i) =>
    w.weeks[i].onHandOverPallets > 0
      ? 'onHand'
      : effect.fill[i] > 1
        ? 'over'
        : effect.fill[i] > STANDARD
          ? 'above'
          : 'within';
  return (
    <CollapsedSection
      title={t('rs.fill.title')}
      testId="rs-fill"
      defaultOpen
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
    >
      <p className="text-xs text-text-secondary mt-3 mb-1" data-testid="rs-fill-basis">
        {t('rs.fill.basis')}
      </p>
      <p className="text-xs text-text-tertiary mb-3">{t('rs.fill.intro')}</p>
      <FillChart w={w} selected={effect.fill} />
      <WeekGrid
        label={t('rs.fill.title')}
        corner={t('rs.fill.col.week')}
        currentWeek={asOf}
        testId="rs-fill-weeks"
        viewKey="buyerReschedule"
        weeks={w.weeks.map((wk) => ({ week: wk.weekStart, testId: `rs-week-${wk.weekStart}` }))}
        rows={[
          {
            id: 'fillNow',
            label: <TermLabel term="fillNow" />,
            combine: 'last',
            value: (_week, i) => w.weeks[i].fill,
            format: pct,
            cell: (_week, i) => (
              <Data data-testid={`rs-fill-now-${w.weeks[i].weekStart}`}>
                {pct(w.weeks[i].fill)}
              </Data>
            )
          },
          {
            id: 'fillSelected',
            label: <TermLabel term="fillWithSelection" />,
            combine: 'last',
            value: (_week, i) => effect.fill[i],
            format: pct,
            cell: (_week, i) => (
              <Data data-testid={`rs-fill-selected-${w.weeks[i].weekStart}`}>
                {pct(effect.fill[i])}
              </Data>
            )
          },
          {
            id: 'fillRelief',
            label: <TermLabel term="fillWithAll" />,
            combine: 'last',
            value: (_week, i) => w.weeks[i].fillAfterRelief,
            format: pct,
            cell: (_week, i) => (
              <Data
                className="text-text-secondary"
                data-testid={`rs-fill-relief-${w.weeks[i].weekStart}`}
              >
                {pct(w.weeks[i].fillAfterRelief)}
              </Data>
            )
          },
          {
            id: 'fillOnHand',
            label: <TermLabel term="fillOnHand" />,
            combine: 'last',
            value: (_week, i) => w.weeks[i].onHandFill,
            format: pct,
            cell: (_week, i) => (
              <Data
                className="text-text-secondary"
                data-testid={`rs-fill-onhand-${w.weeks[i].weekStart}`}
              >
                {pct(w.weeks[i].onHandFill)}
              </Data>
            )
          },
          {
            id: 'fillStatus',
            label: <TermLabel term="fillStatus" />,
            align: 'start',
            combine: 'status',
            value: (_week, i) => stateOf(i),
            severity: fillSeverity,
            monthCell: (/** @type {string} */ state) => (
              <FillStatePill state={/** @type {FillState} */ (state)} />
            ),
            cell: (_week, i) => (
              <span data-testid={`rs-fill-status-${w.weeks[i].weekStart}`}>
                <FillStatePill state={stateOf(i)} />
              </span>
            )
          }
        ]}
      />
    </CollapsedSection>
  );
};

export default FillSection;
