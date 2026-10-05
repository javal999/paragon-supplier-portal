// ────────────────────────────────────────────────────────────────────────────
// Phase 1B — Data Layer Interface Contract
//
// Single source of truth for the data-access shape that pages depend on.
// At Phase 3 the real NestJS/SAP adapter implements these same interfaces;
// pages stay unchanged across the swap.
//
// Drift-resolved canonical names (locked):
//   PurchaseOrder.totalValue      (was totalAmount/totalValue)
//   PurchaseOrder.status          (was status/poStatus)
//   PurchaseOrder.orderDate       (was orderDate/createdDate)
//     dropped: PurchaseOrder.deliveryDate (use requestedDeliveryDate / confirmedDeliveryDate)
//   POLineItem.quantity           (was quantity/qty)
//   POLineItem.uom                (was uom/unit)
// ────────────────────────────────────────────────────────────────────────────

/** @typedef {import('@app-types/supplier.types').Supplier} Supplier */
/** @typedef {import('@app-types/supplier.types').SupplierStatus} SupplierStatus */
/** @typedef {import('@app-types/supplier.types').SupplierTier} SupplierTier */
/** @typedef {import('@app-types/supplier.types').PreferredChannel} PreferredChannel */
/** @typedef {import('@app-types/supplier.types').ScorecardGrade} ScorecardGrade */
// REQ-E03-01 to REQ-E03-05 — the RFx read surface. The view shapes live beside
// the entities (`services/sourcing/views`) so the contract and the adapter that
// fulfils it import ONE declaration rather than each holding its own copy.
/** @import { InviteeCandidate, InviteeFilter } from '../transitions/rfxRules' */
/** @import { FsRow } from '../transitions/fixedStockReconcile' */
/** @import { SimulationRefusal, StockSimulation } from '../transitions/simulateSupplierStock' */
/** @import { RfqClarificationView, RfqEngagementView } from '../sourcing/rfqResponse' */
/** @import { AwardView, NegotiationRoundView, RfiEventView, RfpEventView, RfpAwardView, RfpOfferRoundView, RfqSupplierGateView } from '../sourcing/views' */

// CP-3 · E2 — the enforcement read seam's row type. TYPE-ONLY: naming the
// vocabulary is not acquiring a consumer, and nothing in this file calls it.
/** @import { EnforcementSetting, ActorAttribution } from '@lib/enforcement' */

// SDC-4b — the collaboration read seam's row types (type-only; the SDC layer
// already imports IntakePlanState from here, so this reverse reference is a
// type-only cycle TS resolves at erase-time — no runtime import is emitted).
/** @import { RequirementResponse, DisputeEntry, ForecastStream, InventoryDeclaration, StockChannel, MaterialType, IncomingShipmentView, ConsolidationRow, SupplierCoverageEntry, SupplierRollup, ChaseEntry } from '../sdc' */
// Delivery Agreement read seam — the view-model row type (type-only; erased at
// build, so no runtime import into the data layer).
/** @import { ConfirmCommandResult, DeliveryAgreementView, EditPolicyCommandResult, ReleaseCommandResult } from '../delivery/views' */
/** @import { SupplierReliability } from '../engine/reliability' */
/** @import { UpdateCompliance } from '../transitions/updateCompliance' */
/** @import { MaterialPlan, MaterialRequirementRun } from '../engine/requirement' */
/** @import { MaterialSafetyStock, SafetyStockChange, SafetyStockRun } from '../engine/safetyStock' */
/** @import { MaterialOrderPlan, OrderPlanRun, WarehousePlan } from '../engine/orderSizing' */
/** @import { InfoLine, PlanChangeBaseline, Proposal, ProposalType, RescheduleRun, WarehouseReschedule } from '../engine/reschedule' */
/** @import { SupplierCfot } from '../engine/cfot' */
/** @import { SeriesResult, StabiliseParams, StabiliseRun } from '../engine/stabilise' */
/** @import { DataHealthReport } from '../engine/dataHealth' */
/** @import { DemandForecastRun, LevelForecast, SkuForecast } from '../engine/demandForecast' */
/** @import { ForecastBiasRun } from '../engine/forecastBias' */
/** @import { OverrideRecord, OverrideValueReport } from '../engine/forecastOverrides' */
/** @import { ModelBacktestResult } from '../engine/modelBacktest' */
/** @import { DemandRangeRun } from '../engine/demandRange' */
/** @import { DatasetProvenance } from '../engine/types' */
/** @import { ReleaseSelection } from '../delivery/release' */
/** @import { EditPolicyPatch } from '../delivery/policy' */
// The unified chase read view (SDC-5c). TYPE-ONLY — the `chase` module composes
// the collaboration + delivery reads one level up; the data layer only names the
// shape it returns. Acyclic: chase reads sdc/delivery types, never data/types.
/** @import { SupplierChaseView } from '../chase' */
/** @import { AttachmentMeta } from '../sourcing/rfqModel' */

// ─── PO enums (canonical home; relocated from types/purchaseOrder.types.ts) ──
export const POStatus = /** @type {const} */ ({
  SENT: 'Sent',
  VIEWED: 'Viewed',
  ACKNOWLEDGED: 'Acknowledged',
  CONFIRMED: 'Confirmed',
  /** The supplier proposed a counter-offer (REQ-E07-02 Adjust); the planner reviews it. */
  ADJUSTED: 'Adjusted',
  /** The supplier cannot meet the order (REQ-E07-02 Reject). PTI decides what next. */
  REJECTED: 'Rejected',
  PARTIALLY_DELIVERED: 'Partially Delivered',
  DELIVERED: 'Delivered',
  CLOSED: 'Closed'
});
/** @typedef {(typeof POStatus)[keyof typeof POStatus]} POStatus */

export const ChannelType = /** @type {const} */ ({
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  WEB: 'Web',
  API: 'API'
});
/** @typedef {(typeof ChannelType)[keyof typeof ChannelType]} ChannelType */

/** @typedef {import('@data/mockShipments').Shipment} Shipment */
/** @typedef {import('@data/mockShipments').ShipmentLineItem} ShipmentLineItem */
/** @typedef {import('@data/mockShipments').ShipmentStatus} ShipmentStatus */
/** @typedef {import('@data/mockShipments').ShipmentMode} ShipmentMode */

/** @typedef {import('@data/mockGoodsReceipts').GoodsReceipt} GoodsReceipt */
/** @typedef {import('@data/mockGoodsReceipts').GRStatus} GRStatus */
/** @typedef {import('@data/mockGoodsReceipts').Disposition} Disposition */
/** @typedef {import('@data/mockGoodsReceipts').CheckResult} CheckResult */
/** @typedef {import('@data/mockGoodsReceipts').OptionalCheck} OptionalCheck */
/** @typedef {import('@data/mockGoodsReceipts').InspectionResult} InspectionResult */
/** @typedef {import('@data/mockGoodsReceipts').ReceiptDiscrepancyResponse} ReceiptDiscrepancyResponse */
/** @typedef {import('@data/mockGoodsReceipts').ReceiptDiscrepancyStatus} ReceiptDiscrepancyStatus */

/** @typedef {import('@data/mockContracts').Contract} Contract */
/** @typedef {import('@data/mockContracts').ContractType} ContractType */
/** @typedef {import('@data/mockContracts').ContractStatus} ContractStatus */

/** @typedef {import('@data/mockObligations').ContractObligation} ContractObligation */
/** @typedef {import('@data/mockObligations').ObligationStatus} ObligationStatus */
/** @typedef {import('@data/mockObligations').ObligationCategory} ObligationCategory */
/** @typedef {import('@data/mockObligations').ObligationOwner} ObligationOwner */
/** @typedef {import('@data/mockObligations').ObligationRecurrence} ObligationRecurrence */

/** @typedef {import('@data/mockRfqs').RFQ} RFQ */
/** @typedef {import('@data/mockRfqs').RFQStatus} RFQStatus */
/** @typedef {import('@data/mockRfqs').RFQCategory} RFQCategory */
/** @typedef {import('@data/mockQuotations').Quotation} Quotation */
/** @typedef {import('@data/mockQuotations').QuotationStatus} QuotationStatus */

// ─── Re-exports — entities without drift, single source ─────────────────────

// ─── Identity scope — derived from CurrentIdentity at the page boundary ─────

/**
 * @typedef {object} QueryScope
 * @property {'buyer' | 'supplier'} personaType
 * @property {string | null} supplierId
 * @property {readonly string[]} [businessRoles] THE BUSINESS ROLES THE ACTING SESSION HOLDS — the authorisation half, and
 *   a READ scope never needs it (tenancy is `personaType` × `supplierId`).
 *
 *   ⚠️ **OPTIONAL ON THE TYPE, REQUIRED ON THE COMMAND PATH, AND THE
 *   DIFFERENCE IS ENFORCED IN THE DISPATCHER RATHER THAN HERE.** Making it
 *   required would put an authorisation field on `list()` / `getById()`, which
 *   conflates two questions and would force ~60 read specs to answer one they
 *   do not ask. Absent on a COMMAND, the dispatcher refuses with
 *   `ROLE_NOT_PERMITTED` — it does NOT fall back to the persona span, because
 *   that fallback IS the wildcard this arc retired: a persona spanning 48
 *   atoms unconditionally.
 *
 *   `scopeKey` deliberately ignores it — two sessions with different roles read
 *   the same tenant's data, so folding roles into the cache key would shard the
 *   query cache on a dimension the reads do not vary by.
 * @property {import('@lib/enforcement').ActorAttribution} [actor] WHO IS ACTING, carried from the SESSION — never from a command payload
 *   (C10 §6.2). The `setAt` / `pinnedAt` discipline this tree has ratified
 *   twice applies with more force to WHO than to WHEN: *a caller that could
 *   set it could backdate its own audit entry*.
 *
 *   ⚠️ **THE OTHER HALF OF §6.2 IS NOT BUILT AND IS STILL FREE.** A
 *   payload-supplied `RESOLVED` actor is not yet REFUSED BY NAME on write; it
 *   is harmless today for one reason only — nothing in shipped code constructs
 *   a `RESOLVED` actor, so no forged attribution can exist. That precondition
 *   becomes unfixable at the FIRST `RESOLVED` record, and this batch creates
 *   none. Stated here so the absence is a fact in the tree rather than a claim
 *   in a report.
 */

// ─── Error contract (DR-4) — the single failure channel for the data layer ──
//
// The interface today returns T[] / Page<T> / T|null on success; failure is
// signalled by *throwing* a DataError. This matches TanStack Query's model
// (queryFn throws -> isError), so consumers render the error state via the
// wrapper hook rather than unwrapping a Result envelope. The Phase-3 real
// adapter maps HTTP/SAP failures onto the same DataErrorCode set.

/**
 * @typedef {| 'NOT_FOUND'
 *   | 'SCOPE_DENIED'
 *   | 'UPSTREAM'
 *   | 'CHAOS'
 *   | 'UNKNOWN'} DataErrorCode
 */

// ─── ⚠️ WHEN F1 INTRODUCES A CAUSE CHANNEL (D-F ruling, 2026-08-13) ──────────
//
// `DataError` carried `cause?: unknown` from DR-4 until D-F deleted it. It was
// never populated: ALL SEVEN construction sites passed two arguments, and all
// seven are POLICY REFUSALS OR SYNTHETIC INJECTION — none sits inside a `catch`,
// so none had an underlying failure to wrap. The knowledge is preserved here
// rather than the field, on the D-A precedent, because the requirement is
// STRICTLY MORE THAN THE FIELD SAID:
//
//   1. IT SHIPS WITH ITS READER. A named PRODUCER is not a named consumer.
//      The paragraph above names the Phase-3 adapter as the thing that will
//      WRITE a cause; nothing named would ever READ one, and a channel written
//      by somebody and read by nobody is what was just deleted.
//   2. IT SHIPS NON-ENUMERABLE — `Object.defineProperty(this, 'cause',
//      { value, enumerable: false, writable: true, configurable: true })`, which
//      is what the platform does for `new Error(msg, { cause })`. The deleted
//      field was ENUMERABLE, so a populated cause would have entered EVERY
//      `JSON.stringify` of the error — every log line, telemetry payload and
//      audit record — with nobody having chosen. That is why "capture it but do
//      not render it" was not available as a safe interim: capture WAS exposure.
//   3. RENDERING IT IS A SEPARATE RULING. Under F1 a cause is an HTTP body or an
//      SAP message; what may reach `ErrorState` is a policy decision, not a
//      wiring task.
//
// Pinned by `dataError.contract.test.js`, which fails if a `cause` returns
// enumerable — a requirement recorded only in prose is a promise with no
// verifier.
/** The data layer's single failure channel (DR-4): a read or command throws it with a `DataErrorCode`. */
export class DataError extends Error {
  /**
   * @type {DataErrorCode}
   * @readonly
   */
  code;

  /**
   * @param {DataErrorCode} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'DataError';
    this.code = code;
    // Restore prototype chain for instanceof across the TS target.
    Object.setPrototypeOf(this, DataError.prototype);
  }
}

// ─── List envelope (DR-5) — shape frozen now, pagination machinery deferred ─
//
// Every list-returning read method returns Page<T> rather than a bare T[], so
// the 27 read surfaces are shaped for pagination from day one and pages migrate
// once. The mock returns everything in `items` and leaves `cursor` null; no
// pagination logic exists yet. The Phase-3 real adapter fills cursor/total.

/**
 * @template T
 * @typedef {object} Page
 * @property {T[]} items
 * @property {string | null} [cursor]
 * @property {number} [total]
 */

// ─── Canonical Purchase Order (drift-resolved) ──────────────────────────────

/**
 * @typedef {object} POLineItem
 * @property {string} id
 * @property {string} materialCode
 * @property {string} description
 * @property {number} quantity
 * @property {string} uom
 * @property {number} unitPrice
 * @property {number} confirmedQty
 * @property {number} [valueLimit] An SAP value-limit line: the line commits a VALUE and carries NO quantity
 *   (CR-04; BL-13 decided quantity per line, so this is the exception). When it
 *   is set, `quantity` is 0 and means "no quantity", never "nothing ordered",
 *   and a call-off release on the line is checked against remaining VALUE.
 * @property {string} [contractNumber] CR-12 — the contract this line's unit price comes from, when it does. A
 *   contract-priced line is invoiced at 0% tolerance; a line without one at 2%
 *   within the rupiah cap (`fulfilmentConfig.js`). Absent = no contract price.
 */

/**
 * @typedef {object} PurchaseOrder
 * @property {string} id
 * @property {string} poNumber
 * @property {string} [prReference]
 * @property {string} [sourceOfSupply]
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {POStatus} status
 * @property {ChannelType} channel
 * @property {string} currency
 * @property {number} totalValue
 * @property {string} orderDate
 * @property {string} requestedDeliveryDate
 * @property {string} confirmedDeliveryDate
 * @property {number} daysOverdue
 * @property {number} acknowledgmentTimeHours
 * @property {POLineItem[]} lineItems
 * @property {PoResponse} [response] The supplier's answer to the order (REQ-E07-02) — absent until the supplier
 *   approves, adjusts or rejects. Whether the PO is ESCALATED is never stored:
 *   it is derived at read time from the response deadline and the clock
 *   (`poResponseProjection.js`, law 0.5).
 * @property {string} [responseRequestedAt] When the supplier was last asked to respond, if not at creation — set when
 *   the planner rejects a counter-offer and the PO reopens. The response
 *   deadline counts from here (or from `orderDate` when absent).
 * @property {PoShippingNotice} [shippingNotice] -  Shipping notice confirmation (REQ-E07-05) — absent until recorded.
 */

/** The three answers a supplier can give a purchase order (REQ-E07-02 BR-02). */
/** @typedef {'approve' | 'adjust' | 'reject'} PoResponseOption */

/**
 * An adjust reason code (REQUIREMENTS §3.6). Since BL-32 the list is the Hub
 * administrator's (`reasonCodes.js`, list `poAdjust`): the starter codes are
 * capacity, material, logistics, quality and other, and a code can be added or
 * retired, so the type is the code's shape, not a closed union.
 */
/** @typedef {string} PoReasonCode */

/** What a rejection is about (REQ-E07-02 BR-06) — list `poReject` since BL-32. */
/** @typedef {string} PoRejectionCause */

/** One line's counter-offer on an adjusted PO. */
/**
 * @typedef {object} PoLineResponse
 * @property {string} lineId
 * @property {PoReasonCode} reasonCode
 * @property {string} [note] -  Required when `reasonCode` is `other`.
 * @property {number} counterQty -  CR-10: 0 < quantity ≤ the line's ordered quantity.
 * @property {string} counterDate -  `YYYY-MM-DD`.
 */

/** The planner's decision on a counter-offer. */
/**
 * @typedef {object} PoCounterReview
 * @property {'accepted' | 'rejected'} decision
 * @property {string} [comment]
 * @property {string} reviewedAt
 */

/**
 * @typedef {object} PoResponse
 * @property {PoResponseOption} option
 * @property {string} respondedAt -  ISO timestamp of the supplier's answer.
 * @property {string} [confirmedDeliveryDate] -  Approve: the delivery date the supplier confirmed.
 * @property {readonly PoLineResponse[]} [lines] -  Adjust: one entry per adjusted line; lines not listed are accepted as ordered.
 * @property {readonly PoRejectionCause[]} [rejectionCauses] -  Reject: at least one cause.
 * @property {string} [comment]
 * @property {PoCounterReview} [review] -  The planner's review of an adjustment, once made.
 */

/**
 * @typedef {object} PoShippingNotice
 * @property {string} [startedOn] -  Date shipment started — recorded automatically from the first submitted ASN.
 * @property {string} [startedByAsn] -  The ASN that started it.
 * @property {string} [expectedCompletionDate] -  Expected completion date given by the supplier (`YYYY-MM-DD`).
 * @property {string} [previousCompletionDate] -  The previous expected completion date, kept when the supplier changes it.
 * @property {string} [updatedAt]
 */

// ── Call-offs (REQ-E09-01, REQ-E09-03, REQ-E09-04) ──────────────────────────
//
// A call-off manages ONE delivery under an umbrella PO line (same supplier and
// material). The hub is the record for call-offs; SAP only knows the umbrella
// PO, receipts and invoices (REQUIREMENTS §3.1). Everything clock-derived —
// Escalated, At Risk, Dispatched, on time / late / missed — is computed at read
// time (`callOffRules.js`) and never stored here.

/** JIT or forecast-based, set at release (BR-09). Since BL-47 the CR-05 tolerance is the same for both. */
/** @typedef {'jit' | 'forecast'} CallOffType */

/** Stored call-off states — the confirmation statuses of REQ-E09-03 BR-02, plus
 *  the planner's Draft and a dismissed draft. */
/**
 * @typedef {| 'Draft'
 *   | 'Awaiting Confirmation'
 *   | 'Confirmed'
 *   | 'Confirmed with New Date'
 *   | 'Confirmed with Changes'
 *   | 'Partially Confirmed'
 *   | 'Rejected'
 *   | 'Dismissed'} CallOffStatus
 */

/** How the supplier answered (the four confirming answers). */
/** @typedef {'confirm' | 'newDate' | 'changes' | 'partial'} CallOffConfirmationKind */

/** One confirmed delivery: a quantity on a date (`YYYY-MM-DD`). */
/**
 * @typedef {object} CallOffDelivery
 * @property {number} quantity
 * @property {string} date
 */

/**
 * The supplier's confirmation. `approval` is the second axis of BR-04: `auto`
 * when the answer was within tolerance, `awaiting` until the planner decides,
 * `approved` once the planner approved it. A planner rejection clears the
 * confirmation and returns the call-off to Awaiting Confirmation.
 */
/**
 * @typedef {object} CallOffConfirmation
 * @property {CallOffConfirmationKind} kind
 * @property {readonly CallOffDelivery[]} deliveries
 * @property {string} [comment]
 * @property {string} confirmedAt
 * @property {'auto' | 'awaiting' | 'approved'} approval
 * @property {string} [reviewedAt]
 */

/** A dispatch heads-up from the supplier (REQ-E09-04). */
/**
 * @typedef {object} CallOffDispatch
 * @property {string} id
 * @property {string} shippedDate
 * @property {string} expectedArrival
 * @property {number} quantity
 * @property {string} [asnNumber] -  Optional link to the ASN for this shipment.
 * @property {string} recordedAt
 */

/** A planner or supplier note kept on the call-off (reasons are required). */
/**
 * @typedef {object} CallOffNote
 * @property {'edit' | 'dismiss' | 'change' | 'reject' | 'returned'} action
 * @property {string} text
 * @property {string} at
 */

/** The origin a call-off can carry (see `CallOff.origin`). */
/** @typedef {'engine'} CallOffOrigin */

/**
 * Material C4 (MR-5 BR-01 to BR-04) — a material's MRP controller (PIC) as the
 * reader may see it, attached at READ by the read model (never stored).
 * PTI: the SAP code, with the name when the code is mapped; an unmapped code
 * shows the code only (BR-02). A supplier: the name only, never the code
 * (BR-04). SAP-copied, so a surface showing it carries the `materialMasterSap`
 * liveness pill (AR-19).
 */
/**
 * @typedef {object} MrpControllerRef
 * @property {string} [code] -  The SAP MRP controller code, e.g. `P12`. Absent on a supplier's read.
 * @property {string} [name] -  Who the code is. Absent when the administrator has not mapped the code.
 */

/**
 * @typedef {object} CallOff
 * @property {string} id
 * @property {string} callOffNumber
 * @property {string} poId -  The umbrella PO and its line (supplier and material come from it).
 * @property {string} poNumber
 * @property {string} poLineId
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} materialCode
 * @property {string} description
 * @property {string} uom
 * @property {number} unitPrice
 * @property {string} currency
 * @property {number} quantity -  Released (requested) quantity and need date — "must come" (REQ-E09-04 BR-01).
 * @property {string} needDate
 * @property {CallOffType} type
 * @property {CallOffStatus} status
 * @property {string} [releasedAt] -  When the supplier was last asked to confirm; the 1-working-day deadline counts from here.
 * @property {CallOffConfirmation} [confirmation]
 * @property {readonly CallOffDelivery[]} [agreedDeliveries] The deliveries last agreed by BOTH sides (BL-66 (2); REQ-E10-01 edge case
 *   "measure against the latest date agreed by both sides"). Kept when the
 *   planner changes a call-off the supplier had confirmed and that confirmation
 *   was accepted; OTIF measures against these until the supplier confirms the
 *   change and it is accepted. Absent when nothing was ever agreed.
 * @property {string} [rejectionReason] -  The supplier's reason when it rejected the call-off.
 * @property {CallOffOrigin} [origin] Where the call-off came from, when not typed by the planner. `'engine'`: a
 *   draft the Order plan created from a forecast-engine recommendation
 *   (REQ-E14-05 BR-05). While the engine dataset is not live, such a draft is
 *   refused on release (X-03, owner decision 2026-09-23). Absent for every
 *   call-off created on the Call-offs page.
 * @property {readonly CallOffDispatch[]} dispatches
 * @property {readonly CallOffNote[]} notes
 * @property {MrpControllerRef} [mrpController] -  Material C4 — the material's MRP controller, projected at read (never stored).
 */

// ─── Inventory & capacity collaboration (REQ-E08-01 to REQ-E08-05) ─────────
//
// ONE inventory model (INVENTORY-REFERENT-01 closed): every row is a supplier ×
// material position PROJECTED AT READ from the supplier stock submissions (the
// InventoryDeclaration store), PTI's SAP stock and reorder point, the in-transit
// ASNs and call-off dispatch notices, and the forecast. Nothing here is stored,
// and nothing clock-derived (staleness, days of supply, bands) is a field: the
// pages compute those with the shared rules in `transitions/inventoryRules.js`.

/** Where an incoming quantity comes from (REQ-E08-01 BR-06). */
/** @typedef {'production' | 'asn' | 'dispatch'} IncomingSource */

/** One incoming quantity with its date — the per-date detail behind the aggregate. */
/**
 * @typedef {object} IncomingItem
 * @property {IncomingSource} source
 * @property {string | null} date -  Expected completion or arrival (`YYYY-MM-DD`); null when the supplier gave none.
 * @property {number} quantity
 * @property {string | null} reference -  The ASN number or call-off number the quantity rides on; null for production.
 */

/** An API sync attempt for a connected supplier (REQ-E08-02 BR-03). */
/**
 * @typedef {object} StockSyncAttempt
 * @property {string} id
 * @property {string} supplierId
 * @property {string} at
 * @property {'success' | 'failed'} outcome
 * @property {string} [errorKey] -  i18n key suffix of the business-language error, when it failed.
 */

/** Where the average daily demand came from (CR-01). */
/** @typedef {'forecast' | 'planningEstimate' | 'none'} DemandSource */

/**
 * @typedef {object} InventoryPosition
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} materialCode
 * @property {string} materialLabel
 * @property {MaterialType} materialType -  ROH = raw material, VERP = packaging (BR-07).
 * @property {string} materialGroup
 * @property {string} uom
 * @property {number | null} supplierSoh -  Latest supplier stock submission; null when the supplier never submitted.
 * @property {number | null} supplierRop -  The supplier's own reorder point; null reads "Not provided".
 * @property {number | null} ptiSoh -  PTI stock and reorder point from SAP. Null for a supplier without access.
 * @property {number | null} ptiRop
 * @property {boolean} ptiStockShared -  Whether PTI stock is shown on this row (always true for PTI users).
 * @property {boolean} consignment -  Consignment material (MN-INV-10).
 * @property {readonly IncomingItem[]} incoming
 * @property {number | null} avgDailyDemand -  CR-01 — forecast for the next 30 days ÷ 30; null when there is no demand.
 * @property {number | null} leadTimeDays CR-24 — the supplier's lead time for this material, in days (master data,
 *   not a clock state). Null when none is on record: the risk class then falls
 *   back to the CR-02 bands and a "lead time missing" alert is raised.
 * @property {DemandSource} demandSource
 * @property {string | null} lastUpdatedAt
 * @property {StockChannel | null} channel
 * @property {number} updateSla -  The data-update SLA for this supplier × material, in days (AC-05).
 * @property {string | null} staleAt Material B1 (MR-1 BR-05, AR-07) — the instant the figure turns stale, by
 *   the supplier's update mode: manual at the cutoff of the cycle after the
 *   last update, API `stale.apiHours` after the last successful pull, a BL-32
 *   override that many days after the last update. Null when there is no
 *   figure. Derived at read time, never stored (AD-1).
 * @property {string | null} lastPullFailedAt Material B1 (owner ruling 2026-09-29) — when the latest API pull failed
 *   after the figure on hand; null otherwise. A WARNING only: a failed pull
 *   does not make the figure stale — the figure goes stale `stale.apiHours`
 *   after the last SUCCESSFUL pull (`staleAt`).
 * @property {boolean} apiConnected
 * @property {StockSyncAttempt | null} lastSync -  The latest API sync attempt for this supplier, if any.
 * @property {readonly { readonly batchNumber: string; readonly qty: number; readonly manufacturingDate?: string; readonly expiryDate?: string; }[]} batches
 * @property {MrpControllerRef} [mrpController] -  Material C4 — the material's MRP controller (MR-5 BR-03), narrowed per reader.
 * @property {string} [tradeName] Material C2 — this supplier's APPROVED trade name for the material (MR-3
 *   BR-02), shown beside PTI's description. Projected at read, never stored;
 *   absent while no name is approved or the material is no longer assigned.
 */

// ─── Supplier trade names (Material C2 · MR-3 BR-01 to BR-06) ───────────────

/** Where one supplier trade name stands. `Replaced` = a later name took its place. */
/** @typedef {'Awaiting approval' | 'Approved' | 'Rejected' | 'Replaced'} MaterialNameState */

/**
 * One supplier's trade name for one PTI material, as recorded (MR-3 f). A
 * changed name is a NEW record; the earlier one moves to `Replaced` only when
 * the new one is approved (BR-02), so the approved name stays in use meanwhile.
 */
/**
 * @typedef {object} SupplierMaterialName
 * @property {string} id
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {string} tradeName
 * @property {string} [supplierMaterialNo] -  The supplier's own material number, when it gave one (at most 40 characters).
 * @property {MaterialNameState} state
 * @property {ActorAttribution} submittedBy -  From the session, never the form.
 * @property {string} submittedAt -  Store-assigned from the hub clock.
 * @property {ActorAttribution} [decidedBy]
 * @property {string} [decidedAt]
 * @property {string} [rejectionReason] -  Why Material Planning rejected it; the supplier sees this text.
 * @property {boolean} [loadedByPti] -  True when PTI loaded it in bulk, approved on load (BR-06).
 */

/**
 * One supplier × assigned material with its trade names, as the reader may see
 * it. A supplier reads its own assigned materials only (BR-03); PTI reads every
 * pair that carries a name. A material no longer assigned is left out, and so
 * are its names (edge case 2).
 */
/**
 * @typedef {object} MaterialNameRow
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} materialCode
 * @property {string} materialLabel -  PTI's description, through the material master resolver.
 * @property {SupplierMaterialName} [approved] -  The approved name in force, if any.
 * @property {SupplierMaterialName} [latest] -  The newest record for the pair (awaiting, rejected or approved), if any.
 * @property {readonly SupplierMaterialName[]} history -  Every record for the pair, oldest first.
 */

/** One entry in the supplier-access log (REQ-E08-03 BR-06). */
/**
 * @typedef {object} StockAccessLogEntry
 * @property {'grant' | 'change' | 'remove'} action
 * @property {readonly string[]} materials -  Empty = all materials the supplier supplies.
 * @property {string} at
 * @property {ActorAttribution} actor
 */

/** A supplier's access to PTI stock (REQ-E08-03). */
/**
 * @typedef {object} StockAccessGrant
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {boolean} active
 * @property {readonly string[]} materials -  Empty = all materials the supplier supplies.
 * @property {readonly StockAccessLogEntry[]} log
 */

/**
 * A reason code for allocation or commitment below demand (section 3.6) —
 * lists `capacityShortfall` / `commitmentShortfall`, the Hub administrator's
 * since BL-32, so a code's shape rather than a closed union.
 */
/** @typedef {string} CapacityReason */

/** One weekly bucket of a capacity submission (REQ-E08-04). */
/**
 * @typedef {object} CapacityWeekEntry
 * @property {string} week -  Monday of the week (`YYYY-MM-DD`).
 * @property {number} allocated
 * @property {number} [upside]
 * @property {CapacityReason} [reason]
 * @property {string} [note]
 */

/**
 * @typedef {object} CapacitySubmission
 * @property {string} id
 * @property {string} supplierId
 * @property {string} planningGroupId Material C5 (MR-8 BR-04) — the planning group the capacity is stated for.
 *   Was the SAP `materialGroup`; every earlier submission migrated to its SAP
 *   group's default planning group (`pg-<materialGroup>`).
 * @property {string} submittedAt
 * @property {readonly CapacityWeekEntry[]} weeks
 */

/** Capacity against demand for one supplier × planning group, 13 weekly buckets. */
/**
 * @typedef {object} CapacityPlan
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} planningGroupId -  Material C5 (MR-8 BR-04) — the planning group; its name comes from the store.
 * @property {readonly string[]} materials
 * @property {string} uom
 * @property {readonly { readonly week: string; readonly demand: number; readonly entry: CapacityWeekEntry | null; readonly needsReEntry?: true; }[]} weeks Material C5 (MR-8 BR-05) — materials moved into or out of the group after
 *   the latest submission, so the figure entered for this week no longer
 *   covers the group's materials. Present only when true; derived from the
 *   move time, never stored.
 * @property {CapacitySubmission | null} latest
 */

// ─── Forecast collaboration (REQ-E06-01 to REQ-E06-03) ──────────────────────
//
// A forecast VERSION is a ForecastPublication of one stream (packaging weekly,
// raw material monthly). A commitment is a RequirementResponse against a line.
// Every row below is PROJECTED AT READ; nothing clock-derived is a field — a
// line carries its deadline, and whether it is due soon or overdue is computed
// by `transitions/forecastRules.deadlineState` against the page's clock.

/** REQ-E06-01 BR-04 — Firm, Trade-off, Forecast (the commitment classes firm / semi-firm / visibility-only). */
/** @typedef {'firm' | 'tradeOff' | 'forecast'} ForecastZone */

/**
 * Where a line's commitment stands (REQ-E06-02, REQ-E06-03):
 *  · awaiting — nothing submitted for the current quantity (a changed period
 *    returns here on re-publication);
 *  · acknowledged — a Forecast-zone period the supplier acknowledged;
 *  · accepted — committed within tolerance (CR-21), no planner action;
 *  · exception — committed outside tolerance, for the planner;
 *  · acceptedByPlanner — the planner accepted the exception;
 *  · revisionRequested — the planner asked the supplier to revise.
 */
/**
 * @typedef {| 'awaiting'
 *   | 'acknowledged'
 *   | 'accepted'
 *   | 'exception'
 *   | 'acceptedByPlanner'
 *   | 'revisionRequested'} CommitmentState
 */

/** One version of a forecast stream, with who has opened it (REQ-E06-01). */
/**
 * @typedef {object} ForecastVersionView
 * @property {string} publicationId
 * @property {string} planVersion
 * @property {ForecastStream} stream
 * @property {number} version
 * @property {string} publishedAt
 * @property {boolean} emergency
 * @property {string | null} changeNote -  The planner's note when the version moved demand between suppliers.
 * @property {boolean} isCurrent
 * @property {readonly { readonly supplierId: string; readonly supplierName: string; readonly viewedAt: string | null; readonly changedPeriods: number; }[]} suppliers -  Suppliers with lines in this version; a supplier reads only itself.
 *    When the supplier first opened this version; null when not yet.
 *    BR-06 — this supplier's periods whose quantity moved against the previous version.
 */

/** One material × period of a supplier's current forecast, with its commitment. */
/**
 * @typedef {object} ForecastCommitmentLine
 * @property {string} key -  publicationId | supplier | material | period.
 * @property {ForecastStream} stream
 * @property {string} publicationId
 * @property {string} planVersion
 * @property {number} version
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} materialCode
 * @property {string} materialLabel
 * @property {string} materialGroup
 * @property {string} uom
 * @property {string} periodBucket -  A week (its Monday, `YYYY-MM-DD`) or a month (`YYYY-MM`).
 * @property {string} periodStart
 * @property {string} periodEnd
 * @property {ForecastZone} zone
 * @property {number} forecastQty
 * @property {number | null} previousQty -  The quantity in the previous version; null when the period was not in it.
 * @property {string} publishedAt -  When the current version was published (the deadline counts from it).
 * @property {string} dueAt -  CR-26 / REQ-E06-02 BR-07 — Firm: 1 working day; Trade-off and Forecast: 3
 *    working days after publication, on the hub calendar (BL-48, BL-50).
 * @property {string} reminderAt -  REQ-E06-03 BR-06 — the first reminder, at half the deadline.
 * @property {CommitmentState} state
 * @property {RequirementResponse | null} response -  The submitted commitment that stands for the current quantity.
 * @property {string | null} responseDueAt CR-26 — the deadline the standing response ANSWERED (its own version's
 *   publication and zone), so a carried-forward commitment keeps the verdict it
 *   earned. Derived from publications, never from a clock; null with no response.
 * @property {boolean} carriedForward -  True when that commitment answered an earlier version with the same quantity.
 * @property {RequirementResponse | null} draft -  The supplier's own unsubmitted draft (never in PTI's read — BR-10).
 * @property {number | null} committedQty
 * @property {readonly DisputeEntry[]} log -  REQ-E06-03 BR-05 — every revision request and note on this period, oldest first.
 * @property {readonly { readonly supplierId: string; readonly supplierName: string }[]} otherQualifiedSuppliers -  REQ-E06-03 BR-05 — the other suppliers qualified for the material (where demand can move).
 */

/**
 * REQ-E06-04 — one supplier × material × cycle of the fixed stock (FS)
 * reconcile: committed against called off against held, with the agreed
 * maximum stock and the outcome. Computed at read, never stored.
 */
/** @typedef {FsRow} FixedStockReconcileRow */

/** REQ-E06-03 BR-07 — supplier coverage per material, with distributor lead times (an estimate). */
/** REQ-E14-02 — the trailing windows the reliability read offers. */
export const RELIABILITY_WINDOWS = /** @type {const} */ ([13, 26]);
/** @typedef {(typeof RELIABILITY_WINDOWS)[number]} ReliabilityWindowWeeks */

/** One supplier's reliability row as served (REQ-E14-02). Computed at read, never stored. */
/**
 * `cfot`:  Delivered on the confirmed date (CFOT), per PO, on the engine data (`engine/cfot.agreedCfot`, BL-82).
 * `windowFrom`:  The window measured, inclusive (`YYYY-MM-DD`).
 *
 * @typedef {SupplierReliability & {
 *     readonly supplierName: string;
 *     readonly cfot: SupplierCfot;
 *     readonly windowFrom: string;
 *     readonly windowTo: string;
 *   }} SupplierReliabilityView
 */

/** One material's requirement as served (REQ-E14-03), with display names. */
/**
 * @typedef {MaterialPlan & {
 *     readonly materialLabel: string;
 *     readonly supplierName: string | null;
 *   }} MaterialPlanView
 */

/**
 * REQ-E14-03 — the material requirement run as served: computed at read on the
 * engine's (SIMULATED) dataset, never stored. PTI only; a supplier gets null.
 */
/**
 * `finishedGoodNames`:  Finished-good SKU → name, for the drill-in behind a gross requirement.
 *
 * @typedef {Omit<MaterialRequirementRun, 'materials'> & {
 *     readonly materials: readonly MaterialPlanView[];
 *     readonly finishedGoodNames: Readonly<Record<string, string>>;
 *   }} MaterialRequirementView
 */

/** One material's safety stock, safety lead time and ROP as served (REQ-E14-04). */
/**
 * `change`:  BR-06 (BL-116) — the change since the last run of the material's stream, and why.
 *
 * @typedef {MaterialSafetyStock & {
 *     readonly materialLabel: string;
 *     readonly supplierName: string | null;
 *     readonly change: SafetyStockChange;
 *   }} MaterialSafetyStockView
 */

/**
 * REQ-E14-04 — the safety-stock run as served: computed at read on the engine's
 * (SIMULATED) dataset with the administrator's targets in force. PTI only.
 */
/**
 * `previousAsOf`:  BR-06 — the last run each stream is compared with (X-04: packaging weekly, raw material monthly).
 *
 * @typedef {Omit<SafetyStockRun, 'materials'> & {
 *     readonly materials: readonly MaterialSafetyStockView[];
 *     readonly previousAsOf: { readonly packaging: string; readonly rawMaterial: string };
 *   }} SafetyStockView
 */

/** One material's E14-05 order plan as served, with display names. */
/**
 * @typedef {MaterialOrderPlan & {
 *     readonly materialLabel: string;
 *     readonly supplierName: string | null;
 *   }} MaterialOrderPlanView
 */

/**
 * @typedef {Omit<WarehousePlan, 'materials'> & {
 *     readonly materials: readonly MaterialOrderPlanView[];
 *   }} WarehousePlanView
 */

/**
 * REQ-E14-05 — the order plan as served: computed at read on the engine's
 * (SIMULATED) dataset with the cost rates in force (ENG-D6 placeholders). PTI
 * only; a supplier gets null.
 */
/**
 * `planMadeAt`:  The finished-goods plan snapshot the requirement used.
 * `previousAsOf`:  BR-03 compares against the run as of this day (last week's).
 *
 * @typedef {Omit<OrderPlanRun, 'warehouses'> & {
 *     readonly planMadeAt: string | null;
 *     readonly previousAsOf: string | null;
 *     readonly warehouses: readonly WarehousePlanView[];
 *   }} OrderPlanView
 */

/** REQ-E14-13 — display names beside an order line (a proposal or an information line). */
/**
 * @typedef {object} RescheduleLineNames
 * @property {string} materialLabel
 * @property {string | null} supplierName
 * @property {import('../sdc/types').Uom} uom
 */

/** @typedef {Proposal & RescheduleLineNames} RescheduleProposalView */
/** @typedef {InfoLine & RescheduleLineNames} RescheduleInfoView */

/**
 * @typedef {Omit<WarehouseReschedule, 'proposals' | 'info'> & {
 *     readonly proposals: readonly RescheduleProposalView[];
 *     readonly info: readonly RescheduleInfoView[];
 *   }} WarehouseRescheduleView
 */

/**
 * Material E1 (MR-7 BR-08) — which figure a planner input stands in for:
 * the supplier's SOH, its in-production quantity (with the completion date in
 * `date`), or a to-distributor leg (with its ETA in `date`).
 */
/** @typedef {'soh' | 'inProduction' | 'toDistributor'} SimulationOverrideField */

/**
 * Material E1 (MR-7 BR-06, BR-08; plan AD-1) — a planner's input to the stock
 * simulation, APPENDED (MAT-R3). It applies to the simulation only, until the
 * supplier's next stock record, and never changes the stock record or counts
 * for update compliance (MR-2). The latest input per field is the one in force.
 */
/**
 * @typedef {object} SimulationOverride
 * @property {string} id
 * @property {string} supplierId
 * @property {string} materialCode
 * @property {SimulationOverrideField} field
 * @property {number} value -  A quantity in the material's canonical unit.
 * @property {string} [date] -  `YYYY-MM-DD`: the completion date (inProduction) or ETA (toDistributor).
 * @property {ActorAttribution} enteredBy
 * @property {string} enteredAt
 */

/**
 * Material E2 (MR-7 section e) — one supplier × material row of the stock
 * simulation page at a check date: E1's `simulateSupplierStock` result, or its
 * refusal when the check date is before the latest stock record, with what
 * the page needs to name, filter and act on the row. Nothing here is stored
 * (AD-1). PTI only: a supplier scope reads an empty page.
 */
/**
 * @typedef {object} StockSimulationRow
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} materialCode
 * @property {string} materialLabel
 * @property {string} uom
 * @property {string | null} planningGroupId -  The material's planning group (MR-8), null when unknown.
 * @property {boolean} distributor -  MR-7 BR-09 — a distributor has a to-distributor term; a manufacturer has none.
 * @property {MrpControllerRef} [mrpController] -  Material C4 — the material's MRP controller, projected at read (never stored).
 * @property {boolean} sample A labelled sample row (the MR-7 section 9g worked example), computed on
 *   its own sample inputs so a reviewer can see the example on screen.
 * @property {StockSimulation | null} simulation -  The check date's simulation; null when refused.
 * @property {SimulationRefusal | null} refusal -  Edge case 6 — why there is no simulation (the check date is before the latest update).
 */

/**
 * REQ-E14-13 BR-07 / ENG-D16 — the Material Planner's record that a PO-line
 * proposal was taken to SAP (the Hub does not edit a PO). A ledger: the latest
 * mark per line is the one in force.
 */
/**
 * @typedef {object} SapChangeMark
 * @property {string} id
 * @property {string} lineId -  `po:<poNumber>#<line>` — the proposal's line id.
 * @property {string} poNumber
 * @property {number} line
 * @property {ProposalType} proposalType
 * @property {string | null} proposedDate -  Null for a cancellation.
 * @property {number} proposedQuantity
 * @property {string} markedAt
 * @property {ActorAttribution} markedBy
 */

/**
 * REQ-E14-13 — reschedule or cancel open orders, as served: computed at read
 * on the engine's (SIMULATED) dataset plus the Hub's open call-offs, with the
 * cost rates and threshold in force. PTI only; a supplier gets null.
 */
/**
 * `planMadeAt`:  The finished-goods plan snapshot the requirement used.
 * `planChange`:  BR-09 — E14-02's portfolio plan-change share over its window, before any proposal is sent.
 * `unconfirmedPoLines`:  Open PO lines not yet confirmed: not in the projection (E14-03's default), counted here.
 * `sapMarks`:  "Taken to SAP" marks, latest first.
 *
 * @typedef {Omit<RescheduleRun, 'warehouses'> & {
 *     readonly planMadeAt: string | null;
 *     readonly warehouses: readonly WarehouseRescheduleView[];
 *     readonly planChange: PlanChangeBaseline;
 *     readonly planChangeWindowWeeks: number;
 *     readonly unconfirmedPoLines: number;
 *     readonly sapMarks: readonly SapChangeMark[];
 *   }} RescheduleView
 */

/** REQ-E14-06 — one supplier × material, with its display names. */
/**
 * @typedef {SeriesResult & {
 *     readonly supplierName: string;
 *     readonly materialLabel: string;
 *     readonly uom: import('../sdc/types').Uom;
 *   }} StabilisedSeriesView
 */

/** REQ-E14-06 — the stabiliser run over one source of plan versions. */
/**
 * @typedef {Omit<StabiliseRun, 'series'> & {
 *     readonly series: readonly StabilisedSeriesView[];
 *   }} StabiliseRunView
 */

/**
 * REQ-E14-06 — stabilise and publish the plan, as served: computed at read on
 * the engine's (SIMULATED) dataset with the damping weight in force (X-05).
 * PTI only; a supplier gets null (X-03).
 */
/**
 * @typedef {object} StabilisedPlanView
 * @property {string} asOf -  The day the version to publish is made (the hub's present).
 * @property {string | null} planMadeAt -  The finished-goods plan snapshot today's requirement used.
 * @property {StabiliseParams} params
 * @property {{ readonly packaging: readonly string[]; readonly rawMaterial: readonly string[] }} versions -  The replayed version days per stream, oldest first (ENG-B30).
 * @property {StabiliseRunView} engine -  On the engine's material plan: E14-04 → E14-03, net requirement lot-for-lot (ENG-B29).
 * @property {StabiliseRunView} sapHistory -  On SAP's published plan history, the stand-in E14-02 measures (ENG-B33).
 * @property {true} rangeBuilt -  BR-06 — the demand range (P50 / P90, E14-09) is built: the Demand forecast page (BL-111).
 * @property {false} rangePublished BR-06 — and it is NOT beside the published quantity: the quantities here are
 *   material net requirements from SAP's plan (ENG-B66), and publishing from the
 *   engine is refused while its data is simulated (ENG-B35, ENG-B99).
 */

/**
 * REQ-E14-01 — the engine's data health, as served: every feed's last arrival
 * and freshness against the administrator's limit, its record count and the
 * feed spec's quality checks with the failing records by key, and the engine
 * steps each failure would affect. Computed at read on the engine's
 * (SIMULATED) dataset. PTI only; a supplier gets null.
 */
/**
 * `provenance`:  Where the dataset came from (X-03): SIMULATED until the MDM feed is live.
 *
 * @typedef {DataHealthReport & {
 *     readonly provenance: DatasetProvenance;
 *   }} DataHealthView
 */

/**
 * REQ-E14-07 — the finished-goods demand forecast, as served: weekly sell-in
 * per SKU for the next 26 weeks with the method that made it, SKU, brand and
 * total reconciled, OEM products left out, and SAP's plan in force beside it.
 * Computed at read on the engine's (SIMULATED) dataset. PTI only; a supplier
 * gets null. It does not feed E14-03: SAP's plan stays the input until the
 * backtest (E14-10) exists (ENG-B66).
 */
/**
 * `range`: REQ-E14-09 — P50, P90 (and the administrator's extra quantile) per SKU, brand, total and material, calibrated on a replay of the past year's forecasts, with how often actuals fell outside. Not published to suppliers and not read by E14-04 (ENG-B66, ENG-B97).
 * `provenance`:  Where the dataset came from (X-03): SIMULATED until the MDM feed is live.
 * `materialPlanningSource`:  The source E14-03 to E14-06 and E14-13 plan on today.
 * `skus`: REQ-E14-11 X-06 — `forecast` is the forecast SHOWN: the engine's with the planner overrides in force applied (ENG-B103); `engineForecast` is the engine's own. Without overrides the two are the same.
 * `overrideCells`:  Override cells of this run in force.
 *
 * @typedef {Omit<DemandForecastRun, 'skus' | 'brands' | 'total'> & {
 *     readonly range: DemandRangeRun;
 *     readonly provenance: DatasetProvenance;
 *     readonly materialPlanningSource: 'sapPlan';
 *     readonly skus: readonly DemandForecastSkuView[];
 *     readonly brands: readonly DemandForecastLevelView[];
 *     readonly total: DemandForecastLevelView;
 *     readonly overrideCells: number;
 *   }} DemandForecastView
 */

/**
 * `engineForecast`:  The engine's reconciled forecast, before overrides.
 * `overridden`:  Week indexes carrying a planner override.
 *
 * @typedef {SkuForecast & {
 *     readonly engineForecast: readonly number[];
 *     readonly overridden: readonly number[];
 *   }} DemandForecastSkuView
 */

/**
 * `engineForecast`:  The sum of its SKUs' engine forecasts, before overrides.
 *
 * @typedef {LevelForecast & {
 *     readonly engineForecast: readonly number[];
 *   }} DemandForecastLevelView
 */

/**
 * REQ-E14-11 X-06 — one planner override of one SKU × week of the demand
 * forecast: who, when, the old value, the new value, the engine's value and the
 * reason code. A ledger: the latest per cell is in force.
 */
/**
 * @typedef {Omit<OverrideRecord, 'recordedBy'> & {
 *     readonly recordedBy: ActorAttribution;
 *   }} ForecastOverride
 */

/**
 * REQ-E14-11 — forecast bias and planner override control, as served: the
 * tracking signal per SKU and material on the engine's forecast and on SAP's
 * plan (BR-01), the current run with the overrides applied, the override
 * ledger, and the override value report (BR-02, BR-03). Computed at read on
 * the engine's (SIMULATED) dataset. PTI only; a supplier gets null.
 */
/**
 * `current`:  The current forecast run, for the override panel: engine and shown values per SKU × week.
 * `overrides`:  Every override recorded, latest first.
 * `value`:  BR-02 / BR-03. Empty until overrides are entered and their weeks have sold.
 * `serviceJudgement`:  BR-04 — judging overrides by service needs E14-10's replay (BL-112); not here.
 * `materialPlanningSource`:  Overrides do not drive material planning (ENG-B66).
 *
 * @typedef {ForecastBiasRun & {
 *     readonly provenance: DatasetProvenance;
 *     readonly current: { readonly weeks: readonly string[]; readonly skus: readonly DemandForecastSkuView[]; readonly total: DemandForecastLevelView; };
 *     readonly overrides: readonly ForecastOverride[];
 *     readonly value: OverrideValueReport;
 *     readonly serviceJudgement: 'awaitsBacktest';
 *     readonly materialPlanningSource: 'sapPlan';
 *   }} ForecastBiasView
 */

/**
 * REQ-E14-10 — the model backtest, as served: per SKU, each candidate's
 * simulated fill rate, order-complete rate and warehouse space from replaying
 * PTI's ordering policy on its forecast at past origins, with MASC, accuracy
 * and bias beside them, and the model chosen under the MASC limit in force
 * (ENG-D13; not set = not enforced). On the engine's (SIMULATED) dataset. PTI
 * only; a supplier gets null. Material planning stays on SAP's plan: switching
 * it is the owner's decision (ENG-B66).
 */
/**
 * `provenance`:  Where the dataset came from (X-03): SIMULATED until the MDM feed is live.
 * `materialPlanningSource`:  The source E14-03 to E14-06 and E14-13 plan on today.
 * `computedInMs`:  How long the backtest took when it ran (ms, this device); it runs once per hub date and cost rates.
 *
 * @typedef {ModelBacktestResult & {
 *     readonly provenance: DatasetProvenance;
 *     readonly materialPlanningSource: 'sapPlan';
 *     readonly computedInMs: number;
 *   }} ModelBacktestView
 */

/**
 * @typedef {object} ForecastCoverageRow
 * @property {ForecastStream} stream
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} materialCode
 * @property {string} materialLabel
 * @property {string} uom
 * @property {number} firmDemandQty -  Σ Firm demand in the current version (CR-03 denominator).
 * @property {number | null} ratio -  CR-03 ratio; null when the supplier has no stock figures.
 * @property {'covered' | 'atRisk' | 'uncovered' | 'noFigures'} status
 * @property {'manufacturer' | 'distributor'} supplierType
 * @property {number | null} principalLeadTimeDays -  Shortest principal-to-distributor lead time, for a distributor.
 * @property {boolean} unbridgeable -  A distributor shortfall no principal order placed now can bridge in time.
 */

/**
 *  REQ-E08-05 BR-01 — committed quantity below forecast beyond tolerance (REQ-E06-03).
 *  CR-24 / BR-02 — no supplier lead time on record; the risk class fell back to CR-02.
 *  MR-6 BR-13 — a confirmed call-off due within the lead time is larger than declared SOH + production.
 *
 * @typedef {| 'ptiBelowRop'
 *   | 'supplierBelowRop'
 *   | 'projectedStockOut'
 *   | 'capacityBelowDemand'
 *   | 'staleData'
 *   | 'coverage'
 *   | 'commitmentBelowForecast'
 *   | 'leadTimeMissing'
 *   | 'callOffNotCovered'} InventoryAlertRule
 */

/** @typedef {'high' | 'medium' | 'low'} RiskClass */

/** CR-02 — the days-of-supply bands, used only where a lead time is missing. */
/** @typedef {'critical' | 'warning' | 'healthy' | 'excess'} SupplyBand */

/**
 * CR-24 — what a risk class was decided on, so a planner can see WHY a material
 * is High. Derived at read by `positionRisk` (inventoryRules), never stored.
 *   · leadTime       — days of cover against the supplier lead time.
 *   · fallbackBands  — no lead time on record, so the CR-02 bands decided.
 *   · noCover        — days of cover cannot be computed (no stock figures or no
 *                      demand); the class is Low and the stale-data alert speaks.
 *   · rule           — the alert's own rule set the class (stale data, the
 *                      commitment zone), not CR-24.
 */
/**
 * @typedef {| { readonly kind: 'leadTime'; readonly leadTimeDays: number; readonly daysOfCover: number }
 *   | { readonly kind: 'fallbackBands'; readonly band: SupplyBand; readonly daysOfCover: number }
 *   | { readonly kind: 'noCover'; readonly leadTimeDays: number | null }
 *   | { readonly kind: 'rule' }} RiskBasis
 */

/** A rule-based alert (REQ-E08-05). The key is rule × material (or group) × supplier. */
/**
 * @typedef {object} InventoryAlert
 * @property {string} key
 * @property {InventoryAlertRule} rule
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} subject -  The material, or the material group for a capacity alert.
 * @property {string} subjectLabel
 * @property {RiskClass} riskClass
 * @property {RiskBasis} riskBasis -  CR-24 — what the class was decided on (derived with the alert, never stored).
 * @property {number} daysToImpact MR-9 BR-03 — days until the risk bites, the order within a class (derived
 *   with the alert, never stored): days of cover or to the projected stock-out,
 *   days to the first capacity gap week, minus the days stale, else 0.
 * @property {'open' | 'closed'} status
 * @property {string} [closedAt]
 * @property {string} [closeReason] -  MR-9 BR-04 — the `alertClose` code; absent on a closure recorded before reasons (counts as Other).
 * @property {string} [actionNote]
 * @property {MrpControllerRef} [mrpController] -  Material C4 — the MRP controller of the material an alert is about. Absent
 *    on a capacity alert, whose subject is a material group.
 */

/**
 * @typedef {object} POSummary
 * @property {string} id
 * @property {string} poNumber
 * @property {string} supplierName
 * @property {POStatus} status
 * @property {number} totalValue
 * @property {string} orderDate
 * @property {number} daysOverdue
 */

// ─── Supplier-facing entities currently inline in pages ─────────────────────
// Mirrored from inline page declarations; gain `supplierId` so the data layer
// can enforce scoping structurally once fixtures are relocated (Batch 2).

/**
 * ⚠️ **THE GAP IS CLOSED: THIS UNION AND `getFlow('supplierDocument').states`
 * NOW HOLD THE SAME FOUR MEMBERS.** Every value here is a state the machine
 * declares, so `status` is only ever the dispatcher's cursor
 * (`supplierDocumentTarget.readState`) — never a clock word.
 *
 * ── ⚠️ `'Expiring Soon'` IS RETIRED FROM THIS UNION, AND NOT BECAUSE IT WAS
 *    WRONG ──────────────────────────────────────────────────────────────────
 *    RETIRED, quoted rather than deleted: *"THIS IS THE READ VOCABULARY, NOT
 *    THE FLOW'S `states`, AND THE GAP IS DELIBERATE AND PRE-EXISTING.
 *    `Expiring Soon` lives HERE ONLY, because it is a clock projection and law
 *    0.5 keeps it out of every transition table."*
 *
 *    Every clause of that was TRUE. What it did not say is what the gap COST:
 *    `status` is what `readState` reads, so the two fixture rows holding a
 *    clock word sat in a state no transition declares — **reachable by no
 *    verb, and silently excluded from any future one that says
 *    `from: ['Valid']`.** Measured before acting, with a working control:
 *    `doc-006` (`Awaiting Upload`) dispatched `done` while both `'Expiring
 *    Soon'` rows and an in-flow `'Valid'` row all refused
 *    `ILLEGAL_TRANSITION` — so there was no PRESENT harm, only a dated one.
 *    A clock word in a cursor is a legality answer waiting to be given by
 *    accident.
 *
 *    ⚠️ **THE RENDERED STATE DID NOT MOVE.** Both rows still compute
 *    `expiring` — `documentDisplayState` reads the clock, and the clock did
 *    not change. What went is the second opinion, not the answer.
 *
 * ── ⚠️ `'Expired'` IS RETIRED FROM THIS UNION (operator ruling) ─────────────
 *   The paragraph above used to name `Expiring Soon` **and `Expired`** together
 *   as the two projections. They were not a pair. Derived: `Expiring Soon` is
 *   written by the fixtures; **`'Expired'` was written by NOTHING** — no
 *   fixture row held it (0 of 16, tallied at runtime, not grepped), no function
 *   returned it, no transition reached it. It was renderable by the type and
 *   unreachable in fact: **the fabrication shape.**
 *
 *   The ruling, recorded because nothing in the tree recorded the intent:
 *   *"Expiring Soon is a warning window, Expired a terminal fact, and if the
 *   lane wanted both computed then Expiring Soon would have a producer too. It
 *   has none either."* Retiring costs one line to reverse if a compute path
 *   later wants it.
 *
 *   ⚠️ **AND THE PAGE ALREADY COMPUTES EXPIRY WITHOUT THIS MEMBER, WHICH IS
 *   WHY THE RETIREMENT IS BEHAVIOUR-PRESERVING RATHER THAN MERELY HARMLESS.**
 *   `SupplierDocuments.tsx` derives its expired KPI, its alert banner and its
 *   per-row "expired N days ago" from `daysUntil(expiryDate)` — never from
 *   `status`. The status member was not the source of the expiry story on the
 *   one surface that tells it. (The parenthetical here read *"`SupplierCerts
 *   ExpiringWidget` reads `status` instead, so the widget and the page
 *   disagree about what 'expiring' means — filed, not this batch's."* Closed
 *   at #317 and again at #324: all three surfaces read
 *   `documentDisplayState`, asserted by SITE.)
 *
 * ⚠️ **`Rejected` IS HERE FOR A THIRD REASON, WHICH MUST NOT BE CONFLATED WITH
 * EITHER.** `Expiring Soon` is absent from the flow because it is derived;
 * `Expired` is gone because nothing made it. **`Rejected` is a real machine
 * state:** §82 put it in `supplierDocument.flow.js` and
 * `t_supplierdoc_reject` targets it.
 *
 *   ⚠️ **THE SENTENCE THAT STOOD HERE SAID THE OPPOSITE, AND IS QUOTED RATHER
 *   THAN DELETED:** *"the flow declares three states (`Awaiting Upload` /
 *   `Under Review` / `Valid`)"* … *"**nothing PRODUCES `Rejected`.** No
 *   transition targets it and no verb writes it."* Both halves were true when
 *   written and were falsified by §82 without anyone editing this comment.
 *   Derive the states from `getFlow('supplierDocument')`, never from here —
 *   measured today it holds four, and `t_supplierdoc_reject` runs
 *   `Under Review` → **`Rejected`**, with `t_supplierdoc_submit` accepting
 *   `from: ['Awaiting Upload', 'Rejected']` so a refusal has an exit.
 *
 *   ⚠️ **THE DEAD END THIS COMMENT DESCRIBED IS GONE FROM THE CODE AND STILL
 *   OPEN IN THE REGISTER, AND THAT DIVERGENCE IS REPORTED RATHER THAN
 *   RESOLVED HERE.** `docs/findings.md` §80a still carries
 *   `SUPPLIERDOC-REJECT-LANDS-ON-AWAITING-UPLOAD-01` as **OPEN**, describing a
 *   `t_supplierdoc_reject` that lands on `Awaiting Upload`. The transition
 *   above does not do that any more. Closing a finding is the operator's
 *   ruling, so this states the measurement and names the conflict; it does not
 *   stamp the finding closed from a type declaration.
 */
/**
 * @typedef {| 'Valid'
 *   | 'Awaiting Upload'
 *   | 'Under Review'
 *   | 'Rejected'} SupplierDocumentStatus
 */

/**
 * @typedef {| 'Halal Compliance'
 *   | 'BPOM Regulatory'
 *   | 'Tax & Legal'
 *   | 'Quality'
 *   | 'Contract'
 *   | 'Other'} SupplierDocumentCategory
 */

/**
 * ⚠️ **WHAT A SUPPLIER STATES ABOUT A CERTIFICATE — AND THE WORD IS *STATES*,
 * NOT *UPLOADS*.** No file crosses this boundary, and the type says so by
 * carrying no file. §82 · operator ruling: *a control labelled Upload that
 * stores no file is the label-names-the-wrong-verb class, and this project has
 * closed it twice.*
 *
 * ⚠️ **AND THE PLATFORM CAN READ A FILE — IT CANNOT KEEP ONE.** The dispatched
 * premise was *"every other upload in the platform is a toast"*; measured, it is
 * not: `StockUploadPanel` (the Stock page) takes a real `<input type="file">`, parses the workbook
 * and renders its rows, and `SupplierShipments` / `SupplierRegistration` both
 * read `e.target.files[0].name` into form state. **What the tree has no seam for
 * is STORAGE and TRANSMISSION** — zero server code, no blob target, and
 * `SupplierDocument` has no file field of any kind (`fileType` / `fileSize` are
 * display strings; `fileName` does not exist on it at all). That distinction is
 * the one the surface must state, because the weaker claim — "we cannot read
 * files" — is false and a supplier could disprove it one screen over.
 *
 * ⚠️ **THE WHOLE OBJECT IS OPTIONAL AND ITS FIELDS ARE NOT** — the §80 refusal
 * trio's discipline, promoted from an asserted co-presence to a structural one.
 * There, `rejectionReason` / `rejectedAt` / `rejectedBy` travel together because
 * a test says so; here a nested object means a fixture *cannot* seed half a
 * declaration. Absence is honest and means one thing only: **nobody declared
 * this document** — every seeded row predates the verb.
 */
/**
 * @typedef {object} CertificateDeclaration
 * @property {CertType} certType - ⚠️ **A CLAIM UNTIL SOMEBODY CONFIRMS IT** (operator ruling, option C). The
 *   supplier declares the scheme; compliance confirms or refuses it. The gate
 *   cannot mistake the claim for a fact because it reads `lifecycleState`, and a
 *   declared document sits in `Under Review` until `t_supplierdoc_verify` fires.
 * @property {string} certNumber
 * @property {string} issuer -  The body that issued it, in the supplier's words.
 * @property {string} issuedOn
 * @property {string | null} expiresOn `null` when the certificate has none — a BPJPH cert has permanent validity
 *   under GR 42/2024, so `null` is the truth rather than a missing answer.
 *
 *   ⚠️ **AND FOR A LEGACY CERT THIS NUMBER IS NOT AUTHORITY.**
 *   `complianceProjection.js` records the statute: a GR-39 / MUI cert's term is
 *   **issuance plus four years REGARDLESS OF WHAT THE DOCUMENT PRINTS.** A
 *   supplier reading its own certificate types the printed date, so what lands
 *   here is what the paper says — which is exactly why it lands as a DECLARED
 *   value under review rather than as a registry fact.
 * @property {string} scopeText - ⚠️ **THE SUPPLIER'S OWN WORDS FOR WHAT THE CERTIFICATE COVERS — AND IT IS
 *   FREE TEXT ON PURPOSE, NOT FOR WANT OF A BETTER FIELD.** The halal gate joins
 *   on `ComplianceRegistryEntry.materialCodes`: **Paragon's SAP material codes,
 *   at raw-material grain, from Paragon's master data.** A supplier does not hold
 *   that vocabulary, and this tree's two fixture families do not even agree about
 *   the same supplier — sup-007's registry rows cover `FR-ROUD-4470` and four
 *   others while its documents link to three `PK-PETB-88xx` codes, **intersection
 *   empty**, both sets non-empty. Asking for codes would be asking for a guess,
 *   and a guessed code joins silently and wrongly. **A sentence cannot be
 *   mistaken for a join key.** Compliance assigns codes at verify.
 * @property {string} declaredAt -  When the declaration was recorded. Store-assigned, never payload-supplied —
 *    the `pinnedAt` discipline: a caller that could set it could backdate its own
 *    submission against an expiry deadline.
 * @property {ActorAttribution} declaredBy - ⚠️ **ALWAYS `UNATTRIBUTED` IN THIS TREE**, for `rejectedBy`'s reason and by
 *   the same type: `CurrentIdentity.actor` is `UNATTRIBUTED:
 *   NO_PERSON_IN_SESSION` everywhere, and typing this as `ActorAttribution`
 *   rather than `string` means the surface must RENDER the unattributed state
 *   instead of printing a name it does not have (C10 §5.2 / D-ID-3).
 */

/**
 * @typedef {object} SupplierDocument
 * @property {string} id
 * @property {string} supplierId
 * @property {string} name
 * @property {SupplierDocumentCategory} category
 * @property {SupplierDocumentStatus} status
 * @property {string} issuedBy
 * @property {string} issuedDate
 * @property {string | null} expiryDate
 * @property {string} fileType
 * @property {string} fileSize
 * @property {string} version
 * @property {string} linkedTo
 * @property {string} [notes]
 * @property {string} [rejectionReason] - ⚠️ **THE THREE REFUSAL FIELDS TRAVEL TOGETHER OR NOT AT ALL** — a reason
 *   with no timestamp is an accusation with no date, and a timestamp with no
 *   reason is the dead end restated. `supplierDocumentRefusal.test.js` asserts
 *   the co-presence in both directions, so a later fixture cannot seed half of
 *   one.
 *
 *   The authored refusal text. Free prose, shown to the SUPPLIER verbatim — the
 *   standard `DisputeEntry.text` set one tenancy over, where the buyer's reason
 *   renders beside the supplier's own words.
 * @property {string} [rejectedAt] -  When the refusal was recorded. Rendered beside the reason, never alone.
 * @property {ActorAttribution} [rejectedBy] - ⚠️ **ALWAYS `UNATTRIBUTED` IN THIS TREE, AND THE TYPE IS WHAT KEEPS THAT
 *   HONEST.** `CurrentIdentity.actor` is `UNATTRIBUTED: NO_PERSON_IN_SESSION`
 *   everywhere, so a refusal cannot name a person; typing this as
 *   `ActorAttribution` rather than `string` means the surface must RENDER the
 *   unattributed reason instead of printing a name it does not have. C10 §5.2 /
 *   D-ID-3 — no typed-name attribution until session-resolved identity exists.
 * @property {string} [verifiedAt] Material G1 (MR-10, plan AD-2) — when compliance verified the document
 *   (`t_supplierdoc_verify`). Store-assigned from the hub clock, never a payload
 *   field. The qualification history replays from it: a document counts toward
 *   a level from this instant. Absent on every seeded row, which predates the
 *   verb; those count from their `issuedDate`.
 * @property {CertificateDeclaration} [declaration] The certificate details the supplier stated, present only on a DECLARED
 *   document. See `CertificateDeclaration` — the whole object is optional and
 *   its fields are not, so half a declaration cannot exist.
 */

// ─── Invoice — DR-7: ONE canonical machine + persona projections ──────────────
// The invoice is ONE economic document. `InvoiceStatus` is the single canonical
// lifecycle stored on the entity; the two persona vocabularies below
// (`SupplierInvoiceStatus`, `BuyerInvoiceStatus`) are PROJECTION LABELS derived
// at read time (see `invoiceProjection.js`), never independently stored. This is
// DR-7 (ratified 2026-07-06): two-machines-plus-mapping was rejected on the
// HALAL-XPERSONA-01 drift precedent. `Overdue` is computed (DR-8, law 0.5); the
// 3-way `matchStatus` is the match sub-flow's rolled-up terminal (census G2).

/** Canonical invoice lifecycle (the stored truth). `Releasing Payment` is the
 *  Option-B SAP interim; the real FI document is minted only on settlement. */
/**
 * @typedef {| 'Draft'
 *   | 'Submitted'
 *   | 'Matched'
 *   | 'Approved'
 *   | 'Releasing Payment'
 *   | 'Payment Released'
 *   | 'Remittance Received'
 *   | 'Disputed'} InvoiceStatus
 */

/** SUPPLIER-persona projection labels of `InvoiceStatus` (+ computed Overdue). */
/**
 * @typedef {| 'Draft'
 *   | 'Pending Approval'
 *   | 'Approved'
 *   | 'Payment Released'
 *   | 'Remittance Received'
 *   | 'Overdue'
 *   | 'Disputed'} SupplierInvoiceStatus
 */

/** @typedef {'WhatsApp' | 'Web' | 'Email' | 'API'} InvoiceChannel */

/** The canonical invoice entity — the ONE row the store holds and both persona
 *  reads project from (`toSupplierInvoice` / `toBuyerInvoice`). Fields are the
 *  union of what each surface needs; persona reads select + relabel. */
/**
 * @typedef {object} Invoice
 * @property {string} id
 * @property {string} invoiceNumber
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} poNumber
 * @property {string} poId
 * @property {number} amount
 * @property {string} currency
 * @property {InvoiceStatus} status
 * @property {InvoiceMatchStatus} matchStatus -  Match sub-flow rolled-up terminal (census G2); surfaced on the buyer read.
 * @property {string} submittedDate
 * @property {string} dueDate
 * @property {string | null} paymentDate
 * @property {string | null} paymentRef
 * @property {string | null} sapFiDoc
 * @property {string | null} sapGrDoc
 * @property {string} bankAccount
 * @property {InvoiceChannel} channel
 * @property {string} approver
 * @property {string} paymentTerms
 * @property {string} buyerContact
 * @property {string | null} remittanceNote
 * @property {InvoiceLine[]} [lines] REQ-E07-07 — the invoiced lines, pre-filled from the goods receipts the
 *   supplier selected. Absent on invoices that predate receipt-based invoicing
 *   (those are still matched when a receipt posts).
 * @property {string} [invoiceDate] -  The supplier's invoice date (`YYYY-MM-DD`).
 * @property {string} [taxInvoiceFile] -  Tax invoice (e-Faktur) attachment — the file name only in the prototype.
 * @property {string} [returnReason] -  Finance's reason when it returned the invoice to the supplier.
 */

/** One invoiced line, drawn from one goods receipt line (REQ-E07-07). */
/**
 * @typedef {object} InvoiceLine
 * @property {string} receiptId -  The goods receipt the quantity was received on (its id).
 * @property {string} grNumber
 * @property {string} materialCode
 * @property {string} description
 * @property {number} quantity -  Invoiced quantity — at most accepted minus already invoiced (BR-02).
 * @property {string} [uom]
 * @property {number} unitPrice -  The PO unit price for this material (CR-12 basis).
 * @property {string} [contractNumber] CR-12 — the PO line's contract, copied with its price when the line is
 *   pre-filled (and refused if it differs from the PO): it decides whether the
 *   line is checked at 0% or at 2% within the rupiah cap.
 * @property {number} [billedAmount] What the supplier billed for this line, when the invoice states it per
 *   line. Absent: the line is billed at quantity × unit price, and any
 *   difference on the invoice total is not split by line.
 */

/**
 * The status list a supplier follows (REQ-E07-07 step 5, plus Returned). A
 * read-time label of the stored `InvoiceStatus`, never stored itself.
 */
/**
 * @typedef {| 'Draft'
 *   | 'Submitted'
 *   | 'Verified'
 *   | 'Scheduled for payment'
 *   | 'Paid'
 *   | 'Returned'} SupplierInvoiceStage
 */

/**
 * @typedef {object} SupplierInvoice
 * @property {string} id
 * @property {string} supplierId
 * @property {string} invoiceNumber
 * @property {string} poNumber
 * @property {number} amount
 * @property {SupplierInvoiceStatus} status
 * @property {string} submittedDate
 * @property {string} dueDate
 * @property {string | null} paymentDate
 * @property {string | null} paymentRef
 * @property {string} bankAccount
 * @property {string | null} sapFiDoc
 * @property {InvoiceChannel} channel
 * @property {string} buyerContact
 * @property {string | null} remittanceNote
 * @property {SupplierInvoiceStage} stage -  REQ-E07-07 — the supplier's status list, derived at read time.
 * @property {boolean} overdue -  CR-14 — past its due date and not paid. Derived at read time.
 * @property {number} daysOutstanding -  CR-14 — whole days past the due date (0 when not overdue).
 * @property {InvoiceMatchStatus} matchStatus -  The match result (CR-12 / CR-13), shown to the supplier.
 * @property {InvoiceLine[]} lines
 * @property {string | null} invoiceDate
 * @property {string | null} taxInvoiceFile
 * @property {string | null} returnReason
 */

/** BUYER-persona projection labels of `InvoiceStatus` (+ computed Overdue). */
/**
 * @typedef {| 'Pending Match'
 *   | 'Approved'
 *   | 'Disputed'
 *   | 'Payment Released'
 *   | 'Overdue'} BuyerInvoiceStatus
 */

/**
 * @typedef {| 'Matched'
 *   | 'Pending GR'
 *   | 'Qty Mismatch'
 *   | 'Price Variance'
 *   | 'Pending'} InvoiceMatchStatus
 */

/**
 * @typedef {object} BuyerInvoice
 * @property {string} id
 * @property {InvoiceStatus} lifecycleState THE CANONICAL LIFECYCLE STATE, carried alongside the display label.
 *
 *   ⚠️ **`status` ABOVE IS A LOSSY DISPLAY LABEL AND MUST NEVER GATE AN ACTION.**
 *   `toBuyerLabel` collapses `Approved` into the computed `Overdue` once the due
 *   date passes, and collapses the Option-B interim `Releasing Payment` into
 *   `Payment Released`. Both collapses are deliberate and both destroy exactly
 *   the distinction a "what may I do here?" question needs. This field is the
 *   un-collapsed truth, and it is what `userVerbsFrom('invoice', …)` is asked.
 *
 *   Display reads `status`; legality reads `lifecycleState`. Keeping them as two
 *   fields is what makes the confusion a type error rather than a silent
 *   wrong answer.
 * @property {string} invoiceNumber
 * @property {string} supplierName
 * @property {string} supplierId
 * @property {string} poNumber
 * @property {string} poId
 * @property {number} amount
 * @property {string} currency
 * @property {BuyerInvoiceStatus} status
 * @property {string} receivedDate
 * @property {string} dueDate
 * @property {string | null} paymentDate
 * @property {InvoiceMatchStatus} matchStatus
 * @property {string | null} sapFiDoc
 * @property {string | null} sapGrDoc
 * @property {string} approver
 * @property {string} paymentTerms
 * @property {number} daysOutstanding
 * @property {string} bankAccount
 * @property {InvoiceChannel} channel
 * @property {InvoiceLine[]} lines -  REQ-E07-07 — the invoiced lines and the supplier's documents.
 * @property {string | null} invoiceDate
 * @property {string | null} taxInvoiceFile
 * @property {string | null} returnReason
 */

/**
 *  REQ-E07-04 — withdrawn by the supplier before receipt. A cancelled ASN no
 *  longer counts toward the PO line's open quantity or the in-transit figure.
 * MR-6 BR-08 — a line arrives with less than the minimum remaining shelf
 * life, and the supplier asked Quality for an exception. Not in transit, not
 * receivable, still cancellable. Approval moves it to Submitted; rejection
 * returns it to Draft.
 *
 * @typedef {| 'Draft'
 *   | 'Submitted'
 *   | 'In Transit'
 *   | 'Delivered'
 *   | 'Discrepancy'
 *   | 'Cancelled'
 *   | 'Awaiting exception'} AsnStatus
 */

/**
 * @typedef {object} AsnLineItem
 * @property {string} materialCode
 * @property {string} description
 * @property {number} orderedQty
 * @property {number} shippedQty
 * @property {string} lotNumber -  The batch number (REQ-E07-04 BR-04). Kept under its original field name.
 * @property {string} [uom] -  Unit of the shipped quantity, from the PO line.
 * @property {string} [expiryDate] -  Optional expiry date of the batch (`YYYY-MM-DD`).
 * @property {MrpControllerRef} [mrpController] -  Material C4 — the line material's MRP controller, projected at read (never stored).
 * @property {'declared' | 'typed'} [batchSource] MR-6 BR-04 — `declared` when the batch was picked from the supplier's
 *   declared stock, `typed` when it was typed ("not in declared stock", shown
 *   to PTI). Absent on a line with no batch yet, and on lines stored before
 *   the rule existed.
 */

/**
 * @typedef {object} AsnShipmentDetails
 * @property {string} originCity
 * @property {string} destinationWarehouse
 * @property {number} totalCartons
 * @property {number} grossWeightKg
 * @property {string} temperatureRequirement
 */

/**
 * @typedef {object} ASN
 * @property {string} asnNumber
 * @property {string} supplierId
 * @property {string} poReference
 * @property {AsnStatus} status
 * @property {string} carrier
 * @property {string} [threePlId] BL-51 / REQ-E07-04 BR-05 — the 3PL on the administrator's list this ASN
 *   travels with (`tpl-…`). Absent when the carrier was entered by name. It is
 *   what turns `trackingNumber` into a link to the 3PL's public tracking page;
 *   an absent or unknown id shows the number as plain text.
 * @property {string} trackingNumber
 * @property {string} eta
 * @property {AsnShipmentDetails} details
 * @property {AsnLineItem[]} lineItems
 * @property {string} [shipDate] -  Ship (dispatch) date, `YYYY-MM-DD` (REQ-E07-04 BR-04).
 * @property {string} [packingListFile] -  Packing list attachment — the file name only in the prototype.
 * @property {string} [overShipReason] -  Why the shipped quantity exceeds the open quantity (BR-02), when it does.
 * @property {string} [callOffId] -  The call-off this ASN ships (REQ-E09-03 BR-06). Absent for a PO-level ASN.
 * @property {boolean} [callOffFinal] MR-6 BR-10 — the supplier marks this ASN as the last one for its call-off.
 *   Only then is shipping less than the agreed quantity a warning.
 * @property {readonly CallOffWarning[]} [callOffWarnings] MR-6 BR-12 — the call-off warnings shown at submit, kept for the record.
 *   The planner's "Mismatch" marker is recomputed on read (edge case 6); this
 *   copy is never the current comparison.
 * @property {AsnShelfLifeEvent[]} [shelfLifeException] MR-6 BR-08 / BR-09 — the shelf-life exception record, APPENDED (MAT-R3):
 *   each request, each decision and each ETA change that reopened it is a new
 *   entry; nothing earlier is edited. Whether an exception stands is derived
 *   from the entries (`shelfLifeExceptionOf`). Absent until the first request.
 */

/** MR-6 BR-10 / BR-11 — how an ASN differs from its call-off. */
/** @typedef {'qtyOver' | 'qtyUnder' | 'early' | 'late' | 'material' | 'unlinked'} CallOffWarningKind */

/** The figures behind one call-off warning (only the ones its kind needs). */
/**
 * @typedef {object} CallOffWarningDetail
 * @property {string} [callOffNumber] -  The call-off the ASN ships.
 * @property {number} [shipped] -  qtyOver / qtyUnder — the call-off's shipped total (earlier ASNs plus this one) and agreed total.
 * @property {number} [agreed]
 * @property {number} [pct] -  qtyOver / qtyUnder — the difference as a percentage of the agreed total.
 * @property {number} [limit] -  qtyOver — `callOff.overPct`; early — `callOff.earlyAllowanceDays`.
 * @property {string} [eta] -  early / late — the ASN's ETA and the agreed date it was compared with.
 * @property {string} [agreedDate]
 * @property {number} [days]
 * @property {string} [materialCode] -  material / unlinked — the ASN line's material.
 * @property {string} [expectedMaterial] -  material — the call-off's material.
 * @property {readonly string[]} [callOffNumbers] -  unlinked — the open confirmed call-offs on the PO line.
 */

/**
 * @typedef {object} CallOffWarning
 * @property {CallOffWarningKind} kind
 * @property {CallOffWarningDetail} detail
 */

/** MR-6 BR-08 — one line an exception covers, as it stood when it was asked for. */
/**
 * @typedef {object} AsnShelfLifeLine
 * @property {string} materialCode
 * @property {string} lotNumber
 * @property {string} expiryDate
 * @property {number} minMonths -  The minimum remaining shelf life in force for the material, in months.
 */

/**
 * MR-6 BR-09 — one entry of an ASN's shelf-life exception record. `by` is the
 * session's actor, never a payload field.
 *   requested   — the supplier asked, with a reason, at an ETA, for these lines
 *   etaChanged  — the supplier moved the ETA past the approved one (edge case 1);
 *                 the earlier approval stays in the record, and a new decision is owed
 *   approved    — Quality approved; the goods are received into blocked stock
 *   rejected    — Quality refused, with a reason; the ASN is back in Draft
 */
/**
 * @typedef {| {
 *       kind: 'requested';
 *       at: string;
 *       by: ActorAttribution;
 *       reason: string;
 *       eta: string;
 *       lines: AsnShelfLifeLine[];
 *     }
 *   | {
 *       kind: 'etaChanged';
 *       at: string;
 *       by: ActorAttribution;
 *       previousEta: string;
 *       eta: string;
 *       lines: AsnShelfLifeLine[];
 *     }
 *   | { kind: 'approved'; at: string; by: ActorAttribution; reason?: string }
 *   | { kind: 'rejected'; at: string; by: ActorAttribution; reason: string }} AsnShelfLifeEvent
 */

/**
 * @typedef {object} CatalogItem
 * @property {string} id
 * @property {string} supplierId
 * @property {string} material -  The supplier's own name for the item. ⚠️ THIS IS A MEANING, and until
 *    2B-5a the material census could not read it — `meaningOf` matched
 *    `/description/i` and this key is called `material`
 *    (`MEANING-SCOPE-IS-A-HAND-PICK-01`).
 * @property {string} sapCode - ⚠️ **A POINTER, NOT AN IDENTITY — DECLARED AT 2B-5a (operator ruling R-D).**
 *
 *   This field is **not** the catalogue item's identity (`id` is) and **not** a
 *   code space of its own. It is **the supplier's assertion of which PARAGON
 *   MASTER CODE their catalogue item corresponds to** — a claim about someone
 *   else's space, entered by the party that does not own it.
 *
 *   The evidence for that reading, rather than an assertion of it: the field is
 *   named `sapCode` and not `materialCode`; the supplier's own storefront form
 *   labels it **"SAP code (optional)"** — Paragon runs the SAP, and an
 *   OPTIONAL field cannot be an identity; and of the five values authored, two
 *   pointed at codes in `paragon.asn_chase_lane` **under the matching supplier
 *   on both sides**, which is what a pointer looks like when it works.
 *
 *   ⚠️ **CONSEQUENCES OF THE DECLARATION, and they are not tidy.**
 *     · A value here **must resolve to `MATERIAL_MASTER`**. One of five does
 *       (`PK-PETB-8803`, corrected at 2B-5a per R-D — it read `MAT-10045`, a
 *       code no Paragon space contains, carrying the master's own label for
 *       that material byte-for-byte).
 *     · `MAT-30110` / `MAT-40220` point into the ASN lane and resolve **there**,
 *       not in the master. They are correct pointers into a space booked for
 *       retirement, and they repoint when **2B-5b** retires the seven.
 *     · `MAT-10046` / `MAT-10089` resolve **nowhere**. They are unbacked claims
 *       and no batch has ruled on them.
 *     · **A SUPPLIER-ENTERED POINTER IS NEVER EVIDENCE OF A CORRESPONDENCE.**
 *       C9 §4's rule applies unchanged: a claim entered by one party about
 *       another party's space is an ADOPTION at best, and this one carries no
 *       provenance at all — no method, no source of truth, no route to
 *       resolution. It must not be joined on.
 *
 *   Pinned by `storefrontPointer.test.js`, which asserts the exact disposition
 *   of all five rather than a count.
 * @property {string} category
 * @property {string} moq
 * @property {string} uom
 * @property {string} leadTime
 * @property {string} unitPrice
 * @property {string} currency
 * @property {string[]} certs
 * @property {string} capacity
 * @property {boolean} visible
 */

/**
 * @typedef {| 'valid'
 *   | 'expiring'
 *   | 'expired'
 *   | 'missing'
 *   | 'pending'} ProfileCertStatus
 */

/**
 * @typedef {object} ProfileCert
 * @property {string} supplierId
 * @property {string} name
 * @property {boolean} visible
 * @property {ProfileCertStatus} status
 * @property {string | null} expiry
 * @property {string | null} [uploaded] D-4: upload provenance — when the current document was filed (null when the
 *   cert is missing / not yet uploaded).
 */

/**
 * @typedef {object} StorefrontProduct
 * @property {string} supplierId
 * @property {string} name
 * @property {string} code
 * @property {string} moq
 * @property {string} leadTime
 */

// ─── Performance / KPI snapshots ────────────────────────────────────────────

/** @typedef {'↑' | '↓' | '→'} KpiTrend */

/**
 * @typedef {object} KpiPoint
 * @property {string} name
 * @property {string} value
 * @property {string} target
 * @property {number} pct
 * @property {number} targetPct -  Target position on the same 0–100 axis as `pct` (DP2-TARGET-01 tick +
 *    derived meeting/near/missing colour). Replaces the hand-assigned hex.
 * @property {KpiTrend} trend
 */

/**
 * @typedef {object} RadarPoint
 * @property {string} axis
 * @property {number} value
 * @property {number} target
 */

/**
 * @typedef {object} KpiSnapshot
 * @property {KpiPoint[]} kpis
 * @property {RadarPoint[]} radar
 * @property {PerformancePoint[]} trend
 * @property {ImprovementAction[]} improvementActions
 */

/**
 * @typedef {object} ImprovementAction
 * @property {string} kpi
 * @property {string} current
 * @property {string} target
 * @property {string} gap
 * @property {string} action
 * @property {'High' | 'Medium' | 'Low'} priority
 */

/** @typedef {'7d' | '30d' | '90d' | '12m'} TrendRange */

/**
 * @typedef {object} PerformancePoint
 * @property {string} week
 * @property {number} otif
 * @property {number} asnAcc
 * @property {number} defect
 * @property {number} ackHrs
 */

// ─── Supplier scorecard (buyer-side performance intelligence) ───────────────
// Portfolio scorecard: one record per active supplier, read buyer-only (the
// scorecard spans the whole network — a supplier does not see the cross-network
// grading view). D-2: the improvement-plan actions and the compliance issue are
// per-supplier OPTIONAL fields on the record, not shared consts keyed by name.

/** @typedef {'A' | 'B' | 'C' | 'D'} ScorecardGradeLetter */

/**
 * @typedef {object} ScorecardKpi
 * @property {string} name
 * @property {string} value
 * @property {string} target
 * @property {number} pct
 * @property {number} targetPct -  Target position on the same 0–100 axis as `pct` (DP2-TARGET-01).
 * @property {KpiTrend} trend
 */

/**
 * @typedef {object} ScorecardRadarAxis
 * @property {string} axis
 * @property {number} value
 */

/** @typedef {'Completed' | 'Active' | 'Open' | 'Resolved'} CommLogStatus */

/**
 * @typedef {object} CommLogEntry
 * @property {string} date
 * @property {string} type
 * @property {string} channel
 * @property {string} message
 * @property {CommLogStatus} status
 */

/** @typedef {'expired' | 'expiring' | 'missing'} ScorecardComplianceLevel */

/**
 * @typedef {object} ScorecardComplianceIssue
 * @property {ScorecardComplianceLevel} level
 * @property {string} label
 */

/** @typedef {'In Progress' | 'Pending'} ScorecardActionStatus */

/**
 * @typedef {object} ScorecardImprovementAction
 * @property {string} item
 * @property {string} due
 * @property {string} owner
 * @property {ScorecardActionStatus} status
 */

/**
 * @typedef {object} SupplierScorecard
 * @property {string} id
 * @property {string} name
 * @property {string} country
 * @property {string} category
 * @property {string} tier
 * @property {string} sapBp
 * @property {string} channel
 * @property {QualificationLevel} [qualification] REQ-E10-01 — THE GRADE AND THE SCORE ARE NOT STORED. Both used to be
 *   authored here beside authored KPI rows; both are now read from the
 *   calculated measures for the period the page is showing
 *   (`services/data/performanceRules.js`). `id` is the SUPPLIER MASTER id, which
 *   is what makes that join real rather than by-name.
 *
 *   Material G1 (MR-10 BR-09) — the free-text relationship status that stood
 *   here ("Preferred Supplier" / "Approved Supplier") is retired. The vendor's
 *   standing is its computed qualification level, PROJECTED AT READ from its
 *   documents (`getSupplierScorecards`) and absent on the fixture row. The
 *   improvement-plan state it also carried is `impPlan`.
 * @property {ScorecardKpi[]} kpis
 * @property {ScorecardRadarAxis[]} radar
 * @property {number[]} otifTrend
 * @property {number[]} ackSpeedTrend
 * @property {number[]} defectTrend
 * @property {boolean} [impPlan]
 * @property {CommLogEntry[]} commLog
 * @property {ScorecardComplianceIssue | null} [complianceIssue] D-2: folded off the page's shared IMPROVEMENT_ACTIONS / COMPLIANCE_ISSUES
 *   consts so per-supplier data lives on the per-supplier record.
 * @property {ScorecardImprovementAction[]} [improvementActions]
 */

// ─── Purchase requisitions (buyer-side ACQUIRE stage) ───────────────────────
// The starting point of procurement (PR → Approval → Source check → PO or
// Sourcing Event). A buyer-only internal document — suppliers never see PRs.
// D-3: quantity and estimatedValue are NUMERIC (not pre-formatted strings), so
// the render layer owns locale formatting via formatNumber / formatIDR.

/**
 * @typedef {| 'Draft'
 *   | 'Pending Approval'
 *   | 'Approved'
 *   | 'Sourcing Event'
 *   | 'PO Created'
 *   | 'Rejected'} PRStatus
 */

/** @typedef {'High' | 'Medium' | 'Low'} PRPriority */

// C7 §4 producer provenance — WHICH producer emitted this intake line. The ONE
// provenance that belongs on the entity: it is a producer FACT, not liveness
// (registry-derived) and not plan-state (the C6 PLANNED overlay, never merged into
// a committed seam row). Optional/nullable — existing fixtures and manual PRs omit
// it; a Grid- or SOMO-produced line carries it (G1.1).
/** @typedef {'INTERNAL_GRID' | 'SOMO'} PrSource */

/**
 * @typedef {object} PurchaseRequisition
 * @property {string} id
 * @property {string} prNumber
 * @property {string} material
 * @property {string} category
 * @property {number} quantity
 * @property {string} uom
 * @property {string} requiredDate
 * @property {number} estimatedValue
 * @property {string} requestor
 * @property {string} costCenter
 * @property {PRStatus} status
 * @property {string} createdDate
 * @property {string} approvalLevel - ⚠️ **RENAMED FROM `approver` AT §68, AND THE OLD NAME WAS THE DEFECT.**
 *   Nothing ever wrote it: `create` sets `''`, `applyTransition` touched only
 *   `status`, and the fixture's values are ROLE BANDS — `'VP Procurement'`,
 *   `'Procurement Head'`, `'Section Head'` — that correlate with
 *   `estimatedValue` and are populated on **`Draft` and `Pending Approval` rows
 *   nobody has approved** (`pr-004` is `Pending Approval` and carries
 *   `'Section Head'`). A field
 *   populated before the act it names cannot be a record of that act.
 *
 *   So it is the DESTINATION the value routes to, not the person who decided —
 *   the same class as a button whose label names a verb it does not dispatch,
 *   one layer down in a DTO. Who actually decided is `approvedBy`, below.
 *
 *   ⚠️ **AUTHORED, NEVER DERIVED — AND §69 MEASURED IT RATHER THAN ASSUMING
 *   IT.** The values track `estimatedValue` closely enough to read as a
 *   computed band, and nothing computes them: there is **not one relational or
 *   arithmetic read of `estimatedValue` anywhere in the tree**, and no
 *   threshold number exists in `src/` or `docs/`. Re-derived every run by
 *   `approvalBandAuthored.guard.test.js`; the surface now SAYS it is authored.
 *
 *   ⚠️ **AND THE BAND RULE IS NOT MERELY UNBUILT — IT IS UNBUILDABLE TODAY, ON
 *   TWO INDEPENDENT GROUNDS (§69).** A band decides either WHO MAY APPROVE,
 *   which needs seniority roles the platform does not have and C10 §3.4 forbids
 *   minting (*"a new role per band"*), or HOW MANY APPROVALS ARE REQUIRED,
 *   which needs the `ApprovalPolicyAct` × `ApprovalAct` ledgers C10 §3.5
 *   defers. Either ground alone is sufficient, so closing one does not unblock
 *   it.
 *
 *   ⚠️ **THE POLICY HOOK IS NOT THE BLOCKER, AND THE CONTRARY IS THE PREMISE
 *   THAT MUST NOT BE INHERITED.** A hook on `t_pr_approve` can ALREADY read
 *   this document (`ctx.target.readEntity` — four shipped hooks do) and the
 *   session's roles (`ctx.scope.businessRoles`). What is missing is the
 *   RIGHT-HAND SIDE of the comparison, not the left.
 *
 *   `''` is the ONE representation of "not assigned" — `t_pr_create` writes it
 *   and `pr-005` carries it. `pr-005` used to carry a literal `'—'`, which is
 *   the render fallback written into the data, so an unassigned band and an
 *   empty field displayed as the same glyph.
 * @property {string} sourceOfSupply
 * @property {string} linkedDoc
 * @property {PRPriority} priority
 * @property {string} justification
 * @property {PrSource} [source]
 * @property {string} [rejectionReason] Why the requisition was rejected — written by `t_pr_reject` and by nothing
 *   else. Absent until a rejection happens; it is NOT cleared by `t_pr_revise`,
 *   because "why this came back" is the one thing a requester needs while they
 *   are revising it, and clearing it on the way to Draft would delete the
 *   explanation at exactly the moment it becomes useful.
 *
 *   ⚠️ OPTIONAL ON THE DTO, REQUIRED ON THE VERB — and the split is deliberate.
 *   A `Draft` PR has no rejection to explain, so a non-optional field would
 *   force every intake-created row to carry an empty string that reads like an
 *   answer. The REQUIREMENT lives where the act is (`requiredFields` +
 *   `PR_REJECT_REASON_AUTHORED`), which is the only place it can be enforced.
 * @property {string} [revisionNote] What changed, written by `t_pr_revise` and by nothing else.
 *
 *   ⚠️ **THE FIELD DID NOT EXIST UNTIL §68, WHILE THE VERB HAD REQUIRED IT
 *   SINCE PF-1a.** `requiredFields: ['revisionNote']` refused the dispatch
 *   without it and `applyTransition` then dropped the text on the floor — a
 *   FULL ENFORCEMENT CHAIN TERMINATING IN NOTHING, and sharper than the
 *   `rejectionReason` case one edge over, because there was no field to
 *   disappoint. Same repair, same four parts: optional on the DTO, required on
 *   the verb, non-blank by policy hook, and PERSISTED.
 *
 *   Optional for the same reason `rejectionReason` is: a requisition that has
 *   never been revised has no note, and a non-optional field would force every
 *   intake-created row to carry an empty string that reads like an answer.
 * @property {import('@lib/enforcement').ActorAttribution} [approvedBy] - ⚠️ **WHO APPROVED IT — the field `approver` was never able to be.**
 *   Written by `t_pr_approve` from the SESSION (`QueryScope.actor`), never from
 *   the payload: C10 §6.2 half one, *"a caller that could set it could backdate
 *   its own audit entry"*, which applies with more force to WHO than to WHEN.
 *   That is why `t_pr_approve` gained a policy hook and NOT a required payload
 *   field — a payload field would have been a second instance of `setBy`'s
 *   attribution-by-assertion, the very seam §6 exists to close.
 *
 *   Today it is ALWAYS `UNATTRIBUTED: NO_PERSON_IN_SESSION`, because nothing in
 *   shipped code constructs a `RESOLVED` actor (§2.3) and
 *   `PR_APPROVAL_ATTRIBUTED` refuses one supplied by a caller. **That is an
 *   honest absence and it is the point** — it names a failure somebody can go
 *   and fix, where the old surface named 'Procurement Head' and nobody could
 *   tell it had not happened.
 */

// ─── PR-intake line (C7 §2 — one shape, two producers) ──────────────────────
// Promoted to the service seam at Phase A/1 (getPrIntake) so the intake REVIEW
// surface is a real consumer, not a page-local const reader (FORK-B=b2). SOMO-
// authored fields (suggestedSource lane, segment) are read-only + nullable for a
// Grid line. Quantity carries THREE values (C7 §2.1: suggested / accepted /
// wasAdjusted — the fact of adjustment is itself the audit signal). Liveness is
// NOT a field — it is registry-derived (purchaseRequisitions, gate-2 shut →
// SIMULATED). Plan-state IS a per-row field (the C6 overlay axis). `deficit` is
// the recommend-first "why" a review triages on (C7 §2; FORK-D — bomContext and
// shortfall deferred: shortfall is structurally 0 until SOMO's Phase-4 solve).
/** @typedef {'PLANNED' | 'committed'} IntakePlanState */

/**
 * @typedef {object} PrIntakeLine
 * @property {string} id
 * @property {string} material
 * @property {string | null} suggestedSource -  SOMO-authored source/destination lane; null for an internal-Grid line.
 * @property {string | null} segment -  SOMO-authored ABC-XYZ policy class; null for an internal-Grid line.
 * @property {number} suggestedQty
 * @property {number} acceptedQty
 * @property {boolean} wasAdjusted
 * @property {string} uom
 * @property {string} period
 * @property {number} estimatedValue
 * @property {PrSource} source
 * @property {IntakePlanState} planState
 * @property {string} [deficit] -  C7 §2 recommend-first rationale — the "why" a review triages on. Nullable.
 */

// ─── Risk / Compliance entities (buyer-side, inline today) ──────────────────

/** @typedef {'critical' | 'high' | 'medium' | 'low' | 'info'} RiskLevel */
/** @typedef {'critical' | 'high' | 'medium' | 'low'} RiskSeverity */
/** @typedef {'critical' | 'warning' | 'info'} RiskAlertLevel */

/**
 * @typedef {object} RiskAlert
 * @property {string} id
 * @property {RiskAlertLevel} level
 * @property {string} title
 * @property {string} body
 */

/**
 * @typedef {object} GeoRisk
 * @property {string} region
 * @property {string} country
 * @property {string} flag
 * @property {RiskSeverity} severity
 * @property {number} score
 * @property {'rising' | 'stable' | 'declining'} trend
 * @property {string} event
 * @property {string} impact
 * @property {string} exposure
 * @property {string[]} suppliers
 * @property {string} mitigation
 * @property {number} probability
 * @property {string} timeline
 */

/**
 * @typedef {object} ExposureRow
 * @property {string} category
 * @property {string} supplier
 * @property {string} region
 * @property {number} spend
 * @property {number} dos
 * @property {RiskSeverity} risk
 * @property {boolean} dualSource
 */

/** @typedef {'ok' | 'expiring' | 'expired'} ComplianceState */

/**
 * @typedef {object} ComplianceRow
 * @property {string} supplier
 * @property {string} type
 * @property {string} expires
 * @property {ComplianceState} status
 */

// ── Compliance registry — census #11–15 → ONE canonical machine (I3.1) ─────────
// The 5 fragmented compliance vocabularies (SupplierDocumentStatus /
// ProfileCertStatus / ScorecardComplianceLevel / ComplianceState /
// ComplianceItemStatus) collapse to ONE machine. `ComplianceRegistryEntry` is the
// DTO-v2 shape that canonical machine reads through — grain = supplier × raw-
// material × certificate (the Spine). It SUPERSEDES the thin `ComplianceRow`
// above (deprecated-at-birth): supplierId-keyed (not name-keyed), and every
// clock/scheme value is COMPUTED at read time (`complianceProjection.js`), never
// stored (law 0.5). Fixture-backed + SIMULATED until the Track-R harvest lands.

/** Certificate scheme/type. Distinguishes BPJPH (mandate-satisfying) from the
 *  MUI-legacy scheme (non-compliant after 17 Oct 2026) — the issuer axis the old
 *  `status === 'Valid'` check was blind to (HALAL-ISSUER-BLIND-01). */
/**
 * @typedef {| 'HALAL_BPJPH'
 *   | 'HALAL_MUI_LEGACY'
 *   | 'HALAL_FOREIGN'
 *   | 'BPOM'
 *   | 'ISO'
 *   | 'OTHER'} CertType
 */

/** Raw-material grouping (Spine: cert grain is supplier AND raw-material level). */
/**
 * @typedef {| 'fragrance'
 *   | 'actives'
 *   | 'emulsifiers'
 *   | 'botanicals'
 *   | 'contract-mfg'
 *   | 'other'} MaterialCategory
 */

/** The canonical compliance lifecycle — TRANSITION-states only (census §4). Clock
 *  decay (Expiring/Expired) is NOT here — it is a read projection (law 0.5). */
/** @typedef {'Missing' | 'Under Review' | 'Valid'} ComplianceLifecycleState */

/** The COMPUTED-at-read display status: the lifecycle state plus clock decay
 *  (law 0.5). Never stored; derived in `complianceProjection.js`. */
/**
 * @typedef {| 'Missing'
 *   | 'Under Review'
 *   | 'Valid'
 *   | 'Expiring'
 *   | 'Expired'} ComplianceDisplayStatus
 */

/**
 * ⚠️ **WHETHER SAP HAS SEEN THIS ROW — AND TODAY IT NEVER HAS.**
 *
 * The honest-marker discipline applied to a STORE rather than to a surface:
 * **a row that cannot say whether SAP has seen it is a row that implies SAP
 * has.** Every registry row read as SAP-held before this field existed, not
 * because anything claimed it but because nothing denied it, and a certificate
 * a supplier confirmed on the portal was indistinguishable from one S/4HANA
 * actually holds.
 *
 * ── ⚠️ ONE MEMBER, AND THAT IS A MEASUREMENT, NOT A PLACEHOLDER ────────────
 *   The reachable-value set is derived from what this platform can KNOW, and
 *   the derivation returns exactly one answer. There is **no outbound transport
 *   anywhere in `src/services/`** — `fetch` / `axios` / OData / Event Mesh all
 *   return zero — so no row in this tree, present or future, can have been
 *   acknowledged by SAP. `AWAITING_SYNC` is not the default arm of a wider
 *   union; it is the whole of it.
 *
 *   ⚠️ **A SECOND MEMBER IS DELIBERATELY NOT AUTHORED.** An enum with an
 *   unreachable member is the class this project has closed repeatedly, and the
 *   shipped precedent for the one-member answer is one directory over:
 *   `MaterialRefusalReason = 'UNKNOWN_MATERIAL'` — *"One reason today; the type
 *   is the extension point."* The day a second value becomes reachable is
 *   exactly the day a sync exists, which is F1's seam and not this batch's.
 *
 * ── ⚠️ AND IT IS NOT THE HARVEST GATE, WHICH POINTS THE OTHER WAY ──────────
 *   `HARVEST_GATED.compliance` (`services/liveness/registry.ts`) says *the
 *   portal has no real data yet* — INBOUND, per CAPABILITY. This says *the
 *   portal holds this row and SAP does not* — OUTBOUND, per ROW. The two are
 *   independent, and the harvest gate goes quiet on the day the first real
 *   certificate is entered, which is precisely the day this field starts
 *   carrying the whole statement.
 */
/** @typedef {'AWAITING_SYNC'} SapSyncState */

/** One row of the compliance registry — grain: supplier × material × certificate.
 *  The DTO-v2 the canonical compliance machine reads. STORED fields only; every
 *  clock/scheme-derived value is computed by `complianceProjection.js`. */
/**
 * @typedef {object} ComplianceRegistryEntry
 * @property {string} id
 * @property {string} supplierId -  The FK that reconciles the name-vs-id split across personas
 *    (HALAL-XPERSONA-01) and scopes the read per-supplier.
 * @property {string} supplierName
 * @property {readonly string[]} materialCodes -  SAP material codes this certificate covers (raw-material grain).
 * @property {MaterialCategory} materialCategory
 * @property {CertType} certType
 * @property {string} certNumber
 * @property {string} issuer
 * @property {string | null} issueDate
 * @property {string | null} expiryDate -  `null` = unknown, NEVER guessed (a blank expiry on a required cert is itself
 *    a finding) — and also `null` for a BPJPH cert, whose validity is permanent
 *    under GR 42/2024 so no expiry exists to record. (D-A: this sentence used to
 *    say "permanent-basis", naming the deleted `certBasis` field; the FACT is a
 *    property of the cert TYPE and survives the field's removal.)
 * @property {ComplianceLifecycleState} lifecycleState -  The STORED transition-state (Missing/Under Review/Valid). The display status
 *    is computed from this + the clock, never stored.
 * @property {SapSyncState} sapSync Whether S/4HANA has acknowledged this row. **REQUIRED, never optional** —
 *   an optional marker absent on every row is exactly "a row that cannot say",
 *   which is the defect this field exists to close. Contrast the Pattern-B
 *   identity fields (`SchedulingAgreement.sapAgreementNumber` et al), where
 *   absence is honest BECAUSE presence would be a value SAP assigns; this is a
 *   STATE, not an identity, so it must be stated rather than inferred.
 * @property {string} scopeText
 * @property {string} notes
 */

/**
 * @typedef {object} Commodity
 * @property {string} name
 * @property {string} unit
 * @property {number} current
 * @property {number} change
 * @property {number} alert
 * @property {'above' | 'below'} alertDir
 * @property {string} color
 * @property {{ t: number; v: number }[]} spark
 */

// Scenario modeling (buyer-side). A modeled disruption scenario with its
// quantified impact and a set of response alternatives.
/** @typedef {'high' | 'medium' | 'low'} ScenarioFeasibility */

/**
 * @typedef {object} ScenarioAlt
 * @property {string} id
 * @property {string} name
 * @property {string} cost
 * @property {string} leadTime
 * @property {ScenarioFeasibility} feasibility
 * @property {string} details
 */

/**
 * @typedef {object} Scenario
 * @property {string} id
 * @property {string} label
 * @property {string} title
 * @property {string} description
 * @property {Record<string, string>} impact
 * @property {ScenarioAlt[]} alternatives
 */

// ─── Discovery / Recommendation entities (buyer-side, inline today) ─────────

// ── ⚠️ `GlobalSupplier` IS DELETED — `DISCOVERY-REAL-SUBJECTS-01`, batch C ───
//   The read-model for the discovery candidate cards: eight real corporations
//   carrying a `matchScore`, an employee count, a founding year and a superlative
//   `description`. NOBODY COMPUTED THE SCORE — no engine, no weights, no inputs.
//   The page was never useful; it was CONVINCING, and that is what made it
//   dangerous.
//
//   The TYPE goes with the fixture, deliberately. Keeping an unread interface
//   would leave the shape sitting there as an invitation to repopulate it, and
//   the ruling (Option 4) is that real candidate names must be UNREACHABLE, not
//   merely absent: they can only ever arrive FROM A SOURCE. When a discovery feed
//   lands, the type it needs is the SOURCE's shape, not this one.
//   `IDiscoveryService.getGlobalSuppliers` is removed with it.

/**
 * @typedef {object} RecommendedSupplier
 * @property {string} id
 * @property {string} name
 * @property {string} country
 * @property {string} flag
 * @property {number} matchScore
 * @property {string} whyRecommended
 * @property {string} covers
 * @property {string} [riskNote]
 * @property {string} storefrontPath
 */

/** @typedef {'On Track' | 'At Risk' | 'Blocked'} QualificationStatus */

/**
 * @typedef {object} QualificationItem
 * @property {string} supplier
 * @property {string} flag
 * @property {number} stage
 * @property {string} stageName
 * @property {number} stageTotal
 * @property {string} startDate
 * @property {string} owner
 * @property {string} nextAction
 * @property {string} dueDate
 * @property {QualificationStatus} status
 */

/**
 * @typedef {object} MarketIntelCard
 * @property {string} category
 * @property {string} marketStatus
 * @property {number} suppliersGlobal
 * @property {number} suppliersParagon
 * @property {string} priceTrend
 * @property {'up' | 'down' | 'flat'} priceDir
 * @property {string} recommendation
 */

/** @typedef {'Critical' | 'High' | 'Medium'} SingleSourceRiskLevel */

/**
 * @typedef {object} SingleSourceItem
 * @property {string} material
 * @property {string} category
 * @property {string} currentSupplier
 * @property {string} risk
 * @property {SingleSourceRiskLevel} riskLevel
 * @property {string[]} suggestedAlternatives
 */

// ─── Buyer dashboard aggregates (command-center, buyer-only) ────────────────
// Not supplier-scoped: production lines are internal to Paragon and supplier-
// health rows span multiple suppliers. Served buyer-only (supplier sees empty).

/**
 * @typedef {object} ProductionLineRow
 * @property {string} line
 * @property {string} category
 * @property {'low' | 'medium' | 'high'} risk
 * @property {string} riskLabel
 * @property {number} coverDays
 * @property {number} blockedSkus
 */

/**
 * @typedef {object} SupplierHealthRow
 * @property {string} name
 * @property {number} score
 * @property {'A' | 'B' | 'C' | 'D'} grade
 */

// ─── Analytics (buyer-side aggregate reporting) ─────────────────────────────
// Portfolio-level procurement intelligence — spend, performance, channel mix.
// Not per-supplier-scoped; served buyer-only (supplier sees empty / null).

/** @typedef {'A' | 'B' | 'C' | 'D'} AnalyticsGrade */

/**
 * @typedef {object} SpendCategoryRow
 * @property {string} category
 * @property {number} value
 * @property {string} color
 */

/**
 * @typedef {object} TopSupplierSpend
 * @property {string} supplier
 * @property {number} spend
 */

/**
 * @typedef {object} MonthlyOtifRow
 * @property {string} month
 * @property {number} otif
 * @property {number} otdr
 */

/**
 * @typedef {object} MonthlyPoRow
 * @property {string} month
 * @property {number} pos
 * @property {number} cycleTime
 */

/**
 * @typedef {object} MonthlyChannelMix
 * @property {string} month
 * @property {number} whatsapp
 * @property {number} web
 * @property {number} email
 * @property {number} api
 */

/**
 * @typedef {object} AnalyticsPerfRow
 * @property {string} supplierId REQ-E10-01 — the row names a SUPPLIER, and the name, the category, the OTIF
 *   and the grade are all resolved from the master and the calculated measures
 *   at read. The row used to carry an authored `otif` and `grade` beside a
 *   supplier NAME that matched no master record; both are gone.
 * @property {number} otdr -  Still SAMPLE: nothing in the hub measures on-time delivery rate yet.
 * @property {string} ackSpeed -  Still SAMPLE: acknowledgement speed is not measured from hub data.
 * @property {string} invoiceMatch -  Still SAMPLE: first-time invoice match rate is not measured from hub data.
 * @property {KpiTrend} trend
 */

// Headline KPI card — value + subtitle text + semantic tone (drives icon/color).
/** @typedef {'success' | 'warning' | 'danger' | 'neutral'} KpiTone */

/**
 * @typedef {object} AnalyticsKpi
 * @property {string} value
 * @property {string} subtitle
 * @property {KpiTone} tone
 */

/**
 * @typedef {object} AnalyticsSummary
 * @property {AnalyticsKpi} totalSpend
 * @property {AnalyticsKpi} activeSuppliers
 * @property {AnalyticsKpi} avgCycleTime REQ-E10-01 — `portfolioOtif` is NOT here any more. It was an authored string
 *   ("87%") and it is now computed for the chosen period from the call-offs the
 *   hub holds, on the page, beside the chips that decide the period.
 */

// ─── Filter inputs (lean shapes; expanded as pages migrate) ─────────────────

/**
 * @typedef {object} POFilter
 * @property {POStatus | POStatus[]} [status]
 * @property {string} [supplierId]
 * @property {string} [dateFrom]
 * @property {string} [dateTo]
 */

/**
 * @typedef {object} InventoryFilter
 * @property {string} [supplierId]
 * @property {string} [materialCode]
 */

/**
 * Material E2 (MR-7 step 2) — the stock simulation's narrowing in the read.
 * The material search and the PIC filter run on the page over the rows.
 */
/**
 * @typedef {object} StockSimulationFilter
 * @property {string} [supplierId]
 * @property {string} [planningGroupId]
 */

/**
 * @typedef {object} RFQFilter
 * @property {RFQStatus | RFQStatus[]} [status]
 * @property {RFQCategory | RFQCategory[]} [category]
 * @property {string} [invitedSupplierId]
 */

/**
 * @typedef {object} QuotationFilter
 * @property {string} [rfqId]
 * @property {string} [supplierId]
 * @property {QuotationStatus | QuotationStatus[]} [status]
 */

/**
 * @typedef {object} ShipmentFilter
 * @property {ShipmentStatus | ShipmentStatus[]} [status]
 * @property {ShipmentMode | ShipmentMode[]} [mode]
 * @property {string} [supplierId]
 */

/**
 * @typedef {object} ASNFilter
 * @property {AsnStatus | AsnStatus[]} [status]
 */

/**
 * @typedef {object} GRFilter
 * @property {GRStatus | GRStatus[]} [status]
 * @property {string} [supplierId]
 */

/**
 * @typedef {object} InvoiceFilter
 * @property {BuyerInvoiceStatus | SupplierInvoiceStatus} [status]
 * @property {string} [supplierId]
 * @property {string} [poNumber]
 */

/**
 * @typedef {object} ContractFilter
 * @property {ContractStatus | ContractStatus[]} [status]
 * @property {ContractType | ContractType[]} [type]
 * @property {string} [supplierId]
 */

/**
 * @typedef {object} ObligationFilter
 * @property {string} [contractId]
 * @property {ObligationStatus | ObligationStatus[]} [status]
 * @property {ObligationOwner} [owner]
 */

/**
 * @typedef {object} PRFilter
 * @property {PRStatus | PRStatus[]} [status]
 */

// ─── Command layer (v2.2 Step 3.4–3.9) — the write contract ─────────────────
//
// Reads throw DataError; commands report their outcome as a status. Hard
// authorization failures (NOT_FOUND / SCOPE_DENIED) still throw DataError — the
// dispatcher enforces QueryScope on EVERY command exactly as reads (DR-6
// amended). Domain rejections (illegal transition, missing fields, role,
// policy) resolve as `status: 'failed'` with a reason and an emitted event.

/** @typedef {'done' | 'submitted' | 'failed'} CommandOutcome */

/** A command to fire one transition on one entity. */
/**
 * A governed-decision record (C6-LOCK, the locked-override rule — G1.2b). Opaque
 * to the dispatcher: it is forwarded VERBATIM onto the DR-10 `TransitionEvent` so
 * the audit itself captures WHY a human overrode a platform value (actor + `ts`
 * are already on the event). The one human-authored substance write in the plan
 * grid is a quantity override; a computed/derived value is never writable, so a
 * `decision` never annotates one. Mirrors the optional `causationId` passthrough
 * — additive to the seam, not a new event type.
 */
/**
 * @typedef {object} CommandDecision
 * @property {string} field -  The field the human adjusted (e.g. `acceptedQty`).
 * @property {number} from -  The platform-suggested value.
 * @property {number} to -  The human-accepted value.
 * @property {string} reason -  The required justification — a silent override is forbidden (C6-LOCK §8.3).
 * @property {boolean} wasAdjusted -  True when `to !== from` (a genuine override); false for accept-as-suggested.
 */

/**
 * @typedef {object} CommandInput
 * @property {string} transitionId -  The transition id to fire (e.g. `t_po_confirm`).
 * @property {string} entity -  The entity/flow key (e.g. `purchaseOrder`).
 * @property {string} [entityId] The target entity's id. OMITTED for `creation` transitions — the entity
 *   does not exist yet and the store assigns its id (returned on the result).
 *   Required for every non-creation transition.
 * @property {Record<string, unknown>} [payload] -  requiredFields live here; validated by the dispatcher.
 * @property {string} [expectedState] THE STATE THIS COMMAND WAS PREPARED AGAINST — the caller's compare-and-set
 *   precondition (1c).
 *
 *   When present, the dispatcher refuses `STALE_STATE` unless the entity's
 *   CURRENT transition-state equals this string. When absent the command is
 *   evaluated exactly as before, which is why the field is OPTIONAL: every
 *   existing caller omits it and none changes behaviour.
 *
 *   ⚠️ **THIS IS A STATE PRECONDITION, NOT A REVISION PRECONDITION, AND THE
 *   DIFFERENCE IS THE WHOLE OF WHAT IT DOES NOT COVER.** It catches a
 *   concurrent move that leaves the act STILL LEGAL — where the from-set
 *   contains the state the other actor landed on, so `ILLEGAL_TRANSITION`
 *   stays silent and the second caller writes over a document that moved.
 *   It catches NOTHING about content: a requisition whose payload was revised
 *   under you while the state held is invisible here, because the state is
 *   identical and this compares states. It is equally blind to a concurrent
 *   `statePreserving` verb, which by construction leaves the state where it
 *   was. Both need an entity REVISION, which no store carries; see
 *   `staleState.test.js`, which derives all three populations every run.
 *
 *   The optionality is load-bearing in the other direction too: a REQUIRED
 *   precondition would refuse every caller that has not been migrated, and
 *   today that is all of them.
 * @property {string} [idempotencyKey] THE INGRESS REPLAY KEY (H2a) — the external event's OWN identity, carried
 *   through so the same event cannot raise a second act.
 *
 *   ⚠️ **THIS IS NOT `correlationId`, AND THE DIFFERENCE DECIDES WHY IT HAD TO
 *   BE A NEW FIELD.** `correlationId` is minted by the dispatcher
 *   (`deps.nextCorrelationId()`, called at exactly one site) and every existing
 *   lookup — `statuses`, `pending`, `owners` — is keyed by it. All of them
 *   answer *"what happened to a command WE issued?"*, which is idempotency for
 *   a RESPONSE (`settle` resolves a SAP callback to the command it settles).
 *   What was absent is idempotency for an EVENT THEY RECEIVE and turn into a
 *   command we never issued: there is no key the CALLER controls, so a
 *   redelivered event had nothing to collide with. C7-FIND-05.
 *
 *   ⚠️ **THE KEY IS THEIRS, NOT OURS, AND THAT IS A CONTRACT — "CARRY IT
 *   THROUGH", NEVER "DERIVE ONE".** A transport that is at-least-once
 *   redelivers THE SAME MESSAGE; redelivery is only a meaningful word because
 *   the message has an identity, and that identity is the key. A backend that
 *   minted its own would have to derive it from payload content, and two
 *   genuinely distinct events with equal content would then collapse into one
 *   — a lost act, silently. If a producer supplies no identity, the honest
 *   answer is that this boundary cannot be made idempotent, not that we invent
 *   one for it.
 *
 *   OPTIONAL, and the optionality is the `expectedState` precedent verbatim:
 *   absent, the command is evaluated exactly as before, which is why every
 *   existing caller is untouched and none changes behaviour. Absent ⇒ NO
 *   dedupe — never a silent default.
 *
 *   ⚠️ **IT IS NOT A GENERAL DEDUPE OVER USER ACTIONS.** A person pressing
 *   approve twice is a different problem with an answer this platform already
 *   gives: `expectedState` refuses `STALE_STATE`, the machine refuses
 *   `ILLEGAL_TRANSITION`, and the delivery verbs refuse `ALREADY_CONFIRMED` /
 *   `ALREADY_RELEASED`. Those are REFUSALS on purpose — a person who clicked
 *   twice must be told the second click did nothing. This field answers the
 *   opposite case, where the caller is a transport that never intended a
 *   second act, and `idempotencyKey.test.js` asserts no user surface passes it.
 * @property {CommandDecision} [decision] The governed-decision provenance (C6-LOCK). Present only when this dispatch
 *   carries a human override — the dispatcher forwards it verbatim to the audit
 *   event; it participates in NO validation (opaque).
 */

/** The synchronous result of dispatching a command. */
/**
 * @typedef {object} CommandResult
 * @property {string} correlationId
 * @property {string} transitionId
 * @property {CommandOutcome} status
 * @property {string} [reason] -  Set when `status === 'failed'` — the machine-readable rejection reason.
 * @property {string} [entityId] The target entity's id. For a `creation` command this is the id the store
 *   ASSIGNED (e.g. the new ASN number); for others it echoes the input id.
 */

/** A command's recorded status, read back via `getCommandStatus`. */
/**
 * @typedef {object} CommandStatus
 * @property {string} correlationId
 * @property {string} transitionId
 * @property {CommandOutcome} status
 * @property {string} ts
 */

/** The single dispatcher seam. The Phase-3 real adapter implements the same. */
/**
 * @typedef {object} ICommandService
 * @property {(scope: QueryScope, input: CommandInput, causationId?: string) => Promise<CommandResult>} dispatch Validate (legality + role + fields + scope + policy) then apply.
 *
 *   `causationId` (SDC-3a — the SubmissionSession seam) groups this command's
 *   DR-10 events with an earlier command WITHOUT collapsing its own
 *   correlationId (`getCommandStatus` stays 1:1) — the exact DR-10 semantics
 *   cascades already use. In a multi-object SubmissionSession the FIRST
 *   command's correlationId is the anchor; commands 2..n pass it here so the
 *   whole visit shares one audit group. Absent ⇒ a directly-initiated command
 *   (the common case). Never a sessionId — that would overload DR-10.
 * @property {(scope: QueryScope, correlationId: string) => Promise<CommandStatus | null>} getCommandStatus -  Read a command's settled/pending status by correlation id.
 * @property {(scope: QueryScope, correlationId: string) => Promise<CommandStatus | null>} settle Settle a `submitted` (SAP-boundary) command — the async settlement
 *   callback (Step 3.5). In the mock this represents SAP returning the material
 *   document; Phase-3 implements it as the integration webhook. Idempotent:
 *   settling an already-`done` command returns it unchanged.
 */

/** What a scope may do (Step 3.9). Mock-backed; DNA-registry-backed in Phase 3′. */
/**
 * @typedef {object} CapabilitySet
 * @property {readonly string[]} roles -  Transition-roles the scope holds.
 * @property {readonly string[]} transitions -  Transition ids the scope may initiate.
 */

// ─── Supplier overlay — the hub-mastered supplier fields (Material A1) ─────

/**
 * MR-1 BR-02 — how a supplier shares its stock with the hub: pulled from its
 * own system (`api`) or entered by template or by hand (`manual`). Hub-mastered:
 * the supplier master (the SAP stand-in) does not carry it, so it lives in an
 * append-only overlay and is read through ONE resolver (`stockUpdateModeOf`).
 */
/** @typedef {'api' | 'manual'} StockUpdateMode */

/** One change of a supplier's stock update mode, as recorded. Never edited. */
/**
 * @typedef {object} SupplierUpdateModeChange
 * @property {string} supplierId
 * @property {StockUpdateMode} stockUpdateMode
 * @property {string} setAt -  Store-assigned from the hub clock, never a payload field.
 * @property {ActorAttribution} setBy -  From the session (`QueryScope.actor`), never from the form.
 * @property {string} [reason]
 */

/** A supplier's stock update mode as the hub resolves it, with its history. */
/**
 * @typedef {object} SupplierStockUpdateMode
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {StockUpdateMode} stockUpdateMode
 * @property {'overlay' | 'default'} source `overlay`: the Hub administrator set it. `default`: nobody has, so it
 *   follows the sample connection list (API when the supplier is on it).
 * @property {readonly SupplierUpdateModeChange[]} history -  Every change on record for this supplier, oldest first.
 */

// ─── Vendor qualification — computed from documents (Material G1) ──────────

/**
 * MR-10 BR-01 — a vendor's qualification level. Exactly one per vendor,
 * COMPUTED from its valid documents at read (BR-03), never stored and never
 * set by hand. Separate from the lifecycle `SupplierStatus` (BR-02).
 */
/** @typedef {'registered' | 'approved' | 'preferred'} QualificationLevel */

/** The two levels a rule list is set for; Registered is "below Approved". */
/** @typedef {'approved' | 'preferred'} QualificationRuleLevel */

/**
 * One document a level requires (BR-04). Matched by `category`, and by the
 * declared `certType` too when the rule names one (plan AR-18). `label` is the
 * requirement as Procurement and Quality wrote it: data, not UI copy.
 */
/**
 * @typedef {object} QualificationRequiredDoc
 * @property {SupplierDocumentCategory} category
 * @property {CertType} [certType]
 * @property {string} label
 */

/** The documents required for one level (BR-04). */
/**
 * @typedef {object} QualificationRule
 * @property {QualificationRuleLevel} level
 * @property {readonly QualificationRequiredDoc[]} requiredDocs
 * @property {boolean} placeholder `true` on the seeded starting lists (MAT-D15): shown everywhere with
 *   "Placeholder, awaiting Procurement and Quality" until a person sets the
 *   list through `t_qualification_rule_set`, which records `false`.
 */

/** One change of a level's list, as recorded. Never edited (MAT-R3). */
/**
 * `setAt`:  Store-assigned from the hub clock, never a payload field.
 * `setBy`:  From the session (`QueryScope.actor`), never from the form.
 *
 * @typedef {QualificationRule & {
 *     readonly setAt: string;
 *     readonly setBy: ActorAttribution;
 *   }} QualificationRuleChange
 */

/** A counted document that would drop the level when it expires (AC-06). */
/**
 * @typedef {object} QualificationExpiringDoc
 * @property {string} documentId
 * @property {string} name
 * @property {SupplierDocumentCategory} category
 * @property {string} expiryDate
 */

/** `qualificationFor` — a vendor's level on a date and what it still lacks. */
/**
 * @typedef {object} VendorQualificationStatus
 * @property {QualificationLevel} level
 * @property {{ readonly approved: readonly QualificationRequiredDoc[]; readonly preferred: readonly QualificationRequiredDoc[]; }} missingFor -  The required documents with no counting document, per level.
 * @property {readonly QualificationExpiringDoc[]} expiringSoon -  Counted documents inside the expiry window that hold up the level.
 */

/**
 * One level change, REPLAYED from the documents and the rule lists (plan
 * AD-2) — never written on read. `causeDocumentId` names the document whose
 * verification or expiry moved the level; it is null when a change of the rule
 * list moved it, and `causeRuleLevel` then names the list.
 */
/**
 * @typedef {object} QualificationChange
 * @property {string} at
 * @property {QualificationLevel} from
 * @property {QualificationLevel} to
 * @property {string | null} causeDocumentId
 * @property {QualificationRuleLevel} [causeRuleLevel]
 */

/** A vendor's qualification as the hub computes it, with its history. */
/**
 * `history`:  Oldest first.
 * `placeholderRules`:  True while any list the level is computed from is still a placeholder.
 *
 * @typedef {VendorQualificationStatus & {
 *     readonly supplierId: string;
 *     readonly supplierName: string;
 *     readonly history: readonly QualificationChange[];
 *     readonly placeholderRules: boolean;
 *   }} VendorQualification
 */

// ─── Planning groups — capacity groups under SAP material groups (Material C5) ─

/**
 * MR-8 BR-01 — a set of materials that share capacity at a supplier. Each group
 * sits under exactly 1 SAP material group; each material is in exactly 1 group
 * (the material overlay holds its `planningGroupId`, so it cannot be in 2).
 * Hub master data for now (MAT-D12).
 */
/** @typedef {'active' | 'retired'} PlanningGroupState */

/**
 * @typedef {object} PlanningGroup
 * @property {string} id
 * @property {string} name -  Typed by Material Planning; data, not a translation key (MAT-R6).
 * @property {string} sapMaterialGroup
 * @property {PlanningGroupState} state
 * @property {ActorAttribution | null} createdBy -  Null for a default group: derived from its SAP group, never created by anyone.
 * @property {string | null} createdAt
 */

/** One governed change to the planning groups, as recorded. Never edited (MAT-R3). */
/**
 *  The group the materials moved into.
 *  The groups they left, as resolved at the move.
 *
 * @typedef {| {
 *       readonly kind: 'created';
 *       readonly groupId: string;
 *       readonly name: string;
 *       readonly sapMaterialGroup: string;
 *       readonly at: string;
 *       readonly by: ActorAttribution;
 *     }
 *   | { readonly kind: 'renamed'; readonly groupId: string; readonly name: string; readonly at: string; readonly by: ActorAttribution }
 *   | {
 *       readonly kind: 'moved';
 *       readonly groupId: string;
 *       readonly fromGroupIds: readonly string[];
 *       readonly materialCodes: readonly string[];
 *       readonly at: string;
 *       readonly by: ActorAttribution;
 *     }
 *   | { readonly kind: 'retired'; readonly groupId: string; readonly at: string; readonly by: ActorAttribution }} PlanningGroupEvent
 */

/** A planning group as the hub resolves it, with its materials and changes. */
/**
 * `isDefault`:  The default group of its SAP group (`pg-<materialGroup>`, MR-8 BR-02).
 * `named`: False for a default group nobody has renamed: its name is then the SAP group's own (shown from the `inv.group.*` strings). True once named.
 * `materials`:  The materials in the group now, sorted. A supplier sees only its own.
 * `history`:  Every change naming this group, oldest first. Empty for a supplier.
 *
 * @typedef {PlanningGroup & {
 *     readonly isDefault: boolean;
 *     readonly named: boolean;
 *     readonly materials: readonly string[];
 *     readonly history: readonly PlanningGroupEvent[];
 *   }} PlanningGroupView
 */

// ─── Service interfaces — the contract Phase 3 implements ───────────────────

/**
 * @typedef {object} ISupplierService
 * @property {(scope: QueryScope) => Promise<Page<Supplier>>} list -  Buyer: all suppliers. Supplier: returns empty page.
 * @property {(scope: QueryScope, id: string) => Promise<Supplier | null>} getById -  Buyer: any supplier. Supplier: only if id === own supplierId.
 * @property {(scope: QueryScope) => Promise<Supplier | null>} getCurrent -  Supplier: returns self. Buyer: returns null.
 * @property {(scope: QueryScope) => Promise<Page<SupplierStockUpdateMode>>} getStockUpdateModes Material A1 (MR-1 BR-02) — each supplier's stock update mode and its change
 *   history. Buyer: every supplier. Supplier: its own row only.
 * @property {(scope: QueryScope) => Promise<Page<UpdateCompliance>>} getUpdateCompliance Material B3 (MR-2 BR-01 to BR-03) — each supplier's weekly update
 *   compliance over the rolling 13 update cycles. Buyer: every supplier.
 *   Supplier: its own row only (MAT-R4).
 * @property {(scope: QueryScope) => Promise<Page<VendorQualification>>} getVendorQualifications Material G1 (MR-10 BR-01 to BR-03) — each vendor's qualification level,
 *   the documents it still needs, the documents about to drop it, and its
 *   replayed history. Buyer: every supplier. Supplier: its own row only.
 */

/**
 * @typedef {object} IProcurementService
 * @property {(scope: QueryScope, filter?: POFilter) => Promise<Page<PurchaseOrder>>} getPurchaseOrders - — Purchase orders —
 * @property {(scope: QueryScope, id: string) => Promise<PurchaseOrder | null>} getPurchaseOrder
 * @property {(scope: QueryScope, filter?: InventoryFilter) => Promise<Page<InventoryPosition>>} getInventory - — Inventory & capacity (REQ-E08-01 to REQ-E08-05) —
 *    Supplier × material positions. A supplier sees its own; PTI stock only where granted.
 * @property {(scope: QueryScope) => Promise<Page<MaterialNameRow>>} getMaterialNames Material C2 (MR-3) — supplier trade names per assigned material. Supplier:
 *   its own assigned materials only. PTI: every supplier × material with a name.
 * @property {(scope: QueryScope) => Promise<Page<StockAccessGrant>>} getStockAccess -  Supplier access to PTI stock. PTI: every supplier with its log. Supplier: its own.
 * @property {(scope: QueryScope) => Promise<Page<CapacityPlan>>} getCapacityPlans -  Capacity against demand per supplier × planning group, 13 weeks.
 * @property {(scope: QueryScope) => Promise<Page<PlanningGroupView>>} getPlanningGroups Material C5 (MR-8) — the planning groups with their materials and changes.
 *   PTI: every group. Supplier: the groups holding its own materials, narrowed
 *   to those materials, with no change history.
 * @property {(scope: QueryScope, checkDate?: string, filter?: StockSimulationFilter) => Promise<Page<StockSimulationRow>>} getStockSimulation Material E2 (MR-7 BR-01 to BR-09) — the stock simulation per supplier ×
 *   material at a check date (`YYYY-MM-DD`; today when omitted): the latest
 *   stock record plus what happened since, with the planner's inputs. PTI
 *   only: a supplier scope reads an empty page (it is PTI's estimate).
 * @property {(scope: QueryScope) => Promise<Page<InventoryAlert>>} getInventoryAlerts -  Inventory and capacity alerts. A supplier sees its own supplier-side rules.
 * @property {(scope: QueryScope) => Promise<Page<ForecastVersionView>>} getForecastVersions - — Forecast collaboration (REQ-E06-01 to REQ-E06-03) —
 *    Published forecast versions with who viewed them. A supplier sees versions carrying its lines.
 * @property {(scope: QueryScope) => Promise<Page<ForecastCommitmentLine>>} getForecastCommitments -  The current version's lines with their commitments. A supplier sees its own, with its drafts.
 * @property {(scope: QueryScope) => Promise<Page<ForecastCoverageRow>>} getForecastCoverage -  Supplier coverage per material against Firm demand (CR-03), PTI only.
 * @property {(scope: QueryScope) => Promise<Page<FixedStockReconcileRow>>} getFixedStockReconcile REQ-E06-04 — the fixed stock reconcile per supplier × material × cycle
 *   (ENG-D21). The planner reads every supplier; a supplier reads only its own
 *   rows (scoped in the service).
 * @property {(scope: QueryScope, windowWeeks?: ReliabilityWindowWeeks) => Promise<Page<SupplierReliabilityView>>} getSupplierReliability REQ-E14-02 — supplier reliability and PTI's plan-change measures over a
 *   trailing window, computed by the forecast engine on its (SIMULATED)
 *   dataset. The planner sees every supplier; a supplier sees ONLY its own row,
 *   which carries PTI's plan-change figure for its materials (BR-07, ENG-D3).
 * @property {(scope: QueryScope, includeUnconfirmed?: boolean) => Promise<MaterialRequirementView | null>} getMaterialRequirement REQ-E14-03 — the material requirement per material and week, computed by
 *   the forecast engine on its (SIMULATED) dataset. PTI only: a supplier scope
 *   gets null (X-03 — simulated engine output is never shown to a supplier).
 * @property {(scope: QueryScope) => Promise<SafetyStockView | null>} getSafetyStock REQ-E14-04 — safety stock, safety lead time and reorder point per
 *   material, from the plan's own errors and the suppliers' delivery history,
 *   on the engine's (SIMULATED) dataset. PTI only: a supplier scope gets null.
 * @property {(scope: QueryScope) => Promise<OrderPlanView | null>} getOrderPlan REQ-E14-05 — recommended orders per material and week, sized jointly per
 *   warehouse within MOQ, multiple and pallet space, with the projected fill
 *   and rented space; on the engine's (SIMULATED) dataset. PTI only.
 * @property {(scope: QueryScope) => Promise<RescheduleView | null>} getReschedule REQ-E14-13 — proposals to reschedule, reduce or cancel open PO lines and
 *   call-offs for warehouse relief, valued jointly per warehouse, with the
 *   stock-on-hand overload no open order can relieve and the plan-change guard;
 *   on the engine's (SIMULATED) dataset. PTI only.
 * @property {(scope: QueryScope) => Promise<StabilisedPlanView | null>} getStabilisedPlan REQ-E14-06 — the plan stabilised before publication (Firm frozen,
 *   Trade-off damped and held to the ENG-D8 band), the raw and stabilised
 *   values per supplier × material × week, and the effect on E14-02's
 *   plan-change measures; on the engine's (SIMULATED) dataset. PTI only.
 * @property {(scope: QueryScope) => Promise<DataHealthView | null>} getDataHealth REQ-E14-01 — data health of the engine's inputs: freshness per feed
 *   against the administrator's limits, and the feed spec's quality checks on
 *   arrival with the failing records. On the engine's (SIMULATED) dataset. PTI only.
 * @property {(scope: QueryScope) => Promise<DemandForecastView | null>} getDemandForecast REQ-E14-07 — the finished-goods demand forecast: per SKU × week, the
 *   method that made it, SKU / brand / total reconciled, OEM products left
 *   out (ENG-D20). On the engine's (SIMULATED) dataset. PTI only.
 * @property {(scope: QueryScope) => Promise<ForecastBiasView | null>} getForecastBias REQ-E14-11 — forecast bias (tracking signal per SKU and material, engine
 *   and SAP's plan), the planner override ledger and the override value
 *   report. On the engine's (SIMULATED) dataset. PTI only.
 * @property {(scope: QueryScope) => Promise<ModelBacktestView | null>} getModelBacktest REQ-E14-10 — the model backtest: each SKU's candidate models replayed
 *   through PTI's ordering policy at past origins, chosen by simulated service
 *   (fill rate, warehouse space) within the MASC limit. On the engine's
 *   (SIMULATED) dataset. PTI only.
 * @property {(scope: QueryScope, filter?: RFQFilter) => Promise<Page<RFQ>>} getRFQs - — Sourcing —
 * @property {(scope: QueryScope, filter?: QuotationFilter) => Promise<Page<Quotation>>} getQuotations
 * @property {(scope: QueryScope, filter?: InviteeFilter) => Promise<Page<InviteeCandidate>>} getInviteeCandidates - — RFx management (REQ-E03-01 to REQ-E03-05) —
 *    REQ-E03-01 — selectable invitees for a sourcing event, filtered by category and purchasing group. PTI only.
 * @property {(scope: QueryScope) => Promise<Page<RfiEventView>>} getRfiEvents -  REQ-E03-02 — RFI events. A supplier sees the ones it was invited to, and only its own answers.
 * @property {(scope: QueryScope) => Promise<Page<RfpEventView>>} getRfpEvents -  REQ-E03-04 — RFP events with their commercial terms and proposals. Same scoping as the RFI board.
 * @property {(scope: QueryScope) => Promise<Page<NegotiationRoundView>>} getNegotiationRounds -  REQ-E03-05 — negotiation rounds. A supplier reads only its own thread (BR-05).
 * @property {(scope: QueryScope) => Promise<Page<RfpOfferRoundView>>} getRfpOfferRounds NR-2 — firm-offer rounds on an RFP, with the offers and the last firm price
 *   per supplier and option. A supplier reads only rounds it was invited to and
 *   only its own offers (AC-01).
 * @property {(scope: QueryScope) => Promise<Page<AwardView>>} getAwards -  REQ-E03-05 — recorded awards. A supplier reads only its own outcome (AC-05).
 * @property {(scope: QueryScope) => Promise<Page<RfpAwardView>>} getRfpAwards RFx D2 (NR-2 BR-09, AC-07) — awards on an RFP, per option on firm offers.
 *   A supplier reads only awards it is named on, only its own lines, and its
 *   outcome (awarded, not awarded, or withdrawn after a cancel).
 * @property {(scope: QueryScope) => Promise<Page<RfqEngagementView>>} getRfqEngagement -  RFx spec 2026-09-21 — invitees' intent and confidentiality acceptance. A supplier reads its own.
 * @property {(scope: QueryScope) => Promise<Page<RfqClarificationView>>} getRfqClarifications -  RFx spec 2026-09-21 — clarification Q&A. A supplier reads its own questions and the published answers, asker hidden.
 * @property {(scope: QueryScope, rfqId: string) => Promise<Page<RfqSupplierGateView>>} getRfqComplianceGate -  CR-23 — the compliance gate for every invitee and bidder of one RFQ. PTI only.
 * @property {(scope: QueryScope, filter?: ShipmentFilter) => Promise<Page<Shipment>>} getShipments - — Fulfilment —
 * @property {(scope: QueryScope, filter?: ASNFilter) => Promise<Page<ASN>>} getASNs
 * @property {(scope: QueryScope, filter?: GRFilter) => Promise<Page<GoodsReceipt>>} getGoodsReceipts
 * @property {(scope: QueryScope) => Promise<Page<CallOff>>} getCallOffs -  Call-offs under umbrella POs (REQ-E09-03). A supplier never sees drafts.
 * @property {(scope: QueryScope, filter?: InvoiceFilter) => Promise<Page<BuyerInvoice>>} getBuyerInvoices - — Finance —
 * @property {(scope: QueryScope, filter?: InvoiceFilter) => Promise<Page<SupplierInvoice>>} getSupplierInvoices
 * @property {(scope: QueryScope, filter?: ContractFilter) => Promise<Page<Contract>>} getContracts - — Contracts —
 * @property {(scope: QueryScope, filter?: ObligationFilter) => Promise<Page<ContractObligation>>} getObligations
 * @property {(scope: QueryScope) => Promise<Page<SupplierDocument>>} getDocuments - — Supplier-side supporting data (currently inline in pages) —
 * @property {(scope: QueryScope, supplierId?: string) => Promise<Page<CatalogItem>>} getStorefrontCatalog
 * @property {(scope: QueryScope, supplierId?: string) => Promise<Page<ProfileCert>>} getStorefrontCerts
 * @property {(scope: QueryScope, supplierId?: string) => Promise<Page<StorefrontProduct>>} getStorefrontProducts
 * @property {(scope: QueryScope) => Promise<KpiSnapshot>} getKpis - — KPIs / performance —
 * @property {(scope: QueryScope, range: TrendRange) => Promise<Page<PerformancePoint>>} getPerformanceTrend
 * @property {(scope: QueryScope) => Promise<Page<SupplierScorecard>>} getSupplierScorecards - — Supplier scorecard (buyer-only portfolio grading) —
 * @property {(scope: QueryScope, filter?: PRFilter) => Promise<Page<PurchaseRequisition>>} getRequisitions - — Purchase requisitions (buyer-only ACQUIRE stage) —
 * @property {(scope: QueryScope) => Promise<Page<PrIntakeLine>>} getPrIntake - — PR-intake review (buyer-only; C7 §2 — one shape, two producers) —
 * @property {(scope: QueryScope) => Promise<Page<SupplierApplication>>} getSupplierApplications - — Supplier applications (B2, buyer-only ACQUIRE stage) —
 *
 *   ⚠️ **BUYER-ONLY, AND NOT BY THE MECHANISM EVERY OTHER READ USES.** Every
 *   other scoped read narrows by `supplierId`; an application HAS no
 *   `supplierId` (the row's field is typed `null`), because an applicant is not
 *   a tenant. So there is nothing to narrow BY, and the honest boundary is the
 *   persona: the whole collection is buyer-side or it is nothing. A supplier
 *   scope reads an empty page — the `getRequisitions` / `getPrIntake` shape,
 *   reused deliberately rather than invented.
 * @property {(scope: QueryScope) => Promise<Page<ProductionLineRow>>} getProductionLines - — Buyer command-center aggregates (buyer-only) —
 * @property {(scope: QueryScope) => Promise<Page<SupplierHealthRow>>} getSupplierHealth
 */

/**
 * @typedef {object} IRiskService
 * @property {(scope: QueryScope) => Promise<Page<RiskAlert>>} getRiskAlerts
 * @property {(scope: QueryScope) => Promise<Page<GeoRisk>>} getGeoRisks
 * @property {(scope: QueryScope) => Promise<Page<ExposureRow>>} getExposure
 * @property {(scope: QueryScope) => Promise<Page<Scenario>>} getScenarios
 * @property {(scope: QueryScope) => Promise<Page<ComplianceRow>>} getCompliance
 * @property {(scope: QueryScope) => Promise<Page<ComplianceRegistryEntry>>} getComplianceRegistry -  Canonical compliance registry (census #11–15 → ONE machine · I3.1). Grain:
 *    supplier × material × certificate. SUPERSEDES `getCompliance`/`ComplianceRow`
 *    (deprecated-at-birth). supplierId-keyed → scope-isolated per supplier (buyer
 *    sees the superset). Fixture-backed + SIMULATED (LivenessRegistry) until the
 *    Track-R harvest lands the real cert registry.
 * @property {(scope: QueryScope) => Promise<Page<Commodity>>} getCommodities
 */

/**
 * @typedef {object} IDiscoveryService
 * @property {(scope: QueryScope) => Promise<Page<RecommendedSupplier>>} getRecommended
 * @property {(scope: QueryScope) => Promise<Page<QualificationItem>>} getQualifications
 * @property {(scope: QueryScope) => Promise<Page<MarketIntelCard>>} getMarketIntel
 * @property {(scope: QueryScope) => Promise<Page<SingleSourceItem>>} getSingleSourceItems
 */

// Discrete per-read analytics surface (D-4): each chart/table is its own read,
// so the service is shaped for per-section loading/error rendering. (The pages
// today still gate at the page level; the read granularity is what D-4 secures.)
/**
 * @typedef {object} IAnalyticsService
 * @property {(scope: QueryScope) => Promise<AnalyticsSummary | null>} getSummary -  Headline KPI cards. Buyer: populated. Supplier: null.
 * @property {(scope: QueryScope) => Promise<Page<SpendCategoryRow>>} getSpendByCategory
 * @property {(scope: QueryScope) => Promise<Page<TopSupplierSpend>>} getTopSuppliers
 * @property {(scope: QueryScope) => Promise<Page<MonthlyOtifRow>>} getOtifTrend
 * @property {(scope: QueryScope) => Promise<Page<MonthlyPoRow>>} getPoVolumeTrend
 * @property {(scope: QueryScope) => Promise<Page<MonthlyChannelMix>>} getChannelMix
 * @property {(scope: QueryScope) => Promise<Page<AnalyticsPerfRow>>} getSupplierPerformance
 */

// ─── Supplier Data Collaboration reads (SDC-4b) ───────────────────────────────
//
// The SDC read seam. Moves scope from the hooks INTO the service (mirrors
// IProcurementService): P1 own-reads are per-supplier isolated; the P2
// consolidation reads are the buyer-superset, BUYER-GATED — a supplier persona
// hitting the consolidation path sees nothing (own-only degenerates to empty; a
// supplier has no cross-supplier consolidation view). Reads resolve from the LIVE
// stores (seeded from the SDC-0 fixtures) through the shared sdcClock, so P1
// writes and P2 reads share one scoped source. NOT a new domain contract — a
// read-service namespace over the existing SDC objects/selectors.
/**
 * @typedef {object} ICollaborationService
 * @property {(scope: QueryScope) => Promise<Page<RequirementResponse>>} getOwnRequirementResponses - — P1 own-reads (per-supplier isolation) —
 * @property {(scope: QueryScope) => Promise<Page<InventoryDeclaration>>} getOwnInventoryDeclarations
 * @property {(scope: QueryScope) => Promise<Page<IncomingShipmentView>>} getOwnIncomingShipments
 * @property {(scope: QueryScope) => Promise<Page<ASN>>} getOwnSupplierAsns
 * @property {(scope: QueryScope) => Promise<Page<ConsolidationRow>>} getConsolidation - — P2 consolidation reads (buyer-superset, BUYER-GATED) —
 * @property {(scope: QueryScope) => Promise<Page<SupplierCoverageEntry>>} getCoverage
 * @property {(scope: QueryScope) => Promise<Page<ChaseEntry>>} getChase
 * @property {(scope: QueryScope) => Promise<Page<SupplierRollup>>} getRollups
 */

// ─── Delivery Agreement reads (the drawdown/compliance surface seam) ──────────
//
// A read-only namespace over the headless delivery domain (SchedulingAgreement +
// the pure derivations). `getAgreements` returns the scoped view-model — per
// agreement, per item, the drawdown ledger + per-released-line fulfillment,
// computed INSIDE the service against the shared SDC clock (mirrors
// ICollaborationService's buyer-superset scoping). SchedulingAgreement carries
// `supplierId`, so buyer = superset / supplier = own via applySupplierScope. Not a
// new domain contract — a read seam over the existing delivery objects/derivations.
/** Optional narrowing for the delivery read. `contractId` scopes the result to a
 *  single contract's agreements — the nested contract-detail DA tab passes it; the
 *  cross-contract roll-up omits it (buyer superset). Supplier scoping is applied
 *  first regardless, so a supplier still only ever sees its own. */
/**
 * @typedef {object} DeliveryQuery
 * @property {string} [contractId]
 */

/**
 * @typedef {object} IDeliveryService
 * @property {(scope: QueryScope, query?: DeliveryQuery) => Promise<Page<DeliveryAgreementView>>} getAgreements
 * @property {(scope: QueryScope, agreementId: string, itemSeq: number, selection: ReleaseSelection) => Promise<ReleaseCommandResult>} releaseLines Release the selected DRAFT lines of ONE item (the delivery lane's first
 *   write — the draft→released transmit-to-vendor moment). BUYER-ONLY: a supplier
 *   scope is refused (release is a buyer action). Applies Batch-2's pure
 *   `releaseScheduleLines`, persists to the mutable store, and returns the
 *   RE-DERIVED agreement view — or an honest `ReleaseReason` on refusal.
 *
 *   SIMULATED by construction: this write does NOT go through the command
 *   dispatcher and registers NO CommandTarget, so `deliveryAgreements` stays
 *   null-backed in the LivenessRegistry (the honest amber "Sample" marker holds).
 *   A released line is transmitted in the PORTAL, not posted to SAP —
 *   `sapReleaseNumber` stays absent until the Pattern-B feed binds it (Stage F).
 * @property {(scope: QueryScope, agreementId: string, itemSeq: number, releaseSeq: number) => Promise<ConfirmCommandResult>} confirmMatch Confirm the fulfillment of ONE released line (the delivery lane's SECOND
 *   write — accept an INFERRED proximity proposal as a confirmed fact). BUYER-ONLY.
 *   ACCEPT-AS-OBSERVED (v1): writes the observed shipment ref + qty via the pure
 *   `confirmFulfillment`, so the match binds authoritatively (inferred:false) and
 *   the governed `deliveredQty` climbs. Returns the RE-DERIVED view, or an honest
 *   reason (`NOTHING_TO_CONFIRM` / `ALREADY_CONFIRMED` / `NOT_RELEASED` /
 *   `SCOPE_DENIED` / `UNKNOWN_RELEASE_SEQ`).
 *
 *   SIMULATED by construction, exactly like release: NO dispatcher, NO
 *   CommandTarget, so `deliveryAgreements` stays null-backed (amber marker holds).
 *   A confirm is a PORTAL record, not a SAP goods-receipt — `fulfilledDate` /
 *   `sapReleaseNumber` stay absent until the Pattern-B feed binds them (Stage F).
 * @property {(scope: QueryScope, agreementId: string, itemSeq: number, patch: EditPolicyPatch) => Promise<EditPolicyCommandResult>} editPolicy Re-point ONE item's ACTIVE drawdown tolerance (the delivery lane's THIRD write
 *   — the GOVERNANCE write). BUYER-ONLY: adjusting a tolerance is a buyer decision.
 *   Applies the pure `setActivePolicy` (writes `active` + the who/when/why stamp;
 *   `contractDefault` is immutable, `activeChangedBy` deferred to the dispatcher),
 *   persists, and returns the RE-DERIVED view — the ledger now marks
 *   `policyDeviation` and re-derives `enforced` / `exceptions` against the new
 *   `active`. Or an honest reason (`REASON_REQUIRED` / `NO_CHANGE` / `SCOPE_DENIED`
 *   / `UNKNOWN_ITEM`).
 *
 *   SIMULATED by construction, exactly like release / confirm: NO dispatcher, NO
 *   CommandTarget, so `deliveryAgreements` stays null-backed (the amber marker
 *   holds). A tolerance change is a PORTAL governance record, never posted to SAP.
 */

// ─── Unified chase read (SDC-5d — the buyer/planner chase surface seam) ───────
//
// The ONE composition point: reads the existing collaboration chase (data
// staleness) + delivery agreements (→ commitment chase) and folds them into the
// per-supplier `SupplierChaseView[]` via the pure 5c reducer. BUYER-GATED — the
// planner chases suppliers; a supplier persona resolves to [] (a supplier does not
// chase itself; its own-facts view is the delivery mirror, not this surface).
// Depends on the collaboration + delivery reads; neither imports chase (acyclic).
/**
 * @typedef {object} IChaseService
 * @property {(scope: QueryScope) => Promise<Page<SupplierChaseView>>} getUnifiedChase
 */

// ─── Enforcement read (CP-3 · E2 — the setting, behind the seam) ─────────────
//
// THE LEDGER, NOT THE ANSWER. This returns the recorded acts; the mode in force
// is DERIVED by the caller (`effectiveEnforcement`), exactly as `effectivePin`
// derives the FX basis from `fxPins` rather than the store holding a "current"
// field. That is what stops "which mode is current" from drifting away from the
// decisions that justify it — and it is why there is no
// `getEffectiveMode(checkId)` here: a service method would have to read a clock
// to answer, and the instant is always an argument (law 0.5).
//
// BUYER-SCOPED. A supplier resolves to SCOPE_DENIED: the ledger is a Paragon
// governance record — who relaxed what, until when, and whether they were named
// — and today it carries no supplier dimension at all (D1: the key is `checkId`
// alone). What a supplier is owed is the STAMP on its own receipt, which rides
// the line (D3) and is E3's. If D1 is ever widened, a per-supplier read of that
// supplier's own settings is an ADDITIVE change here, not a re-shaping.
/**
 * @typedef {object} IEnforcementService
 * @property {(scope: QueryScope) => Promise<Page<EnforcementSetting>>} getEnforcementSettings -  Every recorded enforcement setting, oldest first. Append-only upstream.
 */

// ─── File seam (RFx A2 · AR-07 — file bytes behind the data service) ────────
//
// The bytes of an attached file sit behind this seam like every other read and
// write, so BL-27's real storage is an adapter swap and no component changes.
// Today's adapter is the session store (`sessionAttachments`): the record keeps
// the metadata `put` returns, the bytes last for this browser session only, and
// `urlFor` answers `null` after a reload (CE-11).
//
// No `QueryScope` argument: the session store holds only what this browser
// attached. Who may SEE a record's files is the read model's narrowing, not
// this seam's. `put` is async because the real adapter uploads over the
// network; the session adapter resolves at once. The other lookups are
// synchronous. The access log (RFx B5) records each open or download of a
// file with who and when; it is appended and never edited.
/**
 * @typedef {object} IFileService
 * @property {(file: File) => Promise<AttachmentMeta>} put -  Keep a file and return the metadata the record stores.
 * @property {(id: string) => string | null} urlFor -  A URL that opens the file, or `null` when it is not held.
 * @property {(id: string) => void} release -  Let go of a file. The record's metadata is the caller's to drop.
 * @property {(id: string) => boolean} isHeld -  Is this file's content held (openable) right now?
 * @property {(fileId: string, by: ActorAttribution) => void} recordAccess Record that someone opened or downloaded a file (NR-1 BR-10, RFX-R3). The
 *   seam stamps the time; the entry is appended and never edited. A download
 *   is a read, not a state change, so it is recorded here and not by a verb.
 * @property {(fileId: string) => readonly FileAccess[]} accessLog -  Every recorded access of a file, oldest first. Empty when never opened.
 */

/** One recorded open or download of a file (NR-1 BR-10). Append-only. */
/**
 * @typedef {object} FileAccess
 * @property {string} fileId
 * @property {ActorAttribution} by
 * @property {string} at -  Seam-assigned, never the caller's.
 */

/**
 * @typedef {object} IDataService
 * @property {ISupplierService} suppliers
 * @property {IProcurementService} procurement
 * @property {IRiskService} risk
 * @property {IDiscoveryService} discovery
 * @property {IAnalyticsService} analytics
 * @property {ICollaborationService} collaboration -  SDC read seam — P1 own-reads + P2 consolidation, service-scoped (SDC-4b).
 * @property {IDeliveryService} delivery -  Delivery Agreement read seam — scoped drawdown + fulfillment view-model.
 * @property {IChaseService} chase -  Unified chase read seam (SDC-5d) — data + commitment chase, buyer-gated.
 * @property {IEnforcementService} enforcement -  Enforcement read seam (CP-3 · E2) — the append-only setting ledger,
 *    buyer-scoped. The mode in force is derived by the caller, never served.
 * @property {IFileService} files -  File seam (RFx A2) — file bytes; the session store today, BL-27 later.
 * @property {ICommandService} commands -  Write seam — the single dispatcher (Step 3.4).
 * @property {(scope: QueryScope) => Promise<CapabilitySet>} getCapabilities -  What the current scope may do (Step 3.9 DNA seed; mock-backed today).
 */

// ────────────────────────────────────────────────────────────────────────────
// B1 · SUPPLIER APPLICATION — the record behind becoming a supplier.
//
// ⚠️ **AN APPLICANT IS DATA, NOT A SEAT.** Every other entity in this file is
// scoped by `supplierId`, because every other entity belongs to a tenant. An
// applicant has no tenancy — that is the whole content of the word — so this
// row's owner field is typed `null` rather than `string | null`. A LITERAL type
// makes the ruling checkable: assigning a supplier id here is a `tsc` failure,
// not a review comment, and `readScopeOwner` cannot be quietly widened later
// without the type going red first.
// ────────────────────────────────────────────────────────────────────────────

/** The four states an application can be in. Clock-free (law 0.5). */
/**
 * @typedef {| 'Submitted'
 *   | 'Under Review'
 *   | 'Approved'
 *   | 'Rejected'} SupplierApplicationStatus
 */

/**
 * ONE document the applicant SAYS it holds.
 *
 * ⚠️ **THERE IS NO STATUS FIELD HERE, AND THERE MUST NOT BE.** Verifying a
 * certificate is `supplierDocument`'s job and that lane is wired
 * (`supplierdoc:request` / `:verify` / `:reject`, held by `compliance`). A
 * `verified` flag on this row would be a sixth compliance vocabulary on a tree
 * that spent I3.1 collapsing five into one — and a second place for the answer
 * to be different. What is recorded is a CLAIM and its reference, nothing more.
 */
/**
 * @typedef {object} SupplierApplicationDeclaration
 * @property {'npwp' | 'nib' | 'halal' | 'iso'} kind -  Which of the four the applicant is claiming.
 * @property {string} reference -  The number the applicant states. Their words, unverified, never a join key.
 */

/**
 * @typedef {object} SupplierApplication
 * @property {string} id -  Store-assigned. The store mints identity, never the caller.
 * @property {string} applicationNumber The human-readable reference, store-assigned and sequential.
 *
 *   ⚠️ **THIS IS THE HONEST OPPOSITE OF THE THING B1 EXISTS FOR.**
 *   `SupplierRegistration.tsx:1289` mints a RANDOM number and renders it at
 *   `:1203` beside a next-steps list, with no row anywhere behind it. This one
 *   is assigned by the store at the moment a row is written, so the number an
 *   applicant is told and the record Paragon holds are the same fact. **The
 *   wizard is NOT repointed here** — that is filed as B3.
 * @property {string} requestType
 * @property {SupplierApplicationStatus} status
 * @property {string} companyName
 * @property {null} supplierId - ⚠️ **ALWAYS `null`, AND THE LITERAL TYPE IS THE ENFORCEMENT.** See the
 *   header: an applicant is not a tenant. `resolvedSupplierId` below is a
 *   different question and is NOT this.
 * @property {string | null} resolvedSupplierId The existing vendor an extension request names, resolved against the
 *   platform roster at birth — never the payload's word for it.
 *
 *   ⚠️ **NOT A TENANCY FIELD.** It says which supplier the application is
 *   ABOUT; `supplierId` above says which tenant owns the row, and the answer to
 *   that is nobody. Conflating them is precisely how an application would
 *   become visible to the supplier it names, which is not a thing this models.
 *   `null` for the two request types that name no existing vendor.
 * @property {string | null} s4Vendor -  The vendor number as the caller stated it, kept for the record.
 * @property {readonly SupplierApplicationDeclaration[]} declarations -  What the applicant claims to hold. Claims, not verifications — see above.
 * @property {string} submittedAt
 * @property {ActorAttribution} submittedBy - ⚠️ **ALWAYS `UNATTRIBUTED` IN THIS TREE, AND THE TYPE KEEPS IT HONEST.**
 *   `CurrentIdentity.actor` is `UNATTRIBUTED: NO_PERSON_IN_SESSION` everywhere,
 *   so typing this as `ActorAttribution` rather than `string` means a surface
 *   must RENDER the unattributed state instead of printing a name it does not
 *   have (C10 §5.2 / D-ID-3).
 * @property {string | null} reviewStartedAt -  When somebody picked it up. `null` until they did — never a guessed date.
 * @property {string | null} decidedAt
 * @property {ActorAttribution | null} decidedBy
 * @property {string | null} rejectionReason -  Present only on a refusal, proven non-blank by the verb before it is written.
 */
