// ─────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-D22 — the escalated PO on the screen: the panel offers
// the two acts the ruling names, the dead footer is gone, and recording a
// decision moves the order through the cascade.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { poEscalationStore } from '@services/data/mock/stores/poEscalationStore';
import { isEscalated } from '@services/data/poResponseProjection';
import { SDC_SIMULATED_NOW } from '@services/sdc';
import BuyerOrders from './BuyerOrders';

/** The first sample PO the clock has escalated (awaiting, deadline passed). */
const escalatedPo = () => purchaseOrderStore.all().find((p) => isEscalated(p, SDC_SIMULATED_NOW));

beforeEach(() => {
  purchaseOrderStore.reset();
  poEscalationStore.reset();
});

describe('UCX-P7 — the escalated PO panel', () => {
  it('offers "Ask the supplier to confirm" and "Record the decision", and the dead footer is gone', async () => {
    const po = escalatedPo();
    expect(po).toBeTruthy();
    renderWithProviders(<BuyerOrders />, { route: '/buyer/orders?view=list' });
    const cells = await screen.findAllByText(
      /** @type {any} */ (po).poNumber,
      {},
      { timeout: 15000 }
    );
    fireEvent.click(cells[0]);
    const panel = await screen.findByTestId('po-escalation', {}, { timeout: 8000 });
    expect(within(panel).getByTestId('po-escalation-ask')).toHaveTextContent(
      'Ask the supplier to confirm'
    );
    expect(within(panel).getByTestId('po-escalation-record')).toHaveTextContent(
      'Record the decision'
    );
    expect(within(panel).getByTestId('po-escalation-intro')).toHaveTextContent(
      /The supplier has not answered by/
    );
    // UCX-F1 — the two footer buttons with no handler are gone.
    expect(screen.queryByText('View Full Details')).toBeNull();
  });

  it('the ask records itself and moves nothing', async () => {
    const po = escalatedPo();
    renderWithProviders(<BuyerOrders />, { route: '/buyer/orders?view=list' });
    const cells = await screen.findAllByText(
      /** @type {any} */ (po).poNumber,
      {},
      { timeout: 15000 }
    );
    fireEvent.click(cells[0]);
    const panel = await screen.findByTestId('po-escalation', {}, { timeout: 8000 });
    const before = /** @type {any} */ (po).status;
    fireEvent.click(within(panel).getByTestId('po-escalation-ask'));
    await waitFor(() =>
      expect(poEscalationStore.forPo(/** @type {any} */ (po).id)).toHaveLength(1)
    );
    expect(poEscalationStore.latestForPo(/** @type {any} */ (po).id)?.kind).toBe('ask');
    expect(purchaseOrderStore.get(/** @type {any} */ (po).id)?.status).toBe(before);
  });

  it('recording "sourcing elsewhere" takes the order to Rejected', async () => {
    const po = escalatedPo();
    renderWithProviders(<BuyerOrders />, { route: '/buyer/orders?view=list' });
    const cells = await screen.findAllByText(
      /** @type {any} */ (po).poNumber,
      {},
      { timeout: 15000 }
    );
    fireEvent.click(cells[0]);
    const panel = await screen.findByTestId('po-escalation', {}, { timeout: 8000 });
    fireEvent.change(within(panel).getByTestId('po-escalation-decision'), {
      target: { value: 'sourcingElsewhere' }
    });
    fireEvent.click(within(panel).getByTestId('po-escalation-record'));
    await waitFor(() =>
      expect(purchaseOrderStore.get(/** @type {any} */ (po).id)?.status).toBe('Rejected')
    );
    expect(poEscalationStore.latestForPo(/** @type {any} */ (po).id)?.decision).toBe(
      'sourcingElsewhere'
    );
  });
});
