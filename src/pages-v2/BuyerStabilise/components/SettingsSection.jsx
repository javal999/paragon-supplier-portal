/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatNumber } from '@lib/format';
/** @import { StabilisedPlanView } from '@services/data/types' */

/**
 * The values in use (ENG-D8, ENG-D9): the Trade-off and forecast weights and
 * the per-version / cumulative band. `params` is the plan's own settings.
 * @type {React.FC<{ params: StabilisedPlanView['params'] }>}
 */
const SettingsSection = ({ params }) => {
  const { t } = useTranslation();
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-5"
      data-testid="stb-settings"
    >
      <h2 className="text-section text-text-primary mb-2">{t('stb.settings.title')}</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-text-secondary">{t('stb.settings.weight')}</dt>
          <dd>
            <Data data-testid="stb-setting-weight">{`${formatNumber(Math.round(params.tradeOffWeight * 100))}%`}</Data>
            <div className="text-xs text-text-tertiary">{t('stb.settings.weightNote')}</div>
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('stb.settings.forecastWeight')}</dt>
          <dd>
            <Data>{`${formatNumber(Math.round(params.forecastWeight * 100))}%`}</Data>
            <div className="text-xs text-text-tertiary">{t('stb.settings.forecastWeightNote')}</div>
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">{t('stb.settings.band')}</dt>
          <dd>
            <Data data-testid="stb-setting-band">
              {t('stb.settings.bandValue', {
                perVersion: Math.round(params.band.perVersion * 100),
                cumulative: Math.round(params.band.cumulative * 100)
              })}
            </Data>
            <div className="text-xs text-text-tertiary">{t('stb.settings.bandNote')}</div>
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default SettingsSection;
