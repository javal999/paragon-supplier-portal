// BL-199 / BL-230 — the startup seed grows its draft through the trigger, so the
// figures on it are the rules' own. These tests check the evidence a real
// trigger run leaves, not just that a draft exists.
import { afterEach, describe, expect, it } from 'vitest';

import { seedRopFisikDraft, ROP_FISIK_SEED } from './ropFisikDraftSeed';
import { callOffStore } from './stores/callOffStore';
import { ptiStockStore } from './stores/ptiStockStore';
import { callOffTriggerStore } from './stores/callOffTriggerStore';

afterEach(() => {
  callOffStore.reset();
  ptiStockStore.reset();
  callOffTriggerStore.reset();
});

const sohOf = () =>
  ptiStockStore
    .forMaterial(ROP_FISIK_SEED.materialCode)
    .find((r) => r.plant === ROP_FISIK_SEED.plant)?.ptiSoh;

describe('BL-199 — the startup ROP Fisik draft is grown, not written', () => {
  it('known-good: before the seed, no ROP Fisik draft exists', () => {
    expect(callOffStore.all().some((c) => c.origin === 'ropFisik')).toBe(false);
  });

  it('drafts the minimum delivery for RM-STEAR-7300, stamped by the trigger, Above Max', () => {
    const out = seedRopFisikDraft();
    expect(out.status).toBe('seeded');
    const d = /** @type {import('../types').CallOff} */ (
      callOffStore.all().find((c) => c.id === out.callOffId)
    );
    expect(d.status).toBe('Draft');
    expect(d.origin).toBe('ropFisik');
    expect(d.materialCode).toBe('RM-STEAR-7300');
    const f = /** @type {NonNullable<typeof d.trigger>} */ (d.trigger).value;
    expect(f.soh).toBe(900);
    expect(f.quantity).toBe(d.quantity);
    expect(f.minDelivery).toBe(d.quantity);
    expect(f.flags).toContain('ABOVE_MAX');
    expect(f.flags).not.toContain('BELOW_MIN_DELIVERY');
  });

  it('moves no stock figure: the refresh re-records the sample SOH unchanged', () => {
    const before = sohOf();
    const seqBefore = ptiStockStore.latestSeq();
    seedRopFisikDraft();
    expect(sohOf()).toBe(before);
    // One update, seen by the trigger: the sequence moves by exactly one.
    expect(ptiStockStore.latestSeq()).toBe(seqBefore + 1);
  });

  it('is idempotent: a second call finds the draft and drafts nothing more', () => {
    const first = seedRopFisikDraft();
    const second = seedRopFisikDraft();
    expect(second).toEqual({ status: 'already-seeded', callOffId: first.callOffId });
    expect(callOffStore.all().filter((c) => c.origin === 'ropFisik')).toHaveLength(1);
  });
});
