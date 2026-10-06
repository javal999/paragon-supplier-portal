// ─────────────────────────────────────────────────────────────────────────────
// FOCUS RINGS — Forecast UX phase 3, task C2 (WCAG 2.4.7).
//
// The forecast pages' own controls that set `focus:outline-none` (the term-tip
// info button, and the text fields and selects that reuse the inventory
// `inputClass`) showed no keyboard focus, or only a 1 px border tint. These
// add a visible ring in the action colour, the same one `Button` draws.
//
// `FOCUS_RING` is an outline, for controls with no outline of their own.
// `FIELD_FOCUS_RING` is a box-shadow ring, because `focus:outline-none` on the
// shared field class would otherwise win over an outline.
// ─────────────────────────────────────────────────────────────────────────────

export const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action';

export const FIELD_FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-1';

/**
 * A 44 px tall hit area on a touch screen for a small text button (C2): a
 * transparent pseudo-element grows the tap target without moving the layout.
 * Mouse and keyboard keep the drawn size.
 */
export const TOUCH_TARGET =
  "relative [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:inset-x-0 [@media(pointer:coarse)]:before:-inset-y-3.5 [@media(pointer:coarse)]:before:content-['']";
