/** @import React from 'react' */
/** @import { TFunction } from 'i18next' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { UseToastReturn } from '@hooks/useToast' */
/** @import { GoodsReceipt } from '@services/data/types' */
/** @import { SettleWatch } from '../hooks/useGoodsReceiptCommands' */
import Button from '@components/ui-v2/Button';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { SETTLE_FAULT_RETRYABLE } from '@services/transitions/settleFaults';

/**
 * @typedef {object} FooterContext
 * @property {TFunction} t
 * @property {UseToastReturn['toast']} toast
 * @property {Readonly<Record<'receive' | 'inspect' | 'post', VerbAvailability>>} grChain
 *   The seat's answer for each GR chain atom (§73).
 * @property {VerbAvailability} grChainAvailability The first withheld chain atom, or held.
 * @property {boolean} posting Whether a Post to SAP is in flight.
 * @property {boolean} retesting Whether a retest request is in flight.
 * @property {SettleWatch} settleWatch The §91e settle watch.
 * @property {(asnId: string | undefined) => void} setWizardAsnId
 * @property {(id: string | null) => void} setSelectedId
 * @property {(open: boolean) => void} setWizardOpen
 * @property {(g: GoodsReceipt) => void} handlePostToSap
 * @property {(g: GoodsReceipt) => void} handleRequestRetest
 * @property {(grId: string) => void} retrySettle
 */

/**
 * The side panel's footer actions for one GR, chosen by its status: start
 * inspection, submit results, retest or override a hold, post to SAP, the
 * §91e settle account, or view in SAP. A plain function, not a component, so
 * `null` still reaches `SidePanel` as `null` for a status with no action.
 * Moved out of `BuyerGoodsReceipt.jsx`'s workspace by the Phase 5 page split
 * (no behaviour change).
 * @param {GoodsReceipt} g
 * @param {FooterContext} ctx
 * @returns {React.ReactNode}
 */
export const footerForStatus = (g, ctx) => {
  const {
    t,
    toast,
    grChain,
    grChainAvailability,
    posting,
    retesting,
    settleWatch,
    setWizardAsnId,
    setSelectedId,
    setWizardOpen,
    handlePostToSap,
    handleRequestRetest,
    retrySettle
  } = ctx;
  switch (g.status) {
    case 'Pending Inspection':
      // §75 — THE SECOND ROUTE INTO THE WIZARD, AND IT MAKES §73b's "no
      // reachable path" FALSE. This opens the same four-step wizard whose one
      // commit fires t_gr_create -> t_gr_start_inspection -> t_gr_post, so it
      // carries the same whole-chain guard as the "New GR" entry. Guarding
      // only the entry left this door open.
      return grChainAvailability.kind === 'held' ? (
        <Button
          variant="outline"
          onClick={() => {
            setWizardAsnId(g.asnId);
            setSelectedId(null);
            setWizardOpen(true);
          }}
        >
          {t('goodsReceipt.footer.startInspection')}
        </Button>
      ) : (
        <HandoffNotice availability={grChainAvailability} testId="handoff-gr-start" />
      );
    case 'Under Inspection':
      return (
        <Button
          variant="outline"
          onClick={() =>
            toast({
              variant: 'info',
              title: t('goodsReceipt.toast.submitResults.title'),
              description: t('goodsReceipt.toast.submitResults.desc')
            })
          }
        >
          {t('goodsReceipt.footer.submitResults')}
        </Button>
      );
    case 'Quality Hold':
      return (
        <div className="flex gap-2">
          {/* PF-1a — WIRED. This button rendered on `Quality Hold` and fired a
              toast while the state had NO EXIT AT ALL: the affordance promised
              an edge the schema did not have, which is closer to a defect than
              to a gap. It now dispatches `t_gr_request_retest` (Quality Hold →
              Under Inspection) through the same governed path as every other
              verb on this page. */}
          {grChain.inspect.kind === 'held' ? (
            <Button variant="secondary" disabled={retesting} onClick={() => handleRequestRetest(g)}>
              {retesting
                ? t('goodsReceipt.retest.submitting')
                : t('goodsReceipt.footer.requestRetest')}
            </Button>
          ) : (
            <HandoffNotice availability={grChain.inspect} testId="handoff-gr-retest" />
          )}
          {/* ⚠️ STILL A TOAST, AND DELIBERATELY SO — `DEAD-AFFORDANCE-01`,
              reported not fixed. Overriding a quality hold is a GOVERNANCE ACT
              whose entire value is accountability: this named person accepted
              this risk on this date. The platform cannot name a person
              (C10 §2, `ENF-NO-PERSON-IN-IDENTITY-01`), so wiring it today
              would write an ANONYMOUS UNLOCK into a permanent trail — the
              exact shape the enforcement lane already refuses by making an
              unattributed override unable to complete. It waits for identity,
              and the wait is the honest state. */}
          <Button
            variant="outline"
            onClick={() =>
              toast({
                variant: 'warning',
                title: t('goodsReceipt.toast.overrideHold.title'),
                description: t('goodsReceipt.toast.overrideHold.desc')
              })
            }
          >
            {t('goodsReceipt.footer.overrideHold')}
          </Button>
        </div>
      );
    case 'Approved':
    case 'Partially Approved':
      return grChain.post.kind === 'held' ? (
        <Button variant="outline" disabled={posting} onClick={() => handlePostToSap(g)}>
          {t('gr.post.action')}
        </Button>
      ) : (
        <HandoffNotice availability={grChain.post} testId="handoff-gr-post" />
      );
    case 'Posting to SAP':
      // ⚠️ §91e — AT THE SAP BOUNDARY, AND THIS CASE USED TO NOT EXIST: the
      // state fell to `default: return null`, so the GR was parked with no
      // affordance and no account of itself while `settle.failed.TRANSPORT`
      // told the reader to *"run the same action again"*.
      //
      // NO TRANSITION IS LEGAL FROM HERE and that is correct — the interim's
      // only exit is the `settlesTo` settlement edge, which is why the remedy
      // is a re-SETTLE and not a re-post. The footer accounts for the wait, or
      // for the failure if this session saw one, and offers the retry ONLY
      // when the classified fault says a second ask can answer differently.
      return settleWatch[g.id]?.fault ? (
        SETTLE_FAULT_RETRYABLE[
          /** @type {"REFUSED" | "TRANSPORT" | "UNGOVERNED"} */ (settleWatch[g.id].fault)
        ] ? (
          <Button variant="outline" onClick={() => retrySettle(g.id)}>
            {t('goodsReceipt.action.retrySettle')}
          </Button>
        ) : (
          <span className="text-xs text-danger self-center">
            {t('goodsReceipt.settle.notRetryable')}
          </span>
        )
      ) : (
        <span className="text-xs text-text-tertiary self-center">
          {t('goodsReceipt.settle.inFlight')}
        </span>
      );
    case 'Posted to SAP':
      return (
        <Button
          variant="secondary"
          onClick={() =>
            toast({
              variant: 'info',
              title: t('goodsReceipt.toast.openingSap.title'),
              description: g.sapMaterialDoc ?? t('goodsReceipt.toast.openingSap.fallbackDoc')
            })
          }
        >
          {t('goodsReceipt.footer.viewInSap')}
        </Button>
      );
    default:
      return null;
  }
};
