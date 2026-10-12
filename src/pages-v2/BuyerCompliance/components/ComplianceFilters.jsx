/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { CategoryFilter, StatusFilter } from '../const' */
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';

// Option ids stay canonical EN (they drive filtering against computed values);
// only the display `label` localizes, via the labelKey resolved at render.
/** @type {{ id: StatusFilter; labelKey: string }[]} */
const STATUS_OPTIONS = [
  { id: 'All', labelKey: 'compliance.filter.status.all' },
  { id: 'Expired', labelKey: 'compliance.filter.status.expired' },
  { id: 'Expiring', labelKey: 'compliance.filter.status.expiring' },
  { id: 'Missing', labelKey: 'compliance.filter.status.missing' },
  { id: 'Under Review', labelKey: 'compliance.filter.status.underReview' },
  { id: 'Valid', labelKey: 'compliance.filter.status.valid' }
];

/** @type {{ id: CategoryFilter; labelKey: string }[]} */
const CATEGORY_OPTIONS = [
  { id: 'All', labelKey: 'compliance.filter.category.all' },
  { id: 'Halal', labelKey: 'compliance.filter.category.halal' },
  { id: 'Quality', labelKey: 'compliance.filter.category.quality' },
  { id: 'Regulatory', labelKey: 'compliance.filter.category.regulatory' },
  { id: 'Other', labelKey: 'compliance.filter.category.other' }
];

/**
 * @typedef {object} ComplianceFiltersProps
 * @property {StatusFilter} statusFilter
 * @property {(next: StatusFilter) => void} setStatusFilter
 * @property {CategoryFilter} categoryFilter
 * @property {(next: CategoryFilter) => void} setCategoryFilter
 * @property {number} filteredCount Rows left after both filters.
 * @property {number} totalCount Every registry row.
 * @property {TFunction} t
 */

/**
 * The status and category filter chips above the registry table, with the
 * "showing N of M" summary. The filter state lives in the page. Moved out of
 * `BuyerCompliance.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ComplianceFiltersProps>}
 */
const ComplianceFilters = ({
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  filteredCount,
  totalCount,
  t
}) => (
  <div className="flex flex-wrap items-center gap-3 mb-4">
    <FilterChipsBar
      options={STATUS_OPTIONS.map((o) => ({ id: o.id, label: t(o.labelKey) }))}
      value={statusFilter}
      onChange={setStatusFilter}
    />
    <FilterChipsBar
      options={CATEGORY_OPTIONS.map((o) => ({ id: o.id, label: t(o.labelKey) }))}
      value={categoryFilter}
      onChange={setCategoryFilter}
    />
    <span className="text-meta text-text-tertiary">
      {t('compliance.filter.summary', {
        filtered: filteredCount,
        total: totalCount
      })}
    </span>
  </div>
);

export default ComplianceFilters;
