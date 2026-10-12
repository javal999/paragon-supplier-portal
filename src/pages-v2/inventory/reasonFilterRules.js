// ─────────────────────────────────────────────────────────────────────────────
// SHORTFALL REASON FILTER — CAP-5 (BL-174), pure half.
//
// The planner narrows a list by the supplier's shortfall reason: the
// commitment exceptions by `commitmentShortfall` (BR-01) and the PTI Capacity
// weeks by `capacityShortfall` (BR-02). Several reasons may be chosen; "No
// reason" is an option of its own. Each option carries its count (BR-03).
//
// The options are the administrator's ACTIVE codes in order (BL-32), plus any
// retired or unknown code a shown record still carries, so no record is out of
// the filter's reach, then "No reason". Nothing chosen means no filter.
// ─────────────────────────────────────────────────────────────────────────────

import { REASON_CODE } from '@services/transitions/reasonCodes';

/** "No reason" — cannot be a reason code: a code starts with a letter. */
export const NO_REASON = '_none';

/**
 * Does a record's reason pass the chosen reasons? Nothing chosen: everything passes.
 * @param {string | null | undefined} code
 * @param {readonly string[]} chosen
 * @returns {boolean}
 */
export function reasonMatches(code, chosen) {
  if (chosen.length === 0) return true;
  return code ? chosen.includes(code) : chosen.includes(NO_REASON);
}

/**
 * The filter's options with their counts: active codes in order, then any
 * other code the records carry, then "No reason".
 * @param {readonly string[]} activeCodes
 * @param {readonly (string | null | undefined)[]} recordReasons  One entry per record the filter narrows.
 * @returns {{ id: string; count: number }[]}
 */
export function reasonFilterOptions(activeCodes, recordReasons) {
  const present = recordReasons.filter(/** @returns {c is string} */ (c) => !!c);
  const ids = [...new Set([...activeCodes, ...present])];
  /** @param {string} id */
  const count = (id) => present.filter((c) => c === id).length;
  return [
    ...ids.map((id) => ({ id, count: count(id) })),
    { id: NO_REASON, count: recordReasons.filter((c) => !c).length }
  ];
}

/**
 * Add or remove one reason from the chosen list.
 * @param {readonly string[]} chosen
 * @param {string} id
 * @returns {string[]}
 */
export const toggleReason = (chosen, id) =>
  chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id];

/**
 * The chosen reasons as an address parameter value (comma-separated), and back.
 * A member that is neither a code nor "No reason" makes the list malformed.
 * @param {string | null} raw
 * @returns {{ kind: 'absent' } | { kind: 'ok'; value: string[] } | { kind: 'malformed' }}
 */
export function parseReasonParam(raw) {
  if (raw === null || raw === '') return { kind: 'absent' };
  const parts = raw.split(',').map((p) => p.trim());
  return parts.every((p) => p === NO_REASON || REASON_CODE.test(p))
    ? { kind: 'ok', value: [...new Set(parts)] }
    : { kind: 'malformed' };
}
