/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { deepLink } from '@lib/deepLink';

// IA P-06, owner ruling 2026-10-21: Stock simulation stays its own page
// (MAT-D2, REQ-E08-01 BR-01: the stock page shows no separate available
// figure). Each Stock row links to it, narrowed to that supplier and material,
// so the estimate is one click away without appearing on this page.

/**
 * The Stock simulation address for one supplier × material row.
 * @param {string} materialCode
 * @param {string} supplierId
 * @returns {string}
 */
export const estimateHref = (materialCode, supplierId) =>
  deepLink('/buyer/stock-simulation', { supplier: supplierId, q: materialCode });

/**
 * @typedef {object} SeeEstimateLinkProps
 * @property {string} materialCode
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} [testId]
 */

/** @type {React.FC<SeeEstimateLinkProps>} */
const SeeEstimateLink = ({ materialCode, supplierId, supplierName, testId }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={estimateHref(materialCode, supplierId)}
      className="inline-block mt-1 text-xs text-action-hover underline"
      aria-label={t('sim.row.seeEstimateAria', { material: materialCode, supplier: supplierName })}
      data-testid={testId}
    >
      {t('sim.row.seeEstimate')}
    </Link>
  );
};

export default SeeEstimateLink;
