/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatNumber } from '@lib/format';
/** @import { WarehousePlanView } from '@services/data/types' */

/**
 * The selected warehouse's facts line — kind, id, owned capacity and the most
 * rented space the administrator allows — and, when the plan was sized by the
 * BR-02 fallback method, the line that says so and why.
 * @type {React.FC<{ w: WarehousePlanView }>}
 */
const WarehouseFacts = ({ w }) => {
  const { t } = useTranslation();
  return (
    <>
      <p className="text-sm text-text-secondary mb-3" data-testid="op-capacity">
        {t(`op.warehouse.${w.kind}`)} · <Data>{w.warehouseId ?? '—'}</Data> ·{' '}
        {t('op.warehouse.capacity')}{' '}
        <Data>
          {w.capacityPallets === null
            ? '—'
            : t('op.warehouse.pallets', { value: formatNumber(w.capacityPallets) })}
        </Data>
        {w.maxRentedPallets !== null && (
          <>
            {' '}
            · {t('op.warehouse.maxRented')}{' '}
            <Data data-testid="op-max-rented">
              {t('op.warehouse.pallets', {
                value: formatNumber(Math.round(w.maxRentedPallets))
              })}
            </Data>
          </>
        )}
      </p>
      {w.method === 'fallback' && (
        <p className="text-sm text-warning-hover mb-3" data-testid="op-fallback">
          {t('op.fallback', { reason: w.fallbackReason ?? '' })}
        </p>
      )}
    </>
  );
};

export default WarehouseFacts;
