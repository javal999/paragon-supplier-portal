/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { DateFilter, GroupTab } from '../const' */
/** @import { useGoodsReceiptList } from '../hooks/useGoodsReceiptList' */
import SubTabs from '@components/ui-v2/SubTabs';
import SearchBar from '@components/ui-v2/SearchBar';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';

/**
 * @typedef {object} GoodsReceiptFiltersProps
 * @property {ReturnType<typeof useGoodsReceiptList>['counts']} counts The tab badges.
 * @property {GroupTab} tab
 * @property {(tab: GroupTab) => void} onTabChange
 * @property {string} search
 * @property {(search: string) => void} onSearchChange
 * @property {DateFilter} dateFilter
 * @property {(filter: DateFilter) => void} onDateFilterChange
 * @property {TFunction} t
 */

/**
 * The list controls above the receipt table: the status tabs with counts,
 * the search box and the date chips. Moved out of `BuyerGoodsReceipt.jsx` by
 * the Phase 5 page split (no behaviour change).
 * @type {React.FC<GoodsReceiptFiltersProps>}
 */
const GoodsReceiptFilters = ({
  counts,
  tab,
  onTabChange,
  search,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  t
}) => (
  <>
    <SubTabs
      options={[
        { id: 'all', label: t('goodsReceipt.tab.all'), count: counts.all },
        { id: 'pending', label: t('goodsReceipt.tab.pending'), count: counts.pending },
        {
          id: 'under-inspection',
          label: t('goodsReceipt.tab.underInspection'),
          count: counts.underInspection
        },
        { id: 'approved', label: t('goodsReceipt.tab.approved'), count: counts.approved },
        { id: 'hold', label: t('goodsReceipt.tab.hold'), count: counts.hold },
        { id: 'rejected', label: t('goodsReceipt.tab.rejected'), count: counts.rejected },
        { id: 'posted', label: t('goodsReceipt.tab.posted'), count: counts.posted }
      ]}
      value={tab}
      onChange={onTabChange}
      className="mb-6"
    />

    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex-1 min-w-[280px]">
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder={t('goodsReceipt.search.placeholder')}
        />
      </div>
      <FilterChipsBar
        options={[
          { id: 'today', label: t('goodsReceipt.filter.today') },
          { id: 'week', label: t('goodsReceipt.filter.week') },
          { id: 'month', label: t('goodsReceipt.filter.month') },
          { id: '30d', label: t('goodsReceipt.filter.30d') },
          { id: 'all', label: t('goodsReceipt.filter.all') }
        ]}
        value={dateFilter}
        onChange={onDateFilterChange}
      />
    </div>
  </>
);

export default GoodsReceiptFilters;
