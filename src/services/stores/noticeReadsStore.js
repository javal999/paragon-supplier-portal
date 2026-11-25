// ────────────────────────────────────────────────────────────────────────────
// NOTICE READS — WHICH IN-HUB NOTICES A SEAT HAS OPENED (BL-213).
//
// The supplier bell used to count every award and withdrawal notice it had
// ever shown, because nothing was stored: the notices are DERIVED at read from
// the supplier's own award reads, so "one notice" and "one unread notice" were
// the same number. This store keeps the second fact only.
//
// ── THE FOUR THINGS THAT MUST BE TRUE, AND WHERE EACH ONE LIVES ─────────────
//
// 1. **THE KEY IS THE SEAT, NOT THE PERSONA.** A supplier's reads are keyed
//    `supplier:<supplierId>`; the buyer/PTI seat is keyed `buyer`. Two supplier
//    seats in one browser never clear each other's badge. The identity is a
//    tenancy view (see `CurrentIdentityContext`), so `personaType` alone would
//    put every supplier in one bucket.
//
// 2. **A NOTICE'S ID IS DERIVED FROM WHAT IT IS, NEVER FROM ITS POSITION.**
//    The caller passes the notice's own id (for an award notice,
//    `eventType:eventId:kind`). The store never sees an index, so re-sorting
//    the bell, a refetch or a reload cannot turn a read notice back into an
//    unread one.
//
// 3. **THE READ FAILS HONESTLY.** Absent, corrupt and unparseable are different
//    facts, as in `transitions/customRoles.js`: no key is `absent`; a key that
//    cannot be parsed, or whose envelope is not this store's shape, is
//    `unreadable`; a parseable envelope reports `ok`. `unreadable` yields no
//    ids — the same empty badge as `absent` — but a surface can TELL them
//    apart instead of hiding a broken store behind "everything unread". An
//    inaccessible store (private browsing) is treated as `absent`, because an
//    inaccessible store is not a corrupt one.
//
// 4. **A CORRUPT STORE NEVER CRASHES THE SHELL.** Every read and write catches:
//    a garbage value is reported, not thrown, and the next `markRead` rewrites
//    a clean envelope over it. Persistence is a durability promise, not a gate
//    on opening a panel.
// ────────────────────────────────────────────────────────────────────────────

/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */

/** The one localStorage key. Exported so tests clear exactly this. */
export const NOTICE_READS_STORAGE_KEY = 'paragon.noticeReads';

const STORE_VERSION = 1;

/**
 * Why a seat's read came back empty. `absent` and `unreadable` look the same
 * on the surface (no ids) but are different facts.
 * `absent`:  No store, or storage unavailable. Nothing was ever written here.
 * `ok`:  The envelope parsed; this seat simply has no read ids yet.
 * `unreadable`:  The store exists but is corrupt or not this store's shape.
 *
 * @typedef {'absent' | 'ok' | 'unreadable'} NoticeReadsStatus
 */

/**
 * @typedef {object} SeatReadState
 * @property {ReadonlySet<string>} ids -  The notice ids this seat has opened.
 * @property {NoticeReadsStatus} status
 */

/** @type {SeatReadState} */
const ABSENT = Object.freeze({
  ids: /** @type {ReadonlySet<string>} */ (new Set()),
  status: 'absent'
});
/** @type {SeatReadState} */
const UNREADABLE = Object.freeze({
  ids: /** @type {ReadonlySet<string>} */ (new Set()),
  status: 'unreadable'
});

/**
 * The seat's storage key. A supplier is identified by its `supplierId`; the
 * buyer/PTI seat is one seat and gets one key.
 * @param {CurrentIdentity} identity
 * @returns {string}
 */
export function seatKeyFor(identity) {
  // A supplier persona without an id is not a usable seat, but it must still
  // never share the buyer's row: it gets its own bucket, not `buyer`.
  return identity.personaType === 'supplier'
    ? `supplier:${identity.supplierId ?? 'unknown'}`
    : 'buyer';
}

/**
 * @typedef {object} ParsedStore
 * @property {Map<string, ReadonlySet<string>>} seats
 * @property {boolean} unreadable
 */

/**
 * Read the whole envelope. Never throws.
 * @returns {ParsedStore | null}  `null` for absent or inaccessible storage.
 */
function readStore() {
  /** @type {string | null} */
  let raw = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    raw = window.localStorage.getItem(NOTICE_READS_STORAGE_KEY);
  } catch {
    // Private browsing / disabled storage: nothing stored is a legitimate
    // answer, and an inaccessible store is not a corrupt one.
    return null;
  }
  if (raw === null) return null;

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { seats: new Map(), unreadable: true };
  }
  const envelope = /** @type {{ v?: unknown; seats?: unknown } | null} */ (parsed);
  if (
    !envelope ||
    typeof envelope !== 'object' ||
    envelope.v !== STORE_VERSION ||
    !envelope.seats ||
    typeof envelope.seats !== 'object' ||
    Array.isArray(envelope.seats)
  ) {
    return { seats: new Map(), unreadable: true };
  }

  /** @type {Map<string, ReadonlySet<string>>} */
  const seats = new Map();
  for (const [seatKey, row] of Object.entries(
    /** @type {Record<string, unknown>} */ (envelope.seats)
  )) {
    // One bad row must not discard every good seat, and it must not be
    // silently reported as an empty read either: the envelope is marked
    // unreadable and the bad row contributes nothing.
    if (!Array.isArray(row) || !row.every((id) => typeof id === 'string')) {
      return { seats, unreadable: true };
    }
    seats.set(seatKey, new Set(/** @type {string[]} */ (row)));
  }
  return { seats, unreadable: false };
}

/**
 * The ids this seat has opened, with the reason when there are none.
 * Never throws.
 * @param {string} seatKey
 * @returns {SeatReadState}
 */
export function readSeat(seatKey) {
  const store = readStore();
  if (store === null) return ABSENT;
  if (store.unreadable) return UNREADABLE;
  const ids = store.seats.get(seatKey);
  return ids ? { ids, status: 'ok' } : { ids: new Set(), status: 'ok' };
}

/**
 * Record these notices as opened for this seat. Union, never replace: a notice
 * that has rolled out of the current list keeps its read mark, so if it comes
 * back it does not come back as new. Never throws.
 * @param {string} seatKey
 * @param {Iterable<string>} noticeIds
 * @returns {void}
 */
export function markRead(seatKey, noticeIds) {
  const add = [...new Set(noticeIds)].filter((id) => typeof id === 'string' && id.length > 0);
  if (add.length === 0) return;

  const store = readStore();
  // A corrupt store is replaced, not repaired in place: its rows cannot be
  // trusted, and refusing the write would lose the act that just happened.
  /** @type {Map<string, ReadonlySet<string>>} */
  const seats = store && !store.unreadable ? store.seats : new Map();
  const current = seats.get(seatKey) ?? new Set();
  seats.set(seatKey, new Set([...current, ...add]));

  /** @type {Record<string, string[]>} */
  const rows = {};
  for (const [key, ids] of seats) rows[key] = [...ids];
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      NOTICE_READS_STORAGE_KEY,
      JSON.stringify({ v: STORE_VERSION, seats: rows })
    );
  } catch {
    // Quota / private browsing. The in-memory state is the caller's; what is
    // lost is durability, and losing it silently is better than refusing an
    // open the user already made.
  }
}

/**
 * Forget every seat, in memory and on disk. Test isolation only.
 * @returns {void}
 */
export function resetNoticeReads() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(NOTICE_READS_STORAGE_KEY);
    }
  } catch {
    // nothing to do; there is no module cache to clear
  }
}
