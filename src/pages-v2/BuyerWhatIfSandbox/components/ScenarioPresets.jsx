// PEX-15 BR-02 / BR-04 (BL-277) — scenario presets on the Material tab: Baseline (LTP A),
// Festive (LTP Festive), Protection buffer (LTP B). Loading one replaces the LTP row of the
// editor with that series; a series the hub does not hold is unavailable, never estimated.

/** @import React from 'react' */
/** @import { LtpSeriesSet, LtpScenario } from '@services/transitions/whatIfLevels' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { scenarioAvailability, scenarioLtp } from '@services/transitions/whatIfLevels';

/**
 * @type {React.FC<{
 *   series: LtpSeriesSet;
 *   onLoad: (scenario: LtpScenario, ltp: readonly number[]) => void;
 * }>}
 */
const ScenarioPresets = ({ series, onLoad }) => {
  const { t } = useTranslation();
  return (
    <section data-testid="wi-scenario-presets" aria-labelledby="wi-presets-title">
      <h2 id="wi-presets-title" className="text-sm font-semibold text-text-primary mb-1">
        {t('pex.sandbox.presets.title')}
      </h2>
      <p className="text-xs text-text-tertiary mb-2">{t('pex.sandbox.presets.note')}</p>
      <div className="flex flex-wrap gap-2">
        {scenarioAvailability(series).map(({ scenario, available }) => (
          <Button
            key={scenario}
            variant="secondary"
            disabled={!available}
            data-testid={`wi-preset-${scenario}`}
            onClick={() => {
              const ltp = scenarioLtp(scenario, series);
              if (ltp) onLoad(scenario, ltp);
            }}
          >
            {t(`pex.sandbox.scenario.${scenario}`)}
          </Button>
        ))}
      </div>
      {scenarioAvailability(series).some((s) => !s.available) ? (
        <p className="text-xs text-text-tertiary mt-2" data-testid="wi-presets-unavailable">
          {t('pex.sandbox.presets.unavailable')}
        </p>
      ) : null}
    </section>
  );
};

export default ScenarioPresets;
