// ─────────────────────────────────────────────────────────────────────────────
// UCX-P6 (BL-367) · UCX-D19 — THE STANDING DA AGREEMENT.
//
// Owner ruling 2026-11-22 (09:47:38 WIB, "Yes, accept"), confirmed 2026-11-25
// ("No re-ask"): a supplier's agreement to take the DA remainder in the first
// week after the horizon STANDS until the planner changes it. It changes owner
// rule DRC-2 BR-03 (A8), which recorded the agreement "on the move" each week.
// There is no expiry and no re-ask; the date shown beside the agreement is the
// only cue that it is old (UCX-PG12 stays At risk).
//
// NOTHING NEW IS STORED. Every publish already records, per planning week, the
// agreements it carried (`agreedFirstOutside`) and every pair's figure; those
// rows carry the actor, the time and the audit event [Owner A8], so the
// standing agreement is DERIVED from them:
//
//   · Walk the publications newest first, over the ones that record the pair
//     (a pair absent from a publication says nothing either way — skip it).
//   · The newest such publication decides the basis: not agreed there means
//     there is no standing agreement (the planner unticked it, or never gave
//     it). Agreed there means `qty` is the remainder it recorded.
//   · Keep walking while the pair stays agreed: `agreedAt` is the OLDEST date
//     of that unbroken run, so the date says how long the agreement has stood,
//     not when it was last re-recorded. A later publication that records the
//     pair without agreeing ends the run and takes the date with it.
//
// The page then asks only about NEW rows (no standing agreement) and CHANGED
// rows (`qty` differs from today's remainder, [Proposed] — the definition of
// "changed" no source settles; see the MR's Decisions for the user).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { DemandAnticipationPublication } from './demandAnticipationRules' */
import { pairKey } from './demandAnticipationRules';

/**
 * One pair's standing agreement.
 * `qty`:  The remainder the newest agreeing publication recorded.
 * `agreedAt`:  The time of the OLDEST publication in the unbroken run of
 *   agreements — when the supplier's agreement last began/stood.
 * `publicationId`:  That oldest publication (the run's start).
 *
 * @typedef {{
 *   readonly qty: number;
 *   readonly agreedAt: string;
 *   readonly publicationId: string;
 * }} StandingAgreement
 */

/**
 * @param {readonly DemandAnticipationPublication[]} publications
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {StandingAgreement | null}
 */
export function standingAgreementOf(publications, supplierId, materialCode) {
  const key = pairKey(supplierId, materialCode);
  /**
   * The publication's entry for the pair, or null when it does not record it.
   * @param {DemandAnticipationPublication} pub
   */
  const entryIn = (pub) =>
    pub.entries.find((e) => e.supplierId === supplierId && e.materialCode === materialCode) ?? null;
  /** The newest publication that records the pair. */
  let newest = -1;
  for (let i = publications.length - 1; i >= 0; i -= 1)
    if (entryIn(publications[i])) {
      newest = i;
      break;
    }
  if (newest < 0) return null;
  // The newest recording must agree; a later untick, or a publish that left the
  // pair out, is the planner changing the agreement.
  if (!publications[newest].agreedFirstOutside.includes(key)) return null;
  const newestEntry = /** @type {NonNullable<ReturnType<typeof entryIn>>} */ (
    entryIn(publications[newest])
  );
  /** @type {StandingAgreement} */
  let standing = {
    qty: newestEntry.figure.value.remainder,
    agreedAt: publications[newest].publishedAt,
    publicationId: publications[newest].id
  };
  // Walk older while the pair stays agreed; a publication that records it
  // without agreeing ends the run, and one without the pair says nothing.
  for (let i = newest - 1; i >= 0; i -= 1) {
    const pub = publications[i];
    if (!entryIn(pub)) continue;
    if (!pub.agreedFirstOutside.includes(key)) break;
    standing = { ...standing, agreedAt: pub.publishedAt, publicationId: pub.id };
  }
  return standing;
}

/**
 * Every pair with a standing agreement, keyed `supplierId|materialCode`.
 * The read model hands these to the figure computation as today's agreements.
 * @param {readonly DemandAnticipationPublication[]} publications
 * @returns {Map<string, StandingAgreement>}
 */
export function standingAgreements(publications) {
  /** @type {Map<string, StandingAgreement>} */
  const out = new Map();
  const seen = new Set();
  for (const pub of publications) {
    for (const e of pub.entries) {
      const key = pairKey(e.supplierId, e.materialCode);
      if (seen.has(key)) continue;
      seen.add(key);
      const standing = standingAgreementOf(publications, e.supplierId, e.materialCode);
      if (standing) out.set(key, standing);
    }
  }
  return out;
}

/**
 * Whether a candidate row is ASKED about: no standing agreement (new), or one
 * whose recorded quantity differs from today's remainder (changed).
 * @param {{ readonly agreement: StandingAgreement | null; readonly remainder: number }} row
 * @returns {'new' | 'changed' | 'standing'}
 */
export function askStateOf(row) {
  if (row.agreement === null) return 'new';
  if (row.agreement.qty !== row.remainder) return 'changed';
  return 'standing';
}
