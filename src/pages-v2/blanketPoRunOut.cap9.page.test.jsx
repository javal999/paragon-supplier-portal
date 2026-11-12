// ─────────────────────────────────────────────────────────────────────────────
// CAP-9 (BL-178) on the screens — the PTI Call-offs page's blanket PO panels
// (both weeks, BR-04), the "Blanket POs running out" list (BR-04), "Covers the
// forecast horizon" (BR-06) and the planner's alert (BR-05), on fixture data.
// Owner ruling 2026-10-13: several blanket POs for one supplier × material are
// drawn down one after another, oldest first; the group's last PO alone needs
// a new PO. Every expected week is read back from the read model the service
// answers from and pinned by name.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { NO_PERSON } from '@context/noPerson';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { allBlanketPoRunOuts } from '@services/data/mock/inventoryReadModel';
import { MockProcurementService } from '@services/data/mock/MockProcurementService';
import { runningOut } from '@services/transitions/blanketPoRules';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import BuyerCallOffs from './BuyerCallOffs';
import BuyerAlerts from './BuyerAlerts';

beforeEach(() => {
  callOffStore.reset();
  asnStore.reset();
  purchaseOrderStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

/**
 * P-12 — opens one of the Call-offs tabs, by its visible name.
 * @param {string} name
 */
const openTab = async (name) => fireEvent.click(await screen.findByRole('tab', { name }));
/** @type {CurrentIdentity} */
const SUP_007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};
const reads = new MockProcurementService();

/** @param {string} lineId */
const rowOf = (lineId) => {
  const row = allBlanketPoRunOuts().find((r) => r.lineId === lineId);
  expect(row, `blanket PO line ${lineId}`).toBeDefined();
  return /** @type {NonNullable<typeof row>} */ (row);
};
/** @param {string} lineId */
const projectionOf = (lineId) => rowOf(lineId).projection;

describe('CAP-9 — sup-007 × PK-PETB-8801: three blanket POs, drawn down oldest first', () => {
  it('the read: po-007 → po-024 → po-027 by order date; po-027 runs out in week 4, needed by week 2', () => {
    const group = allBlanketPoRunOuts().filter(
      (r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8801'
    );
    expect(group.map((r) => r.poId)).toEqual(['po-007', 'po-024', 'po-027']);
    // The order is the PO's order date (shifted fixture), oldest first.
    expect(group.map((r) => r.orderDate)).toEqual([...group.map((r) => r.orderDate)].sort());
    expect(group.map((r) => r.projection.start)).toEqual([15_000, 37_000, 70_000]);
    // Week 1 (LTP 34,300) uses up po-007 and 19,300 of po-024; week 2 uses up
    // po-024 and 16,600 of po-027.
    expect(group.map((r) => r.projection.weeks[0]?.draw)).toEqual([15_000, 19_300, 0]);
    expect(group.map((r) => r.projection.weeks[1]?.draw)).toEqual([0, 17_700, 16_600]);
    expect(group.map((r) => r.projection.runOut?.index)).toEqual([1, 2, 4]);
    expect(group.map((r) => r.projection.newPoBy)).toEqual([
      null,
      null,
      { index: 2, week: '2026-09-07' }
    ]);
    expect(group.map((r) => r.nextInLine?.poNumber ?? null)).toEqual([
      'PO-2026-00124',
      'PO-2026-00127',
      null
    ]);
  });

  it('panels: the older POs show their run-out and the next in line; the last shows "new PO needed by"', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    const p007 = await screen.findByTestId('calloff-runout-li-007a');
    expect(within(p007).getByTestId('calloff-runout-week-li-007a')).toHaveTextContent(
      `W36 · ${formatDate('2026-08-31')}`
    );
    expect(within(p007).getByTestId('calloff-next-in-line-li-007a')).toHaveTextContent(
      'Next in line: PO-2026-00124'
    );
    expect(within(p007).queryByText('New PO needed by')).toBeNull();
    expect(within(p007).queryByTestId('calloff-newpo-due-li-007a')).toBeNull();
    expect(screen.getByTestId('calloff-next-in-line-li-024a')).toHaveTextContent(
      'Next in line: PO-2026-00127'
    );

    const p027 = screen.getByTestId('calloff-runout-li-027a');
    expect(within(p027).getByTestId('calloff-runout-week-li-027a')).toHaveTextContent(
      `W39 · ${formatDate('2026-09-21')}`
    );
    expect(within(p027).getByTestId('calloff-newpo-week-li-027a')).toHaveTextContent(
      `W37 · ${formatDate('2026-09-07')}`
    );
    expect(p027).toHaveTextContent('(in 1 wk)');
    expect(p027).toHaveTextContent('PO lead time 2 wk');
    expect(within(p027).getByTestId('calloff-newpo-due-li-027a')).toHaveTextContent(
      'Raise the next PO'
    );
    expect(screen.queryByTestId('calloff-next-in-line-li-027a')).toBeNull();
  });
});

describe('CAP-9 BR-04 — a single-line group is unchanged', () => {
  it('PO-2025-00102 (6,000 kg, lead time 30 days, DRC-6 since BL-285) runs out in week 6, new PO needed by week 1', async () => {
    const p = projectionOf('li-002a');
    expect(p.lastInLine).toBe(true);
    expect(p.runOut).toEqual({ index: 6, week: '2026-10-05' });
    expect(p.newPoBy).toEqual({ index: 1, week: '2026-08-31' });
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const facts = await screen.findByTestId('calloff-runout-li-002a');
    expect(within(facts).getByTestId('calloff-runout-week-li-002a')).toHaveTextContent(
      `W41 · ${formatDate('2026-10-05')}`
    );
    expect(within(facts).getByTestId('calloff-newpo-week-li-002a')).toHaveTextContent(
      `W36 · ${formatDate('2026-08-31')}`
    );
    expect(facts).toHaveTextContent('(this week)');
    expect(facts).toHaveTextContent('PO lead time 5 wk');
  });

  it('BR-06: a line that never goes below zero says "Covers the forecast horizon (26 wk)"', async () => {
    purchaseOrderStore.update('po-002', (po) => ({
      ...po,
      lineItems: po.lineItems.map((li) => ({ ...li, quantity: li.quantity + 100_000 }))
    }));
    expect(projectionOf('li-002a').runOut).toBeNull();
    expect(projectionOf('li-002a').hasLtp).toBe(true);

    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    const panel = await screen.findByTestId('calloff-umbrella-po-002-li-002a');
    expect(within(panel).getByTestId('calloff-runout-covers-li-002a')).toHaveTextContent(
      /^Covers the forecast horizon \(26 wk\)$/
    );
    expect(within(panel).queryByTestId('calloff-runout-li-002a')).toBeNull();
    const noLtp = await screen.findByTestId('calloff-runout-covers-li-191a');
    expect(noLtp).toHaveTextContent(
      'Covers the forecast horizon (26 wk) · No LTP for this material in the horizon: nothing draws it down.'
    );
  });
});

describe('CAP-9 BR-04 — "Blanket POs running out", per group, sorted by "new PO needed by"', () => {
  it('one block per group: the last PO first, the older POs in line under it', async () => {
    const groups = runningOut(allBlanketPoRunOuts());
    expect(groups.map((g) => [g.last.lineId, g.earlier.map((r) => r.lineId)])).toEqual([
      ['li-016a', []],
      ['li-002a', []],
      ['li-027a', ['li-007a', 'li-024a']],
      // The E2E walkthrough's umbrella line (PO-2026-01910): its OSPO runs out
      // inside the horizon on the planners' LTP.
      ['li-1910a', []]
    ]);
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('Blanket POs running out');
    const list = await screen.findByTestId('calloff-runout-list');
    expect(within(list).getByText('Blanket POs running out')).toBeInTheDocument();
    expect(within(list).getByTestId('sample-data-badge')).toBeInTheDocument();
    const blocks = within(list)
      .getAllByTestId(/^calloff-runout-group-/)
      .map((el) => el.getAttribute('data-testid'));
    expect(blocks).toEqual([
      'calloff-runout-group-li-016a',
      'calloff-runout-group-li-002a',
      'calloff-runout-group-li-027a',
      'calloff-runout-group-li-1910a'
    ]);
    const pet = within(list).getByTestId('calloff-runout-group-li-027a');
    expect(
      within(pet)
        .getAllByTestId(/^calloff-runout-row-/)
        .map((el) => el.getAttribute('data-testid'))
    ).toEqual([
      'calloff-runout-row-li-027a',
      'calloff-runout-row-li-007a',
      'calloff-runout-row-li-024a'
    ]);
    expect(within(pet).getByTestId('calloff-runout-row-li-007a')).toHaveTextContent(
      'Next in line: PO-2026-00124'
    );
    expect(within(pet).getByTestId('calloff-runout-due-li-027a')).toBeInTheDocument();
    expect(within(pet).queryByTestId('calloff-runout-due-li-007a')).toBeNull();
    expect(within(list).queryByTestId('calloff-runout-row-li-191a')).toBeNull();
  });

  it('a drill-through to one PO lists the group that PO is in', async () => {
    renderWithProviders(<BuyerCallOffs />, {
      identity: PLANNER,
      route: '/buyer/call-offs?po=po-024'
    });
    await openTab('Blanket POs running out');
    const list = await screen.findByTestId('calloff-runout-list');
    expect(
      within(list)
        .getAllByTestId(/^calloff-runout-group-/)
        .map((el) => el.getAttribute('data-testid'))
    ).toEqual(['calloff-runout-group-li-027a']);
  });

  it('the projection moves when the hub clock moves', async () => {
    sdcClock.set('2026-09-07T12:00:00.000Z');
    // Nothing more was called off, so the same 122,000 pcs meet the LTP a week later.
    expect(projectionOf('li-027a').runOut).toEqual({ index: 4, week: '2026-09-28' });
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    expect(await screen.findByTestId('calloff-runout-week-li-027a')).toHaveTextContent(
      `W40 · ${formatDate('2026-09-28')}`
    );
    expect(screen.getByTestId('calloff-newpo-week-li-027a')).toHaveTextContent(
      `W38 · ${formatDate('2026-09-14')}`
    );
  });
});

describe('CAP-9 BR-05 — the planner is alerted when "new PO needed by" is within 4 weeks', () => {
  it('one alert per group, on its last PO, linked to that PO on the Call-offs page', async () => {
    const keys = (await reads.getInventoryAlerts(PLANNER)).items
      .filter((a) => a.rule === 'blanketPoRunOut')
      .map((a) => a.key)
      .sort();
    // ONE for the three sup-007 PET bottle POs, not three.
    expect(keys).toEqual([
      'blanketPoRunOut|po-002|sup-002',
      'blanketPoRunOut|po-016|sup-002',
      'blanketPoRunOut|po-027|sup-007'
    ]);
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER, route: '/buyer/alerts' });
    const alert = await screen.findByTestId('alert-blanketPoRunOut|po-027|sup-007');
    expect(alert).toHaveTextContent(
      'A blanket PO runs out soon: raise the next PO by its "new PO needed by" week'
    );
    expect(alert).toHaveTextContent('PO-2026-00127 · PK-PETB-8801');
    // Needed by week 2: Medium (High is this week or passed).
    expect(alert).toHaveTextContent('Medium');
    expect(
      within(alert).getByRole('link', { name: 'Open blanket PO' }).getAttribute('href')
    ).toMatch(/\/buyer\/call-offs\?po=po-027$/);
    expect(screen.queryByTestId('alert-blanketPoRunOut|po-007|sup-007')).toBeNull();
    expect(screen.queryByTestId('alert-blanketPoRunOut|po-024|sup-007')).toBeNull();
  });

  it('a needed-by week beyond 4 weeks raises none; the supplier never sees the rule', async () => {
    // 6,000 kg more on PO-2025-00102: it runs out in week 12, needed by week 7 (30-day lead time, BL-285).
    purchaseOrderStore.update('po-002', (po) => ({
      ...po,
      lineItems: po.lineItems.map((li) => ({ ...li, quantity: li.quantity + 6_000 }))
    }));
    expect(projectionOf('li-002a').runOut?.index).toBe(12);
    expect(projectionOf('li-002a').newPoBy?.index).toBe(7);
    const rules = (await reads.getInventoryAlerts(PLANNER)).items.map((a) => a.key);
    expect(rules).not.toContain('blanketPoRunOut|po-002|sup-002');
    expect(rules).toContain('blanketPoRunOut|po-016|sup-002');
    expect(
      (await reads.getInventoryAlerts(SUP_007)).items.some((a) => a.rule === 'blanketPoRunOut')
    ).toBe(false);
    expect((await reads.getBlanketPoRunOuts(SUP_007)).items).toEqual([]);
  });
});
