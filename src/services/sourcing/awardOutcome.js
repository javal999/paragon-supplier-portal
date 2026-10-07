// ────────────────────────────────────────────────────────────────────────────
// A SUPPLIER'S OUTCOME, ITEM BY ITEM (RFx C3; NR-3 BR-12, supplier steps 1 and
// 2, AC-07). Pure: it reads only what the supplier's award read already holds —
// its own lines, each award's status and withdrawal date, and which items each
// award settled (no supplier, no share) — so nothing here can show a supplier
// another supplier's share.
//
// Per item, in this order:
//   · Awarded        — an award in force carries this supplier's line for it;
//   · Not awarded    — an award in force settled it for someone else, or the
//                      event is Awarded (the item was awarded elsewhere or
//                      marked "Will not award");
//   · Award withdrawn — a CANCELLED award carried this supplier's line for it,
//                      and nothing has replaced it yet (with the date);
//   · Pending        — the item is still open.
//
// RFx D3 (NR-2 BR-09) — an RFP OPTION is read by the same rule, keyed by its
// option ref instead of an item key (`supplierOptionOutcomes`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { AnyAwardLine, AwardLine, AwardStatus, RfpAwardLine } from './types' */
/** @import { AwardableRfq, AwardItem } from './awardShape' */
import { awardItemsOf, itemOfAwardLine } from './awardShape';

/** The parts of a supplier's award read the outcome is derived from. */
/**
 * @typedef {object} SupplierAwardRead
 * @property {string} id
 * @property {readonly AwardLine[]} lines -  The supplier's OWN lines only (the read model narrows them).
 * @property {AwardStatus} status
 * @property {string} [withdrawnAt]
 * @property {readonly string[]} settledItemKeys -  The items the award settled, for anyone, by `AwardItem.key`.
 */

/**
 * @typedef {| { readonly kind: 'awarded'; readonly sharePct: number; readonly quantity: number; readonly breakQty?: number }
 *   | { readonly kind: 'notAwarded' }
 *   | { readonly kind: 'withdrawn'; readonly withdrawnAt: string }
 *   | { readonly kind: 'pending' }} SupplierItemOutcome
 */

/**
 * The outcome of every item of an RFQ for one supplier.
 * @param {AwardableRfq & { readonly status: string }} rfq
 * @param {readonly SupplierAwardRead[]} awards
 * @param {string} supplierId
 * @returns {readonly { item: AwardItem; outcome: SupplierItemOutcome }[]}
 */
export function supplierItemOutcomes(rfq, awards, supplierId) {
  const items = awardItemsOf(rfq);
  const read = awards.map((a) => ({ ...a, settledKeys: a.settledItemKeys }));
  return items.map((item) => ({
    item,
    outcome: outcomeOf(
      item.key,
      /** @param {AwardLine} line */ (line) => itemOfAwardLine(items, line)?.key,
      read,
      supplierId,
      rfq.status
    )
  }));
}

/** The parts of a supplier's RFP award read (`RfpAwardView`) the outcome is derived from. */
/**
 * @typedef {object} SupplierRfpAwardRead
 * @property {string} id
 * @property {readonly RfpAwardLine[]} lines -  The supplier's OWN lines only (the read model narrows them).
 * @property {AwardStatus} status
 * @property {string} [withdrawnAt]
 * @property {readonly string[]} settledOptionRefs -  The option refs the award settled, for anyone (no supplier, no share).
 */

/**
 * RFx D3 (NR-2 BR-09, NR-3 BR-12) — the outcome of each option a supplier was
 * asked a firm offer for on one RFP, by the SAME rule as an RFQ item: Awarded
 * (share, quantity point) · Not awarded · Award withdrawn · Pending.
 * @param {readonly string[]} optionRefs
 * @param {readonly SupplierRfpAwardRead[]} awards
 * @param {string} supplierId
 * @param {string} eventStatus
 * @returns {readonly { optionRef: string; outcome: SupplierItemOutcome }[]}
 */
export function supplierOptionOutcomes(optionRefs, awards, supplierId, eventStatus) {
  const read = awards.map((a) => ({ ...a, settledKeys: a.settledOptionRefs }));
  return [...new Set(optionRefs)].map((optionRef) => ({
    optionRef,
    outcome: outcomeOf(
      optionRef,
      /** @param {RfpAwardLine} line */ (line) => line.optionRef,
      read,
      supplierId,
      eventStatus
    )
  }));
}

/** One award as the shared rule reads it: the supplier's own lines and the keys it settled. */
/**
 * @template {AnyAwardLine} L
 * @typedef {object} OutcomeAward
 * @property {readonly L[]} lines
 * @property {AwardStatus} status
 * @property {string} [withdrawnAt]
 * @property {readonly string[]} settledKeys
 */

/**
 * The outcome of one item (or option) `key`, in the order the header states.
 * @template {AnyAwardLine} L
 * @param {string} key
 * @param {(line: L) => string | undefined} keyOfLine
 * @param {readonly OutcomeAward<L>[]} awards
 * @param {string} supplierId
 * @param {string} eventStatus
 * @returns {SupplierItemOutcome}
 */
function outcomeOf(key, keyOfLine, awards, supplierId, eventStatus) {
  /** @param {readonly OutcomeAward<L>[]} pool */
  const mineIn = (pool) =>
    pool.flatMap((a) =>
      a.lines
        .filter((l) => l.supplierId === supplierId && keyOfLine(l) === key)
        .map((line) => ({ award: a, line }))
    );
  const inForce = awards.filter((a) => a.status !== 'Cancelled');
  const mine = mineIn(inForce)[0];
  if (mine) {
    return {
      kind: 'awarded',
      sharePct: mine.line.sharePct,
      quantity: mine.line.quantity,
      ...(mine.line.awardTierQty !== undefined ? { breakQty: mine.line.awardTierQty } : {})
    };
  }
  if (inForce.some((a) => a.settledKeys.includes(key)) || eventStatus === 'Awarded')
    return { kind: 'notAwarded' };
  const withdrawn = mineIn(awards.filter((a) => a.status === 'Cancelled'))
    .map((m) => m.award.withdrawnAt ?? '')
    .sort()
    .pop();
  if (withdrawn) return { kind: 'withdrawn', withdrawnAt: withdrawn };
  if (eventStatus === 'Cancelled') return { kind: 'notAwarded' };
  return { kind: 'pending' };
}
