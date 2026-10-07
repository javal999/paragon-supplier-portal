/** @import React from 'react' */
import { useTranslation } from 'react-i18next';

/**
 * The stream's "commitments awaiting you" banner: amber, or red with the
 * overdue count when any line is past its due date. Renders when `awaiting > 0`.
 * @type {React.FC<{ awaiting: number; overdue: number }>}
 */
const CommitmentsBanner = ({ awaiting, overdue }) => {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      data-testid="fc-sup-banner"
      className={`${overdue > 0 ? 'bg-danger-soft border-danger text-danger' : 'bg-warning-soft border-warning text-warning-hover'} border-l-2 rounded px-4 py-3 mb-4 text-sm`}
    >
      {t('fc.sup.banner', { count: awaiting })}
      {overdue > 0 && ` ${t('fc.sup.bannerOverdue', { count: overdue })}`}
    </div>
  );
};

export default CommitmentsBanner;
