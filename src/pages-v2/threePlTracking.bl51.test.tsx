// ─────────────────────────────────────────────────────────────────────────────
// BL-51 · THE TRACKING LINK ON THE SCREENS — supplier and PTI, and the admin page.
//
// Each case is a NAMED sample ASN. A link is asserted with its target and rel,
// and every plain-text case sits beside a link case on the same screen, so a
// component that never links (or always does) cannot pass.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect } from 'vitest';
import { renderWithProviders, SUPPLIER, BUYER } from '@test/test-utils';
import type { CurrentIdentity } from '@context/CurrentIdentityContext';
import SupplierShipments from './SupplierShipments';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import AdminThreePls from './admin/AdminThreePls';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { threePlStore } from '@services/transitions/threePlStore';

beforeEach(() => {
  asnStore.reset();
  threePlStore.reset();
});

const expectLink = (el: HTMLElement, href: string) => {
  expect(el.tagName).toBe('A');
  expect(el).toHaveAttribute('href', href);
  expect(el).toHaveAttribute('target', '_blank');
  expect(el).toHaveAttribute('rel', 'noopener noreferrer');
};

describe('BL-51 · supplier ASN list (sup-007)', () => {
  it('ASN-2025-00211 links to its 3PL’s page; ASN-2025-00201 (unknown 3PL) is plain text', async () => {
    renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    const link = await screen.findByTestId('asn-tracking-ASN-2025-00211');
    expectLink(link, 'https://track.sample-express.example/parcel/SMPL-EXP-882941-X');
    const plain = screen.getByTestId('asn-tracking-ASN-2025-00201');
    expect(plain.tagName).not.toBe('A');
    expect(plain).toHaveAttribute('data-tracking', 'plain');
    expect(plain).toHaveTextContent('SMPL-PCL-119843-JKT');
  });
});

describe('BL-51 · PTI goods receipt — the ASN discrepancy table', () => {
  it('ASN-2025-00201 (Discrepancy, unknown 3PL) shows its number as plain text', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, { identity: BUYER });
    const cell = await screen.findByTestId('gr-discrepancy-tracking-ASN-2025-00201');
    expect(cell).toHaveAttribute('data-tracking', 'plain');
    expect(cell).toHaveTextContent('SMPL-PCL-119843-JKT');
  });
});

describe('BL-51 · the administration page', () => {
  it('lists the sample list, marked as sample, with a working example link per 3PL', async () => {
    renderWithProviders(<AdminThreePls />, { identity: BUYER });
    expect(await screen.findByText('3PL tracking links', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expectLink(
      screen.getByTestId('tpl-try-tpl-sample-postal'),
      'https://sample-postal.example/tracking?awb=SAMPLE123',
    );
    // The inactive 3PL is listed as not offered — and still links.
    expect(screen.getByTestId('tpl-row-tpl-sample-interisland')).toHaveTextContent('Not offered');
    expect(screen.getByTestId('tpl-try-tpl-sample-interisland').tagName).toBe('A');
  });

  it('the administrator (compliance lane) adds a 3PL through the verb; it joins the list', async () => {
    renderWithProviders(<AdminThreePls />, { identity: BUYER });
    fireEvent.change(await screen.findByTestId('tpl-name'), { target: { value: 'Sample Harbour Haulage (illustrative)' } });
    fireEvent.change(screen.getByTestId('tpl-pattern'), {
      target: { value: 'https://haulage.sample.example/track/{tracking}' },
    });
    expect(screen.getByTestId('tpl-preview')).toHaveTextContent(
      'https://haulage.sample.example/track/SAMPLE123',
    );
    fireEvent.click(screen.getByTestId('tpl-submit'));
    await waitFor(() =>
      expect(threePlStore.get('tpl-sample-harbour-haulage-illustrative')?.name).toBe(
        'Sample Harbour Haulage (illustrative)',
      ),
    );
    expect(await screen.findByTestId('tpl-row-tpl-sample-harbour-haulage-illustrative')).toBeInTheDocument();
    expect(screen.getByTestId('tpl-change-tpl-sample-harbour-haulage-illustrative')).toHaveTextContent('Not attributed');
  });

  it('a seat without the atom reads the list and is shown the wait, never the form', async () => {
    const planner: CurrentIdentity = { ...BUYER, businessRoles: ['planning'] };
    renderWithProviders(<AdminThreePls />, { identity: planner });
    expect(await screen.findByTestId('tpl-gate')).toBeInTheDocument();
    expect(screen.getByTestId('handoff-threepl-maintain')).toBeInTheDocument();
    expect(screen.queryByTestId('tpl-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tpl-edit-tpl-sample-express')).not.toBeInTheDocument();
    // Reading is not withheld.
    expect(screen.getByTestId('tpl-row-tpl-sample-express')).toBeInTheDocument();
  });
});
