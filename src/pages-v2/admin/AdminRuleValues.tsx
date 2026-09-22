import React, { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import AppShellV2 from '../../components/layout-v2/AppShellV2';
import PageHeader from '../../components/ui-v2/PageHeader';
import PageMetaLine from '../../components/ui-v2/PageMetaLine';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { useRefusalText } from '../../hooks/useRefusalText';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../lib/format';
import { useSettingSet } from '../../services/query/commandHooks';
import { useInventory } from '../../services/query/hooks';
import {
  HUB_SETTINGS,
  SEEDED_STALE_OVERRIDES,
  STALE_OVERRIDE_BOUNDS,
  defaultOfKey,
  hubSettingDef,
  parseStaleOverrideKey,
  staleOverrideKey,
  type HubSettingDef,
  type HubSettingSection,
  type HubSettingValue,
} from '../../services/transitions/hubSettings';
import { hubSettingsStore, settingValue } from '../../services/transitions/hubSettingsStore';
import { stockFreshness } from '../../services/transitions/inventoryRules';
import { inventoryNow } from '../inventory/inventoryDisplay';
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · THE HUB'S RULE VALUES — BL-32 (REQ-E08-05 BR-03, §3.6, ADM).
//
// Two pages, one component, because they are one verb (`t_setting_set`) over
// one registry (`hubSettings.ts`), split for reading:
//   · Tolerances and rule values — CR-05, the call-off confirmation deadline,
//     CR-12, CR-25, CR-21, CR-26, CR-22, CR-23;
//   · Alert thresholds and stale periods — CR-24, CR-02, CR-03, the default
//     stale period and the stale period per supplier × material.
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
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

function useSettingsVersion(): number {
  return useSyncExternalStore(hubSettingsStore.subscribe, hubSettingsStore.version, hubSettingsStore.version);
}

/** How a value reads on the page, in the page's language. */
function useValueText(): (def: Pick<HubSettingDef, 'unit'> | null, value: HubSettingValue | undefined) => string {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'id' ? 'id-ID' : 'en-GB';
  return (def, value) => {
    if (value === null || value === undefined) return t('adminSet.unit.noOverride');
    if (typeof value === 'boolean') return t(value ? 'adminSet.unit.yes' : 'adminSet.unit.no');
    const unit = def?.unit ?? 'days';
    const n = value.toLocaleString(locale, { maximumFractionDigits: 3 });
    switch (unit) {
      case 'pct':
        return t('adminSet.unit.pct', { value: n });
      case 'days':
        return t('adminSet.unit.days', { count: value });
      case 'workingDays':
        return t('adminSet.unit.workingDays', { count: value });
      case 'idr':
        return t('adminSet.unit.idr', { value: value.toLocaleString('id-ID') });
      case 'multiple':
        return t('adminSet.unit.multiple', { value: n });
      default:
        return n;
    }
  };
}

/** The label a key's changes are listed under. */
function useKeyLabel(): (key: string) => string {
  const { t } = useTranslation();
  return (key) => {
    const pair = parseStaleOverrideKey(key);
    if (pair) return `${t('adminSet.rule.REQ-E08-01')} · ${pair.supplierId} · ${pair.materialCode}`;
    return t(`adminSet.key.${key}.label`);
  };
}

interface Draft {
  key: string;
  /** The typed value; for a yes/no key, 'true' or 'false'. */
  value: string;
}

const EMPTY_DRAFT: Draft = { key: '', value: '' };

const toInput = (v: HubSettingValue | undefined): string => (v === null || v === undefined ? '' : String(v));

/** Read the typed input as the value the verb gets. An empty override is `null`. */
function fromInput(key: string, raw: string): number | boolean | null | string {
  const def = hubSettingDef(key);
  if (def?.unit === 'boolean') return raw === 'true';
  const trimmed = raw.trim();
  if (trimmed === '' && parseStaleOverrideKey(key)) return null;
  const n = Number(trimmed);
  // An unreadable number goes to the verb as typed, so the refusal names it.
  return trimmed === '' || Number.isNaN(n) ? trimmed : n;
}

const RuleValuesPage: React.FC<{ section: HubSettingSection }> = ({ section }) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const setSetting = useSettingSet();
  const availability = useVerbAvailability('setting:set');
  const held = availability.kind === 'held';
  const version = useSettingsVersion();
  const valueText = useValueText();
  const keyLabel = useKeyLabel();
  const formRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const defs = useMemo(() => HUB_SETTINGS.filter((d) => d.section === section), [section]);
  const groups = useMemo(() => {
    const out: { rule: string; defs: HubSettingDef[] }[] = [];
    for (const d of defs) {
      const g = out.find((x) => x.rule === d.rule);
      if (g) g.defs.push(d);
      else out.push({ rule: d.rule, defs: [d] });
    }
    return out;
  }, [defs]);
  const changes = useMemo(() => [...hubSettingsStore.changesIn(section)].reverse(), [section, version]);
  const readState = useMemo(() => hubSettingsStore.readState(), [version]);
  const changedCount = defs.filter((d) => settingValue(d.key) !== d.defaultValue).length;

  // The last refusal stays on the page, named, until the next attempt: a toast
  // alone disappears before a reader can see what was refused and why.
  const [refusal, setRefusal] = useState<string | null>(null);

  const prefill = (key: string, value: HubSettingValue | undefined) => {
    setDraft({ key, value: toInput(value) });
    setRefusal(null);
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const record = async (key: string, raw: string) => {
    const value = fromInput(key, raw);
    const result = await setSetting.mutateAsync({ key, value: value as number | boolean | null });
    if (result.status === 'failed') {
      const text = refusalText(result.reason) ?? t('adminSet.toast.refused', { reason: result.reason ?? '' });
      setRefusal(text);
      toast({ variant: 'error', title: text });
      return false;
    }
    setRefusal(null);
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.key === '') return;
    const ok = await record(draft.key, draft.value);
    if (!ok) return;
    toast({
      variant: 'success',
      title: t('adminSet.toast.saved', {
        label: keyLabel(draft.key),
        value: valueText(hubSettingDef(draft.key) ?? null, settingValue(draft.key)),
      }),
    });
    setDraft(EMPTY_DRAFT);
  };

  const draftDef = draft.key ? hubSettingDef(draft.key) : undefined;
  const CRUMB = [t('adminCal.crumb.administration'), t(`adminSet.${section}.crumb`)];
  const prefix = `admin-set-${section}`;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={CRUMB} title={t(`adminSet.${section}.title`)} subtitle={t(`adminSet.${section}.subtitle`)} />
      <PageMetaLine className="-mt-6 mb-6">
        <span data-testid={`${prefix}-meta`}>{t('adminSet.meta.changed', { count: changedCount })}</span> ·{' '}
        {t('adminSet.meta.readNow')}
      </PageMetaLine>

      <AdminSectionNav />

      {refusal && (
        <section
          role="alert"
          className="mb-5 rounded-lg border border-danger/30 bg-danger-soft p-4 flex gap-3"
          data-testid="admin-set-refusal"
        >
          <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">{refusal}</p>
        </section>
      )}

      {readState.unreadable && (
        <section
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-4 flex gap-3"
          data-testid="admin-set-store-unreadable"
        >
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">{t('adminSet.store.unreadableTitle')}</div>
            <p className="text-xs text-text-secondary mt-1">{t('adminSet.store.unreadableBody')}</p>
          </div>
        </section>
      )}
      {readState.rejected.length > 0 && (
        <section
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-4 flex gap-3"
          data-testid="admin-set-store-rejected"
        >
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">{t('adminSet.store.rejectedTitle')}</div>
            <p className="text-xs text-text-secondary mt-1">{t('adminSet.store.rejectedBody')}</p>
            <ul className="text-xs text-text-secondary mt-1 list-disc pl-4">
              {readState.rejected.map((r) => (
                <li key={`${r.row}-${r.reason}`}>
                  <Data>{r.row}</Data>: {r.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── The one entrance to the verb ─────────────────────────────────── */}
      {held ? (
        <section
          ref={formRef}
          className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
          data-testid="admin-set-form"
        >
          <h2 className="text-section text-text-primary">{t('adminSet.form.title')}</h2>
          <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminSet.form.intro')}</p>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3">
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">{t('adminSet.form.key')}</span>
                <select
                  className={INPUT_CLASS}
                  data-testid="admin-set-key"
                  value={draft.key}
                  onChange={(e) => prefill(e.target.value, e.target.value ? settingValue(e.target.value) : undefined)}
                  required
                >
                  <option value="">{t('adminSet.form.pick')}</option>
                  {defs.map((d) => (
                    <option key={d.key} value={d.key}>
                      {t(`adminSet.key.${d.key}.label`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('adminSet.form.newValue')}
                  {draftDef && draftDef.unit !== 'boolean' ? ` (${t(`adminSet.unit.input.${draftDef.unit}`)})` : ''}
                </span>
                {draftDef?.unit === 'boolean' ? (
                  <select
                    className={INPUT_CLASS}
                    data-testid="admin-set-value"
                    value={draft.value}
                    onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                  >
                    <option value="true">{t('adminSet.unit.yes')}</option>
                    <option value="false">{t('adminSet.unit.no')}</option>
                  </select>
                ) : (
                  <input
                    className={`${INPUT_CLASS} font-mono`}
                    data-testid="admin-set-value"
                    inputMode="decimal"
                    value={draft.value}
                    onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
                    disabled={draft.key === ''}
                    required
                  />
                )}
              </label>
            </div>
            {draftDef && (
              <p className="text-xs text-text-secondary" data-testid="admin-set-form-current">
                {t('adminSet.form.current', {
                  value: valueText(draftDef, settingValue(draftDef.key)),
                  default: valueText(draftDef, draftDef.defaultValue),
                })}
              </p>
            )}
            <p className="text-xs text-text-tertiary" data-testid="admin-set-attribution">
              {t('adminSet.form.attribution')}
            </p>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={setSetting.isPending || draft.key === ''}
                data-testid="admin-set-submit"
              >
                {t('adminSet.form.submit')}
              </Button>
              {draft.key !== '' && (
                <Button type="button" variant="secondary" onClick={() => setDraft(EMPTY_DRAFT)}>
                  {t('adminSet.form.cancel')}
                </Button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section
          className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
          data-testid="admin-set-gate"
        >
          <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{t('adminSet.gate.title')}</span>
              <HandoffNotice availability={availability} testId="handoff-setting-set" />
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('adminSet.gate.body')}</p>
          </div>
        </section>
      )}

      {/* ── The values, grouped by rule ──────────────────────────────────── */}
      {groups.map((g) => (
        <section key={g.rule} className="mb-5" data-testid={`admin-set-group-${g.rule}`}>
          <h2 className="text-section text-text-primary mb-2">{t(`adminSet.rule.${g.rule}`)}</h2>
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('adminSet.col.value')}</TableHeaderCell>
                <TableHeaderCell>{t('adminSet.col.inForce')}</TableHeaderCell>
                <TableHeaderCell>{t('adminSet.col.default')}</TableHeaderCell>
                {held && <TableHeaderCell>{t('adminSet.col.action')}</TableHeaderCell>}
              </TableHeader>
              <tbody>
                {g.defs.map((d) => {
                  const inForce = settingValue(d.key);
                  const atDefault = inForce === d.defaultValue;
                  return (
                    <TableRow key={d.key} data-testid={`admin-set-row-${d.key}`}>
                      <TableCell className="text-sm">
                        <div className="text-text-primary">{t(`adminSet.key.${d.key}.label`)}</div>
                        <div className="text-xs text-text-tertiary mt-0.5">{t(`adminSet.key.${d.key}.hint`)}</div>
                        {d.placeholder && (
                          <div className="mt-1" data-testid={`admin-set-placeholder-${d.key}`}>
                            <StatusPill variant="warning">
                              {t('adminSet.placeholder', {
                                owner: t(`adminSet.owner.${d.placeholder.owner}`),
                                id: d.placeholder.backlogId,
                              })}
                            </StatusPill>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Data>
                          <span data-testid={`admin-set-value-${d.key}`}>{valueText(d, inForce)}</span>
                        </Data>
                        <StatusPill variant={atDefault ? 'neutral' : 'info'} className="ml-2">
                          {t(atDefault ? 'adminSet.atDefault' : 'adminSet.changedFromDefault')}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Data>{valueText(d, d.defaultValue)}</Data>
                      </TableCell>
                      {held && (
                        <TableCell className="whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              data-testid={`admin-set-change-${d.key}`}
                              onClick={() => prefill(d.key, inForce)}
                            >
                              {t('adminSet.action.change')}
                            </Button>
                            {!atDefault && (
                              <Button
                                type="button"
                                variant="secondary"
                                data-testid={`admin-set-reset-${d.key}`}
                                onClick={() => prefill(d.key, d.defaultValue)}
                              >
                                {t('adminSet.action.reset')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </section>
      ))}

      {section === 'alerts' && <StalePeriodsPanel held={held} version={version} record={record} />}

      {/* ── The changes on record ────────────────────────────────────────── */}
      <section data-testid="admin-set-history">
        <h2 className="text-section text-text-primary mb-3">{t('adminSet.history.title')}</h2>
        {changes.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="admin-set-history-empty">
            {t('adminSet.history.empty')}
          </p>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('adminSet.history.col.value')}</TableHeaderCell>
                <TableHeaderCell>{t('adminSet.history.col.change')}</TableHeaderCell>
                <TableHeaderCell>{t('adminSet.history.col.by')}</TableHeaderCell>
                <TableHeaderCell>{t('adminSet.history.col.at')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {changes.map((c, i) => {
                  const def = hubSettingDef(c.key) ?? null;
                  return (
                    <TableRow key={`${c.key}-${c.setAt}-${i}`} data-testid={`admin-set-change-row-${c.key}`}>
                      <TableCell className="text-sm">{keyLabel(c.key)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <Data>{valueText(def, c.previous)}</Data> → <Data>{valueText(def, c.value)}</Data>
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {c.setBy.kind === 'RESOLVED' ? c.setBy.person.displayName : t('adminSet.by.unattributed')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Data>{formatDateTime(c.setAt)}</Data>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </AppShellV2>
  );
};

// ── The stale period per supplier × material ─────────────────────────────────

const StalePeriodsPanel: React.FC<{
  held: boolean;
  version: number;
  record: (key: string, raw: string) => Promise<boolean>;
}> = ({ held, version, record }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const valueText = useValueText();
  const inventory = useInventory();
  const formRef = useRef<HTMLElement>(null);
  const [pairKey, setPairKey] = useState('');
  const [days, setDays] = useState('');
  const busy = useRef(false);

  const now = inventoryNow();
  const rows = useMemo(() => {
    const items = inventory.data?.items ?? [];
    return items.map((p) => {
      const key = staleOverrideKey(p.supplierId, p.materialCode);
      const override = settingValue(key);
      return { p, key, override: typeof override === 'number' ? override : null };
    });
    // `version` re-derives the rows when a value changes on this page.
  }, [inventory.data, version]);
  const pairName = (key: string): string => {
    const r = rows.find((x) => x.key === key);
    return r
      ? t('adminSet.stale.pair', { supplier: r.p.supplierName, material: r.p.materialCode })
      : key;
  };
  const daysDef = { unit: 'days' as const };

  const run = async (key: string, raw: string) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const ok = await record(key, raw);
      if (!ok) return;
      const v = settingValue(key);
      toast({
        variant: 'success',
        title:
          v === null
            ? t('adminSet.stale.toast.removed', { pair: pairName(key) })
            : t('adminSet.stale.toast.set', { pair: pairName(key), value: valueText(daysDef, v) }),
      });
      setPairKey('');
      setDays('');
    } finally {
      busy.current = false;
    }
  };

  return (
    <section className="mb-5" data-testid="admin-set-stale">
      <h2 className="text-section text-text-primary">{t('adminSet.stale.title')}</h2>
      <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminSet.stale.intro')}</p>

      {held && (
        <section
          ref={formRef}
          className="mb-3 rounded-lg border border-border-subtle bg-white p-4 shadow-sm"
          data-testid="admin-set-stale-form"
        >
          <h3 className="text-sm font-medium text-text-primary mb-2">{t('adminSet.stale.form.title')}</h3>
          <form
            className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_160px_auto] gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (pairKey) void run(pairKey, days);
            }}
          >
            <label className="block">
              <span className="text-label text-text-tertiary uppercase">{t('adminSet.stale.form.pair')}</span>
              <select
                className={INPUT_CLASS}
                data-testid="admin-set-stale-pair"
                value={pairKey}
                onChange={(e) => {
                  setPairKey(e.target.value);
                  setDays(toInput(e.target.value ? settingValue(e.target.value) : undefined));
                }}
                required
              >
                <option value="">{t('adminSet.stale.form.pick')}</option>
                {rows.map((r) => (
                  <option key={r.key} value={r.key}>
                    {t('adminSet.stale.pair', { supplier: r.p.supplierName, material: r.p.materialCode })}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-label text-text-tertiary uppercase">{t('adminSet.stale.form.days')}</span>
              <input
                className={`${INPUT_CLASS} font-mono`}
                data-testid="admin-set-stale-days"
                inputMode="numeric"
                min={STALE_OVERRIDE_BOUNDS.min}
                max={STALE_OVERRIDE_BOUNDS.max}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
              <span className="block text-[11px] text-text-tertiary mt-0.5">{t('adminSet.stale.form.emptyHint')}</span>
            </label>
            <Button type="submit" variant="outline" disabled={pairKey === ''} data-testid="admin-set-stale-submit">
              {t('adminSet.stale.form.submit')}
            </Button>
          </form>
        </section>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('adminSet.stale.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.period')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.source')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.lastUpdate')}</TableHeaderCell>
            <TableHeaderCell>{t('adminSet.stale.col.now')}</TableHeaderCell>
            {held && <TableHeaderCell>{t('adminSet.col.action')}</TableHeaderCell>}
          </TableHeader>
          <tbody>
            {rows.map(({ p, key, override }) => {
              const freshness = stockFreshness(p, now);
              const seeded = SEEDED_STALE_OVERRIDES[key];
              return (
                <TableRow key={key} data-testid={`admin-set-stale-row-${p.supplierId}-${p.materialCode}`}>
                  <TableCell className="text-sm">{p.supplierName}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Data>{p.materialCode}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Data>{valueText(daysDef, p.updateSla)}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {t(override === null ? 'adminSet.stale.source.default' : 'adminSet.stale.source.override')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Data>{p.lastUpdatedAt ? formatDateTime(p.lastUpdatedAt) : '—'}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap" data-testid={`admin-set-stale-now-${p.supplierId}-${p.materialCode}`}>
                    <StatusPill variant={freshness === 'current' ? 'success' : 'warning'}>
                      {t(`adminSet.stale.now.${freshness}`)}
                    </StatusPill>
                  </TableCell>
                  {held && (
                    <TableCell className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setPairKey(key);
                            setDays(toInput(override ?? undefined));
                            formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          {t('adminSet.stale.action.set')}
                        </Button>
                        {seeded !== undefined && override !== seeded && (
                          <Button
                            type="button"
                            variant="secondary"
                            data-testid={`admin-set-stale-reset-${p.supplierId}-${p.materialCode}`}
                            onClick={() => {
                              setPairKey(key);
                              setDays(toInput(defaultOfKey(key)));
                              formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
                            }}
                          >
                            {t('adminSet.action.reset')}
                          </Button>
                        )}
                        {override !== null && (
                          <Button
                            type="button"
                            variant="secondary"
                            data-testid={`admin-set-stale-remove-${p.supplierId}-${p.materialCode}`}
                            onClick={() => {
                              // Pre-fills "no period of its own"; the form records it.
                              setPairKey(key);
                              setDays('');
                              formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
                            }}
                          >
                            {t('adminSet.stale.action.remove')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

/** Administration → Tolerances and rule values. */
export const AdminTolerances: React.FC = () => <RuleValuesPage section="tolerances" />;

/** Administration → Alert thresholds and stale periods. */
export const AdminAlertThresholds: React.FC = () => <RuleValuesPage section="alerts" />;
