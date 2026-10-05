import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerOrderPlan from './BuyerOrderPlan';
import { mockDataService } from '@services/data/mock/mockDataService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { isLive } from '@services/liveness';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { CALL_OFF_PO_STATES } from '@services/transitions/callOffRules';
import i18n from '@lib/i18n';
import type { QueryScope } from '@services/data/types';
import { draftNeedDate, umbrellaLineFor } from './orderPlan/orderPlanRelease';
import { sdcClock } from '@services/sdc/clock';
import { formatDate, formatNumber } from '@lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-05 — the planner's Order plan page. Every figure is read back from
// the service for the same scope, never restated. Release (BR-05) ends in the
// call-off STORE, as a DRAFT on the supplier's open umbrella line.
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const supplierScope: QueryScope = { personaType: 'supplier', supplierId: 'sup-007', businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  callOffStore.reset();
  purchaseOrderStore.reset();
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

const plan = async () => (await mockDataService.procurement.getOrderPlan(buyerScope))!;
const openPos = async () =>
  (await mockDataService.procurement.getPurchaseOrders(buyerScope, { status: [...CALL_OFF_PO_STATES] })).items;

describe('BuyerOrderPlan — the planner page (REQ-E14-05)', () => {
  it('renders inside the app shell with the SIMULATED engine pill — never Live — and every cost rate labelled a placeholder', async () => {
    expect(isLive('engineDataset')).toBe(false);
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    expect(await screen.findByRole('heading', { name: 'Order plan' })).toBeInTheDocument();
    expect(screen.getByText('Synthetic data · awaiting the MDM SAP feed')).toBeInTheDocument();
    expect(screen.queryByText('Live')).toBeNull();
    for (const k of ['holding', 'order', 'rent']) {
      expect(screen.getByTestId(`op-cost-placeholder-${k}`)).toHaveTextContent('Placeholder — Finance to confirm');
    }
    expect(screen.getByTestId('op-cost-placeholder-penalty')).toHaveTextContent('Placeholder — the Material Planner to confirm');
    expect(screen.getByTestId('op-cost-rent')).toHaveTextContent('Rp 35.000');
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('AC-02: the packaging fill for every week, against capacity, with rented pallets and their cost — the service’s own figures', async () => {
    const p = await plan();
    const pk = p.warehouses.find((w) => w.kind === 'packaging')!;
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    await screen.findByTestId('op-fill');
    expect(screen.getByTestId('op-capacity')).toHaveTextContent('SYN-WH-PK');
    expect(screen.getByTestId('op-capacity')).toHaveTextContent('1,800 pallets');
    for (const wk of pk.weeks) {
      expect(screen.getByTestId(`op-fill-plan-${wk.weekStart}`)).toHaveTextContent(`${Math.round(wk.fill! * 100)}%`);
    }
    const over = pk.weeks.find((wk) => wk.rentedPallets > 0)!;
    expect(screen.getByTestId(`op-rent-${over.weekStart}`).textContent).toMatch(/^Rp /);
    expect(within(screen.getByTestId(`op-fill-${over.weekStart}`)).getByText('Over capacity')).toBeInTheDocument();
    expect(screen.getByTestId('op-kpi-orders')).toHaveTextContent(String(pk.after.orders));
  });

  it('BL-117: the cap on rented space is shown with the rates; a week that does not fit shows its shortfall and the planner’s two choices', async () => {
    const p = await plan();
    const pk = p.warehouses.find((w) => w.kind === 'packaging')!;
    // The cap in force is the administrator's default (25%), a placeholder the Warehouse confirms.
    expect(p.costs.maxRentedShare).toBe(0.25);
    expect(pk.maxRentedPallets).toBe(450);
    expect(pk.shortfallWeeks.length).toBeGreaterThan(0);
    const sw = pk.shortfallWeeks[0];
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    await screen.findByTestId('op-shortfall');
    expect(screen.getByTestId('op-cost-maxRent')).toHaveTextContent('25% of owned capacity');
    expect(screen.getByTestId('op-cost-placeholder-maxRent')).toHaveTextContent('Placeholder — the Warehouse to confirm');
    expect(screen.getByTestId('op-max-rented')).toHaveTextContent('450 pallets');
    const card = screen.getByTestId(`op-short-${sw.weekStart}`);
    expect(within(card).getByTestId(`op-short-pallets-${sw.weekStart}`)).toHaveTextContent(
      `${formatNumber(Math.round(sw.shortfallPallets * 10) / 10)} pallets short`,
    );
    expect(within(card).getByTestId(`op-short-unavoidable-${sw.weekStart}`)).toBeInTheDocument();
    expect(screen.getByTestId(`op-beyond-${sw.weekStart}`)).toHaveTextContent('beyond the limit');
    // Neither choice is made for the planner; choosing shows what to do next.
    const rent = within(card).getByTestId(`op-short-choose-rent-${sw.weekStart}`);
    const later = within(card).getByTestId(`op-short-choose-later-${sw.weekStart}`);
    expect([rent.getAttribute('aria-pressed'), later.getAttribute('aria-pressed')]).toEqual(['false', 'false']);
    fireEvent.click(rent);
    expect(rent).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).getByTestId(`op-short-next-rent-${sw.weekStart}`)).toHaveTextContent('Book');
    fireEvent.click(later);
    expect(later).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).queryByTestId(`op-short-next-rent-${sw.weekStart}`)).toBeNull();
    const next = within(card).getByTestId(`op-short-next-later-${sw.weekStart}`);
    for (const d of sw.later.deliveries) {
      expect(within(next).getByTestId(`op-short-delivery-${d.materialCode}-${d.source}-${d.weekStart}`)).toBeInTheDocument();
    }
    expect(within(next).getByRole('link', { name: 'Open Reschedule open orders' })).toHaveAttribute('href', expect.stringContaining('/buyer/reschedule'));
  });

  it('BR-04: every recommendation shows the constraint that bound it and its saving', async () => {
    const p = await plan();
    const recs = p.warehouses.find((w) => w.kind === 'packaging')!.materials.flatMap((m) => m.recommendations);
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    await screen.findByTestId('op-recs');
    for (const r of recs) {
      expect(screen.getByTestId(`op-rec-${r.materialCode}-${r.weekStart}`)).toBeInTheDocument();
      expect(screen.getByTestId(`op-binding-${r.materialCode}-${r.weekStart}`).textContent).not.toBe('');
    }
    const withSaving = recs.find((r) => r.savedIdr !== null && r.savedIdr > 0)!;
    expect(screen.getByTestId(`op-saved-${withSaving.materialCode}-${withSaving.weekStart}`).textContent).toMatch(/^Rp [\d.]+ less than/);
  });

  it('the raw-material warehouse is planned separately (ENG-D7): its own capacity, and no order needed on this data', async () => {
    const p = await plan();
    const rm = p.warehouses.find((w) => w.kind === 'rawMaterial')!;
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    fireEvent.click(await screen.findByRole('radio', { name: 'Raw material warehouse' }));
    expect(screen.getByTestId('op-capacity')).toHaveTextContent('SYN-WH-RM');
    expect(rm.after.orders).toBe(0);
    expect(screen.getByTestId('op-recs-empty')).toBeInTheDocument();
  });

  it('BR-05: “Create draft call-off” dispatches the existing draft verb on the supplier’s open line — a DRAFT in the store, nothing released', async () => {
    const p = await plan();
    const pos = await openPos();
    const today = sdcClock.now().slice(0, 10);
    const candidates = p.warehouses
      .flatMap((w) => w.materials.flatMap((m) => m.recommendations))
      .filter((r) => umbrellaLineFor(pos, r.supplierId, r.materialCode) !== null);
    expect(candidates.length).toBeGreaterThan(0);
    const r = candidates[0];
    const line = umbrellaLineFor(pos, r.supplierId, r.materialCode)!;
    const before = callOffStore.all().length;
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    fireEvent.click(await screen.findByTestId(`op-draft-${r.materialCode}-${r.weekStart}`));
    await waitFor(() => expect(callOffStore.all().length).toBe(before + 1));
    const made = callOffStore.all().find((c) => c.poLineId === line.line.id && c.quantity === r.quantity)!;
    expect(made.status).toBe('Draft');
    expect(made.needDate).toBe(draftNeedDate(r.weekStart, today));
    expect(made.releasedAt).toBeUndefined();
    // X-03 — the draft names the engine as its origin, so release refuses it while simulated.
    expect(made.origin).toBe('engine');
    expect(await screen.findByText('Draft created')).toBeInTheDocument();
  });

  it('X-03: beside “Create draft call-off” the page says such drafts cannot be released until the SAP feed is live — EN and ID', async () => {
    expect(isLive('engineDataset')).toBe(false);
    const p = await plan();
    const pos = await openPos();
    const r = p.warehouses
      .flatMap((w) => w.materials.flatMap((m) => m.recommendations))
      .find((x) => umbrellaLineFor(pos, x.supplierId, x.materialCode) !== null)!;
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const row = await screen.findByTestId(`op-rec-${r.materialCode}-${r.weekStart}`);
    expect(within(row).getByTestId(`op-draft-${r.materialCode}-${r.weekStart}`)).toBeInTheDocument();
    expect(within(row).getByTestId(`op-release-withheld-${r.materialCode}-${r.weekStart}`)).toHaveTextContent(
      'cannot be released to the supplier until the Master Data Management team’s SAP feed is live',
    );
    await i18n.changeLanguage('id');
    await waitFor(() =>
      expect(screen.getByTestId(`op-release-withheld-${r.materialCode}-${r.weekStart}`)).toHaveTextContent(
        'tidak dapat dirilis ke pemasok sampai data SAP dari tim Master Data Management tersedia',
      ),
    );
  });

  it('X-03: a seat that cannot draft sees no release note — the note belongs to the act', async () => {
    renderWithProviders(<BuyerOrderPlan />, { identity: { ...BUYER, businessRoles: ['finance'] }, route: '/buyer/order-plan' });
    await screen.findByTestId('op-recs');
    expect(screen.queryAllByTestId(/^op-release-withheld-/)).toEqual([]);
  });

  it('a recommendation with no open agreement for its supplier and material says “No PO” and offers no act', async () => {
    const p = await plan();
    const pos = await openPos();
    const blocked = p.warehouses
      .flatMap((w) => w.materials.flatMap((m) => m.recommendations))
      .find((r) => umbrellaLineFor(pos, r.supplierId, r.materialCode) === null)!;
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const row = await screen.findByTestId(`op-rec-${blocked.materialCode}-${blocked.weekStart}`);
    expect(within(row).getByText('No PO')).toBeInTheDocument();
    expect(within(row).queryByRole('button')).toBeNull();
  });

  it('a PTI seat without the planning lane sees who acts, not the draft control', async () => {
    renderWithProviders(<BuyerOrderPlan />, { identity: { ...BUYER, businessRoles: ['finance'] }, route: '/buyer/order-plan' });
    await screen.findByTestId('op-recs');
    expect(screen.queryByRole('button', { name: 'Create draft call-off' })).toBeNull();
    expect(screen.getAllByTestId('handoff-orderplan-draft').length).toBeGreaterThan(0);
  });

  it('X-03: a supplier scope gets nothing — simulated engine output is PTI’s only', async () => {
    expect(await mockDataService.procurement.getOrderPlan(supplierScope)).toBeNull();
  });

  it('BR-03 is live on the page: the run compares against last week’s plan, and says as of when', async () => {
    const p = await plan();
    expect(p.hasPreviousPlan).toBe(true);
    expect(p.previousAsOf).not.toBeNull();
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    expect(await screen.findByText(/weighed against last week’s plan/)).toBeInTheDocument();
  });

  it('F-07: the decision comes first — Recommended orders renders before the weekly fill, which is collapsed with the cost rates and How it works', async () => {
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const recs = await screen.findByTestId('op-recs');
    const fill = screen.getByTestId('op-fill');
    expect(recs.compareDocumentPosition(fill) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId('op-kpis').compareDocumentPosition(recs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((await screen.findByTestId('data-health-chip')).compareDocumentPosition(screen.getByTestId('op-kpis')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const id of ['op-fill', 'op-costs', 'op-definitions']) {
      const el = screen.getByTestId(id);
      expect(el.tagName).toBe('DETAILS');
      expect(el).not.toHaveAttribute('open');
      expect(recs.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // F-22 — the fill says it includes the recommended orders, and why Reschedule can read higher.
    expect(screen.getByTestId('op-fill-basis')).toHaveTextContent('Includes the recommended orders');
  });

  it('F-06 / F-02: the plan source and its date, the "Why these quantities" links, and the Data health chip', async () => {
    const run = (await mockDataService.procurement.getOrderPlan(buyerScope))!;
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const source = await screen.findByTestId('op-plan-source');
    expect(source).toHaveTextContent('Plan source: SAP finished-goods plan,');
    expect(within(source).getByText(formatDate(run.planMadeAt!))).toBeInTheDocument();
    expect(screen.getByTestId('op-why')).toHaveTextContent('Why these quantities:');
    expect(screen.getByTestId('op-why-requirement')).toHaveAttribute('href', '/buyer/material-requirement');
    expect(screen.getByTestId('op-why-safety')).toHaveAttribute('href', '/buyer/safety-stock');
    expect(await screen.findByTestId('data-health-chip-failing')).toHaveTextContent('failing');
  });

  it('renders in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    expect(await screen.findByRole('heading', { name: 'Rencana pesanan' })).toBeInTheDocument();
    expect(screen.getByTestId('op-cost-placeholder-rent')).toHaveTextContent('Sementara — menunggu konfirmasi Keuangan');
  });
});
