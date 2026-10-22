/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { useRfqBoard } from '../hooks/useRfqBoard' */
/** @import { GroupTab } from '../const' */
import Button from '@components/ui-v2/Button';
import SubTabs from '@components/ui-v2/SubTabs';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SearchBar from '@components/ui-v2/SearchBar';
import { CATEGORY_OPTIONS } from '../const';
import { categoryLabel } from '../utils';

/**
 * The board's filters: the status tabs with counts, the category chips and
 * the search box. `board` is the state from `useRfqBoard`. RFx UX 1D (B-04):
 * "Needs my action" first and the default, a Draft tab, no "All".
 * @type {React.FC<{ board: ReturnType<typeof useRfqBoard>; t: TFunction }>}
 */
const RfqBoardFilters = ({ board, t }) => (
  <>
    {/* IA P-08 — Home's "Negotiation rounds closing soon" lands here: the view
        is named, and one click leaves it. */}
    {board.roundsClosing ? (
      <div
        className="flex flex-wrap items-center gap-3 mb-4 rounded-md border border-border-subtle bg-bg-subtle px-4 py-2 text-sm text-text-primary"
        data-testid="rfq-board-rounds-closing"
      >
        <span>{t('sourcing.view.roundsClosing')}</span>
        <Button variant="secondary" onClick={board.clearRoundsClosing}>
          {t('sourcing.view.showAll')}
        </Button>
      </div>
    ) : null}
    <SubTabs
      options={[
        { id: 'action', label: t('sourcing.tab.action'), count: board.counts.action },
        { id: 'open', label: t('sourcing.tab.open'), count: board.counts.open },
        { id: 'pending', label: t('sourcing.tab.pending'), count: board.counts.pending },
        { id: 'draft', label: t('sourcing.tab.draft'), count: board.counts.draft },
        { id: 'awarded', label: t('sourcing.tab.awarded'), count: board.counts.awarded },
        { id: 'closed', label: t('sourcing.tab.closed'), count: board.counts.closed }
      ]}
      // A KPI tile, pressed, filters instead of the tab, so no tab reads as selected.
      value={board.kpi || board.roundsClosing ? /** @type {GroupTab | ''} */ ('') : board.group}
      onChange={(id) => {
        if (id) board.setGroup(id);
      }}
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
