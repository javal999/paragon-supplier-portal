/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate, formatNumber } from '@lib/format';
import { DA_PROVISIONAL_QUESTIONS } from '@services/transitions/demandAnticipationRules';
/** @import { DemandAnticipationRow } from '@services/transitions/demandAnticipationRules' */
import { weekLabel, weekRange } from '../display';

// ─────────────────────────────────────────────────────────────────────────────
// DRC-4 (BL-190) — the plan vs execution check of one supplier × material, and
// the DRC-2 carry-over of its planning week, above the grid:
//   · the horizon (the lead time, DRC-2 BR-01);
//   · Total demand anticipation, ROP Order (cycle stock + safety order) and
//     the supply it is checked against: Total OSPO [Team A2, owner 2026-10-28],
//     with SOH, OSPR and PR shown as SAP MRP context only; a figure stored
//     under an earlier rules version keeps the basis it was made on;
//   · the gap and its result: balanced, a surplus absorbed in the last week of
//     the horizon (DRC-B7), or a PR recommendation the planner raises in SAP —
//     the hub posts nothing;
//   · the planning week's call-off, remainder, where it was carried, and the
//     additional PO.
// Design rule 5 — the figures rest on [Default] A1, A2, A8b and A9, so the
// panel carries the "Provisional" label with those questions. Each data gap
// the read flags (no OSPR, no sales orders for the carry-over limit, …) is
// named under it. Every number is the read's (`plan`); none is computed here.
// ─────────────────────────────────────────────────────────────────────────────

/** The read's flags that get a line of their own on the panel. */
// i18n-defer: flag identifiers, not copy — each renders through t(`demandAnt.flag.<id>`)
const NOTED_FLAGS = /** @type {const} */ ([
  'LEAD_TIME_MISSING',
  'NO_STOCK_RECORD',
  'OSPO_FROM_STORE',
  'OSPR_NOT_AVAILABLE',
  'CARRY_LIMIT_NO_SALES_ORDERS',
  'CARRY_OVER_LIMIT'
]);

/**
 * One label and value of the panel.
 * @type {React.FC<{ label: string; value: React.ReactNode; testId: string }>}
 */
const Item = ({ label, value, testId }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-tertiary">{label}</dt>
    <dd className="text-sm text-text-primary" data-testid={testId}>
      {value}
    </dd>
  </div>
);

/**
 * @type {React.FC<{ row: DemandAnticipationRow; rowKey: string }>}
 */
const PlanCheck = ({ row, rowKey }) => {
  const { t } = useTranslation();
  const p = row.plan;
  const q = (/** @type {number} */ n) => formatNumber(n);
  const last = p.horizonWeeks[p.horizonWeeks.length - 1];
  // A figure stored before 2026-10-28 was made on SOH + OSPO + OSPR + PR.
  const basis = p.supplyBasis ?? 'sohOspoOsprPr';
  const result =
    p.gap > 0
      ? t('demandAnt.check.shortfall', { qty: q(p.prRecommendation) })
      : p.gap < 0
        ? p.unabsorbed > 0
          ? t('demandAnt.check.surplusPartly', {
              qty: q(p.absorbedLastWeek),
              week: weekLabel(last),
              left: q(p.unabsorbed)
            })
          : t('demandAnt.check.surplus', { qty: q(p.absorbedLastWeek), week: weekLabel(last) })
        : t('demandAnt.check.balanced');
  const carry =
    p.carry === null
      ? t('demandAnt.carry.none')
      : p.carryTarget === 'firstOutside'
        ? t('demandAnt.carry.firstOutside', { qty: q(p.carry.qty), week: weekLabel(p.carry.week) })
        : t('demandAnt.carry.lastWeek', { qty: q(p.carry.qty), week: weekLabel(p.carry.week) });

  return (
    <section
      className="px-4 py-3 border-t border-border-subtle"
      data-testid={`dant-check-${rowKey}`}
      aria-label={t('demandAnt.check.title')}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <h3 className="text-sm font-semibold text-text-primary">{t('demandAnt.check.title')}</h3>
        <span className="text-xs text-text-tertiary" data-testid={`dant-check-source-${rowKey}`}>
          {row.planSource === 'published' && row.publishedBy
            ? row.publishedBy.source === 'sampleSeed'
              ? t('demandAnt.check.sourceSample', {
                  week: weekLabel(row.planningWeek),
                  date: formatDate(row.publishedBy.publishedAt)
                })
              : t('demandAnt.check.sourcePublished', {
                  week: weekLabel(row.planningWeek),
                  date: formatDate(row.publishedBy.publishedAt)
                })
            : t('demandAnt.check.sourceToday', { week: weekLabel(row.planningWeek) })}
        </span>
        {/* Design rule 5 — built on [Default] A1, A2, A8b, A9. */}
        <span
          className="text-xs text-warning-hover"
          data-testid={`dant-check-provisional-${rowKey}`}
        >
          {t('ltpFg.provisional', { question: DA_PROVISIONAL_QUESTIONS.join(', ') })}
        </span>
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
        <Item
          label={t('demandAnt.check.horizon')}
          testId={`dant-check-horizon-${rowKey}`}
          value={
            <>
              {t('demandAnt.check.horizonWeeks', { count: p.leadTimeWeeks })} ·{' '}
              <Data>{weekRange(p.horizonWeeks)}</Data>
            </>
          }
        />
        <Item
          label={t('demandAnt.check.totalDa')}
          testId={`dant-check-total-${rowKey}`}
          value={<Data>{q(p.totalDa)}</Data>}
        />
        <Item
          label={t('demandAnt.check.ropOrder')}
          testId={`dant-check-rop-${rowKey}`}
          value={
            <>
              <Data>{q(p.ropOrder)}</Data>{' '}
              <span className="text-xs text-text-tertiary">
                {t('demandAnt.check.ropParts', {
                  cycle: q(p.cycleStock),
                  safety: q(p.safetyOrder)
                })}
              </span>
            </>
          }
        />
        <Item
          label={t(`demandAnt.check.supply.${basis}`)}
          testId={`dant-check-supply-${rowKey}`}
          value={
            basis === 'totalOspo' ? (
              <Data>{q(p.supply)}</Data>
            ) : (
              <>
                <Data>{q(p.supply)}</Data>{' '}
                <span className="text-xs text-text-tertiary">
                  {t(`demandAnt.check.supplyParts.${basis}`, {
                    soh: q(p.soh),
                    ospo: q(p.ospo),
                    ospr: q(p.ospr),
                    pr: q(p.pr)
                  })}
                </span>
              </>
            )
          }
        />
        {basis === 'totalOspo' ? (
          <Item
            label={t('demandAnt.check.mrpContext')}
            testId={`dant-check-mrp-${rowKey}`}
            value={
              <span className="text-xs text-text-tertiary">
                {t('demandAnt.check.mrpParts', { soh: q(p.soh), ospr: q(p.ospr), pr: q(p.pr) })}
              </span>
            }
          />
        ) : null}
        <Item
          label={t('demandAnt.check.gap')}
          testId={`dant-check-gap-${rowKey}`}
          value={<Data>{q(p.gap)}</Data>}
        />
        <Item
          label={t('demandAnt.check.result')}
          testId={`dant-check-result-${rowKey}`}
          value={
            <span
              className={p.gap > 0 ? 'font-semibold text-warning-hover' : undefined}
              data-tone={p.gap > 0 ? 'warning' : undefined}
            >
              {result}
            </span>
          }
        />
        <Item
          label={t('demandAnt.carry.label', { week: weekLabel(row.planningWeek) })}
          testId={`dant-carry-${rowKey}`}
          value={
            <>
              {t('demandAnt.carry.parts', { callOff: q(p.callOff), remainder: q(p.remainder) })} ·{' '}
              {carry}
            </>
          }
        />
        <Item
          label={t('demandAnt.check.additionalPo')}
          testId={`dant-check-addpo-${rowKey}`}
          value={<Data>{q(p.additionalPo)}</Data>}
        />
      </dl>
      {NOTED_FLAGS.some((f) => p.flags.includes(f)) ? (
        <ul className="mt-2 space-y-0.5" data-testid={`dant-check-flags-${rowKey}`}>
          {NOTED_FLAGS.filter((f) => p.flags.includes(f)).map((f) => (
            <li key={f} className="text-xs text-text-tertiary" data-flag={f}>
              {t(`demandAnt.flag.${f}`, { qty: q(p.uncarried), weeks: p.leadTimeWeeks })}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

export default PlanCheck;
