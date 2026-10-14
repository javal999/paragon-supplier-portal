/** @import { AlertTriangle } from 'lucide-react' */
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

/** @typedef {'A' | 'B' | 'C' | 'D' | 'F'} Grade */

/**
 * @typedef {object} ActionItem
 * @property {string} id
 * @property {typeof AlertTriangle} Icon
 * @property {string} iconClass
 * @property {string} iconBg
 * @property {string} title
 * @property {string} badge
 * @property {'success' | 'warning' | 'danger' | 'info' | 'neutral'} badgeVariant
 * @property {string} desc
 * @property {boolean} primary
 * @property {string} btnLabel
 * @property {string} time
 */
