// ─────────────────────────────────────────────────────────────────────────────
// U-15 (BL-257) — what a "Provisional: rule awaiting Material Planning (…)"
// label rests on, in two kinds: the open question IDs, kept as IDs, and the
// master-data defaults (`MPQ`, `MDQ` in the rules' lists), written as words so
// they do not read as question IDs. The rules' lists are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {(key: string) => string} Translate */

/** The master-data defaults a list may name, with their words' i18n keys. */
const MASTER_DATA_DEFAULTS = Object.freeze({
  MPQ: 'sst.osip.default.MPQ',
  MDQ: 'sst.osip.default.MDQ'
});

/**
 * `B1, C2; MPQ = order multiple until master data; MDQ = MOQ until master data`.
 * @param {readonly string[]} items  A rules list: question IDs and master-data defaults.
 * @param {Translate} t
 * @returns {string}
 */
export function provisionalBasis(items, t) {
  /** @param {string} q @returns {q is keyof typeof MASTER_DATA_DEFAULTS} */
  const isDefault = (q) => Object.prototype.hasOwnProperty.call(MASTER_DATA_DEFAULTS, q);
  const questions = items.filter((q) => !isDefault(q));
  const defaults = items.filter(isDefault).map((d) => t(MASTER_DATA_DEFAULTS[d]));
  return [...(questions.length > 0 ? [questions.join(', ')] : []), ...defaults].join('; ');
}
