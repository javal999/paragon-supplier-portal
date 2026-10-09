/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import DataAsOf from '@components/forecast/DataAsOf';
import { formatDate } from '@lib/format';
/** @import { OrderPlanView } from '@services/data/types' */

/**
 * The page's "data as of" line: the finished-goods plan the requirement used
 * and the horizon in weeks (or "no plan"), plus the previous run BR-03
 * compares against. Reads the run only.
 * @type {React.FC<{ run: OrderPlanView | null }>}
 */
const PlanAsOf = ({ run }) => {
  const { t } = useTranslation();
  return (
    <DataAsOf
      date={run?.planMadeAt ?? null}
      detail={
        <>
          {run?.planMadeAt ? (
            <>
              <span data-testid="op-plan-source">
                {t('op.meta.plan')} <Data>{formatDate(run.planMadeAt)}</Data>
              </span>{' '}
              · {t('op.meta.horizon')} {t('op.meta.weeks', { count: run.weeks.length })}
            </>
          ) : (
            t('op.meta.noPlan')
          )}
          {run?.previousAsOf && (
            <>
              {' '}
              · {t('op.meta.previous')} <Data>{formatDate(run.previousAsOf)}</Data>
            </>
          )}
        </>
      }
    />
  );
};

export default PlanAsOf;
