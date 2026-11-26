import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import i18n, { LANG_STORAGE_KEY } from '@lib/i18n';
import BuyerHome from '@pages-v2/BuyerHome';
import { setHubRole } from './hubRole';
import TopBarV2 from './TopBarV2';

beforeEach(() => {
  // The hub role is a module-level view preference; pin it so the To-do rows a
  // case sees are the same rows the page shows.
  setHubRole('ALL');
});

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  localStorage.removeItem(LANG_STORAGE_KEY);
  setHubRole('ALL');
});

// The TopBar language control is now a menu-button dropdown (SEAT2-LANG-DROPDOWN-01)
// — behaviour lives in LanguageMenu (see LanguageMenu.test.jsx). These cases lock
// the TopBar integration: the control is embedded, opens a menu, and selecting a
// language flips the keyed app title + persists.
describe('TopBarV2 — language menu integration (SEAT2-LANG-DROPDOWN-01)', () => {
  it('shows the current language and opens a menu (does not blind-flip on click)', () => {
    renderWithProviders(<TopBarV2 />);
    const control = screen.getByRole('button', { name: 'Language' });
    expect(control).toHaveTextContent('EN');
    expect(screen.getByText('Paragon Supplier Portal')).toBeInTheDocument();

    // A single click opens the menu — it must NOT switch the language by itself.
    fireEvent.click(control);
    expect(control).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(control).toHaveTextContent('EN');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();
  });

  it('selecting Bahasa Indonesia flips the keyed app title and persists', async () => {
    renderWithProviders(<TopBarV2 />);
    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Bahasa Indonesia/ }));
    await waitFor(() => {
      // app.title is keyed → flips with the selection
      expect(screen.getByText('Portal Pemasok Paragon')).toBeInTheDocument();
    });
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('id');
  });
});

describe('TopBarV2 — ☰ opens the side-menu drawer', () => {
  it('reports its state, names the drawer it controls and calls onToggleNav', () => {
    const onToggleNav = vi.fn();
    renderWithProviders(
      <TopBarV2 navOpen={false} navControlsId="app-nav-drawer" onToggleNav={onToggleNav} />
    );
    const button = screen.getByRole('button', { name: 'Toggle navigation' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'app-nav-drawer');
    fireEvent.click(button);
    expect(onToggleNav).toHaveBeenCalledTimes(1);
  });

  it('is hidden from lg, where the side menu is inline', () => {
    renderWithProviders(<TopBarV2 navOpen />);
    const button = screen.getByRole('button', { name: 'Toggle navigation' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveClass('lg:hidden');
  });
});

// BL-361 — the buyer's bell counts and lists the SAME To-do rows `BuyerHome`
// derives. The count is open work, not notices: there is no read/unread state,
// so opening the panel changes nothing about the number.
describe('TopBarV2 — the PTI bell shows the buyer To-do (BL-361)', () => {
  /** @param {HTMLElement} bell */
  const countOf = (bell) => Number(bell.getAttribute('data-todo-count'));

  /** @returns {Promise<HTMLElement>} */
  const loadedBell = async () => {
    const bell = await screen.findByTestId('pti-notice-bell');
    await waitFor(() => expect(countOf(bell)).toBeGreaterThan(0), { timeout: 15000 });
    return bell;
  };

  it('shows the derived open-work count as its badge and in its name', async () => {
    renderWithProviders(<TopBarV2 />);
    const bell = await loadedBell();
    const count = countOf(bell);
    expect(within(bell).getByTestId('pti-todo-badge')).toHaveTextContent(String(count));
    // BL-84 — the badge number is in the accessible name (singular at 1, which
    // the reads can pass through while they resolve).
    expect(bell).toHaveAccessibleName(new RegExp(`^To-do: ${count} open items?$`));
  });

  it('lists the same rows it counts, each with the label BuyerHome renders', async () => {
    renderWithProviders(<TopBarV2 />, { route: '/buyer/home' });
    const bell = await loadedBell();
    fireEvent.click(bell);
    const panel = screen.getByTestId('pti-todo-panel');
    const rows = within(panel).getAllByRole('button');
    // Population control: the panel really holds rows, so the sum below is not 0.
    expect(rows.length).toBeGreaterThan(0);
    const sum = rows.reduce((n, row) => n + Number(row.getAttribute('data-count')), 0);
    expect(sum).toBe(countOf(bell));
    // The row carries the page's own label (hub.home.task.escalatedPo).
    expect(screen.getByTestId('pti-todo-escalated-po')).toHaveTextContent(
      'Escalated purchase orders'
    );
    // Nothing in this list is decoration: every row names a destination.
    for (const row of rows) expect(Number(row.getAttribute('data-count'))).toBeGreaterThan(0);
  });

  it('opening it does not change the count: this is work, not unread notices', async () => {
    renderWithProviders(<TopBarV2 />);
    const bell = await loadedBell();
    const before = countOf(bell);
    fireEvent.click(bell);
    expect(countOf(bell)).toBe(before);
    fireEvent.click(screen.getByTestId('pti-notice-bell')); // close (outside not needed)
    expect(countOf(bell)).toBe(before);
  });

  it('a row opens its own deep link', async () => {
    /** @type {React.FC} */
    const Probe = () => {
      const location = useLocation();
      return <output data-testid="probe">{location.pathname + location.search}</output>;
    };
    renderWithProviders(
      <>
        <TopBarV2 />
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </>,
      { route: '/buyer/home' }
    );
    const bell = await loadedBell();
    fireEvent.click(bell);
    fireEvent.click(await screen.findByTestId('pti-todo-escalated-po'));
    expect(screen.getByTestId('probe')).toHaveTextContent('/buyer/orders?tab=escalated');
    // The panel closes on the navigation.
    expect(screen.queryByTestId('pti-todo-panel')).toBeNull();
  });

  it('counts exactly what BuyerHome lists, on the page that renders both', async () => {
    renderWithProviders(<BuyerHome />, { route: '/buyer/home' });
    const bell = await screen.findByTestId('pti-notice-bell');
    // Wait for reads from several lanes before comparing: the page and the
    // shell share query keys, and both resolve from the same cache.
    await screen.findByTestId('home-task-inbound-asn', {}, { timeout: 15000 });
    await screen.findByTestId('home-task-rfq-award', {}, { timeout: 15000 });
    await waitFor(
      () => {
        const bell2 = screen.getByTestId('pti-notice-bell');
        const pageRows = [...document.querySelectorAll('[data-testid^="home-task-"]')].filter(
          (el) => !el.getAttribute('data-testid')?.startsWith('home-task-detail-')
        );
        expect(pageRows.length).toBeGreaterThan(0);
        const pageSum = pageRows.reduce(
          (n, el) => n + Number(/^\s*(\d+)/.exec(el.textContent ?? '')?.[1] ?? 0),
          0
        );
        expect(Number(bell2.getAttribute('data-todo-count'))).toBe(pageSum);
      },
      { timeout: 15000 }
    );
    expect(countOf(bell)).toBeGreaterThan(0);
  });
});

describe('TopBarV2 — seat isolation (BL-361)', () => {
  it('a buyer seat gets the To-do bell, never the supplier notices', async () => {
    renderWithProviders(<TopBarV2 />);
    expect(await screen.findByTestId('pti-notice-bell')).toBeInTheDocument();
    expect(screen.queryByTestId('supplier-notice-bell')).toBeNull();
  });

  it('a supplier seat gets its own notices, never the buyer count', async () => {
    renderWithProviders(<TopBarV2 />, { identity: SUPPLIER });
    expect(await screen.findByTestId('supplier-notice-bell')).toBeInTheDocument();
    expect(screen.queryByTestId('pti-notice-bell')).toBeNull();
    expect(screen.queryByTestId('pti-todo-badge')).toBeNull();
    expect(screen.queryByTestId('pti-todo-panel')).toBeNull();
  });

  it('a supplier persona with no supplier id gets a plain bell, not another tenancy', async () => {
    renderWithProviders(<TopBarV2 />, { identity: { ...SUPPLIER, supplierId: null } });
    const plain = await screen.findByTestId('plain-notice-bell');
    expect(plain).toHaveAccessibleName('Notifications');
    expect(screen.queryByTestId('pti-notice-bell')).toBeNull();
    expect(screen.queryByTestId('supplier-notice-bell')).toBeNull();
  });
});

describe('TopBarV2 — the PTI bell cannot go back to a hard-coded count (BL-361)', () => {
  it('guard — the top bar and the bell hold no fixed count', () => {
    const topBar = readFileSync(join(__dirname, 'TopBarV2.jsx'), 'utf8');
    const bell = readFileSync(join(__dirname, 'PtiTodoBell.jsx'), 'utf8');
    // BL-213's removed constant: if it returns, this fails by name.
    expect(topBar).not.toContain('PTI_NOTICE_COUNT');
    expect(bell).not.toContain('PTI_NOTICE_COUNT');
    // Population control: this is the bell file, and it derives its rows from
    // the SAME function the page uses rather than restating a predicate.
    expect(bell).toContain('buyerTodoTasks(');
    // No constant can stand in for the derivation.
    expect(bell).not.toMatch(/\b(?:const|let|var)\s+\w*COUNT\w*\s*=\s*\d/i);
    // The danger badge is the shape the fixed count had; the top bar itself no
    // longer holds one (the buyer bell owns its badge in its own file).
    expect(topBar).not.toMatch(/bg-danger/);
  });
});
