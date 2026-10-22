import { getTransition } from '@services/transitions';

/**
 * BL-219 — whether the RFI or RFP page offers "Extend the deadline" on an
 * event in `status`: exactly the from-states of the extend verb
 * (`t_rfi_extend` / `t_rfp_extend`), read from the flow, so the page never
 * offers an act the dispatcher would refuse as an illegal transition.
 * @param {'t_rfi_extend' | 't_rfp_extend'} transitionId
 * @param {string} status
 * @returns {boolean}
 */
export const extendOffered = (transitionId, status) =>
  (getTransition(transitionId)?.from ?? []).includes(status);
