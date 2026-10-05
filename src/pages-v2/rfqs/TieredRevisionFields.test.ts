// A negotiation round on a tiered RFQ re-prices PER BREAK (RFx spec
// 2026-09-21). Probed both ways: a complete re-pricing derives a new header and
// carries everything else forward; a blank or unreadable break yields nothing.

import { describe, expect, it } from 'vitest';
import { RFQ_SAMPLE_QUOTATION_SEED, RFQ_SAMPLE_SEED } from '@services/data/mock/fixtures/rfqSamples';
import { readRevision, revisionPricesFrom } from './TieredRevisionFields';

const oslo = RFQ_SAMPLE_SEED[0]!;
const last = RFQ_SAMPLE_QUOTATION_SEED.find((q) => q.id === 'qt-021a')!;

describe('readRevision — the per-break revision', () => {
  it('KNOWN-GOOD: lowering one break lowers the derived header and keeps the rest of the quote', () => {
    const typed = { ...revisionPricesFrom(last), '1:3000': '400' };
    const r = readRevision(oslo, last, typed)!;
    expect(r.itemQuotes[0]!.tierPrices[0]).toEqual({ tierQty: 3000, unitPrice: 400 });
    expect(r.itemQuotes[0]!.oneTimeCosts).toEqual(last.itemQuotes![0]!.oneTimeCosts);
    expect(r.unitPrice).toBeLessThan(last.unitPrice);
    expect(r.leadTimeDays).toBe(18);
  });

  it('a blank or unreadable break yields no revision', () => {
    expect(readRevision(oslo, last, { ...revisionPricesFrom(last), '2:50000': '' })).toBeNull();
    expect(readRevision(oslo, last, { ...revisionPricesFrom(last), '2:50000': '1.500' })).toBeNull();
  });
});
