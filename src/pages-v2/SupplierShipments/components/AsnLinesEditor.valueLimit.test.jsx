// ────────────────────────────────────────────────────────────────────────────
// BL-140 (owner ruling 2026-11-20) — the ASN line editor on a value-limit PO
// line (BL-49, CR-04). The line carries no quantity: the wizard does not offer
// it as a standalone selection, it states the reason where the line appears,
// and with a released call-off the line is enterable and names the bound it
// broke.
// ────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import AsnLinesEditor from './AsnLinesEditor';

const MAT = 'MAT-1';
const OPEN = [
  { materialCode: MAT, description: 'Wardah Compound', uom: 'KG', open: 0, valueLimit: 500_000_000 }
];

/**
 * The editor's read with no entered line (an empty quantity is not read).
 * @param {import('@services/transitions/fulfilmentRules').AsnLineRefusal | null} [refusal]
 * @returns {import('../../shipments/asnLines').AsnLinesRead}
 */
const readOf = (refusal = null) =>
  /** @type {import('../../shipments/asnLines').AsnLinesRead} */ ({
    lines:
      refusal === null
        ? []
        : [
            {
              line: OPEN[0],
              input: { materialCode: MAT, shippedQty: 10 },
              refusal,
              qtyOk: true,
              over: false,
              batchSource: 'typed',
              aboveAvailable: null,
              shelfLife: null
            }
          ],
    overCount: 0,
    aboveAvailable: [],
    complete: false,
    onlyShelfLife: false,
    sequenceRead: {
      ok: true,
      sequenceMissing: false,
      externalIdMissing: false,
      alreadyUsedBy: null,
      lines: []
    }
  });

/**
 * @param {{ callOff?: { materialCode: string; quantity: number }; refusal?: import('@services/transitions/fulfilmentRules').AsnLineRefusal | null }} [opts]
 */
const renderEditor = ({ callOff, refusal = null } = {}) =>
  renderWithProviders(
    <AsnLinesEditor
      open={OPEN}
      entries={{ [MAT]: { qty: '10', batch: 'LOT-1', expiry: '', batchSource: 'typed' } }}
      read={readOf(refusal)}
      batches={{}}
      onChange={() => {}}
      overShipReason=""
      onReasonChange={() => {}}
      {...(callOff ? { callOff } : {})}
    />
  );

describe('BL-140 · a value-limit line is not offered standalone', () => {
  it('with no call-off: the quantity is not enterable and the reason is stated', () => {
    renderEditor();
    const qty = screen.getByLabelText(`Shipped quantity for ${MAT}`);
    expect(qty).toBeDisabled();
    const reason = document.getElementById(`asn-qty-${MAT}-value-limit`);
    expect(reason).not.toBeNull();
    expect(reason?.textContent).toContain('commits a value, not a quantity');
    // The described element is the one that renders on this path.
    expect(qty.getAttribute('aria-describedby')).toBe(`asn-qty-${MAT}-value-limit`);
    // The open column states the value limit, not "0 KG" (BL-80's rule).
    expect(screen.getByText(/Value limit/)).toBeInTheDocument();
  });

  it('with a call-off of another material: still not enterable', () => {
    renderEditor({ callOff: { materialCode: 'RM-OTHER', quantity: 100 } });
    expect(screen.getByLabelText(`Shipped quantity for ${MAT}`)).toBeDisabled();
  });

  it('with the call-off that covers the line: enterable', () => {
    renderEditor({ callOff: { materialCode: MAT, quantity: 100 } });
    const qty = screen.getByLabelText(`Shipped quantity for ${MAT}`);
    expect(qty).not.toBeDisabled();
    expect(qty).toHaveAttribute('aria-invalid', 'false');
    expect(document.getElementById(`asn-qty-${MAT}-value-limit`)).toBeNull();
  });
});

describe('BL-140 / BL-326 · the bound the line broke is named on the control', () => {
  it.each([
    ['overCallOff', 'Above the quantity this call-off released'],
    ['overValueLimit', 'Above the value this line has left']
  ])('%s names its own message', (refusal, message) => {
    renderEditor({
      callOff: { materialCode: MAT, quantity: 100 },
      refusal: /** @type {import('@services/transitions/fulfilmentRules').AsnLineRefusal} */ (
        refusal
      )
    });
    const qty = screen.getByLabelText(`Shipped quantity for ${MAT}`);
    expect(qty).toHaveAttribute('aria-invalid', 'true');
    const id = qty.getAttribute('aria-describedby') ?? '';
    expect(id).toBe(`asn-qty-${MAT}-value-limit`);
    expect(document.getElementById(id)?.textContent).toContain(message);
  });
});
