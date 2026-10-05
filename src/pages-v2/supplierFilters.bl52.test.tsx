// ─────────────────────────────────────────────────────────────────────────────
// BL-52 · THE FILTERS ON THE SCREENS — the buyer supplier list and the invitee
// search, each driven from the page address and pinned by named suppliers.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerSuppliers from './BuyerSuppliers';
import RfxInviteeStep from './rfx/RfxInviteeStep';

const rowIds = (prefix: RegExp) =>
  screen.queryAllByTestId(prefix).map((el) => el.getAttribute('data-testid')!.replace(/^.*-(sup-\d+)$/, '$1'));

describe('BL-52 · buyer supplier list', () => {
  it('?cert=expiring shows sup-003 and sup-017, and not the valid sup-001', async () => {
    renderWithProviders(<BuyerSuppliers />, { identity: BUYER, route: '/buyer/suppliers?cert=expiring' });
    await screen.findByTestId('supplier-row-sup-017');
    const ids = rowIds(/^supplier-row-sup-/);
    expect(ids).toEqual(expect.arrayContaining(['sup-003', 'sup-017']));
    expect(ids).not.toContain('sup-001');
    expect(screen.getByTestId('suppliers-filter-cert')).toHaveValue('expiring');
  });

  it('?band=A shows only sup-016; the row states its band', async () => {
    renderWithProviders(<BuyerSuppliers />, { identity: BUYER, route: '/buyer/suppliers?band=A' });
    await screen.findByTestId('supplier-row-sup-016');
    expect(rowIds(/^supplier-row-sup-/)).toEqual(['sup-016']);
    expect(screen.getByTestId('supplier-band-sup-016')).toHaveTextContent('Grade A');
  });

  it('composes with the status chips: country DE + Active drops the suspended sup-012', async () => {
    renderWithProviders(<BuyerSuppliers />, { identity: BUYER, route: '/buyer/suppliers?country=DE' });
    await screen.findByTestId('supplier-row-sup-012');
    expect(rowIds(/^supplier-row-sup-/).sort()).toEqual(['sup-005', 'sup-012']);
    fireEvent.click(screen.getByRole('radio', { name: /^Active/ }));
    await waitFor(() => expect(rowIds(/^supplier-row-sup-/)).toEqual(['sup-005']));
  });

  it('choosing a filter writes it; nothing matching names the filters in force', async () => {
    renderWithProviders(<BuyerSuppliers />, { identity: BUYER, route: '/buyer/suppliers?band=A' });
    await screen.findByTestId('supplier-row-sup-016');
    fireEvent.change(screen.getByTestId('suppliers-filter-cert'), { target: { value: 'expiring' } });
    // sup-016 holds a valid halal certificate, so A + expiring matches nobody.
    // Named in the BR-05 order: certificates, then band.
    expect(await screen.findByTestId('suppliers-no-match')).toHaveTextContent(/Expiring within 90 days, Grade A/);
    fireEvent.click(screen.getByTestId('suppliers-filter-clear'));
    await waitFor(() => expect(rowIds(/^supplier-row-sup-/).length).toBeGreaterThan(10));
  });
});

describe('BL-52 · the invitee search (RFI / RFP step)', () => {
  it('?band=B&cert=expiredOrMissing with purchasing group 101 → exactly sup-019', async () => {
    renderWithProviders(
      <RfxInviteeStep supplierCategory="" selected={[]} onToggle={() => {}} testIdPrefix="rfi" />,
      { identity: BUYER, route: '/buyer/rfi?band=B&cert=expiredOrMissing' },
    );
    fireEvent.change(await screen.findByTestId('rfi-invitee-group-filter'), { target: { value: '101' } });
    await waitFor(() => expect(rowIds(/^rfi-invitee-row-sup-/)).toEqual(['sup-019']));
    expect(screen.getByTestId('rfi-invitee-band-sup-019')).toHaveTextContent('Grade B');
    expect(screen.getByTestId('rfi-invitee-cert-sup-019')).toHaveTextContent('Expired or missing');
  });

  it('an empty result names every filter in force, and clearing clears the BR-05 ones too', async () => {
    renderWithProviders(
      <RfxInviteeStep supplierCategory="" selected={[]} onToggle={() => {}} testIdPrefix="rfi" />,
      { identity: BUYER, route: '/buyer/rfi?band=A&country=DE' },
    );
    expect(await screen.findByTestId('rfi-invitee-empty')).toHaveTextContent(/Grade A.*\(DE\)/);
    fireEvent.click(screen.getByTestId('rfi-invitee-clear-filters'));
    await waitFor(() => expect(rowIds(/^rfi-invitee-row-sup-/)).toContain('sup-016'));
    expect(screen.getByTestId('rfi-invitee-filter-band')).toHaveValue('');
  });
});
