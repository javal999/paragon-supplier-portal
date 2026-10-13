import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { useToast } from '@hooks/useToast';
import i18n from '@lib/i18n';
import SupplierPerformance from './SupplierPerformance';

// #229 — "Export Report" has no export behind it. Its toast was a SUCCESS that
// said "Performance report queued / Downloading performance report PDF...". It
// must say nothing was exported or queued, as a warning.

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

const renderIt = () =>
  renderWithProviders(
    <>
      <SupplierPerformance />
      <ToastSpy />
    </>,
    { identity: SUPPLIER }
  );

describe('SupplierPerformance — the export toast admits nothing was exported (#229)', () => {
  it('one warning toast that says nothing was exported or queued', async () => {
    renderIt();
    fireEvent.click(await screen.findByRole('button', { name: 'Export Report' }));
    const toasts = within(screen.getByTestId('toast-spy')).getAllByRole('listitem');
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toHaveAttribute('data-variant', 'warning');
    expect(toasts[0]).toHaveTextContent(/not available yet/i);
    expect(toasts[0]).toHaveTextContent(/nothing was exported or queued/i);
    expect(toasts[0]).not.toHaveTextContent(/report queued|Downloading/i);
  });

  it('in Indonesian the toast admits it too', async () => {
    try {
      await i18n.changeLanguage('id');
      renderIt();
      fireEvent.click(await screen.findByRole('button', { name: 'Ekspor Laporan' }));
      const toast = within(screen.getByTestId('toast-spy')).getByRole('listitem');
      expect(toast).toHaveAttribute('data-variant', 'warning');
      expect(toast).toHaveTextContent(/belum tersedia/i);
      expect(toast).toHaveTextContent(/tidak ada yang diekspor/i);
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
