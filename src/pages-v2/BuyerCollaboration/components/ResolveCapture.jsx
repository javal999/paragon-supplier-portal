/** @import React from 'react' */
/** @import { VerbAvailability } from '@services/transitions/handoff' */
/** @import { useResolveRequirementDispute } from '@services/query/sdcBuyerHooks' */
/** @import { CoverageRow } from '../const' */
/** @import { useOutcomeOf } from '../hooks/useOutcomeOf' */
import { useTranslation } from 'react-i18next';
import { useToast } from '@hooks/useToast';
import { responseOf, supplierName } from '../utils';
import ReasonPanel from './ReasonPanel';

/**
 * The resolve capture: `ReasonPanel` with the resolve verb's words, test ids
 * and atom. The commit fires `t_requirementresponse_resolve` with the authored
 * answer, then closes the capture. The page mounts this only while a row is
 * open and owns `resolving` and `answer`.
 *
 * Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split (no behaviour
 * change).
 * @type {React.FC<{
 *   resolving: CoverageRow;
 *   answer: string;
 *   setAnswer: (answer: string) => void;
 *   resolveMutation: ReturnType<typeof useResolveRequirementDispute>;
 *   closeResolve: () => void;
 *   resolveAvailability: VerbAvailability;
 *   outcomeOf: ReturnType<typeof useOutcomeOf>;
 * }>}
 */
const ResolveCapture = ({
  resolving,
  answer,
  setAnswer,
  resolveMutation,
  closeResolve,
  resolveAvailability,
  outcomeOf
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  // The response behind each open panel, resolved once. The panels need it only
  // for the screen-reader label, and reaching for it inline would mean asking
  // `responseOf` for a row that may be null in the middle of a props literal.
  const resolvingResponse = resolving ? responseOf(resolving.state) : null;

  return (
    <ReasonPanel
      row={resolving}
      answer={answer}
      onAnswer={setAnswer}
      pending={resolveMutation.isPending}
      onCancel={closeResolve}
      availability={resolveAvailability}
      testIds={{ input: 'sdc-resolve-input', commit: 'sdc-resolve-commit' }}
      copy={{
        title: t('sdc.resolve.panelTitle', { material: resolving?.line.materialCode ?? '' }),
        heading: t('sdc.resolve.section.answer'),
        srLabel: t('sdc.resolve.srLabel', {
          supplier: supplierName(resolvingResponse?.supplierId ?? ''),
          material: resolving?.line.materialCode ?? ''
        }),
        placeholder: t('sdc.resolve.placeholder'),
        note: t('sdc.resolve.note'),
        cancel: t('sdc.resolve.cancel'),
        commit: t('sdc.resolve.commit')
      }}
      onCommit={() => {
        const row = resolving;
        const response = row ? responseOf(row.state) : null;
        if (!row || !response) return;
        // ⚠️ THIS BRANCH IS UNREACHABLE WHILE THE COMMIT IS DISABLED, AND THE
        // MUTATION PROBE SAYS SO RATHER THAN THE COMMENT CLAIMING OTHERWISE.
        // Replacing it with `if (false)` kills NOTHING - no test can click a
        // disabled button, so no test can reach here. It is kept as the thing
        // that catches a future edit removing `disabled`, and it is honestly
        // BELT, NOT A LAYER: writing "three guards" over one reachable guard
        // and one unreachable one would be claiming coverage that does not
        // exist. The two that DO bite are the disabled commit (asserted, and
        // a mutation kills it) and `rr_dispute_text_authored` at the
        // TRANSITION (asserted, and the only one a hand-crafted dispatch
        // cannot skip). The neighbour this panel copies (BuyerInvoices) has
        // only this unreachable-shaped one and no disabled commit at all -
        // measured on the tree, not assumed from the pattern.
        if (!answer.trim()) {
          toast({ variant: 'warning', title: t('sdc.resolve.missingReason') });
          return;
        }
        resolveMutation.mutate(
          {
            responseId: response.id,
            supplierId: response.supplierId,
            resolutionReason: answer.trim()
          },
          outcomeOf(row, response, 'resolve', closeResolve)
        );
      }}
    />
  );
};

export default ResolveCapture;
