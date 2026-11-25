// ─────────────────────────────────────────────────────────────────────────────
// UCX-P1 (BL-362) — a row counting one record opens that record; a row counting
// several opens the list filtered to them. The zero case goes to the list (the
// row does not render anyway), so the target is always a real page.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { oneRecordOrFiltered } from './taskTargets';

/** @param {{ id: string }} item */
const one = (item) => `/orders?po=${item.id}`;
const many = () => '/orders?tab=action';

describe('UCX-P1 — one record opens it, several open the filtered view', () => {
  it('opens the record when the row counts one', () => {
    expect(oneRecordOrFiltered([{ id: 'po-1' }], one, many)).toBe('/orders?po=po-1');
  });

  it('opens the filtered view when the row counts several', () => {
    expect(oneRecordOrFiltered([{ id: 'a' }, { id: 'b' }], one, many)).toBe('/orders?tab=action');
  });

  it('opens the filtered view when the row counts none', () => {
    expect(oneRecordOrFiltered([], one, many)).toBe('/orders?tab=action');
  });
});
