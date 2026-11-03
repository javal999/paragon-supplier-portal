/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

// ─────────────────────────────────────────────────────────────────────────────
// BASIS LINE — FSR-D1 (BL-237, C-01).
//
// One sentence under a figure group naming its dataset AND its standing. Until
// the SAP feeds land the hub sample data (LTP, demand anticipation, call-offs,
// OSIP columns) is the PLAN OF RECORD, and the engine dataset (What to order
// netting, Material requirement, the Safety stock challenger columns) is the
// CHALLENGER. The wording is shared so every page says it the same way, the
// way the Below demand anticipation section names its dataset
// (`supplyGap.sample`).
//
// Presentation only (FUX-R1): it reads no data and changes no figure.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'planOfRecord' | 'challenger'} BasisStanding */

/**
 * `standing`:  Which of the two datasets the figure group is.
 *
 * @typedef {{
 *     readonly standing: BasisStanding;
 *     readonly className?: string;
 *   }} BasisLineProps
 */

/** @type {React.FC<BasisLineProps>} */
const BasisLine = ({ standing, className = '' }) => {
  const { t } = useTranslation();
  return (
    <p
      className={`text-xs text-text-secondary ${className}`}
      data-testid="basis-line"
      data-standing={standing}
    >
      {t(`supplyGap.standing.${standing}`)}
    </p>
  );
};

export default BasisLine;
