/** @import React from 'react' */
/** @import { RiskAlert } from '@services/data/types' */
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ALERT_VARIANT } from '../const';

/**
 * One dismissible risk-alert banner, toned by the alert's level
 * (`ALERT_VARIANT`). The page renders one per visible alert.
 *
 * Props: `alert` (the fixture alert to show) and `onDismiss` (called by the
 * close button; the page records the id so the banner stays hidden).
 * @type {React.FC<{ alert: RiskAlert; onDismiss: () => void }>}
 */
const AlertBanner = ({ alert, onDismiss }) => {
  const { t } = useTranslation();
  const v = ALERT_VARIANT[alert.level];
  const Icon = v.Icon;
  return (
    <div className={`${v.bg} border-l-2 ${v.border} rounded px-4 py-3 mb-2 flex items-start gap-3`}>
      <Icon size={16} className={`shrink-0 mt-0.5 ${v.text}`} />
      <div className="flex-1 min-w-0">
        {/* i18n-defer: mock/sample data — alert title/body seeded from fixtures */}
        <div className={`text-sm font-semibold ${v.text}`}>{alert.title}</div>
        <div className="text-xs text-text-secondary mt-1">{alert.body}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-text-tertiary hover:text-text-secondary shrink-0"
        aria-label={t('risk.alert.dismiss')}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default AlertBanner;
