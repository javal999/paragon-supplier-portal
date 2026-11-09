// ────────────────────────────────────────────────────────────────────────────
// Forecast collaboration verbs (REQ-E06-01 to REQ-E06-03) dispatched through the
// REAL MockCommandService and read back through the REAL MockProcurementService.
// Every rule is probed both ways, and every walk ends in the store or the read.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { MockCollaborationService } from './MockCollaborationService';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { forecastVersionStore, forecastViewStore } from './stores/forecastHubStores';
import { inventoryAlertLedger } from './stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS, SEEDED_RAW_MATERIAL_MONTHS } from './fixtures/forecastHub';
/** @import { ForecastCommitmentLine, QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { getTransition } from '../../transitions';
import { deadlineState } from '../../transitions/forecastRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();
const collab = new MockCollaborationService();

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
const sup012 = supplier('sup-012');
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
  sdcClock.reset();
});

const W = SEEDED_PACKAGING_WEEKS;
const M = SEEDED_RAW_MATERIAL_MONTHS;

/** @param {QueryScope} scope */
const linesFor = async (scope) => (await reads.getForecastCommitments(scope)).items;
/**
 * @param {QueryScope} scope
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} period
 */
const lineOf = async (scope, supplierId, materialCode, period) =>
  /** @type {ForecastCommitmentLine} */ (
    (await linesFor(scope)).find(
      (l) =>
        l.supplierId === supplierId && l.materialCode === materialCode && l.periodBucket === period
    )
  );

/**
 * @param {ForecastCommitmentLine} l
 * @param {number} qty
 * @param {Record<string, unknown>} [extra]
 */
const commitPayload = (l, qty, extra = {}) => ({
  publicationId: l.publicationId,
  planVersion: l.planVersion,
  supplierId: l.supplierId,
  materialCode: l.materialCode,
  periodBucket: l.periodBucket,
  confirmedQty: qty,
  confirmedQtyRaw: String(qty),
  committedDate: l.periodStart,
  ...extra
});
/**
 * @param {QueryScope} scope
 * @param {Record<string, unknown>} payload
 */
const submit = (scope, payload) =>
  svc.dispatch(scope, {
    transitionId: 't_requirementresponse_submit',
    entity: 'requirementResponse',
    payload
  });
/**
 * @param {QueryScope} scope
 * @param {string} id
 */
const promote = (scope, id) =>
  svc.dispatch(scope, {
    transitionId: 't_requirementresponse_promote',
    entity: 'requirementResponse',
    entityId: id,
    payload: {}
  });

describe('roles (bilateral): the planner publishes and moves demand; the supplier opens and commits', () => {
  it('each new atom sits in exactly one lane on the right side', () => {
    expect(rolesHolding('forecast:publish')).toEqual(['planning']);
    expect(rolesHolding('forecast:view')).toEqual(['commercial']);
    expect(
      /** @type {import('../../transitions/schema').TransitionDef} */ (
        getTransition('t_requirementresponse_submit')
      ).policyHooks
    ).toEqual(
      expect.arrayContaining(['rr_submit_shortfall_reason', 'rr_submit_commitment_detail'])
    );
  });

  it('a supplier cannot publish; PTI cannot record a supplier view', async () => {
    await expect(
      svc.dispatch(sup007, {
        transitionId: 't_forecastversion_publish',
        entity: 'forecastVersion',
        payload: { stream: 'packaging' }
      })
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    const res = await svc.dispatch(buyer, {
      transitionId: 't_forecastview_record',
      entity: 'forecastView',
      payload: { publicationId: 'FC-PK-V2', supplierId: 'sup-007' }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

describe('REQ-E06-01 — versions, scoping and views', () => {
  it('PTI reads every version with who viewed it; a supplier reads only versions with its lines, and only itself', async () => {
    const all = (await reads.getForecastVersions(buyer)).items;
    expect(all.map((v) => v.publicationId).sort()).toEqual([
      'FC-PK-V1',
      'FC-PK-V2',
      'FC-RM-V1',
      'FC-RM-V2'
    ]);
    const pk2 = /** @type {import('../types').ForecastVersionView} */ (
      all.find((v) => v.publicationId === 'FC-PK-V2')
    );
    expect(pk2.suppliers.map((s) => [s.supplierId, s.viewedAt])).toEqual([
      ['sup-007', null],
      ['sup-012', null]
    ]);
    const mine = (await reads.getForecastVersions(sup007)).items;
    expect(mine.map((v) => v.stream)).toEqual(['packaging', 'packaging']);
    expect(
      mine.every((v) => v.suppliers.length === 1 && v.suppliers[0].supplierId === 'sup-007')
    ).toBe(true);
  });

  it('BR-07 / AC-04 — a supplier reads only its own materials', async () => {
    const mine = await linesFor(sup007);
    expect(mine.length).toBeGreaterThan(0);
    expect(new Set(mine.map((l) => l.supplierId))).toEqual(new Set(['sup-007']));
    expect(mine.some((l) => l.materialCode === 'RM-STEAR-7300')).toBe(false);
    expect((await reads.getForecastCoverage(sup007)).items).toEqual([]);
  });

  it('opening a version records the view once; the first time stands', async () => {
    const record = () =>
      svc.dispatch(sup007, {
        transitionId: 't_forecastview_record',
        entity: 'forecastView',
        payload: { publicationId: 'FC-PK-V2', supplierId: 'sup-007' }
      });
    const first = await record();
    expect(first.status).toBe('done');
    sdcClock.set('2026-09-01T03:00:00.000Z');
    const second = await record();
    expect(second.entityId).toBe(first.entityId);
    const pk2 = /** @type {import('../types').ForecastVersionView} */ (
      (await reads.getForecastVersions(buyer)).items.find((v) => v.publicationId === 'FC-PK-V2')
    );
    expect(
      /** @type {NonNullable<ReturnType<typeof pk2.suppliers.find>>} */ (
        pk2.suppliers.find((s) => s.supplierId === 'sup-007')
      ).viewedAt
    ).toBe('2026-08-31T12:00:00.000Z');
  });

  it('known-bad: a supplier cannot record a view of a version without its lines', async () => {
    await expect(
      svc.dispatch(sup002, {
        transitionId: 't_forecastview_record',
        entity: 'forecastView',
        payload: { publicationId: 'FC-PK-V2', supplierId: 'sup-002' }
      })
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });

  it('re-publish (and emergency re-publish) adds a version; earlier versions are kept', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_forecastversion_publish',
      entity: 'forecastVersion',
      payload: { stream: 'packaging' }
    });
    expect(res).toMatchObject({ status: 'done', entityId: 'FC-PK-V3' });
    const emergency = await svc.dispatch(buyer, {
      transitionId: 't_forecastversion_publish',
      entity: 'forecastVersion',
      payload: { stream: 'rawMaterial', emergency: true }
    });
    expect(
      forecastVersionStore.get(
        /** @type {NonNullable<typeof emergency.entityId>} */ (emergency.entityId)
      )
    ).toMatchObject({ version: 3, emergency: true });
    expect(forecastVersionStore.all()).toHaveLength(6);
    const bad = await svc.dispatch(buyer, {
      transitionId: 't_forecastversion_publish',
      entity: 'forecastVersion',
      payload: { stream: 'chemicals' }
    });
    expect(bad.reason).toMatch(/UNKNOWN_STREAM/);
  });

  it('after re-publication: unchanged commitments stand, and deadlines restart from the new version', async () => {
    const before = await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[1]);
    expect(before).toMatchObject({ state: 'accepted', version: 2 });
    await svc.dispatch(buyer, {
      transitionId: 't_forecastversion_publish',
      entity: 'forecastVersion',
      payload: { stream: 'packaging' }
    });
    const after = await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[1]);
    expect(after).toMatchObject({
      version: 3,
      state: 'accepted',
      carriedForward: true,
      forecastQty: before.forecastQty
    });
    // The supplier has a new version to open.
    const v3 = /** @type {import('../types').ForecastVersionView} */ (
      (await reads.getForecastVersions(sup007)).items.find((v) => v.isCurrent)
    );
    expect(v3.suppliers[0].viewedAt).toBeNull();
  });
});

describe('REQ-E06-02 — commitment through the verb', () => {
  // PEX-D22 — the commitment tests below run on sup-007's awaiting Zone
  // Liability week (8802, W[0]); they used the Trade-off week W[6], which now
  // takes an acknowledgement only (probed in BR-08 below).
  it('BR-09 / BR-10 — a submitted commitment lands as a draft (hidden from PTI) and counts once promoted', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[0]);
    expect(l).toMatchObject({ zone: 'firm', state: 'awaiting' });
    const created = await submit(sup007, commitPayload(l, l.forecastQty));
    expect(created.status).toBe('done');
    expect((await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[0])).state).toBe('awaiting');
    expect((await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[0])).draft?.id).toBe(
      created.entityId
    );
    expect(
      (
        await promote(
          sup007,
          /** @type {NonNullable<typeof created.entityId>} */ (created.entityId)
        )
      ).status
    ).toBe('done');
    expect(await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[0])).toMatchObject({
      state: 'accepted',
      committedQty: l.forecastQty,
      draft: null
    });
  });

  it('known-bad: below forecast without a reason is refused BY THE VERB; "other" needs a note', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[0]);
    const before = requirementResponseStore.all().length;
    const none = await submit(sup007, commitPayload(l, l.forecastQty - 1));
    expect(none.status).toBe('failed');
    expect(none.reason).toMatch(/rr_submit_shortfall_reason.*BELOW_FORECAST_NEEDS_REASON/);
    const unknown = await submit(
      sup007,
      commitPayload(l, 100, { rootCause: { level1: 'weather' } })
    );
    expect(unknown.reason).toMatch(/BELOW_FORECAST_NEEDS_REASON/);
    const other = await submit(sup007, commitPayload(l, 100, { rootCause: { level1: 'other' } }));
    expect(other.reason).toMatch(/OTHER_REASON_NEEDS_NOTE/);
    expect(requirementResponseStore.all()).toHaveLength(before);
  });

  // PEX-D22 changed this case: it pinned "exactly 10% below in Trade-off is
  // accepted". Zone Capacity periods take no commitment now, and Zone
  // Liability's tolerance is none (CR-21), so the boundary is the forecast itself.
  it('known-good: below forecast with a starter reason, date and upside is stored; tolerance decides the state', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[0]);
    expect(l.forecastQty).toBe(42400);
    // One unit short in Zone Liability, with a reason: stored, and an exception for the planner.
    const outside = await submit(
      sup007,
      commitPayload(l, l.forecastQty - 1, { rootCause: { level1: 'capacity' }, upsideQty: 2000 })
    );
    await promote(sup007, /** @type {NonNullable<typeof outside.entityId>} */ (outside.entityId));
    const stored = /** @type {import('../../sdc/types').RequirementResponse} */ (
      requirementResponseStore.get(
        /** @type {NonNullable<typeof outside.entityId>} */ (outside.entityId)
      )
    );
    expect(stored.forecastConfirmation).toMatchObject({
      confirmedQty: 42399,
      upsideQty: 2000,
      committedDate: l.periodStart
    });
    expect(stored.rootCause).toEqual({ level1: 'capacity' });
    expect((await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[0])).state).toBe('exception');
    // Exactly the forecast: accepted without planner action.
    const within = await submit(sup007, commitPayload(l, l.forecastQty));
    await promote(sup007, /** @type {NonNullable<typeof within.entityId>} */ (within.entityId));
    expect((await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[0])).state).toBe('accepted');
  });

  it('CAP-6 AC-01 / BR-02 — a forecast-version commitment with a quantity only is stored with the period start as its date', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[0]);
    const noDate = await submit(sup007, {
      ...commitPayload(l, l.forecastQty),
      committedDate: undefined
    });
    expect(noDate.status).toBe('done');
    const stored = /** @type {import('../../sdc/types').RequirementResponse} */ (
      requirementResponseStore.get(/** @type {string} */ (noDate.entityId))
    );
    expect(stored.forecastConfirmation).toMatchObject({
      confirmedQty: l.forecastQty,
      committedDate: l.periodStart
    });
    expect(l.periodStart).toBe(W[0]);
  });

  it('known-bad: a date, when one is sent, must be a calendar day; upside must be zero or more', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[0]);
    const badDate = await submit(sup007, {
      ...commitPayload(l, l.forecastQty),
      committedDate: '14/09/2026'
    });
    expect(badDate.reason).toMatch(/committedDate must be a date/);
    const badUpside = await submit(sup007, commitPayload(l, l.forecastQty, { upsideQty: -5 }));
    expect(badUpside.reason).toMatch(/upsideQty/);
  });

  // PEX-D22 (owner, 2026-11-05) widened BR-08 to every Zone Capacity period:
  // a Trade-off week (W[6]) now behaves as a Forecast week (W[9]) does.
  it('BR-08 / PEX-D22 — a Zone Capacity period (Forecast or Trade-off) takes an acknowledgement, never a commitment', async () => {
    for (const [week, zone] of /** @type {const} */ ([
      [W[9], 'forecast'],
      [W[6], 'tradeOff']
    ])) {
      const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', week);
      expect(l.zone).toBe(zone);
      const commit = await submit(sup007, commitPayload(l, l.forecastQty));
      expect(commit.status).toBe('failed');
      expect(commit.reason).toMatch(/line is Zone Capacity/);
      const ack = await svc.dispatch(sup007, {
        transitionId: 't_requirementresponse_acknowledge',
        entity: 'requirementResponse',
        payload: {
          publicationId: l.publicationId,
          planVersion: l.planVersion,
          supplierId: 'sup-007',
          materialCode: l.materialCode,
          periodBucket: l.periodBucket
        }
      });
      expect(ack.status).toBe('done');
      expect((await lineOf(buyer, 'sup-007', 'PK-PETB-8802', week)).state).toBe('acknowledged');
      // Stored as an acknowledgement, never a confirmation (invariant #11).
      const stored = /** @type {import('../../sdc/types').RequirementResponse} */ (
        requirementResponseStore.get(/** @type {string} */ (ack.entityId))
      );
      expect(stored.acknowledgment).toEqual({});
      expect(stored.forecastConfirmation).toBeUndefined();
    }
    // Known-good beside it: a Zone Liability week takes the commitment, not an acknowledgement.
    const firm = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[0]);
    expect((await submit(sup007, commitPayload(firm, firm.forecastQty))).status).toBe('done');
    const ackFirm = await svc.dispatch(sup007, {
      transitionId: 't_requirementresponse_acknowledge',
      entity: 'requirementResponse',
      payload: {
        publicationId: firm.publicationId,
        planVersion: firm.planVersion,
        supplierId: 'sup-007',
        materialCode: firm.materialCode,
        periodBucket: firm.periodBucket
      }
    });
    expect(ackFirm.status).toBe('failed');
    expect(ackFirm.reason).toMatch(/line is Zone Liability/);
  });

  it('a supplier cannot commit against another supplier’s line', async () => {
    // sup-007 alone supplies PK-PETB-8802: sup-002 has no such line to answer.
    const l = await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[1]);
    await expect(
      submit(sup002, { ...commitPayload(l, l.forecastQty), supplierId: 'sup-002' })
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    // …and cannot answer as sup-007 either.
    await expect(submit(sup002, commitPayload(l, l.forecastQty))).rejects.toMatchObject({
      code: 'SCOPE_DENIED'
    });
    // Known-good on the same line: its own supplier can.
    expect((await submit(sup007, commitPayload(l, l.forecastQty))).status).toBe('done');
  });

  it('the SDC-0 response read is unchanged: forecast-version commitments are not in it', async () => {
    const legacy = (await collab.getOwnRequirementResponses(sup002)).items;
    expect(legacy.every((r) => r.publicationId.startsWith('PUB-'))).toBe(true);
  });
});

describe('REQ-E06-03 — planner actions on exceptions', () => {
  /** @param {string} id */
  const review = (id) =>
    svc.dispatch(buyer, {
      transitionId: 't_requirementresponse_review',
      entity: 'requirementResponse',
      entityId: id,
      payload: {}
    });

  it('accept: the exception becomes accepted by PTI and leaves the exception list', async () => {
    const l = await lineOf(buyer, 'sup-002', 'RM-STEAR-7300', M[0]);
    expect(l).toMatchObject({ zone: 'firm', state: 'exception', committedQty: 10000 });
    await review(/** @type {import('../../sdc/types').RequirementResponse} */ (l.response).id);
    const res = await svc.dispatch(buyer, {
      transitionId: 't_requirementresponse_accept',
      entity: 'requirementResponse',
      entityId: /** @type {import('../../sdc/types').RequirementResponse} */ (l.response).id,
      payload: {}
    });
    expect(res.status).toBe('done');
    expect((await lineOf(sup002, 'sup-002', 'RM-STEAR-7300', M[0])).state).toBe(
      'acceptedByPlanner'
    );
  });

  // PEX-D22 — on sup-007's Zone Liability exception (8801, W[1]: 31 000
  // against 34 300); it used the Trade-off week 8802 W[3], now acknowledged.
  it('request revision: the note is required, kept in the log, and the supplier reads it', async () => {
    const l = await lineOf(buyer, 'sup-007', 'PK-PETB-8801', W[1]);
    expect(l).toMatchObject({ zone: 'firm', state: 'exception' });
    await review(/** @type {import('../../sdc/types').RequirementResponse} */ (l.response).id);
    const blank = await svc.dispatch(buyer, {
      transitionId: 't_requirementresponse_dispute',
      entity: 'requirementResponse',
      entityId: /** @type {import('../../sdc/types').RequirementResponse} */ (l.response).id,
      payload: { disputeReason: '  ' }
    });
    expect(blank.status).toBe('failed');
    await svc.dispatch(buyer, {
      transitionId: 't_requirementresponse_dispute',
      entity: 'requirementResponse',
      entityId: /** @type {import('../../sdc/types').RequirementResponse} */ (l.response).id,
      payload: { disputeReason: 'Launch week: please find 5 000 more' }
    });
    const seen = await lineOf(sup007, 'sup-007', 'PK-PETB-8801', W[1]);
    expect(seen.state).toBe('revisionRequested');
    expect(seen.log.map((e) => e.text)).toEqual(['Launch week: please find 5 000 more']);
    // The supplier revises: a new submission replaces the standing one, and the log stays.
    // W[1] is the week rigid plastics' LTP is above BE (ENG-D19), so the
    // submission carries a reason even at the full forecast.
    const revised = await submit(
      sup007,
      commitPayload(seen, seen.forecastQty, { rootCause: { level1: 'capacity' } })
    );
    expect(
      (
        await promote(
          sup007,
          /** @type {NonNullable<typeof revised.entityId>} */ (revised.entityId)
        )
      ).status
    ).toBe('done');
    const after = await lineOf(buyer, 'sup-007', 'PK-PETB-8801', W[1]);
    expect(after.state).toBe('accepted');
    expect(after.log).toHaveLength(1);
  });

  it('reassign: moves the shortfall to a qualified supplier in a new version, with the note; the commitment left behind now covers the line', async () => {
    const l = await lineOf(buyer, 'sup-002', 'RM-STEAR-7300', M[0]);
    // Control: the fixture premise — 12 600 kg forecast, 10 000 committed, an exception.
    expect([l.forecastQty, l.committedQty, l.state]).toEqual([12600, 10000, 'exception']);
    const res = await svc.dispatch(buyer, {
      transitionId: 't_forecastversion_reassign',
      entity: 'forecastVersion',
      payload: {
        publicationId: l.publicationId,
        materialCode: l.materialCode,
        periodBucket: l.periodBucket,
        fromSupplierId: 'sup-002',
        allocations: [{ supplierId: 'sup-001', qty: 2600 }],
        note: 'Second source covers September'
      }
    });
    expect(res).toMatchObject({ status: 'done', entityId: 'FC-RM-V3' });
    const moved = (await linesFor(buyer))
      .filter((x) => x.materialCode === 'RM-STEAR-7300' && x.periodBucket === M[0])
      .sort((a, b) => a.supplierId.localeCompare(b.supplierId));
    expect(moved.map((x) => [x.supplierId, x.forecastQty, x.version, x.state])).toEqual([
      ['sup-001', 2600, 3, 'awaiting'],
      ['sup-002', 10000, 3, 'accepted']
    ]);
    expect((await linesFor(supplier('sup-001'))).map((x) => x.periodBucket)).toEqual([M[0]]);
    expect(
      /** @type {import('../types').ForecastVersionView} */ (
        (await reads.getForecastVersions(buyer)).items.find((v) => v.publicationId === 'FC-RM-V3')
      ).changeNote
    ).toBe('Second source covers September');
  });

  it('known-bad reassign: no note, an unqualified supplier, the same supplier, an old version, or the retired single-target payload', async () => {
    const l = await lineOf(buyer, 'sup-002', 'RM-STEAR-7300', M[0]);
    const base = {
      publicationId: l.publicationId,
      materialCode: l.materialCode,
      periodBucket: l.periodBucket,
      fromSupplierId: 'sup-002',
      allocations: [{ supplierId: 'sup-001', qty: 100 }],
      note: 'x'
    };
    /** @param {string} supplierId */
    const to = (supplierId) => ({ ...base, allocations: [{ supplierId, qty: 100 }] });
    /** @param {Record<string, unknown>} payload */
    const go = (payload) =>
      svc.dispatch(buyer, {
        transitionId: 't_forecastversion_reassign',
        entity: 'forecastVersion',
        payload
      });
    expect((await go({ ...base, note: '   ' })).reason).toMatch(/NOTE_REQUIRED/);
    expect((await go(to('sup-007'))).reason).toMatch(/NOT_QUALIFIED/);
    expect((await go(to('sup-002'))).reason).toMatch(/SAME_SUPPLIER/);
    expect((await go({ ...base, publicationId: 'FC-RM-V1' })).reason).toMatch(
      /NOT_CURRENT_VERSION/
    );
    // CAP-8 — every caller sends allocations; the single-target shape is refused by name.
    const { allocations: _a, ...single } = base;
    const legacy = await go({ ...single, toSupplierId: 'sup-001' });
    expect(legacy).toMatchObject({ status: 'failed' });
    expect(legacy.reason).toMatch(/allocations/);
    expect(forecastVersionStore.all()).toHaveLength(4);
  });
});

describe('REQ-E06-03 BR-06 and REQ-E08-05 — reminders, escalation and the alert, derived at read', () => {
  it('at the declared present: overdue Firm periods escalate; awaiting Trade-off and Forecast periods are due soon', async () => {
    const now = sdcClock.now();
    const lines = await linesFor(buyer);
    const overdue = lines
      .filter((l) => deadlineState(l, now) === 'overdue')
      .map((l) => `${l.supplierId}|${l.materialCode}|${l.periodBucket}`);
    expect(overdue.sort()).toEqual([
      `sup-007|PK-PETB-8802|${W[0]}`,
      `sup-012|PK-PETB-8801|${W[0]}`,
      `sup-012|PK-PETB-8801|${W[1]}`,
      `sup-012|PK-PETB-8801|${W[2]}`
    ]);
    // ⚠️ PREMISE CHANGED BY BL-48 (CR-26). Under the retired 7-calendar-day rule
    // packaging version 2's Trade-off reminder fell AFTER the present, so sup-007
    // had nothing due soon and this read `toEqual([])`. At 3 working days the
    // deadline is days earlier and its reminder (half of it) is already past, so
    // sup-007's awaiting Trade-off and Forecast periods ARE due soon now — and
    // never a Firm one, which are overdue instead.
    const dueSoon007 = (await linesFor(sup007)).filter((l) => deadlineState(l, now) === 'dueSoon');
    expect(dueSoon007.map((l) => `${l.materialCode}|${l.periodBucket}`)).toContain(
      `PK-PETB-8801|${W[3]}`
    );
    expect(dueSoon007.filter((l) => l.zone === 'firm')).toEqual([]);
    // ⚠️ PREMISE CHANGED BY THE BL-48 DEMO DATA: raw-material v2 used to be
    // published four days ago and sup-002's changed Trade-off month was due
    // soon here. It is now published THIS MORNING, so nothing of sup-002's is
    // due soon yet: its awaiting Trade-off month is open, due Monday 7 September
    // 10:00 WIB — the date the administrator's Friday ruling moved it to.
    const lines002 = await linesFor(sup002);
    expect(lines002.filter((l) => deadlineState(l, now) === 'dueSoon')).toEqual([]);
    const emul = /** @type {ForecastCommitmentLine} */ (
      lines002.find((l) => l.materialCode === 'RM-EMUL-9410' && l.periodBucket === M[1])
    );
    expect(emul).toMatchObject({
      zone: 'tradeOff',
      state: 'awaiting',
      dueAt: '2026-09-07T03:00:00.000Z'
    });
    expect(deadlineState(emul, now)).toBe('open');
    // Both sides of the reminder instant: one millisecond before it no Trade-off
    // week of sup-007 is due soon; from it on, they are.
    const reminder = dueSoon007[0].reminderAt;
    /** @param {string} at */
    const tradeOffDueSoon = async (at) => {
      sdcClock.set(at);
      return (await linesFor(sup007)).filter(
        (l) => l.zone === 'tradeOff' && deadlineState(l, at) === 'dueSoon'
      ).length;
    };
    expect(await tradeOffDueSoon(new Date(Date.parse(reminder) - 1).toISOString())).toBe(0);
    expect(await tradeOffDueSoon(reminder)).toBeGreaterThan(0);
  });

  // PEX-D22 removed this case's Medium half: sup-007's 8802 answers below
  // forecast sit in Trade-off weeks (W[2], W[3]), which are acknowledgements
  // now, so they raise nothing. Only Zone Liability shortfalls alert, High.
  it('the alert engine raises "committed below forecast beyond tolerance": High for Firm; a Zone Capacity answer raises none', async () => {
    const alerts = (await reads.getInventoryAlerts(buyer)).items.filter(
      (a) => a.rule === 'commitmentBelowForecast'
    );
    expect(alerts.map((a) => [a.key, a.riskClass]).sort()).toEqual([
      ['commitmentBelowForecast|PK-PETB-8801|sup-007', 'high'],
      ['commitmentBelowForecast|RM-STEAR-7300|sup-002', 'high']
    ]);
    // The control: the Trade-off answers below forecast are on the sample data, acknowledged.
    const short8802 = (await linesFor(buyer)).filter(
      (l) =>
        l.materialCode === 'PK-PETB-8802' &&
        l.response?.forecastConfirmation &&
        l.response.forecastConfirmation.confirmedQty < l.forecastQty
    );
    expect(short8802.map((l) => [l.periodBucket, l.zone, l.state])).toEqual([
      [W[2], 'tradeOff', 'acknowledged'],
      [W[3], 'tradeOff', 'acknowledged']
    ]);
    // A supplier sees its own.
    const mine = (await reads.getInventoryAlerts(sup002)).items.filter(
      (a) => a.rule === 'commitmentBelowForecast'
    );
    expect(mine.map((a) => a.subject)).toEqual(['RM-STEAR-7300']);
    // Accepting the exception clears the condition.
    const l = await lineOf(buyer, 'sup-002', 'RM-STEAR-7300', M[0]);
    await svc.dispatch(buyer, {
      transitionId: 't_requirementresponse_review',
      entity: 'requirementResponse',
      entityId: /** @type {import('../../sdc/types').RequirementResponse} */ (l.response).id,
      payload: {}
    });
    await svc.dispatch(buyer, {
      transitionId: 't_requirementresponse_accept',
      entity: 'requirementResponse',
      entityId: /** @type {import('../../sdc/types').RequirementResponse} */ (l.response).id,
      payload: {}
    });
    expect(
      (await reads.getInventoryAlerts(buyer)).items.some(
        (a) => a.key === 'commitmentBelowForecast|RM-STEAR-7300|sup-002'
      )
    ).toBe(false);
  });

  it('sup-012 has not opened its version and is not a supplier that can open another’s', async () => {
    const v = /** @type {import('../types').ForecastVersionView} */ (
      (await reads.getForecastVersions(sup012)).items.find((x) => x.isCurrent)
    );
    expect(v.suppliers).toEqual([
      {
        supplierId: 'sup-012',
        supplierName: 'Sample PET Bottle Manufacturer GmbH',
        viewedAt: null,
        changedPeriods: v.suppliers[0].changedPeriods
      }
    ]);
  });
});
