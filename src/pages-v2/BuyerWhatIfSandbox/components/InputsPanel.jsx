// ─────────────────────────────────────────────────────────────────────────────
// DRC-17 BR-02 (BL-202) — the editable inputs of one supplier × material,
// prefilled with today's live values: demand, lead time and replenishment,
// safety, order and stock sizes, position, OSIP level. LTP per week is edited
// in the week grid. Z, g and the SD source are rule switches ([Default] B3, B7,
// B2) shown here because the brief groups them under Safety.
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { WhatIfInputs, WhatIfRun, WhatIfSwitches } from '@services/transitions/whatIfSandboxRules' */
/** @import { SupplyArea } from '@services/transitions/osipRules' */
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@lib/format';
import { OSIP_LEVELS } from '@services/transitions/osipRopRules';
import { switchValue } from '@services/transitions/whatIfSandboxRules';
import { inputClass, labelClass } from '../../inventory/inventoryDisplay';
import { NumberField, Section } from '../display';

// i18n-defer: supply-area KEYS (`osipRules` SupplyArea); each renders through t('whatIf.in.area.<key>').
/** @type {readonly SupplyArea[]} */
const AREAS = ['import', 'jabodetabek', 'outsideJabodetabek'];

/**
 * @typedef {{
 *   inputs: WhatIfInputs;
 *   onInputs: (patch: Partial<WhatIfInputs>) => void;
 *   switches: WhatIfSwitches;
 *   onSwitch: (path: string, value: unknown) => void;
 *   run: WhatIfRun;
 * }} InputsProps
 */

/** @type {React.FC<InputsProps>} */
const DemandAndLeadTime = ({ inputs, onInputs, run }) => {
  const { t } = useTranslation();
  const lt = inputs.leadTime;
  return (
    <>
      <Section title={t('whatIf.section.demand')} testId="wi-in-demand">
        <NumberField
          id="wi-in-uplift"
          label={t('whatIf.in.uplift')}
          value={inputs.upliftPct}
          onChange={(v) => onInputs({ upliftPct: v ?? 0 })}
          note={
            inputs.festiveWeeks.length > 0
              ? t('whatIf.in.upliftNote', { count: inputs.festiveWeeks.length })
              : t('whatIf.in.upliftNone')
          }
        />
        <p className="text-xs text-text-tertiary mt-2">{t('whatIf.in.ltpNote')}</p>
      </Section>
      <Section title={t('whatIf.section.leadTime')} testId="wi-in-leadtime">
        <div className="grid grid-cols-2 gap-3">
          {lt && lt.steps.length > 0 ? (
            lt.steps.map((s, i) => (
              <NumberField
                key={s.step}
                id={`wi-in-step-${s.step}`}
                label={t(`whatIf.in.step.${s.step}`)}
                value={s.days}
                step="1"
                onChange={(v) => {
                  const steps = lt.steps.map((x, k) => (k === i ? { ...x, days: v ?? 0 } : x));
                  onInputs({
                    leadTime: { ...lt, steps, days: steps.reduce((n, x) => n + x.days, 0) }
                  });
                }}
              />
            ))
          ) : (
            <NumberField
              id="wi-in-leadtime-days"
              label={t('whatIf.in.leadTimeDays')}
              value={lt ? lt.days : null}
              blank
              step="1"
              onChange={(v) =>
                onInputs({ leadTime: v === null ? null : { route: null, steps: [], days: v } })
              }
            />
          )}
        </div>
        <p className="text-xs text-text-tertiary mt-1" data-testid="wi-in-leadtime-weeks">
          {run.leadTimeWeeks === null
            ? t('whatIf.in.leadTimeNone')
            : t('whatIf.in.leadTimeWeeks', { weeks: run.leadTimeWeeks })}
        </p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label htmlFor="wi-in-area" className={labelClass}>
              {t('whatIf.in.area')}
            </label>
            <select
              id="wi-in-area"
              className={inputClass}
              value={inputs.supplyArea ?? ''}
              onChange={(e) =>
                onInputs({
                  supplyArea:
                    e.target.value === '' ? null : /** @type {SupplyArea} */ (e.target.value)
                })
              }
            >
              <option value="">{t('whatIf.in.area.none')}</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {t(`whatIf.in.area.${a}`)}
                </option>
              ))}
            </select>
          </div>
          <NumberField
            id="wi-in-f"
            label={t('whatIf.in.f')}
            value={inputs.f}
            blank
            onChange={(v) => onInputs({ f: v })}
          />
        </div>
      </Section>
    </>
  );
};

/** @type {React.FC<InputsProps>} */
const SafetyAndSizes = ({ inputs, onInputs, switches, onSwitch, run }) => {
  const { t } = useTranslation();
  const sd = run.safety.safetyOrder.sd;
  return (
    <>
      <Section title={t('whatIf.section.safety')} testId="wi-in-safety">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="wi-in-z"
            label={`${t('whatIf.in.z')} (B3)`}
            value={/** @type {number} */ (switchValue(switches, 'osip.z'))}
            onChange={(v) => onSwitch('osip.z', v ?? 0)}
          />
          <NumberField
            id="wi-in-g"
            label={`${t('whatIf.in.g')} (B7)`}
            value={/** @type {number} */ (switchValue(switches, 'osip.fixedSafetyDays'))}
            onChange={(v) => onSwitch('osip.fixedSafetyDays', v ?? 0)}
          />
          <div>
            <label htmlFor="wi-in-sdsource" className={labelClass}>
              {`${t('whatIf.in.sdSource')} (B2)`}
            </label>
            <select
              id="wi-in-sdsource"
              className={inputClass}
              value={/** @type {string} */ (switchValue(switches, 'osip.sdSource'))}
              onChange={(e) => onSwitch('osip.sdSource', e.target.value)}
            >
              <option value="ltp">{t('whatIf.opt.ltp')}</option>
              <option value="consumption12w">{t('whatIf.opt.consumption12w')}</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-text-tertiary mt-2" data-testid="wi-in-sd">
          {sd === null
            ? t('whatIf.notAvailable')
            : t('whatIf.in.sd', { sd: formatNumber(Math.round(sd)) })}{' '}
          · {t('whatIf.in.consumption', { count: inputs.consumption.length })}
        </p>
      </Section>
      <Section title={t('whatIf.section.sizes')} testId="wi-in-sizes">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="wi-in-mpq"
            label={t('whatIf.in.mpq')}
            value={inputs.mpq}
            note={t('whatIf.in.mpqNote')}
            onChange={(v) => onInputs({ mpq: v ?? 0 })}
          />
          <NumberField
            id="wi-in-moq"
            label={t('whatIf.in.moq')}
            value={inputs.moq}
            onChange={(v) => onInputs({ moq: v ?? 0 })}
          />
          <NumberField
            id="wi-in-koli"
            label={t('whatIf.in.koli')}
            value={inputs.koli}
            blank
            onChange={(v) => onInputs({ koli: v })}
          />
          <NumberField
            id="wi-in-max"
            label={t('whatIf.in.max')}
            value={inputs.maxOverride}
            blank
            onChange={(v) => onInputs({ maxOverride: v })}
          />
        </div>
      </Section>
    </>
  );
};

/** @type {React.FC<InputsProps>} */
const PositionAndLevel = ({ inputs, onInputs, switches }) => {
  const { t } = useTranslation();
  const npd = inputs.npd[switches.npdRule];
  return (
    <>
      <Section title={t('whatIf.section.position')} testId="wi-in-position">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="wi-in-soh-j6"
            label={t('whatIf.in.sohJ6')}
            value={inputs.soh.J6}
            onChange={(v) => onInputs({ soh: { ...inputs.soh, J6: v ?? 0 } })}
          />
          <NumberField
            id="wi-in-soh-j2"
            label={t('whatIf.in.sohJ2')}
            value={inputs.soh.J2}
            onChange={(v) => onInputs({ soh: { ...inputs.soh, J2: v ?? 0 } })}
          />
          <NumberField
            id="wi-in-ospo"
            label={inputs.previous ? t('whatIf.in.ospoPrev') : t('whatIf.in.ospoOpen')}
            value={inputs.ospoStart}
            onChange={(v) => onInputs({ ospoStart: v ?? 0 })}
          />
          {inputs.previous ? (
            <NumberField
              id="wi-in-newpo"
              label={t('whatIf.in.newPoPrev')}
              value={inputs.newPoPrev}
              onChange={(v) => onInputs({ newPoPrev: v ?? 0 })}
            />
          ) : null}
          {inputs.previous ? (
            <NumberField
              id="wi-in-calloff-prev"
              label={t('whatIf.in.callOffPrev')}
              value={inputs.callOffPrev}
              onChange={(v) => onInputs({ callOffPrev: v ?? 0 })}
            />
          ) : null}
          <NumberField
            id="wi-in-calloff"
            label={t('whatIf.in.callOff')}
            value={inputs.callOff}
            onChange={(v) => onInputs({ callOff: v ?? 0 })}
          />
          <NumberField
            id="wi-in-carrylimit"
            label={t('whatIf.in.carryLimit')}
            value={inputs.carryOverLimit}
            blank
            onChange={(v) => onInputs({ carryOverLimit: v })}
          />
          <NumberField
            id="wi-in-feedstock"
            label={t('whatIf.in.feedstock')}
            value={inputs.feedstock}
            blank
            note={t('whatIf.in.feedstockNote')}
            onChange={(v) => onInputs({ feedstock: v })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm mt-3">
          <input
            type="checkbox"
            checked={inputs.agreedFirstOutside}
            data-testid="wi-in-agreed"
            onChange={(e) => onInputs({ agreedFirstOutside: e.target.checked })}
          />
          {t('whatIf.in.agreed')}
        </label>
      </Section>
      <Section title={t('whatIf.section.level')} testId="wi-in-level">
        <label htmlFor="wi-in-level-select" className={labelClass}>
          {`${t('whatIf.in.level')} (C2)`}
        </label>
        <select
          id="wi-in-level-select"
          className={inputClass}
          value={inputs.level}
          onChange={(e) => onInputs({ level: Number(e.target.value) })}
        >
          {OSIP_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <p className="text-xs text-text-tertiary mt-2" data-testid="wi-in-npd">
          {t('whatIf.in.npd', { value: npd ? t('whatIf.yes') : t('whatIf.no') })} (D1)
        </p>
      </Section>
    </>
  );
};

/** DRC-17 BR-02 — every editable input, in the brief's order. @type {React.FC<InputsProps>} */
const InputsPanel = (props) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="wi-inputs">
    <div className="space-y-4">
      <DemandAndLeadTime {...props} />
    </div>
    <div className="space-y-4">
      <SafetyAndSizes {...props} />
    </div>
    <div className="space-y-4">
      <PositionAndLevel {...props} />
    </div>
  </div>
);

export default InputsPanel;
