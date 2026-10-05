/** @import * as React from 'react' */
// BL-31 (WCAG 2.1.1, ARIA tabs pattern): Left/Right (and Home/End) move
// between tabs and activate the one reached. Additive — every tab stays a Tab
// stop as before, so nothing a keyboard user could already do is taken away.
/**
 * @template {string} T
 * @param {React.KeyboardEvent<HTMLElement>} e
 * @param {readonly T[]} ids
 * @param {T} current
 * @param {(id: T) => void} onChange
 * @returns {void}
 */
export function onTabListKeyDown(e, ids, current, onChange) {
  if (ids.length === 0) return;
  const i = ids.indexOf(current);
  let next = -1;
  if (e.key === 'ArrowRight') next = (i + 1) % ids.length;
  else if (e.key === 'ArrowLeft') next = (i - 1 + ids.length) % ids.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = ids.length - 1;
  if (next < 0) return;
  e.preventDefault();
  onChange(ids[next]);
  const tabs = /** @type {NodeListOf<HTMLElement>} */ (
    e.currentTarget.querySelectorAll('[role="tab"]')
  );
  tabs[next]?.focus();
}
