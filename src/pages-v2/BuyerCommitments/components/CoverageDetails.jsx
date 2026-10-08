/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import CommitmentGrid from './CommitmentGrid';
import CumulativeCard from './CumulativeCard';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

/**
 * F-23 — the exceptions drive action; the grid (BR-01 / BR-02) and the
 * cumulative charts (BR-03) are context, collapsed below them in one
 * `<details>`. Same data, same order inside.
 * @type {React.FC<{
 *   shown: readonly ForecastCommitmentLine[];
 *   rows: readonly ForecastCommitmentLine[];
 *   periods: readonly [string, string][];
 *   periodLabel: (bucket: string) => string;
 *   nowIso: string;
 * }>}
 */
const CoverageDetails = ({ shown, rows, periods, periodLabel, nowIso }) => {
  const { t } = useTranslation();
  return (
    <details
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="fc-coverage-details"
    >
      <summary className="text-section text-text-primary cursor-pointer">
        {t('fc.pti.gaps.coverageDetails')}
      </summary>
      <p className="text-sm text-text-secondary mt-1 mb-4">
        {t('fc.pti.gaps.coverageDetailsHint')}
      </p>
      {/* BR-01 / BR-02 — the grid of commitment against forecast. */}
      <CommitmentGrid
        shown={shown}
        rows={rows}
        periods={periods}
        periodLabel={periodLabel}
        nowIso={nowIso}
      />

      {/* BR-03 — cumulative commitment against cumulative forecast per material. */}
      <section className="mb-6" data-testid="fc-cumulative">
        <h2 className="text-section text-text-primary mb-2">{t('fc.pti.gaps.cumulative')}</h2>
        <p className="text-sm text-text-secondary mb-3">{t('fc.pti.gaps.cumulativeHint')}</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {[...new Set(shown.map((l) => l.materialCode))].map((code) => (
            <CumulativeCard
              key={code}
              code={code}
              lines={shown.filter((l) => l.materialCode === code)}
              periodLabel={periodLabel}
            />
          ))}
        </div>
      </section>
    </details>
  );
};

export default CoverageDetails;
