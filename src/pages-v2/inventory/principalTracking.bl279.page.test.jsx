// PEX-16 (BL-279) — on /supplier/inventory, a shipment from the principal can
// carry a tracking link the supplier types: https:// only (a message says why
// otherwise), opened in a new tab with rel="noopener noreferrer".

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { incomingShipmentStore } from '@services/data/mock/stores/incomingShipmentStore';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import SupplierInventory from '../SupplierInventory';

/** @type {CurrentIdentity} */
const SUP_005 = {
  personaType: 'supplier',
  supplierId: 'sup-005',
  supplierName: 'Sample sup-005',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};
const LEG = 'ish-0002';

beforeEach(() => incomingShipmentStore.reset());

const open = async () => {
  renderWithProviders(<SupplierInventory />, { identity: SUP_005, route: '/supplier/inventory' });
  return screen.findByTestId(`principal-row-${LEG}`);
};

describe('BL-279 — tracking link on the Stock page', () => {
  it('lists the principal leg with no link yet, and offers to add one', async () => {
    const row = await open();
    expect(row).toHaveTextContent('No tracking link');
    expect(within(row).getByTestId(`principal-edit-${LEG}`)).toHaveTextContent('Add tracking link');
  });

  it('an http:// link shows the message and is not saved', async () => {
    await open();
    fireEvent.click(screen.getByTestId(`principal-edit-${LEG}`));
    fireEvent.change(screen.getByTestId(`principal-input-${LEG}`), {
      target: { value: 'http://track.example.com/1' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only https:// links are accepted.');
    expect(incomingShipmentStore.get(LEG)?.trackingUrl).toBeUndefined();
  });

  it('an https:// link is saved and opens in a new tab, safely', async () => {
    await open();
    fireEvent.click(screen.getByTestId(`principal-edit-${LEG}`));
    fireEvent.change(screen.getByTestId(`principal-input-${LEG}`), {
      target: { value: 'https://track.example.com/AWB-9' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save link' }));
    await waitFor(() =>
      expect(incomingShipmentStore.get(LEG)?.trackingUrl).toBe('https://track.example.com/AWB-9')
    );
    const link = await screen.findByTestId(`principal-link-${LEG}`);
    expect(link).toHaveAttribute('href', 'https://track.example.com/AWB-9');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByTestId(`principal-edit-${LEG}`)).toHaveTextContent('Change link');
  });

  it('a supplier with no principal leg sees the empty line', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: { ...SUP_005, supplierId: 'sup-002' },
      route: '/supplier/inventory'
    });
    expect(await screen.findByTestId('principal-empty')).toHaveTextContent(
      'No shipment from your principal is on its way.'
    );
  });

  it('the seeded supplier seat (sup-007) starts with one principal leg to try the link on', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: { ...SUP_005, supplierId: 'sup-007' },
      route: '/supplier/inventory'
    });
    expect(await screen.findByTestId('principal-row-ish-0003')).toHaveTextContent(
      'No tracking link'
    );
  });
});
