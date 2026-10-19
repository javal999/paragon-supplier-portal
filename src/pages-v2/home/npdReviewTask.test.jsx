import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerHome from '../BuyerHome';
import BuyerSafetyStock from '../BuyerSafetyStock';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { npdTagStore } from '@services/data/mock/stores/npdTagStore';
import { osipLevelStore } from '@services/data/mock/stores/osipLevelStore';
import { observeNpdTags } from '@services/data/mock/osipRopReadModel';
import { setHubRole } from '@components/layout-v2/hubRole';

// ─────────────────────────────────────────────────────────────────────────────
// DRC-12a (BL-198) — when a material's NPD tag drops, the planner's Home shows
// "Review ROP after first order", rated by `withSeverity` (no deadline is
// recorded, so it is the grey "due soon"), and it deep-links to the material
// on Safety stock targets. RM-STEAR-7300's first order (PO-2025-00116) is
// 8,000 of 15,000 KG received on the sample data; the rest drops the tag.
// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  goodsReceiptStore.reset();
  npdTagStore.reset();
  osipLevelStore.reset();
  setHubRole('ALL');
});

const dropRmStearTag = () => {
  observeNpdTags(); // the baseline: NPD
  goodsReceiptStore.add({
    id: 'gr-home-npd',
    grNumber: 'GR-2026-HOME',
    asnId: 'asn-home',
    asnNumber: 'ASN-HOME',
    poNumber: 'PO-2025-00116',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    receivedDate: '2026-08-28',
    receivedBy: 'Warehouse Supervisor',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic acid',
        qtyExpected: 7000,
        qtyReceived: 7000,
        qtyAccepted: 7000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass'
      }
    ],
    disposition: 'Accept'
  });
  observeNpdTags(); // the drop
};

const renderHome = () =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/home" element={<BuyerHome />} />
      <Route path="/buyer/safety-stock" element={<BuyerSafetyStock />} />
    </Routes>,
    { identity: BUYER, route: '/buyer/home' }
  );

describe('BL-198 — the "Review ROP after first order" Home task', () => {
  it('appears once the tag drops, says the review uses CO and IR, carries a computed severity, and opens the material', async () => {
    dropRmStearTag();
    renderHome();
    const tasks = await screen.findByTestId('home-tasks');
    const task = await within(tasks).findByTestId(
      'home-task-npd-rop-review',
      {},
      { timeout: 4000 }
    );
    expect(task).toHaveTextContent('Review ROP after first order');
    expect(task).toHaveTextContent('CO and IR');
    expect(task).toHaveTextContent(/^1/);
    // No deadline is recorded: the computed grey "due soon" row.
    expect(within(task).getByTestId('home-task-detail-npd-rop-review')).toHaveTextContent(
      'No deadline'
    );
    fireEvent.click(task);
    expect(await screen.findByTestId('sst-rop-detail', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByTestId('sst-rop-detail-npd-basis')).toHaveTextContent(
      'First order fully received'
    );
  });

  it('is absent while no tag has dropped', async () => {
    observeNpdTags();
    renderHome();
    const tasks = await screen.findByTestId('home-tasks');
    // A task from a read that resolves alongside: the list is loaded.
    await within(tasks).findByTestId('home-task-inventory-high-alerts', {}, { timeout: 4000 });
    expect(within(tasks).queryByTestId('home-task-npd-rop-review')).toBeNull();
  });
});
