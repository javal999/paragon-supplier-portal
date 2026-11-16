import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { BuyerFixedStockReconcile } from '../FixedStockReconcile';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { MockProcurementService } from '@services/data/mock/MockProcurementService';
import { poOnHoldStore } from '@services/data/mock/stores/poOnHoldStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { maxStockStore } from '@services/transitions/maxStock';
import { sdcClock } from '@services/sdc';
import { NO_PERSON } from '@context/noPerson';

// PO On Hold "Suggest again" [Proposed] on the planner's panel: a line an
// execution left a remainder on shows the picker again, with the hub's fresh
// suggestion, and sending it starts round 2.
const K = 'sup-003|FR-EMIN-4420';
const LINE = { supplierId: 'sup-003', materialCode: 'FR-EMIN-4420' };
/** @type {import('@services/data/types').QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
const svc = new MockCommandService();
const reads = new MockProcurementService();

beforeEach(() => {
  poOnHoldStore.reset();
  osipParamStore.reset();
  callOffStore.reset();
  maxStockStore.reset();
  sdcClock.reset();
});

/** Round 1 executed with a remainder: FG capped at 120 of 300, grace 0. */
const executeRoundOne = async () => {
  const find = async () => (await reads.getPoOnHold(planner)).items.find((r) => r.key === K);
  maxStockStore.append({
    ...LINE,
    quantity: 100,
    previous: null,
    setBy: NO_PERSON,
    setAt: sdcClock.now()
  });
  const probe = await find();
  const base = Math.min(100, probe?.sohSupplier ?? 0) - (probe?.sohPti ?? 0);
  await svc.dispatch(planner, {
    transitionId: 't_osipparam_set',
    entity: 'osipParam',
    entityId: `maxPti|${LINE.supplierId}|${LINE.materialCode}`,
    payload: { osipParamValue: 120 - base }
  });
  await svc.dispatch(planner, {
    transitionId: 't_poonhold_suggest',
    entity: 'poOnHoldDecision',
    payload: { ...LINE, option: 'fg' }
  });
  await svc.dispatch(planner, {
    transitionId: 't_osipparam_set',
    entity: 'osipParam',
    entityId: `grace|${LINE.supplierId}|${LINE.materialCode}`,
    payload: { osipParamValue: 0 }
  });
  return find();
};

describe('PO On Hold — Suggest again', () => {
  it('an executed line with a remainder offers "Suggest again"; sending it starts round 2', async () => {
    const r1 = await executeRoundOne();
    expect(r1?.execution.status).toBe('executed');
    expect(r1?.closed).toBe(false);
    expect(r1?.qty).toBeGreaterThan(0);
    // Round 2 gets a real grace period, so it stays scheduled for this test.
    await svc.dispatch(planner, {
      transitionId: 't_osipparam_set',
      entity: 'osipParam',
      entityId: `grace|${LINE.supplierId}|${LINE.materialCode}`,
      payload: { osipParamValue: 5 }
    });
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    const row = await screen.findByTestId(`poh-row-${K}`);
    expect(within(row).getByTestId(`poh-again-${K}`)).toHaveTextContent('start round 2');
    const send = within(row).getByTestId(`poh-suggest-send-${K}`);
    expect(send).toHaveTextContent('Suggest again');
    fireEvent.click(send);
    await waitFor(() => expect(poOnHoldStore.all()).toHaveLength(2));
    expect(poOnHoldStore.all()[1]).toMatchObject({ round: 2, previousId: r1?.decision?.id });
    await waitFor(() => expect(screen.getByTestId(`poh-status-${K}`)).toHaveTextContent('Round 2'));
    // Round 1 stays as a closed row; the live row no longer offers the picker.
    expect(screen.queryByTestId(`poh-again-${K}`)).toBeNull();
  });

  it('a line with no remainder (never executed) shows "Send suggestion", not "Suggest again"', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    const row = await screen.findByTestId(`poh-row-${K}`);
    expect(within(row).getByTestId(`poh-suggest-send-${K}`)).toHaveTextContent('Send suggestion');
    expect(within(row).queryByTestId(`poh-again-${K}`)).toBeNull();
  });
});
