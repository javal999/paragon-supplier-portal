// ─────────────────────────────────────────────────────────────────────────────
// REASON CODES — BL-32 (§3.6 starter lists, REQ-E08-05 BR-03, ADM "configures
// reason codes", §2).
//
// ── THE POPULATION, DERIVED ─────────────────────────────────────────────────
// Four coded reason lists exist in the tree; each was a module constant a rule
// checked a stored code against:
//   · poAdjust            — `PO_REASON_CODES` (policies.js): why a supplier
//                           adjusts a PO line (REQ-E07-02, §3.6 starter list);
//   · poReject            — `PO_REJECTION_CAUSES` (policies.js): what a PO
//                           rejection is about (REQ-E07-02 BR-06);
//   · capacityShortfall   — `CAPACITY_REASONS` (inventoryConfig.js): allocation
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

/** @import { ActorAttribution } from '@lib/enforcement' */
import { asActorAttribution } from '@lib/enforcement';
import { orderCollaborationEn, orderCollaborationId } from '@lib/i18n/orderCollaboration';
import { inventoryCapacityEn, inventoryCapacityId } from '@lib/i18n/inventoryCapacity';
import { forecastCollaborationEn, forecastCollaborationId } from '@lib/i18n/forecastCollaboration';
import { forecastBiasEn, forecastBiasId } from '@lib/i18n/forecastBias';

export const REASON_LISTS = /** @type {const} */ ([
  'poAdjust',
  'poReject',
  'capacityShortfall',
  'commitmentShortfall',
  'alertClose',
  'forecastOverride'
]);
/** @typedef {(typeof REASON_LISTS)[number]} ReasonListId */

/**
 * @param {unknown} v
 * @returns {v is ReasonListId}
 */
export const isReasonList = (v) =>
  typeof v === 'string' && /** @type {readonly string[]} */ (REASON_LISTS).includes(v);

/**
 * The starter lists as shipped (§3.6 [Code]; REQ-E07-02 BR-06). A built-in
 * code's label is its i18n key (EN and ID already written) until the
 * administrator renames it.
 * @type {Readonly<Record<ReasonListId, readonly string[]>>}
 */
export const STARTER_REASON_CODES = Object.freeze({
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
    'other'
  ]),
  // REQ-E14-11 X-06 — the starter list for a forecast override (ENG-B104).
  forecastOverride: Object.freeze([
    'promotion',
    'customer-order',
    'listing-gain',
    'listing-loss',
    'market-info',
    'data-correction',
    'other'
  ])
});

/**
 * The i18n key prefix a built-in code's label lives under, per list.
 * @type {Readonly<Record<ReasonListId, string>>}
 */
export const BUILT_IN_LABEL_PREFIX = Object.freeze({
  poAdjust: 'oc.reason.',
  poReject: 'oc.cause.',
  capacityShortfall: 'inv.capacity.reason.',
  commitmentShortfall: 'fc.reason.',
  alertClose: 'inv.alerts.closeReason.',
  forecastOverride: 'fb.reason.'
});

/**
 * BL-156 (FU-6) — the key prefix of a built-in code's RECORD name, where it
 * differs from its form label. The form offers "Other (note required)"; a
 * closed record, a filter over records and a count read the reason's name
 * only ("Other"). A code with no record key reads its form label everywhere.
 * @type {Readonly<Partial<Record<ReasonListId, string>>>}
 */
export const BUILT_IN_RECORD_LABEL_PREFIX = Object.freeze({
  alertClose: 'inv.alerts.closeReasonName.'
});

/** The code that needs a note with it, on the lists that have one. */
export const NOTE_REQUIRED_CODE = 'other';

/** A code's shape — also what makes it addressable by the verb. */
export const REASON_CODE = /^[a-z][a-z0-9-]{1,39}$/;

/** One code as the lists show it. */
/**
 * `labelEn`:  The administrator's labels; absent on a built-in code nobody renamed.
 *
 * @typedef {{
 *   readonly list: ReasonListId;
 *   readonly code: string;
 *   readonly builtIn: boolean;
 *   readonly labelEn?: string;
 *   readonly labelId?: string;
 *   readonly active: boolean;
 * }} ReasonCodeEntry
 */

/** One change, as recorded. */
/**
 * `previous`:  What the code was before — store-assigned; null when this change added it.
 * `setAt`:  Store-assigned, never a payload field.
 *
 * @typedef {{
 *   readonly list: ReasonListId;
 *   readonly code: string;
 *   readonly labelEn: string;
 *   readonly labelId: string;
 *   readonly active: boolean;
 *   readonly previous: { readonly labelEn?: string; readonly labelId?: string; readonly active: boolean } | null;
 *   readonly setBy: ActorAttribution;
 *   readonly setAt: string;
 * }} ReasonCodeChange
 */

// ── The state: starter lists with the changes applied ────────────────────────

/** @typedef {Readonly<Record<ReasonListId, readonly ReasonCodeEntry[]>>} ListState */

/** @type {ListState} */
const STARTER_STATE = Object.freeze(
  /** @type {Record<ReasonListId, ReasonCodeEntry[]>} */ (
    Object.fromEntries(
      REASON_LISTS.map((list) => [
        list,
        STARTER_REASON_CODES[list].map((code) => ({ list, code, builtIn: true, active: true }))
      ])
    )
  )
);

/**
 * @param {ListState} state
 * @param {Pick<ReasonCodeChange, 'list' | 'code' | 'labelEn' | 'labelId' | 'active'>} c
 * @returns {ListState}
 */
function applyChange(state, c) {
  const rows = state[c.list];
  const existing = rows.find((r) => r.code === c.code);
  /** @type {ReasonCodeEntry} */
  const next = {
    list: c.list,
    code: c.code,
    builtIn: existing?.builtIn ?? false,
    labelEn: c.labelEn,
    labelId: c.labelId,
    active: c.active
  };
  const list = existing ? rows.map((r) => (r.code === c.code ? next : r)) : [...rows, next];
  return { ...state, [c.list]: list };
}

/** @param {string} s */
const norm = (s) => s.trim().toLowerCase();

/**
 * Why a change to one code is refused, or null. The ONE predicate: the verb's
 * policy calls it, and the store calls it again on every row it reads back.
 * `builtInLabels` are the shipped labels of the built-in codes (EN and ID), so
 * a new code cannot take a name an existing one already shows.
 * @param {unknown} list
 * @param {unknown} code
 * @param {unknown} labelEn
 * @param {unknown} labelId
 * @param {unknown} active
 * @param {ListState} state
 * @param {(list: ReasonListId, code: string) => { en: string; id: string } | null} [builtInLabels]
 * @returns {string | null}
 */
export function reasonCodeRefusal(
  list,
  code,
  labelEn,
  labelId,
  active,
  state,
  builtInLabels = () => null
) {
  if (!isReasonList(list))
    return `'${String(list)}' is not a reason list (${REASON_LISTS.join(', ')})`;
  if (typeof code !== 'string' || !REASON_CODE.test(code)) {
    return `reason code must be 2–40 lower-case letters, digits or hyphens, starting with a letter; got ${JSON.stringify(code)}`;
  }
  if (typeof labelEn !== 'string' || labelEn.trim().length < 2)
    return `the English label for ${code} is empty`;
  if (typeof labelId !== 'string' || labelId.trim().length < 2)
    return `the Indonesian label for ${code} is empty`;
  if (typeof active !== 'boolean') return 'active must be true or false';
  const rows = state[list];
  const others = rows.filter((r) => r.code !== code);
  /** @param {ReasonCodeEntry} r */
  const shown = (r) => {
    const b = r.labelEn === undefined ? builtInLabels(list, r.code) : null;
    return { en: r.labelEn ?? b?.en ?? r.code, id: r.labelId ?? b?.id ?? r.code };
  };
  const clashEn = others.find((r) => norm(shown(r).en) === norm(labelEn));
  if (clashEn)
    return `another code in ${list} is already labelled "${shown(clashEn).en}" (${clashEn.code})`;
  const clashId = others.find((r) => norm(shown(r).id) === norm(labelId));
  if (clashId)
    return `another code in ${list} is already labelled "${shown(clashId).id}" in Indonesian (${clashId.code})`;
  if (!active && others.filter((r) => r.active).length === 0) {
    return `${code} is the last code offered in ${list}; retiring it would leave nothing to choose`;
  }
  return null;
}

// ── The store ────────────────────────────────────────────────────────────────

export const REASON_CODES_KEY = 'paragon.reasonCodes';
const STORE_VERSION = 1;

/**
 * @typedef {{
 *   readonly changes: readonly ReasonCodeChange[];
 *   readonly rejected: readonly { readonly row: string; readonly reason: string }[];
 *   readonly unreadable: boolean;
 * }} ReasonCodeReadState
 */

/** @type {ReasonCodeChange[]} */
let stored = [];
/** @type {ListState} */
let state = STARTER_STATE;
/** @type {ReasonCodeReadState} */
let readStateCache = { changes: [], rejected: [], unreadable: false };
let hydrated = false;
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/** @type {Record<string, string>} */
const EN = {
  ...orderCollaborationEn,
  ...inventoryCapacityEn,
  ...forecastCollaborationEn,
  ...forecastBiasEn
};
/** @type {Record<string, string>} */
const ID = {
  ...orderCollaborationId,
  ...inventoryCapacityId,
  ...forecastCollaborationId,
  ...forecastBiasId
};

/**
 * A built-in code's SHIPPED labels, EN and ID, read from the i18n fragments
 * (plain data) — so a new code cannot take a name a starter code already shows,
 * and the admin page can show "renamed from". Null for a code with no key.
 * @param {ReasonListId} list
 * @param {string} code
 * @returns {{ en: string; id: string } | null}
 */
export function builtInReasonLabels(list, code) {
  const key = `${BUILT_IN_LABEL_PREFIX[list]}${code}`;
  return EN[key] !== undefined && ID[key] !== undefined ? { en: EN[key], id: ID[key] } : null;
}
const builtInLabelsFn = builtInReasonLabels;

/**
 * @param {ListState} s
 * @param {ReasonListId} list
 * @param {string} code
 * @returns {ReasonCodeChange['previous']}
 */
const previousOf = (s, list, code) => {
  const e = s[list].find((r) => r.code === code);
  return e
    ? {
        ...(e.labelEn !== undefined ? { labelEn: e.labelEn, labelId: e.labelId } : {}),
        active: e.active
      }
    : null;
};

/** @returns {{ rows: readonly unknown[]; unreadable: boolean }} */
function readFromStorage() {
  /** @type {string | null} */
  let raw = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage)
      return { rows: [], unreadable: false };
    raw = window.localStorage.getItem(REASON_CODES_KEY);
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
  let s = STARTER_STATE;
  /** @type {ReasonCodeChange[]} */
  const changes = [];
  /** @type {{ row: string; reason: string }[]} */
  const rejected = [];
  for (const [i, row] of read.rows.entries()) {
    const r = /** @type {Record<string, unknown> | null} */ (row);
    if (!r || typeof r !== 'object' || typeof r.setAt !== 'string') {
      rejected.push({ row: `row ${i}`, reason: 'not a reason code change' });
      continue;
    }
    const refusal = reasonCodeRefusal(
      r.list,
      r.code,
      r.labelEn,
      r.labelId,
      r.active,
      s,
      builtInLabelsFn
    );
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
    /** @type {ReasonCodeChange} */
    const c = {
      list: /** @type {ReasonListId} */ (r.list),
      code: /** @type {string} */ (r.code),
      labelEn: /** @type {string} */ (r.labelEn).trim(),
      labelId: /** @type {string} */ (r.labelId).trim(),
      active: /** @type {boolean} */ (r.active),
      previous: previousOf(s, /** @type {ReasonListId} */ (r.list), /** @type {string} */ (r.code)),
      setBy,
      setAt: r.setAt
    };
    changes.push(c);
    s = applyChange(s, c);
  }
  stored = changes;
  state = s;
  readStateCache = { changes, rejected, unreadable: read.unreadable };
}

/** @returns {void} */
function persist() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      REASON_CODES_KEY,
      JSON.stringify({ v: STORE_VERSION, changes: stored })
    );
  } catch {
    // The change stands for the session and is in the audit trail.
  }
}

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const reasonCodeStore = {
  /**
   * Every code of a list, active and retired, in order (starters first).
   * @param {ReasonListId} list
   * @returns {readonly ReasonCodeEntry[]}
   */
  list(list) {
    hydrate();
    return state[list];
  },
  /**
   * @param {ReasonListId} list
   * @param {string} code
   * @returns {ReasonCodeEntry | undefined}
   */
  get(list, code) {
    return reasonCodeStore.list(list).find((r) => r.code === code);
  },
  /** @returns {readonly ReasonCodeChange[]} */
  changes() {
    hydrate();
    return stored;
  },
  /** @returns {ReasonCodeReadState} */
  readState() {
    hydrate();
    return readStateCache;
  },
  /**
   * Why a change would be refused now (the policy's predicate, against the state in force).
   * @param {unknown} list
   * @param {unknown} code
   * @param {unknown} labelEn
   * @param {unknown} labelId
   * @param {unknown} active
   * @returns {string | null}
   */
  refusal(list, code, labelEn, labelId, active) {
    hydrate();
    return reasonCodeRefusal(list, code, labelEn, labelId, active, state, builtInLabelsFn);
  },
  /**
   * APPEND ONLY — called by the `t_reasoncode_set` target and nothing else.
   * @param {Omit<ReasonCodeChange, 'previous'>} change
   * @returns {boolean}
   */
  append(change) {
    hydrate();
    if (
      reasonCodeStore.refusal(
        change.list,
        change.code,
        change.labelEn,
        change.labelId,
        change.active
      ) !== null
    )
      return false;
    /** @type {ReasonCodeChange} */
    const row = {
      ...change,
      labelEn: change.labelEn.trim(),
      labelId: change.labelId.trim(),
      previous: previousOf(state, change.list, change.code)
    };
    stored = [...stored, row];
    state = applyChange(state, row);
    readStateCache = { ...readStateCache, changes: stored };
    persist();
    changed();
    return true;
  },
  /** @returns {void} */
  reset() {
    stored = [];
    state = STARTER_STATE;
    readStateCache = { changes: [], rejected: [], unreadable: false };
    hydrated = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage)
        window.localStorage.removeItem(REASON_CODES_KEY);
    } catch {
      // in-memory state is already clear
    }
    changed();
  },
  /** @returns {void} */
  rehydrate() {
    stored = [];
    hydrated = false;
    hydrate();
    changed();
  },
  /** @returns {number} */
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
 * The codes offered on a NEW answer, in order — read at the moment of the call.
 * @param {ReasonListId} list
 * @returns {string[]}
 */
export function activeReasonCodes(list) {
  return reasonCodeStore
    .list(list)
    .filter((r) => r.active)
    .map((r) => r.code);
}

/**
 * May a NEW answer carry this code? Retired and unknown codes: no.
 * @param {ReasonListId} list
 * @param {unknown} code
 * @returns {code is string}
 */
export function isActiveReasonCode(list, code) {
  return typeof code === 'string' && reasonCodeStore.get(list, code)?.active === true;
}

/**
 * The verb's entity id for one code: `<list>:<code>`.
 * @param {ReasonListId} list
 * @param {string} code
 * @returns {string}
 */
export const reasonCodeEntityId = (list, code) => `${list}:${code}`;

/**
 * The list and code an entity id names, or null.
 * @param {unknown} id
 * @returns {{ list: ReasonListId; code: string } | null}
 */
export function parseReasonCodeEntityId(id) {
  if (typeof id !== 'string') return null;
  const i = id.indexOf(':');
  if (i < 0) return null;
  const list = id.slice(0, i);
  const code = id.slice(i + 1);
  return isReasonList(list) && REASON_CODE.test(code) ? { list, code } : null;
}

/**
 * A new code from its English label: a slug.
 * @param {string} labelEn
 * @returns {string}
 */
export function reasonCodeFor(labelEn) {
  const slug = labelEn
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return /^[a-z]/.test(slug) && slug.length >= 2 ? slug : `code-${slug || 'new'}`.slice(0, 40);
}
