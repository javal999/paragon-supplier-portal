// ─────────────────────────────────────────────────────────────────────────────
// DRC-5 (BL-191) on the screens — a call-off delayed by an LTP drop: the
// planner's change with the reason type "LTP dropped" on the PTI Call-offs
// panel, and the supplier's approve / reject on its own confirmation panel.
// Every walk that acts ends in the STORE, not only in the DOM.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
/** @import { CallOff } from '@services/data/types' */
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { reasonCodeStore } from '@services/transitions/reasonCodes';
import { mockDataService } from '@services/data/mock/mockDataService';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { LTP_DROPPED_CODE, pendingDelay } from '@services/transitions/callOffRules';
import { sdcClock } from '@services/sdc';
import { NO_PERSON } from '@context/noPerson';
import BuyerCallOffs from '../BuyerCallOffs';
import SupplierCallOffs from '../SupplierCallOffs';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {CurrentIdentity} */
const SUP_008 = {
  personaType: 'supplier',
  supplierId: 'sup-008',
  supplierName: 'PT Sample Carton Packaging',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};
// co-0006 — sup-007 × PK-PETB-8801, 10,000 confirmed for 3 Sep 2026.
const ID = 'co-0006';
const OLD = '2026-09-03';
const NEW = '2026-09-10';

/** @returns {CallOff} */
const row = () => /** @type {CallOff} */ (callOffStore.get(ID));
const panel = () =>
  within(/** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]')));

beforeEach(() => {
  sdcClock.reset();
  callOffStore.reset();
  asnStore.reset();
  purchaseOrderStore.reset();
  reasonCodeStore.reset();
});

const proposeDirect = () =>
  mockDataService.commands.dispatch(
    { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON },
    {
      transitionId: 't_calloff_change',
      entity: 'callOff',
      entityId: ID,
      payload: { reason: 'LTP for W36 dropped', reasonCode: LTP_DROPPED_CODE, needDate: NEW }
    }
  );

describe('the planner proposes the delay on the PTI Call-offs panel', () => {
  /** Open co-0006's panel and fill the change. */
  const openAndFill = async (/** @type {string} */ date) => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    fireEvent.click(
      within(await screen.findByTestId(`calloff-row-${ID}`)).getByRole('button', { name: /View/ })
    );
    const change = panel().getByTestId('calloff-change');
    fireEvent.change(within(change).getByLabelText('Need date'), { target: { value: date } });
    fireEvent.change(within(change).getByLabelText('Reason'), {
      target: { value: 'LTP for W36 dropped' }
    });
    fireEvent.change(within(change).getByLabelText('Reason type'), {
      target: { value: LTP_DROPPED_CODE }
    });
    return change;
  };

  it('"LTP dropped" with a later date: the call-off goes to the supplier and keeps its date', async () => {
    const change = await openAndFill(NEW);
    expect(within(change).getByTestId('calloff-delay-hint')).toHaveTextContent(
      'The need date moves only when the supplier approves'
    );
    // The reason type offers the active list, labelled.
    expect(within(change).getByRole('option', { name: 'LTP dropped' })).toBeInTheDocument();
    fireEvent.click(within(change).getByRole('button', { name: 'Change and ask again' }));
    await waitFor(() => expect(row().status).toBe('Awaiting Confirmation'));
    expect(row().needDate).toBe(OLD);
    expect(pendingDelay(row())).toMatchObject({ fromNeedDate: OLD, toNeedDate: NEW });
    // The panel closed on success; reopened, it shows the pending delay.
    await waitFor(() => expect(document.querySelector('aside[role="dialog"]')).toBeNull());
    fireEvent.click(
      within(await screen.findByTestId(`calloff-row-${ID}`)).getByRole('button', { name: /View/ })
    );
    expect(await panel().findByTestId('calloff-delays-pending')).toHaveTextContent(
      'waiting for the supplier'
    );
  });

  it('"LTP dropped" with an earlier date cannot be sent (the verb’s own rule)', async () => {
    const change = await openAndFill('2026-09-02');
    expect(within(change).getByRole('button', { name: 'Change and ask again' })).toBeDisabled();
    // Known-good control: the same date with no reason type is an ordinary change.
    fireEvent.change(within(change).getByLabelText('Reason type'), { target: { value: '' } });
    expect(within(change).getByRole('button', { name: 'Change and ask again' })).toBeEnabled();
  });
});

describe('the supplier answers the delay on its confirmation panel', () => {
  /** @param {CurrentIdentity} [identity] */
  const openAsSupplier = async (identity = SUPPLIER) => {
    expect((await proposeDirect()).status).toBe('done');
    renderWithProviders(<SupplierCallOffs />, { identity });
  };

  it('shows the proposal instead of the usual answers; approving moves the need date', async () => {
    await openAsSupplier();
    fireEvent.click(
      within(await screen.findByTestId(`supplier-calloff-row-${ID}`)).getByRole('button', {
        name: /Respond/
      })
    );
    const form = panel().getByTestId('supplier-calloff-delay-answer');
    expect(form).toHaveTextContent('because the LTP dropped');
    expect(form).toHaveTextContent('LTP for W36 dropped');
    // The ordinary answers are not offered while a delay waits.
    expect(panel().queryByLabelText('Confirm with a new date')).toBeNull();
    fireEvent.click(within(form).getByTestId('supplier-calloff-delay-approve'));
    await waitFor(() => expect(row().needDate).toBe(NEW));
    expect(row().status).toBe('Confirmed');
    expect(row().delays?.[0]).toMatchObject({ answer: 'approved' });
  });

  it('rejecting keeps the old date and records the rejection', async () => {
    await openAsSupplier();
    fireEvent.click(
      within(await screen.findByTestId(`supplier-calloff-row-${ID}`)).getByRole('button', {
        name: /Respond/
      })
    );
    fireEvent.click(panel().getByTestId('supplier-calloff-delay-reject'));
    await waitFor(() => expect(row().delays?.[0]).toMatchObject({ answer: 'rejected' }));
    expect(row()).toMatchObject({ status: 'Confirmed', needDate: OLD });
    expect(await panel().findByTestId('supplier-calloff-delays-rejected')).toBeInTheDocument();
  });

  it('another supplier does not see the call-off at all', async () => {
    await openAsSupplier(SUP_008);
    await screen.findByTestId('supplier-calloff-row-co-0009');
    expect(screen.queryByTestId(`supplier-calloff-row-${ID}`)).toBeNull();
  });
});
