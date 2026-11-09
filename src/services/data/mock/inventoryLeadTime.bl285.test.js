// BL-285 (PEX-D17) — the Stock page and fulfil-by read one lead time per pair.
import { describe, expect, it } from 'vitest';
import { leadTimeOf } from './inventoryReadModel';
import { leadTimeDaysOf } from './leadTimeReadModel';
import { SUPPLIER_LEAD_TIME_DAYS } from './fixtures/inventoryHub';

describe('BL-285 — one lead time per supplier × material', () => {
  it('a pair with a DRC-6 source reads the DRC-6 figure, not the sample master figure', () => {
    expect(SUPPLIER_LEAD_TIME_DAYS['sup-002|RM-EMUL-9410']).toBe(21);
    expect(leadTimeDaysOf('sup-002', 'RM-EMUL-9410')).toBe(30);
    expect(leadTimeOf('sup-002', 'RM-EMUL-9410')).toBe(30);
  });

  it('every pair DRC-6 knows reads the same figure on the Stock page', () => {
    for (const key of Object.keys(SUPPLIER_LEAD_TIME_DAYS)) {
      const [s, m] = key.split('|');
      const drc6 = leadTimeDaysOf(s, m);
      if (drc6 !== null) expect(leadTimeOf(s, m)).toBe(drc6);
    }
  });

  it('a pair with no DRC-6 source keeps the sample figure; unknown pair is null', () => {
    expect(leadTimeDaysOf('sup-001', 'RM-LAURIC-7200')).toBeNull();
    expect(leadTimeOf('sup-001', 'RM-LAURIC-7200')).toBe(10);
    expect(leadTimeOf('sup-999', 'RM-NONE')).toBeNull();
    // BL-46 demo gap: not in the master list, so no lead time although DRC-6 has one.
    expect(leadTimeOf('sup-010', 'RM-EMUL-9430')).toBeNull();
  });
});
