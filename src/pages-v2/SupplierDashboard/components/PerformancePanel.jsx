/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { Supplier } from '@services/data/types' */
/** @import { Grade } from '../const' */
import { targetStatus, TARGET_STATUS } from '@lib/chartPalette';
import TargetBar from '@components/ui-v2/TargetBar';
import GradeBadge from './GradeBadge';

/**
 * @typedef {object} PerformancePanelProps
 * @property {Supplier} mySupplier  Source of lead-time adherence and invoice accuracy.
 * @property {Grade | undefined} grade  Projected scorecard grade; absent when nothing is measured.
 * @property {boolean} hasOtif  Whether the supplier has a measured OTIF (no bar without one).
 * @property {number | undefined} otif  The measured OTIF percentage.
 * @property {TFunction} t
 */

/**
 * The performance panel: the small grade tile and one DP2-TARGET-01 target
 * bar per measure (OTIF when measured, lead time, invoice accuracy) against
 * the 90 target. Moved out of `SupplierDashboard.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<PerformancePanelProps>}
 */
const PerformancePanel = ({ mySupplier, grade, hasOtif, otif, t }) => (
  <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-section text-text-primary">{t('supplierDashboard.perf.title')}</h2>
      {grade ? (
        <GradeBadge grade={grade} size="sm" />
      ) : (
        <span className="text-xs text-text-tertiary">{t('rfx.noHistory')}</span>
      )}
    </div>
    <div className="flex flex-col gap-4">
      {[
        // A supplier with no measured OTIF gets no bar: a target bar at
        // 0% is a claim about performance nobody has measured.
        // (`hasOtif` is `otif !== undefined`, so the cast below is type-only.)
        ...(hasOtif
          ? [{ label: t('supplierDashboard.perf.otif'), value: /** @type {number} */ (otif) }]
          : []),
        {
          label: t('supplierDashboard.perf.leadTime'),
          value: mySupplier.leadTimeAdherence
        },
        {
          label: t('supplierDashboard.perf.invoiceAccuracy'),
          value: mySupplier.invoiceAccuracy
        }
      ].map((m) => {
        const status = targetStatus(m.value, 90);
        return (
          <div key={m.label}>
            <div className="flex justify-between mb-1.5">
              <span className="text-sm text-text-secondary">{m.label}</span>
              <span className="text-sm font-bold" style={{ color: TARGET_STATUS[status].text }}>
                {m.value}%
              </span>
            </div>
            <TargetBar pct={m.value} target={90} status={status} />
          </div>
        );
      })}
    </div>
    <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-text-tertiary italic">
      {t('supplierDashboard.perf.footnote')}
    </div>
  </section>
);

export default PerformancePanel;
