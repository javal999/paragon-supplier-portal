// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-13 — the Hub's open call-offs as the engine's order lines.
//
// The engine's SAP-grain feed carries PO schedule lines only (E14-01); a
// call-off is the Hub's own record (REQ-E09-01, PQ-01). So the reschedule
// report reads the call-offs here and hands them to the pure engine as
// `OpenOrderLine`s, beside E14-03's PO lines (ENG-B19).
//
//   · Open: released (awaiting confirmation or confirmed), with a quantity not
//     yet received, for a material the engine plans. Its date is the approved
//     delivery date (`approvedDeliveries`, the date OTIF is measured against);
//     one that date passed more than the overdue grace ago is treated as
//     closed, as E14-03 treats a PO line (ENG-B10).
//   · Projected but not proposed (BR-01 and the change verb's own rules):
//     dispatched (a heads-up or ASN); awaiting the supplier's answer; a change
//     already sent and not yet confirmed (nothing counts as moved until then);
//     a confirmation waiting for the planner; two confirmed deliveries (the
//     change verb sets one date and quantity).
//   · First quantity (ENG-D8's cumulative band): the call-off keeps no history
//     of its quantity, so the quantity in force stands in for it (ENG-B21).
// ─────────────────────────────────────────────────────────────────────────────

import {
  approvedDeliveries,
  isAwaitingApproval,
  isConfirmedAndAccepted,
  isReleased,
  type CallOffView,
} from '../../transitions/callOffRules';
import { addDays } from '../../engine/dates';
import type { InfoReason, OpenOrderLine } from '../../engine/reschedule';

export function callOffOrderLines(
  views: readonly CallOffView[],
  asOf: string,
  overdueGraceDays: number,
  engineMaterials: ReadonlySet<string>,
): OpenOrderLine[] {
  const oldest = addDays(asOf, -overdueGraceDays);
  const out: OpenOrderLine[] = [];
  for (const v of views) {
    const c = v.callOff;
    if (!isReleased(c) || !engineMaterials.has(c.materialCode)) continue;
    const deliveries = approvedDeliveries(c);
    const received = v.results.filter((r) => r.basis === 'receipt').reduce((s, r) => s + (r.quantity ?? 0), 0);
    const ordered = deliveries.reduce((s, d) => s + d.quantity, 0);
    const open = ordered - received;
    if (open <= 0) continue;
    const pending = deliveries.filter((_, seq) => !v.results.some((r) => r.seq === seq && r.basis === 'receipt'));
    const date = [...(pending.length > 0 ? pending : deliveries)].map((d) => d.date).sort()[0];
    if (date < oldest) continue;
    const info: InfoReason | null =
      v.headsUps.length > 0
        ? 'dispatched'
        : c.status === 'Awaiting Confirmation'
          ? c.agreedDeliveries && c.agreedDeliveries.length > 0
            ? 'changePending'
            : 'awaitingConfirmation'
          : isAwaitingApproval(c)
            ? 'awaitingApproval'
            : deliveries.length > 1
              ? 'multipleDeliveries'
              : null;
    out.push({
      id: `co:${c.id}`,
      kind: 'callOff',
      reference: c.callOffNumber,
      callOffId: c.id,
      poNumber: c.poNumber,
      poLine: null,
      supplierId: c.supplierId,
      materialCode: c.materialCode,
      quantity: open,
      receivedQuantity: received,
      firstQuantity: c.quantity,
      date,
      confirmed: isConfirmedAndAccepted(c),
      info,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
