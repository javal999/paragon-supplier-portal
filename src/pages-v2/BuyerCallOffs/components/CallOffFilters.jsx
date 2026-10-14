/** @import React from 'react' */
/** @import { useCallOffSections, StatusFilter } from '../hooks/useCallOffSections' */
/** @import { usePicFilter } from '../../materials/picDisplay' */
import { useTranslation } from 'react-i18next';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import MaterialSearch from '@components/ui-v2/MaterialSearch';
import { PicFilter, ptiPicOf } from '../../materials/picDisplay';

/**
 * @typedef {object} CallOffFiltersProps
 * @property {string} search  The material search query (C3); the state lives in the page.
 * @property {(q: string) => void} setSearch
 * @property {ReturnType<typeof usePicFilter>} pic  The PIC filter (C4), kept in the page address.
 * @property {ReturnType<typeof useCallOffSections>['sections']} sections  Every umbrella section, before search and PIC.
 * @property {StatusFilter} statusFilter  The selected status chip (`?status=` deep link).
 * @property {(f: StatusFilter) => void} setStatusFilter
 * @property {number} awaitingApproval  Chip count.
 * @property {number} escalated  Chip count.
 * @property {number} atRisk  Chip count.
 * @property {number} driftCount  Chip count: supplier × material groups drifting.
 */

/**
 * The page's filter row: material search and PIC filter, the status chips
 * with their counts, and the empty notice when a status chip leaves no
 * umbrella line.
 * @type {React.FC<CallOffFiltersProps>}
 */
const CallOffFilters = ({
  search,
  setSearch,
  pic,
  sections,
  statusFilter,
  setStatusFilter,
  awaitingApproval,
  escalated,
  atRisk,
  driftCount
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[240px]">
          <MaterialSearch
            mode="filter"
            query={search}
            onQueryChange={setSearch}
            testId="calloff-search"
          />
        </div>
        <PicFilter
          refs={sections.map((s) => ptiPicOf(s.line.materialCode))}
          persona="buyer"
          filter={pic.filter}
          setFilter={pic.setFilter}
          myCode={pic.myCode}
        />
      </div>

      <FilterChipsBar
        options={[
          { id: 'all', label: t('co.pti.filter.all') },
          {
            id: 'awaitingApproval',
            label: t('co.pti.filter.awaitingApproval'),
            count: awaitingApproval
          },
          { id: 'escalated', label: t('co.pti.filter.escalated'), count: escalated },
          { id: 'atRisk', label: t('co.pti.filter.atRisk'), count: atRisk },
          { id: 'drift', label: t('co.pti.filter.drift'), count: driftCount }
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
        className="mb-4"
      />

      {statusFilter !== 'all' && sections.length === 0 && (
        <p
          className="text-sm text-text-tertiary py-8 text-center"
          data-testid="calloff-filter-empty"
        >
          {t('co.pti.filter.empty')}
        </p>
      )}
    </>
  );
};

export default CallOffFilters;
