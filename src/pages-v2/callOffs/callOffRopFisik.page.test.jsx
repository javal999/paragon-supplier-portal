// BL-199 (DRC-13) on the PTI Call-offs page: a draft the hub made when PTI SOH
// reached ROP Fisik is marked "Drafted at ROP Fisik" on its row, and its panel
// shows the figures behind it (SOH, ROP Fisik, Max, quantity) with the
// provisional label (F1 and the ROP questions) and where the SOH comes from.
// The planner approves it by releasing it, which ends in the store.
//
// RM-STEAR-7300 on the sample data: ROP Fisik 1,275, Max 1,400, MPQ 25; an SOH
// update of 1,010 drafts 375 KG on PO-2025-00116 (see callOffTrigger.test.js).
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerCallOffs from '../BuyerCallOffs';
import { applyPtiStockRefresh } from '@services/data/mock/MockCommandService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { ptiStockStore } from '@services/data/mock/stores/ptiStockStore';
import { callOffTriggerStore } from '@services/data/mock/stores/callOffTriggerStore';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import i18n from '@lib/i18n';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

/**
 * P-12 — opens one of the Call-offs tabs, by its visible name.
 * @param {string} name
 */
const openTab = async (name) => fireEvent.click(await screen.findByRole('tab', { name }));
const panel = () =>
  within(/** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]')));

afterEach(() => {
  callOffStore.reset();
  ptiStockStore.reset();
  callOffTriggerStore.reset();
  void i18n.changeLanguage('en');
});

/** @returns {string} The id of the draft the trigger made. */
const dropToRopFisik = () => {
  applyPtiStockRefresh([{ materialCode: 'RM-STEAR-7300', plant: 'J6', ptiSoh: 1010 }]);
  const d = callOffStore.all().find((c) => c.origin === 'ropFisik');
  if (!d) throw new Error('the trigger drafted nothing');
  return d.id;
};

/** @param {string} id */
const openDraft = async (id) => {
  fireEvent.click(
    within(await screen.findByTestId(`calloff-row-${id}`)).getByRole('button', {
      name: /Open draft/
    })
  );
};

describe('BL-199 — a draft made at ROP Fisik on the Call-offs page', () => {
  it('is marked on its row, and its panel shows the figures behind it, provisional', async () => {
    const id = dropToRopFisik();
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    expect(await screen.findByTestId(`calloff-origin-rop-fisik-${id}`)).toHaveTextContent(
      'Drafted at ROP Fisik'
    );
    await openDraft(id);
    const p = panel();
    expect(p.getByTestId('calloff-panel-origin-rop-fisik')).toHaveTextContent(
      'Drafted at ROP Fisik'
    );
    expect(p.getByTestId('calloff-trigger-soh')).toHaveTextContent('1,010 KG');
    expect(p.getByTestId('calloff-trigger-rop-fisik')).toHaveTextContent('1,275 KG');
    expect(p.getByTestId('calloff-trigger-max')).toHaveTextContent('1,400 KG');
    // [Team F5] the minimum delivery: MOQ 1,250 rounded to the 700 pallet.
    expect(p.getByTestId('calloff-trigger-quantity')).toHaveTextContent('1,400 KG');
    expect(p.getByTestId('calloff-trigger-provisional')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (F1, B8, B9, MPQ)'
    );
    expect(p.getByTestId('calloff-trigger-refresh')).toHaveTextContent(
      'Checks follow the eWM refresh; eWM feed not connected, SOH from the hub’s stock records.'
    );
  });

  it('the planner approves it by releasing it, and the store agrees', async () => {
    const id = dropToRopFisik();
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    await openDraft(id);
    fireEvent.click(panel().getByRole('button', { name: 'Release to supplier' }));
    await waitFor(() => expect(callOffStore.get(id)?.status).toBe('Awaiting Confirmation'));
  });

  it('known-good: a draft the planner typed carries no ROP Fisik marker', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('All call-offs');
    // co-0012 is a seeded planner draft (PK-PETB-8801).
    await screen.findByTestId('calloff-row-co-0012');
    expect(screen.queryByTestId('calloff-origin-rop-fisik-co-0012')).toBeNull();
    await openDraft('co-0012');
    expect(panel().queryByTestId('calloff-trigger')).toBeNull();
  });

  it('in Indonesian, the marker and the provisional label are Indonesian', async () => {
    const id = dropToRopFisik();
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('Semua call-off');
    expect(await screen.findByTestId(`calloff-origin-rop-fisik-${id}`)).toHaveTextContent(
      'Didraf pada ROP Fisik'
    );
    fireEvent.click(within(screen.getByTestId(`calloff-row-${id}`)).getByRole('button'));
    expect(panel().getByTestId('calloff-trigger-provisional')).toHaveTextContent(
      'Sementara: aturan menunggu Material Planning'
    );
  });
});
