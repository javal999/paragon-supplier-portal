import React from 'react';
import { useTranslation } from 'react-i18next';

// The one plain marker for data that is not live (SC-04). Business users see
// "Sample data"; the detail of which feed is missing stays out of the screen.
const SampleDataBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  return (
    <span
      title={t('hub.sample.hint')}
      data-testid="sample-data-badge"
      className={`inline-flex items-center gap-1.5 text-label font-semibold uppercase tracking-wider text-warning-hover ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-warning" />
      {t('hub.sample.label')}
    </span>
  );
};

export default SampleDataBadge;
