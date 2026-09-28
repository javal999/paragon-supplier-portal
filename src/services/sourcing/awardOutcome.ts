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

import type { AnyAwardLine, AwardLine, AwardStatus, RfpAwardLine } from './types';
import { awardItemsOf, itemOfAwardLine, type AwardableRfq, type AwardItem } from './awardShape';

/** The parts of a supplier's award read the outcome is derived from. */
export interface SupplierAwardRead {
  readonly id: string;
  /** The supplier's OWN lines only (the read model narrows them). */
  readonly lines: readonly AwardLine[];
  readonly status: AwardStatus;
  readonly withdrawnAt?: string;
  /** The items the award settled, for anyone, by `AwardItem.key`. */
  readonly settledItemKeys: readonly string[];
}

export type SupplierItemOutcome =
  | { readonly kind: 'awarded'; readonly sharePct: number; readonly quantity: number; readonly breakQty?: number }
  | { readonly kind: 'notAwarded' }
  | { readonly kind: 'withdrawn'; readonly withdrawnAt: string }
  | { readonly kind: 'pending' };

/** The outcome of every item of an RFQ for one supplier. */
export function supplierItemOutcomes(
  rfq: AwardableRfq & { readonly status: string },
  awards: readonly SupplierAwardRead[],
  supplierId: string,
): readonly { item: AwardItem; outcome: SupplierItemOutcome }[] {
  const items = awardItemsOf(rfq);
  const read = awards.map((a) => ({ ...a, settledKeys: a.settledItemKeys }));
  return items.map((item) => ({
    item,
    outcome: outcomeOf(item.key, (line: AwardLine) => itemOfAwardLine(items, line)?.key, read, supplierId, rfq.status),
  }));
}

/** The parts of a supplier's RFP award read (`RfpAwardView`) the outcome is derived from. */
export interface SupplierRfpAwardRead {
  readonly id: string;
  /** The supplier's OWN lines only (the read model narrows them). */
  readonly lines: readonly RfpAwardLine[];
  readonly status: AwardStatus;
  readonly withdrawnAt?: string;
  /** The option refs the award settled, for anyone (no supplier, no share). */
  readonly settledOptionRefs: readonly string[];
}

/**
 * RFx D3 (NR-2 BR-09, NR-3 BR-12) — the outcome of each option a supplier was
 * asked a firm offer for on one RFP, by the SAME rule as an RFQ item: Awarded
 * (share, quantity point) · Not awarded · Award withdrawn · Pending.
 */
export function supplierOptionOutcomes(
  optionRefs: readonly string[],
  awards: readonly SupplierRfpAwardRead[],
  supplierId: string,
  eventStatus: string,
): readonly { optionRef: string; outcome: SupplierItemOutcome }[] {
  const read = awards.map((a) => ({ ...a, settledKeys: a.settledOptionRefs }));
  return [...new Set(optionRefs)].map((optionRef) => ({
    optionRef,
    outcome: outcomeOf(optionRef, (line: RfpAwardLine) => line.optionRef, read, supplierId, eventStatus),
  }));
}

/** One award as the shared rule reads it: the supplier's own lines and the keys it settled. */
interface OutcomeAward<L extends AnyAwardLine> {
  readonly lines: readonly L[];
  readonly status: AwardStatus;
  readonly withdrawnAt?: string;
  readonly settledKeys: readonly string[];
}

/** The outcome of one item (or option) `key`, in the order the header states. */
function outcomeOf<L extends AnyAwardLine>(
  key: string,
  keyOfLine: (line: L) => string | undefined,
  awards: readonly OutcomeAward<L>[],
  supplierId: string,
  eventStatus: string,
): SupplierItemOutcome {
  const mineIn = (pool: readonly OutcomeAward<L>[]) =>
    pool.flatMap((a) =>
      a.lines.filter((l) => l.supplierId === supplierId && keyOfLine(l) === key).map((line) => ({ award: a, line })),
    );
  const inForce = awards.filter((a) => a.status !== 'Cancelled');
  const mine = mineIn(inForce)[0];
  if (mine) {
    return {
      kind: 'awarded',
      sharePct: mine.line.sharePct,
      quantity: mine.line.quantity,
      ...(mine.line.awardTierQty !== undefined ? { breakQty: mine.line.awardTierQty } : {}),
    };
  }
  if (inForce.some((a) => a.settledKeys.includes(key)) || eventStatus === 'Awarded') return { kind: 'notAwarded' };
  const withdrawn = mineIn(awards.filter((a) => a.status === 'Cancelled'))
    .map((m) => m.award.withdrawnAt ?? '')
    .sort()
    .pop();
  if (withdrawn) return { kind: 'withdrawn', withdrawnAt: withdrawn };
  if (eventStatus === 'Cancelled') return { kind: 'notAwarded' };
  return { kind: 'pending' };
}
