// ─────────────────────────────────────────────────────────────────────────────
// WHO ACTED — `ActingPerson`, the closed `UNATTRIBUTED_REASONS`, the
// discriminated `ActorAttribution`, and its boundary `asActorAttribution`.
// Split out of `enforcement.js` (BL-229) because attribution is read far
// beyond enforcement (most `@lib/enforcement` importers want only
// `ActorAttribution`) and it depends on nothing else here.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Who acted ───────────────────────────────────────────────────────────────

/**
 * The person who took a recorded act — set a mode, or overrode a verdict.
 *
 * ⚠️ **A NAMED PERSON, NEVER A ROLE.** Two fields rather than one, deliberately:
 * a stable `personId` that survives a rename, and the `displayName` as it stood
 * AT THE MOMENT OF THE ACT, so an audit reads the same in five years. "Buyer"
 * has nowhere to go. See the header for what this shape can and cannot enforce
 * — the real check is E3's session, and `ENF-NO-PERSON-IN-IDENTITY-01` records
 * that the session has no person in it today.
 */
/**
 * `personId`:  The identity that acted. Stable; never a role code.
 * `displayName`:  The name as it stood when the act was recorded. Captured, never resolved  at read — a person who leaves must not erase who decided.
 *
 * @typedef {{
 *   readonly personId: string;
 *   readonly displayName: string;
 * }} ActingPerson
 */

/**
 * Why an act could not name the person who took it. A CLOSED VOCABULARY, for
 * the same reason `OVERRIDE_REASONS` is one: an absence nobody can count is an
 * absence nobody can fix.
 *
 * ⚠️ **THERE IS NO `SYSTEM` MEMBER, AND THAT IS THE POINT.** "The system did
 * it" is the comfortable label that makes an unattributed act look answered;
 * every member here names a FAILURE TO RESOLVE A HUMAN, which is a thing
 * somebody can go and fix. Both are PROVISIONAL pending operator ratification,
 * on the `OVERRIDE_REASONS` precedent — recorded as decisions TAKEN so that
 * ratifying is agreeing with something written down.
 */
export const UNATTRIBUTED_REASONS = Object.freeze(
  /** @type {const} */ ([
    /** Today's state, exactly: `CurrentIdentity` is `{ personaType, supplierId,
     *  supplierName }` and the portal has no notion of a person at all
     *  (`ENF-NO-PERSON-IN-IDENTITY-01`). */
    'NO_PERSON_IN_SESSION',
    /** F1 identity exists and did not answer. A DIFFERENT fact from the above —
     *  one is a missing capability, the other a failing one, and collapsing them
     *  would hide the day the first was fixed. */
    'IDENTITY_PROVIDER_UNAVAILABLE'
  ])
);

/** The unattributable reasons as a type. DERIVED from the list. */
/** @typedef {(typeof UNATTRIBUTED_REASONS)[number]} UnattributedReason */

/**
 * WHO TOOK A RECORDED ACT — **a discriminated attribution, never a bare name**
 * (the operator's ruling on `ENF-NO-PERSON-IN-IDENTITY-01`; see the header).
 *
 * An act either names a person or says WHY IT CANNOT. There is deliberately no
 * third shape and no optional field: a nullable `person` would let an absence
 * pass every check a presence passes, which is how an anonymous unlock gets
 * written down as an override.
 */
/**
 * @typedef {| { readonly kind: 'RESOLVED'; readonly person: ActingPerson }
 *   | { readonly kind: 'UNATTRIBUTED'; readonly reason: UnattributedReason }} ActorAttribution
 */

/** The resolved arm, for the places that need the person itself. */
/** @typedef {Extract<ActorAttribution, { kind: 'RESOLVED' }>} ResolvedActor */

/** Does this act name a person? The ONE predicate the accountability rules read
 *  — `overrideCompletes` and the loosening gate both go through it, so "named"
 * @param {ActorAttribution} actor
 * @returns {actor is ResolvedActor}
 *  means the same thing in both places. */
export function isAttributed(actor) {
  return actor.kind === 'RESOLVED';
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
const nonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * Narrow an arbitrary value to an `ActorAttribution` — **the boundary the
 * recording verb must use**, and the third member of the `isEnforcementMode` /
 * `isGovernedCheckId` family. An actor arrives from behind the seam as JSON,
 * and JSON has no discriminated unions.
 *
 * ⚠️ **A MALFORMED ACTOR IS `undefined`, NOT AN UNATTRIBUTED ONE.** Coercing
 * garbage into `UNATTRIBUTED` would give every typo a legitimate-looking
 * absence to hide in, and `UNATTRIBUTED` is a CLAIM — "no person could be
 * resolved, and here is why". The caller refuses instead.
 *
 * A `RESOLVED` actor needs BOTH fields non-empty: a blank `displayName` beside a
 * real `personId` is an audit that reads as nobody in five years, and a blank
 * `personId` is a name that survives nothing.
 * @param {unknown} value
 * @returns {ActorAttribution | undefined}
 */
export function asActorAttribution(value) {
  if (typeof value !== 'object' || value === null) return undefined;
  const actor = /** @type {Record<string, unknown>} */ (value);
  if (actor.kind === 'RESOLVED') {
    const person = /** @type {Record<string, unknown> | undefined} */ (actor.person);
    if (typeof person !== 'object' || person === null) return undefined;
    if (!nonEmptyString(person.personId) || !nonEmptyString(person.displayName)) return undefined;
    return {
      kind: 'RESOLVED',
      person: { personId: person.personId, displayName: person.displayName }
    };
  }
  if (actor.kind === 'UNATTRIBUTED') {
    return /** @type {readonly string[]} */ (UNATTRIBUTED_REASONS).includes(
      /** @type {string} */ (actor.reason)
    )
      ? { kind: 'UNATTRIBUTED', reason: /** @type {UnattributedReason} */ (actor.reason) }
      : undefined;
  }
  return undefined;
}
