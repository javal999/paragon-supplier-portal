/** @import { TFunction } from 'i18next' */
/** @import { RequirementResponse } from '@services/sdc' */
/** @import { CommandResult } from '@services/data/types' */
/** @import { CoverageRow } from '../const' */
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { supplierName } from '../utils';

/**
 * Returns `outcomeOf`, the mutate options every verb on this page passes: a
 * success toast (then `after`), or a warning toast that states a refusal's
 * reason. Owns the page's `useRefusalText` and `useToast`.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @param {TFunction} t
 */
export function useOutcomeOf(t) {
  const refusalText = useRefusalText();
  const { toast } = useToast();

  /**
   * WAVE C — the outcome contract every verb on this lane shares.
   *
   * ⚠️ **A REFUSAL STATES ITS REASON RATHER THAN PROCEEDING, AND THAT IS THE
   * WHOLE REASON THIS IS ONE HELPER.** `dispatch` RESOLVES on a refusal — it
   * does not throw — so a caller that only handles `onError` reports a refused
   * command as a success. That mistake is invisible on the happy path and is
   * exactly what gets re-made when three call sites each write their own
   * handler. `refusalText` turns the machine's code into the seat's language;
   * the raw code is the fallback so an untranslated refusal still says
   * something true rather than nothing.
   * @param {CoverageRow} row
   * @param {RequirementResponse} response
   * @param {'review' | 'accept' | 'dispute' | 'resolve'} prefix
   * @param {() => void} [after]
   */
  const outcomeOf = (row, response, prefix, after) => {
    /** @param {string} [description] */
    const failed = (description) =>
      toast({
        variant: /** @type {const} */ ('warning'),
        title: t(`sdc.${prefix}.failed.title`, { material: row.line.materialCode }),
        ...(description ? { description } : {})
      });
    return {
      /** @param {CommandResult} res */
      onSuccess: (res) => {
        if (res.status === 'failed') {
          failed(refusalText(res.reason) ?? res.reason);
          return;
        }
        toast({
          variant: /** @type {const} */ ('success'),
          title: t(`sdc.${prefix}.done.title`, { material: row.line.materialCode }),
          description: t(`sdc.${prefix}.done.body`, {
            supplier: supplierName(response.supplierId)
          })
        });
        after?.();
      },
      onError: () => failed()
    };
  };

  return outcomeOf;
}
