// ─────────────────────────────────────────────────────────────────────────────
// CAP-12 (BL-181) on What to order — the "Below demand anticipation" section:
// a row per gap with its proposal, read back from the service for the same
// scope; "Create draft call-off" ends in the call-off STORE as a Draft on the
// oldest blanket line with the gap quantity and the week-6 need date (AC-02);
// "New PO needed" where no line has balance (AC-03); the link to the supplier ×
// material on Demand anticipation; the handoff for a seat without
// `calloff:plan`; and the engine's recommended orders left exactly as they were.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { supplyGapRows } from '@services/transitions/supplyBelowDemandRules';
import { sdcClock } from '@services/sdc/clock';
import i18n from '@lib/i18n';
import { formatNumber } from '@lib/format';
import BuyerOrderPlan from './BuyerOrderPlan';
import { BELOW_DEMAND_FIRST_ROWS } from './BuyerOrderPlan/components/BelowDemandSection';
import { expectNoBareDa } from '@test/noBareDa';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/order-plan';
/** @type {import('@services/data/types').QueryScope} */
const scope = { personaType: 'buyer', supplierId: null, businessRoles: SEEDED_SEAT_ROLES.buyer };
// DRC-2 (BL-188): the demand anticipation covers each pair's lead time, so
// the AC-02 probe uses W38, inside sup-002 × RM-STEAR-7300's 7-week horizon
// with a blanket balance (week 6 of sup-007 × PK-PETB-8801 is outside its
// 2-week horizon now).
const W3 = '2026-09-14';
// The page runs the engine first; under a loaded machine the default 1 s wait is too short.
const WAIT = { timeout: 5000 };

beforeEach(() => {
  sdcClock.reset();
  callOffStore.reset();
  purchaseOrderStore.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

const gaps = async () =>
  supplyGapRows((await mockDataService.procurement.getDemandAnticipation(scope)).items);

/** Opens every gap row (the section shows the earliest 20 first), when there are more. */
const showAll = async () => {
  await screen.findByTestId('op-below-demand', {}, WAIT);
  await screen.findAllByTestId(/^op-gap-sup-/, {}, WAIT);
  const toggle = screen.queryByTestId('op-below-demand-toggle');
  if (toggle) fireEvent.click(toggle);
};

/** @param {{ supplierId: string; materialCode: string; week: string }} g */
const keyOf = (g) => `${g.supplierId}-${g.materialCode}-${g.week}`;

describe('CAP-12 — "Below demand anticipation" on What to order', () => {
  it('lists every gap of the read, marked as hub sample data, after the engine’s list', async () => {
    // W38: with the rolling horizons the sample holds more than 20 gaps from
    // here (19 at the hub's present), so "Show all" is reachable.
    sdcClock.set('2026-09-14T03:00:00.000Z');
    const all = await gaps();
    expect(all.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: ROUTE });
    const section = await screen.findByTestId('op-below-demand', {}, WAIT);
    await within(section).findByTestId(`op-gap-${keyOf(/** @type {*} */ (all[0]))}`, {}, WAIT);
    expect(
      within(section).getByRole('heading', { name: 'Below demand anticipation (DA)' })
    ).toBeVisible();
    // The page's one simulated-data banner covers it (F-14); the section names its source.
    expect(within(section).getByTestId('op-below-demand-sample')).toHaveTextContent(
      'From the hub’s sample data'
    );
    expect(screen.queryByTestId('sample-data-badge')).toBeNull();
    // The earliest 20 first, then every one of them behind "Show all".
    expect(all.length).toBeGreaterThan(BELOW_DEMAND_FIRST_ROWS);
    expect(within(section).getAllByTestId(/^op-gap-sup-/)).toHaveLength(BELOW_DEMAND_FIRST_ROWS);
    expect(within(section).getByTestId('op-below-demand-toggle')).toHaveTextContent(
      `Show all ${all.length}`
    );
    await showAll();
    expect(within(section).getAllByTestId(/^op-gap-sup-/)).toHaveLength(all.length);
    const first = /** @type {NonNullable<(typeof all)[number]>} */ (all[0]);
    expect(within(section).getByTestId(`op-gap-qty-${keyOf(first)}`)).toHaveTextContent(
      formatNumber(first.gap)
    );
    // Its own section: the engine's list comes first and holds none of these rows.
    const recs = screen.getByTestId('op-recs');
    expect(recs.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(recs).queryAllByTestId(/^op-gap-/)).toEqual([]);
    expectNoBareDa();
  });

  it('the engine’s recommended orders are unchanged: one row per engine recommendation', async () => {
    const plan = /** @type {import('@services/data/types').OrderPlanView} */ (
      await mockDataService.procurement.getOrderPlan(scope)
    );
    const w = /** @type {NonNullable<(typeof plan.warehouses)[number]>} */ (plan.warehouses[0]);
    const recs = w.materials.flatMap((m) => m.recommendations);
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: ROUTE });
    const section = await screen.findByTestId('op-recs', {}, WAIT);
    // IA F-1 — the list opens on its first rows; open it all before counting.
    fireEvent.click(within(section).getByTestId('op-recs-toggle'));
    expect(
      within(section)
        .getAllByTestId(/^op-rec-/)
        .filter((el) => el.tagName === 'TR')
    ).toHaveLength(recs.length);
  });

  it('AC-02 — the draft lands on the oldest blanket line with the gap quantity and its week’s need date', async () => {
    const g = (await gaps()).find(
      (x) => x.supplierId === 'sup-002' && x.materialCode === 'RM-STEAR-7300' && x.week === W3
    );
    const proposed = g?.proposal.callOffs[0];
    expect(proposed).toBeDefined();
    const c = /** @type {NonNullable<typeof proposed>} */ (proposed);
    const gap = /** @type {NonNullable<typeof g>} */ (g);
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: ROUTE });
    await showAll();
    const row = await screen.findByTestId(`op-gap-${keyOf(gap)}`, {}, WAIT);
    expect(within(row).getByTestId(`op-gap-calloff-${keyOf(gap)}-${c.poNumber}`)).toHaveTextContent(
      `Call off ${formatNumber(c.qty)} on ${c.poNumber} (oldest blanket line with balance)`
    );
    const before = callOffStore.all().length;
    fireEvent.click(within(row).getByTestId(`op-gap-draft-${keyOf(gap)}-${c.poNumber}`));
    await waitFor(() => expect(callOffStore.all()).toHaveLength(before + 1), WAIT);
    const draft = callOffStore.all()[before];
    expect(draft).toMatchObject({
      status: 'Draft',
      poId: c.poId,
      poLineId: c.lineId,
      quantity: c.qty,
      needDate: W3,
      supplierId: 'sup-002',
      materialCode: 'RM-STEAR-7300'
    });
    // Hub sample data, not the engine's: no engine origin (X-03 does not apply).
    expect(draft?.origin).toBeUndefined();
    expect(await within(row).findByText('Draft created', {}, WAIT)).toBeInTheDocument();
    // IA-B13 — the drafted proposal links to that draft on Call-offs.
    const open = within(row).getByTestId(`op-gap-open-draft-${keyOf(gap)}-${c.poNumber}`);
    expect(open).toHaveTextContent('Open the draft call-off');
    expect(open).toHaveAttribute('href', `/buyer/call-offs?highlight=${draft?.id}`);
  });

  it('P-07 — each gap row opens the what-if sandbox on its supplier × material', async () => {
    const gap = (await gaps())[0];
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: ROUTE });
    await showAll();
    const link = await screen.findByTestId(`op-gap-whatif-${keyOf(gap)}`, {}, WAIT);
    expect(link).toHaveTextContent('Try a what-if');
    const href = new URL(/** @type {string} */ (link.getAttribute('href')), 'http://x');
    expect(href.pathname).toBe('/buyer/what-if');
    expect(href.searchParams.get('material')).toBe(gap.materialCode);
    expect(href.searchParams.get('supplier')).toBe(gap.supplierId);
  });

  it('AC-03 — no blanket balance left reads "New PO needed" with the gap and the unit', async () => {
    const g = (await gaps()).find((x) => x.proposal.callOffs.length === 0);
    const gap = /** @type {NonNullable<typeof g>} */ (g);
    expect(gap.proposal.newPoQty).toBe(gap.gap);
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: ROUTE });
    await showAll();
    const row = await screen.findByTestId(`op-gap-${keyOf(gap)}`, {}, WAIT);
    expect(within(row).getByTestId(`op-gap-newpo-${keyOf(gap)}`)).toHaveTextContent(
      `New PO needed: ${formatNumber(gap.gap)} ${gap.uom}`
    );
    expect(within(row).queryByRole('button', { name: 'Create draft call-off' })).toBeNull();
  });

  it('each row links to its supplier × material on Demand anticipation', async () => {
    const g = /** @type {NonNullable<Awaited<ReturnType<typeof gaps>>[number]>} */ (
      (await gaps())[0]
    );
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: ROUTE });
    const link = await screen.findByTestId(`op-gap-link-${keyOf(g)}`, {}, WAIT);
    expect(link.getAttribute('href')).toContain(
      `/buyer/demand-anticipation?supplier=${g.supplierId}&material=${g.materialCode}`
    );
  });

  it('a seat without the planning lane sees who acts, not the draft control', async () => {
    renderWithProviders(<BuyerOrderPlan />, {
      identity: { ...BUYER, businessRoles: ['finance'] },
      route: ROUTE
    });
    const section = await screen.findByTestId('op-below-demand', {}, WAIT);
    await within(section).findAllByTestId(/^op-gap-sup-/, {}, WAIT);
    expect(within(section).queryByRole('button', { name: 'Create draft call-off' })).toBeNull();
    expect(within(section).getAllByTestId('handoff-orderplan-gap-draft').length).toBeGreaterThan(0);
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: ROUTE });
    const section = await screen.findByTestId('op-below-demand', {}, WAIT);
    await within(section).findAllByTestId(/^op-gap-sup-/, {}, WAIT);
    expect(within(section).getByText('Di bawah demand anticipation (DA)')).toBeInTheDocument();
    expect(within(section).getAllByText(/^Perlu PO baru: /).length).toBeGreaterThan(0);
    expectNoBareDa();
  });
});

describe('BL-228 — the What to order line of a gap the carry reduced', () => {
  it('AC-02/AC-06 — W38 of sup-002 × RM-EMUL-9410 reads 200, with 800 carried in its tooltip', async () => {
    const g = (await gaps()).find(
      (x) => x.supplierId === 'sup-002' && x.materialCode === 'RM-EMUL-9410' && x.week === W3
    );
    expect(g).toMatchObject({ carriedIn: 800, gap: 200 });
    const gap = /** @type {NonNullable<typeof g>} */ (g);
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: ROUTE });
    await showAll();
    const qty = await screen.findByTestId(`op-gap-qty-${keyOf(gap)}`, {}, WAIT);
    expect(qty).toHaveTextContent(formatNumber(200));
    expect(qty).toHaveAttribute('title', '800 carried from earlier weeks');
    const plain = (await gaps()).find((x) => x.carriedIn === 0);
    expect(screen.getByTestId(`op-gap-qty-${keyOf(/** @type {*} */ (plain))}`)).not.toHaveAttribute(
      'title'
    );
  });
});
