// ────────────────────────────────────────────────────────────────────────────
// BL-326 — the Create-ASN tab's heading order, on the PAGE (MR !151 follow-up).
//
// The BL-84 heading test in `SupplierShipments.test.jsx` renders only the
// default tab, so the wizard's headings were never walked: a page-level h1
// followed by a step-level h3 would pass it. This spec opens the Create tab and
// walks into the details step, where the section headings sit.
// ────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import SupplierShipments from './SupplierShipments';

beforeEach(() => {
  purchaseOrderStore.reset();
  asnStore.reset();
});

/**
 * @param {HTMLElement} container
 */
function assertNoSkippedLevels(container) {
  const headings = [...container.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  expect(headings.filter((h) => h.tagName === 'H1')).toHaveLength(1);
  const levels = headings.map((h) => Number(h.tagName.slice(1)));
  for (let i = 1; i < levels.length; i += 1) {
    expect(
      levels[i] - levels[i - 1],
      `heading order skipped at ${headings[i]?.textContent}`
    ).toBeLessThanOrEqual(1);
  }
  return headings;
}

describe('BL-326 · the Create-ASN tab does not skip a heading level', () => {
  it('page h1 → wizard h2 → section h3, with no level skipped on the way', async () => {
    const { container } = renderWithProviders(<SupplierShipments />, { identity: SUPPLIER });
    await screen.findByText('ASN-2025-00211');

    fireEvent.click(screen.getByRole('tab', { name: 'Create ASN' }));
    // The wizard's own heading is a level 2 under the page title.
    expect(await screen.findByRole('heading', { level: 2, name: 'Select PO' })).toBeInTheDocument();
    assertNoSkippedLevels(container);

    // Step 2 carries h3 section headings, which themselves sit under the h2.
    fireEvent.click(screen.getAllByRole('button', { name: /PO-/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByRole('heading', { level: 2, name: 'Shipment details' });
    const headings = assertNoSkippedLevels(container);
    expect(headings.some((h) => h.tagName === 'H3')).toBe(true);
  });
});
