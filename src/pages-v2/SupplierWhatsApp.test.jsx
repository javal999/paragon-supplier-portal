import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import SupplierWhatsApp from './SupplierWhatsApp';

describe('SupplierWhatsApp', () => {
  it('renders its real surface when seeded with a supplier identity', () => {
    renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    // Real content present — the C5 relabelled, unmistakably-a-demo header...
    expect(screen.getByText('Channel Demo — how Paragon reaches you')).toBeInTheDocument();
    // ...the SIMULATED demonstration marker...
    expect(
      screen.getByText(/scripted example conversations, not your real messages/i)
    ).toBeInTheDocument();
    // ...and the no-identity guard is NOT shown.
    expect(screen.queryByText('No supplier identity in session')).not.toBeInTheDocument();
  });
});

// The WhatsApp bot reply lands 1.5 s after the supplier's message. That timer
// belongs to the conversation that started it: switching or resetting the
// scenario inside the window must not append the old scenario's reply and
// chips to the new conversation, and unmounting must leave no timer pending.
describe('SupplierWhatsApp — WhatsApp bot-reply timer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const renderAndReplyTolak = async () => {
    const view = renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    await screen.findByRole('radio', { name: 'Submit ASN' });
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'TOLAK' }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    return view;
  };

  it('switching scenario inside the window drops the old reply and its chips', async () => {
    await renderAndReplyTolak();
    fireEvent.click(screen.getByRole('radio', { name: 'Submit ASN' }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/Alasan penolakan/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1️⃣' })).not.toBeInTheDocument();
  });

  it('resetting inside the window drops the pending reply', async () => {
    await renderAndReplyTolak();
    fireEvent.click(screen.getByRole('button', { name: 'Reset conversation' }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText(/Alasan penolakan/)).not.toBeInTheDocument();
    // The reset conversation offers its own opening chips again.
    expect(screen.getByRole('button', { name: 'TOLAK' })).toBeInTheDocument();
  });

  it('the reply still lands when nothing interrupts it', async () => {
    await renderAndReplyTolak();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/Alasan penolakan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1️⃣' })).toBeInTheDocument();
  });

  it('unmounting inside the window leaves no timer pending', async () => {
    const { unmount } = await renderAndReplyTolak();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

// WeChat: the supplier's bubble is the reply they chose, and the scripted
// answer matches it — REJECT must never read back as "CONFIRM … Confirmed".
describe('SupplierWhatsApp — WeChat reply bubble', () => {
  const openWeChat = async () => {
    renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByRole('tab', { name: 'WeChat' }));
  };

  it.each(['REJECT', 'CHANGE'])(
    'choosing %s shows that reply, not the confirm path',
    async (choice) => {
      await openWeChat();
      fireEvent.click(screen.getByRole('button', { name: choice }));
      expect(screen.getByText(choice)).toBeInTheDocument();
      expect(screen.queryByText('CONFIRM')).not.toBeInTheDocument();
      expect(screen.queryByText(/PO-2025-00108 Confirmed/)).not.toBeInTheDocument();
      expect(screen.getByText(/Buyer notified/)).toBeInTheDocument();
    }
  );

  it('choosing CONFIRM keeps the confirm success message', async () => {
    await openWeChat();
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));
    expect(screen.getByText('CONFIRM')).toBeInTheDocument();
    expect(screen.getByText(/PO-2025-00108 Confirmed/)).toBeInTheDocument();
  });
});

// Email: the footer's "Unsubscribe" is demo chrome. Under HashRouter an
// `<a href="#">` navigates to `/` (→ /buyer/dashboard), so it must be inert.
describe('SupplierWhatsApp — Email unsubscribe is inert', () => {
  it('renders as a button, not a link that navigates', async () => {
    renderWithProviders(<SupplierWhatsApp />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByRole('tab', { name: 'Email' }));
    expect(screen.queryByRole('link', { name: 'Unsubscribe' })).not.toBeInTheDocument();
    const control = screen.getByRole('button', { name: 'Unsubscribe' });
    expect(control).toHaveAttribute('type', 'button');
    expect(control).not.toHaveAttribute('href');
  });
});
