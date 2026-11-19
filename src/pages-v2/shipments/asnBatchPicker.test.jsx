// MR-6 BR-01 to BR-04 — the batch field on the supplier's ASN form, and the
// "not in declared stock" marker PTI sees. Rendered through the real mock
// service; the stock record is added to the store the read model reads.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER, BUYER } from '@test/test-utils';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { inventoryDeclarationStore } from '@services/data/mock/stores/inventoryDeclarationStore';
import { commandAuditSink } from '@services/data/mock/MockCommandService';
import SupplierShipments from '../SupplierShipments';
import BuyerShipments from '../BuyerShipments';

const MAT = 'PK-PETB-8801';

// sup-007's stock record for PK-PETB-8801 with two batches, one partly shipped
// on a Submitted ASN after the record.
const declareWithOneShipped = () => {
  inventoryDeclarationStore.add({
    id: 'inv-9901',
    supplierId: 'sup-007',
    materialCode: MAT,
    declaredAt: '2026-09-01T02:00:00.000Z',
    totalQty: 5000,
    uom: 'PCS',
    batches: [
      { batchNumber: 'PET-A', qty: 3000, uom: 'PCS', expiryDate: '2028-01-31' },
      { batchNumber: 'PET-B', qty: 2000, uom: 'PCS', expiryDate: '2028-03-31' }
    ],
    provenance: { source: 'SUPPLIER', liveness: 'SIMULATED', planState: 'committed' }
  });
  const base = /** @type {import('@services/data/types').ASN} */ (asnStore.get('ASN-2025-00211'));
  asnStore.add({
    ...base,
    asnNumber: 'ASN-TEST-0001',
    status: 'Submitted',
    shipDate: '2026-09-05',
    lineItems: [
      { materialCode: MAT, description: '', orderedQty: 0, shippedQty: 1200, lotNumber: 'PET-A' }
    ]
  });
};

beforeEach(() => {
  purchaseOrderStore.reset();
  asnStore.reset();
  inventoryDeclarationStore.reset();
  commandAuditSink.clear();
});

describe('supplier ASN form — batch from declared stock', () => {
  it('AC-01 — the picker lists declared batches with what is left, and picking one fills the expiry', async () => {
    declareWithOneShipped();
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('ASN-2025-00215')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    const picker = /** @type {HTMLSelectElement} */ (
      await screen.findByLabelText(`Batch number for ${MAT}`)
    );
    await waitFor(() => expect(picker.tagName).toBe('SELECT'));
    const options = within(picker)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options.find((o) => o?.startsWith('PET-A'))).toMatch(
      /^PET-A · 1,800 available · expires .*2028$/
    );
    expect(options.find((o) => o?.startsWith('PET-B'))).toMatch(
      /^PET-B · 2,000 available · expires .*2028$/
    );

    fireEvent.change(picker, { target: { value: 'PET-B' } });
    expect(
      /** @type {HTMLInputElement} */ (screen.getByLabelText(`Expiry date for ${MAT}`)).value
    ).toBe('2028-03-31');
  });

  it('AC-02 — without declared batches the batch is typed, with the note', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('ASN-2025-00215')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const field = await screen.findByLabelText(`Batch number for ${MAT}`);
    expect(field.tagName).toBe('INPUT');
    expect(screen.getAllByText('This batch is not in your declared stock').length).toBeGreaterThan(
      0
    );
  });

  it("BR-03 — a line above the batch's available quantity warns on the confirm step, and the ASN still submits", async () => {
    declareWithOneShipped();
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('ASN-2025-00215')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Create ASN/ }));
    fireEvent.click(await screen.findByRole('button', { name: /PO-2025-00107/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    fireEvent.change(await screen.findByLabelText('Tracking or vehicle number'), {
      target: { value: 'B 1234 XY' }
    });
    fireEvent.change(screen.getByLabelText('Ship date *'), { target: { value: '2026-09-18' } });
    fireEvent.change(screen.getByLabelText('Estimated arrival *'), {
      target: { value: '2026-09-20' }
    });
    // AIB-1 BR-03 / BR-04 (BL-348) — required before step 2 can advance.
    fireEvent.change(screen.getByLabelText('Sequence'), { target: { value: '38' } });
    fireEvent.change(screen.getByLabelText('Surat Jalan (External ID)'), {
      target: { value: 'SJ-TEST-38' }
    });
    fireEvent.change(screen.getByLabelText(`Shipped quantity for ${MAT}`), {
      target: { value: '2500' }
    });
    const picker = await screen.findByLabelText(`Batch number for ${MAT}`);
    await waitFor(() => expect(picker.tagName).toBe('SELECT'));
    fireEvent.change(picker, { target: { value: 'PET-A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    const warning = await screen.findByTestId('asn-batch-above-available');
    expect(warning).toHaveTextContent(
      `${MAT}: ships 2,500 from batch PET-A, above the 1,800 available`
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Submit ASN' }));
    await waitFor(() =>
      expect(
        commandAuditSink.byEvent('t_asn_submit').filter((e) => e.outcome === 'done')
      ).toHaveLength(1)
    );
    const created = asnStore
      .all()
      .find((a) => a.lineItems.some((l) => l.lotNumber === 'PET-A' && l.shippedQty === 2500));
    expect(created?.status).toBe('Submitted');
    expect(created?.lineItems[0].batchSource).toBe('declared');
  });
});

describe('planner ASN detail — "not in declared stock" (MR-6 BR-04, AC-02)', () => {
  it('marks a typed batch, and not a declared one', async () => {
    // ⚠️ THE SUBJECT MOVED AT BL-139, BECAUSE THE PREMISE DID: the drill renders
    // an ASN's LINES only when the PO has exactly one active ASN
    // (`drilledAsns.length === 1`), and `gr-005` now names `ASN-2025-00405` on
    // PO-2025-00116 — so that PO no longer has one. `ASN-2025-00403` is the
    // only active ASN on PO-2025-00108 (po-008), and it carries a line.
    asnStore.update('ASN-2025-00403', (a) => ({
      ...a,
      lineItems: a.lineItems.map((l) => ({ ...l, batchSource: /** @type {const} */ ('typed') }))
    }));
    const { unmount } = renderWithProviders(<BuyerShipments />, {
      identity: BUYER,
      route: '/buyer/shipments?po=po-008&from=order-summary'
    });
    expect(
      await screen.findByTestId('asn-batch-not-declared-ASN-2025-00403-PK-PETB-8802')
    ).toHaveTextContent('Not in declared stock');
    unmount();

    asnStore.update('ASN-2025-00403', (a) => ({
      ...a,
      lineItems: a.lineItems.map((l) => ({ ...l, batchSource: /** @type {const} */ ('declared') }))
    }));
    renderWithProviders(<BuyerShipments />, {
      identity: BUYER,
      route: '/buyer/shipments?po=po-008&from=order-summary'
    });
    expect(await screen.findByTestId('drill-asn-ASN-2025-00403')).toHaveTextContent('LOT-403');
    expect(screen.queryByTestId('asn-batch-not-declared-ASN-2025-00403-PK-PETB-8802')).toBeNull();
  });
});
