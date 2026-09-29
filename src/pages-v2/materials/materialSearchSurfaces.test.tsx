import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { BUYER, SUPPLIER, renderWithProviders } from '../../test/test-utils';
import { materialNameStore } from '../../services/data/mock/stores/materialNameStore';
import { purchaseOrderStore } from '../../services/data/mock/stores/purchaseOrderStore';
import { asnStore } from '../../services/data/mock/stores/asnStore';
import { NO_PERSON } from '../../context/noPerson';
import BuyerInventory from '../BuyerInventory';
import SupplierInventory from '../SupplierInventory';
import SupplierShipments from '../SupplierShipments';
import BuyerCallOffs from '../BuyerCallOffs';
import SupplierCallOffs from '../SupplierCallOffs';
import BuyerAlerts from '../BuyerAlerts';

// ─────────────────────────────────────────────────────────────────────────────
// Material C3 · the one material search on every surface of MR-3 d "Anyone
// searching" step 1 (AC-02, AC-03, AC-04): each finds a material by an
// approved trade name and says so; an unapproved name is not found.
//
// Seeded names (materialNameStore): sup-007 · PK-PETB-8810 "ClearForm PET 100
// (sample)" Approved; sup-005 · RM-EMUL-3310 "OleoMul 3310 (sample)" Approved;
// sup-002 · RM-EMUL-3310 "Emulsense 200 (sample)" Awaiting approval.
// ─────────────────────────────────────────────────────────────────────────────

const typeIn = (testId: string, text: string) =>
  fireEvent.change(within(screen.getByTestId(testId)).getByRole('textbox'), { target: { value: text } });

/** An approved name for sup-007's PK-PETB-8801 — the material its call-offs and draft ASN carry. */
const approveBottleName = () => {
  const row = materialNameStore.insert({
    supplierId: 'sup-007',
    materialCode: 'PK-PETB-8801',
    tradeName: 'BottleOne 500 (test)',
    state: 'Awaiting approval',
    submittedBy: NO_PERSON,
    submittedAt: '2026-09-20T02:00:00.000Z',
  });
  materialNameStore.decide(row.id, 'Approved', { decidedBy: NO_PERSON, decidedAt: '2026-09-21T02:00:00.000Z' });
};

beforeEach(() => {
  materialNameStore.reset();
  purchaseOrderStore.reset();
  asnStore.reset();
});

describe('PTI inventory list', () => {
  it('AC-04 — "emulsens 200" finds the approved "Emulsense 200" and names the supplier; unapproved, it is not found (AC-02)', async () => {
    const first = renderWithProviders(<BuyerInventory />, { identity: BUYER });
    await screen.findByTestId('pti-stock-row-sup-002-RM-EMUL-3310');
    typeIn('pti-stock-search', 'emulsens 200');
    await waitFor(() => expect(screen.queryByTestId('pti-stock-row-sup-002-RM-EMUL-3310')).toBeNull());
    first.unmount();

    materialNameStore.decide('smn-0004', 'Approved', { decidedBy: NO_PERSON, decidedAt: '2026-09-21T02:00:00.000Z' });
    renderWithProviders(<BuyerInventory />, { identity: BUYER });
    await screen.findByTestId('pti-stock-row-sup-002-RM-EMUL-3310');
    typeIn('pti-stock-search', 'emulsens 200');
    const reason = await screen.findByTestId('pti-stock-match-sup-002-RM-EMUL-3310');
    expect(reason.textContent).toMatch(/^matched trade name 'Emulsense 200 \(sample\)' \(.+\)$/);
    // the other supplier of the same material is not listed on this name
    expect(screen.queryByTestId('pti-stock-row-sup-005-RM-EMUL-3310')).toBeNull();
    // FU-10 — a PTI viewer reads the supplier's name, not "Your name"
    expect(screen.getByTestId('pti-stock-trade-name-sup-002-RM-EMUL-3310').textContent).toBe(
      "Supplier's name: Emulsense 200 (sample)",
    );
  });
});

describe('supplier inventory list', () => {
  it('finds its own material by its trade name, and never by another supplier’s (AC-03)', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    await screen.findByTestId('sup-stock-search');
    typeIn('sup-stock-search', 'clearform');
    expect((await screen.findByTestId('sup-stock-match-PK-PETB-8810')).textContent).toBe(
      "matched your trade name 'ClearForm PET 100 (sample)'",
    );
    expect(screen.getByTestId('sup-stock-trade-name-PK-PETB-8810').textContent).toBe('Your name: ClearForm PET 100 (sample)');
    expect(screen.queryByTestId('sup-stock-row-PK-PETB-8801')).toBeNull();
    typeIn('sup-stock-search', 'oleomul');
    await waitFor(() => expect(screen.queryByTestId('sup-stock-row-PK-PETB-8810')).toBeNull());
  });
});

describe('stock entry material picker', () => {
  it('narrows the materials to the trade-name match, says why, and keeps the select working', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByTestId('stock-entry-open'));
    typeIn('stock-entry-material-search', 'clear form');
    const select = screen.getByLabelText('Material') as HTMLSelectElement;
    await waitFor(() => {
      const codes = within(select).getAllByRole('option').map((o) => (o as HTMLOptionElement).value);
      expect(codes).toEqual(['', 'PK-PETB-8810']);
    });
    expect(within(select).getByRole('option', { name: /PK-PETB-8810/ }).textContent).toContain(
      "matched your trade name 'ClearForm PET 100 (sample)'",
    );
    fireEvent.change(select, { target: { value: 'PK-PETB-8810' } });
    expect(screen.getByTestId('stock-entry-material-reason').textContent).toContain('ClearForm PET 100 (sample)');
  });
});

describe('ASN line material field', () => {
  it('finds the PO line by the supplier’s trade name and says so', async () => {
    approveBottleName();
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    expect(await screen.findByText('ASN-2025-00215')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByTestId('asn-lines-search');
    typeIn('asn-lines-search', 'botleone');
    expect((await screen.findByTestId('asn-line-match-PK-PETB-8801')).textContent).toBe(
      "matched your trade name 'BottleOne 500 (test)'",
    );
    typeIn('asn-lines-search', 'nothing like it');
    await waitFor(() => expect(screen.queryByLabelText('Shipped quantity for PK-PETB-8801')).toBeNull());
  });
});

describe('call-off lists', () => {
  it('PTI: the umbrella line is found by its supplier’s trade name', async () => {
    approveBottleName();
    renderWithProviders(<BuyerCallOffs />, { identity: BUYER });
    await screen.findByTestId('calloff-search');
    typeIn('calloff-search', 'bottleone');
    const reasons = await screen.findAllByTestId(/^calloff-match-/);
    expect(reasons.length).toBeGreaterThan(0);
    for (const r of reasons) expect(r.textContent).toMatch(/^matched trade name 'BottleOne 500 \(test\)' \(.+\)$/);
  });

  it('supplier: its call-offs are found by its own trade name', async () => {
    approveBottleName();
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER });
    await screen.findByTestId('supplier-calloff-search');
    typeIn('supplier-calloff-search', 'bottleone 500');
    const reasons = await screen.findAllByTestId(/^supplier-calloff-match-/);
    expect(reasons.length).toBeGreaterThan(0);
    for (const r of reasons) expect(r.textContent).toBe("matched your trade name 'BottleOne 500 (test)'");
  });
});

describe('alert list', () => {
  it('an alert is found by the approved trade name of its material', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: BUYER });
    await screen.findByTestId('alert-search');
    typeIn('alert-search', 'clearform');
    const reasons = await screen.findAllByTestId(/^alert-match-/);
    expect(reasons.length).toBeGreaterThan(0);
    for (const r of reasons) expect(r.textContent).toMatch(/^matched trade name 'ClearForm PET 100 \(sample\)' \(.+\)$/);
  });
});
