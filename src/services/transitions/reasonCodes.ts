// ─────────────────────────────────────────────────────────────────────────────
// REASON CODES — BL-32 (§3.6 starter lists, REQ-E08-05 BR-03, ADM "configures
// reason codes", §2).
//
// ── THE POPULATION, DERIVED ─────────────────────────────────────────────────
// Four coded reason lists exist in the tree; each was a module constant a rule
// checked a stored code against:
//   · poAdjust            — `PO_REASON_CODES` (policies.ts): why a supplier
//                           adjusts a PO line (REQ-E07-02, §3.6 starter list);
//   · poReject            — `PO_REJECTION_CAUSES` (policies.ts): what a PO
//                           rejection is about (REQ-E07-02 BR-06);
//   · capacityShortfall   — `CAPACITY_REASONS` (inventoryConfig.ts): allocation
//                           below demand (REQ-E08-04, §3.6);
//   · commitmentShortfall — `COMMITMENT_REASONS` (forecastConfig.ts): a
//                           commitment below forecast (REQ-E06-02, §3.6).
// A fifth list was added new, not replaced (SC Hub Material, MAT A3):
//   · alertClose          — why a planner closes an alert (MR-9 BR-04, BR-05).
//                           "Other" needs a note. Read by the alert close
//                           verb (`alertCloseRefusal`, MAT F1).
// A sixth, new (REQ-E14-11 X-06 / BR-03, BL-114):
//   · forecastOverride    — why a Material Planning team member overrides the
//                           demand forecast. Required on an upward override;
//                           "Other" needs a note. Read by the override verb
//                           (`overrideRefusal`), and FVA reports by it (BR-02).
// ⚠️ Call-off reject / change reasons and goods-receipt dispute reasons are FREE
// TEXT in this build (`reason`, `comment` fields), not coded lists — there is
// no list for an administrator to maintain, so none is invented here.
//
// ── ADD, RENAME, RETIRE — NEVER DELETE ──────────────────────────────────────
// The administrator adds a code, renames one (EN and ID), or retires one. A
// retired code is no longer offered and a verb refuses it on a NEW answer, but
// it stays in the list, so every record that already carries it still reads
// with its label (marked retired). There is no delete: a record's code would
// otherwise point at nothing. One verb, `t_reasoncode_set`, writes every change.
//
// ⚠️ **THE RULES READ THE LIST IN FORCE, AT EVALUATION TIME.** `isActiveReasonCode`
// is what every verb and parser calls; nothing copies the list into a constant.
// Persistence follows the working calendar: localStorage, re-validated on read
// in order, refusals named, unparseable distinguished from empty.
// ─────────────────────────────────────────────────────────────────────────────

import { asActorAttribution, type ActorAttribution } from '../../lib/enforcement';
import { orderCollaborationEn, orderCollaborationId } from '../../lib/i18n/orderCollaboration';
import { inventoryCapacityEn, inventoryCapacityId } from '../../lib/i18n/inventoryCapacity';
import { forecastCollaborationEn, forecastCollaborationId } from '../../lib/i18n/forecastCollaboration';
import { forecastBiasEn, forecastBiasId } from '../../lib/i18n/forecastBias';

export const REASON_LISTS = ['poAdjust', 'poReject', 'capacityShortfall', 'commitmentShortfall', 'alertClose', 'forecastOverride'] as const;
export type ReasonListId = (typeof REASON_LISTS)[number];

export const isReasonList = (v: unknown): v is ReasonListId =>
  typeof v === 'string' && (REASON_LISTS as readonly string[]).includes(v);

/**
 * The starter lists as shipped (§3.6 [Code]; REQ-E07-02 BR-06). A built-in
 * code's label is its i18n key (EN and ID already written) until the
 * administrator renames it.
 */
export const STARTER_REASON_CODES: Readonly<Record<ReasonListId, readonly string[]>> = Object.freeze({
  poAdjust: Object.freeze(['capacity', 'material', 'logistics', 'quality', 'other']),
  poReject: Object.freeze(['date', 'quantity', 'quality']),
  capacityShortfall: Object.freeze(['capacity', 'material', 'logistics', 'quality', 'other']),
  commitmentShortfall: Object.freeze(['capacity', 'material', 'logistics', 'quality', 'other']),
  // MR-9 BR-05 — the starter list for closing an alert.
  alertClose: Object.freeze([
    'calloff-raised',
    'po-raised',
    'supplier-updated',
    'supplier-confirmed-other',
    'data-error',
    'risk-accepted',
    'other',
  ]),
  // REQ-E14-11 X-06 — the starter list for a forecast override (ENG-B104).
  forecastOverride: Object.freeze([
    'promotion',
    'customer-order',
    'listing-gain',
    'listing-loss',
    'market-info',
    'data-correction',
    'other',
  ]),
});

/** The i18n key prefix a built-in code's label lives under, per list. */
export const BUILT_IN_LABEL_PREFIX: Readonly<Record<ReasonListId, string>> = Object.freeze({
  poAdjust: 'oc.reason.',
  poReject: 'oc.cause.',
  capacityShortfall: 'inv.capacity.reason.',
  commitmentShortfall: 'fc.reason.',
  alertClose: 'inv.alerts.closeReason.',
  forecastOverride: 'fb.reason.',
});

/**
 * BL-156 (FU-6) — the key prefix of a built-in code's RECORD name, where it
 * differs from its form label. The form offers "Other (note required)"; a
 * closed record, a filter over records and a count read the reason's name
 * only ("Other"). A code with no record key reads its form label everywhere.
 */
export const BUILT_IN_RECORD_LABEL_PREFIX: Readonly<Partial<Record<ReasonListId, string>>> = Object.freeze({
  alertClose: 'inv.alerts.closeReasonName.',
});

/** The code that needs a note with it, on the lists that have one. */
export const NOTE_REQUIRED_CODE = 'other';

/** A code's shape — also what makes it addressable by the verb. */
export const REASON_CODE = /^[a-z][a-z0-9-]{1,39}$/;

/** One code as the lists show it. */
export interface ReasonCodeEntry {
  readonly list: ReasonListId;
  readonly code: string;
  readonly builtIn: boolean;
  /** The administrator's labels; absent on a built-in code nobody renamed. */
  readonly labelEn?: string;
  readonly labelId?: string;
  readonly active: boolean;
}

/** One change, as recorded. */
export interface ReasonCodeChange {
  readonly list: ReasonListId;
  readonly code: string;
  readonly labelEn: string;
  readonly labelId: string;
  readonly active: boolean;
  /** What the code was before — store-assigned; null when this change added it. */
  readonly previous: { readonly labelEn?: string; readonly labelId?: string; readonly active: boolean } | null;
  readonly setBy: ActorAttribution;
  /** Store-assigned, never a payload field. */
  readonly setAt: string;
}

// ── The state: starter lists with the changes applied ────────────────────────

type ListState = Readonly<Record<ReasonListId, readonly ReasonCodeEntry[]>>;

const STARTER_STATE: ListState = Object.freeze(
  Object.fromEntries(
    REASON_LISTS.map((list) => [
      list,
      STARTER_REASON_CODES[list].map((code) => ({ list, code, builtIn: true, active: true })),
    ]),
  ) as Record<ReasonListId, ReasonCodeEntry[]>,
);

function applyChange(state: ListState, c: Pick<ReasonCodeChange, 'list' | 'code' | 'labelEn' | 'labelId' | 'active'>): ListState {
  const rows = state[c.list];
  const existing = rows.find((r) => r.code === c.code);
  const next: ReasonCodeEntry = {
    list: c.list,
    code: c.code,
    builtIn: existing?.builtIn ?? false,
    labelEn: c.labelEn,
    labelId: c.labelId,
    active: c.active,
  };
  const list = existing ? rows.map((r) => (r.code === c.code ? next : r)) : [...rows, next];
  return { ...state, [c.list]: list };
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Why a change to one code is refused, or null. The ONE predicate: the verb's
 * policy calls it, and the store calls it again on every row it reads back.
 * `builtInLabels` are the shipped labels of the built-in codes (EN and ID), so
 * a new code cannot take a name an existing one already shows.
 */
export function reasonCodeRefusal(
  list: unknown,
  code: unknown,
  labelEn: unknown,
  labelId: unknown,
  active: unknown,
  state: ListState,
  builtInLabels: (list: ReasonListId, code: string) => { en: string; id: string } | null = () => null,
): string | null {
  if (!isReasonList(list)) return `'${String(list)}' is not a reason list (${REASON_LISTS.join(', ')})`;
  if (typeof code !== 'string' || !REASON_CODE.test(code)) {
    return `reason code must be 2–40 lower-case letters, digits or hyphens, starting with a letter; got ${JSON.stringify(code)}`;
  }
  if (typeof labelEn !== 'string' || labelEn.trim().length < 2) return `the English label for ${code} is empty`;
  if (typeof labelId !== 'string' || labelId.trim().length < 2) return `the Indonesian label for ${code} is empty`;
  if (typeof active !== 'boolean') return 'active must be true or false';
  const rows = state[list];
  const others = rows.filter((r) => r.code !== code);
  const shown = (r: ReasonCodeEntry) => {
    const b = r.labelEn === undefined ? builtInLabels(list, r.code) : null;
    return { en: r.labelEn ?? b?.en ?? r.code, id: r.labelId ?? b?.id ?? r.code };
  };
  const clashEn = others.find((r) => norm(shown(r).en) === norm(labelEn));
  if (clashEn) return `another code in ${list} is already labelled "${shown(clashEn).en}" (${clashEn.code})`;
  const clashId = others.find((r) => norm(shown(r).id) === norm(labelId));
  if (clashId) return `another code in ${list} is already labelled "${shown(clashId).id}" in Indonesian (${clashId.code})`;
  if (!active && others.filter((r) => r.active).length === 0) {
    return `${code} is the last code offered in ${list}; retiring it would leave nothing to choose`;
  }
  return null;
}

// ── The store ────────────────────────────────────────────────────────────────

export const REASON_CODES_KEY = 'paragon.reasonCodes';
const STORE_VERSION = 1;

export interface ReasonCodeReadState {
  readonly changes: readonly ReasonCodeChange[];
  readonly rejected: readonly { readonly row: string; readonly reason: string }[];
  readonly unreadable: boolean;
}

let stored: ReasonCodeChange[] = [];
let state: ListState = STARTER_STATE;
let readStateCache: ReasonCodeReadState = { changes: [], rejected: [], unreadable: false };
let hydrated = false;
let version = 0;
const listeners = new Set<() => void>();

const EN: Record<string, string> = { ...orderCollaborationEn, ...inventoryCapacityEn, ...forecastCollaborationEn, ...forecastBiasEn };
const ID: Record<string, string> = { ...orderCollaborationId, ...inventoryCapacityId, ...forecastCollaborationId, ...forecastBiasId };

/**
 * A built-in code's SHIPPED labels, EN and ID, read from the i18n fragments
 * (plain data) — so a new code cannot take a name a starter code already shows,
 * and the admin page can show "renamed from". Null for a code with no key.
 */
export function builtInReasonLabels(list: ReasonListId, code: string): { en: string; id: string } | null {
  const key = `${BUILT_IN_LABEL_PREFIX[list]}${code}`;
  return EN[key] !== undefined && ID[key] !== undefined ? { en: EN[key], id: ID[key] } : null;
}
const builtInLabelsFn = builtInReasonLabels;

const previousOf = (s: ListState, list: ReasonListId, code: string): ReasonCodeChange['previous'] => {
  const e = s[list].find((r) => r.code === code);
  return e ? { ...(e.labelEn !== undefined ? { labelEn: e.labelEn, labelId: e.labelId } : {}), active: e.active } : null;
};

function readFromStorage(): { rows: readonly unknown[]; unreadable: boolean } {
  let raw: string | null = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { rows: [], unreadable: false };
    raw = window.localStorage.getItem(REASON_CODES_KEY);
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
  let s = STARTER_STATE;
  const changes: ReasonCodeChange[] = [];
  const rejected: { row: string; reason: string }[] = [];
  for (const [i, row] of read.rows.entries()) {
    const r = row as Record<string, unknown> | null;
    if (!r || typeof r !== 'object' || typeof r.setAt !== 'string') {
      rejected.push({ row: `row ${i}`, reason: 'not a reason code change' });
      continue;
    }
    const refusal = reasonCodeRefusal(r.list, r.code, r.labelEn, r.labelId, r.active, s, builtInLabelsFn);
    const label = `${String(r.list)}:${String(r.code)}`;
    if (refusal) {
      rejected.push({ row: label, reason: refusal });
      continue;
    }
    const setBy = asActorAttribution(r.setBy);
    if (!setBy) {
      rejected.push({ row: label, reason: 'setBy is not a recorded attribution' });
      continue;
    }
    const c: ReasonCodeChange = {
      list: r.list as ReasonListId,
      code: r.code as string,
      labelEn: (r.labelEn as string).trim(),
      labelId: (r.labelId as string).trim(),
      active: r.active as boolean,
      previous: previousOf(s, r.list as ReasonListId, r.code as string),
      setBy,
      setAt: r.setAt,
    };
    changes.push(c);
    s = applyChange(s, c);
  }
  stored = changes;
  state = s;
  readStateCache = { changes, rejected, unreadable: read.unreadable };
}

function persist(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(REASON_CODES_KEY, JSON.stringify({ v: STORE_VERSION, changes: stored }));
  } catch {
    // The change stands for the session and is in the audit trail.
  }
}

function changed(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export const reasonCodeStore = {
  /** Every code of a list, active and retired, in order (starters first). */
  list(list: ReasonListId): readonly ReasonCodeEntry[] {
    hydrate();
    return state[list];
  },
  get(list: ReasonListId, code: string): ReasonCodeEntry | undefined {
    return reasonCodeStore.list(list).find((r) => r.code === code);
  },
  changes(): readonly ReasonCodeChange[] {
    hydrate();
    return stored;
  },
  readState(): ReasonCodeReadState {
    hydrate();
    return readStateCache;
  },
  /** Why a change would be refused now (the policy's predicate, against the state in force). */
  refusal(list: unknown, code: unknown, labelEn: unknown, labelId: unknown, active: unknown): string | null {
    hydrate();
    return reasonCodeRefusal(list, code, labelEn, labelId, active, state, builtInLabelsFn);
  },
  /** APPEND ONLY — called by the `t_reasoncode_set` target and nothing else. */
  append(change: Omit<ReasonCodeChange, 'previous'>): boolean {
    hydrate();
    if (reasonCodeStore.refusal(change.list, change.code, change.labelEn, change.labelId, change.active) !== null) return false;
    const row: ReasonCodeChange = {
      ...change,
      labelEn: change.labelEn.trim(),
      labelId: change.labelId.trim(),
      previous: previousOf(state, change.list, change.code),
    };
    stored = [...stored, row];
    state = applyChange(state, row);
    readStateCache = { ...readStateCache, changes: stored };
    persist();
    changed();
    return true;
  },
  reset(): void {
    stored = [];
    state = STARTER_STATE;
    readStateCache = { changes: [], rejected: [], unreadable: false };
    hydrated = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.removeItem(REASON_CODES_KEY);
    } catch {
      // in-memory state is already clear
    }
    changed();
  },
  rehydrate(): void {
    stored = [];
    hydrated = false;
    hydrate();
    changed();
  },
  version(): number {
    return version;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// ── The readers' entrance ────────────────────────────────────────────────────

/** The codes offered on a NEW answer, in order — read at the moment of the call. */
export function activeReasonCodes(list: ReasonListId): string[] {
  return reasonCodeStore
    .list(list)
    .filter((r) => r.active)
    .map((r) => r.code);
}

/** May a NEW answer carry this code? Retired and unknown codes: no. */
export function isActiveReasonCode(list: ReasonListId, code: unknown): code is string {
  return typeof code === 'string' && reasonCodeStore.get(list, code)?.active === true;
}

/** The verb's entity id for one code: `<list>:<code>`. */
export const reasonCodeEntityId = (list: ReasonListId, code: string): string => `${list}:${code}`;

/** The list and code an entity id names, or null. */
export function parseReasonCodeEntityId(id: unknown): { list: ReasonListId; code: string } | null {
  if (typeof id !== 'string') return null;
  const i = id.indexOf(':');
  if (i < 0) return null;
  const list = id.slice(0, i);
  const code = id.slice(i + 1);
  return isReasonList(list) && REASON_CODE.test(code) ? { list, code } : null;
}

/** A new code from its English label: a slug. */
export function reasonCodeFor(labelEn: string): string {
  const slug = labelEn
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return /^[a-z]/.test(slug) && slug.length >= 2 ? slug : `code-${slug || 'new'}`.slice(0, 40);
}
