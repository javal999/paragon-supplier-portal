// Pure helpers for the rule-values page: how a stored value reads in a form
// input, and how the typed input reads back as the value the verb gets.

/** @import { HubSettingValue } from '@services/transitions/hubSettings' */
import {
  formatMinutesOfDay,
  hubSettingDef,
  parseGroupOverrideKey,
  parseStaleOverrideKey,
  parseTimeOfDay
} from '@services/transitions/hubSettings';

/**
 * @typedef {object} Draft
 * @property {string} key
 * @property {string} value -  The typed value; for a yes/no key, 'true' or 'false'.
 */

/**
 * @param {HubSettingValue | undefined} v
 * @returns {string}
 */
export const toInput = (v) => (v === null || v === undefined ? '' : String(v));

/**
 * A key's value as the form's input holds it; a time of day as `HH:MM`.
 * @param {string} key
 * @param {HubSettingValue | undefined} v
 * @returns {string}
 */
export function settingToInput(key, v) {
  if (hubSettingDef(key)?.unit === 'time' && typeof v === 'number') return formatMinutesOfDay(v);
  return toInput(v);
}

/**
 * Read the typed input as the value the verb gets. An empty override is `null`.
 * @param {string} key
 * @param {string} raw
 * @returns {number | boolean | null | string}
 */
export function fromInput(key, raw) {
  const def = hubSettingDef(key);
  if (def?.unit === 'boolean') return raw === 'true';
  const trimmed = raw.trim();
  if (trimmed === '' && (parseStaleOverrideKey(key) || parseGroupOverrideKey(key))) return null;
  // A time of day goes to the verb as minutes after midnight; an unreadable one as typed.
  if (def?.unit === 'time') return parseTimeOfDay(trimmed) ?? trimmed;
  const n = Number(trimmed);
  // An unreadable number goes to the verb as typed, so the refusal names it.
  return trimmed === '' || Number.isNaN(n) ? trimmed : n;
}
