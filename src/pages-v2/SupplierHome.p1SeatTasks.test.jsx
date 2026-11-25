// ─────────────────────────────────────────────────────────────────────────────
// UCX-P1 v2 (BL-362) — the supplier To do follows the seat. A row shows when
// the seat's atoms (resolved through `atomsForSeat`) hold the act the row asks
// for; the rows of lanes the seat does not hold sit behind a link that shows
// them. The areas and their order stay as ruled in RFX-D20.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import SupplierHome from './SupplierHome';

const Probe = () => {
  const l = useLocation();
  return <output data-testid="probe">{l.pathname + l.search}</output>;
};

/** @param {typeof SUPPLIER} [identity] */
const renderHome = (identity = SUPPLIER) =>
  renderWithProviders(
    <Routes>
      <Route path="/supplier/home" element={<SupplierHome />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { identity, route: '/supplier/home' }
  );

/** The seeded seat minus the commercial and back-office lanes. */
const NARROWED = {
  ...SUPPLIER,
  businessRoles: SEEDED_SEAT_ROLES.supplier.filter((r) => r === 'supplier' || r === 'fulfilment')
};

describe('UCX-P1 — the supplier To do follows the seat', () => {
  it('a seat holding every lane sees every row it saw before, and no hidden link', async () => {
    renderHome();
    expect(
      await screen.findByTestId('home-task-confirm-orders', {}, { timeout: 8000 })
    ).toBeTruthy();
    expect(screen.getByTestId('home-task-rfq')).toBeTruthy();
    expect(screen.getByTestId('home-task-certs')).toBeTruthy();
    expect(screen.queryByTestId('home-hidden-toggle')).toBeNull();
  });

  it('a Fulfilment-only seat sees its rows, hides the other lanes, and the link shows them', async () => {
    renderHome(NARROWED);
    expect(
      await screen.findByTestId('home-task-confirm-orders', {}, { timeout: 8000 })
    ).toBeTruthy();
    // A commercial row and a back-office row are not the seat's.
    expect(screen.queryByTestId('home-task-rfq')).toBeNull();
    expect(screen.queryByTestId('home-task-certs')).toBeNull();
    const toggle = await screen.findByTestId('home-hidden-toggle');
    expect(toggle).toHaveTextContent(/Tasks for lanes you do not hold are hidden \(show \d+\)/);
    fireEvent.click(toggle);
    expect(await screen.findByTestId('home-task-rfq', {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.getByTestId('home-task-certs')).toBeTruthy();
    expect(screen.getByTestId('home-hidden-toggle')).toHaveTextContent(
      /Hide the rows of lanes you do not hold/
    );
  });

  it('the capacity row opens the Not-started group, not the first group', async () => {
    renderHome();
    const cap = await screen.findByTestId('home-task-capacity-due', {}, { timeout: 8000 });
    fireEvent.click(cap);
    expect(screen.getByTestId('probe').textContent).toMatch(/^\/supplier\/capacity\?group=pg-/);
  });

  it('the missing-ASN row opens the filtered call-off view, not the unfiltered list', async () => {
    renderHome();
    const missing = await screen.findByTestId(
      'home-task-calloffs-missing-asn',
      {},
      { timeout: 8000 }
    );
    fireEvent.click(missing);
    expect(screen.getByTestId('probe').textContent).toBe('/supplier/call-offs?status=missingAsn');
  });
});
