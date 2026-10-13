// ────────────────────────────────────────────────────────────────────────────
// BuyerCompliance — module-scope constants and types shared by more than one
// file of the page. Moved out of `BuyerCompliance.jsx` by the Phase 5 page
// split (no behaviour change). Option lists a single component maps over stay
// in that component's file (`STATUS_OPTIONS` / `CATEGORY_OPTIONS` in
// `ComplianceFilters.jsx`, `REQUEST_CATEGORIES` in `RequestPanelBody.jsx`).
// ────────────────────────────────────────────────────────────────────────────

/** @import { CertCategory } from '@lib/complianceView' */
/** @import { ComplianceRegistryEntry, ComplianceDisplayStatus } from '@services/data/types' */
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

/** @typedef {'All' | CertCategory} CategoryFilter */
/** @typedef {'All' | ComplianceDisplayStatus} StatusFilter */

// A row = the stored entry + its computed-at-read projections (law 0.5). The page
// never reads a stored clock/scheme value — every display fact below is derived
// from the entry vs the reference clock (HALAL-CLOCK-STATE mechanism, I3.1).
/**
 * @typedef {object} Row
 * @property {ComplianceRegistryEntry} entry
 * @property {ComplianceDisplayStatus} status
 * @property {number | null} days
 * @property {CertCategory} category
 * @property {boolean} remind
 * @property {boolean} schemeOk
 */
