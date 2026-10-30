// ─────────────────────────────────────────────────────────────────────────────
// THE SETTING — the `EnforcementSetting` record shape, types only. Split out
// of `enforcement.js` (BL-229) so the ratchet and the ledger can both read the
// one declaration without either owning it.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { RelaxedMode } from './ramp' */
/** @import { GovernedCheckId } from './governed' */
/** @import { ActorAttribution } from './attribution' */

// ─── The setting (declared here; seeded, stored and served at E2) ────────────

/**
 * ONE recorded decision about how hard ONE check bites. `FxPin`-shaped: it is
 * a FACT WITH AN AUTHOR AND AN INSTANT, not a constant — which is why it lives
 * behind the seam and not in this file.
 *
 * ⚠️ **`reviewBy` IS REQUIRED (NON-NULL) FOR ANY MODE BELOW `BLOCK`**, and the
 * union below is how: the relaxed arm has `reviewBy: string`, so a relaxation
 * WITHOUT A REVIEW DATE DOES NOT TYPECHECK. It is not a validation somebody can
 * forget to run. At `BLOCK` it may be `null` — full rigour is not a relaxation,
 * so there is nothing to renew.
 *
 * ⚠️ **NOT SEEDED AT E1.** No fixture, no store, no service method. Declaring
 * the shape is E1; supplying values behind `useDataService()` is E2.
 */
/**
 * WHO decided — a discriminated attribution, not a bare person (E2 ruling).
 * An UNATTRIBUTED setter may still record a TIGHTENING; a LOOSENING is refused
 * at the recording verb (`enforcement_set_governed`). Not a role, and not
 * "the system".
 *  When the decision was recorded (ISO instant). Audit, not expiry. STORE-
 *  ASSIGNED at the moment of the act (the `pinnedAt` discipline): a caller
 *  that could set it could backdate its own audit entry.
 *  The day (ISO `YYYY-MM-DD`) by which this relaxation must be decided
 *  about again. REQUIRED — see above. Past it, the ratchet bites.
 *  `null` is legal at full rigour and means what it says: there is no
 *  relaxation whose lapse anyone need care about.
 *
 * @typedef {{
 *     readonly checkId: GovernedCheckId;
 *     readonly setBy: ActorAttribution;
 *     readonly setAt: string;
 *   } & (
 *     | {
 *         readonly mode: RelaxedMode;
 *         readonly reviewBy: string;
 *       }
 *     | {
 *         readonly mode: 'BLOCK';
 *         readonly reviewBy: string | null;
 *       }
 *   )} EnforcementSetting
 */

export {};
