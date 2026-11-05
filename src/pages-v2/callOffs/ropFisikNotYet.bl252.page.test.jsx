// ─────────────────────────────────────────────────────────────────────────────
// U-04 (BL-252) — Call-offs "To act" and What to order say when the ROP Fisik
// trigger has drafted nothing yet, why (it runs on PTI stock updates; the eWM
// feed is not connected), and, once the trigger ledger holds a row, when it
// last checked. On the sample data the trigger never fires (DRC-B34).
// RM-STEAR-7300: ROP Fisik 1,275; an SOH of 5,000 is above it (a ledger row,
// no draft); 1,010 drafts (see callOffTrigger.test.js).
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerCallOffs from '../BuyerCallOffs';
import BuyerOrderPlan from '../BuyerOrderPlan';
import { applyPtiStockRefresh } from '@services/data/mock/MockCommandService';
import { mockDataService } from '@services/data/mock/mockDataService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { ptiStockStore } from '@services/data/mock/stores/ptiStockStore';
import { callOffTriggerStore } from '@services/data/mock/stores/callOffTriggerStore';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { formatDateTime } from '@lib/format';
import i18n from '@lib/i18n';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const NOT_YET =
  'No call-off drafted at ROP Fisik yet. The trigger runs on PTI stock updates; the eWM feed is not connected.';
const SLOW = { timeout: 15000 };

afterEach(() => {
  callOffStore.reset();
  ptiStockStore.reset();
  callOffTriggerStore.reset();
  void i18n.changeLanguage('en');
});

/** @param {string} name */
const openTab = async (name) => fireEvent.click(await screen.findByRole('tab', { name }));

describe('the read: the trigger ledger’s last row per material', () => {
  it('is empty on the sample; an SOH update adds the material’s check; a supplier reads none', async () => {
    const buyer = {
      personaType: /** @type {const} */ ('buyer'),
      supplierId: null,
      businessRoles: PERSONA_SYSTEM_ROLES.buyer
    };
    const reads = mockDataService.procurement;
    expect((await reads.getRopFisikPrRecommendations(buyer)).lastChecks).toEqual([]);
    applyPtiStockRefresh([{ materialCode: 'RM-STEAR-7300', plant: 'J6', ptiSoh: 5000 }]);
    const row = callOffTriggerStore.lastFor('RM-STEAR-7300');
    expect(row?.state).toBe('above');
    expect((await reads.getRopFisikPrRecommendations(buyer)).lastChecks).toEqual([
      { materialCode: 'RM-STEAR-7300', observedAt: row?.observedAt, state: 'above' }
    ]);
    const supplier = {
      personaType: /** @type {const} */ ('supplier'),
      supplierId: 'sup-002',
      businessRoles: PERSONA_SYSTEM_ROLES.supplier
    };
    expect((await reads.getRopFisikPrRecommendations(supplier)).lastChecks).toEqual([]);
  });
});

describe('Call-offs "To act"', () => {
  it('on the sample: says nothing was drafted at ROP Fisik yet, with no "last checked"', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('To act');
    const note = await screen.findByTestId('calloff-rop-fisik-empty', {}, SLOW);
    expect(note).toHaveTextContent(NOT_YET);
    expect(screen.queryByTestId('calloff-rop-fisik-empty-last')).toBeNull();
  });

  it('after a check that drafted nothing: says when the trigger last checked', async () => {
    applyPtiStockRefresh([{ materialCode: 'RM-STEAR-7300', plant: 'J6', ptiSoh: 5000 }]);
    const at = /** @type {string} */ (callOffTriggerStore.lastFor('RM-STEAR-7300')?.observedAt);
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('To act');
    expect(await screen.findByTestId('calloff-rop-fisik-empty-last', {}, SLOW)).toHaveTextContent(
      `Last checked ${formatDateTime(at)}.`
    );
  });

  it('known-good: once the trigger drafted a call-off, the note is gone; All call-offs never shows it', async () => {
    applyPtiStockRefresh([{ materialCode: 'RM-STEAR-7300', plant: 'J6', ptiSoh: 1010 }]);
    expect(callOffStore.all().some((c) => c.origin === 'ropFisik')).toBe(true);
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('To act');
    await screen.findByTestId('calloff-tabpanel-toAct', {}, SLOW);
    expect(screen.queryByTestId('calloff-rop-fisik-empty')).toBeNull();
    callOffStore.reset();
  });

  it('reads in Indonesian, "call-off" and "ROP Fisik" kept in English', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    await openTab('Perlu tindakan');
    expect(await screen.findByTestId('calloff-rop-fisik-empty', {}, SLOW)).toHaveTextContent(
      'Belum ada call-off yang didraf pada ROP Fisik. Trigger berjalan setiap stok PTI diperbarui; data eWM belum terhubung.'
    );
  });
});

describe('What to order, "Create a PR in SAP"', () => {
  it('with no recommendation open: the same note in place of the section', async () => {
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    expect(await screen.findByTestId('op-rop-fisik-pr-empty', {}, SLOW)).toHaveTextContent(NOT_YET);
    expect(screen.queryByTestId('op-rop-fisik-pr')).toBeNull();
  });
});
