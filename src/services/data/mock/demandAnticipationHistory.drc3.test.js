// ────────────────────────────────────────────────────────────────────────────
// DRC-3 (BL-189) — the demand anticipation history read, through the REAL
// MockProcurementService over the REAL stores, with publications made by the
// REAL publish verb: every publication listed with its stamp (DRC-D16), the
// superseded one kept and named, the carry-over origin after the week rolls,
// the DRC-5 (BL-191) adjustment with its origin, the filters, the CSV, and who
// may read it [Owner A10].
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { forecastVersionStore } from './stores/forecastHubStores';
import { callOffStore } from './stores/callOffStore';
import { asnStore } from './stores/asnStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
/** @import { QueryScope } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { RULES_VERSION } from '../../transitions/osipRules';
import { LTP_DROPPED_CODE } from '../../transitions/callOffRules';
import {
  DA_HISTORY_CSV_COLUMNS,
  DA_HISTORY_RULES,
  daHistoryCsv,
  daHistoryReadRefusal,
  defaultHistoryRange,
  filterDaHistory
} from '../../transitions/demandAnticipationHistory';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @param {string[]} roles @returns {QueryScope} */
const seat = (roles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  actor: NO_PERSON
});
const planning = seat(['planning']);
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

const W36 = '2026-08-31';
const W37 = '2026-09-07';
const EMUL = { supplierId: 'sup-002', materialCode: 'RM-EMUL-9410' };
const PET = { supplierId: 'sup-007', materialCode: 'PK-PETB-8801' };

/** @param {string} planningWeek @param {readonly string[]} [agreedFirstOutside] */
const publish = (planningWeek, agreedFirstOutside = []) =>
  cmd.dispatch(planning, {
    transitionId: 't_demandanticipation_publish',
    entity: 'demandAnticipation',
    payload: { planningWeek, agreedFirstOutside }
  });

/** @param {QueryScope} [scope] */
const history = async (scope = planning) => (await svc.getDemandAnticipationHistory(scope)).items;

/**
 * @param {Awaited<ReturnType<typeof history>>} rows
 * @param {string} publicationId
 * @param {{ supplierId: string; materialCode: string }} pair
 */
const rowOf = (rows, publicationId, pair) => {
  const r = rows.find(
    (x) =>
      x.publicationId === publicationId &&
      x.supplierId === pair.supplierId &&
      x.materialCode === pair.materialCode
  );
  if (!r)
    throw new Error(`no history row ${publicationId} ${pair.supplierId}|${pair.materialCode}`);
  return r;
};

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  callOffStore.reset();
  asnStore.reset();
  purchaseOrderStore.reset();
  // The seed is computed at the first read.
  demandAnticipationStore.all();
});
afterEach(() => sdcClock.reset());

describe('every publication, with its stamp (DRC-D16)', () => {
  it('lists the seeded publication: one row per supplier × material, its parts as stored', async () => {
    const rows = await history();
    const seed = demandAnticipationStore.all()[0];
    expect(rows.map((r) => r.publicationId)).toEqual(seed.entries.map(() => 'dap-0001'));
    const emul = rowOf(rows, 'dap-0001', EMUL);
    const stored = /** @type {NonNullable<ReturnType<typeof seed.entries.find>>} */ (
      seed.entries.find(
        (e) => e.supplierId === EMUL.supplierId && e.materialCode === EMUL.materialCode
      )
    );
    expect(emul).toMatchObject({
      source: 'sampleSeed',
      actor: NO_PERSON,
      planningWeek: W36,
      inForce: true,
      supersededBy: null,
      rulesVersion: RULES_VERSION,
      ospo: stored.figure.value.ospo,
      additionalPo: stored.figure.value.additionalPo,
      remainder: stored.figure.value.remainder,
      agreedFirstOutside: false,
      supplierName: expect.any(String),
      uom: expect.any(String)
    });
    expect(emul.inputs).toEqual(stored.figure.inputs);
    // Each horizon week with its parts: week 1 carries the safety order [Default A1].
    expect(emul.weeks.map((w) => w.week)).toEqual(stored.figure.value.horizonWeeks);
    expect(emul.weeks[0]).toMatchObject({
      week: W36,
      ltp: stored.figure.value.weeks[0].ltp,
      safety: stored.figure.value.safetyOrder,
      da: stored.figure.value.weeks[0].da
    });
    expect(emul.weeks[0].safety).toBeGreaterThan(0);
    expect(emul.weeks.slice(1).every((w) => w.safety === 0)).toBe(true);
  });

  it('re-publishing a week keeps the earlier publication, marked superseded by the new one', async () => {
    // [Owner A8] — the supplier agrees to take EMUL's remainder outside the horizon.
    const res = await publish(W36, [`${EMUL.supplierId}|${EMUL.materialCode}`]);
    expect(res.status, res.reason).toBe('done');
    const rows = await history();
    const old = rowOf(rows, 'dap-0001', EMUL);
    const now = rowOf(rows, 'dap-0002', EMUL);
    expect(old).toMatchObject({
      inForce: false,
      supersededBy: 'dap-0002',
      agreedFirstOutside: false
    });
    expect(now).toMatchObject({
      inForce: true,
      supersededBy: null,
      source: 'publish',
      agreedFirstOutside: true,
      carryTarget: 'firstOutside'
    });
    // Newest publication first.
    expect(rows[0].publicationId).toBe('dap-0002');
    expect(rows.slice(-1)[0]?.publicationId).toBe('dap-0001');
  });
});

describe('the carry-over origin (DRC-2 BR-03, DRC-B22)', () => {
  it('the next planning week shows the remainder carried in, and the week it came from', async () => {
    const w36 = rowOf(await history(), 'dap-0001', EMUL);
    expect(w36.carry).not.toBeNull();
    const carry = /** @type {NonNullable<typeof w36.carry>} */ (w36.carry);
    expect(carry.fromWeek).toBe(W36);
    sdcClock.set('2026-09-08T03:00:00.000Z'); // Tuesday of W37.
    expect((await publish(W37)).status).toBe('done');
    const w37 = rowOf(await history(), 'dap-0002', EMUL);
    expect(w37.planningWeek).toBe(W37);
    const into = w37.weeks.find((w) => w.week === carry.week);
    expect(into?.carriedIn).toContainEqual({ qty: carry.qty, fromWeek: W36 });
    // Both planning weeks are in force: one publication each.
    expect(w36.inForce).toBe(true);
    expect(w37.inForce).toBe(true);
  });
});

describe('DRC-5 (BL-191) — a delayed call-off shows as an adjustment with its origin', () => {
  it('the publication after the supplier approved lists the delay; the earlier one does not', async () => {
    sdcClock.set('2026-08-31T13:00:00.000Z');
    const propose = await cmd.dispatch(planning, {
      transitionId: 't_calloff_change',
      entity: 'callOff',
      entityId: 'co-0006',
      payload: { reason: 'LTP dropped', reasonCode: LTP_DROPPED_CODE, needDate: '2026-09-10' }
    });
    expect(propose.status, propose.reason).toBe('done');
    sdcClock.set('2026-08-31T14:00:00.000Z');
    const approve = await cmd.dispatch(supplier, {
      transitionId: 't_calloff_confirm',
      entity: 'callOff',
      entityId: 'co-0006',
      payload: { delayAnswer: 'approve' }
    });
    expect(approve.status, approve.reason).toBe('done');
    sdcClock.set('2026-08-31T15:00:00.000Z');
    // The approval changed the planning week's call-offs, so W36 re-publishes.
    expect((await publish(W36)).status).toBe('done');
    const rows = await history();
    const before = rowOf(rows, 'dap-0001', PET);
    const after = rowOf(rows, 'dap-0002', PET);
    expect(before.adjustments).toEqual([]);
    expect(after.adjustments).toEqual([
      expect.objectContaining({
        callOffId: 'co-0006',
        quantity: 10_000,
        fromWeek: W36,
        toWeek: W37,
        reasonCode: LTP_DROPPED_CODE,
        approvedAt: '2026-08-31T14:00:00.000Z'
      })
    ]);
    // The figure moved by the delayed quantity.
    expect(after.callOff).toBe(before.callOff - 10_000);
    // Another pair carries no adjustment.
    expect(rowOf(rows, 'dap-0002', EMUL).adjustments).toEqual([]);
  });
});

describe('the filters', () => {
  it('supplier, material and a planning-week range (the default goes 52 weeks back)', async () => {
    sdcClock.set('2026-09-08T03:00:00.000Z');
    await publish(W37);
    const rows = await history();
    expect(
      filterDaHistory(rows, { supplierId: 'sup-007' }).every((r) => r.supplierId === 'sup-007')
    ).toBe(true);
    expect(filterDaHistory(rows, { supplierId: 'sup-007' }).length).toBeGreaterThan(0);
    const pet = filterDaHistory(rows, PET);
    expect(pet.map((r) => r.publicationId)).toEqual(['dap-0002', 'dap-0001']);
    // A date inside a week counts its whole week.
    expect(
      filterDaHistory(rows, { ...PET, from: '2026-09-09' }).map((r) => r.planningWeek)
    ).toEqual([W37]);
    expect(filterDaHistory(rows, { ...PET, to: '2026-09-06' }).map((r) => r.planningWeek)).toEqual([
      W36
    ]);
    expect(filterDaHistory(rows, { supplierId: 'sup-999' })).toEqual([]);
    // [MoM 1A] — the default range.
    expect(DA_HISTORY_RULES.historyWeeksBack).toBe(52);
    expect(defaultHistoryRange('2026-09-08T03:00:00.000Z')).toEqual({
      from: '2025-09-08',
      to: W37
    });
  });
});

describe('the CSV export', () => {
  it('one line per publication × pair × horizon week, under the given header', async () => {
    const rows = filterDaHistory(await history(), EMUL);
    const header = DA_HISTORY_CSV_COLUMNS.map((c) => `h:${c}`);
    const csv = daHistoryCsv(
      rows,
      header,
      () => 'nobody',
      (r) => (r.inForce ? 'in force' : 'old')
    );
    const lines = csv.split('\n');
    expect(lines[0]).toBe(header.join(','));
    expect(lines).toHaveLength(1 + rows.reduce((n, r) => n + r.weeks.length, 0));
    const first = lines[1].split(',');
    expect(first[DA_HISTORY_CSV_COLUMNS.indexOf('publicationId')]).toBe('dap-0001');
    expect(first[DA_HISTORY_CSV_COLUMNS.indexOf('week')]).toBe(W36);
    expect(first[DA_HISTORY_CSV_COLUMNS.indexOf('rulesVersion')]).toBe(RULES_VERSION);
    expect(first[DA_HISTORY_CSV_COLUMNS.indexOf('publishedBy')]).toBe('nobody');
  });
});

describe('who may read it [Owner A10]', () => {
  it('planning, procurement, finance and the superset roles read; others are refused', async () => {
    for (const roles of [['planning'], ['procurement'], ['finance'], ['admin'], ['buyer_all']])
      expect((await history(seat(roles))).length, roles.join()).toBeGreaterThan(0);
    for (const roles of [['requisitioner'], ['receiving'], ['compliance'], []]) {
      await expect(history(seat(roles)), roles.join()).rejects.toBeInstanceOf(DataError);
      await expect(history(seat(roles))).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    }
  });

  it('a supplier never reads it', async () => {
    await expect(history(supplier)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(daHistoryReadRefusal(supplier)).toBe('SUPPLIER');
    expect(daHistoryReadRefusal(seat(['requisitioner']))).toBe('ROLE');
    expect(daHistoryReadRefusal(seat(['finance']))).toBeNull();
  });
});
