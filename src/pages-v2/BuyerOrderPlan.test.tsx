import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerOrderPlan from './BuyerOrderPlan';
import BuyerMaterialRequirement from './BuyerMaterialRequirement';
import BuyerSafetyStock from './BuyerSafetyStock';
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
    expect(await screen.findByRole('heading', { name: 'What to order' })).toBeInTheDocument();
    // FUX A4 (F-14): one simulated-data banner in place of the engine pill.
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent('Sample data. Nothing here reaches suppliers or SAP.');
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
    expect(within(next).getByRole('link', { name: 'Open Make warehouse room' })).toHaveAttribute('href', expect.stringContaining('/buyer/reschedule'));
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
    // No act: the row's only button is the read-only "Why this quantity" control (FUX2 B3).
    expect(within(row).getAllByRole('button').map((b) => b.getAttribute('data-testid'))).toEqual([
      `op-wq-open-${blocked.materialCode}-${blocked.weekStart}`,
    ]);
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

  it('F-06 / F-02: the plan source and its date, the links to the full pages behind each quantity, and the Data health chip', async () => {
    const run = (await mockDataService.procurement.getOrderPlan(buyerScope))!;
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const source = await screen.findByTestId('op-plan-source');
    expect(source).toHaveTextContent('Plan source: SAP finished-goods plan,');
    expect(within(source).getByText(formatDate(run.planMadeAt!))).toBeInTheDocument();
    expect(screen.getByTestId('op-why')).toHaveTextContent('Full pages behind each quantity:');
    expect(screen.getByTestId('op-why-requirement')).toHaveAttribute('href', '/buyer/material-requirement');
    expect(screen.getByTestId('op-why-safety')).toHaveAttribute('href', '/buyer/safety-stock');
    expect(await screen.findByTestId('data-health-chip-failing')).toHaveTextContent('failing');
  });

  it('renders in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    expect(await screen.findByRole('heading', { name: 'Apa yang dipesan' })).toBeInTheDocument();
    expect(screen.getByTestId('op-cost-placeholder-rent')).toHaveTextContent('Sementara — menunggu konfirmasi Keuangan');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUX2 B3 (F-07, F-17) — "Why this quantity": one recommended order explained
// in place, with the Material requirement and Safety stock figures for its
// material read from the same hooks the full pages read. Each figure is
// compared with what the FULL PAGE renders for that material, not restated.
// ─────────────────────────────────────────────────────────────────────────────

const firstRec = async () => {
  const pk = (await plan()).warehouses.find((w) => w.kind === 'packaging')!;
  const rows = pk.materials
    .flatMap((m) => m.recommendations.map((rec) => ({ rec, m })))
    .sort((a, b) => a.rec.weekStart.localeCompare(b.rec.weekStart) || a.rec.materialCode.localeCompare(b.rec.materialCode));
  expect(rows.length).toBeGreaterThan(0);
  return rows[0];
};

const pages = (
  <Routes>
    <Route path="/buyer/order-plan" element={<BuyerOrderPlan />} />
    <Route path="/buyer/material-requirement" element={<BuyerMaterialRequirement />} />
    <Route path="/buyer/safety-stock" element={<BuyerSafetyStock />} />
  </Routes>
);

const openWhy = async (code: string, week: string) => {
  const toggle = await screen.findByTestId(`op-wq-open-${code}-${week}`);
  expect(toggle.tagName).toBe('BUTTON');
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  const panel = await screen.findByTestId('op-wq-panel');
  return { toggle, panel };
};

// Each spec renders up to 3 engine pages; under a loaded runner that passes 5 s.
const PANEL_TIMEOUT = 30000;

describe('BuyerOrderPlan — "Why this quantity" panel (FUX2 B3)', () => {
  it('shows the same net requirement as Material requirement and the same safety stock as Safety stock targets for that material', async () => {
    const { rec, m } = await firstRec();
    const code = rec.materialCode;

    const mrq = renderWithProviders(<BuyerMaterialRequirement />, { identity: PLANNER, route: '/buyer/material-requirement' });
    const mrqNet = (await screen.findByTestId(`mrq-total-net-${code}`)).textContent!;
    fireEvent.click(screen.getByTestId(`mrq-row-${code}`));
    const mrqWeekNet = (await screen.findByTestId(`mrq-net-${rec.weekStart}`)).textContent!;
    const mrqSs = screen.getByTestId(`mrq-ss-${code}`).textContent!;
    mrq.unmount();
    const sst = renderWithProviders(<BuyerSafetyStock />, { identity: PLANNER, route: '/buyer/safety-stock' });
    const sstSs = (await screen.findByTestId(`sst-ss-${code}`)).textContent!;
    const sstRop = screen.getByTestId(`sst-rop-${code}`).textContent!;
    sst.unmount();

    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const { panel } = await openWhy(code, rec.weekStart);
    expect(within(panel).getByText(code)).toBeInTheDocument();
    expect(await within(panel).findByTestId('op-wq-net')).toHaveTextContent(`${mrqWeekNet} ${m.uom}`);
    expect(within(panel).getByTestId('op-wq-net-total')).toHaveTextContent(`${mrqNet} ${m.uom}`);
    expect(await within(panel).findByTestId('op-wq-ss')).toHaveTextContent(sstSs);
    expect(within(panel).getByTestId('op-wq-rop')).toHaveTextContent(sstRop);
    // The Material requirement page's safety stock column agrees with the Safety stock page for this material.
    expect(sstSs).toBe(`${mrqSs} ${m.uom}`);

    // The order sizing: MOQ, multiple, space and the quantity the row shows.
    expect(within(panel).getByTestId('op-wq-quantity')).toHaveTextContent(screen.getByTestId(`op-qty-${code}-${rec.weekStart}`).textContent!);
    expect(within(panel).getByTestId('op-wq-moq')).toHaveTextContent(`${formatNumber(m.moq)}`);
    expect(within(panel).getByTestId('op-wq-binding')).toHaveTextContent(screen.getByTestId(`op-binding-${code}-${rec.weekStart}`).textContent!);
    // Term tips at the point of use.
    expect(within(panel).getByTestId('term-tip-safety-stock')).toBeInTheDocument();
    expect(within(panel).getByTestId('term-tip-reorder-point')).toBeInTheDocument();
  }, PANEL_TIMEOUT);

  it('the requirement block shows the order’s week as the engine nets it, so the figures reconcile, and says the rule', async () => {
    const { rec, m } = await firstRec();
    const run = (await mockDataService.procurement.getMaterialRequirement(buyerScope, false))!;
    const wk = run.materials.find((x) => x.materialCode === rec.materialCode)!.weeks.find((w) => w.weekStart === rec.weekStart)!;
    // The engine's rule (requirement.ts netMaterial): net = max(0, gross + SS − (stock at start + receipts)).
    expect(wk.net).toBeCloseTo(Math.max(0, wk.gross + wk.safetyStock - (wk.projectedStart + wk.receipts)), 6);
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const { panel } = await openWhy(rec.materialCode, rec.weekStart);
    const q = (x: number) => `${formatNumber(m.uom === 'PCS' ? Math.round(x) : Math.round(x * 10) / 10)} ${m.uom}`;
    expect(await within(panel).findByTestId('op-wq-gross')).toHaveTextContent(q(wk.gross));
    expect(within(panel).getByTestId('op-wq-req-safety')).toHaveTextContent(q(wk.safetyStock));
    expect(within(panel).getByTestId('op-wq-stock')).toHaveTextContent(q(wk.projectedStart));
    expect(within(panel).getByTestId('op-wq-confirmed')).toHaveTextContent(q(wk.receipts));
    expect(within(panel).getByTestId('op-wq-net')).toHaveTextContent(q(wk.net));
    expect(within(panel).getByTestId('op-wq-rule')).toHaveTextContent(
      'Worked out week by week, and never below zero. Stock at start of week already includes the orders planned for earlier weeks',
    );
  }, PANEL_TIMEOUT);

  it('the panel’s links reach the 2 full pages', async () => {
    const { rec } = await firstRec();
    const first = renderWithProviders(pages, { identity: PLANNER, route: '/buyer/order-plan' });
    let { panel } = await openWhy(rec.materialCode, rec.weekStart);
    fireEvent.click(await within(panel).findByTestId('op-wq-link-requirement'));
    expect(await screen.findByRole('heading', { name: 'Material requirement' })).toBeInTheDocument();
    first.unmount();

    renderWithProviders(pages, { identity: PLANNER, route: '/buyer/order-plan' });
    ({ panel } = await openWhy(rec.materialCode, rec.weekStart));
    fireEvent.click(within(panel).getByTestId('op-wq-link-safety'));
    expect(await screen.findByRole('heading', { name: 'Safety stock targets' })).toBeInTheDocument();
  }, PANEL_TIMEOUT);

  it('opens and closes by keyboard: focus moves into the panel, Escape closes it and returns focus to its control', async () => {
    const { rec } = await firstRec();
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    // A native <button>: Enter and Space activate it as a click.
    const { toggle, panel } = await openWhy(rec.materialCode, rec.weekStart);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', panel.id);
    expect(document.activeElement).toBe(within(panel).getByRole('heading', { level: 3 }));

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByTestId('op-wq-panel')).toBeNull();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(document.activeElement).toBe(toggle));

    // The Close button closes it too, and the control toggles it shut.
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByTestId('op-wq-close'));
    expect(screen.queryByTestId('op-wq-panel')).toBeNull();
    fireEvent.click(toggle);
    expect(await screen.findByTestId('op-wq-panel')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTestId('op-wq-panel')).toBeNull();
  }, PANEL_TIMEOUT);

  it('renders in Indonesian', async () => {
    const { rec } = await firstRec();
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const toggle = await screen.findByTestId(`op-wq-open-${rec.materialCode}-${rec.weekStart}`);
    expect(toggle).toHaveTextContent('Mengapa kuantitas ini');
    fireEvent.click(toggle);
    const panel = await screen.findByTestId('op-wq-panel');
    expect(await within(panel).findByTestId('op-wq-rule')).toHaveTextContent('Dihitung minggu per minggu, dan tidak pernah di bawah nol.');
    expect(within(panel).getByTestId('op-wq-link-safety')).toHaveTextContent('Buka Target stok pengaman');
    expect(screen.getByTestId('op-why')).toHaveTextContent('Halaman lengkap di balik setiap kuantitas:');
  }, PANEL_TIMEOUT);
});
