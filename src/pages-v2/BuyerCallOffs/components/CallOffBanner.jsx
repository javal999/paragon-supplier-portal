/** @import React from 'react' */
/** @import { deliveryDrift } from '@services/transitions/callOffRules' */
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { callOffConfirmWorkingDays } from '@services/transitions/callOffTolerance';

/**
 * The action banner above the tabs: how many call-offs await approval, are
 * escalated or at risk, and one line per supplier × material with delivery
 * drift. Renders nothing when there is nothing to act on. The counts come from
 * the page so the To act chips show the same figures. Moved out of
 * `BuyerCallOffs.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<{
 *   awaitingApproval: number;
 *   escalated: number;
 *   atRisk: number;
 *   drift: ReturnType<typeof deliveryDrift>;
 * }>}
 */
const CallOffBanner = ({ awaitingApproval, escalated, atRisk, drift }) => {
  const { t } = useTranslation();
  if (!(awaitingApproval > 0 || escalated > 0 || atRisk > 0 || drift.length > 0)) return null;
  return (
    <div
      role="status"
      data-testid="pti-calloff-banner"
      className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-4 text-sm text-warning-hover space-y-1"
    >
      {awaitingApproval > 0 && (
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden="true" />
          {t('co.pti.banner.approval', { count: awaitingApproval })}
        </div>
      )}
      {escalated > 0 && (
        <div>
          {t('co.pti.banner.escalated', {
            count: escalated,
            within: t('adminSet.unit.workingDays', { count: callOffConfirmWorkingDays() })
          })}
        </div>
      )}
      {atRisk > 0 && <div>{t('co.pti.banner.atRisk', { count: atRisk })}</div>}
      {drift.map((d) => (
        <div key={`${d.supplierId}-${d.materialCode}`} data-testid="pti-calloff-drift">
          {t('co.pti.banner.drift', {
            supplier: d.supplierName,
            material: d.materialCode,
            count: d.count
          })}
        </div>
      ))}
    </div>
  );
};

export default CallOffBanner;
