// ────────────────────────────────────────────────────────────────────────────
// BL-326 — the refusals on the ASN line editor, at the surface.
//
// MR !151 pointed the quantity input at an id rendered only for the `bad`
// case, so an over-open line was invalid with a describedby that resolved to
// nothing; !155 fixed that half. This spec covers the second half: a line that
// is BOTH bad and over names both messages, and the expiry — which carried an
// invalid mark for an unreadable date and for a short shelf life while its
// describedby pointed at a note that only renders when the shelf-life view
// exists — now names the note that is actually on screen (the BL-326 defect).
// ────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import AsnLinesEditor from './AsnLinesEditor';

const OPEN = [{ materialCode: 'MAT-1', description: 'Bottle', uom: 'PCS', open: 10 }];

/**
 * One line as `readLines` would return it.
 * @param {{ qtyOk?: boolean, over?: boolean, refusal?: string | null, shelfLife?: { minMonths: number, monthsLeft: number | null, ok: boolean } | null }} flags
 * @returns {import('../../shipments/asnLines').AsnLinesRead}
 */
const readOf = ({ qtyOk = true, over = false, refusal = null, shelfLife = null }) =>
  /** @type {import('../../shipments/asnLines').AsnLinesRead} */ ({
    lines: [
      {
        line: OPEN[0],
        input: { materialCode: 'MAT-1', shippedQty: 20 },
        refusal: refusal ?? (over ? 'overOpen' : null),
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
 * @param {{ qtyOk?: boolean, over?: boolean, refusal?: string | null, shelfLife?: { minMonths: number, monthsLeft: number | null, ok: boolean } | null }} flags
 */
const renderEditor = (flags) =>
  renderWithProviders(
    <AsnLinesEditor
      open={OPEN}
      entries={{ 'MAT-1': { qty: '20', batch: '', expiry: '', batchSource: 'declared' } }}
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

describe('BL-326 · the ASN quantity describes every refusal that is on screen', () => {
  it('an over-open line (qtyOk, not bad) describes the form-level over-open alert', () => {
    renderEditor({ qtyOk: true, over: true });
    const qty = screen.getByLabelText('Shipped quantity for MAT-1');
    expect(qty).toHaveAttribute('aria-invalid', 'true');
    const ids = describedIds(qty);
    expect(ids.length).toBeGreaterThan(0);
    // The referenced element exists and carries the over-open message.
    const described = document.getElementById(ids[0]);
    expect(described).not.toBeNull();
    expect(described?.textContent).toContain('above the open quantity');
  });

  it('KNOWN-GOOD: a line with a bad quantity still describes its own line note', () => {
    renderEditor({ qtyOk: false, over: false });
    const qty = screen.getByLabelText('Shipped quantity for MAT-1');
    expect(qty).toHaveAttribute('aria-invalid', 'true');
    const described = document.getElementById(describedIds(qty)[0]);
    expect(described?.textContent).toContain('Enter a quantity greater than zero');
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

describe('BL-326 · the ASN expiry names the note it actually renders', () => {
  it('an unreadable date is invalid and describes its own note', () => {
    renderEditor({ refusal: 'expiry' });
    const expiry = screen.getByLabelText('Expiry date for MAT-1');
    expect(expiry).toHaveAttribute('aria-invalid', 'true');
    expect(expiry).toHaveAttribute('aria-describedby', 'asn-expiry-MAT-1-invalid');
    expect(document.getElementById('asn-expiry-MAT-1-invalid')).toHaveTextContent(
      'Enter a valid expiry date'
    );
  });

  it('a required expiry describes the shelf-life note', () => {
    renderEditor({ refusal: 'expiryRequired' });
    const expiry = screen.getByLabelText('Expiry date for MAT-1');
    expect(expiry).toHaveAttribute('aria-invalid', 'true');
    expect(expiry).toHaveAttribute('aria-describedby', 'asn-expiry-MAT-1-note');
    expect(document.getElementById('asn-expiry-MAT-1-note')).toHaveTextContent(
      'Expiry is required for this material'
    );
  });

  it('a short shelf life describes the months-left note', () => {
    renderEditor({
      refusal: 'shelfLife',
      shelfLife: { minMonths: 6, monthsLeft: 2.4, ok: false }
    });
    const expiry = screen.getByLabelText('Expiry date for MAT-1');
    expect(expiry).toHaveAttribute('aria-invalid', 'true');
    expect(expiry).toHaveAttribute('aria-describedby', 'asn-expiry-MAT-1-note');
    expect(document.getElementById('asn-expiry-MAT-1-note')).toHaveTextContent(
      'months left at ETA'
    );
  });

  it('KNOWN-GOOD: a readable expiry that meets the rule is not invalid', () => {
    renderEditor({ shelfLife: { minMonths: 6, monthsLeft: 8.2, ok: true } });
    const expiry = screen.getByLabelText('Expiry date for MAT-1');
    expect(expiry).not.toHaveAttribute('aria-invalid');
  });
});
