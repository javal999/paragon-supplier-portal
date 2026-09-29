import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import { planningGroupStore } from '../../services/data/mock/stores/planningGroupStore';
import { materialOverlayStore } from '../../services/data/mock/stores/materialOverlayStore';
import { capacityStore } from '../../services/data/mock/stores/inventoryHubStores';
import { materialEntry } from '../../services/sdc';
import AdminPlanningGroups from './AdminPlanningGroups';

// ─────────────────────────────────────────────────────────────────────────────
// Material C5 · Administration → Planning groups (MR-8 BR-01 to BR-03).
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: ['planning'] };
const PROCUREMENT = { ...BUYER, businessRoles: ['procurement'] };

beforeEach(() => {
  planningGroupStore.reset();
  materialOverlayStore.reset();
  capacityStore.reset();
});

describe('Material C5 · AdminPlanningGroups', () => {
  it('lists each SAP group’s default planning group, named from the SAP group, with its materials', async () => {
    renderWithProviders(<AdminPlanningGroups />, { identity: PLANNER });
    const mg03 = await screen.findByTestId('adminpg-row-pg-MG-03');
    expect(within(mg03).getByText('Humectants and glycols')).toBeTruthy();
    expect(within(mg03).getByText('Default')).toBeTruthy();
    expect(within(mg03).getByText('RM-EMUL-3310, RM-HUMEC-3405')).toBeTruthy();
    expect(screen.getByTestId('adminpg-history-empty')).toBeTruthy();
    expect(screen.getByTestId('admin-section-planning-groups')).toBeTruthy();
  });

  it('a planning seat gets the forms; a seat without planninggroup:manage reads and is told whose act it is', async () => {
    const { unmount } = renderWithProviders(<AdminPlanningGroups />, { identity: PLANNER });
    expect(await screen.findByTestId('adminpg-create')).toBeTruthy();
    unmount();
    renderWithProviders(<AdminPlanningGroups />, { identity: PROCUREMENT });
    expect(await screen.findByTestId('adminpg-gate')).toBeTruthy();
    expect(screen.queryByTestId('adminpg-create')).toBeNull();
    expect(screen.getByTestId('handoff-planninggroup-manage')).toBeTruthy();
    expect(screen.getByTestId('adminpg-row-pg-MG-03')).toBeTruthy();
  });

  it('create needs a name (the shared pre-check), then a move splits MG-03 and the change is on record', async () => {
    renderWithProviders(<AdminPlanningGroups />, { identity: PLANNER });
    fireEvent.change(await screen.findByTestId('adminpg-create-sap'), { target: { value: 'MG-03' } });
    expect(screen.getByTestId('adminpg-create-refusal')).toHaveTextContent('Enter a name for the planning group.');
    expect((screen.getByTestId('adminpg-create-submit') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('adminpg-create-name'), { target: { value: 'Glycerin line' } });
    fireEvent.click(screen.getByTestId('adminpg-create-submit'));
    const row = await screen.findByTestId('adminpg-row-pg-0001');
    expect(within(row).getByText('Glycerin line')).toBeTruthy();

    fireEvent.change(screen.getByTestId('adminpg-move-group'), { target: { value: 'pg-0001' } });
    // Only materials of MG-03 are offered.
    expect(screen.getByTestId('adminpg-move-RM-EMUL-3310')).toBeTruthy();
    expect(screen.queryByTestId('adminpg-move-PK-PETB-8810')).toBeNull();
    fireEvent.click(screen.getByTestId('adminpg-move-RM-EMUL-3310'));
    fireEvent.click(screen.getByTestId('adminpg-move-submit'));
    await waitFor(() => expect(materialEntry('RM-EMUL-3310')!.planningGroupId).toBe('pg-0001'));
    expect(await screen.findByTestId('adminpg-change-moved')).toHaveTextContent('Moved RM-EMUL-3310 from Humectants and glycols into Glycerin line');
  });

  it('retire is offered only on an empty group (RETIRE_NOT_EMPTY)', async () => {
    renderWithProviders(<AdminPlanningGroups />, { identity: PLANNER });
    const retire = (await screen.findByTestId('adminpg-retire-pg-MG-03')) as HTMLButtonElement;
    expect(retire.disabled).toBe(true);
    expect(retire.title).toBe('Move every material out of this group before retiring it.');
  });
});
