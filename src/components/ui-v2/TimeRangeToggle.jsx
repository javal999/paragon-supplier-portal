/** @import * as React from 'react' */
import { Calendar } from 'lucide-react';
/**
 * @template {string} T
 * @param {TimeRangeToggleProps<T>} props
 * @returns {React.ReactNode}
 */
const TimeRangeToggle = ({ options, value, onChange }) => {
  return (
    <div className="inline-flex items-center gap-1 bg-bg-hover border border-border-subtle rounded-md p-1">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            // BL-31 (WCAG 1.3.1 / 4.1.2): the chosen range was shown only by a
            // white fill; state it to assistive technology too.
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[var(--radius-medium)] transition-all duration-150 cursor-pointer ${
              active
                ? 'bg-white text-text-primary shadow-sm'
                : 'bg-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {active ? <Calendar size={14} className="text-text-tertiary" /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
export default TimeRangeToggle;
/**
 * @template {string} T
 * @typedef {Object} TimeRangeOption
 * @property {T} id
 * @property {string} label
 */
/**
 * @template {string} T
 * @typedef {Object} TimeRangeToggleProps
 * @property {TimeRangeOption<T>[]} options
 * @property {T} value
 * @property {(id: T) => void} onChange
 */
