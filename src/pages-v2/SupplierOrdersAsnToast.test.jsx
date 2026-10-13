import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { useToast } from '@hooks/useToast';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { POStatus } from '@services/data/types';
import i18n from '@lib/i18n';
import SupplierOrders from './SupplierOrders';

// #229 — the order panel's "Create ASN" button only closes the panel. Its toast
// read "ASN creation for {{poNumber}}", which reads as an ASN started. It must
// say nothing was created here and point to My Shipments & ASN, as a warning.

const ToastSpy = () => {
  const { toasts } = useToast();
  return (
    <ul data-testid="toast-spy">
      {toasts.map((x) => (
        <li key={x.id} data-variant={x.variant}>{`${x.title} ${x.description ?? ''}`}</li>
      ))}
    </ul>
  );
};

/** A Confirmed order the seeded supplier seat can see, read from the store. */
const confirmedPo = () => {
  const po = purchaseOrderStore
    .all()
    .find((p) => p.supplierId === SUPPLIER.supplierId && p.status === POStatus.CONFIRMED);
  if (!po) throw new Error('fixture premise: sup-007 has a Confirmed order');
  return po;
};

/** @param {RegExp} label */
const clickCreateAsn = async (label) => {
  const po = confirmedPo();
  fireEvent.click(await screen.findByText(po.poNumber));
  // The table rows carry their own "Create ASN" row actions (a different
  // handler); the panel's footer button is the one outside every row.
  const inPanel = (await screen.findAllByRole('button', { name: label })).filter(
    (b) => !b.closest('tr')
  );
  expect(inPanel).toHaveLength(1);
  fireEvent.click(inPanel[0]);
  return po;
};

const renderIt = () =>
  renderWithProviders(
    <>
      <SupplierOrders />
      <ToastSpy />
    </>,
    { identity: SUPPLIER }
  );

describe('SupplierOrders — the Create ASN toast admits no ASN was created (#229)', () => {
  beforeEach(() => purchaseOrderStore.reset());

  it('one warning toast that says nothing was created and points to My Shipments & ASN', async () => {
    renderIt();
    const po = await clickCreateAsn(/^Create ASN$/);
    const toasts = within(screen.getByTestId('toast-spy')).getAllByRole('listitem');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toHaveAttribute('data-variant', 'warning');
    expect(toasts[0]).toHaveTextContent(`nothing was created for ${po.poNumber}`);
    expect(toasts[0]).toHaveTextContent(/My Shipments & ASN/);
    expect(toasts[0]).not.toHaveTextContent(new RegExp(`^ASN creation for ${po.poNumber}`));
  });

  it('in Indonesian the toast admits it too', async () => {
    try {
      await i18n.changeLanguage('id');
      renderIt();
      const po = await clickCreateAsn(/^Buat ASN$/);
      const toast = within(screen.getByTestId('toast-spy')).getByRole('listitem');
      expect(toast).toHaveAttribute('data-variant', 'warning');
      expect(toast).toHaveTextContent(`tidak ada yang dibuat untuk ${po.poNumber}`);
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
