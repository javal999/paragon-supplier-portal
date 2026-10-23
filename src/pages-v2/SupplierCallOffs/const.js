/** @import { CallOffConfirmationKind } from '@services/data/types' */

// Module-scope constants of the supplier call-offs page, moved out of
// `SupplierCallOffs.jsx` by the Phase 5 page split (no behaviour change).

/** @typedef {CallOffConfirmationKind | 'reject'} Answer */
// i18n-defer: answer identifiers, not copy — each renders through t(`co.respond.option.<id>`)
/** @type {readonly Answer[]} */
export const ANSWERS = ['confirm', 'newDate', 'changes', 'partial', 'reject'];

/**
 * The empty response-and-dispatch form: the answer being typed in the respond
 * form and the dispatch notice fields. The page resets to it on open and after
 * every accepted command.
 */
export const EMPTY = {
  answer: /** @type {Answer} */ ('confirm'),
  date: '',
  quantity: '',
  qty1: '',
  date1: '',
  qty2: '',
  date2: '',
  comment: '',
  reason: '',
  shippedDate: '',
  expectedArrival: '',
  dispatchQty: '',
  asnNumber: ''
};
