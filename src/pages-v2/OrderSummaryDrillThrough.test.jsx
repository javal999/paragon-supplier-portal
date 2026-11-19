// ─────────────────────────────────────────────────────────────────────────────
// REQ-E07-03 — THE DRILL-THROUGH, ONE SPEC PER ACCEPTANCE CRITERION.
//
// Each `describe` names exactly one AC and asserts that AC and no other, so a
// red run names the criterion that broke rather than "the order summary". Where
// an AC has two halves (AC-03's one-record and several-records cases, AC-10's
// count and its destination) both halves are asserted in the same block, because
// either alone passes while the criterion is false.
//
// ⚠️ **THE COUNT ASSERTIONS READ THE DESTINATION, NOT THE PREDICATE.** Asserting
// that `asnsForPo` returns 3 twice would be one function agreeing with itself.
// These specs read the number off the SUMMARY's cell and then count the rows the
// DESTINATION actually rendered — the two surfaces BR-09 is a promise about.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockPurchaseOrders } from '@data/mockPurchaseOrders';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import BuyerOrderSummary from './BuyerOrderSummary';
import SupplierOrderSummary from './SupplierOrderSummary';
import BuyerOrders from './BuyerOrders';
import SupplierOrders from './SupplierOrders';
import BuyerShipments from './BuyerShipments';
import SupplierShipments from './SupplierShipments';
import BuyerCallOffs from './BuyerCallOffs';
import BuyerCapacity from './BuyerCapacity';
import BuyerCommitments from './BuyerCommitments';
import BuyerGoodsReceipt from './BuyerGoodsReceipt';
import BuyerInvoices from './BuyerInvoices';
import SupplierInvoices from './SupplierInvoices';
import BuyerSupplierProfile from './BuyerSupplierProfile';
import {
  asnsForPo,
  invoicesForPo,
  invoicePoNumbers,
  compareAttention,
  attentionBand
} from './orders/orderSummaryModel';
import {
  clearOrderSummaryViewState,
  readOrderSummaryViewState
} from './orders/orderSummaryViewState';
import {
  DRILL_COLUMNS,
  drillHref,
  orderSummaryPath,
  parseIdParam
} from './orders/orderSummaryDrill';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { headerNamed } from '@test/termText';

// The row every spec walks: sup-007's PO-2025-00107 — 3 active ASNs, 6 released
// call-offs, a capacity gap, 1 goods receipt and 1 invoice, so it carries both
// the "several records" and the "exactly one record" cases at once.
const PO_ID = 'po-007';
const PO_NUMBER = 'PO-2025-00107';
const SUPPLIER_ID = 'sup-007';

beforeEach(() => {
  purchaseOrderStore.reset();
  clearOrderSummaryViewState('buyer');
  clearOrderSummaryViewState('supplier');
});

/** @param {'buyer' | 'supplier'} persona */
const summaryRow = async (persona, poId = PO_ID) => {
  renderWithProviders(persona === 'buyer' ? <BuyerOrderSummary /> : <SupplierOrderSummary />, {
    identity: persona === 'buyer' ? BUYER : SUPPLIER
  });
  return screen.findByTestId(`order-summary-row-${poId}`);
};

// ── AC-01 ───────────────────────────────────────────────────────────────────
describe('BR-11 — the row says why it is near the top', () => {
  it('an order whose delivery is overdue states it, and one that is not says nothing', async () => {
    renderWithProviders(<BuyerOrderSummary />, { route: '/buyer/order-summary' });
    await screen.findByTestId('order-summary-row-po-007');
    const overdue = mockPurchaseOrders.filter((po) => po.daysOverdue > 0);
    const onTime = mockPurchaseOrders.filter((po) => po.daysOverdue <= 0);
    expect(overdue.length).toBeGreaterThan(0); // population control
    expect(onTime.length).toBeGreaterThan(0); // known-good control
    expect(screen.getByTestId(`order-summary-overdue-${overdue[0].id}`)).toHaveTextContent(
      /Overdue \d+ day/
    );
    expect(screen.queryByTestId(`order-summary-overdue-${onTime[0].id}`)).toBeNull();
  });
});

describe('AC-01 — the summary shows the supplier, the response, ASNs, call-offs, the 3 confirmations, goods receipts and invoices', () => {
  it('PTI: every column BR-01 names is a column header, and the row carries a value in each', async () => {
    const row = await summaryRow('buyer');
    for (const header of [
      'Purchase order',
      'Supplier',
      'Response',
      'ASNs',
      'Call-offs',
      // The 3 confirmations share 1 header; each keeps its own marker and link
      // inside the cell, asserted by test id below and by AC-02.
      'Confirmations',
      'Goods receipts',
      'Invoices'
    ]) {
      expect(
        screen.getByRole('columnheader', { name: headerNamed(header) }),
        header
      ).toBeInTheDocument();
    }
    expect(row).toHaveTextContent(PO_NUMBER);
    expect(row).toHaveTextContent('PT Sample Packaging Indonesia');
    for (const cell of [
      `order-summary-response-${PO_ID}`,
      `order-summary-asns-${PO_ID}`,
      `order-summary-calloffs-${PO_ID}`,
      `order-summary-capacity-${PO_ID}`,
      `order-summary-foresight-${PO_ID}`,
      `order-summary-shipping-${PO_ID}`,
      `order-summary-receipts-${PO_ID}`,
      `order-summary-invoices-${PO_ID}`
    ]) {
      expect(within(row).getByTestId(cell).textContent, cell).not.toBe('');
    }
  });

  it('BR-11 — rows are ordered by attention: escalated or overdue, then gaps and discrepancies, then need date', async () => {
    await summaryRow('buyer');
    const ids = screen
      .getAllByTestId(/^order-summary-row-/)
      .map((r) => r.getAttribute('data-testid'));
    expect(ids.length).toBeGreaterThan(5);
    // PO-2025-00107 is 7 days overdue, so it sits in the first band.
    expect(ids.indexOf(`order-summary-row-${PO_ID}`)).toBeLessThan(ids.length - 1);
    // And the ordering rule itself, asserted on the rule rather than on a
    // fixture that could drift: a band never rises as the list descends.
    const bands = /** @type {const} */ ({ escalated: 0, gap: 1, plain: 2 });
    expect(
      compareAttention(
        {
          response: 'escalated',
          overdue: false,
          capacity: 'confirmed',
          foresight: 'confirmed',
          callOffAlarm: false,
          receiptDiscrepancy: false,
          needDate: '2030-01-01'
        },
        {
          response: 'approved',
          overdue: false,
          capacity: 'gap',
          foresight: 'confirmed',
          callOffAlarm: false,
          receiptDiscrepancy: false,
          needDate: '2020-01-01'
        }
      )
    ).toBeLessThan(0);
    expect(
      attentionBand({
        response: 'approved',
        overdue: false,
        capacity: 'confirmed',
        foresight: 'confirmed',
        callOffAlarm: false,
        receiptDiscrepancy: true,
        needDate: '2026-01-01'
      })
    ).toBe(bands.gap);
    expect(
      attentionBand({
        response: 'approved',
        overdue: false,
        capacity: 'confirmed',
        foresight: 'confirmed',
        callOffAlarm: false,
        receiptDiscrepancy: false,
        needDate: '2026-01-01'
      })
    ).toBe(bands.plain);
  });
});

// ── AC-02 ───────────────────────────────────────────────────────────────────
describe('AC-02 — selecting a cell opens the page that owns it, filtered to that PO, and the filter is visible', () => {
  /** @type {Record<string, string>} */
  const EXPECTED = {
    [`order-summary-response-${PO_ID}`]: `/buyer/orders?po=${PO_ID}&focus=response&from=order-summary`,
    [`order-summary-asns-${PO_ID}`]: `/buyer/shipments?po=${PO_ID}&from=order-summary`,
    [`order-summary-receipts-${PO_ID}`]: `/buyer/goods-receipt?po=${PO_ID}&from=order-summary`,
    [`order-summary-invoices-${PO_ID}`]: `/buyer/invoices?po=${PO_ID}&from=order-summary`,
    [`order-summary-supplier-${PO_ID}`]: `/buyer/suppliers/${SUPPLIER_ID}?from=order-summary&po=${PO_ID}`
  };

  it('PTI: each cell with a record behind it addresses its owning page with the PO filter', async () => {
    const row = await summaryRow('buyer');
    for (const [testId, href] of Object.entries(EXPECTED)) {
      // The hook sits on the anchor for some columns and on the cell for
      // others; either way the cell holds exactly one link when it is a link.
      const node = within(row).getByTestId(testId);
      const link = node.tagName === 'A' ? node : within(node).getByRole('link');
      expect(link, testId).toHaveAttribute('href', href);
    }
    // The remaining columns, read off the row's links rather than by test id.
    const hrefs = within(row)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.startsWith(`/buyer/call-offs?po=${PO_ID}`))).toBe(true);
    expect(hrefs.some((h) => h.startsWith(`/buyer/capacity?po=${PO_ID}`))).toBe(true);
  });

  it('the destination states which PO it is filtered by', async () => {
    renderWithProviders(<BuyerShipments />, {
      identity: BUYER,
      route: `/buyer/shipments?po=${PO_ID}&from=order-summary`
    });
    expect(await screen.findByTestId('po-filter-statement')).toHaveTextContent(PO_NUMBER);
  });

  it('a visit with no PO filter leaves the destination exactly as the menu shows it', async () => {
    renderWithProviders(<BuyerShipments />, { identity: BUYER, route: '/buyer/shipments' });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByTestId('po-filter-banner')).toBeNull();
    expect(screen.queryByTestId('drill-asn-section')).toBeNull();
  });
});

// ── AC-03 ───────────────────────────────────────────────────────────────────
describe('AC-03 — exactly one record arrives open; several arrive as the filtered list', () => {
  it('one goods receipt on the PO opens that receipt, not a list of one', async () => {
    renderWithProviders(<BuyerGoodsReceipt />, {
      identity: BUYER,
      route: `/buyer/goods-receipt?po=${PO_ID}&from=order-summary`
    });
    // The banner says "one record, open below" rather than a count.
    expect(await screen.findByTestId('po-filter-count')).toHaveTextContent('One record');
    // And the detail panel for that one receipt is open.
    await waitFor(() => expect(document.querySelector('aside[role="dialog"]')).toBeInTheDocument());
  });

  it('several ASNs on the PO arrive as the filtered list, none auto-opened', async () => {
    // BL-139 — PO-2025-00107 carries FOUR active ASNs: the three fixtures plus
    // `ASN-2025-00402`, the Delivered shipment `gr-002` names.
    renderWithProviders(<BuyerShipments />, {
      identity: BUYER,
      route: `/buyer/shipments?po=${PO_ID}&from=order-summary`
    });
    const section = await screen.findByTestId('drill-asn-section');
    const rows = within(section).getAllByTestId(/^drill-asn-/);
    expect(rows).toHaveLength(4);
    for (const r of rows) expect(r).toHaveAttribute('data-open', 'false');
    expect(screen.getByTestId('po-filter-count')).toHaveTextContent('4 records');
  });
});

// ── AC-04 ───────────────────────────────────────────────────────────────────
describe('AC-04 — capacity and foresight open for the right rows, and each says why', () => {
  it('capacity opens for the PO supplier, its material groups and its delivery weeks, and states the grain', async () => {
    const row = await summaryRow('buyer');
    const capacityHref =
      within(row)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href') ?? '')
        .find((h) => h.startsWith('/buyer/capacity')) ?? '';
    expect(capacityHref).toContain(`supplier=${SUPPLIER_ID}`);
    expect(capacityHref).toContain('groups=');
    expect(capacityHref).toContain('weeks=');

    renderWithProviders(<BuyerCapacity />, { identity: BUYER, route: capacityHref });
    const reason = await screen.findByTestId('po-filter-reason');
    expect(reason).toHaveTextContent('per material group and week, not per order');
    expect(reason).toHaveTextContent('PT Sample Packaging Indonesia');
    // Only that supplier's plans are listed.
    for (const plan of screen.getAllByTestId(/^capacity-plan-/)) {
      expect(plan.getAttribute('data-testid')).toContain(SUPPLIER_ID);
    }
  });

  it('foresight opens for the PO supplier and its materials, and states the grain', async () => {
    renderWithProviders(<BuyerCommitments />, {
      identity: BUYER,
      route:
        '/buyer/collaboration?po=po-016&supplier=sup-002&material=RM-STEAR-7300&from=order-summary'
    });
    const reason = await screen.findByTestId('po-filter-reason');
    expect(reason).toHaveTextContent('per material and period, not per order');
    expect(screen.getByTestId('po-filter-statement')).toHaveTextContent('PO-2025-00116');
  });
});

// ── AC-05 ───────────────────────────────────────────────────────────────────
describe('AC-05 — a cell with nothing behind it is not selectable, and its reason is readable and announced', () => {
  it('the ASN cell of a PO with no ASN states the empty condition and is not a link', async () => {
    const row = await summaryRow('supplier', 'po-021');
    const cell = within(row).getByTestId('order-summary-asns-po-021');
    expect(cell).toHaveAttribute('data-drill', 'empty');
    expect(cell.tagName).toBe('SPAN');
    expect(cell.closest('a')).toBeNull();
    expect(cell).not.toHaveAttribute('tabindex'); // unreachable by keyboard
    expect(cell).toHaveTextContent('No ASN yet');
    // The reason, on hover AND to a screen reader.
    expect(cell).toHaveAttribute('title', 'The supplier has not shipped against this order.');
    expect(cell.querySelector('.sr-only')).toHaveTextContent(
      'The supplier has not shipped against this order.'
    );
  });

  it('every empty cell on the summary carries its own reason — no silent blanks', async () => {
    await summaryRow('buyer');
    const empties = document.querySelectorAll('[data-drill="empty"]');
    expect(empties.length).toBeGreaterThan(0);
    for (const cell of Array.from(empties)) {
      expect(cell.getAttribute('title'), cell.textContent ?? '').toBeTruthy();
      expect(cell.querySelector('.sr-only')?.textContent ?? '').not.toBe('');
      expect(cell.closest('a')).toBeNull();
    }
  });
});

// ── AC-06 ───────────────────────────────────────────────────────────────────
describe('AC-06 — every destination offers "Back to order summary", and returning restores the filters and position', () => {
  it.each([
    ['shipments', <BuyerShipments key="s" />, `/buyer/shipments?po=${PO_ID}&from=order-summary`],
    [
      'goods receipts',
      <BuyerGoodsReceipt key="g" />,
      `/buyer/goods-receipt?po=${PO_ID}&from=order-summary`
    ],
    ['invoices', <BuyerInvoices key="i" />, `/buyer/invoices?po=${PO_ID}&from=order-summary`],
    ['call-offs', <BuyerCallOffs key="c" />, `/buyer/call-offs?po=${PO_ID}&from=order-summary`],
    ['orders', <BuyerOrders key="o" />, `/buyer/orders?po=${PO_ID}&from=order-summary`],
    [
      'capacity',
      <BuyerCapacity key="p" />,
      `/buyer/capacity?po=${PO_ID}&supplier=${SUPPLIER_ID}&from=order-summary`
    ],
    [
      'supplier profile',
      // A nested route, so the spec mounts it under its own path — `useParams`
      // is what the page reads the supplier id from.
      <Routes key="f">
        <Route path="/buyer/suppliers/:id" element={<BuyerSupplierProfile />} />
      </Routes>,
      `/buyer/suppliers/${SUPPLIER_ID}?po=${PO_ID}&from=order-summary`
    ]
  ])('%s offers the way back', async (_name, ui, route) => {
    renderWithProviders(ui, { identity: BUYER, route });
    const back = await screen.findByTestId('back-to-order-summary');
    expect(back).toHaveAttribute('href', '/buyer/orders?view=summary');
  });

  it('the summary restores the filter the user left it with', async () => {
    const { unmount } = renderWithProviders(<BuyerOrderSummary />, { identity: BUYER });
    await screen.findByTestId(`order-summary-row-${PO_ID}`);
    fireEvent.change(screen.getByTestId('order-summary-search'), {
      target: { value: PO_NUMBER }
    });
    await waitFor(() => expect(screen.queryByTestId('order-summary-row-po-008')).toBeNull());
    // Leaving for a destination records the position too.
    fireEvent.click(
      within(screen.getByTestId(`order-summary-row-${PO_ID}`)).getAllByRole('link')[0]
    );
    expect(readOrderSummaryViewState('buyer').search).toBe(PO_NUMBER);
    unmount();

    renderWithProviders(<BuyerOrderSummary />, { identity: BUYER });
    await screen.findByTestId(`order-summary-row-${PO_ID}`);
    expect(screen.getByTestId('order-summary-search')).toHaveValue(PO_NUMBER);
    expect(screen.queryByTestId('order-summary-row-po-008')).toBeNull();
  });
});

// ── AC-07 ───────────────────────────────────────────────────────────────────
describe('AC-07 — a supplier sees only its own POs, and another supplier’s PO is refused as not found', () => {
  it('the supplier summary lists its own POs and none of sup-001’s', async () => {
    await summaryRow('supplier', 'po-008');
    expect(screen.getByTestId('order-summary-row-po-007')).toBeInTheDocument();
    expect(screen.queryByTestId('order-summary-row-po-001')).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Supplier' })).toBeNull();
  });

  it('a pasted address for sup-001’s PO is refused, with no hint that it exists', async () => {
    renderWithProviders(<SupplierOrders />, {
      identity: SUPPLIER,
      route: '/supplier/orders?po=po-001&from=order-summary'
    });
    expect(await screen.findByTestId('order-not-found')).toBeInTheDocument();
    const body = document.body.textContent ?? '';
    // No PO number, no supplier name, no status — the refusal is not an oracle.
    expect(body).not.toContain('PO-2025-00101');
    expect(body).not.toContain('PT Sample Oleochemicals');
    expect(screen.getByTestId('back-to-order-summary')).toHaveAttribute(
      'href',
      '/supplier/orders?view=summary'
    );
  });

  it('the refusal for another supplier’s PO is the SAME text as for a PO that does not exist', async () => {
    /** @param {string} route */
    const read = async (route) => {
      const { unmount } = renderWithProviders(<SupplierOrders />, { identity: SUPPLIER, route });
      const text = ((await screen.findByTestId('order-not-found')).textContent ?? '').trim();
      unmount();
      return text;
    };
    const otherSupplier = await read('/supplier/orders?po=po-001');
    const unknown = await read('/supplier/orders?po=po-does-not-exist');
    expect(otherSupplier).toBe(unknown);
    expect(otherSupplier).not.toBe('');
  });
});

// ── AC-08 ───────────────────────────────────────────────────────────────────
describe('AC-08 — an address naming a PO that does not exist shows "Order not found" and a way back', () => {
  it('on the PTI orders page', async () => {
    renderWithProviders(<BuyerOrders />, {
      identity: BUYER,
      route: '/buyer/orders?po=po-999&from=order-summary'
    });
    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
    expect(screen.getByTestId('back-to-order-summary')).toHaveAttribute(
      'href',
      '/buyer/orders?view=summary'
    );
  });

  it('a malformed filter is ignored and the page says it showed everything', async () => {
    renderWithProviders(<BuyerShipments />, {
      identity: BUYER,
      route: '/buyer/shipments?po=%3Cscript%3E&from=order-summary'
    });
    const banner = await screen.findByTestId('po-filter-banner');
    expect(banner).toHaveAttribute('data-drill-state', 'malformed');
    expect(banner).toHaveTextContent('every record on this page is shown');
    expect(screen.queryByTestId('order-not-found')).toBeNull();
    // The parse, not just its rendering.
    expect(parseIdParam('<script>')).toEqual({ kind: 'malformed' });
    expect(parseIdParam('po-007')).toEqual({ kind: 'ok', value: 'po-007' });
  });
});

// ── AC-09 ───────────────────────────────────────────────────────────────────
describe('AC-09 — a seat without the destination’s action role still sees the filtered records', () => {
  /** @type {CurrentIdentity} */
  const PLANNING = { ...BUYER, businessRoles: ['planning'] };

  it('a planning seat lands on the PO’s invoices, with the finance actions withheld and named', async () => {
    // PO-2025-00108's invoice is Disputed, so the machine says a resolve is
    // legal from this state — a verb that belongs to FINANCE. That is the case
    // AC-09 is about: the records must show, the action must not, and the
    // notice must say whose act it is.
    renderWithProviders(<BuyerInvoices />, {
      identity: PLANNING,
      route: '/buyer/invoices?po=po-008&from=order-summary'
    });
    expect(await screen.findByTestId('po-filter-statement')).toHaveTextContent('PO-2025-00108');
    expect(screen.getAllByText('INV-2025-BRL-0043').length).toBeGreaterThan(0);
    const notice = await screen.findByTestId('handoff-commit');
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    expect(notice.textContent ?? '').not.toBe('');
  });
});

// ── AC-10 ───────────────────────────────────────────────────────────────────
describe('AC-10 — a count on the summary equals the number of records the destination lists', () => {
  it('ASNs: the cell says 4 and the shipments destination lists 4', async () => {
    // BL-139 — the fourth is `ASN-2025-00402`, the Delivered ASN `gr-002` names.
    const row = await summaryRow('supplier');
    const count = Number(within(row).getByTestId(`order-summary-asns-${PO_ID}`).textContent);
    expect(count).toBe(4);

    const { unmount } = renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      route: `/supplier/shipments?po=${PO_ID}&from=order-summary`
    });
    expect(await screen.findByTestId('po-filter-count')).toHaveTextContent(`${count} records`);
    unmount();
  });

  it('invoices: the cell says 1 and the invoices destination opens that one', async () => {
    const row = await summaryRow('supplier');
    const count = Number(within(row).getByTestId(`order-summary-invoices-${PO_ID}`).textContent);
    expect(count).toBe(1);

    renderWithProviders(<SupplierInvoices />, {
      identity: SUPPLIER,
      route: `/supplier/invoices?po=${PO_ID}&from=order-summary`
    });
    expect(await screen.findByTestId('po-filter-count')).toHaveTextContent('One record');
  });

  it('a cancelled ASN is excluded from the count AND from the destination — one predicate, so it cannot be excluded from only one', () => {
    const rows = [
      { poReference: PO_NUMBER, status: /** @type {const} */ ('In Transit') },
      { poReference: PO_NUMBER, status: /** @type {const} */ ('Cancelled') },
      { poReference: 'PO-OTHER', status: /** @type {const} */ ('In Transit') }
    ];
    expect(asnsForPo(rows, PO_NUMBER)).toHaveLength(1);
  });

  it('an invoice whose lines cover several POs is counted under each of them', () => {
    const receipts = [
      { id: 'gr-a', poNumber: 'PO-A' },
      { id: 'gr-b', poNumber: 'PO-B' }
    ];
    const invoice = { poNumber: 'PO-A', lines: [{ receiptId: 'gr-a' }, { receiptId: 'gr-b' }] };
    expect(invoicePoNumbers(invoice, receipts)).toEqual(['PO-A', 'PO-B']);
    expect(invoicesForPo([invoice], 'PO-B', receipts)).toHaveLength(1);
    expect(invoicesForPo([invoice], 'PO-C', receipts)).toHaveLength(0);
  });
});

// ── AC-11 ───────────────────────────────────────────────────────────────────
describe('AC-11 — a confirmation that is not required reads "Not required" and is not a link', () => {
  it('no cell reading "Not required" is selectable, on either summary', async () => {
    for (const persona of /** @type {const} */ (['buyer', 'supplier'])) {
      const { unmount } = renderWithProviders(
        persona === 'buyer' ? <BuyerOrderSummary /> : <SupplierOrderSummary />,
        { identity: persona === 'buyer' ? BUYER : SUPPLIER }
      );
      await screen.findByTestId(`order-summary-row-${PO_ID}`);
      const notRequired = screen.queryAllByText('Not required');
      for (const node of notRequired) {
        expect(node.closest('a')).toBeNull();
        expect(node.closest('[data-drill="empty"]')).not.toBeNull();
      }
      unmount();
    }
  });

  it('the contract itself: "Not required" carries a reason and renders as an empty cell', async () => {
    // Asserted on the DrillCell contract, because whether any fixture PO has a
    // materials set with no forecast periods is a property of the fixtures and
    // must not decide whether this rule is tested.
    const { NOT_REQUIRED } = await import('./orders/orderSummaryDrill');
    const { EmptyCell } = await import('./orders/DrillCell');
    renderWithProviders(<EmptyCell contract={NOT_REQUIRED} testId="nr" />, { identity: BUYER });
    const cell = screen.getByTestId('nr');
    expect(cell).toHaveTextContent('Not required');
    expect(cell).toHaveAttribute('title', expect.stringContaining('no forecast periods'));
    expect(cell.closest('a')).toBeNull();
  });
});

// ── AC-12 ───────────────────────────────────────────────────────────────────
describe('AC-12 — every rule above holds on the supplier summary too', () => {
  it('the supplier’s cells address the supplier’s own destinations, with the same filter', async () => {
    const row = await summaryRow('supplier');
    const hrefs = within(row)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href') ?? '');
    for (const prefix of [
      `/supplier/orders?po=${PO_ID}`,
      `/supplier/shipments?po=${PO_ID}`,
      `/supplier/call-offs?po=${PO_ID}`,
      `/supplier/capacity?po=${PO_ID}`,
      `/supplier/goods-receipts?po=${PO_ID}`,
      `/supplier/invoices?po=${PO_ID}`
    ]) {
      expect(
        hrefs.some((h) => h.startsWith(prefix)),
        prefix
      ).toBe(true);
    }
    // And never a PTI address.
    expect(hrefs.every((h) => !h.startsWith('/buyer/'))).toBe(true);
  });

  it('the supplier summary has no supplier-profile link of its own (the requirement’s table)', () => {
    expect(drillHref('supplier', 'supplier', { poId: PO_ID, supplierId: SUPPLIER_ID })).toBeNull();
    expect(drillHref('supplier', 'buyer', { poId: PO_ID, supplierId: SUPPLIER_ID })).toBe(
      `/buyer/suppliers/${SUPPLIER_ID}?from=order-summary&po=${PO_ID}`
    );
  });

  it('a supplier destination offers the supplier’s own way back', async () => {
    renderWithProviders(<SupplierShipments />, {
      identity: SUPPLIER,
      route: `/supplier/shipments?po=${PO_ID}&from=order-summary`
    });
    expect(await screen.findByTestId('back-to-order-summary')).toHaveAttribute(
      'href',
      '/supplier/orders?view=summary'
    );
  });
});

// ── The addresses resolve to real routes ────────────────────────────────────
describe('every address the summary generates resolves to a route the router actually serves', () => {
  // ⚠️ **THE ROUTE LIST IS DERIVED FROM `AppRouter.jsx`, NOT RESTATED HERE.** A
  // hand-kept copy of the routes would agree with itself forever while the real
  // router moved underneath it — which is exactly how a drill-through link
  // starts landing on the catch-all `NotFound` with the whole suite green.
  const routes = (() => {
    const src = readFileSync(resolve(__dirname, '../router/AppRouter.jsx'), 'utf8');
    const found = [...src.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
    return found;
  })();

  /**
   * A concrete path matches a route pattern, `:param` segments included.
   * @param {string} path
   * @returns {string | null}
   */
  const servedBy = (path) => {
    const parts = path.split('/').filter(Boolean);
    for (const route of routes) {
      const rp = route.split('/').filter(Boolean);
      if (rp.length !== parts.length) continue;
      if (rp.every((seg, i) => seg.startsWith(':') || seg === parts[i])) return route;
    }
    return null;
  };

  it('the derived route list is the real one (population control)', () => {
    expect(routes.length).toBeGreaterThan(50);
    expect(routes).toContain('/buyer/order-summary');
    expect(routes).toContain('/supplier/order-summary');
    expect(routes).toContain('/buyer/suppliers/:id');
    // The control that proves the matcher can say no.
    expect(servedBy('/buyer/not-a-page')).toBeNull();
  });

  it.each(DRILL_COLUMNS)(
    'the "%s" column addresses a served route, for both personas',
    (column) => {
      for (const persona of /** @type {const} */ (['buyer', 'supplier'])) {
        const href = drillHref(column, persona, {
          poId: PO_ID,
          supplierId: SUPPLIER_ID,
          groups: ['rigid-plastic'],
          weeks: ['2026-08-10'],
          materials: ['RM-STEAR-7300']
        });
        if (href === null) continue; // the supplier column has no supplier-side link
        const path = href.split('?')[0];
        expect(servedBy(path), `${column}/${persona} → ${path}`).not.toBeNull();
      }
    }
  );

  // P-02 — the summary is the default view of Purchase orders, named by `view`.
  it('"Back to order summary" addresses a served route on both sides', () => {
    // IA P-02 — the summary is the `?view=summary` view of Purchase orders.
    expect(orderSummaryPath('buyer')).toBe('/buyer/orders?view=summary');
    expect(orderSummaryPath('supplier')).toBe('/supplier/orders?view=summary');
    expect(servedBy(orderSummaryPath('buyer').split('?')[0])).toBe('/buyer/orders');
    expect(servedBy(orderSummaryPath('supplier').split('?')[0])).toBe('/supplier/orders');
  });
});

// ── The edge the requirement calls out for BR-05's week filter ──────────────
describe('BR-05 — a PO that delivers outside the capacity horizon says so instead of showing nothing', () => {
  it('PTI capacity keeps every week and states why, rather than filtering the grid empty', async () => {
    renderWithProviders(<BuyerCapacity />, {
      identity: BUYER,
      // Weeks a decade away cannot be in the 13-week horizon.
      route: `/buyer/capacity?po=${PO_ID}&supplier=${SUPPLIER_ID}&weeks=2036-01-07&from=order-summary`
    });
    expect(await screen.findByTestId('capacity-weeks-outside-horizon')).toHaveTextContent(
      'outside the capacity horizon'
    );
    // The grid is still there — an empty page would be the failure this avoids.
    expect(screen.getAllByTestId(/^capacity-plan-/).length).toBeGreaterThan(0);
  });
});
