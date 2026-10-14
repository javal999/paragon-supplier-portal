/** @import React from 'react' */
/** @import { deliveryDrift } from '@services/transitions/callOffRules' */
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { callOffConfirmWorkingDays } from '@services/transitions/callOffTolerance';

/**
 * @typedef {object} CallOffBannerProps
 * @property {number} awaitingApproval  Call-offs whose confirmation awaits the planner.
 * @property {number} escalated  Call-offs not confirmed within the working-day window.
 * @property {number} atRisk  Call-offs whose delivery is at risk.
 * @property {ReturnType<typeof deliveryDrift>} drift  Supplier × material groups drifting late.
 */

/**
 * The page's attention banner: approvals waiting, escalations, deliveries at
 * risk and delivery drift. Renders nothing when all four are empty. The
 * escalation window is read from the hub setting at render.
 * @type {React.FC<CallOffBannerProps>}
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
