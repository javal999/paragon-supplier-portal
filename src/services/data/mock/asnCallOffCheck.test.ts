// ────────────────────────────────────────────────────────────────────────────
// MR-6 BR-10 to BR-13 through the REAL MockCommandService and read service:
// the ASN against its call-off (warnings stored at submit, never a block) and
// the `callOffNotCovered` alert (PTI-only). AC-05, AC-06 and AC-07 end in the
// store or the read the page makes.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { asnStore } from './stores/asnStore';
import { callOffStore } from './stores/callOffStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { inventoryAlertLedger } from './stores/inventoryHubStores';
import type { CallOff, QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { asnCallOffWarnings, callOffViews } from '../../transitions/callOffRules';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '../../../context/noPerson';

const svc = new MockCommandService();
const reads = new MockProcurementService();

const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});
const sup007 = supplier('sup-007');
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};

beforeEach(() => {
  asnStore.reset();
  callOffStore.reset();
  purchaseOrderStore.reset();
  inventoryDeclarationStore.reset();
  inventoryAlertLedger.reset();
});

// co-0006 — sup-007, PO-2025-00107 / li-007a, PK-PETB-8801, 10,000 PCS, Confirmed.
const CO = 'co-0006';
const needDate = () => callOffStore.get(CO)!.needDate;

const createAsn = (payload: Record<string, unknown>) =>
  svc.dispatch(sup007, {
    transitionId: 't_asn_create',
    entity: 'advanceShipNotice',
    payload: { poReference: 'PO-2025-00107', shipDate: needDate(), ...payload },
  });
const submitAsn = (asnNumber: string, payload: Record<string, unknown> = {}) =>
  svc.dispatch(sup007, {
    transitionId: 't_asn_submit',
    entity: 'advanceShipNotice',
    entityId: asnNumber,
    payload: { carrier: 'Sample Courier', trackingNumber: 'B 1 XY', eta: needDate(), ...payload },
  });
const lines = (qty: number) => [{ materialCode: 'PK-PETB-8801', shippedQty: qty, batchNumber: 'LOT-1' }];
const plannerView = (asnNumber: string) =>
  asnCallOffWarnings(
    asnStore.get(asnNumber)!,
    callOffViews(callOffStore.all(), asnStore.all(), goodsReceiptStore.all(), sdcClock.now()),
    asnStore.all(),
  );

describe('AC-05 — an ASN 10% over the call-off with a 5% tolerance submits, and shows the mismatch with figures', () => {
  it('fires: 11,000 against 10,000 is submitted, and the warning is stored and recomputed for the planner', async () => {
    const created = await createAsn({ callOffId: CO, lines: lines(11000) });
    expect(created.status).toBe('done');
    const res = await submitAsn(created.entityId!);
    expect(res.reason).toBeUndefined();
    expect(res.status).toBe('done');
    const stored = asnStore.get(created.entityId!)!;
    expect(stored.status).toBe('Submitted');
    const qtyOver = { kind: 'qtyOver', detail: { callOffNumber: 'CO-2026-0006', shipped: 11000, agreed: 10000, pct: 10, limit: 5 } };
    expect(stored.callOffWarnings).toEqual([qtyOver]);
    expect(plannerView(created.entityId!)).toEqual([qtyOver]);
  });

  it('passes: 10,000 on the agreed date submits with no warning stored', async () => {
    const created = await createAsn({ callOffId: CO, lines: lines(10000) });
    await submitAsn(created.entityId!);
    expect(asnStore.get(created.entityId!)!.callOffWarnings).toBeUndefined();
    expect(plannerView(created.entityId!)).toEqual([]);
  });

  it('edge case 6 — the planner sees the CURRENT comparison after the call-off changes; the record keeps what was shown', async () => {
    const created = await createAsn({ callOffId: CO, lines: lines(10000) });
    await submitAsn(created.entityId!);
    const co = callOffStore.get(CO)!;
    callOffStore.update(CO, () => ({
      ...co,
      confirmation: { ...co.confirmation!, deliveries: [{ quantity: 8000, date: co.needDate }] },
    }));
    expect(asnStore.get(created.entityId!)!.callOffWarnings).toBeUndefined();
    expect(plannerView(created.entityId!).map((w) => w.detail)).toEqual([
      { callOffNumber: 'CO-2026-0006', shipped: 10000, agreed: 8000, pct: 25, limit: 5 },
    ]);
  });
});

describe('BR-10 date — a late ETA warns and still submits', () => {
  it('fires: an ETA 3 days after the agreed date', async () => {
    const created = await createAsn({ callOffId: CO, lines: lines(10000) });
    const eta = new Date(Date.parse(`${needDate()}T00:00:00.000Z`) + 3 * 86_400_000).toISOString().slice(0, 10);
    const res = await submitAsn(created.entityId!, { eta });
    expect(res.status).toBe('done');
    expect(asnStore.get(created.entityId!)!.callOffWarnings).toEqual([
      { kind: 'late', detail: { callOffNumber: 'CO-2026-0006', eta, agreedDate: needDate(), days: 3 } },
    ]);
  });
});

describe('BR-10 under — the "last ASN" mark is stored, and only then does a shortfall warn', () => {
  it('fires on the final ASN; the same quantity not marked final passes', async () => {
    const final = await createAsn({ callOffId: CO, lines: lines(9000), callOffFinal: true });
    await submitAsn(final.entityId!);
    expect(asnStore.get(final.entityId!)!).toMatchObject({
      callOffFinal: true,
      callOffWarnings: [{ kind: 'qtyUnder', detail: { shipped: 9000, agreed: 10000, pct: 10 } }],
    });
    asnStore.reset();
    const part = await createAsn({ callOffId: CO, lines: lines(9000) });
    await submitAsn(part.entityId!);
    expect(asnStore.get(part.entityId!)!.callOffWarnings).toBeUndefined();
  });

  it('the Submit drawer can clear the mark it set on the draft', async () => {
    const draft = await createAsn({ callOffId: CO, lines: lines(9000), callOffFinal: true });
    await submitAsn(draft.entityId!, { callOffFinal: false });
    expect(asnStore.get(draft.entityId!)!.callOffFinal).toBeUndefined();
  });
});

describe('AC-06 — an ASN with no call-off on a PO line with an open confirmed call-off warns', () => {
  it('fires: the unlinked warning names the open call-off, and submit is not blocked', async () => {
    const created = await createAsn({ lines: lines(1000) });
    const res = await submitAsn(created.entityId!);
    expect(res.status).toBe('done');
    const warnings = asnStore.get(created.entityId!)!.callOffWarnings ?? [];
    expect(warnings.map((w) => w.kind)).toEqual(['unlinked']);
    expect(warnings[0].detail.materialCode).toBe('PK-PETB-8801');
    expect(warnings[0].detail.callOffNumbers).toContain('CO-2026-0006');
    // A delivered call-off on the same line is not "open" (CO-2026-0013).
    expect(warnings[0].detail.callOffNumbers).not.toContain('CO-2026-0013');
  });

  it('passes: the same ASN linked to the call-off carries no unlinked warning', async () => {
    const created = await createAsn({ callOffId: CO, lines: lines(10000) });
    await submitAsn(created.entityId!);
    expect(asnStore.get(created.entityId!)!.callOffWarnings).toBeUndefined();
  });
});

describe('AC-07 — callOffNotCovered: 1,000 due inside the lead time against SOH + production of 600', () => {
  // sup-002 × RM-STEAR-7300 has a 21-day lead time on record and no call-off.
  const now = () => sdcClock.now();
  const dayFromNow = (n: number) => new Date(Date.parse(now()) + n * 86_400_000).toISOString().slice(0, 10);
  const declare = () =>
    inventoryDeclarationStore.add({
      // The store's own id, so this is the latest record for the pair.
      id: inventoryDeclarationStore.nextNumber(),
      supplierId: 'sup-002',
      materialCode: 'RM-STEAR-7300',
      declaredAt: now(),
      totalQty: 400,
      uom: 'KG',
      inProductionQty: 200,
      productionCompletionDate: dayFromNow(3),
      channel: 'manual',
      provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' },
    } as Parameters<typeof inventoryDeclarationStore.add>[0]);
  const confirmedCallOff = (quantity: number): CallOff => ({
    ...callOffStore.get(CO)!,
    id: 'co-t-stear',
    callOffNumber: 'CO-T-STEAR',
    poId: 'po-002',
    poNumber: 'PO-T-STEAR',
    poLineId: 'li-t-stear',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    materialCode: 'RM-STEAR-7300',
    uom: 'KG',
    quantity,
    needDate: dayFromNow(10),
    status: 'Confirmed',
    confirmation: { kind: 'confirm', deliveries: [{ quantity, date: dayFromNow(10) }], confirmedAt: now(), approval: 'auto' },
    agreedDeliveries: undefined,
    dispatches: [],
  });
  const KEY = 'callOffNotCovered|RM-STEAR-7300|sup-002';

  it('fires for PTI, with the days to the need date, and is never shown to the supplier', async () => {
    declare();
    callOffStore.add(confirmedCallOff(1000));
    const pti = (await reads.getInventoryAlerts(buyer)).items;
    expect(pti.find((a) => a.key === KEY)).toMatchObject({ rule: 'callOffNotCovered', status: 'open', daysToImpact: 10 });
    const own = (await reads.getInventoryAlerts(supplier('sup-002'))).items;
    expect(own.some((a) => a.rule === 'callOffNotCovered')).toBe(false);
    // Known-true: the supplier still reads its own other alerts.
    expect(own.length).toBeGreaterThan(0);
  });

  it('passes: a call-off of 600 is covered by the same 600', async () => {
    declare();
    callOffStore.add(confirmedCallOff(600));
    const pti = (await reads.getInventoryAlerts(buyer)).items;
    expect(pti.some((a) => a.key === KEY)).toBe(false);
  });
});
