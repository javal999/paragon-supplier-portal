import { describe, expect, it } from 'vitest';
import { MockChaseService } from './MockChaseService';
import { mockDataService } from './mockDataService';
/** @import { ICollaborationService, IDeliveryService, QueryScope } from '../types' */
/** @import { ChaseEntry } from '../../sdc' */
import { deriveAgreementView } from '../../delivery/views';
import { SCHEDULING_AGREEMENT_DEMO, DELIVERY_DEMO_SHIPMENTS } from '../../delivery/demoFixtures';
import { SDC_SIMULATED_NOW } from '../../sdc';
import { PERSONA_SYSTEM_ROLES } from '../../../services/transitions/businessRoles';

// ─────────────────────────────────────────────────────────────────────────────
// SDC-5d — the unified chase SERVICE (the composition point). Composes the two
// existing read seams (collaboration.getChase + delivery.getAgreements → the 5a
// commitment chase) via the pure 5c reducer, buyer-gated.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
/** @type {QueryScope} */
const supplierScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier
};

/**
 * A collaboration stub returning a fixed data-chase list (only getChase is used).
 * @param {ChaseEntry[]} entries
 * @returns {ICollaborationService}
 */
function collabStub(entries) {
  return /** @type {ICollaborationService} */ (
    /** @type {unknown} */ ({ getChase: async () => ({ items: entries }) })
  );
}

/**
 * A delivery stub returning fixed agreement views (only getAgreements is used).
 * @param {ReturnType<typeof deriveAgreementView>[]} views
 * @returns {IDeliveryService}
 */
function deliveryStub(views) {
  return /** @type {IDeliveryService} */ (
    /** @type {unknown} */ ({ getAgreements: async () => ({ items: views }) })
  );
}

const demoView = () =>
  deriveAgreementView(
    SCHEDULING_AGREEMENT_DEMO,
    DELIVERY_DEMO_SHIPMENTS,
    SDC_SIMULATED_NOW,
    'PT Sample Packaging'
  );

describe('MockChaseService.getUnifiedChase — composition', () => {
  it('folds both families into per-supplier views (commitment-only + data-only)', async () => {
    const svc = new MockChaseService(
      collabStub([
        {
          supplierId: 'sup-005',
          reason: 'overdue',
          awaitingLines: 2,
          dueAt: '2026-08-22T00:00:00.000Z'
        }
      ]),
      deliveryStub([demoView()]) // sa-0002 / sup-007 → real commitment chase
    );
    const { items } = await svc.getUnifiedChase(buyerScope);
    const by = new Map(items.map((v) => [v.supplierId, v]));

    // sup-007 is commitment-only (the sa-0002 chase rows), no data reason.
    expect(
      /** @type {import('../../chase/unifiedChase').SupplierChaseView} */ (by.get('sup-007'))
        .commitmentEntries.length
    ).toBeGreaterThan(0);
    expect(
      /** @type {import('../../chase/unifiedChase').SupplierChaseView} */ (by.get('sup-007'))
        .dataReasons
    ).toEqual([]);
    // sup-005 is data-only.
    expect(
      /** @type {import('../../chase/unifiedChase').SupplierChaseView} */ (by.get('sup-005'))
        .dataReasons
    ).toEqual(['overdue']);
    expect(
      /** @type {import('../../chase/unifiedChase').SupplierChaseView} */ (by.get('sup-005'))
        .commitmentEntries
    ).toEqual([]);
  });

  it('a supplier appearing in BOTH families carries both under one view', async () => {
    const svc = new MockChaseService(
      collabStub([
        {
          supplierId: 'sup-007',
          reason: 'partial-response',
          awaitingLines: 1,
          dueAt: '2026-08-22T00:00:00.000Z'
        }
      ]),
      deliveryStub([demoView()])
    );
    const { items } = await svc.getUnifiedChase(buyerScope);
    const sup007 = /** @type {import('../../chase/unifiedChase').SupplierChaseView} */ (
      items.find((v) => v.supplierId === 'sup-007')
    );
    expect(sup007.dataReasons).toEqual(['partial-response']);
    expect(sup007.commitmentEntries.length).toBeGreaterThan(0);
    expect(sup007.chaseCount).toBe(1 + sup007.commitmentEntries.length);
  });

  it('is BUYER-GATED — a supplier persona resolves an empty chase (a supplier does not chase itself)', async () => {
    const svc = new MockChaseService(
      collabStub([
        {
          supplierId: 'sup-007',
          reason: 'overdue',
          awaitingLines: 1,
          dueAt: '2026-08-22T00:00:00.000Z'
        }
      ]),
      deliveryStub([demoView()])
    );
    expect((await svc.getUnifiedChase(supplierScope)).items).toEqual([]);
  });
});

describe('MockChaseService — over the real wired service', () => {
  it('the buyer sees a coherent non-empty unified chase; a supplier sees none', async () => {
    const buyer = await mockDataService.chase.getUnifiedChase(buyerScope);
    expect(buyer.items.length).toBeGreaterThan(0);
    // sup-007 (sa-0002) is present with its real commitment chase.
    const sup007 = buyer.items.find((v) => v.supplierId === 'sup-007');
    expect(sup007?.commitmentEntries.length).toBeGreaterThan(0);
    // The buyer gate (a supplier does not chase itself).
    expect((await mockDataService.chase.getUnifiedChase(supplierScope)).items).toEqual([]);
  });

  it('surfaces a firm/HARD non-compliance-alert (sa-1007 / sup-006) sorted worst-first at the top', async () => {
    const { items } = await mockDataService.chase.getUnifiedChase(buyerScope);
    // sa-1007 is a JIT/firm agreement with two genuinely-missed released lines →
    // firm/hard non-compliance-alerts (derived, not stamped). This proves the
    // hard/soft split is demonstrable, not just unit-provable.
    const sup006 = items.find((v) => v.supplierId === 'sup-006');
    expect(sup006).toBeDefined();
    expect(
      /** @type {import('../../chase/unifiedChase').SupplierChaseView} */ (sup006).overallSeverity
    ).toBe('hard');
    const hardAlert = /** @type {import('../../chase/unifiedChase').SupplierChaseView} */ (
      sup006
    ).commitmentEntries.find(
      (e) => e.mode === 'non-compliance-alert' && e.type === 'firm' && e.severity === 'hard'
    );
    expect(hardAlert).toBeDefined();
    // Worst-first: a hard supplier sorts above every soft one — the top card is hard.
    expect(items[0].overallSeverity).toBe('hard');
  });
});
