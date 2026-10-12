// Module-scope constants for the buyer review lane (`BuyerSupplierApplications`).
// Moved out of the page by the Phase 5 page split; values unchanged.

/** @import { SupplierApplicationStatus } from '@services/data/types' */
/** @import { UnattributedReason } from '@lib/enforcement' */

/**
 * EXHAUSTIVE over the unattributed vocabulary, deliberately: widening it must
 * break the build here rather than render a blank where a person's name would
 * be. The `BuyerRequisitions` convention, reused because the question is the
 * same one — WHICH failure to resolve, never a bare "unknown".
 * @type {Record<UnattributedReason, string>}
 */
export const UNATTRIBUTED_KEY = {
  NO_PERSON_IN_SESSION: 'applications.attribution.noPerson',
  IDENTITY_PROVIDER_UNAVAILABLE: 'applications.attribution.idpDown'
};

/** The four states, toned. Exhaustive: a fifth state must break the build here
 * @type {Record< SupplierApplicationStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral' >}
 *  rather than render an untoned pill. */
export const STATUS_VARIANT = {
  Submitted: 'warning',
  'Under Review': 'info',
  Approved: 'success',
  Rejected: 'danger'
};

/** @typedef {'all' | 'waiting' | 'inReview' | 'decided'} Tab */

/** @type {Record<Tab, readonly SupplierApplicationStatus[] | null>} */
export const TAB_STATUSES = {
  all: null,
  waiting: ['Submitted'],
  inReview: ['Under Review'],
  decided: ['Approved', 'Rejected']
};

/** Which confirmation step is open, if any. `null` is the panel's resting state. */
/** @typedef {'approve' | 'reject' | null} Pending */
