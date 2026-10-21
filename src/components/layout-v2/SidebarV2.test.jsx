import { screen, fireEvent, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import SidebarV2 from './SidebarV2';
import AppShellV2 from './AppShellV2';
import { setHubRole } from './hubRole';

// Surfaces the current route so we can assert the toggle navigates (NAV-01).
const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
};

afterEach(() => setHubRole('ALL'));

// jsdom does not keep scrollTop. The restore runs in a layout effect, i.e. before
// the test gets the element back, so give every element a writable scrollTop up front.
const realScrollTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
const scrollTops = /** @type {WeakMap<Element, number>} */ (new WeakMap());
/** @type {Element[]} */
let scrollTopWrites = [];
const installScrollTop = () => {
  scrollTopWrites = [];
  Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
    configurable: true,
    /** @this {Element} */
    get() {
      return scrollTops.get(this) ?? 0;
    },
    /**
     * @this {Element}
     * @param {number} value
     */
    set(value) {
      scrollTopWrites.push(this);
      scrollTops.set(this, value);
    }
  });
};
const removeScrollTop = () => {
  delete (/** @type {{ scrollTop?: number }} */ (HTMLElement.prototype).scrollTop);
  if (realScrollTop) Object.defineProperty(Element.prototype, 'scrollTop', realScrollTop);
};

describe("SidebarV2 — persona switch goes to that persona's Home (NV-02)", () => {
  it('switching to Supplier navigates to the supplier Home', () => {
    renderWithProviders(
      <>
        <SidebarV2 />
        <LocationProbe />
      </>,
      { route: '/buyer/home' }
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
      { identity: SUPPLIER, route: '/supplier/home' }
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
    // IA P-09 — Call-offs is an item of Order collaboration, not a section.
    expect(within(nav).getByRole('button', { name: 'Call-offs' })).toBeInTheDocument();
    expect(within(nav).queryByText('Call-offs', { selector: 'div' })).toBeNull();
    expect(within(nav).getByText('Sourcing')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Suppliers' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('shows the supplier menu by task', () => {
    renderWithProviders(<SidebarV2 />, { identity: SUPPLIER, route: '/supplier/home' });
    const nav = screen.getByRole('navigation');
    for (const name of [
      'To do',
      'Purchase orders',
      'Call-offs',
      'Foresight commitments',
      'RFI invitations',
      'RFQ invitations',
      'RFP invitations',
      'Profile & documents',
      'My performance'
    ]) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(nav).queryByRole('button', { name: 'Channel Inbox' })).toBeNull();
    // IA P-02 / P-09 — no Order summary item; Performance folded into Company.
    expect(within(nav).queryByRole('button', { name: 'Order summary' })).toBeNull();
    expect(within(nav).queryByText('Performance', { selector: 'div' })).toBeNull();
  });
});

describe('SidebarV2 — restores sidebar scroll position', () => {
  beforeEach(() => {
    sessionStorage.clear();
    installScrollTop();
  });
  afterEach(removeScrollTop);
  it('restores scroll position from sessionStorage on mount', () => {
    sessionStorage.setItem('paragon.sidebarScroll.buyer', '500');
    renderWithProviders(<SidebarV2 />, { route: '/buyer/home' });
    const nav = screen.getByRole('navigation');
    expect(nav.scrollTop).toBe(500);
  });

  it.each([
    ['no stored position', null],
    ['a non-numeric stored position', 'abc']
  ])('leaves scrollTop untouched with %s', (_label, stored) => {
    if (stored !== null) sessionStorage.setItem('paragon.sidebarScroll.buyer', stored);
    renderWithProviders(<SidebarV2 />, { route: '/buyer/home' });
    const nav = screen.getByRole('navigation');
    expect(scrollTopWrites).not.toContain(nav);
    expect(nav.scrollTop).toBe(0);
  });

  it('updates sessionStorage when sidebar is scrolled', () => {
    renderWithProviders(<SidebarV2 />, { route: '/buyer/home' });
    const nav = screen.getByRole('navigation');
    fireEvent.scroll(nav, {
      target: {
        scrollTop: 300
      }
    });
    expect(sessionStorage.getItem('paragon.sidebarScroll.buyer')).toBe('300');
  });
});

// Each page renders its own AppShellV2, so navigating between pages remounts the
// sidebar. These pages mirror that: distinct components, one shell each.
const BuyerHomePage = () => (
  <AppShellV2>
    <p>buyer home</p>
  </AppShellV2>
);
const BuyerSuppliersPage = () => (
  <AppShellV2>
    <p>buyer suppliers</p>
  </AppShellV2>
);
const SupplierHomePage = () => (
  <AppShellV2>
    <p>supplier home</p>
  </AppShellV2>
);

const renderPages = () =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/home" element={<BuyerHomePage />} />
      <Route path="/buyer/suppliers" element={<BuyerSuppliersPage />} />
      <Route path="/supplier/home" element={<SupplierHomePage />} />
    </Routes>,
    { route: '/buyer/home' }
  );

describe('SidebarV2 — scroll position survives navigation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    installScrollTop();
  });
  afterEach(removeScrollTop);

  it('keeps the scroll position when a sidebar item navigates and the sidebar remounts', () => {
    renderPages();
    const firstNav = screen.getByRole('navigation', { name: 'Main navigation' });
    fireEvent.scroll(firstNav, { target: { scrollTop: 400 } });

    fireEvent.click(within(firstNav).getByRole('button', { name: 'Suppliers' }));
    expect(screen.getByText('buyer suppliers')).toBeInTheDocument();

    const nextNav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nextNav).not.toBe(firstNav);
    expect(nextNav.scrollTop).toBe(400);
  });

  it('does not carry the PTI menu position into the supplier menu, and restores it on return', () => {
    renderPages();
    const buyerNav = screen.getByRole('navigation', { name: 'Main navigation' });
    fireEvent.scroll(buyerNav, { target: { scrollTop: 500 } });

    fireEvent.click(screen.getByRole('button', { name: 'Supplier' }));
    expect(screen.getByText('supplier home')).toBeInTheDocument();
    const supplierNav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(supplierNav.scrollTop).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'PTI' }));
    expect(screen.getByText('buyer home')).toBeInTheDocument();
    const backNav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(backNav.scrollTop).toBe(500);
  });

  it('keeps working when storage throws', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    // React reports a throwing handler to window rather than to fireEvent's caller.
    const uncaught = vi.fn(/** @param {ErrorEvent} e */ (e) => e.preventDefault());
    window.addEventListener('error', uncaught);
    try {
      renderWithProviders(<SidebarV2 />, { route: '/buyer/home' });
      const nav = screen.getByRole('navigation');
      fireEvent.scroll(nav, { target: { scrollTop: 200 } });
      expect(uncaught).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('error', uncaught);
      setItem.mockRestore();
    }
  });
});

describe('SidebarV2 — inline at lg, drawer below it', () => {
  it('closed: hidden below lg, the inline 240 px column from lg, no dialog role', () => {
    renderWithProviders(<SidebarV2 id="nav" />, { route: '/buyer/home' });
    const aside = /** @type {HTMLElement} */ (document.getElementById('nav'));
    expect(aside).toHaveClass('hidden', 'lg:flex', 'w-60', 'shrink-0');
    expect(aside).not.toHaveAttribute('role');
    expect(screen.queryByRole('button', { name: 'Close navigation' })).toBeNull();
  });

  it('open: a fixed drawer that picking a nav item closes', () => {
    const onClose = vi.fn();
    renderWithProviders(<SidebarV2 id="nav" open onClose={onClose} />, { route: '/buyer/home' });
    const aside = /** @type {HTMLElement} */ (document.getElementById('nav'));
    expect(aside).toHaveClass('fixed', 'inset-y-0', 'left-0', 'lg:static');
    fireEvent.click(
      within(screen.getByRole('navigation')).getByRole('button', { name: 'Suppliers' })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
