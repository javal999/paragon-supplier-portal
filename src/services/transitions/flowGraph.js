// ─────────────────────────────────────────────────────────────────────────────
// PF-0 · THE FLOW-GRAPH ANALYZER. HEADLESS.
//
// THE OPERATOR'S CRITERION THIS ANSWERS: no loose ends, no empty flows without
// purpose. This module turns that from a review criterion into A DERIVATION —
// the gate that makes it bite lives on the vitest floor (`flowGraph.test.js`)
// with the census it reads (`looseEndCensus.js`).
//
// ── WHAT IT COMPUTES, FROM `getKnownFlows()` ALONE ──────────────────────────
//   Five checks, all structural, none of them opinions:
//     · UNREACHABLE STATES     — no path from a birth state.
//     · EXIT-LESS STATES       — no way out, and not declared terminal.
//     · DEAD TRANSITIONS       — every `from` state is unreachable, so the edge
//                                can never fire.
//     · INITIAL-STATE INTEGRITY— the declared `initial` is actually how
//                                instances are born.
//     · CASCADE INTEGRITY      — a `cascade`-triggered edge has a source
//                                authored in `cascades.js`, or nothing fires it.
//
// ── ⚠️ WHY THE GATE IS NOT IN `register()` ──────────────────────────────────
//   `flowRegistry.register` THROWS AT IMPORT TIME (`assertValidFlow`), and the
//   barrel is imported by `main.jsx`. A graph check there would BRICK THE APP
//   THE DAY IT LANDS — every existing loose end below becomes a white screen.
//   The floor's failure mode is the right one: **RED PR, RUNNING APP.** So this
//   module only ever RETURNS findings; refusing is the caller's job, and the
//   caller is a test.
//
// ── ⚠️ TERMINAL-NESS IS THE ONE INTENT A GRAPH CANNOT INFER ────────────────
//   "No exit" and "the end" are the same shape and different facts. `Awarded`
//   is an ending; `Quality Hold` is a hole. Nothing in the edge set separates
//   them, so terminal-ness became DECLARED DATA — `terminals` on
//   `FlowDefinition` (D-2, operator) — validated in BOTH directions:
//   declared-terminal ⇒ no exit (`validate.js`), and no-exit ⇒ declared-terminal
//   or censused (here).
//
// ── ⚠️ THREE MODELLING RULINGS, STATED BECAUSE EACH CHANGES THE ANSWER ──────
//
//   1. A `statePreserving` verb is NEITHER AN ENTRY NOR AN EXIT. It records a
//      fact and leaves the entity where it is (`t_rfq_fx_pin`, `t_enforcement_
//      set`), so counting it as an edge would make a single-state ledger machine
//      look like it had a way out of itself. It stays in the DEAD-TRANSITION
//      check, because a recording verb can be just as unfireable as a moving one.
//
//   2. A `sapBoundary` transition's SETTLEMENT IS AN EDGE — `settlesTo` (D-2).
//      `settle()`'s finalize advances 'Posting to SAP' → 'Posted to SAP' inside
//      the mock adapter, OUTSIDE the declared machine, so a graph derived from
//      the declaration alone truthfully renders those states unreachable
//      BECAUSE IN THE DECLARED DATA THEY WERE. The ruling is to make the
//      declaration honest, not to exempt the reader.
//
//   3. A FLOW WITH NO CREATION EDGE SEEDS FROM `initial`, and says so. Seeding
//      from an empty birth set would make every state unreachable and every edge
//      dead — a hundred derived findings all restating one cause, which is how a
//      census stops being read. The flow gets ONE finding naming the real defect
//      (`initial-integrity`) and its graph is still analysable.
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️ THIS MODULE IS A LEAF, AND THAT IS DELIBERATE. It imports the cascade DATA
// and the schema TYPES — never `./registry`. `validate.js` consumes `exitsOf`
// (so "declared terminal" and "has an exit" are ONE expression of the rule, not
// two that can disagree), and registry imports validate; importing the registry
// back would close that ring. The flows are therefore an ARGUMENT: the caller
// passes `getKnownFlows()`, and the analyzer stays a pure function of its input.
import { CASCADES } from './cascades';
/** @import { FlowDefinition, TransitionDef } from './schema' */

/** The five structural defects this analyzer can derive. */
/**
 *  A declared state with no path to it from any birth state.
 *  A state with no way out that the flow does not declare terminal.
 *  An edge whose every `from` state is unreachable — it can never fire.
 *  The declared `initial` is not how instances are actually born.
 *  A `cascade`-triggered edge that no source transition fires.
 *
 * @typedef {| 'unreachable-state'
 *   | 'exit-less-state'
 *   | 'dead-transition'
 *   | 'initial-integrity'
 *   | 'unauthored-cascade'} LooseEndKind
 */

/**
 * ONE loose end.
 *
 * ⚠️ **`detail` IS NOT PART OF THE IDENTITY.** The census is keyed by
 * `entity#kind#subject` so that rewording a sentence never silently retires an
 * exemption, and never demands one either. A census whose keys move when prose
 * moves is a census that gets regenerated instead of read.
 */
/**
 * @typedef {object} LooseEnd
 * @property {string} entity
 * @property {LooseEndKind} kind
 * @property {string} subject -  The state name, transition id, or initial state the finding is about.
 * @property {string} detail -  Why it is a finding, for a human. Never keyed on.
 */

/**
 * The stable identity of a loose end. Prose-independent, by construction.
 * @param {Pick<LooseEnd, 'entity' | 'kind' | 'subject'>} end
 * @returns {string}
 */
export function looseEndKey(end) {
  return `${end.entity}#${end.kind}#${end.subject}`;
}

/** The derived graph of one flow — the intermediate every check reads. */
/**
 * @typedef {object} FlowGraph
 * @property {string} entity
 * @property {readonly string[]} states
 * @property {readonly string[]} birthStates -  The states a creation edge births an instance into. May be EMPTY.
 * @property {readonly string[]} seededFrom -  What reachability was actually seeded from — `birthStates`, or `[initial]`
 *    when the flow has no creation edge at all (ruling 3 in the header).
 * @property {ReadonlySet<string>} reachable -  Every state reachable from `seededFrom` by a movement or settlement edge.
 * @property {ReadonlyMap<string, readonly string[]>} exits -  State → the transition ids that MOVE an entity out of it. Settlement
 *    counts; a `statePreserving` verb does not (ruling 1).
 * @property {readonly string[]} terminals -  The states the flow DECLARES as endings.
 */

/**
 * Does this transition move the entity? Creation births rather than moves.
 * @param {TransitionDef} t
 * @returns {boolean}
 */
const isMovement = (t) => t.trigger !== 'creation' && !t.statePreserving;

/**
 * The settlement edge a `sapBoundary` transition declares, if it has one.
 * @param {TransitionDef} t
 * @returns {readonly [string, string] | undefined}
 */
const settlementEdge = (t) => (t.sapBoundary && t.settlesTo ? [t.to, t.settlesTo] : undefined);

/**
 * State → the transition ids that MOVE an entity out of it.
 *
 * **THE ONE EXPRESSION OF "HAS A WAY OUT".** `validate.js` reads it to refuse a
 * declared terminal that still has an exit, and `buildFlowGraph` reads it for
 * the exit-less check. Two implementations of this rule could disagree, and the
 * disagreement would be invisible: each side would be internally consistent.
 * @param {FlowDefinition} flow
 * @returns {ReadonlyMap<string, readonly string[]>}
 */
export function exitsOf(flow) {
  return buildFlowGraph(flow).exits;
}

/**
 * Build the derived graph for one flow. Pure; reads nothing but the flow.
 * @param {FlowDefinition} flow
 * @returns {FlowGraph}
 */
export function buildFlowGraph(flow) {
  const birthStates = [
    ...new Set(flow.transitions.filter((t) => t.trigger === 'creation').map((t) => t.to))
  ];

  // Ruling 3 — a flow with no creation edge is still analysable, and the
  // missing birth is reported ONCE rather than smeared over every state.
  const seededFrom = birthStates.length > 0 ? birthStates : [flow.initial];

  const outgoing = /** @type {Map<string, string[]>} */ (new Map());
  const exits = /** @type {Map<string, string[]>} */ (new Map());
  /**
   * @param {Map<string, string[]>} map
   * @param {string} key
   * @param {string} value
   * @returns {void}
   */
  const push = (map, key, value) => {
    const bucket = map.get(key);
    if (bucket) bucket.push(value);
    else map.set(key, [value]);
  };
  /**
   * @param {string} from
   * @param {string} to
   * @param {string} via
   * @returns {void}
   */
  const addEdge = (from, to, via) => {
    push(outgoing, from, to);
    push(exits, from, via);
  };

  for (const t of flow.transitions) {
    if (isMovement(t)) {
      for (const from of t.from) addEdge(from, t.to, t.id);
    }
    const settles = settlementEdge(t);
    // Ruling 2 — the settlement advance is an edge OUT of the interim state.
    if (settles) addEdge(settles[0], settles[1], `${t.id} (settlement)`);
  }

  const reachable = /** @type {Set<string>} */ (new Set());
  const queue = [...seededFrom];
  while (queue.length > 0) {
    const state = /** @type {NonNullable<ReturnType<typeof queue.pop>>} */ (queue.pop());
    if (reachable.has(state)) continue;
    reachable.add(state);
    for (const next of outgoing.get(state) ?? []) queue.push(next);
  }

  return {
    entity: flow.entity,
    states: flow.states,
    birthStates,
    seededFrom,
    reachable,
    exits,
    terminals: flow.terminals
  };
}

/**
 * Every transition id that some source transition actually fires.
 * @param {Record<string, readonly { readonly targetTransitionId: string }[]>} [cascades]
 * @returns {ReadonlySet<string>}
 */
export function authoredCascadeTargets(cascades = CASCADES) {
  const targets = /** @type {Set<string>} */ (new Set());
  for (const links of Object.values(cascades)) {
    for (const link of links) targets.add(link.targetTransitionId);
  }
  return targets;
}

/**
 * Every loose end in ONE flow, in a stable order (by kind, then subject).
 *
 * ⚠️ Returns findings; refuses nothing. See the header — the refusal is the
 * floor's, because a refusal here would run at import time and take the app
 * down with it.
 * @param {FlowDefinition} flow
 * @param {ReadonlySet<string>} [cascadeTargets]
 * @returns {readonly LooseEnd[]}
 */
export function analyzeFlow(flow, cascadeTargets = authoredCascadeTargets()) {
  const graph = buildFlowGraph(flow);
  /** @type {LooseEnd[]} */
  const ends = [];
  /**
   * @param {LooseEndKind} kind
   * @param {string} subject
   * @param {string} detail
   * @returns {void}
   */
  const at = (kind, subject, detail) => {
    ends.push({ entity: flow.entity, kind, subject, detail });
  };

  // 1 — UNREACHABLE STATES. A state nothing can enter is either a typo or an
  // intention nobody wired; both are loose ends and neither is derivable from
  // the other, so the census says which.
  for (const state of graph.states) {
    if (!graph.reachable.has(state)) {
      at(
        'unreachable-state',
        state,
        `no path from any birth state (${graph.seededFrom.join(', ') || 'none'})`
      );
    }
  }

  // 2 — EXIT-LESS STATES that the flow does not declare terminal. The one check
  // that consults declared intent, because the graph cannot supply it.
  const terminals = new Set(graph.terminals);
  for (const state of graph.states) {
    const out = graph.exits.get(state) ?? [];
    if (out.length === 0 && !terminals.has(state)) {
      at('exit-less-state', state, 'no transition leaves it, and it is not declared terminal');
    }
  }

  // 3 — DEAD TRANSITIONS. `statePreserving` edges are included here even though
  // they are not movement (header ruling 1): an unfireable recording verb is
  // exactly as dead as an unfireable moving one.
  for (const t of flow.transitions) {
    if (t.trigger === 'creation') continue;
    if (t.from.every((s) => !graph.reachable.has(s))) {
      at(
        'dead-transition',
        t.id,
        `every 'from' state is unreachable (${t.from.join(', ')}) — this verb can never fire`
      );
    }
  }

  // 4 — INITIAL-STATE INTEGRITY. Two different defects, reported as one kind
  // with different detail, because both answer "how does an instance get here?"
  // and the answer is the thing that is missing.
  if (graph.birthStates.length === 0) {
    at(
      'initial-integrity',
      flow.initial,
      'the flow declares NO creation transition — the schema cannot bring an instance into existence'
    );
  } else if (!graph.reachable.has(flow.initial)) {
    at(
      'initial-integrity',
      flow.initial,
      `declared initial is not reachable from any creation edge (births land in: ${graph.birthStates.join(', ')})`
    );
  }

  // 5 — CASCADE INTEGRITY. A `cascade` trigger declares "another transition
  // fans out into me". If no source names it, the sentence has no subject.
  for (const t of flow.transitions) {
    if (t.trigger === 'cascade' && !cascadeTargets.has(t.id)) {
      at(
        'unauthored-cascade',
        t.id,
        'trigger is `cascade` but no source transition fires it in cascades.js'
      );
    }
  }

  return ends.sort((a, b) =>
    a.kind === b.kind ? a.subject.localeCompare(b.subject) : a.kind.localeCompare(b.kind)
  );
}

/**
 * Every loose end across a set of flows, flow order preserved.
 *
 * ⚠️ **THE CALLER PASSES `getKnownFlows()`** — the population is the registry's,
 * never a hand-listed set of flows in this file (`CENSUS-MUST-DERIVE-01`). A
 * nineteenth flow registered tomorrow is analysed without anybody editing here.
 * See the import note for why the registry is an argument rather than a default.
 * @param {readonly FlowDefinition[]} flows
 * @param {ReadonlySet<string>} [cascadeTargets]
 * @returns {readonly LooseEnd[]}
 */
export function analyzeAllFlows(flows, cascadeTargets = authoredCascadeTargets()) {
  return flows.flatMap((flow) => analyzeFlow(flow, cascadeTargets));
}
