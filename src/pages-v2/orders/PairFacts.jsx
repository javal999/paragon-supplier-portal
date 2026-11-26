import { useTranslation } from 'react-i18next';
import { formatNumber } from '@lib/format';
import { useFixedStockReconcile, useInventory } from '@services/query/hooks';

// ─────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-F16 — WHAT DECIDES THE DECISION, ON THE PANEL.
//
// The planner used to accept a counter-offer or approve a call-off with no view
// of what decides it. Two figures, both read from a surface that already holds
// them, no new rule:
//   · Open balance — the pair's PO quantity not yet called off
//     (`notYetCalledOff`, the feedstock reconcile's own remainder).
//   · Cover — PTI stock over average daily demand, against the lead time on
//     record (CR-24's shape, from the inventory position).
// Absent input reads "not on record", never a guess.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ readonly supplierId: string; readonly materialCode: string }} props
 */
const PairFacts = ({ supplierId, materialCode }) => {
  const { t } = useTranslation();
  const inventory = useInventory();
  const reconcile = useFixedStockReconcile();

  const row =
    reconcile.data?.items.find(
      (r) => r.supplierId === supplierId && r.materialCode === materialCode
    ) ?? null;
  const position =
    inventory.data?.items.find(
      (p) => p.supplierId === supplierId && p.materialCode === materialCode
    ) ?? null;
  const cover =
    position &&
    position.ptiSoh !== null &&
    position.avgDailyDemand !== null &&
    position.avgDailyDemand > 0
      ? Math.round(position.ptiSoh / position.avgDailyDemand)
      : null;

  return (
    <div className="space-y-1 text-sm" data-testid="pair-facts">
      <p className="text-text-primary" data-testid="pair-facts-open">
        {row
          ? t('buyerOrders.pairFacts.open', {
              qty: formatNumber(row.notYetCalledOff),
              uom: row.uom
            })
          : t('buyerOrders.pairFacts.openNone')}
      </p>
      <p className="text-text-primary" data-testid="pair-facts-cover">
        {cover !== null && position?.leadTimeDays !== null && position?.leadTimeDays !== undefined
          ? t('buyerOrders.pairFacts.cover', { days: cover, lead: position.leadTimeDays })
          : t('buyerOrders.pairFacts.coverNone')}
      </p>
    </div>
  );
};

export default PairFacts;
