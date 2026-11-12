// SupplierShipments — module-scope constants and the page's shared typedefs.
// Moved out of the page file unchanged (frontend-standard Phase 5 split).

/** @import { AsnStatus } from '@services/data/types' */
/** @import { LineEntry } from '../shipments/asnLines' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { DECLARED_PRESENT } from '@services/data/fixturePresent';

/** @typedef {'shipments' | 'create'} TabKey */
/** @typedef {AsnStatus | 'All'} StatusFilter */
/**
 * The list's four ASN verbs, each answered by the seat's roles (§76: one slot per verb).
 * @typedef {Readonly<Record<'create' | 'submit' | 'resolve' | 'cancel', VerbAvailability>>} AsnVerbs
 */

/**
 * The StatusPill tone for each ASN status in the list.
 * @type {Record<AsnStatus, 'success' | 'warning' | 'danger' | 'neutral'>}
 */
export const STATUS_VARIANT = {
  Draft: 'neutral',
  Submitted: 'neutral',
  'In Transit': 'warning',
  Delivered: 'success',
  Discrepancy: 'danger',
  Cancelled: 'neutral',
  // MR-6 BR-08 — waiting on Quality, not on the supplier's next act.
  'Awaiting exception': 'warning'
};

/** Class string shared by every text, date and number input on the page. */
export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
/** Class string shared by every field label on the page. */
export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/**
 * @typedef {object} AsnForm
 * @property {string} poId
 * @property {string} threePlId -  BL-51 — the 3PL picked from the list, or '' for a carrier typed by name.
 * @property {string} carrier
 * @property {string} trackingNumber
 * @property {string} shipDate
 * @property {string} eta
 * @property {string} packages
 * @property {string} weightKg
 * @property {string} packingList
 * @property {string} notes
 * @property {boolean} confirmed
 * @property {Record<string, LineEntry>} lines -  Keyed by material code.
 * @property {string} overShipReason
 * @property {string} callOffId -  REQ-E09-03 BR-06 — the confirmed call-off this ASN ships, or '' for a PO-level ASN.
 * @property {boolean} callOffFinal -  MR-6 BR-10 — the last ASN for the call-off (a shortfall then warns).
 * @property {string} exceptionReason -  MR-6 BR-08 — the supplier's reason when shelf life blocks the submission.
 */

/**
 * The Submit drawer's form for a Draft ASN, filled from the draft when the
 * drawer opens (`openSubmitForm`).
 * @typedef {object} AsnSubmitForm
 * @property {string} threePlId
 * @property {string} carrier
 * @property {string} trackingNumber
 * @property {string} eta
 * @property {string} shipDate
 * @property {Record<string, LineEntry>} lines
 * @property {string} overShipReason
 * @property {boolean} callOffFinal
 * @property {string} exceptionReason -  MR-6 BR-08 — the supplier's reason when shelf life blocks the submission.
 */

/** @type {AsnForm} */
export const EMPTY_FORM = {
  poId: '',
  // BL-51 — filled from the 3PL list when the form opens (`newAsnForm`).
  threePlId: '',
  carrier: '',
  trackingNumber: '',
  // BL-303 (UL-05) — the hub's today, not a fixed date five months back.
  shipDate: DECLARED_PRESENT,
  eta: '',
  packages: '',
  weightKg: '',
  packingList: '',
  notes: '',
  confirmed: false,
  lines: {},
  overShipReason: '',
  callOffId: '',
  callOffFinal: false,
  exceptionReason: ''
};

/** Value of the batch picker's "type a batch" choice (edge case 4). */
export const TYPE_BATCH = '__typed__';

// BL-51 — the hard-coded carrier list that stood here is RETIRED. Its choices
// now come from the administrator's 3PL list (`threePlStore`, sample names
// held fictional by `carrierIdentity.test.js`), and its "Other" option — which
// stored the word "Other" as the carrier — is replaced by a typed carrier name
// (`CarrierPicker`). Batch E's note still applies to the new list: option text
// is absent from `innerText`, so a render census does not see the names.
