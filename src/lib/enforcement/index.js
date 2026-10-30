// ─────────────────────────────────────────────────────────────────────────────
// `@lib/enforcement` — THE BARREL. Re-exports every name the single-file
// `enforcement.js` exported, so no importer changed when it became this folder
// (BL-229). It also keeps the module header below, because the rulings in it
// govern every file here: ramp · governed · attribution · setting · ratchet ·
// ledger · override · stamp.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CP-3 · E1 — THE ENFORCEMENT VOCABULARY. HEADLESS.
//
// THE OPERATOR'S RULING THIS ANSWERS: during implementation we must be able to
// relax rules and, step by step, turn them all on — more flexibility in the
// first months, then increasing rigour. This module is the words for that, and
// nothing else.
//
// ── THE GOVERNING DISTINCTION ───────────────────────────────────────────────
//
//   RELAXING ENFORCEMENT IS LEGITIMATE; RELAXING HONESTY IS NOT.
//
//   A gate that lets a receipt through WHILE TELLING YOU IT DID is an
//   operational choice. A gate that lets it through SILENTLY is a lie. Every
//   shape below exists to make the first expressible and the second
//   unrepresentable: there is no mode that hides a question, no verdict that
//   can be relaxed into silence, and no override that can be recorded without
//   naming a person, a reason and the exact verdict it overrode.
//
// ── ⚠️ THE BOUNDARY, RATIFIED AS A SENTENCE AND PINNED AS A TEST ────────────
//
//   ENFORCEMENT MODE RELAXES THE CONSEQUENCE OF AN ANSWER;
//   NOTHING MAY RELAX THE ABSENCE OF A QUESTION.
//
//   Three non-passing shapes exist and the mode governs exactly TWO of them —
//   answered-and-adverse (`ADVERSE`) and asked-and-unanswered (`UNANSWERED`).
//   The third — a REFUSAL (`UNKNOWN_MATERIAL`, `UNDETERMINED_APPLICABILITY`) —
//   is outside its domain STRUCTURALLY, not as policy. The reasoning is
//   `OBSERVE`'s own promise: *record instead of block*. A REFUSAL IS THE
//   STATEMENT THAT THE QUESTION COULD NOT BE POSED — there is no answer to
//   record, so there is nothing to observe. A refusal admitted under `OBSERVE`
//   would be NO CHECK, ANNOTATED.
//
//   The mechanism is absence: the refusal shapes are NOT members of
//   `GovernedVerdict`, so no mode can be applied to one without inventing a
//   value the union does not contain. `REFUSALS_OUTSIDE_ENFORCEMENT` derives
//   from the two lookups' OWN unions (`halalOf` / `bpomOf`), so a third refusal
//   reason authored tomorrow BREAKS THIS BUILD until somebody consciously
//   places it — it cannot arrive as a governed verdict by drift.
//
// ── ⚠️ THERE IS DELIBERATELY NO FOURTH MODE BELOW `OBSERVE` ─────────────────
//   `OFF` / `DISABLED` / `SKIP` — a mode that HIDES the question — is the exact
//   fail-open that `inferBpom` and `inferHalal` were retired for
//   (`INFERHALAL-READS-PROSE-01`, `BPOM-OFF-BY-SPACE-01`): a regulatory answer
//   produced without a regulatory question. **ITS ABSENCE FROM THE UNION IS
//   THE MECHANISM, NOT A CONVENTION** — exactly as `HALAL_CERT_TYPES` names
//   three schemes and a seventh `CertType` added tomorrow is not halal-class
//   until somebody says so. `enforcement.test.js` pins the absence: the first
//   member is `OBSERVE`, the union has three members, and no member — and no
//   line of this module's code — carries the fail-open lexicon. Adding one
//   turns that suite red, which is the point of writing it down.
//
//   `OBSERVE` is therefore the floor, and it is NOT "off": it still poses the
//   question, still records the answer, and still stamps what it saw. What it
//   relaxes is the CONSEQUENCE.
//
// ── ⚠️ VOCABULARY HERE · SETTING BEHIND THE SEAM (Seat 3's correction) ──────
//   The precedent for a governed relaxation is **`FxPin`, NOT `currencyPolicy`**.
//   `currencyPolicy` holds DEPLOY-EDITED CONSTANTS and says so in its own voice
//   ("a plain editable constant BY DESIGN"); "moved by a recorded act" and
//   "deploy-edited constant" are mutually exclusive in one artifact. So:
//
//     · THE VOCABULARY IS CODE — this file. A declared list, a derived type, a
//       pure function. Nothing here is a setting and nothing here is tunable.
//     · THE SETTING IS DATA BEHIND THE SEAM — `FxPin`-shaped: recorded by a
//       named person at an instant, superseded by appending rather than edited,
//       and read through `useDataService()`. **E1 DECLARED `EnforcementSetting`
//       AND SEEDED NOT ONE.** E2 supplies the store, the recording verb and the
//       read seam — AND STILL SEEDS NOT ONE (see below).
//
// ── E2 — WHAT THIS FILE GAINED, AND WHAT IT DID NOT ────────────────────────
//   The DERIVATION over the ledger lives here, beside the type it reads, on the
//   `effectivePin` precedent (`fxPin.js`): `settingInForce` picks the last
//   recorded act, `effectiveEnforcement` folds the ratchet onto it, and
//   `settingHistory` proves the superseded ones are still there. All three are
//   PURE and take the ledger as an argument — the STORE is `enforcementSetting
//   Store`, the VERB is `t_enforcement_set`, and neither is named in this file.
//   The clock stays out: `setAt` / `overriddenAt` are recorded BY the store at
//   the moment of the act (the `pinnedAt` discipline — a caller that could set
//   it could backdate its own audit entry), and every function here still takes
//   its instant as an argument.
//
//   ⚠️ **NOTHING IS SEEDED, AND THAT IS A RULING, NOT A GAP.** The ledger ships
//   EMPTY. An empty ledger derives `BLOCK` — maximum rigour — with the source
//   `NO_SETTING_RECORDED`, so the un-governed state is the safe one and no
//   relaxation exists until somebody records one. Seeding anything below `BLOCK`
//   would be a relaxation of shipped behaviour, which is D-ENF-4 and UNRULED.
//
// ── ⚠️ E2 — THE RULING ON `ENF-NO-PERSON-IN-IDENTITY-01` (operator) ─────────
//   An override's ENTIRE VALUE IS ACCOUNTABILITY — this named person accepted
//   this risk on this date. `CurrentIdentity` carries a persona, a tenant and a
//   company; NO HUMAN. So an actor is a DISCRIMINATED ATTRIBUTION
//   (`ActorAttribution`): either a RESOLVED identity, or UNATTRIBUTED carrying
//   the reason it could not be resolved.
//
//     AN UNATTRIBUTED OVERRIDE CANNOT COMPLETE. THE MODE FALLS THROUGH TO
//     `BLOCK`. THE OVERRIDE LANE IS FULLY BUILT AND UNUSABLE UNTIL IDENTITY
//     EXISTS.
//
//   The three obvious answers each fail: waiting for F1 OIDC blocks E3
//   indefinitely; CAPTURING A TYPED NAME IS FORGEABLE AND WORSE THAN NOTHING
//   BECAUSE IT LOOKS LIKE ATTRIBUTION; dropping attribution makes an override AN
//   ANONYMOUS UNLOCK. This is the `UNDETERMINED` shape instead — AN EXPLICIT
//   ABSENCE THAT REFUSES, NOT A VALUE THAT PROCEEDS — and it makes the gap
//   CREATE PRESSURE rather than be papered over: a built lane that is visibly
//   unusable is how F1 identity gets prioritised.
//
//   The same attribution governs `setBy`, and this is where "tightening is
//   always legal" bites: a TIGHTENING may be recorded by an unattributed actor
//   (it removes a relaxation — refusing it would be the wrong direction to fail),
//   a LOOSENING may not. THE SAFEST ACT IS ALWAYS AVAILABLE TO ANYBODY.
//
// ── LAW 0.5 — WHY `dispatchInstant` IS AN ARGUMENT AND NEVER A CLOCK READ ───
//   Same discipline as `receiptInstant` (H3), for the same reason. The ratchet
//   below is clock-DERIVED, so it cannot be stored, and the instant it is
//   evaluated against cannot be read from the ambient clock inside a function
//   whose job is to answer *as of the moment a command was dispatched*. Main
//   carries the corpses that prove the storing half (`buyerCompliance.ts`
//   `daysRemaining: 873`, 483 days stale; and one more, RETIRED below).
//
//   ⚠️ RETIRED: *"`supplierDocuments.js` doc-001 `'Expiring Soon'` on a
//   certificate 84 days expired"*. True at `256f053` (2026-09-08 08:42 +0700),
//   falsified at `8c68d77` (11:34 +0700), which shifted that fixture to
//   `DECLARED_PRESENT` without opening this file. Against the shifted export
//   doc-001 has not expired and every stored status agrees with
//   `documentExpiry`. It is quoted rather than deleted because the paragraph's
//   POINT survives it exactly: a hand-written day-count in a comment about
//   hand-written day-counts went stale in three hours, and the same fact was
//   written as `84` here and `116` in the certs widget a day apart. The
//   `buyerCompliance.ts` corpse is unaffected. Nothing here is stored
//   and nothing here reads a clock; the suite PINS determinism rather than
//   asserting it, and the pin is only possible BECAUSE the instant is an
//   argument.
//
// ── ⚠️ WHAT THIS MODULE CANNOT ENFORCE, STATED RATHER THAN IMPLIED ──────────
//   `overriddenBy` must be A NAMED PERSON, NEVER A ROLE. A type cannot check
//   personhood, and a blocklist of role words would be a PROSE PARSE — the very
//   class this lane just retired twice. What the shape can do is make a role
//   AWKWARD rather than natural: `ActingPerson` requires BOTH a stable
//   `personId` and the `displayName` captured at the moment of the act, so
//   there is no single field into which "Buyer" fits. **THE REAL ENFORCEMENT IS
//   AT E3, WHERE THE IDENTITY COMES FROM THE SESSION AND NOT FROM A TEXT
//   FIELD** — and `ENF-NO-PERSON-IN-IDENTITY-01` (`docs/findings.md`) records
//   what that will cost: `CurrentIdentity` today is `{ personaType, supplierId,
//   supplierName }`. THE PORTAL HAS NO NOTION OF A PERSON AT ALL. E3 cannot
//   source an `ActingPerson` from anything that exists today.
// ─────────────────────────────────────────────────────────────────────────────

export {
  ENFORCEMENT_MODES,
  MAXIMUM_RIGOUR,
  isEnforcementMode,
  rigour,
  blocks,
  overrideAllowed,
  tighten
} from './ramp';
/** @typedef {import('./ramp').EnforcementMode} EnforcementMode */
/** @typedef {import('./ramp').RelaxedMode} RelaxedMode */

export {
  GOVERNED_CHECK_IDS,
  isGovernedCheckId,
  GOVERNED_VERDICTS,
  isGovernedVerdict,
  REFUSALS_OUTSIDE_ENFORCEMENT
} from './governed';
/** @typedef {import('./governed').GovernedCheckId} GovernedCheckId */
/** @typedef {import('./governed').GovernedVerdict} GovernedVerdict */
/** @typedef {import('./governed').OverridableVerdict} OverridableVerdict */

export { UNATTRIBUTED_REASONS, isAttributed, asActorAttribution } from './attribution';
/** @typedef {import('./attribution').ActingPerson} ActingPerson */
/** @typedef {import('./attribution').UnattributedReason} UnattributedReason */
/** @typedef {import('./attribution').ActorAttribution} ActorAttribution */
/** @typedef {import('./attribution').ResolvedActor} ResolvedActor */

/** @typedef {import('./setting').EnforcementSetting} EnforcementSetting */

export { ENFORCEMENT_MODE_SOURCES, isReviewDay, effectiveMode } from './ratchet';
/** @typedef {import('./ratchet').EnforcementModeSource} EnforcementModeSource */
/** @typedef {import('./ratchet').EffectiveEnforcement} EffectiveEnforcement */

export { settingInForce, settingHistory, effectiveEnforcement } from './ledger';

export { OVERRIDE_REASONS, overrideCompletes, effectiveWithOverride } from './override';
/** @typedef {import('./override').OverrideReason} OverrideReason */
/**
 * @template {OverridableVerdict} [V=OverridableVerdict]
 * @typedef {import('./override').EnforcementOverride<V>} EnforcementOverride
 */

export { isCoherentStamp } from './stamp';
/** @typedef {import('./stamp').GovernedCheckStampBase} GovernedCheckStampBase */
/** @typedef {import('./stamp').GovernedCheckStamp} GovernedCheckStamp */
/**
 * @template {GovernedVerdict} V
 * @typedef {import('./stamp').StampFor<V>} StampFor
 */
/**
 * @template {GovernedVerdict} V
 * @typedef {import('./stamp').StampPerVerdict<V>} StampPerVerdict
 */
