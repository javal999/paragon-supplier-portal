// ─────────────────────────────────────────────────────────────────────────────
// BL-80 (CR-04) — a value-limit PO line reads as having no quantity, and is
// worth its limit, on every screen that prints a PO line. PO-2026-00128 /
// li-028a (sup-003) is the sample value-limit line (BL-49): quantity 0, limit
// Rp 500,000,000. Before this, PTI's order drawer said "0 KG" and "Rp 0".
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../lib/i18n';
import { renderWithProviders } from '../../test/test-utils';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { poLineQuantityText, poLineValue, isValueOnlyLine } from './poLineQuantity';
import BuyerOrders from '../BuyerOrders';

const t = i18n.t.bind(i18n);
const lineOf = (poNumber: string, lineId: string) =>
  mockPurchaseOrders.find((p) => p.poNumber === poNumber)!.lineItems.find((l) => l.id === lineId)!;

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('BL-80 — the one rule for a PO line quantity and value', () => {
  it('the sample value-limit line exists and is the only kind the rule treats as value-only', () => {
    const valueLine = lineOf('PO-2026-00128', 'li-028a');
    expect(valueLine.valueLimit).toBe(500_000_000);
    expect(isValueOnlyLine(valueLine)).toBe(true);
    // Every other sample line has a quantity.
    const valueOnly = mockPurchaseOrders.flatMap((p) => p.lineItems.filter(isValueOnlyLine).map((l) => l.id));
    expect(valueOnly).toEqual(['li-028a']);
  });

  it('a value-limit line: no quantity, and worth its limit', () => {
    const line = lineOf('PO-2026-00128', 'li-028a');
    expect(poLineQuantityText(t, line)).toBe('No quantity · value limit Rp 500.000.000');
    expect(poLineValue(line)).toBe(500_000_000);
  });

  it('a quantity line reads as before: quantity and unit, worth quantity × price', () => {
    const line = { id: 'x', quantity: 12_000, unitPrice: 1_600, uom: 'PCS' };
    expect(poLineQuantityText(t, line)).toBe('12,000 PCS');
    expect(poLineValue(line)).toBe(19_200_000);
  });

  it('in Indonesian', async () => {
    await i18n.changeLanguage('id');
    expect(poLineQuantityText(t, lineOf('PO-2026-00128', 'li-028a'))).toBe('Tanpa kuantitas · batas nilai Rp 500.000.000');
  });
});

describe("BL-80 — PTI's order drawer on PO-2026-00128", () => {
  it('says the line has no quantity and prices it at its limit, not "0 KG" and "Rp 0"', async () => {
    renderWithProviders(<BuyerOrders />);
    fireEvent.click(await screen.findByText('PO-2026-00128'));
    const row = (await screen.findByText('No quantity · value limit Rp 500.000.000')).closest('tr')!;
    expect(row).toHaveTextContent('Wardah Signature Floral Compound');
    expect(row).not.toHaveTextContent('0 KG');
    const cells = within(row).getAllByRole('cell');
    expect(cells[cells.length - 1]).toHaveTextContent('Rp 500.000.000');
  });
});
