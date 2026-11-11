// ────────────────────────────────────────────────────────────────────────────
// PO ON HOLD — THE END-OF-GRACE EXECUTION, WRITER (PEX-8 BR-02, BR-05, PEX-10
// BR-01). The decision is `transitions/poOnHoldExecution.planExecution`; this
// only writes the plan: the call-offs, the append-only ledger row, the history
// step on the decision. The actor is the system: a machine act (C10 §6.4).
//
// IDEMPOTENT. A decision executes once (`recordExecution` refuses a second
// row) and each PO line carries an `executionKey`; a line whose key is already
// recorded is skipped, so a second run creates nothing.
//
// Called by `poOnHoldDecisionTarget.applyTransition` for `t_poonhold_execute`,
// after its policy hook passed. [Proposed] throughout; see the rules file.
// ────────────────────────────────────────────────────────────────────────────

import { sdcClock } from '../../sdc';
import { callOffStore } from './stores/callOffStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { poOnHoldStore } from './stores/poOnHoldStore';
import { allPoOnHold } from './poOnHoldReadModel';
import { executionKey } from '../../transitions/poOnHoldExecution';

/** The confirmation instant for a grace-end day: noon WIB, so the day reads the same in WIB and UTC. */
const confirmedInstant = (/** @type {string} */ day) => `${day}T05:00:00.000Z`;

/**
 * Run the execution of one decision. Returns the ledger row, or null when
 * there is nothing to run (unknown, not due, already executed).
 * @param {string} decisionId
 * @returns {import('./stores/poOnHoldStore').PoOnHoldExecutionRow | null}
 */
export function executePoOnHold(decisionId) {
  if (poOnHoldStore.executionOf(decisionId)) return null;
  const row = allPoOnHold().find((r) => !r.closed && r.decision?.id === decisionId);
  const plan = row?.execution.plan;
  if (!row || !plan || row.execution.status !== 'due' || row.effective === null) return null;

  const standing = row.status === 'noSupplierResponse' ? 'noSupplierResponse' : 'chosen';
  const confirmedAt = confirmedInstant(plan.confirmedOn);
  /** @type {string[]} */
  const callOffIds = [];
  /** @type {string[]} */
  const lineKeys = [];
  for (const c of plan.callOffs) {
    const key = executionKey(decisionId, c.lineId);
    // A second call-off on the same line (a spread over weeks) shares the key:
    // the key stops a RUN, not a week; skip only lines an earlier run recorded.
    if (poOnHoldStore.hasKey(key)) continue;
    const po = purchaseOrderStore.get(c.poId);
    const line = po?.lineItems.find((l) => l.id === c.lineId);
    if (!po || !line) continue;
    const identity = callOffStore.nextIdentity();
    callOffStore.add({
      ...identity,
      poId: po.id,
      poNumber: po.poNumber,
      poLineId: line.id,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      materialCode: line.materialCode,
      description: line.description,
      uom: line.uom,
      unitPrice: line.unitPrice,
      currency: po.currency,
      quantity: c.qty,
      needDate: c.needDate,
      type: 'forecast',
      status: 'Confirmed',
      origin: 'poOnHold',
      releasedAt: confirmedAt,
      confirmation: {
        kind: 'confirm',
        deliveries: [{ quantity: c.qty, date: c.needDate }],
        comment: `PO On Hold ${decisionId}`,
        confirmedAt,
        approval: 'auto'
      },
      dispatches: [],
      notes: []
    });
    callOffIds.push(identity.id);
    if (!lineKeys.includes(key)) lineKeys.push(key);
  }
  for (const a of plan.absorbed) {
    const key = executionKey(decisionId, a.lineId);
    if (!lineKeys.includes(key)) lineKeys.push(key);
  }
  const at = sdcClock.now();
  return poOnHoldStore.recordExecution(
    {
      decisionId,
      supplierId: row.supplierId,
      materialCode: row.materialCode,
      firstDay: row.grace.firstDay,
      option: row.effective,
      standing,
      at,
      actor: 'system',
      plan,
      lineKeys,
      callOffIds,
      snapshot: JSON.parse(JSON.stringify(row))
    },
    { kind: 'executed', option: row.effective, at, actor: 'system' }
  );
}
