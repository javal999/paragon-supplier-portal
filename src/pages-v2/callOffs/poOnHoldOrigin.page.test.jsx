// PEX-8 — a call-off the end of a PO On Hold grace period created
// (`origin: 'poOnHold'`) is marked on its row, on the planner's and the
// supplier's Call-offs pages, with an (i) tip that says where it came from and a
// link to the PO On Hold line. A call-off typed on the page carries no marker.
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerCallOffs from '../BuyerCallOffs';
import SupplierCallOffs from '../SupplierCallOffs';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const SUP_008 = {
  personaType: /** @type {const} */ ('supplier'),
  supplierId: 'sup-008',
  supplierName: 'PT Sample Carton Packaging',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};

afterEach(() => {
  callOffStore.reset();
  void i18n.changeLanguage('en');
});

/** A system-made call-off on a supplier's line, and the id of a typed one beside it. */
const seed = () => {
  const typed = callOffStore.all().find((c) => c.supplierId === 'sup-008' && !c.origin);
  if (!typed) throw new Error('no typed call-off on sup-008');
  const identity = callOffStore.nextIdentity();
  callOffStore.add({
    ...typed,
    ...identity,
    status: 'Confirmed',
    origin: 'poOnHold',
    confirmation: {
      kind: 'confirm',
      deliveries: [{ quantity: typed.quantity, date: typed.needDate }],
      comment: 'PO On Hold poh-0001',
      confirmedAt: '2026-11-13T05:00:00.000Z',
      approval: 'auto'
    }
  });
  return { made: identity.id, typed: typed.id };
};

describe('PEX-8 — the marker on a call-off a PO On Hold execution created', () => {
  it('planner page: marker, (i) tip and link on that row only', async () => {
    const { made, typed } = seed();
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    fireEvent.click(await screen.findByRole('tab', { name: 'All call-offs' }));
    const marker = await screen.findByTestId(`calloff-origin-po-on-hold-${made}`);
    expect(marker).toHaveTextContent('From PO On Hold');
    const tip = within(marker).getByRole('tooltip', { hidden: true });
    expect(tip).toHaveTextContent(
      'The system created this call-off at the end of the grace period'
    );
    expect(tip).toHaveTextContent('Feedstock reconcile');
    expect(within(marker).getByTestId(`calloff-origin-po-on-hold-${made}-link`)).toHaveAttribute(
      'href',
      '/buyer/fs-reconcile'
    );
    // Known-good for the other side: a typed call-off has no marker.
    expect(screen.queryByTestId(`calloff-origin-po-on-hold-${typed}`)).toBeNull();
  });

  it('supplier page: the same marker, link to the supplier page, in Indonesian too', async () => {
    const { made, typed } = seed();
    renderWithProviders(<SupplierCallOffs />, { identity: SUP_008 });
    const marker = await screen.findByTestId(`supplier-calloff-origin-po-on-hold-${made}`);
    expect(marker).toHaveTextContent('From PO On Hold');
    expect(
      within(marker).getByTestId(`supplier-calloff-origin-po-on-hold-${made}-link`)
    ).toHaveAttribute('href', '/supplier/fs-reconcile');
    expect(screen.queryByTestId(`supplier-calloff-origin-po-on-hold-${typed}`)).toBeNull();
    await i18n.changeLanguage('id');
    expect(await screen.findByText('Dari PO On Hold')).toBeInTheDocument();
  });
});
