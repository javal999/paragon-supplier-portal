// ─────────────────────────────────────────────────────────────────────────────
// CAP-9 (BL-178) on the screens — the PTI Call-offs page's blanket PO panels
// (both weeks, BR-04), the "Blanket POs running out" list (BR-04), "Covers the
// forecast horizon" (BR-06) and the planner's alert (BR-05), on fixture data.
// Every expected week is read back from the read model the service answers
// from and pinned by name, never re-derived in the test.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
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
const projectionOf = (lineId) => {
  const row = allBlanketPoRunOuts().find((r) => r.lineId === lineId);
  expect(row, `blanket PO line ${lineId}`).toBeDefined();
  return /** @type {NonNullable<typeof row>} */ (row).projection;
};

describe('CAP-9 BR-04 — both weeks on the blanket PO panel', () => {
  it('AC-01 on fixture data: PO-2026-00127 (70,000 pcs, LTP 34,300/wk, lead time 14 days) runs out in week 3, new PO needed by week 1', async () => {
    const p = projectionOf('li-027a');
    expect(p.start).toBe(70_000);
    expect(p.runOut).toEqual({ index: 3, week: '2026-09-14' });
    expect(p.newPoBy).toEqual({ index: 1, week: '2026-08-31' });
    expect(p.leadTime).toEqual({ weeks: 2, onRecord: true });

    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const panel = await screen.findByTestId('calloff-umbrella-po-027-li-027a');
    const facts = within(panel).getByTestId('calloff-runout-li-027a');
    expect(within(facts).getByTestId('calloff-runout-week-li-027a')).toHaveTextContent(
      `W38 · ${formatDate('2026-09-14')}`
    );
    expect(within(facts).getByTestId('calloff-newpo-week-li-027a')).toHaveTextContent(
      `W36 · ${formatDate('2026-08-31')}`
    );
    expect(facts).toHaveTextContent('Runs out');
    expect(facts).toHaveTextContent('New PO needed by');
    expect(facts).toHaveTextContent('(this week)');
    expect(facts).toHaveTextContent('PO lead time 2 wk');
    expect(within(facts).getByTestId('calloff-newpo-due-li-027a')).toHaveTextContent(
      'Raise the next PO'
    );
  });

  it('BR-06: a line that never goes below zero says "Covers the forecast horizon (26 wk)"', async () => {
    // Known-good: PO-2025-00102 runs out today; with 100,000 kg more ordered it covers.
    expect(projectionOf('li-002a').runOut?.index).toBe(6);
    purchaseOrderStore.update('po-002', (po) => ({
      ...po,
      lineItems: po.lineItems.map((li) => ({ ...li, quantity: li.quantity + 100_000 }))
    }));
    expect(projectionOf('li-002a').runOut).toBeNull();
    expect(projectionOf('li-002a').hasLtp).toBe(true);

    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const panel = await screen.findByTestId('calloff-umbrella-po-002-li-002a');
    expect(within(panel).getByTestId('calloff-runout-covers-li-002a')).toHaveTextContent(
      /^Covers the forecast horizon \(26 wk\)$/
    );
    expect(within(panel).queryByTestId('calloff-runout-li-002a')).toBeNull();
    // A line with no LTP at all covers the horizon too, and says why.
    const noLtp = await screen.findByTestId('calloff-runout-covers-li-191a');
    expect(noLtp).toHaveTextContent(
      'Covers the forecast horizon (26 wk) · No LTP for this material in the horizon: nothing draws it down.'
    );
  });
});

describe('CAP-9 BR-04 — "Blanket POs running out", sorted by "new PO needed by"', () => {
  it('lists the lines that run out, soonest needed-by first, with the Sample data marker', async () => {
    const expected = ['li-007a', 'li-024a', 'li-027a', 'li-002a', 'li-016a'];
    expect(runningOut(allBlanketPoRunOuts()).map((r) => r.lineId)).toEqual(expected);
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    const list = await screen.findByTestId('calloff-runout-list');
    expect(within(list).getByText('Blanket POs running out')).toBeInTheDocument();
    expect(within(list).getByTestId('sample-data-badge')).toBeInTheDocument();
    const rows = within(list)
      .getAllByTestId(/^calloff-runout-row-/)
      .map((el) => el.getAttribute('data-testid'));
    expect(rows).toEqual(expected.map((id) => `calloff-runout-row-${id}`));
    // PO-2025-00107 was needed two weeks ago: said so, not hidden.
    expect(within(list).getByTestId('calloff-runout-row-li-007a')).toHaveTextContent(
      'passed 2 wk ago'
    );
    expect(within(list).getByTestId('calloff-runout-row-li-002a')).toHaveTextContent('in 2 wk');
    // A line that covers the horizon is not on the list.
    expect(within(list).queryByTestId('calloff-runout-row-li-191a')).toBeNull();
  });

  it('a drill-through to one PO lists that PO only', async () => {
    renderWithProviders(<BuyerCallOffs />, {
      identity: PLANNER,
      route: '/buyer/call-offs?po=po-027'
    });
    const list = await screen.findByTestId('calloff-runout-list');
    expect(
      within(list)
        .getAllByTestId(/^calloff-runout-row-/)
        .map((el) => el.getAttribute('data-testid'))
    ).toEqual(['calloff-runout-row-li-027a']);
  });

  it('the projection moves when the hub clock moves', async () => {
    sdcClock.set('2026-09-07T12:00:00.000Z');
    // Nothing more was called off, so the same 70,000 pcs meet the LTP a week later.
    expect(projectionOf('li-027a').runOut).toEqual({ index: 3, week: '2026-09-21' });
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    expect(await screen.findByTestId('calloff-runout-week-li-027a')).toHaveTextContent(
      `W39 · ${formatDate('2026-09-21')}`
    );
    expect(screen.getByTestId('calloff-newpo-week-li-027a')).toHaveTextContent(
      `W37 · ${formatDate('2026-09-07')}`
    );
  });
});

describe('CAP-9 BR-05 — the planner is alerted when "new PO needed by" is within 4 weeks', () => {
  it('one alert per blanket PO due, linked to that PO on the Call-offs page; none for a PO that covers', async () => {
    const keys = (await reads.getInventoryAlerts(PLANNER)).items
      .filter((a) => a.rule === 'blanketPoRunOut')
      .map((a) => a.key)
      .sort();
    expect(keys).toEqual([
      'blanketPoRunOut|po-002|sup-002',
      'blanketPoRunOut|po-007|sup-007',
      'blanketPoRunOut|po-016|sup-002',
      'blanketPoRunOut|po-024|sup-007',
      'blanketPoRunOut|po-027|sup-007'
    ]);
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER, route: '/buyer/alerts' });
    const alert = await screen.findByTestId('alert-blanketPoRunOut|po-027|sup-007');
    expect(alert).toHaveTextContent(
      'A blanket PO runs out soon: raise the next PO by its "new PO needed by" week'
    );
    expect(alert).toHaveTextContent('PO-2026-00127 · PK-PETB-8801');
    expect(alert).toHaveTextContent('High');
    expect(
      within(alert).getByRole('link', { name: 'Open blanket PO' }).getAttribute('href')
    ).toMatch(/\/buyer\/call-offs\?po=po-027$/);
    expect(screen.getByTestId('alert-blanketPoRunOut|po-002|sup-002')).toHaveTextContent('Medium');
    expect(screen.queryByTestId('alert-blanketPoRunOut|po-191|sup-019')).toBeNull();
  });

  it('a needed-by week beyond 4 weeks raises none; the supplier never sees the rule', async () => {
    // 3,000 kg more on PO-2025-00102: it runs out in week 9, needed by week 6.
    purchaseOrderStore.update('po-002', (po) => ({
      ...po,
      lineItems: po.lineItems.map((li) => ({ ...li, quantity: li.quantity + 3_000 }))
    }));
    expect(projectionOf('li-002a').runOut?.index).toBe(9);
    expect(projectionOf('li-002a').newPoBy?.index).toBe(6);
    const rules = (await reads.getInventoryAlerts(PLANNER)).items.map((a) => a.key);
    expect(rules).not.toContain('blanketPoRunOut|po-002|sup-002');
    expect(rules).toContain('blanketPoRunOut|po-016|sup-002');
    expect(
      (await reads.getInventoryAlerts(SUP_007)).items.some((a) => a.rule === 'blanketPoRunOut')
    ).toBe(false);
    expect((await reads.getBlanketPoRunOuts(SUP_007)).items).toEqual([]);
  });
});
