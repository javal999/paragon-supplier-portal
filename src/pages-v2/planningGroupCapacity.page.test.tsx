// ─────────────────────────────────────────────────────────────────────────────
// Material C5 — planning groups on the capacity and alert pages (MR-8 BR-04,
// BR-05, BR-07; AR-15): names come from the planning group store, a move
// marks weeks "Needs re-entry", and planning group filters both pages.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useLocation } from 'react-router-dom';
import { screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import { MockCommandService } from '../services/data/mock/MockCommandService';
import { planningGroupStore } from '../services/data/mock/stores/planningGroupStore';
import { materialOverlayStore } from '../services/data/mock/stores/materialOverlayStore';
import { capacityStore, inventoryAlertLedger } from '../services/data/mock/stores/inventoryHubStores';
import { sdcClock } from '../services/sdc';
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import type { QueryScope } from '../services/data/types';
import BuyerCapacity from './BuyerCapacity';
import SupplierCapacity from './SupplierCapacity';
import BuyerAlerts from './BuyerAlerts';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const svc = new MockCommandService();
const planning: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON };

/** Split MG-20: "PET line B" takes PK-PETB-8810 from the default group. */
async function splitMg20(): Promise<string> {
  const made = await svc.dispatch(planning, {
    transitionId: 't_planninggroup_create',
    entity: 'planningGroup',
    payload: { name: 'PET line B', sapMaterialGroup: 'MG-20' },
  });
  await svc.dispatch(planning, {
    transitionId: 't_planninggroup_move_materials',
    entity: 'planningGroup',
    entityId: made.entityId!,
    payload: { materialCodes: ['PK-PETB-8810'] },
  });
  return made.entityId!;
}

beforeEach(() => {
  planningGroupStore.reset();
  materialOverlayStore.reset();
  capacityStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

describe('Material C5 — the PTI capacity page', () => {
  it('with no split, a group reads its SAP group’s name, and no week needs re-entry', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const plan = await screen.findByTestId('capacity-plan-sup-007-pg-MG-20');
    expect(within(plan).getByText('Rigid plastic packaging')).toBeTruthy();
    expect(screen.queryAllByTestId(/^capacity-reentry-/)).toEqual([]);
  });

  it('after a split: the new group shows its typed name, the old group’s weeks read "Needs re-entry", and the filter narrows to one group', async () => {
    const id = await splitMg20();
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const newPlan = await screen.findByTestId(`capacity-plan-sup-007-${id}`);
    expect(within(newPlan).getByText('PET line B')).toBeTruthy();
    const old = screen.getByTestId('capacity-plan-sup-007-pg-MG-20');
    expect(within(old).getAllByText('Needs re-entry').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Planning group'), { target: { value: id } });
    expect(screen.queryAllByTestId(/^capacity-plan-/).map((el) => el.getAttribute('data-testid'))).toEqual([
      `capacity-plan-sup-007-${id}`,
    ]);
  });
});

describe('Material C5 — the supplier capacity page', () => {
  it('the tabs are planning groups, and a moved-from group’s weeks read "Needs re-entry"', async () => {
    await splitMg20();
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER, route: '/supplier/capacity' });
    expect(await screen.findByRole('tab', { name: /PET line B/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /Rigid plastic packaging/ }));
    expect((await screen.findAllByText('Needs re-entry')).length).toBeGreaterThan(0);
  });
});

describe('Material C5 — planning group is a filter on alerts (MR-8 BR-07)', () => {
  it('filtering by a planning group keeps the alerts about it and its materials only', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER, route: '/buyer/alerts' });
    await screen.findByTestId('alert-group-sup-007');
    fireEvent.change(screen.getByLabelText('Planning group'), { target: { value: 'pg-MG-20' } });
    expect(screen.getByTestId('alert-capacityBelowDemand|pg-MG-20|sup-007')).toBeTruthy();
    expect(screen.queryByTestId('alert-group-sup-002')).toBeNull();
  });

  it('the planning group filter composes with `?reason=` and `?pic=` in the address', async () => {
    let search = '';
    const LocationProbe: React.FC = () => {
      search = useLocation().search;
      return null;
    };
    renderWithProviders(
      <>
        <BuyerAlerts />
        <LocationProbe />
      </>,
      { identity: PLANNER, route: '/buyer/alerts?reason=other&pic=P12' },
    );
    // `?reason=` opens the Closed tab; the planning groups offered are the Open tab's.
    fireEvent.click(await screen.findByRole('tab', { name: /Open/ }));
    fireEvent.change(screen.getByLabelText('Planning group'), { target: { value: 'pg-MG-20' } });
    const params = new URLSearchParams(search);
    expect([params.get('reason'), params.get('pic'), params.get('planningGroup')]).toEqual(['other', 'P12', 'pg-MG-20']);
  });
});
