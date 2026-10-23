// ─────────────────────────────────────────────────────────────────────────────
// THE RULE VALUES IN FORCE — BL-32 (REQ-E08-05 BR-03, §3.6).
//
// Two layers, like the working calendar (`workingCalendarStore.js`):
//
//   1. THE DEFAULTS, in the registry `hubSettings.js` — the values decided on
//      2026-09-21 and the named placeholders.
//   2. THE ADMINISTRATOR'S CHANGES. An append-only ledger of
//      `{ key, value, previous, setBy, setAt }`, written ONLY by the governed
//      verb `t_setting_set` (the `CommandTarget` in `MockCommandService`).
//      "Reset to default" is a change like any other: the same verb, writing
//      the default back, on the record with who and when.
//
// ⚠️ **EVERY RULE READS THE VALUE HERE, AT EVALUATION TIME.** `hubSetting()` is
// called by the config modules' accessors each time a rule runs; nothing copies
// a value into a module constant, so a change takes effect on the next read —
// no reload, no recompute, nothing to fall out of step. `hubSettings.bl32.test.js`
// flips each value and watches a rule outcome flip with it.
//
// ⚠️ **`previous` AND `setAt` ARE STORE-ASSIGNED, NEVER PAYLOAD FIELDS** — the
// `pinnedAt` discipline: a caller that could set them could rewrite the history
// the page shows.
//
// Persistence follows the working calendar: the ledger survives a reload via
// `localStorage`, local to this browser and shared with nobody, and every row is
// RE-CHECKED on read by the same predicate the verb calls (`settingRefusal`),
// replayed in order — so a hand-edited value, or one that would break a band's
// order, is refused on read and named on the page, never silently applied. An
// unparseable store is distinguished from "no changes".
// ─────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
import { asActorAttribution } from '@lib/enforcement';
/** @import { GroupOverridableKey, HubSettingKey, HubSettingSection, HubSettingState, HubSettingValue, NumericSettingKey } from './hubSettings' */
import {
  DEFAULT_SETTING_STATE,
  defaultOfKey,
  effectiveIn,
  groupOverrideKey,
  isAddressableSettingKey,
  sectionOfKey,
  settingRefusal,
  staleOverrideKey,
  valueIn,
  withSetting
} from './hubSettings';

/** One change to one value, as recorded. */
/**
 * `previous`:  The value in force just before — store-assigned.
 * `setAt`:  Store-assigned, never a payload field.
 *
 * @typedef {{
 *   readonly key: string;
 *   readonly value: HubSettingValue;
 *   readonly previous: HubSettingValue;
 *   readonly setBy: ActorAttribution;
 *   readonly setAt: string;
 * }} HubSettingChange
 */

/**
 * `changes`:  The changes in force, oldest first.
 * `rejected`:  Stored rows refused on read, each with the reason.
 * `unreadable`:  The store exists but could not be parsed — DISTINCT from "no changes".
 *
 * @typedef {{
 *   readonly changes: readonly HubSettingChange[];
 *   readonly rejected: readonly { readonly row: string; readonly reason: string }[];
 *   readonly unreadable: boolean;
 * }} HubSettingReadState
 */

/** The one key. Beside `paragon.workingCalendar`, same envelope discipline. */
export const HUB_SETTINGS_KEY = 'paragon.hubSettings';
const STORE_VERSION = 1;

/** @type {HubSettingChange[]} */
let stored = [];
/** @type {HubSettingState} */
let state = DEFAULT_SETTING_STATE;
/** @type {HubSettingReadState} */
let readStateCache = { changes: [], rejected: [], unreadable: false };
let hydrated = false;
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/**
 * Replay rows over the defaults; a row the verb would refuse at that point is refused.
 * @param {readonly unknown[]} rows
 * @returns {{ changes: HubSettingChange[]; rejected: { row: string; reason: string }[]; state: HubSettingState; }}
 */
function replay(rows) {
  let s = DEFAULT_SETTING_STATE;
  /** @type {HubSettingChange[]} */
  const changes = [];
  /** @type {{ row: string; reason: string }[]} */
  const rejected = [];
  for (const [i, row] of rows.entries()) {
    const r = /** @type {Record<string, unknown> | null} */ (row);
    if (
      !r ||
      typeof r !== 'object' ||
      typeof r.setAt !== 'string' ||
      !isAddressableSettingKey(r.key)
    ) {
      rejected.push({ row: `row ${i}`, reason: 'not a setting change' });
      continue;
    }
    const refusal = settingRefusal(r.key, r.value, s);
    if (refusal) {
      rejected.push({ row: String(r.key), reason: refusal });
      continue;
    }
    const setBy = asActorAttribution(r.setBy);
    if (!setBy) {
      rejected.push({ row: String(r.key), reason: 'setBy is not a recorded attribution' });
      continue;
    }
    const value = /** @type {HubSettingValue} */ (r.value);
    const previous = valueIn(s, r.key) ?? null;
    changes.push({ key: r.key, value, previous, setBy, setAt: r.setAt });
    s = withSetting(s, r.key, value);
  }
  return { changes, rejected, state: s };
}

/** @returns {{ rows: readonly unknown[]; unreadable: boolean }} */
function readFromStorage() {
  /** @type {string | null} */
  let raw = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage)
      return { rows: [], unreadable: false };
    raw = window.localStorage.getItem(HUB_SETTINGS_KEY);
  } catch {
    return { rows: [], unreadable: false };
  }
  if (raw === null) return { rows: [], unreadable: false };
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { rows: [], unreadable: true };
  }
  const env = /** @type {{ v?: unknown; changes?: unknown } | null} */ (parsed);
  if (!env || typeof env !== 'object' || env.v !== STORE_VERSION || !Array.isArray(env.changes)) {
    return { rows: [], unreadable: true };
  }
  return { rows: /** @type {readonly unknown[]} */ (env.changes), unreadable: false };
}

/** @returns {void} */
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const read = readFromStorage();
  const replayed = replay(read.rows);
  stored = replayed.changes;
  state = replayed.state;
  readStateCache = { changes: stored, rejected: replayed.rejected, unreadable: read.unreadable };
}

/** @returns {void} */
function persist() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      HUB_SETTINGS_KEY,
      JSON.stringify({ v: STORE_VERSION, changes: stored })
    );
  } catch {
    // Quota / private browsing: the change stands for the session and is in the
    // audit trail; only its durability is lost.
  }
}

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const hubSettingsStore = {
  /**
   * The whole state in force: every fixed value and the override map.
   * @returns {HubSettingState}
   */
  state() {
    hydrate();
    return state;
  },
  /**
   * Every change in force, oldest first.
   * @returns {readonly HubSettingChange[]}
   */
  changes() {
    hydrate();
    return stored;
  },
  /**
   * The changes shown in one page section, oldest first.
   * @param {HubSettingSection} section
   * @returns {readonly HubSettingChange[]}
   */
  changesIn(section) {
    return hubSettingsStore.changes().filter((c) => sectionOfKey(c.key) === section);
  },
  /**
   * What the last read found, including refused rows and an unreadable store.
   * @returns {HubSettingReadState}
   */
  readState() {
    hydrate();
    return readStateCache;
  },
  /**
   * APPEND ONLY — called by the `t_setting_set` target and nothing else.
   * Returns false (and records nothing) for a change the rule refuses, so the
   * store can never hold a state the verb would not have produced.
   * @param {{ key: string; value: HubSettingValue; setBy: ActorAttribution; setAt: string }} change
   * @returns {boolean}
   */
  append(change) {
    hydrate();
    if (settingRefusal(change.key, change.value, state) !== null) return false;
    const previous = valueIn(state, change.key) ?? null;
    /** @type {HubSettingChange} */
    const row = { ...change, previous };
    stored = [...stored, row];
    state = withSetting(state, change.key, change.value);
    readStateCache = { ...readStateCache, changes: stored };
    persist();
    changed();
    return true;
  },
  /**
   * Back to the defaults, in memory AND on disk — test isolation.
   * @returns {void}
   */
  reset() {
    stored = [];
    state = DEFAULT_SETTING_STATE;
    readStateCache = { changes: [], rejected: [], unreadable: false };
    hydrated = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage)
        window.localStorage.removeItem(HUB_SETTINGS_KEY);
    } catch {
      // in-memory state is already clear
    }
    changed();
  },
  /**
   * Drop the in-memory copy WITHOUT touching storage — what a reload does.
   * @returns {void}
   */
  rehydrate() {
    stored = [];
    hydrated = false;
    hydrate();
    changed();
  },
  /**
   * A number that changes whenever a value in force does.
   * @returns {number}
   */
  version() {
    return version;
  },
  /**
   * @param {() => void} listener
   * @returns {() => void}
   */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

// ── The readers' entrance ────────────────────────────────────────────────────

/**
 * THE value of a numeric setting in force, read at the moment of the call.
 * @param {NumericSettingKey} key
 * @returns {number}
 */
export function hubSetting(key) {
  return /** @type {number} */ (hubSettingsStore.state().values[key]);
}

/**
 * THE value of a yes/no setting in force.
 * @param {Extract<HubSettingKey, 'gate.noHistoryPasses'>} key
 * @returns {boolean}
 */
export function hubSettingFlag(key) {
  return /** @type {boolean} */ (hubSettingsStore.state().values[key]);
}

/**
 * The value of any addressable key in force (an override with none: null).
 * @param {string} key
 * @returns {HubSettingValue | undefined}
 */
export function settingValue(key) {
  return valueIn(hubSettingsStore.state(), key);
}

/**
 * Is this key at its default?
 * @param {string} key
 * @returns {boolean}
 */
export const isAtDefault = (key) => settingValue(key) === defaultOfKey(key);

/**
 * BL-32 — the administrator's stale period (days) for one supplier × material, or null when none.
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {number | null}
 */
export function staleOverrideFor(supplierId, materialCode) {
  return (
    hubSettingsStore.state().staleOverrides[staleOverrideKey(supplierId, materialCode)] ?? null
  );
}

/**
 * REQ-E08-05 BR-03 (owner, 2026-10-23) — the value in force for one material
 * group: the group's override, else the global value. Without a group (or with
 * a group that has no override) it is exactly the global value.
 * @param {GroupOverridableKey} baseKey
 * @param {string | null | undefined} materialGroup
 * @returns {number}
 */
export function groupSetting(baseKey, materialGroup) {
  return effectiveIn(hubSettingsStore.state(), baseKey, materialGroup);
}

/**
 * The material group's own override of one value, or null when it has none.
 * @param {GroupOverridableKey} baseKey
 * @param {string | null | undefined} materialGroup
 * @returns {number | null}
 */
export function groupOverrideFor(baseKey, materialGroup) {
  if (!materialGroup) return null;
  return hubSettingsStore.state().groupOverrides[groupOverrideKey(baseKey, materialGroup)] ?? null;
}

/**
 * REQ-E08-01 — the stale period (days) for one supplier × material, in force
 * now. Precedence: the supplier × material override (BL-32), then the
 * material group's override, then the default stale period.
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string | null} [materialGroup]
 * @returns {number}
 */
export function stalePeriodFor(supplierId, materialCode, materialGroup) {
  const s = hubSettingsStore.state();
  return (
    s.staleOverrides[staleOverrideKey(supplierId, materialCode)] ??
    effectiveIn(s, 'stale.defaultDays', materialGroup)
  );
}
