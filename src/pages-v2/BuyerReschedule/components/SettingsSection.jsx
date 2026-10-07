/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { CollapsedSection } from '@components/forecast/AboutThisPage';
import { formatIDR } from '@lib/format';
/** @import { RescheduleView } from '@services/data/types' */

/**
 * The collapsed settings the run used: the reschedule threshold, the rent rate
 * (a placeholder until Finance sets it) and the change penalty (a placeholder
 * until the planner sets it), and where they are changed.
 * @type {React.FC<{ run: RescheduleView }>}
 */
const SettingsSection = ({ run }) => {
  const { t } = useTranslation();
  return (
    <CollapsedSection
      title={t('rs.settings.title')}
      testId="rs-settings"
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-5"
    >
      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div data-testid="rs-setting-threshold">
          <dt className="text-text-secondary">{t('rs.settings.threshold')}</dt>
          <dd>
            <Data>{t('rs.settings.weeks', { count: run.thresholdWeeks })}</Data>
            <div className="text-xs text-text-tertiary">{t('rs.settings.thresholdNote')}</div>
          </dd>
        </div>
        <div data-testid="rs-setting-rent">
          <dt className="text-text-secondary">{t('rs.settings.rent')}</dt>
          <dd>
            <Data>{formatIDR(run.costs.rentIdrPerPalletWeek)}</Data>
            <div className="text-xs text-warning-hover">{t('rs.settings.placeholderFinance')}</div>
          </dd>
        </div>
        <div data-testid="rs-setting-penalty">
          <dt className="text-text-secondary">{t('rs.settings.penalty')}</dt>
          <dd>
            <Data>{formatIDR(run.costs.changePenaltyIdrPerPallet)}</Data>
            <div className="text-xs text-warning-hover">{t('rs.settings.placeholderPlanner')}</div>
          </dd>
        </div>
      </dl>
      <p className="text-xs text-text-tertiary mt-2">{t('rs.settings.where')}</p>
    </CollapsedSection>
  );
};

export default SettingsSection;
