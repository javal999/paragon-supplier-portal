// ─────────────────────────────────────────────────────────────────────────────
// RFI, RFQ and RFP as three modules (operator decision 2026-09-21, reversing
// NV-06's "one sourcing menu item"). Replaces the page-level RfxTabs switch:
// each event type has its own menu item and route, each page its own title and
// count, and a detail page keeps its own item highlighted (NV-03).
// ─────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { PTI_NAV, SUPPLIER_NAV, isItemActive } from '@components/layout-v2/navConfig';
import { hubEn, hubId } from '@lib/i18n/hub';
import BuyerRfi from '../BuyerRfi';
import BuyerRfp from '../BuyerRfp';
import BuyerSourcing from '../BuyerSourcing';
import SupplierRfi from '../SupplierRfi';
import SupplierRfp from '../SupplierRfp';
import SupplierRFQs from '../SupplierRFQs';

const buyerSourcing = /** @type {import('@components/layout-v2/navConfig').NavSection} */ (
  PTI_NAV.find((s) => s.id === 'sourcing')
);
const supplierSourcing = /** @type {import('@components/layout-v2/navConfig').NavSection} */ (
  SUPPLIER_NAV.find((s) => s.id === 'sourcing')
);

describe('the menu — one item per event type', () => {
  it('PTI Sourcing: Requisitions, RFI, RFQ, RFP, Suppliers, then Supplier documents (IA P-03)', () => {
    expect(buyerSourcing.items.map((i) => i.path)).toEqual([
      '/buyer/purchase-requisition',
      '/buyer/rfi',
      '/buyer/rfq',
      '/buyer/rfp',
      '/buyer/suppliers',
      '/buyer/compliance'
    ]);
    expect(buyerSourcing.items.map((i) => hubEn[i.labelKey])).toEqual([
      'Requisitions',
      'RFI',
      'RFQ',
      'RFP',
      'Suppliers',
      'Supplier documents'
    ]);
  });

  it('supplier Sourcing: RFI, RFQ and RFP invitations', () => {
    expect(supplierSourcing.items.map((i) => i.path)).toEqual([
      '/supplier/rfi',
      '/supplier/rfq',
      '/supplier/rfp'
    ]);
    expect(supplierSourcing.items.map((i) => hubEn[i.labelKey])).toEqual([
      'RFI invitations',
      'RFQ invitations',
      'RFP invitations'
    ]);
    expect(supplierSourcing.items.map((i) => hubId[i.labelKey])).toEqual([
      'Undangan RFI',
      'Undangan RFQ',
      'Undangan RFP'
    ]);
  });

  it('every sourcing label has an EN and an ID string', () => {
    for (const item of [...buyerSourcing.items, ...supplierSourcing.items]) {
      expect(hubEn[item.labelKey], item.labelKey).toBeTruthy();
      expect(hubId[item.labelKey], item.labelKey).toBeTruthy();
    }
  });

  it.each([
    ['/buyer/rfq/rfq-014', '/buyer/rfq', buyerSourcing],
    ['/buyer/rfi', '/buyer/rfi', buyerSourcing],
    ['/supplier/rfq/rounds', '/supplier/rfq', supplierSourcing],
    ['/supplier/rfp', '/supplier/rfp', supplierSourcing]
  ])('NV-03 — at %s exactly one item is highlighted: %s', (at, owner, section) => {
    const active = section.items.filter((i) => isItemActive(i, at)).map((i) => i.path);
    expect(active).toEqual([owner]);
  });
});

describe('each page carries its own title and count, and no type switch', () => {
  // RFx UX X-01 (owner ruling Q8) — each title leads with the acronym the menu uses.
  // `it.each` rows are table DATA: each element is rendered alone by its own
  // test, never as a React list — so they need no `key` (ESLint react/jsx-key).
  /* eslint-disable react/jsx-key */
  it.each([
    ['buyer RFI', '/buyer/rfi', <BuyerRfi />, BUYER, 'RFI · Information requests'],
    ['buyer RFP', '/buyer/rfp', <BuyerRfp />, BUYER, 'RFP · Proposal requests'],
    ['buyer RFQ', '/buyer/rfq', <BuyerSourcing />, BUYER, 'RFQ · Quotation requests'],
    ['supplier RFI', '/supplier/rfi', <SupplierRfi />, SUPPLIER, 'RFI · Information requests'],
    ['supplier RFP', '/supplier/rfp', <SupplierRfp />, SUPPLIER, 'RFP · Proposal requests'],
    // BL-183 (owner ruling 2026-11-19) — the supplier page title is the menu
    // label; the buyer row above keeps its own X-01 title (a separate key).
    [
      'supplier RFQ',
      '/supplier/rfq',
      <SupplierRFQs />,
      SUPPLIER,
      hubEn['hub.nav.sup.rfqInvitations']
    ]
    /* eslint-enable react/jsx-key */
  ])('%s', async (_name, at, element, identity, title) => {
    await i18n.changeLanguage('en');
    renderWithProviders(
      <Routes>
        <Route path={at} element={element} />
      </Routes>,
      { identity, route: at }
    );
    const heading = await screen.findByRole('heading', { level: 1, name: title });
    const count = within(/** @type {HTMLElement} */ (heading.parentElement)).getByTestId(
      'page-count'
    );
    expect(count.textContent).toMatch(/^\d+$/);
    expect(screen.queryByTestId('rfx-tabs')).not.toBeInTheDocument();
  });

  it('the supplier RFQ page reaches the negotiation rounds, under its own module', async () => {
    await i18n.changeLanguage('en');
    renderWithProviders(
      <Routes>
        <Route path="/supplier/rfq" element={<SupplierRFQs />} />
      </Routes>,
      { identity: SUPPLIER, route: '/supplier/rfq' }
    );
    const link = await screen.findByTestId('rfq-rounds-link');
    expect(link.getAttribute('href')).toBe('/supplier/rfq/rounds');
  });
});
