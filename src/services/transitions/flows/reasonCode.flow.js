// ────────────────────────────────────────────────────────────────────────────
// Reason code flow — BL-32, REQUIREMENTS §3.6 (starter lists) and §2 (ADM
// "configures reason codes"). THE RECORDING VERB FOR ONE CODE ON ONE LIST.
//
// ── THE PRECEDENT IS `t_threepl_set`, FOLLOWED ──────────────────────────────
// A list entry with a label and an "offered" flag, maintained by the
// administrator — the 3PL list's shape exactly:
//
//   · A DEGENERATE SINGLE-STATE MACHINE. A code has no lifecycle; it has a
//     LEDGER of changes (added, renamed, retired, offered again).
//   · THE ENTITY IS `<list>:<code>`. Setting a well-formed code the list does
//     not hold yet ADDS it; a malformed id or an unknown list is NOT_FOUND.
//   · There is NO delete, by design: a retired code stays in the list so every
//     record that carries it still reads with its label.
//   · `previous` and `setAt` are store-assigned; `setBy` comes from the session.
//
// ── ⚠️ A SEPARATE VERB FROM `t_setting_set`, AND WHY ────────────────────────
// A rule value is a key and a number; a reason code is a list entry with two
// labels, a retired flag and a uniqueness rule across its siblings. Folding it
// into the typed-key verb would make one policy answer two shapes; the 3PL
// list already set the precedent for a maintained list.
//
// ── ⚠️ `reasoncode:maintain` IS A `compliance` ATOM ─────────────────────────
// The lists are what a supplier must choose from when it adjusts or rejects a
// PO, or commits below demand or forecast — and what the planner reads to judge
// the answer. A supplier lane cannot hold it (it would write the excuses it is
// judged by), nor planning or procurement, who judge them. It sits with
// `setting:set`, `calendar:set` and `threepl:maintain`; `admin` holds it by
// derivation. Whether `buyer_all` keeps it is BL-70's question.
// ────────────────────────────────────────────────────────────────────────────

/** @import { FlowDefinition } from '../schema' */
import { POLICY_HOOKS } from '../policyHooks';

/** @type {FlowDefinition} */
export const reasonCodeFlow = {
  entity: 'reasonCode',
  version: 1,
  states: ['Maintained'],
  initial: 'Maintained',
  /** `t_reasoncode_set` is statePreserving, so nothing ever leaves it. */
  terminals: ['Maintained'],
  transitions: [
    {
      // WIRED (BL-32). The Hub administrator adds a code, renames it (EN and
      // ID), retires it, or offers it again.
      id: 't_reasoncode_set',
      from: ['Maintained'],
      to: 'Maintained',
      statePreserving: true,
      trigger: 'user',
      requiredRole: 'reasoncode:maintain',
      requiredFields: ['labelEn', 'labelId', 'setBy'],
      policyHooks: [POLICY_HOOKS.REASON_CODE_GOVERNED],
      surfaceable: { surfaced: true },
      version: 1
    }
  ]
};
