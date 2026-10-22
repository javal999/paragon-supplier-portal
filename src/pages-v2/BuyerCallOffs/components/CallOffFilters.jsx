/** @import React from 'react' */
/** @import { StatusFilter } from '../utils' */
/** @import { usePicFilter } from '../../materials/picDisplay' */
import { useTranslation } from 'react-i18next';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import MaterialSearch from '@components/ui-v2/MaterialSearch';
import { PicFilter, ptiPicOf } from '../../materials/picDisplay';

/**
 * @typedef {object} CallOffFiltersProps
 * @property {string} search The material search text (Material C3).
 * @property {(q: string) => void} setSearch
 * @property {readonly { line: { materialCode: string } }[]} sections The tab's umbrella lines, before the PIC filter and search: the PIC filter offers their PICs.
 * @property {ReturnType<typeof usePicFilter>} pic The PIC filter kept in the page address (Material C4).
 * @property {boolean} onToAct Whether the To act tab is open: only it shows the status chips and its empty notes.
 * @property {StatusFilter} statusFilter
 * @property {(f: StatusFilter) => void} setStatusFilter
 * @property {number} awaitingApproval
 * @property {number} escalated
 * @property {number} atRisk
 * @property {number} driftCount
 */

/**
 * The filters above the umbrella lines on both call-off tabs: the material
 * search and the PIC filter, then (To act only) the status chips and the two
 * empty notes — a chip that matches nothing, and nothing to act on at all.
 * Renders a fragment, so its elements sit in the tab panel as before. Moved out
 * of `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<CallOffFiltersProps>}
 */
const CallOffFilters = ({
  search,
  setSearch,
  sections,
  pic,
  onToAct,
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

      {onToAct ? (
        <FilterChipsBar
          options={[
            { id: 'all', label: t('co.toAct.filter.any') },
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
      ) : null}

      {onToAct && statusFilter !== 'all' && sections.length === 0 ? (
        <p
          className="text-sm text-text-tertiary py-8 text-center"
          data-testid="calloff-filter-empty"
        >
          {t('co.pti.filter.empty')}
        </p>
      ) : null}

      {onToAct && statusFilter === 'all' && sections.length === 0 ? (
        <p
          className="text-sm text-text-tertiary py-8 text-center"
          data-testid="calloff-toact-empty"
        >
          {t('co.toAct.empty')}
        </p>
      ) : null}
    </>
  );
};

export default CallOffFilters;
