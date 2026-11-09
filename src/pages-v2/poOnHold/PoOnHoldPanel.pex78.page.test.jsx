import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from '../FixedStockReconcile';
import { poOnHoldStore } from '@services/data/mock/stores/poOnHoldStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';

// PEX-7 / PEX-8 — the PO On Hold panel on the Feedstock reconcile page, for the
// planner and the supplier seat (sup-007), on the sample data (hub day 2026-08-31).
const K = 'sup-007|PK-PETB-8801';

beforeEach(() => {
  poOnHoldStore.reset();
  osipParamStore.reset();
});

describe('PO On Hold — planner', () => {
  it('lists the line with OSPO, DA not yet called off, the quantity and "decision due"', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    expect(screen.getByTestId(`poh-qty-${K}`)).toHaveTextContent('117,700');
    expect(screen.getByTestId(`poh-due-${K}`)).toHaveTextContent(/Decision due/);
    expect(screen.getByTestId(`poh-left-${K}`)).toHaveTextContent('14 working days left');
    // The hub's pre-selection follows the conditions: demand above 0 → FS + spread.
    expect(screen.getByTestId(`poh-option-fsSpread-${K}`)).toBeChecked();
    // What the hub does not hold is said, not guessed.
    expect(screen.getByTestId(`poh-fact-pipo-${K}`)).toBeInTheDocument();
    expect(screen.getByTestId(`poh-fact-maxpti-${K}`)).toBeInTheDocument();
  });

  it('sends a suggestion; the line then waits for the supplier', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    fireEvent.click(screen.getByTestId(`poh-option-fsOnly-${K}`));
    fireEvent.click(screen.getByTestId(`poh-suggest-send-${K}`));
    await waitFor(() =>
      expect(screen.getByTestId(`poh-status-${K}`)).toHaveAttribute(
        'data-status',
        'awaitingSupplier'
      )
    );
    expect(screen.getByTestId(`poh-status-${K}`)).toHaveTextContent(
      'Suggested: Feedstock (FS) only'
    );
  });

  it('BR-04: edits the grace period of one pair', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    fireEvent.click(screen.getByTestId(`poh-settings-edit-${K}`));
    fireEvent.change(screen.getByTestId(`poh-grace-input-${K}`), { target: { value: '21' } });
    fireEvent.click(screen.getByTestId(`poh-settings-save-${K}`));
    await waitFor(() =>
      expect(screen.getByTestId(`poh-left-${K}`)).toHaveTextContent('21 working days left')
    );
    expect(osipParamStore.valueOf(`grace|${K}`)).toBe(21);
  });

  it('refuses a fractional period before it reaches the verb', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    fireEvent.click(screen.getByTestId(`poh-settings-edit-${K}`));
    fireEvent.change(screen.getByTestId(`poh-grace-input-${K}`), { target: { value: '2.5' } });
    expect(screen.getByTestId(`poh-settings-save-${K}`)).toBeDisabled();
  });
});

describe('PO On Hold — supplier', () => {
  it('sees its own lines only, and waits for PTI’s suggestion before it can choose', async () => {
    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    expect(screen.queryByTestId('poh-row-sup-002|RM-MYRST-7310')).toBeNull();
    expect(screen.queryByTestId(`poh-suggest-send-${K}`)).toBeNull();
    expect(screen.getByTestId(`poh-row-${K}`)).toHaveTextContent('Waiting for PTI’s suggestion');
  });

  it('chooses the final option once PTI has suggested; the line then shows the choice and fulfil-by', async () => {
    const planner = renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`poh-row-${K}`);
    fireEvent.click(screen.getByTestId(`poh-suggest-send-${K}`));
    await waitFor(() =>
      expect(screen.getByTestId(`poh-status-${K}`)).toHaveAttribute(
        'data-status',
        'awaitingSupplier'
      )
    );
    planner.unmount();

    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    await screen.findByTestId(`poh-choose-send-${K}`);
    fireEvent.click(screen.getByTestId(`poh-option-fsOnly-${K}`));
    fireEvent.click(screen.getByTestId(`poh-choose-send-${K}`));
    await waitFor(() =>
      expect(screen.getByTestId(`poh-status-${K}`)).toHaveAttribute('data-status', 'chosen')
    );
    expect(screen.getByTestId(`poh-status-${K}`)).toHaveTextContent(
      'The supplier chose: Feedstock (FS) only'
    );
    expect(screen.getByTestId(`poh-fulfil-${K}`)).toHaveTextContent(/Fulfil by .*lead time/);
  });
});
