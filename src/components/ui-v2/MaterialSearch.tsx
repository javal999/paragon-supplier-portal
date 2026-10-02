import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import SearchBar from './SearchBar';
import Data from './Data';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useMaterialNames } from '@services/query/hooks';
import {
  matchMaterial,
  searchMaterials,
  type MaterialMatch,
  type MaterialSearchEntry,
  type SearchableName,
} from '@services/transitions/matchMaterial';

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

/** A match with the supplier's display name, for the reason line. */
export interface ReasonedMatch extends MaterialMatch {
  readonly supplierName?: string;
}

export type MaterialMatcher = (query: string, entry: MaterialSearchEntry) => ReasonedMatch | null;

/** The matcher over the approved names this reader may see. */
export function useMaterialMatcher(): MaterialMatcher {
  const names = useMaterialNames();
  const { approved, supplierNames } = useMemo(() => {
    const rows = names.data?.items ?? [];
    const list: SearchableName[] = [];
    const byId = new Map<string, string>();
    for (const r of rows) {
      byId.set(r.supplierId, r.supplierName);
      if (r.approved) list.push(r.approved);
    }
    return { approved: list, supplierNames: byId };
  }, [names.data]);
  return useCallback(
    (query, entry) => {
      const m = matchMaterial(query, entry, approved);
      if (!m) return null;
      const supplierName = m.supplierId ? supplierNames.get(m.supplierId) : undefined;
      return supplierName ? { ...m, supplierName } : m;
    },
    [approved, supplierNames],
  );
}

/** The list a query finds, best first, each with its match (null when the query is empty). */
export function useMaterialSearch<T>(
  query: string,
  items: readonly T[],
  entryOf: (item: T) => MaterialSearchEntry,
): Array<{ item: T; match: ReasonedMatch | null }> {
  const matchOf = useMaterialMatcher();
  return searchMaterials(query, items, entryOf, matchOf);
}

/** The reason as plain text (for an `<option>`), e.g. "matched trade name 'Emulsense 200' (PT Example)". */
export function useMatchReasonText(): (match: ReasonedMatch | null) => string {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const own = identity.personaType === 'supplier';
  return useCallback(
    (match) => {
      if (!match) return '';
      if (match.matchedOn === 'code') return t('matSearch.reason.code');
      if (match.matchedOn === 'description') return t('matSearch.reason.description');
      if (own || !match.supplierName) return t('matSearch.reason.ownTradeName', { name: match.tradeName ?? '' });
      return t('matSearch.reason.tradeName', { name: match.tradeName ?? '', supplier: match.supplierName });
    },
    [t, own],
  );
}

/** The quiet line under a listed row saying what the search matched. */
export const MaterialMatchReason: React.FC<{ match: ReasonedMatch | null; testId?: string }> = ({ match, testId }) => {
  const text = useMatchReasonText();
  return match ? (
    <div className="text-xs text-text-tertiary" data-testid={testId}>
      {text(match)}
    </div>
  ) : null;
};

interface SearchProps {
  query: string;
  onQueryChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
}

export type MaterialSearchProps =
  | ({ mode: 'filter' } & SearchProps)
  | ({
      mode: 'picker';
      /** The `<select>`'s id; its label is `label`. */
      id: string;
      label: string;
      /** The materials on offer; `supplierId` binds each to one supplier's names. */
      options: readonly MaterialSearchEntry[];
      value: string;
      onChange: (code: string) => void;
      emptyLabel: string;
      labelClassName?: string;
      selectClassName?: string;
    } & SearchProps);

const MaterialSearch: React.FC<MaterialSearchProps> = (props) => {
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

const MaterialPicker: React.FC<Extract<MaterialSearchProps, { mode: 'picker' }> & { box: React.ReactNode }> = ({
  box,
  query,
  id,
  label,
  options,
  value,
  onChange,
  emptyLabel,
  labelClassName,
  selectClassName,
}) => {
  const { t } = useTranslation();
  const reasonText = useMatchReasonText();
  const found = useMaterialSearch(query, options, (o) => o);
  // The chosen material stays on offer even when the query no longer finds it.
  const chosen = options.find((o) => o.code === value);
  const listed = chosen && !found.some((f) => f.item.code === value) ? [{ item: chosen, match: null }, ...found] : found;
  const selectedMatch = found.find((f) => f.item.code === value)?.match ?? null;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      {box}
      <select id={id} className={selectClassName} value={value} onChange={(e) => onChange(e.target.value)}>
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
