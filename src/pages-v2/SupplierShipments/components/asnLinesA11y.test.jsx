// ────────────────────────────────────────────────────────────────────────────
// BL-326 — the described element on the ASN line editor, at the surface.
//
// MR !151 pointed the quantity input at an id rendered only for the `bad`
// case, so an over-open line was invalid with a describedby that resolved to
// nothing. Two passes fixed it: this branch binds the mark and the note to one
// reading and names EVERY message on screen, and the bl233/bl84 lane (main)
// pinned the expiry's own gap — a date the rule cannot read (`refusal:
// 'expiry'`) set `aria-invalid` while every description it could name was
// rendered on a different condition. The merged spec keeps both passes'
// assertions: each case asserts the reference RESOLVES and carries the message
// about THAT control, each has a known-good twin so the pass cannot be bought
// by pointing every control at one note, and a line that is both bad and
// over-open names both ids rather than only the first.
// ────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import AsnLinesEditor from './AsnLinesEditor';

const OPEN = [{ materialCode: 'MAT-1', description: 'Bottle', uom: 'PCS', open: 10 }];

/**
 * One line as `readLines` would return it.
 * @param {{ qtyOk?: boolean; over?: boolean; refusal?: import('@services/transitions/fulfilmentRules').AsnLineRefusal | null; shelfLife?: import('@services/transitions/fulfilmentRules').ShelfLifeLineView | null }} [flags]
 * @returns {import('../../shipments/asnLines').AsnLinesRead}
 */
const readOf = ({ qtyOk = true, over = false, refusal = null, shelfLife = null } = {}) =>
  /** @type {import('../../shipments/asnLines').AsnLinesRead} */ ({
    lines: [
      {
        line: OPEN[0],
        input: { materialCode: 'MAT-1', shippedQty: 20 },
        refusal,
        qtyOk,
        over,
        batchSource: 'declared',
        aboveAvailable: null,
        shelfLife
      }
    ],
    overCount: over ? 1 : 0,
    aboveAvailable: [],
    complete: false,
    onlyShelfLife: false,
    // AIB-1 (BL-348) — no sequence failure in this probe.
    sequenceRead: {
      ok: true,
      sequenceMissing: false,
      externalIdMissing: false,
      alreadyUsedBy: null,
      lines: []
    }
  });

/**
 * @param {string} [expiry]
 * @returns {Record<string, import('../../shipments/asnLines').LineEntry>}
 */
const entryWith = (expiry = '') => ({
  'MAT-1': { qty: '20', batch: '', expiry, batchSource: 'declared' }
});

/**
 * @param {{ qtyOk?: boolean; over?: boolean; refusal?: import('@services/transitions/fulfilmentRules').AsnLineRefusal | null; shelfLife?: import('@services/transitions/fulfilmentRules').ShelfLifeLineView | null }} [flags]
 * @param {string} [expiry]
 */
const renderEditor = (flags = {}, expiry = '') =>
  renderWithProviders(
    <AsnLinesEditor
      open={OPEN}
      entries={entryWith(expiry)}
      read={readOf(flags)}
      batches={{}}
      onChange={() => {}}
      overShipReason=""
      onReasonChange={() => {}}
    />
  );

/** @param {HTMLElement} el */
const describedIds = (el) =>
  (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);

/**
 * The element a control's `aria-describedby` names, read back the way a screen
 * reader would: the attribute must name at least one id, and that id must be on
 * screen. A control with the attribute absent fails here, which is the defect.
 * @param {HTMLElement} control
 * @returns {HTMLElement}
 */
const describedElementOf = (control) => {
  const ids = describedIds(control);
  expect(ids.length).toBeGreaterThan(0);
  const described = document.getElementById(ids[0]);
  expect(described).not.toBeNull();
  return /** @type {HTMLElement} */ (described);
};

describe('BL-326 · the ASN quantity describes every refusal that is on screen', () => {
  it('an over-open line (qtyOk, not bad) describes the form-level over-open alert', () => {
    renderEditor({ qtyOk: true, over: true });
    const qty = screen.getByLabelText('Shipped quantity for MAT-1');
    expect(qty).toHaveAttribute('aria-invalid', 'true');
    expect(describedElementOf(qty).textContent).toContain('above the open quantity');
  });

  it('KNOWN-GOOD: a line with a bad quantity still describes its own line note', () => {
    renderEditor({ qtyOk: false, over: false });
    const qty = screen.getByLabelText('Shipped quantity for MAT-1');
    expect(qty).toHaveAttribute('aria-invalid', 'true');
    expect(describedElementOf(qty).textContent).toContain('Enter a quantity greater than zero');
  });

  it('a line that is BOTH bad and over names both messages, not only the first', () => {
    renderEditor({ qtyOk: false, over: true });
    const qty = screen.getByLabelText('Shipped quantity for MAT-1');
    const ids = describedIds(qty);
    expect(ids).toEqual(['asn-qty-MAT-1-invalid', 'asn-over-open-alert']);
    expect(document.getElementById(ids[0])?.textContent).toContain(
      'Enter a quantity greater than zero'
    );
    expect(document.getElementById(ids[1])?.textContent).toContain('above the open quantity');
  });
});

describe('BL-326 · the ASN expiry describes the refusal that is on screen', () => {
  it('fires: a date the rule cannot read is invalid AND names a message that renders', () => {
    // The old wiring: `aria-invalid` was true for `expiry`, and every id the
    // field could name was rendered only for `expiryRequired` or a shelf-life
    // figure — so the reader heard "invalid" and nothing else.
    renderEditor({ refusal: 'expiry' }, 'not-a-date');
    const expiry = screen.getByLabelText('Expiry date for MAT-1');
    expect(expiry).toHaveAttribute('aria-invalid', 'true');
    // The exact id is pinned as well: it is the unreadable-date note, never the
    // shelf-life note that cannot render on this path.
    expect(expiry).toHaveAttribute('aria-describedby', 'asn-expiry-MAT-1-invalid');
    expect(describedElementOf(expiry).textContent).toContain('Enter a real expiry date');
  });

  it('KNOWN-GOOD: an expiry-required line describes the required message', () => {
    renderEditor({ refusal: 'expiryRequired' });
    const expiry = screen.getByLabelText('Expiry date for MAT-1');
    expect(expiry).toHaveAttribute('aria-invalid', 'true');
    expect(describedElementOf(expiry).textContent).toContain('Expiry is required');
  });

  it('KNOWN-GOOD: a shelf-life failure describes the figure it failed against', () => {
    renderEditor(
      {
        refusal: 'shelfLife',
        shelfLife: { minMonths: 6, monthsLeft: 2, ok: false }
      },
      '2026-12-31'
    );
    const expiry = screen.getByLabelText('Expiry date for MAT-1');
    expect(expiry).toHaveAttribute('aria-invalid', 'true');
    const described = describedElementOf(expiry);
    expect(described.textContent).toContain('months left at ETA');
    expect(described.textContent).toContain('Below the minimum of 6 months');
  });

  it('KNOWN-GOOD: a clean line is not invalid and names nothing', () => {
    renderEditor({}, '2027-12-31');
    const expiry = screen.getByLabelText('Expiry date for MAT-1');
    // The component omits the attribute when valid (`|| undefined`), so the
    // assertion is absence rather than the string "false".
    expect(expiry).not.toHaveAttribute('aria-invalid');
    expect(expiry.getAttribute('aria-describedby')).toBeNull();
  });
});
