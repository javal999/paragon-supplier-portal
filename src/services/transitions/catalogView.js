// ─────────────────────────────────────────────────────────────────────────────
// PF-1 · THE FLOW-CATALOG VIEW MODEL — everything the Process Flows page draws.
//
// ⚠️ **THERE IS NO SECOND COPY OF THE MACHINE, AND THAT IS THE WHOLE POINT.**
// Every state, transition, branch, role, count and flag this module returns is
// READ OFF `getKnownFlows()` (passed in — see below) and the four sibling
// authorities it already ships with:
//
//   · `flowGraph`        — reachability, exits, birth states, loose ends (PF-0)
//   · `looseEndCensus`   — the REASON a loose end is exempt (PF-0)
//   · `cascades`         — cross-entity fan-out links
//   · `roles`            — PERSONA_ROLES, the persona × transition-role mapping
//   · `liveness`         — the two honest-render axes, per capability
//
// Because the page renders THIS and nothing else, the module cannot show a
// state the machine does not have: there is nowhere else a state could come
// from. A hand-authored diagram would be a second copy that drifts silently,
// and the drift would be invisible — a picture is never type-checked.
//
// ⚠️ **NO PROSE IS AUTHORED HERE.** Purpose annotations ride PF-2, keyed by
// transition id and bilaterally pinned. What this module derives is SHAPE
// (kind, fork, fact-vs-move, boundary, cascade) — never meaning.
//
// ── THE FLOWS ARE AN ARGUMENT, LIKE THE ANALYZER'S ─────────────────────────
// `flowGraph` takes `getKnownFlows()` as a parameter so it stays a pure
// function of its input and a leaf in the import graph. This module keeps that
// discipline for the same reason: the population is ALWAYS the registry's
// (`CENSUS-MUST-DERIVE-01`), and a nineteenth flow registered tomorrow is drawn
// without anybody editing here.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { PersonaType } from '@context/CurrentIdentityContext' */
/** @import { Capability, FeedProvenance } from '../liveness' */
import { capabilityForEntity, dispatchesCommands, feedProvenance } from '../liveness';
import { WIRED_COMMAND_TARGETS } from '../data/mock/MockCommandService';
/** @import { CascadeLink } from './cascades' */
import { CASCADES } from './cascades';
/** @import { LooseEnd } from './flowGraph' */
import { analyzeFlow, authoredCascadeTargets, buildFlowGraph, looseEndKey } from './flowGraph';
/** @import { CensusEntry, LooseEndReason } from './looseEndCensus' */
import { LOOSE_END_CENSUS } from './looseEndCensus';
import { PERSONA_ROLES } from './roles';
/** @import { FlowDefinition, TransitionDef } from './schema' */

/**
 * WHAT KIND OF STEP THIS IS TO A READER OF THE DIAGRAM — derived from TWO
 * schema fields, never authored.
 *
 * ⚠️ **TWO AXES, AND THEY ARE NOT INTERCHANGEABLE (§52).** `trigger` says WHAT
 * FIRES an act; `surfaceable` says whether a Paragon surface is ever meant to
 * OFFER it. §50 split them because one field had been doing both jobs and
 * predicted the surface at 76%. This function reads BOTH, and reads each one
 * only for the question it actually answers:
 *   · `trigger` → the STRUCTURAL question (is this a birth?),
 *   · `surfaceable` → the SURFACE question (can anyone here perform it?).
 *
 * ⚠️ **`creation` IS ITS OWN KIND, DELIBERATELY.** The trigger union has FOUR
 * members and a creation verb is neither operator nor system: `t_po_issue` is a
 * PO arriving as a fact and `t_asn_create` is a supplier act, so folding
 * creation into either bucket would assert something the schema does not say.
 * It gets its own token and the reader decides — PF1-CREATION-KIND-01.
 *
 * ⚠️ **`unsurfaced-act` IS WHY THIS COULD NOT COLLAPSE TO ONE AXIS.** Reading
 * `surfaceable` ALONE would have relabelled `t_invoice_approve` and
 * `t_enforcement_set` — human acts a STANDING RULING refuses to put on a screen
 * (C10 · ENF-NO-PERSON-IN-IDENTITY-01) — as `system-driven`, which nothing
 * drives. That would have fixed one published falsehood by shipping two. The
 * `ruled-unsurfaced` reason gets its own token, and `system-driven` therefore
 * stops being an approximation and starts being TRUE: it now means an external
 * fact or a computed verdict, and nothing else. §52.
 */
/**
 * @typedef {| 'operator-action'
 *   | 'system-driven'
 *   | 'unsurfaced-act'
 *   | 'creation'} StepKind
 */

/** A derived loose end, annotated with its census row (PF-0's exemption list). */
/**
 * `reason`: The recorded reason this hole ships. **`null` means UNCENSUSED** — a derived defect with no exemption, which is a RED floor (`flowGraph.test.js`) and is rendered as such rather than quietly dropped. The page never invents a reason for a row the census does not have.
 * `note`:  The census note, verbatim. Source text — never translated, never edited.
 *
 * @typedef {LooseEnd & {
 *     readonly reason: LooseEndReason | null;
 *     readonly note: string | null;
 *   }} AnnotatedLooseEnd
 */

/** One drawable edge. A multi-`from` transition yields ONE EDGE PER SOURCE. */
/**
 * `id`:  Unique within the flow: transition id + its source (+ settlement suffix).
 * `from`:  The source state, or `null` for a creation edge (an entity is born here).
 * `settlement`:  True for the `settlesTo` advance a `sapBoundary` verb contracts (D-2).
 * `cascade`:  True when the transition's own trigger is `cascade` (fired from elsewhere).
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly transitionId: string;
 *   readonly from: string | null;
 *   readonly to: string;
 *   readonly kind: StepKind;
 *   readonly settlement: boolean;
 *   readonly cascade: boolean;
 * }} FlowEdge
 */

/**
 * `personas`:  Personas whose role set contains `requiredRole`. May be empty (unmapped).
 * `recordsFact`:  Records a fact and leaves the entity where it is (`statePreserving`).
 * `sapBoundary`:  Crosses the SAP boundary — settles asynchronously (Option B).
 * `settlesTo`:  Where settlement lands the entity; non-null exactly when `sapBoundary`.
 * `fansOutTo`:  Cross-entity cascades this transition FIRES, as a source (`cascades.ts`).
 * `firedBy`:  Source transition ids that fire THIS one. Empty ⇒ nothing fires it.
 *
 * @typedef {{
 *   readonly def: TransitionDef;
 *   readonly kind: StepKind;
 *   readonly personas: readonly PersonaType[];
 *   readonly recordsFact: boolean;
 *   readonly sapBoundary: boolean;
 *   readonly settlesTo: string | null;
 *   readonly fansOutTo: readonly CascadeLink[];
 *   readonly firedBy: readonly string[];
 *   readonly looseEnds: readonly AnnotatedLooseEnd[];
 * }} TransitionView
 */

/**
 * `isBirth`:  A creation verb births instances here.
 * `isTerminal`:  The flow DECLARES this an ending (`terminals`, D-2).
 * `inbound`:  Transition ids that land an entity here (settlement included).
 * `outbound`:  Transition ids that MOVE an entity out of here (settlement included).
 * `branchTargets`:  Distinct target states leaving here.
 * `isFork`:  A DECISION FORK: two or more different verbs leave this state.
 * `facts`:  `statePreserving` verbs legal here — facts recorded, not moves.
 *
 * @typedef {{
 *   readonly name: string;
 *   readonly isInitial: boolean;
 *   readonly isBirth: boolean;
 *   readonly isTerminal: boolean;
 *   readonly reachable: boolean;
 *   readonly inbound: readonly string[];
 *   readonly outbound: readonly string[];
 *   readonly branchTargets: readonly string[];
 *   readonly isFork: boolean;
 *   readonly facts: readonly string[];
 *   readonly looseEnds: readonly AnnotatedLooseEnd[];
 * }} StateView
 */

/**
 * `seededFrom`:  What reachability was seeded from — births, or `[initial]` (PF-0 ruling 3).
 * `stateCount`:  Header counts. Derived — never a number anybody typed.
 * `capability`:  The capability that READS this entity, or null when nothing does.
 * `dispatches`: VERB AXIS — acting on this machine really dispatches through a wired CommandTarget and writes the DR-10 trail.  ⚠️ For a capability-backed entity this is EXACTLY `dispatchesCommands(cap)` and it is computed that way. For the eight flows no capability reads, the same question still has an answer, and it is the SAME SET one layer down — `dispatchesCommands` is `liveness()==='LIVE'` is `WIRED.has(backing)`. So the fallback cannot disagree with the marker regime; it just reaches a machine the capability list never named.
 * `feed`:  FEED AXIS — where the read surface's data comes from. Null ⇒ no reader.
 *
 * @typedef {{
 *   readonly entity: string;
 *   readonly version: number;
 *   readonly initial: string;
 *   readonly terminals: readonly string[];
 *   readonly seededFrom: readonly string[];
 *   readonly states: readonly StateView[];
 *   readonly transitions: readonly TransitionView[];
 *   readonly edges: readonly FlowEdge[];
 *   readonly looseEnds: readonly AnnotatedLooseEnd[];
 *   readonly stateCount: number;
 *   readonly transitionCount: number;
 *   readonly forkCount: number;
 *   readonly capability: Capability | null;
 *   readonly dispatches: boolean;
 *   readonly feed: FeedProvenance | null;
 * }} FlowView
 */

/**
 * `wiredCount`:  Flows whose verbs really dispatch (the wired-target census, per flow).
 *
 * @typedef {{
 *   readonly flows: readonly FlowView[];
 *   readonly flowCount: number;
 *   readonly stateCount: number;
 *   readonly transitionCount: number;
 *   readonly forkCount: number;
 *   readonly looseEndCount: number;
 *   readonly wiredCount: number;
 * }} CatalogView
 */

/** The four collaborators, injectable so the derivation stays a pure function. */
/**
 * @typedef {{
 *   readonly cascades: Record<string, readonly CascadeLink[]>;
 *   readonly census: readonly CensusEntry[];
 *   readonly personaRoles: Record<PersonaType, readonly string[]>;
 *   readonly wiredTargets: readonly string[];
 * }} CatalogSources
 */

/** @type {CatalogSources} */
const DEFAULT_SOURCES = {
  cascades: CASCADES,
  census: LOOSE_END_CENSUS,
  personaRoles: PERSONA_ROLES,
  wiredTargets: WIRED_COMMAND_TARGETS
};

/**
 * The two axes → what kind of step this is. The ONE place the mapping is stated,
 * and after §52 the ONE place in the tree that branches on the SURFACE question
 * at all: every other surviving `trigger` reader keys on `creation` or
 * `cascade` — the two STRUCTURAL members — so `user` vs `system` is now purely
 * descriptive provenance, displayed (`ProcessFlows.tsx`) and never decided on.
 *
 * ⚠️ **ORDER IS LOAD-BEARING.** `creation` short-circuits FIRST because it is a
 * question about the edge's shape (no `from`), not about who performs it — 16
 * verbs, two of which are `surfaced: false`. Reading `surfaceable` first would
 * silently reclassify `t_po_issue` and `t_shipment_create`, which are births
 * that happen to arrive as external facts.
 * @param {TransitionDef} t
 * @returns {StepKind}
 */
export function stepKind(t) {
  if (t.trigger === 'creation') return 'creation';
  if (t.surfaceable.surfaced) return 'operator-action';
  return t.surfaceable.because === 'ruled-unsurfaced' ? 'unsurfaced-act' : 'system-driven';
}

/**
 * The personas whose mapped role set permits a transition-role.
 * @param {string} role
 * @param {Record<PersonaType, readonly string[]>} personaRoles
 * @returns {readonly PersonaType[]}
 */
function personasFor(role, personaRoles) {
  return /** @type {PersonaType[]} */ (Object.keys(personaRoles)).filter((p) =>
    personaRoles[p].includes(role)
  );
}

/**
 * The drawable edge set of one flow.
 *
 * Mirrors the analyzer's two rulings exactly, because a diagram that disagreed
 * with the gate would be a picture of a different machine:
 *   · a `statePreserving` verb is NOT an edge (it is a fact on a state), and
 *   · a `sapBoundary` verb's `settlesTo` IS an edge out of the interim state.
 * @param {FlowDefinition} flow
 * @returns {readonly FlowEdge[]}
 */
export function edgesOf(flow) {
  /** @type {FlowEdge[]} */
  const edges = [];
  for (const t of flow.transitions) {
    const kind = stepKind(t);
    const cascade = t.trigger === 'cascade';
    if (t.trigger === 'creation') {
      edges.push({
        id: `${t.id}#birth`,
        transitionId: t.id,
        from: null,
        to: t.to,
        kind,
        settlement: false,
        cascade
      });
    } else if (!t.statePreserving) {
      for (const from of t.from) {
        edges.push({
          id: `${t.id}#${from}`,
          transitionId: t.id,
          from,
          to: t.to,
          kind,
          settlement: false,
          cascade
        });
      }
    }
    if (t.sapBoundary && t.settlesTo) {
      edges.push({
        id: `${t.id}#settlement`,
        transitionId: t.id,
        from: t.to,
        to: t.settlesTo,
        kind: 'system-driven',
        settlement: true,
        cascade: false
      });
    }
  }
  return edges;
}

/**
 * Build the view model for ONE flow. Pure; reads only its arguments.
 * @param {FlowDefinition} flow
 * @param {CatalogSources} [sources]
 * @returns {FlowView}
 */
export function buildFlowView(flow, sources = DEFAULT_SOURCES) {
  const graph = buildFlowGraph(flow);
  const cascadeTargets = authoredCascadeTargets(sources.cascades);
  const censusByKey = new Map(sources.census.map((row) => [looseEndKey(row), row]));

  /**
   * @param {LooseEnd} end
   * @returns {AnnotatedLooseEnd}
   */
  const annotate = (end) => {
    const row = censusByKey.get(looseEndKey(end));
    return { ...end, reason: row?.reason ?? null, note: row?.note ?? null };
  };
  const looseEnds = analyzeFlow(flow, cascadeTargets).map(annotate);
  /**
   * @param {string} subject
   * @returns {readonly AnnotatedLooseEnd[]}
   */
  const endsFor = (subject) => looseEnds.filter((end) => end.subject === subject);

  const edges = edgesOf(flow);
  const terminals = new Set(flow.terminals);
  const births = new Set(graph.birthStates);

  // Which source transitions fire which target (the `cascades.js` inverse).
  const firedBy = /** @type {Map<string, string[]>} */ (new Map());
  for (const [source, links] of Object.entries(sources.cascades)) {
    for (const link of links) {
      const bucket = firedBy.get(link.targetTransitionId);
      if (bucket) bucket.push(source);
      else firedBy.set(link.targetTransitionId, [source]);
    }
  }

  /** @type {TransitionView[]} */
  const transitions = flow.transitions.map((def) => ({
    def,
    kind: stepKind(def),
    personas: personasFor(def.requiredRole, sources.personaRoles),
    recordsFact: def.statePreserving === true,
    sapBoundary: def.sapBoundary === true,
    settlesTo: def.settlesTo ?? null,
    fansOutTo: sources.cascades[def.id] ?? [],
    firedBy: firedBy.get(def.id) ?? [],
    looseEnds: endsFor(def.id)
  }));

  /** @type {StateView[]} */
  const states = flow.states.map((name) => {
    const outEdges = edges.filter((e) => e.from === name);
    const outbound = [...new Set(outEdges.map((e) => e.transitionId))];
    const inbound = [...new Set(edges.filter((e) => e.to === name).map((e) => e.transitionId))];
    return {
      name,
      isInitial: name === flow.initial,
      isBirth: births.has(name),
      isTerminal: terminals.has(name),
      reachable: graph.reachable.has(name),
      inbound,
      outbound,
      branchTargets: [...new Set(outEdges.map((e) => e.to))],
      // A FORK is a CHOICE OF VERB, not a choice of destination: three verbs
      // that all land in `Confirmed` are still three different things a reader
      // may do from here, and two verbs to one state is the shape a "distinct
      // targets" test would silently miss.
      isFork: outbound.length > 1,
      facts: flow.transitions
        .filter((t) => t.statePreserving === true && t.from.includes(name))
        .map((t) => t.id),
      looseEnds: endsFor(name)
    };
  });

  const capability = capabilityForEntity(flow.entity);
  return {
    entity: flow.entity,
    version: flow.version,
    initial: flow.initial,
    terminals: flow.terminals,
    seededFrom: graph.seededFrom,
    states,
    transitions,
    edges,
    looseEnds,
    stateCount: flow.states.length,
    transitionCount: flow.transitions.length,
    forkCount: states.filter((s) => s.isFork).length,
    capability,
    dispatches:
      capability !== null
        ? dispatchesCommands(capability)
        : sources.wiredTargets.includes(flow.entity),
    feed: capability !== null ? feedProvenance(capability) : null
  };
}

/**
 * The whole catalog, registration order preserved.
 *
 * ⚠️ **THE CALLER PASSES `getKnownFlows()`.** Same contract as
 * `analyzeAllFlows` and for the same reason: the population is the registry's,
 * never a list in this file.
 * @param {readonly FlowDefinition[]} flows
 * @param {CatalogSources} [sources]
 * @returns {CatalogView}
 */
export function buildCatalogView(flows, sources = DEFAULT_SOURCES) {
  const views = flows.map((flow) => buildFlowView(flow, sources));
  /**
   * @param {(v: FlowView) => number} pick
   * @returns {number}
   */
  const sum = (pick) => views.reduce((total, v) => total + pick(v), 0);
  return {
    flows: views,
    flowCount: views.length,
    stateCount: sum((v) => v.stateCount),
    transitionCount: sum((v) => v.transitionCount),
    forkCount: sum((v) => v.forkCount),
    looseEndCount: sum((v) => v.looseEnds.length),
    wiredCount: views.filter((v) => v.dispatches).length
  };
}
