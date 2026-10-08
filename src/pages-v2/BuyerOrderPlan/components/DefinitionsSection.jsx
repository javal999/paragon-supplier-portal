/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { CollapsedSection } from '@components/forecast/AboutThisPage';

/**
 * The collapsed "How the plan is made" section: the method, the cost, the
 * constraints, fill, the fallback and the rented-space cap, one paragraph each.
 * Static text; no props.
 * @type {React.FC}
 */
const DefinitionsSection = () => {
  const { t } = useTranslation();
  return (
    <CollapsedSection
      title={t('op.def.title')}
      testId="op-definitions"
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary"
      detailsClassName="space-y-2"
    >
      <p>{t('op.method')}</p>
      <p>{t('op.def.cost')}</p>
      <p>{t('op.def.constraints')}</p>
      <p>{t('op.def.fill')}</p>
      <p>{t('op.def.fallback')}</p>
      <p>{t('op.def.cap')}</p>
    </CollapsedSection>
  );
};

export default DefinitionsSection;
