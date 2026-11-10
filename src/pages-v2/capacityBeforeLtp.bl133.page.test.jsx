// ─────────────────────────────────────────────────────────────────────────────
// BL-133 (ENG-D18, ENG-D19) on the screens: the supplier's Submit all per
// period (capacity first, a reason above BE), the supplier's capacity page with
// the LTP beside each week, and the planner's amber / red flags. Every walk that
// acts ends in the STORE.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import {
  SEEDED_PACKAGING_WEEKS as W,
  SEEDED_RAW_MATERIAL_PERIODS as M
} from '@services/data/mock/fixtures/forecastHub';
import { inventoryCapacityEn, inventoryCapacityId } from '@lib/i18n/inventoryCapacity';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import SupplierForecastCommitments from './SupplierForecastCommitments';
import SupplierCapacity from './SupplierCapacity';
import BuyerCapacity from './BuyerCapacity';

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  capacityStore.reset();
  sdcClock.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {CurrentIdentity} */
const SUP_002 = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};
/**
 * @param {string} supplierId
 * @param {string} period
 */
const responsesFor = (supplierId, period) =>
  requirementResponseStore
    .all()
    .filter((r) => r.supplierId === supplierId && r.periodBucket === period);

describe('copy', () => {
  it('every new capacity string exists in EN and ID', () => {
    // BL-159 plural rule: compare BASE keys, with the plural suffix stripped.
    // English has `_one` and `_other`; Indonesian has no plural forms, so its
    // plural keys carry `_other` only. Which forms each locale carries is
    // pinned by `src/lib/i18n/fragments.test.js`; this test pins that every
    // string exists in both languages.
    /** @param {string[]} keys */
    const base = (keys) =>
      [...new Set(keys.map((k) => k.replace(/_(zero|one|two|few|many|other)$/, '')))].sort();
    expect(base(Object.keys(inventoryCapacityId))).toEqual(base(Object.keys(inventoryCapacityEn)));
  });
});

// PEX-D22 (owner, 2026-11-05) — only Zone Liability (firm) periods take a
// commitment, so Submit all lists sup-007's firm weeks W[0] and W[1] alone
// (its 14-day lead time); these walks used the Trade-off weeks W[2] and W[6].
describe('Supplier — Submit all per period (ENG-D19)', () => {
  it('one Submit all submits every material of the period at once', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const weekRow = await screen.findByTestId(`fc-week-${W[0]}`);
    // Only 8802 awaits its commitment; 8801's stands from version 1.
    expect(weekRow).toHaveTextContent('Materials: 1');
    expect(within(weekRow).getByTestId(`fc-week-check-${W[0]}-pg-MG-20`)).toHaveAttribute(
      'data-level',
      'within'
    );
    // Zone Capacity weeks have no Submit all (acknowledgement only).
    expect(screen.queryByTestId(`fc-week-${W[2]}`)).toBeNull();
    expect(screen.queryByTestId(`fc-week-${W[6]}`)).toBeNull();
    // A row no longer has its own Submit, only Save draft.
    expect(screen.queryByRole('button', { name: /^Submit commitment for/ })).toBeNull();
    // Editing 8801 puts it back into the period's Submit all beside 8802.
    const row8801 = within(screen.getByTestId('fc-sup-material-PK-PETB-8801')).getByTestId(
      `fc-sup-row-PK-PETB-8801-${W[0]}`
    );
    fireEvent.change(within(row8801).getByLabelText(/^Commitment quantity for/), {
      target: { value: '35000' }
    });
    expect(weekRow).toHaveTextContent('Materials: 2');
    fireEvent.click(screen.getByTestId(`fc-week-submit-${W[0]}`));
    // BL-240 — Submit all opens the summary; its confirm sends the period.
    fireEvent.click(screen.getByTestId('fc-week-confirm-submit'));
    await waitFor(() =>
      expect(
        responsesFor('sup-007', W[0])
          .filter((r) => r.status === 'Submitted')
          .map((r) => r.materialCode)
          .sort()
      ).toEqual(['PK-PETB-8801', 'PK-PETB-8802'])
    );
  });

  it('a period above BE is red and cannot be submitted without a reason; with one, it is', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const weekRow = await screen.findByTestId(`fc-week-${W[1]}`);
    expect(within(weekRow).getByTestId(`fc-week-check-${W[1]}-pg-MG-20`)).toHaveAttribute(
      'data-level',
      'cannotSupply'
    );
    expect(weekRow).toHaveTextContent('Cannot be supplied');
    // Both lines were already committed; editing one puts the period back to
    // submit. Below forecast, the period's reason also covers the row.
    // (8802: 8801's standing answer already carries a reason of its own.)
    const section = screen.getByTestId('fc-sup-material-PK-PETB-8802');
    const row = within(section).getByTestId(`fc-sup-row-PK-PETB-8802-${W[1]}`);
    fireEvent.change(within(row).getByLabelText(/^Commitment quantity for/), {
      target: { value: '34000' }
    });
    const submit = screen.getByTestId(`fc-week-submit-${W[1]}`);
    expect(submit).toBeDisabled();
    expect(screen.getByTestId(`fc-week-refusal-${W[1]}`)).toHaveTextContent(
      'Above BE: choose a reason.'
    );
    fireEvent.change(within(weekRow).getByLabelText(/^Reason for .*: LTP above capacity/), {
      target: { value: 'capacity' }
    });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    fireEvent.click(screen.getByTestId('fc-week-confirm-submit'));
    await waitFor(() =>
      expect(
        responsesFor('sup-007', W[1]).find(
          (r) => r.status === 'Submitted' && r.rootCause?.level1 === 'capacity'
        )
      ).toMatchObject({
        materialCode: 'PK-PETB-8802',
        forecastConfirmation: { confirmedQty: 34000 }
      })
    );
  });

  it('capacity not confirmed: the period says so, links to capacity, and cannot be submitted (sup-002 only sees its own)', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUP_002,
      route: '/supplier/forecasts'
    });
    // PEX-D22 — a Zone Liability week of stearic acid inside its 45-day lead
    // time. BL-282: raw-material periods are weeks, so it is the second week
    // (M[1], 3,100 committed of 2,900; it was the October month). Its
    // commitment stands, so a changed quantity puts it back to submit.
    const weekRow = await screen.findByTestId(`fc-week-${M[1]}`);
    expect(within(weekRow).getByTestId(`fc-week-check-${M[1]}-pg-MG-10`)).toHaveAttribute(
      'data-level',
      'unconfirmed'
    );
    expect(within(weekRow).getByRole('link', { name: 'Confirm capacity' })).toHaveAttribute(
      'href',
      expect.stringContaining('/supplier/capacity')
    );
    const row = within(screen.getByTestId('fc-sup-material-RM-STEAR-7300')).getByTestId(
      `fc-sup-row-RM-STEAR-7300-${M[1]}`
    );
    fireEvent.change(within(row).getByLabelText(/^Commitment quantity for/), {
      target: { value: '3000' }
    });
    expect(screen.getByTestId(`fc-week-submit-${M[1]}`)).toBeDisabled();
    expect(screen.getByTestId(`fc-week-refusal-${M[1]}`)).toHaveTextContent('Confirm capacity for');
    // Scoping: no other supplier's group or period on this page.
    // (BL-282: raw-material periods are weeks too, so a week id can be shared;
    // the other supplier's packaging group is what must be absent.)
    expect(screen.queryByTestId('fc-sup-material-PK-PETB-8801')).toBeNull();
    expect(screen.queryByText('PK-PETB-8801')).toBeNull();
  });
});

describe('Capacity pages show the LTP against capacity and BE (ENG-D18)', () => {
  // The sample's red week is 7 Sep (W[1]) since PEX-D22 moved it into Zone Liability.
  it('supplier capacity: each week carries its LTP and flag; typing additional capacity moves red to amber', async () => {
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER, route: '/supplier/capacity' });
    const red = await screen.findByTestId(`capacity-ltp-${W[1]}`);
    await waitFor(() => expect(red).toHaveAttribute('data-level', 'cannotSupply'));
    expect(screen.getByTestId(`capacity-ltp-${W[6]}`)).toHaveAttribute('data-level', 'within');
    // CAP-1 — the week is a column now: its header carries the row's old id,
    // and the week's cells are found by their own ids and labels.
    expect(screen.getByTestId(`capacity-week-${W[1]}`).tagName).toBe('TH');
    expect(screen.getByTestId(`capacity-ltp-qty-${W[1]}`)).toHaveTextContent('72,800');
    expect(screen.getByTestId(`capacity-ltp-${W[2]}`)).toHaveAttribute('data-level', 'within');
    const additional = screen.getByLabelText(
      `Additional capacity for the week of ${formatDate(W[1])}`
    );
    // 60,000 + 12,800 = 72,800: exactly at BE is amber.
    fireEvent.change(additional, {
      target: { value: '12800' }
    });
    expect(screen.getByTestId(`capacity-ltp-${W[1]}`)).toHaveAttribute(
      'data-level',
      'needsAdditional'
    );
    fireEvent.change(additional, {
      target: { value: '12799' }
    });
    expect(screen.getByTestId(`capacity-ltp-${W[1]}`)).toHaveAttribute(
      'data-level',
      'cannotSupply'
    );
  });

  it('planner: the red week is flagged per supplier group, with a banner', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    expect(await screen.findByTestId('pti-capacity-banner-red')).toHaveTextContent(': 1');
    await waitFor(() =>
      expect(screen.getByTestId(`capacity-ltp-sup-007-pg-MG-20-${W[1]}`)).toHaveAttribute(
        'data-level',
        'cannotSupply'
      )
    );
    expect(screen.getByTestId(`capacity-ltp-sup-007-pg-MG-20-${W[6]}`)).toHaveAttribute(
      'data-level',
      'within'
    );
    expect(screen.getByTestId('capacity-red-count-sup-007-pg-MG-20')).toHaveTextContent(
      'Cannot be supplied: 1 wk'
    );
  });
});
