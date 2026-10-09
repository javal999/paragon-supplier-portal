import { useState } from 'react';
/** @import { TFunction } from 'i18next' */
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { RequirementResponse } from '@services/sdc/types' */
/** @import { Action } from '../const' */
/** @import { useForecastRunner } from '../../forecasts/forecastDisplay' */

/**
 * The planner's three actions on an exception (BR-05): which one the side
 * panel stands open on, its note and its reassignment target, and the submit
 * that dispatches it — accept, request revision (with the note the supplier
 * reads), or move the period's demand to another qualified supplier. The panel
 * closes only when the command succeeds.
 * @param {ReturnType<typeof useForecastRunner>['run']} run  The forecast command runner (`useForecastRunner().run`).
 * @param {TFunction} t  The page's translator, for the success toasts.
 */
export function useCommitmentAction(run, t) {
  const [action, setAction] = useState(/** @type {Action | null} */ (null));
  const [note, setNote] = useState('');
  const [toSupplier, setToSupplier] = useState('');

  /**
   * @param {Action['kind']} kind
   * @param {ForecastCommitmentLine} line
   */
  const openAction = (kind, line) => {
    setAction({ kind, line });
    setNote('');
    setToSupplier('');
  };

  const submitAction = async () => {
    if (!action) return;
    const { kind, line } = action;
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
        : kind === 'revise'
          ? await run(
              {
                verb: 'requestRevision',
                responseId: /** @type {RequirementResponse} */ (line.response).id,
                status: /** @type {RequirementResponse} */ (line.response).status,
                note
              },
              t('fc.pti.gaps.toast.revision')
            )
          : await run(
              {
                verb: 'reassign',
                publicationId: line.publicationId,
                materialCode: line.materialCode,
                periodBucket: line.periodBucket,
                fromSupplierId: line.supplierId,
                toSupplierId: toSupplier,
                note
              },
              t('fc.pti.gaps.toast.reassigned')
            );
    if (res.ok) setAction(null);
  };

  return { action, setAction, note, setNote, toSupplier, setToSupplier, openAction, submitAction };
}
