/** @import * as React from 'react' */

/**
 * Wraps the first case-insensitive occurrence of `query` in `label` in a
 * `<mark>`. Shared by every type-to-filter list (SelectField's combobox and the
 * top bar search), so a matched substring looks the same everywhere.
 * @param {string} label
 * @param {string} query
 * @returns {React.ReactNode}
 */
export function highlightMatch(label, query) {
  const trimmed = query.trim();
  if (!trimmed) return label;
  const idx = label.toLowerCase().indexOf(trimmed.toLowerCase());
  if (idx === -1) return label;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-teal-soft text-teal-hover font-semibold rounded-sm">
        {label.slice(idx, idx + trimmed.length)}
      </mark>
      {label.slice(idx + trimmed.length)}
    </>
  );
}
