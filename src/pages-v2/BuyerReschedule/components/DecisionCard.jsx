/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate, formatNumber } from '@lib/format';
/** @import { WarehouseDecision, WarehousePlanView } from '@services/data/types' */
import { pal, weekLabel } from '../utils';
import DecisionControl from './DecisionControl';
import DecisionInForce from './DecisionInForce';

// ── FUX-D3 (F-10, F-22) · THE WAREHOUSE-WEEK DECISION ───────────────────────
// The weeks that do not fit even with the most rented space come from the order
// plan (`shortfallWeeks`, BL-117); the decision for each is recorded through
// `t_warehousedecision_record` and read back from the ledger on this page's own
// read. The page pre-checks with the same rule the verb's policy hook calls
// (`warehouseDecisionRefusal`, MAT-R2). A seat without the atom sees who acts.

/**
 * The card: every week of the warehouse shown that does not fit, its saved decision, and the control.
 * @type {React.FC<{ plan: WarehousePlanView; rate: number; ledger: readonly WarehouseDecision[]; currentVersion: number | null; }>}
 */
const DecisionCard = ({ plan, rate, ledger, currentVersion }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability('warehousedecision:record');
  return (
    <section
      className="bg-bg-surface border border-danger rounded-lg p-4 mb-6"
      data-testid="rs-decide"
    >
      <h2 className="text-section text-text-primary mb-1">{t('rs.decide.title')}</h2>
      <p className="text-xs text-text-tertiary mb-1">
        {t('rs.decide.intro', { max: formatNumber(Math.round(plan.maxRentedPallets ?? 0)) })}
      </p>
      <p className="text-xs text-text-tertiary mb-1" data-testid="rs-decide-basis">
        {t('rs.decide.basis')}
      </p>
      <p className="text-xs text-text-secondary mb-3" data-testid="rs-decide-intent">
        {t('rs.decide.intent')}
      </p>
      {availability.kind !== 'held' && (
        <HandoffNotice availability={availability} testId="handoff-reschedule-decision" />
      )}
      {plan.shortfallWeeks.map((sw) => (
        <div
          key={sw.weekStart}
          className="border border-border-subtle rounded-md p-4 mt-3"
          data-testid={`rs-decide-week-${sw.weekStart}`}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
            <h3 className="text-sm font-semibold text-text-primary">
              <Data>{weekLabel(sw.weekStart)}</Data> · <Data>{formatDate(sw.weekStart)}</Data>
            </h3>
            <span className="text-sm text-danger" data-testid={`rs-decide-pallets-${sw.weekStart}`}>
              {t('rs.decide.pallets', { value: pal(sw.shortfallPallets) })}
            </span>
            <span className="text-xs text-text-tertiary">
              {t('rs.decide.against', { pallets: pal(sw.pallets), limit: pal(sw.limitPallets) })}
            </span>
          </div>
          {sw.unavoidable && (
            <p
              className="text-xs text-text-secondary mb-2"
              data-testid={`rs-decide-unavoidable-${sw.weekStart}`}
            >
              {t('rs.decide.unavoidable')}
            </p>
          )}
          <DecisionInForce
            weekStart={sw.weekStart}
            ledger={ledger}
            stream={plan.kind}
            currentVersion={currentVersion}
          />
          {availability.kind === 'held' && (
            <DecisionControl key={`${plan.kind}-${sw.weekStart}`} sw={sw} plan={plan} rate={rate} />
          )}
        </div>
      ))}
    </section>
  );
};

export default DecisionCard;
