/** @import { PoReasonCode } from '@services/data/types' */
import { POStatus } from '@services/data/types';

// Module-scope constants and shared typedefs of the supplier orders page, moved
// out of `SupplierOrders.jsx` by the Phase 5 page split (no behaviour change).
// The two refusal-message maps stay beside the cells that render them
// (`components/LineItemsSection.jsx`, `components/AdjustForm.jsx`), so the
// glossary chip-coverage guard still finds each map and its chip in one file.

/** @typedef {'all' | 'action' | 'progress' | 'completed'} TabKey */
// `adjusting` and `rejecting` are the other two answers to a PO (REQ-E07-02);
// they replaced the old ungoverned "request change" toast.
/** @typedef {'detail' | 'editing' | 'adjusting' | 'rejecting' | 'confirmed'} PanelMode */

/** One line's adjust draft, raw-backed like the confirm cells. */
/**
 * @typedef {object} AdjustDraft
 * @property {boolean} on
 * @property {PoReasonCode | ''} reasonCode
 * @property {string} note
 * @property {string} qty
 * @property {string} date
 */

/** @type {POStatus[]} */
export const ACTION_STATUSES = [POStatus.SENT, POStatus.ACKNOWLEDGED];
/** @type {POStatus[]} */
export const PROGRESS_STATUSES = [POStatus.CONFIRMED, POStatus.PARTIALLY_DELIVERED];
/** @type {POStatus[]} */
export const COMPLETED_STATUSES = [POStatus.DELIVERED, POStatus.CLOSED];

/** The class of every text, date, select and textarea input in the order panel. */
export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
/** The class of every field label in the order panel. */
export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';
