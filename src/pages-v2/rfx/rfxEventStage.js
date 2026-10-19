// ────────────────────────────────────────────────────────────────────────────
// RFx UX 2A (B-09) — where an RFI or an RFP stands, for the stage bar on its
// own event page (the RFQ page has `rfqStageOf` in `BuyerSourcingEvent/utils`).
//
// DISPLAY ONLY. These functions decide nothing: every act on the page is still
// offered by status and refused by the verb. They name the step the buyer is on
// and the act that would move the event on, read from the same status and
// counts the page already shows.
//
// `current` is the index of the step the buyer is on; `steps.length` means every
// step is done; -1 means the event was cancelled (no step).
// ────────────────────────────────────────────────────────────────────────────

/** RFI steps: sent to suppliers, answers coming in, closed. */
export const RFI_STAGE_STEPS = /** @type {const} */ (['sent', 'answersIn', 'closed']);

/** RFP steps: sent, proposals coming in, closed, award, done. */
export const RFP_STAGE_STEPS = /** @type {const} */ ([
  'sent',
  'proposalsIn',
  'closed',
  'award',
  'done'
]);

/**
 * @typedef {'send' | 'answers' | 'proposals' | 'close' | 'carry' | 'award' | 'none' | 'cancelled'} RfxNextAct
 */

/**
 * @typedef {object} RfxStage
 * @property {number} current
 * @property {RfxNextAct} next
 */

/**
 * @param {{ status: string; invited: number; responded: number; deadlinePassed: boolean }} e
 * @returns {RfxStage}
 */
export function rfiStageOf({ status, invited, responded, deadlinePassed }) {
  if (status === 'Cancelled') return { current: -1, next: 'cancelled' };
  if (status === 'Draft') return { current: 0, next: 'send' };
  if (status === 'Closed') return { current: RFI_STAGE_STEPS.length, next: 'carry' };
  // Open: answers are coming in until everyone answered or the window passed.
  return responded >= invited || deadlinePassed
    ? { current: 2, next: 'close' }
    : { current: 1, next: 'answers' };
}

/**
 * @param {{ status: string; invited: number; responded: number; deadlinePassed: boolean; priced: boolean }} e
 *   `priced`: the RFP carries indicative pricing — an RFP without it cannot be awarded.
 * @returns {RfxStage}
 */
export function rfpStageOf({ status, invited, responded, deadlinePassed, priced }) {
  if (status === 'Cancelled') return { current: -1, next: 'cancelled' };
  if (status === 'Draft') return { current: 0, next: 'send' };
  if (status === 'Open')
    return responded >= invited || deadlinePassed
      ? { current: 2, next: 'close' }
      : { current: 1, next: 'proposals' };
  if (status === 'Awarded') return { current: RFP_STAGE_STEPS.length, next: 'none' };
  // Closed or Partly awarded: the award step, when the RFP can be awarded.
  return priced ? { current: 3, next: 'award' } : { current: 4, next: 'none' };
}
