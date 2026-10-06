/** @import * as React from 'react' */
import { useRef } from 'react';

// A11y finding 30 (ARIA radio-group pattern): in single-select mode the group
// is ONE Tab stop. The checked chip is tabbable (the first chip when none is
// checked); Left/Up and Right/Down move focus and selection, wrapping; Home and
// End go to the first and last chip. Multi-select (a checkbox group) keeps one
// Tab stop per chip, which is that pattern's own rule.
/** @type {Record<string, 1 | -1>} */
const STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * @template {string} T
 * @param {FilterChipsBarProps<T>} props
 * @returns {React.ReactNode}
 */
const FilterChipsBar = ({ options, value, onChange, multiSelect = false, className = '' }) => {
  /**
   * @param {T} id
   * @returns {boolean}
   */
  const isActive = (id) => {
    if (Array.isArray(value)) return value.includes(id);
    return value === id;
  };
  /** @type {React.MutableRefObject<(HTMLButtonElement | null)[]>} */
  const chipRefs = useRef([]);
  const checkedIndex = options.findIndex((opt) => isActive(opt.id));
  const tabbableIndex = checkedIndex === -1 ? 0 : checkedIndex;
  /**
   * @param {React.KeyboardEvent<HTMLButtonElement>} event
   * @param {number} index
   */
  const onRadioKeyDown = (event, index) => {
    const last = options.length - 1;
    let next = -1;
    if (event.key in STEP) next = (index + STEP[event.key] + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === -1) return;
    event.preventDefault();
    chipRefs.current[next]?.focus();
    onChange(options[next].id);
  };
  return (
    <div
      role={multiSelect ? 'group' : 'radiogroup'}
      className={`inline-flex flex-wrap items-center gap-1 bg-bg-hover border border-border-subtle rounded-md p-1 ${className}`}
    >
      {options.map((opt, index) => {
        const active = isActive(opt.id);
        return (
          <button
            key={opt.id}
            ref={(el) => {
              chipRefs.current[index] = el;
            }}
            type="button"
            role={multiSelect ? 'checkbox' : 'radio'}
            aria-checked={active}
            tabIndex={multiSelect ? undefined : index === tabbableIndex ? 0 : -1}
            onKeyDown={multiSelect ? undefined : (event) => onRadioKeyDown(event, index)}
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[6px] transition-all duration-150 cursor-pointer ${
              active
                ? 'bg-white text-text-primary shadow-sm'
                : 'bg-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`inline-flex items-center justify-center rounded-full px-1.5 text-xs font-semibold ${active ? 'text-text-tertiary' : 'text-text-tertiary'}`}
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
export default FilterChipsBar;
/**
 * @template {string} T
 * @typedef {Object} FilterChipOption
 * @property {T} id
 * @property {string} label
 * @property {number} [count]
 */
/**
 * @template {string} T
 * @typedef {Object} FilterChipsBarProps
 * @property {FilterChipOption<T>[]} options
 * @property {T | T[]} value
 * @property {(next: T) => void} onChange
 * @property {boolean} [multiSelect]
 * @property {string} [className]
 */
