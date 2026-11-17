import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { BuyerFixedStockReconcile, SupplierFixedStockReconcile } from '../FixedStockReconcile';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { poOnHoldStore } from '@services/data/mock/stores/poOnHoldStore';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { sdcClock } from '@services/sdc';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';

// PO On Hold — a round with no room left (owner ruling 2026-11-17, "Count them:
// yes, count earlier rounds"). sup-007 PK-PETB-8801: round 1 fills the 4,300 of
// room the week of 31 Aug 2026 has, so round 2 has none. The planner's preview
// says so plainly, in English and Indonesian, and no line claims that the
// remainder would still be spread.
const K = 'sup-007|PK-PETB-8801';
const LINE = { supplierId: 'sup-007', materialCode: 'PK-PETB-8801' };
/** @type {import('@services/data/types').QueryScope} */
const planner = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['planning'],
  actor: NO_PERSON
};
const svc = new MockCommandService();

beforeEach(() => {
  poOnHoldStore.reset();
  osipParamStore.reset();
  callOffStore.reset();
  sdcClock.reset();
});

afterEach(() => {
  void i18n.changeLanguage('en');
});

/** @param {number} value */
const setGrace = (value) =>
  svc.dispatch(planner, {
    transitionId: 't_osipparam_set',
    entity: 'osipParam',
    entityId: `grace|${LINE.supplierId}|${LINE.materialCode}`,
    payload: { osipParamValue: value }
  });

/** Round 1 executed at once (grace 0) and filled the week; round 2 will wait (grace 5). */
const executeRoundOne = async () => {
  await svc.dispatch(planner, {
    transitionId: 't_poonhold_suggest',
    entity: 'poOnHoldDecision',
    payload: { ...LINE, option: 'fsSpread' }
  });
  await setGrace(0);
  expect(poOnHoldStore.executions()).toHaveLength(1);
  expect(poOnHoldStore.executions()[0]?.plan.placedQty).toBe(4300);
  await setGrace(5);
};

describe('PO On Hold — a round with no room left', () => {
  it('the planner’s preview says plainly that the round has no room, and no spread line says the opposite', async () => {
    await executeRoundOne();
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    const row = await screen.findByTestId(`poh-row-${K}`);
    fireEvent.click(within(row).getByTestId(`poh-suggest-send-${K}`));
    await waitFor(() => expect(poOnHoldStore.all()).toHaveLength(2));

    const preview = await screen.findByTestId(`poh-exec-preview-${K}`);
    const noRoom = within(preview).getByTestId(`poh-exec-noroom-${K}`);
    expect(noRoom).toHaveTextContent('No room left: no week can take another call-off.');
    expect(noRoom).toHaveTextContent('call-offs from earlier rounds count');
    // Nothing is placed, and the whole remainder stays on hold (113,400 = 117,700 less round 1's 4,300).
    expect(within(preview).queryByTestId(`poh-exec-calloff-${K}`)).toBeNull();
    expect(within(preview).getByTestId(`poh-exec-stays-${K}`)).toHaveTextContent('113,400');
    expect(within(preview).queryByText('Nothing would be created.')).toBeNull();
    // The screen still shows the quantity leave hold after round 1: OSPO fell by 4,300, DA not yet called off did not.
    expect(screen.getByTestId(`poh-ospo-${K}`)).toHaveTextContent('117,700');
    expect(screen.getByTestId(`poh-da-${K}`)).toHaveTextContent('4,300');
    expect(screen.getByTestId(`poh-qty-${K}`)).toHaveTextContent('113,400');

    await i18n.changeLanguage('id');
    expect(await screen.findByTestId(`poh-exec-noroom-${K}`)).toHaveTextContent(
      'Tidak ada ruang tersisa: tidak ada minggu yang bisa menerima call-off lagi.'
    );
    expect(screen.queryByText('Tidak ada yang akan dibuat.')).toBeNull();
  });

  it('known good: a line that still has room shows its call-offs and no "no room" line', async () => {
    await svc.dispatch(planner, {
      transitionId: 't_poonhold_suggest',
      entity: 'poOnHoldDecision',
      payload: { ...LINE, option: 'fsSpread' }
    });
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    const preview = await screen.findByTestId(`poh-exec-preview-${K}`);
    expect(within(preview).getByTestId(`poh-exec-calloff-${K}`)).toHaveTextContent('4,300');
    expect(within(preview).queryByTestId(`poh-exec-noroom-${K}`)).toBeNull();
  });

  it('once the supplier has chosen FS + spread for that round, neither seat is told the remainder would be spread', async () => {
    await executeRoundOne();
    await svc.dispatch(planner, {
      transitionId: 't_poonhold_suggest',
      entity: 'poOnHoldDecision',
      payload: { ...LINE, option: 'fsSpread' }
    });
    const round2 = poOnHoldStore.all()[1];
    expect(round2).toMatchObject({ round: 2, state: 'Suggested' });
    const chosen = await svc.dispatch(SUPPLIER, {
      transitionId: 't_poonhold_choose',
      entity: 'poOnHoldDecision',
      entityId: round2?.id ?? '',
      payload: { option: 'fsSpread' }
    });
    expect(chosen.status).not.toBe('failed');

    const plannerView = renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: BUYER,
      route: '/buyer/fs-reconcile'
    });
    const outcome = await screen.findByTestId(`poh-outcome-${K}`);
    expect(outcome).not.toHaveTextContent('Spread over the next weeks');
    expect(screen.getByTestId(`poh-exec-noroom-${K}`)).toBeInTheDocument();
    plannerView.unmount();

    renderWithProviders(<SupplierFixedStockReconcile />, {
      identity: SUPPLIER,
      route: '/supplier/fs-reconcile'
    });
    const supplierOutcome = await screen.findByTestId(`poh-outcome-${K}`);
    expect(supplierOutcome).not.toHaveTextContent('Spread over the next weeks');
  });
});
