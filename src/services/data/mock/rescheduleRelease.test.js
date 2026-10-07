// ────────────────────────────────────────────────────────────────────────────
// REQ-E14-13 BR-07 / BR-08 (X-03) — nothing from the reschedule report reaches
// a supplier on synthetic data. Dispatched through the REAL MockCommandService
// against the real stores, probed both ways, and read back through the REAL
// service: a call-off change that names the engine is refused BY NAME while
// simulated (and the same change without the engine goes through); a "taken to
// SAP" mark is refused BY NAME while simulated; after the liveness flips, both
// go through on the SAME service instance — the hooks read the registry at
// call time, not a copy.
//
// The flip is the `callOffEngineOrigin.test.js` shape: `isLive` wrapped,
// delegating to the real predicate unless a test sets the flip, and the real
// answer asserted first.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const flip = vi.hoisted(() => ({ engineDataset: /** @type {boolean | null} */ (null) }));
vi.mock('../../liveness/registry', async (importOriginal) => {
  const actual =
    await /** @type {typeof importOriginal<typeof import('../../liveness/registry')>} */ (
      importOriginal
    )();
  return {
    ...actual,
    /** @param {Parameters<typeof actual.isLive>[0]} c */
    isLive: (c) =>
      c === 'engineDataset' && flip.engineDataset !== null ? flip.engineDataset : actual.isLive(c)
  };
});

import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { sapChangeMarkStore } from './stores/sapChangeMarkStore';
/** @import { QueryScope, RescheduleProposalView } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { POLICY_HOOKS } from '../../transitions/policyHooks';
import { refusedByPolicy } from '../../transitions/refusalMessage';
import { callOffFlow } from '../../transitions/flows/callOff.flow';
import { sapChangeMarkFlow } from '../../transitions/flows/sapChangeMark.flow';
import { isLive } from '../../liveness/registry';
import { rescheduleEn, rescheduleId } from '@lib/i18n/reschedule';
import { NO_PERSON } from '@context/noPerson';

const cmd = new MockCommandService();
const svc = new MockProcurementService();
/** @type {QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
/** @type {QueryScope} */
const finance = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['finance'],
  actor: NO_PERSON
};
/** @type {QueryScope} */
const supplier = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

const report = async () =>
  /** @type {import('../types').RescheduleView} */ (await svc.getReschedule(planner));
/** @returns {Promise<RescheduleProposalView[]>} */
const proposals = async () => (await report()).warehouses.flatMap((w) => [...w.proposals]);

/** A call-off proposal the change verb can carry: not a cancellation. */
const callOffProposal = async () =>
  /** @type {RescheduleProposalView} */ (
    (await proposals()).find((p) => p.line.kind === 'callOff' && p.type !== 'cancel')
  );
const poProposal = async () =>
  /** @type {RescheduleProposalView} */ (
    (await proposals()).find((p) => p.line.kind === 'poLine' && p.type === 'rescheduleOut')
  );

/**
 * @param {RescheduleProposalView} p
 * @param {Record<string, unknown>} [extra]
 */
const change = (p, extra = {}) =>
  cmd.dispatch(planner, {
    transitionId: 't_calloff_change',
    entity: 'callOff',
    entityId: /** @type {NonNullable<typeof p.line.callOffId>} */ (p.line.callOffId),
    payload: {
      reason: 'Warehouse capacity: not needed until W45',
      needDate: p.proposedDate,
      origin: 'engine',
      ...extra
    }
  });

/**
 * @param {RescheduleProposalView} p
 * @param {QueryScope} [scope]
 * @param {Record<string, unknown>} [extra]
 */
const mark = (p, scope = planner, extra = {}) =>
  cmd.dispatch(scope, {
    transitionId: 't_sapchange_mark',
    entity: 'sapChangeMark',
    payload: {
      poNumber: p.line.poNumber,
      line: p.line.poLine,
      proposalType: p.type,
      proposedDate: p.proposedDate,
      proposedQuantity: p.proposedQuantity,
      ...extra
    }
  });

beforeEach(() => {
  callOffStore.reset();
  purchaseOrderStore.reset();
  sapChangeMarkStore.reset();
  flip.engineDataset = null;
});
afterEach(() => {
  flip.engineDataset = null;
});

describe('the verbs carry the rule', () => {
  it('t_calloff_change now carries CALLOFF_ENGINE_DATA_LIVE; t_sapchange_mark carries its own engine-live hook', () => {
    expect(
      /** @type {import('../../transitions/schema').TransitionDef} */ (
        callOffFlow.transitions.find((t) => t.id === 't_calloff_change')
      ).policyHooks
    ).toContain(POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE);
    expect(sapChangeMarkFlow.transitions[0].policyHooks).toEqual([
      POLICY_HOOKS.SAP_CHANGE_MARK_VALID,
      POLICY_HOOKS.SAP_CHANGE_ENGINE_DATA_LIVE
    ]);
    expect(sapChangeMarkFlow.transitions[0].requiredRole).toBe('sapchange:mark');
  });

  it('the control: the real registry says the engine dataset is simulated', () => {
    expect(isLive('engineDataset')).toBe(false);
  });
});

describe('BR-07 / BR-08 — a call-off change from the report', () => {
  it('the report proposes a change to a real call-off in the store', async () => {
    const p = await callOffProposal();
    expect(p).toBeDefined();
    expect(
      callOffStore.get(/** @type {NonNullable<typeof p.line.callOffId>} */ (p.line.callOffId))
        ?.callOffNumber
    ).toBe(p.line.reference);
  });

  it('known-bad: refused BY NAME while simulated, and the call-off is untouched', async () => {
    const p = await callOffProposal();
    const before = /** @type {import('../types').CallOff} */ (
      callOffStore.get(/** @type {NonNullable<typeof p.line.callOffId>} */ (p.line.callOffId))
    );
    const res = await change(p);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE)).toBe(true);
    expect(res.reason).toMatch(
      /ENGINE_DATA_SIMULATED: this change comes from the reschedule report/
    );
    expect(
      callOffStore.get(/** @type {NonNullable<typeof p.line.callOffId>} */ (p.line.callOffId))
    ).toEqual(before);
  });

  it('known-good: the same change typed by a planner (no engine origin) still goes through', async () => {
    const p = await callOffProposal();
    const res = await change(p, { origin: undefined });
    expect(res.status, res.reason).toBe('done');
    expect(
      callOffStore.get(/** @type {NonNullable<typeof p.line.callOffId>} */ (p.line.callOffId))
    ).toMatchObject({ status: 'Awaiting Confirmation', needDate: p.proposedDate });
  });

  it('an origin the hub does not know is refused rather than dropped', async () => {
    const p = await callOffProposal();
    const res = await change(p, { origin: 'Engine' });
    expect(res.reason).toMatch(/calloff_edit_valid:origin, when given, must be engine/);
  });

  it('once the engine data is live, the report’s change goes through and the supplier re-confirms (nothing counts as moved until then)', async () => {
    const p = await callOffProposal();
    expect((await change(p)).status).toBe('failed');
    flip.engineDataset = true;
    const res = await change(p);
    expect(res.status, res.reason).toBe('done');
    const row = /** @type {import('../types').CallOff} */ (
      callOffStore.get(/** @type {NonNullable<typeof p.line.callOffId>} */ (p.line.callOffId))
    );
    expect(row).toMatchObject({ status: 'Awaiting Confirmation', needDate: p.proposedDate });
    expect(row.notes[row.notes.length - 1]).toMatchObject({
      action: 'change',
      text: 'Warehouse capacity: not needed until W45'
    });
    // The report now shows the line for information: a change sent, not yet confirmed.
    const info = (await report()).warehouses.flatMap((w) => w.info).find((i) => i.line.id === p.id);
    expect(info?.reason).toBe('changePending');
    expect((await proposals()).some((x) => x.id === p.id)).toBe(false);
  });
});

describe('BR-07 / ENG-D16 — a PO line taken to SAP', () => {
  it('known-bad: refused BY NAME while simulated; nothing recorded', async () => {
    const p = await poProposal();
    const res = await mark(p);
    expect(res.status).toBe('failed');
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.SAP_CHANGE_ENGINE_DATA_LIVE)).toBe(true);
    expect(res.reason).toMatch(/ENGINE_DATA_SIMULATED/);
    expect(sapChangeMarkStore.all()).toEqual([]);
  });

  it('once live, the mark is recorded with the change and the time, and the report shows it', async () => {
    flip.engineDataset = true;
    const p = await poProposal();
    const res = await mark(p);
    expect(res.status, res.reason).toBe('done');
    const [m] = sapChangeMarkStore.all();
    expect(m).toMatchObject({
      lineId: p.id,
      poNumber: p.line.poNumber,
      line: p.line.poLine,
      proposalType: 'rescheduleOut',
      proposedDate: p.proposedDate,
      proposedQuantity: p.proposedQuantity,
      markedBy: NO_PERSON
    });
    expect((await report()).sapMarks.map((x) => x.lineId)).toEqual([p.id]);
  });

  it('the line is read from the engine data, never the form: an unknown line, a bad type or quantity is refused by name (and a good one passes)', async () => {
    flip.engineDataset = true;
    const p = await poProposal();
    expect((await mark(p, planner, { poNumber: 'SYN-PO-99999' })).reason).toMatch(/NO_SUCH_LINE/);
    expect((await mark(p, planner, { proposalType: 'move' })).reason).toMatch(
      /proposal type must be/
    );
    expect((await mark(p, planner, { proposedQuantity: -1 })).reason).toMatch(
      /quantity must be a number from 0/
    );
    expect(
      (await mark(p, planner, { proposalType: 'cancel', proposedQuantity: 5 })).reason
    ).toMatch(/a cancellation carries quantity 0/);
    expect((await mark(p)).status).toBe('done');
  });

  it('a seat without the planning lane is refused at the ROLE gate; a supplier at SCOPE', async () => {
    flip.engineDataset = true;
    const p = await poProposal();
    expect((await mark(p, finance)).reason).toMatch(/^ROLE_NOT_PERMITTED/);
    await expect(mark(p, supplier)).rejects.toBeInstanceOf(DataError);
    expect(sapChangeMarkStore.all()).toEqual([]);
  });
});

describe('X-03 — the report itself is PTI’s only', () => {
  it('a supplier scope gets nothing', async () => {
    expect(await svc.getReschedule(supplier)).toBeNull();
  });
});

describe('the refusal copy, in EN and ID', () => {
  it('names simulated data and the MDM SAP feed in both languages', () => {
    for (const k of ['rs.refusal.simulated', 'rs.relief.withheld', 'rs.withheld']) {
      expect(rescheduleEn[k]).toMatch(/Master Data Management team’s SAP feed is live/);
      expect(rescheduleId[k]).toMatch(/Master Data Management/);
      expect(rescheduleId[k]).not.toBe(rescheduleEn[k]);
    }
  });
});
