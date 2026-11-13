import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from '../FixedStockReconcile';
import { poOnHoldStore } from '@services/data/mock/stores/poOnHoldStore';
import { poCancellationStore } from '@services/data/mock/stores/poCancellationStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';

// PEX-12 [Proposed] — the read-only recommended action and the PO cancellation
// request on the PO On Hold line (planner and supplier seat sup-007).
const K = 'sup-007|PK-PETB-8801';

beforeEach(() => {
  poOnHoldStore.reset();
  poCancellationStore.reset();
  osipParamStore.reset();
});

describe('PO On Hold — recommended action', () => {
  it('reads "Manual: no threshold set" for the planner and the supplier, and runs nothing', async () => {
    const planner = renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    const rec = screen.getByTestId(`poh-rec-${K}`);
    expect(rec).toHaveAttribute('data-action', 'manual');
    expect(rec).toHaveTextContent('Manual: no threshold set');
    expect(rec).toHaveTextContent('Proposed');
    planner.unmount();
    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    expect(screen.getByTestId(`poh-rec-${K}`)).toHaveTextContent('Manual: no threshold set');
  });

  it('the planner sets a class threshold from the line and the reason changes', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    fireEvent.click(screen.getByTestId(`poh-settings-edit-${K}`));
    fireEvent.change(screen.getByTestId(`poh-carrymax-input-${K}`), { target: { value: '100' } });
    fireEvent.click(screen.getByTestId(`poh-settings-save-${K}`));
    await waitFor(() =>
      expect(
        osipParamStore.all().some((r) => r.param === 'autoCarryMaxPct' && r.value === 100)
      ).toBe(true)
    );
    await waitFor(() =>
      expect(screen.getByTestId(`poh-rec-${K}`)).not.toHaveTextContent('no threshold set')
    );
    expect(poOnHoldStore.executions()).toHaveLength(0);
  });

  it('refuses a threshold above 100 before it reaches the verb', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    fireEvent.click(screen.getByTestId(`poh-settings-edit-${K}`));
    fireEvent.change(screen.getByTestId(`poh-absorbmax-input-${K}`), { target: { value: '101' } });
    expect(screen.getByTestId(`poh-settings-save-${K}`)).toBeDisabled();
  });
});

describe('PO On Hold — PO cancellation request', () => {
  it('the planner requests, the supplier acknowledges; the UI says request only, not sent to SAP', async () => {
    const planner = renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    expect(screen.getByTestId(`poh-cancel-${K}`)).toHaveTextContent('not sent to SAP');
    fireEvent.click(
      within(screen.getByTestId(`poh-row-${K}`)).getAllByTestId(/^poh-cancel-open-/)[0]
    );
    fireEvent.change(
      within(screen.getByTestId(`poh-row-${K}`)).getAllByTestId(/^poh-cancel-reason-/)[0],
      {
        target: { value: 'Demand dropped for good' }
      }
    );
    fireEvent.click(
      within(screen.getByTestId(`poh-row-${K}`)).getAllByTestId(/^poh-cancel-send-/)[0]
    );
    await waitFor(() => expect(poCancellationStore.all()).toHaveLength(1));
    planner.unmount();

    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    const ack = (await screen.findAllByTestId(/^poh-cancel-ack-/))[0];
    fireEvent.click(ack);
    await waitFor(() => expect(poCancellationStore.all()[0].state).toBe('Acknowledged'));
    await screen.findAllByTestId(/^poh-cancel-acked-/);
  });
});
