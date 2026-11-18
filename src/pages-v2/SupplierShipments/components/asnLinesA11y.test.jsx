// ────────────────────────────────────────────────────────────────────────────
// BL-326 — the over-open refusal on the ASN line editor. MR !151 pointed the
// quantity input at an id rendered only for the `bad` case, so an over-open
// line was invalid with a describedby that resolved to nothing.
// ────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import AsnLinesEditor from './AsnLinesEditor';

const OPEN = [{ materialCode: 'MAT-1', description: 'Bottle', uom: 'PCS', open: 10 }];

/**
 * One line as `readLines` would return it.
 * @param {{ qtyOk: boolean; over: boolean }} flags
 * @returns {import('../../shipments/asnLines').AsnLinesRead}
 */
const readOf = ({ qtyOk, over }) =>
  /** @type {import('../../shipments/asnLines').AsnLinesRead} */ ({
    lines: [
      {
        line: OPEN[0],
        input: { materialCode: 'MAT-1', shippedQty: 20 },
        refusal: over ? 'overOpen' : null,
        qtyOk,
        over,
        batchSource: 'declared',
        aboveAvailable: null,
        shelfLife: null
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
 * @param {{ qtyOk: boolean; over: boolean }} flags
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

describe('BL-326 · the ASN quantity describes the refusal that is on screen', () => {
  it('an over-open line (qtyOk, not bad) describes the form-level over-open alert', () => {
    renderEditor({ qtyOk: true, over: true });
    const qty = screen.getByLabelText('Shipped quantity for MAT-1');
    expect(qty).toHaveAttribute('aria-invalid', 'true');
    const ids = (qty.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
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
    const described = document.getElementById(qty.getAttribute('aria-describedby') ?? '');
    expect(described?.textContent).toContain('Enter a quantity greater than zero');
  });
});
