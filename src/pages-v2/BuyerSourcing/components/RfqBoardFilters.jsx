/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useRfqBoard } from '../hooks/useRfqBoard' */
import SubTabs from '@components/ui-v2/SubTabs';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SearchBar from '@components/ui-v2/SearchBar';
import { CATEGORY_OPTIONS } from '../const';
import { categoryLabel } from '../utils';

/**
 * The board's filters: the status tabs with counts, the category chips and
 * the search box. `board` is the state from `useRfqBoard`. Moved out of
 * `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{ board: ReturnType<typeof useRfqBoard>; t: TFunction }>}
 */
const RfqBoardFilters = ({ board, t }) => (
  <>
    <SubTabs
      options={[
        { id: 'all', label: t('sourcing.tab.all'), count: board.counts.all },
        { id: 'open', label: t('sourcing.tab.open'), count: board.counts.open },
        {
          id: 'pending',
          label: t('sourcing.tab.pending'),
          count: board.counts.pending
        },
        {
          id: 'awarded',
          label: t('sourcing.tab.awarded'),
          count: board.counts.awarded
        },
        {
          id: 'closed',
          label: t('sourcing.tab.closed'),
          count: board.counts.closed
        }
      ]}
      value={board.group}
      onChange={board.setGroup}
      className="mb-5"
    />

    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <div>
        <div className="text-label text-text-tertiary uppercase mb-2">
          {t('sourcing.filter.byCategory')}
        </div>
        <FilterChipsBar
          options={CATEGORY_OPTIONS.map((c) => ({
            id: c,
            label: categoryLabel(t, c)
          }))}
          value={board.selectedCats}
          onChange={board.toggleCategory}
          multiSelect
        />
      </div>
    </div>

    <div className="mb-4">
      <SearchBar
        value={board.search}
        onChange={board.setSearch}
        placeholder={t('sourcing.search.placeholder')}
      />
    </div>
  </>
);

export default RfqBoardFilters;
