/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';
import Data from '@components/ui-v2/Data';
import AdvisorPanel from './AdvisorPanel';

/**
 * Step 6, storefront performance: four demo marketplace stats and the
 * advisor panel. Moved out of `SupplierMyStorefront.jsx` by the Phase 5 page
 * split (no behaviour change).
 * @type {React.FC<{ completeness: number }>}
 */
const PerformanceSection = ({ completeness }) => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('supplierMyStorefront.step', { n: 6 })}
      title={t('supplierMyStorefront.step6.title')}
      description={t('supplierMyStorefront.step6.description')}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* value figures are demo marketplace stats (mono DATA) — kept EN */}
        {[
          {
            label: t('supplierMyStorefront.stat.profileViews'),
            value: '24',
            tone: 'text-teal-hover'
          },
          {
            label: t('supplierMyStorefront.stat.rfqInvitations'),
            value: '3',
            tone: 'text-info'
          },
          { label: t('supplierMyStorefront.stat.winRate'), value: '67%', tone: 'text-success' },
          {
            label: t('supplierMyStorefront.stat.categoryRank'),
            value: '#3 / 31',
            tone: 'text-warning-hover'
          }
        ].map((s) => (
          <div
            key={s.label}
            className="px-4 py-3 bg-bg-hover border border-border-subtle rounded-md text-center"
          >
            <Data as="div" className={`text-xl font-semibold ${s.tone}`}>
              {s.value}
            </Data>
            <div className="text-xs text-text-tertiary mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <AdvisorPanel completeness={completeness} />
    </FormSection>
  );
};

export default PerformanceSection;
