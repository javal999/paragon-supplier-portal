import { screen, fireEvent, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import AppShellV2, { NAV_DRAWER_ID } from './AppShellV2';

// jsdom has no layout, so "inline at lg, drawer below it" is asserted through
// the responsive classes that produce it, and the drawer behaviour through
// state, ARIA and focus.

const Page = () => (
  <AppShellV2>
    <p>page body</p>
  </AppShellV2>
);
const OtherPage = () => (
  <AppShellV2>
    <p>other page</p>
  </AppShellV2>
);

/**
 * @param {Parameters<typeof renderWithProviders>[1]} [options]
 */
const renderShell = (options = { route: '/buyer/home' }) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/home" element={<Page />} />
      <Route path="/buyer/suppliers" element={<OtherPage />} />
      <Route path="/supplier/home" element={<Page />} />
      <Route path="/supplier/orders" element={<OtherPage />} />
    </Routes>,
    options
  );

const menuButton = () => screen.getByRole('button', { name: 'Toggle navigation' });
const drawer = () => /** @type {HTMLElement} */ (document.getElementById(NAV_DRAWER_ID));

describe('AppShellV2 — side menu drawer below lg', () => {
  it('starts closed: the menu is hidden below lg and inline from lg', () => {
    renderShell();
    const button = menuButton();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', NAV_DRAWER_ID);
    expect(drawer()).toHaveClass('hidden', 'lg:flex', 'w-60');
    expect(drawer()).not.toHaveAttribute('role');
    expect(screen.queryByTestId('nav-drawer-backdrop')).toBeNull();
  });

  it('hides the ☰ button from lg, so desktop has no dead control', () => {
    renderShell();
    expect(menuButton()).toHaveClass('lg:hidden');
  });

  it('☰ toggles the drawer and aria-expanded', () => {
    renderShell();
    fireEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(drawer()).toHaveClass('fixed', 'inset-y-0', 'left-0', 'w-60', 'lg:static');
    expect(drawer()).not.toHaveClass('hidden');
    expect(drawer()).toHaveAttribute('role', 'dialog');
    expect(drawer()).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('nav-drawer-backdrop')).toHaveClass('lg:hidden');

    fireEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(drawer()).toHaveClass('hidden');
  });

  it('moves focus into the drawer on open', () => {
    renderShell();
    fireEvent.click(menuButton());
    expect(drawer()).toContainElement(/** @type {HTMLElement} */ (document.activeElement));
    expect(document.activeElement).toBe(
      within(drawer()).getByRole('button', { name: 'Close navigation' })
    );
  });

  it('Escape closes it and returns focus to ☰', () => {
    renderShell();
    fireEvent.click(menuButton());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(drawer()).toHaveClass('hidden');
    expect(document.activeElement).toBe(menuButton());
  });

  it('a backdrop click closes it', () => {
    renderShell();
    fireEvent.click(menuButton());
    fireEvent.click(screen.getByTestId('nav-drawer-backdrop'));
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('nav-drawer-backdrop')).toBeNull();
  });

  it('the close button closes it and returns focus to ☰', () => {
    renderShell();
    fireEvent.click(menuButton());
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Close navigation' }));
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(menuButton());
  });

  it('picking the current page closes it', () => {
    renderShell();
    fireEvent.click(menuButton());
    const current = /** @type {HTMLElement} */ (
      drawer().querySelector('button[aria-current="page"]')
    );
    fireEvent.click(current);
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(drawer()).toHaveClass('hidden');
  });

  it('picking another page navigates and leaves the drawer closed', () => {
    renderShell();
    fireEvent.click(menuButton());
    fireEvent.click(within(drawer()).getByRole('button', { name: 'Suppliers' }));
    expect(screen.getByText('other page')).toBeInTheDocument();
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(drawer()).toHaveClass('hidden');
  });

  it('keeps Tab inside the open drawer', () => {
    renderShell();
    fireEvent.click(menuButton());
    const close = within(drawer()).getByRole('button', { name: 'Close navigation' });
    close.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(drawer()).toContainElement(/** @type {HTMLElement} */ (document.activeElement));
    expect(document.activeElement).not.toBe(close);
  });

  it('renders the drawer for the supplier persona too', () => {
    renderShell({ identity: SUPPLIER, route: '/supplier/home' });
    fireEvent.click(menuButton());
    expect(drawer()).toHaveAttribute('role', 'dialog');
    expect(within(drawer()).getByRole('button', { name: 'Purchase orders' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(drawer()).toHaveClass('hidden', 'lg:flex');
  });

  it('pads main 16 / 24 / 32 px across phone, sm and lg', () => {
    renderShell();
    expect(document.getElementById('main-content')).toHaveClass('p-4', 'sm:p-6', 'lg:p-8');
  });

  it('keeps the skip link moving focus to main', () => {
    renderShell();
    fireEvent.click(screen.getByRole('link', { name: 'Skip to main content' }));
    expect(document.activeElement).toBe(document.getElementById('main-content'));
  });
});
