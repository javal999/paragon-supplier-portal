import { describe, it, expect, afterEach } from 'vitest';
import { screen, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerMaterialRequirement from './BuyerMaterialRequirement';
import { mockDataService } from '@services/data/mock/mockDataService';
import { isLive } from '@services/liveness';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import i18n from '@lib/i18n';
import type { QueryScope } from '@services/data/types';
import { qtyOf } from './materialPlan/planDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-03 — the planner's Material requirement page. Every figure is read
// back from the service for the same scope, never restated.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('BuyerMaterialRequirement — the planner page', () => {
  it('renders inside the app shell with the SIMULATED engine pill and the E14-05 sizing note — never Live', async () => {
    expect(isLive('engineDataset')).toBe(false);
    renderWithProviders(<BuyerMaterialRequirement />, { identity: BUYER, route: '/buyer/material-requirement' });
    expect(await screen.findByRole('heading', { name: 'Material requirement' })).toBeInTheDocument();
    expect(screen.getByText('Synthetic data · awaiting the MDM SAP feed')).toBeInTheDocument();
    expect(screen.queryByText('Live')).toBeNull();
    // E14-05 now sizes the planned orders (the interim note is the fallback's).
    expect(screen.getByTestId('mrq-sized-note')).toBeInTheDocument();
    expect(screen.queryByTestId('mrq-interim-note')).toBeNull();
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('one row per material, and the KPIs are the service’s own counts', async () => {
    const run = (await mockDataService.procurement.getMaterialRequirement(buyerScope))!;
    renderWithProviders(<BuyerMaterialRequirement />, { identity: BUYER, route: '/buyer/material-requirement' });
    await screen.findByTestId(`mrq-row-${run.materials[0].materialCode}`);
    for (const m of run.materials) {
      const row = screen.getByTestId(`mrq-row-${m.materialCode}`);
      expect(within(row).getByText(m.materialCode)).toBeInTheDocument();
      expect(screen.getByTestId(`mrq-total-net-${m.materialCode}`)).toHaveTextContent(qtyOf(m.totals.net, m.uom));
    }
    expect(screen.getByTestId('mrq-kpi-net')).toHaveTextContent(String(run.materials.filter((m) => m.totals.net > 0).length));
    expect(screen.getByTestId('mrq-kpi-orders')).toHaveTextContent(
      String(run.materials.reduce((s, m) => s + m.totals.plannedOrders, 0)),
    );
  });

  it('the week grid shows the selected material; its gross requirement opens onto the finished goods behind it (AC-03)', async () => {
    const run = (await mockDataService.procurement.getMaterialRequirement(buyerScope))!;
    const m = run.materials.find((x) => x.totals.net > 0)!;
    const w = m.weeks.find((x) => x.gross > 0 && x.pegs.length > 1) ?? m.weeks.find((x) => x.gross > 0)!;
    renderWithProviders(<BuyerMaterialRequirement />, { identity: BUYER, route: '/buyer/material-requirement' });
    fireEvent.click(await screen.findByTestId(`mrq-row-${m.materialCode}`));
    const detail = screen.getByTestId('mrq-detail');
    expect(within(detail).getByTestId(`mrq-net-${w.weekStart}`)).toHaveTextContent(qtyOf(w.net, m.uom));
    fireEvent.click(within(detail).getByTestId(`mrq-gross-${w.weekStart}`));
    const pegs = screen.getByTestId('mrq-pegs');
    expect(within(pegs).getByTestId('mrq-pegs-total')).toHaveTextContent(qtyOf(w.gross, m.uom));
    for (const p of w.pegs) expect(within(pegs).getAllByTestId(`mrq-peg-${p.skuCode}`).length).toBeGreaterThan(0);
    // BL-115 — each part shows the scrap and yield of the BOM line it came
    // through, where scrap is shown. The synthetic BOM has no yield loss: 100%.
    const p0 = w.pegs[0];
    expect(p0.yieldPct).toBe(1);
    expect(within(pegs).getAllByTestId(`mrq-peg-yield-${p0.skuCode}`)[0]).toHaveTextContent('100%');
    expect(within(pegs).getAllByTestId(`mrq-peg-scrap-${p0.skuCode}`)[0].textContent).toMatch(/^\d+([.,]\d)?%$/);
    expect(screen.getByTestId('mrq-definitions')).toHaveTextContent('÷ yield');
  });

  it('counting unconfirmed lines is the planner’s choice, and they are then marked (AC-02)', async () => {
    const inc = (await mockDataService.procurement.getMaterialRequirement(buyerScope, true))!;
    const m = inc.materials.find((x) => x.weeks.some((w) => w.unconfirmedReceipts > 0))!;
    const w = m.weeks.find((x) => x.unconfirmedReceipts > 0)!;
    renderWithProviders(<BuyerMaterialRequirement />, { identity: BUYER, route: '/buyer/material-requirement' });
    await screen.findByTestId(`mrq-row-${m.materialCode}`);
    expect(screen.queryByTestId('mrq-included-note')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: 'Also count unconfirmed lines' }));
    expect(await screen.findByTestId('mrq-included-note')).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId(`mrq-row-${m.materialCode}`));
    expect(await screen.findByTestId(`mrq-unconfirmed-${w.weekStart}`)).toBeInTheDocument();
  });

  it('a supplier scope gets nothing — simulated engine output is never shown to a supplier (X-03)', async () => {
    expect(await mockDataService.procurement.getMaterialRequirement(supplierScope)).toBeNull();
    expect(await mockDataService.procurement.getMaterialRequirement(buyerScope)).not.toBeNull();
  });

  it('renders in Bahasa Indonesia from the ID fragment', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerMaterialRequirement />, { identity: BUYER, route: '/buyer/material-requirement' });
    expect(await screen.findByRole('heading', { name: 'Kebutuhan material' })).toBeInTheDocument();
    expect(screen.getByText('Cara menghitungnya')).toBeInTheDocument();
  });
});
