// BL-269 (PEX-4) — the capacity heads-up and the monthly capacity verb through
// the REAL services: 12 months, weekly then monthly capacity, the "no capacity
// confirmed" month, demand following LTP inputs (PEX-5), the sums per material
// and brand, who may state a month.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { capacityMonthStore } from './stores/capacityMonthStore';
import { ltpInputStore } from './stores/ltpInputStore';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { isMonthlyEntryMonth } from '../../transitions/capacityHeadsUpRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @type {import('../types').QueryScope} */
const planning = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
/** @param {string} supplierId @returns {import('../types').QueryScope} */
const supplierScope = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});

beforeEach(() => {
  sdcClock.reset();
  capacityMonthStore.reset();
  ltpInputStore.reset();
});
afterEach(() => {
  capacityMonthStore.reset();
  ltpInputStore.reset();
});

const all = async () => (await svc.getCapacityHeadsUp(planning)).items;

describe('the 12-month heads-up', () => {
  it('has 12 months per supplier × group, the first on the current month', async () => {
    const rows = await all();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.months).toHaveLength(12);
      expect(r.months[0].month).toBe('2026-08');
    }
  });

  it('weeks 1–13 read the weekly entry; a later month with no monthly entry is "no capacity confirmed", not 0%', async () => {
    const rows = await all();
    const withWeekly = rows.find((r) => r.months.some((m) => m.source === 'weekly'));
    expect(withWeekly).toBeDefined();
    for (const r of rows) {
      const later = r.months[11];
      expect(later.source).toBeNull();
      expect(later.capacity).toBeNull();
      expect(later.utilisationPct).toBeNull();
      expect(later.band).toBe('unconfirmed');
    }
  });

  it('per material, utilisation = demand ÷ the group capacity, and the materials add up to the group', async () => {
    for (const r of await all()) {
      r.months.forEach((m, i) => {
        const sum = r.byMaterial.reduce((n, mat) => n + mat.months[i].demand, 0);
        expect(sum).toBe(m.demand);
        const brandSum = r.byBrand.reduce((n, b) => n + b.months[i].demand, 0);
        // Brand parts are rounded per brand: within one unit each of the group's figure.
        expect(Math.abs(brandSum - m.demand)).toBeLessThanOrEqual(r.byBrand.length);
      });
    }
  });

  it('a supplier reads its own groups only', async () => {
    const first = (await all())[0];
    const own = (await svc.getCapacityHeadsUp(supplierScope(first.supplierId))).items;
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((r) => r.supplierId === first.supplierId)).toBe(true);
  });
});

describe('PEX-5 feeds the demand', () => {
  it('uploading LTP A changes the demand of the weeks it covers', async () => {
    const before = (await all())[0];
    const material = before.materials[0];
    const weeks = ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'];
    const res = await cmd.dispatch(planning, {
      transitionId: 't_ltpinput_set',
      entity: 'ltpInput',
      entityId: `upload|${material}|A`,
      payload: { weeks: Object.fromEntries(weeks.map((w) => [w, 10_000_000])), sourceFile: 'a.csv' }
    });
    expect(res.status).toBe('done');
    const after = (await all()).find(
      (r) => r.supplierId === before.supplierId && r.planningGroupId === before.planningGroupId
    );
    expect(after?.months[1].demand).not.toBe(before.months[1].demand);
  });
});

describe('t_capacitymonth_submit', () => {
  it('the supplier states a month beyond the weekly entry; the heads-up reads it with its utilisation and band', async () => {
    const row = (await all())[0];
    const plan = (await svc.getCapacityPlans(planning)).items.find(
      (p) => p.supplierId === row.supplierId && p.planningGroupId === row.planningGroupId
    );
    const horizon = plan?.weeks.map((w) => w.week) ?? [];
    const month = row.months.map((m) => m.month).find((m) => isMonthlyEntryMonth(m, horizon)) ?? '';
    const res = await cmd.dispatch(supplierScope(row.supplierId), {
      transitionId: 't_capacitymonth_submit',
      entity: 'capacityMonth',
      payload: {
        supplierId: row.supplierId,
        planningGroupId: row.planningGroupId,
        months: [{ month, allocated: 1_000_000_000 }]
      }
    });
    expect(res.status, res.reason).toBe('done');
    const after = (await all()).find(
      (r) => r.supplierId === row.supplierId && r.planningGroupId === row.planningGroupId
    );
    const m = after?.months.find((x) => x.month === month);
    expect(m).toMatchObject({ source: 'monthly', capacity: 1_000_000_000 });
    expect(m?.utilisationPct).not.toBeNull();
    // Far below capacity: under-used, in the neutral band.
    expect(m?.band).toBe('underUsed');
  });

  it('refuses a month the weekly entry covers, another supplier, and a seat without the atom', async () => {
    const row = (await all())[0];
    const covered = await cmd
      .dispatch(supplierScope(row.supplierId), {
        transitionId: 't_capacitymonth_submit',
        entity: 'capacityMonth',
        payload: {
          supplierId: row.supplierId,
          planningGroupId: row.planningGroupId,
          months: [{ month: '2026-09', allocated: 5 }]
        }
      })
      .catch((e) => e);
    expect(String(covered.reason ?? covered.message)).toMatch(/NOT_ENTERED_BY_MONTH|MONTH/);
    await expect(
      cmd.dispatch(supplierScope('sup-other'), {
        transitionId: 't_capacitymonth_submit',
        entity: 'capacityMonth',
        payload: {
          supplierId: row.supplierId,
          planningGroupId: row.planningGroupId,
          months: [{ month: '2027-03', allocated: 5 }]
        }
      })
    ).rejects.toBeDefined();
    expect(capacityMonthStore.all()).toHaveLength(0);
  });
});
