import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../test/test-utils';
import BuyerReschedule from './BuyerReschedule';
import { mockDataService } from '../services/data/mock/mockDataService';
import { callOffStore } from '../services/data/mock/stores/callOffStore';
import { sapChangeMarkStore } from '../services/data/mock/stores/sapChangeMarkStore';
import { isLive } from '../services/liveness';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import { planChangeAfter, selectionEffect } from '../services/engine/reschedule';
import i18n from '../lib/i18n';
import type { QueryScope } from '../services/data/types';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-13 — the planner's Reschedule open orders page. Every figure is read
// back from the service for the same scope, never restated; the selection
// figures are recomputed with the engine's own `selectionEffect` (AC-03).
// ─────────────────────────────────────────────────────────────────────────────

const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  callOffStore.reset();
  sapChangeMarkStore.reset();
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

const report = async () => (await mockDataService.procurement.getReschedule(buyerScope))!;
const pct = (x: number) => `${Math.round(x * 100)}%`;

describe('BuyerReschedule — the planner page (REQ-E14-13)', () => {
  it('renders inside the app shell with the SIMULATED engine pill — never Live — and says nothing here reaches a supplier yet', async () => {
    expect(isLive('engineDataset')).toBe(false);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(await screen.findByRole('heading', { name: 'Reschedule open orders' })).toBeInTheDocument();
    expect(screen.getByText('Synthetic data · awaiting the MDM SAP feed')).toBeInTheDocument();
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByTestId('rs-withheld-note')).toHaveTextContent('Master Data Management team’s SAP feed is live');
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('ENG-D15 and the cost rates in use: the threshold (1 week, decided) beside the placeholder rent and penalty', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(await screen.findByTestId('rs-setting-threshold')).toHaveTextContent('1 week');
    expect(screen.getByTestId('rs-setting-threshold')).toHaveTextContent('Decided by the owner (ENG-D15)');
    expect(screen.getByTestId('rs-setting-rent')).toHaveTextContent('Rp 35.000');
    expect(screen.getByTestId('rs-setting-rent')).toHaveTextContent('Placeholder — Finance to confirm');
    expect(screen.getByTestId('rs-setting-penalty')).toHaveTextContent('Rp 150.000');
  });

  it('AC-01: every relief proposal shows its type, now and proposed, freed pallet-weeks, saving, change cost and zone — the service’s own figures, in rank order', async () => {
    const r = await report();
    const pk = r.warehouses.find((w) => w.kind === 'packaging')!;
    const relief = pk.proposals.filter((p) => p.rank !== null);
    expect(relief.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const section = await screen.findByTestId('rs-relief');
    const rows = within(section).getAllByTestId(/^rs-relief-/);
    expect(rows.map((row) => row.getAttribute('data-testid'))).toEqual(relief.map((p) => `rs-relief-${p.id}`));
    for (const p of relief.slice(0, 5)) {
      expect(screen.getByTestId(`rs-freed-${p.id}`)).toHaveTextContent(`${Math.round(p.overCapacityPalletWeeksFreed).toLocaleString('id-ID')} pallet-weeks`);
      expect(screen.getByTestId(`rs-saving-${p.id}`).textContent).toMatch(/^Rp /);
      expect(screen.getByTestId(`rs-penalty-${p.id}`).textContent).toMatch(/^Rp /);
      expect(screen.getByTestId(`rs-zone-${p.id}`).textContent).not.toBe('');
    }
    expect(screen.getByTestId('rs-kpi-relief')).toHaveTextContent(Math.round(pk.totals.reliefPalletWeeks).toLocaleString('en-US'));
    expect(screen.getByTestId('rs-kpi-onhand')).toHaveTextContent(Math.round(pk.totals.onHandOverPalletWeeks).toLocaleString('id-ID'));
  });

  it('AC-03 / BR-09: selecting the proposals without supplier agreement moves the fill and the guard to the engine’s own recomputation', async () => {
    const r = await report();
    const pk = r.warehouses.find((w) => w.kind === 'packaging')!;
    const free = pk.proposals.filter((p) => p.rank !== null && !p.needsSupplierAgreement);
    expect(free.length).toBeGreaterThan(0);
    const ids = new Set(free.map((p) => p.id));
    const eff = selectionEffect(pk, ids, r.costs);
    const after = planChangeAfter(r.planChange, pk.proposals, ids);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    fireEvent.click(await screen.findByTestId('rs-select-free'));
    await waitFor(() => expect(screen.getByTestId('rs-guard-selected')).toHaveTextContent(String(free.length)));
    for (const [i, wk] of pk.weeks.entries()) {
      expect(screen.getByTestId(`rs-fill-selected-${wk.weekStart}`)).toHaveTextContent(pct(eff.fill[i]));
      expect(screen.getByTestId(`rs-fill-now-${wk.weekStart}`)).toHaveTextContent(pct(wk.fill));
    }
    expect(screen.getByTestId('rs-selection-freed')).toHaveTextContent(`${Math.round(eff.freedOverPalletWeeks).toLocaleString('id-ID')} pallet-weeks`);
    // None of these is inside the lead time, so the share does not move.
    expect(eff.insideLeadTime).toBe(0);
    expect(after.share).toBe(r.planChange.share);
    expect(screen.getByTestId('rs-guard-after').textContent).toBe(screen.getByTestId('rs-guard-before').textContent);
  });

  it('BR-09: ticking a proposal inside the lead time moves PTI’s plan-change share by the engine’s own count', async () => {
    const r = await report();
    const pk = r.warehouses.find((w) => w.kind === 'packaging')!;
    const inside = pk.proposals.find((p) => p.rank !== null && p.addsToPlanChange)!;
    const after = planChangeAfter(r.planChange, pk.proposals, new Set([inside.id]));
    expect(after.changedInsideLeadTime).toBe(r.planChange.changedInsideLeadTime + 1);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    fireEvent.click(await screen.findByTestId(`rs-select-${inside.id}`));
    await waitFor(() =>
      expect(screen.getByTestId('rs-guard-after')).toHaveTextContent(`${Math.round(after.share! * 1000) / 10}`),
    );
    expect(within(screen.getByTestId(`rs-relief-${inside.id}`)).getByText('Needs supplier agreement')).toBeInTheDocument();
  });

  it('X-03: a call-off proposal offers no send while the data is simulated — the reason stands in its place, EN and ID', async () => {
    const r = await report();
    const co = r.warehouses.flatMap((w) => w.proposals).find((p) => p.rank !== null && p.line.kind === 'callOff' && p.type !== 'cancel')!;
    expect(co).toBeDefined();
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const row = await screen.findByTestId(`rs-relief-${co.id}`);
    expect(within(row).queryByTestId(`rs-send-${co.id}`)).toBeNull();
    expect(within(row).getByTestId(`rs-withheld-${co.id}`)).toHaveTextContent('Cannot be sent to the supplier until the Master Data Management team’s SAP feed is live');
    await i18n.changeLanguage('id');
    await waitFor(() =>
      expect(screen.getByTestId(`rs-withheld-${co.id}`)).toHaveTextContent('Tidak dapat dikirim ke pemasok sampai data SAP dari tim Master Data Management tersedia'),
    );
  });

  it('X-03: a PO-line proposal says it is changed in SAP, and cannot be marked taken to SAP while simulated', async () => {
    const r = await report();
    const po = r.warehouses.flatMap((w) => w.proposals).find((p) => p.rank !== null && p.line.kind === 'poLine')!;
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const row = await screen.findByTestId(`rs-relief-${po.id}`);
    expect(within(row).getByText('Changed in SAP by the Material Planner')).toBeInTheDocument();
    expect(within(row).queryByTestId(`rs-mark-${po.id}`)).toBeNull();
    expect(within(row).getByTestId(`rs-withheld-${po.id}`)).toHaveTextContent('Cannot be taken to SAP');
  });

  it('a PTI seat without the planning lane sees who acts, not the act', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: { ...BUYER, businessRoles: ['finance'] }, route: '/buyer/reschedule' });
    await screen.findByTestId('rs-relief');
    expect(screen.queryAllByTestId(/^rs-withheld-(po|co):/)).toEqual([]);
    expect(screen.getAllByTestId('handoff-reschedule-sap').length).toBeGreaterThan(0);
  });

  it('the raw-material warehouse: its overload is stock on hand — the page says no open order can relieve those weeks', async () => {
    const r = await report();
    const rm = r.warehouses.find((w) => w.kind === 'rawMaterial')!;
    const weeks = rm.weeks.filter((w) => w.onHandOverPallets > 0);
    expect(weeks.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    fireEvent.click(await screen.findByRole('radio', { name: 'Raw material warehouse' }));
    expect(screen.getByTestId('rs-capacity')).toHaveTextContent('SYN-WH-RM');
    expect(screen.getByTestId('rs-onhand-note')).toHaveTextContent(`In ${weeks.length} weeks`);
    expect(screen.getByTestId('rs-onhand-note')).toHaveTextContent('No open order can relieve them');
    expect(within(screen.getByTestId(`rs-week-${weeks[0].weekStart}`)).getByText('Cannot be relieved by open orders')).toBeInTheDocument();
  });

  it('call-offs that cannot be changed are shown for information, with why', async () => {
    const r = await report();
    const info = r.warehouses.find((w) => w.kind === 'packaging')!.info;
    const dispatched = info.find((i) => i.reason === 'dispatched')!;
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(await screen.findByTestId(`rs-info-${dispatched.line.id}`)).toHaveTextContent('already dispatched');
  });

  it('F-07: the proposals come first — the relief table renders before the context sections, which are collapsed', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const relief = await screen.findByTestId('rs-relief');
    expect(screen.getByTestId('rs-kpis').compareDocumentPosition(relief) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((await screen.findByTestId('data-health-chip')).compareDocumentPosition(screen.getByTestId('rs-kpis')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const id of ['rs-fill', 'rs-info', 'rs-settings', 'rs-definitions']) {
      const el = screen.getByTestId(id);
      expect(el.tagName).toBe('DETAILS');
      expect(el).not.toHaveAttribute('open');
      expect(relief.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // F-22 — "Now" says it is the Order plan's fill plus released call-offs.
    expect(screen.getByTestId('rs-fill-basis')).toHaveTextContent('recommended orders included, plus released call-offs');
    expect(await screen.findByTestId('data-health-chip-failing')).toHaveTextContent('failing');
  });

  it('renders in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(await screen.findByRole('heading', { name: 'Jadwal ulang pesanan terbuka' })).toBeInTheDocument();
    expect(screen.getByTestId('rs-setting-rent')).toHaveTextContent('Sementara — menunggu konfirmasi Keuangan');
  });
});
