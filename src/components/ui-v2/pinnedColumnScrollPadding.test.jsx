import { describe, it, expect } from 'vitest';
import { placePinnedColumns } from './pinnedColumn';

// BL-304 (UL-06, UI layering review 2026-11). At 390 px a commitment field was
// 45 % under the pinned label column and PTI's Accept 27 % under the pinned
// Supplier column, because the browser scrolls a focused cell into view
// against the scroll area's padding, and the padding was 0.

/**
 * @param {('left' | 'right' | null)[]} pins
 * @param {number[]} widths
 */
const tableWith = (pins, widths) => {
  const scroller = document.createElement('div');
  const table = document.createElement('table');
  const head = table.createTHead().insertRow();
  pins.forEach((pin, i) => {
    const th = document.createElement('th');
    if (pin) th.dataset.pin = pin;
    th.getBoundingClientRect = () => /** @type {DOMRect} */ ({ width: widths[i] });
    head.appendChild(th);
  });
  table.createTBody().insertRow();
  scroller.appendChild(table);
  // A desktop-wide scroll area unless a spec narrows it (jsdom lays out nothing).
  Object.defineProperty(scroller, 'clientWidth', { value: 1200, configurable: true });
  return { scroller, table };
};

describe('pinned columns set the scroll padding (BL-304)', () => {
  it('padding at the start equals the left pins, at the end the right pins', () => {
    const { scroller, table } = tableWith(['left', 'left', null, 'right'], [40, 117, 300, 90]);
    placePinnedColumns(table);
    expect(scroller.style.scrollPaddingInlineStart).toBe('157px');
    expect(scroller.style.scrollPaddingInlineEnd).toBe('90px');
  });

  it('no pinned column on a side leaves that side at 0', () => {
    const { scroller, table } = tableWith(['left', null], [120, 300]);
    placePinnedColumns(table);
    expect(scroller.style.scrollPaddingInlineStart).toBe('120px');
    expect(scroller.style.scrollPaddingInlineEnd).toBe('0px');
  });
});

describe('pinned columns too wide for the screen scroll with the table (BL-304)', () => {
  /**
   * @param {number} clientWidth
   */
  const at = (clientWidth) => {
    const { scroller, table } = tableWith(['left', 'left', null], [40, 259, 300]);
    Object.defineProperty(scroller, 'clientWidth', { value: clientWidth, configurable: true });
    placePinnedColumns(table);
    return { scroller, table };
  };

  it('at 390 px (299 of 358 px pinned, as PTI Foresight commitments measured) the pins let go', () => {
    const { scroller, table } = at(358);
    expect(scroller.dataset.pinsOff).toBe('true');
    expect(scroller.style.scrollPaddingInlineStart).toBe('0px');
    for (const th of table.tHead?.rows[0].querySelectorAll('[data-pin]') ?? [])
      expect(/** @type {HTMLElement} */ (th).style.position).toBe('static');
  });

  it('at 1440 px the same columns stay pinned, with the padding', () => {
    const { scroller, table } = at(1100);
    expect(scroller.dataset.pinsOff).toBe('false');
    expect(scroller.style.scrollPaddingInlineStart).toBe('299px');
    const second = /** @type {HTMLElement} */ (table.tHead?.rows[0].cells[1]);
    expect(second.style.position).toBe('');
    expect(second.style.left).toBe('40px');
  });
});
