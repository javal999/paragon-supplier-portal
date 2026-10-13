import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import { useToast } from '@hooks/useToast';
import { invoiceStore } from '@services/data/mock/stores/invoiceStore';
import i18n from '@lib/i18n';
import BuyerInvoices from './BuyerInvoices';

// #229 — the remittance "Download PDF" button has no file behind it. Its toast
// said "Downloading remittance PDF / File will be available in a moment." It
// must say nothing was downloaded, as a warning.

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

/** Open the Payment Released invoice's remittance advice and click Download PDF. */
const clickDownloadPdf = async () => {
  fireEvent.click(await screen.findByText('INV-2025-BRL-0042'));
  fireEvent.click(await screen.findByRole('button', { name: /send remittance|kirim bukti/i }));
  fireEvent.click(await screen.findByRole('button', { name: /download pdf|unduh pdf/i }));
};

describe('BuyerInvoices — the remittance PDF toast admits nothing was downloaded (#229)', () => {
  beforeEach(() => invoiceStore.reset());

  it('one warning toast that says no file was downloaded', async () => {
    renderWithProviders(
      <>
        <BuyerInvoices />
        <ToastSpy />
      </>
    );
    await clickDownloadPdf();
    const toasts = within(screen.getByTestId('toast-spy')).getAllByRole('listitem');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toHaveAttribute('data-variant', 'warning');
    expect(toasts[0]).toHaveTextContent(/not available yet/i);
    expect(toasts[0]).toHaveTextContent(/no file was downloaded/i);
    expect(toasts[0]).not.toHaveTextContent(/Downloading|available in a moment/i);
  });

  it('in Indonesian the toast admits it too', async () => {
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(
        <>
          <BuyerInvoices />
          <ToastSpy />
        </>
      );
      await clickDownloadPdf();
      const toast = within(screen.getByTestId('toast-spy')).getByRole('listitem');
      expect(toast).toHaveAttribute('data-variant', 'warning');
      expect(toast).toHaveTextContent(/belum tersedia/i);
      expect(toast).toHaveTextContent(/tidak ada file yang diunduh/i);
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
