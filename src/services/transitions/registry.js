// ────────────────────────────────────────────────────────────────────────────
// Flow registry / loader (v2.2 Step 3.1).
//
// The single enumerable home for every entity state machine. `getKnownFlows()`
// is the loader the dispatcher (Step 3.4) and tooling read from. Registration
// runs `assertValidFlow` and enforces GLOBAL uniqueness of both flow entity keys
// and transition ids (so `t_po_confirm` resolves to exactly one transition).
//
// Exposed as a class (`FlowRegistry`) for test isolation, plus a process-wide
// singleton (`flowRegistry`) that the shipped flows register onto in `index.js`.
// The free functions delegate to the singleton for ergonomic imports.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition, TransitionDef } from './schema' */
import { assertValidFlow } from './validate';

/**
 * A registry of flows, keyed by entity: validates each flow it admits and keeps
 * flow keys and transition ids unique across all of them. A class so a test can
 * use a fresh one; the shipped flows register onto `flowRegistry`.
 */
export class FlowRegistry {
  /**
   * @private
   * @readonly
   */
  flows = /** @type {Map<string, FlowDefinition>} */ (new Map());
  /**
   * @private
   * @readonly
   */
  transitionOwner = /** @type {Map<string, string>} */ (new Map());

  /**
   * Validate then admit a flow. Throws on malformed or on a key/id collision.
   * @param {FlowDefinition} flow
   * @returns {void}
   */
  register(flow) {
    assertValidFlow(flow);
    if (this.flows.has(flow.entity)) {
      throw new Error(`flow '${flow.entity}' is already registered`);
    }
    for (const t of flow.transitions) {
      const owner = this.transitionOwner.get(t.id);
      if (owner) {
        throw new Error(`transition id '${t.id}' is already registered by flow '${owner}'`);
      }
    }
    this.flows.set(flow.entity, flow);
    for (const t of flow.transitions) this.transitionOwner.set(t.id, flow.entity);
  }

  /**
   * Every registered flow, in registration order.
   * @returns {readonly FlowDefinition[]}
   */
  getKnownFlows() {
    return [...this.flows.values()];
  }

  /**
   * The flow for an entity key, or undefined.
   * @param {string} entity
   * @returns {FlowDefinition | undefined}
   */
  getFlow(entity) {
    return this.flows.get(entity);
  }

  /**
   * Resolve a globally-unique transition id to its definition, or undefined.
   * @param {string} id
   * @returns {TransitionDef | undefined}
   */
  getTransition(id) {
    const entity = this.transitionOwner.get(id);
    if (!entity) return undefined;
    return this.flows.get(entity)?.transitions.find((t) => t.id === id);
  }
}

/** Process-wide registry. Shipped flows self-register in `index.js`. */
export const flowRegistry = new FlowRegistry();

/**
 * Enumerate all registered flows (the loader the dispatcher reads).
 * @returns {readonly FlowDefinition[]}
 */
export function getKnownFlows() {
  return flowRegistry.getKnownFlows();
}

/**
 * Look up a flow by entity key.
 * @param {string} entity
 * @returns {FlowDefinition | undefined}
 */
export function getFlow(entity) {
  return flowRegistry.getFlow(entity);
}

/**
 * Look up a transition by its globally-unique id.
 * @param {string} id
 * @returns {TransitionDef | undefined}
 */
export function getTransition(id) {
  return flowRegistry.getTransition(id);
}
