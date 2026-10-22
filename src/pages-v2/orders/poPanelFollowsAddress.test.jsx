// ─────────────────────────────────────────────────────────────────────────────
// IA F-3 — the PO panel follows the address: with one PO open, moving to
// another `?po=` on the same page opens that PO; a link back to no PO and then
// to the first PO again opens it again.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import BuyerOrders from '../BuyerOrders';

beforeEach(async () => {
  purchaseOrderStore.reset();
  await i18n.changeLanguage('en');
});

/** Buttons that move the address the way an in-app link would. */
const Mover = () => {
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" onClick={() => navigate('/buyer/orders?po=po-002')}>
        to po-002
      </button>
      <button type="button" onClick={() => navigate('/buyer/orders?view=list')}>
        to list
      </button>
      <button type="button" onClick={() => navigate('/buyer/orders?po=po-007')}>
        to po-007
      </button>
    </div>
  );
};

const page = (
  <Routes>
    <Route
      path="/buyer/orders"
      element={
        <>
          <Mover />
          <BuyerOrders />
        </>
      }
    />
  </Routes>
);

/** The PO the open panel's steps point at, read from its first step link. */
const panelPo = async () => {
  const steps = await screen.findByTestId('po-lifecycle-steps');
  const href = within(steps).getAllByRole('link')[0].getAttribute('href') ?? '';
  return new URLSearchParams(href.split('?')[1]).get('po');
};

describe('the PO panel follows ?po=', () => {
  it('opens the new PO when the address changes, and the first again after leaving it', async () => {
    const all = purchaseOrderStore.all().map((p) => p.id);
    if (!all.includes('po-007') || !all.includes('po-002')) throw new Error('fixture premise');
    renderWithProviders(page, { identity: BUYER, route: '/buyer/orders?po=po-007' });
    expect(await panelPo()).toBe('po-007');
    fireEvent.click(screen.getByRole('button', { name: 'to po-002' }));
    expect(await panelPo()).toBe('po-002');
    fireEvent.click(screen.getByRole('button', { name: 'to list' }));
    fireEvent.click(screen.getByRole('button', { name: 'to po-007' }));
    expect(await panelPo()).toBe('po-007');
  });
});
