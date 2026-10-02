// ────────────────────────────────────────────────────────────────────────────
// Order collaboration phase 2b — ASN (REQ-E07-04), goods receipt discrepancy
// (REQ-E07-06) and invoice (REQ-E07-07), dispatched through the REAL
// MockCommandService against the real stores. Every rule is probed both ways:
// a known-good input that passes and a known-bad one that is refused BY NAME.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { invoiceStore } from './stores/invoiceStore';
import { receiptDiscrepancyStore } from './stores/receiptDiscrepancyStore';
import { toSupplierInvoice } from '../invoiceProjection';
import { POStatus } from '../types';
import type { ASN, InvoiceLine, QueryScope } from '../types';
import type { GoodsReceipt } from '@data/mockGoodsReceipts';
import { PERSONA_SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import {
  compareReceipt,
  deriveInvoiceVerdict,
  hasReceiptDiscrepancy,
  openQtyForLine,
  supplierInvoiceStage,
} from '../../transitions/fulfilmentRules';
import { invoicePriceTolerance } from '../../transitions/fulfilmentConfig';
import { NO_PERSON } from '@context/noPerson';

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
  purchaseOrderStore.reset();
  asnStore.reset();
  goodsReceiptStore.reset();
  invoiceStore.reset();
  receiptDiscrepancyStore.reset();
});

// PO-2025-00107 (po-007) — sup-007, Confirmed, one line PK-PETB-8801 × 200,000
// at Rp 1,600. The fixture ASNs against it carry other materials, so the whole
// 200,000 is open.
const PO = 'PO-2025-00107';
const MAT = 'PK-PETB-8801';

const createAsn = (payload: Record<string, unknown>, scope = sup007) =>
  svc.dispatch(scope, { transitionId: 't_asn_create', entity: 'advanceShipNotice', payload: { poReference: PO, ...payload } });

const asnVerb = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}, scope = sup007) =>
  svc.dispatch(scope, { transitionId, entity: 'advanceShipNotice', entityId, payload });

const SUBMIT = {
  carrier: 'Sample Courier',
  trackingNumber: 'B 1234 XY',
  eta: '2026-09-20',
  shipDate: '2026-09-18',
};

describe('ASN — roles (REQ-E07-04, bilateral)', () => {
  it('cancel and the discrepancy answer sit in the supplier fulfilment lane only; resolve in planning only', () => {
    expect(rolesHolding('asn:cancel')).toEqual(['fulfilment']);
    expect(rolesHolding('receiptdiscrepancy:respond')).toEqual(['fulfilment']);
    expect(rolesHolding('receiptdiscrepancy:resolve')).toEqual(['planning']);
  });
});

describe('ASN — shipped quantity within open quantity (BR-02)', () => {
  it('saves the entered lines, batch, expiry, ship date and packing list on the ASN', async () => {
    const res = await createAsn({
      lines: [{ materialCode: MAT, shippedQty: 50_000, batchNumber: 'BATCH-A', expiryDate: '2027-09-01' }],
      shipDate: '2026-09-18',
      packingListFile: 'packing-list.pdf',
    });
    expect(res.status).toBe('done');
    const asn = asnStore.get(res.entityId!)!;
    expect(asn.shipDate).toBe('2026-09-18');
    expect(asn.packingListFile).toBe('packing-list.pdf');
    expect(asn.lineItems).toEqual([
      expect.objectContaining({ materialCode: MAT, shippedQty: 50_000, lotNumber: 'BATCH-A', expiryDate: '2027-09-01' }),
    ]);
  });

  it('a draft without lines proposes the OPEN quantity, not the ordered quantity', async () => {
    await createAsn({ lines: [{ materialCode: MAT, shippedQty: 150_000 }] });
    const second = await createAsn({});
    expect(asnStore.get(second.entityId!)!.lineItems[0].shippedQty).toBe(50_000);
  });

  it('KNOWN-BAD — over-shipment without a reason is refused; KNOWN-GOOD — with a reason it passes', async () => {
    const over = await createAsn({ lines: [{ materialCode: MAT, shippedQty: 200_001 }] });
    expect(over.status).toBe('failed');
    expect(over.reason).toMatch(/POLICY_REJECTED:asn_lines_within_open:OVER_OPEN_QUANTITY/);

    const exact = await createAsn({ lines: [{ materialCode: MAT, shippedQty: 200_000 }] });
    expect(exact.status).toBe('done');

    const withReason = await createAsn({
      lines: [{ materialCode: MAT, shippedQty: 10 }],
      overShipReason: 'Overfill agreed with the planner by phone',
    });
    expect(withReason.status).toBe('done');
  });

  it('refuses a zero quantity and a material the PO does not carry', async () => {
    expect((await createAsn({ lines: [{ materialCode: MAT, shippedQty: 0 }] })).reason).toMatch(/quantity/);
    expect((await createAsn({ lines: [{ materialCode: 'NOT-ON-PO', shippedQty: 5 }] })).reason).toMatch(
      /unknownMaterial/,
    );
  });

  it('multiple ASNs per PO (partial shipments) — and a cancelled ASN frees its quantity again', async () => {
    const first = await createAsn({ lines: [{ materialCode: MAT, shippedQty: 120_000 }] });
    const second = await createAsn({ lines: [{ materialCode: MAT, shippedQty: 80_000 }] });
    expect(second.status).toBe('done');
    const po = purchaseOrderStore.get('po-007')!;
    expect(openQtyForLine(po, po.lineItems[0], asnStore.all())).toBe(0);
    expect((await createAsn({ lines: [{ materialCode: MAT, shippedQty: 1 }] })).status).toBe('failed');

    const cancelled = await asnVerb('t_asn_cancel', first.entityId!);
    expect(cancelled.status).toBe('done');
    expect(asnStore.get(first.entityId!)!.status).toBe('Cancelled');
    expect(openQtyForLine(po, po.lineItems[0], asnStore.all())).toBe(120_000);
    expect((await createAsn({ lines: [{ materialCode: MAT, shippedQty: 120_000 }] })).status).toBe('done');
  });

  it('a partially delivered PO still takes an ASN; an unanswered (Sent) PO does not', async () => {
    purchaseOrderStore.update('po-007', (p) => ({ ...p, status: POStatus.PARTIALLY_DELIVERED }));
    expect((await createAsn({})).status).toBe('done');
    purchaseOrderStore.update('po-007', (p) => ({ ...p, status: POStatus.SENT }));
    const refused = await createAsn({});
    expect(refused.reason).toMatch(/POLICY_REJECTED:asn_create_po_approved/);
  });
});

describe('ASN — submission (BR-04) and the shipment-started date (REQ-E07-05 BR-03)', () => {
  it('KNOWN-BAD — no batch number is refused; KNOWN-GOOD — complete, and shipment started takes the ship date', async () => {
    const draft = (await createAsn({ lines: [{ materialCode: MAT, shippedQty: 1_000 }] })).entityId!;
    const noBatch = await asnVerb('t_asn_submit', draft, SUBMIT);
    expect(noBatch.status).toBe('failed');
    expect(noBatch.reason).toMatch(/INCOMPLETE_ASN: batch number missing/);

    const noShipDate = await asnVerb('t_asn_submit', draft, {
      ...SUBMIT,
      shipDate: undefined,
      lines: [{ materialCode: MAT, shippedQty: 1_000, batchNumber: 'B-1' }],
    });
    expect(noShipDate.reason).toMatch(/INCOMPLETE_ASN: shipDate/);

    const arrivesBeforeShipping = await asnVerb('t_asn_submit', draft, {
      ...SUBMIT,
      eta: '2026-09-01',
      lines: [{ materialCode: MAT, shippedQty: 1_000, batchNumber: 'B-1' }],
    });
    expect(arrivesBeforeShipping.reason).toMatch(/etaBeforeShip/);

    const ok = await asnVerb('t_asn_submit', draft, {
      ...SUBMIT,
      lines: [{ materialCode: MAT, shippedQty: 1_000, batchNumber: 'B-1' }],
    });
    expect(ok.status).toBe('done');
    expect(asnStore.get(draft)!.status).toBe('Submitted');
    expect(purchaseOrderStore.get('po-007')!.shippingNotice?.startedOn).toBe('2026-09-18');
  });

  it('the policy holds on submit too: raising a draft above open quantity without a reason is refused', async () => {
    const draft = (await createAsn({ lines: [{ materialCode: MAT, shippedQty: 1_000 }] })).entityId!;
    await createAsn({ lines: [{ materialCode: MAT, shippedQty: 199_000 }] });
    const res = await asnVerb('t_asn_submit', draft, {
      ...SUBMIT,
      lines: [{ materialCode: MAT, shippedQty: 5_000, batchNumber: 'B-1' }],
    });
    expect(res.reason).toMatch(/OVER_OPEN_QUANTITY/);
  });
});

describe('ASN — cancel before receipt', () => {
  it('cancels a Submitted ASN; refuses once goods were received against it; refuses from In Transit', async () => {
    const id = (await createAsn({ lines: [{ materialCode: MAT, shippedQty: 1_000, batchNumber: 'B-1' }] })).entityId!;
    await asnVerb('t_asn_submit', id, SUBMIT);

    const received = await svc.dispatch(buyer, {
      transitionId: 't_gr_create',
      entity: 'goodsReceipt',
      payload: { asnReference: id, receivedDate: '2026-09-20' },
    });
    expect(received.status).toBe('done');
    const refused = await asnVerb('t_asn_cancel', id);
    expect(refused.reason).toMatch(/POLICY_REJECTED:asn_cancel_not_received/);

    asnStore.update(id, (a) => ({ ...a, status: 'In Transit' }));
    expect((await asnVerb('t_asn_cancel', id)).reason).toMatch(/ILLEGAL_TRANSITION/);
  });

  it('a buyer seat cannot cancel a supplier ASN', async () => {
    const id = (await createAsn({})).entityId!;
    const res = await asnVerb('t_asn_cancel', id, {}, buyer);
    expect(res.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

// ── Goods receipt discrepancy (REQ-E07-06) ──────────────────────────────────

const receipt = (over: Partial<GoodsReceipt['inspectionResults'][number]>, status: GoodsReceipt['status'] = 'Approved') =>
  ({
    status,
    inspectionResults: [
      {
        materialCode: MAT,
        description: 'PET bottle',
        qtyExpected: 1_000,
        qtyReceived: 1_000,
        qtyAccepted: 1_000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass',
        ...over,
      },
    ],
  }) as Pick<GoodsReceipt, 'inspectionResults' | 'status'>;

describe('receipt discrepancy — derived at read time (BR-03, BR-05)', () => {
  // ⚠️ PREMISE CHANGED AT BL-45 (CR-25, owner decision 2026-09-21). This test
  // read "tolerance is 0" and asserted that 999 of 1,000 shipped is flagged.
  // PQ-04 is decided: a shortfall at or below 2% closes the receipt, so 999 is
  // now NOT flagged — and the guard is not weakened, it is moved to the new
  // edge and pinned there both ways (980 closes, 979 is flagged), with any
  // over-delivery still flagged by a single unit.
  it('a short receipt against the ASN is flagged with its difference only beyond the 2% shortfall tolerance', () => {
    const asn = { lineItems: [{ materialCode: MAT, description: '', orderedQty: 1_000, shippedQty: 1_000, lotNumber: 'B' }] } as Pick<ASN, 'lineItems'>;
    const [line] = compareReceipt(receipt({ qtyReceived: 950, qtyAccepted: 950 }), asn);
    expect(line).toMatchObject({ shipped: 1_000, received: 950, difference: -50, qtyOutcome: 'shortOver', flagged: true });
    expect(compareReceipt(receipt({ qtyReceived: 999, qtyAccepted: 999 }), asn)[0]).toMatchObject({
      qtyOutcome: 'shortWithin',
      flagged: false,
    });
    expect(compareReceipt(receipt({ qtyReceived: 980, qtyAccepted: 980 }), asn)[0].flagged).toBe(false);
    expect(compareReceipt(receipt({ qtyReceived: 979, qtyAccepted: 979 }), asn)[0].flagged).toBe(true);
    expect(compareReceipt(receipt({ qtyReceived: 1_001, qtyAccepted: 1_001 }), asn)[0]).toMatchObject({
      qtyOutcome: 'over',
      flagged: true,
    });
    expect(hasReceiptDiscrepancy(receipt({}), asn)).toBe(false);
  });

  it('quantity rejected at inspection is a discrepancy even when received equals shipped', () => {
    expect(hasReceiptDiscrepancy(receipt({ qtyAccepted: 900, qtyRejected: 100 }, 'Partially Approved'))).toBe(true);
  });

  it('before the inspection is final, a recorded rejection does not count yet', () => {
    expect(hasReceiptDiscrepancy(receipt({ qtyAccepted: 0, qtyRejected: 100 }, 'Under Inspection'))).toBe(false);
  });

  it('without the ASN on record, the expected quantity is the shipped basis', () => {
    expect(compareReceipt(receipt({ qtyExpected: 1_200 }))[0]).toMatchObject({ shipped: 1_200, flagged: true });
  });
});

describe('receipt discrepancy — acknowledge, dispute, resolve (AC-03)', () => {
  // gr-006 — sup-008, Posted to SAP, 5,000 of 240,000 rejected at inspection.
  const answer = (transitionId: string, payload: Record<string, unknown>, scope = supplier('sup-008')) =>
    svc.dispatch(scope, { transitionId, entity: 'receiptDiscrepancy', payload });

  it('KNOWN-BAD — a comment is required; a receipt without a discrepancy cannot be answered', async () => {
    expect((await answer('t_receiptdiscrepancy_dispute', { receiptId: 'gr-006' })).reason).toMatch(/MISSING_FIELDS:comment/);
    expect(
      (await answer('t_receiptdiscrepancy_dispute', { receiptId: 'gr-006', comment: '   ' })).reason,
    ).toMatch(/MISSING_FIELDS|a comment is required/);
    // gr-005 — sup-002, posted, nothing rejected, received as expected.
    const none = await answer('t_receiptdiscrepancy_acknowledge', { receiptId: 'gr-005', comment: 'ok' }, supplier('sup-002'));
    expect(none.reason).toMatch(/NO_DISCREPANCY/);
  });

  it('only the receipt\'s own supplier may answer (SCOPE_DENIED otherwise)', async () => {
    await expect(
      answer('t_receiptdiscrepancy_acknowledge', { receiptId: 'gr-006', comment: 'not mine' }, sup007),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });

  it('dispute → planner resolves with a comment; the read joins both onto the receipt', async () => {
    const disputed = await answer('t_receiptdiscrepancy_dispute', {
      receiptId: 'gr-006',
      comment: 'Our QC passed this batch; please retest.',
    });
    expect(disputed.status).toBe('done');
    expect(disputed.entityId).toBe('gr-006');
    expect(receiptDiscrepancyStore.get('gr-006')).toMatchObject({ status: 'Disputed', supplierId: 'sup-008' });

    const again = await answer('t_receiptdiscrepancy_acknowledge', { receiptId: 'gr-006', comment: 'changed my mind' });
    expect(again.reason).toMatch(/ALREADY_ANSWERED/);

    const supplierResolves = await svc.dispatch(supplier('sup-008'), {
      transitionId: 't_receiptdiscrepancy_resolve',
      entity: 'receiptDiscrepancy',
      entityId: 'gr-006',
      payload: { resolutionComment: 'self-resolved' },
    });
    expect(supplierResolves.reason).toMatch(/ROLE_NOT_PERMITTED/);

    const noComment = await svc.dispatch(buyer, {
      transitionId: 't_receiptdiscrepancy_resolve',
      entity: 'receiptDiscrepancy',
      entityId: 'gr-006',
      payload: {},
    });
    expect(noComment.reason).toMatch(/MISSING_FIELDS:resolutionComment/);

    const resolved = await svc.dispatch(buyer, {
      transitionId: 't_receiptdiscrepancy_resolve',
      entity: 'receiptDiscrepancy',
      entityId: 'gr-006',
      payload: { resolutionComment: 'Retest confirmed 5,000 out of spec.' },
    });
    expect(resolved.status).toBe('done');

    const read = await reads.getGoodsReceipts(supplier('sup-008'));
    expect(read.items.find((g) => g.id === 'gr-006')!.discrepancyResponse).toMatchObject({
      status: 'Resolved',
      comment: 'Our QC passed this batch; please retest.',
      resolutionComment: 'Retest confirmed 5,000 out of spec.',
    });
  });

  it('acknowledge closes it with no PTI action', async () => {
    const res = await answer('t_receiptdiscrepancy_acknowledge', { receiptId: 'gr-006', comment: 'Agreed, credit note follows.' });
    expect(res.status).toBe('done');
    expect(receiptDiscrepancyStore.get('gr-006')!.status).toBe('Acknowledged');
  });
});

// ── Invoice (REQ-E07-07) ─────────────────────────────────────────────────────

// gr-002 — sup-007, PO-2025-00107, PK-PETB-8801, 120,000 received. Inspected and
// accepted here so it can be invoiced; expected value 120,000 × 1,600.
const EXPECTED = 120_000 * 1_600;
const receiveGr002 = (rejected = 0) =>
  goodsReceiptStore.update('gr-002', (g) => ({
    ...g,
    status: rejected > 0 ? 'Partially Approved' : 'Approved',
    inspectionResults: g.inspectionResults.map((r) => ({
      ...r,
      qtyAccepted: r.qtyReceived - rejected,
      qtyRejected: rejected,
    })),
  }));

const line = (quantity: number, over: Partial<InvoiceLine> = {}): InvoiceLine => ({
  receiptId: 'gr-002',
  grNumber: 'GR-2026-002',
  materialCode: MAT,
  description: 'PET bottle',
  quantity,
  uom: 'PCS',
  unitPrice: 1_600,
  ...over,
});

const createInvoice = (extra: Record<string, unknown> = {}, scope = sup007) =>
  svc.dispatch(scope, {
    transitionId: 't_invoice_create',
    entity: 'invoice',
    payload: {
      poReference: PO,
      amount: EXPECTED,
      lines: [line(120_000)],
      invoiceNumber: 'SUP-INV-1001',
      invoiceDate: '2026-09-15',
      taxInvoiceFile: 'efaktur-1001.pdf',
      ...extra,
    },
  });

const invVerb = (transitionId: string, entityId: string, payload: Record<string, unknown> = {}, scope = sup007) =>
  svc.dispatch(scope, { transitionId, entity: 'invoice', entityId, payload });

describe('invoice — created from received goods receipts (BR-01, BR-02)', () => {
  beforeEach(() => receiveGr002());

  it('KNOWN-GOOD — carries the lines, the supplier\'s own number and date, and the tax invoice', async () => {
    const res = await createInvoice();
    expect(res.status).toBe('done');
    const inv = invoiceStore.get(res.entityId!)!;
    expect(inv).toMatchObject({
      status: 'Draft',
      invoiceNumber: 'SUP-INV-1001',
      invoiceDate: '2026-09-15',
      taxInvoiceFile: 'efaktur-1001.pdf',
      supplierId: 'sup-007',
    });
    expect(inv.lines).toEqual([line(120_000)]);
  });

  it('KNOWN-BAD — no tax invoice, no lines', async () => {
    expect((await createInvoice({ taxInvoiceFile: '' })).reason).toMatch(/MISSING_FIELDS:taxInvoiceFile/);
    expect((await createInvoice({ lines: [] })).reason).toMatch(/MISSING_FIELDS:lines/);
  });

  it('KNOWN-BAD — over-invoicing: more than accepted, and more than accepted minus already invoiced', async () => {
    expect((await createInvoice({ lines: [line(120_001)] })).reason).toMatch(/OVER_INVOICED/);

    expect((await createInvoice({ lines: [line(100_000)], invoiceNumber: 'A-1' })).status).toBe('done');
    expect((await createInvoice({ lines: [line(20_001)], invoiceNumber: 'A-2' })).reason).toMatch(/OVER_INVOICED/);
    expect((await createInvoice({ lines: [line(20_000)], invoiceNumber: 'A-3' })).status).toBe('done');
  });

  it('only accepted quantity can be invoiced: rejected quantity is not billable', async () => {
    receiveGr002(5_000);
    expect((await createInvoice({ lines: [line(115_001)] })).reason).toMatch(/OVER_INVOICED/);
    expect((await createInvoice({ lines: [line(115_000)] })).status).toBe('done');
  });

  it('KNOWN-BAD — a receipt not yet inspected, a receipt of another PO, a price off the PO', async () => {
    goodsReceiptStore.reset(); // gr-002 back to Pending Inspection
    expect((await createInvoice()).reason).toMatch(/notReceived/);
    receiveGr002();
    // gr-003 sits on PO-2025-00108, not on the PO being invoiced.
    expect(
      (await createInvoice({ lines: [line(1, { receiptId: 'gr-003', grNumber: 'GR-2026-003' })] })).reason,
    ).toMatch(/foreignReceipt/);
    expect((await createInvoice({ lines: [line(1_000, { unitPrice: 1_700 })] })).reason).toMatch(/price/);
  });

  it('a delivered PO is invoiceable; an unanswered one is not', async () => {
    purchaseOrderStore.update('po-007', (p) => ({ ...p, status: POStatus.DELIVERED }));
    expect((await createInvoice()).status).toBe('done');
    purchaseOrderStore.update('po-007', (p) => ({ ...p, status: POStatus.SENT }));
    expect((await createInvoice({ invoiceNumber: 'X-2' })).reason).toMatch(/invoice_create_po_invoiceable/);
  });

  it('KNOWN-BAD — a duplicate invoice number from the same supplier, whatever its case', async () => {
    expect((await createInvoice({ lines: [line(100_000)] })).status).toBe('done');
    const dup = await createInvoice({ lines: [line(1)], invoiceNumber: ' sup-inv-1001 ' });
    expect(dup.reason).toMatch(/DUPLICATE_INVOICE_NUMBER/);
    // A fixture invoice number of the same supplier is a duplicate too.
    const fixture = invoiceStore.all().find((i) => i.supplierId === 'sup-007' && !i.lines)!;
    expect((await createInvoice({ lines: [line(1)], invoiceNumber: fixture.invoiceNumber })).reason).toMatch(
      /DUPLICATE_INVOICE_NUMBER/,
    );
  });
});

describe('invoice — the match runs at submission (CR-12, CR-13)', () => {
  const submitWith = async (amount: number) => {
    const id = (await createInvoice({ amount })).entityId!;
    const res = await invVerb('t_invoice_submit', id, { amount });
    expect(res.status).toBe('done');
    return invoiceStore.get(id)!;
  };

  it('exactly the expected value → Matched, and the invoice advances', async () => {
    receiveGr002();
    const inv = await submitWith(EXPECTED);
    expect(inv.matchStatus).toBe('Matched');
    expect(inv.status).toBe('Matched');
  });

  // ⚠️ PREMISE CHANGED AT BL-44 (CR-12, owner decision 2026-09-21). This test
  // read "1% BOUNDARY — at 1% over it is still Matched" and asserted
  // `EXPECTED * 1.01` → Matched. The flat 1% is retired: a line with no
  // contract price is matched within 2% AND within the rupiah cap, so on this
  // order (expected Rp 192,000,000, where 2% is Rp 3,840,000) THE CAP is what
  // decides and 1% over is now a Price variance. No assertion is weakened —
  // the same two directions are pinned against the rule that now applies, and
  // the percentage side is pinned on its own where the cap does not bind.
  it('CR-12 CAP BOUNDARY — at the cap it is Matched; one rupiah past it is a Price variance and stays Submitted', async () => {
    receiveGr002();
    const atCap = await submitWith(EXPECTED + invoicePriceTolerance().standardCapIdr);
    expect(atCap.matchStatus).toBe('Matched');

    invoiceStore.reset();
    const past = await submitWith(EXPECTED + invoicePriceTolerance().standardCapIdr + 1);
    expect(past.matchStatus).toBe('Price Variance');
    expect(past.status).toBe('Submitted');

    invoiceStore.reset();
    const under = await submitWith(EXPECTED - invoicePriceTolerance().standardCapIdr);
    expect(under.matchStatus).toBe('Matched');

    // And 1% of this order — inside the old tolerance — is now held, because
    // Rp 1,920,000 is over the cap even though it is under 2%.
    invoiceStore.reset();
    const onePercent = await submitWith(EXPECTED * 1.01);
    expect(onePercent.matchStatus).toBe('Price Variance');
  });

  it('QUANTITY MISMATCH — any rejected quantity on a referenced receipt, even at the exact amount', async () => {
    receiveGr002(5_000);
    const id = (await createInvoice({ lines: [line(115_000)], amount: 115_000 * 1_600 })).entityId!;
    await invVerb('t_invoice_submit', id, { amount: 115_000 * 1_600 });
    expect(invoiceStore.get(id)!.matchStatus).toBe('Qty Mismatch');
    expect(invoiceStore.get(id)!.status).toBe('Submitted');
  });

  // ⚠️ PREMISE CHANGED AT BL-44. The pair used to be 101 (Matched at 1%) and
  // 101.01 (Price variance just past 1%). The percentage is now 2%, so the
  // same shape is pinned at the new boundary, both sides, on a line small
  // enough that the rupiah cap cannot be what decides.
  it('pure verdict agrees with the dispatched one, at the 2% boundary both ways', () => {
    expect(deriveInvoiceVerdict({ amount: 102, lines: [line(1, { unitPrice: 100 })] }, [])).toBe('Matched');
    expect(deriveInvoiceVerdict({ amount: 102.01, lines: [line(1, { unitPrice: 100 })] }, [])).toBe('Price Variance');
    expect(deriveInvoiceVerdict({ amount: 98, lines: [line(1, { unitPrice: 100 })] }, [])).toBe('Matched');
    expect(deriveInvoiceVerdict({ amount: 97.99, lines: [line(1, { unitPrice: 100 })] }, [])).toBe('Price Variance');
  });

  // CR-12 (BL-44) — a contract price on the PO line allows no difference at all,
  // and the line carries the contract forward from the order.
  it('CONTRACT PRICE — the same order is Matched at the exact value and held one rupiah off', () => {
    const contractLine = line(1, { unitPrice: 100, contractNumber: 'CTR-2025-018' });
    expect(deriveInvoiceVerdict({ amount: 100, lines: [contractLine] }, [])).toBe('Matched');
    expect(deriveInvoiceVerdict({ amount: 101, lines: [contractLine] }, [])).toBe('Price Variance');
    expect(deriveInvoiceVerdict({ amount: 99, lines: [contractLine] }, [])).toBe('Price Variance');
  });

  it('a receipt posted later does not overwrite the verdict of an invoice that names its receipts', async () => {
    receiveGr002();
    const inv = await submitWith(EXPECTED * 1.05); // Price Variance, stays Submitted
    goodsReceiptStore.update('gr-002', (g) => ({ ...g, status: 'Approved' }));
    await svc.dispatch(buyer, { transitionId: 't_gr_post', entity: 'goodsReceipt', entityId: 'gr-002' });
    expect(invoiceStore.get(inv.id)!.matchStatus).toBe('Price Variance');
  });
});

describe('invoice — Returned, correct and resubmit; status list and CR-14', () => {
  beforeEach(() => receiveGr002());

  it('Finance returns with a reason; the supplier corrects the amount and resubmits; the match runs again', async () => {
    const id = (await createInvoice({ amount: EXPECTED * 1.2 })).entityId!;
    await invVerb('t_invoice_submit', id, { amount: EXPECTED * 1.2 });
    expect(invoiceStore.get(id)!.matchStatus).toBe('Price Variance');

    const returned = await invVerb('t_invoice_dispute', id, { disputeReason: 'Amount is 20% above the PO price.' }, buyer);
    expect(returned.status).toBe('done');
    const inv = invoiceStore.get(id)!;
    expect(inv.returnReason).toBe('Amount is 20% above the PO price.');
    expect(toSupplierInvoice(inv, '2026-09-17T00:00:00.000Z').stage).toBe('Returned');

    // A buyer cannot resubmit on the supplier's behalf.
    expect((await invVerb('t_invoice_resubmit', id, { amount: EXPECTED }, buyer)).reason).toMatch(/ROLE_NOT_PERMITTED/);

    const fixed = await invVerb('t_invoice_resubmit', id, { amount: EXPECTED, invoiceNumber: 'SUP-INV-1001-R' });
    expect(fixed.status).toBe('done');
    expect(invoiceStore.get(id)).toMatchObject({
      status: 'Matched',
      matchStatus: 'Matched',
      invoiceNumber: 'SUP-INV-1001-R',
      amount: EXPECTED,
    });
  });

  it('KNOWN-BAD — a resubmission may not over-invoice nor reuse another invoice\'s number', async () => {
    const other = (await createInvoice({ lines: [line(20_000)], invoiceNumber: 'TAKEN-1', amount: 20_000 * 1_600 })).entityId!;
    expect(other).toBeTruthy();
    const id = (await createInvoice({ lines: [line(100_000)], amount: 1 })).entityId!;
    await invVerb('t_invoice_submit', id, { amount: 1 });
    await invVerb('t_invoice_dispute', id, { disputeReason: 'Wrong amount' }, buyer);

    expect((await invVerb('t_invoice_resubmit', id, { amount: 100, invoiceNumber: 'TAKEN-1' })).reason).toMatch(
      /DUPLICATE_INVOICE_NUMBER/,
    );
    // Its own 100,000 is left out of "already invoiced", the other 20,000 is not.
    expect(
      (await invVerb('t_invoice_resubmit', id, { amount: 100, lines: [line(100_001)] })).reason,
    ).toMatch(/OVER_INVOICED/);
    expect((await invVerb('t_invoice_resubmit', id, { amount: 100_000 * 1_600, lines: [line(100_000)] })).status).toBe('done');
  });

  it('CR-14 — due = submission + 30 days; overdue is derived, never stored', async () => {
    const id = (await createInvoice()).entityId!;
    await invVerb('t_invoice_submit', id, { amount: EXPECTED });
    const inv = invoiceStore.get(id)!;
    const due = new Date(Date.parse(inv.submittedDate) + 30 * 86_400_000).toISOString().slice(0, 10);
    expect(inv.dueDate).toBe(due);
    expect(toSupplierInvoice(inv, `${inv.submittedDate}T00:00:00.000Z`).overdue).toBe(false);
    const later = new Date(Date.parse(due) + 3 * 86_400_000).toISOString();
    expect(toSupplierInvoice(inv, later)).toMatchObject({ overdue: true, daysOutstanding: 3 });
  });

  it('the supplier status list maps every stored state', () => {
    expect(supplierInvoiceStage('Draft')).toBe('Draft');
    expect(supplierInvoiceStage('Submitted')).toBe('Submitted');
    expect(supplierInvoiceStage('Matched')).toBe('Verified');
    expect(supplierInvoiceStage('Approved')).toBe('Verified');
    expect(supplierInvoiceStage('Releasing Payment')).toBe('Scheduled for payment');
    expect(supplierInvoiceStage('Payment Released')).toBe('Paid');
    expect(supplierInvoiceStage('Remittance Received')).toBe('Paid');
    expect(supplierInvoiceStage('Disputed')).toBe('Returned');
  });
});
