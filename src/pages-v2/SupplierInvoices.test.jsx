import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import { invoiceStore } from '@services/data/mock/stores/invoiceStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import SupplierInvoices from './SupplierInvoices';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier with no invoices on file (sup-007/002/005 have fixtures).
/** @type {CurrentIdentity} */
const SUPPLIER_NO_INVOICES = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

describe('SupplierInvoices — four honest states', () => {
  it('data: renders the scoped invoice workspace for the seeded supplier', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    expect(await screen.findByText('My Invoices')).toBeInTheDocument();
    expect(await screen.findByText('Payments Received')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<SupplierInvoices />, {
      identity: SUPPLIER,
      service: alwaysPending
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Payments Received')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<SupplierInvoices />, {
      identity: SUPPLIER,
      service: alwaysFails
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no invoices', async () => {
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER_NO_INVOICES });
    expect(await screen.findByText('No invoices yet')).toBeInTheDocument();
  });
});

// The honest submit path (UI): the Draft row's Submit button dispatches the real
// verb through the command seam (Draft → Submitted), not a toast stub.
describe('SupplierInvoices — Submit dispatches the real verb', () => {
  it('submits a Draft invoice through the command seam (Draft → Submitted)', async () => {
    invoiceStore.reset();
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    await screen.findByText('My Invoices');

    // sup-007 has exactly one Draft: INV-2026-BRL-0055 (inv-brl-0055).
    fireEvent.click(await screen.findByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(
        /** @type {import('@services/data/types').Invoice} */ (invoiceStore.get('inv-brl-0055'))
          .status
      ).toBe('Submitted');
    });
  });
});

// ── CP-0 · W1 · 2f-d — the new-invoice amount, the OTHER operand of 2f-c's
// verdict ────────────────────────────────────────────────────────────────────
//
// `deriveMatchVerdict(expectedValue, inv.amount, …)`: 2f-c stopped a misread
// confirmed quantity poisoning the first operand; this stops a misread amount
// poisoning the second. Either produces the same false accusation against a
// supplier — an honest invoice booked 'Price Variance'.
//
// 2f-FIND-04's guard was REAL (`!Number.isFinite(amount) || amount <= 0`) and
// survived its body-read, so these specs guard only what a finiteness check
// structurally cannot see. The durable lock is still the INPUT CONTRACT
// (`type="text"` + `inputMode`), because the locale failure reproduces in
// neither jsdom nor en-US (4b-FIND-01).
describe('SupplierInvoices — the new-invoice amount is text, so the parser is load-bearing', () => {
  const openNewInvoice = async () => {
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    await screen.findByText('My Invoices');
    fireEvent.click(screen.getByRole('button', { name: 'New invoice' }));
    return screen.findByLabelText('Amount (IDR)');
  };

  it('THE LOCK — the amount input is not type="number" (Ruling 6.2)', async () => {
    const amount = await openNewInvoice();
    expect(amount).toHaveAttribute('type', 'text');
    expect(amount).toHaveAttribute('inputmode', 'decimal');
    // `min={0}` was a number-input affordance that never bound the parse.
    expect(amount).not.toHaveAttribute('min');
  });

  it('an untouched blank does NOT nag — the field is UNSEEDED, so the 2e-a rule applies', async () => {
    // Contrast the seeded 2f-a/2f-c cells, where every blank is
    // operator-cleared and therefore always speaks.
    const amount = await openNewInvoice();
    expect(amount).toHaveValue('');
    expect(screen.queryByTestId('invoice-amount-refusal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
  });

  it('a cross-convention "1.500" REFUSES — the token the finiteness guard waved past as 1.5', async () => {
    const amount = await openNewInvoice();
    fireEvent.change(amount, { target: { value: '1.500' } });
    const refusal = screen.getByTestId('invoice-amount-refusal');
    expect(refusal).toHaveAttribute('role', 'alert');
    expect(refusal.textContent).toMatch(/can be read two ways/i);
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
  });

  it('READS a fully grouped "185.000.000" — the way an Indonesian supplier types it', async () => {
    // Under the retired `type="number"` this token was rejected outright
    // (`.value === ''`), so the guard refused a perfectly real invoice: an
    // expressibility failure hiding inside a working guard.
    const amount = await openNewInvoice();
    fireEvent.change(amount, { target: { value: '185.000.000' } });
    expect(screen.queryByTestId('invoice-amount-refusal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invoice-amount-zero')).not.toBeInTheDocument();
  });

  it('the silent `> 0` rule finally SAYS SO on a typed zero', async () => {
    // No rule changed — a non-positive amount was always refused. It was
    // refused by a generic warning toast naming three causes at once.
    const amount = await openNewInvoice();
    fireEvent.change(amount, { target: { value: '0' } });
    expect(screen.getByTestId('invoice-amount-zero').textContent).toMatch(/greater than zero/i);
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
  });

  it('POSITIVE TWIN — a readable amount on a complete receipt-based invoice ENABLES the create', async () => {
    // ⚠️ REQ-E07-07 CHANGED THIS TEST'S PREMISE. A PO and an amount no longer make
    // an invoice: it is drawn from a RECEIVED goods receipt of the supplier's own
    // PO and carries the invoice number, date and tax invoice. sup-007's receipt
    // GR-2026-003 sits on PO-2025-00108, which is confirmed first so it can be
    // invoiced. A negative assertion alone proves nothing, so the gate is walked
    // shut → open.
    purchaseOrderStore.reset();
    goodsReceiptStore.reset();
    invoiceStore.reset();
    await mockDataService.commands.dispatch(
      {
        personaType: 'supplier',
        supplierId: 'sup-007',
        businessRoles: PERSONA_SYSTEM_ROLES.supplier
      },
      {
        transitionId: 't_po_confirm',
        entity: 'purchaseOrder',
        entityId: 'po-008',
        payload: { confirmedQuantities: [150000] }
      }
    );
    const amount = await openNewInvoice();
    fireEvent.change(screen.getByLabelText('Purchase order'), {
      target: { value: 'PO-2025-00108' }
    });
    fireEvent.click(await screen.findByLabelText(/GR-2026-003, received/));
    fireEvent.change(screen.getByLabelText('Invoice number'), { target: { value: 'SUP-INV-777' } });
    fireEvent.change(screen.getByLabelText('Invoice date'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('Tax invoice (e-Faktur)'), {
      target: { files: [new File(['x'], 'efaktur-777.pdf', { type: 'application/pdf' })] }
    });
    expect(screen.getByRole('button', { name: 'Create draft' })).toBeDisabled();
    fireEvent.change(amount, { target: { value: '185000000' } });
    expect(screen.queryByTestId('invoice-amount-refusal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create draft' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Submit invoice' })).not.toBeDisabled();
  });
});

// The resubmit amount had the `> 0` rule with no voice: a typed zero parses, so
// no refusal showed, and `fixReady` kept the resubmit shut with no reason given.
// The new-invoice field already says so (`invoice-amount-zero`); the fix field
// now says the same thing, with the same key.
describe('SupplierInvoices — the resubmit amount says why a zero is refused', () => {
  const openFix = async () => {
    invoiceStore.reset();
    invoiceStore.update('inv-brl-0055', (i) => ({
      ...i,
      status: 'Disputed',
      returnReason: 'Amount above PO price'
    }));
    renderWithProviders(<SupplierInvoices />, { identity: SUPPLIER });
    const row = /** @type {HTMLTableRowElement} */ (
      (await screen.findByText('INV-2026-BRL-0055')).closest('tr')
    );
    fireEvent.click(within(row).getByRole('button', { name: 'Correct and resubmit' }));
    return screen.findByLabelText('Amount (IDR)');
  };

  it('KNOWN-GOOD FIRST: a positive amount shows no zero message', async () => {
    const amount = await openFix();
    fireEvent.change(amount, { target: { value: '185000000' } });
    expect(screen.queryByTestId('invoice-fix-amount-zero')).not.toBeInTheDocument();
  });

  it('a typed zero names the rule, and the resubmit stays shut', async () => {
    const amount = await openFix();
    fireEvent.change(amount, { target: { value: '0' } });
    const zero = screen.getByTestId('invoice-fix-amount-zero');
    expect(zero).toHaveAttribute('role', 'alert');
    expect(zero.textContent).toMatch(/greater than zero/i);
    expect(screen.getByRole('button', { name: 'Resubmit invoice' })).toBeDisabled();
  });
});
