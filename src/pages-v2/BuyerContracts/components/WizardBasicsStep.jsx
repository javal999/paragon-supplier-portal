/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { ContractType } from '@data/mockContracts' */
/** @import { Supplier } from '@services/data/types' */
/** @import { DraftContract } from '../const' */
import SearchBar from '@components/ui-v2/SearchBar';
import { catLabel, typeLabel } from '../utils';

/** @type {ContractType[]} */
export const TYPE_OPTIONS = ['Supply', 'Service', 'Framework', 'NDA', 'Quality', 'Pricing'];

const BRAND_OPTIONS = ['Wardah', 'Emina', 'Make Over', 'Instaperfect', 'Kahf'];

const CATEGORY_OPTIONS = ['Raw Material', 'Active Ingredient', 'Fragrance', 'Packaging', 'Other'];

/**
 * @typedef {object} WizardBasicsStepProps
 * @property {DraftContract} draft The draft being collected.
 * @property {<K extends keyof DraftContract>(key: K, value: DraftContract[K]) => void} updateDraft
 *   Sets one draft field.
 * @property {string} supplierSearch The supplier picker's search text.
 * @property {(value: string) => void} setSupplierSearch
 * @property {Supplier[]} supplierTableFiltered The suppliers matching `supplierSearch`.
 * @property {(brand: string) => void} toggleBrand Adds or removes one brand chip.
 * @property {TFunction} t
 */

/**
 * Wizard step 1, "Basics": title, type, category, the supplier picker and the
 * brand chips. Every field writes straight into the draft through
 * `updateDraft`. `TYPE_OPTIONS`, `CATEGORY_OPTIONS` and `BRAND_OPTIONS` live in
 * this file because this file `.map()`s them (the module-scope-literal gate
 * keys them `file::CONST`); the page's type filter imports `TYPE_OPTIONS` from
 * here. Moved out of `BuyerContracts.jsx` by the Phase 5 page split (no
 * behaviour change).
 * @type {React.FC<WizardBasicsStepProps>}
 */
const WizardBasicsStep = ({
  draft,
  updateDraft,
  supplierSearch,
  setSupplierSearch,
  supplierTableFiltered,
  toggleBrand,
  t
}) => (
  <div className="space-y-5">
    <div>
      <label className="block">
        <span className="text-label text-text-tertiary uppercase block mb-1.5">
          {t('contracts.wizard.field.title')} <span className="text-danger">*</span>
        </span>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => updateDraft('title', e.target.value)}
          placeholder={t('contracts.wizard.placeholder.title')}
          className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
        />
      </label>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('contracts.wizard.field.type')} <span className="text-danger">*</span>
          </span>
          <select
            value={draft.type}
            onChange={(e) => updateDraft('type', /** @type {ContractType} */ (e.target.value))}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          >
            <option value="">{t('contracts.wizard.select.type')}</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {typeLabel(t, opt)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label className="block">
          <span className="text-label text-text-tertiary uppercase block mb-1.5">
            {t('contracts.wizard.field.category')} <span className="text-danger">*</span>
          </span>
          <select
            value={draft.category}
            onChange={(e) => updateDraft('category', e.target.value)}
            className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
          >
            <option value="">{t('contracts.wizard.select.category')}</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {catLabel(t, c)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
    <div>
      <label className="text-label text-text-tertiary uppercase block mb-1.5">
        {t('contracts.wizard.field.supplier')} <span className="text-danger">*</span>
      </label>
      <div className="mb-2">
        <SearchBar
          value={supplierSearch}
          onChange={setSupplierSearch}
          placeholder={t('contracts.wizard.search.supplier')}
        />
      </div>
      <div className="relative min-w-0 border border-border-subtle rounded-md overflow-x-auto max-h-56 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {supplierTableFiltered.map((s) => (
              <tr
                key={s.id}
                onClick={() => updateDraft('supplierId', s.id)}
                className={`border-t border-border-subtle cursor-pointer hover:bg-bg-hover ${
                  draft.supplierId === s.id ? 'bg-action-soft' : ''
                }`}
              >
                <td className="px-3 py-2">
                  <input
                    type="radio"
                    name="supplier"
                    aria-label={s.name}
                    checked={draft.supplierId === s.id}
                    onChange={() => updateDraft('supplierId', s.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="accent-teal"
                  />
                </td>
                <td className="px-3 py-2 text-text-primary">{s.name}</td>
                <td className="px-3 py-2 text-text-secondary">
                  {s.country} · {s.category}
                </td>
              </tr>
            ))}
            {supplierTableFiltered.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center text-sm text-text-tertiary py-6">
                  {t('contracts.wizard.supplier.noMatch')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    <div>
      <label className="text-label text-text-tertiary uppercase block mb-1.5">
        {t('contracts.wizard.field.brands')}
      </label>
      <div className="flex flex-wrap gap-2">
        {BRAND_OPTIONS.map((b) => {
          const selected = draft.brands.includes(b);
          return (
            <button
              key={b}
              type="button"
              onClick={() => toggleBrand(b)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                selected
                  ? 'bg-action text-white border border-action'
                  : 'bg-bg-surface text-text-secondary border border-border-input hover:border-action'
              }`}
            >
              {b}
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

export default WizardBasicsStep;
