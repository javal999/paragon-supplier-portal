import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@lib/i18n';
import TermTip, { placeTip } from './TermTip';

// BL-300 to BL-302 — UI layering review 2026-11 (UL-01 to UL-03), portal ruled
// by the owner (UL-Q1). Each spec fires at the defect the review measured on
// GitLab main a8eecbc7, not at a synthetic shape.

const SCREEN = { width: 1440, height: 900 };
const BOX = { width: 256, height: 80 };
/** @param {number} left @param {number} top @param {number} [w] @param {number} [h] */
const rect = (left, top, w = 120, h = 20) =>
  /** @type {DOMRect} */ ({ left, top, right: left + w, bottom: top + h, width: w, height: h });

const popup = () => document.body.querySelector('[data-tip-popup="term-tip-masc"]');

afterEach(() => vi.useRealTimers());

describe('placeTip: the box stays on screen (UL-02)', () => {
  it('opens below the label when there is room', () => {
    expect(placeTip(rect(300, 200), BOX, SCREEN)).toEqual({ top: 224, left: 300, above: false });
  });

  it('opens on a forced side when the box fits there (BL-309), else by the default rule', () => {
    expect(placeTip(rect(300, 200), BOX, SCREEN, 'above')).toEqual({
      top: 116,
      left: 300,
      above: true
    });
    expect(placeTip(rect(300, 40), BOX, SCREEN, 'above').above).toBe(false);
  });

  it('opens above when the room below is short and the room above is larger', () => {
    const p = placeTip(rect(300, 850), BOX, SCREEN);
    expect(p.above).toBe(true);
    expect(p.top).toBe(850 - 4 - 80);
  });

  it('moves left at the right edge instead of being cut (Safety stock "Max Stock" at x 1269 cut 124 px)', () => {
    const p = placeTip(rect(1269, 300), BOX, SCREEN);
    expect(p.left).toBe(1440 - 8 - 256);
    expect(p.left + BOX.width).toBeLessThanOrEqual(SCREEN.width - 8);
  });

  it('never starts left of the screen edge', () => {
    expect(placeTip(rect(-40, 300), BOX, SCREEN).left).toBe(8);
  });
});

describe('the open box (UL-01, UL-02)', () => {
  it('is drawn in a portal on document.body, outside every scroll area, and wraps its text', () => {
    render(
      <div style={{ overflowX: 'auto', whiteSpace: 'nowrap' }} data-testid="grid">
        <TermTip term="MASC">MASC</TermTip>
      </div>
    );
    fireEvent.focus(screen.getByRole('button', { name: /MASC/ }));
    const box = /** @type {HTMLElement} */ (popup());
    expect(box.parentElement).toBe(document.body);
    expect(screen.getByTestId('grid').contains(box)).toBe(false);
    // The grid cell's `nowrap` (MaterialSection.jsx:16) no longer reaches it.
    expect(box.className).toContain('whitespace-normal');
    expect(box.className).toContain('fixed');
    expect(box).toHaveAttribute('aria-hidden', 'true');
    expect(box.className).toContain('max-w-[calc(100vw-1rem)]');
  });

  it('keeps the description in place for the button and for the label text', () => {
    render(<TermTip term="MASC">MASC</TermTip>);
    const tip = screen.getByRole('tooltip');
    expect(screen.getByTestId('term-tip-masc').contains(tip)).toBe(true);
    // `display: none`: hidden text still describes the button, and stays out of
    // the name of a card button around the label (the screen-reader-only version
    // put the whole definition into Shipments & ASN's status card names).
    expect(tip.className).toMatch(/(^| )hidden( |$)/);
    expect(screen.getByRole('button', { name: /MASC/ })).toHaveAccessibleDescription(
      /** @type {string} */ (tip.textContent)
    );
  });
});

describe('WCAG 1.4.13 with a pointer (UL-03)', () => {
  it('stays open while the pointer moves from the label onto the box', () => {
    vi.useFakeTimers();
    render(<TermTip term="MASC">MASC</TermTip>);
    const wrap = screen.getByTestId('term-tip-masc');
    fireEvent.mouseEnter(wrap);
    expect(popup()).not.toBeNull();
    fireEvent.mouseLeave(wrap);
    fireEvent.mouseEnter(/** @type {HTMLElement} */ (popup()));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(popup()).not.toBeNull();
    fireEvent.mouseLeave(/** @type {HTMLElement} */ (popup()));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(popup()).toBeNull();
  });

  it('Escape closes a tip opened by hover, with focus elsewhere, and the next hover shows it again', () => {
    vi.useFakeTimers();
    render(<TermTip term="MASC">MASC</TermTip>);
    const wrap = screen.getByTestId('term-tip-masc');
    fireEvent.mouseEnter(wrap);
    expect(popup()).not.toBeNull();
    expect(document.activeElement).toBe(document.body);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(popup()).toBeNull();
    fireEvent.mouseLeave(wrap);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.mouseEnter(wrap);
    expect(popup()).not.toBeNull();
  });

  it('Escape on an open tip does not reach a dialog behind it', () => {
    const onDialogKey = vi.fn();
    render(
      <div role="dialog" onKeyDown={onDialogKey}>
        <TermTip term="MASC">MASC</TermTip>
      </div>
    );
    const button = screen.getByRole('button', { name: /MASC/ });
    fireEvent.focus(button);
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(popup()).toBeNull();
    expect(onDialogKey).not.toHaveBeenCalled();
    // With the tip closed, Escape reaches the dialog again.
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(onDialogKey).toHaveBeenCalledTimes(1);
  });
});

describe('BL-309 (UL-04): the box opens on the side that covers fewer controls', () => {
  /**
   * The label at y 300, one input either just below it or just above it.
   * @param {'below' | 'above'} where
   */
  const renderWithField = (where) => {
    render(
      <div>
        <TermTip term="MASC">MASC</TermTip>
        <input aria-label="next field" />
      </div>
    );
    const wrap = screen.getByTestId('term-tip-masc');
    wrap.getBoundingClientRect = () => rect(300, 300);
    const field = screen.getByLabelText('next field');
    field.getBoundingClientRect = () =>
      where === 'below' ? rect(300, 330, 200, 30) : rect(300, 240, 200, 30);
  };
  const size = { configurable: true, get: () => 80 };
  const width = { configurable: true, get: () => 256 };
  /** @type {PropertyDescriptor | undefined} */
  let h;
  /** @type {PropertyDescriptor | undefined} */
  let w;
  beforeEach(() => {
    h = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    w = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', size);
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', width);
  });
  afterEach(() => {
    if (h) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', h);
    if (w) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', w);
  });

  it('a field right below the label: the box opens above it', () => {
    renderWithField('below');
    fireEvent.focus(screen.getByRole('button', { name: /MASC/ }));
    expect(popup()).toHaveAttribute('data-placement', 'above');
  });

  it('a field above the label: the box stays below', () => {
    renderWithField('above');
    fireEvent.focus(screen.getByRole('button', { name: /MASC/ }));
    expect(popup()).toHaveAttribute('data-placement', 'below');
  });
});
