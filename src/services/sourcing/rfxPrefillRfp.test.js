// ────────────────────────────────────────────────────────────────────────────
// D3 — RFI → RFP pre-fill, and the data half of RFP → RFQ. Both read SUBMITTED
// responses only: a draft answer is invisible to PTI, so its author is never
// carried forward. Probed both ways.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { prefillRfpFromRfi, prefillRfqItemsFromRfp } from './rfxPrefill';
import {
  RFI_EVENT_SEED,
  RFI_RESPONSE_SEED,
  RFP_EVENT_SEED,
  RFP_RESPONSE_SEED
} from '../data/mock/fixtures/rfxHub';

const rfi001 = /** @type {import('./types').RfiEvent} */ (
  RFI_EVENT_SEED.find((e) => e.id === 'rfi-001')
);
const oslo = /** @type {import('./types').RfiEvent} */ (
  RFI_EVENT_SEED.find((e) => e.id === 'rfi-002')
);
const tundra = /** @type {import('./types').RfpEvent} */ (
  RFP_EVENT_SEED.find((e) => e.id === 'rfp-002')
);

describe('prefillRfpFromRfi', () => {
  it('carries title, family, scope and the RESPONDERS — never the draft author', () => {
    const p = prefillRfpFromRfi(rfi001, RFI_RESPONSE_SEED);
    expect(p.title).toBe(rfi001.title);
    expect(p.familyId).toBe('packaging');
    expect(p.sourceRfiId).toBe('rfi-001');
    expect([...p.invitedSupplierIds].sort()).toEqual(['sup-007', 'sup-008']);
    // KNOWN-BAD — sup-013 holds a DRAFT on rfi-001 and must not be carried.
    expect(p.invitedSupplierIds).not.toContain('sup-013');
  });

  it('the scope is the RFI description, and the questions become scope notes in section order', () => {
    const p = prefillRfpFromRfi(oslo, RFI_RESPONSE_SEED);
    expect(p.scope).toBe(oslo.description);
    expect(p.scopeNoteKeys).toHaveLength(oslo.questions.length);
    // A template section (D. Products) renders before a custom one.
    expect(p.scopeNoteKeys.indexOf('rfx.q.oslo-price')).toBeLessThan(
      p.scopeNoteKeys.indexOf('rfx.q.oslo-machine')
    );
    expect(p.attachments.map((a) => a.name)).toEqual(['Oslo sticker brief v2.pdf']);
    expect(p.invitedSupplierIds).toEqual(['sup-008']);
  });

  it('an RFI with no description and no submitted answer pre-fills empty, not invented', () => {
    const p = prefillRfpFromRfi(rfi001, []);
    expect(p.scope).toBe('');
    expect(p.invitedSupplierIds).toEqual([]);
  });

  it('the buyer may narrow the carried responders', () => {
    expect(prefillRfpFromRfi(rfi001, RFI_RESPONSE_SEED, ['sup-008']).invitedSupplierIds).toEqual([
      'sup-008'
    ]);
  });
});

describe('prefillRfqItemsFromRfp (neutral shape — no RFQ type imported)', () => {
  it('one item per chosen option, PTI’s and a supplier’s own, with the points as tiers', () => {
    const seed = prefillRfqItemsFromRfp(tundra, RFP_RESPONSE_SEED, ['opt-full-set', 'sup-opt-1']);
    expect(seed.items.map((i) => i.description)).toEqual([
      'Full set: bottle, pump and cap',
      'Stock 150 ml bottle with 24/410 lotion pump'
    ]);
    expect(seed.items[1].proposedBySupplierId).toBe('sup-007');
    expect(seed.items[0].quantityPoints).toEqual([10_000, 50_000, 100_000]);
    expect(seed.invitedSupplierIds).toEqual(['sup-007']);
    expect(seed.sourceRfpId).toBe('rfp-002');
  });

  it('⚠️ no indicative price travels — an RFQ asks for firm ones', () => {
    const seed = prefillRfqItemsFromRfp(tundra, RFP_RESPONSE_SEED, ['opt-full-set']);
    expect(JSON.stringify(seed)).not.toMatch(/4850|unitPrice/);
  });

  it('an unknown option id is skipped, never invented', () => {
    const seed = prefillRfqItemsFromRfp(tundra, RFP_RESPONSE_SEED, ['opt-nope']);
    expect(seed.items).toEqual([]);
    expect(seed.invitedSupplierIds).toEqual([]);
  });
});
