// ────────────────────────────────────────────────────────────────────────────
// Call-off verbs (REQ-E09-01, REQ-E09-03, REQ-E09-04) dispatched through the
// REAL MockCommandService against the real stores. Every rule is probed both
// ways — a known-good input that passes and a known-bad one refused BY NAME —
// and every walk ends in the store.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { callOffStore } from './stores/callOffStore';
import { asnStore } from './stores/asnStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import type { QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { headsUpsFor, umbrellaRemaining } from '../../transitions/callOffRules';
import { NO_PERSON } from '../../../context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
const sup007 = supplier('sup-007');
const sup008 = supplier('sup-008');
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};

beforeEach(() => {
  callOffStore.reset();
  asnStore.reset();
  purchaseOrderStore.reset();
});

// po-007 / li-007a: 200,000 PCS; the seed releases 185,000, so 15,000 remain.
const LINE = { poId: 'po-007', poLineId: 'li-007a' };
const verb = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}, scope: QueryScope = sup007) =>
  svc.dispatch(scope, { transitionId, entity: 'callOff', entityId, payload });
const release = (payload: Record<string, unknown>, scope: QueryScope = buyer) =>
  svc.dispatch(scope, {
    transitionId: 't_calloff_release',
    entity: 'callOff',
    payload: { ...LINE, needDate: '2026-09-20', type: 'forecast', ...payload },
  });
const remaining = () => {
  const line = purchaseOrderStore.get('po-007')!.lineItems[0];
  return umbrellaRemaining(line, callOffStore.all()).remainingQty;
};

describe('roles (bilateral): the planner plans and reviews, the supplier answers and ships', () => {
  it('each call-off atom sits in exactly one lane on the right side', () => {
    expect(rolesHolding('calloff:plan')).toEqual(['planning']);
    expect(rolesHolding('calloff:review')).toEqual(['planning']);
    expect(rolesHolding('calloff:confirm')).toEqual(['fulfilment']);
    expect(rolesHolding('calloff:dispatch')).toEqual(['fulfilment']);
  });
});

describe('release (REQ-E09-01 BR-04 / AC-03) — blocked beyond what remains, by policy', () => {
  it('known-good: exactly the remaining 15,000 is released, awaiting the supplier', async () => {
    expect(remaining()).toBe(15000);
    const res = await release({ quantity: 15000 });
    expect(res.status).toBe('done');
    const row = callOffStore.get(res.entityId!)!;
    expect(row).toMatchObject({ status: 'Awaiting Confirmation', supplierId: 'sup-007', materialCode: 'PK-PETB-8801', quantity: 15000 });
    expect(row.releasedAt).toBeTruthy();
    expect(remaining()).toBe(0);
  });

  it('known-bad: 15,001 is refused and nothing is stored', async () => {
    const before = callOffStore.all().length;
    const res = await release({ quantity: 15001 });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/POLICY_REJECTED:calloff_within_remaining:EXCEEDS_REMAINING/);
    expect(callOffStore.all()).toHaveLength(before);
  });

  it('BL-49: the refusal is on remaining QUANTITY and names both figures', async () => {
    const res = await release({ quantity: 15001 });
    expect(res.reason).toMatch(/EXCEEDS_REMAINING: 15001 PCS is more than the 15000 PCS remaining on PO-2025-00107/);
    expect(res.reason).not.toMatch(/EXCEEDS_REMAINING_VALUE/);
  });

  it('a draft may be planned beyond remaining, but releasing it is refused', async () => {
    const drafted = await svc.dispatch(buyer, {
      transitionId: 't_calloff_draft',
      entity: 'callOff',
      payload: { ...LINE, quantity: 20000, needDate: '2026-09-25', type: 'jit' },
    });
    expect(drafted.status).toBe('done');
    const refused = await verb('t_calloff_release_draft', drafted.entityId!, {}, buyer);
    expect(refused.reason).toMatch(/EXCEEDS_REMAINING/);
    expect(callOffStore.get(drafted.entityId!)!.status).toBe('Draft');
  });

  it('the umbrella PO must be approved and open, and the need date real and not past', async () => {
    const onSent = await svc.dispatch(buyer, {
      transitionId: 't_calloff_release',
      entity: 'callOff',
      payload: { poId: 'po-008', poLineId: 'li-008a', quantity: 10, needDate: '2026-09-20', type: 'jit' },
    });
    expect(onSent.reason).toMatch(/calloff_line_valid:PO PO-2025-00108 is not approved and open/);
    expect((await release({ quantity: 10, needDate: '2026-08-01' })).reason).toMatch(/need date is in the past/);
    expect((await release({ quantity: 10, type: 'weekly' })).reason).toMatch(/type must be JIT or forecast-based/);
  });

  it('only the planner releases: a supplier is refused', async () => {
    const res = await release({ quantity: 10 }, sup007);
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

describe('drafts — edit and dismiss need a reason (REQ-E09-01 BR-03)', () => {
  it('edit: refused without a reason; with one, the change and its reason are kept', async () => {
    expect((await verb('t_calloff_edit_draft', 'co-0012', { quantity: 12000 }, buyer)).reason).toMatch(/MISSING_FIELDS:reason/);
    expect((await verb('t_calloff_edit_draft', 'co-0012', { quantity: 12000, reason: '   ' }, buyer)).status).toBe('failed');
    const ok = await verb('t_calloff_edit_draft', 'co-0012', { quantity: 12000, reason: 'Full pallets' }, buyer);
    expect(ok.status).toBe('done');
    const row = callOffStore.get('co-0012')!;
    expect(row).toMatchObject({ status: 'Draft', quantity: 12000 });
    expect(row.notes[row.notes.length - 1]).toMatchObject({ action: 'edit', text: 'Full pallets' });
  });

  it('dismiss: refused without a reason; with one, the draft is Dismissed', async () => {
    expect((await verb('t_calloff_dismiss', 'co-0012', {}, buyer)).status).toBe('failed');
    expect((await verb('t_calloff_dismiss', 'co-0012', { reason: 'Promotion cancelled' }, buyer)).status).toBe('done');
    expect(callOffStore.get('co-0012')!.status).toBe('Dismissed');
  });

  it('a supplier never sees a draft', async () => {
    const mine = await reads.getCallOffs(sup007);
    expect(mine.items.map((c) => c.id)).not.toContain('co-0012');
    expect(mine.items.every((c) => c.supplierId === 'sup-007')).toBe(true);
    expect((await reads.getCallOffs(buyer)).items.map((c) => c.id)).toContain('co-0012');
  });
});

describe('supplier confirmation and tolerance (REQ-E09-03 BR-02..BR-04, AC-01, AC-02)', () => {
  // co-0003: sup-007, forecast-based, 15,000, awaiting confirmation.
  it('confirm as requested → Confirmed, accepted automatically', async () => {
    expect((await verb('t_calloff_confirm', 'co-0003')).status).toBe('done');
    expect(callOffStore.get('co-0003')).toMatchObject({ status: 'Confirmed', confirmation: { approval: 'auto' } });
  });

  // ⚠️ PREMISE CHANGED AT BL-47 (CR-05 revised 2026-09-21). These read "forecast
  // 10% over, JIT no limit" and "any date change to approval (PQ-08 open)".
  // Now: 5% over for every type; a shortfall is accepted as a visible partial;
  // later always to approval; earlier to approval while BL-56's placeholder is
  // 0 days. Each boundary is walked through the real verb on both sides.
  it('forecast-based: exactly +5% is accepted automatically', async () => {
    await verb('t_calloff_confirm_changes', 'co-0003', { confirmedQty: 15750 });
    expect(callOffStore.get('co-0003')).toMatchObject({
      status: 'Confirmed with Changes',
      confirmation: { approval: 'auto', deliveries: [{ quantity: 15750 }] },
    });
  });

  it('forecast-based: one unit beyond +5% waits for the planner', async () => {
    await verb('t_calloff_confirm_changes', 'co-0003', { confirmedQty: 15751 });
    expect(callOffStore.get('co-0003')!.confirmation?.approval).toBe('awaiting');
  });

  it('JIT takes the SAME 5%: +5% accepted, beyond it waits (it had no limit before BL-47)', async () => {
    const atLimit = await release({ quantity: 1000, type: 'jit' });
    await verb('t_calloff_confirm_changes', atLimit.entityId!, { confirmedQty: 1050 });
    expect(callOffStore.get(atLimit.entityId!)!.confirmation?.approval).toBe('auto');
    const beyond = await release({ quantity: 1000, type: 'jit' });
    await verb('t_calloff_confirm_changes', beyond.entityId!, { confirmedQty: 1051 });
    expect(callOffStore.get(beyond.entityId!)!.confirmation?.approval).toBe('awaiting');
  });

  it('a shortfall is accepted as a partial delivery — it does not wait for the planner', async () => {
    await verb('t_calloff_confirm_changes', 'co-0003', { confirmedQty: 9000 });
    expect(callOffStore.get('co-0003')).toMatchObject({
      status: 'Confirmed with Changes',
      confirmation: { approval: 'auto', deliveries: [{ quantity: 9000 }] },
    });
  });

  it('a later date always goes to approval — one day later is enough', async () => {
    const needDate = callOffStore.get('co-0003')!.needDate;
    const nextDay = new Date(Date.parse(`${needDate}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10);
    await verb('t_calloff_confirm_new_date', 'co-0003', { confirmedDate: nextDay });
    expect(callOffStore.get('co-0003')).toMatchObject({ status: 'Confirmed with New Date', confirmation: { approval: 'awaiting' } });
  });

  it('an earlier date goes to approval while the early allowance is the BL-56 placeholder (0 days)', async () => {
    const needDate = callOffStore.get('co-0003')!.needDate;
    const dayBefore = new Date(Date.parse(`${needDate}T00:00:00.000Z`) - 86_400_000).toISOString().slice(0, 10);
    await verb('t_calloff_confirm_new_date', 'co-0003', { confirmedDate: dayBefore });
    expect(callOffStore.get('co-0003')).toMatchObject({ status: 'Confirmed with New Date', confirmation: { approval: 'awaiting' } });
  });

  it('a malformed answer is refused by name and leaves the call-off unanswered', async () => {
    expect((await verb('t_calloff_confirm_new_date', 'co-0003', { confirmedDate: callOffStore.get('co-0003')!.needDate })).reason).toMatch(
      /calloff_confirmation_valid:confirmation: sameDate/,
    );
    expect((await verb('t_calloff_confirm_partial', 'co-0003', { deliveries: [{ quantity: 1, date: '2026-09-09' }] })).reason).toMatch(
      /splitCount/,
    );
    expect(callOffStore.get('co-0003')!.status).toBe('Awaiting Confirmation');
  });

  it('partially confirm in 2 deliveries with 2 dates → Partially Confirmed', async () => {
    const res = await verb('t_calloff_confirm_partial', 'co-0003', {
      deliveries: [
        { quantity: 10000, date: '2026-09-07' },
        { quantity: 5000, date: '2026-09-14' },
      ],
    });
    expect(res.status).toBe('done');
    expect(callOffStore.get('co-0003')).toMatchObject({ status: 'Partially Confirmed', confirmation: { approval: 'awaiting' } });
  });

  it('reject needs a reason', async () => {
    expect((await verb('t_calloff_reject', 'co-0003', { reason: '' })).reason).toMatch(/MISSING_FIELDS:reason/);
    expect((await verb('t_calloff_reject', 'co-0003', { reason: 'No resin' })).status).toBe('done');
    expect(callOffStore.get('co-0003')).toMatchObject({ status: 'Rejected', rejectionReason: 'No resin' });
  });

  it('only the call-off\'s own supplier answers; the planner cannot answer for it', async () => {
    await expect(verb('t_calloff_confirm', 'co-0003', {}, sup008)).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect((await verb('t_calloff_confirm', 'co-0003', {}, buyer)).reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

describe('planner review (BR-04) and change (edge case)', () => {
  // co-0004: new date awaiting approval.
  it('approve keeps the confirmation state and accepts it', async () => {
    expect((await verb('t_calloff_approve', 'co-0004', {}, buyer)).status).toBe('done');
    expect(callOffStore.get('co-0004')).toMatchObject({ status: 'Confirmed with New Date', confirmation: { approval: 'approved' } });
    // Nothing is waiting any more, so a second approval is refused.
    expect((await verb('t_calloff_approve', 'co-0004', {}, buyer)).reason).toMatch(/NOT_AWAITING_APPROVAL/);
  });

  it('reject needs a comment and returns the call-off to Awaiting Confirmation', async () => {
    expect((await verb('t_calloff_reject_confirmation', 'co-0004', { reviewComment: ' ' }, buyer)).status).toBe('failed');
    expect((await verb('t_calloff_reject_confirmation', 'co-0004', { reviewComment: 'Line stops on the 12th' }, buyer)).status).toBe('done');
    const row = callOffStore.get('co-0004')!;
    expect(row.status).toBe('Awaiting Confirmation');
    expect(row.confirmation).toBeUndefined();
    expect(row.notes[row.notes.length - 1]).toMatchObject({ action: 'returned', text: 'Line stops on the 12th' });
  });

  it('an auto-accepted confirmation cannot be "approved" again', async () => {
    expect((await verb('t_calloff_approve', 'co-0006', {}, buyer)).reason).toMatch(/ILLEGAL_TRANSITION|NOT_AWAITING_APPROVAL/);
  });

  it('changing a confirmed call-off returns it to Awaiting Confirmation, with a reason', async () => {
    expect((await verb('t_calloff_change', 'co-0006', { quantity: 9000 }, buyer)).reason).toMatch(/MISSING_FIELDS:reason/);
    expect((await verb('t_calloff_change', 'co-0006', { quantity: 9000, reason: 'Demand dropped' }, buyer)).status).toBe('done');
    const row = callOffStore.get('co-0006')!;
    expect(row).toMatchObject({ status: 'Awaiting Confirmation', quantity: 9000 });
    expect(row.confirmation).toBeUndefined();
  });

  it('a change is refused once the call-off has shipped, and beyond remaining', async () => {
    expect((await verb('t_calloff_change', 'co-0002', { quantity: 1, reason: 'x' }, buyer)).reason).toMatch(/ALREADY_DISPATCHED/);
    expect((await verb('t_calloff_change', 'co-0006', { quantity: 25001, reason: 'x' }, buyer)).reason).toMatch(/EXCEEDS_REMAINING/);
  });
});

describe('dispatch heads-up (REQ-E09-04) and ASN gating (REQ-E09-03 BR-06)', () => {
  const HEADS_UP = { shippedDate: '2026-09-01', expectedArrival: '2026-09-03', quantity: 10000 };

  it('known-good: a heads-up on a confirmed call-off is recorded (partial dispatch allowed)', async () => {
    expect((await verb('t_calloff_dispatch', 'co-0006', { ...HEADS_UP, quantity: 6000 })).status).toBe('done');
    expect((await verb('t_calloff_dispatch', 'co-0006', { ...HEADS_UP, quantity: 4000 })).status).toBe('done');
    expect(callOffStore.get('co-0006')!.dispatches.map((d) => d.quantity)).toEqual([6000, 4000]);
  });

  it('refused on an unconfirmed call-off, and on one still awaiting approval', async () => {
    expect((await verb('t_calloff_dispatch', 'co-0003', HEADS_UP)).reason).toMatch(/ILLEGAL_TRANSITION/);
    expect((await verb('t_calloff_dispatch', 'co-0004', HEADS_UP)).reason).toMatch(/CALL_OFF_NOT_CONFIRMED/);
    expect(callOffStore.get('co-0004')!.dispatches).toEqual([]);
  });

  it('refused with arrival before shipping', async () => {
    expect((await verb('t_calloff_dispatch', 'co-0006', { ...HEADS_UP, expectedArrival: '2026-08-30' })).reason).toMatch(
      /expected arrival is before the shipped date/,
    );
  });

  const createAsn = (payload: Record<string, unknown>) =>
    svc.dispatch(sup007, { transitionId: 't_asn_create', entity: 'advanceShipNotice', payload: { poReference: 'PO-2025-00107', ...payload } });

  it('an ASN for an unconfirmed call-off is refused; for a confirmed one it is created and linked', async () => {
    const refused = await createAsn({ callOffId: 'co-0003' });
    expect(refused.reason).toMatch(/POLICY_REJECTED:asn_calloff_confirmed:CALL_OFF_NOT_CONFIRMED/);
    expect((await createAsn({ callOffId: 'co-0004' })).reason).toMatch(/awaiting approval/);
    expect((await createAsn({ callOffId: 'co-0007' })).reason).toMatch(/is not on PO-2025-00107/);

    const ok = await createAsn({ callOffId: 'co-0006' });
    expect(ok.status).toBe('done');
    expect(asnStore.get(ok.entityId!)!.callOffId).toBe('co-0006');
  });

  it('a submitted ASN for the call-off counts as its heads-up — the supplier does not report twice', async () => {
    const created = await createAsn({
      callOffId: 'co-0006',
      lines: [{ materialCode: 'PK-PETB-8801', shippedQty: 10000, batchNumber: 'LOT-1' }],
      shipDate: '2026-09-01',
    });
    const asnNumber = created.entityId!;
    expect(headsUpsFor(callOffStore.get('co-0006')!, asnStore.all())).toEqual([]); // a draft has not shipped
    const submitted = await svc.dispatch(sup007, {
      transitionId: 't_asn_submit',
      entity: 'advanceShipNotice',
      entityId: asnNumber,
      payload: { carrier: 'Sample Courier', trackingNumber: 'B 1 XY', eta: '2026-09-02', shipDate: '2026-09-01' },
    });
    expect(submitted.reason).toBeUndefined();
    expect(submitted.status).toBe('done');
    expect(headsUpsFor(callOffStore.get('co-0006')!, asnStore.all()).map((h) => h.ref)).toEqual([asnNumber]);
    // …and a change is now refused because it has shipped.
    expect((await verb('t_calloff_change', 'co-0006', { quantity: 1, reason: 'x' }, buyer)).reason).toMatch(/ALREADY_DISPATCHED/);
  });

  it('a PO-level ASN (no call-off named) keeps its existing behaviour', async () => {
    const res = await createAsn({});
    expect(res.status).toBe('done');
    expect(asnStore.get(res.entityId!)!.callOffId).toBeUndefined();
  });
});
