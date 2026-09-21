import type React from 'react';

// BL-31 (WCAG 2.1.1, ARIA tabs pattern): Left/Right (and Home/End) move
// between tabs and activate the one reached. Additive — every tab stays a Tab
// stop as before, so nothing a keyboard user could already do is taken away.
export function onTabListKeyDown<T extends string>(
  e: React.KeyboardEvent<HTMLElement>,
  ids: readonly T[],
  current: T,
  onChange: (id: T) => void,
): void {
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
  const tabs = e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]');
  tabs[next]?.focus();
}
