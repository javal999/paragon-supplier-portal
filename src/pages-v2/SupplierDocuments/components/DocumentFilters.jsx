/** @import React from 'react' */
/** @import { CategoryFilter, ExpiryFilter } from '../const' */
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SearchBar from '@components/ui-v2/SearchBar';
import { useTranslation } from 'react-i18next';

// Filter chip ids are the CANONICAL EN category values matched against
// `d.category` (stored-as-data) — never translate the `id`. Only the display
// label localizes; the option list is built in-component so `t` is available.
/** @type {{ id: CategoryFilter; labelKey: string }[]} */
const CATEGORY_FILTERS = [
  { id: 'All', labelKey: 'supplierDocuments.category.all' },
  { id: 'Halal Compliance', labelKey: 'supplierDocuments.category.halal' },
  { id: 'BPOM Regulatory', labelKey: 'supplierDocuments.category.bpom' },
  { id: 'Tax & Legal', labelKey: 'supplierDocuments.category.taxLegal' },
  { id: 'Quality', labelKey: 'supplierDocuments.category.quality' },
  { id: 'Contract', labelKey: 'supplierDocuments.category.contract' }
];

/**
 * @typedef {object} DocumentFiltersProps
 * @property {string} search  The free-text search (document name or issuer).
 * @property {(value: string) => void} setSearch
 * @property {CategoryFilter} filterCat  The category chip in force.
 * @property {(value: CategoryFilter) => void} setFilterCat
 * @property {ExpiryFilter} expiryFilter  The expiry / status chip in force; the
 *   page also sets it from `?expiry=` and `?status=`, so the state stays there.
 * @property {(value: ExpiryFilter) => void} setExpiryFilter
 * @property {number} shown  Rows the filters let through.
 * @property {number} total  Every document the supplier holds.
 */

/**
 * The search bar, the category chips, the expiry / status chips and the
 * "shown of total" count above the documents table. Every value is page
 * state, passed in. Moved out of `SupplierDocuments.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<DocumentFiltersProps>}
 */
const DocumentFilters = ({
  search,
  setSearch,
  filterCat,
  setFilterCat,
  expiryFilter,
  setExpiryFilter,
  shown,
  total
}) => {
  const { t } = useTranslation();
  const categoryOptions = CATEGORY_FILTERS.map((c) => ({
    id: c.id,
    label: t(c.labelKey)
  }));
  return (
    <div className="flex flex-col gap-3 mb-4">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('supplierDocuments.search.placeholder')}
      />
      <div className="flex flex-wrap items-center gap-3">
        <FilterChipsBar options={categoryOptions} value={filterCat} onChange={setFilterCat} />
        <FilterChipsBar
          options={[
            { id: 'all', label: t('inv.filter.all') },
            { id: 'expired', label: t('supplierDocuments.filter.expired') },
            { id: 'expiring', label: t('supplierDocuments.filter.expiring') },
            { id: 'due', label: t('supplierDocuments.filter.due') },
            { id: 'awaiting-upload', label: t('supplierDocuments.filter.requested') }
          ]}
          value={expiryFilter}
          onChange={setExpiryFilter}
        />
        <span className="text-meta text-text-tertiary">
          {t('supplierDocuments.filter.count', {
            shown,
            total
          })}
        </span>
      </div>
    </div>
  );
};

export default DocumentFilters;
