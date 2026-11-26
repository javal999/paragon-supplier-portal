// ─────────────────────────────────────────────────────────────────────────────
// UCX-P9 (BL-370) · UCX-F25 — the supplier's PO On Hold panel reads the
// "proposed" notes in words, without the internal code PEX-12. The PTI panel
// keeps the code (PTI screens may keep codes; the ruling names supplier
// screens).
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from '../FixedStockReconcile';
import { poOnHoldStore } from '@services/data/mock/stores/poOnHoldStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';

const K = 'sup-007|PK-PETB-8801';

beforeEach(() => {
  poOnHoldStore.reset();
  osipParamStore.reset();
});

describe('UCX-P9 — PO On Hold: PEX-12 for PTI, words for the supplier', () => {
  it('the supplier’s recommended-action note carries no code', { timeout: 30000 }, async () => {
    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    const rec = await screen.findByTestId(`poh-rec-${K}`, {}, { timeout: 15000 });
    expect(rec.textContent).not.toMatch(/PEX-12/);
    expect(rec).toHaveTextContent('waiting for Paragon’s decision');
    expect(screen.queryAllByText(/PEX-12/)).toEqual([]);
  });

  it(
    'the PTI planner keeps the code (and reads it as an open owner question)',
    { timeout: 30000 },
    async () => {
      renderWithProviders(<BuyerFixedStockReconcile />, {
        identity: BUYER,
        route: '/buyer/fs-reconcile'
      });
      const rec = await screen.findByTestId(`poh-rec-${K}`, {}, { timeout: 15000 });
      expect(rec).toHaveTextContent('awaiting owner review (PEX-12)');
    }
  );
});
