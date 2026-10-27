// ────────────────────────────────────────────────────────────────────────────
// BuyerCollaboration — module-scope constants: the pinned clock, the current
// publication, the DSG height, the four verb ids, the class label keys and the
// chip classes. Moved out of `BuyerCollaboration.jsx` by the Phase 5 page split
// (no behaviour change).
// ────────────────────────────────────────────────────────────────────────────

/** @import { ConsolidationRow, SupplierCoverageEntry, CommitmentClass } from '@services/sdc' */
import { FORECAST_PUBLICATIONS, currentPublication, SDC_SIMULATED_NOW } from '@services/sdc';

// The pinned SIMULATED clock the pure selectors receive (`now` is injected —
// SDC-1a purity). The fixture cycle lives in Aug–Oct 2026; this as-of sits past
// the R2 response deadline (2026-08-22) so the chase list shows its overdue
// state deterministically. Declared on the meta line — never presented as the
// real clock. SDC-4a: this is now the ONE shared SDC clock (SDC_SIMULATED_NOW) —
// the same instant the write stamps use, so display and writes never diverge.
export const SIMULATED_ASOF = SDC_SIMULATED_NOW;

// The CURRENT publication stays module-scope: publications are frozen SOMO
// fixtures (their producer is the F2 C8 feed, not a supplier write), and drive
// the period bar + period-class only. The supplier-WRITTEN derivations
// (rows / rollups / chase / coverage) are live buyer-scoped hooks in-component.
export const CURRENT = currentPublication(FORECAST_PUBLICATIONS);

// Fixed DSG height (px) — same one-source-of-truth pattern as PlanGrid: the
// `height` prop AND the `--plan-dsg-h` pin (anti-trembling, planGrid.css).
export const DSG_H = /** @type {const} */ ({ grid: 256 });

// R1b - THE GATE IS THE MACHINE, NOT A STATUS LITERAL.
// `userVerbsFrom` reads `surfaceable` (S51), so a verb the flow marks unsurfaced
// can never reach this column even when its from-state matches. Writing
// `status === 'Disputed'` here would be shorter, correct today, and would keep
// offering the button on the day somebody flips `surfaceable` to false - an
// affordance outliving its own legality.
export const RESOLVE_VERB = 't_requirementresponse_resolve';
// WAVE C — the three verbs that had a machine, an atom and no caller.
export const REVIEW_VERB = 't_requirementresponse_review';
export const ACCEPT_VERB = 't_requirementresponse_accept';
export const DISPUTE_VERB = 't_requirementresponse_dispute';

/** @type {Record<CommitmentClass, string>} */
export const CLASS_LABEL_KEY = {
  firm: 'sdc.class.firm',
  'semi-firm': 'sdc.class.semiFirm',
  'visibility-only': 'sdc.class.visibilityOnly'
};

// Quiet-outlined chip base (DP-3 status-chip grammar: soft tint, thin border).
const CHIP =
  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[length:var(--fs-label-3)] font-medium';
export const CHIP_NEUTRAL = `${CHIP} border-border-subtle bg-bg-hover text-text-secondary`;
export const CHIP_SUCCESS = `${CHIP} border-success/30 bg-success-soft text-success`;
export const CHIP_WARNING = `${CHIP} border-warning/30 bg-warning-soft text-warning-hover`;
export const CHIP_DANGER = `${CHIP} border-danger/30 bg-danger-soft text-danger`;
export const CHIP_INFO = `${CHIP} border-info/30 bg-info-soft text-info`;

// SDC-4d — the coverage entry is JOINED INTO the row (not read from a column
// closure). The coverage reads resolve ASYNC now, and DSG re-renders cells on
// `value` changes — not on a column-`component` closure change — so a coverage
// map captured in the closure would render stale (all dashes) after the async
// resolve. Carrying it in the row (like `state`) makes the grid reflect it.
/**
 * @typedef {ConsolidationRow & {
 *     readonly coverage: SupplierCoverageEntry | null;
 *   }} CoverageRow
 */
