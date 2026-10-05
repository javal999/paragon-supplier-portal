import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { supplierOverlayStore } from '@services/data/mock/stores/supplierOverlayStore';
import { isApiConnected } from '@services/data/mock/inventoryReadModel';
import AdminSuppliers from './AdminSuppliers';

// ─────────────────────────────────────────────────────────────────────────────
// Material A1 · Administration → Suppliers (MR-1 BR-02, AC-06).
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: ['planning'] };

beforeEach(() => supplierOverlayStore.reset());

describe('Material A1 · AdminSuppliers', () => {
  it('lists every supplier with its resolved mode; an unset supplier follows the sample list', async () => {
    renderWithProviders(<AdminSuppliers />, { identity: BUYER });
    const sup1 = await screen.findByTestId('adminsup-row-sup-001');
    expect(within(sup1).getByText('From supplier system')).toBeTruthy();
    expect(within(sup1).getByText('Sample connection list (not set yet)')).toBeTruthy();
    const sup7 = screen.getByTestId('adminsup-row-sup-007');
    expect(within(sup7).getByText('Entered by supplier')).toBeTruthy();
    expect(screen.getByTestId('adminsup-history-empty')).toBeTruthy();
    expect(screen.getByTestId('admin-section-suppliers')).toBeTruthy();
  });

  it('a seat holding supplier:set-update-mode gets the form; a planner gets the wait, not the form', async () => {
    const { unmount } = renderWithProviders(<AdminSuppliers />, { identity: BUYER });
    expect(await screen.findByTestId('adminsup-form')).toBeTruthy();
    expect(screen.getByTestId('adminsup-edit-sup-001')).toBeTruthy();
    unmount();

    renderWithProviders(<AdminSuppliers />, { identity: PLANNER });
    expect(await screen.findByTestId('adminsup-gate')).toBeTruthy();
    expect(screen.queryByTestId('adminsup-form')).toBeNull();
    expect(screen.queryByTestId('adminsup-edit-sup-001')).toBeNull();
    expect(screen.getByTestId('handoff-supplier-set-update-mode')).toBeTruthy();
    // The planner still READS every supplier's mode.
    expect(screen.getByTestId('adminsup-row-sup-001')).toBeTruthy();
  });

  it('changing a mode dispatches the verb, updates the row and records who and when', async () => {
    renderWithProviders(<AdminSuppliers />, { identity: BUYER });
    fireEvent.click(await screen.findByTestId('adminsup-edit-sup-001'));
    fireEvent.change(screen.getByTestId('adminsup-mode'), { target: { value: 'manual' } });
    fireEvent.change(screen.getByTestId('adminsup-reason'), { target: { value: 'ERP link paused' } });
    fireEvent.click(screen.getByTestId('adminsup-submit'));

    const change = await screen.findByTestId('adminsup-change-sup-001');
    expect(within(change).getByText('Entered by supplier')).toBeTruthy();
    expect(within(change).getByText('ERP link paused')).toBeTruthy();
    expect(within(change).getByText('Not attributed (no named person in session)')).toBeTruthy();
    const row = await screen.findByTestId('adminsup-row-sup-001');
    expect(within(row).getByText('Hub administrator')).toBeTruthy();
    expect(isApiConnected('sup-001')).toBe(false);
    expect(supplierOverlayStore.historyFor('sup-001')).toHaveLength(1);
  });

  it('the submit is disabled until a supplier is chosen (the shared pre-check)', async () => {
    renderWithProviders(<AdminSuppliers />, { identity: BUYER });
    const submit = (await screen.findByTestId('adminsup-submit')) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('adminsup-supplier'), { target: { value: 'sup-007' } });
    expect(submit.disabled).toBe(false);
  });
});
