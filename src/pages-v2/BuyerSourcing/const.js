// ────────────────────────────────────────────────────────────────────────────
// BuyerSourcing — module-scope constants and the shared typedefs.
//
// Moved out of `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour
// change). Three kinds of constant deliberately do NOT live here, because a
// guard reads them in the file that uses them:
//   · the reason→key message maps (`FX_*_KEY`, `SPREAD_SILENT_KEY`,
//     `RFQ_QTY_REFUSAL_KEY`, `RFQ_BUDGET_REFUSAL_KEY`) sit beside their render
//     sites — GL-1's chip-coverage guard pairs a map's uses with its
//     declaration in ONE file;
//   · the mapped option lists (`MATERIAL_CATALOG`, `INCOTERMS_OPTIONS`,
//     `PAYMENT_TERMS_OPTIONS`) sit in the wizard step that `.map()`s them —
//     the module-scope-literal gate keys them `file::CONST`.
// ────────────────────────────────────────────────────────────────────────────

/** @import { RFQCategory, RFQStatus } from '@data/mockRfqs' */
/** @import { SpreadDeps } from '@lib/shouldCostSpread' */
/** @import { BidCurrency } from '@lib/currencyPolicy' */
/** @import { FxPin, FxPinSource } from '@lib/fxPin' */
/** @import { RfqAuthoringDraft, RfqDraftSeed } from '../sourcing/rfqDraft' */
import { RFQ_CATEGORY_OPTIONS, RFQ_UOM_OPTIONS } from '../sourcing/requisitionPrefill';
import { MATERIAL_BASKET_CLASSIFICATION } from '@services/data/mock/fixtures/commodityMaterialMap';
import {
  ROOT_BENCHMARKS,
  SHOULD_COST_MATERIALS,
  SIMULATED_SPOT_FX
} from '@services/data/mock/fixtures/commodityBaskets';
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

// RFx UX 1D (B-04) — the board opens on "Needs my action"; "All" is gone and
// Draft has its own tab, so every status sits in exactly one tab.
/** @typedef {'action' | 'open' | 'pending' | 'draft' | 'awarded' | 'closed'} GroupTab */

// RFx UX 1D (B-04) — a KPI tile, clicked, filters the table to the RFQs it counts.
/** @typedef {'active' | 'awaiting' | 'ready' | 'awarded'} KpiFilter */

// Category label keys — the RFQCategory enum stays the logic value; only the
// rendered label is localized (mirrors the type-label precedent in contracts.js).
/** @type {Record<RFQCategory, string>} */
export const CATEGORY_LABEL_KEY = {
  Fragrance: 'sourcing.category.fragrance',
  'Active Ingredients': 'sourcing.category.activeIngredients',
  Packaging: 'sourcing.category.packaging',
  Emulsifiers: 'sourcing.category.emulsifiers',
  Botanical: 'sourcing.category.botanical',
  Other: 'sourcing.category.other'
};

// C.2 — the vocabulary moved to `sourcing/requisitionPrefill.js` so the
// membership check that decides whether a requisition's category can be carried
// and the `<select>` a buyer picks from are the SAME list. Two copies would
// drift, and the drift would show up as a field the prefill refuses to fill for
// a category the wizard happily offers.
/** @type {readonly RFQCategory[]} */
export const CATEGORY_OPTIONS = RFQ_CATEGORY_OPTIONS;

// Material G2 (AR-17) — `CATEGORY_TO_SUPPLIER_CATEGORY` moved to
// `services/sourcing/sourcingType.js`: the invitee pool and the sourcing type
// read the one list.

export const UOM_OPTIONS = RFQ_UOM_OPTIONS; // C.2 — shared with the prefill membership check

/** @type {Record< RFQStatus, 'success' | 'warning' | 'info' | 'neutral' | 'danger' >} */
export const STATUS_VARIANT = {
  Draft: 'neutral',
  Open: 'info',
  Closed: 'neutral',
  'Partly awarded': 'info',
  Awarded: 'success',
  Cancelled: 'danger'
};

// Field chrome for the FX-pin dialog — same tokens as the supplier quote form,
// so the portal's two governed numeric-entry surfaces read identically.
export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

// ── CP-0 · 2e-c-4 — the recorded FX basis, made visible ─────────────────────
//
// D-1 requires a pin to be auditable. An audit trail nobody can read from the
// screen is an audit trail only an engineer can consult, so this states, per
// foreign currency: the rate IN FORCE, its VINTAGE, its SOURCE, and — when a
// rate has been superseded — that earlier ones exist and are kept.
//
// The vintage is deliberately as prominent as the rate. A rate is not a fact on
// its own; a rate AS OF a date is. Showing 17,250 without saying when it was
// true is the same class of omission as showing a score without its liveness.

/** The draft a buyer confirms before a rate is recorded. */
/**
 * @typedef {object} PinDraft
 * @property {BidCurrency} currency
 * @property {string} rate
 * @property {string} asOf
 * @property {FxPinSource} source
 * @property {string} rateType
 * @property {FxPin} [superseding] -  The pin this one would supersede, if any — drives the confirm copy.
 */

// CI-2 should-cost-vs-quote spread deps — the SIMULATED join + the commodity
// fixtures the resolver reads. Module-level (static fixtures, no per-render cost);
// `materials` is keyed by `sc-*` id for O(1) lookup inside `spreadForQuote`.
/** @type {SpreadDeps} */
export const SPREAD_DEPS = {
  join: MATERIAL_BASKET_CLASSIFICATION,
  materials: Object.fromEntries(SHOULD_COST_MATERIALS.map((m) => [m.id, m])),
  roots: ROOT_BENCHMARKS,
  fx: SIMULATED_SPOT_FX
};

/**
 * `sourceRequisitionId`:  C.2 — set ONLY when the buyer started from a requisition.
 * `origin`:  Where a seeded draft came from — the review names it ("Created from …").
 * `unlinkedDocRequestIds`: NR-1 BR-02 — document requests whose item the buyer removed. Wizard state only (never in the payload): the Documents step names each one until it is edited or dismissed.
 *
 * @typedef {RfqAuthoringDraft & {
 *     title: string;
 *     category: RFQCategory | '';
 *     materials: string[];
 *     totalQty: string;
 *     uom: (typeof UOM_OPTIONS)[number];
 *     budget: string;
 *     responseDeadline: string;
 *     awardDeadline: string;
 *     incoterms: string;
 *     paymentTerms: string;
 *     invitedSupplierIds: string[];
 *     sourceRequisitionId?: string;
 *     origin?: RfqDraftSeed['origin'];
 *     unlinkedDocRequestIds?: string[];
 *   }} DraftRfq
 */
