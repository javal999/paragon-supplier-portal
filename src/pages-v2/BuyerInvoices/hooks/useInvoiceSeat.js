/** @import { BuyerInvoice } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { useMemo } from 'react';
import { invoiceCommitAction, invoiceActionsForSeat } from '../../invoices/invoiceActionModel';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useNextAct } from '@hooks/useVerbAvailability';

/**
 * What the machine and the seat allow on the open invoice: the reserved
 * commit, who acts next, each verb's availability for this seat, the verb the
 * footer's primary slot dispatches and that verb's availability. Pure
 * derivation, no state. Moved out of `BuyerInvoices.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @param {BuyerInvoice | null} selected  The open invoice, or `null` when the panel is closed.
 */
export function useInvoiceSeat(selected) {
  // The ONE reserved commit for the selected invoice, DERIVED from the
  // machine with the canonical state. `null` whenever no transition is legal —
  // which is what makes the primary slot fall back to an outline informational
  // footer instead of asserting an action that does not exist.
  const commitAction = useMemo(
    () => (selected ? invoiceCommitAction(selected.lifecycleState) : null),
    [selected]
  );
  // WHO ACTS NEXT (S2a). ⚠️ **READS `lifecycleState`, NOT `status`** — the split
  // this DTO already declares at its own field (`types.ts`: *"Display reads
  // `status`; legality reads `lifecycleState`"*). `status` is the buyer
  // PROJECTION and carries `Pending Match` / `Overdue`, which no transition
  // names; asking the machine about those returns silence on a document the
  // machine can in fact answer for.
  const nextAct = useNextAct('invoice', selected?.lifecycleState);
  // ── ⚠️ THE SEAT, AND WHY IT ANNOTATES RATHER THAN FILTERS ─────────────────
  // `invoice:pay` / `invoice:approve` / `invoice:dispute` belong to FINANCE
  // (operator ruling: procurement does not release payment). A procurement seat
  // opening this page must still SEE that a release is due and whose act it is
  // — filtering the verb out would delete the affordance silently, which is the
  // one outcome this batch must not produce. So the population is unchanged and
  // each verb carries its availability.
  const { identity } = useCurrentIdentity();
  const seatActions = useMemo(
    () => (selected ? invoiceActionsForSeat(selected.lifecycleState, identity.businessRoles) : []),
    [selected, identity.businessRoles]
  );
  /**
   * @param {string} transitionId
   * @returns {VerbAvailability}
   */
  const availabilityOfVerb = (transitionId) =>
    seatActions.find((a) => a.transitionId === transitionId)?.availability ?? { kind: 'held' };
  // ⚠️ **THE FOOTER'S VERB IS NOT ALWAYS THE SOLID COMMIT, AND THE FIRST CUT OF
  // THIS GUARD MISSED THE OTHER ONE.** `handleFooterAction` dispatches the solid
  // commit when there is one and `t_invoice_resolve` when there is not — so a
  // DISPUTED invoice puts a finance-owned verb in the primary slot with
  // `commitAction === null`. Guarding only the commit left that button live for
  // a procurement seat: present, pressable, and refused at the dispatcher. Found
  // in the browser, not by the suite — the list-level sweep is identical for
  // every seat, and only opening a Disputed invoice shows it.
  /** @type {string | null} */
  const footerVerbId =
    commitAction?.transitionId ??
    (seatActions.some((a) => a.transitionId === 't_invoice_resolve') ? 't_invoice_resolve' : null);
  /** @type {VerbAvailability} */
  const commitAvailability = footerVerbId ? availabilityOfVerb(footerVerbId) : { kind: 'held' };

  return { commitAction, nextAct, availabilityOfVerb, footerVerbId, commitAvailability };
}
