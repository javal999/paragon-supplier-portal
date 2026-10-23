// The hooks the rule-values page and its sections share: the settings store's
// version, how a value reads, and the label a key's changes are listed under.

import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
/** @import { HubSettingDef, HubSettingValue } from '@services/transitions/hubSettings' */
import {
  formatMinutesOfDay,
  parseGroupOverrideKey,
  parseStaleOverrideKey
} from '@services/transitions/hubSettings';
import { hubSettingsStore } from '@services/transitions/hubSettingsStore';

/**
 * The settings store's version; a component re-renders when a value changes.
 * @returns {number}
 */
export function useSettingsVersion() {
  return useSyncExternalStore(
    hubSettingsStore.subscribe,
    hubSettingsStore.version,
    hubSettingsStore.version
  );
}

/**
 * How a value reads on the page, in the page's language.
 * @returns {(def: Pick<HubSettingDef, 'unit'> | null, value: HubSettingValue | undefined) => string}
 */
export function useValueText() {
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
      case 'weeks':
        return t('adminSet.unit.weeks', { count: value });
      case 'months':
        return t('adminSet.unit.months', { count: value });
      case 'hours':
        return t('adminSet.unit.hours', { count: value });
      case 'weekday':
        return Number.isInteger(value) && value >= 1 && value <= 7
          ? t(`adminSet.unit.weekday.${value}`)
          : n;
      case 'time':
        return Number.isInteger(value) && value >= 0 && value <= 1439
          ? t('adminSet.unit.time', { value: formatMinutesOfDay(value) })
          : n;
      default:
        return n;
    }
  };
}

/**
 * The label a key's changes are listed under.
 * @returns {(key: string) => string}
 */
export function useKeyLabel() {
  const { t } = useTranslation();
  return (key) => {
    const pair = parseStaleOverrideKey(key);
    if (pair) return `${t('adminSet.rule.REQ-E08-01')} · ${pair.supplierId} · ${pair.materialCode}`;
    const group = parseGroupOverrideKey(key);
    if (group) return `${t(`adminSet.groups.key.${group.baseKey}`)} · ${group.materialGroup}`;
    return t(`adminSet.key.${key}.label`);
  };
}
