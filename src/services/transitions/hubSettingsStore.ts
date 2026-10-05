// ─────────────────────────────────────────────────────────────────────────────
// THE RULE VALUES IN FORCE — BL-32 (REQ-E08-05 BR-03, §3.6).
//
// Two layers, like the working calendar (`workingCalendarStore.ts`):
//
//   1. THE DEFAULTS, in the registry `hubSettings.ts` — the values decided on
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
// no reload, no recompute, nothing to fall out of step. `hubSettings.bl32.test.ts`
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

import { asActorAttribution, type ActorAttribution } from '@lib/enforcement';
import {
  DEFAULT_SETTING_STATE,
  defaultOfKey,
  isAddressableSettingKey,
  sectionOfKey,
  settingRefusal,
  staleOverrideKey,
  valueIn,
  withSetting,
  type HubSettingKey,
  type HubSettingSection,
  type HubSettingState,
  type HubSettingValue,
  type NumericSettingKey,
} from './hubSettings';

/** One change to one value, as recorded. */
export interface HubSettingChange {
  readonly key: string;
  readonly value: HubSettingValue;
  /** The value in force just before — store-assigned. */
  readonly previous: HubSettingValue;
  readonly setBy: ActorAttribution;
  /** Store-assigned, never a payload field. */
  readonly setAt: string;
}

export interface HubSettingReadState {
  /** The changes in force, oldest first. */
  readonly changes: readonly HubSettingChange[];
  /** Stored rows refused on read, each with the reason. */
  readonly rejected: readonly { readonly row: string; readonly reason: string }[];
  /** The store exists but could not be parsed — DISTINCT from "no changes". */
  readonly unreadable: boolean;
}

/** The one key. Beside `paragon.workingCalendar`, same envelope discipline. */
export const HUB_SETTINGS_KEY = 'paragon.hubSettings';
const STORE_VERSION = 1;

let stored: HubSettingChange[] = [];
let state: HubSettingState = DEFAULT_SETTING_STATE;
let readStateCache: HubSettingReadState = { changes: [], rejected: [], unreadable: false };
let hydrated = false;
let version = 0;
const listeners = new Set<() => void>();

/** Replay rows over the defaults; a row the verb would refuse at that point is refused. */
function replay(rows: readonly unknown[]): {
  changes: HubSettingChange[];
  rejected: { row: string; reason: string }[];
  state: HubSettingState;
} {
  let s = DEFAULT_SETTING_STATE;
  const changes: HubSettingChange[] = [];
  const rejected: { row: string; reason: string }[] = [];
  for (const [i, row] of rows.entries()) {
    const r = row as Record<string, unknown> | null;
    if (!r || typeof r !== 'object' || typeof r.setAt !== 'string' || !isAddressableSettingKey(r.key)) {
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
    const value = r.value as HubSettingValue;
    const previous = valueIn(s, r.key) ?? null;
    changes.push({ key: r.key, value, previous, setBy, setAt: r.setAt });
    s = withSetting(s, r.key, value);
  }
  return { changes, rejected, state: s };
}

function readFromStorage(): { rows: readonly unknown[]; unreadable: boolean } {
  let raw: string | null = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { rows: [], unreadable: false };
    raw = window.localStorage.getItem(HUB_SETTINGS_KEY);
  } catch {
    return { rows: [], unreadable: false };
  }
  if (raw === null) return { rows: [], unreadable: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { rows: [], unreadable: true };
  }
  const env = parsed as { v?: unknown; changes?: unknown } | null;
  if (!env || typeof env !== 'object' || env.v !== STORE_VERSION || !Array.isArray(env.changes)) {
    return { rows: [], unreadable: true };
  }
  return { rows: env.changes as readonly unknown[], unreadable: false };
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  const read = readFromStorage();
  const replayed = replay(read.rows);
  stored = replayed.changes;
  state = replayed.state;
  readStateCache = { changes: stored, rejected: replayed.rejected, unreadable: read.unreadable };
}

function persist(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(HUB_SETTINGS_KEY, JSON.stringify({ v: STORE_VERSION, changes: stored }));
  } catch {
    // Quota / private browsing: the change stands for the session and is in the
    // audit trail; only its durability is lost.
  }
}

function changed(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export const hubSettingsStore = {
  /** The whole state in force: every fixed value and the override map. */
  state(): HubSettingState {
    hydrate();
    return state;
  },
  /** Every change in force, oldest first. */
  changes(): readonly HubSettingChange[] {
    hydrate();
    return stored;
  },
  /** The changes shown in one page section, oldest first. */
  changesIn(section: HubSettingSection): readonly HubSettingChange[] {
    return hubSettingsStore.changes().filter((c) => sectionOfKey(c.key) === section);
  },
  /** What the last read found, including refused rows and an unreadable store. */
  readState(): HubSettingReadState {
    hydrate();
    return readStateCache;
  },
  /**
   * APPEND ONLY — called by the `t_setting_set` target and nothing else.
   * Returns false (and records nothing) for a change the rule refuses, so the
   * store can never hold a state the verb would not have produced.
   */
  append(change: { key: string; value: HubSettingValue; setBy: ActorAttribution; setAt: string }): boolean {
    hydrate();
    if (settingRefusal(change.key, change.value, state) !== null) return false;
    const previous = valueIn(state, change.key) ?? null;
    const row: HubSettingChange = { ...change, previous };
    stored = [...stored, row];
    state = withSetting(state, change.key, change.value);
    readStateCache = { ...readStateCache, changes: stored };
    persist();
    changed();
    return true;
  },
  /** Back to the defaults, in memory AND on disk — test isolation. */
  reset(): void {
    stored = [];
    state = DEFAULT_SETTING_STATE;
    readStateCache = { changes: [], rejected: [], unreadable: false };
    hydrated = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(HUB_SETTINGS_KEY);
    } catch {
      // in-memory state is already clear
    }
    changed();
  },
  /** Drop the in-memory copy WITHOUT touching storage — what a reload does. */
  rehydrate(): void {
    stored = [];
    hydrated = false;
    hydrate();
    changed();
  },
  /** A number that changes whenever a value in force does. */
  version(): number {
    return version;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// ── The readers' entrance ────────────────────────────────────────────────────

/** THE value of a numeric setting in force, read at the moment of the call. */
export function hubSetting(key: NumericSettingKey): number {
  return hubSettingsStore.state().values[key] as number;
}

/** THE value of a yes/no setting in force. */
export function hubSettingFlag(key: Extract<HubSettingKey, 'gate.noHistoryPasses'>): boolean {
  return hubSettingsStore.state().values[key] as boolean;
}

/** The value of any addressable key in force (an override with none: null). */
export function settingValue(key: string): HubSettingValue | undefined {
  return valueIn(hubSettingsStore.state(), key);
}

/** Is this key at its default? */
export const isAtDefault = (key: string): boolean => settingValue(key) === defaultOfKey(key);

/** BL-32 — the administrator's stale period (days) for one supplier × material, or null when none. */
export function staleOverrideFor(supplierId: string, materialCode: string): number | null {
  return hubSettingsStore.state().staleOverrides[staleOverrideKey(supplierId, materialCode)] ?? null;
}

/** REQ-E08-01 — the stale period (days) for one supplier × material, in force now. */
export function stalePeriodFor(supplierId: string, materialCode: string): number {
  const s = hubSettingsStore.state();
  return s.staleOverrides[staleOverrideKey(supplierId, materialCode)] ?? (s.values['stale.defaultDays'] as number);
}
