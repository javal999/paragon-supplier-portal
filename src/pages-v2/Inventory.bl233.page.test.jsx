// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 2 on the screen — the Inventory pages (Goal A): every important
// column header (BR-06) carries its (i), the plain ones carry none (BR-05), and
// the tip reads from the same glossary entry as the label, in EN and ID (BR-08).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { textWithoutTips } from '@test/termText';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import BuyerInventory from './BuyerInventory';
import BuyerStockSimulation from './BuyerStockSimulation';
import SupplierInventory from './SupplierInventory';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => sdcClock.reset());

/**
 * Each column header of the first table in `scope`, as label → its tip's
 * test id ('' when it has no (i)).
 * @param {HTMLElement} table
 */
const headerTips = (table) =>
  Object.fromEntries(
    within(table)
      .getAllByRole('columnheader')
      .map((h) => [
        textWithoutTips(h).trim(),
        h.querySelector('[data-testid^="term-tip-"]')?.getAttribute('data-testid') ?? ''
      ])
  );

/** @param {string} rowTestId */
const tableOf = async (rowTestId) =>
  /** @type {HTMLElement} */ ((await screen.findByTestId(rowTestId)).closest('table'));

describe('BL-233 wave 2 — /buyer/inventory', () => {
  it('the four measures have an (i); material and update time do not', async () => {
    renderWithProviders(<BuyerInventory />, { identity: BUYER, route: '/buyer/inventory' });
    const tips = headerTips(await tableOf('pti-stock-row-sup-002-RM-STEAR-7300'));
    expect(tips).toEqual({
      'Material · supplier': '',
      'Risk · supplier cover': 'term-tip-supplier-cover',
      'Supplier stock': 'term-tip-supplier-stock',
      'PTI stock / ROP': 'term-tip-pti-stock-rop',
      Incoming: 'term-tip-incoming',
      Updated: ''
    });
    const tip = within(screen.getByTestId('term-tip-pti-stock-rop')).getByRole('tooltip');
    expect(tip).toHaveTextContent('Also called: PTI SOH (hub Material requirements, alert rules)');
    expect(tip).toHaveTextContent('Not: ROP Order or ROP Fisik');
  });
});

describe('BL-233 wave 2 — /buyer/stock-simulation', () => {
  it('the six measures have an (i), with the formula from the stock simulation rules', async () => {
    renderWithProviders(<BuyerStockSimulation />, {
      identity: PLANNER,
      route: '/buyer/stock-simulation'
    });
    const tips = headerTips(await tableOf('sim-row-sup-004-FR-WARD-4410'));
    expect(tips).toMatchObject({
      Material: '',
      Supplier: '',
      'Already called off, not shipped': 'term-tip-called-off-not-shipped',
      'Free to call off': 'term-tip-free-to-call-off',
      'PTI inbound': 'term-tip-pti-inbound',
      'Last update': '',
      Basis: 'term-tip-simulation-basis',
      Flags: 'term-tip-simulation-flags',
      Actions: ''
    });
    // Its header also carries the liveness pill, so it is found by its start.
    const available = Object.entries(tips).find(([label]) =>
      label.startsWith('Supplier available')
    );
    expect(available?.[1]).toBe('term-tip-supplier-available');
    const free = within(screen.getByTestId('term-tip-free-to-call-off')).getByRole('tooltip');
    expect(free).toHaveTextContent(
      'How it is calculated: Supplier available − already called off, not shipped.'
    );
  });
});

describe('BL-233 wave 2 — /supplier/inventory', () => {
  it('the supplier’s stock table: six measures with an (i), in EN and ID', async () => {
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    const tips = headerTips(await tableOf('sup-stock-row-PK-PETB-8802'));
    expect(tips).toMatchObject({
      Material: '',
      'Supplier stock': 'term-tip-supplier-stock',
      'Your reorder point': 'term-tip-supplier-own-rop',
      'PTI stock': 'term-tip-pti-stock',
      'PTI reorder point': 'term-tip-pti-rop',
      Incoming: 'term-tip-incoming',
      'Days of supply': 'term-tip-days-of-supply',
      'Last update': ''
    });
    expect(
      within(screen.getByTestId('term-tip-supplier-own-rop')).getByRole('tooltip')
    ).toHaveTextContent(
      'Also called: ROP PM in Supplier (Material Planning team’s stock sheet, Q-file B10)'
    );
  });

  it('reads in Indonesian from the same entries', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
      const table = await tableOf('sup-stock-row-PK-PETB-8802');
      expect(headerTips(table)).toMatchObject({
        'Titik pemesanan ulang Anda': 'term-tip-supplier-own-rop',
        'Hari persediaan': 'term-tip-days-of-supply'
      });
      expect(
        within(screen.getByTestId('term-tip-days-of-supply')).getByRole('tooltip')
      ).toHaveTextContent('Cara menghitung: Stok ÷ rata-rata permintaan harian');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
