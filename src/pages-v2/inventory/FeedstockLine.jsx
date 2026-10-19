/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate } from '@lib/format';
/** @import { InventoryPosition } from '@services/data/types' */
import {
  FEEDSTOCK_PROVISIONAL_QUESTIONS,
  feedstockTarget
} from '@services/transitions/feedstockRules';
import { qty } from './inventoryDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PTI · THE FEEDSTOCK LINE BESIDE THE SUPPLIER STOCK — BL-194, DRC-8 BR-c to
// BR-e (DRC-D17).
//
// Read only, under the supplier SOH figure on PTI's Stock page
// (`/buyer/inventory`), which shows supplier stock per supplier × material —
// the grain a confirmation is made at. It is its OWN line: feedstock is not
// stock until it is produced (MoM 2B), so it is never added to the SOH above
// it, to "supplier available" or to "free to call off" (MR-7 BR-01).
//
//   · BR-d [Default E2] — "confirmed by supplier on …" (the day the hub
//     recorded it). No "Reviewed by planner" marker: no acknowledge pattern
//     could be reused without a new verb.
//   · BR-e [Default E1] — target = LT spare × weekly demand. LT spare is 0 by
//     default, so the target reads 0, marked Provisional (E1). When LT spare is
//     above 0 the weekly demand is the forecast's average daily demand × 7,
//     and the target is left out when there is none.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The weekly demand behind the target: the forecast's average daily demand × 7,
 * or null when the row's demand is not from the forecast (LTP).
 * @param {InventoryPosition} p
 * @returns {number | null}
 */
const weeklyLtpDemand = (p) =>
  p.demandSource === 'forecast' && p.avgDailyDemand !== null ? p.avgDailyDemand * 7 : null;

/** @type {React.FC<{ position: InventoryPosition }>} */
const FeedstockLine = ({ position: p }) => {
  const { t } = useTranslation();
  const rowKey = `${p.supplierId}-${p.materialCode}`;
  const fs = p.feedstock;
  if (!fs)
    return (
      <div className="text-xs text-text-tertiary mt-1" data-testid={`pti-feedstock-none-${rowKey}`}>
        {t('fsConfirm.pti.none')}
      </div>
    );
  const target = feedstockTarget({ weeklyDemand: weeklyLtpDemand(p) });
  return (
    <div className="mt-1 text-xs text-text-secondary" data-testid={`pti-feedstock-${rowKey}`}>
      <div>
        {t('fsConfirm.pti.line', { date: formatDate(fs.confirmedOn) })}{' '}
        <Data>
          {qty(fs.feedstockQty)} {fs.uom}
        </Data>
      </div>
      <div className="text-text-tertiary" data-testid={`pti-feedstock-by-${rowKey}`}>
        {t('fsConfirm.pti.by', { date: formatDate(fs.recordedAt) })}
      </div>
      {target !== null && (
        <div className="text-text-tertiary" data-testid={`pti-feedstock-target-${rowKey}`}>
          {t('fsConfirm.pti.target')}{' '}
          <Data>
            {qty(target)} {fs.uom}
          </Data>
        </div>
      )}
      {/* Design rule 5 — the cadence and review (E2) and the target (E1) are [Default]s. */}
      <div className="text-text-tertiary" data-testid={`pti-feedstock-provisional-${rowKey}`}>
        {t('fsConfirm.provisional', { question: FEEDSTOCK_PROVISIONAL_QUESTIONS.join(', ') })}
      </div>
    </div>
  );
};

export default FeedstockLine;
