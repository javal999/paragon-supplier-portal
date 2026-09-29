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

import type {
  Supplier,
  SupplierStatus,
  SupplierTier,
  PreferredChannel,
  ScorecardGrade,
} from '../../types/supplier.types';
// REQ-E03-01 to REQ-E03-05 — the RFx read surface. The view shapes live beside
// the entities (`services/sourcing/views`) so the contract and the adapter that
// fulfils it import ONE declaration rather than each holding its own copy.
import type { InviteeCandidate, InviteeFilter } from '../transitions/rfxRules';
import type { FsRow } from '../transitions/fixedStockReconcile';
import type { RfqClarificationView, RfqEngagementView } from '../sourcing/rfqResponse';
import type {
  AwardView,
  NegotiationRoundView,
  RfiEventView,
  RfpEventView,
  RfpAwardView,
  RfpOfferRoundView,
  RfqSupplierGateView,
} from '../sourcing/views';

// CP-3 · E2 — the enforcement read seam's row type. TYPE-ONLY: naming the
// vocabulary is not acquiring a consumer, and nothing in this file calls it.
import type { EnforcementSetting, ActorAttribution } from '../../lib/enforcement';

// SDC-4b — the collaboration read seam's row types (type-only; the SDC layer
// already imports IntakePlanState from here, so this reverse reference is a
// type-only cycle TS resolves at erase-time — no runtime import is emitted).
import type {
  RequirementResponse,
  DisputeEntry,
  ForecastStream,
  InventoryDeclaration,
  StockChannel,
  MaterialType,
  IncomingShipmentView,
  ConsolidationRow,
  SupplierCoverageEntry,
  SupplierRollup,
  ChaseEntry,
} from '../sdc';
// Delivery Agreement read seam — the view-model row type (type-only; erased at
// build, so no runtime import into the data layer).
import type {
  ConfirmCommandResult,
  DeliveryAgreementView,
  EditPolicyCommandResult,
  ReleaseCommandResult,
} from '../delivery/views';
import type { SupplierReliability } from '../engine/reliability';
import type { MaterialPlan, MaterialRequirementRun } from '../engine/requirement';
import type { MaterialSafetyStock, SafetyStockChange, SafetyStockRun } from '../engine/safetyStock';
import type { MaterialOrderPlan, OrderPlanRun, WarehousePlan } from '../engine/orderSizing';
import type { InfoLine, PlanChangeBaseline, Proposal, ProposalType, RescheduleRun, WarehouseReschedule } from '../engine/reschedule';
import type { SupplierCfot } from '../engine/cfot';
import type { SeriesResult, StabiliseParams, StabiliseRun } from '../engine/stabilise';
import type { DataHealthReport } from '../engine/dataHealth';
import type { DemandForecastRun } from '../engine/demandForecast';
import type { DemandRangeRun } from '../engine/demandRange';
import type { DatasetProvenance } from '../engine/types';
import type { ReleaseSelection } from '../delivery/release';
import type { EditPolicyPatch } from '../delivery/policy';
// The unified chase read view (SDC-5c). TYPE-ONLY — the `chase` module composes
// the collaboration + delivery reads one level up; the data layer only names the
// shape it returns. Acyclic: chase reads sdc/delivery types, never data/types.
import type { SupplierChaseView } from '../chase';
import type { AttachmentMeta } from '../sourcing/rfqModel';

// ─── PO enums (canonical home; relocated from types/purchaseOrder.types.ts) ──
export enum POStatus {
  SENT = 'Sent',
  VIEWED = 'Viewed',
  ACKNOWLEDGED = 'Acknowledged',
  CONFIRMED = 'Confirmed',
  /** The supplier proposed a counter-offer (REQ-E07-02 Adjust); the planner reviews it. */
  ADJUSTED = 'Adjusted',
  /** The supplier cannot meet the order (REQ-E07-02 Reject). PTI decides what next. */
  REJECTED = 'Rejected',
  PARTIALLY_DELIVERED = 'Partially Delivered',
  DELIVERED = 'Delivered',
  CLOSED = 'Closed',
}

export enum ChannelType {
  WHATSAPP = 'WhatsApp',
  EMAIL = 'Email',
  WEB = 'Web',
  API = 'API',
}

import type {
  Shipment,
  ShipmentLineItem,
  ShipmentStatus,
  ShipmentMode,
} from '../../data/mockShipments';

import type {
  GoodsReceipt,
  GRStatus,
  Disposition,
  CheckResult,
  OptionalCheck,
  InspectionResult,
  ReceiptDiscrepancyResponse,
  ReceiptDiscrepancyStatus,
} from '../../data/mockGoodsReceipts';

import type {
  Contract,
  ContractType,
  ContractStatus,
} from '../../data/mockContracts';

import type {
  ContractObligation,
  ObligationStatus,
  ObligationCategory,
  ObligationOwner,
  ObligationRecurrence,
} from '../../data/mockObligations';

import type { RFQ, RFQStatus, RFQCategory } from '../../data/mockRfqs';
import type { Quotation, QuotationStatus } from '../../data/mockQuotations';

// ─── Re-exports — entities without drift, single source ─────────────────────

export type {
  Supplier,
  SupplierStatus,
  SupplierTier,
  PreferredChannel,
  ScorecardGrade,
  Shipment,
  ShipmentLineItem,
  ShipmentStatus,
  ShipmentMode,
  GoodsReceipt,
  GRStatus,
  Disposition,
  CheckResult,
  OptionalCheck,
  InspectionResult,
  ReceiptDiscrepancyResponse,
  ReceiptDiscrepancyStatus,
  Contract,
  ContractType,
  ContractStatus,
  ContractObligation,
  ObligationStatus,
  ObligationCategory,
  ObligationOwner,
  ObligationRecurrence,
  RFQ,
  RFQStatus,
  RFQCategory,
  Quotation,
  QuotationStatus,
};

// ─── Identity scope — derived from CurrentIdentity at the page boundary ─────

export interface QueryScope {
  personaType: 'buyer' | 'supplier';
  supplierId: string | null;
  /**
   * THE BUSINESS ROLES THE ACTING SESSION HOLDS — the authorisation half, and
   * a READ scope never needs it (tenancy is `personaType` × `supplierId`).
   *
   * ⚠️ **OPTIONAL ON THE TYPE, REQUIRED ON THE COMMAND PATH, AND THE
   * DIFFERENCE IS ENFORCED IN THE DISPATCHER RATHER THAN HERE.** Making it
   * required would put an authorisation field on `list()` / `getById()`, which
   * conflates two questions and would force ~60 read specs to answer one they
   * do not ask. Absent on a COMMAND, the dispatcher refuses with
   * `ROLE_NOT_PERMITTED` — it does NOT fall back to the persona span, because
   * that fallback IS the wildcard this arc retired: a persona spanning 48
   * atoms unconditionally.
   *
   * `scopeKey` deliberately ignores it — two sessions with different roles read
   * the same tenant's data, so folding roles into the cache key would shard the
   * query cache on a dimension the reads do not vary by.
   */
  businessRoles?: readonly string[];
  /**
   * WHO IS ACTING, carried from the SESSION — never from a command payload
   * (C10 §6.2). The `setAt` / `pinnedAt` discipline this tree has ratified
   * twice applies with more force to WHO than to WHEN: *a caller that could
   * set it could backdate its own audit entry*.
   *
   * ⚠️ **THE OTHER HALF OF §6.2 IS NOT BUILT AND IS STILL FREE.** A
   * payload-supplied `RESOLVED` actor is not yet REFUSED BY NAME on write; it
   * is harmless today for one reason only — nothing in shipped code constructs
   * a `RESOLVED` actor, so no forged attribution can exist. That precondition
   * becomes unfixable at the FIRST `RESOLVED` record, and this batch creates
   * none. Stated here so the absence is a fact in the tree rather than a claim
   * in a report.
   */
  actor?: import('../../lib/enforcement').ActorAttribution;
}

// ─── Error contract (DR-4) — the single failure channel for the data layer ──
//
// The interface today returns T[] / Page<T> / T|null on success; failure is
// signalled by *throwing* a DataError. This matches TanStack Query's model
// (queryFn throws -> isError), so consumers render the error state via the
// wrapper hook rather than unwrapping a Result envelope. The Phase-3 real
// adapter maps HTTP/SAP failures onto the same DataErrorCode set.

export type DataErrorCode =
  | 'NOT_FOUND'
  | 'SCOPE_DENIED'
  | 'UPSTREAM'
  | 'CHAOS'
  | 'UNKNOWN';

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
// Pinned by `dataError.contract.test.ts`, which fails if a `cause` returns
// enumerable — a requirement recorded only in prose is a promise with no
// verifier.
export class DataError extends Error {
  readonly code: DataErrorCode;

  constructor(code: DataErrorCode, message: string) {
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

export interface Page<T> {
  items: T[];
  cursor?: string | null;
  total?: number;
}

// ─── Canonical Purchase Order (drift-resolved) ──────────────────────────────

export interface POLineItem {
  id: string;
  materialCode: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  confirmedQty: number;
  /**
   * An SAP value-limit line: the line commits a VALUE and carries NO quantity
   * (CR-04; BL-13 decided quantity per line, so this is the exception). When it
   * is set, `quantity` is 0 and means "no quantity", never "nothing ordered",
   * and a call-off release on the line is checked against remaining VALUE.
   */
  valueLimit?: number;
  /**
   * CR-12 — the contract this line's unit price comes from, when it does. A
   * contract-priced line is invoiced at 0% tolerance; a line without one at 2%
   * within the rupiah cap (`fulfilmentConfig.ts`). Absent = no contract price.
   */
  contractNumber?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prReference?: string;
  sourceOfSupply?: string;
  supplierId: string;
  supplierName: string;
  status: POStatus;
  channel: ChannelType;
  currency: string;
  totalValue: number;
  orderDate: string;
  requestedDeliveryDate: string;
  confirmedDeliveryDate: string;
  daysOverdue: number;
  acknowledgmentTimeHours: number;
  lineItems: POLineItem[];
  /**
   * The supplier's answer to the order (REQ-E07-02) — absent until the supplier
   * approves, adjusts or rejects. Whether the PO is ESCALATED is never stored:
   * it is derived at read time from the response deadline and the clock
   * (`poResponseProjection.ts`, law 0.5).
   */
  response?: PoResponse;
  /**
   * When the supplier was last asked to respond, if not at creation — set when
   * the planner rejects a counter-offer and the PO reopens. The response
   * deadline counts from here (or from `orderDate` when absent).
   */
  responseRequestedAt?: string;
  /** Shipping notice confirmation (REQ-E07-05) — absent until recorded. */
  shippingNotice?: PoShippingNotice;
}

/** The three answers a supplier can give a purchase order (REQ-E07-02 BR-02). */
export type PoResponseOption = 'approve' | 'adjust' | 'reject';

/**
 * An adjust reason code (REQUIREMENTS §3.6). Since BL-32 the list is the Hub
 * administrator's (`reasonCodes.ts`, list `poAdjust`): the starter codes are
 * capacity, material, logistics, quality and other, and a code can be added or
 * retired, so the type is the code's shape, not a closed union.
 */
export type PoReasonCode = string;

/** What a rejection is about (REQ-E07-02 BR-06) — list `poReject` since BL-32. */
export type PoRejectionCause = string;

/** One line's counter-offer on an adjusted PO. */
export interface PoLineResponse {
  readonly lineId: string;
  readonly reasonCode: PoReasonCode;
  /** Required when `reasonCode` is `other`. */
  readonly note?: string;
  /** CR-10: 0 < quantity ≤ the line's ordered quantity. */
  readonly counterQty: number;
  /** `YYYY-MM-DD`. */
  readonly counterDate: string;
}

/** The planner's decision on a counter-offer. */
export interface PoCounterReview {
  readonly decision: 'accepted' | 'rejected';
  readonly comment?: string;
  readonly reviewedAt: string;
}

export interface PoResponse {
  readonly option: PoResponseOption;
  /** ISO timestamp of the supplier's answer. */
  readonly respondedAt: string;
  /** Approve: the delivery date the supplier confirmed. */
  readonly confirmedDeliveryDate?: string;
  /** Adjust: one entry per adjusted line; lines not listed are accepted as ordered. */
  readonly lines?: readonly PoLineResponse[];
  /** Reject: at least one cause. */
  readonly rejectionCauses?: readonly PoRejectionCause[];
  readonly comment?: string;
  /** The planner's review of an adjustment, once made. */
  readonly review?: PoCounterReview;
}

export interface PoShippingNotice {
  /** Date shipment started — recorded automatically from the first submitted ASN. */
  readonly startedOn?: string;
  /** The ASN that started it. */
  readonly startedByAsn?: string;
  /** Expected completion date given by the supplier (`YYYY-MM-DD`). */
  readonly expectedCompletionDate?: string;
  /** The previous expected completion date, kept when the supplier changes it. */
  readonly previousCompletionDate?: string;
  readonly updatedAt?: string;
}

// ── Call-offs (REQ-E09-01, REQ-E09-03, REQ-E09-04) ──────────────────────────
//
// A call-off manages ONE delivery under an umbrella PO line (same supplier and
// material). The hub is the record for call-offs; SAP only knows the umbrella
// PO, receipts and invoices (REQUIREMENTS §3.1). Everything clock-derived —
// Escalated, At Risk, Dispatched, on time / late / missed — is computed at read
// time (`callOffRules.ts`) and never stored here.

/** JIT or forecast-based, set at release (BR-09). Since BL-47 the CR-05 tolerance is the same for both. */
export type CallOffType = 'jit' | 'forecast';

/** Stored call-off states — the confirmation statuses of REQ-E09-03 BR-02, plus
 *  the planner's Draft and a dismissed draft. */
export type CallOffStatus =
  | 'Draft'
  | 'Awaiting Confirmation'
  | 'Confirmed'
  | 'Confirmed with New Date'
  | 'Confirmed with Changes'
  | 'Partially Confirmed'
  | 'Rejected'
  | 'Dismissed';

/** How the supplier answered (the four confirming answers). */
export type CallOffConfirmationKind = 'confirm' | 'newDate' | 'changes' | 'partial';

/** One confirmed delivery: a quantity on a date (`YYYY-MM-DD`). */
export interface CallOffDelivery {
  readonly quantity: number;
  readonly date: string;
}

/**
 * The supplier's confirmation. `approval` is the second axis of BR-04: `auto`
 * when the answer was within tolerance, `awaiting` until the planner decides,
 * `approved` once the planner approved it. A planner rejection clears the
 * confirmation and returns the call-off to Awaiting Confirmation.
 */
export interface CallOffConfirmation {
  readonly kind: CallOffConfirmationKind;
  readonly deliveries: readonly CallOffDelivery[];
  readonly comment?: string;
  readonly confirmedAt: string;
  readonly approval: 'auto' | 'awaiting' | 'approved';
  readonly reviewedAt?: string;
}

/** A dispatch heads-up from the supplier (REQ-E09-04). */
export interface CallOffDispatch {
  readonly id: string;
  readonly shippedDate: string;
  readonly expectedArrival: string;
  readonly quantity: number;
  /** Optional link to the ASN for this shipment. */
  readonly asnNumber?: string;
  readonly recordedAt: string;
}

/** A planner or supplier note kept on the call-off (reasons are required). */
export interface CallOffNote {
  readonly action: 'edit' | 'dismiss' | 'change' | 'reject' | 'returned';
  readonly text: string;
  readonly at: string;
}

/** The origin a call-off can carry (see `CallOff.origin`). */
export type CallOffOrigin = 'engine';

/**
 * Material C4 (MR-5 BR-01 to BR-04) — a material's MRP controller (PIC) as the
 * reader may see it, attached at READ by the read model (never stored).
 * PTI: the SAP code, with the name when the code is mapped; an unmapped code
 * shows the code only (BR-02). A supplier: the name only, never the code
 * (BR-04). SAP-copied, so a surface showing it carries the `materialMasterSap`
 * liveness pill (AR-19).
 */
export interface MrpControllerRef {
  /** The SAP MRP controller code, e.g. `P12`. Absent on a supplier's read. */
  readonly code?: string;
  /** Who the code is. Absent when the administrator has not mapped the code. */
  readonly name?: string;
}

export interface CallOff {
  readonly id: string;
  readonly callOffNumber: string;
  /** The umbrella PO and its line (supplier and material come from it). */
  readonly poId: string;
  readonly poNumber: string;
  readonly poLineId: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialCode: string;
  readonly description: string;
  readonly uom: string;
  readonly unitPrice: number;
  readonly currency: string;
  /** Released (requested) quantity and need date — "must come" (REQ-E09-04 BR-01). */
  readonly quantity: number;
  readonly needDate: string;
  readonly type: CallOffType;
  readonly status: CallOffStatus;
  /** When the supplier was last asked to confirm; the 1-working-day deadline counts from here. */
  readonly releasedAt?: string;
  readonly confirmation?: CallOffConfirmation;
  /**
   * The deliveries last agreed by BOTH sides (BL-66 (2); REQ-E10-01 edge case
   * "measure against the latest date agreed by both sides"). Kept when the
   * planner changes a call-off the supplier had confirmed and that confirmation
   * was accepted; OTIF measures against these until the supplier confirms the
   * change and it is accepted. Absent when nothing was ever agreed.
   */
  readonly agreedDeliveries?: readonly CallOffDelivery[];
  /** The supplier's reason when it rejected the call-off. */
  readonly rejectionReason?: string;
  /**
   * Where the call-off came from, when not typed by the planner. `'engine'`: a
   * draft the Order plan created from a forecast-engine recommendation
   * (REQ-E14-05 BR-05). While the engine dataset is not live, such a draft is
   * refused on release (X-03, owner decision 2026-09-23). Absent for every
   * call-off created on the Call-offs page.
   */
  readonly origin?: CallOffOrigin;
  readonly dispatches: readonly CallOffDispatch[];
  readonly notes: readonly CallOffNote[];
  /** Material C4 — the material's MRP controller, projected at read (never stored). */
  readonly mrpController?: MrpControllerRef;
}

// ─── Inventory & capacity collaboration (REQ-E08-01 to REQ-E08-05) ─────────
//
// ONE inventory model (INVENTORY-REFERENT-01 closed): every row is a supplier ×
// material position PROJECTED AT READ from the supplier stock submissions (the
// InventoryDeclaration store), PTI's SAP stock and reorder point, the in-transit
// ASNs and call-off dispatch notices, and the forecast. Nothing here is stored,
// and nothing clock-derived (staleness, days of supply, bands) is a field: the
// pages compute those with the shared rules in `transitions/inventoryRules.ts`.

/** Where an incoming quantity comes from (REQ-E08-01 BR-06). */
export type IncomingSource = 'production' | 'asn' | 'dispatch';

/** One incoming quantity with its date — the per-date detail behind the aggregate. */
export interface IncomingItem {
  readonly source: IncomingSource;
  /** Expected completion or arrival (`YYYY-MM-DD`); null when the supplier gave none. */
  readonly date: string | null;
  readonly quantity: number;
  /** The ASN number or call-off number the quantity rides on; null for production. */
  readonly reference: string | null;
}

/** An API sync attempt for a connected supplier (REQ-E08-02 BR-03). */
export interface StockSyncAttempt {
  readonly id: string;
  readonly supplierId: string;
  readonly at: string;
  readonly outcome: 'success' | 'failed';
  /** i18n key suffix of the business-language error, when it failed. */
  readonly errorKey?: string;
}

/** Where the average daily demand came from (CR-01). */
export type DemandSource = 'forecast' | 'planningEstimate' | 'none';

export interface InventoryPosition {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialCode: string;
  readonly materialLabel: string;
  /** ROH = raw material, VERP = packaging (BR-07). */
  readonly materialType: MaterialType;
  readonly materialGroup: string;
  readonly uom: string;
  /** Latest supplier stock submission; null when the supplier never submitted. */
  readonly supplierSoh: number | null;
  /** The supplier's own reorder point; null reads "Not provided". */
  readonly supplierRop: number | null;
  /** PTI stock and reorder point from SAP. Null for a supplier without access. */
  readonly ptiSoh: number | null;
  readonly ptiRop: number | null;
  /** Whether PTI stock is shown on this row (always true for PTI users). */
  readonly ptiStockShared: boolean;
  /** Consignment material (MN-INV-10). */
  readonly consignment: boolean;
  readonly incoming: readonly IncomingItem[];
  /** CR-01 — forecast for the next 30 days ÷ 30; null when there is no demand. */
  readonly avgDailyDemand: number | null;
  /**
   * CR-24 — the supplier's lead time for this material, in days (master data,
   * not a clock state). Null when none is on record: the risk class then falls
   * back to the CR-02 bands and a "lead time missing" alert is raised.
   */
  readonly leadTimeDays: number | null;
  readonly demandSource: DemandSource;
  readonly lastUpdatedAt: string | null;
  readonly channel: StockChannel | null;
  /** The data-update SLA for this supplier × material, in days (AC-05). */
  readonly updateSla: number;
  /**
   * Material B1 (MR-1 BR-05, AR-07) — the instant the figure turns stale, by
   * the supplier's update mode: manual at the cutoff of the cycle after the
   * last update, API `stale.apiHours` after the last successful pull, a BL-32
   * override that many days after the last update. Null when there is no
   * figure. Derived at read time, never stored (AD-1).
   */
  readonly staleAt: string | null;
  /**
   * Material B1 (owner ruling 2026-09-29) — when the latest API pull failed
   * after the figure on hand; null otherwise. A WARNING only: a failed pull
   * does not make the figure stale — the figure goes stale `stale.apiHours`
   * after the last SUCCESSFUL pull (`staleAt`).
   */
  readonly lastPullFailedAt: string | null;
  readonly apiConnected: boolean;
  /** The latest API sync attempt for this supplier, if any. */
  readonly lastSync: StockSyncAttempt | null;
  readonly batches: readonly {
    readonly batchNumber: string;
    readonly qty: number;
    readonly manufacturingDate?: string;
    readonly expiryDate?: string;
  }[];
  /** Material C4 — the material's MRP controller (MR-5 BR-03), narrowed per reader. */
  readonly mrpController?: MrpControllerRef;
  /**
   * Material C2 — this supplier's APPROVED trade name for the material (MR-3
   * BR-02), shown beside PTI's description. Projected at read, never stored;
   * absent while no name is approved or the material is no longer assigned.
   */
  readonly tradeName?: string;
}

// ─── Supplier trade names (Material C2 · MR-3 BR-01 to BR-06) ───────────────

/** Where one supplier trade name stands. `Replaced` = a later name took its place. */
export type MaterialNameState = 'Awaiting approval' | 'Approved' | 'Rejected' | 'Replaced';

/**
 * One supplier's trade name for one PTI material, as recorded (MR-3 f). A
 * changed name is a NEW record; the earlier one moves to `Replaced` only when
 * the new one is approved (BR-02), so the approved name stays in use meanwhile.
 */
export interface SupplierMaterialName {
  readonly id: string;
  readonly supplierId: string;
  readonly materialCode: string;
  readonly tradeName: string;
  /** The supplier's own material number, when it gave one (at most 40 characters). */
  readonly supplierMaterialNo?: string;
  readonly state: MaterialNameState;
  /** From the session, never the form. */
  readonly submittedBy: ActorAttribution;
  /** Store-assigned from the hub clock. */
  readonly submittedAt: string;
  readonly decidedBy?: ActorAttribution;
  readonly decidedAt?: string;
  /** Why Material Planning rejected it; the supplier sees this text. */
  readonly rejectionReason?: string;
  /** True when PTI loaded it in bulk, approved on load (BR-06). */
  readonly loadedByPti?: boolean;
}

/**
 * One supplier × assigned material with its trade names, as the reader may see
 * it. A supplier reads its own assigned materials only (BR-03); PTI reads every
 * pair that carries a name. A material no longer assigned is left out, and so
 * are its names (edge case 2).
 */
export interface MaterialNameRow {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialCode: string;
  /** PTI's description, through the material master resolver. */
  readonly materialLabel: string;
  /** The approved name in force, if any. */
  readonly approved?: SupplierMaterialName;
  /** The newest record for the pair (awaiting, rejected or approved), if any. */
  readonly latest?: SupplierMaterialName;
  /** Every record for the pair, oldest first. */
  readonly history: readonly SupplierMaterialName[];
}

/** One entry in the supplier-access log (REQ-E08-03 BR-06). */
export interface StockAccessLogEntry {
  readonly action: 'grant' | 'change' | 'remove';
  /** Empty = all materials the supplier supplies. */
  readonly materials: readonly string[];
  readonly at: string;
  readonly actor: ActorAttribution;
}

/** A supplier's access to PTI stock (REQ-E08-03). */
export interface StockAccessGrant {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly active: boolean;
  /** Empty = all materials the supplier supplies. */
  readonly materials: readonly string[];
  readonly log: readonly StockAccessLogEntry[];
}

/**
 * A reason code for allocation or commitment below demand (section 3.6) —
 * lists `capacityShortfall` / `commitmentShortfall`, the Hub administrator's
 * since BL-32, so a code's shape rather than a closed union.
 */
export type CapacityReason = string;

/** One weekly bucket of a capacity submission (REQ-E08-04). */
export interface CapacityWeekEntry {
  /** Monday of the week (`YYYY-MM-DD`). */
  readonly week: string;
  readonly allocated: number;
  readonly upside?: number;
  readonly reason?: CapacityReason;
  readonly note?: string;
}

export interface CapacitySubmission {
  readonly id: string;
  readonly supplierId: string;
  /**
   * Material C5 (MR-8 BR-04) — the planning group the capacity is stated for.
   * Was the SAP `materialGroup`; every earlier submission migrated to its SAP
   * group's default planning group (`pg-<materialGroup>`).
   */
  readonly planningGroupId: string;
  readonly submittedAt: string;
  readonly weeks: readonly CapacityWeekEntry[];
}

/** Capacity against demand for one supplier × planning group, 13 weekly buckets. */
export interface CapacityPlan {
  readonly supplierId: string;
  readonly supplierName: string;
  /** Material C5 (MR-8 BR-04) — the planning group; its name comes from the store. */
  readonly planningGroupId: string;
  readonly materials: readonly string[];
  readonly uom: string;
  readonly weeks: readonly {
    readonly week: string;
    readonly demand: number;
    readonly entry: CapacityWeekEntry | null;
    /**
     * Material C5 (MR-8 BR-05) — materials moved into or out of the group after
     * the latest submission, so the figure entered for this week no longer
     * covers the group's materials. Present only when true; derived from the
     * move time, never stored.
     */
    readonly needsReEntry?: true;
  }[];
  readonly latest: CapacitySubmission | null;
}

// ─── Forecast collaboration (REQ-E06-01 to REQ-E06-03) ──────────────────────
//
// A forecast VERSION is a ForecastPublication of one stream (packaging weekly,
// raw material monthly). A commitment is a RequirementResponse against a line.
// Every row below is PROJECTED AT READ; nothing clock-derived is a field — a
// line carries its deadline, and whether it is due soon or overdue is computed
// by `transitions/forecastRules.deadlineState` against the page's clock.

/** REQ-E06-01 BR-04 — Firm, Trade-off, Forecast (the commitment classes firm / semi-firm / visibility-only). */
export type ForecastZone = 'firm' | 'tradeOff' | 'forecast';

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
export type CommitmentState =
  | 'awaiting'
  | 'acknowledged'
  | 'accepted'
  | 'exception'
  | 'acceptedByPlanner'
  | 'revisionRequested';

/** One version of a forecast stream, with who has opened it (REQ-E06-01). */
export interface ForecastVersionView {
  readonly publicationId: string;
  readonly planVersion: string;
  readonly stream: ForecastStream;
  readonly version: number;
  readonly publishedAt: string;
  readonly emergency: boolean;
  /** The planner's note when the version moved demand between suppliers. */
  readonly changeNote: string | null;
  readonly isCurrent: boolean;
  /** Suppliers with lines in this version; a supplier reads only itself. */
  readonly suppliers: readonly {
    readonly supplierId: string;
    readonly supplierName: string;
    /** When the supplier first opened this version; null when not yet. */
    readonly viewedAt: string | null;
    /** BR-06 — this supplier's periods whose quantity moved against the previous version. */
    readonly changedPeriods: number;
  }[];
}

/** One material × period of a supplier's current forecast, with its commitment. */
export interface ForecastCommitmentLine {
  /** publicationId | supplier | material | period. */
  readonly key: string;
  readonly stream: ForecastStream;
  readonly publicationId: string;
  readonly planVersion: string;
  readonly version: number;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialCode: string;
  readonly materialLabel: string;
  readonly materialGroup: string;
  readonly uom: string;
  /** A week (its Monday, `YYYY-MM-DD`) or a month (`YYYY-MM`). */
  readonly periodBucket: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly zone: ForecastZone;
  readonly forecastQty: number;
  /** The quantity in the previous version; null when the period was not in it. */
  readonly previousQty: number | null;
  /** When the current version was published (the deadline counts from it). */
  readonly publishedAt: string;
  /** CR-26 / REQ-E06-02 BR-07 — Firm: 1 working day; Trade-off and Forecast: 3
   *  working days after publication, on the hub calendar (BL-48, BL-50). */
  readonly dueAt: string;
  /** REQ-E06-03 BR-06 — the first reminder, at half the deadline. */
  readonly reminderAt: string;
  readonly state: CommitmentState;
  /** The submitted commitment that stands for the current quantity. */
  readonly response: RequirementResponse | null;
  /**
   * CR-26 — the deadline the standing response ANSWERED (its own version's
   * publication and zone), so a carried-forward commitment keeps the verdict it
   * earned. Derived from publications, never from a clock; null with no response.
   */
  readonly responseDueAt: string | null;
  /** True when that commitment answered an earlier version with the same quantity. */
  readonly carriedForward: boolean;
  /** The supplier's own unsubmitted draft (never in PTI's read — BR-10). */
  readonly draft: RequirementResponse | null;
  readonly committedQty: number | null;
  /** REQ-E06-03 BR-05 — every revision request and note on this period, oldest first. */
  readonly log: readonly DisputeEntry[];
  /** REQ-E06-03 BR-05 — the other suppliers qualified for the material (where demand can move). */
  readonly otherQualifiedSuppliers: readonly { readonly supplierId: string; readonly supplierName: string }[];
}

/**
 * REQ-E06-04 — one supplier × material × cycle of the fixed stock (FS)
 * reconcile: committed against called off against held, with the agreed
 * maximum stock and the outcome. Computed at read, never stored.
 */
export type FixedStockReconcileRow = FsRow;

/** REQ-E06-03 BR-07 — supplier coverage per material, with distributor lead times (an estimate). */
/** REQ-E14-02 — the trailing windows the reliability read offers. */
export const RELIABILITY_WINDOWS = [13, 26] as const;
export type ReliabilityWindowWeeks = (typeof RELIABILITY_WINDOWS)[number];

/** One supplier's reliability row as served (REQ-E14-02). Computed at read, never stored. */
export interface SupplierReliabilityView extends SupplierReliability {
  readonly supplierName: string;
  /** Delivered on the confirmed date (CFOT), per PO, on the engine data (`engine/cfot.agreedCfot`, BL-82). */
  readonly cfot: SupplierCfot;
  /** The window measured, inclusive (`YYYY-MM-DD`). */
  readonly windowFrom: string;
  readonly windowTo: string;
}

/** One material's requirement as served (REQ-E14-03), with display names. */
export interface MaterialPlanView extends MaterialPlan {
  readonly materialLabel: string;
  readonly supplierName: string | null;
}

/**
 * REQ-E14-03 — the material requirement run as served: computed at read on the
 * engine's (SIMULATED) dataset, never stored. PTI only; a supplier gets null.
 */
export interface MaterialRequirementView extends MaterialRequirementRun {
  readonly materials: readonly MaterialPlanView[];
  /** Finished-good SKU → name, for the drill-in behind a gross requirement. */
  readonly finishedGoodNames: Readonly<Record<string, string>>;
}

/** One material's safety stock, safety lead time and ROP as served (REQ-E14-04). */
export interface MaterialSafetyStockView extends MaterialSafetyStock {
  readonly materialLabel: string;
  readonly supplierName: string | null;
  /** BR-06 (BL-116) — the change since the last run of the material's stream, and why. */
  readonly change: SafetyStockChange;
}

/**
 * REQ-E14-04 — the safety-stock run as served: computed at read on the engine's
 * (SIMULATED) dataset with the administrator's targets in force. PTI only.
 */
export interface SafetyStockView extends SafetyStockRun {
  readonly materials: readonly MaterialSafetyStockView[];
  /** BR-06 — the last run each stream is compared with (X-04: packaging weekly, raw material monthly). */
  readonly previousAsOf: { readonly packaging: string; readonly rawMaterial: string };
}

/** One material's E14-05 order plan as served, with display names. */
export interface MaterialOrderPlanView extends MaterialOrderPlan {
  readonly materialLabel: string;
  readonly supplierName: string | null;
}

export interface WarehousePlanView extends WarehousePlan {
  readonly materials: readonly MaterialOrderPlanView[];
}

/**
 * REQ-E14-05 — the order plan as served: computed at read on the engine's
 * (SIMULATED) dataset with the cost rates in force (ENG-D6 placeholders). PTI
 * only; a supplier gets null.
 */
export interface OrderPlanView extends OrderPlanRun {
  /** The finished-goods plan snapshot the requirement used. */
  readonly planMadeAt: string | null;
  /** BR-03 compares against the run as of this day (last week's). */
  readonly previousAsOf: string | null;
  readonly warehouses: readonly WarehousePlanView[];
}

/** REQ-E14-13 — display names beside an order line (a proposal or an information line). */
export interface RescheduleLineNames {
  readonly materialLabel: string;
  readonly supplierName: string | null;
  readonly uom: import('../sdc/types').Uom;
}

export type RescheduleProposalView = Proposal & RescheduleLineNames;
export type RescheduleInfoView = InfoLine & RescheduleLineNames;

export interface WarehouseRescheduleView extends WarehouseReschedule {
  readonly proposals: readonly RescheduleProposalView[];
  readonly info: readonly RescheduleInfoView[];
}

/**
 * Material E1 (MR-7 BR-08) — which figure a planner input stands in for:
 * the supplier's SOH, its in-production quantity (with the completion date in
 * `date`), or a to-distributor leg (with its ETA in `date`).
 */
export type SimulationOverrideField = 'soh' | 'inProduction' | 'toDistributor';

/**
 * Material E1 (MR-7 BR-06, BR-08; plan AD-1) — a planner's input to the stock
 * simulation, APPENDED (MAT-R3). It applies to the simulation only, until the
 * supplier's next stock record, and never changes the stock record or counts
 * for update compliance (MR-2). The latest input per field is the one in force.
 */
export interface SimulationOverride {
  readonly id: string;
  readonly supplierId: string;
  readonly materialCode: string;
  readonly field: SimulationOverrideField;
  /** A quantity in the material's canonical unit. */
  readonly value: number;
  /** `YYYY-MM-DD`: the completion date (inProduction) or ETA (toDistributor). */
  readonly date?: string;
  readonly enteredBy: ActorAttribution;
  readonly enteredAt: string;
}

/**
 * REQ-E14-13 BR-07 / ENG-D16 — the Material Planner's record that a PO-line
 * proposal was taken to SAP (the Hub does not edit a PO). A ledger: the latest
 * mark per line is the one in force.
 */
export interface SapChangeMark {
  readonly id: string;
  /** `po:<poNumber>#<line>` — the proposal's line id. */
  readonly lineId: string;
  readonly poNumber: string;
  readonly line: number;
  readonly proposalType: ProposalType;
  /** Null for a cancellation. */
  readonly proposedDate: string | null;
  readonly proposedQuantity: number;
  readonly markedAt: string;
  readonly markedBy: ActorAttribution;
}

/**
 * REQ-E14-13 — reschedule or cancel open orders, as served: computed at read
 * on the engine's (SIMULATED) dataset plus the Hub's open call-offs, with the
 * cost rates and threshold in force. PTI only; a supplier gets null.
 */
export interface RescheduleView extends RescheduleRun {
  /** The finished-goods plan snapshot the requirement used. */
  readonly planMadeAt: string | null;
  readonly warehouses: readonly WarehouseRescheduleView[];
  /** BR-09 — E14-02's portfolio plan-change share over its window, before any proposal is sent. */
  readonly planChange: PlanChangeBaseline;
  readonly planChangeWindowWeeks: number;
  /** Open PO lines not yet confirmed: not in the projection (E14-03's default), counted here. */
  readonly unconfirmedPoLines: number;
  /** "Taken to SAP" marks, latest first. */
  readonly sapMarks: readonly SapChangeMark[];
}

/** REQ-E14-06 — one supplier × material, with its display names. */
export interface StabilisedSeriesView extends SeriesResult {
  readonly supplierName: string;
  readonly materialLabel: string;
  readonly uom: import('../sdc/types').Uom;
}

/** REQ-E14-06 — the stabiliser run over one source of plan versions. */
export interface StabiliseRunView extends Omit<StabiliseRun, 'series'> {
  readonly series: readonly StabilisedSeriesView[];
}

/**
 * REQ-E14-06 — stabilise and publish the plan, as served: computed at read on
 * the engine's (SIMULATED) dataset with the damping weight in force (X-05).
 * PTI only; a supplier gets null (X-03).
 */
export interface StabilisedPlanView {
  /** The day the version to publish is made (the hub's present). */
  readonly asOf: string;
  /** The finished-goods plan snapshot today's requirement used. */
  readonly planMadeAt: string | null;
  readonly params: StabiliseParams;
  /** The replayed version days per stream, oldest first (ENG-B30). */
  readonly versions: { readonly packaging: readonly string[]; readonly rawMaterial: readonly string[] };
  /** On the engine's material plan: E14-04 → E14-03, net requirement lot-for-lot (ENG-B29). */
  readonly engine: StabiliseRunView;
  /** On SAP's published plan history, the stand-in E14-02 measures (ENG-B33). */
  readonly sapHistory: StabiliseRunView;
  /** BR-06 — the demand range (P50 / P90, E14-09) is built: the Demand forecast page (BL-111). */
  readonly rangeBuilt: true;
  /**
   * BR-06 — and it is NOT beside the published quantity: the quantities here are
   * material net requirements from SAP's plan (ENG-B66), and publishing from the
   * engine is refused while its data is simulated (ENG-B35, ENG-B99).
   */
  readonly rangePublished: false;
}

/**
 * REQ-E14-01 — the engine's data health, as served: every feed's last arrival
 * and freshness against the administrator's limit, its record count and the
 * feed spec's quality checks with the failing records by key, and the engine
 * steps each failure would affect. Computed at read on the engine's
 * (SIMULATED) dataset. PTI only; a supplier gets null.
 */
export interface DataHealthView extends DataHealthReport {
  /** Where the dataset came from (X-03): SIMULATED until the MDM feed is live. */
  readonly provenance: DatasetProvenance;
}

/**
 * REQ-E14-07 — the finished-goods demand forecast, as served: weekly sell-in
 * per SKU for the next 26 weeks with the method that made it, SKU, brand and
 * total reconciled, OEM products left out, and SAP's plan in force beside it.
 * Computed at read on the engine's (SIMULATED) dataset. PTI only; a supplier
 * gets null. It does not feed E14-03: SAP's plan stays the input until the
 * backtest (E14-10) exists (ENG-B66).
 */
export interface DemandForecastView extends DemandForecastRun {
  /**
   * REQ-E14-09 — P50, P90 (and the administrator's extra quantile) per SKU,
   * brand, total and material, calibrated on a replay of the past year's
   * forecasts, with how often actuals fell outside. Not published to suppliers
   * and not read by E14-04 (ENG-B66, ENG-B97).
   */
  readonly range: DemandRangeRun;
  /** Where the dataset came from (X-03): SIMULATED until the MDM feed is live. */
  readonly provenance: DatasetProvenance;
  /** The source E14-03 to E14-06 and E14-13 plan on today. */
  readonly materialPlanningSource: 'sapPlan';
}

export interface ForecastCoverageRow {
  readonly stream: ForecastStream;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly materialCode: string;
  readonly materialLabel: string;
  readonly uom: string;
  /** Σ Firm demand in the current version (CR-03 denominator). */
  readonly firmDemandQty: number;
  /** CR-03 ratio; null when the supplier has no stock figures. */
  readonly ratio: number | null;
  readonly status: 'covered' | 'atRisk' | 'uncovered' | 'noFigures';
  readonly supplierType: 'manufacturer' | 'distributor';
  /** Shortest principal-to-distributor lead time, for a distributor. */
  readonly principalLeadTimeDays: number | null;
  /** A distributor shortfall no principal order placed now can bridge in time. */
  readonly unbridgeable: boolean;
}

export type InventoryAlertRule =
  | 'ptiBelowRop'
  | 'supplierBelowRop'
  | 'projectedStockOut'
  | 'capacityBelowDemand'
  | 'staleData'
  | 'coverage'
  /** REQ-E08-05 BR-01 — committed quantity below forecast beyond tolerance (REQ-E06-03). */
  | 'commitmentBelowForecast'
  /** CR-24 / BR-02 — no supplier lead time on record; the risk class fell back to CR-02. */
  | 'leadTimeMissing'
  /** MR-6 BR-13 — a confirmed call-off due within the lead time is larger than declared SOH + production. */
  | 'callOffNotCovered';

export type RiskClass = 'high' | 'medium' | 'low';

/** CR-02 — the days-of-supply bands, used only where a lead time is missing. */
export type SupplyBand = 'critical' | 'warning' | 'healthy' | 'excess';

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
export type RiskBasis =
  | { readonly kind: 'leadTime'; readonly leadTimeDays: number; readonly daysOfCover: number }
  | { readonly kind: 'fallbackBands'; readonly band: SupplyBand; readonly daysOfCover: number }
  | { readonly kind: 'noCover'; readonly leadTimeDays: number | null }
  | { readonly kind: 'rule' };

/** A rule-based alert (REQ-E08-05). The key is rule × material (or group) × supplier. */
export interface InventoryAlert {
  readonly key: string;
  readonly rule: InventoryAlertRule;
  readonly supplierId: string;
  readonly supplierName: string;
  /** The material, or the material group for a capacity alert. */
  readonly subject: string;
  readonly subjectLabel: string;
  readonly riskClass: RiskClass;
  /** CR-24 — what the class was decided on (derived with the alert, never stored). */
  readonly riskBasis: RiskBasis;
  /**
   * MR-9 BR-03 — days until the risk bites, the order within a class (derived
   * with the alert, never stored): days of cover or to the projected stock-out,
   * days to the first capacity gap week, minus the days stale, else 0.
   */
  readonly daysToImpact: number;
  readonly status: 'open' | 'closed';
  readonly closedAt?: string;
  /** MR-9 BR-04 — the `alertClose` code; absent on a closure recorded before reasons (counts as Other). */
  readonly closeReason?: string;
  readonly actionNote?: string;
  /** Material C4 — the MRP controller of the material an alert is about. Absent
   *  on a capacity alert, whose subject is a material group. */
  readonly mrpController?: MrpControllerRef;
}

export interface POSummary {
  id: string;
  poNumber: string;
  supplierName: string;
  status: POStatus;
  totalValue: number;
  orderDate: string;
  daysOverdue: number;
}

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
 * state:** §82 put it in `supplierDocument.flow.ts` and
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
export type SupplierDocumentStatus =
  | 'Valid'
  | 'Awaiting Upload'
  | 'Under Review'
  | 'Rejected';

export type SupplierDocumentCategory =
  | 'Halal Compliance'
  | 'BPOM Regulatory'
  | 'Tax & Legal'
  | 'Quality'
  | 'Contract'
  | 'Other';

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
export interface CertificateDeclaration {
  /**
   * ⚠️ **A CLAIM UNTIL SOMEBODY CONFIRMS IT** (operator ruling, option C). The
   * supplier declares the scheme; compliance confirms or refuses it. The gate
   * cannot mistake the claim for a fact because it reads `lifecycleState`, and a
   * declared document sits in `Under Review` until `t_supplierdoc_verify` fires.
   */
  certType: CertType;
  certNumber: string;
  /** The body that issued it, in the supplier's words. */
  issuer: string;
  issuedOn: string;
  /**
   * `null` when the certificate has none — a BPJPH cert has permanent validity
   * under GR 42/2024, so `null` is the truth rather than a missing answer.
   *
   * ⚠️ **AND FOR A LEGACY CERT THIS NUMBER IS NOT AUTHORITY.**
   * `complianceProjection.ts` records the statute: a GR-39 / MUI cert's term is
   * **issuance plus four years REGARDLESS OF WHAT THE DOCUMENT PRINTS.** A
   * supplier reading its own certificate types the printed date, so what lands
   * here is what the paper says — which is exactly why it lands as a DECLARED
   * value under review rather than as a registry fact.
   */
  expiresOn: string | null;
  /**
   * ⚠️ **THE SUPPLIER'S OWN WORDS FOR WHAT THE CERTIFICATE COVERS — AND IT IS
   * FREE TEXT ON PURPOSE, NOT FOR WANT OF A BETTER FIELD.** The halal gate joins
   * on `ComplianceRegistryEntry.materialCodes`: **Paragon's SAP material codes,
   * at raw-material grain, from Paragon's master data.** A supplier does not hold
   * that vocabulary, and this tree's two fixture families do not even agree about
   * the same supplier — sup-007's registry rows cover `FR-ROUD-4470` and four
   * others while its documents link to three `PK-PETB-88xx` codes, **intersection
   * empty**, both sets non-empty. Asking for codes would be asking for a guess,
   * and a guessed code joins silently and wrongly. **A sentence cannot be
   * mistaken for a join key.** Compliance assigns codes at verify.
   */
  scopeText: string;
  /** When the declaration was recorded. Store-assigned, never payload-supplied —
   *  the `pinnedAt` discipline: a caller that could set it could backdate its own
   *  submission against an expiry deadline. */
  declaredAt: string;
  /**
   * ⚠️ **ALWAYS `UNATTRIBUTED` IN THIS TREE**, for `rejectedBy`'s reason and by
   * the same type: `CurrentIdentity.actor` is `UNATTRIBUTED:
   * NO_PERSON_IN_SESSION` everywhere, and typing this as `ActorAttribution`
   * rather than `string` means the surface must RENDER the unattributed state
   * instead of printing a name it does not have (C10 §5.2 / D-ID-3).
   */
  declaredBy: ActorAttribution;
}

export interface SupplierDocument {
  id: string;
  supplierId: string;
  name: string;
  category: SupplierDocumentCategory;
  status: SupplierDocumentStatus;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string | null;
  fileType: string;
  fileSize: string;
  version: string;
  linkedTo: string;
  notes?: string;
  /**
   * ⚠️ **THE THREE REFUSAL FIELDS TRAVEL TOGETHER OR NOT AT ALL** — a reason
   * with no timestamp is an accusation with no date, and a timestamp with no
   * reason is the dead end restated. `supplierDocumentRefusal.test.ts` asserts
   * the co-presence in both directions, so a later fixture cannot seed half of
   * one.
   *
   * The authored refusal text. Free prose, shown to the SUPPLIER verbatim — the
   * standard `DisputeEntry.text` set one tenancy over, where the buyer's reason
   * renders beside the supplier's own words.
   */
  rejectionReason?: string;
  /** When the refusal was recorded. Rendered beside the reason, never alone. */
  rejectedAt?: string;
  /**
   * ⚠️ **ALWAYS `UNATTRIBUTED` IN THIS TREE, AND THE TYPE IS WHAT KEEPS THAT
   * HONEST.** `CurrentIdentity.actor` is `UNATTRIBUTED: NO_PERSON_IN_SESSION`
   * everywhere, so a refusal cannot name a person; typing this as
   * `ActorAttribution` rather than `string` means the surface must RENDER the
   * unattributed reason instead of printing a name it does not have. C10 §5.2 /
   * D-ID-3 — no typed-name attribution until session-resolved identity exists.
   */
  rejectedBy?: ActorAttribution;
  /**
   * Material G1 (MR-10, plan AD-2) — when compliance verified the document
   * (`t_supplierdoc_verify`). Store-assigned from the hub clock, never a payload
   * field. The qualification history replays from it: a document counts toward
   * a level from this instant. Absent on every seeded row, which predates the
   * verb; those count from their `issuedDate`.
   */
  verifiedAt?: string;
  /**
   * The certificate details the supplier stated, present only on a DECLARED
   * document. See `CertificateDeclaration` — the whole object is optional and
   * its fields are not, so half a declaration cannot exist.
   */
  declaration?: CertificateDeclaration;
}

// ─── Invoice — DR-7: ONE canonical machine + persona projections ──────────────
// The invoice is ONE economic document. `InvoiceStatus` is the single canonical
// lifecycle stored on the entity; the two persona vocabularies below
// (`SupplierInvoiceStatus`, `BuyerInvoiceStatus`) are PROJECTION LABELS derived
// at read time (see `invoiceProjection.ts`), never independently stored. This is
// DR-7 (ratified 2026-07-06): two-machines-plus-mapping was rejected on the
// HALAL-XPERSONA-01 drift precedent. `Overdue` is computed (DR-8, law 0.5); the
// 3-way `matchStatus` is the match sub-flow's rolled-up terminal (census G2).

/** Canonical invoice lifecycle (the stored truth). `Releasing Payment` is the
 *  Option-B SAP interim; the real FI document is minted only on settlement. */
export type InvoiceStatus =
  | 'Draft'
  | 'Submitted'
  | 'Matched'
  | 'Approved'
  | 'Releasing Payment'
  | 'Payment Released'
  | 'Remittance Received'
  | 'Disputed';

/** SUPPLIER-persona projection labels of `InvoiceStatus` (+ computed Overdue). */
export type SupplierInvoiceStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Payment Released'
  | 'Remittance Received'
  | 'Overdue'
  | 'Disputed';

export type InvoiceChannel = 'WhatsApp' | 'Web' | 'Email' | 'API';

/** The canonical invoice entity — the ONE row the store holds and both persona
 *  reads project from (`toSupplierInvoice` / `toBuyerInvoice`). Fields are the
 *  union of what each surface needs; persona reads select + relabel. */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  poId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  /** Match sub-flow rolled-up terminal (census G2); surfaced on the buyer read. */
  matchStatus: InvoiceMatchStatus;
  submittedDate: string;
  dueDate: string;
  paymentDate: string | null;
  paymentRef: string | null;
  sapFiDoc: string | null;
  sapGrDoc: string | null;
  bankAccount: string;
  channel: InvoiceChannel;
  approver: string;
  paymentTerms: string;
  buyerContact: string;
  remittanceNote: string | null;
  /**
   * REQ-E07-07 — the invoiced lines, pre-filled from the goods receipts the
   * supplier selected. Absent on invoices that predate receipt-based invoicing
   * (those are still matched when a receipt posts).
   */
  lines?: InvoiceLine[];
  /** The supplier's invoice date (`YYYY-MM-DD`). */
  invoiceDate?: string;
  /** Tax invoice (e-Faktur) attachment — the file name only in the prototype. */
  taxInvoiceFile?: string;
  /** Finance's reason when it returned the invoice to the supplier. */
  returnReason?: string;
}

/** One invoiced line, drawn from one goods receipt line (REQ-E07-07). */
export interface InvoiceLine {
  /** The goods receipt the quantity was received on (its id). */
  receiptId: string;
  grNumber: string;
  materialCode: string;
  description: string;
  /** Invoiced quantity — at most accepted minus already invoiced (BR-02). */
  quantity: number;
  uom?: string;
  /** The PO unit price for this material (CR-12 basis). */
  unitPrice: number;
  /**
   * CR-12 — the PO line's contract, copied with its price when the line is
   * pre-filled (and refused if it differs from the PO): it decides whether the
   * line is checked at 0% or at 2% within the rupiah cap.
   */
  contractNumber?: string;
  /**
   * What the supplier billed for this line, when the invoice states it per
   * line. Absent: the line is billed at quantity × unit price, and any
   * difference on the invoice total is not split by line.
   */
  billedAmount?: number;
}

/**
 * The status list a supplier follows (REQ-E07-07 step 5, plus Returned). A
 * read-time label of the stored `InvoiceStatus`, never stored itself.
 */
export type SupplierInvoiceStage =
  | 'Draft'
  | 'Submitted'
  | 'Verified'
  | 'Scheduled for payment'
  | 'Paid'
  | 'Returned';

export interface SupplierInvoice {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  poNumber: string;
  amount: number;
  status: SupplierInvoiceStatus;
  submittedDate: string;
  dueDate: string;
  paymentDate: string | null;
  paymentRef: string | null;
  bankAccount: string;
  sapFiDoc: string | null;
  channel: InvoiceChannel;
  buyerContact: string;
  remittanceNote: string | null;
  /** REQ-E07-07 — the supplier's status list, derived at read time. */
  stage: SupplierInvoiceStage;
  /** CR-14 — past its due date and not paid. Derived at read time. */
  overdue: boolean;
  /** CR-14 — whole days past the due date (0 when not overdue). */
  daysOutstanding: number;
  /** The match result (CR-12 / CR-13), shown to the supplier. */
  matchStatus: InvoiceMatchStatus;
  lines: InvoiceLine[];
  invoiceDate: string | null;
  taxInvoiceFile: string | null;
  returnReason: string | null;
}

/** BUYER-persona projection labels of `InvoiceStatus` (+ computed Overdue). */
export type BuyerInvoiceStatus =
  | 'Pending Match'
  | 'Approved'
  | 'Disputed'
  | 'Payment Released'
  | 'Overdue';

export type InvoiceMatchStatus =
  | 'Matched'
  | 'Pending GR'
  | 'Qty Mismatch'
  | 'Price Variance'
  | 'Pending';

export interface BuyerInvoice {
  id: string;
  /**
   * THE CANONICAL LIFECYCLE STATE, carried alongside the display label.
   *
   * ⚠️ **`status` ABOVE IS A LOSSY DISPLAY LABEL AND MUST NEVER GATE AN ACTION.**
   * `toBuyerLabel` collapses `Approved` into the computed `Overdue` once the due
   * date passes, and collapses the Option-B interim `Releasing Payment` into
   * `Payment Released`. Both collapses are deliberate and both destroy exactly
   * the distinction a "what may I do here?" question needs. This field is the
   * un-collapsed truth, and it is what `userVerbsFrom('invoice', …)` is asked.
   *
   * Display reads `status`; legality reads `lifecycleState`. Keeping them as two
   * fields is what makes the confusion a type error rather than a silent
   * wrong answer.
   */
  lifecycleState: InvoiceStatus;
  invoiceNumber: string;
  supplierName: string;
  supplierId: string;
  poNumber: string;
  poId: string;
  amount: number;
  currency: string;
  status: BuyerInvoiceStatus;
  receivedDate: string;
  dueDate: string;
  paymentDate: string | null;
  matchStatus: InvoiceMatchStatus;
  sapFiDoc: string | null;
  sapGrDoc: string | null;
  approver: string;
  paymentTerms: string;
  daysOutstanding: number;
  bankAccount: string;
  channel: InvoiceChannel;
  /** REQ-E07-07 — the invoiced lines and the supplier's documents. */
  lines: InvoiceLine[];
  invoiceDate: string | null;
  taxInvoiceFile: string | null;
  returnReason: string | null;
}

export type AsnStatus =
  | 'Draft'
  | 'Submitted'
  | 'In Transit'
  | 'Delivered'
  | 'Discrepancy'
  /** REQ-E07-04 — withdrawn by the supplier before receipt. A cancelled ASN no
   *  longer counts toward the PO line's open quantity or the in-transit figure. */
  | 'Cancelled'
  /**
   * MR-6 BR-08 — a line arrives with less than the minimum remaining shelf
   * life, and the supplier asked Quality for an exception. Not in transit, not
   * receivable, still cancellable. Approval moves it to Submitted; rejection
   * returns it to Draft.
   */
  | 'Awaiting exception';

export interface AsnLineItem {
  materialCode: string;
  description: string;
  orderedQty: number;
  shippedQty: number;
  /** The batch number (REQ-E07-04 BR-04). Kept under its original field name. */
  lotNumber: string;
  /** Unit of the shipped quantity, from the PO line. */
  uom?: string;
  /** Optional expiry date of the batch (`YYYY-MM-DD`). */
  expiryDate?: string;
  /** Material C4 — the line material's MRP controller, projected at read (never stored). */
  readonly mrpController?: MrpControllerRef;
  /**
   * MR-6 BR-04 — `declared` when the batch was picked from the supplier's
   * declared stock, `typed` when it was typed ("not in declared stock", shown
   * to PTI). Absent on a line with no batch yet, and on lines stored before
   * the rule existed.
   */
  batchSource?: 'declared' | 'typed';
}

export interface AsnShipmentDetails {
  originCity: string;
  destinationWarehouse: string;
  totalCartons: number;
  grossWeightKg: number;
  temperatureRequirement: string;
}

export interface ASN {
  asnNumber: string;
  supplierId: string;
  poReference: string;
  status: AsnStatus;
  carrier: string;
  /**
   * BL-51 / REQ-E07-04 BR-05 — the 3PL on the administrator's list this ASN
   * travels with (`tpl-…`). Absent when the carrier was entered by name. It is
   * what turns `trackingNumber` into a link to the 3PL's public tracking page;
   * an absent or unknown id shows the number as plain text.
   */
  threePlId?: string;
  trackingNumber: string;
  eta: string;
  details: AsnShipmentDetails;
  lineItems: AsnLineItem[];
  /** Ship (dispatch) date, `YYYY-MM-DD` (REQ-E07-04 BR-04). */
  shipDate?: string;
  /** Packing list attachment — the file name only in the prototype. */
  packingListFile?: string;
  /** Why the shipped quantity exceeds the open quantity (BR-02), when it does. */
  overShipReason?: string;
  /** The call-off this ASN ships (REQ-E09-03 BR-06). Absent for a PO-level ASN. */
  callOffId?: string;
  /**
   * MR-6 BR-10 — the supplier marks this ASN as the last one for its call-off.
   * Only then is shipping less than the agreed quantity a warning.
   */
  callOffFinal?: boolean;
  /**
   * MR-6 BR-12 — the call-off warnings shown at submit, kept for the record.
   * The planner's "Mismatch" marker is recomputed on read (edge case 6); this
   * copy is never the current comparison.
   */
  callOffWarnings?: readonly CallOffWarning[];
  /**
   * MR-6 BR-08 / BR-09 — the shelf-life exception record, APPENDED (MAT-R3):
   * each request, each decision and each ETA change that reopened it is a new
   * entry; nothing earlier is edited. Whether an exception stands is derived
   * from the entries (`shelfLifeExceptionOf`). Absent until the first request.
   */
  shelfLifeException?: AsnShelfLifeEvent[];
}

/** MR-6 BR-10 / BR-11 — how an ASN differs from its call-off. */
export type CallOffWarningKind = 'qtyOver' | 'qtyUnder' | 'early' | 'late' | 'material' | 'unlinked';

/** The figures behind one call-off warning (only the ones its kind needs). */
export interface CallOffWarningDetail {
  /** The call-off the ASN ships. */
  readonly callOffNumber?: string;
  /** qtyOver / qtyUnder — the call-off's shipped total (earlier ASNs plus this one) and agreed total. */
  readonly shipped?: number;
  readonly agreed?: number;
  /** qtyOver / qtyUnder — the difference as a percentage of the agreed total. */
  readonly pct?: number;
  /** qtyOver — `callOff.overPct`; early — `callOff.earlyAllowanceDays`. */
  readonly limit?: number;
  /** early / late — the ASN's ETA and the agreed date it was compared with. */
  readonly eta?: string;
  readonly agreedDate?: string;
  readonly days?: number;
  /** material / unlinked — the ASN line's material. */
  readonly materialCode?: string;
  /** material — the call-off's material. */
  readonly expectedMaterial?: string;
  /** unlinked — the open confirmed call-offs on the PO line. */
  readonly callOffNumbers?: readonly string[];
}

export interface CallOffWarning {
  readonly kind: CallOffWarningKind;
  readonly detail: CallOffWarningDetail;
}

/** MR-6 BR-08 — one line an exception covers, as it stood when it was asked for. */
export interface AsnShelfLifeLine {
  materialCode: string;
  lotNumber: string;
  expiryDate: string;
  /** The minimum remaining shelf life in force for the material, in months. */
  minMonths: number;
}

/**
 * MR-6 BR-09 — one entry of an ASN's shelf-life exception record. `by` is the
 * session's actor, never a payload field.
 *   requested   — the supplier asked, with a reason, at an ETA, for these lines
 *   etaChanged  — the supplier moved the ETA past the approved one (edge case 1);
 *                 the earlier approval stays in the record, and a new decision is owed
 *   approved    — Quality approved; the goods are received into blocked stock
 *   rejected    — Quality refused, with a reason; the ASN is back in Draft
 */
export type AsnShelfLifeEvent =
  | {
      kind: 'requested';
      at: string;
      by: ActorAttribution;
      reason: string;
      eta: string;
      lines: AsnShelfLifeLine[];
    }
  | {
      kind: 'etaChanged';
      at: string;
      by: ActorAttribution;
      previousEta: string;
      eta: string;
      lines: AsnShelfLifeLine[];
    }
  | { kind: 'approved'; at: string; by: ActorAttribution; reason?: string }
  | { kind: 'rejected'; at: string; by: ActorAttribution; reason: string };

export interface CatalogItem {
  id: string;
  supplierId: string;
  /** The supplier's own name for the item. ⚠️ THIS IS A MEANING, and until
   *  2B-5a the material census could not read it — `meaningOf` matched
   *  `/description/i` and this key is called `material`
   *  (`MEANING-SCOPE-IS-A-HAND-PICK-01`). */
  material: string;
  /**
   * ⚠️ **A POINTER, NOT AN IDENTITY — DECLARED AT 2B-5a (operator ruling R-D).**
   *
   * This field is **not** the catalogue item's identity (`id` is) and **not** a
   * code space of its own. It is **the supplier's assertion of which PARAGON
   * MASTER CODE their catalogue item corresponds to** — a claim about someone
   * else's space, entered by the party that does not own it.
   *
   * The evidence for that reading, rather than an assertion of it: the field is
   * named `sapCode` and not `materialCode`; the supplier's own storefront form
   * labels it **"SAP code (optional)"** — Paragon runs the SAP, and an
   * OPTIONAL field cannot be an identity; and of the five values authored, two
   * pointed at codes in `paragon.asn_chase_lane` **under the matching supplier
   * on both sides**, which is what a pointer looks like when it works.
   *
   * ⚠️ **CONSEQUENCES OF THE DECLARATION, and they are not tidy.**
   *   · A value here **must resolve to `MATERIAL_MASTER`**. One of five does
   *     (`PK-PETB-8803`, corrected at 2B-5a per R-D — it read `MAT-10045`, a
   *     code no Paragon space contains, carrying the master's own label for
   *     that material byte-for-byte).
   *   · `MAT-30110` / `MAT-40220` point into the ASN lane and resolve **there**,
   *     not in the master. They are correct pointers into a space booked for
   *     retirement, and they repoint when **2B-5b** retires the seven.
   *   · `MAT-10046` / `MAT-10089` resolve **nowhere**. They are unbacked claims
   *     and no batch has ruled on them.
   *   · **A SUPPLIER-ENTERED POINTER IS NEVER EVIDENCE OF A CORRESPONDENCE.**
   *     C9 §4's rule applies unchanged: a claim entered by one party about
   *     another party's space is an ADOPTION at best, and this one carries no
   *     provenance at all — no method, no source of truth, no route to
   *     resolution. It must not be joined on.
   *
   * Pinned by `storefrontPointer.test.ts`, which asserts the exact disposition
   * of all five rather than a count.
   */
  sapCode: string;
  category: string;
  moq: string;
  uom: string;
  leadTime: string;
  unitPrice: string;
  currency: string;
  certs: string[];
  capacity: string;
  visible: boolean;
}

export type ProfileCertStatus =
  | 'valid'
  | 'expiring'
  | 'expired'
  | 'missing'
  | 'pending';

export interface ProfileCert {
  supplierId: string;
  name: string;
  visible: boolean;
  status: ProfileCertStatus;
  expiry: string | null;
  // D-4: upload provenance — when the current document was filed (null when the
  // cert is missing / not yet uploaded).
  uploaded?: string | null;
}

export interface StorefrontProduct {
  supplierId: string;
  name: string;
  code: string;
  moq: string;
  leadTime: string;
}

// ─── Performance / KPI snapshots ────────────────────────────────────────────

export type KpiTrend = '↑' | '↓' | '→';

export interface KpiPoint {
  name: string;
  value: string;
  target: string;
  pct: number;
  /** Target position on the same 0–100 axis as `pct` (DP2-TARGET-01 tick +
   *  derived meeting/near/missing colour). Replaces the hand-assigned hex. */
  targetPct: number;
  trend: KpiTrend;
}

export interface RadarPoint {
  axis: string;
  value: number;
  target: number;
}

export interface KpiSnapshot {
  kpis: KpiPoint[];
  radar: RadarPoint[];
  trend: PerformancePoint[];
  improvementActions: ImprovementAction[];
}

export interface ImprovementAction {
  kpi: string;
  current: string;
  target: string;
  gap: string;
  action: string;
  priority: 'High' | 'Medium' | 'Low';
}

export type TrendRange = '7d' | '30d' | '90d' | '12m';

export interface PerformancePoint {
  week: string;
  otif: number;
  asnAcc: number;
  defect: number;
  ackHrs: number;
}

// ─── Supplier scorecard (buyer-side performance intelligence) ───────────────
// Portfolio scorecard: one record per active supplier, read buyer-only (the
// scorecard spans the whole network — a supplier does not see the cross-network
// grading view). D-2: the improvement-plan actions and the compliance issue are
// per-supplier OPTIONAL fields on the record, not shared consts keyed by name.

export type ScorecardGradeLetter = 'A' | 'B' | 'C' | 'D';

export interface ScorecardKpi {
  name: string;
  value: string;
  target: string;
  pct: number;
  /** Target position on the same 0–100 axis as `pct` (DP2-TARGET-01). */
  targetPct: number;
  trend: KpiTrend;
}

export interface ScorecardRadarAxis {
  axis: string;
  value: number;
}

export type CommLogStatus = 'Completed' | 'Active' | 'Open' | 'Resolved';

export interface CommLogEntry {
  date: string;
  type: string;
  channel: string;
  message: string;
  status: CommLogStatus;
}

export type ScorecardComplianceLevel = 'expired' | 'expiring' | 'missing';

export interface ScorecardComplianceIssue {
  level: ScorecardComplianceLevel;
  label: string;
}

export type ScorecardActionStatus = 'In Progress' | 'Pending';

export interface ScorecardImprovementAction {
  item: string;
  due: string;
  owner: string;
  status: ScorecardActionStatus;
}

export interface SupplierScorecard {
  id: string;
  name: string;
  country: string;
  category: string;
  tier: string;
  sapBp: string;
  channel: string;
  /**
   * REQ-E10-01 — THE GRADE AND THE SCORE ARE NOT STORED. Both used to be
   * authored here beside authored KPI rows; both are now read from the
   * calculated measures for the period the page is showing
   * (`services/data/performanceRules.ts`). `id` is the SUPPLIER MASTER id, which
   * is what makes that join real rather than by-name.
   *
   * Material G1 (MR-10 BR-09) — the free-text relationship status that stood
   * here ("Preferred Supplier" / "Approved Supplier") is retired. The vendor's
   * standing is its computed qualification level, PROJECTED AT READ from its
   * documents (`getSupplierScorecards`) and absent on the fixture row. The
   * improvement-plan state it also carried is `impPlan`.
   */
  qualification?: QualificationLevel;
  kpis: ScorecardKpi[];
  radar: ScorecardRadarAxis[];
  otifTrend: number[];
  ackSpeedTrend: number[];
  defectTrend: number[];
  impPlan?: boolean;
  commLog: CommLogEntry[];
  // D-2: folded off the page's shared IMPROVEMENT_ACTIONS / COMPLIANCE_ISSUES
  // consts so per-supplier data lives on the per-supplier record.
  complianceIssue?: ScorecardComplianceIssue | null;
  improvementActions?: ScorecardImprovementAction[];
}

// ─── Purchase requisitions (buyer-side ACQUIRE stage) ───────────────────────
// The starting point of procurement (PR → Approval → Source check → PO or
// Sourcing Event). A buyer-only internal document — suppliers never see PRs.
// D-3: quantity and estimatedValue are NUMERIC (not pre-formatted strings), so
// the render layer owns locale formatting via formatNumber / formatIDR.

export type PRStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sourcing Event'
  | 'PO Created'
  | 'Rejected';

export type PRPriority = 'High' | 'Medium' | 'Low';

// C7 §4 producer provenance — WHICH producer emitted this intake line. The ONE
// provenance that belongs on the entity: it is a producer FACT, not liveness
// (registry-derived) and not plan-state (the C6 PLANNED overlay, never merged into
// a committed seam row). Optional/nullable — existing fixtures and manual PRs omit
// it; a Grid- or SOMO-produced line carries it (G1.1).
export type PrSource = 'INTERNAL_GRID' | 'SOMO';

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  material: string;
  category: string;
  quantity: number;
  uom: string;
  requiredDate: string;
  estimatedValue: number;
  requestor: string;
  costCenter: string;
  status: PRStatus;
  createdDate: string;
  /**
   * ⚠️ **RENAMED FROM `approver` AT §68, AND THE OLD NAME WAS THE DEFECT.**
   * Nothing ever wrote it: `create` sets `''`, `applyTransition` touched only
   * `status`, and the fixture's values are ROLE BANDS — `'VP Procurement'`,
   * `'Procurement Head'`, `'Section Head'` — that correlate with
   * `estimatedValue` and are populated on **`Draft` and `Pending Approval` rows
   * nobody has approved** (`pr-004` is `Pending Approval` and carries
   * `'Section Head'`). A field
   * populated before the act it names cannot be a record of that act.
   *
   * So it is the DESTINATION the value routes to, not the person who decided —
   * the same class as a button whose label names a verb it does not dispatch,
   * one layer down in a DTO. Who actually decided is `approvedBy`, below.
   *
   * ⚠️ **AUTHORED, NEVER DERIVED — AND §69 MEASURED IT RATHER THAN ASSUMING
   * IT.** The values track `estimatedValue` closely enough to read as a
   * computed band, and nothing computes them: there is **not one relational or
   * arithmetic read of `estimatedValue` anywhere in the tree**, and no
   * threshold number exists in `src/` or `docs/`. Re-derived every run by
   * `approvalBandAuthored.guard.test.ts`; the surface now SAYS it is authored.
   *
   * ⚠️ **AND THE BAND RULE IS NOT MERELY UNBUILT — IT IS UNBUILDABLE TODAY, ON
   * TWO INDEPENDENT GROUNDS (§69).** A band decides either WHO MAY APPROVE,
   * which needs seniority roles the platform does not have and C10 §3.4 forbids
   * minting (*"a new role per band"*), or HOW MANY APPROVALS ARE REQUIRED,
   * which needs the `ApprovalPolicyAct` × `ApprovalAct` ledgers C10 §3.5
   * defers. Either ground alone is sufficient, so closing one does not unblock
   * it.
   *
   * ⚠️ **THE POLICY HOOK IS NOT THE BLOCKER, AND THE CONTRARY IS THE PREMISE
   * THAT MUST NOT BE INHERITED.** A hook on `t_pr_approve` can ALREADY read
   * this document (`ctx.target.readEntity` — four shipped hooks do) and the
   * session's roles (`ctx.scope.businessRoles`). What is missing is the
   * RIGHT-HAND SIDE of the comparison, not the left.
   *
   * `''` is the ONE representation of "not assigned" — `t_pr_create` writes it
   * and `pr-005` carries it. `pr-005` used to carry a literal `'—'`, which is
   * the render fallback written into the data, so an unassigned band and an
   * empty field displayed as the same glyph.
   */
  approvalLevel: string;
  sourceOfSupply: string;
  linkedDoc: string;
  priority: PRPriority;
  justification: string;
  source?: PrSource;
  /**
   * Why the requisition was rejected — written by `t_pr_reject` and by nothing
   * else. Absent until a rejection happens; it is NOT cleared by `t_pr_revise`,
   * because "why this came back" is the one thing a requester needs while they
   * are revising it, and clearing it on the way to Draft would delete the
   * explanation at exactly the moment it becomes useful.
   *
   * ⚠️ OPTIONAL ON THE DTO, REQUIRED ON THE VERB — and the split is deliberate.
   * A `Draft` PR has no rejection to explain, so a non-optional field would
   * force every intake-created row to carry an empty string that reads like an
   * answer. The REQUIREMENT lives where the act is (`requiredFields` +
   * `PR_REJECT_REASON_AUTHORED`), which is the only place it can be enforced.
   */
  rejectionReason?: string;
  /**
   * What changed, written by `t_pr_revise` and by nothing else.
   *
   * ⚠️ **THE FIELD DID NOT EXIST UNTIL §68, WHILE THE VERB HAD REQUIRED IT
   * SINCE PF-1a.** `requiredFields: ['revisionNote']` refused the dispatch
   * without it and `applyTransition` then dropped the text on the floor — a
   * FULL ENFORCEMENT CHAIN TERMINATING IN NOTHING, and sharper than the
   * `rejectionReason` case one edge over, because there was no field to
   * disappoint. Same repair, same four parts: optional on the DTO, required on
   * the verb, non-blank by policy hook, and PERSISTED.
   *
   * Optional for the same reason `rejectionReason` is: a requisition that has
   * never been revised has no note, and a non-optional field would force every
   * intake-created row to carry an empty string that reads like an answer.
   */
  revisionNote?: string;
  /**
   * ⚠️ **WHO APPROVED IT — the field `approver` was never able to be.**
   * Written by `t_pr_approve` from the SESSION (`QueryScope.actor`), never from
   * the payload: C10 §6.2 half one, *"a caller that could set it could backdate
   * its own audit entry"*, which applies with more force to WHO than to WHEN.
   * That is why `t_pr_approve` gained a policy hook and NOT a required payload
   * field — a payload field would have been a second instance of `setBy`'s
   * attribution-by-assertion, the very seam §6 exists to close.
   *
   * Today it is ALWAYS `UNATTRIBUTED: NO_PERSON_IN_SESSION`, because nothing in
   * shipped code constructs a `RESOLVED` actor (§2.3) and
   * `PR_APPROVAL_ATTRIBUTED` refuses one supplied by a caller. **That is an
   * honest absence and it is the point** — it names a failure somebody can go
   * and fix, where the old surface named 'Procurement Head' and nobody could
   * tell it had not happened.
   */
  approvedBy?: import('../../lib/enforcement').ActorAttribution;
}

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
export type IntakePlanState = 'PLANNED' | 'committed';

export interface PrIntakeLine {
  readonly id: string;
  readonly material: string;
  /** SOMO-authored source/destination lane; null for an internal-Grid line. */
  readonly suggestedSource: string | null;
  /** SOMO-authored ABC-XYZ policy class; null for an internal-Grid line. */
  readonly segment: string | null;
  readonly suggestedQty: number;
  readonly acceptedQty: number;
  readonly wasAdjusted: boolean;
  readonly uom: string;
  readonly period: string;
  readonly estimatedValue: number;
  readonly source: PrSource;
  readonly planState: IntakePlanState;
  /** C7 §2 recommend-first rationale — the "why" a review triages on. Nullable. */
  readonly deficit?: string;
}

// ─── Risk / Compliance entities (buyer-side, inline today) ──────────────────

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskAlertLevel = 'critical' | 'warning' | 'info';

export interface RiskAlert {
  id: string;
  level: RiskAlertLevel;
  title: string;
  body: string;
}

export interface GeoRisk {
  region: string;
  country: string;
  flag: string;
  severity: RiskSeverity;
  score: number;
  trend: 'rising' | 'stable' | 'declining';
  event: string;
  impact: string;
  exposure: string;
  suppliers: string[];
  mitigation: string;
  probability: number;
  timeline: string;
}

export interface ExposureRow {
  category: string;
  supplier: string;
  region: string;
  spend: number;
  dos: number;
  risk: RiskSeverity;
  dualSource: boolean;
}

export type ComplianceState = 'ok' | 'expiring' | 'expired';

export interface ComplianceRow {
  supplier: string;
  type: string;
  expires: string;
  status: ComplianceState;
}

// ── Compliance registry — census #11–15 → ONE canonical machine (I3.1) ─────────
// The 5 fragmented compliance vocabularies (SupplierDocumentStatus /
// ProfileCertStatus / ScorecardComplianceLevel / ComplianceState /
// ComplianceItemStatus) collapse to ONE machine. `ComplianceRegistryEntry` is the
// DTO-v2 shape that canonical machine reads through — grain = supplier × raw-
// material × certificate (the Spine). It SUPERSEDES the thin `ComplianceRow`
// above (deprecated-at-birth): supplierId-keyed (not name-keyed), and every
// clock/scheme value is COMPUTED at read time (`complianceProjection.ts`), never
// stored (law 0.5). Fixture-backed + SIMULATED until the Track-R harvest lands.

/** Certificate scheme/type. Distinguishes BPJPH (mandate-satisfying) from the
 *  MUI-legacy scheme (non-compliant after 17 Oct 2026) — the issuer axis the old
 *  `status === 'Valid'` check was blind to (HALAL-ISSUER-BLIND-01). */
export type CertType =
  | 'HALAL_BPJPH'
  | 'HALAL_MUI_LEGACY'
  | 'HALAL_FOREIGN'
  | 'BPOM'
  | 'ISO'
  | 'OTHER';

/** Raw-material grouping (Spine: cert grain is supplier AND raw-material level). */
export type MaterialCategory =
  | 'fragrance'
  | 'actives'
  | 'emulsifiers'
  | 'botanicals'
  | 'contract-mfg'
  | 'other';

/** The canonical compliance lifecycle — TRANSITION-states only (census §4). Clock
 *  decay (Expiring/Expired) is NOT here — it is a read projection (law 0.5). */
export type ComplianceLifecycleState = 'Missing' | 'Under Review' | 'Valid';

/** The COMPUTED-at-read display status: the lifecycle state plus clock decay
 *  (law 0.5). Never stored; derived in `complianceProjection.ts`. */
export type ComplianceDisplayStatus =
  | 'Missing'
  | 'Under Review'
  | 'Valid'
  | 'Expiring'
  | 'Expired';

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
export type SapSyncState = 'AWAITING_SYNC';

/** One row of the compliance registry — grain: supplier × material × certificate.
 *  The DTO-v2 the canonical compliance machine reads. STORED fields only; every
 *  clock/scheme-derived value is computed by `complianceProjection.ts`. */
export interface ComplianceRegistryEntry {
  id: string;
  /** The FK that reconciles the name-vs-id split across personas
   *  (HALAL-XPERSONA-01) and scopes the read per-supplier. */
  supplierId: string;
  supplierName: string;
  /** SAP material codes this certificate covers (raw-material grain). */
  materialCodes: readonly string[];
  materialCategory: MaterialCategory;
  certType: CertType;
  certNumber: string;
  issuer: string;
  issueDate: string | null;
  /** `null` = unknown, NEVER guessed (a blank expiry on a required cert is itself
   *  a finding) — and also `null` for a BPJPH cert, whose validity is permanent
   *  under GR 42/2024 so no expiry exists to record. (D-A: this sentence used to
   *  say "permanent-basis", naming the deleted `certBasis` field; the FACT is a
   *  property of the cert TYPE and survives the field's removal.) */
  expiryDate: string | null;
  /** The STORED transition-state (Missing/Under Review/Valid). The display status
   *  is computed from this + the clock, never stored. */
  lifecycleState: ComplianceLifecycleState;
  /**
   * Whether S/4HANA has acknowledged this row. **REQUIRED, never optional** —
   * an optional marker absent on every row is exactly "a row that cannot say",
   * which is the defect this field exists to close. Contrast the Pattern-B
   * identity fields (`SchedulingAgreement.sapAgreementNumber` et al), where
   * absence is honest BECAUSE presence would be a value SAP assigns; this is a
   * STATE, not an identity, so it must be stated rather than inferred.
   */
  sapSync: SapSyncState;
  scopeText: string;
  notes: string;
}

export interface Commodity {
  name: string;
  unit: string;
  current: number;
  change: number;
  alert: number;
  alertDir: 'above' | 'below';
  color: string;
  spark: { t: number; v: number }[];
}

// Scenario modeling (buyer-side). A modeled disruption scenario with its
// quantified impact and a set of response alternatives.
export type ScenarioFeasibility = 'high' | 'medium' | 'low';

export interface ScenarioAlt {
  id: string;
  name: string;
  cost: string;
  leadTime: string;
  feasibility: ScenarioFeasibility;
  details: string;
}

export interface Scenario {
  id: string;
  label: string;
  title: string;
  description: string;
  impact: Record<string, string>;
  alternatives: ScenarioAlt[];
}

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

export interface RecommendedSupplier {
  id: string;
  name: string;
  country: string;
  flag: string;
  matchScore: number;
  whyRecommended: string;
  covers: string;
  riskNote?: string;
  storefrontPath: string;
}

export type QualificationStatus = 'On Track' | 'At Risk' | 'Blocked';

export interface QualificationItem {
  supplier: string;
  flag: string;
  stage: number;
  stageName: string;
  stageTotal: number;
  startDate: string;
  owner: string;
  nextAction: string;
  dueDate: string;
  status: QualificationStatus;
}

export interface MarketIntelCard {
  category: string;
  marketStatus: string;
  suppliersGlobal: number;
  suppliersParagon: number;
  priceTrend: string;
  priceDir: 'up' | 'down' | 'flat';
  recommendation: string;
}

export type SingleSourceRiskLevel = 'Critical' | 'High' | 'Medium';

export interface SingleSourceItem {
  material: string;
  category: string;
  currentSupplier: string;
  risk: string;
  riskLevel: SingleSourceRiskLevel;
  suggestedAlternatives: string[];
}

// ─── Buyer dashboard aggregates (command-center, buyer-only) ────────────────
// Not supplier-scoped: production lines are internal to Paragon and supplier-
// health rows span multiple suppliers. Served buyer-only (supplier sees empty).

export interface ProductionLineRow {
  line: string;
  category: string;
  risk: 'low' | 'medium' | 'high';
  riskLabel: string;
  coverDays: number;
  blockedSkus: number;
}

export interface SupplierHealthRow {
  name: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

// ─── Analytics (buyer-side aggregate reporting) ─────────────────────────────
// Portfolio-level procurement intelligence — spend, performance, channel mix.
// Not per-supplier-scoped; served buyer-only (supplier sees empty / null).

export type AnalyticsGrade = 'A' | 'B' | 'C' | 'D';

export interface SpendCategoryRow {
  category: string;
  value: number;
  color: string;
}

export interface TopSupplierSpend {
  supplier: string;
  spend: number;
}

export interface MonthlyOtifRow {
  month: string;
  otif: number;
  otdr: number;
}

export interface MonthlyPoRow {
  month: string;
  pos: number;
  cycleTime: number;
}

export interface MonthlyChannelMix {
  month: string;
  whatsapp: number;
  web: number;
  email: number;
  api: number;
}

export interface AnalyticsPerfRow {
  /**
   * REQ-E10-01 — the row names a SUPPLIER, and the name, the category, the OTIF
   * and the grade are all resolved from the master and the calculated measures
   * at read. The row used to carry an authored `otif` and `grade` beside a
   * supplier NAME that matched no master record; both are gone.
   */
  supplierId: string;
  /** Still SAMPLE: nothing in the hub measures on-time delivery rate yet. */
  otdr: number;
  /** Still SAMPLE: acknowledgement speed is not measured from hub data. */
  ackSpeed: string;
  /** Still SAMPLE: first-time invoice match rate is not measured from hub data. */
  invoiceMatch: string;
  trend: KpiTrend;
}

// Headline KPI card — value + subtitle text + semantic tone (drives icon/color).
export type KpiTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface AnalyticsKpi {
  value: string;
  subtitle: string;
  tone: KpiTone;
}

export interface AnalyticsSummary {
  totalSpend: AnalyticsKpi;
  activeSuppliers: AnalyticsKpi;
  /**
   * REQ-E10-01 — `portfolioOtif` is NOT here any more. It was an authored string
   * ("87%") and it is now computed for the chosen period from the call-offs the
   * hub holds, on the page, beside the chips that decide the period.
   */
  avgCycleTime: AnalyticsKpi;
}

// ─── Filter inputs (lean shapes; expanded as pages migrate) ─────────────────

export interface POFilter {
  status?: POStatus | POStatus[];
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InventoryFilter {
  supplierId?: string;
  materialCode?: string;
}

export interface RFQFilter {
  status?: RFQStatus | RFQStatus[];
  category?: RFQCategory | RFQCategory[];
  invitedSupplierId?: string;
}

export interface QuotationFilter {
  rfqId?: string;
  supplierId?: string;
  status?: QuotationStatus | QuotationStatus[];
}

export interface ShipmentFilter {
  status?: ShipmentStatus | ShipmentStatus[];
  mode?: ShipmentMode | ShipmentMode[];
  supplierId?: string;
}

export interface ASNFilter {
  status?: AsnStatus | AsnStatus[];
}

export interface GRFilter {
  status?: GRStatus | GRStatus[];
  supplierId?: string;
}

export interface InvoiceFilter {
  status?: BuyerInvoiceStatus | SupplierInvoiceStatus;
  supplierId?: string;
  poNumber?: string;
}

export interface ContractFilter {
  status?: ContractStatus | ContractStatus[];
  type?: ContractType | ContractType[];
  supplierId?: string;
}

export interface ObligationFilter {
  contractId?: string;
  status?: ObligationStatus | ObligationStatus[];
  owner?: ObligationOwner;
}

export interface PRFilter {
  status?: PRStatus | PRStatus[];
}

// ─── Command layer (v2.2 Step 3.4–3.9) — the write contract ─────────────────
//
// Reads throw DataError; commands report their outcome as a status. Hard
// authorization failures (NOT_FOUND / SCOPE_DENIED) still throw DataError — the
// dispatcher enforces QueryScope on EVERY command exactly as reads (DR-6
// amended). Domain rejections (illegal transition, missing fields, role,
// policy) resolve as `status: 'failed'` with a reason and an emitted event.

export type CommandOutcome = 'done' | 'submitted' | 'failed';

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
export interface CommandDecision {
  /** The field the human adjusted (e.g. `acceptedQty`). */
  field: string;
  /** The platform-suggested value. */
  from: number;
  /** The human-accepted value. */
  to: number;
  /** The required justification — a silent override is forbidden (C6-LOCK §8.3). */
  reason: string;
  /** True when `to !== from` (a genuine override); false for accept-as-suggested. */
  wasAdjusted: boolean;
}

export interface CommandInput {
  /** The transition id to fire (e.g. `t_po_confirm`). */
  transitionId: string;
  /** The entity/flow key (e.g. `purchaseOrder`). */
  entity: string;
  /**
   * The target entity's id. OMITTED for `creation` transitions — the entity
   * does not exist yet and the store assigns its id (returned on the result).
   * Required for every non-creation transition.
   */
  entityId?: string;
  /** requiredFields live here; validated by the dispatcher. */
  payload?: Record<string, unknown>;
  /**
   * THE STATE THIS COMMAND WAS PREPARED AGAINST — the caller's compare-and-set
   * precondition (1c).
   *
   * When present, the dispatcher refuses `STALE_STATE` unless the entity's
   * CURRENT transition-state equals this string. When absent the command is
   * evaluated exactly as before, which is why the field is OPTIONAL: every
   * existing caller omits it and none changes behaviour.
   *
   * ⚠️ **THIS IS A STATE PRECONDITION, NOT A REVISION PRECONDITION, AND THE
   * DIFFERENCE IS THE WHOLE OF WHAT IT DOES NOT COVER.** It catches a
   * concurrent move that leaves the act STILL LEGAL — where the from-set
   * contains the state the other actor landed on, so `ILLEGAL_TRANSITION`
   * stays silent and the second caller writes over a document that moved.
   * It catches NOTHING about content: a requisition whose payload was revised
   * under you while the state held is invisible here, because the state is
   * identical and this compares states. It is equally blind to a concurrent
   * `statePreserving` verb, which by construction leaves the state where it
   * was. Both need an entity REVISION, which no store carries; see
   * `staleState.test.ts`, which derives all three populations every run.
   *
   * The optionality is load-bearing in the other direction too: a REQUIRED
   * precondition would refuse every caller that has not been migrated, and
   * today that is all of them.
   */
  expectedState?: string;
  /**
   * THE INGRESS REPLAY KEY (H2a) — the external event's OWN identity, carried
   * through so the same event cannot raise a second act.
   *
   * ⚠️ **THIS IS NOT `correlationId`, AND THE DIFFERENCE DECIDES WHY IT HAD TO
   * BE A NEW FIELD.** `correlationId` is minted by the dispatcher
   * (`deps.nextCorrelationId()`, called at exactly one site) and every existing
   * lookup — `statuses`, `pending`, `owners` — is keyed by it. All of them
   * answer *"what happened to a command WE issued?"*, which is idempotency for
   * a RESPONSE (`settle` resolves a SAP callback to the command it settles).
   * What was absent is idempotency for an EVENT THEY RECEIVE and turn into a
   * command we never issued: there is no key the CALLER controls, so a
   * redelivered event had nothing to collide with. C7-FIND-05.
   *
   * ⚠️ **THE KEY IS THEIRS, NOT OURS, AND THAT IS A CONTRACT — "CARRY IT
   * THROUGH", NEVER "DERIVE ONE".** A transport that is at-least-once
   * redelivers THE SAME MESSAGE; redelivery is only a meaningful word because
   * the message has an identity, and that identity is the key. A backend that
   * minted its own would have to derive it from payload content, and two
   * genuinely distinct events with equal content would then collapse into one
   * — a lost act, silently. If a producer supplies no identity, the honest
   * answer is that this boundary cannot be made idempotent, not that we invent
   * one for it.
   *
   * OPTIONAL, and the optionality is the `expectedState` precedent verbatim:
   * absent, the command is evaluated exactly as before, which is why every
   * existing caller is untouched and none changes behaviour. Absent ⇒ NO
   * dedupe — never a silent default.
   *
   * ⚠️ **IT IS NOT A GENERAL DEDUPE OVER USER ACTIONS.** A person pressing
   * approve twice is a different problem with an answer this platform already
   * gives: `expectedState` refuses `STALE_STATE`, the machine refuses
   * `ILLEGAL_TRANSITION`, and the delivery verbs refuse `ALREADY_CONFIRMED` /
   * `ALREADY_RELEASED`. Those are REFUSALS on purpose — a person who clicked
   * twice must be told the second click did nothing. This field answers the
   * opposite case, where the caller is a transport that never intended a
   * second act, and `idempotencyKey.test.ts` asserts no user surface passes it.
   */
  idempotencyKey?: string;
  /**
   * The governed-decision provenance (C6-LOCK). Present only when this dispatch
   * carries a human override — the dispatcher forwards it verbatim to the audit
   * event; it participates in NO validation (opaque).
   */
  decision?: CommandDecision;
}

/** The synchronous result of dispatching a command. */
export interface CommandResult {
  correlationId: string;
  transitionId: string;
  status: CommandOutcome;
  /** Set when `status === 'failed'` — the machine-readable rejection reason. */
  reason?: string;
  /**
   * The target entity's id. For a `creation` command this is the id the store
   * ASSIGNED (e.g. the new ASN number); for others it echoes the input id.
   */
  entityId?: string;
}

/** A command's recorded status, read back via `getCommandStatus`. */
export interface CommandStatus {
  correlationId: string;
  transitionId: string;
  status: CommandOutcome;
  ts: string;
}

/** The single dispatcher seam. The Phase-3 real adapter implements the same. */
export interface ICommandService {
  /**
   * Validate (legality + role + fields + scope + policy) then apply.
   *
   * `causationId` (SDC-3a — the SubmissionSession seam) groups this command's
   * DR-10 events with an earlier command WITHOUT collapsing its own
   * correlationId (`getCommandStatus` stays 1:1) — the exact DR-10 semantics
   * cascades already use. In a multi-object SubmissionSession the FIRST
   * command's correlationId is the anchor; commands 2..n pass it here so the
   * whole visit shares one audit group. Absent ⇒ a directly-initiated command
   * (the common case). Never a sessionId — that would overload DR-10.
   */
  dispatch(
    scope: QueryScope,
    input: CommandInput,
    causationId?: string,
  ): Promise<CommandResult>;
  /** Read a command's settled/pending status by correlation id. */
  getCommandStatus(scope: QueryScope, correlationId: string): Promise<CommandStatus | null>;
  /**
   * Settle a `submitted` (SAP-boundary) command — the async settlement
   * callback (Step 3.5). In the mock this represents SAP returning the material
   * document; Phase-3 implements it as the integration webhook. Idempotent:
   * settling an already-`done` command returns it unchanged.
   */
  settle(scope: QueryScope, correlationId: string): Promise<CommandStatus | null>;
}

/** What a scope may do (Step 3.9). Mock-backed; DNA-registry-backed in Phase 3′. */
export interface CapabilitySet {
  /** Transition-roles the scope holds. */
  roles: readonly string[];
  /** Transition ids the scope may initiate. */
  transitions: readonly string[];
}

// ─── Supplier overlay — the hub-mastered supplier fields (Material A1) ─────

/**
 * MR-1 BR-02 — how a supplier shares its stock with the hub: pulled from its
 * own system (`api`) or entered by template or by hand (`manual`). Hub-mastered:
 * the supplier master (the SAP stand-in) does not carry it, so it lives in an
 * append-only overlay and is read through ONE resolver (`stockUpdateModeOf`).
 */
export type StockUpdateMode = 'api' | 'manual';

/** One change of a supplier's stock update mode, as recorded. Never edited. */
export interface SupplierUpdateModeChange {
  readonly supplierId: string;
  readonly stockUpdateMode: StockUpdateMode;
  /** Store-assigned from the hub clock, never a payload field. */
  readonly setAt: string;
  /** From the session (`QueryScope.actor`), never from the form. */
  readonly setBy: ActorAttribution;
  readonly reason?: string;
}

/** A supplier's stock update mode as the hub resolves it, with its history. */
export interface SupplierStockUpdateMode {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly stockUpdateMode: StockUpdateMode;
  /**
   * `overlay`: the Hub administrator set it. `default`: nobody has, so it
   * follows the sample connection list (API when the supplier is on it).
   */
  readonly source: 'overlay' | 'default';
  /** Every change on record for this supplier, oldest first. */
  readonly history: readonly SupplierUpdateModeChange[];
}

// ─── Vendor qualification — computed from documents (Material G1) ──────────

/**
 * MR-10 BR-01 — a vendor's qualification level. Exactly one per vendor,
 * COMPUTED from its valid documents at read (BR-03), never stored and never
 * set by hand. Separate from the lifecycle `SupplierStatus` (BR-02).
 */
export type QualificationLevel = 'registered' | 'approved' | 'preferred';

/** The two levels a rule list is set for; Registered is "below Approved". */
export type QualificationRuleLevel = 'approved' | 'preferred';

/**
 * One document a level requires (BR-04). Matched by `category`, and by the
 * declared `certType` too when the rule names one (plan AR-18). `label` is the
 * requirement as Procurement and Quality wrote it: data, not UI copy.
 */
export interface QualificationRequiredDoc {
  readonly category: SupplierDocumentCategory;
  readonly certType?: CertType;
  readonly label: string;
}

/** The documents required for one level (BR-04). */
export interface QualificationRule {
  readonly level: QualificationRuleLevel;
  readonly requiredDocs: readonly QualificationRequiredDoc[];
  /**
   * `true` on the seeded starting lists (MAT-D15): shown everywhere with
   * "Placeholder, awaiting Procurement and Quality" until a person sets the
   * list through `t_qualification_rule_set`, which records `false`.
   */
  readonly placeholder: boolean;
}

/** One change of a level's list, as recorded. Never edited (MAT-R3). */
export interface QualificationRuleChange extends QualificationRule {
  /** Store-assigned from the hub clock, never a payload field. */
  readonly setAt: string;
  /** From the session (`QueryScope.actor`), never from the form. */
  readonly setBy: ActorAttribution;
}

/** A counted document that would drop the level when it expires (AC-06). */
export interface QualificationExpiringDoc {
  readonly documentId: string;
  readonly name: string;
  readonly category: SupplierDocumentCategory;
  readonly expiryDate: string;
}

/** `qualificationFor` — a vendor's level on a date and what it still lacks. */
export interface VendorQualificationStatus {
  readonly level: QualificationLevel;
  /** The required documents with no counting document, per level. */
  readonly missingFor: {
    readonly approved: readonly QualificationRequiredDoc[];
    readonly preferred: readonly QualificationRequiredDoc[];
  };
  /** Counted documents inside the expiry window that hold up the level. */
  readonly expiringSoon: readonly QualificationExpiringDoc[];
}

/**
 * One level change, REPLAYED from the documents and the rule lists (plan
 * AD-2) — never written on read. `causeDocumentId` names the document whose
 * verification or expiry moved the level; it is null when a change of the rule
 * list moved it, and `causeRuleLevel` then names the list.
 */
export interface QualificationChange {
  readonly at: string;
  readonly from: QualificationLevel;
  readonly to: QualificationLevel;
  readonly causeDocumentId: string | null;
  readonly causeRuleLevel?: QualificationRuleLevel;
}

/** A vendor's qualification as the hub computes it, with its history. */
export interface VendorQualification extends VendorQualificationStatus {
  readonly supplierId: string;
  readonly supplierName: string;
  /** Oldest first. */
  readonly history: readonly QualificationChange[];
  /** True while any list the level is computed from is still a placeholder. */
  readonly placeholderRules: boolean;
}

// ─── Planning groups — capacity groups under SAP material groups (Material C5) ─

/**
 * MR-8 BR-01 — a set of materials that share capacity at a supplier. Each group
 * sits under exactly 1 SAP material group; each material is in exactly 1 group
 * (the material overlay holds its `planningGroupId`, so it cannot be in 2).
 * Hub master data for now (MAT-D12).
 */
export type PlanningGroupState = 'active' | 'retired';

export interface PlanningGroup {
  readonly id: string;
  /** Typed by Material Planning; data, not a translation key (MAT-R6). */
  readonly name: string;
  readonly sapMaterialGroup: string;
  readonly state: PlanningGroupState;
  /** Null for a default group: derived from its SAP group, never created by anyone. */
  readonly createdBy: ActorAttribution | null;
  readonly createdAt: string | null;
}

/** One governed change to the planning groups, as recorded. Never edited (MAT-R3). */
export type PlanningGroupEvent =
  | {
      readonly kind: 'created';
      readonly groupId: string;
      readonly name: string;
      readonly sapMaterialGroup: string;
      readonly at: string;
      readonly by: ActorAttribution;
    }
  | { readonly kind: 'renamed'; readonly groupId: string; readonly name: string; readonly at: string; readonly by: ActorAttribution }
  | {
      readonly kind: 'moved';
      /** The group the materials moved into. */
      readonly groupId: string;
      /** The groups they left, as resolved at the move. */
      readonly fromGroupIds: readonly string[];
      readonly materialCodes: readonly string[];
      readonly at: string;
      readonly by: ActorAttribution;
    }
  | { readonly kind: 'retired'; readonly groupId: string; readonly at: string; readonly by: ActorAttribution };

/** A planning group as the hub resolves it, with its materials and changes. */
export interface PlanningGroupView extends PlanningGroup {
  /** The default group of its SAP group (`pg-<materialGroup>`, MR-8 BR-02). */
  readonly isDefault: boolean;
  /**
   * False for a default group nobody has renamed: its name is then the SAP
   * group's own (shown from the `inv.group.*` strings). True once named.
   */
  readonly named: boolean;
  /** The materials in the group now, sorted. A supplier sees only its own. */
  readonly materials: readonly string[];
  /** Every change naming this group, oldest first. Empty for a supplier. */
  readonly history: readonly PlanningGroupEvent[];
}

// ─── Service interfaces — the contract Phase 3 implements ───────────────────

export interface ISupplierService {
  /** Buyer: all suppliers. Supplier: returns empty page. */
  list(scope: QueryScope): Promise<Page<Supplier>>;
  /** Buyer: any supplier. Supplier: only if id === own supplierId. */
  getById(scope: QueryScope, id: string): Promise<Supplier | null>;
  /** Supplier: returns self. Buyer: returns null. */
  getCurrent(scope: QueryScope): Promise<Supplier | null>;
  /**
   * Material A1 (MR-1 BR-02) — each supplier's stock update mode and its change
   * history. Buyer: every supplier. Supplier: its own row only.
   */
  getStockUpdateModes(scope: QueryScope): Promise<Page<SupplierStockUpdateMode>>;
  /**
   * Material G1 (MR-10 BR-01 to BR-03) — each vendor's qualification level,
   * the documents it still needs, the documents about to drop it, and its
   * replayed history. Buyer: every supplier. Supplier: its own row only.
   */
  getVendorQualifications(scope: QueryScope): Promise<Page<VendorQualification>>;
}

export interface IProcurementService {
  // — Purchase orders —
  getPurchaseOrders(scope: QueryScope, filter?: POFilter): Promise<Page<PurchaseOrder>>;
  getPurchaseOrder(scope: QueryScope, id: string): Promise<PurchaseOrder | null>;

  // — Inventory & capacity (REQ-E08-01 to REQ-E08-05) —
  /** Supplier × material positions. A supplier sees its own; PTI stock only where granted. */
  getInventory(scope: QueryScope, filter?: InventoryFilter): Promise<Page<InventoryPosition>>;
  /**
   * Material C2 (MR-3) — supplier trade names per assigned material. Supplier:
   * its own assigned materials only. PTI: every supplier × material with a name.
   */
  getMaterialNames(scope: QueryScope): Promise<Page<MaterialNameRow>>;
  /** Supplier access to PTI stock. PTI: every supplier with its log. Supplier: its own. */
  getStockAccess(scope: QueryScope): Promise<Page<StockAccessGrant>>;
  /** Capacity against demand per supplier × planning group, 13 weeks. */
  getCapacityPlans(scope: QueryScope): Promise<Page<CapacityPlan>>;
  /**
   * Material C5 (MR-8) — the planning groups with their materials and changes.
   * PTI: every group. Supplier: the groups holding its own materials, narrowed
   * to those materials, with no change history.
   */
  getPlanningGroups(scope: QueryScope): Promise<Page<PlanningGroupView>>;
  /** Inventory and capacity alerts. A supplier sees its own supplier-side rules. */
  getInventoryAlerts(scope: QueryScope): Promise<Page<InventoryAlert>>;

  // — Forecast collaboration (REQ-E06-01 to REQ-E06-03) —
  /** Published forecast versions with who viewed them. A supplier sees versions carrying its lines. */
  getForecastVersions(scope: QueryScope): Promise<Page<ForecastVersionView>>;
  /** The current version's lines with their commitments. A supplier sees its own, with its drafts. */
  getForecastCommitments(scope: QueryScope): Promise<Page<ForecastCommitmentLine>>;
  /** Supplier coverage per material against Firm demand (CR-03), PTI only. */
  getForecastCoverage(scope: QueryScope): Promise<Page<ForecastCoverageRow>>;
  /**
   * REQ-E06-04 — the fixed stock reconcile per supplier × material × cycle
   * (ENG-D21). The planner reads every supplier; a supplier reads only its own
   * rows (scoped in the service).
   */
  getFixedStockReconcile(scope: QueryScope): Promise<Page<FixedStockReconcileRow>>;
  /**
   * REQ-E14-02 — supplier reliability and PTI's plan-change measures over a
   * trailing window, computed by the forecast engine on its (SIMULATED)
   * dataset. The planner sees every supplier; a supplier sees ONLY its own row,
   * which carries PTI's plan-change figure for its materials (BR-07, ENG-D3).
   */
  getSupplierReliability(scope: QueryScope, windowWeeks?: ReliabilityWindowWeeks): Promise<Page<SupplierReliabilityView>>;
  /**
   * REQ-E14-03 — the material requirement per material and week, computed by
   * the forecast engine on its (SIMULATED) dataset. PTI only: a supplier scope
   * gets null (X-03 — simulated engine output is never shown to a supplier).
   */
  getMaterialRequirement(scope: QueryScope, includeUnconfirmed?: boolean): Promise<MaterialRequirementView | null>;
  /**
   * REQ-E14-04 — safety stock, safety lead time and reorder point per
   * material, from the plan's own errors and the suppliers' delivery history,
   * on the engine's (SIMULATED) dataset. PTI only: a supplier scope gets null.
   */
  getSafetyStock(scope: QueryScope): Promise<SafetyStockView | null>;
  /**
   * REQ-E14-05 — recommended orders per material and week, sized jointly per
   * warehouse within MOQ, multiple and pallet space, with the projected fill
   * and rented space; on the engine's (SIMULATED) dataset. PTI only.
   */
  getOrderPlan(scope: QueryScope): Promise<OrderPlanView | null>;
  /**
   * REQ-E14-13 — proposals to reschedule, reduce or cancel open PO lines and
   * call-offs for warehouse relief, valued jointly per warehouse, with the
   * stock-on-hand overload no open order can relieve and the plan-change guard;
   * on the engine's (SIMULATED) dataset. PTI only.
   */
  getReschedule(scope: QueryScope): Promise<RescheduleView | null>;
  /**
   * REQ-E14-06 — the plan stabilised before publication (Firm frozen,
   * Trade-off damped and held to the ENG-D8 band), the raw and stabilised
   * values per supplier × material × week, and the effect on E14-02's
   * plan-change measures; on the engine's (SIMULATED) dataset. PTI only.
   */
  getStabilisedPlan(scope: QueryScope): Promise<StabilisedPlanView | null>;
  /**
   * REQ-E14-01 — data health of the engine's inputs: freshness per feed
   * against the administrator's limits, and the feed spec's quality checks on
   * arrival with the failing records. On the engine's (SIMULATED) dataset. PTI only.
   */
  getDataHealth(scope: QueryScope): Promise<DataHealthView | null>;
  /**
   * REQ-E14-07 — the finished-goods demand forecast: per SKU × week, the
   * method that made it, SKU / brand / total reconciled, OEM products left
   * out (ENG-D20). On the engine's (SIMULATED) dataset. PTI only.
   */
  getDemandForecast(scope: QueryScope): Promise<DemandForecastView | null>;

  // — Sourcing —
  getRFQs(scope: QueryScope, filter?: RFQFilter): Promise<Page<RFQ>>;
  getQuotations(scope: QueryScope, filter?: QuotationFilter): Promise<Page<Quotation>>;

  // — RFx management (REQ-E03-01 to REQ-E03-05) —
  /** REQ-E03-01 — selectable invitees for a sourcing event, filtered by category and purchasing group. PTI only. */
  getInviteeCandidates(scope: QueryScope, filter?: InviteeFilter): Promise<Page<InviteeCandidate>>;
  /** REQ-E03-02 — RFI events. A supplier sees the ones it was invited to, and only its own answers. */
  getRfiEvents(scope: QueryScope): Promise<Page<RfiEventView>>;
  /** REQ-E03-04 — RFP events with their commercial terms and proposals. Same scoping as the RFI board. */
  getRfpEvents(scope: QueryScope): Promise<Page<RfpEventView>>;
  /** REQ-E03-05 — negotiation rounds. A supplier reads only its own thread (BR-05). */
  getNegotiationRounds(scope: QueryScope): Promise<Page<NegotiationRoundView>>;
  /**
   * NR-2 — firm-offer rounds on an RFP, with the offers and the last firm price
   * per supplier and option. A supplier reads only rounds it was invited to and
   * only its own offers (AC-01).
   */
  getRfpOfferRounds(scope: QueryScope): Promise<Page<RfpOfferRoundView>>;
  /** REQ-E03-05 — recorded awards. A supplier reads only its own outcome (AC-05). */
  getAwards(scope: QueryScope): Promise<Page<AwardView>>;
  /**
   * RFx D2 (NR-2 BR-09, AC-07) — awards on an RFP, per option on firm offers.
   * A supplier reads only awards it is named on, only its own lines, and its
   * outcome (awarded, not awarded, or withdrawn after a cancel).
   */
  getRfpAwards(scope: QueryScope): Promise<Page<RfpAwardView>>;
  /** RFx spec 2026-09-21 — invitees' intent and confidentiality acceptance. A supplier reads its own. */
  getRfqEngagement(scope: QueryScope): Promise<Page<RfqEngagementView>>;
  /** RFx spec 2026-09-21 — clarification Q&A. A supplier reads its own questions and the published answers, asker hidden. */
  getRfqClarifications(scope: QueryScope): Promise<Page<RfqClarificationView>>;
  /** CR-23 — the compliance gate for every invitee and bidder of one RFQ. PTI only. */
  getRfqComplianceGate(scope: QueryScope, rfqId: string): Promise<Page<RfqSupplierGateView>>;

  // — Fulfilment —
  getShipments(scope: QueryScope, filter?: ShipmentFilter): Promise<Page<Shipment>>;
  getASNs(scope: QueryScope, filter?: ASNFilter): Promise<Page<ASN>>;
  getGoodsReceipts(scope: QueryScope, filter?: GRFilter): Promise<Page<GoodsReceipt>>;
  /** Call-offs under umbrella POs (REQ-E09-03). A supplier never sees drafts. */
  getCallOffs(scope: QueryScope): Promise<Page<CallOff>>;

  // — Finance —
  getBuyerInvoices(scope: QueryScope, filter?: InvoiceFilter): Promise<Page<BuyerInvoice>>;
  getSupplierInvoices(scope: QueryScope, filter?: InvoiceFilter): Promise<Page<SupplierInvoice>>;

  // — Contracts —
  getContracts(scope: QueryScope, filter?: ContractFilter): Promise<Page<Contract>>;
  getObligations(scope: QueryScope, filter?: ObligationFilter): Promise<Page<ContractObligation>>;

  // — Supplier-side supporting data (currently inline in pages) —
  getDocuments(scope: QueryScope): Promise<Page<SupplierDocument>>;
  getStorefrontCatalog(scope: QueryScope, supplierId?: string): Promise<Page<CatalogItem>>;
  getStorefrontCerts(scope: QueryScope, supplierId?: string): Promise<Page<ProfileCert>>;
  getStorefrontProducts(scope: QueryScope, supplierId?: string): Promise<Page<StorefrontProduct>>;

  // — KPIs / performance —
  getKpis(scope: QueryScope): Promise<KpiSnapshot>;
  getPerformanceTrend(scope: QueryScope, range: TrendRange): Promise<Page<PerformancePoint>>;

  // — Supplier scorecard (buyer-only portfolio grading) —
  getSupplierScorecards(scope: QueryScope): Promise<Page<SupplierScorecard>>;

  // — Purchase requisitions (buyer-only ACQUIRE stage) —
  getRequisitions(scope: QueryScope, filter?: PRFilter): Promise<Page<PurchaseRequisition>>;

  // — PR-intake review (buyer-only; C7 §2 — one shape, two producers) —
  getPrIntake(scope: QueryScope): Promise<Page<PrIntakeLine>>;

  // — Supplier applications (B2, buyer-only ACQUIRE stage) —
  //
  // ⚠️ **BUYER-ONLY, AND NOT BY THE MECHANISM EVERY OTHER READ USES.** Every
  // other scoped read narrows by `supplierId`; an application HAS no
  // `supplierId` (the row's field is typed `null`), because an applicant is not
  // a tenant. So there is nothing to narrow BY, and the honest boundary is the
  // persona: the whole collection is buyer-side or it is nothing. A supplier
  // scope reads an empty page — the `getRequisitions` / `getPrIntake` shape,
  // reused deliberately rather than invented.
  getSupplierApplications(scope: QueryScope): Promise<Page<SupplierApplication>>;

  // — Buyer command-center aggregates (buyer-only) —
  getProductionLines(scope: QueryScope): Promise<Page<ProductionLineRow>>;
  getSupplierHealth(scope: QueryScope): Promise<Page<SupplierHealthRow>>;
}

export interface IRiskService {
  getRiskAlerts(scope: QueryScope): Promise<Page<RiskAlert>>;
  getGeoRisks(scope: QueryScope): Promise<Page<GeoRisk>>;
  getExposure(scope: QueryScope): Promise<Page<ExposureRow>>;
  getScenarios(scope: QueryScope): Promise<Page<Scenario>>;
  getCompliance(scope: QueryScope): Promise<Page<ComplianceRow>>;
  /** Canonical compliance registry (census #11–15 → ONE machine · I3.1). Grain:
   *  supplier × material × certificate. SUPERSEDES `getCompliance`/`ComplianceRow`
   *  (deprecated-at-birth). supplierId-keyed → scope-isolated per supplier (buyer
   *  sees the superset). Fixture-backed + SIMULATED (LivenessRegistry) until the
   *  Track-R harvest lands the real cert registry. */
  getComplianceRegistry(scope: QueryScope): Promise<Page<ComplianceRegistryEntry>>;
  getCommodities(scope: QueryScope): Promise<Page<Commodity>>;
}

export interface IDiscoveryService {
  getRecommended(scope: QueryScope): Promise<Page<RecommendedSupplier>>;
  getQualifications(scope: QueryScope): Promise<Page<QualificationItem>>;
  getMarketIntel(scope: QueryScope): Promise<Page<MarketIntelCard>>;
  getSingleSourceItems(scope: QueryScope): Promise<Page<SingleSourceItem>>;
}

// Discrete per-read analytics surface (D-4): each chart/table is its own read,
// so the service is shaped for per-section loading/error rendering. (The pages
// today still gate at the page level; the read granularity is what D-4 secures.)
export interface IAnalyticsService {
  /** Headline KPI cards. Buyer: populated. Supplier: null. */
  getSummary(scope: QueryScope): Promise<AnalyticsSummary | null>;
  getSpendByCategory(scope: QueryScope): Promise<Page<SpendCategoryRow>>;
  getTopSuppliers(scope: QueryScope): Promise<Page<TopSupplierSpend>>;
  getOtifTrend(scope: QueryScope): Promise<Page<MonthlyOtifRow>>;
  getPoVolumeTrend(scope: QueryScope): Promise<Page<MonthlyPoRow>>;
  getChannelMix(scope: QueryScope): Promise<Page<MonthlyChannelMix>>;
  getSupplierPerformance(scope: QueryScope): Promise<Page<AnalyticsPerfRow>>;
}

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
export interface ICollaborationService {
  // — P1 own-reads (per-supplier isolation) —
  getOwnRequirementResponses(scope: QueryScope): Promise<Page<RequirementResponse>>;
  getOwnInventoryDeclarations(scope: QueryScope): Promise<Page<InventoryDeclaration>>;
  getOwnIncomingShipments(scope: QueryScope): Promise<Page<IncomingShipmentView>>;
  getOwnSupplierAsns(scope: QueryScope): Promise<Page<ASN>>;

  // — P2 consolidation reads (buyer-superset, BUYER-GATED) —
  getConsolidation(scope: QueryScope): Promise<Page<ConsolidationRow>>;
  getCoverage(scope: QueryScope): Promise<Page<SupplierCoverageEntry>>;
  getChase(scope: QueryScope): Promise<Page<ChaseEntry>>;
  getRollups(scope: QueryScope): Promise<Page<SupplierRollup>>;
}

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
export interface DeliveryQuery {
  contractId?: string;
}

export interface IDeliveryService {
  getAgreements(scope: QueryScope, query?: DeliveryQuery): Promise<Page<DeliveryAgreementView>>;
  /**
   * Release the selected DRAFT lines of ONE item (the delivery lane's first
   * write — the draft→released transmit-to-vendor moment). BUYER-ONLY: a supplier
   * scope is refused (release is a buyer action). Applies Batch-2's pure
   * `releaseScheduleLines`, persists to the mutable store, and returns the
   * RE-DERIVED agreement view — or an honest `ReleaseReason` on refusal.
   *
   * SIMULATED by construction: this write does NOT go through the command
   * dispatcher and registers NO CommandTarget, so `deliveryAgreements` stays
   * null-backed in the LivenessRegistry (the honest amber "Sample" marker holds).
   * A released line is transmitted in the PORTAL, not posted to SAP —
   * `sapReleaseNumber` stays absent until the Pattern-B feed binds it (Stage F).
   */
  releaseLines(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    selection: ReleaseSelection,
  ): Promise<ReleaseCommandResult>;
  /**
   * Confirm the fulfillment of ONE released line (the delivery lane's SECOND
   * write — accept an INFERRED proximity proposal as a confirmed fact). BUYER-ONLY.
   * ACCEPT-AS-OBSERVED (v1): writes the observed shipment ref + qty via the pure
   * `confirmFulfillment`, so the match binds authoritatively (inferred:false) and
   * the governed `deliveredQty` climbs. Returns the RE-DERIVED view, or an honest
   * reason (`NOTHING_TO_CONFIRM` / `ALREADY_CONFIRMED` / `NOT_RELEASED` /
   * `SCOPE_DENIED` / `UNKNOWN_RELEASE_SEQ`).
   *
   * SIMULATED by construction, exactly like release: NO dispatcher, NO
   * CommandTarget, so `deliveryAgreements` stays null-backed (amber marker holds).
   * A confirm is a PORTAL record, not a SAP goods-receipt — `fulfilledDate` /
   * `sapReleaseNumber` stay absent until the Pattern-B feed binds them (Stage F).
   */
  confirmMatch(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    releaseSeq: number,
  ): Promise<ConfirmCommandResult>;
  /**
   * Re-point ONE item's ACTIVE drawdown tolerance (the delivery lane's THIRD write
   * — the GOVERNANCE write). BUYER-ONLY: adjusting a tolerance is a buyer decision.
   * Applies the pure `setActivePolicy` (writes `active` + the who/when/why stamp;
   * `contractDefault` is immutable, `activeChangedBy` deferred to the dispatcher),
   * persists, and returns the RE-DERIVED view — the ledger now marks
   * `policyDeviation` and re-derives `enforced` / `exceptions` against the new
   * `active`. Or an honest reason (`REASON_REQUIRED` / `NO_CHANGE` / `SCOPE_DENIED`
   * / `UNKNOWN_ITEM`).
   *
   * SIMULATED by construction, exactly like release / confirm: NO dispatcher, NO
   * CommandTarget, so `deliveryAgreements` stays null-backed (the amber marker
   * holds). A tolerance change is a PORTAL governance record, never posted to SAP.
   */
  editPolicy(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    patch: EditPolicyPatch,
  ): Promise<EditPolicyCommandResult>;
}

// ─── Unified chase read (SDC-5d — the buyer/planner chase surface seam) ───────
//
// The ONE composition point: reads the existing collaboration chase (data
// staleness) + delivery agreements (→ commitment chase) and folds them into the
// per-supplier `SupplierChaseView[]` via the pure 5c reducer. BUYER-GATED — the
// planner chases suppliers; a supplier persona resolves to [] (a supplier does not
// chase itself; its own-facts view is the delivery mirror, not this surface).
// Depends on the collaboration + delivery reads; neither imports chase (acyclic).
export interface IChaseService {
  getUnifiedChase(scope: QueryScope): Promise<Page<SupplierChaseView>>;
}

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
export interface IEnforcementService {
  /** Every recorded enforcement setting, oldest first. Append-only upstream. */
  getEnforcementSettings(scope: QueryScope): Promise<Page<EnforcementSetting>>;
}

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
export interface IFileService {
  /** Keep a file and return the metadata the record stores. */
  put(file: File): Promise<AttachmentMeta>;
  /** A URL that opens the file, or `null` when it is not held. */
  urlFor(id: string): string | null;
  /** Let go of a file. The record's metadata is the caller's to drop. */
  release(id: string): void;
  /** Is this file's content held (openable) right now? */
  isHeld(id: string): boolean;
  /**
   * Record that someone opened or downloaded a file (NR-1 BR-10, RFX-R3). The
   * seam stamps the time; the entry is appended and never edited. A download
   * is a read, not a state change, so it is recorded here and not by a verb.
   */
  recordAccess(fileId: string, by: ActorAttribution): void;
  /** Every recorded access of a file, oldest first. Empty when never opened. */
  accessLog(fileId: string): readonly FileAccess[];
}

/** One recorded open or download of a file (NR-1 BR-10). Append-only. */
export interface FileAccess {
  readonly fileId: string;
  readonly by: ActorAttribution;
  /** Seam-assigned, never the caller's. */
  readonly at: string;
}

export interface IDataService {
  suppliers: ISupplierService;
  procurement: IProcurementService;
  risk: IRiskService;
  discovery: IDiscoveryService;
  analytics: IAnalyticsService;
  /** SDC read seam — P1 own-reads + P2 consolidation, service-scoped (SDC-4b). */
  collaboration: ICollaborationService;
  /** Delivery Agreement read seam — scoped drawdown + fulfillment view-model. */
  delivery: IDeliveryService;
  /** Unified chase read seam (SDC-5d) — data + commitment chase, buyer-gated. */
  chase: IChaseService;
  /** Enforcement read seam (CP-3 · E2) — the append-only setting ledger,
   *  buyer-scoped. The mode in force is derived by the caller, never served. */
  enforcement: IEnforcementService;
  /** File seam (RFx A2) — file bytes; the session store today, BL-27 later. */
  files: IFileService;
  /** Write seam — the single dispatcher (Step 3.4). */
  commands: ICommandService;
  /** What the current scope may do (Step 3.9 DNA seed; mock-backed today). */
  getCapabilities(scope: QueryScope): Promise<CapabilitySet>;
}

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
export type SupplierApplicationStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected';

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
export interface SupplierApplicationDeclaration {
  /** Which of the four the applicant is claiming. */
  readonly kind: 'npwp' | 'nib' | 'halal' | 'iso';
  /** The number the applicant states. Their words, unverified, never a join key. */
  readonly reference: string;
}

export interface SupplierApplication {
  /** Store-assigned. The store mints identity, never the caller. */
  readonly id: string;
  /**
   * The human-readable reference, store-assigned and sequential.
   *
   * ⚠️ **THIS IS THE HONEST OPPOSITE OF THE THING B1 EXISTS FOR.**
   * `SupplierRegistration.tsx:1289` mints a RANDOM number and renders it at
   * `:1203` beside a next-steps list, with no row anywhere behind it. This one
   * is assigned by the store at the moment a row is written, so the number an
   * applicant is told and the record Paragon holds are the same fact. **The
   * wizard is NOT repointed here** — that is filed as B3.
   */
  readonly applicationNumber: string;
  readonly requestType: string;
  readonly status: SupplierApplicationStatus;
  readonly companyName: string;
  /**
   * ⚠️ **ALWAYS `null`, AND THE LITERAL TYPE IS THE ENFORCEMENT.** See the
   * header: an applicant is not a tenant. `resolvedSupplierId` below is a
   * different question and is NOT this.
   */
  readonly supplierId: null;
  /**
   * The existing vendor an extension request names, resolved against the
   * platform roster at birth — never the payload's word for it.
   *
   * ⚠️ **NOT A TENANCY FIELD.** It says which supplier the application is
   * ABOUT; `supplierId` above says which tenant owns the row, and the answer to
   * that is nobody. Conflating them is precisely how an application would
   * become visible to the supplier it names, which is not a thing this models.
   * `null` for the two request types that name no existing vendor.
   */
  readonly resolvedSupplierId: string | null;
  /** The vendor number as the caller stated it, kept for the record. */
  readonly s4Vendor: string | null;
  /** What the applicant claims to hold. Claims, not verifications — see above. */
  readonly declarations: readonly SupplierApplicationDeclaration[];
  readonly submittedAt: string;
  /**
   * ⚠️ **ALWAYS `UNATTRIBUTED` IN THIS TREE, AND THE TYPE KEEPS IT HONEST.**
   * `CurrentIdentity.actor` is `UNATTRIBUTED: NO_PERSON_IN_SESSION` everywhere,
   * so typing this as `ActorAttribution` rather than `string` means a surface
   * must RENDER the unattributed state instead of printing a name it does not
   * have (C10 §5.2 / D-ID-3).
   */
  readonly submittedBy: ActorAttribution;
  /** When somebody picked it up. `null` until they did — never a guessed date. */
  readonly reviewStartedAt: string | null;
  readonly decidedAt: string | null;
  readonly decidedBy: ActorAttribution | null;
  /** Present only on a refusal, proven non-blank by the verb before it is written. */
  readonly rejectionReason: string | null;
}
