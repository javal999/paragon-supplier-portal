/** @import { GoodsReceipt } from '@services/data/types' */
/** @import { SettleFault } from '@services/transitions/settleFaults' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import {
  useGoodsReceiptPost,
  useGoodsReceiptRequestRetest,
  useGoodsReceiptSettle,
  useAdvanceShipNoticeResolveDiscrepancy
} from '@services/query/commandHooks';
import { classifySettleFault } from '@services/transitions/settleFaults';

/**
 * @typedef {Record<string, { correlationId: string; fault: SettleFault | null }>} SettleWatch
 */

/**
 * Every command the goods-receipt page dispatches, with its toasts: Post to
 * SAP and the settle that follows it, the settle retry, the lab retest and the
 * ASN discrepancy reconciliation. It also owns the §91e settle watch, the
 * page's record of which GR settles this session started and how they ended.
 * Moved out of `BuyerGoodsReceipt.jsx`'s workspace by the Phase 5 page split
 * (no behaviour change: same mutations, same payloads, same toasts).
 */
export function useGoodsReceiptCommands() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const postMutation = useGoodsReceiptPost();
  const settleMutation = useGoodsReceiptSettle();
  const retestMutation = useGoodsReceiptRequestRetest();

  // ── §91e · THE SETTLE WATCH ────────────────────────────────────────────────
  // Mirrors `BuyerInvoices`' watch verb for verb — one SAP boundary, two
  // surfaces, one account of it.
  //
  // ⚠️ **WHAT WAS WRONG WAS THE SURFACE, NOT THE MACHINE.** A settle that fails
  // leaves the command `submitted` and `pending` undeleted — `dispatcher.js`
  // does that DELIBERATELY, so the SAME correlationId is genuinely re-settleable
  // ("Leaving the command `submitted` is what makes the named remedy TRUE").
  // Nothing on this page held the correlationId, so the only trace of a failure
  // was a toast the reader dismisses and cannot get back, and the GR then sat in
  // 'Posting to SAP' with no account of itself — while `settle.failed.TRANSPORT`
  // told them to run the same action again. The remedy named in copy now exists.
  //
  // ⚠️ **AND IT IS THE SETTLE THAT RE-ATTEMPTS, NOT `t_gr_post`.** §91 read the
  // remedy as a re-POST and therefore as a machine change (`t_gr_post.from` does
  // not contain the interim state, and must not: re-posting would mint a SECOND
  // correlationId and orphan the first, whose `pending` entry never clears).
  // Re-settling is the exit the flow already declares — `settlesTo` — reached
  // through the same command that was already issued.
  //
  // Only settles THIS session started are watched. A GR parked by an earlier
  // session shows the wait and offers nothing, because that is the truth: this
  // page cannot know that correlationId, and fabricating one would be an
  // affordance promising what it cannot do.
  const [settleWatch, setSettleWatch] = useState(/** @type {SettleWatch} */ ({}));
  /**
   * @param {string} id
   * @param {string} correlationId
   * @param {SettleFault | null} fault
   */
  const watchSettle = (id, correlationId, fault) =>
    setSettleWatch((w) => ({ ...w, [id]: { correlationId, fault } }));
  /** @param {string} id */
  const clearSettle = (id) =>
    setSettleWatch((w) => {
      const { [id]: _done, ...rest } = w;
      return rest;
    });

  const resolveDiscrepancyMutation = useAdvanceShipNoticeResolveDiscrepancy();

  /** @param {string} asnNumber */
  const handleResolveDiscrepancy = (asnNumber) => {
    resolveDiscrepancyMutation.mutate(
      { asnNumber },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('goodsReceipt.discrepancy.failed.title', { asnNumber }),
              description:
                refusalText(res.reason) ??
                t('goodsReceipt.discrepancy.failed.desc', { reason: res.reason ?? '' })
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('goodsReceipt.discrepancy.done.title', { asnNumber }),
            description: t('goodsReceipt.discrepancy.done.desc')
          });
        },
        onError: () =>
          toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') })
      }
    );
  };

  // Post to SAP (Option B): dispatch t_gr_post → the GR shows the interim
  // 'Posting to SAP' with NO material document; the async SAP callback settles
  // ~a moment later → 'Posted to SAP' + the real material document. Both phases
  // are observable because each command invalidates the scoped read.
  /** @param {GoodsReceipt} g */
  function handlePostToSap(g) {
    postMutation.mutate(
      { grId: g.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('gr.post.failed.title', { grNumber: g.grNumber }),
              description:
                refusalText(res.reason) ?? t('gr.post.failed.desc', { reason: res.reason ?? '' })
            });
            return;
          }
          toast({
            variant: 'info',
            title: t('gr.post.posting.title', { grNumber: g.grNumber }),
            description: t('gr.post.posting.desc')
          });
          const { correlationId } = res;
          // §91e — watched from the moment the boundary is crossed, so the
          // interim state can account for the wait as well as for a failure.
          watchSettle(g.id, correlationId, null);
          window.setTimeout(() => {
            settleMutation.mutate(
              { correlationId },
              {
                onSuccess: () => {
                  clearSettle(g.id);
                  toast({
                    variant: 'success',
                    title: t('gr.post.posted.title', { grNumber: g.grNumber }),
                    description: t('gr.post.posted.desc')
                  });
                },
                // ⚠️ THE HOOK'S `onError` STILL FIRES — this does not replace
                // it. `useGoodsReceiptSettle` carries `useSettleErrorToast`,
                // which classifies the fault and names its remedy (§43); this
                // records the fault ON THE ROW so the account outlives the
                // toast. TanStack runs the mutation-level callback first.
                onError: (err) => watchSettle(g.id, correlationId, classifySettleFault(err))
              }
            );
          }, 1200);
        },
        onError: () =>
          toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') })
      }
    );
  }

  // §91e — re-attempt a settle THIS session started and saw fail. Honest because
  // the dispatcher leaves a failed settle `submitted` and its `pending` context
  // undeleted: the same correlationId is genuinely re-settleable, and
  // `SETTLE_FAULT_RETRYABLE` decides which faults can legitimately answer
  // differently on a second ask. A REFUSED or UNGOVERNED fault gets no button —
  // a governed answer does not change, and offering the retry anyway would be
  // the `PF-1a` shape: an affordance promising what it cannot do.
  /** @param {string} grId */
  function retrySettle(grId) {
    const watch = settleWatch[grId];
    if (!watch) return;
    settleMutation.mutate(
      { correlationId: watch.correlationId },
      {
        onSuccess: () => {
          clearSettle(grId);
          toast({
            variant: 'success',
            title: t('gr.settle.retried.title'),
            description: t('gr.settle.retried.desc')
          });
        },
        onError: (err) => watchSettle(grId, watch.correlationId, classifySettleFault(err))
      }
    );
  }

  // PF-1a — release a held GR for re-inspection (t_gr_request_retest). Payload-
  // free: the hold already recorded its reason. On success the GR re-derives to
  // 'Under Inspection', where the disposition verbs become legal again — which
  // is the whole point of the edge, and the reason the panel is left open rather
  // than closed: the inspector's next action is on this same GR.
  /** @param {GoodsReceipt} g */
  function handleRequestRetest(g) {
    retestMutation.mutate(
      { grId: g.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('goodsReceipt.retest.failed.title', { grNumber: g.grNumber }),
              description:
                refusalText(res.reason) ?? res.reason ?? t('goodsReceipt.retest.failed.desc')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('goodsReceipt.retest.done.title', { grNumber: g.grNumber }),
            description: t('goodsReceipt.retest.done.desc')
          });
        },
        onError: () =>
          toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') })
      }
    );
  }

  return {
    postMutation,
    retestMutation,
    resolveDiscrepancyMutation,
    settleWatch,
    watchSettle,
    handleResolveDiscrepancy,
    handlePostToSap,
    retrySettle,
    handleRequestRetest
  };
}
