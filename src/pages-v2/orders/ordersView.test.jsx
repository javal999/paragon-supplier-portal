// ─────────────────────────────────────────────────────────────────────────────
// P-02 — Order summary is the default view of Purchase orders, both personas.
//
// A bare visit opens Summary; `view=list` or any list parameter (`tab`, `po`,
// `focus`, …) opens List, so every link written for the list still lands on it.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { ordersViewOf } from './OrdersViewSwitch';
import BuyerOrders from '../BuyerOrders';
import SupplierOrders from '../SupplierOrders';
import BuyerOrderSummary from '../BuyerOrderSummary';

describe('ordersViewOf — which view an address opens', () => {
  it.each([
    ['', 'summary'],
    ['view=summary', 'summary'],
    ['view=list', 'list'],
    ['tab=escalated', 'list'],
    ['po=po-007&from=order-summary', 'list'],
    ['focus=response&po=po-007', 'list'],
    // An explicit view wins over a list parameter.
    ['view=summary&po=po-007', 'summary'],
    // An unknown view is ignored, as `useUrlEnumParam` ignores one.
    ['view=bogus', 'summary'],
    ['view=bogus&tab=action', 'list']
  ])('"?%s" → %s', (query, view) => {
    expect(ordersViewOf(new URLSearchParams(query))).toBe(view);
  });
});

describe('Purchase orders — Summary by default, List for list links', () => {
  it('PTI: a bare visit opens the summary under the Purchase orders title', async () => {
    renderWithProviders(<BuyerOrders />, { identity: BUYER, route: '/buyer/orders' });
    expect(await screen.findByTestId('order-summary-row-po-007')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      i18n.t('buyerOrders.header.title')
    );
    expect(screen.getByTestId('orders-view-summary')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('orders-view-list')).toHaveAttribute(
      'href',
      '/buyer/orders?view=list'
    );
    expect(screen.queryByText('Total Open POs')).toBeNull();
  });

  it('PTI: `?tab=escalated` (My tasks) still lands on the list, on that tab', async () => {
    renderWithProviders(<BuyerOrders />, { identity: BUYER, route: '/buyer/orders?tab=escalated' });
    expect(await screen.findByText('Total Open POs')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Escalated/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('orders-view-list')).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByTestId('order-summary-row-po-007')).toBeNull();
  });

  it('PTI: the switch moves between the views', async () => {
    renderWithProviders(<BuyerOrders />, { identity: BUYER, route: '/buyer/orders' });
    fireEvent.click(await screen.findByTestId('orders-view-list'));
    expect(await screen.findByText('Total Open POs')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('orders-view-summary'));
    expect(await screen.findByTestId('order-summary-row-po-007')).toBeInTheDocument();
  });

  it('supplier: a bare visit opens the summary', async () => {
    renderWithProviders(<SupplierOrders />, { identity: SUPPLIER, route: '/supplier/orders' });
    expect(await screen.findByTestId('order-summary-row-po-007')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      i18n.t('supplierOrders.header.title')
    );
  });

  it('supplier: `?tab=action` opens the list', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      route: '/supplier/orders?tab=action'
    });
    expect(await screen.findByText('Total Value Pending')).toBeInTheDocument();
    expect(screen.queryByTestId('order-summary-row-po-007')).toBeNull();
  });

  it('the old Order summary page renders the same Summary view, switch included', async () => {
    renderWithProviders(<BuyerOrderSummary />, { identity: BUYER, route: '/buyer/order-summary' });
    expect(await screen.findByTestId('order-summary-row-po-007')).toBeInTheDocument();
    expect(screen.getByTestId('orders-view-summary')).toHaveAttribute('aria-current', 'page');
  });

  it('the switch reads in Indonesian', async () => {
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(<BuyerOrders />, { identity: BUYER, route: '/buyer/orders' });
      expect(await screen.findByTestId('orders-view-summary')).toHaveTextContent('Ringkasan');
      expect(screen.getByTestId('orders-view-list')).toHaveTextContent('Daftar');
      expect(screen.getByRole('navigation', { name: 'Tampilan' })).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
