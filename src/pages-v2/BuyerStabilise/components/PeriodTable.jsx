/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import TermLabel from '@components/ui-v2/TermLabel';
import TermTip from '@components/forecast/TermTip';
import WeekGrid from '@components/ui-v2/WeekGrid';
/** @import { StabilisedSeriesView } from '@services/data/types' */
/** @import { PeriodResult } from '@services/engine/stabilise' */
import { qtyOf } from '../../materialPlan/planDisplay';
import { forecastNow } from '../../forecasts/forecastDisplay';
import { RULE_VARIANT } from '../const';
import { qty } from '../utils';

/**
 * CAP-1 wave 3 (Table 8, AC-05) — one series' weeks through the shared
 * `WeekGrid`: the weeks are the columns (PSC-5 BR-01: `W<iso week>` over the
 * Monday) and the eight measures are the rows — the engine's value, the last
 * and first values the supplier saw, the damped value, the allowed range, what
 * would be published and the rule that set it.
 *
 * The Rule row is the table's long text. It is NOT truncated and the row is
 * NOT dropped: each week's cell carries the rule's full pill (the pill wraps,
 * so "Zone Capacity — held at ±10% a version" reads in full at the grid's
 * 112 px column), under it the week's planner reason (wrapped) and the two
 * short flags ("needs a reason", the recommit note). No text leaves the
 * table, and nothing is shortened.
 * @type {React.FC<{ s: StabilisedSeriesView }>}
 */
const PeriodTable = ({ s }) => {
  const { t } = useTranslation();
  const key = `${s.supplierId}-${s.materialCode}`;
  /**
   * The week at a column index; the grid's columns are `s.latest`, in order.
   * @param {number} i
   * @returns {PeriodResult}
   */
  const at = (i) => s.latest[i];
  return (
    <div data-testid={`stb-detail-${key}`}>
      <h3 className="text-sm font-semibold text-text-primary mb-2">
        {t('stb.detail.title', { material: s.materialLabel, supplier: s.supplierName })}
      </h3>
      <WeekGrid
        label={t('stb.detail.title', { material: s.materialLabel, supplier: s.supplierName })}
        corner={t('stb.detail.col.week')}
        currentWeek={forecastNow()}
        testId={`stb-weeks-${key}`}
        viewKey="buyerStabilise"
        weeks={s.latest.map((p) => ({
          week: p.period,
          testId: `stb-week-${key}-${p.period}`
        }))}
        rows={[
          {
            id: 'zone',
            label: (
              <span className="inline-flex flex-wrap items-center gap-1">
                {t('stb.detail.col.zone')} <TermTip term="Zone Liability" />{' '}
                <TermTip term="Zone Capacity" />
              </span>
            ),
            align: 'start',
            combine: 'distinct',
            value: (_week, i) => t(`stb.zone.${at(i).zone}`),
            cell: (_week, i) => t(`stb.zone.${at(i).zone}`)
          },
          {
            id: 'engineValue',
            label: <TermLabel term="engineValue" />,
            unit: s.uom,
            combine: 'sum',
            value: (_week, i) => at(i).raw,
            format: (n) => qty(n, s.uom),
            cell: (_week, i) => (
              <Data data-testid={`stb-raw-${key}-${at(i).period}`}>{qty(at(i).raw, s.uom)}</Data>
            )
          },
          {
            id: 'lastPublished',
            label: <TermLabel term="lastPublished" />,
            unit: s.uom,
            combine: 'sum',
            value: (_week, i) => at(i).previous,
            format: (n) => qty(n, s.uom),
            cell: (_week, i) => (
              <Data className="text-text-secondary">{qty(at(i).previous, s.uom)}</Data>
            )
          },
          {
            id: 'firstPublished',
            label: <TermLabel term="firstPublished" />,
            unit: s.uom,
            combine: 'sum',
            value: (_week, i) => at(i).first,
            format: (n) => qty(n, s.uom),
            cell: (_week, i) => (
              <Data className="text-text-secondary">{qty(at(i).first, s.uom)}</Data>
            )
          },
          {
            id: 'dampedValue',
            label: <TermLabel term="dampedValue" />,
            unit: s.uom,
            combine: 'sum',
            value: (_week, i) => at(i).damped,
            format: (n) => qty(n, s.uom),
            cell: (_week, i) => (
              <Data className="text-text-secondary">{qty(at(i).damped, s.uom)}</Data>
            )
          },
          {
            // The band is a pair, not a flow, and CAP-2 BR-03 names no combine
            // for it: Monthly reads "—" rather than a summed band nobody uses.
            id: 'allowedRange',
            label: <TermLabel term="allowedRange" />,
            align: 'start',
            cell: (_week, i) => {
              const p = at(i);
              return p.range ? (
                <Data className="text-text-secondary">{`${qtyOf(p.range.low, s.uom)} – ${qtyOf(p.range.high, s.uom)}`}</Data>
              ) : (
                <span className="text-text-tertiary">—</span>
              );
            }
          },
          {
            id: 'toPublish',
            label: <TermLabel term="toPublish" />,
            unit: s.uom,
            combine: 'sum',
            value: (_week, i) => at(i).published,
            format: (n) => qty(n, s.uom),
            cell: (_week, i) => (
              <Data data-testid={`stb-published-${key}-${at(i).period}`}>
                {qty(at(i).published, s.uom)}
              </Data>
            )
          },
          {
            // The long Rule row — the pill wraps and the reason stays in full.
            id: 'rule',
            label: <TermLabel term="stabiliseRule" />,
            align: 'start',
            combine: 'distinct',
            value: (_week, i) => t(`stb.rule.${at(i).rule}`),
            cell: (_week, i) => {
              const p = at(i);
              return (
                <div className="whitespace-normal break-words">
                  <StatusPill variant={RULE_VARIANT[p.rule]}>
                    <span data-testid={`stb-rule-${key}-${p.period}`}>
                      {t(`stb.rule.${p.rule}`)}
                    </span>
                  </StatusPill>
                  {p.beyondBand && p.rule !== 'override' && (
                    <div
                      className="text-xs text-warning-hover mt-1"
                      data-testid={`stb-reason-needed-${key}-${p.period}`}
                    >
                      {t('stb.detail.reasonNeeded')}
                    </div>
                  )}
                  {p.reason && <div className="text-xs text-text-secondary mt-1">{p.reason}</div>}
                  {p.previous !== null && p.awaitingCommitment && (
                    <div className="text-xs text-text-tertiary mt-1">
                      {t('stb.detail.recommit')}
                    </div>
                  )}
                </div>
              );
            }
          }
        ]}
      />
    </div>
  );
};

export default PeriodTable;
