import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useCallOffCommand } from '@services/query/commandHooks';
/** @import { SupplyGapRow, ProposedCallOff } from '@services/transitions/supplyBelowDemandRules' */
import { draftNeedDate } from '../../orderPlan/orderPlanRelease';

/**
 * The key of one proposed call-off of one gap.
 * @param {Pick<SupplyGapRow, 'supplierId' | 'materialCode' | 'week'>} g
 * @param {Pick<ProposedCallOff, 'poId' | 'lineId'>} c
 */
export const gapDraftKey = (g, c) =>
  `${g.supplierId}|${g.materialCode}|${g.week}|${c.poId}|${c.lineId}`;

/**
 * CAP-12 BR-03 — the planner's act on a "Below demand anticipation" proposal:
 * draft the proposed call-off on its blanket line with the EXISTING `draft`
 * verb (the same one `useDraftCallOff` fires for a recommendation), with the
 * gap week's need date by the same rule (`draftNeedDate`: the week's Monday,
 * or today once that Monday has passed). No new write path.
 *
 * X-03: the draft carries NO `origin: 'engine'`. The gap is read from the
 * hub's own sample data (the LTP, SAP stock fixtures, hub POs and call-offs),
 * not from the forecast engine's synthetic dataset, so the engine-liveness
 * refusal on release does not apply to it; release stays on the Call-offs page
 * with its blanket-balance check, like any draft the planner types there.
 *
 * @param {string} today The SDC clock's date (`YYYY-MM-DD`).
 * @returns {{
 *   drafted: ReadonlyMap<string, string>;
 *   pending: boolean;
 *   createDraft: (g: SupplyGapRow, c: ProposedCallOff) => Promise<void>;
 * }}
 */
export const useDraftGapCallOff = (today) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useCallOffCommand();
  const [drafted, setDrafted] = useState(/** @type {ReadonlyMap<string, string>} */ (new Map()));

  /**
   * @param {SupplyGapRow} g
   * @param {ProposedCallOff} c
   */
  const createDraft = async (g, c) => {
    try {
      const res = await command.mutateAsync({
        verb: 'draft',
        poId: c.poId,
        poLineId: c.lineId,
        quantity: c.qty,
        needDate: draftNeedDate(g.week, today),
        type: 'forecast'
      });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('supplyGap.toast.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return;
      }
      setDrafted((prev) => new Map(prev).set(gapDraftKey(g, c), res.entityId ?? ''));
      toast({
        variant: 'success',
        title: t('supplyGap.toast.drafted'),
        description: t('supplyGap.toast.draftedDesc')
      });
    } catch {
      toast({ variant: 'error', title: t('supplyGap.toast.refused') });
    }
  };

  return { drafted, pending: command.isPending, createDraft };
};
