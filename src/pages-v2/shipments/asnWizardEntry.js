import { useVerbAvailabilities } from '@hooks/useVerbAvailability';
/** @import { VerbAvailability } from '@services/transitions/handoff' */
import { FROM_PARAM, FROM_PO, PO_PARAM } from '../orders/orderSummaryDrill';

// ─────────────────────────────────────────────────────────────────────────────
// THE CREATE-ASN WIZARD, AS OTHER PAGES REACH IT (IA-S01, IA-S04).
//
// The wizard on `/supplier/shipments` dispatches `t_asn_create` AND
// `t_asn_submit`, so it is offered only to a seat holding both
// (`SupplierShipments` withholds its tab otherwise). A control on another page
// that opens it — "Create ASN" on a PO, "Create the ASN for this call-off" —
// names the same act, so it asks the same two atoms and, when either is not
// held, renders the same notice the wizard tab would.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whether this seat may run the Create-ASN wizard, and the notice to show when
 * it may not (the atom it lacks first: create, then submit).
 * @returns {{ held: boolean; notice: VerbAvailability }}
 */
export function useAsnWizardAvailability() {
  const verbs = useVerbAvailabilities(
    /** @type {const} */ ({
      create: 'asn:create',
      submit: 'asn:submit'
    })
  );
  const held = verbs.create.kind === 'held' && verbs.submit.kind === 'held';
  return { held, notice: verbs.create.kind === 'held' ? verbs.submit : verbs.create };
}

/** The parameter naming the confirmed call-off the ASN ships (REQ-E09-03 BR-06). */
export const CALL_OFF_PARAM = 'callOff';

/**
 * The address that opens the Create-ASN wizard started for one PO, and
 * optionally for one confirmed call-off on it. `po` is the PO's id, as on
 * every other order address; `from=po` offers the way back to the PO.
 * @param {{ poId: string; callOffId?: string; fromPo?: boolean }} target
 * @returns {string}
 */
export function createAsnHref({ poId, callOffId, fromPo = false }) {
  const q = new URLSearchParams();
  q.set('tab', 'create');
  q.set(PO_PARAM, poId);
  if (callOffId) q.set(CALL_OFF_PARAM, callOffId);
  if (fromPo) q.set(FROM_PARAM, FROM_PO);
  return `/supplier/shipments?${q.toString()}`;
}
