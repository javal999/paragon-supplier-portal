// ────────────────────────────────────────────────────────────────────────────
// BuyerCollaboration — pure helpers (no React): the DSG height pin, the verb
// gate asked of the machine, the response behind a row, the supplier name and
// the period-level commitment class. Moved out of `BuyerCollaboration.jsx` by
// the Phase 5 page split (no behaviour change).
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { ConsolidationRow, CommitmentClass, RequirementResponse } from '@services/sdc' */
import { mockSuppliers } from '@data/mockSuppliers';
import { userVerbsFrom } from '@services/transitions';
import { CURRENT, RESOLVE_VERB } from './const';

/**
 * The `--plan-dsg-h` pin for a DSG container (anti-trembling, planGrid.css).
 * @param {number} h
 */
export const dsgVar = (h) => /** @type {React.CSSProperties} */ ({ '--plan-dsg-h': `${h}px` });

/**
 * Does the machine offer `verbId` from `state`? One helper for all four verbs,
 * so no section can drift onto a status literal while its neighbours ask the
 * flow. `userVerbsFrom` reads `surfaceable` (S51), so a verb the flow marks
 * unsurfaced never reaches a list here even when its from-state matches.
 * @param {string} verbId
 * @param {string} state
 * @returns {boolean}
 */
export const offers = (verbId, state) =>
  userVerbsFrom('requirementResponse', state).some((v) => v.id === verbId);

/**
 * @param {string} state
 * @returns {boolean}
 */
export const offersResolve = (state) => offers(RESOLVE_VERB, state);

/** The response behind a row's state, when the state carries one. `awaiting`
 * @param {ConsolidationRow['state']} state
 * @returns {RequirementResponse | null}
 *  does not: nobody answered, so there is nothing to dispute or resolve. */
export const responseOf = (state) => ('response' in state ? state.response : null);

/**
 * @param {string} id
 * @returns {string}
 */
export const supplierName = (id) => mockSuppliers.find((s) => s.id === id)?.name ?? id;

/** The PERIOD-level commitment class (period-global firm, design §3.1): one
 * @param {string} bucket
 * @returns {CommitmentClass | 'mixed'}
 *  class per bucket in the fixtures; 'mixed' only if a bucket ever splits. */
export function periodClass(bucket) {
  const classes = new Set(
    (CURRENT?.lines ?? []).filter((l) => l.periodBucket === bucket).map((l) => l.commitmentClass)
  );
  return classes.size === 1 ? [...classes][0] : 'mixed';
}
