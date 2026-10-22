// ─────────────────────────────────────────────────────────────────────────────
// IA review item 2 — My tasks "Orders whose expected completion moved later"
// lands on exactly its rows: several orders open the Summary view filtered by
// the same rule the task counts with; one order opens that order.
//
// The seed records no earlier completion date (it is kept only when a supplier
// changes one, `t_po_shipping_notice`), so each spec moves dates in the store.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import i18n from '@lib/i18n';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { completionMovedLater } from '@services/data/poResponseProjection';
import BuyerHome from '../BuyerHome';
import BuyerOrders from '../BuyerOrders';

const WAIT = { timeout: 15000 };
const SEATED = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(async () => {
  purchaseOrderStore.reset();
  window.localStorage.clear();
  await i18n.changeLanguage('en');
});

/**
 * Moves the expected completion date of these orders later, as the supplier's
 * shipping notice does.
 * @param {readonly string[]} ids
 */
function moveLater(ids) {
  for (const id of ids)
    purchaseOrderStore.update(id, (po) => ({
      ...po,
      shippingNotice: {
        ...po.shippingNotice,
        previousCompletionDate: '2026-10-01',
        expectedCompletionDate: '2026-10-15'
      }
    }));
}

/** The address the router is on, for the Home task's target. */
const Where = () => {
  const loc = useLocation();
  return <output data-testid="where">{`${loc.pathname}${loc.search}`}</output>;
};

const home = (
  <Routes>
    <Route path="/buyer/home" element={<BuyerHome />} />
    <Route path="/buyer/orders" element={<Where />} />
  </Routes>
);

describe('the moved-completion task lands on its own rows', () => {
  it('the Summary view with moved=1 shows exactly the moved orders, and can be cleared', async () => {
    const ids = purchaseOrderStore
      .all()
      .slice(0, 2)
      .map((p) => p.id);
    moveLater(ids);
    const moved = purchaseOrderStore.all().filter(completionMovedLater);
    expect(moved.map((p) => p.id)).toEqual(ids);

    renderWithProviders(
      <Routes>
        <Route path="/buyer/orders" element={<BuyerOrders />} />
      </Routes>,
      { identity: BUYER, route: '/buyer/orders?view=summary&moved=1' }
    );
    const banner = await screen.findByTestId('order-summary-moved-filter', {}, WAIT);
    expect(banner).toHaveTextContent('Showing 2 orders whose expected completion moved later.');
    const rows = screen.getAllByTestId(/^order-summary-row-/).map((r) => r.dataset.testid);
    expect(rows.sort()).toEqual(ids.map((id) => `order-summary-row-${id}`).sort());

    fireEvent.click(within(banner).getByTestId('order-summary-moved-clear'));
    expect(screen.queryByTestId('order-summary-moved-filter')).toBeNull();
    expect(screen.getAllByTestId(/^order-summary-row-/).length).toBeGreaterThan(2);
  });

  it('My tasks opens that filtered view when several orders moved', async () => {
    const ids = purchaseOrderStore
      .all()
      .slice(0, 2)
      .map((p) => p.id);
    moveLater(ids);
    renderWithProviders(home, { identity: SEATED, route: '/buyer/home' });
    const task = await screen.findByTestId('home-task-completion-moved', {}, WAIT);
    fireEvent.click(task);
    expect(await screen.findByTestId('where')).toHaveTextContent(
      '/buyer/orders?view=summary&moved=1'
    );
  });

  it('My tasks opens the order itself when one order moved', async () => {
    const [one] = purchaseOrderStore.all();
    moveLater([one.id]);
    renderWithProviders(home, { identity: SEATED, route: '/buyer/home' });
    fireEvent.click(await screen.findByTestId('home-task-completion-moved', {}, WAIT));
    expect(await screen.findByTestId('where')).toHaveTextContent(`/buyer/orders?po=${one.id}`);
  });
});
