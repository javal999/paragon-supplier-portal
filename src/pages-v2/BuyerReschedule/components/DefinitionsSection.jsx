/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { CollapsedSection } from '@components/forecast/AboutThisPage';
/** @import { RescheduleView } from '@services/data/types' */

/**
 * The collapsed definitions: the method, need, proposal types, zones, how a
 * proposal is valued, stock on hand — and, when the run has any, how many PO
 * lines are still unconfirmed.
 * @type {React.FC<{ run: RescheduleView | null }>}
 */
const DefinitionsSection = ({ run }) => {
  const { t } = useTranslation();
  return (
    <CollapsedSection
      title={t('rs.def.title')}
      testId="rs-definitions"
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary"
      detailsClassName="space-y-2"
    >
      <p>{t('rs.method')}</p>
      <p>{t('rs.def.need')}</p>
      <p>{t('rs.def.types')}</p>
      <p>{t('rs.def.zones')}</p>
      <p>{t('rs.def.value')}</p>
      <p>{t('rs.def.onHand')}</p>
      {run && run.unconfirmedPoLines > 0 && (
        <p data-testid="rs-unconfirmed">
          {t('rs.def.unconfirmed', { count: run.unconfirmedPoLines })}
        </p>
      )}
    </CollapsedSection>
  );
};

export default DefinitionsSection;
