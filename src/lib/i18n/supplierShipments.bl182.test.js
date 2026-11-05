// BL-182 — Supplier Shipments makes no EDI 856 claim. `CHANNEL_CONFIG` marks
// EDI "designed, not connected", so the subtitle, the export action and the
// ASN wizard's review step must not name it, in either language.

import { describe, expect, it } from 'vitest';
import { supplierShipmentsEn, supplierShipmentsId } from './supplierShipments';

describe('BL-182 — no EDI claim on Supplier Shipments', () => {
  it.each([
    ['en', supplierShipmentsEn],
    ['id', supplierShipmentsId]
  ])('%s: no value names EDI', (_lng, dict) => {
    const hits = Object.entries(dict).filter(([, v]) => /\bEDI\b/.test(v));
    expect(hits).toEqual([]);
  });

  it('the export action and its toast are gone, not left as dead keys', () => {
    for (const dict of [supplierShipmentsEn, supplierShipmentsId]) {
      expect(dict['supplierShipments.action.exportEdi']).toBeUndefined();
      expect(dict['supplierShipments.toast.export.title']).toBeUndefined();
    }
  });

  it('the review step reads "Verify before submitting" (EN) and "Verifikasi sebelum mengajukan" (ID)', () => {
    expect(supplierShipmentsEn['supplierShipments.wizard.review.desc']).toBe(
      'Verify before submitting.'
    );
    expect(supplierShipmentsId['supplierShipments.wizard.review.desc']).toBe(
      'Verifikasi sebelum mengajukan.'
    );
  });
});
