// ─────────────────────────────────────────────────────────────────────────────
// IA P-06, owner ruling 2026-10-21: Stock simulation stays its own page
// (MAT-D2; REQ-E08-01 BR-01, no separate available figure on the stock page).
// Each Stock row links to it, narrowed to that supplier and material.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import BuyerInventory from '../BuyerInventory';
import BuyerStockSimulation from '../BuyerStockSimulation';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

const pages = (
  <Routes>
    <Route path="/buyer/inventory" element={<BuyerInventory />} />
    <Route path="/buyer/stock-simulation" element={<BuyerStockSimulation />} />
  </Routes>
);

describe('Stock rows link to the estimate on Stock simulation', () => {
  it('"See estimate for a date" carries the supplier and material, and Stock simulation opens narrowed to them', async () => {
    renderWithProviders(pages, { identity: BUYER, route: '/buyer/inventory' });
    const link = await screen.findByTestId('pti-stock-estimate-sup-002-RM-STEAR-7300');
    expect(link).toHaveTextContent('See estimate for a date');
    const href = new URL(/** @type {string} */ (link.getAttribute('href')), 'http://x');
    expect(href.pathname).toBe('/buyer/stock-simulation');
    expect(href.searchParams.get('supplier')).toBe('sup-002');
    expect(href.searchParams.get('q')).toBe('RM-STEAR-7300');
    fireEvent.click(link);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Stock simulation' })
    ).toBeInTheDocument();
    expect(within(screen.getByTestId('sim-search')).getByRole('textbox')).toHaveValue(
      'RM-STEAR-7300'
    );
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(pages, { identity: BUYER, route: '/buyer/inventory' });
    expect(await screen.findByTestId('pti-stock-estimate-sup-002-RM-STEAR-7300')).toHaveTextContent(
      'Lihat perkiraan pada tanggal'
    );
  });
});
