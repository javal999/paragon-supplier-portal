// ────────────────────────────────────────────────────────────────────────────
// GRInspectionWizard — the field caption and the two class strings every step
// shares. Kept together so a field looks the same on every step.
// ────────────────────────────────────────────────────────────────────────────

// BL-31: the caption is a <span>; the field's wrapper is the <label>, which is
// what associates the caption with its control (a sibling <label> with no
// htmlFor labels nothing).
/**
 * A field caption, rendered inside the `<label>` that wraps the control.
 * @param {string} text
 */
export const labelFor = (text) => (
  <span className="block text-xs font-medium text-text-tertiary uppercase mb-1">{text}</span>
);

/** Text input, select and textarea class. */
export const inputCls =
  'w-full rounded-md border border-border-input bg-white px-3 py-2 text-sm text-text-primary focus:border-action focus:outline-none';

/** Radio-option label class. */
export const radioCls = 'flex items-center gap-1.5 text-sm text-text-primary cursor-pointer';
