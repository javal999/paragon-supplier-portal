// Three fixtures feed the call-off store (the base seed, the compliance gate
// demo and the E2E walkthrough). The first two were once extended in parallel
// and reused CO-2026-0014..0021, which silently corrupted the gate demo's OTIF
// history; the walkthrough pair then reused the base seed's ids (BL-359), and
// the chase deduped on the first row. Ids and numbers must be unique across the
// combined seed — the store's own SEED — and its next number must be free.
import { describe, expect, it } from 'vitest';
import { callOffStore } from '../stores/callOffStore';

// The store's own seed: exactly the rows the app starts from.
const SEED = callOffStore.all();
/** @param {readonly string[]} xs */
const dupes = (xs) => xs.filter((x, i) => xs.indexOf(x) !== i);

describe('call-off seed identity', () => {
  it('contains all three seeds (population control)', () => {
    const numbers = SEED.map((c) => c.callOffNumber);
    expect(numbers).toContain('CO-2026-0021'); // base seed, BL-49 value-only draft
    expect(numbers).toContain('CO-2026-0022'); // gate demo, first sup-019 call-off
    expect(numbers).toContain('CO-2026-0044'); // base seed, BL-94 delivery history
    expect(numbers).toContain('CO-2026-0047'); // walkthrough, the received call-off
    expect(numbers).toContain('CO-2026-0048'); // walkthrough, the in-transit call-off
  });

  it('has no duplicate id or call-off number', () => {
    expect(dupes(SEED.map((c) => c.id))).toEqual([]);
    expect(dupes(SEED.map((c) => c.callOffNumber))).toEqual([]);
  });

  it('the duplicate check fires on a real collision', () => {
    expect(dupes(['CO-2026-0014', 'CO-2026-0014'])).toEqual(['CO-2026-0014']);
  });

  it('leaves the next assigned number (seed length + 1) unused', () => {
    const next = `CO-2026-${String(SEED.length + 1).padStart(4, '0')}`;
    expect(SEED.map((c) => c.callOffNumber)).not.toContain(next);
  });
});
