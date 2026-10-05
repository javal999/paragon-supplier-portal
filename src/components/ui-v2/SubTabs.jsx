/** @import * as React from 'react' */
import { onTabListKeyDown } from './tabKeys';
/**
 * @template {string} T
 * @param {SubTabsProps<T>} props
 * @returns {React.ReactNode}
 */
const SubTabs = ({ options, value, onChange, className = '' }) => {
  return (
    <div
      role="tablist"
      onKeyDown={(e) =>
        onTabListKeyDown(
          e,
          options.map((x) => x.id),
          value,
          onChange
        )
      }
      className={`flex items-center gap-6 border-b border-border-subtle ${className}`}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`-mb-px flex items-center gap-2 py-3 text-sm transition-colors ${
              active
                ? 'text-action-hover font-semibold border-b-2 border-action'
                : 'text-text-tertiary border-b-2 border-transparent hover:text-text-secondary'
            }`}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`inline-flex items-center justify-center rounded-full px-2 h-5 text-xs font-semibold ${
                  active ? 'bg-action-soft text-action-hover' : 'bg-bg-hover text-text-tertiary'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
export default SubTabs;
/**
 * @template {string} T
 * @typedef {Object} SubTabItem
 * @property {T} id
 * @property {string} label
 * @property {number} [count]
 */
/**
 * @template {string} T
 * @typedef {Object} SubTabsProps
 * @property {SubTabItem<T>[]} options
 * @property {T} value
 * @property {(id: T) => void} onChange
 * @property {string} [className]
 */
