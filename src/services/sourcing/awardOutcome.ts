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
// ────────────────────────────────────────────────────────────────────────────

import type { AwardLine, AwardStatus } from './types';
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
  const inForce = awards.filter((a) => a.status !== 'Cancelled');
  const mineFor = (item: AwardItem, pool: readonly SupplierAwardRead[]) =>
    pool.flatMap((a) =>
      a.lines
        .filter((l) => l.supplierId === supplierId && itemOfAwardLine(items, l)?.key === item.key)
        .map((line) => ({ award: a, line })),
    );
  return items.map((item) => {
    const mine = mineFor(item, inForce)[0];
    if (mine) {
      return {
        item,
        outcome: {
          kind: 'awarded',
          sharePct: mine.line.sharePct,
          quantity: mine.line.quantity,
          ...(mine.line.awardTierQty !== undefined ? { breakQty: mine.line.awardTierQty } : {}),
        },
      };
    }
    if (inForce.some((a) => a.settledItemKeys.includes(item.key)) || rfq.status === 'Awarded') {
      return { item, outcome: { kind: 'notAwarded' } };
    }
    const withdrawn = mineFor(
      item,
      awards.filter((a) => a.status === 'Cancelled'),
    )
      .map((m) => m.award.withdrawnAt ?? '')
      .sort()
      .pop();
    if (withdrawn) return { item, outcome: { kind: 'withdrawn', withdrawnAt: withdrawn } };
    if (rfq.status === 'Cancelled') return { item, outcome: { kind: 'notAwarded' } };
    return { item, outcome: { kind: 'pending' } };
  });
}
