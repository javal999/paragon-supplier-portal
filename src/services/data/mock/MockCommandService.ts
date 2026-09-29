// ────────────────────────────────────────────────────────────────────────────
// MockCommandService (v2.2 Step 3.4) — wires the framework-agnostic dispatcher
// to the mock stores, the persona→role map, the bound policy hooks, and an
// in-memory audit sink. The Phase-3 real adapter implements ICommandService the
// same way against NestJS/SAP.
//
// Importing this module also loads the transitions barrel, which registers the
// shipped flows and binds policy hooks (side effects) — so the registry and the
// hook bindings are populated before any dispatch.
// ────────────────────────────────────────────────────────────────────────────

import { POStatus } from '../types';
import type {
  PurchaseOrder,
  PoLineResponse,
  PoRejectionCause,
  ICommandService,
  QueryScope,
  CommandInput,
  CommandResult,
  CommandStatus,
  ASN,
  AsnLineItem,
  AsnStatus,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  PurchaseRequisition,
  PRStatus,
  PRPriority,
  PrSource,
  CertType,
  CertificateDeclaration,
  SupplierDocumentCategory,
  SupplierDocumentStatus,
  SupplierApplicationStatus,
  SupplierApplicationDeclaration,
  CallOff,
  CallOffConfirmationKind,
  CallOffStatus,
  CallOffType,
} from '../types';
import type {
  GoodsReceipt,
  GRStatus,
  Disposition,
  InspectionResult,
  ReceiptDiscrepancyStatus,
} from '../../../data/mockGoodsReceipts';
import { receiptDiscrepancyStore } from './stores/receiptDiscrepancyStore';
import { callOffStore } from './stores/callOffStore';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { supplierApplicationStore } from './stores/supplierApplicationStore';
import { VENDOR_BEARING_REQUEST_TYPE } from '../../transitions/flows/supplierApplication.flow';
import { NO_PERSON } from '../../../context/noPerson';
import type { RFQ, RFQStatus, RFQCategory } from '../../../data/mockRfqs';
import type { Quotation, QuotationStatus } from '../../../data/mockQuotations';
import { BASE_CURRENCY, type BidCurrency } from '../../../lib/currencyPolicy';
import type { FxPinSource } from '../../../lib/fxPin';
// THE ONE LEGAL PARSER (CP-0 · W1). The transition re-runs the SAME function
// the surface ran — not a second implementation that could drift from it.
import { normalizeQty, type NumberConvention } from '../../../lib/localeNumber';
import {
  asActorAttribution,
  isGovernedCheckId,
  isReviewDay,
  type EnforcementMode,
  type GovernedCheckId,
} from '../../../lib/enforcement';
import {
  createDispatcher,
  InMemoryAuditSink,
  atomsForSeat,
  customRoleStore,
  isSystemRole,
  SYSTEM_ROLES,
  resolvePolicyHook,
  bindPolicyHook,
  POLICY_HOOKS,
  cascadesFor,
  deriveMatchVerdict,
  invoicesForReceipt,
  INVOICE_AWAITING_MATCH,
  ASN_PO_STATES,
  INVOICEABLE_PO_STATES,
  asnLineCheckOf,
  asnLineRefusal,
  asnSubmitRefusal,
  deriveInvoiceVerdict,
  hasReceiptDiscrepancy,
  invoiceLineRefusal,
  isCalendarDate,
  isDuplicateInvoiceNumber,
  openQtyForLine,
  CALL_OFF_TYPES,
  CONFIRMATION_STATE,
  checkTolerance,
  releaseCheck,
  headsUpsFor,
  isAwaitingApproval,
  isCallOffDate,
  isConfirmedAndAccepted,
  isPositiveQty,
  proposedDeliveries,
  umbrellaRefusal,
  engineReleaseWithheld,
  addDays,
  capacitySubmissionRefusal,
  dayOf,
  isIsoDay,
  batchDatesProblem,
  alertCloseRefusal,
  parseAlertKey,
  standingClosure,
  // REQ-E03-01 to REQ-E03-05 — the RFx rules. The verb and the screen read the
  // SAME predicates, so a refusal and a disabled button can never disagree.
  deviationsWithoutComment,
  effectiveDeadline,
  isExtension,
  isInvitedToRound,
  isPastDeadline,
  isSelectableSupplier,
  missingRequiredAnswers,
  quoteLinesRefusal,
  quoteLinesTotal,
  unansweredTerms,
  // RFx authoring — typed questions, custom terms, indicative pricing.
  customSectionsRefusal,
  invalidAnswers,
  invalidTermAnswers,
  rfiQuestionsRefusal,
  rfpPricingAnswerRefusal,
  rfpPricingRequestRefusal,
  rfpTermsRefusal,
  responseWindowRefusal,
  responseAlreadySubmittedRefusal,
  type QuoteLineInput,
  type AsnBatchSource,
  type AsnLineCheck,
  type AsnLineInput,
  type CommandTarget,
  type CascadeCommand,
  type CascadeContext,
  type SettleContext,
  type SystemRoleId,
} from '../../transitions';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { invoiceStore } from './stores/invoiceStore';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { purchaseRequisitionStore } from './stores/purchaseRequisitionStore';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { enforcementSettingStore } from './stores/enforcementSettingStore';
import { calendarCovers, workingCalendarStore } from '../../transitions/workingCalendarStore';
import { isHubSettingKey, parseStaleOverrideKey } from '../../transitions/hubSettings';
import { hubSettingsStore, settingValue } from '../../transitions/hubSettingsStore';
import { isActiveReasonCode, parseReasonCodeEntityId, reasonCodeStore } from '../../transitions/reasonCodes';
import {
  THREE_PL_ID,
  asnThreePlRefusal,
  threePlChangeFrom,
  threePlStore,
} from '../../transitions/threePlStore';
import {
  capacityStore,
  inventoryAlertLedger,
  stockAccessStore,
  stockSyncStore,
} from './stores/inventoryHubStores';
import {
  activeAlertConditions,
  allAlerts,
  allCapacityPlans,
  isApiConnected,
  isAssignedMaterial,
  observeAlertConditions,
  simulatedPullOf,
  supplierNameOf,
  suppliersWithAssignments,
} from './inventoryReadModel';
import { forecastVersionStore, forecastViewStore } from './stores/forecastHubStores';
// Material A1 — the supplier overlay (its own module, plan AD-5).
import { supplierOverlayTarget } from './targets/supplierOverlay';
// Material C4 — the MRP controller list (its own module, plan AD-5).
import { mrpControllerTarget } from './targets/mrpController';
// ── REQ-E14-13 — reschedule proposals taken to SAP ─────────────────────────
import { sapChangeMarkStore } from './stores/sapChangeMarkStore';
import { engineDataset } from './fixtures/engineDataset';
import { lineHistories, requirementAt } from '../../engine/lines';
import type { ProposalType } from '../../engine/reschedule';
// ── REQ-E03-01 to REQ-E03-05 — RFx management ──────────────────────────────
import {
  awardCancellationStore,
  awardSapMarkStore,
  awardStore,
  negotiationRoundStore,
  rfiEventStore,
  rfiResponseStore,
  rfpEventStore,
  rfpFirmOfferStore,
  rfpOfferRoundStore,
  rfpResponseStore,
} from './stores/rfxStores';
import {
  bestScoredByItem,
  bestScoredQuotationId,
  rfpRespondedSupplierIds,
  rfpRoundOptions,
  rfpSupplierGate,
  rfqSupplierGate,
  rfxNow,
} from './rfxReadModel';
import { firmOfferRefusal, rfpOfferRoundRefusal } from '../../sourcing/rfpFirmOffer';
import {
  awardItemsOfRfp,
  isRfpAward,
  rfpAwardedOptionRefs,
  rfpOptionSourcedRefusal,
  rfpSettledOptionRefs,
  rfqSourcedOptionRefs,
} from '../../sourcing/rfpAward';
import { isTieredRfq } from '../../sourcing/rfqComparison';
import {
  awardedItemBreaks,
  awardItemsDepartingBest,
  awardItemsOf,
  awardRefusalText,
  awardShapeRefusal,
  basisOf,
  itemOfAwardLine,
  itemsOpenAfter,
  lineBreakOf,
  type AwardItem,
} from '../../sourcing/awardShape';
import {
  awardCancelRefusal,
  awardCancelRefusalText,
  awardSapMarkRefusal,
  awardsInForce,
  type AwardTrail,
} from '../../sourcing/awardStatus';
import { gateRefusal } from '../../sourcing/complianceGate';
import { rfiTemplate } from '../../sourcing/rfxConfig';
import type {
  AwardLine,
  RfqAwardRecord,
  RfpAwardLine,
  RfiAnswer,
  RfiEvent,
  RfiQuestion,
  RfiResponse,
  RfpEvent,
  RfpFirmOffer,
  RfpFirmPrice,
  RfpPricingAnswer,
  RfpPricingRequest,
  RfpResponse,
  RfpTermAnswer,
  RfpTermRow,
  RfpTermsDocument,
  RfxConfidentiality,
  RfxCustomSection,
  RfxEventStatus,
  RfpEventStatus,
  RfxInvitee,
  RfxResponseStatus,
} from '../../sourcing/types';
import { BID_CURRENCIES } from '../../../lib/currencyPolicy';
import { deriveQuoteHeader, readRfqAuthoringFields } from '../../sourcing/rfqModel';
// RFx spec 2026-09-21 — the supplier's side of a tiered RFQ (intent,
// confidentiality, clarifications) and the tiered quotation rule.
import {
  rfqClarificationTarget,
  rfqConfidentialityTarget,
  rfqIntentTarget,
} from './rfqEngagementCommand';
import {
  isAttachmentMeta,
  type AttachmentMeta,
} from '../../attachments/sessionAttachments';
// NR-1 — document requests and response documents. Importing the module binds
// the document policies (side effect), the `rfqEngagementCommand` precedent.
import './rfxDocumentsCommand';
import { documentRequestsRefusal, stampDocuments } from '../../transitions/rfxDocumentRules';
import type { DocumentRequest } from '../../sourcing/types';
// NR-1 BR-08 — revise until the deadline, with an appended version history.
import {
  revisedRfiResponse,
  revisedRfpResponse,
  versionsAfterSubmit,
} from '../../sourcing/responseVersions';


// The question kinds this build can render and score live in ONE list,
// `RFX_QUESTION_TYPES` (`sourcing/rfxConfig`), and the create hook reaches them
// through `rfiQuestionsRefusal` — the same predicate the template store reads.
import {
  commitmentCapacityRefusal,
  horizonWeeks,
  periodCapacityCheck,
} from '../../transitions/capacityRules';
import {
  allCommitmentLines,
  currentVersion,
  isForecastVersion,
  forecastPublicationById,
  qualifiedSuppliers,
} from './forecastReadModel';
import { baseDemand, FORECAST_SOURCES } from './fixtures/forecastHub';
import {
  reassignVersion,
  republishVersion,
  shortfallRefusal,
} from '../../transitions/forecastRules';
import type { CapacitySubmission, CapacityWeekEntry, StockAccessGrant } from '../types';
import { mockShipments } from '../../../data/mockShipments';
import { mockSuppliers } from '../../../data/mockSuppliers';
import {
  FORECAST_PUBLICATIONS,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  isKnownMaterial,
  materialEntry,
  requireUom,
  sdcClock,
} from '../../sdc';
// X-03 — the engine dataset's liveness, read at call time by the call-off
// release hook. The registry reads `WIRED_COMMAND_TARGETS` from this module
// lazily, so the two-way import is safe in either load order.
import { isLive } from '../../liveness/registry';
import type {
  Acknowledgment,
  IncomingShipment,
  InventoryBatch,
  InventoryDeclaration,
  Provenance,
  RequirementResponse,
  RequirementResponseStatus,
  RootCause,
  ShipmentDirection,
  ShipmentLifecycle,
  Uom,
} from '../../sdc';

// — Purchase-order command target — reads/writes the mutable PO store. ————————
const purchaseOrderTarget: CommandTarget = {
  readState: (id) => purchaseOrderStore.get(id)?.status ?? null,
  readScopeOwner: (id) => purchaseOrderStore.get(id)?.supplierId ?? null,
  readEntity: (id) => purchaseOrderStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    // Immutable swap (new PO + new line items) so the invalidated query yields
    // genuinely-new references and all derivations recompute (see the store).
    //
    // One target serves every PO verb, and the verbs are told apart by what
    // they carry — the dispatcher has already proved the payload's shape
    // through each verb's required fields and policy hook.
    const now = sdcClock.now();
    const text = (v: unknown): string | undefined =>
      typeof v === 'string' && v.trim() ? v.trim() : undefined;
    purchaseOrderStore.update(id, (po) => {
      const from = po.status;
      const next: PurchaseOrder = { ...po, status: toState as POStatus };

      // Approve (t_po_confirm): confirmed quantities + the confirmed date.
      const qtys = payload.confirmedQuantities;
      if (Array.isArray(qtys)) {
        next.lineItems = po.lineItems.map((li, i) =>
          typeof qtys[i] === 'number' ? { ...li, confirmedQty: qtys[i] as number } : li,
        );
        const date = text(payload.confirmedDeliveryDate);
        if (date) next.confirmedDeliveryDate = date;
        next.response = {
          option: 'approve',
          respondedAt: now,
          ...(date ? { confirmedDeliveryDate: date } : {}),
          ...(text(payload.comment) ? { comment: text(payload.comment) } : {}),
        };
      }

      // Adjust (t_po_adjust): the per-line counter-offer record.
      if (Array.isArray(payload.lineResponses)) {
        next.response = {
          option: 'adjust',
          respondedAt: now,
          lines: (payload.lineResponses as PoLineResponse[]).map((l) => ({
            lineId: l.lineId,
            reasonCode: l.reasonCode,
            ...(text(l.note) ? { note: text(l.note) } : {}),
            counterQty: l.counterQty,
            counterDate: l.counterDate,
          })),
          ...(text(payload.comment) ? { comment: text(payload.comment) } : {}),
        };
      }

      // Reject (t_po_reject).
      if (Array.isArray(payload.rejectionCauses)) {
        next.response = {
          option: 'reject',
          respondedAt: now,
          rejectionCauses: [...(payload.rejectionCauses as PoRejectionCause[])],
          ...(text(payload.comment) ? { comment: text(payload.comment) } : {}),
        };
      }

      // Counter-offer review by the planner.
      if (from === POStatus.ADJUSTED && po.response) {
        if (toState === POStatus.CONFIRMED) {
          // t_po_accept_counter — the PO stands at the counter-offer.
          const byLine = new Map((po.response.lines ?? []).map((l) => [l.lineId, l]));
          next.lineItems = po.lineItems.map((li) => {
            const counter = byLine.get(li.id);
            return { ...li, confirmedQty: counter ? counter.counterQty : li.quantity };
          });
          const dates = [...byLine.values()].map((l) => l.counterDate).sort();
          if (dates.length > 0) next.confirmedDeliveryDate = dates[dates.length - 1];
          next.response = { ...po.response, review: { decision: 'accepted', reviewedAt: now } };
        } else if (toState === POStatus.SENT) {
          // t_po_reject_counter — reopened; the deadline counts again from now.
          next.response = {
            ...po.response,
            review: { decision: 'rejected', comment: text(payload.reviewComment), reviewedAt: now },
          };
          next.responseRequestedAt = now;
        }
      }

      // Shipping notice (t_po_shipping_notice, state-preserving).
      const completion = text(payload.expectedCompletionDate);
      if (completion) {
        const prev = po.shippingNotice?.expectedCompletionDate;
        next.shippingNotice = {
          ...po.shippingNotice,
          expectedCompletionDate: completion,
          ...(prev && prev !== completion ? { previousCompletionDate: prev } : {}),
          updatedAt: now,
        };
      }
      return next;
    });
  },
};

/**
 * REQ-E07-05 BR-03 — the first ASN submitted against a PO records "shipment
 * started" on that PO, with that ASN's ship date (REQ-E07-04 made the ship date
 * part of the ASN). An ASN that predates the field falls back to the day it was
 * submitted.
 */
const recordShipmentStarted = (asnNumber: string, poNumber: string, shipDate?: string): void => {
  const po = purchaseOrderStore.all().find((p) => p.poNumber === poNumber);
  if (!po || po.shippingNotice?.startedOn) return;
  purchaseOrderStore.update(po.id, (p) => ({
    ...p,
    shippingNotice: {
      ...p.shippingNotice,
      startedOn: shipDate || sdcClock.now().slice(0, 10),
      startedByAsn: asnNumber,
    },
  }));
};

// — Advance ship notice target — creation-shape (canonical, Step 4 batch i). ——
const findPoByNumber = (poNumber: string) =>
  purchaseOrderStore.all().find((p) => p.poNumber === poNumber);

const nonBlank = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() && v.trim() !== '—' ? v.trim() : undefined;

/** The ASN lines a payload carries (REQ-E07-04), or null when it carries none. */
const payloadAsnLines = (payload: Record<string, unknown>): AsnLineInput[] | null =>
  Array.isArray(payload.lines) ? (payload.lines as AsnLineInput[]) : null;

/**
 * MR-6 BR-04 — the batch source stored on a line. A line is `declared` only
 * when the supplier says it picked the batch AND the batch is in its latest
 * stock record for the material; anything else is `typed`, so a payload cannot
 * hide the "not in declared stock" marker from PTI.
 */
const batchSourceOf = (
  supplierId: string | undefined,
  materialCode: string,
  lot: string,
  claimed: unknown,
): AsnBatchSource => {
  if (claimed !== 'declared' || !supplierId) return 'typed';
  const record = inventoryDeclarationStore.latestFor(supplierId, materialCode);
  return record?.batches?.some((b) => b.batchNumber === lot) ? 'declared' : 'typed';
};

/**
 * Merge entered lines onto an ASN's stored lines by material. A material the
 * draft does not carry yet is added from its PO line. Stored lines the payload
 * does not mention are kept as they are.
 */
const mergeAsnLines = (
  stored: readonly AsnLineItem[],
  entered: readonly AsnLineInput[],
  po: PurchaseOrder | undefined,
): AsnLineItem[] => {
  const out = stored.map((l) => ({ ...l }));
  for (const e of entered) {
    const i = out.findIndex((l) => l.materialCode === e.materialCode);
    const poLine = po?.lineItems.find((li) => li.materialCode === e.materialCode);
    const base: AsnLineItem =
      i >= 0
        ? out[i]
        : {
            materialCode: e.materialCode,
            description: poLine?.description ?? e.materialCode,
            orderedQty: poLine?.quantity ?? 0,
            shippedQty: 0,
            lotNumber: '',
            ...(poLine?.uom ? { uom: poLine.uom } : {}),
          };
    const lot = nonBlank(e.batchNumber);
    const next: AsnLineItem = {
      ...base,
      shippedQty: typeof e.shippedQty === 'number' ? e.shippedQty : base.shippedQty,
      lotNumber: lot ?? base.lotNumber,
      ...(nonBlank(e.expiryDate) ? { expiryDate: nonBlank(e.expiryDate) } : {}),
      ...(lot ? { batchSource: batchSourceOf(po?.supplierId, e.materialCode, lot, e.batchSource) } : {}),
    };
    if (i >= 0) out[i] = next;
    else out.push(next);
  }
  return out;
};

/** BL-51 — the 3PL an ASN update leaves in place: named, cleared, or kept. */
const threePlFromPayload = (payload: Record<string, unknown>, stored: string | undefined): string | undefined =>
  Object.prototype.hasOwnProperty.call(payload, 'threePlId') ? nonBlank(payload.threePlId) : stored;

const advanceShipNoticeTarget: CommandTarget = {
  readState: (id) => asnStore.get(id)?.status ?? null,
  readScopeOwner: (id) => asnStore.get(id)?.supplierId ?? null,
  readEntity: (id) => asnStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    const current = asnStore.get(id);
    const shipDate = nonBlank(payload.shipDate) ?? current?.shipDate;
    if (toState === 'Submitted' && current) {
      recordShipmentStarted(current.asnNumber, current.poReference, shipDate);
    }
    const entered = payloadAsnLines(payload);
    // BL-51 — a submission that names the 3PL replaces it; one that sends an
    // empty value (the carrier typed by name instead) clears it; one that says
    // nothing keeps the draft's.
    const threePlId = threePlFromPayload(payload, current?.threePlId);
    asnStore.update(id, ({ threePlId: _stored, ...a }) => ({
      ...a,
      ...(threePlId ? { threePlId } : {}),
      status: toState as AsnStatus,
      carrier: typeof payload.carrier === 'string' && payload.carrier ? payload.carrier : a.carrier,
      trackingNumber:
        typeof payload.trackingNumber === 'string' && payload.trackingNumber
          ? payload.trackingNumber
          : a.trackingNumber,
      eta: typeof payload.eta === 'string' && payload.eta ? payload.eta : a.eta,
      ...(shipDate ? { shipDate } : {}),
      ...(nonBlank(payload.packingListFile) ? { packingListFile: nonBlank(payload.packingListFile) } : {}),
      ...(nonBlank(payload.overShipReason) ? { overShipReason: nonBlank(payload.overShipReason) } : {}),
      lineItems: entered ? mergeAsnLines(a.lineItems, entered, findPoByNumber(a.poReference)) : a.lineItems,
    }));
  },
  // Creation scope: a supplier may draft an ASN only against its OWN PO.
  creationOwner: (payload) => findPoByNumber(String(payload.poReference))?.supplierId ?? null,
  create: (payload, toState) => {
    const po = findPoByNumber(String(payload.poReference));
    const asnNumber = asnStore.nextNumber();
    const entered = payloadAsnLines(payload);
    // REQ-E09-03 BR-06 — an ASN for a call-off delivery names the call-off; its
    // proposed lines are that call-off's material only.
    const callOff = nonBlank(payload.callOffId) ? callOffStore.get(String(payload.callOffId)) : undefined;
    // BR-02 — without entered lines, the draft proposes each PO line's OPEN
    // quantity (committed minus what other live ASNs already carry), never the
    // full ordered quantity: a second, partial ASN must not double-count.
    const lineItems: AsnLineItem[] = !po
      ? []
      : entered
        ? mergeAsnLines([], entered, po)
        : po.lineItems
            .filter((li) => !callOff || li.id === callOff.poLineId)
            .map((li) => ({
              materialCode: li.materialCode,
              description: li.description,
              orderedQty: li.quantity,
              shippedQty: openQtyForLine(po, li, asnStore.all()),
              lotNumber: '',
              uom: li.uom,
            }))
            .filter((l) => l.shippedQty > 0);
    const asn: ASN = {
      asnNumber,
      supplierId: po?.supplierId ?? '',
      poReference: String(payload.poReference),
      status: toState as AsnStatus,
      carrier: typeof payload.carrier === 'string' ? payload.carrier : '',
      ...(nonBlank(payload.threePlId) ? { threePlId: nonBlank(payload.threePlId) } : {}),
      trackingNumber: typeof payload.trackingNumber === 'string' ? payload.trackingNumber : '',
      eta: typeof payload.eta === 'string' ? payload.eta : '',
      details: {
        originCity: po?.supplierName ?? '',
        destinationWarehouse: 'NDC Jatake 6, Tangerang',
        totalCartons: 0,
        grossWeightKg: 0,
        temperatureRequirement: 'Ambient',
      },
      lineItems,
      ...(nonBlank(payload.shipDate) ? { shipDate: nonBlank(payload.shipDate) } : {}),
      ...(nonBlank(payload.packingListFile) ? { packingListFile: nonBlank(payload.packingListFile) } : {}),
      ...(nonBlank(payload.overShipReason) ? { overShipReason: nonBlank(payload.overShipReason) } : {}),
      ...(callOff ? { callOffId: callOff.id } : {}),
    };
    asnStore.add(asn);
    return { entityId: asnNumber };
  },
};

// Cross-entity creation legality (mock layer — reads the PO store): the parent
// PO must be approved and still open before an ASN can be drafted against it.
bindPolicyHook(POLICY_HOOKS.ASN_CREATE_PO_APPROVED, ({ payload }) => {
  const po = findPoByNumber(String(payload.poReference));
  if (!po) return { ok: false, reason: 'parent PO not found' };
  if (!ASN_PO_STATES.includes(po.status)) {
    return { ok: false, reason: `PO ${po.poNumber} is not approved and open (${po.status})` };
  }
  return { ok: true };
});

// REQ-E09-03 BR-06 / REQ-E07-04 AC-01 — an ASN for a call-off delivery needs a
// confirmed call-off on the same PO. An ASN that names no call-off is a PO-level
// ASN and keeps the existing behaviour.
bindPolicyHook(POLICY_HOOKS.ASN_CALLOFF_CONFIRMED, ({ payload }) => {
  if (payload.callOffId === undefined || payload.callOffId === null || payload.callOffId === '') return { ok: true };
  const callOff = callOffStore.get(String(payload.callOffId));
  if (!callOff) return { ok: false, reason: 'call-off not found' };
  if (callOff.poNumber !== String(payload.poReference)) {
    return { ok: false, reason: `${callOff.callOffNumber} is not on ${String(payload.poReference)}` };
  }
  if (!isConfirmedAndAccepted(callOff)) {
    return {
      ok: false,
      reason: `CALL_OFF_NOT_CONFIRMED: ${callOff.callOffNumber} is not confirmed (${
        isAwaitingApproval(callOff) ? 'awaiting approval' : callOff.status
      })`,
    };
  }
  return { ok: true };
});

// REQ-E07-04 BR-02 — shipped quantity within the PO line's open quantity, unless
// the supplier says why. On create the PO comes from the payload; on submit from
// the ASN, which is left out of its own open-quantity sum.
bindPolicyHook(POLICY_HOOKS.ASN_LINES_WITHIN_OPEN, ({ entityId, payload }) => {
  const asn = entityId ? asnStore.get(entityId) : undefined;
  const po = findPoByNumber(asn ? asn.poReference : String(payload.poReference));
  if (!po) return { ok: false, reason: 'parent PO not found' };
  const entered = payloadAsnLines(payload);
  const overShipReason = payload.overShipReason ?? asn?.overShipReason;
  // A create without lines proposes open quantities by construction.
  if (!asn && !entered) return { ok: true };
  if (!asn && entered && entered.length === 0) {
    return { ok: false, reason: 'an ASN needs at least one line' };
  }
  // AR-11 — the full line (batch, expiry) with the ETA the ASN will carry.
  const eta = nonBlank(payload.eta) ?? asn?.eta;
  const lines: AsnLineCheck[] = asn
    ? mergeAsnLines(asn.lineItems, entered ?? [], po).map((l) => asnLineCheckOf(l, eta))
    : entered!.map((e) => ({
        materialCode: e?.materialCode,
        shippedQty: e?.shippedQty,
        ...(e?.batchNumber !== undefined ? { lotNumber: e.batchNumber } : {}),
        ...(e?.expiryDate !== undefined ? { expiryDate: e.expiryDate } : {}),
        ...(eta !== undefined ? { eta } : {}),
      }));
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Stored lines of an older draft whose material the PO does not carry were
    // accepted when drafted; only entered lines must name a PO material.
    const onPo = po.lineItems.some((li) => li.materialCode === line?.materialCode);
    if (asn && !onPo && !entered?.some((e) => e.materialCode === line.materialCode)) continue;
    const refusal = asnLineRefusal(line, po, asnStore.all(), {
      excludeAsn: asn?.asnNumber,
      overShipReason,
      requireBatch: false,
    });
    if (refusal === 'overOpen') {
      return {
        ok: false,
        reason: `OVER_OPEN_QUANTITY: line ${i + 1} (${line.materialCode}) ships more than the open quantity — give a reason`,
      };
    }
    if (refusal) return { ok: false, reason: `line ${i + 1}: ${refusal}` };
    if (seen.has(line.materialCode)) return { ok: false, reason: `line ${i + 1}: material given twice` };
    seen.add(line.materialCode);
  }
  return { ok: true };
});

// REQ-E07-04 BR-04 — what a submitted ASN must carry, read on the draft merged
// with what the submission adds.
bindPolicyHook(POLICY_HOOKS.ASN_SUBMIT_COMPLETE, ({ entityId, payload }) => {
  const asn = asnStore.get(entityId);
  if (!asn) return { ok: false, reason: 'entity missing' };
  const lines = mergeAsnLines(asn.lineItems, payloadAsnLines(payload) ?? [], findPoByNumber(asn.poReference));
  const refusal = asnSubmitRefusal({
    lineCount: lines.length,
    shipDate: nonBlank(payload.shipDate) ?? asn.shipDate,
    eta: nonBlank(payload.eta) ?? asn.eta,
  });
  if (refusal) return { ok: false, reason: `INCOMPLETE_ASN: ${refusal}` };
  // AR-11 — each line through the one line rule, batch required. What the line
  // itself lacks is reported here; the PO checks (material on the PO, open
  // quantity) are ASN_LINES_WITHIN_OPEN's, which runs next on the same rule.
  const po = findPoByNumber(asn.poReference);
  const eta = nonBlank(payload.eta) ?? asn.eta;
  for (let i = 0; i < lines.length; i++) {
    const lineRefusal = asnLineRefusal(asnLineCheckOf(lines[i], eta), po ?? { poNumber: asn.poReference, lineItems: [] }, asnStore.all(), {
      excludeAsn: asn.asnNumber,
      overShipReason: payload.overShipReason ?? asn.overShipReason,
      requireBatch: true,
    });
    if (lineRefusal === 'batch') {
      return { ok: false, reason: `INCOMPLETE_ASN: batch number missing on line ${i + 1}` };
    }
    if (lineRefusal === 'quantity') {
      return { ok: false, reason: `INCOMPLETE_ASN: shipped quantity missing on line ${i + 1}` };
    }
  }
  return { ok: true };
});

// REQ-E07-04 — an ASN can be withdrawn only while nothing was received on it.
bindPolicyHook(POLICY_HOOKS.ASN_CANCEL_NOT_RECEIVED, ({ entityId }) =>
  goodsReceiptStore.all().some((g) => g.asnNumber === entityId)
    ? { ok: false, reason: `goods were already received against ${entityId}` }
    : { ok: true },
);
// BL-51 / REQ-E07-04 BR-05 — a 3PL the ASN names must be on the administrator's
// list and still offered. The same predicate the ASN form offers its choices
// through; an ASN that names no 3PL (the carrier typed by name) is untouched.
bindPolicyHook(POLICY_HOOKS.ASN_THREE_PL_LISTED, ({ payload }) => {
  const refusal = asnThreePlRefusal(payload.threePlId);
  return refusal ? { ok: false, reason: `THREE_PL_NOT_LISTED: ${refusal}` } : { ok: true };
});

// — Goods-receipt target (Step 4 batch ii) — buyer-side receiving, inspection,
//   disposition, and the FIRST real sapBoundary verb (Post to SAP, Option B). ——
const shipmentByRef = (asnReference: string) =>
  mockShipments.find((s) => s.asnNumber === asnReference);

// GR header disposition → the GR.disposition field it implies. Line-level
// Quarantine / Return live on the per-line sub-axis; the HEADER only accepts or
// rejects. Interim/receiving states keep the existing disposition.
const dispositionForState = (state: string): Disposition | null => {
  if (state === 'Approved' || state === 'Partially Approved') return 'Accept';
  if (state === 'Rejected') return 'Reject';
  return null;
};

// Shipment states in which the goods are physically present to receive.
const RECEIVABLE_SHIPMENT_STATUSES = new Set(['At Dock', 'Unloading', 'Delivered']);

const goodsReceiptTarget: CommandTarget = {
  readState: (id) => goodsReceiptStore.get(id)?.status ?? null,
  readScopeOwner: (id) => goodsReceiptStore.get(id)?.supplierId ?? null,
  readEntity: (id) => goodsReceiptStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    const reason =
      (typeof payload.dispositionReason === 'string' && payload.dispositionReason) ||
      (typeof payload.holdReason === 'string' && payload.holdReason) ||
      '';
    goodsReceiptStore.update(id, (g) => ({
      ...g,
      status: toState as GRStatus,
      disposition: dispositionForState(toState) ?? g.disposition,
      notes: reason || g.notes,
    }));
  },
  // GR is a buyer/warehouse document: the buyer receives ANY supplier's inbound
  // (no cross-supplier SCOPE_DENIED on create). The GR still carries the shipping
  // supplier's id — derived from the parent shipment — so per-supplier READ
  // scoping holds.
  creationOwner: (payload) => {
    const ref = String(payload.asnReference);
    return shipmentByRef(ref)?.supplierId ?? asnStore.get(ref)?.supplierId ?? null;
  },
  create: (payload, toState) => {
    const ref = String(payload.asnReference);
    const shp = shipmentByRef(ref);
    // Manual/ASN-ref path (no shipment): derive owner/refs from the ASN document
    // and its parent PO (the ASN carries no supplierName — the PO does).
    const asn = shp ? undefined : asnStore.get(ref);
    const asnPo = asn ? findPoByNumber(asn.poReference) : undefined;
    const grNumber = goodsReceiptStore.nextNumber();
    // Inspection results are recorded AT create (the batch-ii proof drives the
    // header rollup from these). The server derives ownership/refs from the
    // shipment (or ASN); only the inspection payload is trusted from the caller.
    const inspectionResults = Array.isArray(payload.inspectionResults)
      ? (payload.inspectionResults as InspectionResult[])
      : [];
    const gr: GoodsReceipt = {
      id: grNumber, // store is keyed by id; the assigned number doubles as the id
      grNumber,
      asnId: shp?.id ?? '',
      asnNumber: shp?.asnNumber ?? asn?.asnNumber ?? ref,
      poNumber:
        shp?.poNumber ??
        asn?.poReference ??
        (typeof payload.poReference === 'string' ? payload.poReference : ''),
      supplierId: shp?.supplierId ?? asn?.supplierId ?? asnPo?.supplierId ?? '',
      supplierName: shp?.supplierName ?? asnPo?.supplierName ?? '—',
      receivedDate: typeof payload.receivedDate === 'string' ? payload.receivedDate : '',
      receivedBy: typeof payload.receivedBy === 'string' ? payload.receivedBy : '',
      status: toState as GRStatus,
      inspectionResults,
      disposition: 'Pending',
      notes: typeof payload.notes === 'string' && payload.notes ? payload.notes : undefined,
    };
    goodsReceiptStore.add(gr);
    return { entityId: grNumber };
  },
};

// ── CP-2 · B1 — the GR inspected-lines gate (GR_INSPECTION_MATERIALS_DECLARED) ─
//
// `create` derives ownership and every reference from the parent document, but
// `inspectionResults` was taken VERBATIM from the caller — the one payload
// branch nobody checked. A peer calling `dispatch` directly could file a receipt
// naming a material the shipment never carried, and it would be stored as a
// buyer-authored inspection fact.
//
// The gate is DECLARED OWNERSHIP, not master membership. Deliberate: the GR
// lane's documents live in the mock*.ts identity space, of which the five-entry
// SDC `MATERIAL_MASTER` names two (MASTER-STRADDLE-01, docs/findings.md), so a
// master gate would refuse nearly every legitimate receipt. The parent's own
// line items are the authoritative statement of what arrived — and this is
// STRICTLY STRONGER here than a master check, since it also refuses a
// master-valid code the parent document never declared.
//
// A GR with NO inspection lines stays legal (it rolls up to 'Pending' and
// nothing is finalizable — GRInspectionWizard's existing honest-by-construction
// path for an unreadable line).
const declaredMaterialsFor = (asnReference: string): ReadonlySet<string> | null => {
  const shp = shipmentByRef(asnReference);
  if (shp) return new Set(shp.lineItems.map((li) => li.materialCode));
  const asn = asnStore.get(asnReference);
  if (asn) return new Set(asn.lineItems.map((li) => li.materialCode));
  return null; // GR_CREATE_SHIPMENT_RECEIVED already refuses this case by name.
};

bindPolicyHook(POLICY_HOOKS.GR_INSPECTION_MATERIALS_DECLARED, ({ payload }) => {
  const results = Array.isArray(payload.inspectionResults) ? payload.inspectionResults : [];
  if (results.length === 0) return { ok: true };
  const declared = declaredMaterialsFor(String(payload.asnReference));
  if (!declared) return { ok: true }; // the arrival hook owns the unresolvable-parent refusal
  const undeclared = results
    .map((r) =>
      r && typeof r === 'object' && typeof (r as Record<string, unknown>).materialCode === 'string'
        ? ((r as Record<string, unknown>).materialCode as string)
        : '',
    )
    .filter((code) => !declared.has(code));
  return undeclared.length === 0
    ? { ok: true }
    : {
        ok: false,
        reason: `UNDECLARED_MATERIAL: ${undeclared
          .map((c) => `'${c || '(blank)'}'`)
          .join(', ')} — the parent document never declared this material, and a receipt cannot inspect goods its own shipment does not name`,
      };
});

// GR create legality (mock layer — cross-entity read): the parent shipment must
// have physically arrived, or (for a manual ref) an existing ASN document exists.
bindPolicyHook(POLICY_HOOKS.GR_CREATE_SHIPMENT_RECEIVED, ({ payload }) => {
  const ref = String(payload.asnReference);
  const shp = shipmentByRef(ref);
  if (shp) {
    return RECEIVABLE_SHIPMENT_STATUSES.has(shp.status)
      ? { ok: true }
      : { ok: false, reason: `shipment ${ref} has not arrived (${shp.status})` };
  }
  if (asnStore.get(ref)) return { ok: true };
  return { ok: false, reason: `no arrived shipment or ASN found for ${ref}` };
});

// — Invoice target (Step 4 batch iii, DR-7) — supplier-scoped creation-shape
//   (draft against its OWN PO) + buyer lifecycle (match/approve/dispute) + the
//   second sapBoundary verb (release payment, Option B). Reads/writes the ONE
//   canonical invoice store; both persona reads project from it. ————————————————
const invoiceTarget: CommandTarget = {
  readState: (id) => invoiceStore.get(id)?.status ?? null,
  readScopeOwner: (id) => invoiceStore.get(id)?.supplierId ?? null,
  readEntity: (id) => invoiceStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    const today = sdcClock.now().slice(0, 10);
    invoiceStore.update(id, (inv) => {
      const next: Invoice = {
        ...inv,
        status: toState as InvoiceStatus,
        // Submit / resubmit carry the finalized amount; other verbs leave it.
        amount:
          toState === 'Submitted' && typeof payload.amount === 'number'
            ? payload.amount
            : inv.amount,
      };
      // Finance returns the invoice (t_invoice_dispute): keep its reason, which
      // the supplier reads on the Returned invoice.
      const reason = nonBlank(payload.disputeReason);
      if (toState === 'Disputed' && reason) next.returnReason = reason;
      if (toState === 'Submitted') {
        // REQ-E07-07 — a correction may replace the lines and documents.
        if (Array.isArray(payload.lines)) next.lines = (payload.lines as InvoiceLine[]).map((l) => ({ ...l }));
        if (nonBlank(payload.invoiceNumber)) next.invoiceNumber = nonBlank(payload.invoiceNumber)!;
        if (nonBlank(payload.invoiceDate)) next.invoiceDate = nonBlank(payload.invoiceDate);
        if (nonBlank(payload.taxInvoiceFile)) next.taxInvoiceFile = nonBlank(payload.taxInvoiceFile);
        // CR-14 — the due date counts from submission. A first submission of a
        // receipt-based invoice restarts the dates at today; a resubmission
        // keeps the original submission, so a return does not reset the clock.
        if (inv.status === 'Draft' && inv.lines) {
          next.submittedDate = today;
          next.dueDate = new Date(Date.parse(today) + 30 * 86_400_000).toISOString().slice(0, 10);
        }
        // A fresh verdict is computed by the submission cascade.
        if (inv.lines || next.lines) next.matchStatus = 'Pending';
      }
      return next;
    });
  },
  // Creation scope: a supplier may draft an invoice only against its OWN PO
  // (cross-supplier ⇒ SCOPE_DENIED, exactly as reads). Derived from the parent PO.
  creationOwner: (payload) => findPoByNumber(String(payload.poReference))?.supplierId ?? null,
  create: (payload, toState) => {
    const po = findPoByNumber(String(payload.poReference));
    const id = invoiceStore.nextNumber();
    // Honest dates by construction: a creation that omits the dates defaults
    // submittedDate to today and dueDate to Net-30 (CR-14) — so the invoice is
    // never BORN overdue. Submission restarts both at the submission day.
    const submittedDate =
      typeof payload.submittedDate === 'string' && payload.submittedDate
        ? payload.submittedDate
        : sdcClock.now().slice(0, 10);
    const dueDate =
      typeof payload.dueDate === 'string' && payload.dueDate
        ? payload.dueDate
        : new Date(Date.parse(submittedDate) + 30 * 86_400_000)
            .toISOString()
            .slice(0, 10);
    const lines = Array.isArray(payload.lines)
      ? (payload.lines as InvoiceLine[]).map((l) => ({ ...l }))
      : undefined;
    const invoice: Invoice = {
      id, // store keyed by id; the store assigns it
      // REQ-E07-07 — the supplier's own invoice number; the store number only
      // when none was given.
      invoiceNumber: nonBlank(payload.invoiceNumber) ?? id,
      supplierId: po?.supplierId ?? '',
      supplierName: po?.supplierName ?? '—',
      poNumber: String(payload.poReference),
      poId: po?.id ?? '',
      amount: typeof payload.amount === 'number' ? payload.amount : 0,
      currency: 'IDR',
      status: toState as InvoiceStatus,
      matchStatus: 'Pending',
      submittedDate,
      dueDate,
      paymentDate: null,
      paymentRef: null,
      sapFiDoc: null,
      sapGrDoc: null,
      bankAccount: typeof payload.bankAccount === 'string' ? payload.bankAccount : '',
      channel: 'Web',
      approver: '',
      paymentTerms: 'Net 30',
      buyerContact: '',
      remittanceNote: null,
      ...(lines ? { lines } : {}),
      ...(nonBlank(payload.invoiceDate) ? { invoiceDate: nonBlank(payload.invoiceDate) } : {}),
      ...(nonBlank(payload.taxInvoiceFile) ? { taxInvoiceFile: nonBlank(payload.taxInvoiceFile) } : {}),
    };
    invoiceStore.add(invoice);
    return { entityId: id };
  },
};

// Invoice create legality (mock layer — cross-entity read): the parent PO must
// be confirmed or (partly) delivered — goods are invoiced after they arrive.
bindPolicyHook(POLICY_HOOKS.INVOICE_CREATE_PO_INVOICEABLE, ({ payload }) => {
  const po = findPoByNumber(String(payload.poReference));
  if (!po) return { ok: false, reason: 'parent PO not found' };
  if (!INVOICEABLE_PO_STATES.includes(po.status)) {
    return { ok: false, reason: `PO ${po.poNumber} cannot be invoiced (${po.status})` };
  }
  return { ok: true };
});

// REQ-E07-07 BR-01 / BR-02 — every line from a received receipt of the
// supplier's own PO, at the PO price, within accepted minus already invoiced.
// On resubmission the invoice itself is left out of "already invoiced", and a
// line set the correction does not replace is re-checked as stored.
bindPolicyHook(POLICY_HOOKS.INVOICE_LINES_FROM_RECEIPTS, ({ entityId, payload }) => {
  const inv = entityId ? invoiceStore.get(entityId) : undefined;
  const lines = Array.isArray(payload.lines) ? (payload.lines as Partial<InvoiceLine>[]) : inv?.lines;
  // An invoice from before receipt-based invoicing has nothing to re-check.
  if (inv && !lines) return { ok: true };
  const po = findPoByNumber(inv ? inv.poNumber : String(payload.poReference));
  if (!po) return { ok: false, reason: 'parent PO not found' };
  if (!lines || lines.length === 0) return { ok: false, reason: 'an invoice needs at least one received line' };
  const invoiceDate = nonBlank(payload.invoiceDate) ?? inv?.invoiceDate;
  if (!isCalendarDate(invoiceDate)) return { ok: false, reason: 'invoice date must be a date (YYYY-MM-DD)' };
  if (!(nonBlank(payload.taxInvoiceFile) ?? inv?.taxInvoiceFile)) {
    return { ok: false, reason: 'the tax invoice (e-Faktur) must be attached' };
  }
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const refusal = invoiceLineRefusal(lines[i], {
      supplierId: po.supplierId,
      po,
      receipts: goodsReceiptStore.all(),
      invoices: invoiceStore.all(),
      excludeInvoiceId: inv?.id,
    });
    if (refusal === 'overInvoiced') {
      return {
        ok: false,
        reason: `OVER_INVOICED: line ${i + 1} invoices more than was received and not yet invoiced`,
      };
    }
    if (refusal) return { ok: false, reason: `line ${i + 1}: ${refusal}` };
    const key = `${lines[i].receiptId}|${lines[i].materialCode}`;
    if (seen.has(key)) return { ok: false, reason: `line ${i + 1}: receipt line given twice` };
    seen.add(key);
  }
  return { ok: true };
});

// REQ-E07-07 AC-02 — a supplier cannot use the same invoice number twice.
bindPolicyHook(POLICY_HOOKS.INVOICE_NUMBER_UNIQUE, ({ entityId, payload }) => {
  const inv = entityId ? invoiceStore.get(entityId) : undefined;
  const po = inv ? undefined : findPoByNumber(String(payload.poReference));
  const supplierId = inv?.supplierId ?? po?.supplierId;
  const number = nonBlank(payload.invoiceNumber) ?? inv?.invoiceNumber;
  if (!supplierId || !number) return { ok: true };
  return isDuplicateInvoiceNumber(number, supplierId, invoiceStore.all(), inv?.id)
    ? { ok: false, reason: `DUPLICATE_INVOICE_NUMBER: '${number}' is already used on another invoice` }
    : { ok: true };
});

// — Receipt discrepancy response target (REQ-E07-06) — the supplier answers a
//   derived discrepancy on its own receipt; PTI's planner resolves a dispute.
//   Keyed by the receipt id: one answer per receipt. ——————————————————————————
const asnForReceipt = (gr: GoodsReceipt) => asnStore.get(gr.asnNumber) ?? null;

const receiptDiscrepancyTarget: CommandTarget = {
  readState: (id) => receiptDiscrepancyStore.get(id)?.status ?? null,
  readScopeOwner: (id) => receiptDiscrepancyStore.get(id)?.supplierId ?? null,
  readEntity: (id) => receiptDiscrepancyStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    receiptDiscrepancyStore.update(id, (r) => ({
      ...r,
      status: toState as ReceiptDiscrepancyStatus,
      ...(toState === 'Resolved'
        ? { resolutionComment: nonBlank(payload.resolutionComment), resolvedAt: sdcClock.now() }
        : {}),
    }));
  },
  // The owner is the supplier the receipt belongs to — derived from the store,
  // never echoed from the payload — and it is required for every persona.
  requireCreationOwner: true,
  creationOwner: (payload) => goodsReceiptStore.get(String(payload.receiptId))?.supplierId ?? null,
  create: (payload, toState) => {
    const gr = goodsReceiptStore.get(String(payload.receiptId))!;
    receiptDiscrepancyStore.add({
      receiptId: gr.id,
      supplierId: gr.supplierId,
      status: toState as ReceiptDiscrepancyStatus,
      comment: nonBlank(payload.comment) ?? '',
      respondedAt: sdcClock.now(),
    });
    return { entityId: gr.id };
  },
};

bindPolicyHook(POLICY_HOOKS.RECEIPT_DISCREPANCY_ANSWERABLE, ({ payload }) => {
  const gr = goodsReceiptStore.get(String(payload.receiptId));
  if (!gr) return { ok: false, reason: 'goods receipt not found' };
  if (!hasReceiptDiscrepancy(gr, asnForReceipt(gr))) {
    return { ok: false, reason: `NO_DISCREPANCY: ${gr.grNumber} is within the receipt tolerance (CR-25) and nothing was rejected` };
  }
  if (receiptDiscrepancyStore.get(gr.id)) {
    return { ok: false, reason: `ALREADY_ANSWERED: ${gr.grNumber} already has an answer` };
  }
  if (!nonBlank(payload.comment)) return { ok: false, reason: 'a comment is required' };
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.RECEIPT_DISCREPANCY_RESOLUTION_AUTHORED, ({ payload }) =>
  nonBlank(payload.resolutionComment)
    ? { ok: true }
    : { ok: false, reason: 'resolving a dispute needs a comment for the supplier' },
);

// — Call-off target (REQ-E09-01, REQ-E09-03, REQ-E09-04) — the hub is the
//   record. The planner releases, changes and reviews; the supplier confirms and
//   sends dispatch heads-ups. Whether a confirmation is accepted automatically
//   or waits for the planner is computed HERE from the one tolerance rule
//   (`checkTolerance`), never chosen by the caller. Stamps use the simulated
//   clock the call-off projections read, so a deadline and its escalation are
//   measured on the same clock. ——————————————————————————————————————————————
const kindForState = (toState: string): CallOffConfirmationKind | undefined =>
  (Object.keys(CONFIRMATION_STATE) as CallOffConfirmationKind[]).find((k) => CONFIRMATION_STATE[k] === toState);

const poLineFor = (poId: string, lineId: string) => {
  const po = purchaseOrderStore.get(poId);
  return { po, line: po?.lineItems.find((li) => li.id === lineId) };
};

const callOffTarget: CommandTarget = {
  readState: (id) => callOffStore.get(id)?.status ?? null,
  readScopeOwner: (id) => callOffStore.get(id)?.supplierId ?? null,
  readEntity: (id) => callOffStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    const now = sdcClock.now();
    const current = callOffStore.get(id);
    if (!current) return;
    const reason = nonBlank(payload.reason);
    const withQtyDate = (c: CallOff): CallOff => ({
      ...c,
      ...(isPositiveQty(payload.quantity) ? { quantity: payload.quantity } : {}),
      ...(isCallOffDate(payload.needDate) ? { needDate: payload.needDate } : {}),
      ...(CALL_OFF_TYPES.includes(payload.type as CallOffType) ? { type: payload.type as CallOffType } : {}),
    });

    // The verbs are told apart by the state they leave and the state they reach;
    // each one's policy has already refused every other combination.
    if (toState === 'Draft') {
      // Draft edit (state-preserving): new quantity / date / type, with the reason.
      callOffStore.update(id, (c) => ({ ...withQtyDate(c), notes: [...c.notes, { action: 'edit', text: reason ?? '', at: now }] }));
      return;
    }
    if (toState === 'Awaiting Confirmation') {
      if (current.status === 'Draft') {
        // Release a draft.
        callOffStore.update(id, (c) => ({ ...c, status: 'Awaiting Confirmation', releasedAt: now }));
      } else if (isAwaitingApproval(current)) {
        // The planner rejects the confirmation: back to the supplier to confirm again.
        callOffStore.update(id, (c) => {
          const { confirmation: _dropped, ...rest } = c;
          return {
            ...rest,
            status: 'Awaiting Confirmation',
            releasedAt: now,
            notes: [...c.notes, { action: 'returned', text: nonBlank(payload.reviewComment) ?? '', at: now }],
          };
        });
      } else {
        // The planner changes a released call-off: the supplier confirms again.
        // What both sides had agreed is kept, so OTIF measures against it until
        // the supplier confirms the change (BL-66 (2)); with no accepted
        // confirmation now, the earlier agreement (if any) stands.
        callOffStore.update(id, (c) => {
          const { confirmation: _dropped, rejectionReason: _cleared, ...rest } = withQtyDate(c);
          const agreed = isConfirmedAndAccepted(c) && c.confirmation ? c.confirmation.deliveries : c.agreedDeliveries;
          return {
            ...rest,
            ...(agreed ? { agreedDeliveries: agreed } : {}),
            status: 'Awaiting Confirmation',
            releasedAt: now,
            notes: [...c.notes, { action: 'change', text: reason ?? '', at: now }],
          };
        });
      }
      return;
    }
    if (toState === 'Dismissed') {
      callOffStore.update(id, (c) => ({
        ...c,
        status: 'Dismissed',
        notes: [...c.notes, { action: 'dismiss', text: reason ?? '', at: now }],
      }));
      return;
    }
    if (toState === 'Rejected') {
      callOffStore.update(id, (c) => ({
        ...c,
        status: 'Rejected',
        rejectionReason: reason,
        notes: [...c.notes, { action: 'reject', text: reason ?? '', at: now }],
      }));
      return;
    }
    // State-preserving verbs on a confirmed call-off: approval (a confirmation is
    // waiting) or a dispatch heads-up (the confirmation is accepted).
    if (current.status === toState && current.confirmation) {
      if (isAwaitingApproval(current)) {
        callOffStore.update(id, (c) => ({
          ...c,
          confirmation: { ...c.confirmation!, approval: 'approved', reviewedAt: now },
        }));
        return;
      }
      callOffStore.update(id, (c) => ({
        ...c,
        dispatches: [
          ...c.dispatches,
          {
            id: `dsp-${c.id.slice(3)}-${c.dispatches.length + 1}`,
            shippedDate: String(payload.shippedDate),
            expectedArrival: String(payload.expectedArrival),
            quantity: Number(payload.quantity),
            ...(nonBlank(payload.asnNumber) ? { asnNumber: nonBlank(payload.asnNumber) } : {}),
            recordedAt: now,
          },
        ],
      }));
      return;
    }
    // Supplier confirmation: the tolerance rule decides auto or awaiting.
    const kind = kindForState(toState);
    if (!kind) return;
    const proposal = proposedDeliveries(current, kind, payload);
    if (!('deliveries' in proposal)) return;
    const within = checkTolerance(current, proposal.deliveries).within;
    callOffStore.update(id, (c) => ({
      ...c,
      status: toState as CallOffStatus,
      confirmation: {
        kind,
        deliveries: proposal.deliveries,
        ...(nonBlank(payload.comment) ? { comment: nonBlank(payload.comment) } : {}),
        confirmedAt: now,
        approval: within ? 'auto' : 'awaiting',
      },
    }));
  },
  // A call-off belongs to the supplier of its umbrella PO — read from the PO
  // store, never echoed from the payload.
  requireCreationOwner: true,
  creationOwner: (payload) => purchaseOrderStore.get(String(payload.poId))?.supplierId ?? null,
  create: (payload, toState) => {
    const { po, line } = poLineFor(String(payload.poId), String(payload.poLineId));
    const identity = callOffStore.nextIdentity();
    const row: CallOff = {
      ...identity,
      poId: po!.id,
      poNumber: po!.poNumber,
      poLineId: line!.id,
      supplierId: po!.supplierId,
      supplierName: po!.supplierName,
      materialCode: line!.materialCode,
      description: line!.description,
      uom: line!.uom,
      unitPrice: line!.unitPrice,
      currency: po!.currency,
      quantity: Number(payload.quantity),
      needDate: String(payload.needDate),
      type: payload.type as CallOffType,
      status: toState as CallOffStatus,
      ...(toState === 'Awaiting Confirmation' ? { releasedAt: sdcClock.now() } : {}),
      // X-03 — the Order plan names the engine as the origin of its drafts.
      ...(payload.origin === 'engine' ? { origin: 'engine' as const } : {}),
      dispatches: [],
      notes: [],
    };
    callOffStore.add(row);
    return { entityId: row.id };
  },
};

// REQ-E09-01 BR-02 — a call-off references an open umbrella PO line.
bindPolicyHook(POLICY_HOOKS.CALLOFF_LINE_VALID, ({ payload }) => {
  const { po } = poLineFor(String(payload.poId), String(payload.poLineId));
  const refusal = umbrellaRefusal(po, payload.poLineId);
  if (refusal === 'poNotFound') return { ok: false, reason: 'umbrella PO not found' };
  if (refusal === 'poNotOpen') return { ok: false, reason: `PO ${po!.poNumber} is not approved and open (${po!.status})` };
  if (refusal === 'lineNotFound') return { ok: false, reason: 'PO line not found' };
  if (!isPositiveQty(payload.quantity)) return { ok: false, reason: 'quantity must be greater than zero' };
  if (!isCallOffDate(payload.needDate)) return { ok: false, reason: 'need date must be a date (YYYY-MM-DD)' };
  if (String(payload.needDate) < sdcClock.now().slice(0, 10)) return { ok: false, reason: 'need date is in the past' };
  if (!CALL_OFF_TYPES.includes(payload.type as CallOffType)) return { ok: false, reason: 'type must be JIT or forecast-based' };
  // An origin, when given, is one the hub knows — an unknown token is refused
  // rather than dropped, so a misspelt 'engine' cannot slip past X-03.
  if (payload.origin !== undefined && payload.origin !== 'engine') {
    return { ok: false, reason: 'origin, when given, must be engine' };
  }
  return { ok: true };
});

// X-03 (owner decision 2026-09-23) — simulated engine output is never shown to
// a supplier. A call-off whose origin is the engine (a draft the Order plan
// created) is refused on release while `engineDataset` is not live. The
// call-off is read through the target; the liveness through the registry's own
// predicate, at call time. A creation-time release reads the origin from the
// payload, because there is no call-off to read yet.
//
// REQ-E14-13 BR-08 — the same rule on a CHANGE: a change the reschedule report
// sends names the engine as its origin in the payload (the call-off itself was
// typed by a planner), and is refused while the engine data is simulated, so
// nothing calculated on synthetic data reaches a supplier.
bindPolicyHook(POLICY_HOOKS.CALLOFF_ENGINE_DATA_LIVE, ({ entityId, payload, target }) => {
  const existing = entityId ? (target.readEntity(entityId) as CallOff | null) : null;
  const fromReport = payload.origin === 'engine' && existing !== null && existing.status !== 'Draft';
  const origin = payload.origin === 'engine' ? 'engine' : existing ? existing.origin : undefined;
  if (!engineReleaseWithheld({ origin }, isLive('engineDataset'))) return { ok: true };
  return {
    ok: false,
    reason: fromReport
      ? 'ENGINE_DATA_SIMULATED: this change comes from the reschedule report, calculated on simulated data; it can be sent to the supplier once the Master Data Management team’s SAP feed is live'
      : 'ENGINE_DATA_SIMULATED: this call-off comes from an order-plan recommendation calculated on simulated data; it can be released once the Master Data Management team’s SAP feed is live',
  };
});

// REQ-E09-01 BR-04 / AC-03, CR-04 — never beyond what remains on the umbrella PO
// line. BL-49: the check is on remaining QUANTITY, and on remaining VALUE only
// where the line carries no quantity. The refusal says which, and with what
// figures, so the planner can act on it.
bindPolicyHook(POLICY_HOOKS.CALLOFF_WITHIN_REMAINING, ({ entityId, payload }) => {
  const existing = entityId ? callOffStore.get(entityId) : undefined;
  const poId = existing?.poId ?? String(payload.poId);
  const lineId = existing?.poLineId ?? String(payload.poLineId);
  const { po, line } = poLineFor(poId, lineId);
  if (!po || !line) return { ok: false, reason: 'umbrella PO line not found' };
  const quantity = isPositiveQty(payload.quantity) ? payload.quantity : existing?.quantity;
  if (!isPositiveQty(quantity)) return { ok: false, reason: 'quantity must be greater than zero' };
  const check = releaseCheck(quantity, line, callOffStore.all(), existing?.id);
  if (check.exceeds) {
    return {
      ok: false,
      reason:
        check.basis === 'quantity'
          ? `EXCEEDS_REMAINING: ${quantity} ${line.uom} is more than the ${check.remaining.remainingQty} ${line.uom} remaining on ${po.poNumber} line ${line.materialCode}`
          : `EXCEEDS_REMAINING_VALUE: ${check.requestedValue} is more than the ${check.remaining.remainingValue} remaining on ${po.poNumber} line ${line.materialCode}, which has no quantity`,
    };
  }
  return { ok: true };
});

// Draft edit / change — a reason, and any new quantity or date is valid.
bindPolicyHook(POLICY_HOOKS.CALLOFF_EDIT_VALID, ({ payload }) => {
  if (!nonBlank(payload.reason)) return { ok: false, reason: 'a reason is required' };
  if (payload.quantity !== undefined && !isPositiveQty(payload.quantity)) {
    return { ok: false, reason: 'quantity must be greater than zero' };
  }
  if (payload.needDate !== undefined) {
    if (!isCallOffDate(payload.needDate)) return { ok: false, reason: 'need date must be a date (YYYY-MM-DD)' };
    if (String(payload.needDate) < sdcClock.now().slice(0, 10)) return { ok: false, reason: 'need date is in the past' };
  }
  if (payload.type !== undefined && !CALL_OFF_TYPES.includes(payload.type as CallOffType)) {
    return { ok: false, reason: 'type must be JIT or forecast-based' };
  }
  // REQ-E14-13 — a change from the reschedule report names the engine; an
  // origin the hub does not know is refused rather than dropped (X-03).
  if (payload.origin !== undefined && payload.origin !== 'engine') {
    return { ok: false, reason: 'origin, when given, must be engine' };
  }
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.CALLOFF_CHANGEABLE, ({ entityId }) => {
  const c = callOffStore.get(entityId);
  if (!c) return { ok: false, reason: 'call-off not found' };
  if (isAwaitingApproval(c)) {
    return { ok: false, reason: 'AWAITING_APPROVAL: approve or reject the confirmation first' };
  }
  if (headsUpsFor(c, asnStore.all()).length > 0) {
    return { ok: false, reason: `ALREADY_DISPATCHED: ${c.callOffNumber} has already shipped` };
  }
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.CALLOFF_REASON_AUTHORED, ({ payload }) =>
  nonBlank(payload.reason) ? { ok: true } : { ok: false, reason: 'a reason is required' },
);

// REQ-E09-03 BR-02 — the answer is well formed for its kind. The kind is the
// verb's own target state, so a caller cannot label one answer as another.
bindPolicyHook(POLICY_HOOKS.CALLOFF_CONFIRMATION_VALID, ({ entityId, toState, payload }) => {
  const c = callOffStore.get(entityId);
  const kind = kindForState(toState);
  if (!c || !kind) return { ok: false, reason: 'call-off not found' };
  const proposal = proposedDeliveries(c, kind, payload);
  if ('refusal' in proposal) return { ok: false, reason: `confirmation: ${proposal.refusal}` };
  return { ok: true };
});

bindPolicyHook(POLICY_HOOKS.CALLOFF_AWAITING_APPROVAL, ({ entityId }) => {
  const c = callOffStore.get(entityId);
  return c && isAwaitingApproval(c)
    ? { ok: true }
    : { ok: false, reason: 'NOT_AWAITING_APPROVAL: no confirmation is waiting for approval' };
});

bindPolicyHook(POLICY_HOOKS.CALLOFF_REVIEW_COMMENT_AUTHORED, ({ payload }) =>
  nonBlank(payload.reviewComment)
    ? { ok: true }
    : { ok: false, reason: 'rejecting a confirmation needs a comment for the supplier' },
);

// REQ-E09-04 — a heads-up only on an accepted confirmation, with real dates.
bindPolicyHook(POLICY_HOOKS.CALLOFF_DISPATCH_VALID, ({ entityId, payload }) => {
  const c = callOffStore.get(entityId);
  if (!c) return { ok: false, reason: 'call-off not found' };
  if (!isConfirmedAndAccepted(c)) {
    return { ok: false, reason: `CALL_OFF_NOT_CONFIRMED: ${c.callOffNumber} is awaiting approval` };
  }
  if (!isCallOffDate(payload.shippedDate)) return { ok: false, reason: 'shipped date must be a date (YYYY-MM-DD)' };
  if (!isCallOffDate(payload.expectedArrival)) return { ok: false, reason: 'expected arrival must be a date (YYYY-MM-DD)' };
  if (String(payload.expectedArrival) < String(payload.shippedDate)) {
    return { ok: false, reason: 'expected arrival is before the shipped date' };
  }
  if (!isPositiveQty(payload.quantity)) return { ok: false, reason: 'quantity must be greater than zero' };
  if (nonBlank(payload.asnNumber)) {
    const asn = asnStore.get(String(payload.asnNumber));
    if (!asn || asn.poReference !== c.poNumber) {
      return { ok: false, reason: `ASN ${String(payload.asnNumber)} is not on ${c.poNumber}` };
    }
  }
  return { ok: true };
});

// — RFQ target (Step 4 batch iv) — buyer-side sourcing. `t_rfq_award` is the
//   CASCADE SOURCE: it flips the RFQ to Awarded and records the award metadata
//   (awardedSupplierId / awardedQuotationId) — NO PO, NO contract minted
//   (honest-by-construction). The buyer owns the RFQ, so readScopeOwner is null
//   — which DENIES every supplier scope at the dispatcher's step 2, on an RFQ
//   that exists exactly as on one that does not. It used to mean only that scope
//   had nothing to compare, so a supplier reached the role gate on a real RFQ and
//   was denied at scope on a fabricated id: the refusal kind answered "does this
//   RFQ exist?" to the one persona that may not ask. A supplier's business with
//   an RFQ runs through its own `quotation`, which HAS an owner.
const RFQ_CATEGORIES: readonly RFQCategory[] = [
  'Fragrance', 'Active Ingredients', 'Packaging', 'Emulsifiers', 'Botanical', 'Other',
];
const RFQ_UOMS: readonly RFQ['uom'][] = ['KG', 'PCS', 'L', 'MT'];

/**
 * THE CONTENT an RFQ payload stores — everything the buyer authors, and the one
 * reading both `t_rfq_create` and `t_rfq_revise_draft` (BL-93) go through, so
 * an edited draft is stored exactly as a new one would be. Provenance
 * (`sourceRfiId`, `sourceRfpId`, `copiedFromRfqId`, `templateId`) is read here
 * for create and PINNED by the revise branch: where an RFQ came from is a fact
 * about its birth, and an edit does not rewrite it.
 */
function rfqContentOf(payload: Record<string, unknown>): Omit<
  RFQ,
  'id' | 'rfqNumber' | 'buyerId' | 'status' | 'createdAt' | 'respondedSupplierIds'
> {
  const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
  const num = (k: string) => (typeof payload[k] === 'number' ? (payload[k] as number) : 0);
  const strArr = (k: string) =>
    Array.isArray(payload[k]) ? (payload[k] as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  const materialCategory = RFQ_CATEGORIES.includes(payload.materialCategory as RFQCategory)
    ? (payload.materialCategory as RFQCategory)
    : 'Other';
  const uom = RFQ_UOMS.includes(payload.uom as RFQ['uom']) ? (payload.uom as RFQ['uom']) : 'KG';
  return {
    title: str('title'),
    materialCategory,
    materialIds: strArr('materialIds'),
    responseDeadline: str('responseDeadline'),
    awardDeadline: str('awardDeadline'),
    invitedSupplierIds: strArr('invitedSupplierIds'),
    // Required by the flow's `requiredFields` since 2e-b-4a, so `num()`'s 0
    // fallback is unreachable here — an absent quantity fails MISSING_FIELDS
    // before this is ever called, rather than minting an RFQ for nothing.
    totalQty: num('totalQty'),
    uom,
    // The buyer's estimated budget (2e-b-4a) — preserved ONLY when the payload
    // actually carries one. Deliberately NOT `num('estimatedValue')`: that
    // helper returns 0 for an absent field, which would mint "this event is
    // budgeted at Rp 0" out of a buyer who specified nothing. Absence stays
    // absence. Same reasoning, same shape, as `moq` on the quotation target.
    ...(typeof payload.estimatedValue === 'number'
      ? { estimatedValue: payload.estimatedValue as number }
      : {}),
    incoterms: str('incoterms'),
    paymentTerms: str('paymentTerms'),
    // The rebuilt authoring fields — project, items, breaks, questions,
    // options, provenance — AND THE CURRENCY. This used to be the literal
    // `currency: 'IDR'`, so a buyer who chose USD raised a rupiah RFQ. The
    // payload is already judged by `rfq_create_valid`.
    ...readRfqAuthoringFields(payload),
  };
}

const rfqTarget: CommandTarget = {
  readState: (id) => rfqStore.get(id)?.status ?? null,
  readScopeOwner: () => null,
  readEntity: (id) => rfqStore.get(id) ?? null,
  applyTransition: (id, toState, payload, scope, transitionId) => {
    // RFx A1 (AR-01) — the VERB is the discriminator. The dispatcher passes the
    // transition id, so each rfq verb with an effect of its own has a case here.
    // This used to guess the verb from the payload (`deadline` meant extend) and
    // the target state (`Draft` meant revise, `Awarded` meant award), so a stray
    // `deadline` on an award ran the extension and never awarded. Verbs with no
    // case (publish, close, cancel, reopen, fx-pin) fall through to the status
    // write below, as before; the FX pin's append there is keyed on its id too.
    switch (transitionId) {
      // REQ-E03-03 BR-05 — the extension. `t_rfq_extend` is state-preserving,
      // so nothing below the switch runs for it.
      case 't_rfq_extend': {
        const deadline = String(payload.deadline);
        const only = Array.isArray(payload.supplierIds)
          ? (payload.supplierIds as unknown[]).filter((x): x is string => typeof x === 'string')
          : [];
        rfqStore.update(id, (r) => ({
          ...r,
          // Extended for EVERYONE moves the event's own deadline; extended for
          // NAMED invitees leaves it alone and records a per-invitee one, so the
          // two acts stay distinguishable after the fact.
          ...(only.length === 0 ? { responseDeadline: deadline } : {}),
          ...(only.length === 0
            ? {}
            : {
                inviteeDeadlines: [
                  ...(r.inviteeDeadlines ?? []).filter((i) => !only.includes(i.supplierId)),
                  ...only.map((supplierId) => ({ supplierId, deadline })),
                ],
              }),
          extensions: [...(r.extensions ?? []), { at: rfxNow(), deadline, supplierIds: only }],
        }));
        return;
      }
      // BL-93 — the revise-draft branch. The record is REBUILT from the payload
      // rather than merged, so a field the buyer cleared (a budget, a sample
      // request, an attachment) is gone rather than surviving the edit.
      // Identity, lifecycle and provenance are the stored ones.
      case 't_rfq_revise_draft': {
        rfqStore.update(id, (r) => ({
          ...rfqContentOf(payload),
          id: r.id,
          rfqNumber: r.rfqNumber,
          buyerId: r.buyerId,
          status: r.status,
          createdAt: r.createdAt,
          respondedSupplierIds: r.respondedSupplierIds,
          sourceRfiId: r.sourceRfiId,
          sourceRfpId: r.sourceRfpId,
          sourceRfpOptionRefs: r.sourceRfpOptionRefs,
          copiedFromRfqId: r.copiedFromRfqId,
          templateId: r.templateId,
          // Not authored in the wizard, so never in the payload: kept as stored.
          ...(r.lineItems ? { lineItems: r.lineItems } : {}),
          ...(r.extensions ? { extensions: r.extensions } : {}),
          ...(r.inviteeDeadlines ? { inviteeDeadlines: r.inviteeDeadlines } : {}),
          ...(r.fxPins ? { fxPins: r.fxPins } : {}),
          // CE-08 — who edited it and when: the session's actor, the store's clock.
          revisions: [...(r.revisions ?? []), { at: sdcClock.now(), by: scope.actor ?? NO_PERSON }],
        }));
        return;
      }
      // REQ-E03-05 BR-06 / BR-09 — an award RECORDS itself. The hub keeps the
      // split, the reason and who was not awarded; it mints no PO and no contract
      // (the charter's system-of-record rule).
      // RFx C1 — the final award and the partial award record the same way:
      // ONE appended record per award, naming its event (AR-02), its lines
      // (each with the side the buyer typed and its own break), and its reason.
      case 't_rfq_award':
      case 't_rfq_award_partial': {
        const rfq = rfqStore.get(id);
        if (!rfq) break;
        const items = awardItemsOf(rfq, rfqAwardsOf(id));
        const lines = awardLinesOfPayload(rfq, payload).map((l) => recordedAwardLine(items, l));
        const final = transitionId === 't_rfq_award';
        // BR-07 per item: the best score each awarded item's lines are judged
        // against, at that item's break. The event-level best is kept at the
        // first line's break, as before.
        const tiered = isTieredRfq(rfq);
        const best = bestScoredQuotationId(rfq, rfxNow(), tiered ? lines[0]?.awardTierQty : undefined);
        const bestByItem = tiered
          ? awardedItemBreaks(items, lines).flatMap(({ item, breakQty }) => {
              const q = bestScoredByItem(rfq, rfxNow(), breakQty).get(item.lineNo!) ?? null;
              return q ? [{ itemLineNo: item.lineNo!, quotationId: q }] : [];
            })
          : null;
        // BR-08 — the suppliers told they were not awarded. Only the FINAL
        // award tells anyone: a partial award leaves items open that a supplier
        // with no share yet may still win. The final award names every invitee
        // that no award of this event names.
        const named = new Set([
          ...rfqAwardsOf(id).flatMap((a) => a.lines.map((l) => l.supplierId)),
          ...lines.map((l) => l.supplierId),
        ]);
        awardStore.add({
          id: awardStore.nextId(),
          eventType: 'rfq',
          eventId: id,
          awardedAt: rfxNow(),
          lines,
          ...(typeof payload.awardReason === 'string' && payload.awardReason.trim()
            ? { reason: payload.awardReason.trim() }
            : {}),
          ...(best ? { bestScoredQuotationId: best } : {}),
          ...(bestByItem ? { bestScoredByItem: bestByItem } : {}),
          notAwardedSupplierIds: final ? rfq.invitedSupplierIds.filter((sid) => !named.has(sid)) : [],
        });
        break;
      }
      // RFx C2 (NR-3 BR-09, BR-11; AR-08) — a cancel APPENDS a cancellation
      // naming the award, with who, when and why. The award record is not
      // touched: its status is derived at read. The RFQ's award pointer then
      // names the newest award still in force, or nothing.
      case 't_rfq_award_cancel':
      case 't_rfq_award_cancel_partial': {
        awardCancellationStore.add({
          id: awardCancellationStore.nextId(),
          awardId: String(payload.awardId),
          cancelledAt: rfxNow(),
          reason: String(payload.cancelReason ?? '').trim(),
          by: scope.actor ?? NO_PERSON,
        });
        const inForce = rfqAwardsOf(id)[0]?.lines[0];
        rfqStore.update(id, (r) => {
          const { awardedQuotationId: _q, awardedSupplierId: _s, ...rest } = r;
          return {
            ...rest,
            status: toState as RFQStatus,
            ...(inForce ? { awardedQuotationId: inForce.quotationId, awardedSupplierId: inForce.supplierId } : {}),
          };
        });
        return;
      }
      // RFx C2 (NR-3 BR-10, BR-11) — "Raised in SAP" APPENDS a marking with
      // the SAP document number the buyer typed. State-preserving: nothing
      // below the switch runs for it.
      case 't_rfq_award_sap_raised': {
        awardSapMarkStore.add({
          id: awardSapMarkStore.nextId(),
          awardId: String(payload.awardId),
          sapDocumentNo: String(payload.sapDocumentNo).trim(),
          markedAt: rfxNow(),
          by: scope.actor ?? NO_PERSON,
        });
        return;
      }
      default:
        break;
    }
    rfqStore.update(id, (r) => ({
      ...r,
      status: toState as RFQStatus,
      // Award records the chosen quote + supplier ONLY. Nothing downstream is
      // fabricated here — PO issuance is a separate buyer verb (future batch).
      awardedQuotationId:
        typeof payload.awardedQuotationId === 'string' ? payload.awardedQuotationId : r.awardedQuotationId,
      awardedSupplierId:
        typeof payload.awardedSupplierId === 'string' ? payload.awardedSupplierId : r.awardedSupplierId,
      // 2e-c-3 — THE D-1 FREEZE, made structural. A pin is APPENDED; there is no
      // branch here that finds an existing pin for the currency and replaces it,
      // and there is deliberately never going to be one. Superseding a rate is
      // appending a newer pin, so the basis a comparison was ranked on remains
      // readable for as long as the RFQ does. The pin in force is DERIVED at
      // read (`effectivePin`), so "current" cannot drift from the ledger.
      //
      // The payload is already gated by `rfq_fx_pin_well_formed` (permitted
      // non-base currency, finite positive rate, readable vintage, known
      // source), so the reads below cannot mint a malformed basis. Only
      // `t_rfq_fx_pin` appends one (RFx A1): a `quote` on another verb is ignored.
      ...(transitionId !== 't_rfq_fx_pin'
        ? {}
        : {
            fxPins: [
              ...(r.fxPins ?? []),
              {
                quote: payload.quote as BidCurrency,
                base: BASE_CURRENCY,
                rate: payload.rate as number,
                asOf: String(payload.asOf),
                // Store-assigned, never payload-supplied: when a pin was
                // recorded is a fact about the system, and a caller that could
                // set it could backdate its own audit entry.
                pinnedAt: rfxNow(),
                source: payload.source as FxPinSource,
                ...(typeof payload.rateType === 'string' ? { rateType: payload.rateType } : {}),
                // SIMULATED until a real rate feed lands (the Stage-F seam). A
                // MANUAL pin is a real human decision but not a live feed, and
                // dressing it as LIVE would be the two-gate violation this
                // codebase marks everywhere else.
                liveness: 'SIMULATED',
              },
            ],
          }),
    }));
  },
  // Creation (Phase A/2 — retires extraRfqs). Buyer-only: `creationOwner: () =>
  // null` ⇒ a buyer passes creation-scope (the dispatcher only scopes suppliers)
  // then the `rfq:create` role; a supplier resolves owner=null → SCOPE_DENIED
  // before the role gate (RFQ creation is a buyer verb). `create` mints a DRAFT
  // RFQ (PF-1a · D-1, reversing FORK-2B — the buyer publishes it as a second,
  // deliberate act) from the wizard payload with a store-assigned number; omitted
  // or unrecognised fields default honestly (category/uom fall back rather than
  // guess). NO award metadata and NO downstream artifact on a fresh event.
  creationOwner: () => null,
  create: (payload, toState) => {
    const rfqNumber = rfqStore.nextNumber();
    const rfq: RFQ = {
      id: rfqNumber, // store keyed by id; the assigned number doubles as the id
      rfqNumber,
      buyerId: 'buyer-001',
      status: toState as RFQStatus, // 'Draft' (PF-1a · D-1 — reverses FORK-2B)
      createdAt: rfxNow().slice(0, 10),
      respondedSupplierIds: [],
      // REQ-E03-03 BR-02 — the RFI this RFQ was created from. Carried ONLY when
      // present: most RFQs come from no RFI (REQ-E03-02 BR-03).
      ...(typeof payload.sourceRfiId === 'string' && payload.sourceRfiId
        ? { sourceRfiId: payload.sourceRfiId }
        : {}),
      ...rfqContentOf(payload),
    };
    rfqStore.add(rfq);
    return { entityId: rfqNumber };
  },
};

// A newly-submitted quote's compliance + reliability are DECLARED-SIMULATED
// external axes (no real I3 / OTIF source yet). We seed a documented FLAT
// SIMULATED BASELINE — NOT zero (a lying low) and NOT a supplier-profile lookup
// (that would dress a placeholder as a real signal). The scoring engine passes
// these through VERBATIM and marks them "Simulated"; they flip LIVE via the
// two-gate the day real sources land. 50 = neutral midpoint on the 0–100 axis.
const SIMULATED_AXIS_BASELINE = 50;

// — Quotation target (Task 3b + Step 4 batch iv). Two roles:
//   • CREATION (Task 3b) — `t_quotation_submit` is the ONE supplier-owned
//     creation verb. `creationOwner` folds invited-membership AND scope into one
//     ASN-faithful statement (mirrors advanceShipNotice's `findPoByNumber(...)
//     .supplierId`): the owner is the submitting supplier, valid ONLY when it is
//     invited to the referenced RFQ. A non-invited supplier resolves owner=null →
//     SCOPE_DENIED; a supplier spoofing another invited id → owner≠scope →
//     SCOPE_DENIED; a buyer skips scope then fails the `quotation:submit` role
//     gate. `create` persists RAW FACTS only (unitPrice/leadTime/terms/validity)
//     — the derived score axes are the 0/false SENTINEL (engine-owned AT READ,
//     F0.3-FIND-01; storing them would re-fabricate the retired literals), and
//     compliance/reliability seed from the SIMULATED baseline (never a lying 0).
//   • CASCADE (Step 4) — the RFQ-award fan-out fires t_quotation_award (winner →
//     Awarded) / t_quotation_reject (→ Rejected). Supplier-owned read scoping.
const quotationTarget: CommandTarget = {
  readState: (id) => quotationStore.get(id)?.status ?? null,
  readScopeOwner: (id) => quotationStore.get(id)?.supplierId ?? null,
  readEntity: (id) => quotationStore.get(id) ?? null,
  applyTransition: (id, toState) => {
    quotationStore.update(id, (q) => ({ ...q, status: toState as QuotationStatus }));
  },
  creationOwner: (payload) => {
    const rfq = rfqStore.get(String(payload.rfqId));
    const sid = String(payload.supplierId);
    return rfq && rfq.invitedSupplierIds.includes(sid) ? sid : null;
  },
  create: (payload, toState, scope) => {
    const quoteNumber = quotationStore.nextNumber();
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const num = (k: string) => (typeof payload[k] === 'number' ? (payload[k] as number) : 0);
    const rfq = rfqStore.get(str('rfqId'));
    // RFx spec 2026-09-21 — on a tiered RFQ the header is DERIVED from the
    // per-item, per-break prices (`deriveQuoteHeader`), never taken from the
    // payload, so the figure the ranking reads cannot disagree with the grid.
    // `quotation_tiered_well_formed` has already refused an incomplete grid.
    const tiered =
      rfq && Array.isArray(payload.itemQuotes)
        ? deriveQuoteHeader(rfq, payload.itemQuotes as NonNullable<Quotation['itemQuotes']>)
        : null;
    const unitPrice = tiered ? tiered.unitPrice : num('unitPrice');
    const quotation: Quotation = {
      id: quoteNumber, // store keyed by id; the assigned number doubles as the id
      rfqId: str('rfqId'),
      supplierId: str('supplierId'),
      submittedAt: rfxNow().slice(0, 10),
      unitPrice,
      // The currency the price is denominated in (2e-c-2). The flow REQUIRES it
      // and the `quotation_submit_currency_permitted` policy proves it is a
      // permitted token, so both the empty case and the off-list case fail
      // before create is ever called — there is no fallback here to write,
      // because a fallback is precisely how an EUR bid used to become rupiah.
      // Cast is safe on that pair of guards, not on optimism.
      currency: str('currency') as BidCurrency,
      // Honest arithmetic from raw facts (unit × the RFQ's quantity), NOT a score.
      // Denominated in the quote's OWN currency — the RFQ's quantity is a count,
      // so it carries no currency of its own to disagree with.
      // REQ-E03-03 — the total is the SUM OF THE LINES when the quote carries
      // them, and unit × the event quantity when it does not. Derived either
      // way, so a header figure can never disagree with the detail under it.
      totalPrice: tiered
        ? tiered.totalPrice
        : Array.isArray(payload.lines) && (payload.lines as unknown[]).length > 0
          ? quoteLinesTotal(payload.lines as QuoteLineInput[])
          : unitPrice * (rfq?.totalQty ?? 0),
      // Required by the flow's `requiredFields`, so `num()`'s 0 fallback is
      // unreachable here — an absent lead time fails MISSING_FIELDS before
      // create is ever called, rather than being minted as a same-day promise.
      leadTimeDays: num('leadTimeDays'),
      // The supplier's minimum order quantity (2e-b-2) — preserved ONLY when the
      // payload actually carries one. Deliberately NOT `num('moq')`: that helper
      // returns 0 for an absent field, which would mint "this supplier's minimum
      // is zero" out of a supplier who said nothing. Absence stays absence.
      ...(typeof payload.moq === 'number' ? { moq: payload.moq as number } : {}),
      paymentTermsOffered: str('paymentTermsOffered'),
      validUntil: str('validUntil'),
      // REQ-E03-03 — the per-item prices, when the supplier quoted item by item.
      // `quotation_lines_well_formed` has already refused a malformed set, so a
      // `lines` key that survives to here is either absent or sound.
      ...(Array.isArray(payload.lines) && (payload.lines as unknown[]).length > 0
        ? { lines: payload.lines as Quotation['lines'] }
        : {}),
      // REQ-E03-05 BR-04 — which round this version answered, and the version it
      // supersedes. Both absent on an original response, which is what makes
      // "this is the first bid" a readable state rather than round 0 by
      // convention.
      ...(typeof payload.roundNumber === 'number' ? { roundNumber: payload.roundNumber as number } : {}),
      ...(str('supersedesQuotationId') ? { supersedesQuotationId: str('supersedesQuotationId') } : {}),
      ...(payload.bestAndFinal === true ? { bestAndFinal: true } : {}),
      // RFx spec 2026-09-21 — the tiered answer, stored whole: the per-item
      // prices and spec values, alternatives, the answers to the buyer's
      // questions, the sample offer (which used to be dropped) and the
      // attachment metadata. Each only when sent, the `moq` precedent.
      ...(tiered ? { itemQuotes: payload.itemQuotes as Quotation['itemQuotes'] } : {}),
      ...(Array.isArray(payload.alternatives) && payload.alternatives.length > 0
        ? { alternatives: payload.alternatives as Quotation['alternatives'] }
        : {}),
      ...(Array.isArray(payload.answers) && payload.answers.length > 0
        ? { answers: payload.answers as Quotation['answers'] }
        : {}),
      ...(payload.sampleOffer && typeof payload.sampleOffer === 'object'
        ? { sampleOffer: payload.sampleOffer as Quotation['sampleOffer'] }
        : {}),
      ...(Array.isArray(payload.attachments) && payload.attachments.length > 0
        ? { attachments: payload.attachments as Quotation['attachments'] }
        : {}),
      // NR-1 BR-01 — the supplier's documents, judged on submit by
      // `quotation_documents_complete`. CE-11i — upload times are the store's
      // and uploaders the SESSION's; a file this supplier already sent on an
      // earlier quote of this RFQ (a negotiation-round revise carries its files
      // forward) keeps its first stamp rather than being re-stamped as new.
      ...(Array.isArray(payload.documents) && payload.documents.length > 0
        ? {
            documents: stampDocuments(
              payload.documents,
              quotationStore
                .all()
                .filter((q) => q.rfqId === str('rfqId') && q.supplierId === str('supplierId'))
                .flatMap((q) => q.documents ?? []),
              rfxNow(),
              scope.actor ?? NO_PERSON,
            ),
          }
        : {}),
      // DECLARED-SIMULATED axes — documented baseline, passed through the engine
      // and marked "Simulated" at read. Never zero, never a profile lookup.
      complianceScore: SIMULATED_AXIS_BASELINE,
      reliabilityScore: SIMULATED_AXIS_BASELINE,
      // DERIVED axes — the engine owns these AT READ; the stored value is an inert
      // sentinel (no consumer reads a fresh quote's stored derived field).
      priceScore: 0,
      leadTimeScore: 0,
      aiCompositeScore: 0,
      aiRecommended: false,
      status: toState as QuotationStatus, // 'Submitted'
      ...(str('notes') ? { notes: str('notes') } : {}),
    };
    quotationStore.add(quotation);
    return { entityId: quoteNumber };
  },
};

// — Purchase-requisition target (G1.1 — the C7 PR intake) — buyer-only creation.
//   `t_pr_create` is the ONE intake verb both producers target: the internal Grid
//   (G1.2) and external SOMO (F2). Wiring it here closes C7-FIND-01 — the intake
//   maps onto the SAME dispatcher creation mechanism as ASN/invoice, no second path.
//   `creationOwner: () => null` ⇒ a buyer passes creation-scope (dispatcher only
//   scopes suppliers) then the `pr:create` role; a supplier resolves owner=null →
//   SCOPE_DENIED before the role gate (PR is buyer-internal — suppliers never see
//   PRs). `create` mints a Draft PR from the PrIntakeLine payload; omitted fields
//   default honestly. Provenance: `source` (INTERNAL_GRID | SOMO) persists on the
//   entity (C7 §4) — liveness stays registry-derived, plan-state stays the C6
//   overlay; neither is a row field.
const purchaseRequisitionTarget: CommandTarget = {
  readState: (id) => purchaseRequisitionStore.get(id)?.status ?? null,
  readScopeOwner: () => null,
  readEntity: (id) => purchaseRequisitionStore.get(id) ?? null,
  // ⚠️ **`toState` IS THE ONLY DISCRIMINATOR AVAILABLE HERE — `applyTransition`
  // receives no transitionId — AND ON THIS FLOW IT IS SUFFICIENT, WHICH IS A
  // FACT ABOUT THE MACHINE AND NOT A CONVENTION.** Each of the four states
  // written below has exactly ONE inbound edge (`Rejected` ← t_pr_reject,
  // `Draft` ← t_pr_revise, `Approved` ← t_pr_approve, `Sourcing Event` ←
  // t_pr_source), and `t_pr_create` also lands at `Draft` but arrives through
  // `create`, never through here. Derive it from `purchaseRequisition.flow.ts`
  // before adding a fifth: a state that gains a second inbound edge makes one of
  // these writes fire on the wrong verb, silently.
  //
  // The fourth was added at C.1 and the derivation was re-run, not inherited:
  // `Sourcing Event` is reached ONLY by `t_pr_source`. `PO Created` is still
  // written by no field-write here — `t_pr_convert` remains an authored
  // declaration with no link (its dispatcher arrives with F2).
  applyTransition: (id, toState, payload, scope) => {
    purchaseRequisitionStore.update(id, (pr) => ({
      ...pr,
      status: toState as PRStatus,
      // ⚠️ §67 — THE REJECTION REASON IS PERSISTED, AND THIS IS THE HALF THE
      // INVOICE LANE NEVER BUILT. There, a required `disputeReason` reaches
      // `applyTransition` and is dropped on the floor (`:703`); here the text
      // the verb refused to proceed without is written onto the document the
      // requester reads. A required field whose value evaporates is a
      // validation message, not a record.
      //
      // Proven a non-blank string by `PR_REJECT_REASON_AUTHORED` before this
      // runs, so no re-check and no fallback: a fallback here would be the
      // guard admitting it does not trust itself.
      //
      // NOT cleared on any other edge — `t_pr_revise` carries the PR back to
      // Draft and the reason stays, because "why this came back" is precisely
      // what a requester needs while revising. Only a fresh rejection replaces
      // it.
      ...(toState === 'Rejected' ? { rejectionReason: String(payload.rejectionReason) } : {}),
      // §68 — the SAME repair, on the note the verb had refused to proceed
      // without since PF-1a and then dropped. Proven a non-blank string by
      // `PR_REVISION_NOTE_AUTHORED` before this runs, so no re-check: a
      // fallback here would be the guard admitting it does not trust itself.
      //
      // Each revision REPLACES the last. A note describes the change that
      // produced THIS draft, so keeping an older one would attach the wrong
      // explanation to the document an approver is about to read.
      ...(toState === 'Draft' ? { revisionNote: String(payload.revisionNote) } : {}),
      // ⚠️ §68 — WHO APPROVED IT, FROM THE SESSION AND NOT FROM `payload`.
      // C10 §6.2: `PR_APPROVAL_ATTRIBUTED` has already refused a caller-supplied
      // `approvedBy` and confirmed the scope carries an actor, so this reads the
      // one source the caller cannot write. Today it is always
      // `UNATTRIBUTED: NO_PERSON_IN_SESSION` — which is the honest absence the
      // `approvalLevel` field could never be, because that one said
      // 'Procurement Head' whether or not anybody had approved anything.
      ...(toState === 'Approved' ? { approvedBy: scope.actor } : {}),
      // ⚠️ C.1 — THE RFQ THAT SOURCED THIS PR, WRITTEN WHERE THE REQUESTER READS
      // IT. `linkedDoc` is the column `BuyerRequisitions` renders as — when
      // empty; until now every non-empty value in it was hand-stamped into a
      // fixture. This is the first one the machine produces, and it produces the
      // same shape the fixtures already promised (`pr-003` → 'RFQ-2026-004').
      //
      // Read from `payload.linkedRfq`, which the cascade resolver sets to the
      // raising RFQ's number. `String()` with no fallback: the resolver is the
      // ONLY producer of this state (one inbound edge, asserted above), and it
      // always sets the key — a fallback here would be the write admitting it
      // does not trust the one caller it has.
      ...(toState === 'Sourcing Event' ? { linkedDoc: String(payload.linkedRfq) } : {}),
    }));
  },
  creationOwner: () => null,
  create: (payload, toState) => {
    const prNumber = purchaseRequisitionStore.nextNumber();
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const num = (k: string) => (typeof payload[k] === 'number' ? (payload[k] as number) : 0);
    // `source` persists ONLY when it is a recognised producer token — an unknown
    // or absent value leaves the PR without a producer mark (honest, not guessed).
    const source: PrSource | undefined =
      payload.source === 'INTERNAL_GRID' || payload.source === 'SOMO'
        ? (payload.source as PrSource)
        : undefined;
    const priority: PRPriority =
      payload.priority === 'High' || payload.priority === 'Low' ? payload.priority : 'Medium';
    const pr: PurchaseRequisition = {
      id: prNumber, // store keyed by id; the assigned number doubles as the id
      prNumber,
      material: str('material'),
      category: str('category'),
      // C7 §2.1 — the intake's `acceptedQty` maps to `quantity` (the required field).
      quantity: num('quantity'),
      uom: str('uom'),
      // C7 §2 GG-3 — `period` (planning bucket) maps to requiredDate today; a
      // single date until the bucket representation is pinned by IBP co-design.
      requiredDate: str('requiredDate') || str('period'),
      estimatedValue: num('estimatedValue'),
      requestor: str('requestor'),
      costCenter: str('costCenter'),
      status: toState as PRStatus,
      createdDate: sdcClock.now().slice(0, 10),
      approvalLevel: '',
      sourceOfSupply: '',
      linkedDoc: '',
      priority,
      justification: str('justification'),
      ...(source ? { source } : {}),
    };
    purchaseRequisitionStore.add(pr);
    return { entityId: prNumber };
  },
};

// — RequirementResponse target (SDC-2a — the P1 supplier-submission spine). ————
//   `t_requirementresponse_submit` mirrors t_quotation_submit EXACTLY, with the
//   membership check strengthened to LINE-GRAIN by design: the fan-out is OURS
//   (SDC-0 ⭐allocation), so ownership = "this exact supplier × material ×
//   period line was fanned to you" — a supplier can never answer a line
//   published to someone else, nor invent a material×period the publication
//   never fanned. Non-fanned → owner=null → SCOPE_DENIED; spoofed id → owner ≠
//   scope → SCOPE_DENIED; a buyer skips scope then fails the
//   `requirementresponse:submit` role gate.
//   `create` persists RAW FACTS only (confirmedQty / committedDate / capacity
//   constraint / root-cause); response state is derived AT READ by the SDC-1a
//   consolidation selectors (confirmed-full / short / stale are never stored).
//   `uom` is NEVER trusted from the payload — copied from the material master
//   (invariant #2). `submissionVersion` is DERIVED (prior max + 1 over the
//   response thread). confirmedQty: 0 is a LEGAL short confirmation (F-2).
//   Publications are the frozen SDC fixtures until the SOMO C8 feed lands —
//   read-only here (responses mutate; publications never do).
// REQ-E06-01 — the forecast versions the hub publishes are publications too;
// the lookup reads them beside the SDC-0 fixtures.
const publicationById = (publicationId: string) => forecastPublicationById(publicationId);

/** F-4 ruling: a store-minted response is SUPPLIER-authored, committed, and
 *  SIMULATED — the backing store is a mock; liveness flips at F1, not here. */
const PROV_SUPPLIER_SUBMIT: Provenance = Object.freeze({
  source: 'SUPPLIER',
  liveness: 'SIMULATED',
  planState: 'committed',
});

const requirementResponseTarget: CommandTarget = {
  readState: (id) => requirementResponseStore.get(id)?.status ?? null,
  readScopeOwner: (id) => requirementResponseStore.get(id)?.supplierId ?? null,
  readEntity: (id) => requirementResponseStore.get(id) ?? null,
  applyTransition: (id, toState, payload) => {
    requirementResponseStore.update(id, (r) => ({
      ...r,
      status: toState as RequirementResponseStatus,
      // ⚠️ R1b — THE DISPUTE LEDGER APPENDS. It never clears and never replaces.
      // `r` is the PRE-transition record, so `r.status` is the from-state: that
      // is what separates a RESOLUTION (Disputed → UnderReview) from a REVIEW
      // (Submitted → UnderReview), which lands on the same state and must add
      // nothing. The text was proven non-blank by `rr_dispute_text_authored`;
      // `at` is minted HERE from the shared SDC clock and never taken from the
      // payload (the `pinnedAt` discipline — a caller that could set it could
      // backdate its own dispute).
      //
      // This is the half the invoice lane never built: there, the required
      // `disputeReason` reaches `applyTransition` and is dropped on the floor.
      ...(toState === 'Disputed'
        ? {
            disputeResponse: [
              ...(r.disputeResponse ?? []),
              { kind: 'raised' as const, text: String(payload.disputeReason), at: sdcClock.now() },
            ],
          }
        : {}),
      ...(r.status === 'Disputed' && toState === 'UnderReview'
        ? {
            disputeResponse: [
              ...(r.disputeResponse ?? []),
              { kind: 'resolved' as const, text: String(payload.resolutionReason), at: sdcClock.now() },
            ],
          }
        : {}),
      // ⚠️ PF-1b — `submittedAt` IS STAMPED AT PROMOTION, NOT AT CREATION. A
      // draft has never been submitted, and the SDC-0 seed already encodes the
      // invariant by carrying no `submittedAt` on rr-0003.
      //
      // STORE-ASSIGNED, never payload-supplied (the `pinnedAt` discipline: a
      // caller that could set it could backdate its own submission against a
      // response deadline). Written only on the Draft → Submitted crossing, and
      // only when absent — a later buyer-side move (review / accept / dispute)
      // must not restamp the moment the supplier answered.
      ...(toState === 'Submitted' && !r.submittedAt ? { submittedAt: sdcClock.now() } : {}),
    }));
  },
  // Line-grain membership folded into creation scope (the quotation pattern,
  // strengthened): the owner is the submitting supplier, valid ONLY when the
  // referenced publication fanned this exact material × period line to it.
  creationOwner: (payload) => {
    const pub = publicationById(String(payload.publicationId));
    const sid = String(payload.supplierId);
    const fanned = pub?.lines.some(
      (l) =>
        l.supplierId === sid &&
        l.materialCode === String(payload.materialCode) &&
        l.periodBucket === String(payload.periodBucket),
    );
    return fanned ? sid : null;
  },
  create: (payload, toState) => {
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const materialCode = str('materialCode');
    const periodBucket = str('periodBucket');
    const publicationId = str('publicationId');
    const supplierId = str('supplierId');
    // creationOwner proved a fanned line exists; resolve it for the honest uom
    // AND the response-kind branch below.
    const line = publicationById(publicationId)?.lines.find(
      (l) =>
        l.supplierId === supplierId &&
        l.materialCode === materialCode &&
        l.periodBucket === periodBucket,
    );
    // invariant #2 — uom comes from the material master, NEVER from the caller.
    // CP-2 · B1: the old `?? line?.uom ?? 'KG'` tail is GONE. The line fallback
    // was only ever equal to the master (the SDC-0 integrity suite keys it
    // there), and the 'KG' behind it was a fabricated unit with arithmetic
    // consequences. `SDC_MATERIAL_KNOWN` refuses UNKNOWN_MATERIAL before this
    // runs, so `requireUom` is an unreachable-by-construction assertion — and,
    // unlike a `??` chain, it can never silently invent a unit if that hook is
    // ever unwired.
    const uom = requireUom(materialCode);
    // Root cause persists only when it carries a level1 (a shapeless object is
    // dropped, not guessed) — the supplier's explanation for a deviation.
    const rc = payload.rootCause as Partial<RootCause> | undefined;
    const rootCause: RootCause | undefined =
      rc && typeof rc.level1 === 'string' && rc.level1
        ? {
            level1: rc.level1,
            ...(typeof rc.level2 === 'string' && rc.level2 ? { level2: rc.level2 } : {}),
            ...(typeof rc.note === 'string' && rc.note ? { note: rc.note } : {}),
          }
        : undefined;
    const id = requirementResponseStore.nextNumber();
    const prior = requirementResponseStore.forResponseKey(
      supplierId,
      materialCode,
      periodBucket,
      publicationId,
    );
    // SDC-2b-EXT — the response KIND branches on the fanned line's PUBLISHED
    // commitmentClass (authoritative our-side data, never caller input). The
    // symmetric class guards make class ⟺ verb exactly 1:1, so this branch is
    // equivalent to branching on the transition — a commitment can never
    // silently become an acknowledgment or vice versa (invariant #11 XOR).
    const isVisibility = line?.commitmentClass === 'visibility-only';
    const ack = payload.acknowledgment as Partial<Acknowledgment> | undefined;
    const kindFields: Partial<RequirementResponse> = isVisibility
      ? {
          acknowledgment: {
            ...(ack && typeof ack.note === 'string' && ack.note ? { note: ack.note } : {}),
          },
        }
      : {
          forecastConfirmation: {
            // 0 is a legal confirmation ("cannot supply") — dispatcher isEmpty(0)
            // already admits it.
            //
            // ⚠️ THE `: 0` FALLBACK THAT STOOD HERE WAS UNREACHABLE AND ITS COMMENT
            // DESCRIBED DELETED BEHAVIOUR. It read "NaN/absent coerces to 0 with the
            // root cause telling why" — true before #237, when nothing above proved
            // the type. Policy hooks run at dispatcher step 6 and `applyTransition`
            // at step 7, so since RR_SUBMIT_QTY_FLOOR landed, a non-number or a
            // non-finite `confirmedQty` cannot reach this line at all. Manufacturing
            // a ZERO COMMITMENT out of garbage is the exact defect CP-0 killed in
            // `submitModel`; it survived here for one release as dead code wearing a
            // justification. The floor and the agreement guard are the two proofs
            // that let this be a plain read.
            confirmedQty: payload.confirmedQty as number,
            uom,
            ...(str('committedDate') ? { committedDate: str('committedDate') } : {}),
            ...(str('capacityConstraint')
              ? { capacityConstraint: str('capacityConstraint') }
              : {}),
            // REQ-E06-02 BR-08 — proven a number ≥ 0 by RR_SUBMIT_COMMITMENT_DETAIL.
            ...(typeof payload.upsideQty === 'number' ? { upsideQty: payload.upsideQty } : {}),
          },
        };
    const response: RequirementResponse = {
      id, // store keyed by id; the assigned number doubles as the id
      supplierId,
      materialCode,
      periodBucket,
      publicationId,
      planVersion: str('planVersion'),
      // ⚠️ PF-1b — ONLY WHEN THIS CREATION ACTUALLY SUBMITS. The commitment verb
      // now births a `Draft`, which by definition has no submission instant; the
      // acknowledge verb still births `Submitted` and keeps its stamp. Derived
      // from `toState` rather than from the transition id, so the two can never
      // disagree about what just happened.
      //
      // SDC-4a — the SHARED simulated clock, not the real wall-clock: a fresh
      // submission is stamped WITHIN the simulated timeline (after the seed), so
      // the newest-first "My responses" sort surfaces it correctly.
      ...(toState === 'Draft' ? {} : { submittedAt: sdcClock.now() }),
      // Versioned, never overwritten: prior max + 1 over the response thread.
      submissionVersion: prior.reduce((m, r) => Math.max(m, r.submissionVersion), 0) + 1,
      status: toState as RequirementResponseStatus, // 'Submitted'
      ...kindFields,
      ...(rootCause ? { rootCause } : {}),
      provenance: PROV_SUPPLIER_SUBMIT,
    };
    requirementResponseStore.add(response);
    return { entityId: id };
  },
};

// RR submit snapshot binding (mock layer — cross-entity read): the payload's
// planVersion must be the referenced publication's OWN planVersion, so a
// response can never claim to answer a snapshot other than the one published.
// (Membership/existence is creationOwner's job and fails FIRST, as scope.)
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_PLANVERSION_BOUND, ({ payload }) => {
  const pub = publicationById(String(payload.publicationId));
  if (!pub) return { ok: false, reason: 'referenced publication not found' };
  if (pub.planVersion !== String(payload.planVersion)) {
    return {
      ok: false,
      reason: `planVersion '${String(payload.planVersion)}' does not match publication '${pub.publicationId}' (${pub.planVersion})`,
    };
  }
  return { ok: true };
});

// RR submit — the quantity floor at the TRANSITION (the contract), mirroring
// the shape `PO_CONFIRM_QTY_WITHIN_ORDERED` already enforces on a field of the
// same name. `requiredFields` proves presence; this proves the value is a
// number a Σ can survive. The bound is `>= 0`, NOT the neighbour's `> 0`: a
// typed 0 is the ratified F-2 "cannot supply at all" confirmation.
//
// It validates the VALUE, never the READING. The READING is now proven by
// RR_SUBMIT_QTY_AGREES below, which is where `SUB-01`'s gap closed.
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_QTY_FLOOR, ({ payload }) => {
  const q = payload.confirmedQty;
  if (typeof q !== 'number' || !Number.isFinite(q)) {
    return {
      ok: false,
      reason: `confirmedQty must be a finite number, got ${typeof q === 'number' ? String(q) : typeof q}`,
    };
  }
  if (q < 0) {
    return { ok: false, reason: `confirmedQty ${q} is negative — a commitment cannot be less than nothing` };
  }
  return { ok: true };
});

// RR submit — THE READING, proven at the transition by re-parsing the token.
//
// THE HOIST (CP-0 §4 amended for THIS VERB ONLY). "The builder does not parse"
// is unchanged: the builder still ships the number it is given. What changed is
// that the CONTRACT no longer takes the caller's word for what that number
// means — it is handed the token too, runs the same `normalizeQty` the surface
// ran, and refuses if the two disagree.
//
// ⚠️ WHAT THIS CANNOT DO is stated on POLICY_HOOKS.RR_SUBMIT_QTY_AGREES at
// length and is the batch's honest cost: the convention is still the caller's
// to supply, so this proves CONSISTENCY, never correctness.
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_QTY_AGREES, ({ payload }) => {
  const raw = payload.confirmedQtyRaw;
  // `requiredFields` already refused an absent / empty token — but it uses
  // `isEmpty`, which is FALSE for `0`, `false` and `'   '`. A NUMBER in this
  // slot would sail through rule 5 and then silently stringify here, so the
  // type is proven rather than assumed.
  if (typeof raw !== 'string') {
    return {
      ok: false,
      reason: `confirmedQtyRaw must be the quantity token as typed (a string), got ${typeof raw}`,
    };
  }

  // An unrecognised convention is refused rather than ignored. Ignoring it would
  // silently downgrade to the hint-free parse — which is STRICTER, so it would
  // usually still refuse; "usually" is not a contract, and a caller shipping
  // `numberConvention: 'de'` has a defect it deserves to be told about.
  const conv = payload.numberConvention;
  if (conv !== undefined && conv !== 'id' && conv !== 'en') {
    return {
      ok: false,
      reason: `numberConvention must be 'id' or 'en' when present, got ${JSON.stringify(conv)}`,
    };
  }

  const parsed = normalizeQty(raw, conv as NumberConvention | undefined);
  if (!parsed.ok) {
    // The refusal REASON travels, because "we cannot read this" and "we cannot
    // tell which of two numbers you mean" ask the caller for different things —
    // the same distinction the surface already makes in its toast.
    return {
      ok: false,
      reason: `confirmedQtyRaw ${JSON.stringify(raw)} is not a readable quantity (${parsed.reason})`,
    };
  }

  // The floor ran first, so `confirmedQty` is already a finite number here.
  if (parsed.value !== payload.confirmedQty) {
    return {
      ok: false,
      reason:
        `confirmedQty ${String(payload.confirmedQty)} disagrees with confirmedQtyRaw ` +
        `${JSON.stringify(raw)}, which reads ${parsed.value}` +
        `${conv === undefined ? ' with no stated convention' : ` under '${String(conv)}'`}`,
    };
  }
  return { ok: true };
});

// REQ-E06-02 BR-04 / AC-02 — below forecast needs a starter reason (and `other`
// a note). The rule is `forecastRules.shortfallRefusal`, the same function the
// form and the upload check call, so the three can never disagree. The floor
// ran first, so `confirmedQty` is a finite number here.
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_SHORTFALL_REASON, ({ payload }) => {
  const line = fannedLine(payload);
  if (!line || typeof payload.confirmedQty !== 'number') return { ok: true };
  const refusal = shortfallRefusal(
    line.forecastQty,
    payload.confirmedQty,
    payload.rootCause as { level1?: unknown; note?: unknown } | undefined,
  );
  if (refusal === 'reasonRequired') {
    return {
      ok: false,
      reason: `BELOW_FORECAST_NEEDS_REASON: ${payload.confirmedQty} is below the forecast of ${line.forecastQty}; choose capacity, material, logistics, quality or other`,
    };
  }
  if (refusal === 'noteRequired') {
    return { ok: false, reason: 'OTHER_REASON_NEEDS_NOTE: the reason "other" needs a note' };
  }
  return { ok: true };
});

// REQ-E06-02 BR-08 — a commitment to a forecast version carries its date, and
// an upside quantity is a number of zero or more. The SDC-0 publications
// predate the date rule and keep their shape.
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_COMMITMENT_DETAIL, ({ payload }) => {
  const up = payload.upsideQty;
  if (up !== undefined && (typeof up !== 'number' || !Number.isFinite(up) || up < 0)) {
    return { ok: false, reason: 'upsideQty must be a number of zero or more' };
  }
  const date = payload.committedDate;
  if (isForecastVersion(String(payload.publicationId)) && !isIsoDay(date)) {
    return { ok: false, reason: 'COMMITMENT_DATE_REQUIRED: a commitment needs its date (YYYY-MM-DD)' };
  }
  if (date !== undefined && date !== '' && !isIsoDay(date)) {
    return { ok: false, reason: 'committedDate must be a date (YYYY-MM-DD)' };
  }
  return { ok: true };
});

// BL-133 (ENG-D19) — capacity before the LTP, on the SUBMISSION (the
// promotion). The response names its line; the line names its period and
// material group; the group's latest capacity submission says whether every
// horizon week the period touches is confirmed, and whether the group's LTP is
// above BE in one of them. SDC-0 publications predate the rule (the BR-08 date
// rule's precedent) and keep their shape; a line of a version no longer
// current is found by supplier × material × period on the current version.
bindPolicyHook(POLICY_HOOKS.RR_PROMOTE_CAPACITY_CONFIRMED, ({ entityId, target }) => {
  const r = target.readEntity(entityId) as
    | { publicationId?: string; supplierId?: string; materialCode?: string; periodBucket?: string; rootCause?: { level1?: unknown; note?: unknown } }
    | null
    | undefined;
  if (!r || !isForecastVersion(String(r.publicationId))) return { ok: true };
  const lines = allCommitmentLines(null);
  const line = lines.find(
    (l) => l.supplierId === r.supplierId && l.materialCode === r.materialCode && l.periodBucket === r.periodBucket,
  );
  if (!line) return { ok: true };
  const plan =
    allCapacityPlans().find((p) => p.supplierId === line.supplierId && p.materialGroup === line.materialGroup) ?? null;
  const check = periodCapacityCheck(
    plan,
    lines,
    line.supplierId,
    line.materialGroup,
    line.periodStart,
    line.periodEnd,
    horizonWeeks(sdcClock.now()),
  );
  const refusal = commitmentCapacityRefusal(check, r.rootCause);
  if (!refusal) return { ok: true };
  if (refusal.refusal === 'capacityNotConfirmed') {
    return {
      ok: false,
      reason: `CAPACITY_NOT_CONFIRMED: confirm the capacity for ${line.materialGroup} in the week of ${refusal.week} before submitting its LTP`,
    };
  }
  if (refusal.refusal === 'aboveBeNoteRequired') {
    return { ok: false, reason: 'OTHER_REASON_NEEDS_NOTE: the reason "other" needs a note' };
  }
  return {
    ok: false,
    reason: `ABOVE_BE_NEEDS_REASON: the LTP for ${line.materialGroup} in the week of ${refusal.week} is above capacity plus additional capacity; choose a reason`,
  };
});

// RR dispute / resolve — the authored text must be SUBSTANCE, not presence.
//
// ⚠️ WHICH FIELD IS ASKED FOR IS DERIVED FROM THE MACHINE, NEVER FROM THE
// TRANSITION ID. `toState === 'Disputed'` is the raise; `currentState ===
// 'Disputed'` is the resolution. Keying on the id would put the same fact in two
// places and let them disagree — and `t_requirementresponse_review` ALSO lands on
// `UnderReview`, so `toState` alone cannot tell a resolution from a review (it
// carries no hook, but a guard that would be wrong if it were reached is a guard
// waiting for its second caller).
//
// The bound is a NON-BLANK STRING. `requiredFields` runs `isEmpty`, and
// `isEmpty('   ')` is false — so is `isEmpty(0)` and `isEmpty(false)`. Without
// this, "required" admitted the space bar. It cannot prove the text is TRUE or
// responsive; no value-level guard can, exactly as the qty floor cannot tell
// 2400 from 2.4.
bindPolicyHook(POLICY_HOOKS.RR_DISPUTE_TEXT_AUTHORED, ({ payload, toState, currentState }) => {
  const field = toState === 'Disputed' ? 'disputeReason' : 'resolutionReason';
  const value = payload[field];
  if (typeof value !== 'string') {
    return { ok: false, reason: `${field} must be text, got ${typeof value}` };
  }
  if (value.trim() === '') {
    return {
      ok: false,
      reason: `${field} is blank — a ${
        toState === 'Disputed' ? 'dispute' : 'resolution'
      } from ${currentState} must say something the supplier can read`,
    };
  }
  return { ok: true };
});

// SDC-2b-EXT — the symmetric class guards (the honesty lock). creationOwner
// already proved the fanned line exists, so resolving it here cannot miss.
const fannedLine = (payload: Record<string, unknown>) =>
  publicationById(String(payload.publicationId))?.lines.find(
    (l) =>
      l.supplierId === String(payload.supplierId) &&
      l.materialCode === String(payload.materialCode) &&
      l.periodBucket === String(payload.periodBucket),
  );
const fannedLineClass = (payload: Record<string, unknown>) => fannedLine(payload)?.commitmentClass;

// Submit (a COMMITMENT) is illegal against a visibility-only line — nothing was
// requested to commit; a "confirmed" record there would be a fabricated claim.
bindPolicyHook(POLICY_HOOKS.RR_SUBMIT_COMMITMENT_CLASS, ({ payload }) => {
  return fannedLineClass(payload) === 'visibility-only'
    ? {
        ok: false,
        reason:
          'line is visibility-only — no commitment requested; use t_requirementresponse_acknowledge',
      }
    : { ok: true };
});

// Acknowledge (a VISIBILITY response) is legal ONLY against a visibility-only
// line — it must never dodge the commitment floor on a firm/semi-firm line.
bindPolicyHook(POLICY_HOOKS.RR_ACKNOWLEDGE_VISIBILITY_CLASS, ({ payload }) => {
  return fannedLineClass(payload) === 'visibility-only'
    ? { ok: true }
    : {
        ok: false,
        reason:
          'line is not visibility-only — a commitment is requested; use t_requirementresponse_submit',
      };
});

// — SDC-3a — the two additional supplier-submission objects ——————————————————
//   Both mirror the requirementResponse spine EXACTLY: creation-shape,
//   supplierId from identity (folded into creationOwner), raw facts persisted,
//   uom NEVER trusted from the payload (copied from the material master,
//   invariant #2). Membership ((i)∪(ii) ruling): "a material Paragon
//   collaborates with you on" — a relationship exists OR any publication ever
//   fanned this supplier × material. A material outside that set → owner=null →
//   SCOPE_DENIED; a spoofed supplierId → owner ≠ scope → SCOPE_DENIED.

/** (i)∪(ii): does Paragon collaborate with this supplier on this material? */
const collaboratedMaterial = (supplierId: string, materialCode: string): boolean =>
  SUPPLIER_MATERIAL_RELATIONSHIPS.some(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode,
  ) ||
  FORECAST_PUBLICATIONS.some((p) =>
    p.lines.some((l) => l.supplierId === supplierId && l.materialCode === materialCode),
  );

// ── CP-2 · B1 — the MASTER-MISS refusal (operator ruling D-OPS-MASTERMISS) ────
//
// Shared by all four SDC creation verbs (RR submit + acknowledge, INV declare +
// record, ISH report). Creation scope already proves the supplier COLLABORATES
// on the material — but `collaboratedMaterial` above tests relationships ∪
// publications, NOT the master. Nothing at RUNTIME forces those two sets to be
// master-subsets; only the SDC-0 integrity suite does
// (sdc.integrity.test.ts:81), and a suite is not a boundary. So the moment a
// relationship row or a SOMO-fed publication line names a code the master
// lacks, the old `?? 'KG'` tail fabricated a unit. This proves the unit exists
// before anything is stamped with one.
//
// REFUSED OUTRIGHT — no quarantine, no accept-with-marker. At F2, an
// unresolvable code in SOMO's live feed gets a loud error at WIRE TIME rather
// than a silent backlog of facts that exist but are not trustworthy.
bindPolicyHook(POLICY_HOOKS.SDC_MATERIAL_KNOWN, ({ payload }) => {
  const materialCode = typeof payload.materialCode === 'string' ? payload.materialCode : '';
  return isKnownMaterial(materialCode)
    ? { ok: true }
    : {
        ok: false,
        reason: `UNKNOWN_MATERIAL: '${materialCode || '(blank)'}' is not in the material master — no canonical unit exists for it, and a quantity without a trustworthy unit is not a fact this platform stores`,
      };
});

/** The supplier's relationship for a material (distributor ⇒ has principals). */
const relationshipFor = (supplierId: string, materialCode: string) =>
  SUPPLIER_MATERIAL_RELATIONSHIPS.find(
    (r) => r.supplierId === supplierId && r.materialCode === materialCode,
  );

const inventoryDeclarationTarget: CommandTarget = {
  // Degenerate single-state snapshot: 'Declared' for any existing id, no-op
  // apply (the SDC-0 type carries no status; this flow adds none).
  readState: (id) => (inventoryDeclarationStore.get(id) ? 'Declared' : null),
  readScopeOwner: (id) => inventoryDeclarationStore.get(id)?.supplierId ?? null,
  readEntity: (id) => inventoryDeclarationStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a declaration is an immutable snapshot; a new count is a new
       declaration (append), never a state change on a prior record. */
  },
  // C4c/C4b — the ONE target serves BOTH verbs (declare + record) since both use
  // entity 'inventoryDeclaration' + this store. `requireCreationOwner` makes the
  // relationship anchor enforceable for a BUYER scope too (the record path). It
  // is INERT for declare: a supplier scope hits the supplier owner-match branch
  // (which already requires a non-null owner) and never the buyer branch — so
  // t_inventorydeclaration_declare is byte-for-byte unchanged. On the record path
  // it blocks a buyer recording for a supplier × material the data never names.
  requireCreationOwner: true,
  // REQ-E08-02 — membership widens to the hub's supply assignments (the
  // materials a stock row is checked against); `isAssignedMaterial` includes the
  // (i)∪(ii) collaborated set, so every pair accepted before is accepted now.
  creationOwner: (payload) => {
    const sid = String(payload.supplierId);
    return isAssignedMaterial(sid, String(payload.materialCode)) ? sid : null;
  },
  create: (payload, _toState, scope) => {
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const materialCode = str('materialCode');
    const supplierId = str('supplierId');
    // invariant #2 — uom is master-owned, never the caller's. CP-2 · B1: the
    // `?? 'KG'` default is gone; `SDC_MATERIAL_KNOWN` already refused an
    // unresolvable code by name.
    const uom: Uom = requireUom(materialCode);
    const totalQty = typeof payload.totalQty === 'number' ? payload.totalQty : 0;
    // Optional batch-grain detail — each batch's uom is master-copied too
    // (the caller can no more pick a batch unit than the total's). Malformed
    // batches (no batchNumber) are dropped, never guessed. The Σ = totalQty
    // check is the policy hook's job (fails BEFORE create runs).
    const rawBatches = Array.isArray(payload.batches) ? payload.batches : [];
    const batches: InventoryBatch[] = rawBatches
      .filter(
        (b): b is Record<string, unknown> =>
          !!b && typeof b === 'object' && typeof (b as Record<string, unknown>).batchNumber === 'string',
      )
      .map((b) => ({
        batchNumber: String(b.batchNumber),
        qty: typeof b.qty === 'number' ? b.qty : 0,
        uom,
        ...(typeof b.manufacturingDate === 'string' && b.manufacturingDate
          ? { manufacturingDate: b.manufacturingDate }
          : {}),
        ...(typeof b.expiryDate === 'string' && b.expiryDate ? { expiryDate: b.expiryDate } : {}),
      }));
    const id = inventoryDeclarationStore.nextNumber();
    const declaration: InventoryDeclaration = {
      id,
      supplierId,
      materialCode,
      // SDC-4a — the SHARED simulated clock, not the real wall-clock: a live
      // declare is stamped within the simulated timeline (after the seed), and
      // the store's insertion recency (declarationRecency) is what makes it the
      // CURRENT SOH regardless of the stamp.
      declaredAt: sdcClock.now(),
      totalQty,
      uom,
      ...(batches.length > 0 ? { batches } : {}),
      // REQ-E08-02 BR-06 — the supplier's ROP and production figures, when given.
      ...(isNonNegative(payload.supplierRop) ? { supplierRop: payload.supplierRop } : {}),
      ...(isNonNegative(payload.inProductionQty) ? { inProductionQty: payload.inProductionQty } : {}),
      ...(isIsoDay(payload.productionCompletionDate) ? { productionCompletionDate: payload.productionCompletionDate } : {}),
      // BR-08 — a PTI recording is ALWAYS "Entered by PTI", whatever the payload
      // says; a supplier's own submission is the template or manual entry.
      channel: scope.personaType === 'buyer' ? 'pti' : payload.channel === 'template' ? 'template' : 'manual',
      provenance: PROV_SUPPLIER_SUBMIT,
    };
    inventoryDeclarationStore.add(declaration);
    return { entityId: id };
  },
};

// INV declare — batch/total agreement (SDC-3a total-first). Only fires when
// batch detail is present; a total-only declaration is honest by construction.
bindPolicyHook(POLICY_HOOKS.INV_DECLARE_BATCH_TOTAL, ({ payload }) => {
  if (!Array.isArray(payload.batches) || payload.batches.length === 0) return { ok: true };
  const total = typeof payload.totalQty === 'number' ? payload.totalQty : 0;
  const sum = payload.batches.reduce(
    (s: number, b: unknown) =>
      s + (b && typeof b === 'object' && typeof (b as Record<string, unknown>).qty === 'number'
        ? ((b as Record<string, unknown>).qty as number)
        : 0),
    0,
  );
  return sum === total
    ? { ok: true }
    : {
        ok: false,
        reason: `batch total ${sum} does not equal declared totalQty ${total} — a total that disagrees with its own detail is fabricated`,
      };
});

const isNonNegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// REQ-E08-02 BR-06 — the optional detail of a stock submission is well formed.
bindPolicyHook(POLICY_HOOKS.INV_DECLARE_DETAIL_VALID, ({ payload }) => {
  for (const f of ['supplierRop', 'inProductionQty'] as const) {
    if (payload[f] !== undefined && !isNonNegative(payload[f])) {
      return { ok: false, reason: `${f} must be a number of zero or more` };
    }
  }
  if (payload.productionCompletionDate !== undefined && !isIsoDay(payload.productionCompletionDate)) {
    return { ok: false, reason: 'production completion date must be a date (YYYY-MM-DD)' };
  }
  if (payload.channel !== undefined && payload.channel !== 'template' && payload.channel !== 'manual') {
    return { ok: false, reason: 'channel must be template or manual' };
  }
  // BL-60 — a batch's optional manufacturing date is not after its expiry date
  // and not in the future on the shared clock; the SAME check the form and the
  // template validator run (`batchDatesProblem`).
  if (Array.isArray(payload.batches)) {
    const today = dayOf(sdcClock.now());
    for (const b of payload.batches) {
      if (!b || typeof b !== 'object') continue;
      const rec = b as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
      const hit = batchDatesProblem({ manufacturingDate: str(rec.manufacturingDate), expiryDate: str(rec.expiryDate) }, today);
      if (hit) {
        const name = typeof rec.batchNumber === 'string' ? rec.batchNumber : '';
        return {
          ok: false,
          reason:
            hit.problem === 'invalidDate'
              ? `batch ${name}: ${hit.field === 'manufacturingDate' ? 'manufacturing' : 'expiry'} date must be a date (YYYY-MM-DD)`
              : hit.problem === 'manufacturedAfterExpiry'
                ? `batch ${name}: manufacturing date is after the expiry date`
                : `batch ${name}: manufacturing date is in the future`,
        };
      }
    }
  }
  return { ok: true };
});

// — Inventory & capacity collaboration (REQ-E08-02 to REQ-E08-05) ——————————————
//   Four targets over the stores in `inventoryHubStores`, reading positions,
//   capacity plans and alert conditions through ONE read model
//   (`inventoryReadModel`) so a policy sees exactly what the pages show.

/** REQ-E08-02 BR-03 — one API sync attempt per press, success or failure. */
const stockSyncTarget: CommandTarget = {
  readState: (id) => (stockSyncStore.get(id) ? 'Recorded' : null),
  readScopeOwner: (id) => stockSyncStore.get(id)?.supplierId ?? null,
  readEntity: (id) => stockSyncStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — an attempt is a snapshot */
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = String(payload.supplierId);
    return suppliersWithAssignments().some((s) => s.supplierId === sid) ? sid : null;
  },
  create: (payload) => {
    const supplierId = String(payload.supplierId);
    const now = sdcClock.now();
    // Material A1 (AR-06) — the policy hook has already asked the ONE resolver
    // whether this supplier is API-connected; this reads only what the
    // simulated pull returns (`NO_ENDPOINT` when the sample list has no entry).
    const connection = simulatedPullOf(supplierId);
    const id = stockSyncStore.nextId();
    if (connection.outcome === 'success') {
      // The supplier's system answered: its figures land as API submissions.
      for (const f of connection.figures) {
        inventoryDeclarationStore.add({
          id: inventoryDeclarationStore.nextNumber(),
          supplierId,
          materialCode: f.materialCode,
          declaredAt: now,
          totalQty: f.soh,
          uom: requireUom(f.materialCode),
          ...(f.supplierRop !== undefined ? { supplierRop: f.supplierRop } : {}),
          ...(f.inProductionQty !== undefined ? { inProductionQty: f.inProductionQty } : {}),
          ...(f.completionInDays !== undefined ? { productionCompletionDate: addDays(dayOf(now), f.completionInDays) } : {}),
          channel: 'api',
          provenance: PROV_SUPPLIER_SUBMIT,
        });
      }
      stockSyncStore.add({ id, supplierId, at: now, outcome: 'success' });
    } else {
      // Edge case: show the error and time, keep the previous figures (nothing
      // is written to the stock store), and they read as stale from here on.
      stockSyncStore.add({
        id,
        supplierId,
        at: now,
        outcome: 'failed',
        errorKey: connection.errorKey,
      });
    }
    return { entityId: id };
  },
};

bindPolicyHook(POLICY_HOOKS.STOCK_SYNC_CONNECTED, ({ payload }) =>
  isApiConnected(String(payload.supplierId))
    ? { ok: true }
    : { ok: false, reason: 'NOT_API_CONNECTED: this supplier shares stock by template or manual entry, not by API' },
);

/** REQ-E08-03 — a supplier's access to PTI stock; `entityId` is the supplierId. */
const stockAccessTarget: CommandTarget = {
  readState: (id) => {
    if (!suppliersWithAssignments().some((s) => s.supplierId === id)) return null;
    return stockAccessStore.get(id)?.active ? 'Granted' : 'NoAccess';
  },
  readScopeOwner: (id) => (suppliersWithAssignments().some((s) => s.supplierId === id) ? id : null),
  readEntity: (id) => stockAccessStore.get(id) ?? null,
  applyTransition: (id, toState, payload, scope) => {
    const at = sdcClock.now();
    const previous: StockAccessGrant = stockAccessStore.get(id) ?? {
      supplierId: id,
      supplierName: supplierNameOf(id),
      active: false,
      materials: [],
      log: [],
    };
    const materials =
      toState === 'Granted' && Array.isArray(payload.materials) ? [...new Set(payload.materials.map(String))].sort() : [];
    stockAccessStore.put({
      ...previous,
      active: toState === 'Granted',
      materials,
      // BR-06 — every change is logged with the acting user and the time.
      log: [
        ...previous.log,
        {
          action: toState !== 'Granted' ? 'remove' : previous.active ? 'change' : 'grant',
          materials: toState === 'Granted' ? materials : previous.materials,
          at,
          actor: scope.actor ?? NO_PERSON,
        },
      ],
    });
  },
};

// REQ-E08-03 BR-03 / BR-04 — access names only materials the supplier supplies.
bindPolicyHook(POLICY_HOOKS.STOCK_ACCESS_SCOPE_VALID, ({ entityId, payload }) => {
  const supplier = suppliersWithAssignments().find((s) => s.supplierId === entityId);
  if (!supplier) return { ok: false, reason: 'supplier not found in the inventory view' };
  if (payload.materials !== undefined && !Array.isArray(payload.materials)) {
    return { ok: false, reason: 'materials must be a list (empty for every material)' };
  }
  const named = Array.isArray(payload.materials) ? payload.materials.map(String) : [];
  const stray = named.find((m) => !supplier.materials.includes(m));
  if (stray) return { ok: false, reason: `NOT_SUPPLIED: ${stray} is not a material this supplier supplies` };
  return { ok: true };
});

/** REQ-E08-04 — capacity per supplier × material group per week. */
const capacityTarget: CommandTarget = {
  readState: (id) => (capacityStore.get(id) ? 'Submitted' : null),
  readScopeOwner: (id) => capacityStore.get(id)?.supplierId ?? null,
  readEntity: (id) => capacityStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a changed plan is a new submission */
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = String(payload.supplierId);
    return allCapacityPlans().some((p) => p.supplierId === sid && p.materialGroup === String(payload.materialGroup))
      ? sid
      : null;
  },
  create: (payload) => {
    const weeks: CapacityWeekEntry[] = (payload.weeks as Record<string, unknown>[]).map((w) => ({
      week: String(w.week),
      allocated: Number(w.allocated),
      ...(isNonNegative(w.upside) ? { upside: w.upside } : {}),
      ...(isActiveReasonCode('capacityShortfall', w.reason) ? { reason: w.reason } : {}),
      ...(nonBlank(w.note) ? { note: nonBlank(w.note) } : {}),
    }));
    const row: CapacitySubmission = {
      id: capacityStore.nextId(),
      supplierId: String(payload.supplierId),
      materialGroup: String(payload.materialGroup),
      submittedAt: sdcClock.now(),
      weeks: weeks.sort((a, b) => a.week.localeCompare(b.week)),
    };
    capacityStore.add(row);
    return { entityId: row.id };
  },
};

// REQ-E08-04 AC-01 / AC-02 — every horizon week, and a reason below demand.
bindPolicyHook(POLICY_HOOKS.CAPACITY_SUBMISSION_VALID, ({ payload }) => {
  const plan = allCapacityPlans().find(
    (p) => p.supplierId === String(payload.supplierId) && p.materialGroup === String(payload.materialGroup),
  );
  if (!plan) return { ok: false, reason: 'no materials of this group are assigned to the supplier' };
  if (!Array.isArray(payload.weeks)) return { ok: false, reason: 'weeks must be a list' };
  const refusal = capacitySubmissionRefusal(
    payload.weeks,
    (week) => plan.weeks.find((w) => w.week === week)?.demand ?? 0,
    plan.weeks.map((w) => w.week),
  );
  if (!refusal) return { ok: true };
  const code =
    refusal.refusal === 'reasonRequired'
      ? 'BELOW_DEMAND_NEEDS_REASON'
      : refusal.refusal === 'noteRequired'
        ? 'OTHER_REASON_NEEDS_NOTE'
        : refusal.refusal.toUpperCase();
  return { ok: false, reason: `${code}: week ${refusal.week ?? ''}`.trim() };
});

/** REQ-E08-05 — an alert; `entityId` is its key (rule | subject | supplier). */
const inventoryAlertTarget: CommandTarget = {
  readState: (key) => {
    if (!activeAlertConditions().some((c) => c.key === key)) return null;
    return standingClosure(key, inventoryAlertLedger.all()) ? 'Closed' : 'Open';
  },
  readScopeOwner: (key) => parseAlertKey(key)?.supplierId ?? null,
  readEntity: (key) => allAlerts().find((a) => a.key === key) ?? null,
  applyTransition: (key, _toState, payload, scope) => {
    inventoryAlertLedger.append([
      {
        key,
        kind: 'closed',
        at: sdcClock.now(),
        closeReason: String(payload.closeReason),
        ...(nonBlank(payload.actionNote) ? { note: nonBlank(payload.actionNote) } : {}),
        actor: scope.actor ?? NO_PERSON,
      },
    ]);
  },
};

// MR-9 BR-04 — an active close reason; "Other" needs a note (AR-14).
bindPolicyHook(POLICY_HOOKS.ALERT_CLOSE_REASON_GIVEN, ({ payload }) => {
  const refusal = alertCloseRefusal(payload.closeReason, payload.actionNote);
  if (refusal === null) return { ok: true };
  return {
    ok: false,
    reason:
      refusal === 'NOTE_REQUIRED'
        ? 'NOTE_REQUIRED: the reason "other" needs a note'
        : `REASON_UNKNOWN: ${JSON.stringify(payload.closeReason)} is not an active alert close reason`,
  };
});

// — Forecast collaboration (REQ-E06-01, REQ-E06-03) ————————————————————————
//   A version is a snapshot of one stream and is never edited; publish and
//   reassign each add the next version. A view is recorded once per supplier ×
//   version. Commitments ride the requirementResponse target above.

const FORECAST_STREAMS = ['packaging', 'rawMaterial'] as const;

/** REQ-E06-01 / REQ-E06-03 BR-05 — a forecast version; `entityId` is its publicationId. */
const forecastVersionTarget: CommandTarget = {
  readState: (id) => (forecastVersionStore.get(id) ? 'Published' : null),
  // Buyer-only: no supplier is named, so a supplier scope is denied.
  readScopeOwner: () => null,
  readEntity: (id) => forecastVersionStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a version is never changed */
  },
  creationOwner: () => null,
  create: (payload) => {
    const now = sdcClock.now();
    if (payload.toSupplierId !== undefined) {
      const current = forecastVersionStore.get(String(payload.publicationId))!;
      const next = reassignVersion(
        current,
        {
          materialCode: String(payload.materialCode),
          periodBucket: String(payload.periodBucket),
          fromSupplierId: String(payload.fromSupplierId),
          toSupplierId: String(payload.toSupplierId),
          note: String(payload.note).trim(),
        },
        now,
      )!;
      forecastVersionStore.add(next);
      return { entityId: next.publicationId };
    }
    const stream = payload.stream as (typeof FORECAST_STREAMS)[number];
    const current = currentVersion(stream)!;
    const next = republishVersion(current, {
      publishedAt: now,
      // The sources are the current version's suppliers; a supplier that
      // received demand by reassignment keeps it on re-publication.
      sources: [
        ...FORECAST_SOURCES,
        ...[...new Set(current.lines.map((l) => `${l.supplierId}|${l.materialCode}`))]
          .filter((k) => !FORECAST_SOURCES.some((s) => `${s.supplierId}|${s.materialCode}` === k))
          .map((k) => {
            const [supplierId, materialCode] = k.split('|');
            return { supplierId, materialCode, share: 0 };
          }),
      ],
      master: materialEntry,
      baseDemand,
      ...(payload.emergency === true ? { emergency: true } : {}),
    });
    forecastVersionStore.add(next);
    return { entityId: next.publicationId };
  },
};

// REQ-E06-01 BR-02 — publish names a stream that has a version to follow.
bindPolicyHook(POLICY_HOOKS.FORECAST_PUBLISH_VALID, ({ payload }) => {
  if (!(FORECAST_STREAMS as readonly unknown[]).includes(payload.stream)) {
    return { ok: false, reason: 'UNKNOWN_STREAM: stream must be packaging or rawMaterial' };
  }
  if (payload.emergency !== undefined && typeof payload.emergency !== 'boolean') {
    return { ok: false, reason: 'emergency must be true or false' };
  }
  return currentVersion(payload.stream as (typeof FORECAST_STREAMS)[number])
    ? { ok: true }
    : { ok: false, reason: 'no earlier version of this stream to re-publish' };
});

// REQ-E14-06 (X-03, ENG-B35) — a publication sourced from the forecast engine.
// Refused by name while the engine dataset is simulated: engine output on
// synthetic data is never shown to a supplier. Once it is live, still refused
// until SOMO ratifies C8 §8 — today a published line names SOMO as the source
// of its totals, and the engine taking that place is the proposal C8 §8 puts
// to SOMO (BL-101). Nothing is created either way.
bindPolicyHook(POLICY_HOOKS.FORECAST_ENGINE_PUBLISH_ALLOWED, ({ payload }) => {
  if (payload.source === undefined) return { ok: true };
  if (payload.source !== 'engine') return { ok: false, reason: 'UNKNOWN_SOURCE: a publication names no source, or the engine' };
  if (!isLive('engineDataset')) {
    return {
      ok: false,
      reason:
        'ENGINE_DATA_SIMULATED: the stabilised plan is calculated on simulated data and is never shown to a supplier; it can be published once the Master Data Management team’s SAP feed is live',
    };
  }
  return {
    ok: false,
    reason:
      'C8_ENGINE_SOURCE_UNRATIFIED: a published forecast names SOMO as the source of its totals; the engine can publish once SOMO ratifies C8 §8',
  };
});

// REQ-E06-03 BR-05 — reassign: a line of the CURRENT version, a different
// supplier qualified for the material, and a note the supplier can read.
bindPolicyHook(POLICY_HOOKS.FORECAST_REASSIGN_VALID, ({ payload }) => {
  const pub = forecastVersionStore.get(String(payload.publicationId));
  if (!pub || !pub.stream) return { ok: false, reason: 'forecast version not found' };
  if (currentVersion(pub.stream)?.publicationId !== pub.publicationId) {
    return { ok: false, reason: 'NOT_CURRENT_VERSION: demand moves only on the current version' };
  }
  if (nonBlank(payload.note) === undefined) return { ok: false, reason: 'NOTE_REQUIRED: moving demand needs a note' };
  const from = String(payload.fromSupplierId);
  const to = String(payload.toSupplierId);
  const code = String(payload.materialCode);
  const line = pub.lines.find((l) => l.supplierId === from && l.materialCode === code && l.periodBucket === String(payload.periodBucket));
  if (!line) return { ok: false, reason: 'no such period for this supplier and material in the current version' };
  if (from === to) return { ok: false, reason: 'SAME_SUPPLIER: choose a different supplier' };
  if (!qualifiedSuppliers(code).includes(to)) {
    return { ok: false, reason: `NOT_QUALIFIED: ${to} does not supply ${code}` };
  }
  return { ok: true };
});

/** REQ-E06-01 — a supplier's first opening of a version; `entityId` is the record id. */
const forecastViewTarget: CommandTarget = {
  readState: (id) => (forecastViewStore.get(id) ? 'Viewed' : null),
  readScopeOwner: (id) => forecastViewStore.get(id)?.supplierId ?? null,
  readEntity: (id) => forecastViewStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a view is recorded once */
  },
  requireCreationOwner: true,
  // The supplier must have lines in the version it opened.
  creationOwner: (payload) => {
    const sid = String(payload.supplierId);
    const pub = forecastVersionStore.get(String(payload.publicationId));
    return pub?.lines.some((l) => l.supplierId === sid) ? sid : null;
  },
  create: (payload) => {
    const publicationId = String(payload.publicationId);
    const supplierId = String(payload.supplierId);
    const existing = forecastViewStore.find(publicationId, supplierId);
    if (existing) return { entityId: existing.id };
    const id = forecastViewStore.nextId();
    forecastViewStore.add({ id, publicationId, supplierId, viewedAt: sdcClock.now() });
    return { entityId: id };
  },
};

// ── REQ-E14-13 BR-07 — A RESCHEDULE PROPOSAL TAKEN TO SAP ─────────────────
// Creation-only; `entityId` is the mark's own id. Owner-less: the mark is the
// Material Planner's, so every supplier is denied at SCOPE (§86). The PO line
// is read from the engine's dataset (the SAP-grain lines the report proposes
// on), never taken on the form's word.
const PROPOSAL_TYPES: readonly ProposalType[] = ['rescheduleOut', 'rescheduleIn', 'reduce', 'cancel'];

const engineLineOf = (poNumber: unknown, line: unknown) =>
  lineHistories(engineDataset()).find((h) => h.line.poNumber === poNumber && h.line.line === line) ?? null;

const sapChangeMarkTarget: CommandTarget = {
  readState: (id) => (sapChangeMarkStore.get(id) ? 'Recorded' : null),
  readScopeOwner: () => null,
  readEntity: (id) => sapChangeMarkStore.get(id) ?? null,
  applyTransition: () => {
    /* no-op — a mark is recorded once; a later one is a new mark */
  },
  creationOwner: () => null,
  create: (payload, _toState, scope) => {
    const poNumber = String(payload.poNumber);
    const line = Number(payload.line);
    const cancel = payload.proposalType === 'cancel';
    const made = sapChangeMarkStore.add({
      lineId: `po:${poNumber}#${line}`,
      poNumber,
      line,
      proposalType: payload.proposalType as ProposalType,
      proposedDate: cancel ? null : String(payload.proposedDate),
      proposedQuantity: cancel ? 0 : Number(payload.proposedQuantity),
      markedAt: sdcClock.now(),
      markedBy: scope.actor ?? NO_PERSON,
    });
    return { entityId: made.id };
  },
};

bindPolicyHook(POLICY_HOOKS.SAP_CHANGE_MARK_VALID, ({ payload }) => {
  const h = engineLineOf(payload.poNumber, payload.line);
  if (!h) return { ok: false, reason: 'NO_SUCH_LINE: no open PO line with that number in the engine data' };
  const inForce = requirementAt(h).qty;
  if (inForce === 0) return { ok: false, reason: `LINE_CANCELLED: ${h.line.poNumber}/${h.line.line} is already cancelled` };
  if (!PROPOSAL_TYPES.includes(payload.proposalType as ProposalType)) {
    return { ok: false, reason: 'proposal type must be reschedule out, reschedule in, reduce or cancel' };
  }
  const qty = payload.proposedQuantity;
  if (typeof qty !== 'number' || !Number.isFinite(qty) || qty < 0 || qty > inForce) {
    return { ok: false, reason: `quantity must be a number from 0 to ${inForce}` };
  }
  if (payload.proposalType === 'cancel') return qty === 0 ? { ok: true } : { ok: false, reason: 'a cancellation carries quantity 0' };
  if (!isCallOffDate(payload.proposedDate)) return { ok: false, reason: 'date must be a date (YYYY-MM-DD)' };
  if (String(payload.proposedDate) < sdcClock.now().slice(0, 10)) return { ok: false, reason: 'date is in the past' };
  return { ok: true };
});

// X-03 (ENG-B24) — a change taken to SAP reaches the supplier through SAP, so a
// proposal calculated on simulated data may not be taken there. The liveness is
// the registry's own answer, read at call time.
bindPolicyHook(POLICY_HOOKS.SAP_CHANGE_ENGINE_DATA_LIVE, () =>
  isLive('engineDataset')
    ? { ok: true }
    : {
        ok: false,
        reason:
          'ENGINE_DATA_SIMULATED: this proposal was calculated on simulated data; it can be taken to SAP once the Master Data Management team’s SAP feed is live',
      },
);

// ── RFx MANAGEMENT (REQ-E03-01 to REQ-E03-05) ──────────────────────────────
//
// Five targets and eleven policy hooks. The shape is the one the rest of this
// file already uses: the TARGET owns the store mutation, the HOOK owns the rule,
// and every rule the requirement states is enforced at the verb rather than on
// the screen — a screen can stop a gesture, only a verb can stop an act.

/** Is `supplierId` an invitee of this event, and is the event answerable? */
const rfxInvited = (
  event: { status: string; invitees: readonly RfxInvitee[] } | undefined,
  supplierId: string,
): boolean => !!event && event.status === 'Open' && event.invitees.some((i) => i.supplierId === supplierId);

/**
 * THE CONTENT an RFI payload stores — read by `t_rfi_create` and by
 * `t_rfi_revise_draft` (BL-93), so an edited draft is stored exactly as a new
 * one would be.
 */
function rfiContentOf(payload: Record<string, unknown>): Omit<
  RfiEvent,
  'id' | 'eventNumber' | 'status' | 'createdAt' | 'extensions'
> {
  const template = rfiTemplate(String(payload.templateId))!;
  const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
  // The event carries its OWN question list from birth. A buyer's additions
  // and removals apply to THIS event only, and a later edit to the template
  // never rewrites an event suppliers have already answered.
  const questions = Array.isArray(payload.questions)
    ? (payload.questions as RfiQuestion[])
    : template.questions;
  return {
    title: str('title'),
    // Stored only when the buyer wrote one: an empty string on the event
    // would read as "PTI described this and said nothing".
    ...(str('description') ? { description: str('description') } : {}),
    templateId: template.id,
    materialCategory: str('materialCategory'),
    ...(str('purchasingGroup') ? { purchasingGroup: str('purchasingGroup') } : {}),
    responseDeadline: str('responseDeadline'),
    invitees: (Array.isArray(payload.invitedSupplierIds)
      ? (payload.invitedSupplierIds as unknown[]).filter((x): x is string => typeof x === 'string')
      : []
    ).map((supplierId) => ({ supplierId })),
    questions,
    ...rfxAuthoringFields(payload),
  };
}

/** REQ-E03-02 — the RFI event. `entityId` is its id. */
const rfiEventTarget: CommandTarget = {
  readState: (id) => rfiEventStore.get(id)?.status ?? null,
  // Buyer-only: a supplier answers an RFI, it never publishes one.
  readScopeOwner: () => null,
  readEntity: (id) => rfiEventStore.get(id) ?? null,
  applyTransition: (id, toState, payload, scope, transitionId) => {
    // RFx A1 (AR-01) — the verb is the discriminator, not a `deadline` in the
    // payload or the `Draft` target state. Other verbs write the status below.
    switch (transitionId) {
      case 't_rfi_extend': {
        const deadline = String(payload.deadline);
        const only = Array.isArray(payload.supplierIds)
          ? (payload.supplierIds as unknown[]).filter((x): x is string => typeof x === 'string')
          : [];
        rfiEventStore.update(id, (e) => ({
          ...e,
          ...(only.length === 0 ? { responseDeadline: deadline } : {}),
          invitees:
            only.length === 0
              ? e.invitees
              : e.invitees.map((i) => (only.includes(i.supplierId) ? { ...i, deadline } : i)),
          extensions: [...e.extensions, { at: sdcClock.now(), deadline, supplierIds: only }],
        }));
        return;
      }
      // BL-93 — revise-draft. Rebuilt, not merged, so a cleared description or
      // attachment is gone.
      case 't_rfi_revise_draft': {
        rfiEventStore.update(id, (e) => ({
          ...rfiContentOf(payload),
          id: e.id,
          eventNumber: e.eventNumber,
          status: e.status,
          createdAt: e.createdAt,
          extensions: e.extensions,
          revisions: [...(e.revisions ?? []), { at: sdcClock.now(), by: scope.actor ?? NO_PERSON }],
        }));
        return;
      }
      default:
        break;
    }
    rfiEventStore.update(id, (e) => ({ ...e, status: toState as RfxEventStatus }));
  },
  creationOwner: () => null,
  create: (payload, toState) => {
    const id = rfiEventStore.nextId();
    rfiEventStore.add({
      id,
      eventNumber: `RFI-2026-${id.slice(-3)}`,
      status: toState as RfxEventStatus,
      createdAt: sdcClock.now(),
      extensions: [],
      ...rfiContentOf(payload),
    });
    return { entityId: id };
  },
};

/** REQ-E03-02 — the supplier's RFI answers. A Draft is its author's alone. */
const rfiResponseTarget: CommandTarget = {
  readState: (id) => rfiResponseStore.get(id)?.status ?? null,
  readScopeOwner: (id) => rfiResponseStore.get(id)?.supplierId ?? null,
  readEntity: (id) => rfiResponseStore.get(id) ?? null,
  // `t_rfiresponse_submit` (Draft → Submitted) and `t_rfiresponse_revise`
  // (Submitted, state-preserving). A revise applies the payload's content
  // first. Both append the result as the next version (NR-1 BR-08): the
  // earlier versions are copied forward untouched, never edited.
  applyTransition: (id, toState, payload, scope) => {
    const now = sdcClock.now();
    rfiResponseStore.update(id, (r) => {
      const content = r.status === 'Submitted' ? revisedRfiResponse(r, payload, now, scope.actor ?? NO_PERSON) : r;
      const next: RfiResponse = {
        ...content,
        status: toState as RfxResponseStatus,
        updatedAt: now,
        ...(toState === 'Submitted' ? { submittedAt: now } : {}),
      };
      return toState === 'Submitted' ? { ...next, versions: versionsAfterSubmit(r, next, now) } : next;
    });
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = String(payload.supplierId);
    return rfxInvited(rfiEventStore.get(String(payload.rfiId)), sid) ? sid : null;
  },
  create: (payload, toState, scope) => {
    const rfiId = String(payload.rfiId);
    const supplierId = String(payload.supplierId);
    const hasAnswers = Array.isArray(payload.answers);
    const answers = hasAnswers ? (payload.answers as RfiAnswer[]) : [];
    // The acceptance time is STORE-ASSIGNED and set ONCE: a payload can say
    // "I accept", never "I accepted at 09:00" (the `grantedAt` discipline).
    const accepting = payload.acceptConfidentiality === true;
    // ONE response per supplier × event. Saving again REPLACES the draft's
    // answers rather than minting a second row — two drafts for one invitation
    // would make "which one did they send?" unanswerable. An acceptance-only
    // save carries no answers and leaves the stored ones alone.
    const existing = rfiResponseStore.all().find((r) => r.rfiId === rfiId && r.supplierId === supplierId);
    // NR-1 BR-01 — the documents REPLACE the stored set, like the answers; a
    // save that carries none leaves them alone. Upload times are the store's.
    const documents = Array.isArray(payload.documents)
      ? stampDocuments(payload.documents, existing?.documents ?? [], sdcClock.now(), scope.actor ?? NO_PERSON)
      : undefined;
    if (existing) {
      rfiResponseStore.update(existing.id, (r) => ({
        ...r,
        ...(hasAnswers ? { answers } : {}),
        ...(documents !== undefined ? { documents } : {}),
        ...(accepting && !r.confidentialityAcceptedAt ? { confidentialityAcceptedAt: sdcClock.now() } : {}),
        updatedAt: sdcClock.now(),
      }));
      return { entityId: existing.id };
    }
    const id = rfiResponseStore.nextId();
    rfiResponseStore.add({
      id,
      rfiId,
      supplierId,
      status: toState as RfxResponseStatus,
      updatedAt: sdcClock.now(),
      answers,
      ...(documents !== undefined ? { documents } : {}),
      ...(accepting ? { confidentialityAcceptedAt: sdcClock.now() } : {}),
    });
    return { entityId: id };
  },
};

/**
 * THE CONTENT an RFP payload stores — read by `t_rfp_create` and by
 * `t_rfp_revise_draft` (BL-93). `sourceRfiId` is not content: it is set at
 * create and pinned on revise, because where an RFP came from does not change.
 */
function rfpContentOf(payload: Record<string, unknown>): Omit<
  RfpEvent,
  'id' | 'eventNumber' | 'status' | 'createdAt' | 'extensions' | 'sourceRfiId'
> {
  const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
  return {
    title: str('title'),
    scope: str('scope'),
    materialCategory: str('materialCategory'),
    ...(str('purchasingGroup') ? { purchasingGroup: str('purchasingGroup') } : {}),
    responseDeadline: str('responseDeadline'),
    currency: (BID_CURRENCIES as readonly string[]).includes(str('currency'))
      ? (str('currency') as BidCurrency)
      : BASE_CURRENCY,
    invitees: (Array.isArray(payload.invitedSupplierIds)
      ? (payload.invitedSupplierIds as unknown[]).filter((x): x is string => typeof x === 'string')
      : []
    ).map((supplierId) => ({ supplierId })),
    terms: Array.isArray(payload.terms) ? (payload.terms as RfpTermRow[]) : [],
    ...rfxAuthoringFields(payload),
    ...(Array.isArray(payload.questions) && payload.questions.length > 0
      ? { questions: payload.questions as RfiQuestion[] }
      : {}),
    ...(payload.termsDocument && typeof payload.termsDocument === 'object'
      ? { termsDocument: payload.termsDocument as RfpTermsDocument }
      : {}),
    ...(payload.pricing && typeof payload.pricing === 'object'
      ? { pricing: payload.pricing as RfpPricingRequest }
      : {}),
  };
}

/** REQ-E03-04 — the RFP event. */
const rfpEventTarget: CommandTarget = {
  readState: (id) => rfpEventStore.get(id)?.status ?? null,
  readScopeOwner: () => null,
  readEntity: (id) => rfpEventStore.get(id) ?? null,
  applyTransition: (id, toState, payload, scope, transitionId) => {
    // RFx A1 (AR-01) — the verb is the discriminator, not a `deadline` in the
    // payload or the `Draft` target state. Other verbs write the status below.
    switch (transitionId) {
      case 't_rfp_extend': {
        const deadline = String(payload.deadline);
        const only = Array.isArray(payload.supplierIds)
          ? (payload.supplierIds as unknown[]).filter((x): x is string => typeof x === 'string')
          : [];
        rfpEventStore.update(id, (e) => ({
          ...e,
          ...(only.length === 0 ? { responseDeadline: deadline } : {}),
          invitees:
            only.length === 0
              ? e.invitees
              : e.invitees.map((i) => (only.includes(i.supplierId) ? { ...i, deadline } : i)),
          extensions: [...e.extensions, { at: sdcClock.now(), deadline, supplierIds: only }],
        }));
        return;
      }
      // BL-93 — revise-draft. Rebuilt, not merged, like the RFI's.
      case 't_rfp_revise_draft': {
        rfpEventStore.update(id, (e) => ({
          ...rfpContentOf(payload),
          id: e.id,
          eventNumber: e.eventNumber,
          status: e.status,
          createdAt: e.createdAt,
          extensions: e.extensions,
          ...(e.sourceRfiId ? { sourceRfiId: e.sourceRfiId } : {}),
          revisions: [...(e.revisions ?? []), { at: sdcClock.now(), by: scope.actor ?? NO_PERSON }],
        }));
        return;
      }
      // RFx D2 (NR-2 BR-05 to BR-09) — an RFP award RECORDS itself on the
      // shared award record (AR-02): its lines (option ref, firm offer, share,
      // quantity, point, the side typed), its reason, and — on the final award —
      // the responders no award of the RFP names. NO cascade: the responses
      // stay Submitted and each outcome is derived from the award read.
      case 't_rfp_award':
      case 't_rfp_award_partial': {
        const rfp = rfpEventStore.get(id);
        if (!rfp) break;
        const items = rfpAwardItems(rfp);
        const lines = rfpAwardLinesOf(payload).map((l) => recordedRfpAwardLine(items, l));
        const final = transitionId === 't_rfp_award';
        const named = new Set([
          ...rfpAwardsOf(id).flatMap((a) => a.lines.map((l) => l.supplierId)),
          ...lines.map((l) => l.supplierId),
        ]);
        awardStore.add({
          id: awardStore.nextId(),
          eventType: 'rfp',
          eventId: id,
          awardedAt: rfxNow(),
          lines,
          reason: typeof payload.awardReason === 'string' ? payload.awardReason.trim() : '',
          notAwardedSupplierIds: final ? rfpRespondedSupplierIds(id).filter((sid) => !named.has(sid)) : [],
        });
        break;
      }
      // RFx D2 (NR-3 BR-09, BR-11) — the cancel APPENDS a cancellation naming
      // the award, as on an RFQ; the award record is kept unedited.
      case 't_rfp_award_cancel':
      case 't_rfp_award_cancel_partial': {
        awardCancellationStore.add({
          id: awardCancellationStore.nextId(),
          awardId: String(payload.awardId),
          cancelledAt: rfxNow(),
          reason: String(payload.cancelReason ?? '').trim(),
          by: scope.actor ?? NO_PERSON,
        });
        break;
      }
      // RFx D2 (NR-3 BR-10) — "Raised in SAP" APPENDS a marking; state-preserving.
      case 't_rfp_award_sap_raised': {
        awardSapMarkStore.add({
          id: awardSapMarkStore.nextId(),
          awardId: String(payload.awardId),
          sapDocumentNo: String(payload.sapDocumentNo).trim(),
          markedAt: rfxNow(),
          by: scope.actor ?? NO_PERSON,
        });
        return;
      }
      default:
        break;
    }
    rfpEventStore.update(id, (e) => ({ ...e, status: toState as RfpEventStatus }));
  },
  creationOwner: () => null,
  create: (payload, toState) => {
    const id = rfpEventStore.nextId();
    const sourceRfiId = typeof payload.sourceRfiId === 'string' ? payload.sourceRfiId : '';
    rfpEventStore.add({
      id,
      eventNumber: `RFP-2026-${id.slice(-3)}`,
      status: toState as RfxEventStatus,
      createdAt: sdcClock.now(),
      extensions: [],
      ...rfpContentOf(payload),
      ...(sourceRfiId ? { sourceRfiId } : {}),
    });
    return { entityId: id };
  },
};

/** REQ-E03-04 — the supplier's proposal. */
const rfpResponseTarget: CommandTarget = {
  readState: (id) => rfpResponseStore.get(id)?.status ?? null,
  readScopeOwner: (id) => rfpResponseStore.get(id)?.supplierId ?? null,
  readEntity: (id) => rfpResponseStore.get(id) ?? null,
  // Submit and revise, as the RFI response: the revised content (if any) is
  // applied, then appended as the next version (NR-1 BR-08).
  applyTransition: (id, toState, payload, scope) => {
    const now = sdcClock.now();
    rfpResponseStore.update(id, (r) => {
      const content = r.status === 'Submitted' ? revisedRfpResponse(r, payload, now, scope.actor ?? NO_PERSON) : r;
      const next: RfpResponse = {
        ...content,
        status: toState as RfxResponseStatus,
        updatedAt: now,
        ...(toState === 'Submitted' ? { submittedAt: now } : {}),
      };
      return toState === 'Submitted' ? { ...next, versions: versionsAfterSubmit(r, next, now) } : next;
    });
  },
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = String(payload.supplierId);
    return rfxInvited(rfpEventStore.get(String(payload.rfpId)), sid) ? sid : null;
  },
  create: (payload, toState, scope) => {
    const rfpId = String(payload.rfpId);
    const supplierId = String(payload.supplierId);
    const hasAnswers = Array.isArray(payload.answers);
    const answers = hasAnswers ? (payload.answers as RfpTermAnswer[]) : [];
    const otherTerms = typeof payload.otherTerms === 'string' ? payload.otherTerms : undefined;
    const questionAnswers = Array.isArray(payload.questionAnswers)
      ? (payload.questionAnswers as RfiAnswer[])
      : undefined;
    const pricing =
      payload.pricing && typeof payload.pricing === 'object' ? (payload.pricing as RfpPricingAnswer) : undefined;
    // Both acceptances are STORE-ASSIGNED and set once (see the RFI response).
    const now = sdcClock.now();
    const accepted = (r: RfpResponse | undefined) => ({
      ...(payload.acceptConfidentiality === true && !r?.confidentialityAcceptedAt
        ? { confidentialityAcceptedAt: now }
        : {}),
      ...(payload.acceptTerms === true && !r?.termsAcceptedAt ? { termsAcceptedAt: now } : {}),
    });
    const existing = rfpResponseStore.all().find((r) => r.rfpId === rfpId && r.supplierId === supplierId);
    // NR-1 BR-01 — as the RFI response: replaced when sent, store-stamped.
    const documents = Array.isArray(payload.documents)
      ? stampDocuments(payload.documents, existing?.documents ?? [], now, scope.actor ?? NO_PERSON)
      : undefined;
    if (existing) {
      rfpResponseStore.update(existing.id, (r) => ({
        ...r,
        ...(hasAnswers ? { answers } : {}),
        ...(otherTerms !== undefined ? { otherTerms } : {}),
        ...(questionAnswers !== undefined ? { questionAnswers } : {}),
        ...(pricing !== undefined ? { pricing } : {}),
        ...(documents !== undefined ? { documents } : {}),
        ...accepted(r),
        updatedAt: now,
      }));
      return { entityId: existing.id };
    }
    const id = rfpResponseStore.nextId();
    rfpResponseStore.add({
      id,
      rfpId,
      supplierId,
      status: toState as RfxResponseStatus,
      updatedAt: now,
      answers,
      ...(otherTerms !== undefined ? { otherTerms } : {}),
      ...(questionAnswers !== undefined ? { questionAnswers } : {}),
      ...(pricing !== undefined ? { pricing } : {}),
      ...(documents !== undefined ? { documents } : {}),
      ...accepted(undefined),
    });
    return { entityId: id };
  },
};

/** REQ-E03-05 — a negotiation round. Append-only: asking again is a new round. */
const negotiationRoundTarget: CommandTarget = {
  readState: (id) => {
    const round = negotiationRoundStore.get(id);
    return round ? (round.closed ? 'Closed' : 'Open') : null;
  },
  // Buyer-only to OPEN. A supplier answers a round through `t_quotation_revise`,
  // which is scoped to its own quotation — so a supplier never addresses the
  // round entity itself and an owner here would be a supplier who may edit the
  // window they are being negotiated in.
  readScopeOwner: () => null,
  readEntity: (id) => negotiationRoundStore.get(id) ?? null,
  applyTransition: (id) => {
    negotiationRoundStore.update(id, (r) => ({ ...r, closed: true }));
  },
  creationOwner: () => null,
  create: (payload) => {
    const id = negotiationRoundStore.nextId();
    const rfqId = String(payload.rfqId);
    const roundNumber =
      negotiationRoundStore.all().filter((r) => r.rfqId === rfqId).length + 1;
    negotiationRoundStore.add({
      id,
      rfqId,
      roundNumber,
      openedAt: sdcClock.now(),
      deadline: String(payload.deadline),
      invitedSupplierIds: (payload.invitedSupplierIds as unknown[]).filter(
        (x): x is string => typeof x === 'string',
      ),
      ...(typeof payload.message === 'string' && payload.message.trim()
        ? { message: payload.message.trim() }
        : {}),
      ...(typeof payload.targetUnitPrice === 'number' ? { targetUnitPrice: payload.targetUnitPrice } : {}),
      bestAndFinal: payload.bestAndFinal === true,
      closed: false,
    });
    return { entityId: id };
  },
};

/**
 * NR-2 BR-02 — a firm-offer round on a Closed RFP. Append-only: asking again is
 * a new round; closing stamps `closedAt` once and edits nothing else.
 */
const rfpOfferRoundTarget: CommandTarget = {
  readState: (id) => {
    const round = rfpOfferRoundStore.get(id);
    return round ? (round.closedAt !== undefined ? 'Closed' : 'Open') : null;
  },
  // Buyer-only. A supplier answers through `t_rfpfirmoffer_submit` on its own
  // offer and never addresses the round, as with the RFQ negotiation round.
  readScopeOwner: () => null,
  readEntity: (id) => rfpOfferRoundStore.get(id) ?? null,
  applyTransition: (id) => {
    rfpOfferRoundStore.update(id, (r) => (r.closedAt !== undefined ? r : { ...r, closedAt: sdcClock.now() }));
  },
  creationOwner: () => null,
  create: (payload) => {
    const id = rfpOfferRoundStore.nextId();
    const rfpId = String(payload.rfpId);
    const strs = (v: unknown) =>
      Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [];
    rfpOfferRoundStore.add({
      id,
      rfpId,
      roundNumber: rfpOfferRoundStore.all().filter((r) => r.rfpId === rfpId).length + 1,
      optionRefs: strs(payload.optionRefs),
      quantityPoints: [...new Set((payload.quantityPoints as number[]).filter((q) => typeof q === 'number'))].sort(
        (a, b) => a - b,
      ),
      invitedSupplierIds: strs(payload.invitedSupplierIds),
      deadline: String(payload.deadline),
      ...(typeof payload.message === 'string' && payload.message.trim() ? { message: payload.message.trim() } : {}),
      openedAt: sdcClock.now(),
    });
    return { entityId: id };
  },
};

/** The firm prices a payload carries, as stored (the policy has checked them). */
const firmPricesOf = (payload: Record<string, unknown>): RfpFirmPrice[] =>
  (payload.prices as RfpFirmPrice[]).map((p) => ({ optionRef: p.optionRef, qty: p.qty, unitPrice: p.unitPrice }));

/** The documents a payload carries, only when present. */
const firmDocsOf = (payload: Record<string, unknown>): { documents?: readonly AttachmentMeta[] } =>
  Array.isArray(payload.documents) && payload.documents.length > 0
    ? { documents: payload.documents as AttachmentMeta[] }
    : {};

/**
 * The next version of a firm offer, APPENDED (NR-2 BR-04). The top fields
 * become the new version; `versions` keeps every earlier one.
 */
function withFirmVersion(offer: RfpFirmOffer, payload: Record<string, unknown>): RfpFirmOffer {
  const now = sdcClock.now();
  const docs = firmDocsOf(payload);
  const next = {
    version: offer.versions.length + 1,
    prices: firmPricesOf(payload),
    validUntil: String(payload.validUntil),
    ...docs,
    submittedAt: now,
  };
  // Rebuilt, not spread, so a revision without documents drops the earlier
  // version's documents from the fields in force (they stay in `versions`).
  return {
    id: offer.id,
    roundId: offer.roundId,
    rfpId: offer.rfpId,
    supplierId: offer.supplierId,
    prices: next.prices,
    validUntil: next.validUntil,
    ...docs,
    versions: [...offer.versions, next],
    submittedAt: now,
  };
}

/**
 * NR-2 BR-01 / BR-03 — one supplier's firm offer in one round. The supplier
 * owns it: another supplier's revise is refused at scope.
 */
const rfpFirmOfferTarget: CommandTarget = {
  readState: (id) => (rfpFirmOfferStore.get(id) ? 'Submitted' : null),
  readScopeOwner: (id) => rfpFirmOfferStore.get(id)?.supplierId ?? null,
  readEntity: (id) => rfpFirmOfferStore.get(id) ?? null,
  applyTransition: (id, _toState, payload) => {
    rfpFirmOfferStore.update(id, (o) => withFirmVersion(o, payload));
  },
  // The supplier NAMES ITSELF, and the dispatcher holds a supplier scope to
  // exactly that name. Whether it was asked is the policy's question, answered
  // with ONE refusal for "no such round" and "not asked" (ROUND_NOT_INVITED),
  // so a supplier cannot probe which rounds exist.
  requireCreationOwner: true,
  creationOwner: (payload) =>
    typeof payload.supplierId === 'string' && payload.supplierId ? payload.supplierId : null,
  create: (payload) => {
    const roundId = String(payload.roundId);
    const supplierId = String(payload.supplierId);
    // ONE offer per supplier × round. Sending again appends a version to it
    // rather than minting a second row, so "which offer counts?" has one answer.
    const existing = rfpFirmOfferStore.all().find((o) => o.roundId === roundId && o.supplierId === supplierId);
    if (existing) {
      rfpFirmOfferStore.update(existing.id, (o) => withFirmVersion(o, payload));
      return { entityId: existing.id };
    }
    const id = rfpFirmOfferStore.nextId();
    const now = sdcClock.now();
    const prices = firmPricesOf(payload);
    const validUntil = String(payload.validUntil);
    const docs = firmDocsOf(payload);
    rfpFirmOfferStore.add({
      id,
      roundId,
      rfpId: rfpOfferRoundStore.get(roundId)!.rfpId,
      supplierId,
      prices,
      validUntil,
      ...docs,
      versions: [{ version: 1, prices, validUntil, ...docs, submittedAt: now }],
      submittedAt: now,
    });
    return { entityId: id };
  },
};

// — The RFx policy hooks ————————————————————————————————————————————————

// REQ-E03-02 — the template must be one Procurement keeps, the deadline a date,
// and any hand-edited question set must carry kinds this build recognises.
bindPolicyHook(POLICY_HOOKS.RFI_CREATE_VALID, ({ payload }) => {
  if (!rfiTemplate(String(payload.templateId))) {
    return { ok: false, reason: 'UNKNOWN_TEMPLATE: the RFI template is not one Procurement keeps' };
  }
  if (!isCalendarDate(String(payload.responseDeadline))) {
    return { ok: false, reason: 'BAD_DEADLINE: the response deadline must be a date' };
  }
  const sections = Array.isArray(payload.customSections) ? (payload.customSections as RfxCustomSection[]) : [];
  if (payload.questions !== undefined) {
    if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
      return { ok: false, reason: 'NO_QUESTIONS: an RFI asks at least one question' };
    }
    const refusal = rfiQuestionsRefusal(payload.questions as RfiQuestion[], sections);
    if (refusal) return { ok: false, reason: refusal };
  } else {
    const refusal = customSectionsRefusal(sections);
    if (refusal) return { ok: false, reason: refusal };
  }
  const authoring = rfxAuthoringRefusal(payload);
  return authoring ? { ok: false, reason: authoring } : { ok: true };
});

// REQ-E03-01 BR-04 — publication is when the invitation actually goes out, so
// the supplier statuses are re-read HERE and not only in the picker.
bindPolicyHook(POLICY_HOOKS.RFX_PUBLISH_HAS_INVITEES, ({ target, entityId }) => {
  const event = target.readEntity(entityId) as { invitees?: readonly RfxInvitee[] } | null;
  const invitees = event?.invitees ?? [];
  if (invitees.length === 0) {
    return { ok: false, reason: 'NO_INVITEES: publish an event to at least one supplier' };
  }
  const refused = invitees
    .map((i) => i.supplierId)
    .filter((sid) => {
      const supplier = mockSuppliers.find((x) => x.id === sid);
      return !supplier || !isSelectableSupplier(supplier.status);
    });
  if (refused.length > 0) {
    return { ok: false, reason: `SUPPLIER_NOT_SELECTABLE: ${refused.join(', ')}` };
  }
  return { ok: true };
});

// REQ-E03-02 / -03 edge cases — an extension moves the deadline LATER. A date
// that moves earlier would retroactively close a window suppliers are answering
// in, which is not an extension under any reading.
bindPolicyHook(POLICY_HOOKS.RFX_EXTEND_VALID, ({ payload, target, entityId }) => {
  const next = String(payload.deadline);
  if (!isCalendarDate(next)) return { ok: false, reason: 'BAD_DEADLINE: the new deadline must be a date' };
  const event = target.readEntity(entityId) as
    | { responseDeadline?: string; invitees?: readonly RfxInvitee[]; invitedSupplierIds?: readonly string[] }
    | null;
  if (!event) return { ok: false, reason: 'event not found' };
  const named = Array.isArray(payload.supplierIds)
    ? (payload.supplierIds as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  const members = event.invitees
    ? event.invitees.map((i) => i.supplierId)
    : event.invitedSupplierIds ?? [];
  const strangers = named.filter((sid) => !members.includes(sid));
  if (strangers.length > 0) {
    return { ok: false, reason: `NOT_INVITED: ${strangers.join(', ')} was not invited to this event` };
  }
  const current = String(event.responseDeadline ?? '');
  if (named.length === 0 && current && !isExtension(current, next)) {
    return { ok: false, reason: 'NOT_AN_EXTENSION: the new deadline must be later than the current one' };
  }
  return { ok: true };
});

// REQ-E03-02 / -04 — an answer is only answerable by an invitee of an open event.
bindPolicyHook(POLICY_HOOKS.RFX_RESPONSE_INVITED, ({ payload }) => {
  const supplierId = String(payload.supplierId);
  const event = payload.rfiId
    ? rfiEventStore.get(String(payload.rfiId))
    : rfpEventStore.get(String(payload.rfpId));
  if (!event) return { ok: false, reason: 'event not found' };
  if (event.status !== 'Open') return { ok: false, reason: `EVENT_NOT_OPEN: the event is ${event.status}` };
  return event.invitees.some((i) => i.supplierId === supplierId)
    ? { ok: true }
    : { ok: false, reason: 'NOT_INVITED: this supplier was not invited to the event' };
});

// NR-1 BR-08 / AC-07 (D-6) — a supplier changes its response only while the
// event is Open and before the deadline in force for it. On the draft save
// (creation: the event and supplier come from the payload) and on the revise
// verbs (the stored response names them). `responseWindowRefusal` is the rule.
bindPolicyHook(POLICY_HOOKS.RFX_RESPONSE_WINDOW_OPEN, ({ payload, target, entityId }) => {
  const stored = entityId ? (target.readEntity(entityId) as RfiResponse | RfpResponse | null) : null;
  if (entityId && !stored) return { ok: false, reason: 'response not found' };
  const supplierId = stored ? stored.supplierId : String(payload.supplierId);
  const rfiId = stored ? ('rfiId' in stored ? stored.rfiId : undefined) : payload.rfiId;
  const event =
    rfiId !== undefined
      ? rfiEventStore.get(String(rfiId))
      : rfpEventStore.get(String(stored ? (stored as RfpResponse).rfpId : payload.rfpId));
  if (!event) return { ok: false, reason: 'event not found' };
  const refusal = responseWindowRefusal(event, supplierId, rfxNow());
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});

// NR-1 BR-08 / BR-10 — the draft save never touches a Submitted response: it
// would change it in place with no version. Revise is the only way.
bindPolicyHook(POLICY_HOOKS.RFX_RESPONSE_NOT_SUBMITTED, ({ payload }) => {
  const supplierId = String(payload.supplierId);
  const existing =
    payload.rfiId !== undefined
      ? rfiResponseStore.all().find((r) => r.rfiId === String(payload.rfiId) && r.supplierId === supplierId)
      : rfpResponseStore.all().find((r) => r.rfpId === String(payload.rfpId) && r.supplierId === supplierId);
  const refusal = responseAlreadySubmittedRefusal(existing?.status);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});

// REQ-E03-02 — every required question answered, every answer fitting its
// question, and the deadline in force for THIS supplier not yet passed. The
// refusal names the questions. On `t_rfiresponse_revise` (the response is
// already Submitted) the rule judges the REVISED content the payload carries.
bindPolicyHook(POLICY_HOOKS.RFI_SUBMIT_COMPLETE, ({ target, entityId, currentState, payload, scope }) => {
  const stored = target.readEntity(entityId) as RfiResponse | null;
  if (!stored) return { ok: false, reason: 'response not found' };
  const response =
    currentState === 'Submitted' ? revisedRfiResponse(stored, payload, rfxNow(), scope.actor ?? NO_PERSON) : stored;
  const event = rfiEventStore.get(response.rfiId);
  if (!event) return { ok: false, reason: 'RFI not found' };
  const deadline = effectiveDeadline(event.responseDeadline, event.invitees, response.supplierId);
  if (isPastDeadline(deadline, rfxNow())) {
    return { ok: false, reason: `PAST_DEADLINE: answers closed on ${deadline}` };
  }
  if (event.confidentiality && !response.confidentialityAcceptedAt) {
    return { ok: false, reason: 'CONFIDENTIALITY_NOT_ACCEPTED: accept the confidentiality terms first' };
  }
  const missing = missingRequiredAnswers(event.questions, response.answers);
  if (missing.length > 0) return { ok: false, reason: `REQUIRED_UNANSWERED: ${missing.join(', ')}` };
  const invalid = invalidAnswers(event.questions, response.answers);
  return invalid.length === 0
    ? { ok: true }
    : { ok: false, reason: `ANSWER_INVALID: ${invalid.join(', ')}` };
});

// REQ-E03-04 + RFx authoring — the buyer picks STANDARD terms or writes CUSTOM
// ones, and every row carries PTI's requested value in the row's value kind.
// The optional sections (questions, indicative pricing, T&C) are validated by
// the same predicates the template store reads.
bindPolicyHook(POLICY_HOOKS.RFP_CREATE_TERMS_KNOWN, ({ payload }) => {
  if (!isCalendarDate(String(payload.responseDeadline))) {
    return { ok: false, reason: 'BAD_DEADLINE: the response deadline must be a date' };
  }
  const terms = Array.isArray(payload.terms) ? (payload.terms as RfpTermRow[]) : [];
  const termRefusal = rfpTermsRefusal(terms);
  if (termRefusal) return { ok: false, reason: termRefusal };
  const sections = Array.isArray(payload.customSections) ? (payload.customSections as RfxCustomSection[]) : [];
  const questions = Array.isArray(payload.questions) ? (payload.questions as RfiQuestion[]) : [];
  const questionRefusal = rfiQuestionsRefusal(questions, sections);
  if (questionRefusal) return { ok: false, reason: questionRefusal };
  const pricingRefusal = rfpPricingRequestRefusal(payload.pricing as RfpPricingRequest | undefined);
  if (pricingRefusal) return { ok: false, reason: pricingRefusal };
  if (payload.termsDocument !== undefined) {
    const doc = payload.termsDocument as RfpTermsDocument | null;
    const hasDocText = typeof doc?.text === 'string' && doc.text.trim().length > 0;
    if (!doc || (!hasDocText && !doc.attachment)) {
      return { ok: false, reason: 'TC_DOCUMENT_EMPTY: a T&C document carries its text or a file' };
    }
    if (doc.attachment && !isAttachmentMeta(doc.attachment)) {
      return { ok: false, reason: 'ATTACHMENT_MALFORMED: the T&C file is not a file record' };
    }
  }
  if (payload.sourceRfiId !== undefined && !rfiEventStore.get(String(payload.sourceRfiId))) {
    return { ok: false, reason: `UNKNOWN_SOURCE_RFI: ${String(payload.sourceRfiId)}` };
  }
  const authoring = rfxAuthoringRefusal(payload);
  return authoring ? { ok: false, reason: authoring } : { ok: true };
});

// RFx authoring — the confidentiality gate and the T&C acceptance, AT THE VERB.
// A confidential event's content is withheld by the read until the supplier
// accepts; a save that carries answers before that acceptance is refused by
// name, so a hand-made dispatch cannot answer questions it was never shown.
bindPolicyHook(POLICY_HOOKS.RFX_RESPONSE_ACCEPTANCE_GATE, ({ payload }) => {
  const supplierId = String(payload.supplierId);
  const isRfi = payload.rfiId !== undefined;
  const event = isRfi ? rfiEventStore.get(String(payload.rfiId)) : rfpEventStore.get(String(payload.rfpId));
  if (!event) return { ok: false, reason: 'event not found' };
  const prior = isRfi
    ? rfiResponseStore.all().find((r) => r.rfiId === event.id && r.supplierId === supplierId)
    : rfpResponseStore.all().find((r) => r.rfpId === event.id && r.supplierId === supplierId);
  const carriesAnswers =
    (Array.isArray(payload.answers) && payload.answers.length > 0) ||
    (Array.isArray(payload.questionAnswers) && payload.questionAnswers.length > 0) ||
    (payload.pricing !== undefined && payload.pricing !== null) ||
    // NR-1 — a file answers requests the supplier was only shown after accepting.
    (Array.isArray(payload.documents) && payload.documents.length > 0);
  if (!carriesAnswers) return { ok: true };
  if (event.confidentiality && !prior?.confidentialityAcceptedAt && payload.acceptConfidentiality !== true) {
    return { ok: false, reason: 'CONFIDENTIALITY_NOT_ACCEPTED: accept the confidentiality terms first' };
  }
  if (!isRfi) {
    const rfp = event as RfpEvent;
    const rfpPrior = prior as RfpResponse | undefined;
    if (rfp.termsDocument && !rfpPrior?.termsAcceptedAt && payload.acceptTerms !== true) {
      return { ok: false, reason: 'TC_NOT_ACCEPTED: accept the terms and conditions before answering' };
    }
  }
  return { ok: true };
});

// REQ-E03-04 — every asked term answered, and A DEVIATION CARRIES A COMMENT.
// On `t_rfpresponse_revise` the rule judges the revised proposal (NR-1 BR-08).
bindPolicyHook(POLICY_HOOKS.RFP_SUBMIT_TERMS_ANSWERED, ({ target, entityId, currentState, payload, scope }) => {
  const stored = target.readEntity(entityId) as RfpResponse | null;
  if (!stored) return { ok: false, reason: 'proposal not found' };
  const response =
    currentState === 'Submitted' ? revisedRfpResponse(stored, payload, rfxNow(), scope.actor ?? NO_PERSON) : stored;
  const event = rfpEventStore.get(response.rfpId);
  if (!event) return { ok: false, reason: 'RFP not found' };
  const deadline = effectiveDeadline(event.responseDeadline, event.invitees, response.supplierId);
  if (isPastDeadline(deadline, rfxNow())) {
    return { ok: false, reason: `PAST_DEADLINE: proposals closed on ${deadline}` };
  }
  if (event.confidentiality && !response.confidentialityAcceptedAt) {
    return { ok: false, reason: 'CONFIDENTIALITY_NOT_ACCEPTED: accept the confidentiality terms first' };
  }
  if (event.termsDocument && !response.termsAcceptedAt) {
    return { ok: false, reason: 'TC_NOT_ACCEPTED: accept the terms and conditions before answering' };
  }
  const unanswered = unansweredTerms(event.terms, response.answers);
  if (unanswered.length > 0) {
    return { ok: false, reason: `TERMS_UNANSWERED: ${unanswered.join(', ')}` };
  }
  const badValues = invalidTermAnswers(event.terms, response.answers);
  if (badValues.length > 0) {
    return { ok: false, reason: `TERM_ANSWER_INVALID: ${badValues.join(', ')}` };
  }
  const uncommented = deviationsWithoutComment(response.answers);
  if (uncommented.length > 0) {
    return { ok: false, reason: `DEVIATION_NEEDS_COMMENT: ${uncommented.join(', ')}` };
  }
  const questions = event.questions ?? [];
  const qAnswers = response.questionAnswers ?? [];
  const missing = missingRequiredAnswers(questions, qAnswers);
  if (missing.length > 0) return { ok: false, reason: `REQUIRED_UNANSWERED: ${missing.join(', ')}` };
  const invalid = invalidAnswers(questions, qAnswers);
  if (invalid.length > 0) return { ok: false, reason: `ANSWER_INVALID: ${invalid.join(', ')}` };
  const pricing = rfpPricingAnswerRefusal(event.pricing, response.pricing);
  return pricing ? { ok: false, reason: pricing } : { ok: true };
});

/**
 * The authoring fields an RFI or RFP create stores beside its own: the buyer's
 * custom sections, attachments and confidentiality gate. Each is stored only
 * when present, so an event raised without one reads honestly as without it.
 */
function rfxAuthoringFields(payload: Record<string, unknown>): {
  customSections?: readonly RfxCustomSection[];
  attachments?: readonly AttachmentMeta[];
  confidentiality?: RfxConfidentiality;
  documentRequests?: readonly DocumentRequest[];
} {
  const conf = payload.confidentiality as RfxConfidentiality | undefined;
  return {
    // NR-1 BR-02 — the buyer's document requests, judged by `rfxAuthoringRefusal`.
    ...(Array.isArray(payload.documentRequests) && payload.documentRequests.length > 0
      ? { documentRequests: payload.documentRequests as DocumentRequest[] }
      : {}),
    ...(Array.isArray(payload.customSections) && payload.customSections.length > 0
      ? { customSections: payload.customSections as RfxCustomSection[] }
      : {}),
    ...(Array.isArray(payload.attachments) && payload.attachments.length > 0
      ? { attachments: payload.attachments as AttachmentMeta[] }
      : {}),
    ...(conf && typeof conf === 'object'
      ? { confidentiality: typeof conf.terms === 'string' && conf.terms.trim() ? { terms: conf.terms.trim() } : {} }
      : {}),
  };
}

/** The refusal the shared authoring fields earn, or null. */
function rfxAuthoringRefusal(payload: Record<string, unknown>): string | null {
  if (payload.attachments !== undefined) {
    if (!Array.isArray(payload.attachments) || !payload.attachments.every(isAttachmentMeta)) {
      return 'ATTACHMENT_MALFORMED: every attachment is a file record (name, size, type)';
    }
  }
  if (payload.confidentiality !== undefined) {
    const conf = payload.confidentiality as { terms?: unknown } | null;
    if (!conf || typeof conf !== 'object' || (conf.terms !== undefined && typeof conf.terms !== 'string')) {
      return 'CONFIDENTIALITY_MALFORMED: the confidentiality gate carries optional terms text';
    }
  }
  // NR-1 BR-02 — an RFI or RFP has no items, so no request may name one.
  if (payload.documentRequests !== undefined) {
    return documentRequestsRefusal(payload.documentRequests);
  }
  return null;
}


// REQ-E03-03 AC-05 — no quote after the deadline in force for this supplier.
bindPolicyHook(POLICY_HOOKS.QUOTATION_SUBMIT_BEFORE_DEADLINE, ({ payload }) => {
  const rfq = rfqStore.get(String(payload.rfqId));
  if (!rfq) return { ok: false, reason: 'sourcing event not found' };
  const deadline = effectiveDeadline(rfq.responseDeadline, rfq.inviteeDeadlines ?? [], String(payload.supplierId));
  return isPastDeadline(deadline, rfxNow())
    ? { ok: false, reason: `PAST_DEADLINE: quotes closed on ${deadline}` }
    : { ok: true };
});

// REQ-E03-03 — malformed per-item lines are refused; absent lines are legal.
bindPolicyHook(POLICY_HOOKS.QUOTATION_LINES_WELL_FORMED, ({ payload }) => {
  if (payload.lines === undefined) return { ok: true };
  if (!Array.isArray(payload.lines)) return { ok: false, reason: 'QUOTE_LINES_MALFORMED: lines must be a list' };
  const refusal = quoteLinesRefusal(payload.lines as QuoteLineInput[]);
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});

// REQ-E03-05 BR-03 — only a supplier INVITED TO THE ROUND may revise, and only
// while the round is open and inside its deadline.
bindPolicyHook(POLICY_HOOKS.QUOTATION_REVISE_IN_ROUND, ({ payload }) => {
  const round = negotiationRoundStore.get(String(payload.roundId));
  if (!round) return { ok: false, reason: 'negotiation round not found' };
  if (round.rfqId !== String(payload.rfqId)) {
    return { ok: false, reason: 'ROUND_MISMATCH: this round belongs to another sourcing event' };
  }
  if (round.closed) return { ok: false, reason: 'ROUND_CLOSED: this round is closed' };
  if (isPastDeadline(round.deadline, rfxNow())) {
    return { ok: false, reason: `PAST_DEADLINE: the round closed on ${round.deadline}` };
  }
  return isInvitedToRound(round.invitedSupplierIds, String(payload.supplierId))
    ? { ok: true }
    : { ok: false, reason: 'NOT_IN_ROUND: this supplier was not invited to the negotiation round' };
});

// REQ-E03-05 BR-03 — a round names an event that can still be negotiated, and a
// shortlist drawn from the suppliers that actually quoted.
bindPolicyHook(POLICY_HOOKS.NEGOTIATION_ROUND_VALID, ({ payload }) => {
  const rfq = rfqStore.get(String(payload.rfqId));
  if (!rfq) return { ok: false, reason: 'sourcing event not found' };
  if (rfq.status === 'Awarded' || rfq.status === 'Cancelled') {
    return { ok: false, reason: `EVENT_CLOSED: ${rfq.rfqNumber} is ${rfq.status}` };
  }
  if (!isCalendarDate(String(payload.deadline))) {
    return { ok: false, reason: 'BAD_DEADLINE: the round needs a deadline date' };
  }
  const invited = Array.isArray(payload.invitedSupplierIds)
    ? (payload.invitedSupplierIds as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  if (invited.length === 0) {
    return { ok: false, reason: 'NO_SHORTLIST: a round invites at least one supplier' };
  }
  const quoted = new Set(quotationStore.all().filter((q) => q.rfqId === rfq.id).map((q) => q.supplierId));
  const strangers = invited.filter((sid) => !quoted.has(sid));
  if (strangers.length > 0) {
    return { ok: false, reason: `NOT_A_BIDDER: ${strangers.join(', ')} did not quote on this event` };
  }
  if (payload.targetUnitPrice !== undefined && !(typeof payload.targetUnitPrice === 'number' && payload.targetUnitPrice > 0)) {
    return { ok: false, reason: 'BAD_TARGET: a target price is a number above zero' };
  }
  return { ok: true };
});

// NR-2 BR-02 — a firm-offer round opens on a Closed or Partly awarded RFP
// (RFX-D15), for options that exist (the buyer's or a submitted proposal's) and
// are still open (`rfpSettledOptionRefs`: no award in force names them and no
// live RFQ created from the RFP sources them), at quantity points above zero,
// and only for suppliers that submitted a response and pass CR-23.
bindPolicyHook(POLICY_HOOKS.RFP_OFFER_ROUND_VALID, ({ payload }) => {
  const rfp = rfpEventStore.get(String(payload.rfpId));
  const now = rfxNow();
  const refusal = rfpOfferRoundRefusal(
    {
      optionRefs: payload.optionRefs,
      quantityPoints: payload.quantityPoints,
      invitedSupplierIds: payload.invitedSupplierIds,
      deadline: payload.deadline,
    },
    {
      rfpStatus: rfp?.status ?? null,
      knownOptionRefs: rfp ? rfpRoundOptions(rfp).map((o) => o.ref) : [],
      settledOptionRefs: rfp ? [...rfpSettledOptionRefs(rfp.id, rfpAwardsOf(rfp.id), rfqStore.all()).keys()] : [],
      respondedSupplierIds: rfp ? rfpRespondedSupplierIds(rfp.id) : [],
      gate: (sid) => rfpSupplierGate(sid, now),
    },
  );
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});

// NR-2 BR-01 / BR-03 — a firm offer (and each revision) comes from an invited
// supplier, inside an open round, prices only what the round asks and above
// zero, and holds until at least the round deadline. On a revise the round is
// the one the offer was sent in, never one the payload names.
bindPolicyHook(POLICY_HOOKS.RFP_FIRM_OFFER_VALID, ({ payload, entityId, target }) => {
  const offer = entityId ? (target.readEntity(entityId) as RfpFirmOffer | null) : null;
  const round = rfpOfferRoundStore.get(offer ? offer.roundId : String(payload.roundId));
  const supplierId = offer ? offer.supplierId : String(payload.supplierId);
  const refusal = firmOfferRefusal(
    round
      ? {
          optionRefs: round.optionRefs,
          quantityPoints: round.quantityPoints,
          invitedSupplierIds: round.invitedSupplierIds,
          deadline: round.deadline,
          closed: round.closedAt !== undefined,
        }
      : null,
    supplierId,
    { prices: payload.prices, validUntil: payload.validUntil, documents: payload.documents },
    rfxNow(),
  );
  return refusal ? { ok: false, reason: refusal } : { ok: true };
});

// ── RFx C1 — the award (NR-3 BR-02 to BR-08; AR-04) ─────────────────────────

/** RFx C2 — the appended cancellations and SAP markings, as the rules read them. */
const awardTrail = (): AwardTrail => ({
  cancellations: awardCancellationStore.all(),
  sapMarks: awardSapMarkStore.all(),
});

/** Every award recorded on an RFQ, cancelled ones included (newest first). */
const rfqAwardRecordsOf = (rfqId: string): RfqAwardRecord[] =>
  awardStore.all().filter((a): a is RfqAwardRecord => a.eventType === 'rfq' && a.eventId === rfqId);

/**
 * The awards IN FORCE on an RFQ (the store keeps the newest first). RFx C2 —
 * a cancelled award is left out, so its items are open to a new award and its
 * quotes are no longer "named by an award" (NR-3 BR-09).
 */
const rfqAwardsOf = (rfqId: string) => awardsInForce(rfqAwardRecordsOf(rfqId), awardTrail());

/**
 * The award lines a payload describes. `awardLines` when sent (RFx C3: an EMPTY
 * array is a final award with no lines, which only a "Will not award the rest"
 * passes). Without them — a payload naming only the principal winner; no screen
 * sends one since C3 removed `useRfqAward` — a LEGACY RFQ is awarded 1 line per
 * item at 100% to that winner, judged by the same rule. A TIERED RFQ keeps the
 * one line naming no item, which the rule refuses by name.
 */
function awardLinesOfPayload(rfq: RFQ, payload: Record<string, unknown>): AwardLine[] {
  if (Array.isArray(payload.awardLines)) return payload.awardLines as AwardLine[];
  const supplierId = String(payload.awardedSupplierId);
  const quotationId = String(payload.awardedQuotationId);
  if (isTieredRfq(rfq)) return [{ supplierId, quotationId, itemCode: '', sharePct: 100, quantity: rfq.totalQty }];
  return awardItemsOf(rfq).map((item) => ({
    supplierId,
    quotationId,
    itemCode: item.itemCode,
    sharePct: 100,
    quantity: item.breaks[0]!.pieces,
  }));
}

/** A line as it is recorded: the side the buyer typed, and its own break. */
function recordedAwardLine(items: readonly AwardItem[], line: AwardLine): AwardLine {
  const item = itemOfAwardLine(items, line);
  const breakQty = item ? lineBreakOf(item, line) : line.awardTierQty;
  return { ...line, splitBasis: basisOf(line), ...(breakQty !== undefined ? { awardTierQty: breakQty } : {}) };
}

/** The payload's "Will not award" items, by item key. */
const notAwardedItemsOf = (payload: Record<string, unknown>): string[] =>
  Array.isArray(payload.notAwardedItems)
    ? (payload.notAwardedItems as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];

// ONE policy for the final award (`t_rfq_award`) and the partial award
// (`t_rfq_award_partial`), told apart by the target state, so the rule cannot
// drift between them. In order: the shape (`awardShapeRefusal`, the same
// function the page pre-checks with) · the items left open · every line on a
// quote of this event · CR-23 for every awarded supplier · BR-07 per awarded
// item, at that item's break.
bindPolicyHook(POLICY_HOOKS.RFQ_AWARD_GOVERNED, ({ payload, entityId, currentState, toState }) => {
  const rfq = rfqStore.get(entityId);
  if (!rfq) return { ok: false, reason: 'sourcing event not found' };
  const lines = awardLinesOfPayload(rfq, payload);
  const onEventQuotes = quotationStore.all().filter((q) => q.rfqId === rfq.id);
  const items = awardItemsOf(rfq, rfqAwardsOf(rfq.id));
  // NR-3 BR-06 — the final award settles every item; a partial award leaves at
  // least one open. "Will not award" rides on the final award only.
  const final = toState === 'Awarded';
  const willNotAward = final ? notAwardedItemsOf(payload) : [];
  // RFx C3 — a final award may carry NO lines when it only marks the rest of a
  // Partly awarded event "Will not award"; the rule decides (`settle`).
  const shape = awardShapeRefusal(
    items,
    lines,
    onEventQuotes,
    final ? { partlyAwarded: currentState === 'Partly awarded', notAwardedKeys: willNotAward } : undefined,
  );
  if (shape) return { ok: false, reason: awardRefusalText(shape) };
  const unknown = willNotAward.find((key) => !items.some((i) => i.key === key));
  if (unknown !== undefined) {
    return { ok: false, reason: awardRefusalText({ code: 'AWARD_ITEM_UNKNOWN', detail: `"${unknown}"` }) };
  }
  const open = itemsOpenAfter(items, lines, willNotAward);
  if (final && open.length > 0) {
    return {
      ok: false,
      reason: awardRefusalText({ code: 'AWARD_ITEMS_OPEN', item: open.map((i) => i.name).join(', ') }),
    };
  }
  if (!final && open.length === 0) return { ok: false, reason: awardRefusalText({ code: 'AWARD_NOTHING_OPEN' }) };
  // Every awarded line names a real quotation ON THIS EVENT. Without this an
  // award could record a share against a bid from another tender.
  const onEvent = new Set(onEventQuotes.map((q) => q.id));
  const foreign = lines.filter((l) => !onEvent.has(l.quotationId));
  if (foreign.length > 0) {
    return { ok: false, reason: `QUOTE_NOT_ON_EVENT: ${foreign.map((l) => l.quotationId).join(', ')}` };
  }
  // REQ-E03-05 BR-01a / CR-23 — no award line may name a supplier that fails the
  // compliance gate. Judged against the supplier who actually AUTHORED the quote
  // as well as the one the line names, so a line cannot launder a failing bid
  // under a passing supplier id.
  const quoteAuthor = new Map(quotationStore.all().map((q) => [q.id, q.supplierId] as const));
  const named = [...new Set(lines.flatMap((l) => [l.supplierId, quoteAuthor.get(l.quotationId) ?? l.supplierId]))];
  for (const supplierId of named) {
    const gate = rfqSupplierGate(rfq, supplierId, rfxNow());
    if (!gate.passes) return { ok: false, reason: gateRefusal(supplierId, gate.failed) };
  }
  // BR-07 / NR-3 BR-08, PER AWARDED ITEM — the reason is owed when an item's
  // lines leave out that item's best-scored quote at the item's own break. A
  // legacy quote prices the whole event, so its items share the event's best.
  const reason = typeof payload.awardReason === 'string' ? payload.awardReason.trim() : '';
  let eventBest: string | null | undefined;
  const departing = awardItemsDepartingBest(items, lines, (item, breakQty) => {
    if (item.tiered) return bestScoredByItem(rfq, rfxNow(), breakQty).get(item.lineNo!) ?? null;
    if (eventBest === undefined) eventBest = bestScoredQuotationId(rfq, rfxNow());
    return eventBest;
  });
  if (departing.length > 0 && reason.length === 0) {
    return { ok: false, reason: awardRefusalText({ code: 'AWARD_REASON_REQUIRED', item: departing[0]!.name }) };
  }
  return { ok: true };
});

// RFx C2 (NR-3 BR-09, D-7) — ONE policy for the cancel pair, told apart by the
// target state: `Closed` is the full cancel, `Partly awarded` the partial one.
// The rule is `awardCancelRefusal`, which a screen can pre-check with (RFX-R2).
bindPolicyHook(POLICY_HOOKS.RFQ_AWARD_CANCEL_GOVERNED, ({ payload, entityId, toState }) => {
  const refusal = awardCancelRefusal({
    awardId: typeof payload.awardId === 'string' ? payload.awardId : '',
    reason: typeof payload.cancelReason === 'string' ? payload.cancelReason : '',
    eventAwards: rfqAwardRecordsOf(entityId),
    trail: awardTrail(),
    partial: toState === 'Partly awarded',
  });
  return refusal ? { ok: false, reason: awardCancelRefusalText(refusal) } : { ok: true };
});

// RFx C2 (NR-3 BR-10) — "Raised in SAP": an active award of this event, not
// already marked, with a SAP document number.
bindPolicyHook(POLICY_HOOKS.RFQ_AWARD_SAP_GOVERNED, ({ payload, entityId }) => {
  const refusal = awardSapMarkRefusal({
    awardId: typeof payload.awardId === 'string' ? payload.awardId : '',
    sapDocumentNo: typeof payload.sapDocumentNo === 'string' ? payload.sapDocumentNo : '',
    eventAwards: rfqAwardRecordsOf(entityId),
    trail: awardTrail(),
  });
  return refusal ? { ok: false, reason: awardCancelRefusalText(refusal) } : { ok: true };
});

// ── RFx D2 — the RFP award (NR-2 BR-01, BR-05 to BR-10; NR-3) ────────────────

/** Every award recorded on an RFP, cancelled ones included (newest first). */
const rfpAwardRecordsOf = (rfpId: string) => awardStore.all().filter(isRfpAward).filter((a) => a.eventId === rfpId);

/** The awards IN FORCE on an RFP: a cancelled one's options are open again. */
const rfpAwardsOf = (rfpId: string) => awardsInForce(rfpAwardRecordsOf(rfpId), awardTrail());

/** The RFP's award items: the options of its closed firm-offer rounds (`awardItemsOfRfp`). */
const rfpAwardItems = (rfp: RfpEvent): readonly AwardItem[] =>
  awardItemsOfRfp(rfp, rfpOfferRoundStore.all(), rfpFirmOfferStore.all(), {
    nowIso: rfxNow(),
    options: rfpRoundOptions(rfp),
    priorAwards: rfpAwardsOf(rfp.id),
  });

/** The award lines a payload names (the rule refuses a line that names no option). */
const rfpAwardLinesOf = (payload: Record<string, unknown>): RfpAwardLine[] =>
  Array.isArray(payload.awardLines) ? (payload.awardLines as RfpAwardLine[]) : [];

/**
 * A line as it is recorded: only the RFP line's own fields (a stray
 * `quotationId` is never kept), the side typed and its point.
 */
function recordedRfpAwardLine(items: readonly AwardItem[], line: RfpAwardLine): RfpAwardLine {
  const item = itemOfAwardLine(items, line);
  const breakQty = item ? lineBreakOf(item, line) : line.awardTierQty;
  return {
    supplierId: line.supplierId,
    optionRef: line.optionRef,
    firmOfferId: line.firmOfferId,
    sharePct: line.sharePct,
    quantity: line.quantity,
    splitBasis: basisOf(line),
    ...(breakQty !== undefined ? { awardTierQty: breakQty } : {}),
  };
}

// ONE policy for the RFP's final and partial award, told apart by the target
// state, over the SAME shape rule the RFQ uses. In order: the shape over the
// options of the closed rounds (the firm offer in force, still valid) · no
// option already sourced by an RFQ created from this RFP (NR-2 BR-08) · the
// options left open · CR-23 for every awarded supplier (BR-07) · a reason
// (BR-06). `awardRefusalText(…, 'rfp')` words the codes for an RFP.
bindPolicyHook(POLICY_HOOKS.RFP_AWARD_GOVERNED, ({ payload, entityId, currentState, toState }) => {
  const rfp = rfpEventStore.get(entityId);
  if (!rfp) return { ok: false, reason: 'RFP_NOT_FOUND: the award names no RFP this hub holds' };
  const lines = rfpAwardLinesOf(payload);
  const options = rfpRoundOptions(rfp);
  const items = rfpAwardItems(rfp);
  const sourced = rfqSourcedOptionRefs(rfqStore.all(), rfp.id);
  // NR-3 BR-06 — "Will not award" rides on the final award only.
  const final = toState === 'Awarded';
  const willNotAward = final ? notAwardedItemsOf(payload) : [];
  // BL-130 (REQ-E03-04 BR-16f) — a final award may carry NO lines when it only
  // marks the rest of a Partly awarded RFP "Will not award", by the rule the
  // RFQ uses (`settlesRestWithoutLines`). An option an RFQ created from this
  // RFP sources is settled there, so it counts as settled here too.
  const shape = awardShapeRefusal(
    items,
    lines,
    [],
    final
      ? { partlyAwarded: currentState === 'Partly awarded', notAwardedKeys: [...willNotAward, ...sourced.keys()] }
      : undefined,
  );
  if (shape) return { ok: false, reason: awardRefusalText(shape, 'rfp') };
  const elsewhere = rfpOptionSourcedRefusal(
    lines.map((l) => l.optionRef),
    sourced,
    (rfqNumber) => `sourced by ${rfqNumber}, an RFQ created from this RFP`,
    options,
  );
  if (elsewhere) return { ok: false, reason: awardRefusalText(elsewhere, 'rfp') };
  // NR-3 BR-06 — an option an RFQ sources is settled there, so it does not
  // hold the RFP open.
  const unknown = willNotAward.find((key) => !items.some((i) => i.key === key));
  if (unknown !== undefined) {
    return { ok: false, reason: awardRefusalText({ code: 'AWARD_ITEM_UNKNOWN', detail: `"${unknown}"` }, 'rfp') };
  }
  const open = itemsOpenAfter(items, lines, [...willNotAward, ...sourced.keys()]);
  if (final && open.length > 0) {
    return {
      ok: false,
      reason: awardRefusalText({ code: 'AWARD_ITEMS_OPEN', item: open.map((i) => i.name).join(', ') }, 'rfp'),
    };
  }
  if (!final && open.length === 0) {
    return { ok: false, reason: awardRefusalText({ code: 'AWARD_NOTHING_OPEN' }, 'rfp') };
  }
  // NR-2 BR-07 / edge case 4 — CR-23 at award, for every awarded supplier.
  const now = rfxNow();
  for (const supplierId of [...new Set(lines.map((l) => l.supplierId))]) {
    const gate = rfpSupplierGate(supplierId, now);
    if (!gate.passes) return { ok: false, reason: gateRefusal(supplierId, gate.failed) };
  }
  // NR-2 BR-06 — every RFP award needs a reason.
  const reason = typeof payload.awardReason === 'string' ? payload.awardReason.trim() : '';
  if (reason.length === 0) return { ok: false, reason: awardRefusalText({ code: 'AWARD_REASON_REQUIRED' }, 'rfp') };
  return { ok: true };
});

// RFx D2 (NR-3 BR-09) — the RFP's cancel pair, by the rule the RFQ's uses.
bindPolicyHook(POLICY_HOOKS.RFP_AWARD_CANCEL_GOVERNED, ({ payload, entityId, toState }) => {
  const refusal = awardCancelRefusal({
    awardId: typeof payload.awardId === 'string' ? payload.awardId : '',
    reason: typeof payload.cancelReason === 'string' ? payload.cancelReason : '',
    eventAwards: rfpAwardRecordsOf(entityId),
    trail: awardTrail(),
    partial: toState === 'Partly awarded',
    eventType: 'rfp',
  });
  return refusal ? { ok: false, reason: awardCancelRefusalText(refusal) } : { ok: true };
});

// RFx D2 (NR-3 BR-10) — "Raised in SAP" on an RFP award.
bindPolicyHook(POLICY_HOOKS.RFP_AWARD_SAP_GOVERNED, ({ payload, entityId }) => {
  const refusal = awardSapMarkRefusal({
    awardId: typeof payload.awardId === 'string' ? payload.awardId : '',
    sapDocumentNo: typeof payload.sapDocumentNo === 'string' ? payload.sapDocumentNo : '',
    eventAwards: rfpAwardRecordsOf(entityId),
    trail: awardTrail(),
  });
  return refusal ? { ok: false, reason: awardCancelRefusalText(refusal) } : { ok: true };
});

// RFx D2 (NR-2 BR-08, AC-06) — an RFQ created from an RFP may not source an
// option an award in force on that RFP already placed; the other options pass.
// The rule is the one the RFP → RFQ pre-fill leaves such options out by.
bindPolicyHook(POLICY_HOOKS.RFQ_CREATE_RFP_OPTIONS_FREE, ({ payload }) => {
  const rfpId = typeof payload.sourceRfpId === 'string' ? payload.sourceRfpId.trim() : '';
  const refs = Array.isArray(payload.sourceRfpOptionRefs)
    ? (payload.sourceRfpOptionRefs as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  if (!rfpId || refs.length === 0) return { ok: true };
  const rfp = rfpEventStore.get(rfpId);
  const refusal = rfpOptionSourcedRefusal(
    refs,
    rfpAwardedOptionRefs(rfpAwardsOf(rfpId)),
    (awardId) => `awarded on ${rfp?.eventNumber ?? rfpId} (${awardId})`,
    rfp ? rfpRoundOptions(rfp) : [],
  );
  return refusal ? { ok: false, reason: awardRefusalText(refusal, 'rfp') } : { ok: true };
});

const incomingShipmentTarget: CommandTarget = {
  readState: (id) => incomingShipmentStore.get(id)?.lifecycle ?? null,
  readScopeOwner: (id) => incomingShipmentStore.get(id)?.supplierId ?? null,
  readEntity: (id) => incomingShipmentStore.get(id) ?? null,
  applyTransition: (id, toState) => {
    incomingShipmentStore.update(id, (s) => ({
      ...s,
      lifecycle: toState as ShipmentLifecycle,
    }));
  },
  // Membership = a collaborated material. The to-paragon ASN-ownership check is
  // the ISH_TOPARAGON_ASN_LINKED policy hook (it needs the ASN store); scope
  // here is the supplier × collaborated-material statement (spoof → owner≠scope).
  creationOwner: (payload) => {
    const sid = String(payload.supplierId);
    return collaboratedMaterial(sid, String(payload.materialCode)) ? sid : null;
  },
  create: (payload, toState) => {
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    const materialCode = str('materialCode');
    // CP-2 · B1 — master-owned, refused by name upstream (SDC_MATERIAL_KNOWN),
    // never defaulted: a PCS material stamped 'KG' poisons the coverage sum and
    // the fulfilment drawdown with no surface saying a unit was invented.
    const uom: Uom = requireUom(materialCode);
    const id = incomingShipmentStore.nextNumber();
    const shipment: IncomingShipment = {
      id,
      supplierId: str('supplierId'),
      materialCode,
      direction: str('direction') as ShipmentDirection,
      lifecycle: toState as ShipmentLifecycle, // 'Booked'
      // CP-0 · W1 · PR-2d — `Number.isFinite`, NOT `typeof === 'number'`.
      // `typeof NaN === 'number'` is true and `isEmpty(NaN)` is false, so a NaN
      // quantity passed `requiredFields` and was STORED — then rendered as a
      // tidy em-dash by `formatNumber`, and silently poisoned the coverage sum
      // and the fulfilment drawdown. Every surface upstream now refuses before
      // it can produce one; this closes the hole at the boundary itself, where
      // it cannot be reopened by a future caller.
      qty: Number.isFinite(payload.qty) ? (payload.qty as number) : 0,
      uom,
      ...(str('etd') ? { etd: str('etd') } : {}),
      ...(str('eta') ? { eta: str('eta') } : {}),
      ...(str('awb') ? { awb: str('awb') } : {}),
      ...(str('asnRef') ? { asnRef: str('asnRef') } : {}),
      provenance: PROV_SUPPLIER_SUBMIT,
    };
    incomingShipmentStore.add(shipment);
    return { entityId: id };
  },
};

// SDC-3a — the symmetric direction guards (direction ⟺ ASN linkage, 1:1).
// to-paragon MUST link a resolvable ASN that is the SUPPLIER'S OWN — converges
// on the ASN machine (link, never duplicate; design §2.3). A foreign ASN is a
// spoof; an unresolvable one is a dangling claim.
bindPolicyHook(POLICY_HOOKS.ISH_TOPARAGON_ASN_LINKED, ({ payload }) => {
  if (payload.direction !== 'to-paragon') return { ok: true };
  const ref = typeof payload.asnRef === 'string' ? payload.asnRef : '';
  if (!ref) return { ok: false, reason: 'to-paragon shipment must link an ASN (asnRef)' };
  const asn = asnStore.get(ref);
  if (!asn) return { ok: false, reason: `asnRef '${ref}' does not resolve to a known ASN` };
  if (asn.supplierId !== String(payload.supplierId)) {
    return { ok: false, reason: `asnRef '${ref}' belongs to another supplier` };
  }
  return { ok: true };
});

// principal-to-distributor must NOT carry an asnRef — Paragon is not the
// consignee, so no ASN exists for that leg (the symmetric half).
bindPolicyHook(POLICY_HOOKS.ISH_P2D_NO_ASN, ({ payload }) => {
  if (payload.direction !== 'principal-to-distributor') return { ok: true };
  return typeof payload.asnRef === 'string' && payload.asnRef
    ? { ok: false, reason: 'principal-to-distributor is not a Paragon-inbound leg — it carries no asnRef' }
    : { ok: true };
});

// principal-to-distributor is legal ONLY for a distributor relationship — a
// manufacturer has no principal leg to report (design §7).
bindPolicyHook(POLICY_HOOKS.ISH_P2D_DISTRIBUTOR_ONLY, ({ payload }) => {
  if (payload.direction !== 'principal-to-distributor') return { ok: true };
  const rel = relationshipFor(String(payload.supplierId), String(payload.materialCode));
  return rel?.supplierType === 'distributor'
    ? { ok: true }
    : {
        ok: false,
        reason: 'principal-to-distributor requires a distributor relationship — a manufacturer has no principal leg',
      };
});

// — Enforcement target (CP-3 · E2) — the governed check, and its ledger. ————————
//
// The entity IS the check, and it exists because `GOVERNED_CHECK_IDS` names it
// — there is nothing to create. So `readState` answers the single state for a
// known id and `null` for anything else, which makes an unknown check
// `NOT_FOUND` rather than a silently-minted one, and `create` is absent
// entirely.
//
// `readScopeOwner` is null: an enforcement setting is a BUYER governance record
// with no supplier owner, so a supplier scope is denied at SCOPE — before the
// role gate, and identically whether the check id is governed or invented.
//
// ⚠️ **THIS COMMENT USED TO SAY "stopped at the ROLE gate … which is where it
// belongs", AND THAT WAS THE LEAK DESCRIBED AS THE DESIGN.** Reaching the role
// gate meant the check id was in `GOVERNED_CHECK_IDS`; being denied at scope
// meant it was not. `enforcement:set` ∉ supplier remains true and still refuses
// — it is simply no longer the FIRST thing to refuse. A supplier deciding how
// hard its own compliance check bites would be the whole thesis inverted.
//
// `readEntity` hands the policy hook THE LEDGER FOR THIS CHECK, which is what
// the direction rule needs: "is this a loosening?" is a question about the last
// recorded act, and the hook must read it from the same place `settingInForce`
// will.
//
// `applyTransition` APPENDS and writes no state (statePreserving). `setAt` is
// minted HERE, from the clock, at the moment of the act — the `pinnedAt`
// discipline. The payload has already been through `enforcement_set_governed`
// (recognised mode, well-formed actor, review date below full rigour, named
// actor on a loosening), so the reads below cannot mint an ungoverned setting.
const enforcementTarget: CommandTarget = {
  readState: (id) => (isGovernedCheckId(id) ? 'Governed' : null),
  readScopeOwner: () => null,
  readEntity: (id) => enforcementSettingStore.forCheck(id),
  applyTransition: (id, _toState, payload) => {
    const mode = payload.mode as EnforcementMode;
    const setBy = asActorAttribution(payload.setBy)!;
    const setAt = sdcClock.now();
    const checkId = id as GovernedCheckId;
    enforcementSettingStore.append(
      mode === 'BLOCK'
        ? // At full rigour a review date is legal but optional — there is no
          //  relaxation whose lapse anyone need care about. Preserved when given,
          //  never invented.
          { checkId, setBy, setAt, mode, reviewBy: isReviewDay(payload.reviewBy) ? payload.reviewBy : null }
        : { checkId, setBy, setAt, mode, reviewBy: payload.reviewBy as string },
    );
  },
};

// — Role target (duplicate-and-narrow) — the parent system role, and its ledger.
//
// THE ENTITY IS THE PARENT. `entityId` IS the `SystemRoleId` being copied, so
// the entity commanded and the parent recorded cannot disagree — there is no
// `parent` payload field to disagree with it. `readState` answers the single
// state for a known role and `null` for anything else, which makes an unknown
// parent `NOT_FOUND` rather than a silently-minted one, and `create` is absent
// entirely. This is `enforcementTarget`, verb for verb (D3).
//
// `readScopeOwner` is null: a role definition is a BUYER governance record with
// no supplier owner, so a supplier scope is denied at SCOPE — identically for a
// real `SystemRoleId` and for a string that is not one. It used to be stopped at
// the ROLE gate instead, which made the refusal kind a membership test on the
// role vocabulary. `role:grant` ∉ supplier is still true and still refuses; it
// is no longer what refuses FIRST.
//
// `applyTransition` APPENDS and writes no state (statePreserving). `grantedAt`
// and `parentAtomsAtGrant` are minted HERE — the `pinnedAt` discipline. The
// baseline especially: a caller that could supply it could fake the drift check
// into silence, and drift-detection is the entire reason it is recorded.
// ── BL-50 · THE HUB'S WORKING CALENDAR ──────────────────────────────────────
// `entityId` IS the date. `readState` answers `Maintained` for any date the SAP
// load covers and null otherwise, so a date outside the loaded calendar is
// NOT_FOUND rather than a silently created ruling. Owner-less by construction:
// the calendar is PTI's, and `readScopeOwner: () => null` denies every supplier
// at SCOPE (§86) — which is the correct answer here, not a missing one.
// `applyTransition` APPENDS; `setAt` is stamped here, never read from the payload.
const workingCalendarTarget: CommandTarget = {
  readState: (id) => (calendarCovers(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => (calendarCovers(id) ? workingCalendarStore.rulings().filter((r) => r.date === id) : null),
  applyTransition: (id, _toState, payload) => {
    workingCalendarStore.append({
      date: id,
      kind: payload.kind as 'working' | 'non-working',
      reason: (payload.reason as string).trim(),
      setBy: asActorAttribution(payload.setBy)!,
      setAt: sdcClock.now(),
    });
  },
};

const roleTarget: CommandTarget = {
  readState: (id) => (isSystemRole(id) ? 'Defined' : null),
  readScopeOwner: () => null,
  readEntity: (id) => (isSystemRole(id) ? SYSTEM_ROLES[id] : null),
  applyTransition: (id, _toState, payload) => {
    const parent = id as SystemRoleId;
    customRoleStore.append({
      id: payload.roleId as string,
      parent,
      displayName: (payload.displayName as string).trim(),
      description: (payload.description as string).trim(),
      adds: [...(payload.adds as readonly string[])],
      // THE DRIFT BASELINE, never the resolution source (D1).
      parentAtomsAtGrant: [...SYSTEM_ROLES[parent]],
      grantedBy: asActorAttribution(payload.grantedBy)!,
      grantedAt: sdcClock.now(),
    });
  },
};

// ── BL-51 · THE ADMINISTRATOR'S 3PL LIST ─────────────────────────────────────
// `entityId` IS the 3PL id. `readState` answers `Maintained` for any well-formed
// 3PL id — setting one the list does not hold yet adds it — and null otherwise,
// so a malformed id is NOT_FOUND rather than a silently created row.
// Owner-less by construction: the list is PTI's, and `readScopeOwner: () =>
// null` denies every supplier at SCOPE (§86). `applyTransition` APPENDS; `setAt`
// is stamped here, never read from the payload.
const threePlTarget: CommandTarget = {
  readState: (id) => (THREE_PL_ID.test(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => (THREE_PL_ID.test(id) ? threePlStore.get(id) ?? null : null),
  applyTransition: (id, _toState, payload) => {
    const change = threePlChangeFrom(id, payload, sdcClock.now());
    // The policy hook has already refused every payload this could reject.
    if (change) threePlStore.append(change);
  },
};

// ── BL-32 · THE ADMINISTRATOR'S RULE VALUES ──────────────────────────────────
// `entityId` IS the setting key. `readState` answers `Maintained` for a key the
// registry defines, or a stale-period override of a supplier × material the hub
// actually assigns — and null otherwise, so an unknown key (or an override for a
// pair nobody supplies) is NOT_FOUND rather than a silently created setting.
// Owner-less by construction: the values are PTI's, and `readScopeOwner: () =>
// null` denies every supplier at SCOPE (§86). `applyTransition` APPENDS;
// `previous` and `setAt` are stamped by the store, never read from the payload.
const settingKeyExists = (id: string): boolean => {
  if (isHubSettingKey(id)) return true;
  const pair = parseStaleOverrideKey(id);
  return pair !== null && isAssignedMaterial(pair.supplierId, pair.materialCode);
};

// ── BL-32 · THE ADMINISTRATOR'S REASON CODES ────────────────────────────────
// `entityId` IS `<list>:<code>`. `readState` answers `Maintained` for a known
// list and a well-formed code — setting a code the list does not hold yet ADDS
// it — and null otherwise, so an unknown list is NOT_FOUND. Owner-less: the
// lists are PTI's, and every supplier is denied at SCOPE (§86). APPENDS only;
// there is no delete, so a retired code still labels the records that carry it.
const reasonCodeTarget: CommandTarget = {
  readState: (id) => (parseReasonCodeEntityId(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => {
    const p = parseReasonCodeEntityId(id);
    return p ? reasonCodeStore.get(p.list, p.code) ?? null : null;
  },
  applyTransition: (id, _toState, payload) => {
    const p = parseReasonCodeEntityId(id)!;
    reasonCodeStore.append({
      list: p.list,
      code: p.code,
      labelEn: String(payload.labelEn),
      labelId: String(payload.labelId),
      active: payload.active as boolean,
      setBy: asActorAttribution(payload.setBy)!,
      setAt: sdcClock.now(),
    });
  },
};

const hubSettingTarget: CommandTarget = {
  readState: (id) => (settingKeyExists(id) ? 'Maintained' : null),
  readScopeOwner: () => null,
  readEntity: (id) => (settingKeyExists(id) ? { key: id, value: settingValue(id) ?? null } : null),
  applyTransition: (id, _toState, payload) => {
    // The policy hook has already refused every payload this could reject; the
    // store re-checks anyway and records nothing it would refuse.
    hubSettingsStore.append({
      key: id,
      value: payload.value as number | boolean | null,
      setBy: asActorAttribution(payload.setBy)!,
      setAt: sdcClock.now(),
    });
  },
};


// ── §82 · SUPPLIER DOCUMENTS — the declaration and the review ────────────────
//
// ⚠️ **THIS IS THE FIRST WRITE PATH INTO THE DOCUMENT LANE, AND ITS ABSENCE WAS
// NOT A GAP — IT WAS A LIE.** `SupplierDocuments.tsx` shipped three upload
// affordances (a header primary, a per-row button, a drop zone) that all landed
// in a `submitUpload` which set a local boolean and fired a **success** toast:
// no dispatch, no store, no file. The `BuyerRequisitions` shape one lane over,
// with a drop zone that accepted a real file and discarded it unread.
//
// ⚠️ **`materialCodes` IS NOT WRITTEN HERE, AND THAT IS THE DESIGN.** A declared
// document carries the supplier's own `scopeText`; compliance assigns SAP
// material codes at verify. See `CertificateDeclaration.scopeText` for the
// measurement that decides it.
/**
 * The fixture convention for a field with nothing to state — `doc-006` carries
 * it on `fileType` / `fileSize` / `version`, and it is a different claim from
 * the empty string: '' reads as a value that was lost, this reads as a value
 * that does not exist yet. Named once so the two creation branches below cannot
 * drift onto different characters.
 */
const NOT_STATED = '—';

const CERT_TYPE_TO_CATEGORY: Record<CertType, SupplierDocumentCategory> = {
  HALAL_BPJPH: 'Halal Compliance',
  HALAL_MUI_LEGACY: 'Halal Compliance',
  HALAL_FOREIGN: 'Halal Compliance',
  BPOM: 'BPOM Regulatory',
  ISO: 'Quality',
  OTHER: 'Other',
};

/** The declaration assembled from a validated payload. The dispatcher has
 *  already proven every `DECLARATION_FIELDS` member is present and non-empty
 *  (`requiredFields`), so these are reads and not rescues — the one exception is
 *  `expiresOn`, which is legitimately absent for a permanent-validity cert and
 *  is therefore NOT a required field. */
function declarationFrom(
  payload: Record<string, unknown>,
  scope: QueryScope,
): CertificateDeclaration {
  const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string).trim() : '');
  const expires = str('expiresOn');
  return {
    certType: payload.certType as CertType,
    certNumber: str('certNumber'),
    issuer: str('issuer'),
    issuedOn: str('issuedOn'),
    // '' and absent both mean "this certificate has no expiry" — a BPJPH cert
    // has permanent validity under GR 42/2024, so `null` is the answer rather
    // than a missing one. Never guessed, never defaulted to a date.
    expiresOn: expires === '' ? null : expires,
    scopeText: str('scopeText'),
    // STORE-ASSIGNED, never payload-supplied — the `pinnedAt` discipline.
    declaredAt: sdcClock.now(),
    // FROM THE SESSION, never from the form (C10 §6.2). Today always
    // `UNATTRIBUTED: NO_PERSON_IN_SESSION`, which is a claim the platform is
    // entitled to make rather than a placeholder.
    declaredBy: scope.actor ?? NO_PERSON,
  };
}

const supplierDocumentTarget: CommandTarget = {
  readState: (id) => supplierDocumentStore.get(id)?.status ?? null,
  readScopeOwner: (id) => supplierDocumentStore.get(id)?.supplierId ?? null,
  readEntity: (id) => supplierDocumentStore.get(id) ?? null,
  applyTransition: (id, toState, payload, scope) => {
    supplierDocumentStore.update(id, (d) => ({
      ...d,
      status: toState as SupplierDocumentStatus,
      // A SUPPLY verb (`_submit`) restates the certificate's details; a REVIEW
      // verb (`_verify` / `_reject`) must not touch them. Branching on the
      // presence of a validated `certType` in the payload would be brittle, so
      // this branches on the DESTINATION — only the supply verbs land in
      // `Under Review`, and they are the only ones carrying a declaration.
      ...(toState === 'Under Review'
        ? (() => {
            const decl = declarationFrom(payload, scope);
            return {
              declaration: decl,
              // The denormalised display fields follow the declaration, so the
              // row a reader sees and the declaration behind it cannot disagree.
              //
              // ⚠️ **`name` JOINED THIS LIST IN WAVE E, AND ITS ABSENCE WAS
              // ALREADY A DEFECT ON THE SHIPPED PATH.** Every other display
              // field was replaced from the declaration and this one was not, so
              // a document that reached `Under Review` through `_submit` kept a
              // name describing whatever it used to be — the exact disagreement
              // the comment above says these lines exist to prevent. Wave E only
              // made it VISIBLE: a REQUESTED row is minted `NOT_STATED`, so
              // without this the certificate would still be called — after the
              // supplier had named it. `create` writes `decl.certNumber` for the
              // volunteered path; this is the same rule for the requested one.
              name: decl.certNumber,
              issuedBy: decl.issuer,
              issuedDate: decl.issuedOn,
              expiryDate: decl.expiresOn,
              linkedTo: decl.scopeText,
              category: CERT_TYPE_TO_CATEGORY[decl.certType],
            };
          })()
        : {}),
      // ⚠️ THE §80 REFUSAL TRIO, WRITTEN TOGETHER OR NOT AT ALL. `rejectionReason`
      // is a `requiredField` on the verb, so the dispatcher has already refused a
      // blank one — the surface cannot record an accusation with no reason, and
      // the timestamp and actor are minted here rather than accepted.
      ...(toState === 'Rejected'
        ? {
            rejectionReason: String(payload.rejectionReason).trim(),
            rejectedAt: sdcClock.now(),
            rejectedBy: scope.actor ?? NO_PERSON,
          }
        : {}),
    }));
  },
  // ⚠️ **`requireCreationOwner` IS THE HALF THE DECLARE PATH NEVER NEEDED, AND
  // THE REQUEST PATH CANNOT SHIP WITHOUT.** Until `t_supplierdoc_request` this
  // target served ONE creation, `_declare`, whose caller is always a SUPPLIER —
  // and the dispatcher's supplier branch already refuses any owner that is not
  // `scope.supplierId`, so an owner function that merely ECHOED the payload was
  // sufficient: the equality check did the resolving. A BUYER creation walks the
  // other branch (`dispatcher.ts:318`), where the ONLY thing standing between a
  // payload string and a minted row is this flag. Without it, `supplierId:
  // 'sup-999'` mints a document owned by a tenant that does not exist —
  // permanently in `Awaiting Upload`, permanently invisible to every seat,
  // counted in no queue anybody can reach. `requiredFields` refuses only ''.
  //
  // **A PAYLOAD ECHO IS NOT A RESOLUTION** (operator ruling, Wave E). The owner
  // is now resolved against the platform roster, which is what turns a payload
  // FIELD into a validated SELECTION — the C4b shape, `inventoryDeclarationTarget`
  // one target up, argued the same way and for the same reason.
  //
  // ⚠️ **AND IT IS INERT FOR `_declare`, WHICH IS PROVED RATHER THAN ASSERTED.**
  // A supplier scope never reaches the `requireCreationOwner` branch, and every
  // seat id is a roster id, so the resolution cannot narrow a supplier declaring
  // for itself. `supplierDocumentCreationOwner.test.ts` holds both directions;
  // the M3 mutation (restore the echo) is what shows the guard is not vacuous.
  requireCreationOwner: true,
  creationOwner: (payload) => {
    const sid = typeof payload.supplierId === 'string' ? payload.supplierId : '';
    return mockSuppliers.some((s) => s.id === sid) ? sid : null;
  },
  // ⚠️ **THE BRANCH IS ON `toState`, THE WAY `applyTransition` ABOVE BRANCHES,
  // AND FOR THE SAME REASON: TWO CREATION VERBS LAND HERE AND ONLY ONE OF THEM
  // CARRIES A DECLARATION.** `t_supplierdoc_declare` → `Under Review` with all
  // five `DECLARATION_FIELDS`; `t_supplierdoc_request` → `Awaiting Upload` with
  // `supplierId` + `category` and nothing else. Running `declarationFrom`
  // unconditionally — the shape this replaced — would have done three things,
  // each independently a defect:
  //
  //   1. minted `declaration: { certType: undefined, certNumber: '', … }` on a
  //      document NOBODY DECLARED. `BuyerCompliance`'s review queue and §80's
  //      `RefusalBlock` both branch on `doc.declaration` being present, so a
  //      requested row would take the has-a-declaration path and render labelled
  //      blanks — and `compliance.queue.noDeclaration`, the honest fallback
  //      written for exactly this case, could never fire.
  //   2. DISCARDED THE BUYER'S CHOSEN CATEGORY, overwriting it with
  //      `CERT_TYPE_TO_CATEGORY[undefined]`. The one field the buyer states
  //      would be the one field the store loses.
  //   3. written `name`/`issuedBy`/`linkedTo` as empty strings, which is not the
  //      same claim as — (this file's convention for "nothing to state").
  //
  // Operator ruling, Wave E. `supplierDocumentRequest.test.ts` asserts (1)
  // directly: the fallback FIRES on a requested row.
  create: (payload, toState, scope) => {
    const id = supplierDocumentStore.nextNumber();
    const supplierId = String(payload.supplierId);

    // ── THE BUYER'S ASK ──────────────────────────────────────────────────
    if (toState === 'Awaiting Upload') {
      // The buyer's own words for what is wanted and why, rendered to the
      // supplier VERBATIM — the `scopeText` shape facing the other way, and
      // `i18n-defer` for the same reason. Optional at the verb (the machine
      // requires `supplierId` + `category`); the SURFACE requires it, because a
      // demand with no stated reason fails the state-the-reason rule.
      const note = typeof payload.note === 'string' ? payload.note.trim() : '';
      supplierDocumentStore.add({
        id,
        supplierId,
        // ⚠️ NOTHING HAS BEEN NAMED YET, AND THE ROW SAYS SO. A request opens a
        // SLOT; the supplier names the certificate when it declares, at which
        // point `applyTransition` writes the number in. Composing a name here
        // would mint English into a store both locales read (§82) and would be
        // a claim about a document that does not exist.
        name: NOT_STATED,
        // THE ONE FIELD THE BUYER STATES, KEPT. The dispatcher has already
        // proven it non-empty (`requiredFields`); the union keeps it honest.
        category: payload.category as SupplierDocumentCategory,
        status: toState as SupplierDocumentStatus,
        issuedBy: NOT_STATED,
        issuedDate: '',
        expiryDate: null,
        fileType: NOT_STATED,
        fileSize: NOT_STATED,
        version: NOT_STATED,
        // The ask's scope IS its category — the only scope that exists before
        // the supplier answers. `SupplierDocuments`' awaiting-upload banner
        // joins this field across rows, so — there would render as noise where
        // a true statement fits.
        linkedTo: payload.category as SupplierDocumentCategory,
        // Absent rather than blank: `notes` is optional and the surface renders
        // it conditionally, so an empty string would draw an empty warning line.
        ...(note === '' ? {} : { notes: note }),
      });
      return { entityId: id };
    }

    // ── THE SUPPLIER'S VOLUNTEERED DECLARATION (§82, unchanged) ───────────
    const decl = declarationFrom(payload, scope);
    supplierDocumentStore.add({
      id,
      supplierId,
      // ⚠️ **THE NAME IS THE CERTIFICATE NUMBER, NOT A COMPOSED SENTENCE.** The
      // seeded rows carry authored prose names ("Halal Certificate — MUI No. …")
      // and composing one here would mean minting ENGLISH inside a store that
      // both locales read. The scheme is in `declaration.certType`, which every
      // surface renders through its own i18n label — so the label is correct in
      // Indonesian without the store knowing there is such a thing as a locale.
      name: decl.certNumber,
      category: CERT_TYPE_TO_CATEGORY[decl.certType],
      status: toState as SupplierDocumentStatus,
      issuedBy: decl.issuer,
      issuedDate: decl.issuedOn,
      expiryDate: decl.expiresOn,
      // The fixture convention for "no file" (doc-006 carries the same), and
      // here it is the literal truth for every declared row: nothing was
      // transmitted, so there is no type and no size to state.
      fileType: NOT_STATED,
      fileSize: NOT_STATED,
      version: 'v1',
      linkedTo: decl.scopeText,
      declaration: decl,
    });
    return { entityId: id };
  },
};

/**
 * The applicant's declared documents, read from a payload the verb has already
 * proven well-formed (`APPLICATION_DECLARATIONS_WELL_FORMED`).
 *
 * ⚠️ **NO FILTER AND NO FALLBACK, DELIBERATELY.** The guard runs first and
 * refuses the whole command on any malformed entry, so a filter here would be
 * this function admitting it does not trust the guard standing in front of it —
 * and a filter is exactly how a silent subtraction gets in. An ABSENT key is a
 * different thing from a malformed one and yields the honest empty list.
 */
function readDeclarations(
  payload: Record<string, unknown>,
): readonly SupplierApplicationDeclaration[] {
  const raw = payload.declarations;
  if (!Array.isArray(raw)) return [];
  return raw.map((d) => {
    const { kind, reference } = d as SupplierApplicationDeclaration;
    return { kind, reference: reference.trim() };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// B1 · SUPPLIER APPLICATION — the record behind becoming a supplier.
//
// ⚠️ **THIS TARGET SHIPS IN THE SAME COMMIT AS ITS FLOW, BY RULING.** The
// target-less set (`getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`) is a real
// population with six members today, and every one of them is a machine whose
// verbs cannot fire. A seventh — even for one merge — would be a lane that
// LOOKS built on `/buyer/process-flows` and refuses everything.
// ────────────────────────────────────────────────────────────────────────────
const supplierApplicationTarget: CommandTarget = {
  readState: (id) => supplierApplicationStore.get(id)?.status ?? null,
  // ⚠️ **NULL ALWAYS — AN APPLICANT IS NOT A TENANT.** This is the
  // `purchaseRequisitionTarget` shape (`readScopeOwner: () => null`): a
  // buyer-side collection every buyer seat reads as one queue. An application
  // has no `supplierId` to scope by — the type says `null` literally — and an
  // Internal SR's `resolvedSupplierId` is deliberately NOT read here: it says
  // which supplier the application is ABOUT, and returning it would make the
  // application visible to the supplier it names, which is not a thing this
  // models.
  readScopeOwner: () => null,
  readEntity: (id) => supplierApplicationStore.get(id) ?? null,
  // ⚠️ **`toState` IS THE ONLY DISCRIMINATOR AVAILABLE — `applyTransition`
  // RECEIVES NO transitionId — AND ON THIS FLOW IT IS SUFFICIENT, WHICH IS A
  // FACT ABOUT THE MACHINE AND NOT A CONVENTION.** Each of the three states
  // written below has exactly ONE inbound edge (`Under Review` ←
  // t_application_start_review, `Approved` ← t_application_approve, `Rejected`
  // ← t_application_reject); `Submitted` is reached only through `create`.
  // Derive it from `supplierApplication.flow.ts` before adding a fourth: a
  // state that gains a second inbound edge makes one of these writes fire on
  // the wrong verb, silently.
  applyTransition: (id, toState, payload, scope) => {
    supplierApplicationStore.update(id, (a) => ({
      ...a,
      status: toState as SupplierApplicationStatus,
      // Picking it up is a fact with a time. `null` until then, never a
      // guessed date — the queue's whole question is who has not started.
      ...(toState === 'Under Review' ? { reviewStartedAt: sdcClock.now() } : {}),
      // ⚠️ **WHO DECIDED, FROM THE SESSION AND NEVER FROM `payload`** (C10
      // §6.2, the shape `PR_APPROVAL_ATTRIBUTED` established). Today it is
      // always `UNATTRIBUTED: NO_PERSON_IN_SESSION`, which is the honest
      // absence a name-shaped payload field could never be.
      ...(toState === 'Approved'
        ? { decidedAt: sdcClock.now(), decidedBy: scope.actor ?? NO_PERSON }
        : {}),
      // The refusal trio, written together or not at all. `rejectionReason` is
      // a `requiredField` AND is proven non-blank by
      // `APPLICATION_REFUSAL_AUTHORED` before this runs — so no re-check and no
      // fallback: a fallback here would be the write admitting it does not
      // trust the guard standing in front of it.
      ...(toState === 'Rejected'
        ? {
            decidedAt: sdcClock.now(),
            decidedBy: scope.actor ?? NO_PERSON,
            rejectionReason: String(payload.rejectionReason).trim(),
          }
        : {}),
    }));
  },
  // ── ⚠️ THE VENDOR RESOLUTION. A PAYLOAD ECHO IS NOT A RESOLUTION ──────────
  //
  // The #284 shape: `s4Vendor` is matched against the platform roster, and an
  // unknown one resolves to `null`. This is the ONE resolver — the policy hook
  // `APPLICATION_INTERNAL_VENDOR_RESOLVED` calls THIS function through
  // `ctx.target` rather than re-implementing the lookup, so there is no second
  // copy to drift and the roster stays in the layer that owns it.
  //
  // ⚠️ **`requireCreationOwner` IS DELIBERATELY NOT SET, AND THAT IS MEASURED
  // RATHER THAN PREFERRED.** The flag is per-TARGET and all-or-nothing: the
  // dispatcher refuses ANY buyer creation whose owner is null. Two of the three
  // request types name no existing vendor BY DEFINITION, so their owner is
  // legitimately null — the flag would refuse every External SR and every KOL,
  // which is the majority of the population and the entire point of the lane.
  // What the flag exists to prevent is preserved at the hook instead, where a
  // conditional obligation can be expressed; what would be LOST by setting it
  // is the lane.
  //
  // ⚠️ **AND IT IS WHY A SUPPLIER SEAT'S REFUSAL IS THE ROLE GATE'S, NOT
  // SCOPE'S, ON ONE PATH.** The dispatcher's supplier branch admits a creation
  // whose owner equals the caller's own id — so a supplier seat naming ITSELF
  // in an extension request clears creation-scope and is then refused at the
  // role gate, because no supplier lane holds `application:submit`. Every other
  // path refuses at scope. Both refusals are real, both are asserted by name,
  // and the ATOM is the guarantee — a comment would not be.
  creationOwner: (payload) => {
    if (payload.requestType !== VENDOR_BEARING_REQUEST_TYPE) return null;
    const stated = typeof payload.s4Vendor === 'string' ? payload.s4Vendor.trim() : '';
    if (stated === '') return null;
    const match = mockSuppliers.find(
      (s) => s.sapBpNumber === stated || s.id === stated,
    );
    return match ? match.id : null;
  },
  create: (payload, toState, scope) => {
    const id = supplierApplicationStore.nextId();
    const str = (k: string) => (typeof payload[k] === 'string' ? (payload[k] as string) : '');
    // Proven a permitted member by `APPLICATION_REQUEST_TYPE_KNOWN` before this
    // runs, so it is read rather than re-validated.
    const requestType = str('requestType');
    const s4Vendor = str('s4Vendor').trim();
    supplierApplicationStore.add({
      id,
      applicationNumber: supplierApplicationStore.numberFor(id),
      requestType,
      status: toState as SupplierApplicationStatus,
      companyName: str('companyName'),
      // The literal `null` the type demands. See `types.ts`: an applicant is
      // not a tenant, and this field can never hold anything else.
      supplierId: null,
      // Resolved, never echoed — the same function the hook proved non-null for
      // a vendor-bearing request, so the two cannot disagree.
      resolvedSupplierId: supplierApplicationTarget.creationOwner?.(payload) ?? null,
      // What the caller SAID, kept beside what it resolved to. `null` rather
      // than `''` when absent: an empty string reads as "they typed nothing",
      // and for the two vendor-free request types nobody was ever asked.
      s4Vendor: s4Vendor === '' ? null : s4Vendor,
      declarations: readDeclarations(payload),
      submittedAt: sdcClock.now(),
      submittedBy: scope.actor ?? NO_PERSON,
      reviewStartedAt: null,
      decidedAt: null,
      decidedBy: null,
      rejectionReason: null,
    });
    return { entityId: id };
  },
};

const TARGETS: Record<string, CommandTarget> = {
  purchaseOrder: purchaseOrderTarget,
  advanceShipNotice: advanceShipNoticeTarget,
  goodsReceipt: goodsReceiptTarget,
  invoice: invoiceTarget,
  rfq: rfqTarget,
  quotation: quotationTarget,
  // RFx spec 2026-09-21 — each ships in the same commit as its flow.
  rfqIntent: rfqIntentTarget,
  rfqConfidentiality: rfqConfidentialityTarget,
  rfqClarification: rfqClarificationTarget,
  purchaseRequisition: purchaseRequisitionTarget,
  requirementResponse: requirementResponseTarget,
  inventoryDeclaration: inventoryDeclarationTarget,
  incomingShipment: incomingShipmentTarget,
  // CP-3 · E2 — the enforcement-setting recording verb. Wired so every recorded
  // relaxation lands in the DR-10 trail; NO GATE READS THE SETTING YET (E3).
  enforcement: enforcementTarget,
  // Duplicate-and-narrow — the privilege-grant recording verb. Wired so every
  // grant lands in the DR-10 trail: a role edit outside the dispatcher would be
  // the only privilege-granting act in the platform with no TransitionEvent.
  role: roleTarget,
  // BL-50 — the hub's working calendar. Wired so every ruling lands in the
  // DR-10 trail: a ruling moves every deadline in the hub, and "who made this
  // day a holiday, when, and why" is exactly what an audit asks.
  workingCalendar: workingCalendarTarget,
  // BL-51 — the 3PL list. Wired so every change to where a tracking link points
  // lands in the DR-10 trail with who made it and when.
  threePl: threePlTarget,
  // Material A1 — a supplier's stock update mode (MR-1 BR-02, AC-06).
  supplierOverlay: supplierOverlayTarget,
  // Material C4 — who each SAP MRP controller code is (MR-5 BR-02).
  mrpController: mrpControllerTarget,
  // BL-32 — the rule values. Wired so every change to a tolerance, deadline,
  // threshold or stale period — and every reset — lands in the DR-10 trail.
  hubSetting: hubSettingTarget,
  // BL-32 — the reason lists. Wired so every add, rename and retirement lands in
  // the DR-10 trail.
  reasonCode: reasonCodeTarget,
  // §82 — the document lane's first write path: the supplier's declaration and
  // compliance's review of it.
  supplierDocument: supplierDocumentTarget,
  // B1 — the onboarding lane's write path. Ships in the same commit as its
  // flow so the entity never joins the target-less set, not even for one merge.
  supplierApplication: supplierApplicationTarget,
  // REQ-E07-06 — the supplier's answer to a receipt discrepancy. Ships in the
  // same commit as its flow, so the entity never joins the target-less set.
  receiptDiscrepancy: receiptDiscrepancyTarget,
  // REQ-E09-03 — call-offs under an umbrella PO; the hub is their record.
  callOff: callOffTarget,
  // REQ-E08-02 to REQ-E08-05 — inventory & capacity collaboration.
  stockSync: stockSyncTarget,
  stockAccess: stockAccessTarget,
  capacitySubmission: capacityTarget,
  inventoryAlert: inventoryAlertTarget,
  // REQ-E06-01 / REQ-E06-03 — forecast versions and supplier views.
  forecastVersion: forecastVersionTarget,
  forecastView: forecastViewTarget,
  // REQ-E14-13 BR-07 — a reschedule proposal taken to SAP (ENG-D16).
  sapChangeMark: sapChangeMarkTarget,
  // REQ-E03-02 / REQ-E03-04 / REQ-E03-05 — the RFx event types, the answers to
  // them, and the negotiation window. Each ships in the same commit as its flow,
  // so no entity joins the target-less set even for one merge.
  rfiEvent: rfiEventTarget,
  rfiResponse: rfiResponseTarget,
  rfpEvent: rfpEventTarget,
  rfpResponse: rfpResponseTarget,
  negotiationRound: negotiationRoundTarget,
  // NR-2 (D-1) — the firm-offer round on an RFP and the supplier's firm offer.
  rfpOfferRound: rfpOfferRoundTarget,
  rfpFirmOffer: rfpFirmOfferTarget,
};

// The behavior-wiring census (was the contract package's "6"; 7 with the G1.1
// PR intake target; 8 with the SDC-2a RequirementResponse spine; now 10 with
// the SDC-3a InventoryDeclaration + IncomingShipment targets) — the
// entity keys that actually dispatch through a wired
// CommandTarget. Exported as the ONE runtime
// source of truth the LivenessRegistry (F0.6) reads: it derives liveness from
// THESE keys, so an honest-render marker cannot drift from what the command spine
// really wires. Unwire a target here and its capability flips to SIMULATED with
// no edit in the registry (honest-by-construction). Frozen: read-only census.
export const WIRED_COMMAND_TARGETS: readonly string[] = Object.freeze(
  Object.keys(TARGETS),
);

/**
 * One wired `CommandTarget` by entity key — the objects `WIRED_COMMAND_TARGETS`
 * names.
 *
 * ⚠️ **EXPORTED SO A GATE CAN DERIVE A POPULATION FROM THE TARGET'S OWN
 * CONTRACT RATHER THAN FROM THE DISPATCHER PREDICATE THAT CONSUMES IT, AND THE
 * REASON IS A MEASURED FAILURE.** `ownerlessScope.test.ts` first derived
 * "which targets are owner-less?" behaviourally — by asking which supplier ids
 * clear the dispatcher's scope gate. That reads correctly against the shipped
 * tree and is USELESS AS A GATE: mutate the predicate under test and the
 * derived population collapses to empty, so the suite goes red on its own
 * population control while **the assertion it exists to make never runs**. The
 * mutant is "killed", the kill proves nothing, and the counter says the gate
 * works. `EMPTY-INPUT-REPORTS-CLEAN-01` arriving through the population instead
 * of through the input.
 *
 * A target's `readScopeOwner` is upstream of every dispatcher predicate, so a
 * population derived from it survives any mutation of the code being probed.
 * That is the whole point of the export; it is not a general-purpose handle on
 * the store layer.
 */
export const commandTargetFor = (entity: string): CommandTarget | undefined =>
  TARGETS[entity];

// Cross-entity cascade (census G4): a GR mismatch disposition (reject / partial
// approve) raises a discrepancy on the linked ASN. The registry (cascades.ts)
// declares WHICH verb; the mock resolves WHICH ASN id (the GR's own asnNumber).
// Best-effort — a GR whose ASN is absent or not in a cascadable state no-ops.
const resolveCascades = (ctx: CascadeContext): CascadeCommand[] => {
  if (ctx.entity === 'goodsReceipt') {
    const gr = goodsReceiptStore.get(ctx.entityId);
    if (!gr) return [];
    // GR-post → invoice-match (F0.2, census G4 — closes INV-GR-OVERLAY-01). Fires
    // at the `submitted` moment (B), reusing this one dispatch-time cascade path.
    // For each Submitted invoice sharing the GR's PO, compute the honest 3-way
    // verdict from real PO×GR×invoice data, WRITE the computed matchStatus, and
    // fan out the header t_invoice_match ONLY when the verdict is a genuine
    // 'Matched'. A Qty Mismatch / Price Variance writes that truthful verdict and
    // does NOT advance the header — the invoice stays Submitted (an honest no-op,
    // not a defect). The matchStatus WRITE here is a resolver side-effect and a
    // KNOWN DEFERRAL: its true home is a computed read-projection (DR-7 ruling 1)
    // at A2, where this same `deriveMatchVerdict` is called from the read layer.
    if (ctx.transitionId === 't_gr_post') {
      const [link] = cascadesFor(ctx.transitionId);
      const po = findPoByNumber(gr.poNumber);
      if (!link || !po) return [];
      const expectedValue = po.lineItems.reduce(
        (sum, li) => sum + li.confirmedQty * li.unitPrice,
        0,
      );
      const grHasRejects = gr.inspectionResults.some((r) => r.qtyRejected > 0);
      // CR-12 (BL-44) — a lineless invoice's difference is not split by line,
      // so the order's strictest rule applies: 0% when any PO line carries a
      // contract price, else 2% within the rupiah cap.
      const priceRule = po.lineItems.some((li) => li.contractNumber) ? 'contract' : 'standard';
      const cmds: CascadeCommand[] = [];
      // ⚠️ **THE PAIRING, NAMED.** This was an inline `continue` clause reading
      // `inv.poNumber !== gr.poNumber || inv.status !== 'Submitted'`. It IS the
      // PO×state relation between a receipt and an invoice, and while it lived
      // here it could only be asked in this one direction — which is why an
      // invoice arriving AFTER its receipt is matched by nothing. Same predicate,
      // same rows, now named in `invoiceRollup.ts` so the mirror is askable and
      // testable. `invoiceMatchPairing.test.ts` pins that this direction is
      // byte-for-byte the behaviour it replaced.
      // REQ-E07-07 — an invoice drawn from receipts is matched at its own
      // submission against the receipts it names (below), so a later receipt
      // on the same PO does not overwrite that verdict. Only invoices without
      // lines are still matched here.
      for (const inv of invoicesForReceipt(gr, invoiceStore.all()).filter((i) => !i.lines)) {
        const verdict = deriveMatchVerdict(expectedValue, inv.amount, grHasRejects, priceRule);
        invoiceStore.update(inv.id, (i) => ({ ...i, matchStatus: verdict }));
        if (verdict === 'Matched') {
          cmds.push({
            entity: link.targetEntity,
            entityId: inv.id,
            transitionId: link.targetTransitionId,
          });
        }
      }
      return cmds;
    }
    // GR mismatch disposition (reject / partial approve) → ASN discrepancy (batch ii).
    return cascadesFor(ctx.transitionId).map((link) => ({
      entity: link.targetEntity,
      entityId: gr.asnNumber,
      transitionId: link.targetTransitionId,
    }));
  }
  // REQ-E07-07 — the match runs when the supplier submits (or corrects and
  // resubmits) a receipt-based invoice, and when Finance sends a returned one
  // back for checking: CR-13 then CR-12 on the receipts the invoice names. The
  // verdict is written; the header advances only on a clean Matched, exactly as
  // on the receipt-post path.
  if (ctx.entity === 'invoice') {
    const inv = invoiceStore.get(ctx.entityId);
    if (!inv || !inv.lines || inv.status !== INVOICE_AWAITING_MATCH) return [];
    const verdict = deriveInvoiceVerdict(inv, goodsReceiptStore.all());
    invoiceStore.update(inv.id, (i) => ({ ...i, matchStatus: verdict }));
    if (verdict !== 'Matched') return [];
    return cascadesFor(ctx.transitionId).map((link) => ({
      entity: link.targetEntity,
      entityId: inv.id,
      transitionId: link.targetTransitionId,
    }));
  }
  // RFQ award fan-out (batch iv): split the RFQ's quotation siblings across the
  // two declared links — the winner (from the award payload) is awarded, every
  // OTHER sibling is rejected. Best-effort: a sibling already terminal simply
  // no-ops (illegal transition), never breaking the source award.
  if (ctx.entity === 'rfq') {
    // ── C.1 · RFQ raised → the approved PR it came from enters Sourcing Event ──
    // ⚠️ **THE COMMON PATH IS THE NEGATIVE ONE, AND IT IS HANDLED FIRST FOR THAT
    // REASON.** Most RFQs are not raised from a requisition, so most raises reach
    // this branch and return NOTHING. A zero-cascade result here is the ordinary
    // outcome, not a swallowed failure — nothing was asked, so nothing is
    // recorded, and there is no silence to explain.
    //
    // ⚠️ **THE EXISTENCE CHECK IS LOAD-BEARING AND IS NOT A BELT-AND-BRACES
    // RE-CHECK.** `dispatch` refuses an absent entity by THROWING
    // (`DataError('NOT_FOUND')`), and the fan-out re-dispatches inside a
    // `catch {}` — so an id naming no PR is the ONE cascade failure in this
    // system that leaves ZERO record: no event, no reason, no correlation.
    // Measured, not inherited: the role gate and the legality gate both RETURN
    // `status:'failed'` and DO emit (with `reason` + the source's causationId),
    // so they are recorded and need nothing here. Only the absent-entity path is
    // traceless, and returning `[]` means it is never entered. Same shape as the
    // GR branch above (`if (!gr) return []`) — a resolver hands the dispatcher
    // an id it has confirmed, or it hands it nothing.
    if (ctx.transitionId === 't_rfq_create') {
      const prId =
        typeof ctx.payload.sourceRequisitionId === 'string'
          ? ctx.payload.sourceRequisitionId
          : '';
      if (!prId || !purchaseRequisitionStore.get(prId)) return [];
      // The PR's state is NOT checked here. `t_pr_source` is `from: ['Approved']`,
      // so a PR in any other state is refused by the dispatcher's legality gate —
      // which RECORDS the refusal with its reason. Pre-filtering on state would
      // move that decision somewhere nothing writes it down, trading a recorded
      // refusal for a silent one. The machine owns legality; the resolver owns
      // identity.
      return cascadesFor(ctx.transitionId).map((link) => ({
        entity: link.targetEntity,
        entityId: prId,
        transitionId: link.targetTransitionId,
        // `ctx.entityId` is the newly-minted RFQ number (creation sets
        // `result.entityId`), and it is the value the PR displays as its linked
        // document. Passed as payload rather than re-derived in the target,
        // because the target cannot see which RFQ fired it.
        payload: { linkedRfq: ctx.entityId },
      }));
    }
    // ── RFx C2 (AR-06) · an award cancel reinstates the quotes it decided ──
    // The cancellation is already appended, so `rfqAwardsOf` reads only the
    // awards still in force. Reinstated: (1) every quote the cancelled award
    // named that no award in force still names — the award cascade made them
    // Awarded; (2) every Rejected quote of the event. Only a FINAL award
    // rejects (C1), and after a cancel the event is never Awarded, so no award
    // in force is final and no rejection it made still stands. Legality is the
    // machine's: a named quote in any other state is refused and recorded.
    if (ctx.transitionId === 't_rfq_award_cancel' || ctx.transitionId === 't_rfq_award_cancel_partial') {
      const cancelled = awardStore.get(typeof ctx.payload.awardId === 'string' ? ctx.payload.awardId : '');
      // The RFQ cascade reverses an RFQ award only (an RFP award has none).
      if (!cancelled || cancelled.eventType !== 'rfq') return [];
      const stillNamed = new Set(rfqAwardsOf(ctx.entityId).flatMap((a) => a.lines.map((l) => l.quotationId)));
      const named = new Set(cancelled.lines.map((l) => l.quotationId).filter((q) => !stillNamed.has(q)));
      const siblings = quotationStore.forRfq(ctx.entityId);
      const ids = siblings.filter((q) => named.has(q.id) || q.status === 'Rejected').map((q) => q.id);
      return cascadesFor(ctx.transitionId).flatMap((link) =>
        ids.map((entityId) => ({ entity: link.targetEntity, entityId, transitionId: link.targetTransitionId })),
      );
    }
    if (ctx.transitionId !== 't_rfq_award' && ctx.transitionId !== 't_rfq_award_partial') return [];
    const winnerId =
      typeof ctx.payload.awardedQuotationId === 'string' ? ctx.payload.awardedQuotationId : '';
    // BL-37 — A SPLIT HAS SEVERAL WINNERS. Every quotation an award line names
    // is awarded, not only the principal one: before this, a 70/30 split marked
    // the 30% supplier's quote Rejected while the award record said it won.
    // RFx C3 — when the payload carries its lines, THE LINES are the winners.
    // A final award with no lines ("Will not award the rest") names the
    // principal of an earlier award only to fill the verb's required fields;
    // it awards nobody, and its rejection half still runs below.
    const winnerIds = new Set(
      Array.isArray(ctx.payload.awardLines)
        ? (ctx.payload.awardLines as { quotationId?: unknown }[])
            .map((l) => l?.quotationId)
            .filter((x): x is string => typeof x === 'string')
        : [winnerId],
    );
    // RFx C1 — a quote an EARLIER (partial) award of this event named is a
    // winner too, so the final award never rejects it. Read from the store: the
    // award records are the event's history, the payload only this award's.
    const namedByAnyAward = new Set([
      ...winnerIds,
      ...rfqAwardsOf(ctx.entityId).flatMap((a) => a.lines.map((l) => l.quotationId)),
    ]);
    const siblings = quotationStore.forRfq(ctx.entityId);
    const cmds: CascadeCommand[] = [];
    for (const link of cascadesFor(ctx.transitionId)) {
      if (link.targetTransitionId === 't_quotation_award') {
        // A quote an earlier partial award already made Awarded is skipped.
        for (const winner of siblings.filter((q) => winnerIds.has(q.id) && q.status !== 'Awarded')) {
          cmds.push({ entity: link.targetEntity, entityId: winner.id, transitionId: link.targetTransitionId });
        }
      } else {
        for (const q of siblings) {
          if (!namedByAnyAward.has(q.id)) {
            cmds.push({ entity: link.targetEntity, entityId: q.id, transitionId: link.targetTransitionId });
          }
        }
      }
    }
    return cmds;
  }
  return [];
};

// SAP-boundary settlement finalize (Step 3.5, Option B): when a submitted
// `t_gr_post` settles, advance interim 'Posting to SAP' → 'Posted to SAP' and
// assign the REAL material document — minted HERE, on settle only, never
// fabricated client-side (closes GR-FABRICATION-01).
const settleFinalize = (ctx: SettleContext): void => {
  if (ctx.entity === 'goodsReceipt' && ctx.transitionId === 't_gr_post') {
    goodsReceiptStore.update(ctx.entityId, (g) => ({
      ...g,
      status: 'Posted to SAP',
      sapMaterialDoc: goodsReceiptStore.nextMatDoc(),
    }));
  }
  // Invoice payment (Option B): a settled `t_invoice_release_payment` advances
  // the interim 'Releasing Payment' → 'Payment Released' and assigns the REAL FI
  // document + payment reference + date — minted HERE, on settle only, never
  // fabricated client-side (no "paid" claim before it is true, law 0.6).
  if (ctx.entity === 'invoice' && ctx.transitionId === 't_invoice_release_payment') {
    invoiceStore.update(ctx.entityId, (inv) => ({
      ...inv,
      status: 'Payment Released',
      sapFiDoc: inv.sapFiDoc ?? invoiceStore.nextFiDoc(),
      paymentRef: inv.paymentRef ?? invoiceStore.nextPaymentRef(),
      paymentDate: inv.paymentDate ?? sdcClock.now().slice(0, 10),
    }));
  }
};

// Process-wide audit sink + monotonic correlation ids (deterministic for tests).
export const commandAuditSink = new InMemoryAuditSink();
let seq = 0;

const dispatcher = createDispatcher({
  // ── ⚠️ THE WILDCARD RETIREMENT, AND IT IS THIS ONE LINE ────────────────────
  //
  // WAS: `(scope) => rolesForPersona(scope.personaType)`. `PersonaType` is
  // `'buyer' | 'supplier'`, so EVERY buyer session resolved to all 48 buyer
  // atoms unconditionally — award, post-to-SAP, release-payment and
  // enforcement-mode-setting held by one undifferentiated seat. That
  // persona-wide grant WAS the wildcard: there is no literal `buyer:all` in the
  // role path (it is the DR-10 audit ACTOR string, `events.ts:actorKey`, and a
  // `requiredRole` on 0 of 91 transitions) and the gate is a plain
  // `Array.includes` with no short-circuit. The wildcard was the SHAPE of the
  // grant, not a token in it.
  //
  // ⚠️ **AND THERE IS DELIBERATELY NO PERSONA FALLBACK.** A scope without roles
  // resolves to NOTHING and is refused `ROLE_NOT_PERMITTED`. Falling back to
  // the persona span would re-grant all 48 atoms to every caller that had not
  // been migrated yet — the wildcard surviving as a default, which is a
  // wildcard with better manners. A refusal is loud, attributable to a named
  // atom, and impossible to mistake for a working narrow grant.
  //
  // ⚠️ **`atomsForSeat`, NOT `atomsFor` — AND THE DIFFERENCE IS A SILENT ZERO.**
  // `atomsFor` knows the SYSTEM vocabulary and contributes NOTHING for an id it
  // does not recognise. A seat holding a custom role would therefore resolve to
  // an EMPTY atom set and be refused `ROLE_NOT_PERMITTED` on every act, with
  // nothing anywhere to say the role existed. `atomsForSeat` composes the
  // session's granted roles on top; `businessRoles.test.ts` pins that no other
  // seat-resolution site still reads the narrower function.
  resolveRoles: (scope) => atomsForSeat(scope.businessRoles ?? []),
  target: (entity) => TARGETS[entity],
  resolvePolicyHook,
  sink: commandAuditSink,
  nextCorrelationId: () => `cmd_${(++seq).toString(36).padStart(4, '0')}`,
  now: () => new Date().toISOString(),
  cascade: resolveCascades,
  settleFinalize,
});

/**
 * Settle a `submitted` command to `done` (Step 3.5 SAP settlement hook).
 * Now `(scope, correlationId)` — it is `dispatcher.settle` by reference, so it
 * carries the gate. **Derived: it has zero consumers** (`grep settleCommand`
 * returns only this line), so the arity change costs nothing; it is kept
 * because deleting an unused export is a different batch's call, not this
 * batch's rider.
 */
export const settleCommand = dispatcher.settle;

export class MockCommandService implements ICommandService {
  async dispatch(
    scope: QueryScope,
    input: CommandInput,
    causationId?: string,
  ): Promise<CommandResult> {
    // SDC-3a — forward the session anchor (commands 2..n of a SubmissionSession)
    // so every event this dispatch emits groups to the first command's
    // correlationId (DR-10). The dispatcher has always accepted this third arg
    // (cascades use it); this exposes it on the public seam.
    const result = await dispatcher.dispatch(scope, input, causationId);
    // REQ-E08-05 BR-05 — only a command changes the figures an alert reads, so
    // after one lands, record which closed alerts' conditions have cleared.
    if (result.status !== 'failed') observeAlertConditions();
    return result;
  }

  // ── THE TWO UNDERSCORES ARE GONE, AND THEY WERE THE HONEST MARKER OF THE
  //    DEFECT RATHER THAN THE DEFECT ITSELF ────────────────────────────────
  // `_scope` said truthfully "this implementation drops the scope". It dropped
  // it because `Dispatcher` had nowhere to put it — the interface beneath took
  // no scope at all, so nothing could have been forwarded. `ICommandService`
  // has always handed both methods a `QueryScope`; the seam an SE team reads
  // was right the whole time and is untouched by this batch.
  async getCommandStatus(
    scope: QueryScope,
    correlationId: string,
  ): Promise<CommandStatus | null> {
    return dispatcher.getCommandStatus(scope, correlationId);
  }

  async settle(scope: QueryScope, correlationId: string): Promise<CommandStatus | null> {
    return dispatcher.settle(scope, correlationId);
  }
}
