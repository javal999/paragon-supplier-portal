// ─────────────────────────────────────────────────────────────────────────────
// P-07 (IA-B10) — the what-if sandbox opens from a material row. An Inventory
// row's "Try a what-if" carries its material and supplier and lands on the
// sandbox with that pair chosen. U-09 (BL-247): `?material=` alone opens the
// material on its primary supplier, and "New blank scenario" starts a fresh
// editor on the same pair, keeping it in the address. (What to order's rows
// are covered in BuyerOrderPlan.test.jsx and BuyerOrderPlan.cap12.page.test.jsx.)
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { whatIfScenarioStore } from '@services/data/mock/stores/whatIfScenarioStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import BuyerWhatIfSandbox from './BuyerWhatIfSandbox';
import BuyerInventory from './BuyerInventory';
import { primarySource } from '@services/engine/requirement';
import { engineDataset } from '@services/data/mock/fixtures/engineDataset';

/** Prints the address the page is on. */
const Where = () => {
  const loc = useLocation();
  return <output data-testid="where">{`${loc.pathname}${loc.search}`}</output>;
};

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

describe('?material= alone (U-09, BL-247)', () => {
  it('opens the material on its primary supplier', async () => {
    const primary = primarySource(engineDataset().sources, 'PK-PETB-8801');
    expect(primary).not.toBeNull();
    renderWithProviders(<BuyerWhatIfSandbox />, {
      identity: BUYER,
      route: '/buyer/what-if?material=PK-PETB-8801'
    });
    expect(await screen.findByTestId('wi-edited')).toBeInTheDocument();
    expect(screen.getByLabelText('Supplier and material')).toHaveValue(
      `${primary?.supplierId}|PK-PETB-8801`
    );
    expect(screen.queryByTestId('wi-empty')).toBeNull();
  });
});

describe('the sandbox starts blank on request', () => {
  it('opened on a pair, "New blank scenario" starts a fresh editor on it and keeps the pair in the address', async () => {
    renderWithProviders(
      <>
        <BuyerWhatIfSandbox />
        <Where />
      </>,
      { identity: BUYER, route: PAIR }
    );
    expect(await screen.findByTestId('wi-edited')).toHaveTextContent(/^0 inputs/);
    // An edit: the LTP of the first week.
    const first = /** @type {HTMLInputElement} */ (screen.getAllByTestId(/^wi-ltp-\d{4}-/)[0]);
    fireEvent.change(first, { target: { value: String(Number(first.value) + 1000) } });
    expect(screen.getByTestId('wi-edited')).toHaveTextContent(/^1 input/);
    fireEvent.click(screen.getByTestId('wi-new-blank'));
    expect(await screen.findByTestId('wi-edited')).toHaveTextContent(/^0 inputs/);
    expect(screen.getByLabelText('Supplier and material')).toHaveValue('sup-007|PK-PETB-8802');
    const where = new URL(screen.getByTestId('where').textContent ?? '', 'http://x');
    expect(where.searchParams.get('material')).toBe('PK-PETB-8802');
    expect(where.searchParams.get('supplier')).toBe('sup-007');
    expect(screen.queryByTestId('wi-empty')).toBeNull();
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
