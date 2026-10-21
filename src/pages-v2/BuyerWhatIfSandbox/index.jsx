/** @import React from 'react' */
/** @import { WhatIfPair, WhatIfSandbox, WhatIfScenarioView } from '@services/data/mock/whatIfSandboxReadModel' */
/** @import { WhatIfInputs, WhatIfSwitches } from '@services/transitions/whatIfSandboxRules' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { formatDate } from '@lib/format';
import { useWhatIfPairs, useWhatIfSandbox } from '@services/query/hooks';
import {
  DEFAULT_SWITCHES,
  PPT7_SUPPLIER_ID,
  changedSwitches,
  mergeSwitches,
  runWhatIf,
  withSwitch
} from '@services/transitions/whatIfSandboxRules';
import { inputClass, inventoryNow, labelClass } from '../inventory/inventoryDisplay';
import InputsPanel from './components/InputsPanel';
import SwitchesPanel from './components/SwitchesPanel';
import ResultsTable from './components/ResultsTable';
import WeeksGrid from './components/WeeksGrid';
import ScenariosPanel from './components/ScenariosPanel';

// ─────────────────────────────────────────────────────────────────────────────
// WHAT-IF SANDBOX — DRC-17 (BL-202), SC-HUB-DA-ROP-CALLOFF-REQUIREMENTS-2026-10,
// scope accepted by the owner 2026-10-16.
//
// A planner picks ONE supplier × material (BR-01), changes its inputs and rule
// switches (BR-02, prefilled with today's live values) and sees every output
// against the current plan (BR-03), over 52 weeks for raw material or 24 for
// packaging (BR-04). Named scenarios save through `t_whatifscenario_save` and up
// to 3 compare side by side (BR-05). BR-08: the PPT 7 golden case loads as a
// preset, so Material Planning can see 244,896 / 761,888 reproduce and flip
// switches. Every figure is `runWhatIf`'s, which calls the live plan's own
// functions; this page computes nothing.
//
// BR-06 — ANALYSIS ONLY, and the page says so. Nothing here changes demand
// anticipation, POs, call-offs, levels, settings or SAP; saving writes only the
// scenario store.
//
// P-07 (IA-B10) — rows on What to order and Inventory open it on their
// supplier × material ("Try a what-if", `TryWhatIfLink`); "New blank scenario"
// clears the pair, so the sandbox starts blank with or without a link.
//
// BR-07 — PTI planners find it in the Weekly plan menu. No role gate (CLAUDE.md
// §65, DRC-D18): the save verb shows its HandoffNotice to a seat without the
// atom. A supplier persona reads nothing and is told the sandbox is PTI's own.
// ─────────────────────────────────────────────────────────────────────────────

/** @param {{ supplierId: string; materialCode: string }} p */
const keyOf = (p) => `${p.supplierId}|${p.materialCode}`;

/**
 * How many inputs and switches differ from the current plan.
 * @param {WhatIfInputs} live
 * @param {WhatIfInputs} inputs
 * @param {WhatIfSwitches} switches
 * @returns {number}
 */
const editedCount = (live, inputs, switches) =>
  Object.keys(live).filter(
    (k) =>
      JSON.stringify(live[/** @type {keyof WhatIfInputs} */ (k)]) !==
      JSON.stringify(inputs[/** @type {keyof WhatIfInputs} */ (k)])
  ).length + changedSwitches(switches).length;

/**
 * The editor of one pair: its own inputs and switches, reset when the pair changes.
 * @type {React.FC<{ box: WhatIfSandbox }>}
 */
const Editor = ({ box }) => {
  const { t } = useTranslation();
  const [inputs, setInputs] = useState(box.live);
  const [switches, setSwitches] = useState(/** @type {WhatIfSwitches} */ (DEFAULT_SWITCHES));
  const [compare, setCompare] = useState(/** @type {string[]} */ ([]));
  const plan = useMemo(() => runWhatIf(box.live), [box.live]);
  const run = useMemo(() => runWhatIf(inputs, switches), [inputs, switches]);
  const compared = useMemo(
    () =>
      box.scenarios
        .filter((s) => compare.includes(s.id))
        .map((s) => ({
          id: s.id,
          name: s.name,
          run: runWhatIf(s.inputs, mergeSwitches(s.switches))
        })),
    [box.scenarios, compare]
  );
  const edited = editedCount(box.live, inputs, switches);
  /** @param {Partial<WhatIfInputs>} patch */
  const onInputs = (patch) => setInputs((prev) => ({ ...prev, ...patch }));
  /** @param {string} path @param {unknown} value */
  const onSwitch = (path, value) => setSwitches((prev) => withSwitch(prev, path, value));
  /** @param {WhatIfScenarioView} s */
  const onLoad = (s) => {
    setInputs(s.inputs);
    setSwitches(mergeSwitches(s.switches));
  };
  return (
    <div className="space-y-4">
      {box.pair.preset ? (
        <p className="text-sm text-text-secondary" data-testid="wi-preset-note">
          {t('whatIf.preset.note')}
        </p>
      ) : !box.pair.inPlan ? (
        <p className="text-sm text-text-secondary" data-testid="wi-not-in-plan">
          {t('whatIf.notInPlan')}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-secondary" data-testid="wi-edited">
          {t('whatIf.edited', { count: edited })}
        </span>
        <Button
          variant="secondary"
          onClick={() => {
            setInputs(box.live);
            setSwitches(DEFAULT_SWITCHES);
          }}
          disabled={edited === 0}
          data-testid="wi-reset"
        >
          {t('whatIf.reset')}
        </Button>
      </div>
      <ResultsTable plan={plan} scenario={run} compared={compared} />
      <InputsPanel
        inputs={inputs}
        onInputs={onInputs}
        switches={switches}
        onSwitch={onSwitch}
        run={run}
      />
      <SwitchesPanel switches={switches} onSwitch={onSwitch} />
      <WeeksGrid
        inputs={inputs}
        onLtp={(i, value) => onInputs({ ltp: inputs.ltp.map((q, k) => (k === i ? value : q)) })}
        plan={plan}
        run={run}
        uom={box.pair.uom}
      />
      <ScenariosPanel
        inputs={inputs}
        switches={switches}
        scenarios={box.scenarios}
        rulesVersion={box.rulesVersion}
        compare={compare}
        onCompare={setCompare}
        onLoad={onLoad}
      />
    </div>
  );
};

/**
 * The picker's text for a pair.
 * @param {WhatIfPair} p
 * @param {import('i18next').TFunction} t
 */
const pairText = (p, t) =>
  p.preset
    ? t('whatIf.pick.preset', { material: p.materialCode })
    : t('whatIf.pick.option', {
        material: p.materialCode,
        label: p.materialLabel,
        supplier: p.supplierName,
        cls: t(`whatIf.class.${p.materialClass}`)
      });

/** @type {React.FC} */
const BuyerWhatIfSandbox = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const [params, setParams] = useSearchParams();
  const supplierId = params.get('supplier');
  const materialCode = params.get('material');
  const pairs = useWhatIfPairs();
  const box = useWhatIfSandbox(supplierId, materialCode);
  const nowIso = inventoryNow();
  const crumb = [t('hub.nav.section.weeklyPlan'), t('hub.nav.pti.whatIfSandbox')];
  /** @param {{ supplierId: string; materialCode: string }} p */
  const pick = (p) =>
    setParams(new URLSearchParams({ supplier: p.supplierId, material: p.materialCode }), {
      replace: true
    });

  if (identity.personaType !== 'buyer')
    return (
      <AppShellV2>
        <PageHeader breadcrumb={crumb} title={t('whatIf.title')} />
        <div
          className="bg-bg-surface border border-border-subtle rounded-lg py-10 px-6 text-center"
          data-testid="wi-supplier"
        >
          <p className="text-base font-semibold text-text-primary mb-1">
            {t('whatIf.supplier.title')}
          </p>
          <p className="text-sm text-text-tertiary">{t('whatIf.supplier.body')}</p>
        </div>
      </AppShellV2>
    );
  if (pairs.isPending) return <LoadingState breadcrumb={crumb} />;
  if (pairs.isError)
    return <ErrorState breadcrumb={crumb} error={pairs.error} onRetry={() => pairs.refetch()} />;
  const list = pairs.data?.items ?? [];
  const selected = supplierId && materialCode ? `${supplierId}|${materialCode}` : '';
  const ppt7 = list.find((p) => p.supplierId === PPT7_SUPPLIER_ID);

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('whatIf.title')} subtitle={t('whatIf.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('whatIf.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>
      {/* DRC-17 BR-06 — stated on the page. */}
      <p
        className="mb-4 rounded-md border border-warning/30 bg-warning-soft px-4 py-2 text-sm font-medium text-warning-hover"
        role="note"
        data-testid="wi-analysis-only"
      >
        {t('whatIf.analysisOnly')}
      </p>
      <div className="flex flex-wrap items-end gap-3 mb-4" data-testid="wi-picker">
        <div className="min-w-[20rem]">
          <label htmlFor="wi-pair" className={labelClass}>
            {t('whatIf.pick.label')}
          </label>
          <select
            id="wi-pair"
            className={inputClass}
            value={selected}
            onChange={(e) => {
              const p = list.find((x) => keyOf(x) === e.target.value);
              if (p) pick(p);
            }}
          >
            <option value="">{t('whatIf.pick.placeholder')}</option>
            {list.map((p) => (
              <option key={keyOf(p)} value={keyOf(p)}>
                {pairText(p, t)}
              </option>
            ))}
          </select>
        </div>
        {ppt7 ? (
          <Button variant="secondary" onClick={() => pick(ppt7)} data-testid="wi-load-ppt7">
            {t('whatIf.pick.loadPpt7')}
          </Button>
        ) : null}
        {/* P-07 — opened from a material row, the sandbox still starts blank on request. */}
        {selected ? (
          <Button
            variant="secondary"
            onClick={() => setParams(new URLSearchParams())}
            data-testid="wi-new-blank"
          >
            {t('whatIf.newBlank')}
          </Button>
        ) : null}
      </div>
      {!selected ? (
        <p className="text-sm text-text-tertiary" data-testid="wi-empty">
          {t('whatIf.pick.empty')}
        </p>
      ) : box.isPending ? (
        <p className="text-sm text-text-tertiary" data-testid="wi-loading">
          {t('whatIf.loading')}
        </p>
      ) : box.isError ? (
        <div className="flex items-center gap-3" data-testid="wi-error">
          <p className="text-sm text-danger">{t('whatIf.error')}</p>
          <Button variant="secondary" onClick={() => void box.refetch()}>
            {t('whatIf.retry')}
          </Button>
        </div>
      ) : box.data ? (
        <Editor key={selected} box={box.data} />
      ) : (
        <p className="text-sm text-text-tertiary" data-testid="wi-unknown">
          {t('whatIf.save.refused.UNKNOWN_PAIR')}
        </p>
      )}
    </AppShellV2>
  );
};

export default BuyerWhatIfSandbox;
