/** @import React from 'react' */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { useSettingSet } from '@services/query/commandHooks';
/** @import { HubSettingDef, HubSettingSection, HubSettingValue } from '@services/transitions/hubSettings' */
import { HUB_SETTINGS, hubSettingDef } from '@services/transitions/hubSettings';
import { hubSettingsStore, settingValue } from '@services/transitions/hubSettingsStore';
import AdminSectionNav from '../AdminSectionNav';
import { EMPTY_DRAFT } from './const';
import { fromInput, settingToInput } from './utils';
/** @import { Draft } from './utils' */
import { useKeyLabel, useSettingsVersion, useValueText } from './hooks/useRuleValueText';
import PageNotices from './components/PageNotices';
import SettingForm from './components/SettingForm';
import SettingGate from './components/SettingGate';
import RuleGroup from './components/RuleGroup';
import StalePeriodsPanel from './components/StalePeriodsPanel';
import GroupOverridesPanel from './components/GroupOverridesPanel';
import ChangeHistory from './components/ChangeHistory';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · THE HUB'S RULE VALUES — BL-32 (REQ-E08-05 BR-03, §3.6, ADM).
//
// Two pages, one component, because they are one verb (`t_setting_set`) over
// one registry (`hubSettings.js`), split for reading:
//   · Tolerances and rule values — CR-05, the call-off confirmation deadline,
//     CR-12, CR-25, CR-21, CR-26, CR-22, CR-23, MR-2 (update compliance),
//     MR-6 (default shelf life);
//   · Alert thresholds and stale periods — CR-24, CR-02, CR-03, the default
//     stale period, MR-1 (sync interval, API stale period, weekly cutoff),
//     the overrides per material group (REQ-E08-05 BR-03) and the stale
//     period per supplier × material.
//
// The layout follows the working calendar and the 3PL list (BL-50, BL-51):
//   · THE VALUES, each with its value in force, its default, and — while an
//     owner has not decided — "Placeholder until <owner> decides (BL-xx)".
//   · ONE FORM, the only entrance to the verb. Row buttons only PRE-FILL it —
//     "Reset to default" included, which pre-fills the default so the reset is
//     the same recorded act (§84: gate the mode, not the door). A seat without
//     `setting:set` reads everything and is told whose act a change is.
//   · THE CHANGES ON RECORD per section, old → new, with who and when —
//     including the honest "not attributed".
//   · Refused and unreadable stored changes are NAMED, never silently dropped.
//
// Phase 5 split (PAGE-SPLIT-GUIDE): the page component, its state and its
// handlers stay here; each section is a file under `components/`, the shared
// hooks are in `hooks/`, the pure input helpers in `utils.js` and the shared
// constants in `const.js`.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {React.FC<{ section: HubSettingSection }>} */
const RuleValuesPage = ({ section }) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const setSetting = useSettingSet();
  const availability = useVerbAvailability('setting:set');
  const held = availability.kind === 'held';
  const version = useSettingsVersion();
  const valueText = useValueText();
  const keyLabel = useKeyLabel();
  const formRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [draft, setDraft] = useState(/** @type {Draft} */ (EMPTY_DRAFT));

  const defs = useMemo(() => HUB_SETTINGS.filter((d) => d.section === section), [section]);
  const groups = useMemo(() => {
    /** @type {{ rule: string; defs: HubSettingDef[] }[]} */
    const out = [];
    for (const d of defs) {
      const g = out.find((x) => x.rule === d.rule);
      if (g) g.defs.push(d);
      else out.push({ rule: d.rule, defs: [d] });
    }
    return out;
  }, [defs]);
  // `seq` is a change's position in the section's log, oldest first. The log is
  // append-only, so seq never shifts and is the row's React key; key + setAt
  // alone can repeat (two changes to one key in the same instant), and the
  // index of the newest-first list shifts on every new change.
  const changes = useMemo(
    () =>
      hubSettingsStore
        .changesIn(section)
        .map((c, seq) => ({ ...c, seq }))
        .reverse(),
    [section, version]
  );
  const readState = useMemo(() => hubSettingsStore.readState(), [version]);
  const changedCount = defs.filter((d) => settingValue(d.key) !== d.defaultValue).length;

  // The last refusal stays on the page, named, until the next attempt: a toast
  // alone disappears before a reader can see what was refused and why.
  const [refusal, setRefusal] = useState(/** @type {string | null} */ (null));

  /**
   * @param {string} key
   * @param {HubSettingValue | undefined} value
   */
  const prefill = (key, value) => {
    setDraft({ key, value: settingToInput(key, value) });
    setRefusal(null);
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  /**
   * @param {string} key
   * @param {string} raw
   */
  const record = async (key, raw) => {
    const value = fromInput(key, raw);
    const result = await setSetting.mutateAsync({
      key,
      value: /** @type {number | boolean | null} */ (value)
    });
    if (result.status === 'failed') {
      const text =
        refusalText(result.reason) ?? t('adminSet.toast.refused', { reason: result.reason ?? '' });
      setRefusal(text);
      toast({ variant: 'error', title: text });
      return false;
    }
    setRefusal(null);
    return true;
  };

  /** @param {React.FormEvent} e */
  const submit = async (e) => {
    e.preventDefault();
    if (draft.key === '') return;
    const ok = await record(draft.key, draft.value);
    if (!ok) return;
    toast({
      variant: 'success',
      title: t('adminSet.toast.saved', {
        label: keyLabel(draft.key),
        value: valueText(hubSettingDef(draft.key) ?? null, settingValue(draft.key))
      })
    });
    setDraft(EMPTY_DRAFT);
  };

  const draftDef = draft.key ? hubSettingDef(draft.key) : undefined;
  const CRUMB = [t('adminCal.crumb.administration'), t(`adminSet.${section}.crumb`)];
  const prefix = `admin-set-${section}`;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t(`adminSet.${section}.title`)}
        subtitle={t(`adminSet.${section}.subtitle`)}
      />
      <PageMetaLine className="-mt-6 mb-6">
        <span data-testid={`${prefix}-meta`}>
          {t('adminSet.meta.changed', { count: changedCount })}
        </span>{' '}
        · {t('adminSet.meta.readNow')}
      </PageMetaLine>

      <AdminSectionNav />

      <PageNotices refusal={refusal} readState={readState} />

      {/* ── The one entrance to the verb ─────────────────────────────────── */}
      {held ? (
        <SettingForm
          formRef={formRef}
          defs={defs}
          draft={draft}
          setDraft={setDraft}
          draftDef={draftDef}
          prefill={prefill}
          submit={submit}
          isPending={setSetting.isPending}
          valueText={valueText}
        />
      ) : (
        <SettingGate availability={availability} />
      )}

      {/* ── The values, grouped by rule ──────────────────────────────────── */}
      {groups.map((g) => (
        <RuleGroup
          key={g.rule}
          rule={g.rule}
          defs={g.defs}
          held={held}
          prefill={prefill}
          valueText={valueText}
        />
      ))}

      {/* REQ-E08-05 BR-03 (owner, 2026-10-23) — the same values per material group. */}
      {section === 'alerts' && (
        <GroupOverridesPanel held={held} version={version} record={record} />
      )}

      {section === 'alerts' && <StalePeriodsPanel held={held} version={version} record={record} />}

      {/* ── The changes on record ────────────────────────────────────────── */}
      <ChangeHistory changes={changes} keyLabel={keyLabel} valueText={valueText} />
    </AppShellV2>
  );
};

/**
 * Administration → Tolerances and rule values.
 * @type {React.FC}
 */
export const AdminTolerances = () => <RuleValuesPage section="tolerances" />;

/**
 * Administration → Alert thresholds and stale periods.
 * @type {React.FC}
 */
export const AdminAlertThresholds = () => <RuleValuesPage section="alerts" />;
