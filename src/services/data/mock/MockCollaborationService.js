// ────────────────────────────────────────────────────────────────────────────
// MockCollaborationService (SDC-4b) — the SDC read seam's mock implementation.
//
// Moves SDC read-scoping from the hooks (sdcSupplierHooks) INTO the service, so
// P1 own-reads and P2 consolidation share ONE scoped source. Mirrors
// MockProcurementService exactly:
//   · P1 own-reads pipe through applySupplierScope (buyer = superset, supplier =
//     own rows only — cross-supplier data can never leak);
//   · P2 consolidation reads are BUYER-GATED — a supplier persona sees nothing
//     (own-only degenerates to empty; a supplier has no cross-supplier
//     consolidation view), the same convention as procurement's buyer-only
//     aggregates (getRequisitions / getSupplierScorecards).
//
// Reads resolve from the LIVE stores (seeded from the SDC-0 fixtures) so a P1
// write is reflected once a consumer repoints onto this service (SDC-4c/4d).
// Publications stay the frozen SOMO fixtures (their producer is the F2 C8 feed,
// not a supplier write). Time comes from the shared sdcClock (SDC-4a), so the
// service and the pure selectors agree on "now". Nothing here dispatches.
// ────────────────────────────────────────────────────────────────────────────

import { applySupplierScope } from '../scoping';
import { requirementResponseStore } from './stores/requirementResponseStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { asnStore } from './stores/asnStore';
import {
  FORECAST_PUBLICATIONS,
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  currentPublication,
  currentDeclarations,
  consolidationRows,
  supplierCoverageEntries,
  supplierRollups,
  chaseList,
  asnTrackingFor,
  sdcClock
} from '../../sdc';
/** @import { RequirementResponse, InventoryDeclaration, IncomingShipmentView, ConsolidationRow, SupplierCoverageEntry, SupplierRollup, ChaseEntry } from '../../sdc' */
/** @import { ICollaborationService, Page, QueryScope, ASN } from '../types' */

/** The buyer gate for the consolidation reads: only a buyer sees the superset; a
 * @param {QueryScope} scope
 * @returns {boolean}
 *  supplier (or a scopeless call) sees nothing — never cross-supplier data. */
const buyerOnly = (scope) => scope.personaType === 'buyer';

/** @implements {ICollaborationService} */
export class MockCollaborationService {
  // ─── P1 own-reads (per-supplier isolation) ──────────────────────────────────

  /** The supplier's OWN requirement responses, newest-first. STATUS-ONLY
   *  (FORK-3b-C): the raw submissions the supplier made — never a
   * @param {QueryScope} scope
   * @returns {Promise<Page<RequirementResponse>>}
   *  consolidation-derived rank/score/sibling row. */
  async getOwnRequirementResponses(scope) {
    // The SDC-0 publications' responses only: forecast-version commitments
    // (REQ-E06-02) are read through `getForecastCommitments`.
    const sdcPublications = new Set(FORECAST_PUBLICATIONS.map((p) => p.publicationId));
    const own = applySupplierScope(
      scope,
      requirementResponseStore.all().filter((r) => sdcPublications.has(r.publicationId))
    );
    const items = own
      .slice()
      .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
    return { items };
  }

  /** The supplier's CURRENT SOH per material — the most-recently-added snapshot
   * @param {QueryScope} scope
   * @returns {Promise<Page<InventoryDeclaration>>}
   *  per pair (by insertion recency, SDC-4a), sorted by material code. */
  async getOwnInventoryDeclarations(scope) {
    const own = applySupplierScope(scope, inventoryDeclarationStore.all());
    const items = currentDeclarations(own).sort((a, b) =>
      a.materialCode.localeCompare(b.materialCode)
    );
    return { items };
  }

  /** The supplier's OWN reported shipments, newest-first, each with its DISPLAY
   *  lifecycle resolved (a to-paragon leg's state is DERIVED from the linked
   * @param {QueryScope} scope
   * @returns {Promise<Page<IncomingShipmentView>>}
   *  ASN's live status — the drift-honesty rule). */
  async getOwnIncomingShipments(scope) {
    const own = applySupplierScope(scope, incomingShipmentStore.all());
    const items = own
      .map((shipment) => {
        // THE TWO AXES. `shipment` carries the supplier's DECLARED lifecycle
        // untouched; `asnTracking` carries Paragon's inbound observation. The
        // second never overwrites the first — see `sdc/shipment.js`.
        const asnStatus =
          shipment.direction === 'to-paragon' && shipment.asnRef
            ? (asnStore.get(shipment.asnRef)?.status ?? null)
            : null;
        return { shipment, asnTracking: asnTrackingFor(shipment, asnStatus) };
      })
      .sort((a, b) => b.shipment.id.localeCompare(a.shipment.id));
    return { items };
  }

  /**
   * The supplier's OWN ASNs — the to-paragon link-picker source.
   * @param {QueryScope} scope
   * @returns {Promise<Page<ASN>>}
   */
  async getOwnSupplierAsns(scope) {
    return { items: applySupplierScope(scope, asnStore.all()) };
  }

  // ─── P2 consolidation reads (buyer-superset, BUYER-GATED) ────────────────────

  /** The consolidation rows (every current-publication line + its response
   * @param {QueryScope} scope
   * @returns {Promise<Page<ConsolidationRow>>}
   *  state). Buyer-only — a supplier sees nothing. */
  async getConsolidation(scope) {
    if (!buyerOnly(scope)) return { items: [] };
    return {
      items: [...consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all())]
    };
  }

  /**
   * The per-supplier coverage entries (the ONE modeled projection). Buyer-only.
   * @param {QueryScope} scope
   * @returns {Promise<Page<SupplierCoverageEntry>>}
   */
  async getCoverage(scope) {
    if (!buyerOnly(scope)) return { items: [] };
    return {
      items: [
        ...supplierCoverageEntries(
          FORECAST_PUBLICATIONS,
          inventoryDeclarationStore.all(),
          incomingShipmentStore.all(),
          SUPPLIER_MATERIAL_RELATIONSHIPS,
          sdcClock.now()
        )
      ]
    };
  }

  /** The pre-scheduler chase list (overdue / partial), as of the shared clock.
   * @param {QueryScope} scope
   * @returns {Promise<Page<ChaseEntry>>}
   *  Buyer-only. */
  async getChase(scope) {
    if (!buyerOnly(scope)) return { items: [] };
    const current = currentPublication(FORECAST_PUBLICATIONS);
    if (current === null) return { items: [] };
    const rows = consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all());
    return { items: [...chaseList(current, rows, sdcClock.now())] };
  }

  /**
   * The per-supplier response rollups (responded / partial / silent). Buyer-only.
   * @param {QueryScope} scope
   * @returns {Promise<Page<SupplierRollup>>}
   */
  async getRollups(scope) {
    if (!buyerOnly(scope)) return { items: [] };
    const rows = consolidationRows(FORECAST_PUBLICATIONS, requirementResponseStore.all());
    return { items: [...supplierRollups(rows)] };
  }
}
