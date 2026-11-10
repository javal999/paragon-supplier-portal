// ────────────────────────────────────────────────────────────────────────────
// CAP-8 (BL-177) — Move demand to several suppliers, through the REAL
// MockCommandService and read back through the REAL MockProcurementService.
//
// The fixture has no exception on a material with two other qualified
// suppliers, so each walk first makes one with the supplier's own verb:
// sup-005 commits 100 of its 400 kg Firm week of 31 Aug of RM-EMUL-9410 (reason
// capacity) — a shortfall of 300 kg, which sup-002 and sup-010 can take.
// AC-01's 12 800 pcs → 8 000 + 4 800 becomes 300 kg → 200 + 100.
// BL-282: raw material is weekly like packaging, so the period is the week of
// 31 Aug (it was September: 1 800 kg, shortfall 1 300 → 800 + 500).
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { forecastVersionStore, forecastViewStore } from './stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from './stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS } from './fixtures/forecastHub';
/** @import { ForecastCommitmentLine, QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { isException } from '../../transitions/forecastRules';
import { horizonWeeks, moveHeadroom } from '../../transitions/capacityRules';
import { materialEntry, sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

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
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  capacityStore.reset();
  sdcClock.reset();
});

const MAT = 'RM-EMUL-9410';
const SEP = '2026-08-31';

/** @param {QueryScope} scope */
const linesFor = async (scope) => (await reads.getForecastCommitments(scope)).items;
/**
 * @param {QueryScope} scope
 * @param {string} supplierId
 * @param {string} [materialCode]
 * @param {string} [period]
 * @returns {Promise<ForecastCommitmentLine | undefined>}
 */
const lineOf = async (scope, supplierId, materialCode = MAT, period = SEP) =>
  (await linesFor(scope)).find(
    (l) =>
      l.supplierId === supplierId && l.materialCode === materialCode && l.periodBucket === period
  );

/** sup-005 commits 100 kg of its Firm week, with a reason: a 300 kg exception. */
async function makeShortfall() {
  const l = /** @type {ForecastCommitmentLine} */ (await lineOf(supplier('sup-005'), 'sup-005'));
  const created = await svc.dispatch(supplier('sup-005'), {
    transitionId: 't_requirementresponse_submit',
    entity: 'requirementResponse',
    payload: {
      publicationId: l.publicationId,
      planVersion: l.planVersion,
      supplierId: 'sup-005',
      materialCode: MAT,
      periodBucket: SEP,
      confirmedQty: 100,
      confirmedQtyRaw: '100',
      committedDate: l.periodStart,
      rootCause: { level1: 'capacity' }
    }
  });
  await svc.dispatch(supplier('sup-005'), {
    transitionId: 't_requirementresponse_promote',
    entity: 'requirementResponse',
    entityId: /** @type {string} */ (created.entityId),
    payload: {}
  });
  const source = /** @type {ForecastCommitmentLine} */ (await lineOf(buyer, 'sup-005'));
  // Control: the premise every walk below stands on.
  expect([source.forecastQty, source.committedQty, source.state, source.uom]).toEqual([
    400,
    100,
    'exception',
    'KG'
  ]);
  return source;
}

/**
 * @param {ForecastCommitmentLine} source
 * @param {readonly { supplierId: string; qty: number }[]} allocations
 * @param {string} [note]
 */
const moveFrom = (source, allocations, note = 'Principal shipment late') =>
  svc.dispatch(buyer, {
    transitionId: 't_forecastversion_reassign',
    entity: 'forecastVersion',
    payload: {
      publicationId: source.publicationId,
      materialCode: MAT,
      periodBucket: SEP,
      fromSupplierId: 'sup-005',
      allocations,
      note
    }
  });

describe('CAP-8 AC-01 — one shortfall split across two suppliers', () => {
  it('300 kg moved 200 to sup-002 and 100 to sup-010: both see the new demand; the source shows two allocations; one version', async () => {
    const source = await makeShortfall();
    const before002 = /** @type {ForecastCommitmentLine} */ (
      await lineOf(supplier('sup-002'), 'sup-002')
    );
    expect(await lineOf(supplier('sup-010'), 'sup-010')).toBeUndefined();
    const res = await moveFrom(source, [
      { supplierId: 'sup-002', qty: 200 },
      { supplierId: 'sup-010', qty: 100 }
    ]);
    expect(res).toMatchObject({ status: 'done', entityId: 'FC-RM-V3' });
    // ONE verb, ONE version for the whole split.
    expect(forecastVersionStore.all().filter((v) => v.stream === 'rawMaterial')).toHaveLength(3);

    // BR-05 — each target sees the demand on its own commitment read and confirms it like any other.
    const seen002 = /** @type {ForecastCommitmentLine} */ (
      await lineOf(supplier('sup-002'), 'sup-002')
    );
    expect([seen002.forecastQty, seen002.state, seen002.uom]).toEqual([
      before002.forecastQty + 200,
      'awaiting',
      'KG'
    ]);
    const seen010 = /** @type {ForecastCommitmentLine} */ (
      await lineOf(supplier('sup-010'), 'sup-010')
    );
    expect([seen010.forecastQty, seen010.state, seen010.zone]).toEqual([100, 'awaiting', 'firm']);

    // The source line: what is left, the commitment still standing, one log entry per allocation.
    const after = /** @type {ForecastCommitmentLine} */ (await lineOf(buyer, 'sup-005'));
    expect([after.forecastQty, after.committedQty, after.state, after.carriedForward]).toEqual([
      100,
      100,
      'accepted',
      true
    ]);
    expect(after.moves.map((m) => [m.toSupplierId, m.toSupplierName, m.qty, m.note])).toEqual([
      ['sup-002', 'PT Sample Specialty Fats', 200, 'Principal shipment late'],
      ['sup-010', after.moves[1].toSupplierName, 100, 'Principal shipment late']
    ]);
    expect(after.moves[1].toSupplierName).not.toBe('sup-010');
  });
});

describe('CAP-8 AC-02 / BR-03 — the shortfall rule at the verb', () => {
  it('known-bad: 301 kg in total is refused with the shortfall named; nothing is published', async () => {
    const source = await makeShortfall();
    const res = await moveFrom(source, [
      { supplierId: 'sup-002', qty: 200 },
      { supplierId: 'sup-010', qty: 101 }
    ]);
    expect(res.status).toBe('failed');
    expect(res.reason).toContain('More than the shortfall of 300 KG');
    expect(forecastVersionStore.get('FC-RM-V3')).toBeUndefined();
  });

  it('known-bad: nothing, 0 or a negative quantity is refused; the note stays required (BR-06)', async () => {
    const source = await makeShortfall();
    expect((await moveFrom(source, [])).reason).toMatch(/allocations|NOTHING_TO_MOVE/);
    expect((await moveFrom(source, [{ supplierId: 'sup-002', qty: 0 }])).reason).toMatch(
      /BAD_ALLOCATION/
    );
    expect((await moveFrom(source, [{ supplierId: 'sup-002', qty: -1 }])).reason).toMatch(
      /BAD_ALLOCATION/
    );
    expect((await moveFrom(source, [{ supplierId: 'sup-002', qty: 200 }], '  ')).reason).toMatch(
      /NOTE_REQUIRED/
    );
    expect(forecastVersionStore.get('FC-RM-V3')).toBeUndefined();
  });

  it('a partial move leaves the rest as an open exception', async () => {
    const source = await makeShortfall();
    const res = await moveFrom(source, [{ supplierId: 'sup-002', qty: 100 }]);
    expect(res.status).toBe('done');
    const after = /** @type {ForecastCommitmentLine} */ (await lineOf(buyer, 'sup-005'));
    expect([after.forecastQty, after.committedQty, after.state]).toEqual([300, 100, 'exception']);
    expect(isException(after, sdcClock.now())).toBe(true);
    expect(after.moves).toHaveLength(1);
  });
});

describe('CAP-8 BR-01 / BR-04 — the target’s capacity headroom (BE − LTP)', () => {
  /**
   * @param {string} supplierId
   * @param {string} [materialCode]
   * @param {string} [period]
   */
  const headroom = async (supplierId, materialCode = MAT, period = SEP) => {
    const lines = await linesFor(buyer);
    const plans = (await reads.getCapacityPlans(buyer)).items;
    const l = /** @type {ForecastCommitmentLine} */ (
      lines.find((x) => x.materialCode === materialCode && x.periodBucket === period)
    );
    return moveHeadroom(
      plans,
      lines,
      supplierId,
      materialCode,
      l.periodStart,
      l.periodEnd,
      horizonWeeks(sdcClock.now()),
      materialEntry
    );
  };

  it('known: a week reads that week’s BE − LTP; a month the most before any week goes above BE', async () => {
    // sup-012, week of 21 Sep: BE 17 000 − LTP 13 200.
    expect(await headroom('sup-012', 'PK-PETB-8802', SEEDED_PACKAGING_WEEKS[3])).toBe(3800);
    // sup-002, week of 31 Aug: BE 1 200 − LTP 1 000.
    expect(await headroom('sup-002')).toBe(200);
  });

  it('a period of several weeks reads the most before any week goes above BE (the month branch, now only a synthetic span)', async () => {
    const lines = await linesFor(buyer);
    const plans = (await reads.getCapacityPlans(buyer)).items;
    const room = moveHeadroom(
      plans,
      lines,
      'sup-002',
      MAT,
      '2026-09-01',
      '2026-09-30',
      horizonWeeks(sdcClock.now()),
      materialEntry
    );
    expect(room).toBe(0);
  });

  it('unknown: no capacity stated, or part of the period beyond the capacity horizon', async () => {
    // sup-010 has not submitted capacity for the group.
    expect(await headroom('sup-010')).toBeNull();
    // The week of 7 Dec lies beyond the 13-week horizon.
    expect(await headroom('sup-002', MAT, '2026-12-07')).toBeNull();
  });

  it('BR-04 — a quantity above a target’s headroom is not refused', async () => {
    const source = await makeShortfall();
    expect(await headroom('sup-002')).toBeLessThan(300);
    expect((await moveFrom(source, [{ supplierId: 'sup-002', qty: 300 }])).status).toBe('done');
  });
});
