/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { GroupTab, RangeFilter } from '../const' */
import SubTabs from '@components/ui-v2/SubTabs';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SearchBar from '@components/ui-v2/SearchBar';

/**
 * @typedef {object} OrdersFiltersProps
 * @property {Record<GroupTab, number>} counts  PO count per tab.
 * @property {GroupTab} group  The selected tab.
 * @property {(group: GroupTab) => void} setGroup
 * @property {RangeFilter} range  The selected order-date range.
 * @property {(range: RangeFilter) => void} setRange
 * @property {string} search  The search text.
 * @property {(search: string) => void} setSearch
 * @property {TFunction} t
 */

/**
 * The worklist's filters, in render order: the status tabs, the order-date
 * range chips and the search bar. Moved out of `BuyerOrders.jsx` by the Phase 5
 * page split (no behaviour change).
 * @type {React.FC<OrdersFiltersProps>}
 */
const OrdersFilters = ({ counts, group, setGroup, range, setRange, search, setSearch, t }) => (
  <>
    <SubTabs
      options={[
        { id: 'all', label: t('buyerOrders.tab.all'), count: counts.all },
        { id: 'escalated', label: t('oc.tab.escalated'), count: counts.escalated },
        { id: 'review', label: t('oc.tab.review'), count: counts.review },
        { id: 'rejected', label: t('oc.tab.rejected'), count: counts.rejected },
        { id: 'pending', label: t('buyerOrders.tab.pending'), count: counts.pending },
        { id: 'confirmed', label: t('buyerOrders.tab.confirmed'), count: counts.confirmed },
        { id: 'transit', label: t('buyerOrders.tab.transit'), count: counts.transit },
        { id: 'delivered', label: t('buyerOrders.tab.delivered'), count: counts.delivered },
        { id: 'closed', label: t('buyerOrders.tab.closed'), count: counts.closed }
      ]}
      value={group}
      onChange={setGroup}
      className="mb-5"
    />

    <div className="flex items-center justify-between gap-4 mb-4">
      <FilterChipsBar
        options={[
          { id: '7d', label: t('buyerOrders.range.7d') },
          { id: '30d', label: t('buyerOrders.range.30d') },
          { id: '90d', label: t('buyerOrders.range.90d') },
          { id: 'all', label: t('buyerOrders.range.all') }
        ]}
        value={range}
        onChange={setRange}
      />
    </div>

    <div className="mb-4">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('buyerOrders.search.placeholder')}
      />
    </div>
  </>
);

export default OrdersFilters;
