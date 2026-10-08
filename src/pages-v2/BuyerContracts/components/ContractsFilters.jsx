/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { ContractType } from '@data/mockContracts' */
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SearchBar from '@components/ui-v2/SearchBar';
import { TYPE_OPTIONS } from './WizardBasicsStep';
import { typeLabel } from '../utils';

/**
 * @typedef {object} ContractsFiltersProps
 * @property {ContractType[]} selectedTypes The type chips currently on.
 * @property {(type: ContractType) => void} toggleType Turns one type chip on or off.
 * @property {string} search The list search text.
 * @property {(value: string) => void} setSearch
 * @property {TFunction} t
 */

/**
 * The filters under the status tabs: the multi-select contract-type chips and
 * the search box (contract number, title, supplier name). Moved out of
 * `BuyerContracts.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<ContractsFiltersProps>}
 */
const ContractsFilters = ({ selectedTypes, toggleType, search, setSearch, t }) => (
  <>
    <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
      <div>
        <div className="text-label text-text-tertiary uppercase mb-2">
          {t('contracts.filter.byType')}
        </div>
        <FilterChipsBar
          options={TYPE_OPTIONS.map((opt) => ({ id: opt, label: typeLabel(t, opt) }))}
          value={selectedTypes}
          onChange={toggleType}
          multiSelect
        />
      </div>
    </div>

    <div className="mb-4">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t('contracts.search.placeholder')}
      />
    </div>
  </>
);

export default ContractsFilters;
