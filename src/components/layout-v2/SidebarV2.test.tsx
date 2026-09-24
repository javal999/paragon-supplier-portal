import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { renderWithProviders, SUPPLIER } from '../../test/test-utils';
import SidebarV2 from './SidebarV2';
import { setHubRole } from './hubRole';

// Surfaces the current route so we can assert the toggle navigates (NAV-01).
const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
};

afterEach(() => setHubRole('ALL'));

describe('SidebarV2 — persona switch goes to that persona\'s Home (NV-02)', () => {
  it('switching to Supplier navigates to the supplier Home', () => {
    renderWithProviders(
      <>
        <SidebarV2 />
        <LocationProbe />
      </>,
      { route: '/buyer/home' },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Supplier' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/supplier/home');
  });

  it('switching to PTI navigates to the PTI Home', () => {
    renderWithProviders(
      <>
        <SidebarV2 />
        <LocationProbe />
      </>,
      { identity: SUPPLIER, route: '/supplier/home' },
    );
    fireEvent.click(screen.getByRole('button', { name: 'PTI' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/buyer/home');
  });
});

describe('SidebarV2 — hub sections (REQUIREMENTS §3.7)', () => {
  it('names sections after hub areas, not procurement stages', () => {
    renderWithProviders(<SidebarV2 />, { route: '/buyer/home' });
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Order collaboration')).toBeInTheDocument();
    expect(within(nav).getByText('Call-offs', { selector: 'div' })).toBeInTheDocument();
    expect(within(nav).queryByText('Acquire')).toBeNull();
    expect(within(nav).queryByText('Marketplace')).toBeNull();
  });

  it('a Finance view shows Home and Invoices, and hides Order collaboration', () => {
    setHubRole('FIN');
    renderWithProviders(<SidebarV2 />, { route: '/buyer/home' });
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('button', { name: 'Invoices' })).toBeInTheDocument();
    expect(within(nav).queryByText('Order collaboration')).toBeNull();
  });

  it('keeps the menu item highlighted on a detail page (NV-03)', () => {
    renderWithProviders(<SidebarV2 />, { route: '/buyer/suppliers/sup-002' });
    expect(screen.getByRole('button', { name: 'Suppliers' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the supplier menu by task', () => {
    renderWithProviders(<SidebarV2 />, { identity: SUPPLIER, route: '/supplier/home' });
    const nav = screen.getByRole('navigation');
    for (const name of ['To do', 'Purchase orders', 'Call-offs', 'Forecast & commitments', 'RFI invitations', 'RFQ invitations', 'RFP invitations', 'Profile & documents']) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(nav).queryByRole('button', { name: 'Channel Inbox' })).toBeNull();
  });
});

describe('SidebarV2 — restores sidebar scroll position', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  it('restores scroll position from sessionStorage on mount', async () => {
    sessionStorage.setItem('sidebar-scroll-position', '500');
    renderWithProviders(<SidebarV2 />, { route: '/buyer/home' });
    const nav = screen.getByRole('navigation');
    Object.defineProperty(nav, 'scrollTop', {
      writable: true,
      value: 0,
    });
    await waitFor(() => {
      expect(nav.scrollTop).toBe(500);
    });
  });

  it('updates sessionStorage when sidebar is scrolled', () => {
    renderWithProviders(<SidebarV2 />, { route: '/buyer/home' });
    const nav = screen.getByRole('navigation');
    fireEvent.scroll(nav, {
      target: {
        scrollTop: 300,
      },
    });
    expect(sessionStorage.getItem('sidebar-scroll-position')).toBe('300');
  });
});
