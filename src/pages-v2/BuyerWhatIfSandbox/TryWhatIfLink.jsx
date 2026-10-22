/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { deepLink } from '@lib/deepLink';

// ─────────────────────────────────────────────────────────────────────────────
// P-07 (IA-B10) — the what-if sandbox opens from a material row.
//
// A row on What to order or on Inventory names one supplier × material; this
// link opens the sandbox on that pair (`?material=&supplier=`, which the
// sandbox already reads). A secondary link, never a button: it changes
// nothing, and the sandbox is analysis only (DRC-17 BR-06).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The sandbox's address for one supplier × material.
 * @param {string} materialCode
 * @param {string} supplierId
 * @returns {string}
 */
export const whatIfHref = (materialCode, supplierId) =>
  deepLink('/buyer/what-if', { material: materialCode, supplier: supplierId });

/**
 * @typedef {object} TryWhatIfLinkProps
 * @property {string} materialCode
 * @property {string} supplierId
 * @property {string} supplierName Read out in the link's accessible name.
 * @property {string} testId
 */

/** @type {React.FC<TryWhatIfLinkProps>} */
const TryWhatIfLink = ({ materialCode, supplierId, supplierName, testId }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={whatIfHref(materialCode, supplierId)}
      className="inline-block mt-1 text-xs text-action-hover underline"
      aria-label={t('whatIf.row.tryAria', { material: materialCode, supplier: supplierName })}
      data-testid={testId}
    >
      {t('whatIf.row.try')}
    </Link>
  );
};

export default TryWhatIfLink;
