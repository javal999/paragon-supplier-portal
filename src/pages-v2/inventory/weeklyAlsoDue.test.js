import { describe, expect, it } from 'vitest';
import { MockProcurementService } from '@services/data/mock/MockProcurementService';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { planStatus } from '@services/transitions/capacityRules';
import { NO_PERSON } from '@context/noPerson';
/** @import { InventoryPosition, QueryScope } from '@services/data/types' */
import { alsoDue } from './WeeklyUpdatePanel';

// ─────────────────────────────────────────────────────────────────────────────
// BL-236 (MR-1 BR-07, owner 2026-11-02) — the weekly visit is stock, capacity
// and feedstock. `alsoDue` counts the two confirmations beside the stock update.
//
// The cycle under test closes on Thursday 10 Sep 2026 at 23:59 WIB (16:59Z).
// Plans are real seeded plans, re-labelled to one supplier, so `planStatus`
// runs on the shapes the page reads.
// ─────────────────────────────────────────────────────────────────────────────

const NOW = '2026-09-08T03:00:00.000Z'; // Tuesday 10:00 WIB
const IN_CYCLE = '2026-09-05T03:00:00.000Z';
const LAST_CYCLE = '2026-08-30T03:00:00.000Z';

/** @type {QueryScope} */
const BUYER_SCOPE = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

const plans = async () => (await new MockProcurementService().getCapacityPlans(BUYER_SCOPE)).items;

/**
 * Supplier S's rows, one per feedstock time (null = never confirmed).
 * @param {readonly (string | null)[]} times
 * @param {boolean} [pullAgreement]
 * @returns {InventoryPosition[]}
 */
const rows = (times, pullAgreement = false) =>
  times.map(
    (at, i) =>
      /** @type {InventoryPosition} */ (
        /** @type {unknown} */ ({
          supplierId: 'S',
          materialCode: `M-${i}`,
          pullAgreement,
          feedstock: at === null ? null : { recordedAt: at, feedstockQty: 1 }
        })
      )
  );

describe('BL-236 · alsoDue', () => {
  it('capacity: a group never submitted is still to confirm; a confirmed group counts; another supplier is ignored', async () => {
    const all = await plans();
    const confirmed = all.find((p) => planStatus(p) === 'confirmed');
    expect(confirmed).toBeDefined(); // the seed holds a confirmed plan to borrow
    const mine = [
      { .../** @type {NonNullable<typeof confirmed>} */ (confirmed), supplierId: 'S' },
      {
        .../** @type {NonNullable<typeof confirmed>} */ (confirmed),
        supplierId: 'S',
        latest: null
      },
      {
        .../** @type {NonNullable<typeof confirmed>} */ (confirmed),
        supplierId: 'OTHER',
        latest: null
      }
    ];
    expect(planStatus(mine[1])).toBe('notStarted');
    expect(alsoDue('S', mine, rows([IN_CYCLE]), NOW).capacity).toEqual({ confirmed: 1, total: 2 });
  });

  it('capacity: no plan for the supplier reads null, so no line shows', () => {
    expect(alsoDue('S', [], rows([IN_CYCLE]), NOW).capacity).toBeNull();
  });

  it('feedstock: confirmed this cycle counts; last cycle and never do not (weekly)', () => {
    expect(alsoDue('S', [], rows([IN_CYCLE, LAST_CYCLE, null]), NOW).feedstock).toEqual({
      confirmed: 1,
      total: 3,
      daily: false
    });
  });

  it('feedstock: a supplier on a pull agreement confirms daily, so a confirmation 3 days ago no longer counts', () => {
    expect(alsoDue('S', [], rows([IN_CYCLE, NOW], true), NOW).feedstock).toEqual({
      confirmed: 1,
      total: 2,
      daily: true
    });
  });
});
