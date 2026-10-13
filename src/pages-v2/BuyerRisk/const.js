// ────────────────────────────────────────────────────────────────────────────
// BuyerRisk — module-scope constants shared by more than one file of the page.
// Moved out of `BuyerRisk.jsx` by the Phase 5 page split (no behaviour change).
// Constants a single component maps over stay in that component's file
// (`TAB_DEFS` in `index.jsx`, `SCENARIO_LIBRARY_IDS` in `ScenarioTab.jsx`, the
// map palette bindings in `WorldMap.jsx`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { LucideIcon } from 'lucide-react' */
/** @import { RiskAlertLevel as AlertLevel, ComplianceState, ScenarioFeasibility as Feasibility } from '@services/data/types' */
import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';

// ⚠️ ANCHORED — this surface rendered values derived from anchored
// fixture data against the WALL CLOCK, so what a reader saw moved every day
// with no commit involved. Module-scope `DECLARED_PRESENT`, the shipped
// pattern from `BuyerShipments` / `BuyerGoodsReceipt`, and behaviour-
// preserving for the same reason they are: this surface's families shift by
// `DECLARED_PRESENT - anchor` and so does this pin, so every rendered
// day-count is answered at the instant the fixtures were authored for.
//
// ⚠️ SESSION-WRITTEN STATE KEEPS THE WALL CLOCK. This constant is for READ
// projections only. A timestamp stamped onto something the user just did is a
// fact about this session, not about the fixture set, and anchoring one would
// tell the reader their own action happened weeks ago.
export const TODAY = DECLARED_PRESENT;

/** @typedef {'geo' | 'exposure' | 'scenario' | 'compliance' | 'commodity'} TabKey */

/** @type {Record<Feasibility, 'success' | 'warning' | 'danger'>} */
export const FEASIBILITY_VARIANT = {
  high: 'success',
  medium: 'warning',
  low: 'danger'
};

/** @type {Record<ComplianceState, 'success' | 'warning' | 'danger'>} */
export const COMPLIANCE_VARIANT = {
  ok: 'success',
  expiring: 'warning',
  expired: 'danger'
};

/** @type {Record<AlertLevel, { bg: string; border: string; text: string; Icon: LucideIcon }>} */
export const ALERT_VARIANT = {
  critical: {
    bg: 'bg-danger-soft',
    border: 'border-danger',
    text: 'text-danger',
    Icon: AlertOctagon
  },
  warning: {
    bg: 'bg-warning-soft',
    border: 'border-warning',
    text: 'text-warning-hover',
    Icon: AlertTriangle
  },
  info: { bg: 'bg-info-soft', border: 'border-info', text: 'text-info', Icon: Info }
};
