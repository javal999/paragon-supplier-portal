// ─────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-F16, UCX-D16 — the counter-offer and call-off approval
// panels show what decides the decision: the pair's open balance and its cover
// against the lead time. After an accepted counter-offer the panel prompts the
// SAP change. The CR-05 tolerance specs are untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { formatNumber } from '@lib/format';
import { POStatus } from '@services/data/types';
import BuyerOrders from './BuyerOrders';
import BuyerCallOffs from './BuyerCallOffs';

const SCOPE = {
  personaType: /** @type {'buyer'} */ ('buyer'),
  supplierId: null,
  businessRoles: SEEDED_SEAT_ROLES.buyer
};

/** The expected open-balance and cover lines for a pair, read from the same reads. */
/**
 * @param {string} supplierId
 * @param {string} materialCode
 */
const expectedFacts = async (supplierId, materialCode) => {
  const rows = (await mockDataService.procurement.getFixedStockReconcile(SCOPE)).items;
  const row = rows.find((r) => r.supplierId === supplierId && r.materialCode === materialCode);
  const positions = (await mockDataService.procurement.getInventory(SCOPE)).items;
  const p = positions.find((x) => x.supplierId === supplierId && x.materialCode === materialCode);
  const cover =
    p && p.ptiSoh !== null && p.avgDailyDemand !== null && p.avgDailyDemand > 0
      ? Math.round(p.ptiSoh / p.avgDailyDemand)
      : null;
  return {
    open: row
      ? `Open balance: ${formatNumber(row.notYetCalledOff)} ${row.uom} not yet called off`
      : 'Open balance: nothing on record',
    cover:
      cover !== null && p?.leadTimeDays !== null && p?.leadTimeDays !== undefined
        ? `Cover: ${cover} days against a ${p.leadTimeDays}-day lead time`
        : 'Cover: not on record'
  };
};

beforeEach(() => {
  purchaseOrderStore.reset();
});

/** Arrange po-008 into an adjusted PO with a counter-offer (the OrderCollaboration precedent). */
const adjustPo008 = () =>
  purchaseOrderStore.update('po-008', (po) => ({
    ...po,
    status: POStatus.ADJUSTED,
    response: {
      option: 'adjust',
      respondedAt: '2025-04-03T05:00:00.000Z',
      lines: [
        {
          lineId: 'li-008a',
          reasonCode: 'material',
          counterQty: 100000,
          counterDate: '2025-05-02'
        }
      ]
    }
  }));

describe('UCX-P7 — the counter-offer panel shows what decides it', () => {
  it(
    'shows the open balance and the cover, and prompts the SAP change after Accept',
    { timeout: 30000 },
    async () => {
      adjustPo008();
      const po = purchaseOrderStore.get('po-008');
      expect(po).toBeTruthy();
      const material = /** @type {any} */ (po).lineItems[0].materialCode;
      const facts = await expectedFacts(/** @type {any} */ (po).supplierId, material);
      renderWithProviders(<BuyerOrders />, {
        identity: BUYER,
        route: '/buyer/orders?view=list'
      });
      const cells = await screen.findAllByText(
        /** @type {any} */ (po).poNumber,
        {},
        { timeout: 15000 }
      );
      fireEvent.click(cells[0]);
      const section = await screen.findByTestId('po-counter-review', {}, { timeout: 8000 });
      const panel = within(section);
      expect(panel.getByTestId('po-counter-facts')).toHaveTextContent(facts.open);
      expect(panel.getByTestId('po-counter-facts')).toHaveTextContent(facts.cover);
      // UCX-D16 — CR-05 unchanged; the panel prompts the SAP change after Accept.
      expect(panel.queryByTestId('po-accept-sap-prompt')).toBeNull();
      fireEvent.click(panel.getByRole('button', { name: 'Accept counter-offer' }));
      await waitFor(() => expect(purchaseOrderStore.get('po-008')?.status).toBe('Confirmed'), {
        timeout: 8000
      });
      // The prompt lives in the panel body: the accepted move unmounts the review section.
      await waitFor(
        () =>
          expect(screen.getByTestId('po-accept-sap-prompt')).toHaveTextContent(
            'Change the PO in SAP'
          ),
        { timeout: 8000 }
      );
    }
  );
});

describe('UCX-P7 — the call-off approval panel shows what decides it', () => {
  it('shows the open balance and the cover beside the review', { timeout: 30000 }, async () => {
    renderWithProviders(<BuyerCallOffs />, {
      identity: BUYER,
      route: '/buyer/call-offs?status=awaitingApproval'
    });
    const rows = await screen.findAllByTestId(/^calloff-row-/, {}, { timeout: 15000 });
    expect(rows.length).toBeGreaterThan(0);
    fireEvent.click(within(rows[0]).getByRole('button', { name: /Review/ }));
    const review = await screen.findByTestId('calloff-review', {}, { timeout: 8000 });
    const facts = within(review).getByTestId('calloff-review-facts');
    expect(facts).toHaveTextContent(/^.*Open balance: .*/);
    expect(facts).toHaveTextContent(/Cover: /);
  });
});
