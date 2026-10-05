/** @import * as React from 'react' */
/** @type {Record<Size, string>} */
const TRACK_SIZE = {
  sm: 'w-10 h-5',
  md: 'w-12 h-6'
};
/** @type {Record<Size, string>} */
const THUMB_SIZE = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5'
};
/** @type {Record<Size, { off: string; on: string }>} */
const THUMB_OFFSET = {
  sm: { off: '2px', on: '22px' },
  md: { off: '4px', on: '24px' }
};
// DP-3: the default "on" color is the blue action token (a switch is an
// interactive control). The `teal` key is retained for API compatibility but now
// renders action-blue; `success` stays semantic.
/** @type {Record<OnColor, string>} */
const ON_BG = {
  teal: 'bg-action',
  success: 'bg-success'
};
/**
 * @param {SwitchProps} props
 * @returns {React.ReactNode}
 */
const Switch = ({
  checked,
  onChange,
  ariaLabel,
  size = 'sm',
  onColor = 'teal',
  disabled = false
}) => {
  const offset = checked ? THUMB_OFFSET[size].on : THUMB_OFFSET[size].off;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${TRACK_SIZE[size]} ${checked ? ON_BG[onColor] : 'bg-bg-hover border border-border-input'}`}
    >
      <span
        className={`absolute top-0.5 rounded-full bg-white shadow-sm transition-all ${THUMB_SIZE[size]}`}
        style={{ left: offset }}
      />
    </button>
  );
};
export default Switch;
/** @typedef {'sm' | 'md'} Size */
/** @typedef {'teal' | 'success'} OnColor */
/**
 * @typedef {Object} SwitchProps
 * @property {boolean} checked
 * @property {(next: boolean) => void} onChange
 * @property {string} ariaLabel
 * @property {Size} [size]
 * @property {OnColor} [onColor]
 * @property {boolean} [disabled]
 */
