// Helpers and shared types of the buyer call-offs page. Moved out of
// `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).
/** @import { ASN, CallOffType, CallOffWarning, POLineItem, PurchaseOrder } from '@services/data/types' */
/** @import { CallOffView, umbrellaRemaining } from '@services/transitions/callOffRules' */
/** @import { ReleaseCadence } from '@services/delivery/types' */
/** @import { CallOffTab } from './const' */
import { HIGHLIGHT_PARAM } from '@lib/deepLink';
import { isLive } from '@services/liveness';
import { engineReleaseWithheld } from '@services/transitions/callOffRules';
import { PO_PARAM } from '../orders/orderSummaryDrill';
import { TO_ACT_STATUSES } from './const';

/**
 * The tab a link's other params imply when it names no `?tab=` (P-12), so
 * every link made before the split still opens the tab holding what it filters.
 * @param {URLSearchParams} params
 * @returns {CallOffTab | null}
 */
export const impliedCallOffTab = (params) => {
  const status = params.get('status');
  if (status !== null && TO_ACT_STATUSES.includes(status)) return 'toAct';
  if (
    status === 'all' ||
    params.get(PO_PARAM) !== null ||
    params.get(HIGHLIGHT_PARAM) !== null ||
    params.get('newFor') !== null
  )
    return 'all';
  return null;
};

/**
 * Whether one call-off is something the planner acts on (the banner's counts).
 * @param {CallOffView} v
 * @returns {boolean}
 */
export const needsAction = (v) =>
  v.confirmation === 'Awaiting Approval' ||
  v.confirmation === 'Escalated' ||
  v.delivery === 'atRisk';

/** @typedef {'all' | 'awaitingApproval' | 'escalated' | 'atRisk' | 'drift'} StatusFilter */

/**
 * @typedef {| { kind: 'new'; poId: string; lineId: string }
 *   | { kind: 'series'; poId: string; lineId: string }
 *   | { kind: 'callOff'; id: string }
 *   | null} Panel
 */

/**
 * The row action a planner is offered: review, open the draft, or view.
 * @param {CallOffView} v
 */
export const actionKey = (v) =>
  v.confirmation === 'Awaiting Approval'
    ? 'co.action.review'
    : v.callOff.status === 'Draft'
      ? 'co.action.openDraft'
      : 'co.action.open';

/**
 * @typedef {object} SeriesRow
 * @property {string} id Row identity, used as the React key: `<preview number>-<n>`, minted in
 *   previewSeries. A new preview mints new ids, so its inputs start fresh
 *   instead of reusing the previous preview's DOM rows.
 * @property {string} quantity
 * @property {string} date
 */

/**
 * The call-off form the side panels edit: one shape for a new call-off, a
 * draft edit, a change and a review comment.
 * @typedef {{ quantity: string; needDate: string; type: CallOffType; reason: string; comment: string }} CallOffForm
 */

/**
 * The series form: what the planner types before previewing a series.
 * @typedef {{ total: string; perCallOff: string; cadence: ReleaseCadence; firstDate: string }} SeriesForm
 */

/**
 * X-03 (owner decision 2026-09-23) — a draft the Order plan made from an engine
 * recommendation, while the engine dataset is not live: it is marked, and its
 * release is withheld. The predicate is the one the release verb's policy runs,
 * fed the registry's own liveness at render.
 * @param {CallOffView['callOff']} c
 * @returns {boolean}
 */
export const releaseWithheld = (c) => engineReleaseWithheld(c, isLive('engineDataset'));

/**
 * One umbrella PO line with its remaining quantity and value and the call-offs
 * listed on it (`useCallOffSections`).
 * @typedef {{ po: PurchaseOrder; line: POLineItem; remaining: ReturnType<typeof umbrellaRemaining>; rows: CallOffView[] }} UmbrellaLine
 */

/** A call-off's ASN with its current call-off warnings (MR-6 BR-12). */
/**
 * @typedef {object} LinkedAsn
 * @property {ASN} asn
 * @property {CallOffWarning[]} warnings
 */
