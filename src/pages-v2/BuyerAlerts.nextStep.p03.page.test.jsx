/** @import React from 'react' */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BUYER, renderWithProviders } from '@test/test-utils';
import { inventoryCapacityEn } from '@lib/i18n/inventoryCapacity';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { inventoryDeclarationStore } from '@services/data/mock/stores/inventoryDeclarationStore';
import {
  capacityStore,
  inventoryAlertLedger,
  stockAccessStore,
  stockSyncStore
} from '@services/data/mock/stores/inventoryHubStores';
import { supplierAskStore } from '@services/data/mock/stores/supplierAskStore';
import { sdcClock } from '@services/sdc';
import BuyerAlerts from './BuyerAlerts';
import { weekLabel } from './BuyerDemandAnticipation/display';

// ─────────────────────────────────────────────────────────────────────────────
// Inventory UX P-03 (INV-D5) and P-08 (INV-D1) on the PTI Alerts page.
//
//   · P-03 — every alert says by when ("Impact in N days", the days to impact
//     the list sorts on) and what to do: a next step per rule and the action
//     that fits it. "Create call-off" only on a pair with an agreement line
//     that is not over-called, else "Create PO request"; "Ask supplier" (the
//     INV-D9 hub ask) on the topic that fits the rule.
//   · P-08 — each rule shows its own basis instead of one "Cover N days" line.
//
// Seed pairs, read at the seed's "now":
//   RM-STEAR-7300 × sup-002 — an agreement line with quantity left → call-off;
//   PK-PETB-8801 × sup-007  — a line, but over-called (P-05) → PO request;
//   RM-EMUL-9430 × sup-010  — no agreement line, no lead time → PO request.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const EN = inventoryCapacityEn;

const STOCK_OUT = 'projectedStockOut|RM-STEAR-7300|sup-002';
const PTI_ROP_LINE = 'ptiBelowRop|RM-STEAR-7300|sup-002';
const PTI_ROP_OVER = 'ptiBelowRop|PK-PETB-8801|sup-007';
const PTI_ROP_NONE = 'ptiBelowRop|RM-EMUL-9430|sup-010';
const COVERAGE = 'coverage|RM-STEAR-7300|sup-002';
const SUPPLIER_ROP = 'supplierBelowRop|RM-STEAR-7300|sup-002';
const CAPACITY = 'capacityBelowDemand|pg-MG-02|sup-005';
const STALE = 'staleData|PK-PETB-8810|sup-007';
const NEVER_SENT = 'staleData|PK-CAPF-8820|sup-007';
const LEAD_MISSING = 'leadTimeMissing|RM-EMUL-9430|sup-010';
const COVERAGE_FALLBACK = 'coverage|RM-EMUL-9430|sup-010';
const COMMITMENT_FIRM = 'commitmentBelowForecast|RM-STEAR-7300|sup-002';
const COMMITMENT_TRADE = 'commitmentBelowForecast|PK-PETB-8802|sup-007';

let path = '';
/** @type {React.FC} */
const LocationProbe = () => {
  const loc = useLocation();
  useEffect(() => {
    path = `${loc.pathname}${loc.search}`;
  }, [loc]);
  return null;
};

const renderAlerts = async () => {
  renderWithProviders(
    <>
      <BuyerAlerts />
      <LocationProbe />
    </>,
    { identity: PLANNER, route: '/buyer/alerts' }
  );
  await screen.findByTestId(`alert-${STOCK_OUT}`);
  // The order actions wait for the POs, call-offs and simulation to load.
  await screen.findByTestId(`alert-calloff-${STOCK_OUT}`, {}, { timeout: 8000 });
};

/** @param {string} key */
const row = (key) => screen.getByTestId(`alert-${key}`);

beforeEach(() => {
  inventoryDeclarationStore.reset();
  stockAccessStore.reset();
  capacityStore.reset();
  stockSyncStore.reset();
  inventoryAlertLedger.reset();
  supplierAskStore.reset();
  sdcClock.reset();
  path = '';
});

describe('P-03 · days to impact is shown', () => {
  it('stock and capacity rules say "Impact in N days"; stale data says how long; rules with no date say nothing', async () => {
    await renderAlerts();
    expect(screen.getByTestId(`alert-impact-${STOCK_OUT}`)).toHaveTextContent('Impact in 2 days');
    expect(screen.getByTestId(`alert-impact-${PTI_ROP_LINE}`)).toHaveTextContent(
      'Impact in 10 days'
    );
    // INV-D12 — the sample acceptance (sup-005 · pg-MG-02 · 12 Oct, 42 days)
    // no longer counts, so the impact runs to the next gap week, 19 Oct.
    expect(screen.getByTestId(`alert-impact-${CAPACITY}`)).toHaveTextContent('Impact in 49 days');
    expect(screen.getByTestId(`alert-impact-${STALE}`)).toHaveTextContent(
      'Out of date for 17 days'
    );
    expect(screen.getByTestId(`alert-impact-${NEVER_SENT}`)).toHaveTextContent(
      EN['inv.alerts.impact.neverSent']
    );
    // `daysToImpact` is not computed for these two (it defaults to 0): no "Impact now".
    expect(screen.queryByTestId(`alert-impact-${COMMITMENT_FIRM}`)).toBeNull();
    expect(screen.queryByTestId(`alert-impact-${LEAD_MISSING}`)).toBeNull();
  });
});

describe('P-03 · next step and the action that fits each rule', () => {
  it('projected stock-out on a pair with an agreement line: call-off, simulation, ask for a production date', async () => {
    await renderAlerts();
    const r = row(STOCK_OUT);
    expect(within(r).getByTestId(`alert-next-text-${STOCK_OUT}`)).toHaveTextContent(
      `${EN['inv.alerts.next.projectedStockOut']} ${EN['inv.alerts.next.order.callOff']}`
    );
    expect(within(r).getByText('Next step')).toBeInTheDocument();
    expect(within(r).queryByTestId(`alert-po-${STOCK_OUT}`)).toBeNull();
    expect(within(r).getByTestId(`alert-ask-${STOCK_OUT}`)).toHaveAttribute(
      'data-topic',
      'productionDate'
    );
    // The old single "Open inventory" link is replaced by the actions.
    expect(within(r).queryByRole('link', { name: 'Open inventory' })).toBeNull();
    fireEvent.click(within(r).getByTestId(`alert-calloff-${STOCK_OUT}`));
    expect(path).toBe('/buyer/call-offs?newFor=sup-002&material=RM-STEAR-7300');
  });

  it('"Open stock simulation" lands on the pair', async () => {
    await renderAlerts();
    fireEvent.click(screen.getByTestId(`alert-simulation-${STOCK_OUT}`));
    expect(path).toBe('/buyer/stock-simulation?q=RM-STEAR-7300&supplier=sup-002');
  });

  it('PTI below ROP: call-off where the line has quantity left, PO request where the pair is over-called or has no line', async () => {
    await renderAlerts();
    expect(screen.getByTestId(`alert-calloff-${PTI_ROP_LINE}`)).toBeInTheDocument();
    expect(screen.getByTestId(`alert-next-text-${PTI_ROP_LINE}`)).toHaveTextContent(
      `${EN['inv.alerts.next.ptiBelowRop']} ${EN['inv.alerts.next.order.callOff']}`
    );
    // P-05 — an over-called pair gets no call-off.
    const over = row(PTI_ROP_OVER);
    expect(within(over).queryByTestId(`alert-calloff-${PTI_ROP_OVER}`)).toBeNull();
    expect(within(over).getByTestId(`alert-next-text-${PTI_ROP_OVER}`)).toHaveTextContent(
      EN['inv.alerts.next.order.overCalled']
    );
    // P-06 — no agreement line: PO request.
    const none = row(PTI_ROP_NONE);
    expect(within(none).queryByTestId(`alert-calloff-${PTI_ROP_NONE}`)).toBeNull();
    expect(within(none).getByTestId(`alert-next-text-${PTI_ROP_NONE}`)).toHaveTextContent(
      EN['inv.alerts.next.order.po']
    );
    expect(within(none).getByTestId(`alert-ask-${PTI_ROP_NONE}`)).toHaveAttribute(
      'data-topic',
      'productionDate'
    );
    fireEvent.click(within(over).getByTestId(`alert-po-${PTI_ROP_OVER}`));
    expect(path).toBe('/buyer/purchase-requisition?new=1&supplier=sup-007&material=PK-PETB-8801');
  });

  it('supplier below ROP: simulation and ask for a production date, no order action', async () => {
    await renderAlerts();
    const r = row(SUPPLIER_ROP);
    expect(within(r).getByTestId(`alert-next-text-${SUPPLIER_ROP}`)).toHaveTextContent(
      EN['inv.alerts.next.supplierBelowRop']
    );
    expect(within(r).getByTestId(`alert-simulation-${SUPPLIER_ROP}`)).toBeInTheDocument();
    expect(within(r).queryByTestId(`alert-calloff-${SUPPLIER_ROP}`)).toBeNull();
    expect(within(r).queryByTestId(`alert-po-${SUPPLIER_ROP}`)).toBeNull();
    expect(within(r).getByTestId(`alert-ask-${SUPPLIER_ROP}`)).toHaveAttribute(
      'data-topic',
      'productionDate'
    );
  });

  it('capacity below demand: the first gap week in the next step, "Open capacity" kept, and the ask raised on that week', async () => {
    await renderAlerts();
    const r = row(CAPACITY);
    expect(within(r).getByTestId(`alert-next-text-${CAPACITY}`)).toHaveTextContent(
      'Allocated capacity falls short from W42'
    );
    expect(within(r).getByRole('link', { name: 'Open capacity' })).toHaveAttribute(
      'href',
      '/buyer/capacity?supplier=sup-005&planningGroup=pg-MG-02&gapsOnly=1'
    );
    expect(within(r).queryByTestId(`alert-simulation-${CAPACITY}`)).toBeNull();
    expect(within(r).getByTestId(`alert-ask-${CAPACITY}`)).toHaveAttribute(
      'data-topic',
      'capacityGap'
    );
    fireEvent.click(within(r).getByTestId(`alert-ask-${CAPACITY}-open`));
    expect(screen.getByTestId(`alert-ask-${CAPACITY}-topic`)).toHaveValue('capacityGap');
    fireEvent.click(screen.getByTestId(`alert-ask-${CAPACITY}-submit`));
    await waitFor(() => expect(supplierAskStore.all().length).toBeGreaterThan(0));
    const ask = supplierAskStore.all().slice(-1)[0];
    expect(ask).toMatchObject({
      supplierId: 'sup-005',
      planningGroupId: 'pg-MG-02',
      topic: 'capacityGap'
    });
    expect(weekLabel(/** @type {string} */ (ask.week))).toBe('W42');
  });

  it('stale data: ask for stock figures, "Open inventory" kept, no simulation or order action', async () => {
    await renderAlerts();
    const r = row(STALE);
    expect(within(r).getByTestId(`alert-next-text-${STALE}`)).toHaveTextContent(
      EN['inv.alerts.next.staleData']
    );
    expect(within(r).getByTestId(`alert-ask-${STALE}`)).toHaveAttribute(
      'data-topic',
      'stockFigures'
    );
    fireEvent.click(within(r).getByTestId(`alert-ask-${STALE}-open`));
    expect(screen.getByTestId(`alert-ask-${STALE}-topic`)).toHaveValue('stockFigures');
    expect(within(r).getByRole('link', { name: 'Open inventory' })).toBeInTheDocument();
    expect(within(r).queryByTestId(`alert-simulation-${STALE}`)).toBeNull();
    expect(within(r).queryByTestId(`alert-po-${STALE}`)).toBeNull();
  });

  it('commitment below forecast keeps its link and offers no ask; "Close alert" stays on every open alert', async () => {
    await renderAlerts();
    const r = row(COMMITMENT_FIRM);
    expect(within(r).getByRole('link', { name: 'Open commitments & gaps' })).toBeInTheDocument();
    expect(within(r).queryByTestId(`alert-ask-${COMMITMENT_FIRM}`)).toBeNull();
    for (const key of [STOCK_OUT, CAPACITY, STALE, COMMITMENT_FIRM]) {
      expect(within(row(key)).getByRole('button', { name: /Close alert/ })).toBeInTheDocument();
    }
  });

  it('a closed alert shows no next step, keeps its link, and lists its closure', async () => {
    inventoryAlertLedger.append([
      {
        key: STALE,
        kind: 'closed',
        at: '2026-08-30T09:00:00+07:00',
        closeReason: 'supplier-updated'
      }
    ]);
    renderWithProviders(<BuyerAlerts />, {
      identity: PLANNER,
      route: '/buyer/alerts?tab=closed'
    });
    const r = await screen.findByTestId(`alert-${STALE}`);
    expect(within(r).queryByTestId(`alert-next-${STALE}`)).toBeNull();
    expect(within(r).getByRole('link', { name: 'Open inventory' })).toBeInTheDocument();
    expect(within(r).getByTestId(`alert-closure-${STALE}`)).toBeInTheDocument();
  });
});

describe('P-08 · each rule shows its own basis (INV-D1)', () => {
  it('PTI-stock rules: PTI stock against the PTI ROP, not supplier cover', async () => {
    await renderAlerts();
    expect(screen.getByTestId(`alert-basis-${PTI_ROP_LINE}`)).toHaveTextContent(
      'PTI 900 / ROP 2,500 KG'
    );
    expect(screen.getByTestId(`alert-basis-${PTI_ROP_OVER}`)).toHaveTextContent(
      'PTI 30,000 / ROP 40,000 PCS'
    );
    expect(screen.getByTestId(`alert-basis-${STOCK_OUT}`)).toHaveTextContent(
      'PTI 900 / ROP 2,500 KG'
    );
    expect(screen.getByTestId(`alert-basis-${PTI_ROP_LINE}`)).not.toHaveTextContent(/cover/i);
  });

  it('capacity: short by and the first gap week', async () => {
    await renderAlerts();
    expect(screen.getByTestId(`alert-basis-${CAPACITY}`)).toHaveTextContent('Short by 97 KG · W42');
  });

  it('coverage and supplier rules: "Supplier cover N days · lead time N days"', async () => {
    await renderAlerts();
    expect(screen.getByTestId(`alert-basis-${COVERAGE}`)).toHaveTextContent(
      'Supplier cover 10 days · lead time 21 days'
    );
    expect(screen.getByTestId(`alert-basis-${SUPPLIER_ROP}`)).toHaveTextContent(
      'Supplier cover 10 days · lead time 21 days'
    );
  });

  it('no lead time on record is said once, by its own alert; the basis lines name the day bands only', async () => {
    await renderAlerts();
    const missing = row(LEAD_MISSING);
    expect(missing).toHaveTextContent('No supplier lead time on record');
    expect(screen.getByTestId(`alert-basis-${LEAD_MISSING}`)).toHaveTextContent(
      'Supplier cover 6 days · day bands: Critical'
    );
    expect(screen.getByTestId(`alert-basis-${COVERAGE_FALLBACK}`)).toHaveTextContent(
      'Supplier cover 6 days · day bands: Critical'
    );
    const group = screen.getByTestId('alert-group-sup-010');
    expect(within(group).getAllByText(/no (supplier )?lead time on record/i)).toHaveLength(1);
  });

  it('commitment: the zone that is short; the old uniform "Cover N days" line is gone', async () => {
    await renderAlerts();
    expect(screen.getByTestId(`alert-basis-${COMMITMENT_FIRM}`)).toHaveTextContent(
      'Firm period short'
    );
    expect(screen.getByTestId(`alert-basis-${COMMITMENT_TRADE}`)).toHaveTextContent(
      'Trade-off period short'
    );
    expect(screen.queryByText(/^Cover \d+ days/)).toBeNull();
  });
});
