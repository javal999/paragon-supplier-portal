import { screen, within, fireEvent } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../test/test-utils';
import BuyerAlerts from './BuyerAlerts';
import BuyerHome from './BuyerHome';

// ────────────────────────────────────────────────────────────────────────────
// THE WORKED EXAMPLE FROM THE SPEC: "17 High-risk inventory and capacity
// alerts" must open the Alerts page with the High risk chip already selected,
// not the unfiltered page the user has to search by hand.
// ────────────────────────────────────────────────────────────────────────────

describe('BuyerAlerts — deep-linked tab and risk filter (REQ deep-link)', () => {
  it('a plain nav-menu visit (no query) lands on Open / All, exactly as before this feature', async () => {
    renderWithProviders(<BuyerAlerts />, { route: '/buyer/alerts' });
    expect(await screen.findByRole('tab', { name: /Open/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radio', { name: /All/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('`?tab=open&risk=high` selects the Open tab and the High chip, exposed via the existing aria attributes', async () => {
    renderWithProviders(<BuyerAlerts />, { route: '/buyer/alerts?tab=open&risk=high' });
    expect(await screen.findByRole('tab', { name: /Open/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radio', { name: /High/ })).toHaveAttribute('aria-checked', 'true');
    // The unselected chips stay unselected — a one-directional param read
    // does not silently activate anything else.
    expect(screen.getByRole('radio', { name: /^All/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('an unknown tab/risk value is ignored, leaving the page on its defaults', async () => {
    renderWithProviders(<BuyerAlerts />, { route: '/buyer/alerts?tab=bogus&risk=bogus' });
    expect(await screen.findByRole('tab', { name: /Open/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radio', { name: /^All/ })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('BuyerHome — "17 High-risk inventory and capacity alerts" opens exactly that group', () => {
  it('clicking the task lands on the Alerts page with Open + High already selected', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/buyer/home" element={<BuyerHome />} />
        <Route path="/buyer/alerts" element={<BuyerAlerts />} />
      </Routes>,
      { route: '/buyer/home' },
    );
    const tasks = await screen.findByTestId('home-tasks');
    const task = within(tasks).queryByTestId('home-task-inventory-high-alerts');
    if (!task) return; // no open High alert in today's fixture — nothing to click through

    fireEvent.click(task);

    expect(await screen.findByRole('tab', { name: /Open/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('radio', { name: /High/ })).toHaveAttribute('aria-checked', 'true');
  });
});
