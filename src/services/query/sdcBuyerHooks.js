// ────────────────────────────────────────────────────────────────────────────
// SDC-4d — the P2 buyer-consolidation hooks.
//
// The planner-consolidation reads, moved OFF BuyerCollaboration's module-scope
// fixture consts onto buyer-scoped `useServiceQuery` over `svc.collaboration.*`
// (SDC-4b). They read the LIVE stores through the shared sdcClock (SDC-4a), so a
// P1 supplier write (declare / confirm) is reflected in the buyer's consolidation
// — the P1→P2 loop, closed on fixtures.
//
// BUYER-GATED by construction: the service returns the cross-supplier superset
// ONLY for a buyer scope and [] for a supplier scope (the honesty gate). The
// scope is derived from the current identity inside useServiceQuery, so on the
// #/buyer/* route these resolve the superset and on a supplier persona they
// resolve empty — a supplier can never see the consolidation.
//
// Publications themselves stay the frozen SOMO fixtures (their producer is the
// F2 C8 feed, not a supplier write) — BuyerCollaboration keeps reading those
// directly for the period bar; only the supplier-WRITTEN derivations live here.
// ────────────────────────────────────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServiceQuery, scopeKey } from './useServiceQuery';
import { useDataService } from '../data/DataServiceContext';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
/** @import { ConsolidationRow, SupplierCoverageEntry, SupplierRollup, ChaseEntry } from '../sdc' */
import {
  buildRequirementDisputePayload,
  buildRequirementResolutionPayload
} from '../sdc/submitModel';
/** @import { CommandResult } from '../data/types' */

/** The consolidation rows (every current-publication line + its response state).
 *  Buyer-scoped; a supplier persona resolves to []. */
export function useConsolidationRows() {
  return /** @type {typeof useServiceQuery<readonly ConsolidationRow[]>} */ (useServiceQuery)(
    ['sdc', 'consolidation'],
    async (svc, scope) => (await svc.collaboration.getConsolidation(scope)).items
  );
}

/** The per-supplier coverage entries (the ONE modeled projection). Buyer-scoped. */
export function useCoverageEntries() {
  return /** @type {typeof useServiceQuery<readonly SupplierCoverageEntry[]>} */ (useServiceQuery)(
    ['sdc', 'coverage'],
    async (svc, scope) => (await svc.collaboration.getCoverage(scope)).items
  );
}

/** The pre-scheduler chase list (overdue / partial), as of the shared clock.
 *  Buyer-scoped. */
export function useChaseEntries() {
  return /** @type {typeof useServiceQuery<readonly ChaseEntry[]>} */ (useServiceQuery)(
    ['sdc', 'chase'],
    async (svc, scope) => (await svc.collaboration.getChase(scope)).items
  );
}

/** The per-supplier response rollups (responded / partial / silent). Buyer-scoped. */
export function useSupplierRollups() {
  return /** @type {typeof useServiceQuery<readonly SupplierRollup[]>} */ (useServiceQuery)(
    ['sdc', 'rollups'],
    async (svc, scope) => (await svc.collaboration.getRollups(scope)).items
  );
}

// ─── C4c — the buyer RECORDING write (ruled option (d)) ───────────────────────
// A planner records an SOH assertion a supplier made over an ungoverned channel,
// firing the DISTINCT buyer verb `t_inventorydeclaration_record` under the BUYER
// scope (so the DR-10 actor is honestly the buyer).
//
// ⚠️ BL-73 — THE DISPATCH NO LONGER LIVES HERE. `useInventoryRecord` was the
// channel triage's own recording path (one field, its own rules); it was
// retired when the triage began pre-filling the Inventory page's entry form,
// which records through `useInventoryCommand` ('record'). The invalidation
// predicate below stays: the requirement-response writes further down use it.

const BUYER_SCOPE_KEY = scopeKey({ personaType: 'buyer', supplierId: null });

/**
 * C4c INVALIDATION CARVE-OUT. A normal command never disturbs another supplier's
 * cache (commandHooks / sdcSupplierHooks both say so). A buyer-recorded write is
 * the deliberate exception: it is ABOUT a SUBJECT supplier, so it MUST invalidate
 * (a) that subject supplier's OWN 'sdc' reads — else their portal SOH goes stale
 * in-session — and (b) the buyer consolidation (the recorded SOH feeds the P2
 * view). NO OTHER supplier is touched. Exported as a pure predicate so the
 * carve-out is unit-tested without a render.
 * @param {readonly unknown[]} queryKey
 * @param {string} subjectSupplierId
 * @returns {boolean}
 */
export function isRecordedDeclarationInvalidation(queryKey, subjectSupplierId) {
  if (queryKey[0] !== 'sdc') return false;
  const last = queryKey[queryKey.length - 1];
  return (
    last === scopeKey({ personaType: 'supplier', supplierId: subjectSupplierId }) ||
    last === BUYER_SCOPE_KEY
  );
}

// ─── R1b — the buyer's RESOLVE write (the dispute seam, closed) ───────────────
// #239 gave `t_requirementresponse_resolve` a required, proven, stored reason
// and left it with no caller. This is the caller. It is the FIRST mutation on
// the consolidation surface — that page was read-only end to end until now, and
// its honesty banner is updated in the same batch rather than left saying so.

// ────────────────────────────────────────────────────────────────────────────
// THE ONE DISPATCH SHAPE FOR EVERY BUYER ACT ON A REQUIREMENT RESPONSE.
//
// Four verbs now write to this entity from this seat (`_review`, `_accept`,
// `_dispute`, `_resolve`). Each needs the SAME three things and gets them
// wrong in the same three ways if written by hand: the scope must come from the
// live identity (not a literal), the actor must be the buyer (the dispatcher
// derives it, so passing one is the mistake), and the invalidation must reach
// the SUBJECT SUPPLIER and not only the buyer's own reads.
//
// ⚠️ **THE THIRD IS WHY THIS IS A FACTORY AND NOT A CONVENTION.** A wrong scope
// is a refusal and a wrong actor is a red test; a missing supplier-side
// invalidation is INVISIBLE from the buyer's screen — the write lands, the
// buyer's toast is green, and the party the write was ABOUT keeps seeing the
// old state until they reload. Nothing on the writing surface can notice it,
// which is exactly the kind of thing that must not be re-typed per verb.
// ────────────────────────────────────────────────────────────────────────────

/**
 * @template {RequirementResponseVars} V
 * @param {string} transitionId
 * @param {(vars: V) => Record<string, unknown>} payloadOf
 */
function useRequirementResponseCommand(transitionId, payloadOf) {
  const svc = useDataService();
  const { identity } = useCurrentIdentity();
  const qc = useQueryClient();

  return /** @type {typeof useMutation<CommandResult, Error, V>} */ (useMutation)({
    mutationFn: (vars) =>
      svc.commands.dispatch(
        {
          personaType: identity.personaType,
          supplierId: identity.supplierId,
          businessRoles: identity.businessRoles,
          actor: identity.actor
        },
        {
          transitionId,
          entity: 'requirementResponse',
          entityId: vars.responseId,
          payload: payloadOf(vars)
        }
      ),
    onSuccess: (result, { supplierId }) => {
      // ⚠️ `!== 'failed'` rather than `=== 'done'`: an Option-B verb settles
      // asynchronously and returns `submitted`, and treating that as a failure
      // would skip the invalidation on precisely the verbs that need it most.
      if (result.status !== 'failed') {
        qc.invalidateQueries({
          predicate: (q) => isRecordedDeclarationInvalidation(q.queryKey, supplierId)
        });
      }
    }
  });
}

/**
 * @typedef {object} ResolveDisputeVars
 * @property {string} responseId -  The disputed response being answered.
 * @property {string} supplierId The supplier the response belongs to — carried for INVALIDATION, never for
 *   authorization (the dispatcher derives the actor from the buyer scope). It is
 *   what lets the answer reach the party who did not write it in-session.
 * @property {string} resolutionReason -  The planner's authored answer. Required by the verb; blank dies at the
 *    machine (`rr_dispute_text_authored`) even if a caller gets past the form.
 */

/**
 * Resolve a disputed requirement response (fires `t_requirementresponse_resolve`,
 * `Disputed → UnderReview`) under the BUYER scope, so the DR-10 actor is honestly
 * the buyer.
 *
 * ⚠️ IT INVALIDATES THE SUBJECT SUPPLIER TOO, and that is the whole point of the
 * batch rather than a cache detail. A resolution the supplier cannot read is the
 * bare status change R1a already promised them wouldn't happen; invalidating only
 * the buyer's own reads would leave the answer sitting in the store while the
 * party it was written FOR still sees the dispute unanswered until they reload.
 * The predicate is `isRecordedDeclarationInvalidation` — reused verbatim from the
 * C4c carve-out because this is the same shape it was written for: a BUYER write
 * ABOUT a subject supplier. No other supplier is touched.
 */
export const useResolveRequirementDispute = () =>
  /** @type {typeof useRequirementResponseCommand<ResolveDisputeVars>} */ (
    useRequirementResponseCommand
  )('t_requirementresponse_resolve', (v) =>
    buildRequirementResolutionPayload({ resolutionReason: v.resolutionReason })
  );

// ────────────────────────────────────────────────────────────────────────────
// WAVE C — THE REVIEW LANE. `t_requirementresponse_review` · `_accept` ·
// `_dispute`, each of which had a complete machine, a wired CommandTarget, a
// held atom on the `planning` lane and NO CALLER.
//
// ⚠️ **THEY ARE THREE HOOKS OVER ONE FACTORY, AND THE FACTORY IS THE POINT.**
// The resolve hook above was the proven shape and it is now the factory's first
// caller rather than its neighbour — a second hand-written dispatch beside a
// working one is how the two drift, and the drift lands on the INVALIDATION
// predicate, which is the half no surface test notices until a supplier reloads.
//
// ⚠️ **AND EVERY ONE OF THEM INVALIDATES THE SUBJECT SUPPLIER, NOT ONLY THE
// BUYER.** `_review` moves the supplier's own line from *submitted* to *under
// review*, `_accept` closes it, `_dispute` writes words onto their ledger. All
// three are buyer writes ABOUT a supplier — exactly the shape
// `isRecordedDeclarationInvalidation` was written for — so a supplier watching
// their own forecast page sees each of them without reloading.
// ────────────────────────────────────────────────────────────────────────────

/** A payload-free buyer act on one supplier's response. */
/**
 * @typedef {object} RequirementResponseVars
 * @property {string} responseId -  The response being acted on.
 * @property {string} supplierId The supplier it belongs to — carried for INVALIDATION, never for
 *   authorization (the dispatcher derives the actor from the buyer scope).
 */

/** Raising a dispute: the same shape, plus the words the verb requires. */
/**
 * `disputeReason`: The planner's objection. Required by the verb; blank dies at the machine (`rr_dispute_text_authored`) even if a caller gets past the form.
 *
 * @typedef {RequirementResponseVars & {
 *     disputeReason: string;
 *   }} DisputeRequirementVars
 */

/**
 * Take the response under review (`t_requirementresponse_review`,
 * `Submitted → UnderReview`) under the BUYER scope.
 *
 * ⚠️ **IT IS NOT LOAD-BEARING FOR REACHABILITY AND THE COMMENT SAYS SO, BECAUSE
 * THE OPPOSITE IS THE EASY THING TO ASSUME.** `UnderReview` has a SECOND
 * producer — `t_requirementresponse_resolve` (`Disputed → UnderReview`), which
 * has shipped since R1b — so `_accept` and `_dispute` were already reachable
 * before this hook existed. Review is the lane's front door, not its only one,
 * and a future edit that deletes it does not strand the two verbs below.
 */
export const useReviewRequirementResponse = () =>
  /** @type {typeof useRequirementResponseCommand<RequirementResponseVars>} */ (
    useRequirementResponseCommand
  )('t_requirementresponse_review', () => ({}));

/**
 * Accept the reviewed confirmation (`t_requirementresponse_accept`,
 * `UnderReview → Accepted`).
 *
 * ⚠️ **`Accepted` IS TERMINAL — derived, not assumed: no transition in
 * `requirementResponse.flow.js` declares it as a `from` state.** The surface
 * says so before the act rather than discovering it afterwards.
 */
export const useAcceptRequirementResponse = () =>
  /** @type {typeof useRequirementResponseCommand<RequirementResponseVars>} */ (
    useRequirementResponseCommand
  )('t_requirementresponse_accept', () => ({}));

/**
 * Dispute the reviewed confirmation (`t_requirementresponse_dispute`,
 * `UnderReview → Disputed`), with the words the supplier will read.
 *
 * ⚠️ **THE TEXT IS NOT ASSEMBLED HERE.** `buildRequirementDisputePayload` has
 * existed since #239 with no caller; the draft layer is what keeps the payload
 * key derived from the verb rather than transcribed at each call site (§55).
 * It deliberately does NOT trim — `requiredFields` runs `isEmpty`, and
 * `isEmpty('   ')` is false, so a builder that trimmed would move the real
 * guard into the one layer a hand-crafted dispatch skips.
 */
export const useDisputeRequirementResponse = () =>
  /** @type {typeof useRequirementResponseCommand<DisputeRequirementVars>} */ (
    useRequirementResponseCommand
  )('t_requirementresponse_dispute', (v) =>
    buildRequirementDisputePayload({ disputeReason: v.disputeReason })
  );
