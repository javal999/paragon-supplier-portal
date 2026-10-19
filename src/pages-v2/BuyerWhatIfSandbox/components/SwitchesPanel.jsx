// ─────────────────────────────────────────────────────────────────────────────
// DRC-17 BR-02 / BR-08 (BL-202) — every rule switch: the whole `OSIP_RULES`
// block plus the switches the later modules added, each named with its
// question ID (`SWITCH_CATALOG`). A switch that feeds no sandbox figure says
// why. This is how the material team flips a [Default] on the PPT 7 case and
// compares (design rule 2).
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { SwitchSpec, WhatIfSwitches } from '@services/transitions/whatIfSandboxRules' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import {
  DEFAULT_SWITCHES,
  SWITCH_CATALOG,
  switchValue
} from '@services/transitions/whatIfSandboxRules';
import { inputClass } from '../../inventory/inventoryDisplay';
import { Section } from '../display';

/** @param {string} path */
const idOf = (path) => `wi-sw-${path.replace('.', '-')}`;

/**
 * One switch's control.
 * @type {React.FC<{ spec: SwitchSpec; value: unknown; onChange: (value: unknown) => void }>}
 */
const SwitchControl = ({ spec, value, onChange }) => {
  const { t } = useTranslation();
  const id = idOf(spec.path);
  if (spec.kind === 'boolean')
    return (
      <select
        id={id}
        className={inputClass}
        value={value ? 'on' : 'off'}
        onChange={(e) => onChange(e.target.value === 'on')}
      >
        <option value="on">{t('whatIf.switch.on')}</option>
        <option value="off">{t('whatIf.switch.off')}</option>
      </select>
    );
  if (spec.kind === 'number')
    return (
      <input
        id={id}
        type="number"
        step="any"
        className={inputClass}
        value={/** @type {number} */ (value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(n)) onChange(n);
        }}
      />
    );
  return (
    <select
      id={id}
      className={inputClass}
      value={/** @type {string} */ (value)}
      onChange={(e) => onChange(e.target.value)}
    >
      {(spec.options ?? []).map((o) => (
        <option key={o} value={o}>
          {t(`whatIf.opt.${o}`)}
        </option>
      ))}
    </select>
  );
};

/** @type {React.FC<{ switches: WhatIfSwitches; onSwitch: (path: string, value: unknown) => void }>} */
const SwitchesPanel = ({ switches, onSwitch }) => {
  const { t } = useTranslation();
  return (
    <Section title={t('whatIf.section.switches')} testId="wi-switches">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">
        {SWITCH_CATALOG.map((spec) => {
          const value = switchValue(switches, spec.path);
          const changed = value !== switchValue(DEFAULT_SWITCHES, spec.path);
          return (
            <div key={spec.path} data-testid={idOf(spec.path)}>
              <label
                htmlFor={idOf(spec.path)}
                className="flex items-center gap-2 text-xs text-text-secondary mb-1"
              >
                <span>{t(`whatIf.switch.${spec.path}`)}</span>
                <span className="text-text-tertiary">[{spec.question}]</span>
                {changed ? (
                  <StatusPill variant="info">{t('whatIf.switch.changed')}</StatusPill>
                ) : null}
              </label>
              <SwitchControl spec={spec} value={value} onChange={(v) => onSwitch(spec.path, v)} />
              {spec.note ? (
                <span className="block text-xs text-text-tertiary mt-0.5">
                  {t(`whatIf.switch.note.${spec.note}`)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Section>
  );
};

export default SwitchesPanel;
