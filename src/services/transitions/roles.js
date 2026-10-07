// ────────────────────────────────────────────────────────────────────────────
// Persona → transition-role mapping (v2.2 Step 3.7), now DERIVED.
//
// Transition metadata names a `requiredRole` (namespaced, e.g. `po:confirm`).
// This module answers "which atoms does a PERSONA span?" — a TENANCY question,
// kept because `nextActorFrom`, `catalogView` and ~14 specs ask it.
//
// ⚠️ **`PERSONA_ROLES` IS NO LONGER THE AUTHORISATION SOURCE, AND IS NO LONGER
// AUTHORED.** It is now DERIVED from `SYSTEM_ROLES` × `PERSONA_SYSTEM_ROLES`
// (`businessRoles.js`), so it cannot drift from the bundles a session actually
// holds — the `FLOOR-IN-PROSE-01` shape, avoided by construction rather than by
// a second gate. The values it produces are BIT-IDENTICAL to the hand-authored
// table it replaced (asserted in `businessRoles.test.js` against the catalog),
// which is why every existing membership assertion stays green.
//
// **What changed is who reads it for a permission decision: nobody.** The
// dispatcher's `resolveRoles` now resolves through the SESSION's business roles
// (`session.js`), not through a persona. A persona spanning 48 atoms was the
// wildcard this arc retired; it survives here only as the question "could
// anybody on this side ever fire this verb?", which is what a persona badge and
// a next-actor line legitimately need.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PersonaType } from '@context/CurrentIdentityContext' */
/** @import { QueryScope, CapabilitySet } from '../data/types' */
import { getKnownFlows } from './registry';
import { PERSONA_SYSTEM_ROLES, atomsFor } from './businessRoles';
import { atomsForSeat } from './customRoles';

/**
 * Persona → the transition-roles anybody on that side may hold. DERIVED: the
 * union of that persona's system-role bundles. Not an authorisation grant —
 * see the header.
 * @type {Record<PersonaType, readonly string[]>}
 */
export const PERSONA_ROLES = {
  buyer: atomsFor(PERSONA_SYSTEM_ROLES.buyer),
  supplier: atomsFor(PERSONA_SYSTEM_ROLES.supplier)
};

/**
 * The transition-roles a persona spans.
 * @param {PersonaType} persona
 * @returns {readonly string[]}
 */
export function rolesForPersona(persona) {
  return PERSONA_ROLES[persona];
}

/**
 * True if `persona` spans a transition requiring `role` (tenancy, not authority).
 * @param {PersonaType} persona
 * @param {string} role
 * @returns {boolean}
 */
export function personaCan(persona, role) {
  return PERSONA_ROLES[persona].includes(role);
}

/**
 * Every requiredRole named across the registered flow catalog (deduped).
 * @returns {readonly string[]}
 */
export function catalogRoles() {
  const roles = /** @type {Set<string>} */ (new Set());
  for (const flow of getKnownFlows()) {
    for (const t of flow.transitions) roles.add(t.requiredRole);
  }
  return [...roles].sort();
}

/**
 * The capability set for a scope (Step 3.9): the roles it holds and the
 * transition ids it may initiate.
 *
 * ⚠️ **NOW HONOURS THE SCOPE'S BUSINESS ROLES WHEN IT CARRIES THEM.** A scope
 * with `businessRoles` reports the capabilities of THOSE bundles; a scope
 * without them falls back to the persona span, which is what every read-only
 * caller wants and is exactly the pre-batch answer.
 * @param {QueryScope} scope
 * @returns {CapabilitySet}
 */
export function capabilitiesFor(scope) {
  // `atomsForSeat` on the scope arm — a scope carries a SEAT's roles, which may
  // include a granted custom role. The persona arm stays `rolesForPersona`:
  // that is a TENANCY span, and a custom role is not a property of a side.
  const roles = scope.businessRoles
    ? atomsForSeat(scope.businessRoles)
    : rolesForPersona(scope.personaType);
  /** @type {string[]} */
  const transitions = [];
  for (const flow of getKnownFlows()) {
    for (const t of flow.transitions) {
      if (roles.includes(t.requiredRole)) transitions.push(t.id);
    }
  }
  return { roles, transitions };
}
