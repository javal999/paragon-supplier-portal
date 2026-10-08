/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { CollapsedSection } from '@components/forecast/AboutThisPage';
import { formatIDR, formatNumber } from '@lib/format';
/** @import { OrderPlanView } from '@services/data/types' */

/**
 * The collapsed "Cost rates" section: the holding, order, rent and change
 * penalty rates in force (and the rented-space cap when one is set), each
 * labelled with its placeholder note (ENG-D6), and where the rates are set.
 * @type {React.FC<{ costs: NonNullable<OrderPlanView['costs']> }>}
 */
const CostRatesSection = ({ costs }) => {
  const { t } = useTranslation();
  return (
    <CollapsedSection
      title={t('op.costs.title')}
      testId="op-costs"
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-5"
    >
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
        {
          /** @type {const} */ ([
            [
              'holding',
              t('op.costs.holdingValue', {
                value: formatNumber(costs.holdingRatePerYear * 100)
              }),
              'op.costs.placeholder'
            ],
            ['order', formatIDR(costs.orderCostIdr), 'op.costs.placeholder'],
            ['rent', formatIDR(costs.rentIdrPerPalletWeek), 'op.costs.placeholder'],
            ['penalty', formatIDR(costs.changePenaltyIdrPerPallet), 'op.costs.placeholderPenalty'],
            ...(costs.maxRentedShare !== undefined
              ? /** @type {const} */ ([
                  [
                    'maxRent',
                    t('op.costs.maxRentValue', {
                      value: formatNumber(Math.round(costs.maxRentedShare * 1000) / 10)
                    }),
                    'op.costs.placeholderWarehouse'
                  ]
                ])
              : [])
          ]).map(([k, value, note]) => (
            <div key={k} data-testid={`op-cost-${k}`}>
              <dt className="text-text-secondary">{t(`op.costs.${k}`)}</dt>
              <dd>
                <Data>{value}</Data>
                <div
                  className="text-xs text-warning-hover"
                  data-testid={`op-cost-placeholder-${k}`}
                >
                  {t(note)}
                </div>
              </dd>
            </div>
          ))
        }
      </dl>
      <p className="text-xs text-text-tertiary mt-2">{t('op.costs.where')}</p>
    </CollapsedSection>
  );
};

export default CostRatesSection;
