// ─────────────────────────────────────────────────────────────────────────────
// PEX-3 BR-02 (BL-284), Q-W3 (PEX-D24) — the per-week LTP, PTI stock on hand and
// the gap on the Foresight read.
//
// The read path extended: `forecastReadModel.allCommitmentLines` hands
// `buildCommitmentLines` PTI stock on hand per material (`ptiStockStore`, SAP
// records, BL-199); each line gets its LTP (the forecast quantity the supplier
// commits against), its share of the material's SOH (CAP-D11) and the gap the
// heads-up note names: LTP − SOH. Nothing is stored. The ORDERED QUANTITY
// (`forecastQty`) is NOT re-derived: it must read exactly what it read before.
//
// The grant: a supplier reads the SOH and the gap only for a material its
// granted PTI-stock access covers (`canSeePtiStock`, REQ-E08-03); the service
// masks the rest.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockProcurementService } from './MockProcurementService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { forecastVersionStore, forecastViewStore } from './stores/forecastHubStores';
import { inventoryAlertLedger, stockAccessStore } from './stores/inventoryHubStores';
import { ptiStockStore } from './stores/ptiStockStore';
import { SEEDED_PACKAGING_WEEKS as W } from './fixtures/forecastHub';
import { PTI_STOCK } from './fixtures/inventoryHub';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { lineAllocationShare, ltpSohGap } from '../../transitions/forecastRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
/** @import { ForecastCommitmentLine, QueryScope } from '../types' */

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
const sup007 = supplier('sup-007');
const sup002 = supplier('sup-002');

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  stockAccessStore.reset();
  ptiStockStore.reset();
  sdcClock.reset();
});

/**
 * @param {QueryScope} scope
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} period
 * @returns {Promise<ForecastCommitmentLine>}
 */
const lineOf = async (scope, supplierId, materialCode, period) => {
  const found = (await reads.getForecastCommitments(scope)).items.find(
    (l) =>
      l.supplierId === supplierId && l.materialCode === materialCode && l.periodBucket === period
  );
  expect(found, `${supplierId} ${materialCode} ${period}`).toBeDefined();
  return /** @type {ForecastCommitmentLine} */ (found);
};

/** @param {string} materialCode */
const stockOf = (materialCode) =>
  /** @type {number} */ (PTI_STOCK.find((r) => r.materialCode === materialCode)?.ptiSoh);

describe('PEX-3 BR-02 (BL-284) — the per-week LTP, PTI SOH and gap', () => {
  it('pins a known fixture week: the ordered quantity is unchanged and the gap is LTP − SOH', async () => {
    // W[0] of PK-PETB-8801 is the known week: 7,000/day × 7 days = 49,000 total,
    // sup-007's 0.7 share = 34,300. That was the figure before this build and
    // must stay it (the note's ordered quantity is NOT re-derived).
    const l = await lineOf(buyer, 'sup-007', 'PK-PETB-8801', W[0]);
    expect(l.forecastQty).toBe(34_300);
    expect(l.ltpQty).toBe(34_300);
    // The SOH is the supplier's share of SAP's 30,000 PTI stock for the material (0.7).
    expect(l.ptiSoh).toBe(Math.round((34_300 / 49_000) * stockOf('PK-PETB-8801')));
    expect(l.ptiSoh).toBe(21_000);
    expect(l.ptiStockShared).toBe(true);
    expect(ltpSohGap(l.ltpQty, l.ptiSoh)).toBe(13_300);
  });

  it('derives each line from its own allocation share; the shares cover the material’s SOH exactly', async () => {
    const a = await lineOf(buyer, 'sup-007', 'PK-PETB-8801', W[0]);
    const b = await lineOf(buyer, 'sup-012', 'PK-PETB-8801', W[0]);
    expect(a.forecastQty + b.forecastQty).toBe(49_000);
    expect(/** @type {number} */ (a.ptiSoh) + /** @type {number} */ (b.ptiSoh)).toBe(
      stockOf('PK-PETB-8801')
    );
    expect(b.forecastQty).toBe(14_700);
    expect(b.ptiSoh).toBe(9_000);
    expect(ltpSohGap(b.ltpQty, b.ptiSoh)).toBe(5_700);
  });

  it('a gap below zero is shown as it is: PTI stock covers the period', async () => {
    // PK-PETB-8802 W[0]: 5,500/day × 7 days × 1.1 = 42,400, sup-007's whole share;
    // PTI holds 55,000, so the week needs no order.
    const l = await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[0]);
    expect(l.forecastQty).toBe(42_400);
    expect(l.ptiSoh).toBe(55_000);
    expect(ltpSohGap(l.ltpQty, l.ptiSoh)).toBe(-12_600);
  });

  it('a monthly period carries its month’s LTP and the same SOH share', async () => {
    const l = await lineOf(buyer, 'sup-007', 'PK-PETB-8801', '2027-01');
    expect(l.ltpQty).toBe(l.forecastQty);
    expect(l.ptiSoh).toBe(21_000);
    expect(ltpSohGap(l.ltpQty, l.ptiSoh)).toBe(l.forecastQty - 21_000);
  });

  it('the share helper reads the version’s own allocation and refuses a zero total', () => {
    expect(
      lineAllocationShare({
        forecastQty: 34_300,
        allocation: { materialPeriodTotal: 49_000, basis: 'quota' }
      })
    ).toBeCloseTo(0.7, 10);
    expect(
      lineAllocationShare({
        forecastQty: 0,
        allocation: { materialPeriodTotal: 0, basis: 'quota' }
      })
    ).toBeNull();
    // The formula's two unknown terms: no gap rather than a NaN.
    expect(ltpSohGap(100, null)).toBeNull();
    expect(ltpSohGap(null, 100)).toBeNull();
  });
});

describe('PEX-3 BR-02 / Q-W3 (BL-284) — the PTI-stock grant gates a supplier’s read', () => {
  it('with the seeded grant, sup-007 reads the SOH and the gap on the granted bottles', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[0]);
    expect(l.ptiStockShared).toBe(true);
    expect(l.ptiSoh).toBe(55_000);
    expect(ltpSohGap(l.ltpQty, l.ptiSoh)).toBe(-12_600);
  });

  it('a material outside the grant is masked in the service, not painted over in the page', async () => {
    // The walkthrough container is sup-007's, but the grant names the two bottles only.
    const l = await lineOf(sup007, 'sup-007', '2000028400', W[0]);
    expect(l.ptiStockShared).toBe(false);
    expect(l.ptiSoh).toBeNull();
    expect(ltpSohGap(l.ltpQty, l.ptiSoh)).toBeNull();
    // The ordered quantity is not PTI stock: it still reads.
    expect(l.forecastQty).toBeGreaterThan(0);
  });

  it('a supplier with no grant at all reads no SOH on any line', async () => {
    const items = (await reads.getForecastCommitments(sup002)).items;
    expect(items.length).toBeGreaterThan(0);
    for (const l of items) {
      expect(l.ptiStockShared).toBe(false);
      expect(l.ptiSoh).toBeNull();
    }
  });

  it('granting a material turns its figures on, and revoking turns them off', async () => {
    stockAccessStore.put({
      supplierId: 'sup-002',
      supplierName: 'PT Sample Specialty Fats',
      active: true,
      materials: ['RM-EMUL-9410'],
      log: []
    });
    const granted = await lineOf(sup002, 'sup-002', 'RM-EMUL-9410', W[0]);
    expect(granted.ptiStockShared).toBe(true);
    // 1,000 of the week's 1,400 (5/7 share) × 1,800 PTI SOH = 1,286.
    expect(granted.ptiSoh).toBe(Math.round((1_000 / 1_400) * stockOf('RM-EMUL-9410')));
    expect(granted.ptiSoh).toBe(1_286);

    const grant = /** @type {NonNullable<ReturnType<typeof stockAccessStore.get>>} */ (
      stockAccessStore.get('sup-002')
    );
    stockAccessStore.put({ ...grant, active: false });
    const revoked = await lineOf(sup002, 'sup-002', 'RM-EMUL-9410', W[0]);
    expect(revoked.ptiStockShared).toBe(false);
    expect(revoked.ptiSoh).toBeNull();
  });
});
