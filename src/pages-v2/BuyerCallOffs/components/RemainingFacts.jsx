/** @import React from 'react' */
/** @import { POLineItem } from '@services/data/types' */
/** @import { umbrellaRemaining } from '@services/transitions/callOffRules' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatIDR } from '@lib/format';
import { qty } from '../../callOffs/callOffDisplay';

/**
 * CR-04 / BL-49 — an umbrella line's ordered, released and remaining figures on
 * the line's own basis (quantity by default, value only where the line carries
 * no quantity), then the sentence naming that basis.
 * @type {React.FC<{ line: POLineItem; remaining: ReturnType<typeof umbrellaRemaining> }>}
 */
const RemainingFacts = ({ line, remaining }) => {
  const { t } = useTranslation();
  return (
    <>
      {/* CR-04 / BL-49 — a line's own basis: quantity by default, value
          only where the line carries no quantity. */}
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <div>
          <dt className="inline text-text-tertiary">
            {t(
              remaining.basis === 'quantity' ? 'co.umbrella.ordered' : 'co.umbrella.orderedValue'
            )}{' '}
          </dt>
          <dd className="inline">
            <Data>
              {remaining.orderedQty === null
                ? formatIDR(remaining.orderedValue)
                : `${qty(remaining.orderedQty)} ${line.uom}`}
            </Data>
          </dd>
        </div>
        <div>
          <dt className="inline text-text-tertiary">{t('co.umbrella.released')} </dt>
          <dd className="inline">
            <Data>
              {remaining.basis === 'quantity'
                ? `${qty(remaining.releasedQty)} ${line.uom}`
                : formatIDR(remaining.releasedValue)}
            </Data>
          </dd>
        </div>
        {remaining.remainingQty !== null && (
          <div>
            <dt className="inline text-text-tertiary">{t('co.umbrella.remaining')} </dt>
            <dd className="inline" data-testid={`calloff-remaining-${line.id}`}>
              <Data className="font-semibold">{`${qty(remaining.remainingQty)} ${line.uom}`}</Data>
            </dd>
          </div>
        )}
        <div>
          <dt className="inline text-text-tertiary">{t('co.umbrella.remainingValue')} </dt>
          <dd className="inline" data-testid={`calloff-remaining-value-${line.id}`}>
            <Data className={remaining.basis === 'value' ? 'font-semibold' : undefined}>
              {formatIDR(remaining.remainingValue)}
            </Data>
          </dd>
        </div>
      </dl>
      <p className="mt-1 text-[11px] text-text-tertiary" data-testid={`calloff-basis-${line.id}`}>
        {t(remaining.basis === 'quantity' ? 'co.umbrella.byQuantity' : 'co.umbrella.noQuantity')}
      </p>
    </>
  );
};

export default RemainingFacts;
