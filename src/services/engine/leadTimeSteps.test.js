// ─────────────────────────────────────────────────────────────────────────────
// DRC-6 (BL-192) — lead time by step: the helper, the split, the data health
// predicate, and the sample dataset's steps (every source's steps add up to
// the total it already had, so no existing figure moved).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  ENGINE_DATASET_SEED,
  engineDataset,
  engineGeneratorInput,
  sampleLeadTimeRoute
} from '../data/mock/fixtures/engineDataset';
import { SDC_SIMULATED_NOW } from '../sdc/clock';
import { generateEngineDataset } from './synthetic/generate';
import {
  LEAD_TIME_ROUTES,
  LEAD_TIME_ROUTE_STEPS,
  daysToWeeksUp,
  leadTimeBreakdown,
  leadTimeStepsProblem,
  splitLeadTime,
  sumOfSteps
} from './leadTimeSteps';
/** @import { LeadTimeStep } from './types' */

describe('the routes (DRC-6, XLS Guidance)', () => {
  it('local excludes ordering material; import starts with it; imported raw material starts at the principal', () => {
    expect(LEAD_TIME_ROUTE_STEPS.local).toEqual(['machineQueue', 'production', 'delivery']);
    expect(LEAD_TIME_ROUTE_STEPS.import).toEqual([
      'orderingMaterial',
      'machineQueue',
      'production',
      'shipment'
    ]);
    expect(LEAD_TIME_ROUTE_STEPS.importedRawMaterial).toEqual([
      'orderToPrincipal',
      'machineQueue',
      'production',
      'shipment',
      'delivery'
    ]);
    expect(LEAD_TIME_ROUTES).toEqual(['local', 'import', 'importedRawMaterial']);
  });
});

describe('leadTimeBreakdown', () => {
  /** @type {LeadTimeStep[]} */
  const steps = [
    { step: 'machineQueue', days: 4 },
    { step: 'production', days: 7 },
    { step: 'delivery', days: 4 }
  ];

  it('returns the steps, the total in days and the total in weeks rounded up', () => {
    expect(
      leadTimeBreakdown({ leadTimeDays: 15, leadTimeRoute: 'local', leadTimeSteps: steps })
    ).toEqual({ route: 'local', steps, totalDays: 15, totalWeeks: 3, stepped: true });
  });

  it('a whole number of weeks is not rounded up further', () => {
    expect(daysToWeeksUp(14)).toBe(2);
    expect(daysToWeeksUp(15)).toBe(3);
    expect(daysToWeeksUp(30)).toBe(5);
    expect(daysToWeeksUp(0)).toBe(0);
  });

  it('a source without steps falls back to its leadTimeDays, with no steps and no route', () => {
    expect(leadTimeBreakdown({ leadTimeDays: 30 })).toEqual({
      route: null,
      steps: [],
      totalDays: 30,
      totalWeeks: 5,
      stepped: false
    });
  });
});

describe('leadTimeStepsProblem (the data health predicate)', () => {
  /** @type {LeadTimeStep[]} */
  const steps = [
    { step: 'machineQueue', days: 4 },
    { step: 'production', days: 7 },
    { step: 'delivery', days: 3 }
  ];
  it('passes when the steps add up to the total (known-good)', () => {
    expect(
      leadTimeStepsProblem({ leadTimeDays: 14, leadTimeRoute: 'local', leadTimeSteps: steps })
    ).toBeNull();
  });
  it('names the sum when it does not (known-bad)', () => {
    expect(
      leadTimeStepsProblem({ leadTimeDays: 15, leadTimeRoute: 'local', leadTimeSteps: steps })
    ).toBe('Σ 14 ≠ 15');
  });
  it('names a negative or fractional step, a step off the route, and a missing route', () => {
    expect(
      leadTimeStepsProblem({
        leadTimeDays: 14,
        leadTimeRoute: 'local',
        leadTimeSteps: [{ step: 'machineQueue', days: -1 }]
      })
    ).toBe('machineQueue -1');
    expect(
      leadTimeStepsProblem({
        leadTimeDays: 14,
        leadTimeRoute: 'local',
        leadTimeSteps: [...steps, { step: 'shipment', days: 0 }]
      })
    ).toBe('shipment ∉ local');
    expect(leadTimeStepsProblem({ leadTimeDays: 14, leadTimeSteps: steps })).toBe(
      'route undefined'
    );
  });
  it('a source with no steps has nothing to add up', () => {
    expect(leadTimeStepsProblem({ leadTimeDays: 14 })).toBeNull();
  });
});

describe('splitLeadTime', () => {
  it('keeps the total exactly, in whole days, in route order, for every route and total', () => {
    for (const route of LEAD_TIME_ROUTES) {
      const weights = Object.fromEntries(LEAD_TIME_ROUTE_STEPS[route].map((s, i) => [s, i + 1]));
      for (let total = 0; total <= 120; total++) {
        const out = splitLeadTime(route, total, weights);
        expect(out.map((s) => s.step)).toEqual(LEAD_TIME_ROUTE_STEPS[route]);
        expect(sumOfSteps(out)).toBe(total);
        expect(out.every((s) => Number.isInteger(s.days) && s.days >= 0)).toBe(true);
      }
    }
  });
  it('gives the leftover day to the largest fractional part', () => {
    // 10 × (1, 2, 1)/4 = 2.5, 5, 2.5 → 2, 5, 2, and the 1 left goes to the first .5.
    expect(
      splitLeadTime('local', 10, { machineQueue: 1, production: 2, delivery: 1 }).map((s) => s.days)
    ).toEqual([3, 5, 2]);
  });
  it('refuses weights that name no step of the route', () => {
    expect(() => splitLeadTime('local', 10, { shipment: 1 })).toThrow(/no weight/);
  });
});

describe('the sample dataset (DRC-6 fixture values)', () => {
  const data = engineDataset();
  // The same generator input without the step callback: the totals it gave before.
  const { leadTimeSteps: _drop, ...withoutSteps } = engineGeneratorInput(
    SDC_SIMULATED_NOW,
    ENGINE_DATASET_SEED
  );
  const before = generateEngineDataset(withoutSteps);

  it('every sample source carries steps whose sum is its leadTimeDays', () => {
    expect(data.sources.length).toBeGreaterThan(10);
    for (const s of data.sources) {
      const key = `${s.supplierId} · ${s.materialCode}`;
      expect(s.leadTimeSteps?.length, key).toBeGreaterThan(0);
      expect(sumOfSteps(s.leadTimeSteps ?? []), key).toBe(s.leadTimeDays);
      expect(leadTimeStepsProblem(s), key).toBeNull();
    }
  });

  it('no existing lead time changed: the totals equal the generator’s without steps', () => {
    expect(data.sources.map((s) => [s.supplierId, s.materialCode, s.leadTimeDays])).toEqual(
      before.sources.map((s) => [s.supplierId, s.materialCode, s.leadTimeDays])
    );
    expect(before.sources.every((s) => s.leadTimeSteps === undefined)).toBe(true);
  });

  it('routes follow the supplier country and material type (named members)', () => {
    expect(sampleLeadTimeRoute('sup-007', { materialType: 'VERP' })).toBe('local');
    expect(sampleLeadTimeRoute('sup-012', { materialType: 'VERP' })).toBe('import');
    expect(sampleLeadTimeRoute('sup-005', { materialType: 'ROH' })).toBe('importedRawMaterial');
    const routes = new Set(data.sources.map((s) => s.leadTimeRoute));
    expect([...routes].sort()).toEqual(['import', 'importedRawMaterial', 'local']);
    const sup012 = data.sources.find((s) => s.supplierId === 'sup-012');
    expect(sup012?.leadTimeRoute).toBe('import');
  });
});
