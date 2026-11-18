// ────────────────────────────────────────────────────────────────────────────
// BL-322 (WCAG 4.1.2, found with BL-320) — a clickable KpiCard is ONE control.
//
// The card used to be a <button> holding the term's (i), which is itself a
// button: invalid HTML, and two controls a screen reader can merge into one
// name. Now one stretched button covers the card and the (i) is its sibling,
// with its own name and its own click (BL-320's guard).
//
// House order: the probe fires at the pre-BL-322 shape first, so the DOM
// assertion below is shown to be able to fail before it is believed on the
// fixed shape.
// ────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@lib/i18n';
import KpiCard from './KpiCard';

/** Every button that has a button ancestor. @param {HTMLElement} root */
const nestedButtons = (root) => root.querySelectorAll('button button');

describe('BL-322 · a clickable KpiCard holds no button inside a button', () => {
  it('✅ PROBE: the pre-BL-322 shape (the (i) inside the card button) nests one', () => {
    // The DOM `KpiCard` produced before this change (captured from its own
    // render): the card WAS the <button> and `TermLabel`'s (i) sat inside it.
    // Built with createElement, not innerHTML (the HTML parser legally refuses
    // to nest a button), and not React (which would re-print the nesting
    // warning on every suite run) — the structure React really created.
    const root = document.createElement('div');
    const card = document.createElement('button');
    const info = document.createElement('button');
    info.setAttribute('aria-label', 'What “Draft” means');
    card.append(document.createElement('span'), info);
    root.append(card);
    expect(root.querySelectorAll('button')).toHaveLength(2);
    expect(nestedButtons(root)).toHaveLength(1);
  });

  it('a clickable card with a term renders two separate controls, neither inside the other', () => {
    const { container } = render(<KpiCard term="asnDraft" value="1" onClick={() => {}} />);
    expect(container.querySelectorAll('button')).toHaveLength(2);
    expect(nestedButtons(container)).toHaveLength(0);
    const card = screen.getByRole('button', { name: 'Draft 1' });
    const info = screen.getByRole('button', { name: 'What “Draft” means' });
    expect(card.contains(info)).toBe(false);
    // …and the card really is the element that carries the action.
    expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  it('the (i) click does not apply the card; the card click does (BL-320)', () => {
    const onDraft = vi.fn();
    render(<KpiCard term="asnDraft" value="1" onClick={onDraft} />);
    fireEvent.click(screen.getByRole('button', { name: 'What “Draft” means' }));
    expect(onDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Draft 1' }));
    expect(onDraft).toHaveBeenCalledTimes(1);
  });

  it('the card is named by its own content — label, value and subtitle', () => {
    render(<KpiCard eyebrow="Ready to Award" value="4" subtitle="of 12 RFQs" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Ready to Award 4 of 12 RFQs' })).toBeInTheDocument();
  });

  it('an active card stays a single pressed button', () => {
    render(<KpiCard term="asnDraft" value="1" onClick={() => {}} active />);
    const card = screen.getByRole('button', { pressed: true });
    expect(card).toHaveAccessibleName('Draft 1');
    expect(nestedButtons(card.parentElement ?? document.body)).toHaveLength(0);
  });

  it('a card with no action keeps its old shape: no card button, only the (i)', () => {
    const { container } = render(<KpiCard term="asnDraft" value="1" />);
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'What “Draft” means' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { pressed: false })).toBeNull();
  });

  it('the card content is still rendered in place', () => {
    const { container } = render(
      <KpiCard term="asnDraft" value="12" subtitle="awaiting pickup" onClick={() => {}} />
    );
    const card = screen.getByRole('button', { name: 'Draft 12 awaiting pickup' });
    const cardSurface = /** @type {HTMLElement} */ (card.parentElement);
    expect(within(cardSurface).getByText('Draft')).toBeInTheDocument();
    expect(within(cardSurface).getByText('12')).toBeInTheDocument();
    expect(within(cardSurface).getByText('awaiting pickup')).toBeInTheDocument();
    expect(container.querySelector('[data-tip-host]')).toBe(cardSurface);
  });
});
