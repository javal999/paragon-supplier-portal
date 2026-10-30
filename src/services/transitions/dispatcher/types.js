// ────────────────────────────────────────────────────────────────────────────
// dispatcher/types.js — the JSDoc types the dispatcher is written against.
//
// Holds `CommandTarget`, the policy-hook types, the cascade and settle contexts,
// `DispatcherDeps` and `Dispatcher`. Kept apart from `createDispatcher.js` so a
// reader (and the contract tests that parse `CommandTarget`) finds the interface
// without reading the factory. Types only: nothing here runs.
// ────────────────────────────────────────────────────────────────────────────

/** @import { QueryScope, CommandInput, CommandResult, CommandStatus } from '../../data/types' */
/** @import { AuditSink } from '../events' */

/**
 * A per-entity adapter the dispatcher reads/writes through.
 *
 * The first four members serve NON-creation transitions (the entity exists).
 * The last two serve `creation` transitions and are the CANONICAL creation
 * pattern (see `advanceShipNotice.flow.js`): the entity does not exist yet, so
 * scope is derived from the payload's PARENT (`creationOwner`) rather than an
 * existing owner, and `create` mints the new entity + returns its assigned id.
 */
/**
 * @typedef {object} CommandTarget
 * @property {(entityId: string) => string | null} readState -  Current transition-state, or null if the entity does not exist.
 * @property {(entityId: string) => string | null} readScopeOwner Owning supplierId for scope enforcement, or `null`.
 *
 *   ⚠️ **`null` MEANS "NO SUPPLIER MAY ACT ON THIS", NOT "NOTHING TO COMPARE".**
 *   The dispatcher compares `owner !== scope.supplierId` unconditionally, so a
 *   null owner DENIES every supplier scope — including on an entity that exists.
 *   It used to mean the weaker thing, and the difference was an existence
 *   oracle: a supplier fell through to the role gate on a row that existed and
 *   was denied at scope on one that did not, so the refusal KIND reported
 *   existence across a tenancy boundary (`ownerlessScope.test.js`).
 *
 *   A target that wants a supplier to reach a verb must NAME that supplier here.
 *   Returning `null` to mean "buyer-only" is correct and is what the
 *   buyer-governance targets do; returning it because the owner is merely
 *   unknown would silently deny a legitimate act instead.
 * @property {(entityId: string) => unknown} readEntity -  Full entity for policy hooks to inspect, or null.
 * @property {(entityId: string, toState: string, payload: Record<string, unknown>, scope: QueryScope, transitionId?: string) => void} applyTransition Apply the target state + any payload effects (store mutation).
 *
 *   ⚠️ **`scope` IS THE FOURTH PARAMETER BECAUSE ATTRIBUTION MAY NOT TRAVEL IN
 *   THE PAYLOAD (C10 §6.2).** A target that must record WHO acted — the PR
 *   approval is the first — needs the SESSION's actor, and the only alternative
 *   was a caller-supplied payload field. That is `setBy`'s shape, which §6.2
 *   names as ATTRIBUTION BY ASSERTION and permits only because nothing can
 *   construct a `RESOLVED` actor yet. Reproducing it on a second verb would
 *   have doubled the seam that has to be closed before the first resolved
 *   record exists. Every existing target ignores the parameter.
 *
 *   `transitionId` IS THE FIFTH PARAMETER SO A TARGET CAN TELL ITS VERBS APART
 *   (RFx AR-01). Without it a target with several verbs had to guess the verb
 *   from payload fields or the target state, and a stray field sent a verb down
 *   another verb's branch. It is optional so every target that has one verb per
 *   state compiles and behaves unchanged; the `rfq`, `rfiEvent` and `rfpEvent`
 *   targets branch on it.
 * @property {(payload: Record<string, unknown>) => string | null} [creationOwner] Creation scope: the intended owner derived from the payload's parent
 *   (e.g. `poReference` → the PO's supplierId). A supplier may create only when
 *   this equals its own id (SCOPE_DENIED otherwise) — QueryScope on a creation
 *   command, exactly as reads. Required on targets with creation transitions.
 * @property {boolean} [requireCreationOwner] Opt-in (C4b): when `true`, the dispatcher enforces `creationOwner(payload)
 *   !== null` for EVERY persona — a BUYER included — so a buyer creation is
 *   validated against a governed relationship anchor, not merely the caller's
 *   word. A buyer creation whose owner the governed data cannot name is denied
 *   (SCOPE_DENIED), which stops a planner minting an entity for a supplier the
 *   world never names. Absent/`false` ⇒ EXACTLY today's behaviour: a buyer
 *   passes creation-scope even with a null owner (the RFQ / PR buyer-verb
 *   pattern), while the supplier `owner === scope.supplierId` check is
 *   unaffected either way (it already requires a non-null owner).
 * @property {(payload: Record<string, unknown>, toState: string, scope: QueryScope) => { entityId: string }} [create] Creation apply: mint the entity in `toState`; return its assigned id.
 *
 *   ⚠️ **`scope` IS THE THIRD PARAMETER FOR `applyTransition`'S REASON, AND IT
 *   ARRIVED ONE VERB LATER (§82).** A creation that must record WHO acted needs
 *   the SESSION's actor, and the only alternative is a caller-supplied payload
 *   field — `setBy`'s shape, which C10 §6.2 names ATTRIBUTION BY ASSERTION and
 *   permits only because nothing can construct a `RESOLVED` actor yet. The
 *   update path was given this seam at the PR approval; a creation had no way to
 *   reach it at all, so `t_supplierdoc_declare` would have had to take its
 *   declarer from the form. Every pre-§82 target ignores the parameter.
 */

/**
 * @typedef {object} PolicyDecision
 * @property {boolean} ok
 * @property {string} [reason]
 */

/**
 * The commanding scope — carried so a hook can read the SESSION's actor
 * (`scope.actor`) rather than a payload field. See `applyTransition` above:
 * a hook that policed `payload.approvedBy` would be policing an assertion.
 *
 * @typedef {(ctx: {
 *     entityId: string;
 *     currentState: string;
 *     toState: string;
 *     payload: Record<string, unknown>;
 *     target: CommandTarget;
 *     scope: QueryScope;
 *   }) => PolicyDecision} PolicyHookFn
 */

/** A command the dispatcher should fan out after a source transition (G4). */
/**
 * @typedef {object} CascadeCommand
 * @property {string} entity
 * @property {string} entityId
 * @property {string} transitionId
 * @property {Record<string, unknown>} [payload]
 */

/** Context handed to the cascade resolver after a successful source apply. */
/**
 * @typedef {object} CascadeContext
 * @property {string} transitionId
 * @property {string} entity
 * @property {string} entityId
 * @property {Record<string, unknown>} payload
 * @property {QueryScope} scope
 */

/** Context handed to the settle finalize (Step 3.5, Option B) on settlement. */
/**
 * @typedef {object} SettleContext
 * @property {string} entity
 * @property {string} transitionId
 * @property {string} entityId
 * @property {Record<string, unknown>} payload
 * @property {QueryScope} scope The scope the ORIGINATING command ran under (§43). `settle(correlationId)`
 *   takes no scope — the settlement is the SAP callback, not a fresh user act —
 *   so the second act's event would have had no `actor` to name. This carries it
 *   forward, which is literally what `TransitionEvent.scope` is documented as:
 *   *the scope the command ran under*. A `system:sap` actor was rejected —
 *   inventing an actor vocabulary to fill one field is a member with no
 *   definition, and the honest answer was already in hand.
 */

/**
 * @typedef {object} DispatcherDeps
 * @property {(scope: QueryScope) => readonly string[]} resolveRoles
 * @property {(entity: string) => CommandTarget | undefined} target
 * @property {(name: string) => PolicyHookFn | undefined} resolvePolicyHook
 * @property {AuditSink} sink
 * @property {() => string} nextCorrelationId
 * @property {() => string} now
 * @property {(ctx: CascadeContext) => readonly CascadeCommand[]} [cascade] Cross-entity cascade resolver (census G4). Given a successfully-applied
 *   source transition, returns the cascade commands to fire (adapter resolves
 *   WHICH target ids via cross-entity lookups). Absent ⇒ no cascades.
 * @property {(ctx: SettleContext) => void} [settleFinalize] SAP-boundary settlement finalize (Step 3.5, Option B). Runs when a
 *   `submitted` command settles: advances the interim→terminal state and
 *   assigns the real system reference, under the SAME correlationId. Absent ⇒
 *   settlement only flips the command status (the pre-Option-B behaviour).
 */

/**
 * @typedef {object} Dispatcher
 * @property {(scope: QueryScope, input: CommandInput, causationId?: string) => CommandResult} dispatch `causationId` groups this command's DR-10 events with an earlier command
 *   (the SubmissionSession anchor, SDC-3a; the cascade source, census G4)
 *   without collapsing its own correlationId. Absent ⇒ a directly-initiated
 *   command. Long the internal contract (cascades pass it); now on the type.
 * @property {(scope: QueryScope, correlationId: string) => CommandStatus | null} getCommandStatus Read a command's recorded status. **Scoped** — see `mayReach` below.
 *
 *   ⚠️ **THE SCOPE PARAMETER IS NEW HERE AND IS *NOT* NEW ON THE CONTRACT.**
 *   `ICommandService.getCommandStatus(scope, correlationId)` has taken a scope
 *   since it was written; `MockCommandService` named it `_scope` and dropped it,
 *   because THIS interface had nowhere to put it. The defect was always that the
 *   implementation discarded a parameter the seam already handed it. **Nothing
 *   an adapter author reads changes** — `IDataService`, `ICommandService` and
 *   C1's method table are byte-identical after this batch.
 * @property {(scope: QueryScope, correlationId: string) => CommandStatus | null} settle -  Settle a `submitted` command to `done` (Step 3.5 SAP settlement). Scoped.
 */

export {};
