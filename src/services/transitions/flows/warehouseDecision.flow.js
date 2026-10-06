// ────────────────────────────────────────────────────────────────────────────
// Warehouse-week decision — FUX-D3 (owner, 2026-10-05; findings F-10, F-22).
//
// A week that does not fit the warehouse even with the most rented space gets
// the Material Planner's recorded decision: rent space, push out orders,
// reduce orders, or accept the overflow ("accept" needs a note).
//
// THE PRECEDENT IS `t_maxstock_set` / `t_mrpcontroller_set`, FOLLOWED:
//   · A DEGENERATE SINGLE-STATE MACHINE. A decision has no lifecycle; it has a
//     LEDGER of records per stream × week. The latest is in force.
//   · THE ENTITY IS `<stream>|<weekStart>`. Every well-formed id exists; a
//     malformed one is NOT_FOUND.
//   · The plan version, the time and the actor are target-assigned, never read
//     from the payload.
//
// A record of intent only: it changes no order, no call-off and no engine
// result, and is never sent to SAP or a supplier. So, like the forecast
// override, it is not refused on simulated data — nothing leaves PTI on it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const warehouseDecisionFlow = {
  entity: 'warehouseDecision',
  version: 1,
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_warehousedecision_record` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      id: 't_warehousedecision_record',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'warehousedecision:record',
      requiredFields: ['choice'],
      policyHooks: [POLICY_HOOKS.WAREHOUSE_DECISION_VALID],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
