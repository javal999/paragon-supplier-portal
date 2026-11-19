import { describe, it, expect, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import i18n from '@lib/i18n';
import BuyerCommHub from './BuyerCommHub';
import BuyerSourcing from './BuyerSourcing';
import SupplierRFQs from './SupplierRFQs';

// Batch 2 acceptance: with the UI in Indonesian, each page's extracted chrome
// renders in ID and the prior hardcoded English header is gone. Authentic
// channel templates are out of scope (asserted only on translated chrome).
/** @param {'en' | 'id'} lng */
const setLang = (lng) =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Batch 2 — bilingual render (no EN leak in chrome)', () => {
  it('BuyerCommHub: ID chrome header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerCommHub />);
    // The menu item now carries the page's own name, so wait on the page's tab,
    // not on a title the sidebar already shows before the page has loaded.
    expect(
      await screen.findByRole('tab', { name: /Pemasok yang perlu ditindaklanjuti/ })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Tindak lanjut pemasok').length).toBeGreaterThan(1);
    expect(screen.queryByText('Supplier follow-ups')).not.toBeInTheDocument();
    expect(screen.queryByText('Suppliers to follow up')).not.toBeInTheDocument();
  });

  it('BuyerSourcing: ID chrome header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerSourcing />);
    // RFx UX X-01 — the title leads with the acronym the menu uses.
    expect(await screen.findByText('RFQ · Permintaan penawaran harga')).toBeInTheDocument();
    expect(screen.queryByText('RFQ · Quotation requests')).not.toBeInTheDocument();
  });

  it('SupplierRFQs: ID chrome header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    // BL-183 (owner ruling 2026-11-19) — the title is the menu label.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Undangan RFQ' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'RFQ · Permintaan penawaran harga' })).toBeNull();
    expect(screen.queryByText('RFQ · Quotation requests')).not.toBeInTheDocument();
  });
});
