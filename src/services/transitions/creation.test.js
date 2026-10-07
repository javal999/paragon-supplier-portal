import { describe, it, expect } from 'vitest';

/** @import { CommandTarget } from './index' */
import { createDispatcher, InMemoryAuditSink, resolvePolicyHook, flowRegistry } from './index';
import { DataError } from '../data/types';
/** @import { QueryScope } from '../data/types' */
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';

// A synthetic creation flow on this file's isolated registry singleton.
flowRegistry.register({
  entity: 'gadget',
  version: 1,
  states: ['New', 'Live'],
  initial: 'New',
  terminals: ['Live'],
  transitions: [
    {
      id: 't_gadget_create',
      from: [],
      to: 'New',
      trigger: 'creation',
      requiredRole: 'gadget:create',
      requiredFields: ['parentRef', 'label'],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    },
    {
      id: 't_gadget_activate',
      from: ['New'],
      to: 'Live',
      trigger: 'user',
      requiredRole: 'gadget:activate',
      requiredFields: [],
      policyHooks: [],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
});

/** @type {QueryScope} */
const supA = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier
};
/** @type {QueryScope} */
const supB = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier
};

// A creation-capable target: `creationOwner` derives the owner from the parent
// ref in the payload; `create` mints an id.
function makeTarget(withCreate = true) {
  /** @type {{ id: string; payload: Record<string, unknown> }[]} */
  const created = [];
  let seq = 0;
  /** @type {CommandTarget} */
  const target = {
    readState: () => null,
    readScopeOwner: () => null,
    readEntity: () => null,
    applyTransition: () => {},
    creationOwner: (payload) => (payload.parentRef === 'PO-owned-by-A' ? 'sup-007' : null),
    ...(withCreate
      ? {
          /** @param {Record<string, unknown>} payload */
          create: (payload) => {
            const entityId = `G-${++seq}`;
            created.push({ id: entityId, payload });
            return { entityId };
          }
        }
      : {})
  };
  return { target, created };
}

/** @param {CommandTarget} target */
function makeDispatcher(target) {
  const sink = new InMemoryAuditSink();
  let n = 0;
  return createDispatcher({
    resolveRoles: () => ['gadget:create'],
    target: () => target,
    resolvePolicyHook,
    sink,
    nextCorrelationId: () => `cmd_${++n}`,
    now: () => '2026-07-06T00:00:00.000Z'
  });
}

/** @param {string} parentRef */
const createCmd = (parentRef) => ({
  transitionId: 't_gadget_create',
  entity: 'gadget',
  // NOTE: no entityId — the store assigns it.
  payload: { parentRef, label: 'widget-a' }
});

describe('dispatcher — creation shape (Step 4 batch i)', () => {
  it('mints an entity: no input id, store-assigned id returned on the result', () => {
    const { target, created } = makeTarget();
    const d = makeDispatcher(target);
    const res = d.dispatch(supA, createCmd('PO-owned-by-A'));
    expect(res.status).toBe('done');
    expect(res.entityId).toBe('G-1');
    expect(created).toHaveLength(1);
    expect(created[0].payload.parentRef).toBe('PO-owned-by-A');
  });

  it('scopes creation via the payload parent: cross-supplier ⇒ SCOPE_DENIED', () => {
    const { target } = makeTarget();
    const d = makeDispatcher(target);
    // sup-002 trying to create against a PO owned by sup-007.
    expect(() => d.dispatch(supB, createCmd('PO-owned-by-A'))).toThrow(DataError);
    try {
      d.dispatch(supB, createCmd('PO-owned-by-A'));
    } catch (e) {
      expect(/** @type {DataError} */ (e).code).toBe('SCOPE_DENIED');
    }
  });

  it('denies creation when the parent cannot be resolved (owner null)', () => {
    const { target } = makeTarget();
    const d = makeDispatcher(target);
    try {
      d.dispatch(supA, createCmd('PO-unknown'));
      throw new Error('expected a throw');
    } catch (e) {
      expect(/** @type {DataError} */ (e).code).toBe('SCOPE_DENIED');
    }
  });

  it('rejects a missing requiredField on creation (no entity minted)', () => {
    const { target, created } = makeTarget();
    const d = makeDispatcher(target);
    // Resolvable parent (scope passes) but the `label` field is omitted.
    const res = d.dispatch(supA, {
      transitionId: 't_gadget_create',
      entity: 'gadget',
      payload: { parentRef: 'PO-owned-by-A' }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/MISSING_FIELDS:label/);
    expect(created).toHaveLength(0);
  });

  it('fails UNSUPPORTED_CREATION when the target cannot create', () => {
    const { target } = makeTarget(false); // no create()
    const d = makeDispatcher(target);
    const res = d.dispatch(supA, createCmd('PO-owned-by-A'));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/UNSUPPORTED_CREATION:gadget/);
  });

  it('a non-creation command still requires an entityId', () => {
    const { target } = makeTarget();
    const d = createDispatcher({
      resolveRoles: () => ['gadget:activate'],
      target: () => target,
      resolvePolicyHook,
      sink: new InMemoryAuditSink(),
      nextCorrelationId: () => 'cmd_x',
      now: () => '2026-07-06T00:00:00.000Z'
    });
    const res = d.dispatch(supA, { transitionId: 't_gadget_activate', entity: 'gadget' });
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('MISSING_ENTITY_ID');
  });
});
