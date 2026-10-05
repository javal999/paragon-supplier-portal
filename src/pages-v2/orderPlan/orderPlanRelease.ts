// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-05 BR-05 → REQ-E09-01 — where a recommendation can become a call-off.
//
// A recommendation is released only by the planner's explicit act, and only
// onto an open umbrella PO line of the SAME supplier and material (REQ-E09-01
// BR-02). The act is the EXISTING draft verb (`t_calloff_draft`, REQ-E09-01
// BR-05): the draft is the planner's alone (a supplier never sees a draft),
// and releasing it on the Call-offs page runs the umbrella-balance check
// (BR-04, CR-04) there. No new write path. The draft names the engine as its
// origin, and release refuses such a draft while the engine dataset is not
// live (X-03, `CALLOFF_ENGINE_DATA_LIVE`, owner decision 2026-09-23).
// ─────────────────────────────────────────────────────────────────────────────

import { CALL_OFF_PO_STATES } from '@services/transitions/callOffRules';
import type { POLineItem, PurchaseOrder } from '@services/data/types';

/**
 * The open umbrella PO line a recommendation can be drafted on: the same
 * supplier and material, on a PO in a call-off state; the lowest PO number
 * first. Null means "No PO" (REQ-E09-01 edge case).
 */
export function umbrellaLineFor(
  pos: readonly PurchaseOrder[],
  supplierId: string | null,
  materialCode: string,
): { readonly po: PurchaseOrder; readonly line: POLineItem } | null {
  if (!supplierId) return null;
  const hits = pos
    .filter((po) => po.supplierId === supplierId && CALL_OFF_PO_STATES.includes(po.status))
    .flatMap((po) => po.lineItems.filter((l) => l.materialCode === materialCode).map((line) => ({ po, line })))
    .sort((a, b) => a.po.poNumber.localeCompare(b.po.poNumber) || a.line.id.localeCompare(b.line.id));
  return hits[0] ?? null;
}

/**
 * The need date a draft carries: the Monday of the week the recommendation is
 * received, or today when that Monday has passed (the verb refuses a need date
 * in the past).
 */
export const draftNeedDate = (weekStart: string, today: string): string => (weekStart < today ? today : weekStart);
