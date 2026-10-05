import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BASELINE_MONTHS,
  KPI_DEFINITIONS,
  KPI_QUESTIONS,
} from '@services/data/kpiDefinitions';

// ─────────────────────────────────────────────────────────────────────────────
// BL-53 — THE KPI DEFINITIONS, on both performance pages (supplier and PTI).
//
// One component so the two sides read the same sentence: a measure a supplier
// cannot reproduce gets argued rather than acted on (BL-19). Every answer comes
// from `kpiDefinitions.ts`, whose numbers are the calculation's own constants,
// and the target column says "Baseline period" because none is set yet.
// ─────────────────────────────────────────────────────────────────────────────

const KpiDefinitions: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6"
      data-testid="kpi-definitions"
      aria-labelledby="kpi-definitions-title"
    >
      <h2 id="kpi-definitions-title" className="text-section text-text-primary mb-1">
        {t('perf.kpi.title')}
      </h2>
      <p className="text-meta text-text-tertiary mb-4">{t('perf.kpi.intro')}</p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {KPI_DEFINITIONS.map((def) => (
          <div
            key={def.id}
            className="rounded-md border border-border-subtle bg-bg-hover px-4 py-3"
            data-testid={`kpi-definition-${def.id}`}
          >
            <h3 className="text-sm font-semibold text-text-primary mb-2">{t(def.nameKey)}</h3>
            <dl className="flex flex-col gap-2 text-sm">
              {KPI_QUESTIONS.map((q) => (
                <div key={q} data-testid={`kpi-${def.id}-${q}`}>
                  <dt className="text-xs font-semibold text-text-tertiary">{t(`perf.kpi.q.${q}`)}</dt>
                  <dd className="text-text-secondary">{t(def.answers[q].key, def.answers[q].values)}</dd>
                </div>
              ))}
              <div data-testid={`kpi-${def.id}-target`}>
                <dt className="text-xs font-semibold text-text-tertiary">{t('perf.kpi.q.target')}</dt>
                <dd className="text-text-secondary">
                  <span className="font-medium text-text-primary">{t('perf.kpi.target.baseline')}</span>
                  <span className="block text-xs text-text-tertiary">
                    {t('perf.kpi.target.baselineHint', { months: BASELINE_MONTHS })}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
};

export default KpiDefinitions;
