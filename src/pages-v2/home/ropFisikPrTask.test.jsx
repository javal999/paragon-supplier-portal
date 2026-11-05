import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerHome from '../BuyerHome';
import BuyerOrderPlan from '../BuyerOrderPlan';
import { applyPtiStockRefresh } from '@services/data/mock/MockCommandService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { ptiStockStore } from '@services/data/mock/stores/ptiStockStore';
import { callOffTriggerStore } from '@services/data/mock/stores/callOffTriggerStore';
import { POStatus } from '@services/data/types';
import { setHubRole } from '@components/layout-v2/hubRole';

// ─────────────────────────────────────────────────────────────────────────────
// BL-199 (DRC-13 BR-02) — when PTI SOH reaches ROP Fisik and no umbrella PO
// balance is left, the planner's Home shows ONE "Create a PR in SAP" task,
// rated by `withSeverity`, and it opens What to order, where the
// recommendation sits beside CAP-12's "New PO needed". RM-STEAR-7300 on the
// sample data: ROP Fisik 1,275, Max 1,400; with its only blanket PO
// (PO-2025-00116) closed, an SOH of 1,010 needs a PR for 390 KG.
// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  callOffStore.reset();
  purchaseOrderStore.reset();
  ptiStockStore.reset();
  callOffTriggerStore.reset();
  setHubRole('ALL');
});

const noBalanceAtRopFisik = () => {
  const po = purchaseOrderStore.all().find((p) => p.poNumber === 'PO-2025-00116');
  if (!po) throw new Error('PO-2025-00116 missing from the seed');
  purchaseOrderStore.update(po.id, (p) => ({ ...p, status: POStatus.CLOSED }));
  applyPtiStockRefresh([{ materialCode: 'RM-STEAR-7300', plant: 'J6', ptiSoh: 1010 }]);
  // A second update while still low: still one recommendation, one task. The
  // trigger recommends again on every check [Owner FSR-D6, BL-261], so the
  // open recommendation is the latest check's room: 1,400 − 990 = 410 KG.
  applyPtiStockRefresh([{ materialCode: 'RM-STEAR-7300', plant: 'J6', ptiSoh: 990 }]);
};

const renderHome = () =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/home" element={<BuyerHome />} />
      <Route path="/buyer/order-plan" element={<BuyerOrderPlan />} />
    </Routes>,
    { identity: BUYER, route: '/buyer/home' }
  );

describe('BL-199 — the "Create a PR in SAP" Home task and What to order', () => {
  it('shows one task with a computed severity, and opens the recommendation on What to order', async () => {
    noBalanceAtRopFisik();
    renderHome();
    const tasks = await screen.findByTestId('home-tasks');
    const task = await within(tasks).findByTestId('home-task-rop-fisik-pr', {}, { timeout: 4000 });
    expect(within(tasks).getAllByTestId('home-task-rop-fisik-pr')).toHaveLength(1);
    expect(task).toHaveTextContent('Create a PR in SAP');
    expect(task).toHaveTextContent(/^1/);
    // Rated from its cover against the lead time, not assigned by type: 990 KG
    // at 420 KG a day of ROP Fisik demand is 2 days, inside a 49-day lead time.
    const detail = within(task).getByTestId('home-task-detail-rop-fisik-pr');
    expect(detail).toHaveTextContent('2 days');
    expect(detail).toHaveTextContent('49 days');
    fireEvent.click(task);
    const section = await screen.findByTestId('op-rop-fisik-pr', {}, { timeout: 8000 });
    // FSR-D1 (BL-237): the trigger's figures are the hub sample, the plan of record.
    expect(within(section).getByTestId('basis-line')).toHaveAttribute(
      'data-standing',
      'planOfRecord'
    );
    const row = within(section).getByTestId('op-rop-fisik-pr-RM-STEAR-7300');
    expect(row).toHaveTextContent('Create a PR in SAP for 410 KG');
    expect(row).toHaveTextContent('990');
    expect(row).toHaveTextContent('1,275');
    expect(row).toHaveTextContent('1,400');
    expect(within(section).getByTestId('op-rop-fisik-pr-provisional')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (F1, B8, B9, F2; MPQ = order multiple until master data)'
    );
    expect(within(section).getByTestId('op-rop-fisik-pr-refresh')).toHaveTextContent(
      'eWM feed not connected'
    );
    expect(section).toHaveTextContent('The hub posts nothing to SAP.');
  });

  it('is absent while a blanket line still has balance (a draft is made instead)', async () => {
    applyPtiStockRefresh([{ materialCode: 'RM-STEAR-7300', plant: 'J6', ptiSoh: 1010 }]);
    renderHome();
    const tasks = await screen.findByTestId('home-tasks');
    // A task from a read that resolves alongside: the list is loaded.
    await within(tasks).findByTestId('home-task-inventory-high-alerts', {}, { timeout: 4000 });
    expect(within(tasks).queryByTestId('home-task-rop-fisik-pr')).toBeNull();
  });
});
