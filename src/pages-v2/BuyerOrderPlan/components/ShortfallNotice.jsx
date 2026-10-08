/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

/**
 * BL-117 / FUX-D3 (F-10): the count of weeks where no plan fits even with the
 * most rented space allowed, with the link to Make warehouse room, where the
 * decision for them is made and saved. The page renders it only when the
 * count is above zero.
 * @type {React.FC<{ count: number }>}
 */
const ShortfallNotice = ({ count }) => {
  const { t } = useTranslation();
  return (
    <p
      className="text-sm text-text-primary bg-bg-surface border border-danger rounded-lg px-4 py-3 mb-6"
      data-testid="op-shortfall-count"
    >
      {t('op.short.count', { count })}{' '}
      <Link to="/buyer/reschedule" className="text-action-hover underline">
        {t('op.short.decide')}
      </Link>
    </p>
  );
};

export default ShortfallNotice;
