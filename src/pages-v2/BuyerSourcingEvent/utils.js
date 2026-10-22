// ────────────────────────────────────────────────────────────────────────────
// BuyerSourcingEvent — pure helpers (no React state, no hooks).
//
// Moved out of `BuyerSourcingEvent.jsx` by the Phase 5 page split (no
// behaviour change).
// ────────────────────────────────────────────────────────────────────────────
/** @import { TFunction } from 'i18next' */
/** @import { RfxStageStep } from '../rfx/RfxStageBar' */

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

// ── RFx UX B-15 — the stage in words, and a round opened early ─────────────

/** @typedef {'draft' | 'collecting' | 'allIn' | 'windowClosed' | 'partly' | 'sap' | 'done' | 'cancelled'} StagePhase */

/**
 * The event's stage as the header says it ("Collecting quotes · round 1
 * open"), read from `rfqStageOf` and the status: the phase, and the number of
 * the latest open round when one is open. Display only: it decides nothing.
 * @param {Omit<StageInput, 'rounds'> & { rounds: readonly { closed: boolean; roundNumber: number }[] }} input
 * @returns {{ phase: StagePhase; openRound: number | null }}
 */
export function rfqStageLine(input) {
  const { next } = rfqStageOf(input);
  const open = input.rounds.filter((r) => !r.closed).map((r) => r.roundNumber);
  const openRound = open.length > 0 ? Math.max(...open) : null;
  /** @type {StagePhase} */
  const phase =
    next === 'cancelled'
      ? 'cancelled'
      : next === 'send'
        ? 'draft'
        : next === 'none'
          ? 'done'
          : next === 'sap'
            ? 'sap'
            : input.status === 'Partly awarded'
              ? 'partly'
              : input.status === 'Closed'
                ? 'windowClosed'
                : input.quoted < input.invited
                  ? 'collecting'
                  : 'allIn';
  return { phase, openRound };
}

/**
 * Whether a negotiation round opened now would open before the response
 * window closes: the RFQ is Open, its deadline has not passed, and an invited
 * supplier has still to quote. A WARNING, never a refusal: the verb allows it,
 * and a buyer may have reason to negotiate with the early quoters.
 * @param {{ status: import('@data/mockRfqs').RFQStatus; responseDeadline: string; nowIso: string; invited: number; quoted: number }} input
 * @returns {boolean}
 */
export function roundBeforeWindowCloses({ status, responseDeadline, nowIso, invited, quoted }) {
  return (
    status === 'Open' &&
    !!responseDeadline &&
    nowIso.slice(0, 10) <= responseDeadline.slice(0, 10) &&
    quoted < invited
  );
}

/**
 * The label key of the buyer's next act — ONE wording for the event page's
 * stage bar, the board's Next column and the side panel (B-15), so the three
 * cannot say different things about one RFQ. "quotes" splits on whether any
 * quote is in: with one in, the buyer can review it while the rest arrive.
 * @param {StageNext} next
 * @param {number} quoted
 * @returns {string}
 */
export const nextActKey = (next, quoted) =>
  next === 'quotes' && quoted > 0 ? 'rfx.stage.nextAct.reviewQuotes' : `rfx.stage.nextAct.${next}`;

/**
 * BL-220 — the RFQ event page's stage bar, as the shared `RfxStageBar` takes
 * it: six steps (Sent · Quotes in · Round · Award · Raised in SAP · Done) with
 * their details, where the event is (`rfqStageOf`), and the "Next" wording
 * (`nextActKey`). Moved out of the RFQ page's own `EventStageBar` (lane 1C)
 * unchanged.
 * @param {TFunction} t
 * @param {{
 *   rfq: import('@data/mockRfqs').RFQ;
 *   quoted: number;
 *   rounds: readonly { closed: boolean }[];
 *   inForce: readonly { status: string; lines: readonly unknown[] }[];
 * }} input
 * @returns {{ steps: RfxStageStep[]; current: number; next: StageNext; nextKey: string }}
 */
export function rfqStageBar(t, { rfq, quoted, rounds, inForce }) {
  const invited = rfq.invitedSupplierIds.length;
  const { current, next, roundSkipped } = rfqStageOf({
    status: rfq.status,
    invited,
    quoted,
    rounds,
    inForce
  });
  const openRounds = rounds.filter((r) => !r.closed).length;
  const withLines = inForce.filter((a) => a.lines.length > 0);
  /** @type {Record<(typeof STAGE_STEPS)[number], string>} */
  const detail = {
    sent: t('rfx.stage.d.suppliers', { count: invited }),
    quotesIn: t('rfx.stage.d.quoted', { quoted, invited }),
    round:
      openRounds > 0
        ? t('rfx.stage.d.roundOpen', { count: openRounds })
        : rounds.length > 0
          ? t('rfx.stage.d.roundHeld', { count: rounds.length })
          : t('rfx.stage.d.none'),
    award: inForce.length > 0 ? t(`rfx.status.${rfq.status}`) : '',
    sap:
      withLines.length > 0
        ? t('rfx.stage.d.ofTotal', {
            done: withLines.filter((a) => a.status === 'Raised in SAP').length,
            total: withLines.length
          })
        : '',
    done: ''
  };
  return {
    steps: STAGE_STEPS.map((key) => ({
      key,
      labelKey: `rfx.stage.${key}`,
      detail: detail[key],
      ...(key === 'round' && roundSkipped ? { skipped: true } : {})
    })),
    current,
    next,
    nextKey: nextActKey(next, quoted)
  };
}
