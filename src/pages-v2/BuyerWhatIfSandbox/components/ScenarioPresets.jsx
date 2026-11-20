// PEX-15 BR-02 / BR-04 (BL-277) — scenario presets on the Material tab: Baseline (LTP A),
// Festive (LTP Festive), Protection buffer (LTP B). Loading one replaces the LTP row of the
// editor with that series; a series the hub does not hold is unavailable, never estimated.
// PSC-5 BR-05 (BL-344) — a second group beside them: the four demand shapes. Each rewrites
// the LTP row of the editor (`demandPresetLtp`); the FG tab stays unscaled (PEX-D28).

/** @import React from 'react' */
/** @import { LtpSeriesSet, LtpScenario } from '@services/transitions/whatIfLevels' */
/** @import { DemandPreset } from '@services/transitions/whatIfSandboxRules' */
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import { scenarioAvailability, scenarioLtp } from '@services/transitions/whatIfLevels';
import {
  DEMAND_PRESETS,
  DEMAND_PRESET_RULES,
  demandPresetLtp
} from '@services/transitions/whatIfSandboxRules';

/**
 * @type {React.FC<{
 *   series: LtpSeriesSet;
 *   ltp: readonly number[];
 *   onLoad: (scenario: LtpScenario, ltp: readonly number[]) => void;
 *   onDemand: (ltp: number[]) => void;
 * }>}
 */
const ScenarioPresets = ({ series, ltp, onLoad, onDemand }) => {
  const { t } = useTranslation();
  const {
    skuRevampWeeks,
    skuRevampUpliftPct,
    skuRetireWeeks,
    oneShotUpliftWeek,
    oneShotUpliftPct,
    levelTransitionWeek,
    levelTransitionUpliftPct
  } = DEMAND_PRESET_RULES;
  return (
    <div data-testid="wi-scenario-presets">
      <section aria-labelledby="wi-presets-title">
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
                const ltpFromScenario = scenarioLtp(scenario, series);
                if (ltpFromScenario) onLoad(scenario, ltpFromScenario);
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
      <section
        aria-labelledby="wi-demand-presets-title"
        data-testid="wi-demand-presets"
        className="mt-4 border-t border-border-subtle pt-3"
      >
        <h2 id="wi-demand-presets-title" className="text-sm font-semibold text-text-primary mb-1">
          {t('pex.sandbox.demand.title')}
        </h2>
        <p className="text-xs text-text-tertiary mb-2">
          {t('pex.sandbox.demand.note', {
            revampPct: skuRevampUpliftPct,
            revampWeeks: skuRevampWeeks,
            retireWeeks: skuRetireWeeks,
            oneShotWeek: oneShotUpliftWeek,
            oneShotPct: oneShotUpliftPct,
            stepWeek: levelTransitionWeek,
            stepPct: levelTransitionUpliftPct
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          {DEMAND_PRESETS.map((preset) => (
            <Button
              key={preset}
              variant="secondary"
              data-testid={`wi-demand-${preset}`}
              onClick={() => onDemand(demandPresetLtp(/** @type {DemandPreset} */ (preset), ltp))}
            >
              {t(`pex.sandbox.demand.${preset}`)}
            </Button>
          ))}
        </div>
        <p className="text-xs text-text-tertiary mt-2" data-testid="wi-demand-fg">
          {t('pex.sandbox.demand.fgNote')}
        </p>
      </section>
    </div>
  );
};

export default ScenarioPresets;
