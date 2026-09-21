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
import type { ForecastCommitmentLine, QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { getTransition } from '../../transitions';
import { deadlineState } from '../../transitions/forecastRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '../../../context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();
const collab = new MockCollaborationService();

const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
const sup007 = supplier('sup-007');
const sup002 = supplier('sup-002');
const sup012 = supplier('sup-012');
const buyer: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer, actor: NO_PERSON };

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

const W = SEEDED_PACKAGING_WEEKS;
const M = SEEDED_RAW_MATERIAL_MONTHS;

const linesFor = async (scope: QueryScope) => (await reads.getForecastCommitments(scope)).items;
const lineOf = async (scope: QueryScope, supplierId: string, materialCode: string, period: string) =>
  (await linesFor(scope)).find((l) => l.supplierId === supplierId && l.materialCode === materialCode && l.periodBucket === period)!;

const commitPayload = (l: ForecastCommitmentLine, qty: number, extra: Record<string, unknown> = {}) => ({
  publicationId: l.publicationId,
  planVersion: l.planVersion,
  supplierId: l.supplierId,
  materialCode: l.materialCode,
  periodBucket: l.periodBucket,
  confirmedQty: qty,
  confirmedQtyRaw: String(qty),
  committedDate: l.periodStart,
  ...extra,
});
const submit = (scope: QueryScope, payload: Record<string, unknown>) =>
  svc.dispatch(scope, { transitionId: 't_requirementresponse_submit', entity: 'requirementResponse', payload });
const promote = (scope: QueryScope, id: string) =>
  svc.dispatch(scope, { transitionId: 't_requirementresponse_promote', entity: 'requirementResponse', entityId: id, payload: {} });

describe('roles (bilateral): the planner publishes and moves demand; the supplier opens and commits', () => {
  it('each new atom sits in exactly one lane on the right side', () => {
    expect(rolesHolding('forecast:publish')).toEqual(['planning']);
    expect(rolesHolding('forecast:view')).toEqual(['commercial']);
    expect(getTransition('t_requirementresponse_submit')!.policyHooks).toEqual(
      expect.arrayContaining(['rr_submit_shortfall_reason', 'rr_submit_commitment_detail']),
    );
  });

  it('a supplier cannot publish; PTI cannot record a supplier view', async () => {
    await expect(
      svc.dispatch(sup007, { transitionId: 't_forecastversion_publish', entity: 'forecastVersion', payload: { stream: 'packaging' } }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    const res = await svc.dispatch(buyer, {
      transitionId: 't_forecastview_record',
      entity: 'forecastView',
      payload: { publicationId: 'FC-PK-V2', supplierId: 'sup-007' },
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

describe('REQ-E06-01 — versions, scoping and views', () => {
  it('PTI reads every version with who viewed it; a supplier reads only versions with its lines, and only itself', async () => {
    const all = (await reads.getForecastVersions(buyer)).items;
    expect(all.map((v) => v.publicationId).sort()).toEqual(['FC-PK-V1', 'FC-PK-V2', 'FC-RM-V1', 'FC-RM-V2']);
    const pk2 = all.find((v) => v.publicationId === 'FC-PK-V2')!;
    expect(pk2.suppliers.map((s) => [s.supplierId, s.viewedAt])).toEqual([['sup-007', null], ['sup-012', null]]);
    const mine = (await reads.getForecastVersions(sup007)).items;
    expect(mine.map((v) => v.stream)).toEqual(['packaging', 'packaging']);
    expect(mine.every((v) => v.suppliers.length === 1 && v.suppliers[0].supplierId === 'sup-007')).toBe(true);
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
      svc.dispatch(sup007, { transitionId: 't_forecastview_record', entity: 'forecastView', payload: { publicationId: 'FC-PK-V2', supplierId: 'sup-007' } });
    const first = await record();
    expect(first.status).toBe('done');
    sdcClock.set('2026-09-01T03:00:00.000Z');
    const second = await record();
    expect(second.entityId).toBe(first.entityId);
    const pk2 = (await reads.getForecastVersions(buyer)).items.find((v) => v.publicationId === 'FC-PK-V2')!;
    expect(pk2.suppliers.find((s) => s.supplierId === 'sup-007')!.viewedAt).toBe('2026-08-31T12:00:00.000Z');
  });

  it('known-bad: a supplier cannot record a view of a version without its lines', async () => {
    await expect(
      svc.dispatch(sup002, { transitionId: 't_forecastview_record', entity: 'forecastView', payload: { publicationId: 'FC-PK-V2', supplierId: 'sup-002' } }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });

  it('re-publish (and emergency re-publish) adds a version; earlier versions are kept', async () => {
    const res = await svc.dispatch(buyer, { transitionId: 't_forecastversion_publish', entity: 'forecastVersion', payload: { stream: 'packaging' } });
    expect(res).toMatchObject({ status: 'done', entityId: 'FC-PK-V3' });
    const emergency = await svc.dispatch(buyer, {
      transitionId: 't_forecastversion_publish',
      entity: 'forecastVersion',
      payload: { stream: 'rawMaterial', emergency: true },
    });
    expect(forecastVersionStore.get(emergency.entityId!)).toMatchObject({ version: 3, emergency: true });
    expect(forecastVersionStore.all()).toHaveLength(6);
    const bad = await svc.dispatch(buyer, { transitionId: 't_forecastversion_publish', entity: 'forecastVersion', payload: { stream: 'chemicals' } });
    expect(bad.reason).toMatch(/UNKNOWN_STREAM/);
  });

  it('after re-publication: unchanged commitments stand, and deadlines restart from the new version', async () => {
    const before = await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[1]);
    expect(before).toMatchObject({ state: 'accepted', version: 2 });
    await svc.dispatch(buyer, { transitionId: 't_forecastversion_publish', entity: 'forecastVersion', payload: { stream: 'packaging' } });
    const after = await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[1]);
    expect(after).toMatchObject({ version: 3, state: 'accepted', carriedForward: true, forecastQty: before.forecastQty });
    // The supplier has a new version to open.
    const v3 = (await reads.getForecastVersions(sup007)).items.find((v) => v.isCurrent)!;
    expect(v3.suppliers[0].viewedAt).toBeNull();
  });
});

describe('REQ-E06-02 — commitment through the verb', () => {
  it('BR-09 / BR-10 — a submitted commitment lands as a draft (hidden from PTI) and counts once promoted', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[6]);
    expect(l).toMatchObject({ zone: 'tradeOff', state: 'awaiting' });
    const created = await submit(sup007, commitPayload(l, l.forecastQty));
    expect(created.status).toBe('done');
    expect((await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[6])).state).toBe('awaiting');
    expect((await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[6])).draft?.id).toBe(created.entityId);
    expect((await promote(sup007, created.entityId!)).status).toBe('done');
    expect(await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[6])).toMatchObject({ state: 'accepted', committedQty: l.forecastQty, draft: null });
  });

  it('known-bad: below forecast without a reason is refused BY THE VERB; "other" needs a note', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[6]);
    const before = requirementResponseStore.all().length;
    const none = await submit(sup007, commitPayload(l, l.forecastQty - 1));
    expect(none.status).toBe('failed');
    expect(none.reason).toMatch(/rr_submit_shortfall_reason.*BELOW_FORECAST_NEEDS_REASON/);
    const unknown = await submit(sup007, commitPayload(l, 100, { rootCause: { level1: 'weather' } }));
    expect(unknown.reason).toMatch(/BELOW_FORECAST_NEEDS_REASON/);
    const other = await submit(sup007, commitPayload(l, 100, { rootCause: { level1: 'other' } }));
    expect(other.reason).toMatch(/OTHER_REASON_NEEDS_NOTE/);
    expect(requirementResponseStore.all()).toHaveLength(before);
  });

  it('known-good: below forecast with a starter reason, date and upside is stored; tolerance decides the state', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[6]);
    // Exactly 10% below in Trade-off: accepted without planner action.
    const within = await submit(sup007, commitPayload(l, l.forecastQty * 0.9, { rootCause: { level1: 'capacity' }, upsideQty: 2000 }));
    await promote(sup007, within.entityId!);
    const stored = requirementResponseStore.get(within.entityId!)!;
    expect(stored.forecastConfirmation).toMatchObject({ confirmedQty: 34650, upsideQty: 2000, committedDate: l.periodStart });
    expect(stored.rootCause).toEqual({ level1: 'capacity' });
    expect((await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[6])).state).toBe('accepted');
    // One unit more short: an exception for the planner.
    const outside = await submit(sup007, commitPayload(l, 34649, { rootCause: { level1: 'other', note: 'Resin allocation' } }));
    await promote(sup007, outside.entityId!);
    expect((await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[6])).state).toBe('exception');
  });

  it('known-bad: a forecast-version commitment needs its date; upside must be zero or more', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[6]);
    const noDate = await submit(sup007, { ...commitPayload(l, l.forecastQty), committedDate: undefined });
    expect(noDate.reason).toMatch(/COMMITMENT_DATE_REQUIRED/);
    const badUpside = await submit(sup007, commitPayload(l, l.forecastQty, { upsideQty: -5 }));
    expect(badUpside.reason).toMatch(/upsideQty/);
  });

  it('BR-08 — a Forecast period takes an acknowledgement, never a commitment', async () => {
    const l = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[9]);
    expect(l.zone).toBe('forecast');
    const commit = await submit(sup007, commitPayload(l, l.forecastQty));
    expect(commit.reason).toMatch(/visibility-only/);
    const ack = await svc.dispatch(sup007, {
      transitionId: 't_requirementresponse_acknowledge',
      entity: 'requirementResponse',
      payload: { publicationId: l.publicationId, planVersion: l.planVersion, supplierId: 'sup-007', materialCode: l.materialCode, periodBucket: l.periodBucket },
    });
    expect(ack.status).toBe('done');
    expect((await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[9])).state).toBe('acknowledged');
  });

  it('a supplier cannot commit against another supplier’s line', async () => {
    // sup-007 alone supplies PK-PETB-8802: sup-002 has no such line to answer.
    const l = await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[1]);
    await expect(submit(sup002, { ...commitPayload(l, l.forecastQty), supplierId: 'sup-002' })).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    // …and cannot answer as sup-007 either.
    await expect(submit(sup002, commitPayload(l, l.forecastQty))).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    // Known-good on the same line: its own supplier can.
    expect((await submit(sup007, commitPayload(l, l.forecastQty))).status).toBe('done');
  });

  it('the SDC-0 response read is unchanged: forecast-version commitments are not in it', async () => {
    const legacy = (await collab.getOwnRequirementResponses(sup002)).items;
    expect(legacy.every((r) => r.publicationId.startsWith('PUB-'))).toBe(true);
  });
});

describe('REQ-E06-03 — planner actions on exceptions', () => {
  const review = (id: string) =>
    svc.dispatch(buyer, { transitionId: 't_requirementresponse_review', entity: 'requirementResponse', entityId: id, payload: {} });

  it('accept: the exception becomes accepted by PTI and leaves the exception list', async () => {
    const l = await lineOf(buyer, 'sup-002', 'RM-STEAR-7300', M[0]);
    expect(l).toMatchObject({ zone: 'firm', state: 'exception', committedQty: 10000 });
    await review(l.response!.id);
    const res = await svc.dispatch(buyer, { transitionId: 't_requirementresponse_accept', entity: 'requirementResponse', entityId: l.response!.id, payload: {} });
    expect(res.status).toBe('done');
    expect((await lineOf(sup002, 'sup-002', 'RM-STEAR-7300', M[0])).state).toBe('acceptedByPlanner');
  });

  it('request revision: the note is required, kept in the log, and the supplier reads it', async () => {
    const l = await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[3]);
    expect(l.state).toBe('exception');
    await review(l.response!.id);
    const blank = await svc.dispatch(buyer, {
      transitionId: 't_requirementresponse_dispute', entity: 'requirementResponse', entityId: l.response!.id, payload: { disputeReason: '  ' },
    });
    expect(blank.status).toBe('failed');
    await svc.dispatch(buyer, {
      transitionId: 't_requirementresponse_dispute', entity: 'requirementResponse', entityId: l.response!.id,
      payload: { disputeReason: 'Launch week: please find 5 000 more' },
    });
    const seen = await lineOf(sup007, 'sup-007', 'PK-PETB-8802', W[3]);
    expect(seen.state).toBe('revisionRequested');
    expect(seen.log.map((e) => e.text)).toEqual(['Launch week: please find 5 000 more']);
    // The supplier revises: a new submission replaces the standing one, and the log stays.
    const revised = await submit(sup007, commitPayload(seen, seen.forecastQty));
    await promote(sup007, revised.entityId!);
    const after = await lineOf(buyer, 'sup-007', 'PK-PETB-8802', W[3]);
    expect(after.state).toBe('accepted');
    expect(after.log).toHaveLength(1);
  });

  it('reassign: moves the period quantity to a qualified supplier in a new version, with the note', async () => {
    const l = await lineOf(buyer, 'sup-002', 'RM-STEAR-7300', M[0]);
    const res = await svc.dispatch(buyer, {
      transitionId: 't_forecastversion_reassign',
      entity: 'forecastVersion',
      payload: { publicationId: l.publicationId, materialCode: l.materialCode, periodBucket: l.periodBucket, fromSupplierId: 'sup-002', toSupplierId: 'sup-001', note: 'Second source covers September' },
    });
    expect(res).toMatchObject({ status: 'done', entityId: 'FC-RM-V3' });
    const moved = (await linesFor(buyer)).filter((x) => x.materialCode === 'RM-STEAR-7300' && x.periodBucket === M[0]);
    expect(moved.map((x) => [x.supplierId, x.forecastQty, x.version, x.state])).toEqual([['sup-001', l.forecastQty, 3, 'awaiting']]);
    expect((await linesFor(supplier('sup-001'))).map((x) => x.periodBucket)).toEqual([M[0]]);
    expect((await reads.getForecastVersions(buyer)).items.find((v) => v.publicationId === 'FC-RM-V3')!.changeNote).toBe('Second source covers September');
  });

  it('known-bad reassign: no note, an unqualified supplier, the same supplier, or an old version', async () => {
    const l = await lineOf(buyer, 'sup-002', 'RM-STEAR-7300', M[0]);
    const base = { publicationId: l.publicationId, materialCode: l.materialCode, periodBucket: l.periodBucket, fromSupplierId: 'sup-002', toSupplierId: 'sup-001', note: 'x' };
    const go = (payload: Record<string, unknown>) =>
      svc.dispatch(buyer, { transitionId: 't_forecastversion_reassign', entity: 'forecastVersion', payload });
    expect((await go({ ...base, note: '   ' })).reason).toMatch(/NOTE_REQUIRED/);
    expect((await go({ ...base, toSupplierId: 'sup-007' })).reason).toMatch(/NOT_QUALIFIED/);
    expect((await go({ ...base, toSupplierId: 'sup-002' })).reason).toMatch(/SAME_SUPPLIER/);
    expect((await go({ ...base, publicationId: 'FC-RM-V1' })).reason).toMatch(/NOT_CURRENT_VERSION/);
    expect(forecastVersionStore.all()).toHaveLength(4);
  });
});

describe('REQ-E06-03 BR-06 and REQ-E08-05 — reminders, escalation and the alert, derived at read', () => {
  it('at the declared present: overdue Firm periods escalate; awaiting Trade-off and Forecast periods are due soon', async () => {
    const now = sdcClock.now();
    const lines = await linesFor(buyer);
    const overdue = lines.filter((l) => deadlineState(l, now) === 'overdue').map((l) => `${l.supplierId}|${l.materialCode}|${l.periodBucket}`);
    expect(overdue.sort()).toEqual([
      `sup-007|PK-PETB-8802|${W[0]}`,
      `sup-012|PK-PETB-8801|${W[0]}`,
      `sup-012|PK-PETB-8801|${W[1]}`,
      `sup-012|PK-PETB-8801|${W[2]}`,
    ]);
    // ⚠️ PREMISE CHANGED BY BL-48 (CR-26). Under the retired 7-calendar-day rule
    // packaging version 2's Trade-off reminder fell AFTER the present, so sup-007
    // had nothing due soon and this read `toEqual([])`. At 3 working days the
    // deadline is days earlier and its reminder (half of it) is already past, so
    // sup-007's awaiting Trade-off and Forecast periods ARE due soon now — and
    // never a Firm one, which are overdue instead.
    const dueSoon007 = (await linesFor(sup007)).filter((l) => deadlineState(l, now) === 'dueSoon');
    expect(dueSoon007.map((l) => `${l.materialCode}|${l.periodBucket}`)).toContain(`PK-PETB-8801|${W[3]}`);
    expect(dueSoon007.filter((l) => l.zone === 'firm')).toEqual([]);
    const dueSoon002 = (await linesFor(sup002)).filter((l) => deadlineState(l, now) === 'dueSoon');
    expect(dueSoon002.map((l) => `${l.materialCode}|${l.periodBucket}`)).toContain(`RM-EMUL-9410|${M[1]}`);
    // Both sides of the reminder instant: one millisecond before it no Trade-off
    // week of sup-007 is due soon; from it on, they are.
    const reminder = dueSoon007[0].reminderAt;
    const tradeOffDueSoon = async (at: string) => {
      sdcClock.set(at);
      return (await linesFor(sup007)).filter((l) => l.zone === 'tradeOff' && deadlineState(l, at) === 'dueSoon').length;
    };
    expect(await tradeOffDueSoon(new Date(Date.parse(reminder) - 1).toISOString())).toBe(0);
    expect(await tradeOffDueSoon(reminder)).toBeGreaterThan(0);
  });

  it('the alert engine raises "committed below forecast beyond tolerance": High for Firm, Medium for Trade-off', async () => {
    const alerts = (await reads.getInventoryAlerts(buyer)).items.filter((a) => a.rule === 'commitmentBelowForecast');
    expect(alerts.map((a) => [a.key, a.riskClass]).sort()).toEqual([
      ['commitmentBelowForecast|PK-PETB-8801|sup-007', 'high'],
      ['commitmentBelowForecast|PK-PETB-8802|sup-007', 'medium'],
      ['commitmentBelowForecast|RM-STEAR-7300|sup-002', 'high'],
    ]);
    // A supplier sees its own.
    const mine = (await reads.getInventoryAlerts(sup002)).items.filter((a) => a.rule === 'commitmentBelowForecast');
    expect(mine.map((a) => a.subject)).toEqual(['RM-STEAR-7300']);
    // Accepting the exception clears the condition.
    const l = await lineOf(buyer, 'sup-002', 'RM-STEAR-7300', M[0]);
    await svc.dispatch(buyer, { transitionId: 't_requirementresponse_review', entity: 'requirementResponse', entityId: l.response!.id, payload: {} });
    await svc.dispatch(buyer, { transitionId: 't_requirementresponse_accept', entity: 'requirementResponse', entityId: l.response!.id, payload: {} });
    expect((await reads.getInventoryAlerts(buyer)).items.some((a) => a.key === 'commitmentBelowForecast|RM-STEAR-7300|sup-002')).toBe(false);
  });

  it('sup-012 has not opened its version and is not a supplier that can open another’s', async () => {
    const v = (await reads.getForecastVersions(sup012)).items.find((x) => x.isCurrent)!;
    expect(v.suppliers).toEqual([{ supplierId: 'sup-012', supplierName: 'Sample PET Bottle Manufacturer GmbH', viewedAt: null, changedPeriods: v.suppliers[0].changedPeriods }]);
  });
});
