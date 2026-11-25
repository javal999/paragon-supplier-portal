// ─────────────────────────────────────────────────────────────────────────────
// UCX-P1 v2 (BL-362) — My tasks follows the seat. A row shows when the seat's
// atoms (resolved through `atomsForSeat`) hold the act the row asks for; the
// rows of roles the seat does not hold sit behind a link that shows them.
// Four duties that had no task now have one, each on its own seat.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { asnStore } from '@services/data/mock/stores/asnStore';
import BuyerHome from './BuyerHome';

/** @param {typeof BUYER} [identity] */
const renderHome = (identity = BUYER) =>
  renderWithProviders(<BuyerHome />, { identity, route: '/buyer/home' });

/**
 * A shelf-life exception to count: the seed has no ASN in that state.
 */
const withAwaitedException = () => {
  const first = asnStore.all()[0];
  asnStore.update(first.asnNumber, (a) => ({ ...a, status: 'Awaiting exception' }));
};

describe('UCX-P1 — My tasks follows the seat', () => {
  it('a seat holding every lane sees the four new rows and no hidden link', async () => {
    withAwaitedException();
    renderHome();
    expect(
      await screen.findByTestId('home-task-shelf-life-exceptions', {}, { timeout: 8000 })
    ).toBeTruthy();
    expect(screen.getByTestId('home-task-rejected-calloffs')).toBeTruthy();
    expect(screen.getByTestId('home-task-trade-names')).toBeTruthy();
    expect(screen.getByTestId('home-task-certificate-renewals')).toBeTruthy();
    expect(screen.queryByTestId('home-hidden-toggle')).toBeNull();
  });

  it('a Procurement-only seat hides them behind the link, which shows them', async () => {
    withAwaitedException();
    renderHome({ ...BUYER, businessRoles: ['buyer', 'procurement'] });
    await screen.findByTestId('home-tasks', {}, { timeout: 8000 });
    expect(screen.queryByTestId('home-task-shelf-life-exceptions')).toBeNull();
    expect(screen.queryByTestId('home-task-trade-names')).toBeNull();
    const toggle = await screen.findByTestId('home-hidden-toggle');
    expect(toggle).toHaveTextContent(/Tasks for roles you do not hold are hidden \(show \d+\)/);
    fireEvent.click(toggle);
    expect(
      await screen.findByTestId('home-task-shelf-life-exceptions', {}, { timeout: 8000 })
    ).toBeTruthy();
    expect(screen.getByTestId('home-task-trade-names')).toBeTruthy();
  });

  it('a Compliance-only seat sees the exception and renewal rows, not the planning ones', async () => {
    withAwaitedException();
    renderHome({ ...BUYER, businessRoles: ['buyer', 'compliance'] });
    expect(
      await screen.findByTestId('home-task-shelf-life-exceptions', {}, { timeout: 8000 })
    ).toBeTruthy();
    expect(screen.getByTestId('home-task-certificate-renewals')).toBeTruthy();
    expect(screen.queryByTestId('home-task-trade-names')).toBeNull();
    expect(screen.queryByTestId('home-task-rejected-calloffs')).toBeNull();
  });
});
