import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { useSapDataAge } from '../../pages-v2/interface/sapInterfaceDisplay';
import { sapAgeParts, type SapPageKey } from '../../services/data/sapInterfaceRules';

// ────────────────────────────────────────────────────────────────────────────
// The data-age banner (REQ-E07-08 BR-04, AC-03).
//
// ONE component, ONE rules module: every page that depends on SAP data reads
// the same `sapDataAge`, so two screens can never disagree about how old the
// same feed is. The age is derived at read time and never stored (law 0.5).
//
// Business language only (SC-04): the banner says when the data last arrived,
// not which interface, message type or latency target decided that.
// ────────────────────────────────────────────────────────────────────────────

const SapDataAgeBanner: React.FC<{
  page: SapPageKey;
  className?: string;
}> = ({ page, className = '' }) => {
  const { t } = useTranslation();
  const age = useSapDataAge(page);
  if (!age.stale) return null;
  const text =
    age.minutes === null
      ? t('sap.age.never')
      : (() => {
          const { unit, value } = sapAgeParts(age.minutes);
          return t(`sap.age.${unit}`, { count: value });
        })();
  return (
    <div
      data-testid="sap-data-age-banner"
      role="status"
      className={`flex items-start gap-2 rounded-md border border-border-subtle bg-bg-hover px-4 py-2.5 text-sm text-text-secondary ${className}`}
    >
      <Clock size={14} className="mt-0.5 shrink-0 text-text-tertiary" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
};

export default SapDataAgeBanner;
