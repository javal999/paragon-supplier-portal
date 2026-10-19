// ────────────────────────────────────────────────────────────────────────────
// BuyerSourcingEvent — pure helpers (no React state, no hooks).
//
// Moved out of `BuyerSourcingEvent.jsx` by the Phase 5 page split (no
// behaviour change).
// ────────────────────────────────────────────────────────────────────────────

/**
 * The quote with this id — the comparison rows read it by id, never by index.
 * @template {{ id: string }} T
 * @param {readonly T[]} rows
 * @param {string} id
 * @returns {T}
 */
export function byId(rows, id) {
  return /** @type {T} */ (rows.find((r) => r.id === id));
}

// ── RFx UX 1C (B-01) — where the event stands ──────────────────────────────

/** The six steps of the stage bar, in order. */
export const STAGE_STEPS = /** @type {const} */ ([
  'sent',
  'quotesIn',
  'round',
  'award',
  'sap',
  'done'
]);

/** What the "Next" pill names, by stage. */
/** @typedef {'send' | 'quotes' | 'round' | 'award' | 'sap' | 'none' | 'cancelled'} StageNext */

/**
 * @typedef {object} StageInput
 * @property {import('@data/mockRfqs').RFQStatus} status
 * @property {number} invited - Suppliers invited.
 * @property {number} quoted - Suppliers with a current quote.
 * @property {readonly { closed: boolean }[]} rounds - The event's negotiation rounds.
 * @property {readonly { status: string; lines: readonly unknown[] }[]} inForce - Awards in force.
 */

/**
 * The stage an RFQ is at, derived from state it already has: its status, the
 * quotes in, its rounds and the awards in force. Nothing is stored for it.
 * `current` is the index into `STAGE_STEPS` of the step the buyer is on;
 * `STAGE_STEPS.length` means every step is done; -1 means Cancelled (no step).
 * Steps before `current` are done; "Round" is skipped (`roundSkipped`) when
 * the event moved past it without one.
 * @param {StageInput} input
 * @returns {{ current: number; next: StageNext; roundSkipped: boolean }}
 */
export function rfqStageOf({ status, invited, quoted, rounds, inForce }) {
  const openRounds = rounds.filter((r) => !r.closed).length;
  const withLines = inForce.filter((a) => a.lines.length > 0);
  const allInSap = withLines.length > 0 && withLines.every((a) => a.status === 'Raised in SAP');
  /** @type {{ current: number; next: StageNext }} */
  const at =
    status === 'Cancelled'
      ? { current: -1, next: 'cancelled' }
      : status === 'Draft'
        ? { current: 0, next: 'send' }
        : status === 'Awarded'
          ? allInSap || withLines.length === 0
            ? { current: STAGE_STEPS.length, next: 'none' }
            : { current: 4, next: 'sap' }
          : openRounds > 0
            ? { current: 2, next: 'round' }
            : status === 'Open' && quoted < invited
              ? { current: 1, next: 'quotes' }
              : { current: 3, next: 'award' };
  return { ...at, roundSkipped: rounds.length === 0 && at.current > 2 };
}
