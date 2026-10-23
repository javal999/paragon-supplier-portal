import { describe, it, expect, afterEach } from 'vitest';
import i18n from '@lib/i18n';
import { fmtDate as invoiceDate, fmtIDR as invoiceIDR } from './SupplierInvoices/utils';
import { fmtDate as shipmentDate } from './SupplierShipments/utils';
import { fmtDate as orderDate, fmtIDR as orderIDR } from './SupplierOrders/utils';

// The supplier pages kept their own formatters, outside the shared
// `@lib/format`. Two of them misread in one language:
// - the compact amount wrote a billion as "M" in English too, where "M" reads
//   as million: Rp 1,125,000,000 showed as "Rp 1.1M";
// - the date always formatted with en-GB, so the Indonesian UI read
//   "31 Aug 2026".
// Rupiah keeps the Indonesian grouping and suffixes in both languages (BL-83);
// only the billion suffix and the month follow the UI language.

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe.each([
  ['invoices', invoiceIDR],
  ['orders', orderIDR]
])('supplier %s: compact rupiah', (_page, fmt) => {
  it('writes a billion as "B" in English, never "M"', () => {
    expect(fmt(1_125_000_000)).toBe('Rp 1.1B');
  });

  it('writes a billion as "M" (miliar) in Indonesian', async () => {
    await i18n.changeLanguage('id');
    expect(fmt(1_125_000_000)).toBe('Rp 1.1M');
  });

  it('keeps millions as "jt" in both languages', async () => {
    expect(fmt(62_140_000)).toBe('Rp 62.1jt');
    await i18n.changeLanguage('id');
    expect(fmt(62_140_000)).toBe('Rp 62.1jt');
  });
});

describe('supplier dates follow the UI language', () => {
  it.each([
    ['invoices', invoiceDate],
    ['shipments', shipmentDate],
    ['orders', orderDate]
  ])('%s: English "31 Aug 2026", Indonesian "31 Agu 2026"', async (_page, fmt) => {
    expect(fmt('2026-08-31')).toBe('31 Aug 2026');
    await i18n.changeLanguage('id');
    expect(fmt('2026-08-31')).toBe('31 Agu 2026');
  });

  it.each([
    ['invoices', invoiceDate],
    ['shipments', shipmentDate],
    ['orders', orderDate]
  ])('%s: no date is an em dash', (_page, fmt) => {
    expect(fmt('')).toBe('—');
  });
});
