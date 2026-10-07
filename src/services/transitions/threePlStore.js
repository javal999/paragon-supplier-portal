// ────────────────────────────────────────────────────────────────────────────
// THE 3PL LIST — BL-51, REQ-E07-04 BR-05 (D-03 decided 2026-09-21).
//
// The hub does not track shipments. It names the 3PL (third-party logistics
// provider) an ASN travels with and, where that 3PL has a public tracking page,
// turns the ASN's tracking number into a link to it. **No status is ever read
// from the 3PL's site** — the link opens the 3PL's own page in a new tab and
// that is the whole integration (it replaces supplier TMS access, D-03).
//
// ── WHAT LIVES HERE ─────────────────────────────────────────────────────────
//   1. THE SAMPLE LIST. A short list of illustrative 3PLs, every name marked
//      "(illustrative)" and every address on the RFC 2606 `.example` domain,
//      which can never resolve. It is marked "Sample data" wherever it shows.
//   2. THE ADMINISTRATOR'S CHANGES, applied over the sample list by the one
//      governed verb `t_threepl_set` (the Hub administrator, ADM). Held in
//      memory: like every other record in the prototype, they are lost on a
//      reload.
//   3. THE ONE RULE for a tracking address, and THE ONE RESOLVER that turns an
//      ASN's 3PL + tracking number into a link. The verb, the admin page and
//      every ASN surface call the same two functions, so "a pattern the verb
//      would accept" and "a pattern the link is built from" cannot disagree.
//
// ── ⚠️ THE TRACKING NUMBER IS DATA, NEVER PART OF THE ADDRESS'S SHAPE ───────
// The pattern is fixed by the administrator; the tracking number is typed by a
// supplier. It is inserted with `encodeURIComponent`, so a tracking number can
// never add a path, a query, a fragment or a scheme to the address. And the
// pattern itself must be `https://`: a `javascript:` or plain-http address is
// refused by the verb and, should one ever reach the store, never linked.
//
// ── ⚠️ UNKNOWN IS PLAIN TEXT, NEVER A GUESS ─────────────────────────────────
// An ASN with no 3PL, or naming a 3PL the list does not hold, shows its
// tracking number as plain text. Nothing matches a 3PL by its display name: a
// carrier typed as free text is a claim, the id is a reference.
// ────────────────────────────────────────────────────────────────────────────

/** @import { ActorAttribution } from '@lib/enforcement' */
import { asActorAttribution } from '@lib/enforcement';

/** One 3PL on the list. */
/**
 * `id`:  Stable id, `tpl-…`. What an ASN stores; never shown as a name.
 * `trackingUrlPattern`: The 3PL's public tracking address, with `{tracking}` where the tracking number goes — e.g. `https://track.sample.example/parcel/{tracking}`.
 * `active`:  Offered on new ASNs. An inactive 3PL still resolves on ASNs that name it.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly name: string;
 *   readonly trackingUrlPattern: string;
 *   readonly active: boolean;
 * }} ThreePl
 */

/** An administrator's change to one 3PL, as recorded. */
/**
 * `setAt`:  Store-assigned, never a payload field (the `pinnedAt` discipline).
 *
 * @typedef {ThreePl & {
 *     readonly setBy: ActorAttribution;
 *     readonly setAt: string;
 *   }} ThreePlChange
 */

/** The placeholder the tracking number replaces. Exactly one per pattern. */
export const TRACKING_PLACEHOLDER = '{tracking}';

/** The shape of a 3PL id. Also what makes an id addressable by the verb. */
export const THREE_PL_ID = /^tpl-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * THE SAMPLE LIST (BL-51 placeholder: "a short sample list, marked as sample").
 * The names match the carrier names the sample ASNs already carry, so the demo
 * reads as one world; the addresses are `.example` and cannot resolve.
 * @type {readonly ThreePl[]}
 */
export const SAMPLE_THREE_PLS = Object.freeze([
  {
    id: 'tpl-sample-express',
    name: 'Sample Express Courier (illustrative)',
    trackingUrlPattern: 'https://track.sample-express.example/parcel/{tracking}',
    active: true
  },
  {
    id: 'tpl-sample-postal',
    name: 'Sample Postal Logistics (illustrative)',
    trackingUrlPattern: 'https://sample-postal.example/tracking?awb={tracking}',
    active: true
  },
  {
    id: 'tpl-sample-forwarder',
    name: 'Sample Freight Forwarder (illustrative)',
    trackingUrlPattern: 'https://portal.sample-forwarder.example/shipments/{tracking}',
    active: true
  },
  {
    // Inactive: no longer offered on a new ASN, still linked on the ASNs that
    // already name it — the tracking page does not disappear with the contract.
    id: 'tpl-sample-interisland',
    name: 'Sample Interisland Line (illustrative)',
    trackingUrlPattern: 'https://sample-interisland.example/track/{tracking}',
    active: false
  }
]);

// ── 1 · THE RULE ─────────────────────────────────────────────────────────────

/**
 * Why a 3PL row would be refused, or null when it is acceptable. Called by the
 * verb's policy hook AND by the resolver, so a pattern that could not have been
 * set is never linked.
 * @param {unknown} id
 * @param {unknown} name
 * @param {unknown} pattern
 * @param {unknown} active
 * @returns {string | null}
 */
export function threePlRefusal(id, name, pattern, active) {
  if (typeof id !== 'string' || !THREE_PL_ID.test(id)) {
    return `3PL id must look like tpl-name (lower-case letters, digits, hyphens), got ${JSON.stringify(id)}`;
  }
  if (typeof name !== 'string' || name.trim().length < 2) return '3PL name is required';
  if (typeof active !== 'boolean') return 'active must be true or false';
  return trackingPatternRefusal(pattern);
}

/**
 * Why a tracking address pattern would be refused, or null.
 * @param {unknown} pattern
 * @returns {string | null}
 */
export function trackingPatternRefusal(pattern) {
  if (typeof pattern !== 'string' || pattern.trim() === '') return 'tracking address is required';
  const p = pattern.trim();
  if (!p.startsWith('https://')) return 'tracking address must start with https://';
  const count = p.split(TRACKING_PLACEHOLDER).length - 1;
  if (count !== 1) return `tracking address must contain ${TRACKING_PLACEHOLDER} exactly once`;
  /** @type {URL} */
  let url;
  try {
    url = new URL(p.replace(TRACKING_PLACEHOLDER, 'X'));
  } catch {
    return 'tracking address is not a valid web address';
  }
  if (url.protocol !== 'https:' || url.hostname === '')
    return 'tracking address must start with https://';
  return null;
}

// ── 2 · THE STORE ────────────────────────────────────────────────────────────

/** @type {ThreePlChange[]} */
let changes = [];
let version = 0;
const listeners = /** @type {Set<() => void>} */ (new Set());

/** @returns {void} */
function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

export const threePlStore = {
  /**
   * The list in force: the sample list with the administrator's changes applied.
   * @returns {readonly ThreePl[]}
   */
  all() {
    const byId = /** @type {Map<string, ThreePl>} */ (
      new Map(SAMPLE_THREE_PLS.map((r) => [r.id, r]))
    );
    for (const c of changes) {
      byId.set(c.id, {
        id: c.id,
        name: c.name,
        trackingUrlPattern: c.trackingUrlPattern,
        active: c.active
      });
    }
    return [...byId.values()];
  },
  /**
   * @param {string} id
   * @returns {ThreePl | undefined}
   */
  get(id) {
    return threePlStore.all().find((r) => r.id === id);
  },
  /**
   * Every change the administrator made, oldest first.
   * @returns {readonly ThreePlChange[]}
   */
  changes() {
    return changes;
  },
  /**
   * APPEND ONLY — called by the `t_threepl_set` target and nothing else.
   * @param {ThreePlChange} change
   * @returns {void}
   */
  append(change) {
    changes = [...changes, change];
    changed();
  },
  /**
   * Back to the sample list — test isolation.
   * @returns {void}
   */
  reset() {
    changes = [];
    changed();
  },
  /**
   * A number that changes whenever the list does.
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

/**
 * Normalise a verified payload into a change record (the target calls this).
 * @param {string} id
 * @param {Record<string, unknown>} payload
 * @param {string} setAt
 * @returns {ThreePlChange | null}
 */
export function threePlChangeFrom(id, payload, setAt) {
  const setBy = asActorAttribution(payload.setBy);
  if (!setBy) return null;
  if (threePlRefusal(id, payload.name, payload.trackingUrlPattern, payload.active)) return null;
  return {
    id,
    name: String(payload.name).trim(),
    trackingUrlPattern: String(payload.trackingUrlPattern).trim(),
    active: /** @type {boolean} */ (payload.active),
    setBy,
    setAt
  };
}

/**
 * Why an ASN may not name this 3PL, or null. Used by the ASN verbs.
 * @param {unknown} threePlId
 * @param {readonly ThreePl[]} [list]
 * @returns {string | null}
 */
export function asnThreePlRefusal(threePlId, list = threePlStore.all()) {
  if (threePlId === undefined || threePlId === null || threePlId === '') return null;
  const row = list.find((r) => r.id === threePlId);
  if (!row) return `3PL ${String(threePlId)} is not on the 3PL list`;
  if (!row.active)
    return `3PL ${row.name} is no longer offered; choose another or enter the carrier by name`;
  return null;
}

// ── 3 · THE RESOLVER ─────────────────────────────────────────────────────────

/**
 * A tracking number that says "nothing yet" rather than naming a shipment.
 * @param {string} n
 * @returns {boolean}
 */
const isRealTrackingNumber = (n) => n.trim() !== '' && n.trim() !== '—' && n.trim() !== '-';

/**
 * The public tracking address for an ASN, or null when the number must show as
 * plain text: no 3PL, a 3PL the list does not hold, a pattern that fails the
 * rule, or no real tracking number yet.
 * @param {string | undefined} threePlId
 * @param {string} trackingNumber
 * @param {readonly ThreePl[]} [list]
 * @returns {string | null}
 */
export function trackingUrlFor(threePlId, trackingNumber, list = threePlStore.all()) {
  if (!threePlId || !isRealTrackingNumber(trackingNumber)) return null;
  const row = list.find((r) => r.id === threePlId);
  if (!row || trackingPatternRefusal(row.trackingUrlPattern)) return null;
  return row.trackingUrlPattern
    .trim()
    .replace(TRACKING_PLACEHOLDER, encodeURIComponent(trackingNumber.trim()));
}

/**
 * A new 3PL's id, from its name: `tpl-` + a slug.
 * @param {string} name
 * @returns {string}
 */
export function threePlIdFor(name) {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `tpl-${slug || 'new'}`;
}
