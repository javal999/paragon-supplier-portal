/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import { formatDate } from '@lib/format';
/** @import { WarehouseDecision } from '@services/data/types' */
/** @import { WarehouseKind } from '@services/engine/types' */
import {
  decisionInForce,
  earlierDecisions,
  madeOnOlderPlan
} from '@services/transitions/warehouseDecisionRules';

/**
 * The decision in force for a week, with the review marker when the plan has moved on.
 * @type {React.FC<{ weekStart: string; ledger: readonly WarehouseDecision[]; stream: WarehouseKind; currentVersion: number | null }>}
 */
const DecisionInForce = ({ weekStart, ledger, stream, currentVersion }) => {
  const { t } = useTranslation();
  const now = decisionInForce(ledger, stream, weekStart);
  const earlier = earlierDecisions(ledger, stream, weekStart).length;
  if (!now)
    return (
      <p className="text-xs text-text-tertiary mb-2" data-testid={`rs-decide-none-${weekStart}`}>
        {t('rs.decide.none')}
      </p>
    );
  const vars = {
    choice: t(`rs.decide.inline.${now.choice}`),
    date: formatDate(now.recordedAt),
    version: now.planVersion ?? ''
  };
  return (
    <div className="mb-2" data-testid={`rs-decide-inforce-${weekStart}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-primary">
          {t(now.planVersion === null ? 'rs.decide.inForce.noVersion' : 'rs.decide.inForce', vars)}
        </span>
        {madeOnOlderPlan(now, currentVersion) && (
          <span data-testid={`rs-decide-older-${weekStart}`}>
            <StatusPill variant="warning">{t('rs.decide.olderPlan')}</StatusPill>
          </span>
        )}
      </div>
      {now.note !== null && <p className="text-xs text-text-secondary mt-1">{now.note}</p>}
      {earlier > 0 && (
        <p className="text-xs text-text-tertiary mt-1">
          {t('rs.decide.earlier', { count: earlier })}
        </p>
      )}
    </div>
  );
};

export default DecisionInForce;
