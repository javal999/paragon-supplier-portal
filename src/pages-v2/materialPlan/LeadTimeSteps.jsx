/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
/** @import { LeadTimeBreakdown } from '@services/engine/leadTimeSteps' */

// ─────────────────────────────────────────────────────────────────────────────
// DRC-6 (BL-192) — a supplier × material lead time by step, read only.
//
// Shown under the lead time on the Material requirement page: the route, each
// step in days, and the total in weeks rounded up (what the rolling demand
// anticipation horizon reads, DRC-2 BR-01). Every figure is the read's
// (`leadTimeBreakdown`); nothing is computed here. The steps of the sample
// dataset are a sample split, and the block says so.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @type {React.FC<{ breakdown: LeadTimeBreakdown | null; testId: string }>}
 */
const LeadTimeSteps = ({ breakdown, testId }) => {
  const { t } = useTranslation();
  if (!breakdown) return null;
  if (!breakdown.stepped)
    return (
      <div className="text-xs text-text-tertiary" data-testid={testId}>
        {t('ltSteps.none')}
      </div>
    );
  return (
    <div
      className="text-xs text-text-tertiary mt-1"
      data-testid={testId}
      title={t('ltSteps.sample')}
    >
      <div>
        <span className="sr-only">{t('ltSteps.label')}: </span>
        {breakdown.route ? (
          <span data-testid={`${testId}-route`}>{t(`ltSteps.route.${breakdown.route}`)}</span>
        ) : null}
        {' · '}
        <span data-testid={`${testId}-weeks`}>
          {t('ltSteps.weeks', { count: breakdown.totalWeeks })}
        </span>
      </div>
      <ul className="mt-0.5">
        {breakdown.steps.map((s) => (
          <li key={s.step} data-testid={`${testId}-${s.step}`}>
            {t(`ltSteps.step.${s.step}`)}:{' '}
            <Data className="text-text-tertiary">{t('ltSteps.days', { count: s.days })}</Data>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LeadTimeSteps;
