// Two demo seeds feed the call-off store (the base seed and the compliance
// gate demo). Both were once extended in parallel and reused CO-2026-0014..0021,
// which silently corrupted the gate demo's OTIF history. Ids and numbers must be
// unique across the combined seed, and the store's next number must be free.
import { describe, expect, it } from 'vitest';
import { CALL_OFF_SEED } from './callOffs';
import { GATE_DEMO_CALL_OFFS } from './gateDemo';

const SEED = [...CALL_OFF_SEED, ...GATE_DEMO_CALL_OFFS];
const dupes = (xs: readonly string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);

describe('call-off seed identity', () => {
  it('contains both seeds (population control)', () => {
    const numbers = SEED.map((c) => c.callOffNumber);
    expect(numbers).toContain('CO-2026-0021'); // base seed, BL-49 value-only draft
    expect(numbers).toContain('CO-2026-0022'); // gate demo, first sup-019 call-off
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
