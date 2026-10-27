import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The static procure-to-pay diagram above the KPI tiles: create PR → approval
 * → source check → PO (source found) or sourcing event (no source). Takes no
 * props. Moved out of `BuyerRequisitions.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC}
 */
const ProcurementFlow = () => {
  const { t } = useTranslation();
  // Calm outline register (DP-2/DP-3): the pipeline STAGES carry no state, so
  // they go neutral — the diagram's only real decision is the source-check fork,
  // so semantic colour is reserved for its two outcomes (PO = source found;
  // Sourcing Event = the no-source branch). Quiet soft-tint + hue-border chips,
  // no solid saturated fills, mirroring the StatusPill grammar.
  /** @type {{ label: string; sub: string; tone: 'neutral' | 'success' | 'warning' }[]} */
  const steps = [
    {
      label: t('requisitions.flow.createPr.label'),
      sub: t('requisitions.flow.createPr.sub'),
      tone: 'neutral'
    },
    {
      label: t('requisitions.flow.approval.label'),
      sub: t('requisitions.flow.approval.sub'),
      tone: 'neutral'
    },
    {
      label: t('requisitions.flow.sourceCheck.label'),
      sub: t('requisitions.flow.sourceCheck.sub'),
      tone: 'neutral'
    },
    {
      label: t('requisitions.flow.createPo.label'),
      sub: t('requisitions.flow.createPo.sub'),
      tone: 'success'
    },
    {
      label: t('requisitions.flow.sourcingEvent.label'),
      sub: t('requisitions.flow.sourcingEvent.sub'),
      tone: 'warning'
    }
  ];
  /** @type {Record<string, string>} */
  const TONE = {
    neutral: 'bg-bg-hover text-text-secondary border-border-subtle',
    success: 'bg-success-soft text-success border-success/30',
    warning: 'bg-warning-soft text-warning-hover border-warning/30'
  };
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg px-5 py-4 mb-6">
      <div className="text-label text-text-tertiary uppercase mb-3">
        {t('requisitions.flow.label')}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="flex flex-col items-center min-w-[90px]">
              <span
                className={`px-3 py-1.5 rounded-sm border text-[length:var(--fs-label-3)] font-semibold text-center ${TONE[s.tone]}`}
              >
                {s.label}
              </span>
              <span className="text-[length:var(--fs-caption-1)] text-text-tertiary mt-1 text-center">
                {s.sub}
              </span>
            </div>
            {i < steps.length - 1 && <ArrowRight size={14} className="text-text-tertiary -mt-3" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ProcurementFlow;
