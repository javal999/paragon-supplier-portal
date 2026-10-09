/** @import React from 'react' */
/** @import { ContractDisplayStatus } from '@services/data/contractExpiry' */
import { useTranslation } from 'react-i18next';
import { CONTRACT_EXPIRY_TONE } from '@services/data/contractExpiry';

/** The expiry figure a row shows, derived from the contract's own `endDate`.
 *  Returns `null` when there is no readable end date — rendered as an em dash
 * @type {React.FC<{ days: number | null; display: ContractDisplayStatus; }>}
 *  rather than as a zero, because "no end date" is not "expires today".
 *  Moved out of `BuyerContracts.jsx` by the Phase 5 page split (no behaviour
 *  change). */
const ExpiryCell = ({ days, display }) => {
  const { t } = useTranslation();
  if (days === null) return <div className="text-sm whitespace-nowrap text-text-tertiary">—</div>;
  return (
    <div className={`text-sm whitespace-nowrap ${CONTRACT_EXPIRY_TONE[display]}`}>
      {/* The FIGURE keeps its three renderings — `today` is a legible way to
          say zero and is not a state claim. The ruled boundary makes zero PAST,
          which the tone above now says (danger, via `Expired`), so the cell
          reads "Today" in red rather than "Today" in amber. */}
      {days < 0
        ? t('contracts.expiry.daysAgo', { count: Math.abs(days) })
        : days === 0
          ? t('contracts.expiry.today')
          : t('contracts.expiry.daysLeft', { count: days })}
    </div>
  );
};

export default ExpiryCell;
