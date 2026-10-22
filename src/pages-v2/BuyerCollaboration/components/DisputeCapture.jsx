/** @import React from 'react' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { useDisputeRequirementResponse } from '@services/query/sdcBuyerHooks' */
/** @import { CoverageRow } from '../const' */
/** @import { useOutcomeOf } from '../hooks/useOutcomeOf' */
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { responseOf, supplierName } from '../utils';
import ReasonPanel from './ReasonPanel';

/**
 * The dispute capture: the SAME `ReasonPanel` as the resolve capture, with the
 * dispute verb's words, test ids and atom. The commit fires
 * `t_requirementresponse_dispute` with the authored objection, then closes the
 * capture. The page mounts this only while a row is open and owns `disputing`
 * and `objection`.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{
 *   disputing: CoverageRow;
 *   objection: string;
 *   setObjection: (objection: string) => void;
 *   disputeMutation: ReturnType<typeof useDisputeRequirementResponse>;
 *   closeDispute: () => void;
 *   disputeAvailability: VerbAvailability;
 *   outcomeOf: ReturnType<typeof useOutcomeOf>;
 * }>}
 */
const DisputeCapture = ({
  disputing,
  objection,
  setObjection,
  disputeMutation,
  closeDispute,
  disputeAvailability,
  outcomeOf
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  // The response behind the open panel, resolved once, for the screen-reader
  // label (the same reason as `resolvingResponse` in ResolveCapture).
  const disputingResponse = disputing ? responseOf(disputing.state) : null;

  return (
    <ReasonPanel
      row={disputing}
      answer={objection}
      onAnswer={setObjection}
      pending={disputeMutation.isPending}
      onCancel={closeDispute}
      availability={disputeAvailability}
      testIds={{ input: 'sdc-dispute-input', commit: 'sdc-dispute-commit' }}
      copy={{
        title: t('sdc.dispute.panelTitle', { material: disputing?.line.materialCode ?? '' }),
        heading: t('sdc.dispute.section.objection'),
        srLabel: t('sdc.dispute.srLabel', {
          supplier: supplierName(disputingResponse?.supplierId ?? ''),
          material: disputing?.line.materialCode ?? ''
        }),
        placeholder: t('sdc.dispute.placeholder'),
        note: t('sdc.dispute.note'),
        cancel: t('sdc.dispute.cancel'),
        commit: t('sdc.dispute.commit')
      }}
      onCommit={() => {
        const row = disputing;
        const response = row ? responseOf(row.state) : null;
        if (!row || !response) return;
        // Same shape and same honesty as the resolve commit above: unreachable
        // while `disabled` holds, kept as what catches an edit that removes it.
        if (!objection.trim()) {
          toast({ variant: 'warning', title: t('sdc.dispute.missingReason') });
          return;
        }
        disputeMutation.mutate(
          {
            responseId: response.id,
            supplierId: response.supplierId,
            disputeReason: objection.trim()
          },
          outcomeOf(row, response, 'dispute', closeDispute)
        );
      }}
    />
  );
};

export default DisputeCapture;
