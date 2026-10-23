/** @import React from 'react' */
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { useToast } from '@hooks/useToast';
import { MATERIAL_GROUPS } from '@services/sdc/materialGroups';
/** @import { GroupOverridableKey } from '@services/transitions/hubSettings' */
import {
  GROUP_OVERRIDABLE_KEYS,
  groupOverrideKey,
  parseGroupOverrideKey,
  settingDefOf
} from '@services/transitions/hubSettings';
import {
  groupSetting,
  hubSettingsStore,
  settingValue
} from '@services/transitions/hubSettingsStore';
import { INPUT_CLASS } from '../const';
import { useValueText } from '../hooks/useRuleValueText';
import { toInput } from '../utils';

// ── Alert thresholds and stale periods per material group ───────────────────
// REQ-E08-05 BR-03 as first written (owner, 2026-10-23): "Alert thresholds and
// the stale period are configurable by ADM, per material group." The group is
// the material master's `materialGroup` (MG-xx), the one every inventory
// position carries. A group override is a key on the same verb
// (`<baseKey>@MG-xx` on `t_setting_set`), so it is on the record with who and
// when like any change, and the page's `record` names a refusal.
//
// Like the rest of the page, the row buttons only PRE-FILL the form — "Clear"
// pre-fills an empty value, which the form records as "no override" (§84:
// gate the mode, not the door).

/**
 * @type {React.FC<{ held: boolean; version: number; record: (key: string, raw: string) => Promise<boolean>; }>}
 */
const GroupOverridesPanel = ({ held, record }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const valueText = useValueText();
  const formRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [group, setGroup] = useState('');
  const [baseKey, setBaseKey] = useState(/** @type {GroupOverridableKey | ''} */ (''));
  const [value, setValue] = useState('');
  const busy = useRef(false);

  // Every override in force, by group then in the page order of the values.
  // The page passes `version`, so the panel re-renders when a value changes;
  // the overrides object is replaced on every change, so it is the memo's key.
  const overrides = hubSettingsStore.state().groupOverrides;
  const rows = useMemo(() => {
    return Object.keys(overrides)
      .map((key) => ({ key, parsed: parseGroupOverrideKey(key), value: overrides[key] }))
      .filter((r) => r.parsed !== null)
      .map((r) => ({
        key: r.key,
        value: r.value,
        group: /** @type {NonNullable<typeof r.parsed>} */ (r.parsed).materialGroup,
        baseKey: /** @type {NonNullable<typeof r.parsed>} */ (r.parsed).baseKey
      }))
      .sort(
        (a, b) =>
          a.group.localeCompare(b.group) ||
          GROUP_OVERRIDABLE_KEYS.indexOf(a.baseKey) - GROUP_OVERRIDABLE_KEYS.indexOf(b.baseKey)
      );
  }, [overrides]);

  /**
   * @param {GroupOverridableKey} k
   * @returns {string}
   */
  const globalText = (k) => valueText(settingDefOf(k) ?? null, groupSetting(k, null));

  /**
   * @param {string} g
   * @param {GroupOverridableKey} k
   * @param {string} raw
   */
  const prefill = (g, k, raw) => {
    setGroup(g);
    setBaseKey(k);
    setValue(raw);
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  /** @param {React.FormEvent} e */
  const submit = async (e) => {
    e.preventDefault();
    if (group === '' || baseKey === '' || busy.current) return;
    busy.current = true;
    try {
      const key = groupOverrideKey(baseKey, group);
      const ok = await record(key, value);
      if (!ok) return;
      const v = settingValue(key);
      const label = t(`adminSet.groups.key.${baseKey}`);
      toast({
        variant: 'success',
        title:
          v === null
            ? t('adminSet.groups.toast.cleared', { group, label })
            : t('adminSet.groups.toast.set', {
                group,
                label,
                value: valueText(settingDefOf(key) ?? null, v)
              })
      });
      setGroup('');
      setBaseKey('');
      setValue('');
    } finally {
      busy.current = false;
    }
  };

  return (
    <section className="mb-5" data-testid="admin-set-groups">
      <h2 className="text-section text-text-primary">{t('adminSet.groups.title')}</h2>
      <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminSet.groups.intro')}</p>

      {held ? (
        <section
          ref={formRef}
          className="mb-3 rounded-lg border border-border-subtle bg-white p-4 shadow-sm"
          data-testid="admin-set-groups-form"
        >
          <h3 className="text-sm font-medium text-text-primary mb-2">
            {t('adminSet.groups.form.title')}
          </h3>
          <form
            className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_140px_auto] gap-3 items-end"
            onSubmit={(e) => void submit(e)}
          >
            <label className="block">
              <span className="text-label text-text-tertiary uppercase">
                {t('adminSet.groups.form.group')}
              </span>
              <select
                className={INPUT_CLASS}
                data-testid="admin-set-groups-group"
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value);
                  if (baseKey && e.target.value) {
                    setValue(toInput(settingValue(groupOverrideKey(baseKey, e.target.value))));
                  }
                }}
                required
              >
                <option value="">{t('adminSet.groups.form.pickGroup')}</option>
                {MATERIAL_GROUPS.map((g) => (
                  <option key={g.group} value={g.group}>
                    {`${g.group} · ${g.label}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-label text-text-tertiary uppercase">
                {t('adminSet.groups.form.key')}
              </span>
              <select
                className={INPUT_CLASS}
                data-testid="admin-set-groups-key"
                value={baseKey}
                onChange={(e) => {
                  const k = /** @type {GroupOverridableKey | ''} */ (e.target.value);
                  setBaseKey(k);
                  if (k && group) setValue(toInput(settingValue(groupOverrideKey(k, group))));
                }}
                required
              >
                <option value="">{t('adminSet.groups.form.pickKey')}</option>
                {GROUP_OVERRIDABLE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t(`adminSet.groups.key.${k}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-label text-text-tertiary uppercase">
                {t('adminSet.groups.form.value')}
              </span>
              <input
                className={`${INPUT_CLASS} font-mono`}
                data-testid="admin-set-groups-value"
                inputMode="decimal"
                value={value}
                placeholder={
                  baseKey
                    ? String(groupSetting(/** @type {GroupOverridableKey} */ (baseKey), null))
                    : ''
                }
                onChange={(e) => setValue(e.target.value)}
              />
              {baseKey !== '' ? (
                <span
                  className="block text-[11px] text-text-tertiary mt-0.5"
                  data-testid="admin-set-groups-global"
                >
                  {t('adminSet.groups.form.emptyHint', { global: globalText(baseKey) })}
                </span>
              ) : null}
            </label>
            <Button
              type="submit"
              variant="outline"
              disabled={group === '' || baseKey === ''}
              data-testid="admin-set-groups-submit"
            >
              {t('adminSet.groups.form.submit')}
            </Button>
          </form>
        </section>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-text-tertiary" data-testid="admin-set-groups-empty">
          {t('adminSet.groups.empty')}
        </p>
      ) : (
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('adminSet.groups.col.group')}</TableHeaderCell>
              <TableHeaderCell>{t('adminSet.groups.col.value')}</TableHeaderCell>
              <TableHeaderCell>{t('adminSet.groups.col.override')}</TableHeaderCell>
              <TableHeaderCell>{t('adminSet.groups.col.global')}</TableHeaderCell>
              {held ? <TableHeaderCell>{t('adminSet.col.action')}</TableHeaderCell> : null}
            </TableHeader>
            <tbody>
              {rows.map((r) => (
                <TableRow key={r.key} data-testid={`admin-set-groups-row-${r.key}`}>
                  <TableCell className="whitespace-nowrap">
                    <Data>{r.group}</Data>
                  </TableCell>
                  <TableCell className="text-sm">{t(`adminSet.groups.key.${r.baseKey}`)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Data>{valueText(settingDefOf(r.key) ?? null, r.value)}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-text-secondary">
                    <Data>{globalText(r.baseKey)}</Data>
                  </TableCell>
                  {held ? (
                    <TableCell className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          data-testid={`admin-set-groups-edit-${r.key}`}
                          onClick={() => prefill(r.group, r.baseKey, toInput(r.value))}
                        >
                          {t('adminSet.groups.action.edit')}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          data-testid={`admin-set-groups-clear-${r.key}`}
                          onClick={() => prefill(r.group, r.baseKey, '')}
                        >
                          {t('adminSet.groups.action.clear')}
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
};

export default GroupOverridesPanel;
