// ────────────────────────────────────────────────────────────────────────────
// GRInspectionWizard — module-scope constants that no section renders.
//
// The two status sets decide which shipments and ASNs are receivable; they are
// read with `.includes`, never mapped into JSX. The constants a section DOES
// render (`ROLES`, `LOCATIONS`, the refusal-key maps) stay in the component
// that maps them, because the module-scope-literal gate and the glossary chip
// coverage link a declaration to its uses within one file.
// ────────────────────────────────────────────────────────────────────────────

/** @import { AsnStatus } from '@services/data/types' */

/** The shipment statuses that put a shipment at the dock, ready to receive. */
export const ELIGIBLE_STATUSES = /** @type {const} */ (['At Dock', 'Unloading']);

// ASN states in which a submitted ASN is receivable (mirrors the cascadable set
// the dispatcher enforces on t_gr_create's manual-ref path). MR-6 BR-08 —
// 'Awaiting exception' is deliberately NOT here: until Quality approves, the
// goods have not been announced to the dock at all.
/** @type {readonly AsnStatus[]} */
export const RECEIVABLE_ASN_STATUSES = ['Submitted', 'In Transit', 'Delivered'];
