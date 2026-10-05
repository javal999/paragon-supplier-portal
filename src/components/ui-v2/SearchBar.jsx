/** @import * as React from 'react' */
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
/**
 * @param {SearchBarProps} props
 * @returns {React.ReactNode}
 */
const SearchBar = ({ value, onChange, placeholder, className = '', ariaLabel }) => {
  const { t } = useTranslation();
  // BL-31 (WCAG 3.3.2 / 4.1.2): every SearchBar has a stable accessible name.
  // A caller's `ariaLabel` wins; otherwise the hint text becomes the name, so
  // it survives the moment the reader types (a placeholder alone does not).
  // The default hint was an English literal; it is now `ui.search`.
  const hint = placeholder ?? t('ui.search');
  return (
    <div
      // BL-31 / DP-2: the focus border is action-blue (the selected/active
      // colour), not decorative teal.
      className={`flex items-center h-10 w-full bg-white border border-border-input rounded-md px-3 gap-2 focus-within:border-action focus-within:ring-1 focus-within:ring-action transition-colors ${className}`}
    >
      <Search size={16} className="text-text-tertiary shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        aria-label={ariaLabel ?? hint}
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          aria-label={t('ui.clearSearch')}
          onClick={() => onChange('')}
          className="text-text-tertiary hover:text-text-secondary shrink-0"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
};
export default SearchBar;
/**
 * @typedef {Object} SearchBarProps
 * @property {string} value
 * @property {(next: string) => void} onChange
 * @property {string} [placeholder]
 * @property {string} [className]
 * @property {string} [ariaLabel] Accessible name for the input. Optional and additive (GL-1): a placeholder
 *  is a hint, not a label, and a search box whose only name is its hint loses
 *  that name the moment a reader types. Existing callers are unaffected.
 */
