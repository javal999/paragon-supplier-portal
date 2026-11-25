import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { setHubRole } from '@components/layout-v2/hubRole';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import BuyerHome from '../BuyerHome';
import SupplierHome from '../SupplierHome';
import BuyerSourcing from '../BuyerSourcing';
import BuyerGoodsReceipt from '../BuyerGoodsReceipt';
import BuyerShipments from '../BuyerShipments';
import BuyerRequisitions from '../BuyerRequisitions';
import BuyerCompliance from '../BuyerCompliance';
import BuyerCallOffs from '../BuyerCallOffs';
import SupplierDocuments from '../SupplierDocuments';
import SupplierCallOffs from '../SupplierCallOffs';

// ─────────────────────────────────────────────────────────────────────────────
// IA evaluation 2026-10, P-03 and P-08 — every My tasks / To do item lands
// where its count is. Each case reads the count off the Home row, follows the
// row's own link, and counts the rows the destination shows under that link:
// the two numbers must be equal. A count of one opens the record.
// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => setHubRole('ALL'));

const Probe = () => {
  const l = useLocation();
  return <output data-testid="probe">{l.pathname + l.search}</output>;
};

/**
 * Renders a Home, waits for one task row, and follows its link.
 * @param {'buyer' | 'supplier'} persona
 * @param {string} taskId
 * @returns {Promise<{ count: number; to: string }>}
 */
async function follow(persona, taskId) {
  const route = `/${persona}/home`;
  const Home = persona === 'buyer' ? BuyerHome : SupplierHome;
  const { unmount } = renderWithProviders(
    <Routes>
      <Route path={route} element={<Home />} />
      <Route path="*" element={<Probe />} />
    </Routes>,
    { identity: persona === 'buyer' ? BUYER : SUPPLIER, route }
  );
  const row = await screen.findByTestId(`home-task-${taskId}`, {}, { timeout: 8000 });
  const count = Number(/^\s*(\d+)/.exec(row.textContent ?? '')?.[1]);
  fireEvent.click(row);
  const to = screen.getByTestId('probe').textContent ?? '';
  unmount();
  return { count, to };
}

/**
 * Renders a destination page at a URL.
 * @param {React.ReactElement} page
 * @param {string} path  The route pattern.
 * @param {string} at  The URL.
 * @param {'buyer' | 'supplier'} [persona]
 */
const land = (page, path, at, persona = 'buyer') =>
  renderWithProviders(
    <Routes>
      <Route path={path} element={page} />
    </Routes>,
    { identity: persona === 'buyer' ? BUYER : SUPPLIER, route: at }
  );

/** @param {string} name */
const selectedTab = (name) => {
  const tab = screen.getByRole('tab', { selected: true });
  expect(tab).toHaveTextContent(name);
  return tab;
};

describe('P-08 (IA-B03) — "RFQ ready to award" and the board tile count the same RFQs', () => {
  it('the task opens the board on the Ready to award tile, and the rows equal the count', async () => {
    const { count, to } = await follow('buyer', 'rfq-award');
    expect(to).toBe('/buyer/rfq?kpi=ready');
    expect(count).toBeGreaterThan(1);
    land(<BuyerSourcing />, '/buyer/rfq', to);
    const rows = await screen.findAllByTestId(/^rfq-next-/, {}, { timeout: 8000 });
    expect(rows).toHaveLength(count);
    // No status tab reads as selected while a tile filters.
    expect(screen.queryByRole('tab', { selected: true })).toBeNull();
  });
});

describe('P-08 — "Negotiation rounds closing soon" lands on the RFQ holding them', () => {
  it('one round opens its RFQ at the rounds section', async () => {
    const { count, to } = await follow('buyer', 'negotiation-closing');
    expect(count).toBe(1);
    expect(to).toMatch(/^\/buyer\/rfq\/rfq-[\w-]+\?section=rounds$/);
  });

  it('the board view `?view=roundsClosing` shows exactly the RFQs holding such a round', async () => {
    land(<BuyerSourcing />, '/buyer/rfq', '/buyer/rfq?view=roundsClosing');
    expect(await screen.findByTestId('rfq-board-rounds-closing')).toBeInTheDocument();
    const rows = await screen.findAllByTestId(/^rfq-next-/, {}, { timeout: 8000 });
    expect(rows.map((r) => r.dataset.testid)).toEqual(['rfq-next-rfq-014']);
    // One click leaves the view for the default tab.
    fireEvent.click(screen.getByRole('button', { name: 'Show all RFQs' }));
    expect(screen.queryByTestId('rfq-board-rounds-closing')).toBeNull();
    selectedTab('Needs my action');
  });
});

describe('P-08 (IA-B08) — goods receipts and inbound shipments', () => {
  it('"Goods receipts to review" opens the Needs action tab, which holds exactly the count', async () => {
    const { count, to } = await follow('buyer', 'receipts');
    expect(to).toBe('/buyer/goods-receipt?tab=action');
    land(<BuyerGoodsReceipt />, '/buyer/goods-receipt', to);
    await waitFor(() => selectedTab('Needs action'), { timeout: 8000 });
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(String(count));
  });

  it('`?open=<id>` opens that receipt, as a count of one does', async () => {
    const gr = goodsReceiptStore.all()[0];
    land(<BuyerGoodsReceipt />, '/buyer/goods-receipt', `/buyer/goods-receipt?open=${gr.id}`);
    const panel = await screen.findByRole('dialog', {}, { timeout: 8000 });
    expect(panel).toHaveTextContent(gr.grNumber);
  });

  it('"Disputed receipt discrepancies" lands on the disputes section', async () => {
    const { count, to } = await follow('buyer', 'disputed-receipts');
    expect(count).toBe(1);
    expect(to).toBe('/buyer/goods-receipt?section=disputes');
  });

  it('"Inbound shipments to receive" lists exactly the ASNs it counts', async () => {
    const { count, to } = await follow('buyer', 'inbound-asn');
    expect(to).toBe('/buyer/shipments?asns=toReceive');
    land(<BuyerShipments />, '/buyer/shipments', to);
    const section = await screen.findByTestId('asns-to-receive', {}, { timeout: 8000 });
    expect(within(section).getByRole('heading', { name: 'ASNs to receive' })).toBeInTheDocument();
    expect(within(section).getAllByTestId(/^drill-asn-ASN-/)).toHaveLength(count);
  });

  it('a plain visit from the menu shows no ASN section', async () => {
    land(<BuyerShipments />, '/buyer/shipments', '/buyer/shipments');
    await screen.findByRole('heading', { name: 'Shipments & ASN' }, { timeout: 8000 });
    expect(screen.queryByTestId('asns-to-receive')).toBeNull();
  });
});

describe('P-03 (IA-B01, IA-B02) — Procurement tasks for requisitions and declared certificates', () => {
  it('"Requisitions to approve" opens the one requisition it counts', async () => {
    const { count, to } = await follow('buyer', 'requisitions-to-approve');
    expect(count).toBe(1);
    expect(to).toMatch(/^\/buyer\/purchase-requisition\?open=pr-\d+$/);
  });

  it('`?status=Pending Approval` opens the tab that holds every requisition awaiting approval', async () => {
    land(
      <BuyerRequisitions />,
      '/buyer/purchase-requisition',
      '/buyer/purchase-requisition?status=Pending+Approval'
    );
    await waitFor(() => selectedTab('Pending'), { timeout: 8000 });
  });

  it('"Declared certificates to review" lands on the review queue, which lists the count', async () => {
    const { count, to } = await follow('buyer', 'certs-to-review');
    expect(to).toBe('/buyer/compliance?section=review');
    land(<BuyerCompliance />, '/buyer/compliance', to);
    const queue = await screen.findByTestId('doc-review-queue', {}, { timeout: 8000 });
    expect(within(queue).getAllByTestId(/^doc-review-doc-/)).toHaveLength(count);
  });

  it('both are Procurement tasks: a Material Planner is not handed them', async () => {
    setHubRole('MP');
    renderWithProviders(<BuyerHome />, { identity: BUYER, route: '/buyer/home' });
    const tasks = await screen.findByTestId('home-tasks');
    await within(tasks).findByTestId('home-task-receipts', {}, { timeout: 8000 });
    expect(within(tasks).queryByTestId('home-task-requisitions-to-approve')).toBeNull();
    expect(within(tasks).queryByTestId('home-task-certs-to-review')).toBeNull();
  });

  it('the labels exist in Indonesian too', async () => {
    const { hubId } = await import('@lib/i18n/hub');
    expect(hubId['hub.home.task.requisitionsToApprove']).toBe(
      'Permintaan pembelian untuk disetujui'
    );
    expect(hubId['hub.home.task.certsToReview']).toBe(
      'Sertifikat yang dideklarasikan untuk ditinjau'
    );
    expect(hubId['hub.home.task.sup.docsRequested']).toBe('Dokumen yang diminta PTI');
  });
});

describe('P-05 / P-02 — follow-ups and the order summary view', () => {
  it('the chase task opens the follow-up tab of Supplier follow-ups', async () => {
    const { to } = await follow('buyer', 'chase');
    expect(to).toBe('/buyer/comm-hub?tab=follow-up');
  });

  it("the supplier's shipping-notice task opens the Purchase orders summary view", async () => {
    const { to } = await follow('supplier', 'shipping-notice');
    expect(to).toBe('/supplier/orders?view=summary');
  });
});

describe('P-03 (IA-S02) — the supplier To do names the documents PTI asked for', () => {
  /** @param {string} at */
  const shownOf = async (at) => {
    land(<SupplierDocuments />, '/supplier/documents', at, 'supplier');
    const line = await screen.findByText(/^\d+ of \d+ documents$/, {}, { timeout: 8000 });
    return Number(/^(\d+)/.exec(line.textContent ?? '')?.[1]);
  };

  it('"Documents PTI asked for" lands on the Requested by PTI filter, which shows the count', async () => {
    const { count, to } = await follow('supplier', 'docs-requested');
    expect(to).toBe('/supplier/documents?status=awaiting-upload');
    expect(await shownOf(to)).toBe(count);
  });

  it('the task sits in the lane the page uses for documents', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER, route: '/supplier/home' });
    const lane = await screen.findByTestId('home-lane-money', {}, { timeout: 8000 });
    expect(
      await within(lane).findByTestId('home-task-docs-requested', {}, { timeout: 8000 })
    ).toHaveTextContent('Documents PTI asked for');
  });

  it('`?expiry=due` holds every expired and expiring certificate; the old `expiry` values still work', async () => {
    const due = await shownOf('/supplier/documents?expiry=due');
    document.body.innerHTML = '';
    const expired = await shownOf('/supplier/documents?expiry=expired');
    document.body.innerHTML = '';
    const expiring = await shownOf('/supplier/documents?expiry=expiring');
    expect(due).toBe(expired + expiring);
    expect(due).toBeGreaterThan(0);
  });
});

describe('AIB-3 (BL-351) — the missing-ASN chase', () => {
  it('the planner task opens the Missing ASN tab, which lists exactly the count', async () => {
    const { count, to } = await follow('buyer', 'calloffs-missing-asn');
    expect(count).toBeGreaterThan(0);
    expect(to).toBe('/buyer/call-offs?tab=chase');
    land(<BuyerCallOffs />, '/buyer/call-offs', to);
    await screen.findByTestId('calloff-chase', {}, { timeout: 8000 });
    expect(screen.getAllByTestId(/^calloff-chase-row-/)).toHaveLength(count);
  });

  it("the supplier's task opens the missing-ASN filter, which lists exactly the count (UCX-P1)", async () => {
    const { count, to } = await follow('supplier', 'calloffs-missing-asn');
    expect(count).toBeGreaterThan(0);
    expect(to).toBe('/supplier/call-offs?status=missingAsn');
    land(<SupplierCallOffs />, '/supplier/call-offs', to, 'supplier');
    const rows = await screen.findAllByTestId(/^supplier-calloff-row-/, {}, { timeout: 8000 });
    expect(rows).toHaveLength(count);
  });

  it('`?callOff=<id>` opens that call-off panel, as a count of one does (UCX-P1)', async () => {
    const waiting = callOffStore
      .all()
      .find((c) => c.supplierId === SUPPLIER.supplierId && c.status === 'Awaiting Confirmation');
    expect(waiting).toBeTruthy();
    land(
      <SupplierCallOffs />,
      '/supplier/call-offs',
      waiting ? `/supplier/call-offs?callOff=${waiting.id}` : '/supplier/call-offs',
      'supplier'
    );
    const panel = await screen.findByRole('dialog', {}, { timeout: 8000 });
    expect(panel).toHaveTextContent(waiting?.callOffNumber ?? '');
  });
});
