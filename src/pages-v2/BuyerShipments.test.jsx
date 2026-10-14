import { vi } from 'vitest';
import { screen, render, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import { footerForStatus } from './BuyerShipments/components/footerForStatus';
import { mockShipments } from '@data/mockShipments';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import BuyerShipments from './BuyerShipments';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier scope with no shipments — exercises the empty branch.
/** @type {CurrentIdentity} */
const NO_SHIPMENTS = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

describe('BuyerShipments — four honest states', () => {
  it('data: renders the shipments board once the reads resolve', async () => {
    renderWithProviders(<BuyerShipments />);
    expect(await screen.findByText('Shipments & ASN')).toBeInTheDocument();
    expect(await screen.findByText('Arriving Today')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the reads are pending', () => {
    renderWithProviders(<BuyerShipments />, { service: alwaysPending });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Arriving Today')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when a read throws', async () => {
    renderWithProviders(<BuyerShipments />, { service: alwaysFails });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState when no shipments are in scope', async () => {
    renderWithProviders(<BuyerShipments />, { identity: NO_SHIPMENTS });
    expect(await screen.findByText('No shipments yet')).toBeInTheDocument();
  });
});

describe('BuyerShipments — an unbacked footer toast does not wear the success tone', () => {
  /**
   * Render one footer action for a display state and click it; return the
   * toast call the click made.
   * @param {import('@services/data/shipmentDisplayState').ShipmentDisplayState} state
   * @param {string} label
   */
  const clickFooter = (state, label) => {
    const toast = vi.fn();
    const ctx = /** @type {Parameters<typeof footerForStatus>[1]} */ (
      /** @type {unknown} */ ({
        t: (/** @type {string} */ k) => k,
        toast,
        navigate: vi.fn(),
        displayOf: () => state
      })
    );
    render(<>{footerForStatus(mockShipments[0], ctx)}</>);
    fireEvent.click(screen.getByRole('button', { name: label }));
    expect(toast).toHaveBeenCalledTimes(1);
    return toast.mock.calls[0][0];
  };

  it('"Send reminder" sends nothing and says so, so its toast is a warning, not a success', () => {
    const call = clickFooter('Pending ASN', 'shipments.footer.sendReminder');
    expect(call.title).toBe('shipments.toast.reminder.title');
    expect(call.variant).toBe('warning');
  });

  it('CONTROL — the carrier toast for the same "not available" situation is already a warning', () => {
    const call = clickFooter('Delayed', 'shipments.footer.contactCarrier');
    expect(call.title).toBe('shipments.toast.carrierAlerted.title');
    expect(call.variant).toBe('warning');
  });
});
