// ─────────────────────────────────────────────────────────────────────────────
// DRC-17 BR-05 (BL-202) — saving a scenario under a name (`t_whatifscenario_save`,
// the verb / policy / audit pattern), and the pair's saved scenarios: who saved
// each and when, under which rules version, flagged when the rules changed
// since; up to 3 chosen to compare beside the current plan; any one loaded
// back into the editor. Saving is analysis only (BR-06): it changes no plan.
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
/** @import { ActorAttribution } from '@lib/enforcement' */
/** @import { WhatIfScenarioView } from '@services/data/mock/whatIfSandboxReadModel' */
/** @import { WhatIfInputs, WhatIfSwitches } from '@services/transitions/whatIfSandboxRules' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDateTime } from '@lib/format';
import { useWhatIfScenarioCommand } from '@services/query/commandHooks';
import {
  WHAT_IF_RULES,
  changedSwitches,
  mergeSwitches,
  scenarioRefusal
} from '@services/transitions/whatIfSandboxRules';
import { inputClass, labelClass } from '../../inventory/inventoryDisplay';
import { Section } from '../display';

/**
 * The refusal as the planner reads it: `INPUTS_INVALID:mpq` → its sentence.
 * @param {string} reason
 * @param {import('i18next').TFunction} t
 */
const refusalText = (reason, t) => {
  const [code, field] = reason.split(':');
  return t(`whatIf.save.refused.${code}`, { field: field ?? '', max: WHAT_IF_RULES.nameMaxLength });
};

/**
 * @param {ActorAttribution} actor
 * @param {import('i18next').TFunction} t
 */
const actorText = (actor, t) =>
  actor.kind === 'RESOLVED' ? actor.person.displayName : t('whatIf.saved.unattributed');

/**
 * The save form, behind the verb's availability (§72a: the create verb is guarded where it lives).
 * @type {React.FC<{ inputs: WhatIfInputs; switches: WhatIfSwitches }>}
 */
const SaveForm = ({ inputs, switches }) => {
  const { t } = useTranslation();
  const availability = useVerbAvailability('whatifscenario:save');
  const command = useWhatIfScenarioCommand();
  const [name, setName] = useState('');
  const [outcome, setOutcome] = useState(/** @type {string | null} */ (null));
  if (availability.kind !== 'held')
    return <HandoffNotice availability={availability} testId="handoff-whatif-save" />;
  const payload = {
    name,
    supplierId: inputs.supplierId,
    materialCode: inputs.materialCode,
    inputs,
    switches
  };
  // The pair is checked by the verb; the form checks what the planner typed.
  const refusal = scenarioRefusal(payload, { pairKnown: () => true });
  const save = async () => {
    const result = await command.mutateAsync(payload);
    if (result.status === 'failed') {
      const reason = (result.reason ?? '').split(':').slice(2).join(':');
      setOutcome(
        t('whatIf.save.failed', { reason: reason ? refusalText(reason, t) : result.reason })
      );
      return;
    }
    setOutcome(t('whatIf.save.done', { name: name.trim() }));
    setName('');
  };
  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem]">
          <label htmlFor="wi-save-name" className={labelClass}>
            {t('whatIf.save.name')}
          </label>
          <input
            id="wi-save-name"
            className={inputClass}
            value={name}
            maxLength={WHAT_IF_RULES.nameMaxLength + 10}
            // BL-84 — the save refusal is tied to the name it is about.
            aria-invalid={refusal !== null && name.trim() !== '' ? true : undefined}
            aria-describedby={
              refusal !== null && name.trim() !== '' ? 'wi-save-refusal' : undefined
            }
            onChange={(e) => {
              setName(e.target.value);
              setOutcome(null);
            }}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => void save()}
          disabled={refusal !== null || command.isPending}
          data-testid="wi-save"
        >
          {command.isPending ? t('whatIf.save.saving') : t('whatIf.save.button')}
        </Button>
      </div>
      {refusal !== null && name.trim() !== '' ? (
        <p id="wi-save-refusal" className="text-xs text-danger mt-1" data-testid="wi-save-refusal">
          {refusalText(refusal, t)}
        </p>
      ) : null}
      {outcome ? (
        <p className="text-sm text-text-secondary mt-2" role="status" data-testid="wi-save-outcome">
          {outcome}
        </p>
      ) : null}
      <p className="text-xs text-text-tertiary mt-1">{t('whatIf.save.actor')}</p>
    </div>
  );
};

/**
 * @type {React.FC<{
 *   scenarios: readonly WhatIfScenarioView[];
 *   rulesVersion: string;
 *   compare: readonly string[];
 *   onCompare: (ids: string[]) => void;
 *   onLoad: (scenario: WhatIfScenarioView) => void;
 * }>}
 */
const SavedList = ({ scenarios, rulesVersion, compare, onCompare, onLoad }) => {
  const { t } = useTranslation();
  if (scenarios.length === 0)
    return (
      <p className="text-sm text-text-tertiary" data-testid="wi-saved-empty">
        {t('whatIf.saved.empty')}
      </p>
    );
  const full = compare.length >= WHAT_IF_RULES.compareMax;
  return (
    <>
      <p className="text-xs text-text-tertiary mb-2">
        {t('whatIf.saved.compareMax', { max: WHAT_IF_RULES.compareMax })}
      </p>
      <ul className="divide-y divide-border-subtle" data-testid="wi-saved">
        {scenarios.map((s) => {
          const picked = compare.includes(s.id);
          const changed = changedSwitches(mergeSwitches(s.switches));
          return (
            <li key={s.id} className="py-2" data-testid={`wi-saved-${s.id}`}>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <input
                    type="checkbox"
                    checked={picked}
                    disabled={!picked && full}
                    data-testid={`wi-compare-${s.id}`}
                    onChange={(e) =>
                      onCompare(
                        e.target.checked ? [...compare, s.id] : compare.filter((x) => x !== s.id)
                      )
                    }
                  />
                  {/* U-22 (BL-248) — the checkbox says what it does. */}
                  <span
                    className="text-xs font-normal text-text-secondary"
                    data-testid={`wi-compare-label-${s.id}`}
                  >
                    {t('whatIf.saved.compare')}
                  </span>
                  {s.name}
                </label>
                {s.rulesChanged ? (
                  <StatusPill variant="warning">{t('whatIf.saved.rulesPill')}</StatusPill>
                ) : null}
                <Button
                  variant="secondary"
                  onClick={() => onLoad(s)}
                  data-testid={`wi-load-${s.id}`}
                >
                  {t('whatIf.saved.load')}
                </Button>
              </div>
              <p className="text-xs text-text-tertiary mt-0.5">
                <Data>{s.id}</Data> ·{' '}
                {t('whatIf.saved.meta', {
                  date: formatDateTime(s.savedAt),
                  actor: actorText(s.savedBy, t),
                  version: s.rulesVersion
                })}
              </p>
              <p className="text-xs text-text-tertiary">
                {changed.length > 0
                  ? t('whatIf.saved.switches', {
                      list: changed.map((p) => t(`whatIf.switch.${p}`)).join(', ')
                    })
                  : t('whatIf.saved.switchesNone')}
              </p>
              {s.rulesChanged ? (
                <p className="text-xs text-warning-hover" data-testid={`wi-rules-changed-${s.id}`}>
                  {t('whatIf.saved.rulesChanged', { saved: s.rulesVersion, current: rulesVersion })}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
};

/**
 * @type {React.FC<{
 *   inputs: WhatIfInputs;
 *   switches: WhatIfSwitches;
 *   scenarios: readonly WhatIfScenarioView[];
 *   rulesVersion: string;
 *   compare: readonly string[];
 *   onCompare: (ids: string[]) => void;
 *   onLoad: (scenario: WhatIfScenarioView) => void;
 * }>}
 */
const ScenariosPanel = ({ inputs, switches, ...list }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title={t('whatIf.section.save')} testId="wi-save-panel">
        <SaveForm inputs={inputs} switches={switches} />
      </Section>
      <Section title={t('whatIf.section.saved')} testId="wi-saved-panel">
        <SavedList {...list} />
      </Section>
    </div>
  );
};

export default ScenariosPanel;
