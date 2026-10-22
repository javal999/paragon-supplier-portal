/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { PanelMode } from '../const' */
import { CheckCircle2, Truck } from 'lucide-react';
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { POStatus } from '@services/data/types';
import { ACTION_STATUSES } from '../const';
import { acknowledgeIsLegalOn } from '../utils';

/**
 * @typedef {object} PanelFooterProps
 * @property {PurchaseOrder} selected  The PO open in the panel (its open-time snapshot).
 * @property {PurchaseOrder | null} selectedLive  The same PO read from the live query, when still listed.
 * @property {PanelMode} effectivePanelMode  The seat-gated panel mode (see the page's note).
 * @property {() => void} closePanel
 * @property {() => void} startEditing  Enter the confirm form (`editing`).
 * @property {(mode: PanelMode) => void} setPanelMode  Switch between the confirm, adjust and reject forms.
 * @property {VerbAvailability} acknowledgeAvailability  The seat's answer for `po:acknowledge`.
 * @property {VerbAvailability} confirmAvailability  The seat's answer for `po:confirm`.
 * @property {VerbAvailability} adjustAvailability  The seat's answer for `po:adjust`.
 * @property {VerbAvailability} rejectAvailability  The seat's answer for `po:reject`.
 * @property {{ held: boolean; notice: VerbAvailability }} asnWizard  The Create-ASN wizard's pair of atoms.
 * @property {{ isPending: boolean }} acknowledgeMutation
 * @property {{ isPending: boolean }} confirmMutation
 * @property {{ isPending: boolean }} adjustMutation
 * @property {{ isPending: boolean }} rejectMutation
 * @property {(po: PurchaseOrder) => void} acknowledgeOrder
 * @property {() => void} confirmOrder
 * @property {() => void} submitAdjust
 * @property {() => void} submitReject
 * @property {() => void} goToASN  Open the Create-ASN wizard for the open PO.
 * @property {boolean} allQtysOk  Every confirm cell reads and sits within its bound.
 * @property {boolean} adjustReady  At least one adjust line, none refused.
 * @property {readonly string[]} rejectCauses  The reject causes ticked so far.
 * @property {TFunction} t
 */

/**
 * The order panel's footer, one set of controls per panel mode: `detail`
 * (close, acknowledge, confirm or Create ASN — each a button for a seat that
 * holds the verb, its handoff notice otherwise), `editing` (adjust, reject,
 * confirm), `adjusting` / `rejecting` (back and submit), and `confirmed`
 * (close and Create ASN now). Moved out of `SupplierOrders.jsx` by the Phase 5
 * page split (no behaviour change).
 * @type {React.FC<PanelFooterProps>}
 */
const PanelFooter = ({
  selected,
  selectedLive,
  effectivePanelMode,
  closePanel,
  startEditing,
  setPanelMode,
  acknowledgeAvailability,
  confirmAvailability,
  adjustAvailability,
  rejectAvailability,
  asnWizard,
  acknowledgeMutation,
  confirmMutation,
  adjustMutation,
  rejectMutation,
  acknowledgeOrder,
  confirmOrder,
  submitAdjust,
  submitReject,
  goToASN,
  allQtysOk,
  adjustReady,
  rejectCauses,
  t
}) => (
  <>
    {effectivePanelMode === 'detail' && (
      <>
        <Button variant="secondary" onClick={closePanel}>
          {t('supplierOrders.action.close')}
        </Button>
        {/* ── ACKNOWLEDGE, IN ITS OWN SLOT ─────────────────────────
            Rendered on the LIVE row, so the control disappears the
            moment the dispatch lands and the PO leaves `Sent`. Its
            condition is `acknowledgeIsLegalOn` — the machine's answer,
            not `ACTION_STATUSES` (see that helper's note: the tab
            grouping and the transition table disagree in BOTH
            directions).

            ⚠️ **SEPARATE FROM `po:confirm`'s NOTICE, NOT FOLDED INTO
            IT.** On a `Sent` PO both verbs are legal at once, so a
            seat holding neither reads two waits in two slots — which
            is §76's rule, not an exception to it. */}
        {acknowledgeIsLegalOn(selectedLive ?? selected) &&
          (acknowledgeAvailability.kind === 'held' ? (
            <Button
              variant="secondary"
              disabled={acknowledgeMutation.isPending}
              onClick={() => acknowledgeOrder(selectedLive ?? selected)}
            >
              {acknowledgeMutation.isPending
                ? t('supplierOrders.action.acknowledging')
                : t('supplierOrders.action.acknowledge')}
            </Button>
          ) : (
            <HandoffNotice availability={acknowledgeAvailability} testId="handoff-po-acknowledge" />
          ))}
        {ACTION_STATUSES.includes((selectedLive ?? selected).status) ? (
          // ⚠️ THE ONE NOTICE FOR `po:confirm` ON THIS SURFACE.
          // `po:confirm` is FULFILMENT's since the supplier split, so
          // a commercial or back-office seat reads the WAIT with the
          // lane named instead of an affordance that would refuse at
          // dispatch.
          //
          // ⚠️ **THE COMMENT THAT STOOD HERE CLAIMED THE `editing`
          // COMMIT WAS "UNREACHABLE BEHIND THIS ONE". IT WAS MEASURED
          // FALSE** — `handleRowAction` opened the panel straight in
          // `editing` mode, so the row button that every actionable PO
          // renders bypassed this notice entirely. A comment asserting
          // a property the code does not have is the same class as a
          // label naming an act it does not perform. What makes the
          // claim TRUE now is `effectivePanelMode` (see its note): the
          // mode itself is gated, so this stays the single notice.
          confirmAvailability.kind === 'held' ? (
            <Button variant="outline" onClick={startEditing}>
              {t('po.confirm.action')}
            </Button>
          ) : (
            <HandoffNotice availability={confirmAvailability} testId="handoff-po-confirm" />
          )
        ) : (selectedLive ?? selected).status === POStatus.CONFIRMED ? (
          asnWizard.held ? (
            <Button variant="outline" onClick={goToASN}>
              {t('supplierOrders.action.createAsn')}
            </Button>
          ) : (
            <HandoffNotice availability={asnWizard.notice} testId="handoff-asn-create" />
          )
        ) : null}
      </>
    )}
    {effectivePanelMode === 'editing' && (
      <>
        {/* The other two answers (REQ-E07-02), each in its own slot
            with its own notice for a seat that does not hold it. */}
        {adjustAvailability.kind === 'held' ? (
          <Button variant="secondary" onClick={() => setPanelMode('adjusting')}>
            {t('oc.action.adjust')}
          </Button>
        ) : (
          <HandoffNotice availability={adjustAvailability} testId="handoff-po-adjust" />
        )}
        {rejectAvailability.kind === 'held' ? (
          <Button variant="secondary" onClick={() => setPanelMode('rejecting')}>
            {t('oc.action.reject')}
          </Button>
        ) : (
          <HandoffNotice availability={rejectAvailability} testId="handoff-po-reject" />
        )}
        {/* Disabled-under-refusal is UX, not the lock: the parse gate
            in confirmOrder and the dispatcher policy behind it are
            what guarantee no unread or out-of-bounds number ships. */}
        <Button
          variant="outline"
          icon={CheckCircle2}
          onClick={confirmOrder}
          disabled={confirmMutation.isPending || !allQtysOk}
        >
          {confirmMutation.isPending ? t('po.confirm.submitting') : t('po.confirm.action')}
        </Button>
      </>
    )}
    {(effectivePanelMode === 'adjusting' || effectivePanelMode === 'rejecting') && (
      <>
        <Button variant="secondary" onClick={() => setPanelMode('editing')}>
          {t('oc.action.back')}
        </Button>
        {effectivePanelMode === 'adjusting' ? (
          <Button
            variant="outline"
            onClick={submitAdjust}
            disabled={adjustMutation.isPending || !adjustReady}
          >
            {t('oc.action.submitAdjust')}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={submitReject}
            disabled={rejectMutation.isPending || rejectCauses.length === 0}
          >
            {t('oc.action.submitReject')}
          </Button>
        )}
      </>
    )}
    {effectivePanelMode === 'confirmed' && (
      <>
        <Button variant="secondary" onClick={closePanel}>
          {t('supplierOrders.action.close')}
        </Button>
        {asnWizard.held ? (
          <Button variant="outline" icon={Truck} onClick={goToASN}>
            {t('supplierOrders.action.createAsnNow')}
          </Button>
        ) : (
          <HandoffNotice availability={asnWizard.notice} testId="handoff-asn-create" />
        )}
      </>
    )}
  </>
);

export default PanelFooter;
