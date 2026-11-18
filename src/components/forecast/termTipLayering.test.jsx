import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@lib/i18n';
import KpiCard from '@components/ui-v2/KpiCard';
import TermTip, { fitInHost, placeBeside, placeTip } from './TermTip';

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

describe('BL-311: a label with controls above and below opens beside them', () => {
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

  it('a field above and a field below: the box opens to the right', () => {
    render(
      <div>
        <input aria-label="field above" />
        <TermTip term="MASC">MASC</TermTip>
        <input aria-label="field below" />
      </div>
    );
    screen.getByTestId('term-tip-masc').getBoundingClientRect = () => rect(300, 300);
    screen.getByLabelText('field above').getBoundingClientRect = () => rect(300, 240, 100, 30);
    screen.getByLabelText('field below').getBoundingClientRect = () => rect(300, 330, 100, 30);
    fireEvent.focus(screen.getByRole('button', { name: /MASC/ }));
    expect(popup()).toHaveAttribute('data-placement', 'right');
  });

  it('placeBeside: null when the side does not fit on screen', () => {
    expect(placeBeside(rect(1300, 300), BOX, SCREEN, 'right')).toBeNull();
    expect(placeBeside(rect(100, 300), BOX, SCREEN, 'left')).toBeNull();
    expect(placeBeside(rect(300, 300), BOX, SCREEN, 'right')).toEqual({
      top: 300,
      left: 424,
      above: false,
      side: 'right'
    });
  });
});

// BL-319 and BL-320 (UL-04, re-measured 2026-11-16 on GitLab main 48030abe at
// 1440 x 900). Shipments & ASN: the status cards are 213 px wide, at x 272
// (Draft) and x 501 (Submitted); the "Draft" label starts at x 297. The 256 px
// box lay 52 px over the next card, and a click on the (i) set the Draft filter.
describe('BL-319 (UL-04): a tip in a clickable card stays inside that card', () => {
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

  it('fitInHost: as wide as the card allows, inside it and on screen', () => {
    const draftCard = rect(272, 227, 213, 118);
    expect(fitInHost(rect(297, 250, 60, 16), draftCard, SCREEN)).toEqual({ width: 205, left: 276 });
    // The last card of the row (Discrepancy, x 1189).
    expect(fitInHost(rect(1310, 250, 60, 16), rect(1189, 227, 213, 118), SCREEN)).toEqual({
      width: 205,
      left: 1193
    });
    // A wide card keeps the box's own width, under its label.
    expect(fitInHost(rect(140, 250, 60, 16), rect(100, 227, 400, 118), SCREEN)).toEqual({
      width: 256,
      left: 140
    });
    // Too narrow for a readable box: not fitted, the side rule decides.
    expect(fitInHost(rect(110, 250, 60, 16), rect(100, 227, 150, 118), SCREEN)).toBeNull();
  });

  /**
   * The Draft and Submitted status cards as measured, each a real KpiCard.
   * @param {() => void} onDraft
   */
  const renderCards = (onDraft) => {
    render(
      <div>
        <KpiCard term="asnDraft" value="1" onClick={onDraft} />
        <KpiCard term="asnSubmitted" value="0" onClick={() => {}} />
      </div>
    );
    const [draft, submitted] = screen.getAllByRole('button', { pressed: false });
    draft.getBoundingClientRect = () => rect(272, 227, 213, 118);
    submitted.getBoundingClientRect = () => rect(501, 227, 213, 118);
    // BL-322: the label no longer sits INSIDE the card's button, so the card
    // surface the tip is fitted to (and read for BL-319) is the marked card,
    // not the button. Same box, because the button stretches over it.
    /** @type {HTMLElement} */ (draft.closest('[data-tip-host]')).getBoundingClientRect = () =>
      rect(272, 227, 213, 118);
    screen.getByTestId('term-tip-asn-draft').getBoundingClientRect = () => rect(297, 250, 60, 16);
    return { draft, info: screen.getByRole('button', { name: /What “Draft” means/ }) };
  };
  const draftPopup = () =>
    /** @type {HTMLElement} */ (
      document.body.querySelector('[data-tip-popup="term-tip-asn-draft"]')
    );

  it('opens below its label, fitted inside its own card, clear of the next card', () => {
    const { info } = renderCards(() => {});
    fireEvent.focus(info);
    const box = draftPopup();
    // Before: the box opened to the left (the card it sits in counted as covered on
    // every side), and below it lay over "Submitted" from x 501 to 553.
    expect(box).toHaveAttribute('data-placement', 'below');
    expect(box.style.left).toBe('276px');
    expect(box.style.width).toBe('205px');
    expect(276 + 205).toBeLessThan(501);
  });

  it('on a tie in covered controls, the side that hides the least of them wins', () => {
    render(
      <div>
        <input aria-label="small field above" />
        <TermTip term="MASC">MASC</TermTip>
        <input aria-label="large field below" />
      </div>
    );
    screen.getByTestId('term-tip-masc').getBoundingClientRect = () => rect(100, 300);
    screen.getByLabelText('small field above').getBoundingClientRect = () => rect(100, 280, 30, 10);
    screen.getByLabelText('large field below').getBoundingClientRect = () =>
      rect(100, 330, 200, 60);
    fireEvent.focus(screen.getByRole('button', { name: /MASC/ }));
    // Above, below and right each cover one field; above hides 300 px² of it,
    // right 3,800 and below 12,000. Before, the tie kept the default side, below.
    expect(popup()).toHaveAttribute('data-placement', 'above');
  });
});

describe('BL-320: the (i) inside a clickable card explains it and does not apply it', () => {
  it('a click on the (i) does not reach the card; a click on the card still does', () => {
    const onDraft = vi.fn();
    render(<KpiCard term="asnDraft" value="1" onClick={onDraft} />);
    fireEvent.click(screen.getByRole('button', { name: /What “Draft” means/ }));
    // Before: this set the "Draft" filter on Shipments & ASN.
    expect(onDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { pressed: false }));
    expect(onDraft).toHaveBeenCalledTimes(1);
  });

  it('outside a control the click is left alone', () => {
    const onRow = vi.fn();
    render(
      <div onClick={onRow}>
        <TermTip term="MASC">MASC</TermTip>
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: /MASC/ }));
    expect(onRow).toHaveBeenCalledTimes(1);
  });
});
