// ────────────────────────────────────────────────────────────────────────────
// THE AWARD PANEL — ONE PANEL FOR EVERY RFQ (RFx C3; NR-3 BR-02 to BR-07,
// AR-03, AR-04) AND FOR AN RFP (RFx D3; NR-2 BR-05, BR-06). It grew out of the
// tiered per-item award form, and a legacy RFQ renders through it too: the
// award rule's item list (`awardItemsOf`) is the same for both kinds, so the
// panel reads items, never "tiered or not". An RFP renders through it with
// the rule's RFP item list (`awardItemsOfRfp`: one item per option of a closed
// firm-offer round, its quantity points as breaks), so a buyer awards an RFP
// option exactly as an RFQ item.
//
// Per item the buyer picks a break, splits by % or by quantity (the other side
// is derived and shown read-only), or leaves the item "Not awarded now" (it
// stays open: the award is PARTIAL) or, on the final award, "Will not award".
//
// ⚠️ **THE PAGE JUDGES WITH THE VERB'S OWN RULE.** The lines it sends are
// checked by `awardShapeRefusal` over the verb's own item list, then for items
// left open and for the reason, exactly as `rfq_award_governed` /
// `rfp_award_governed` check them, so a form the page lets through is one the
// verb accepts and a refusal reads the same on both sides. The page is the
// message; the verb is the lock.
//
// The two event kinds differ only in what an ITEM MODEL answers (below): who
// can be awarded an item (a quote, or a firm offer in force), what price a row
// shows, how a line is written, and whether a reason is always required (an
// RFP: NR-2 BR-06) or only when the award departs from the best score (an RFQ).
//
// Phase 5 split (PAGE-SPLIT-GUIDE): this folder replaces the one-file module.
// It is not a routed page (no `AppShellV2`), and `rfx/` stays a feature
// folder. `index.jsx` keeps every name the importers use
// (`BuyerSourcingEvent/components/AwardSection.jsx`, `RfpAwardSection.jsx`,
// `AwardRecords.jsx`, `SupplierFirmOffers.jsx`, `SupplierNegotiations.jsx`)
// and re-exports it from the file it now lives in: the RFQ and RFP panels and
// the shared form with its rows in `components/`, the item model and the other
// types in `types.js`, the pure helpers in `utils.js`.
// ────────────────────────────────────────────────────────────────────────────

/** @import { AnyAwardLine } from '@services/sourcing/types' */

/**
 * The award a panel asks the page to dispatch (declared in `types.js`).
 * @template {AnyAwardLine} L
 * @typedef {import('./types').ItemPanelAward<L>} ItemPanelAward
 */

/** The award the RFQ panel asks the page to dispatch (declared in `types.js`). */
/** @typedef {import('./types').PanelAward} PanelAward */

export { awardRefusalMessage, itemLabel, optionsOfRounds, awardableFirmPrices } from './utils';
export { AwardPanel } from './components/AwardPanel';
export { RfpAwardPanel } from './components/RfpAwardPanel';
