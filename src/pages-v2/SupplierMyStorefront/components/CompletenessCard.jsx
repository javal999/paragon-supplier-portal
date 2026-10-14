/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

/**
 * @typedef {object} CompletenessItem
 * @property {string} labelKey `labelKey` is an i18n key (namespace supplierMyStorefront.completeness.*),
 *   resolved to a localized label at render; `done` is the demo completeness flag.
 * @property {boolean} done
 */

// Kept in the file that maps it: the module-scope-literal gate keys a mapped
// const by that file (`grandfathered.js`). The page also reads it to compute
// the completeness percentage.
/** @type {CompletenessItem[]} */
export const COMPLETENESS_ITEMS = [
  { labelKey: 'supplierMyStorefront.completeness.companyDescription', done: true },
  { labelKey: 'supplierMyStorefront.completeness.materialsCatalog', done: true },
  { labelKey: 'supplierMyStorefront.completeness.bpomRegistration', done: true },
  { labelKey: 'supplierMyStorefront.completeness.iso9001', done: true },
  { labelKey: 'supplierMyStorefront.completeness.bpjphHalal', done: false },
  { labelKey: 'supplierMyStorefront.completeness.capacity', done: false },
  { labelKey: 'supplierMyStorefront.completeness.references', done: false },
  { labelKey: 'supplierMyStorefront.completeness.profilePhoto', done: false }
];

/**
 * @typedef {object} CompletenessCardProps
 * @property {number} completeness  Percentage of `COMPLETENESS_ITEMS` done (computed by the page).
 * @property {'success' | 'warning'} completenessVariant  Colour band for the bar and the figures.
 */

/**
 * The profile-completeness card under the page header: progress bar, the
 * per-item done/missing list and the big percentage. Moved out of
 * `SupplierMyStorefront.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<CompletenessCardProps>}
 */
const CompletenessCard = ({ completeness, completenessVariant }) => {
  const { t } = useTranslation();
  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5 mb-6">
      <div className="flex items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-text-primary">
              {t('supplierMyStorefront.completeness.title')}
            </span>
            <span
              className={`text-sm font-bold ${
                completenessVariant === 'success' ? 'text-success' : 'text-warning-hover'
              }`}
            >
              {completeness}%
            </span>
          </div>
          <div className="h-2.5 bg-bg-hover rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                completenessVariant === 'success' ? 'bg-success' : 'bg-warning'
              }`}
              style={{ width: `${completeness}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {COMPLETENESS_ITEMS.map((item) => (
              <span
                key={item.labelKey}
                className={`text-xs ${item.done ? 'text-success' : 'text-danger'}`}
              >
                {item.done ? '✓' : '✗'} {t(item.labelKey)}
              </span>
            ))}
          </div>
        </div>
        <div className="text-center shrink-0">
          <div
            className={`text-kpi font-mono tabular-nums ${
              completenessVariant === 'success' ? 'text-success' : 'text-warning-hover'
            }`}
          >
            {completeness}%
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            {t('supplierMyStorefront.completeness.complete')}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompletenessCard;
