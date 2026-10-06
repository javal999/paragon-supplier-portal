import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerReschedule from './BuyerReschedule';
import { mockDataService } from '@services/data/mock/mockDataService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { sapChangeMarkStore } from '@services/data/mock/stores/sapChangeMarkStore';
import { warehouseDecisionStore } from '@services/data/mock/stores/warehouseDecisionStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { currentPlanVersion, currentVersion } from '@services/data/mock/forecastReadModel';
import { formatDate } from '@lib/format';
import { isLive } from '@services/liveness';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { planChangeAfter, selectionEffect } from '@services/engine/reschedule';
import i18n from '@lib/i18n';
/** @import { QueryScope } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-13 — the planner's Reschedule open orders page. Every figure is read
// back from the service for the same scope, never restated; the selection
// figures are recomputed with the engine's own `selectionEffect` (AC-03).
// ─────────────────────────────────────────────────────────────────────────────

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  callOffStore.reset();
  sapChangeMarkStore.reset();
  warehouseDecisionStore.reset();
  forecastVersionStore.reset();
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

const report = async () =>
  /** @type {import('@services/data/types').RescheduleView} */ (
    await mockDataService.procurement.getReschedule(buyerScope)
  );
/** @param {number} x */
const pct = (x) => `${Math.round(x * 100)}%`;

describe('BuyerReschedule — the planner page (REQ-E14-13)', () => {
  it('renders inside the app shell with the SIMULATED engine pill — never Live — and says nothing here reaches a supplier yet', async () => {
    expect(isLive('engineDataset')).toBe(false);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(await screen.findByRole('heading', { name: 'Make warehouse room' })).toBeInTheDocument();
    // FUX A4 (F-14): one simulated-data banner in place of the engine pill.
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Sample data. Nothing here reaches suppliers or SAP.'
    );
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByTestId('rs-withheld-note')).toHaveTextContent(
      'Master Data Management team’s SAP feed is live'
    );
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('ENG-D15 and the cost rates in use: the threshold (1 week, decided) beside the placeholder rent and penalty', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(await screen.findByTestId('rs-setting-threshold')).toHaveTextContent('1 week');
    expect(screen.getByTestId('rs-setting-threshold')).toHaveTextContent('Decided by the owner');
    expect(screen.getByTestId('rs-setting-rent')).toHaveTextContent('Rp 35.000');
    expect(screen.getByTestId('rs-setting-rent')).toHaveTextContent(
      'Placeholder — Finance to confirm'
    );
    expect(screen.getByTestId('rs-setting-penalty')).toHaveTextContent('Rp 150.000');
  });

  it('AC-01: every relief proposal shows its type, now and proposed, freed pallet-weeks, saving, change cost and zone — the service’s own figures, in rank order', async () => {
    const r = await report();
    const pk = /** @type {import('@services/data/types').WarehouseRescheduleView} */ (
      r.warehouses.find((w) => w.kind === 'packaging')
    );
    const relief = pk.proposals.filter((p) => p.rank !== null);
    expect(relief.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const section = await screen.findByTestId('rs-relief');
    const rows = within(section).getAllByTestId(/^rs-relief-/);
    expect(rows.map((row) => row.getAttribute('data-testid'))).toEqual(
      relief.map((p) => `rs-relief-${p.id}`)
    );
    for (const p of relief.slice(0, 5)) {
      expect(screen.getByTestId(`rs-freed-${p.id}`)).toHaveTextContent(
        `${Math.round(p.overCapacityPalletWeeksFreed).toLocaleString('id-ID')} pallet-weeks`
      );
      expect(screen.getByTestId(`rs-saving-${p.id}`).textContent).toMatch(/^Rp /);
      expect(screen.getByTestId(`rs-penalty-${p.id}`).textContent).toMatch(/^Rp /);
      expect(screen.getByTestId(`rs-zone-${p.id}`).textContent).not.toBe('');
    }
    expect(screen.getByTestId('rs-kpi-relief')).toHaveTextContent(
      Math.round(pk.totals.reliefPalletWeeks).toLocaleString('en-US')
    );
    expect(screen.getByTestId('rs-kpi-onhand')).toHaveTextContent(
      Math.round(pk.totals.onHandOverPalletWeeks).toLocaleString('id-ID')
    );
  });

  it('AC-03 / BR-09: selecting the proposals without supplier agreement moves the fill and the guard to the engine’s own recomputation', async () => {
    const r = await report();
    const pk = /** @type {import('@services/data/types').WarehouseRescheduleView} */ (
      r.warehouses.find((w) => w.kind === 'packaging')
    );
    const free = pk.proposals.filter((p) => p.rank !== null && !p.needsSupplierAgreement);
    expect(free.length).toBeGreaterThan(0);
    const ids = new Set(free.map((p) => p.id));
    const eff = selectionEffect(pk, ids, r.costs);
    const after = planChangeAfter(r.planChange, pk.proposals, ids);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    fireEvent.click(await screen.findByTestId('rs-select-free'));
    await waitFor(() =>
      expect(screen.getByTestId('rs-guard-selected')).toHaveTextContent(String(free.length))
    );
    for (const [i, wk] of pk.weeks.entries()) {
      expect(screen.getByTestId(`rs-fill-selected-${wk.weekStart}`)).toHaveTextContent(
        pct(eff.fill[i])
      );
      expect(screen.getByTestId(`rs-fill-now-${wk.weekStart}`)).toHaveTextContent(pct(wk.fill));
    }
    expect(screen.getByTestId('rs-selection-freed')).toHaveTextContent(
      `${Math.round(eff.freedOverPalletWeeks).toLocaleString('id-ID')} pallet-weeks`
    );
    // None of these is inside the lead time, so the share does not move.
    expect(eff.insideLeadTime).toBe(0);
    expect(after.share).toBe(r.planChange.share);
    expect(screen.getByTestId('rs-guard-after').textContent).toBe(
      screen.getByTestId('rs-guard-before').textContent
    );
  });

  it('BR-09: ticking a proposal inside the lead time moves PTI’s plan-change share by the engine’s own count', async () => {
    const r = await report();
    const pk = /** @type {import('@services/data/types').WarehouseRescheduleView} */ (
      r.warehouses.find((w) => w.kind === 'packaging')
    );
    const inside = /** @type {import('@services/data/types').RescheduleProposalView} */ (
      pk.proposals.find((p) => p.rank !== null && p.addsToPlanChange)
    );
    const after = planChangeAfter(r.planChange, pk.proposals, new Set([inside.id]));
    expect(after.changedInsideLeadTime).toBe(r.planChange.changedInsideLeadTime + 1);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const rowBox = await screen.findByTestId(`rs-select-${inside.id}`);
    // A11y finding 15: the 13 px checkbox is unchanged; its label carries the
    // 44 px coarse-pointer tap area (src/index.css), and clicking still toggles.
    expect(rowBox.closest('label')).toHaveClass('touch-target');
    fireEvent.click(rowBox);
    expect(rowBox).toBeChecked();
    await waitFor(() =>
      expect(screen.getByTestId('rs-guard-after')).toHaveTextContent(
        `${Math.round(/** @type {NonNullable<typeof after.share>} */ (after.share) * 1000) / 10}`
      )
    );
    expect(
      within(screen.getByTestId(`rs-relief-${inside.id}`)).getByText('Needs supplier agreement')
    ).toBeInTheDocument();
  });

  it('X-03: a call-off proposal offers no send while the data is simulated — the reason stands in its place, EN and ID', async () => {
    const r = await report();
    const co = /** @type {import('@services/data/types').RescheduleProposalView} */ (
      r.warehouses
        .flatMap((w) => w.proposals)
        .find((p) => p.rank !== null && p.line.kind === 'callOff' && p.type !== 'cancel')
    );
    expect(co).toBeDefined();
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const row = await screen.findByTestId(`rs-relief-${co.id}`);
    expect(within(row).queryByTestId(`rs-send-${co.id}`)).toBeNull();
    // The act is shown switched off, with a one-word reason; the full reason sits once above the table.
    expect(within(row).getByTestId(`rs-send-off-${co.id}`)).toBeDisabled();
    expect(within(row).getByTestId(`rs-withheld-${co.id}`)).toHaveTextContent('Off on sample data');
    expect(screen.getByTestId('rs-actions-withheld')).toHaveTextContent(
      'Master Data Management team’s SAP feed is live'
    );
    await i18n.changeLanguage('id');
    await waitFor(() =>
      expect(screen.getByTestId(`rs-withheld-${co.id}`)).toHaveTextContent(
        'Nonaktif pada data contoh'
      )
    );
    expect(screen.getByTestId('rs-actions-withheld')).toHaveTextContent(
      'data SAP dari tim Master Data Management tersedia'
    );
  });

  it('X-03: a PO-line proposal says it is changed in SAP, and cannot be marked taken to SAP while simulated', async () => {
    const r = await report();
    const po = /** @type {import('@services/data/types').RescheduleProposalView} */ (
      r.warehouses
        .flatMap((w) => w.proposals)
        .find((p) => p.rank !== null && p.line.kind === 'poLine')
    );
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const row = await screen.findByTestId(`rs-relief-${po.id}`);
    expect(
      within(row).getByText('Change this order in SAP, then mark it here.')
    ).toBeInTheDocument();
    expect(within(row).queryByTestId(`rs-mark-${po.id}`)).toBeNull();
    expect(within(row).getByTestId(`rs-mark-off-${po.id}`)).toBeDisabled();
    expect(within(row).getByTestId(`rs-mark-off-${po.id}`)).toHaveTextContent(
      'Mark as taken to SAP'
    );
    expect(within(row).getByTestId(`rs-withheld-${po.id}`)).toHaveTextContent('Off on sample data');
  });

  it('says what ticking a proposal does: it shows the effect and sends nothing, EN and ID', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(await screen.findByTestId('rs-select-hint')).toHaveTextContent('Ticking sends nothing.');
    await i18n.changeLanguage('id');
    await waitFor(() =>
      expect(screen.getByTestId('rs-select-hint')).toHaveTextContent(
        'Mencentang tidak mengirim apa pun.'
      )
    );
  });

  it('a PTI seat without the planning lane sees who acts, not the act', async () => {
    renderWithProviders(<BuyerReschedule />, {
      identity: { ...BUYER, businessRoles: ['finance'] },
      route: '/buyer/reschedule'
    });
    await screen.findByTestId('rs-relief');
    expect(screen.queryAllByTestId(/^rs-withheld-(po|co):/)).toEqual([]);
    expect(screen.queryAllByTestId(/^rs-(mark|send)-off-/)).toEqual([]);
    expect(screen.getAllByTestId('handoff-reschedule-sap').length).toBeGreaterThan(0);
  });

  it('the raw-material warehouse: its overload is stock on hand — the page says no open order can relieve those weeks', async () => {
    const r = await report();
    const rm = /** @type {import('@services/data/types').WarehouseRescheduleView} */ (
      r.warehouses.find((w) => w.kind === 'rawMaterial')
    );
    const weeks = rm.weeks.filter((w) => w.onHandOverPallets > 0);
    expect(weeks.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    fireEvent.click(await screen.findByRole('radio', { name: 'Raw material warehouse' }));
    expect(screen.getByTestId('rs-capacity')).toHaveTextContent('SYN-WH-RM');
    expect(screen.getByTestId('rs-onhand-note')).toHaveTextContent(`In ${weeks.length} weeks`);
    expect(screen.getByTestId('rs-onhand-note')).toHaveTextContent(
      'No open order can relieve them'
    );
    expect(
      within(screen.getByTestId(`rs-week-${weeks[0].weekStart}`)).getByText(
        'Cannot be relieved by open orders'
      )
    ).toBeInTheDocument();
  });

  it('call-offs that cannot be changed are shown for information, with why', async () => {
    const r = await report();
    const info = /** @type {import('@services/data/types').WarehouseRescheduleView} */ (
      r.warehouses.find((w) => w.kind === 'packaging')
    ).info;
    const dispatched = /** @type {import('@services/data/types').RescheduleInfoView} */ (
      info.find((i) => i.reason === 'dispatched')
    );
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(await screen.findByTestId(`rs-info-${dispatched.line.id}`)).toHaveTextContent(
      'already dispatched'
    );
  });

  it('F-07: the proposals come first — the relief table renders before the context sections, which are collapsed', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const relief = await screen.findByTestId('rs-relief');
    expect(
      screen.getByTestId('rs-kpis').compareDocumentPosition(relief) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    // The supplier stability guard sits between the summary and the proposals, so its effect is visible while selecting.
    const guard = screen.getByTestId('rs-guard');
    expect(guard.tagName).toBe('SECTION');
    expect(
      screen.getByTestId('rs-kpis').compareDocumentPosition(guard) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(guard.compareDocumentPosition(relief) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      (await screen.findByTestId('data-health-chip')).compareDocumentPosition(
        screen.getByTestId('rs-kpis')
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    for (const id of ['rs-fill', 'rs-info', 'rs-settings', 'rs-definitions']) {
      const el = screen.getByTestId(id);
      expect(el.tagName).toBe('DETAILS');
      expect(el).not.toHaveAttribute('open');
      expect(relief.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // F-22 — "Now" says it is the Order plan's fill plus released call-offs.
    expect(screen.getByTestId('rs-fill-basis')).toHaveTextContent(
      'recommended orders included, plus released call-offs'
    );
    expect(await screen.findByTestId('data-health-chip-failing')).toHaveTextContent('failing');
  });

  it('renders in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(
      await screen.findByRole('heading', { name: 'Kosongkan ruang gudang' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('rs-setting-rent')).toHaveTextContent(
      'Sementara — menunggu konfirmasi Keuangan'
    );
  });
});

describe('BuyerReschedule — the warehouse-week decision (FUX-D3, F-10)', () => {
  const orderPlan = async () =>
    /** @type {import('@services/data/types').OrderPlanView} */ (
      await mockDataService.procurement.getOrderPlan(buyerScope)
    );
  const firstWeek = async () =>
    /** @type {import('@services/data/types').WarehousePlanView} */ (
      (await orderPlan()).warehouses.find((w) => w.kind === 'packaging')
    ).shortfallWeeks[0];

  it('the weeks that do not fit sit above the proposals, each with its shortfall and the four ways; the page says the decision changes no order', async () => {
    const pk = /** @type {import('@services/data/types').WarehousePlanView} */ (
      (await orderPlan()).warehouses.find((w) => w.kind === 'packaging')
    );
    expect(pk.shortfallWeeks.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const card = await screen.findByTestId('rs-decide');
    expect(
      card.compareDocumentPosition(screen.getByTestId('rs-relief')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByTestId('rs-decide-intent')).toHaveTextContent(
      'It changes no order and is never sent to SAP or a supplier'
    );
    // F-22 — the card says its weeks come from the What to order projection.
    expect(screen.getByTestId('rs-decide-basis')).toHaveTextContent('What to order projection');
    for (const sw of pk.shortfallWeeks) {
      const week = within(card).getByTestId(`rs-decide-week-${sw.weekStart}`);
      expect(within(week).getByTestId(`rs-decide-none-${sw.weekStart}`)).toHaveTextContent(
        'No decision yet.'
      );
      for (const c of ['rent', 'pushOut', 'reduce', 'accept']) {
        expect(within(week).getByTestId(`rs-decide-choose-${c}-${sw.weekStart}`)).toHaveAttribute(
          'aria-pressed',
          'false'
        );
      }
    }
  });

  it('recording a choice appends a record and shows it in force; a second choice replaces it on screen while the first stays in the ledger', async () => {
    const sw = await firstWeek();
    const version = /** @type {NonNullable<ReturnType<typeof currentPlanVersion>>} */ (
      currentPlanVersion('packaging')
    );
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const week = await screen.findByTestId(`rs-decide-week-${sw.weekStart}`);
    fireEvent.click(within(week).getByTestId(`rs-decide-choose-rent-${sw.weekStart}`));
    fireEvent.click(within(week).getByTestId(`rs-decide-save-${sw.weekStart}`));
    await waitFor(() => expect(warehouseDecisionStore.all()).toHaveLength(1));
    const [first] = warehouseDecisionStore.all();
    expect(first).toMatchObject({
      stream: 'packaging',
      weekStart: sw.weekStart,
      choice: 'rent',
      planVersion: version
    });
    expect(await within(week).findByTestId(`rs-decide-inforce-${sw.weekStart}`)).toHaveTextContent(
      `Decided: rent space, ${formatDate(first.recordedAt)}, against version ${version}`
    );
    expect(within(week).queryByTestId(`rs-decide-older-${sw.weekStart}`)).toBeNull();

    fireEvent.click(within(week).getByTestId(`rs-decide-choose-pushOut-${sw.weekStart}`));
    fireEvent.click(within(week).getByTestId(`rs-decide-save-${sw.weekStart}`));
    await waitFor(() => expect(warehouseDecisionStore.all()).toHaveLength(2));
    await waitFor(() =>
      expect(within(week).getByTestId(`rs-decide-inforce-${sw.weekStart}`)).toHaveTextContent(
        'Decided: push out orders'
      )
    );
    expect(within(week).getByTestId(`rs-decide-inforce-${sw.weekStart}`)).toHaveTextContent(
      '1 earlier decision kept on record'
    );
    expect(warehouseDecisionStore.all().map((r) => r.choice)).toEqual(['rent', 'pushOut']);
  });

  it('"accept" needs a note: the page pre-checks with the verb’s rule and saves once the note is given', async () => {
    const sw = await firstWeek();
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const week = await screen.findByTestId(`rs-decide-week-${sw.weekStart}`);
    fireEvent.click(within(week).getByTestId(`rs-decide-choose-accept-${sw.weekStart}`));
    expect(within(week).getByTestId(`rs-decide-refusal-${sw.weekStart}`)).toHaveTextContent(
      'Add a note to accept the overflow.'
    );
    expect(within(week).getByTestId(`rs-decide-save-${sw.weekStart}`)).toBeDisabled();
    fireEvent.change(within(week).getByTestId(`rs-decide-note-${sw.weekStart}`), {
      target: { value: 'Agreed with the warehouse lead' }
    });
    expect(within(week).queryByTestId(`rs-decide-refusal-${sw.weekStart}`)).toBeNull();
    fireEvent.click(within(week).getByTestId(`rs-decide-save-${sw.weekStart}`));
    await waitFor(() => expect(warehouseDecisionStore.all()).toHaveLength(1));
    expect(warehouseDecisionStore.all()[0]).toMatchObject({
      choice: 'accept',
      note: 'Agreed with the warehouse lead'
    });
    expect(await within(week).findByTestId(`rs-decide-inforce-${sw.weekStart}`)).toHaveTextContent(
      'Agreed with the warehouse lead'
    );
  });

  it('a decision made against an older plan version shows the review marker', async () => {
    const sw = await firstWeek();
    const before = /** @type {NonNullable<ReturnType<typeof currentPlanVersion>>} */ (
      currentPlanVersion('packaging')
    );
    const cmd = (await import('@services/data/mock/MockCommandService')).MockCommandService;
    const res = await new cmd().dispatch(
      { personaType: 'buyer', supplierId: null, businessRoles: ['planning'] },
      {
        transitionId: 't_warehousedecision_record',
        entity: 'warehouseDecision',
        entityId: `packaging|${sw.weekStart}`,
        payload: { choice: 'reduce' }
      }
    );
    expect(res.status, res.reason).toBe('done');
    forecastVersionStore.add({
      .../** @type {import('@services/sdc/types').ForecastPublication} */ (
        currentVersion('packaging')
      ),
      publicationId: 'fv-probe-newer',
      version: before + 1,
      publishedAt: '2026-10-06T00:00:00.000Z'
    });
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const week = await screen.findByTestId(`rs-decide-week-${sw.weekStart}`);
    expect(within(week).getByTestId(`rs-decide-inforce-${sw.weekStart}`)).toHaveTextContent(
      `against version ${before}`
    );
    expect(within(week).getByTestId(`rs-decide-older-${sw.weekStart}`)).toHaveTextContent(
      'Made on an older plan: review'
    );
  });

  it('a seat without the atom sees the handoff notice and the saved decision, not the control', async () => {
    const sw = await firstWeek();
    renderWithProviders(<BuyerReschedule />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: '/buyer/reschedule'
    });
    const card = await screen.findByTestId('rs-decide');
    expect(within(card).getByTestId('handoff-reschedule-decision')).toBeInTheDocument();
    expect(within(card).getByTestId(`rs-decide-none-${sw.weekStart}`)).toBeInTheDocument();
    expect(within(card).queryByTestId(`rs-decide-choose-rent-${sw.weekStart}`)).toBeNull();
    expect(within(card).queryByTestId(`rs-decide-save-${sw.weekStart}`)).toBeNull();
  });

  it('the planner seat sees no handoff notice for the decision', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    await screen.findByTestId('rs-decide');
    expect(screen.queryByTestId('handoff-reschedule-decision')).toBeNull();
  });

  it('renders in Indonesian', async () => {
    const sw = await firstWeek();
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    expect(
      await screen.findByRole('heading', {
        name: 'Minggu yang tidak muat, meski dengan ruang sewa terbanyak'
      })
    ).toBeInTheDocument();
    expect(screen.getByTestId(`rs-decide-choose-accept-${sw.weekStart}`)).toHaveTextContent(
      'Terima kelebihan'
    );
    expect(screen.getByTestId('rs-decide-intent')).toHaveTextContent(
      'tidak pernah dikirim ke SAP atau pemasok'
    );
  });
});
