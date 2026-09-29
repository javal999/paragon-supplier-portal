// Material A2 — the material master overlay (plan AD-4, MAT-R15).
// `materialEntry` returns the fixture entry merged with the hub-mastered
// overlay, with defaults for `shelfLifeRelevant` (MR-6 BR-07, MAT-D6) and
// `planningGroupId` (MR-8 BR-02).
import { beforeEach, describe, expect, it } from 'vitest';
import { MATERIAL_MASTER } from '../fixtures';
import { materialEntry } from '../materialMaster';
import type { MaterialMaster } from '../types';
import { materialOverlayStore } from '../../data/mock/stores/materialOverlayStore';

const AT = '2026-09-29T02:00:00.000Z';
const LATER = '2026-09-30T02:00:00.000Z';

describe('materialEntry with the hub overlay', () => {
  beforeEach(() => materialOverlayStore.reset());

  it('returns the fixture values when no overlay exists', () => {
    const fixture = MATERIAL_MASTER['AI-NIAC-6601'];
    const e = materialEntry('AI-NIAC-6601');
    expect(e).toMatchObject(fixture);
    expect(e?.mrpController).toBe('P11');
    expect(e?.minRemainingShelfLifeMonths).toBe(12);
  });

  it('an overlay row wins over the fixture and the default for shelfLifeRelevant', () => {
    expect(materialEntry('PK-PETB-8810')?.shelfLifeRelevant).toBe(false);
    materialOverlayStore.append({ materialCode: 'PK-PETB-8810', shelfLifeRelevant: true, setAt: AT, setBy: 'admin' });
    expect(materialEntry('PK-PETB-8810')?.shelfLifeRelevant).toBe(true);
    // A master that stores the field is still overridden by the overlay.
    const master: MaterialMaster = {
      'PK-PETB-8810': { ...MATERIAL_MASTER['PK-PETB-8810'], shelfLifeRelevant: false },
    };
    expect(materialEntry('PK-PETB-8810', master)?.shelfLifeRelevant).toBe(true);
  });

  it('the latest row that sets a field wins, and a row that omits it leaves it', () => {
    materialOverlayStore.append({ materialCode: 'RM-EMUL-3310', shelfLifeRelevant: false, setAt: AT, setBy: 'admin' });
    materialOverlayStore.append({ materialCode: 'RM-EMUL-3310', planningGroupId: 'pg-humectants-a', setAt: LATER, setBy: 'admin' });
    const e = materialEntry('RM-EMUL-3310');
    expect(e?.shelfLifeRelevant).toBe(false);
    expect(e?.planningGroupId).toBe('pg-humectants-a');
    // The fixture itself is untouched (append-only overlay, frozen master).
    expect(MATERIAL_MASTER['RM-EMUL-3310'].shelfLifeRelevant).toBeUndefined();
  });

  it('shelfLifeRelevant defaults to true for ROH and for any entry with a minimum shelf life, else false', () => {
    // ROH without a minimum shelf life
    expect(MATERIAL_MASTER['RM-EMUL-3310'].minRemainingShelfLifeMonths).toBeUndefined();
    expect(materialEntry('RM-EMUL-3310')?.shelfLifeRelevant).toBe(true);
    // ROH with one
    expect(materialEntry('AI-NIAC-6601')?.shelfLifeRelevant).toBe(true);
    // Packaging with a minimum shelf life in master data
    expect(MATERIAL_MASTER['PK-PETB-8803'].materialType).toBe('VERP');
    expect(materialEntry('PK-PETB-8803')?.shelfLifeRelevant).toBe(true);
    // Packaging without one
    expect(materialEntry('PK-CAPF-8820')?.shelfLifeRelevant).toBe(false);
  });

  it('planningGroupId defaults to pg-<materialGroup>', () => {
    for (const code of ['RM-EMUL-3310', 'PK-PETB-8810', 'FR-WARD-4410']) {
      expect(materialEntry(code)?.planningGroupId).toBe(`pg-${MATERIAL_MASTER[code].materialGroup}`);
    }
  });

  it('an unknown code still resolves to null, overlay or not', () => {
    materialOverlayStore.append({ materialCode: 'XX-NOPE-0000', shelfLifeRelevant: true, setAt: AT, setBy: 'admin' });
    expect(materialEntry('XX-NOPE-0000')).toBeNull();
  });

  it('every fixture entry carries an MRP controller, and some a minimum shelf life', () => {
    const entries = Object.values(MATERIAL_MASTER);
    expect(entries.filter((e) => !e.mrpController)).toEqual([]);
    const withShelf = entries.filter((e) => e.minRemainingShelfLifeMonths !== undefined);
    expect(withShelf.length).toBeGreaterThan(0);
    expect(withShelf.length).toBeLessThan(entries.length);
  });
});
