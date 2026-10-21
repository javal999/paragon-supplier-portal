import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useCallOffCommand } from '@services/query/commandHooks';
/** @import { Recommendation } from '@services/engine/orderSizing' */
/** @import { UmbrellaLine } from '../components/RecActionCell' */
import { draftNeedDate } from '../../orderPlan/orderPlanRelease';
import { keyOf } from '../utils';

/**
 * BR-05 — the planner's act on a recommendation: draft a call-off on the
 * supplier's open umbrella line with the EXISTING `draft` verb
 * (with the engine as its origin), then toast the outcome. Holds which recommendations
 * this page has drafted, by `keyOf` key, with the id of the call-off each one
 * created (IA-B13: the row links to that draft on Call-offs).
 *
 * @param {string} today The SDC clock's date (`YYYY-MM-DD`); a past week's need date moves to it.
 * @param {boolean} releaseWithheld X-03: the success toast says release will refuse the draft.
 * @returns {{
 *   drafted: ReadonlyMap<string, string>;
 *   pending: boolean;
 *   createDraft: (r: Recommendation, line: UmbrellaLine) => Promise<void>;
 * }}
 */
export const useDraftCallOff = (today, releaseWithheld) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useCallOffCommand();
  const [drafted, setDrafted] = useState(/** @type {ReadonlyMap<string, string>} */ (new Map()));

  /**
   * @param {Recommendation} r
   * @param {UmbrellaLine} line
   */
  const createDraft = async (r, line) => {
    try {
      const res = await command.mutateAsync({
        verb: 'draft',
        poId: line.po.id,
        poLineId: line.line.id,
        quantity: r.quantity,
        needDate: draftNeedDate(r.weekStart, today),
        type: 'forecast',
        origin: 'engine'
      });
      if (res.status === 'failed') {
        toast({
          variant: 'warning',
          title: t('op.toast.refused'),
          description: refusalText(res.reason) ?? res.reason ?? ''
        });
        return;
      }
      setDrafted((prev) => new Map(prev).set(keyOf(r), res.entityId ?? ''));
      toast({
        variant: 'success',
        title: t('op.toast.drafted'),
        description: t(releaseWithheld ? 'op.toast.draftedDescWithheld' : 'op.toast.draftedDesc')
      });
    } catch {
      toast({ variant: 'error', title: t('op.toast.refused') });
    }
  };

  return { drafted, pending: command.isPending, createDraft };
};
