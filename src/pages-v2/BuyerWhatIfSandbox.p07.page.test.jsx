// ─────────────────────────────────────────────────────────────────────────────
// P-07 (IA-B10) — the what-if sandbox opens from a material row. An Inventory
// row's "Try a what-if" carries its material and supplier and lands on the
// sandbox with that pair chosen; on the sandbox, "New blank scenario" clears
// the pair, so it starts blank with or without a link. (What to order's rows
// are covered in BuyerOrderPlan.test.jsx and BuyerOrderPlan.cap12.page.test.jsx.)
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { whatIfScenarioStore } from '@services/data/mock/stores/whatIfScenarioStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import BuyerWhatIfSandbox from './BuyerWhatIfSandbox';
import BuyerInventory from './BuyerInventory';

const PAIR = '/buyer/what-if?supplier=sup-007&material=PK-PETB-8802';

beforeEach(async () => {
  sdcClock.reset();
  whatIfScenarioStore.reset();
  await i18n.changeLanguage('en');
});

const pages = (
  <Routes>
    <Route path="/buyer/inventory" element={<BuyerInventory />} />
    <Route path="/buyer/what-if" element={<BuyerWhatIfSandbox />} />
  </Routes>
);

describe('Inventory rows open the sandbox on their pair', () => {
  it('"Try a what-if" carries the material and supplier, and the sandbox opens on them', async () => {
    renderWithProviders(pages, { identity: BUYER, route: '/buyer/inventory' });
    const link = await screen.findByTestId('pti-stock-whatif-sup-002-RM-STEAR-7300');
    expect(link).toHaveTextContent('Try a what-if');
    const href = new URL(/** @type {string} */ (link.getAttribute('href')), 'http://x');
    expect(href.pathname).toBe('/buyer/what-if');
    expect(href.searchParams.get('material')).toBe('RM-STEAR-7300');
    expect(href.searchParams.get('supplier')).toBe('sup-002');
    fireEvent.click(link);
    expect(await screen.findByTestId('wi-analysis-only')).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier and material')).toHaveValue('sup-002|RM-STEAR-7300');
    expect(screen.queryByTestId('wi-empty')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(pages, { identity: BUYER, route: '/buyer/inventory' });
    expect(await screen.findByTestId('pti-stock-whatif-sup-002-RM-STEAR-7300')).toHaveTextContent(
      'Coba what-if'
    );
  });
});

describe('the sandbox starts blank on request', () => {
  it('opened on a pair, "New blank scenario" clears it back to the picker', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { identity: BUYER, route: PAIR });
    expect(await screen.findByTestId('wi-edited')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('wi-new-blank'));
    expect(await screen.findByTestId('wi-empty')).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier and material')).toHaveValue('');
    expect(screen.queryByTestId('wi-new-blank')).toBeNull();
  });

  it('with no params it is already blank and offers no "New blank scenario"', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { identity: BUYER, route: '/buyer/what-if' });
    expect(await screen.findByTestId('wi-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('wi-new-blank')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerWhatIfSandbox />, { identity: BUYER, route: PAIR });
    expect(await screen.findByTestId('wi-new-blank')).toHaveTextContent('Skenario kosong baru');
  });
});
