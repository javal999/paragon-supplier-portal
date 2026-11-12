// ────────────────────────────────────────────────────────────────────────────
// PO ON HOLD STORE — PEX-7 (BL-270) and PEX-8 (BL-271).
//
// Two things the hub has to remember, because neither can be recomputed:
//   · `firstDay` per supplier × material: the day a PO On Hold quantity first
//     appeared (PEX-7 BR-02, the start of the grace period [Proposed]). Kept
//     while the quantity stays above 0; dropped when it returns to 0, so a
//     later quantity starts a new grace period.
//   · the decisions: one row per PO On Hold line the planner suggested on. The
//     target `poOnHoldDecision` writes here only. A row's history is
//     append-only: the planner's suggestion, then the supplier's choice, each
//     with time and who (PEX-8 BR-05).
//
// Empty at start; held in memory like every other record in the prototype.
// ────────────────────────────────────────────────────────────────────────────

/** @import { DecisionEvent, PoOnHoldOption } from '../../../transitions/poOnHold' */
/** @import { ExecutionPlan } from '../../../transitions/poOnHoldExecution' */

/**
 * `firstDay`:  The grace-period start of the episode the decision belongs to.
 * `qty`:  The PO On Hold quantity when the planner suggested.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly firstDay: string;
 *   readonly qty: number;
 *   readonly state: 'Suggested' | 'Chosen' | 'Executed';
 *   readonly suggested: PoOnHoldOption;
 *   readonly chosen: PoOnHoldOption | null;
 *   readonly history: readonly DecisionEvent[];
 * }} PoOnHoldDecisionRow
 */

/**
 * PEX-8 BR-02/BR-05 — what the end-of-grace execution did, one row per decision
 * (append-only, never edited). `lineKeys` are the idempotency keys, one per PO
 * line touched (`executionKey`). `callOffIds`: the call-offs it created.
 * `snapshot`: the line as it stood when it ran, so the panel can still show it
 * after the quantity left hold. `actor` is always the system: a machine act.
 *
 * @typedef {{
 *   readonly decisionId: string;
 *   readonly supplierId: string;
 *   readonly materialCode: string;
 *   readonly firstDay: string;
 *   readonly option: PoOnHoldOption;
 *   readonly standing: 'chosen' | 'noSupplierResponse';
 *   readonly at: string;
 *   readonly actor: 'system';
 *   readonly plan: ExecutionPlan;
 *   readonly lineKeys: readonly string[];
 *   readonly callOffIds: readonly string[];
 *   readonly snapshot: Readonly<Record<string, unknown>>;
 * }} PoOnHoldExecutionRow
 */

/** @type {PoOnHoldExecutionRow[]} */
let executions = [];

/** @type {Map<string, string>} */
let firstDays = new Map();
/** @type {PoOnHoldDecisionRow[]} */
let decisions = [];
let counter = 0;

export const poOnHoldStore = {
  /**
   * Record which pairs are on hold on `day`: a pair seen for the first time
   * gets `day`; a pair no longer on hold is dropped.
   * @param {readonly string[]} onHoldKeys  `supplierId|materialCode` of every pair above 0.
   * @param {string} day
   * @returns {ReadonlyMap<string, string>}
   */
  observe(onHoldKeys, day) {
    const live = new Set(onHoldKeys);
    for (const k of [...firstDays.keys()]) if (!live.has(k)) firstDays.delete(k);
    for (const k of live) if (!firstDays.has(k)) firstDays.set(k, day);
    return firstDays;
  },
  /** @returns {readonly PoOnHoldDecisionRow[]} */
  all() {
    return decisions;
  },
  /**
   * @param {string} id
   * @returns {PoOnHoldDecisionRow | undefined}
   */
  get(id) {
    return decisions.find((d) => d.id === id);
  },
  /**
   * @param {Omit<PoOnHoldDecisionRow, 'id'>} row
   * @returns {PoOnHoldDecisionRow}
   */
  insert(row) {
    counter += 1;
    const made = { ...row, id: `poh-${String(counter).padStart(4, '0')}` };
    decisions = [...decisions, made];
    return made;
  },
  /**
   * Move a decision to a state and append one history step.
   * @param {string} id
   * @param {PoOnHoldDecisionRow['state']} state
   * @param {PoOnHoldOption | null} chosen
   * @param {DecisionEvent} event
   */
  append(id, state, chosen, event) {
    decisions = decisions.map((d) =>
      d.id === id ? { ...d, state, chosen, history: [...d.history, event] } : d
    );
  },
  /** @returns {readonly PoOnHoldExecutionRow[]} */
  executions() {
    return executions;
  },
  /**
   * @param {string} decisionId
   * @returns {PoOnHoldExecutionRow | undefined}
   */
  executionOf(decisionId) {
    return executions.find((e) => e.decisionId === decisionId);
  },
  /**
   * Has this PO line's execution already run (the idempotency key)?
   * @param {string} key
   * @returns {boolean}
   */
  hasKey(key) {
    return executions.some((e) => e.lineKeys.includes(key));
  },
  /**
   * PEX-8 — record an execution and close its decision. Refused (returns
   * null) when the decision already has one: a second run does nothing.
   * @param {PoOnHoldExecutionRow} row
   * @param {DecisionEvent} event
   * @returns {PoOnHoldExecutionRow | null}
   */
  recordExecution(row, event) {
    if (executions.some((e) => e.decisionId === row.decisionId)) return null;
    executions = [...executions, row];
    decisions = decisions.map((d) =>
      d.id === row.decisionId ? { ...d, state: 'Executed', history: [...d.history, event] } : d
    );
    return row;
  },
  /** TEST SEAM — back to nothing. */
  reset() {
    executions = [];
    firstDays = new Map();
    decisions = [];
    counter = 0;
  }
};
