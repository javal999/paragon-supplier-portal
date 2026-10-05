/** @import * as React from 'react' */
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SearchBar from './SearchBar';
import Data from './Data';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useMaterialNames } from '@services/query/hooks';
import { matchMaterial, searchMaterials } from '@services/transitions/matchMaterial';

/**
 * @import { MaterialMatch, MaterialSearchEntry, SearchableName } from '@services/transitions/matchMaterial'
 */

// ─────────────────────────────────────────────────────────────────────────────
// Material C3 · THE ONE MATERIAL SEARCH (MR-3 BR-04, d "Anyone searching").
//
// Two modes over the same rule (`matchMaterial`):
//   - `filter`: a search box that narrows a list. The page keeps the query and
//     shows `MaterialMatchReason` on each row it lists.
//   - `picker`: a search box that narrows a material `<select>`, each option
//     saying why it matched.
// The names searched come from `useMaterialNames`, whose read is narrowed in
// the read model (MAT-R4): a supplier's search only ever holds its own names.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A match with the supplier's display name, for the reason line.
 * @typedef {MaterialMatch & { readonly supplierName?: string }} ReasonedMatch
 */

/**
 * @typedef {(query: string, entry: MaterialSearchEntry) => ReasonedMatch | null} MaterialMatcher
 */

/**
 * The matcher over the approved names this reader may see.
 * @returns {MaterialMatcher}
 */
export function useMaterialMatcher() {
  const names = useMaterialNames();
  const { approved, supplierNames } = useMemo(() => {
    const rows = names.data?.items ?? [];
    /** @type {SearchableName[]} */
    const list = [];
    /** @type {Map<string, string>} */
    const byId = new Map();
    for (const r of rows) {
      byId.set(r.supplierId, r.supplierName);
      if (r.approved) list.push(r.approved);
    }
    return { approved: list, supplierNames: byId };
  }, [names.data]);
  return useCallback(
    /** @type {MaterialMatcher} */
    (query, entry) => {
      const m = matchMaterial(query, entry, approved);
      if (!m) return null;
      const supplierName = m.supplierId ? supplierNames.get(m.supplierId) : undefined;
      return supplierName ? { ...m, supplierName } : m;
    },
    [approved, supplierNames]
  );
}

/**
 * The list a query finds, best first, each with its match (null when the query is empty).
 * @template T
 * @param {string} query
 * @param {readonly T[]} items
 * @param {(item: T) => MaterialSearchEntry} entryOf
 * @returns {Array<{ item: T; match: ReasonedMatch | null }>}
 */
export function useMaterialSearch(query, items, entryOf) {
  const matchOf = useMaterialMatcher();
  return searchMaterials(query, items, entryOf, matchOf);
}

/**
 * The reason as plain text (for an `<option>`), e.g. "matched trade name 'Emulsense 200' (PT Example)".
 * @returns {(match: ReasonedMatch | null) => string}
 */
export function useMatchReasonText() {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const own = identity.personaType === 'supplier';
  return useCallback(
    /** @param {ReasonedMatch | null} match */
    (match) => {
      if (!match) return '';
      if (match.matchedOn === 'code') return t('matSearch.reason.code');
      if (match.matchedOn === 'description') return t('matSearch.reason.description');
      if (own || !match.supplierName)
        return t('matSearch.reason.ownTradeName', { name: match.tradeName ?? '' });
      return t('matSearch.reason.tradeName', {
        name: match.tradeName ?? '',
        supplier: match.supplierName
      });
    },
    [t, own]
  );
}

/**
 * The quiet line under a listed row saying what the search matched.
 * @param {{ match: ReasonedMatch | null; testId?: string }} props
 * @returns {React.ReactElement | null}
 */
export const MaterialMatchReason = ({ match, testId }) => {
  const text = useMatchReasonText();
  return match ? (
    <div className="text-xs text-text-tertiary" data-testid={testId}>
      {text(match)}
    </div>
  ) : null;
};

/**
 * @typedef {object} SearchProps
 * @property {string} query
 * @property {(next: string) => void} onQueryChange
 * @property {string} [placeholder]
 * @property {string} [className]
 * @property {string} [testId]
 */

/**
 * The props of the `picker` mode.
 * @typedef {object} PickerOnlyProps
 * @property {'picker'} mode
 * @property {string} id The `<select>`'s id; its label is `label`.
 * @property {string} label
 * @property {readonly MaterialSearchEntry[]} options The materials on offer; `supplierId` binds each to one supplier's names.
 * @property {string} value
 * @property {(code: string) => void} onChange
 * @property {string} emptyLabel
 * @property {string} [labelClassName]
 * @property {string} [selectClassName]
 */

/**
 * @typedef {({ mode: 'filter' } & SearchProps) | (PickerOnlyProps & SearchProps)} MaterialSearchProps
 */

/**
 * The material search box: a list filter, or a filter over a material `<select>`.
 * @param {MaterialSearchProps} props
 * @returns {React.ReactElement}
 */
const MaterialSearch = (props) => {
  const { t } = useTranslation();
  const placeholder = props.placeholder ?? t('matSearch.placeholder');
  const box = (
    <div data-testid={props.testId}>
      <SearchBar
        value={props.query}
        onChange={props.onQueryChange}
        placeholder={placeholder}
        ariaLabel={t('matSearch.label')}
        className={props.className}
      />
    </div>
  );
  return props.mode === 'filter' ? box : <MaterialPicker {...props} box={box} />;
};

/**
 * The `picker` mode: the search box above a `<select>` it narrows.
 * @param {Extract<MaterialSearchProps, { mode: 'picker' }> & { box: React.ReactNode }} props
 * @returns {React.ReactElement}
 */
const MaterialPicker = ({
  box,
  query,
  id,
  label,
  options,
  value,
  onChange,
  emptyLabel,
  labelClassName,
  selectClassName
}) => {
  const { t } = useTranslation();
  const reasonText = useMatchReasonText();
  const found = useMaterialSearch(query, options, (o) => o);
  // The chosen material stays on offer even when the query no longer finds it.
  const chosen = options.find((o) => o.code === value);
  const listed =
    chosen && !found.some((f) => f.item.code === value)
      ? [{ item: chosen, match: null }, ...found]
      : found;
  const selectedMatch = found.find((f) => f.item.code === value)?.match ?? null;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      {box}
      <select
        id={id}
        className={selectClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {listed.map(({ item, match }) => (
          <option key={item.code} value={item.code}>
            {`${item.code} · ${item.description}${match && match.matchedOn === 'tradeName' ? ` — ${reasonText(match)}` : ''}`}
          </option>
        ))}
      </select>
      {query.trim() !== '' && found.length === 0 ? (
        <p className="text-xs text-text-tertiary" data-testid={`${id}-no-match`}>
          {t('matSearch.noMatch', { query: query.trim() })}
        </p>
      ) : null}
      {selectedMatch ? (
        <p className="text-xs text-text-tertiary" data-testid={`${id}-reason`}>
          <Data>{value}</Data> — {reasonText(selectedMatch)}
        </p>
      ) : null}
    </div>
  );
};

export default MaterialSearch;
