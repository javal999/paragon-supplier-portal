/** @import React from 'react' */
/** @import { CapacityDecision } from '@services/data/types' */
/** @import { LtpCapacityWeek } from '@services/transitions/capacityRules' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useToast } from '@hooks/useToast';
import { formatDate } from '@lib/format';
import { useCapacityDecisionCommand } from '@services/query/commandHooks';
import {
  capacityAcceptRefusal,
  capacityDecisionRefusalOf,
  uncoveredByAdditional
} from '@services/transitions/capacityDecisionRules';
import AskSupplierButton from './AskSupplierButton';
import { qty } from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// INV-D8 (Inventory UX P-07) — PTI's actions on one capacity gap week, and the
// "PTI's decision" line on a supplier × planning group row.
//
//   · Amber week ("Needs the additional capacity"): "Accept additional
//     capacity", recorded on the supplier × planning group × week through
//     `t_capacitydecision_accept`; once accepted, "Accepted <date>".
//   · Red week ("Cannot be supplied"): no accept — the additional capacity
//     cannot cover it — and the sentence says how much is still short.
//   · Both: lane 2A's "Ask supplier" on the planning group and week.
//   · "Move demand" is not built here (INV-D8).
//
// Whether Accept shows is decided by `capacityAcceptRefusal`, the verb's own
// rule (RFX-R2). The act is gated on its atom (§84): a seat without
// `capacitydecision:accept` sees whose act it is instead of the button.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {object} CapacityGapActionsProps
 * @property {string} supplierId
 * @property {string} planningGroupId
 * @property {string} uom
 * @property {LtpCapacityWeek} week The week's LTP check (amber or red).
 * @property {CapacityDecision | undefined} decision PTI's decision on the week, if any.
 * @property {string} testKey `<supplierId>-<planningGroupId>-<week>`, for test ids.
 */

/** @type {React.FC<CapacityGapActionsProps>} */
export const CapacityGapActions = ({
  supplierId,
  planningGroupId,
  uom,
  week,
  decision,
  testKey
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const availability = useVerbAvailability('capacitydecision:accept');
  const command = useCapacityDecisionCommand();
  const canAccept =
    capacityAcceptRefusal({ level: week.level, accepted: decision !== undefined }) === null;
  const uncovered = uncoveredByAdditional(week);

  const accept = async () => {
    const result = await command.mutateAsync({ supplierId, planningGroupId, week: week.week });
    if (result.status === 'failed') {
      const code = capacityDecisionRefusalOf(result.reason);
      toast({
        variant: 'error',
        title: code
          ? t(`capDecision.refusal.${code}`)
          : t('capDecision.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({ variant: 'success', title: t('capDecision.toast.accepted') });
  };

  return (
    <div className="flex flex-col items-start gap-1.5 min-w-[160px]">
      {decision ? (
        <span className="text-xs text-text-secondary" data-testid={`capacity-accepted-${testKey}`}>
          {t('capDecision.accepted')} <Data>{formatDate(decision.decidedAt)}</Data>
        </span>
      ) : null}
      {uncovered !== null ? (
        <span className="text-xs text-danger" data-testid={`capacity-cannot-cover-${testKey}`}>
          {t('capDecision.cannotCover')}{' '}
          <Data className="text-danger">{`${qty(uncovered)} ${uom}`}</Data>
        </span>
      ) : null}
      {canAccept && availability.kind === 'held' ? (
        <Button
          variant="outline"
          disabled={command.isPending}
          onClick={() => void accept()}
          aria-label={t('capDecision.acceptFor', { week: formatDate(week.week) })}
          data-testid={`capacity-accept-${testKey}`}
        >
          {t('capDecision.accept')}
        </Button>
      ) : null}
      {canAccept && availability.kind !== 'held' ? (
        <HandoffNotice availability={availability} testId="handoff-capacitydecision-accept" />
      ) : null}
      <AskSupplierButton
        supplierId={supplierId}
        planningGroupId={planningGroupId}
        week={week.week}
        topic="capacityGap"
        testId={`capacity-ask-${testKey}`}
      />
    </div>
  );
};

/**
 * The row's "PTI's decision" line: pending while no gap week is accepted;
 * accepted <latest date> once one is, with how many gap weeks still wait.
 * Null when the row has no gap week.
 * @type {React.FC<{
 *   gapWeeks: readonly string[];
 *   decisionOf: (week: string) => CapacityDecision | undefined;
 *   testId: string;
 * }>}
 */
export const PtiDecisionLine = ({ gapWeeks, decisionOf, testId }) => {
  const { t } = useTranslation();
  if (gapWeeks.length === 0) return null;
  const decided = gapWeeks
    .map(decisionOf)
    .filter(/** @returns {d is CapacityDecision} */ (d) => d !== undefined);
  const pending = gapWeeks.length - decided.length;
  const latest = decided.map((d) => d.decidedAt).sort()[decided.length - 1];
  return (
    <span className="text-xs text-text-secondary" data-testid={testId}>
      {t('capDecision.header.label')}{' '}
      {latest ? (
        <>
          {t('capDecision.header.accepted')} <Data>{formatDate(latest)}</Data>
          {pending > 0 ? (
            <>
              <span className="text-text-tertiary"> · </span>
              {t('capDecision.header.pendingWeeks', { count: pending })}
            </>
          ) : null}
        </>
      ) : (
        t('capDecision.header.pending')
      )}
    </span>
  );
};
