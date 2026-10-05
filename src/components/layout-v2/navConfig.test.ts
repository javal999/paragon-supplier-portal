// ─────────────────────────────────────────────────────────────────────────────
// Forecast UX phase 1, task A1 (FORECAST-UX-EVALUATION-2026-10 §3; F-03, F-04,
// F-11, F-19, F-25; FUX-D2): the Weekly plan and Review sections replace the
// 13-item Forecast group, the engine pages move to the user menu, and the page
// header names the section the viewer's own menu shows (NV-05).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { PTI_NAV, UTILITY_NAV, navFor, sectionForPath } from './navConfig';
import { hubEn, hubId } from '../../lib/i18n/hub';
import { safetyStockEn, safetyStockId } from '../../lib/i18n/safetyStock';

const FORECAST_ROUTES = [
  '/buyer/order-plan',
  '/buyer/reschedule',
  '/buyer/stabilise',
  '/buyer/collaboration',
  '/buyer/scorecard',
  '/buyer/demand-forecast',
  '/buyer/fs-reconcile',
];

const ENGINE = [
  ['hub.nav.pti.engine.materialRequirement', '/buyer/material-requirement'],
  ['hub.nav.pti.engine.safetyStock', '/buyer/safety-stock'],
  ['hub.nav.pti.engine.publishedVersions', '/buyer/forecasts'],
  ['hub.nav.pti.engine.forecastBias', '/buyer/forecast-bias'],
  ['hub.nav.pti.engine.dataHealth', '/buyer/data-health'],
  ['hub.nav.pti.engine.modelBacktest', '/buyer/model-backtest'],
  ['hub.nav.pti.engine.reliability', '/buyer/reliability'],
];

const NEW_KEYS = [
  'hub.nav.section.weeklyPlan',
  'hub.nav.section.review',
  'hub.nav.section.planningEngine',
  'hub.nav.pti.whatToOrder',
  'hub.nav.pti.makeRoom',
  'hub.nav.pti.publishToSuppliers',
  'hub.nav.pti.supplierResponses',
  'hub.nav.pti.forecastQuality',
  'hub.nav.pti.stockCheck',
  ...ENGINE.map(([key]) => key),
];

describe('Material Planner menu — Weekly plan and Review (F-03, F-04)', () => {
  const mp = navFor('buyer', 'MP');
  const items = (role: 'MP' | 'BUY') =>
    navFor('buyer', role).flatMap((s) => s.items.map((i) => ({ section: s.id, key: i.labelKey, path: i.path })));

  it('shows exactly the 7 forecast items in the brief order, under 2 sections', () => {
    const forecastItems = items('MP').filter((i) => FORECAST_ROUTES.includes(i.path));
    expect(forecastItems.map((i) => [i.section, i.key, i.path])).toEqual([
      ['weeklyPlan', 'hub.nav.pti.whatToOrder', '/buyer/order-plan'],
      ['weeklyPlan', 'hub.nav.pti.makeRoom', '/buyer/reschedule'],
      ['weeklyPlan', 'hub.nav.pti.publishToSuppliers', '/buyer/stabilise'],
      ['weeklyPlan', 'hub.nav.pti.supplierResponses', '/buyer/collaboration'],
      ['review', 'hub.nav.pti.performance', '/buyer/scorecard'],
      ['review', 'hub.nav.pti.forecastQuality', '/buyer/demand-forecast'],
      ['review', 'hub.nav.pti.stockCheck', '/buyer/fs-reconcile'],
    ]);
    expect(mp.find((s) => s.id === 'weeklyPlan')!.items).toHaveLength(4);
    expect(mp.find((s) => s.id === 'review')!.items).toHaveLength(3);
    expect(mp.map((s) => s.id)).not.toContain('forecast');
  });

  it('does not show the engine pages or Performance in the main menu', () => {
    const paths = items('MP').map((i) => i.path);
    for (const [, path] of ENGINE) expect(paths).not.toContain(path);
    expect(mp.map((s) => s.id)).not.toContain('performance');
  });

  it('Weekly plan and Review are Material Planning sections only', () => {
    for (const id of ['weeklyPlan', 'review']) {
      expect(PTI_NAV.find((s) => s.id === id)!.roles).toEqual(['MP']);
    }
  });
});

describe('Procurement menu keeps Performance → Supplier scorecard (FUX-D2)', () => {
  it('shows Performance with the scorecard, and no Weekly plan or Review', () => {
    const buy = navFor('buyer', 'BUY');
    const performance = buy.find((s) => s.id === 'performance')!;
    expect(performance.items.map((i) => [i.labelKey, i.path])).toEqual([
      ['hub.nav.pti.performance', '/buyer/scorecard'],
    ]);
    expect(buy.map((s) => s.id)).not.toContain('weeklyPlan');
    expect(buy.map((s) => s.id)).not.toContain('review');
  });
});

describe('Planning engine pages in the buyer user menu (F-04)', () => {
  it('lists all 7, after the existing entries, each with the Planning engine prefix', () => {
    const buyer = UTILITY_NAV.buyer.map((i) => [i.labelKey, i.path]);
    expect(buyer.slice(-7)).toEqual(ENGINE);
    for (const [key] of ENGINE) {
      expect(hubEn[key]).toMatch(new RegExp(`^${hubEn['hub.nav.section.planningEngine']} · `));
      expect(hubId[key]).toMatch(new RegExp(`^${hubId['hub.nav.section.planningEngine']} · `));
    }
    expect(UTILITY_NAV.supplier.map((i) => i.path)).not.toContain('/buyer/data-health');
  });
});

describe('sectionForPath picks the section by role (NV-05)', () => {
  it('the scorecard is Review for MP and Performance for BUY', () => {
    expect(sectionForPath('/buyer/scorecard', 'MP')?.id).toBe('review');
    expect(sectionForPath('/buyer/scorecard', 'BUY')?.id).toBe('performance');
  });

  it('a Weekly plan route resolves to Weekly plan, and a route in no section to null', () => {
    expect(sectionForPath('/buyer/order-plan', 'MP')?.id).toBe('weeklyPlan');
    expect(sectionForPath('/buyer/data-health', 'MP')).toBeNull();
    expect(sectionForPath('/buyer/no-such-page', 'BUY')).toBeNull();
  });
});

describe('labels (F-19, F-25)', () => {
  it('every new key exists in EN and ID', () => {
    for (const key of NEW_KEYS) {
      expect(hubEn[key], key).toBeTruthy();
      expect(hubId[key], key).toBeTruthy();
    }
  });

  it('the old section key stays for the pages that still read it', () => {
    expect(hubEn['hub.nav.section.forecast']).toBe('Forecast');
    expect(hubId['hub.nav.section.forecast']).toBe('Prakiraan');
  });

  it('the Safety stock page title matches its menu label', () => {
    expect(safetyStockEn['sst.title']).toBe('Safety stock targets');
    expect(safetyStockId['sst.title']).toBe('Target stok pengaman');
    expect(hubEn['hub.nav.pti.engine.safetyStock']).toBe(`Planning engine · ${safetyStockEn['sst.title']}`);
    expect(hubId['hub.nav.pti.engine.safetyStock']).toBe(`Mesin perencanaan · ${safetyStockId['sst.title']}`);
  });
});
