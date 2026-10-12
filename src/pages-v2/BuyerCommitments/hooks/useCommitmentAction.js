import { useState } from 'react';
import { moveView } from '../utils';
/** @import { TFunction } from 'i18next' */
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { RequirementResponse } from '@services/sdc/types' */
/** @import { Action } from '../const' */
/** @import { useForecastRunner } from '../../forecasts/forecastDisplay' */

/**
 * The planner's three actions on an exception (BR-05): which one the side
 * panel stands open on, its note and, for Move demand, the quantity typed for
 * each qualified supplier (CAP-8), and the submit that dispatches it — accept,
 * request revision (with the note the supplier reads), or move part or all of
 * the period's shortfall to one or more qualified suppliers as ONE verb with
 * one allocation per supplier. The panel closes only when the command
 * succeeds; a move the shortfall rule refuses is never sent.
 * @param {ReturnType<typeof useForecastRunner>['run']} run  The forecast command runner (`useForecastRunner().run`).
 * @param {TFunction} t  The page's translator, for the success toasts.
 */
export function useCommitmentAction(run, t) {
  const [action, setAction] = useState(/** @type {Action | null} */ (null));
  const [note, setNote] = useState('');
  const [qtys, setQtys] = useState(/** @type {Record<string, string>} */ ({}));

  /**
   * @param {Action['kind']} kind
   * @param {ForecastCommitmentLine} line
   */
  const openAction = (kind, line) => {
    setAction({ kind, line });
    setNote('');
    setQtys({});
  };

  /**
   * @param {string} supplierId
   * @param {string} raw
   */
  const setQty = (supplierId, raw) => setQtys((prev) => ({ ...prev, [supplierId]: raw }));

  const submitAction = async () => {
    if (!action) return;
    const { kind, line } = action;
    if (kind === 'reassign') {
      const move = moveView(line, qtys);
      if (move.refused !== null) return;
      const res = await run(
        {
          verb: 'reassign',
          publicationId: line.publicationId,
          materialCode: line.materialCode,
          periodBucket: line.periodBucket,
          fromSupplierId: line.supplierId,
          allocations: move.allocations,
          note
        },
        t('fc.pti.gaps.toast.reassigned')
      );
      if (res.ok) setAction(null);
      return;
    }
    const res =
      kind === 'accept'
        ? await run(
            {
              verb: 'accept',
              responseId: /** @type {RequirementResponse} */ (line.response).id,
              status: /** @type {RequirementResponse} */ (line.response).status
            },
            t('fc.pti.gaps.toast.accepted')
          )
        : await run(
            {
              verb: 'requestRevision',
              responseId: /** @type {RequirementResponse} */ (line.response).id,
              status: /** @type {RequirementResponse} */ (line.response).status,
              note
            },
            t('fc.pti.gaps.toast.revision')
          );
    if (res.ok) setAction(null);
  };

  return { action, setAction, note, setNote, qtys, setQty, openAction, submitAction };
}
