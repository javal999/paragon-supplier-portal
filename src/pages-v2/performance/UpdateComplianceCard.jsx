/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import LivenessPill from '@components/ui-v2/LivenessPill';
import { formatDate } from '@lib/format';
import { complianceScoreWeight } from '@services/transitions/inventoryConfig';
/** @import { ComplianceWeekState, UpdateCompliance } from '@services/transitions/updateCompliance' */

// ─────────────────────────────────────────────────────────────────────────────
// Material B3 (MR-2 step 2, US-MAT-03/04) — "Update compliance" and the
// 13-week strip, on the supplier's own performance page and on PTI's scorecard.
// One component so both sides read the same figure and the same definition.
// The figure comes off the measure (`SupplierMeasure.updateCompliance`), which
// is what the score blended — never recomputed here.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<ComplianceWeekState, string>} */
const WEEK_TONE = {
  compliant: 'bg-success',
  missed: 'bg-danger',
  notCounted: 'bg-border-subtle'
};

/**
 * `livenessPill`:  Show the card's own liveness pill. False only where a page-level simulated-data banner already covers it (B6).
 *
 * @typedef {{
 *     readonly compliance: UpdateCompliance | null;
 *     readonly testId: string;
 *     readonly livenessPill?: boolean;
 *   }} UpdateComplianceCardProps
 */

/** @type {React.FC<UpdateComplianceCardProps>} */
const UpdateComplianceCard = ({ compliance, testId, livenessPill = true }) => {
  const { t } = useTranslation();
  const pct = compliance?.pct ?? null;
  const weeks = compliance?.weeks ?? [];
  const states = /** @type {ComplianceWeekState[]} */ (Object.keys(WEEK_TONE));
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6"
      data-testid={testId}
      aria-labelledby={`${testId}-title`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2
          id={`${testId}-title`}
          className="text-section text-text-primary"
          data-testid={`${testId}-value`}
        >
          {pct === null
            ? `${t('perf.compliance.title')} · ${t('rfx.noHistory')}`
            : t('perf.compliance.value', { pct })}
        </h2>
        {/* MAT-R14 — built from the stock records and sync attempts, which are sample data. */}
        {livenessPill ? <LivenessPill capability="inventory" /> : null}
      </div>
      <p className="text-meta text-text-tertiary mb-4">{t('perf.compliance.definition')}</p>
      <ol
        className="flex flex-wrap gap-1 mb-3"
        aria-label={t('perf.compliance.stripLabel')}
        data-testid={`${testId}-strip`}
      >
        {weeks.map((w) => {
          const label = t('perf.compliance.weekLabel', {
            date: formatDate(w.cycle.cutoff),
            state: t(`perf.compliance.week.${w.state}`)
          });
          return (
            <li
              key={w.cycle.cutoff}
              className={`h-6 w-6 rounded-sm ${WEEK_TONE[w.state]}`}
              title={label}
              aria-label={label}
              data-state={w.state}
            />
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        {states.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-3 rounded-sm ${WEEK_TONE[s]}`}
              aria-hidden="true"
            />
            {t(`perf.compliance.week.${s}`)}
          </span>
        ))}
        <span className="text-text-tertiary">
          {pct === null ? (
            t('perf.compliance.notInScore')
          ) : (
            <>
              {t('perf.compliance.weightPrefix')}{' '}
              <Data>{`${Math.round(complianceScoreWeight() * 100)}%`}</Data>{' '}
              {t('perf.compliance.weightSuffix')}
            </>
          )}
        </span>
      </div>
    </section>
  );
};

export default UpdateComplianceCard;
