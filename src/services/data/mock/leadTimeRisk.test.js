// ────────────────────────────────────────────────────────────────────────────
// BL-46 — alert risk class by supplier lead time (CR-24), with the CR-02 day
// bands as its fallback where the lead time is missing (CR-02, revised
// 2026-09-21). Three layers, each probed both ways:
//
//   1. The rule itself (`riskFor`), at both cuts, on both sides of each.
//   2. The demo data, pinned by NAMED supplier × material through the REAL
//      read service — never by count — so every case is visible on screen.
//   3. The sites: every shipped file that computes a band or a risk class,
//      derived from source, with a known-true and a known-false control.
//
// BOUNDARY CONVENTION (pinned here): "below" is strict at both cuts. Cover
// EXACTLY at the lead time is Medium (not below 1 ×); cover EXACTLY at 1.5 ×
// lead time is Low (not below 1.5 ×). This reads CR-24's words literally.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { MockProcurementService } from './MockProcurementService';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import {
  capacityStore,
  inventoryAlertLedger,
  stockAccessStore,
  stockSyncStore
} from './stores/inventoryHubStores';
import { SUPPLIER_LEAD_TIME_DAYS, SUPPLY_ASSIGNMENTS } from './fixtures/inventoryHub';
/** @import { InventoryPosition, QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { PTI_ONLY_RULES } from '../../transitions/inventoryAlertRules';
import { leadTimeRisk } from '../../transitions/inventoryConfig';
import { hasLeadTime, positionDays, positionRisk, riskFor } from '../../transitions/inventoryRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const reads = new MockProcurementService();
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplier = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});

beforeEach(() => {
  inventoryDeclarationStore.reset();
  stockAccessStore.reset();
  capacityStore.reset();
  stockSyncStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

describe('CR-24 — the rule, at both cuts, on both sides', () => {
  it('the multiple is 1.5', () => {
    expect(leadTimeRisk().mediumBelowMultiple).toBe(1.5);
  });

  it('lead time 21: High below 21, Medium from 21 to below 31.5, Low from 31.5', () => {
    expect(riskFor(20.99, 21).riskClass).toBe('high');
    expect(riskFor(21, 21).riskClass).toBe('medium'); // exactly 1 × — not below
    expect(riskFor(21.01, 21).riskClass).toBe('medium');
    expect(riskFor(31.49, 21).riskClass).toBe('medium');
    expect(riskFor(31.5, 21).riskClass).toBe('low'); // exactly 1.5 × — not below
    expect(riskFor(31.51, 21).riskClass).toBe('low');
    expect(riskFor(0, 21).riskClass).toBe('high');
  });

  it('the basis names the lead time and the cover', () => {
    expect(riskFor(10, 21)).toEqual({
      riskClass: 'high',
      basis: { kind: 'leadTime', leadTimeDays: 21, daysOfCover: 10 }
    });
  });

  it('no lead time: the CR-02 bands decide, at their own boundaries', () => {
    expect(riskFor(13.99, null)).toEqual({
      riskClass: 'high',
      basis: { kind: 'fallbackBands', band: 'critical', daysOfCover: 13.99 }
    });
    expect(riskFor(14, null).riskClass).toBe('medium'); // Warning
    expect(riskFor(29.99, null).riskClass).toBe('medium');
    expect(riskFor(30, null).riskClass).toBe('low'); // Healthy
    expect(riskFor(61, null)).toMatchObject({ riskClass: 'low', basis: { band: 'excess' } });
  });

  it('a lead time that is not a positive number counts as missing', () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(hasLeadTime(bad)).toBe(false);
      expect(riskFor(10, bad).basis.kind).toBe('fallbackBands');
    }
    expect(hasLeadTime(1)).toBe(true);
  });

  it('no days of cover: Low, basis noCover — never a fallback band', () => {
    expect(riskFor(null, 21)).toEqual({
      riskClass: 'low',
      basis: { kind: 'noCover', leadTimeDays: 21 }
    });
    expect(riskFor(null, null)).toEqual({
      riskClass: 'low',
      basis: { kind: 'noCover', leadTimeDays: null }
    });
  });
});

// ── The demo cases, by name ─────────────────────────────────────────────────

/** @returns {Promise<InventoryPosition[]>} */
const positions = async () => (await reads.getInventory(buyer)).items;
/**
 * @param {InventoryPosition[]} all
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {InventoryPosition}
 */
const pos = (all, supplierId, materialCode) => {
  const p = all.find((x) => x.supplierId === supplierId && x.materialCode === materialCode);
  if (!p) throw new Error(`no position ${supplierId} ${materialCode}`);
  return p;
};

describe('BL-46 demo data — each case visible, pinned by supplier × material', () => {
  it('High: sup-002 RM-STEAR-7300, 10 days of cover against a 21-day lead time', async () => {
    const p = pos(await positions(), 'sup-002', 'RM-STEAR-7300');
    expect(positionRisk(p)).toEqual({
      riskClass: 'high',
      basis: { kind: 'leadTime', leadTimeDays: 21, daysOfCover: 10 }
    });
  });

  it('Medium: sup-007 PK-PETB-8801, 17 days against 14 (between 1 × and 1.5 ×)', async () => {
    const p = pos(await positions(), 'sup-007', 'PK-PETB-8801');
    expect(positionRisk(p)).toEqual({
      riskClass: 'medium',
      basis: { kind: 'leadTime', leadTimeDays: 14, daysOfCover: 17 }
    });
  });

  it('Low: sup-008 PK-CART-9901, 44.99 days against 14', async () => {
    const p = pos(await positions(), 'sup-008', 'PK-CART-9901');
    const r = positionRisk(p);
    expect(r.riskClass).toBe('low');
    expect(r.basis).toMatchObject({ kind: 'leadTime', leadTimeDays: 14 });
    expect(positionDays(p)).toBeGreaterThan(21);
  });

  it('exactly 1 ×: sup-009 AI-VITC-6730, 25 days against 25 — Medium', async () => {
    const p = pos(await positions(), 'sup-009', 'AI-VITC-6730');
    expect(positionDays(p)).toBe(25); // exact, so the case really sits ON the cut
    expect(positionRisk(p).riskClass).toBe('medium');
    // One unit either side of the cut, same supplier and material.
    expect(positionRisk({ ...p, supplierSoh: (p.supplierSoh ?? 0) - 1 }).riskClass).toBe('high');
  });

  it('exactly 1.5 ×: sup-006 AI-VITC-6720, 12 days against 8 — Low (Critical under the old bands)', async () => {
    const p = pos(await positions(), 'sup-006', 'AI-VITC-6720');
    expect(positionDays(p)).toBe(12);
    expect(positionRisk(p)).toEqual({
      riskClass: 'low',
      basis: { kind: 'leadTime', leadTimeDays: 8, daysOfCover: 12 }
    });
    expect(positionRisk({ ...p, supplierSoh: (p.supplierSoh ?? 0) - 1 }).riskClass).toBe('medium');
  });

  it('no lead time: sup-010 RM-EMUL-9430 falls back to CR-02 (6 days, Critical → High)', async () => {
    const p = pos(await positions(), 'sup-010', 'RM-EMUL-9430');
    expect(p.leadTimeDays).toBeNull();
    expect(positionRisk(p)).toEqual({
      riskClass: 'high',
      basis: { kind: 'fallbackBands', band: 'critical', daysOfCover: 6 }
    });
  });

  it('the lead-time-missing population is derived from the positions, and it is exactly sup-010 RM-EMUL-9430', async () => {
    const all = await positions();
    // Known-true control: a pair with a lead time on record is in the model.
    expect(hasLeadTime(pos(all, 'sup-002', 'RM-STEAR-7300').leadTimeDays)).toBe(true);
    const missing = all
      .filter((p) => !hasLeadTime(p.leadTimeDays))
      .map((p) => `${p.supplierId}|${p.materialCode}`);
    expect(missing).toEqual(['sup-010|RM-EMUL-9430']);
    // Every assignment except that one has a lead time — the fixture and the
    // model agree, so a new assignment without a lead time turns this red.
    const assigned = SUPPLY_ASSIGNMENTS.map((a) => `${a.supplierId}|${a.materialCode}`);
    expect(assigned.filter((k) => !(k in SUPPLIER_LEAD_TIME_DAYS))).toEqual([
      'sup-010|RM-EMUL-9430'
    ]);
  });
});

describe('BL-46 alerts — the class, its basis, and the lead-time-missing alert', () => {
  it('PTI sees ONE lead-time-missing alert, for sup-010 RM-EMUL-9430, High by the fallback', async () => {
    const alerts = (await reads.getInventoryAlerts(buyer)).items;
    const missing = alerts.filter((a) => a.rule === 'leadTimeMissing');
    expect(missing.map((a) => a.key)).toEqual(['leadTimeMissing|RM-EMUL-9430|sup-010']);
    expect(missing[0]).toMatchObject({
      status: 'open',
      riskClass: 'high',
      riskBasis: { kind: 'fallbackBands', band: 'critical', daysOfCover: 6 }
    });
    // Known-false: a material with a lead time raises no such alert.
    expect(alerts.some((a) => a.key === 'leadTimeMissing|RM-STEAR-7300|sup-002')).toBe(false);
  });

  it('an alert on a lead-time material carries the lead-time basis', async () => {
    const alerts = (await reads.getInventoryAlerts(buyer)).items;
    expect(alerts.find((a) => a.key === 'ptiBelowRop|RM-STEAR-7300|sup-002')).toMatchObject({
      riskClass: 'high',
      riskBasis: { kind: 'leadTime', leadTimeDays: 21, daysOfCover: 10 }
    });
    // PREMISE CHANGED: sup-006 AI-VITC-6720's coverage alert was High (Critical
    // band, Uncovered). At exactly 1.5 × its lead time it is Low now.
    expect(alerts.find((a) => a.key === 'coverage|AI-VITC-6720|sup-006')).toMatchObject({
      riskClass: 'low',
      riskBasis: { kind: 'leadTime', leadTimeDays: 8, daysOfCover: 12 }
    });
  });

  it('the supplier never sees the lead-time-missing alert (PTI master data), but does see its own others', async () => {
    expect(PTI_ONLY_RULES).toContain('leadTimeMissing');
    const own = (await reads.getInventoryAlerts(supplier('sup-010'))).items;
    expect(own.some((a) => a.rule === 'leadTimeMissing')).toBe(false);
    // Known-true: sup-010's coverage alert on the same material still reaches it.
    expect(own.map((a) => a.key)).toContain('coverage|RM-EMUL-9430|sup-010');
  });
});

// ── The sites: derived from source ──────────────────────────────────────────

const SRC = join(process.cwd(), 'src');

/**
 * @param {string} dir
 * @param {string[]} [out]
 * @returns {string[]}
 */
function shipped(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) shipped(full, out);
    else if (/\.[jt]sx?$/.test(name) && !name.includes('.test.')) out.push(full);
  }
  return out;
}

/**
 * Comments stripped, so a sentence naming a function is not a call to it.
 * @param {string} source
 * @returns {string}
 */
const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/**
 * @param {RegExp} pattern
 * @returns {string[]}
 */
const callers = (pattern) =>
  shipped(SRC)
    .filter((f) => pattern.test(code(readFileSync(f, 'utf8'))))
    .map((f) => relative(process.cwd(), f).split('\\').join('/'))
    .sort();

describe('BL-46 sites — one function computes the risk class, and nothing else computes a band', () => {
  it('the CR-02 band is called only inside inventoryRules (the fallback), never by a page', () => {
    const band = callers(/\b(supplyBand|positionBand)\s*\(/);
    // Known-true: the rules module calls it (the fallback in riskFor).
    expect(band).toContain('src/services/transitions/inventoryRules.js');
    // Known-false: the PTI inventory page used to filter by band; it must not now.
    expect(band).not.toContain('src/pages-v2/BuyerInventory.jsx');
    expect(band).toEqual(['src/services/transitions/inventoryRules.js']);
  });

  it('every surface that shows a material risk reads positionRisk', () => {
    const risk = callers(/\bpositionRisk\s*\(/);
    expect(risk).toEqual([
      'src/pages-v2/BuyerInventory.jsx',
      // SC-01 — the supplier's To do reads cover against lead time from the same
      // function to rate its supply tasks ("Cover 4 days · Lead time 14 days").
      'src/pages-v2/SupplierHome.jsx',
      'src/pages-v2/inventory/inventoryDisplay.jsx',
      'src/pages-v2/widgets/BuyerInventoryWidget.jsx',
      'src/services/transitions/inventoryAlertRules.js'
    ]);
    // Known-false: the alert list shows the class the alert carries; it does not recompute it.
    expect(risk).not.toContain('src/pages-v2/BuyerAlerts.jsx');
  });

  it('the thresholds are read only by the rules module', () => {
    // ⚠️ PREMISE CHANGED AT BL-32: the thresholds were module constants
    // (`SUPPLY_BANDS`, `LEAD_TIME_RISK`); they are now the administrator's
    // values, read in force through `supplyBands()` / `leadTimeRisk()`. The
    // claim is unchanged — the config module defines them, the rules module is
    // their only reader — and the old names must be gone from shipped code.
    expect(callers(/\b(SUPPLY_BANDS|LEAD_TIME_RISK)\b/)).toEqual([]);
    expect(callers(/\b(supplyBands|leadTimeRisk)\s*\(/)).toEqual([
      'src/services/transitions/inventoryConfig.js',
      'src/services/transitions/inventoryRules.js'
    ]);
  });
});
