// ─────────────────────────────────────────────────────────────────────────────
// Forecast UX phase 1, task A1 (FORECAST-UX-EVALUATION-2026-10 §3; F-03, F-04,
// F-11, F-19, F-25; FUX-D2): the Weekly plan and Review sections replace the
// 13-item Forecast group, the engine pages move to the user menu, and the page
// header names the section the viewer's own menu shows (NV-05).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ListChecks, ListTodo } from 'lucide-react';
import { PTI_NAV, SUPPLIER_NAV, UTILITY_NAV, navFor, sectionForPath } from './navConfig';
import { hubEn, hubId } from '@lib/i18n/hub';
import { safetyStockEn, safetyStockId } from '@lib/i18n/safetyStock';

const FORECAST_ROUTES = [
  '/buyer/order-plan',
  '/buyer/reschedule',
  '/buyer/stabilise',
  '/buyer/collaboration',
  '/buyer/scorecard',
  '/buyer/demand-forecast',
  '/buyer/fs-reconcile'
];

const ENGINE = [
  ['hub.nav.pti.engine.materialRequirement', '/buyer/material-requirement'],
  ['hub.nav.pti.engine.safetyStock', '/buyer/safety-stock'],
  ['hub.nav.pti.engine.dataHealth', '/buyer/data-health'],
  ['hub.nav.pti.engine.modelBacktest', '/buyer/model-backtest'],
  ['hub.nav.pti.engine.reliability', '/buyer/reliability']
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
  ...ENGINE.map(([key]) => key)
];

describe('Material Planner menu — Weekly plan and Review (F-03, F-04)', () => {
  const mp = navFor('buyer', 'MP');
  /** @param {'MP' | 'BUY'} role */
  const items = (role) =>
    navFor('buyer', role).flatMap((s) =>
      s.items.map((i) => ({ section: s.id, key: i.labelKey, path: i.path }))
    );

  it('shows exactly the 7 forecast items in the brief order, under 2 sections', () => {
    const forecastItems = items('MP').filter((i) => FORECAST_ROUTES.includes(i.path));
    expect(forecastItems.map((i) => [i.section, i.key, i.path])).toEqual([
      ['weeklyPlan', 'hub.nav.pti.whatToOrder', '/buyer/order-plan'],
      ['weeklyPlan', 'hub.nav.pti.makeRoom', '/buyer/reschedule'],
      ['weeklyPlan', 'hub.nav.pti.publishToSuppliers', '/buyer/stabilise'],
      ['weeklyPlan', 'hub.nav.pti.supplierResponses', '/buyer/collaboration'],
      ['review', 'hub.nav.pti.performance', '/buyer/scorecard'],
      ['review', 'hub.nav.pti.forecastQuality', '/buyer/demand-forecast'],
      ['review', 'hub.nav.pti.stockCheck', '/buyer/fs-reconcile']
    ]);
    // FUX phase 2 B1 — This week joins Weekly plan as its first item; CAP-10 —
    // Demand anticipation joins it. IA P-07 — the What-if sandbox left the menu.
    expect(
      /** @type {import('./navConfig').NavSection} */ (mp.find((s) => s.id === 'weeklyPlan')).items
    ).toHaveLength(6);
    // DRC-3 (BL-189) — Demand anticipation history joins Review as its last item.
    expect(
      /** @type {import('./navConfig').NavSection} */ (mp.find((s) => s.id === 'review')).items
    ).toHaveLength(4);
    expect(mp.map((s) => s.id)).not.toContain('forecast');
  });

  it('does not show the engine pages or Performance in the main menu', () => {
    const paths = items('MP').map((i) => i.path);
    for (const [, path] of ENGINE) expect(paths).not.toContain(path);
    expect(mp.map((s) => s.id)).not.toContain('performance');
  });

  it('Weekly plan and Review are Material Planning sections only', () => {
    for (const id of ['weeklyPlan', 'review']) {
      expect(
        /** @type {import('./navConfig').NavSection} */ (PTI_NAV.find((s) => s.id === id)).roles
      ).toEqual(['MP']);
    }
  });
});

describe('Procurement menu keeps Performance → Supplier scorecard (FUX-D2)', () => {
  it('shows Performance with the scorecard and (FUX-D6) the feedstock reconcile, and no Weekly plan or Review', () => {
    const buy = navFor('buyer', 'BUY');
    const performance = /** @type {import('./navConfig').NavSection} */ (
      buy.find((s) => s.id === 'performance')
    );
    expect(performance.items.map((i) => [i.labelKey, i.path])).toEqual([
      ['hub.nav.pti.performance', '/buyer/scorecard'],
      ['hub.nav.pti.stockCheck', '/buyer/fs-reconcile']
    ]);
    expect(buy.map((s) => s.id)).not.toContain('weeklyPlan');
    expect(buy.map((s) => s.id)).not.toContain('review');
  });
});

describe('FUX phase 2 B1 — This week and the Procurement path to the stock check (F-03, F-15, FUX-D6)', () => {
  it('an MP menu starts the Weekly plan with This week, then the 4 steps in cycle order', () => {
    const weekly = /** @type {import('./navConfig').NavSection} */ (
      navFor('buyer', 'MP').find((s) => s.id === 'weeklyPlan')
    );
    expect(weekly.items.map((i) => [i.labelKey, i.path])).toEqual([
      ['hub.nav.pti.thisWeek', '/buyer/this-week'],
      ['hub.nav.pti.whatToOrder', '/buyer/order-plan'],
      ['hub.nav.pti.makeRoom', '/buyer/reschedule'],
      ['hub.nav.pti.publishToSuppliers', '/buyer/stabilise'],
      ['hub.nav.pti.supplierResponses', '/buyer/collaboration'],
      // CAP-10 — the demand anticipation, frozen per 4-week horizon.
      ['hub.nav.pti.demandAnticipation', '/buyer/demand-anticipation']
      // IA P-07 (IA-B10) — the What-if sandbox is a row action, not a menu item.
    ]);
    const paths = navFor('buyer', 'ALL').flatMap((s) => s.items.map((i) => i.path));
    expect(paths).not.toContain('/buyer/what-if');
    expect(hubEn['hub.nav.pti.thisWeek']).toBe('This week');
    expect(hubEn['hub.nav.pti.demandAnticipation']).toBe('Demand anticipation');
    expect(hubId['hub.nav.pti.demandAnticipation']).toBe('Antisipasi permintaan');
    expect(hubId['hub.nav.pti.thisWeek']).toBe('Minggu ini');
  });

  it('a BUY menu shows Feedstock reconcile under Performance; This week stays a planner item', () => {
    const buy = navFor('buyer', 'BUY');
    const where = buy
      .filter((s) => s.items.some((i) => i.path === '/buyer/fs-reconcile'))
      .map((s) => s.id);
    expect(where).toEqual(['performance']);
    expect(buy.flatMap((s) => s.items).map((i) => i.path)).not.toContain('/buyer/this-week');
  });

  it("sectionForPath names the stock check's section from the viewer's own menu", () => {
    expect(sectionForPath('/buyer/fs-reconcile', 'MP')?.id).toBe('review');
    expect(sectionForPath('/buyer/fs-reconcile', 'BUY')?.id).toBe('performance');
    expect(sectionForPath('/buyer/this-week', 'MP')?.id).toBe('weeklyPlan');
  });
});

describe('Planning engine pages in the buyer user menu (F-04)', () => {
  it('lists every engine page, after the existing entries, each with the Planning engine prefix', () => {
    const buyer = UTILITY_NAV.buyer.map((i) => [i.labelKey, i.path]);
    expect(buyer.slice(-ENGINE.length)).toEqual(ENGINE);
    for (const [key] of ENGINE) {
      expect(hubEn[key]).toMatch(new RegExp(`^${hubEn['hub.nav.section.planningEngine']} · `));
      expect(hubId[key]).toMatch(new RegExp(`^${hubId['hub.nav.section.planningEngine']} · `));
    }
    expect(UTILITY_NAV.supplier.map((i) => i.path)).not.toContain('/buyer/data-health');
  });
});

describe('FUX phase 2 B5 — Forecast bias is a tab of Forecast quality, not a menu entry', () => {
  it('the user menu no longer lists Forecast bias, and no menu reaches its old route', () => {
    const utility = UTILITY_NAV.buyer;
    // Population control: the user menu is read, and still holds its engine pages.
    expect(utility.map((i) => i.path)).toContain('/buyer/model-backtest');
    expect(utility.map((i) => i.path)).not.toContain('/buyer/forecast-bias');
    expect(utility.map((i) => i.labelKey)).not.toContain('hub.nav.pti.engine.forecastBias');
    for (const role of /** @type {const} */ (['MP', 'BUY'])) {
      const paths = navFor('buyer', role).flatMap((sct) => sct.items.map((i) => i.path));
      expect(paths).not.toContain('/buyer/forecast-bias');
    }
    // Forecast quality, which now holds the bias tab, stays in the planner's Review section.
    expect(sectionForPath('/buyer/demand-forecast', 'MP')?.id).toBe('review');
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

  it('the old Forecast section key is gone: no page reads it after phases 1 and 2 (FUX3 C1)', () => {
    expect(hubEn['hub.nav.section.forecast']).toBeUndefined();
    expect(hubId['hub.nav.section.forecast']).toBeUndefined();
    // Control: the section keys the menu reads are still there.
    expect(hubEn['hub.nav.section.weeklyPlan']).toBeTruthy();
    expect(hubId['hub.nav.section.weeklyPlan']).toBeTruthy();
  });

  it('the Safety stock page title matches its menu label', () => {
    expect(safetyStockEn['sst.title']).toBe('Safety stock targets');
    expect(safetyStockId['sst.title']).toBe('Target stok pengaman');
    expect(hubEn['hub.nav.pti.engine.safetyStock']).toBe(
      `Planning engine · ${safetyStockEn['sst.title']}`
    );
    expect(hubId['hub.nav.pti.engine.safetyStock']).toBe(
      `Mesin perencanaan · ${safetyStockId['sst.title']}`
    );
  });
});

describe('DRC-3 (BL-189) — the demand anticipation history: planners, Procurement and Finance', () => {
  const PATH = '/buyer/demand-anticipation-history';
  /** @param {import('./hubRole').HubRole} role */
  const where = (role) =>
    navFor('buyer', role)
      .filter((s) => s.items.some((i) => i.path === PATH))
      .map((s) => s.id);

  it('a Material Planner reaches it under Review, after the feedstock reconcile', () => {
    expect(where('MP')).toEqual(['review']);
    const review = /** @type {import('./navConfig').NavSection} */ (
      navFor('buyer', 'MP').find((s) => s.id === 'review')
    );
    expect(review.items.slice(-1)[0]).toMatchObject({
      labelKey: 'hub.nav.pti.demandAnticipationHistory',
      path: PATH
    });
  });

  it('Procurement and Finance reach it under Audit; a supplier menu never holds it', () => {
    expect(where('BUY')).toEqual(['audit']);
    expect(where('FIN')).toEqual(['audit']);
    expect(SUPPLIER_NAV.flatMap((s) => s.items).map((i) => i.path)).not.toContain(PATH);
    expect(
      navFor('supplier', 'ALL')
        .flatMap((s) => s.items)
        .map((i) => i.path)
    ).not.toContain(PATH);
    // Known-good beside the absence: the planner's own Demand anticipation stays Weekly plan.
    expect(where('FIN')).not.toContain('weeklyPlan');
  });

  it('names its section from the viewer’s own menu, in EN and ID', () => {
    expect(sectionForPath(PATH, 'MP')?.id).toBe('review');
    expect(sectionForPath(PATH, 'FIN')?.id).toBe('audit');
    expect(hubEn['hub.nav.pti.demandAnticipationHistory']).toBe('Demand anticipation history');
    expect(hubId['hub.nav.pti.demandAnticipationHistory']).toBe('Riwayat antisipasi permintaan');
    expect(hubEn['hub.nav.section.audit']).toBe('Audit');
  });
});

describe('IA evaluation 2026-10 — menu homes, folded sections, one name per object', () => {
  /** @param {readonly import('./navConfig').NavSection[]} nav */
  const ids = (nav) => nav.map((s) => s.id);
  /**
   * @param {readonly import('./navConfig').NavSection[]} nav
   * @param {string} id
   */
  const itemsOf = (nav, id) =>
    /** @type {import('./navConfig').NavSection} */ (nav.find((s) => s.id === id)).items.map(
      (i) => [i.labelKey, i.path]
    );

  it('P-03 — Sourcing holds Requisitions first and Supplier documents last, for Procurement', () => {
    expect(itemsOf(navFor('buyer', 'BUY'), 'sourcing')).toEqual([
      ['hub.nav.pti.requisitions', '/buyer/purchase-requisition'],
      ['hub.nav.pti.rfi', '/buyer/rfi'],
      ['hub.nav.pti.rfq', '/buyer/rfq'],
      ['hub.nav.pti.rfp', '/buyer/rfp'],
      ['hub.nav.pti.suppliers', '/buyer/suppliers'],
      ['hub.nav.pti.supplierDocuments', '/buyer/compliance']
    ]);
    expect(hubEn['hub.nav.pti.requisitions']).toBe('Requisitions');
    expect(hubId['hub.nav.pti.requisitions']).toBe('Permintaan pembelian');
    expect(hubEn['hub.nav.pti.supplierDocuments']).toBe('Supplier documents');
    expect(hubId['hub.nav.pti.supplierDocuments']).toBe('Dokumen pemasok');
  });

  it('P-03 / NV-05 — both pages take their section label from the menu, on any role', () => {
    for (const role of /** @type {const} */ (['BUY', 'MP', 'FIN'])) {
      expect(sectionForPath('/buyer/purchase-requisition', role)?.id).toBe('sourcing');
      expect(sectionForPath('/buyer/compliance', role)?.id).toBe('sourcing');
    }
  });

  it('P-02 / P-09 — Order collaboration has no Order summary and holds Call-offs', () => {
    expect(itemsOf(navFor('buyer', 'MP'), 'orders')).toEqual([
      ['hub.nav.pti.purchaseOrders', '/buyer/orders'],
      ['hub.nav.pti.callOffs', '/buyer/call-offs'],
      ['hub.nav.pti.shipments', '/buyer/shipments'],
      ['hub.nav.pti.goodsReceipts', '/buyer/goods-receipt']
    ]);
    const all = [...PTI_NAV, ...SUPPLIER_NAV].flatMap((s) => s.items.map((i) => i.path));
    expect(all).not.toContain('/buyer/order-summary');
    expect(all).not.toContain('/supplier/order-summary');
    // Known-good beside the absences: Purchase orders is on both menus.
    expect(all).toContain('/supplier/orders');
  });

  it('P-09 — the one-item sections are folded; the per-role duplicates stay', () => {
    expect(ids(PTI_NAV)).not.toContain('materials');
    expect(ids(PTI_NAV)).not.toContain('calloffs');
    expect(itemsOf(PTI_NAV, 'inventory').slice(-1)).toEqual([
      ['hub.nav.pti.tradeNames', '/buyer/materials/trade-names']
    ]);
    expect(ids(SUPPLIER_NAV)).not.toContain('performance');
    expect(itemsOf(SUPPLIER_NAV, 'company')).toEqual([
      ['hub.nav.sup.documents', '/supplier/documents'],
      ['hub.nav.sup.performance', '/supplier/performance']
    ]);
    // RFx F-11 / DRC-D18 — kept as decided.
    expect(sectionForPath('/buyer/scorecard', 'BUY')?.id).toBe('performance');
    expect(sectionForPath('/buyer/demand-anticipation-history', 'FIN')?.id).toBe('audit');
  });

  it('NV-04 — every page in the menus has its own icon, never one another page uses', () => {
    /** @type {Record<string, string>} */
    const SAME_OBJECT = {
      'goods-receipts': 'goods-receipt',
      forecasts: 'collaboration',
      performance: 'scorecard'
    };
    /** @type {Map<unknown, Set<string>>} */
    const pagesByIcon = new Map();
    for (const item of [...PTI_NAV, ...SUPPLIER_NAV].flatMap((s) => s.items)) {
      // The same page on two menus, or the two personas' pages of one object
      // (call-offs, invoices), shares an icon; two different pages never do.
      const tail = item.path.replace(/^\/(buyer|supplier)\//, '');
      // The same object under a different path on each persona.
      const page = SAME_OBJECT[tail] ?? tail;
      pagesByIcon.set(item.icon, (pagesByIcon.get(item.icon) ?? new Set()).add(page));
    }
    const shared = [...pagesByIcon.values()].filter((p) => p.size > 1).map((p) => [...p]);
    expect(shared).toEqual([]);
    // Control: the walk reaches the menus' icons.
    expect(pagesByIcon.size).toBeGreaterThan(20);
  });

  // The test above compares icon COMPONENTS. Since Paradise stage 5b the
  // lucide-react alias (paradise/adapters/lucide-react.jsx) can draw two
  // different components with one Paradise glyph, so this one compares what is
  // DRAWN: My tasks (ListTodo) and Requisitions (ClipboardList) both drew
  // CheckListIcon until the owner ruling of 2026-10-28.
  it('NV-04 — no two pages in the menus draw the same glyph', () => {
    /** @type {Record<string, string>} */
    const SAME_OBJECT = {
      'goods-receipts': 'goods-receipt',
      forecasts: 'collaboration',
      performance: 'scorecard'
    };
    /** @param {unknown} icon */
    const drawn = (icon) =>
      renderToStaticMarkup(createElement(/** @type {any} */ (icon), { size: 16 })).replace(
        / class="[^"]*"/g,
        ''
      );
    /** @type {Map<string, Set<string>>} */
    const pagesByGlyph = new Map();
    for (const item of [...PTI_NAV, ...SUPPLIER_NAV].flatMap((s) => s.items)) {
      const tail = item.path.replace(/^\/(buyer|supplier)\//, '');
      const page = SAME_OBJECT[tail] ?? tail;
      const glyph = drawn(item.icon);
      pagesByGlyph.set(glyph, (pagesByGlyph.get(glyph) ?? new Set()).add(page));
    }
    const shared = [...pagesByGlyph.values()].filter((p) => p.size > 1).map((p) => [...p]);
    expect(shared).toEqual([]);
    // Control: the walk reaches the menus' icons and draws real markup.
    expect(pagesByGlyph.size).toBeGreaterThan(20);
    // Known-bad control: two names mapped to one glyph do draw the same markup.
    expect(drawn(ListTodo)).toBe(drawn(ListChecks));
  });

  it('P-11 — one name per object, the same on both personas, in EN and ID', () => {
    expect(hubEn['hub.nav.pti.inventory']).toBe(hubEn['hub.nav.sup.stock']);
    expect(hubId['hub.nav.pti.inventory']).toBe(hubId['hub.nav.sup.stock']);
    // Owner ruling 2026-10-21 — "Foresight commitments"; "Foresight" stays untranslated.
    expect(hubEn['hub.nav.pti.supplierResponses']).toBe('Foresight commitments');
    expect(hubEn['hub.nav.sup.forecast']).toBe('Foresight commitments');
    expect(hubId['hub.nav.pti.supplierResponses']).toBe('Komitmen foresight');
    expect(hubId['hub.nav.sup.forecast']).toBe('Komitmen foresight');
    expect(hubEn['hub.nav.pti.replies']).toBe('Supplier follow-ups');
    expect(hubId['hub.nav.pti.replies']).toBe('Tindak lanjut pemasok');
  });
});
