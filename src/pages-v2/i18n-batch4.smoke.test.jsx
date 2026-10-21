import { describe, it, expect, afterAll } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import i18n from '@lib/i18n';
import BuyerShipments from './BuyerShipments';
import BuyerCompliance from './BuyerCompliance';

// Batch 4 acceptance: with the UI in Indonesian, each page's extracted chrome
// renders in ID and the prior hardcoded English header is gone. Deferred prose,
// mock/sample data, and centrally-localized chips are out of scope (asserted
// only on translated chrome).
/** @param {'en' | 'id'} lng */
const setLang = (lng) =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

afterAll(async () => {
  await setLang('en');
});

describe('Batch 4 — bilingual render (no chrome EN leak)', () => {
  it('BuyerShipments: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerShipments />);
    expect(await screen.findByText('Pengiriman & ASN')).toBeInTheDocument();
    expect(screen.queryByText('Shipments & ASN')).not.toBeInTheDocument();
  });

  it('BuyerCompliance: ID header, English gone', async () => {
    await setLang('id');
    renderWithProviders(<BuyerCompliance />);
    expect(await screen.findByRole('heading', { name: 'Dokumen pemasok' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Supplier documents' })).not.toBeInTheDocument();
  });
});
