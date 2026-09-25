// ────────────────────────────────────────────────────────────────────────────
// THE AWARD IN FORCE — cancel and "Raised in SAP" (RFx C2; NR-3 BR-09 to BR-11;
// AR-08). Pure: no store, no clock.
//
// An award record is never edited. A cancellation and a SAP marking are each
// APPENDED as their own record naming the award, and an award's status is
// derived from them here: `Raised in SAP` once marked, else `Cancelled` once
// cancelled, else `Active`. The verbs' policy hooks and the read model both ask
// this module, so a screen (task C3) can pre-check with the same functions.
// ────────────────────────────────────────────────────────────────────────────

import type { AwardCancellation, AwardRecord, AwardSapMark, AwardStatus } from './types';

/** The appended records an award's status is derived from. */
export interface AwardTrail {
  readonly cancellations: readonly AwardCancellation[];
  readonly sapMarks: readonly AwardSapMark[];
}

/** The cancellation appended for an award, if any. */
export const cancellationOf = (awardId: string, trail: AwardTrail): AwardCancellation | undefined =>
  trail.cancellations.find((c) => c.awardId === awardId);

/** The SAP marking appended for an award, if any. */
export const sapMarkOf = (awardId: string, trail: AwardTrail): AwardSapMark | undefined =>
  trail.sapMarks.find((m) => m.awardId === awardId);

/**
 * An award's status. The verbs make the two records exclusive (a cancelled
 * award cannot be marked, a marked one cannot be cancelled), and the SAP
 * marking is checked first so the status stays total if a trail ever held both.
 */
export function awardStatusOf(awardId: string, trail: AwardTrail): AwardStatus {
  if (sapMarkOf(awardId, trail)) return 'Raised in SAP';
  if (cancellationOf(awardId, trail)) return 'Cancelled';
  return 'Active';
}

/**
 * The awards still in force: every award not cancelled. A SAP-marked award is
 * in force (it is the award SAP now holds). The award rule reads only these as
 * "already awarded", so a cancelled award's items are open to a new award.
 */
export const awardsInForce = <A extends Pick<AwardRecord, 'id'>>(awards: readonly A[], trail: AwardTrail): A[] =>
  awards.filter((a) => awardStatusOf(a.id, trail) !== 'Cancelled');

export type AwardCancelRefusalCode =
  | 'AWARD_NOT_ACTIVE'
  | 'AWARD_RAISED_IN_SAP'
  | 'AWARD_REASON_REQUIRED'
  | 'AWARD_CANCEL_TARGET_WRONG'
  | 'AWARD_SAP_DOCUMENT_REQUIRED';

export interface AwardCancelRefusal {
  readonly code: AwardCancelRefusalCode;
  /** The award the refusal is about, or the SAP document that blocks it. */
  readonly detail?: string;
}

/** The refusal as the verb reports it: the code, then what it is about. */
export function awardCancelRefusalText(r: AwardCancelRefusal): string {
  switch (r.code) {
    case 'AWARD_NOT_ACTIVE':
      return `AWARD_NOT_ACTIVE: ${r.detail} is not an active award of this event`;
    case 'AWARD_RAISED_IN_SAP':
      return `AWARD_RAISED_IN_SAP: the award was raised in SAP as ${r.detail}; change it in SAP`;
    case 'AWARD_REASON_REQUIRED':
      return 'AWARD_REASON_REQUIRED: cancelling an award needs a reason';
    case 'AWARD_CANCEL_TARGET_WRONG':
      return `AWARD_CANCEL_TARGET_WRONG: ${r.detail}`;
    case 'AWARD_SAP_DOCUMENT_REQUIRED':
      return 'AWARD_SAP_DOCUMENT_REQUIRED: marking an award raised in SAP needs the SAP document number';
  }
}

/**
 * The award named by the command, when it belongs to this event and is not
 * cancelled; otherwise the AWARD_NOT_ACTIVE refusal. A SAP-marked award is
 * returned: each verb decides what the marking means for it.
 */
function awardOnEvent(
  awardId: string,
  eventAwards: readonly Pick<AwardRecord, 'id'>[],
  trail: AwardTrail,
): AwardCancelRefusal | null {
  if (!eventAwards.some((a) => a.id === awardId) || awardStatusOf(awardId, trail) === 'Cancelled') {
    return { code: 'AWARD_NOT_ACTIVE', detail: awardId || 'the award' };
  }
  return null;
}

/**
 * How many OTHER awards of the event stay in force once this one is cancelled.
 * More than none means the cancel is the PARTIAL one (`t_rfq_award_cancel_partial`,
 * the event stays Partly awarded); none means the full cancel
 * (`t_rfq_award_cancel`, the event returns to Closed). The policy refuses the
 * wrong verb with this, and a screen picks the verb with it (RFx C3, RFX-R2).
 */
export const othersInForceAfterCancel = (
  awardId: string,
  eventAwards: readonly Pick<AwardRecord, 'id'>[],
  trail: AwardTrail,
): number => awardsInForce(eventAwards, trail).filter((a) => a.id !== awardId).length;

/** The trail as the buyer's award read carries it (each view's own records). */
export const trailOfViews = (
  views: readonly { readonly cancellation?: AwardCancellation; readonly sapMark?: AwardSapMark }[],
): AwardTrail => ({
  cancellations: views.flatMap((v) => (v.cancellation ? [v.cancellation] : [])),
  sapMarks: views.flatMap((v) => (v.sapMark ? [v.sapMark] : [])),
});

/**
 * NR-3 BR-09 — may this award be cancelled by this verb? In order: the award
 * is an active award of the event · it is not raised in SAP (edge case 4: the
 * refusal names the SAP document) · a reason is given · the verb is the right
 * one of the pair: `partial` (to Partly awarded) exactly when another award of
 * the event stays in force, the full cancel (to Closed) when none does.
 */
export function awardCancelRefusal(input: {
  readonly awardId: string;
  readonly reason: string;
  /** Every award recorded on the event, cancelled ones included. */
  readonly eventAwards: readonly Pick<AwardRecord, 'id'>[];
  readonly trail: AwardTrail;
  /** True for `t_rfq_award_cancel_partial`, false for `t_rfq_award_cancel`. */
  readonly partial: boolean;
}): AwardCancelRefusal | null {
  const { awardId, eventAwards, trail, partial } = input;
  const notActive = awardOnEvent(awardId, eventAwards, trail);
  if (notActive) return notActive;
  const mark = sapMarkOf(awardId, trail);
  if (mark) return { code: 'AWARD_RAISED_IN_SAP', detail: mark.sapDocumentNo };
  if (input.reason.trim().length === 0) return { code: 'AWARD_REASON_REQUIRED' };
  const othersInForce = othersInForceAfterCancel(awardId, eventAwards, trail);
  if (partial && othersInForce === 0) {
    return {
      code: 'AWARD_CANCEL_TARGET_WRONG',
      detail: 'no other award of this event stays in force, so the event returns to Closed (t_rfq_award_cancel)',
    };
  }
  if (!partial && othersInForce > 0) {
    return {
      code: 'AWARD_CANCEL_TARGET_WRONG',
      detail: `${othersInForce} other award(s) of this event stay in force, so the event stays Partly awarded (t_rfq_award_cancel_partial)`,
    };
  }
  return null;
}

/**
 * NR-3 BR-10 — may this award be marked "Raised in SAP"? The award is an
 * active award of the event, not already marked, and the SAP document number
 * is not blank.
 */
export function awardSapMarkRefusal(input: {
  readonly awardId: string;
  readonly sapDocumentNo: string;
  readonly eventAwards: readonly Pick<AwardRecord, 'id'>[];
  readonly trail: AwardTrail;
}): AwardCancelRefusal | null {
  const { awardId, eventAwards, trail } = input;
  const notActive = awardOnEvent(awardId, eventAwards, trail);
  if (notActive) return notActive;
  const mark = sapMarkOf(awardId, trail);
  if (mark) return { code: 'AWARD_RAISED_IN_SAP', detail: mark.sapDocumentNo };
  if (input.sapDocumentNo.trim().length === 0) return { code: 'AWARD_SAP_DOCUMENT_REQUIRED' };
  return null;
}
