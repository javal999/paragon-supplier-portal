/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import FormSection from '@components/ui-v2/FormSection';

/**
 * Step 3 of the single-price quote form: the compliance documents shown as
 * already on file. Takes no props; it renders the same three rows on every RFQ.
 * @type {React.FC}
 */
const QuoteOnFileSection = () => {
  const { t } = useTranslation();
  return (
    <FormSection
      eyebrow={t('rfqs.panel.step3.eyebrow')}
      title={t('rfqs.panel.step3.title')}
      description={t('rfqs.panel.step3.desc')}
    >
      <div className="bg-success-soft border-l-2 border-success rounded px-3 py-2 text-xs text-text-secondary flex flex-col gap-1">
        {['Halal Certificate', 'ISO 9001', 'BPOM Registration'].map((d) => (
          <div key={d} className="inline-flex items-center gap-2">
            <span className="text-success font-bold">✓</span>
            <span className="font-semibold text-text-primary">{d}</span>
            <span className="text-text-tertiary">{t('rfqs.panel.onFile')}</span>
          </div>
        ))}
      </div>
    </FormSection>
  );
};

export default QuoteOnFileSection;
