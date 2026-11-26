// ─────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-D22, UCX-D29 — the escalated-PO acts on the spine.
// A seat without `po:escalation` is refused; a decision records one of the four
// ruled outcomes with the session's actor; the three ending decisions move the
// order through the cascade; "still waiting" records and moves nothing.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { mockDataService } from '@services/data/mock/mockDataService';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { poEscalationStore } from '@services/data/mock/stores/poEscalationStore';
import { NO_PERSON } from '@context/noPerson';
import {
  PO_ESCALATION_DECISIONS,
  PO_ESCALATION_VERB,
  escalationDecisionRefusal
} from './poEscalationRules';

const PROCUREMENT = {
  personaType: /** @type {'buyer'} */ ('buyer'),
  supplierId: null,
  businessRoles: ['procurement']
};

/** A PO fixture that still awaits the supplier's answer. */
const awaitingPo = () =>
  purchaseOrderStore.all().find((p) => ['Sent', 'Viewed', 'Acknowledged'].includes(p.status));

/** @param {string} transitionId @param {Record<string, unknown>} payload */
const dispatch = (transitionId, payload) =>
  mockDataService.commands.dispatch(PROCUREMENT, {
    transitionId,
    entity: 'poEscalation',
    payload
  });

beforeEach(() => {
  poEscalationStore.reset();
  purchaseOrderStore.reset();
});

describe('UCX-P7 — the atom and the record', () => {
  it('a seat without po:escalation is refused and no record is made', async () => {
    const po = awaitingPo();
    expect(po).toBeTruthy();
    const res = await mockDataService.commands.dispatch(
      { ...PROCUREMENT, businessRoles: ['planning'] },
      {
        transitionId: 't_po_escalation_still_waiting',
        entity: 'poEscalation',
        payload: { poId: /** @type {any} */ (po).id, decision: 'stillWaiting' }
      }
    );
    expect(res.status).toBe('failed');
    expect(poEscalationStore.all()).toHaveLength(0);
  });

  it('"still waiting" records the decision with the actor placeholder and moves nothing', async () => {
    const po = awaitingPo();
    const before = /** @type {any} */ (po).status;
    const res = await dispatch('t_po_escalation_still_waiting', {
      poId: /** @type {any} */ (po).id,
      decision: 'stillWaiting'
    });
    expect(res.status).not.toBe('failed');
    const [row] = poEscalationStore.all();
    expect(row.decision).toBe('stillWaiting');
    expect(row.kind).toBe('decision');
    expect(row.actor).toBe(NO_PERSON);
    expect(purchaseOrderStore.get(/** @type {any} */ (po).id)?.status).toBe(before);
  });

  it('the ask records an ask row and moves nothing', async () => {
    const po = awaitingPo();
    const res = await dispatch('t_po_ask_confirm', { poId: /** @type {any} */ (po).id });
    expect(res.status).not.toBe('failed');
    const [row] = poEscalationStore.all();
    expect(row.kind).toBe('ask');
    expect(row.decision).toBeNull();
  });

  it('the three ending decisions move the order through the cascade', async () => {
    const moves = /** @type {const} */ ([
      ['supplierConfirmedOutside', 'Confirmed'],
      ['sourcingElsewhere', 'Rejected'],
      ['cancellingInSap', 'Closed']
    ]);
    for (const [decision, to] of moves) {
      poEscalationStore.reset();
      const po = awaitingPo();
      const res = await dispatch(PO_ESCALATION_VERB[decision], {
        poId: /** @type {any} */ (po).id,
        decision
      });
      expect(res.status, `${decision} records`).not.toBe('failed');
      expect(purchaseOrderStore.get(/** @type {any} */ (po).id)?.status, decision).toBe(to);
      expect(poEscalationStore.latestForPo(/** @type {any} */ (po).id)?.decision).toBe(decision);
    }
  });

  it('a decision outside the ruled set is refused by the hook', async () => {
    const po = awaitingPo();
    const res = await dispatch('t_po_escalation_still_waiting', {
      poId: /** @type {any} */ (po).id,
      decision: 'escalateHarder'
    });
    expect(res.status).toBe('failed');
    expect(poEscalationStore.all()).toHaveLength(0);
  });

  it('a PO that is no longer awaiting refuses the act', async () => {
    const settled = purchaseOrderStore.all().find((p) => p.status === 'Confirmed');
    expect(settled).toBeTruthy();
    const res = await dispatch('t_po_escalation_still_waiting', {
      poId: /** @type {any} */ (settled).id,
      decision: 'stillWaiting'
    });
    expect(res.status).toBe('failed');
    expect(poEscalationStore.all()).toHaveLength(0);
  });
});

describe('UCX-D22 — the vocabulary', () => {
  it('names the four decisions and one verb each', () => {
    expect(PO_ESCALATION_DECISIONS).toEqual([
      'supplierConfirmedOutside',
      'sourcingElsewhere',
      'cancellingInSap',
      'stillWaiting'
    ]);
    for (const d of PO_ESCALATION_DECISIONS) expect(PO_ESCALATION_VERB[d]).toMatch(/^t_po_/);
    expect(escalationDecisionRefusal('stillWaiting')).toBeNull();
    expect(escalationDecisionRefusal('nope')).toMatch(/ESCALATION_DECISION_UNKNOWN/);
  });
});
