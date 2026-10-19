// ────────────────────────────────────────────────────────────────────────────
// THE OWNER-LESS EXISTENCE ORACLE — closed, and held closed by derivation.
//
// ⚠️ **THE DEFECT, IN ONE SENTENCE: THE REFUSAL *KIND* WAS AN EXISTENCE
// ORACLE.** The dispatcher's supplier scope gate read
// `owner !== null && owner !== scope.supplierId`. On a target whose
// `readScopeOwner` returns `null` BY CONSTRUCTION — a buyer-governance
// collection with no supplier owner — that clause could never be true, so a
// supplier scope fell THROUGH scope to the role gate and came back
// `ROLE_NOT_PERMITTED` (a RETURNED `CommandResult`). The same probe at an id
// that does not exist was stopped at scope and came back `SCOPE_DENIED` (a
// THROWN `DataError`). **Probe an id, read the refusal kind, learn whether the
// row exists** — across a tenancy boundary, on the write path, for a caller
// entitled to neither answer.
//
// ⚠️ **AND THE FILING UNDER-COUNTED THE POPULATION BY MORE THAN HALF.** B1
// filed it against `supplierApplication` naming `purchaseRequisition` as the
// inherited precedent — two. Derived at the fix through the real dispatcher:
// **FIVE**. `rfq` is the member a list would never have reached for, because it
// is the document suppliers are INVITED to — "a supplier has no business acting
// on an RFQ" is the least intuitive true sentence in this file, and it is true
// because a supplier acts through its own `quotation`, which HAS an owner.
//
// ⚠️ **SO NOTHING HERE READS A LIST OF ENTITIES.** The population is derived on
// every run, from each wired target's OWN contract:
//
//     E is OWNER-LESS ⇔ for an entity of E that EXISTS (`readState !== null`),
//                       `readScopeOwner` returns null.
//
// Both halves are load-bearing. `readScopeOwner` returns null for an id that
// simply does not exist on EVERY target, owner-ful ones included — so without
// the `readState` conjunct the derivation condemns all fourteen and reports on
// its own matcher rather than on the tree.
//
// ⚠️ **AND IT IS DERIVED FROM THE TARGET RATHER THAN FROM THE DISPATCHER FOR A
// REASON THAT WAS MEASURED, NOT ANTICIPATED.** The first version of this file
// derived the population BEHAVIOURALLY — "which supplier ids clear the scope
// gate?" — which reads correctly against the shipped tree and is worthless as a
// gate. Mutating the predicate under test collapses that population to EMPTY:
// the suite goes red on its own population control while **the assertion it
// exists to make never runs at all**, and every remaining spec passes vacuously
// over zero rows. The mutation probe registers a kill, the kill proves nothing,
// and a counter watching pass/fail cannot tell the difference. That is
// `EMPTY-INPUT-REPORTS-CLEAN-01` arriving through the POPULATION instead of
// through the input, and it was caught only because the probe's output was read
// row by row instead of as a count.
//
// `readScopeOwner` is upstream of every dispatcher predicate, so the population
// below is identical under the shipped code and under both mutants.
//
// ⚠️ **THE CONTROL THAT MAKES THE EQUALITY MEAN ANYTHING, AND IT IS THE POINT
// OF THE FILE.** "The supplier gets the same refusal at both ids" is worth
// nothing if the two ids do not differ — `EMPTY-INPUT-REPORTS-CLEAN-01` with
// two inputs instead of none. So every probe pair is taken by a BUYER at the
// SAME two ids, and the buyer's two answers must DIFFER. The invariant is not
// "nobody can tell". It is:
//
//     THE BUYER CAN TELL THE TWO IDS APART. THE SUPPLIER CANNOT.
//
// A gate asserting only the supplier half would pass just as happily against a
// tree where both ids were absent, or where the dispatcher refused every seat
// on every owner-less entity. The second is the dangerous one — closing a leak
// by deleting the capability — and `THE LEGITIMATE PATHS` below is what fires
// when someone does it.
// ────────────────────────────────────────────────────────────────────────────

import { maxStockStore } from './maxStock';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  MockCommandService,
  WIRED_COMMAND_TARGETS,
  commandTargetFor
} from '../data/mock/MockCommandService';
import { getFlow } from './registry';
import './index';
import { PERSONA_SYSTEM_ROLES, atomsFor, rolesHolding } from './businessRoles';
import { DataError } from '../data/types';
/** @import { QueryScope } from '../data/types' */
/** @import { TransitionDef } from './schema' */
import { NO_PERSON } from '@context/noPerson';
import { GOVERNED_CHECK_IDS } from '@lib/enforcement';
import { purchaseOrderStore } from '../data/mock/stores/purchaseOrderStore';
import { asnStore } from '../data/mock/stores/asnStore';
import { goodsReceiptStore } from '../data/mock/stores/goodsReceiptStore';
import { invoiceStore } from '../data/mock/stores/invoiceStore';
import { rfqStore } from '../data/mock/stores/rfqStore';
import { quotationStore } from '../data/mock/stores/quotationStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';
import { requirementResponseStore } from '../data/mock/stores/requirementResponseStore';
import { inventoryDeclarationStore } from '../data/mock/stores/inventoryDeclarationStore';
import { incomingShipmentStore } from '../data/mock/stores/incomingShipmentStore';
import { enforcementSettingStore } from '../data/mock/stores/enforcementSettingStore';
import { supplierDocumentStore } from '../data/mock/stores/supplierDocumentStore';
import { supplierApplicationStore } from '../data/mock/stores/supplierApplicationStore';
import { receiptDiscrepancyStore } from '../data/mock/stores/receiptDiscrepancyStore';
import { callOffStore } from '../data/mock/stores/callOffStore';
import { capacityStore, stockSyncStore } from '../data/mock/stores/inventoryHubStores';
import { activeAlertConditions } from '../data/mock/inventoryReadModel';
import { forecastVersionStore, forecastViewStore } from '../data/mock/stores/forecastHubStores';
import {
  negotiationRoundStore,
  rfiEventStore,
  rfiResponseStore,
  rfpEventStore,
  rfpFirmOfferStore,
  rfpOfferRoundStore,
  rfpResponseStore
} from '../data/mock/stores/rfxStores';
import { rfxNow } from '../data/mock/rfxReadModel';
import {
  rfqClarificationStore,
  rfqConfidentialityStore,
  rfqIntentStore
} from '../data/mock/stores/rfqEngagementStores';
import { customRoleStore } from './customRoles';
import { workingCalendarStore } from './workingCalendarStore';
import { threePlStore } from './threePlStore';
import { supplierOverlayStore } from '../data/mock/stores/supplierOverlayStore';
import { qualificationRuleStore } from './qualificationRuleStore';
import { sourcingTypeStore } from './sourcingTypeStore';
import { planningGroupStore } from '../data/mock/stores/planningGroupStore';
import { materialOverlayStore } from '../data/mock/stores/materialOverlayStore';
import { mrpControllerStore } from './mrpControllerStore';
import { warehouseDecisionStore } from '../data/mock/stores/warehouseDecisionStore';
import { osipLevelStore } from '../data/mock/stores/osipLevelStore';
import { demandAnticipationStore } from '../data/mock/stores/demandAnticipationStore';
import { materialNameStore } from '../data/mock/stores/materialNameStore';
import { feedstockConfirmationStore } from '../data/mock/stores/feedstockConfirmationStore';
import { simulationOverrideStore } from '../data/mock/stores/simulationOverrideStore';
import { hubSettingsStore, settingValue } from './hubSettingsStore';
import { reasonCodeStore } from './reasonCodes';

const svc = new MockCommandService();
const ABSENT = 'zzz-no-such-entity-0000';

/**
 * @param {...string} businessRoles
 * @returns {QueryScope}
 */
const buyerSeat = (...businessRoles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles,
  actor: NO_PERSON
});
/**
 * @param {string} supplierId
 * @param {...string} businessRoles
 * @returns {QueryScope}
 */
const supplierSeatOf = (supplierId, ...businessRoles) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles,
  actor: NO_PERSON
});

/** The widest supplier scope that can exist, owning nothing. A refusal against
 *  THIS seat is not an artefact of a thin one. */
const widestSupplier = supplierSeatOf('sup-OWNS-NOTHING', ...PERSONA_SYSTEM_ROLES.supplier);
/** The existence discriminator the BUYER side still has — holds no atoms, so it
 *  reaches the role gate and stops there, never mutating. */
const rolelessBuyer = buyerSeat();

/** The REFUSAL KIND and nothing else. NEVER the message — it embeds the
 *  entityId, so comparing messages makes every target look like it differs.
 *  (That mistake was made and caught while deriving this population; it turned
 * @param {QueryScope} scope
 * @param {string} entity
 * @param {string} transitionId
 * @param {string} entityId
 * @returns {Promise<string>}
 *  nine owner-FUL targets into false positives in one run.) */
async function kindOf(scope, entity, transitionId, entityId) {
  try {
    const r = await svc.dispatch(scope, { transitionId, entity, entityId, payload: {} });
    return r.status === 'failed' ? `failed/${(r.reason ?? '').split(':')[0]}` : `ok/${r.status}`;
  } catch (e) {
    return e instanceof DataError ? `throw/${e.code}` : `throw/${/** @type {Error} */ (e).name}`;
  }
}

// ─── One real id per wired target ───────────────────────────────────────────
//
// ⚠️ **A FIXTURE, NOT THE POPULATION.** The population is derived FROM these;
// these are only "an entity of each kind that exists". The coverage assertion
// below requires one for EVERY wired target, so wiring a fifteenth reddens this
// file until somebody supplies an id — loud, rather than a silently-skipped
// target.
/** @returns {Promise<Record<string, string | null>>} */
async function realIds() {
  const raised = await svc.dispatch(buyerSeat('procurement'), {
    transitionId: 't_application_submit',
    entity: 'supplierApplication',
    payload: { requestType: 'External SR', companyName: 'PT Sample Applicant' }
  });
  // REQ-E07-06 — the response store starts empty (a response is something a
  // supplier gives), so the probe raises one: sup-008 disputes the rejected
  // quantity on its own receipt gr-006. A repeat call is refused as already
  // answered and leaves the same row in place.
  await svc.dispatch(supplierSeatOf('sup-008', ...PERSONA_SYSTEM_ROLES.supplier), {
    transitionId: 't_receiptdiscrepancy_dispute',
    entity: 'receiptDiscrepancy',
    payload: { receiptId: 'gr-006', comment: 'raised to probe the scope gate' }
  });
  // NR-2 — both firm-offer stores start empty (no sample RFP is Closed), so the
  // probe walks one through the real verbs: close rfp-002, ask sup-007 (which
  // proposed on it) for a firm price, and let sup-007 send one. A repeat call
  // finds the RFP already Closed and opens a further round, which is harmless.
  const inFiveDays = new Date(Date.parse(rfxNow()) + 5 * 86_400_000).toISOString().slice(0, 10);
  await svc.dispatch(buyerSeat('procurement'), {
    transitionId: 't_rfp_close',
    entity: 'rfpEvent',
    entityId: 'rfp-002'
  });
  const round = await svc.dispatch(buyerSeat('procurement'), {
    transitionId: 't_rfp_round_open',
    entity: 'rfpOfferRound',
    payload: {
      rfpId: 'rfp-002',
      optionRefs: ['opt-full-set'],
      quantityPoints: [50_000],
      invitedSupplierIds: ['sup-007'],
      deadline: inFiveDays
    }
  });
  const offer = round.entityId
    ? await svc.dispatch(supplierSeatOf('sup-007', ...PERSONA_SYSTEM_ROLES.supplier), {
        transitionId: 't_rfpfirmoffer_submit',
        entity: 'rfpFirmOffer',
        payload: {
          roundId: round.entityId,
          supplierId: 'sup-007',
          prices: [{ optionRef: 'opt-full-set', qty: 50_000, unitPrice: 4_150 }],
          validUntil: inFiveDays
        }
      })
    : null;
  return {
    purchaseOrder: purchaseOrderStore.all()[0]?.id ?? null,
    advanceShipNotice: asnStore.all()[0]?.asnNumber ?? null,
    goodsReceipt: goodsReceiptStore.all()[0]?.id ?? null,
    invoice: invoiceStore.all()[0]?.id ?? null,
    rfq: rfqStore.all()[0]?.id ?? null,
    quotation: quotationStore.all()[0]?.id ?? null,
    purchaseRequisition: purchaseRequisitionStore.all()[0]?.id ?? null,
    requirementResponse: requirementResponseStore.all()[0]?.id ?? null,
    inventoryDeclaration: inventoryDeclarationStore.all()[0]?.id ?? null,
    incomingShipment: incomingShipmentStore.all()[0]?.id ?? null,
    enforcement: GOVERNED_CHECK_IDS[0],
    role: 'receiving',
    // BL-50 — `entityId` IS the date; any date the SAP load covers exists.
    workingCalendar: '2026-09-09',
    // BL-51 — `entityId` IS the 3PL id; a sample-list row exists from the start.
    threePl: 'tpl-sample-express',
    // Material A1 — `entityId` IS the supplier id; every master supplier exists,
    // and the overlay names that supplier, so it lands in `ownerful`.
    supplierOverlay: 'sup-001',
    // Material G1 — `entityId` IS the level; both lists exist from the start.
    qualificationRule: 'approved',
    // Material G2 — `entityId` IS the map key; every key exists from the start.
    sourcingType: 'category:Packaging',
    // Material C5 — `entityId` IS the planning group id; every SAP material
    // group's default group exists from the start. PTI master data: owner-less.
    planningGroup: 'pg-MG-20',
    // Material C4 — `entityId` IS the SAP code; a sample-list row exists from the start.
    mrpController: 'P12',
    // Material C2 — the trade-name store is seeded; a name names its supplier,
    // so it lands in `ownerful`. The bulk load is a creation verb on the same
    // entity, so the entity is probeable through approve / reject.
    materialName: materialNameStore.all()[0]?.id ?? null,
    // BL-32 — `entityId` IS the setting key; every registry key exists from the start.
    hubSetting: 'callOff.overPct',
    // BL-32 — `entityId` IS `<list>:<code>`; every starter code exists from the start.
    reasonCode: 'poAdjust:capacity',
    // REQ-E06-04 — `entityId` IS `<supplier>|<material>`; any assigned pair exists.
    maxStock: 'sup-007|PK-PETB-8801',
    // FUX-D3 — `entityId` IS `<stream>|<weekStart>`; every well-formed id exists.
    warehouseDecision: 'packaging|2026-10-12',
    // DRC-D11 — `entityId` IS the material code; every master code exists.
    osipLevel: 'PK-PETB-8801',
    supplierDocument: supplierDocumentStore.all()[0]?.id ?? null,
    supplierApplication: raised.entityId ?? null,
    receiptDiscrepancy: receiptDiscrepancyStore.all()[0]?.receiptId ?? null,
    // REQ-E09-03 — the call-off store is seeded, so its first row is a real id.
    callOff: callOffStore.all()[0]?.id ?? null,
    // REQ-E08-02 to 05 — the sync and capacity stores are seeded; supplier
    // access is keyed by a supplier in the inventory view; an alert by the key
    // of a condition active in the sample data.
    stockSync: stockSyncStore.all()[0]?.id ?? null,
    stockAccess: 'sup-007',
    capacitySubmission: capacityStore.all()[0]?.id ?? null,
    inventoryAlert: activeAlertConditions()[0]?.key ?? null,
    // REQ-E06-01 — the version and view stores are seeded.
    forecastVersion: forecastVersionStore.all()[0]?.publicationId ?? null,
    forecastView: forecastViewStore.all()[0]?.id ?? null,
    // CAP-10 — a demand anticipation publication is creation-only (unprobeable);
    // the store opens with the sample publication, so its id is a real one.
    demandAnticipation: demandAnticipationStore.all()[0]?.id ?? null,
    // CAP-11 — a consumption record is creation-only (unprobeable) and its store
    // starts empty (no consumption history is invented); a well-formed id.
    consumption: 'con-0001',
    // BL-194 — a feedstock confirmation is creation-only (unprobeable) and its
    // store starts empty (every material is due until confirmed); a well-formed id.
    feedstockConfirmation: 'fsc-0001',
    // REQ-E14-13 — a "taken to SAP" mark is creation-only (unprobeable) and its
    // store starts empty (nothing is marked while the engine data is simulated);
    // the id is a well-formed one so the coverage control can see the target.
    sapChangeMark: 'sap-0001',
    // REQ-E14-11 — a forecast override is creation-only (unprobeable) and its
    // ledger starts empty (no override history is invented); a well-formed id.
    forecastOverride: 'fo-0001',
    // Material E1 — a stock simulation planner input is creation-only
    // (unprobeable, AR-20) and its store starts empty; a well-formed id.
    simulationOverride: 'sim-0001',
    // REQ-E03-02 / REQ-E03-04 / REQ-E03-05 — every RFx store is seeded, so each
    // first row is a real id. The two RESPONSE targets are supplier-owned and
    // therefore land in `ownerful`; the three buyer-owned ones land in
    // `ownerless`, which is what the assertions below check by name.
    rfiEvent: rfiEventStore.all()[0]?.id ?? null,
    rfiResponse: rfiResponseStore.all()[0]?.id ?? null,
    rfpEvent: rfpEventStore.all()[0]?.id ?? null,
    rfpResponse: rfpResponseStore.all()[0]?.id ?? null,
    negotiationRound: negotiationRoundStore.all()[0]?.id ?? null,
    // NR-2 — walked above. The round is PTI's (owner-less); the offer names
    // the supplier that sent it (owner-ful).
    rfpOfferRound: round.entityId ?? null,
    rfpFirmOffer: offer?.entityId ?? null,
    // RFx spec 2026-09-21 — the supplier-response stores are seeded. An intent
    // and a clarification each name the supplier that raised them, so they land
    // in `ownerful`; an acceptance is creation-only and is `unprobeable`.
    rfqIntent: rfqIntentStore.all()[0]?.id ?? null,
    rfqConfidentiality: rfqConfidentialityStore.all()[0]?.id ?? null,
    rfqClarification: rfqClarificationStore.all()[0]?.id ?? null
  };
}

/** Whether a flow declares any non-creation transition. A creation verb carries
 * @param {string} entity
 * @returns {boolean}
 *  no `entityId`, so it cannot be probed for an existence leak. */
const hasProbeVerb = (entity) =>
  (getFlow(entity)?.transitions ?? []).some((t) => t.trigger !== 'creation');

/** @typedef {{ ownerless: string[]; ownerful: string[]; unprobeable: string[] }} Derived */

/** THE DERIVATION — read off each target's own `readState` / `readScopeOwner`,
 * @returns {Promise<Derived>}
 *  which sit upstream of every dispatcher predicate. Non-mutating. */
async function derive() {
  const ids = await realIds();
  /** @type {Derived} */
  const out = { ownerless: [], ownerful: [], unprobeable: [] };
  for (const entity of WIRED_COMMAND_TARGETS) {
    const target = commandTargetFor(entity);
    const id = ids[entity];
    if (!target || !id || !hasProbeVerb(entity)) {
      out.unprobeable.push(entity);
      continue;
    }
    // The existence conjunct. Without it `readScopeOwner` answers null for every
    // target and the derivation condemns all fourteen.
    if (target.readState(id) === null) {
      out.unprobeable.push(entity);
      continue;
    }
    (target.readScopeOwner(id) === null ? out.ownerless : out.ownerful).push(entity);
  }
  return out;
}

// ─── The walk table ─────────────────────────────────────────────────────────
//
// ⚠️ **EVERY ORACLE PROBE IS TAKEN AT AN ID GENUINELY IN THE VERB'S OWN `from`
// STATE.** Probing a verb at an entity it could not legally fire on would let
// `ILLEGAL_TRANSITION` stand in for the refusal under test, and the gate would
// pass while measuring a different gate. The walk mints or advances through the
// REAL dispatcher, and the first assertion of every case is that the id it
// handed back really is in one of that verb's from-states.
/** @typedef {{ entity: string; t: TransitionDef; id: string; state: string | null }} Walk */

/**
 * @param {string} entity
 * @param {TransitionDef} t
 * @returns {Promise<Walk | null>}
 */
async function walk(entity, t) {
  /**
   * @param {string} id
   * @param {string | null} state
   */
  const at = (id, state) => ({ entity, t, id, state });

  if (entity === 'rfq') {
    const row = rfqStore.all().find((r) => t.from.includes(r.status));
    return row
      ? at(
          row.id,
          /** @type {NonNullable<ReturnType<typeof rfqStore.get>>} */ (rfqStore.get(row.id)).status
        )
      : null;
  }
  if (entity === 'purchaseRequisition') {
    const seeded = purchaseRequisitionStore.all().find((r) => t.from.includes(r.status));
    if (seeded) return at(seeded.id, seeded.status);
    // `Rejected` is not seeded — walk one there through the real verbs.
    const pending = purchaseRequisitionStore.all().find((r) => r.status === 'Pending Approval');
    if (!pending) return null;
    await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_pr_reject',
      entity,
      entityId: pending.id,
      payload: { rejectionReason: 'walked here to probe the scope gate' }
    });
    const now = /** @type {NonNullable<ReturnType<typeof purchaseRequisitionStore.get>>} */ (
      purchaseRequisitionStore.get(pending.id)
    ).status;
    return t.from.includes(now) ? at(pending.id, now) : null;
  }
  if (entity === 'enforcement') return at(GOVERNED_CHECK_IDS[0], 'Governed');
  if (entity === 'role') return at('receiving', 'Defined');
  if (entity === 'workingCalendar') return at('2026-09-09', 'Maintained');
  if (entity === 'threePl') return at('tpl-sample-express', 'Maintained');
  if (entity === 'hubSetting') return at('callOff.overPct', 'Maintained');
  if (entity === 'reasonCode') return at('poAdjust:capacity', 'Maintained');
  if (entity === 'maxStock') return at('sup-007|PK-PETB-8801', 'Maintained');
  if (entity === 'warehouseDecision') return at('packaging|2026-10-12', 'Maintained');
  if (entity === 'osipLevel') return at('PK-PETB-8801', 'Maintained');
  if (entity === 'supplierApplication') {
    const raised = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_application_submit',
      entity,
      payload: { requestType: 'External SR', companyName: 'PT Sample Applicant' }
    });
    const id = /** @type {NonNullable<typeof raised.entityId>} */ (raised.entityId);
    if (!t.from.includes('Submitted')) {
      await svc.dispatch(buyerSeat('compliance'), {
        transitionId: 't_application_start_review',
        entity,
        entityId: id
      });
    }
    const now = supplierApplicationStore.get(id)?.status ?? null;
    return now && t.from.includes(now) ? at(id, now) : null;
  }
  return null;
}

/** Every (owner-less entity × non-creation verb) reachable at a from-state.
 * @returns {Promise<Walk[]>}
 *  The ENTITY set comes from `derive()`; only the id supply is authored. */
async function ownerlessWalks() {
  const { ownerless } = await derive();
  /** @type {Walk[]} */
  const out = [];
  for (const entity of ownerless) {
    for (const t of getFlow(entity)?.transitions ?? []) {
      if (t.trigger === 'creation') continue;
      const w = await walk(entity, t);
      if (w) out.push(w);
    }
  }
  return out;
}

const resetAll = () => {
  rfqStore.reset();
  purchaseRequisitionStore.reset();
  enforcementSettingStore.reset();
  supplierApplicationStore.reset();
  receiptDiscrepancyStore.reset();
  callOffStore.reset();
  customRoleStore.reset();
  workingCalendarStore.reset();
  maxStockStore.reset();
  threePlStore.reset();
  supplierOverlayStore.reset();
  qualificationRuleStore.reset();
  sourcingTypeStore.reset();
  planningGroupStore.reset();
  materialOverlayStore.reset();
  mrpControllerStore.reset();
  warehouseDecisionStore.reset();
  osipLevelStore.reset();
  materialNameStore.reset();
  feedstockConfirmationStore.reset();
  simulationOverrideStore.reset();
  hubSettingsStore.reset();
  reasonCodeStore.reset();
  // NR-2 — the id supply closes rfp-002 and opens a firm-offer round.
  rfpEventStore.reset();
  rfpOfferRoundStore.reset();
  rfpFirmOfferStore.reset();
};

beforeEach(resetAll);

// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION — nothing below means anything without this', () => {
  it('CONTROL — the id supply covers every wired target, so none is silently skipped', async () => {
    const ids = await realIds();
    expect(Object.keys(ids).sort()).toEqual([...WIRED_COMMAND_TARGETS].sort());
    const missing = Object.entries(ids)
      .filter(([, v]) => !v)
      .map(([k]) => k);
    expect(missing, 'a wired target with no real id to probe').toEqual([]);
  });

  it('CONTROL — the two halves of the derivation each discriminate, on their own', async () => {
    const ids = await realIds();
    const po = /** @type {NonNullable<ReturnType<typeof commandTargetFor>>} */ (
      commandTargetFor('purchaseOrder')
    );
    const pr = /** @type {NonNullable<ReturnType<typeof commandTargetFor>>} */ (
      commandTargetFor('purchaseRequisition')
    );
    // `readState` separates a real id from a fabricated one — the conjunct that
    // stops the derivation condemning every target.
    expect(
      po.readState(/** @type {NonNullable<typeof ids.purchaseOrder>} */ (ids.purchaseOrder))
    ).not.toBeNull();
    expect(po.readState(ABSENT)).toBeNull();
    // `readScopeOwner` separates owner-ful from owner-less ON AN ID THAT EXISTS,
    // which is the only place the question means anything.
    expect(
      po.readScopeOwner(/** @type {NonNullable<typeof ids.purchaseOrder>} */ (ids.purchaseOrder))
    ).not.toBeNull();
    expect(
      pr.readScopeOwner(
        /** @type {NonNullable<typeof ids.purchaseRequisition>} */ (ids.purchaseRequisition)
      )
    ).toBeNull();
    // ⚠️ And the trap the conjunct exists for: the OWNER-FUL target answers null
    // too, for an id that is merely absent.
    expect(po.readScopeOwner(ABSENT)).toBeNull();
  });

  it('the owner-less population is DERIVED, and lands on both sides of a bilateral control', async () => {
    const { ownerless, ownerful, unprobeable } = await derive();
    expect(ownerless.length).toBeGreaterThan(0);
    expect(ownerful.length).toBeGreaterThan(0);
    // ⚠️ A derivation returning everything, or nothing, is reporting on itself.
    // Known owner-less members present; known owner-ful members absent.
    expect(ownerless).toContain('purchaseRequisition');
    expect(ownerless).toContain('supplierApplication');
    expect(ownerless).toContain('rfq');
    // REQ-E03-02 / -04 — an RFI or RFP EVENT names no supplier (it is PTI's);
    // a RESPONSE to one names exactly the supplier that wrote it. The two land
    // on opposite sides, which is the bilateral control the RFx lane adds.
    expect(ownerless).toContain('rfiEvent');
    expect(ownerful).toContain('rfiResponse');
    expect(ownerful).toContain('rfpResponse');
    expect(ownerful).toContain('rfqIntent');
    expect(ownerful).toContain('rfqClarification');
    // NR-2 — the firm-offer ROUND is PTI's; the firm OFFER is its supplier's.
    expect(ownerless).toContain('rfpOfferRound');
    expect(ownerful).toContain('rfpFirmOffer');
    // Material A1 — a supplier's overlay names that supplier: a supplier seat is
    // refused at SCOPE on any other supplier and at ROLE on its own.
    expect(ownerful).toContain('supplierOverlay');
    // Material G1 — the qualification lists belong to no supplier.
    expect(ownerless).toContain('qualificationRule');
    // Material G2 — the sourcing type map belongs to no supplier.
    expect(ownerless).toContain('sourcingType');
    // Material C5 — planning groups are PTI master data: no supplier acts on one.
    expect(ownerless).toContain('planningGroup');
    // Material C2 — a trade name names the supplier it belongs to.
    expect(ownerful).toContain('materialName');
    expect(ownerless).not.toContain('purchaseOrder');
    expect(ownerless).not.toContain('invoice');
    expect(ownerful).toContain('purchaseOrder');
    expect(ownerful).toContain('invoice');
    // Every wired target is classified exactly once.
    expect([...ownerless, ...ownerful, ...unprobeable].sort()).toEqual(
      [...WIRED_COMMAND_TARGETS].sort()
    );
    // `inventoryDeclaration` declares no non-creation transition, so it has no
    // verb this leak could ride. Stated rather than silently absent. The API
    // sync attempt and the capacity submission (REQ-E08-02 / 04) are the same
    // creation-only snapshot shape.
    // A forecast version and a supplier's view of it (REQ-E06-01) are the same
    // creation-only snapshot shape.
    // A negotiation round's only non-creation verb closes it, so it IS probeable
    // and lands in `ownerless` with the other buyer-owned targets.
    // A confidentiality acceptance is the same creation-only shape.
    // A "taken to SAP" mark (REQ-E14-13) is the same creation-only record shape.
    // So is a stock simulation planner input (Material E1, AR-20) and a forecast override (REQ-E14-11).
    // So is a demand anticipation publication (CAP-10): it is followed, never changed.
    // And a consumption record (CAP-11): a later record supersedes it at read.
    // And a feedstock confirmation (BL-194): append-only, the latest in force.
    expect(unprobeable).toEqual([
      'rfqConfidentiality',
      'inventoryDeclaration',
      'simulationOverride',
      'stockSync',
      'capacitySubmission',
      'forecastVersion',
      'forecastView',
      'sapChangeMark',
      'forecastOverride',
      'demandAnticipation',
      'consumption',
      'feedstockConfirmation'
    ]);
  });

  it("CONTROL — the walk lands every probe in one of its verb's from-states", async () => {
    const walks = await ownerlessWalks();
    expect(walks.length).toBeGreaterThan(0);
    for (const w of walks) {
      expect(w.state, `${w.entity}/${w.t.id} reached a state`).not.toBeNull();
      expect(w.t.from, `${w.entity}/${w.t.id}`).toContain(
        /** @type {NonNullable<typeof w.state>} */ (w.state)
      );
    }
  });

  it('CONTROL — the ABSENT id really is absent, and the BUYER can still tell', async () => {
    // The assertion the whole file rests on. If the buyer could NOT distinguish
    // the two ids, the supplier's equal answers below would be equal for the
    // wrong reason.
    for (const w of await ownerlessWalks()) {
      const atReal = await kindOf(rolelessBuyer, w.entity, w.t.id, w.id);
      const atAbsent = await kindOf(rolelessBuyer, w.entity, w.t.id, ABSENT);
      expect(atAbsent, `${w.entity}/${w.t.id} buyer@absent`).toBe('throw/NOT_FOUND');
      expect(atReal, `${w.entity}/${w.t.id} buyer@real`).toBe('failed/ROLE_NOT_PERMITTED');
      expect(atReal).not.toBe(atAbsent);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE ORACLE IS CLOSED — a supplier cannot tell the two ids apart', () => {
  it('every owner-less verb: the supplier refusal is IDENTICAL at a real id and an absent one', async () => {
    const walks = await ownerlessWalks();
    expect(walks.length).toBeGreaterThan(0);
    for (const w of walks) {
      const atReal = await kindOf(widestSupplier, w.entity, w.t.id, w.id);
      const atAbsent = await kindOf(widestSupplier, w.entity, w.t.id, ABSENT);
      expect(atReal, `${w.entity}/${w.t.id} — supplier@real vs supplier@absent`).toBe(atAbsent);
      // And the single kind both resolve to is the SCOPE refusal, not the role
      // one: `ROLE_NOT_PERMITTED` names an ATOM, which tells the caller which
      // lane owns the document — a smaller leak of the same shape.
      expect(atReal, `${w.entity}/${w.t.id} — the honest single kind`).toBe('throw/SCOPE_DENIED');
    }
  });

  it('and a supplier naming ITSELF as the entity id does not change the answer', async () => {
    // The one shape that could resurrect the leak: an owner-less `null` replaced
    // by an echo of the caller's own id.
    for (const w of await ownerlessWalks()) {
      const asSelf = await kindOf(
        widestSupplier,
        w.entity,
        w.t.id,
        /** @type {NonNullable<typeof widestSupplier.supplierId>} */ (widestSupplier.supplierId)
      );
      expect(asSelf, `${w.entity}/${w.t.id}`).toBe('throw/SCOPE_DENIED');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE LEGITIMATE PATHS — the half a "refuse everyone" fix would break', () => {
  it('a BUYER seat still clears the scope gate on every owner-less verb', async () => {
    // The negative-direction guard. Closing the oracle by denying every persona
    // satisfies the describe above and fails here, on every row.
    for (const w of await ownerlessWalks()) {
      const k = await kindOf(rolelessBuyer, w.entity, w.t.id, w.id);
      expect(
        k,
        `${w.entity}/${w.t.id} — a buyer must reach the ROLE gate, not be denied at scope`
      ).toBe('failed/ROLE_NOT_PERMITTED');
    }
  });

  it('NO supplier lane holds ANY atom on ANY owner-less verb — which is why nothing was lost', async () => {
    // The measurement that made the one-expression fix safe. The day a supplier
    // lane gains such an atom this goes red — and the fix becomes a deleted
    // capability rather than a closed leak, which is the moment somebody has to
    // be told rather than the moment an act quietly stops working.
    const supplierAtoms = new Set(atomsFor([...PERSONA_SYSTEM_ROLES.supplier]));
    // Control on the SET, both ways. A zero over an empty set proves nothing.
    expect(supplierAtoms.has('asn:submit')).toBe(true);
    expect(supplierAtoms.has('rfq:award')).toBe(false);

    for (const w of await ownerlessWalks()) {
      expect(
        supplierAtoms.has(w.t.requiredRole),
        `${w.entity}/${w.t.id} requires ${w.t.requiredRole}; holders=${JSON.stringify(rolesHolding(w.t.requiredRole))}`
      ).toBe(false);
    }
  });

  it('and each owner-less entity still has a verb a HOLDER seat can LAND', async () => {
    // One real walk per owner-less entity, through the real dispatcher, ending
    // in a state change. Every derived assertion above can pass over a lane that
    // refuses everybody; these cannot.
    const { ownerless } = await derive();
    expect(ownerless.sort()).toEqual([
      'enforcement',
      // BL-32 — the rule values are PTI's; no supplier is their owner.
      'hubSetting',
      // REQ-E06-04 — the maximum stock is a term PTI keeps; no supplier is its owner.
      'maxStock',
      // Material C4 — the MRP controller list is PTI's; no supplier is its owner.
      'mrpController',
      // REQ-E03-05 — a negotiation round is PTI's window; a supplier answers
      // it through its own quotation, never by addressing the round.
      'negotiationRound',
      // DRC-D11 — a material's OSIP level is the Material Planning team's.
      'osipLevel',
      // Material C5 — planning groups are PTI master data (MR-8, MAT-D12).
      'planningGroup',
      'purchaseRequisition',
      // Material G1 — the qualification lists are PTI's; no supplier is their owner.
      'qualificationRule',
      // BL-32 — the reason lists are PTI's; no supplier is their owner.
      'reasonCode',
      // REQ-E03-02 / REQ-E03-04 — an RFI and an RFP EVENT name no supplier.
      'rfiEvent',
      'rfpEvent',
      // NR-2 — a firm-offer round is PTI's window, as the negotiation round;
      // a supplier answers it through its own firm offer.
      'rfpOfferRound',
      'rfq',
      'role',
      // Material G2 — the sourcing type map is PTI's; no supplier is its owner.
      'sourcingType',
      'supplierApplication',
      // BL-51 — the 3PL list is PTI's; no supplier is its owner.
      'threePl',
      // FUX-D3 — a warehouse-week decision is the Material Planning team's; no supplier is its owner.
      'warehouseDecision',
      // BL-50 — the hub's calendar is PTI's; no supplier is its owner.
      'workingCalendar'
    ]);

    const draftRfq =
      /** @type {NonNullable<ReturnType<(ReturnType<typeof rfqStore.all>)['find']>>} */ (
        rfqStore.all().find((r) => r.status === 'Draft')
      );
    const rfqRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: draftRfq.id
    });
    expect(rfqRes.status, rfqRes.reason).toBe('done');
    expect(
      /** @type {NonNullable<ReturnType<typeof rfqStore.get>>} */ (rfqStore.get(draftRfq.id)).status
    ).toBe('Open');

    const draftPr =
      /** @type {NonNullable<ReturnType<(ReturnType<typeof purchaseRequisitionStore.all>)['find']>>} */ (
        purchaseRequisitionStore.all().find((r) => r.status === 'Draft')
      );
    const prRes = await svc.dispatch(buyerSeat('requisitioner'), {
      transitionId: 't_pr_submit',
      entity: 'purchaseRequisition',
      entityId: draftPr.id
    });
    expect(prRes.status, prRes.reason).toBe('done');
    expect(
      /** @type {NonNullable<ReturnType<typeof purchaseRequisitionStore.get>>} */ (
        purchaseRequisitionStore.get(draftPr.id)
      ).status
    ).toBe('Pending Approval');

    const enfRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_enforcement_set',
      entity: 'enforcement',
      entityId: GOVERNED_CHECK_IDS[0],
      payload: { mode: 'BLOCK', setBy: NO_PERSON }
    });
    expect(enfRes.status, enfRes.reason).toBe('done');
    expect(enforcementSettingStore.all()).toHaveLength(1);

    const roleRes = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_role_grant',
      entity: 'role',
      entityId: 'receiving',
      payload: {
        roleId: 'ownerless-gate-probe',
        displayName: 'Ownerless Gate Probe',
        description: 'Minted by the owner-less scope gate, to prove the lane still works.',
        adds: ['invoice:dispute'],
        grantedBy: NO_PERSON
      }
    });
    expect(roleRes.status, roleRes.reason).toBe('done');
    expect(customRoleStore.all().map((r) => r.id)).toContain('ownerless-gate-probe');

    // BL-50 — the Hub administrator's lane (compliance) can still rule a day.
    const calRes = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_calendar_day_set',
      entity: 'workingCalendar',
      entityId: '2026-09-09',
      payload: {
        kind: 'non-working',
        reason: 'Probe of the owner-less scope gate',
        setBy: NO_PERSON
      }
    });
    expect(calRes.status, calRes.reason).toBe('done');
    expect(workingCalendarStore.rulings().map((r) => r.date)).toContain('2026-09-09');
    // BL-51 — the Hub administrator's lane (compliance) can still change a 3PL.
    const tplRes = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_threepl_set',
      entity: 'threePl',
      entityId: 'tpl-sample-express',
      payload: {
        name: 'Sample Express Courier (illustrative)',
        trackingUrlPattern: 'https://track.sample-express.example/p/{tracking}',
        active: true,
        setBy: NO_PERSON
      }
    });
    expect(tplRes.status, tplRes.reason).toBe('done');
    expect(threePlStore.changes().map((c) => c.id)).toContain('tpl-sample-express');
    // BL-32 — the Hub administrator's lane (compliance) can still change a rule value.
    const setRes = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_setting_set',
      entity: 'hubSetting',
      entityId: 'callOff.overPct',
      payload: { value: 7, setBy: NO_PERSON }
    });
    expect(setRes.status, setRes.reason).toBe('done');
    expect(settingValue('callOff.overPct')).toBe(7);
    // BL-32 — the Hub administrator's lane (compliance) can still add a reason code.
    const rsnRes = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_reasoncode_set',
      entity: 'reasonCode',
      entityId: 'poAdjust:tooling',
      payload: {
        labelEn: 'Tooling change',
        labelId: 'Perubahan perkakas',
        active: true,
        setBy: NO_PERSON
      }
    });
    expect(rsnRes.status, rsnRes.reason).toBe('done');
    expect(reasonCodeStore.get('poAdjust', 'tooling')?.active).toBe(true);
    // REQ-E06-04 — Procurement can still set a maximum stock.
    const maxRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_maxstock_set',
      entity: 'maxStock',
      entityId: 'sup-007|PK-PETB-8801',
      payload: { quantity: 90_000, setBy: NO_PERSON }
    });
    expect(maxRes.status, maxRes.reason).toBe('done');
    expect(maxStockStore.get('sup-007', 'PK-PETB-8801')?.quantity).toBe(90_000);
    // Material C4 — the Hub administrator's lane (compliance) can still map a code.
    const mrpRes = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_mrpcontroller_set',
      entity: 'mrpController',
      entityId: 'P13',
      payload: {
        name: 'Fragrance planning desk (sample)',
        userLabels: ['Material Planner, fragrance (sample)']
      }
    });
    expect(mrpRes.status, mrpRes.reason).toBe('done');
    expect(mrpControllerStore.get('P13')?.name).toBe('Fragrance planning desk (sample)');
    // FUX-D3 — the Material Planning lane can still record a warehouse-week decision.
    const wdRes = await svc.dispatch(buyerSeat('planning'), {
      transitionId: 't_warehousedecision_record',
      entity: 'warehouseDecision',
      entityId: 'packaging|2026-10-12',
      payload: { choice: 'rent' }
    });
    expect(wdRes.status, wdRes.reason).toBe('done');
    expect(warehouseDecisionStore.all().map((r) => r.choice)).toEqual(['rent']);

    // DRC-D11 — the planning lane sets a material's OSIP level.
    const levelRes = await svc.dispatch(buyerSeat('planning'), {
      transitionId: 't_osiplevel_set',
      entity: 'osipLevel',
      entityId: 'PK-PETB-8801',
      payload: { osipLevel: 5 }
    });
    expect(levelRes.status, levelRes.reason).toBe('done');
    expect(osipLevelStore.all().map((r) => r.level)).toEqual([5]);

    const qualRes = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_qualification_rule_set',
      entity: 'qualificationRule',
      entityId: 'approved',
      payload: { requiredDocs: [{ category: 'Tax & Legal', label: 'Business licence and tax ID' }] }
    });
    expect(qualRes.status, qualRes.reason).toBe('done');
    expect(qualificationRuleStore.get('approved').placeholder).toBe(false);

    const typeRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_sourcingtype_set',
      entity: 'sourcingType',
      entityId: 'category:Packaging',
      payload: { sourcingType: 'indirect' }
    });
    expect(typeRes.status, typeRes.reason).toBe('done');
    expect(sourcingTypeStore.get('category:Packaging')).toBe('indirect');

    const raised = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_application_submit',
      entity: 'supplierApplication',
      payload: { requestType: 'External SR', companyName: 'PT Sample Applicant' }
    });
    expect(raised.status, raised.reason).toBe('done');
    const reviewed = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_application_start_review',
      entity: 'supplierApplication',
      entityId: /** @type {NonNullable<typeof raised.entityId>} */ (raised.entityId)
    });
    expect(reviewed.status, reviewed.reason).toBe('done');
    expect(
      /** @type {NonNullable<ReturnType<typeof supplierApplicationStore.get>>} */ (
        supplierApplicationStore.get(
          /** @type {NonNullable<typeof raised.entityId>} */ (raised.entityId)
        )
      ).status
    ).toBe('Under Review');

    // REQ-E03-02 / REQ-E03-04 / REQ-E03-05 — the three RFx lanes a buyer seat
    // must still be able to LAND a verb in. Each is a real dispatch through the
    // real dispatcher ending in a state change, exactly as the four above.
    const openRfi =
      /** @type {NonNullable<ReturnType<(ReturnType<typeof rfiEventStore.all>)['find']>>} */ (
        rfiEventStore.all().find((e) => e.status === 'Open')
      );
    const rfiRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_rfi_close',
      entity: 'rfiEvent',
      entityId: openRfi.id
    });
    expect(rfiRes.status, rfiRes.reason).toBe('done');
    expect(
      /** @type {NonNullable<ReturnType<typeof rfiEventStore.get>>} */ (
        rfiEventStore.get(openRfi.id)
      ).status
    ).toBe('Closed');

    const openRfp =
      /** @type {NonNullable<ReturnType<(ReturnType<typeof rfpEventStore.all>)['find']>>} */ (
        rfpEventStore.all().find((e) => e.status === 'Open')
      );
    const rfpRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_rfp_close',
      entity: 'rfpEvent',
      entityId: openRfp.id
    });
    expect(rfpRes.status, rfpRes.reason).toBe('done');
    expect(
      /** @type {NonNullable<ReturnType<typeof rfpEventStore.get>>} */ (
        rfpEventStore.get(openRfp.id)
      ).status
    ).toBe('Closed');

    const openRound =
      /** @type {NonNullable<ReturnType<(ReturnType<typeof negotiationRoundStore.all>)['find']>>} */ (
        negotiationRoundStore.all().find((r) => !r.closed)
      );
    const roundRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_negotiationround_close',
      entity: 'negotiationRound',
      entityId: openRound.id
    });
    expect(roundRes.status, roundRes.reason).toBe('done');
    expect(
      /** @type {NonNullable<ReturnType<typeof negotiationRoundStore.get>>} */ (
        negotiationRoundStore.get(openRound.id)
      ).closed
    ).toBe(true);

    // NR-2 — the firm-offer round the id supply opened can still be closed.
    const openOfferRound =
      /** @type {NonNullable<ReturnType<(ReturnType<typeof rfpOfferRoundStore.all>)['find']>>} */ (
        rfpOfferRoundStore.all().find((r) => r.closedAt === undefined)
      );
    const offerRoundRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_rfp_round_close',
      entity: 'rfpOfferRound',
      entityId: openOfferRound.id
    });
    expect(offerRoundRes.status, offerRoundRes.reason).toBe('done');
    expect(
      /** @type {NonNullable<ReturnType<typeof rfpOfferRoundStore.get>>} */ (
        rfpOfferRoundStore.get(openOfferRound.id)
      ).closedAt
    ).toBeDefined();

    // Material C5 — Material Planning (planning) can still rename a planning group.
    const pgRes = await svc.dispatch(buyerSeat('planning'), {
      transitionId: 't_planninggroup_rename',
      entity: 'planningGroup',
      entityId: 'pg-MG-20',
      payload: { name: 'Owner-less gate probe' }
    });
    expect(pgRes.status, pgRes.reason).toBe('done');
    expect(planningGroupStore.all().map((e) => e.kind)).toContain('renamed');
  });
});
