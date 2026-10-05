// ─────────────────────────────────────────────────────────────────────────────
// SDC-5d — the unified chase read service (the ONE composition point).
//
// Wires the two ALREADY-EXISTING read seams into the pure chase reducer:
//   · collaboration.getChase(scope)   → ChaseEntry[]           (data staleness)
//   · delivery.getAgreements(scope)   → DeliveryAgreementView[]
//        → deriveDeliveryChase(views, now) → DeliveryChaseEntry[] (commitment)
//   · deriveUnifiedChase(data, commitment) → SupplierChaseView[]  (5c reducer)
//
// This is the single place `chase` couples to `collaboration` + `delivery` — it
// takes the two service INTERFACES by constructor (dependency injection), so the
// coupling is explicit and testable, and NEITHER of those services imports chase
// (acyclic preserved). The pure reducer stays results-in (untouched).
//
// BUYER-GATED explicitly: `getChase` is already buyer-gated (a supplier sees no
// consolidation), but `getAgreements` is OWN-scoped for a supplier (it returns the
// supplier's own agreements — the delivery mirror), NOT empty. So the buyer gate
// here is explicit, not incidental: the planner chases suppliers; a supplier does
// not chase itself (its own-facts view is the mirror, a later 5e concern).
//
// SIMULATED by construction: no CommandTarget, no channel send, no SAP — the
// LivenessPill reads amber "Sample". The chase is a DERIVED assessment over real
// fulfillment + real consolidation staleness, never fabricated urgency. `now` is
// the shared SIMULATED clock (sdcClock.now()).
// ─────────────────────────────────────────────────────────────────────────────

/** @import { IChaseService, ICollaborationService, IDeliveryService, Page, QueryScope } from '../types' */
/** @import { SupplierChaseView } from '../../chase' */
import { deriveDeliveryChase, deriveUnifiedChase } from '../../chase';
import { sdcClock } from '../../sdc';

/**
 * @param {QueryScope} scope
 * @returns {boolean}
 */
const buyerOnly = (scope) => scope.personaType === 'buyer';

/** @implements {IChaseService} */
export class MockChaseService {
  /**
   * @param {ICollaborationService} collaboration
   * @param {IDeliveryService} delivery
   */
  constructor(collaboration, delivery) {
    this.collaboration = collaboration;
    this.delivery = delivery;
  }

  /** The unified per-supplier chase list, worst-first. Buyer-only — a supplier
   * @param {QueryScope} scope
   * @returns {Promise<Page<SupplierChaseView>>}
   *  persona resolves to [] (a supplier does not chase itself). */
  async getUnifiedChase(scope) {
    if (!buyerOnly(scope)) return { items: [] };
    const now = sdcClock.now();
    const dataEntries = (await this.collaboration.getChase(scope)).items;
    const views = (await this.delivery.getAgreements(scope)).items;
    const commitmentEntries = deriveDeliveryChase(views, now);
    return { items: [...deriveUnifiedChase(dataEntries, commitmentEntries)] };
  }
}
