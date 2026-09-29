// ─────────────────────────────────────────────────────────────────────────────
// BL-133 (ENG-D18, ENG-D19) on the screens: the supplier's Submit all per
// period (capacity first, a reason above BE), the supplier's capacity page with
// the LTP beside each week, and the planner's amber / red flags. Every walk that
// acts ends in the STORE.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { requirementResponseStore } from '../services/data/mock/stores/requirementResponseStore';
import { forecastVersionStore, forecastViewStore } from '../services/data/mock/stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from '../services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W, SEEDED_RAW_MATERIAL_MONTHS as M } from '../services/data/mock/fixtures/forecastHub';
import { inventoryCapacityEn, inventoryCapacityId } from '../lib/i18n/inventoryCapacity';
import { sdcClock } from '../services/sdc';
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
const SUP_002: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON,
};
const responsesFor = (supplierId: string, period: string) =>
  requirementResponseStore.all().filter((r) => r.supplierId === supplierId && r.periodBucket === period);

describe('copy', () => {
  it('every new capacity string exists in EN and ID', () => {
    expect(Object.keys(inventoryCapacityId).sort()).toEqual(Object.keys(inventoryCapacityEn).sort());
  });
});

describe('Supplier — Submit all per period (ENG-D19)', () => {
  it('one Submit all submits every material of the period at once', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER, route: '/supplier/forecasts' });
    const weekRow = await screen.findByTestId(`fc-week-${W[6]}`);
    expect(weekRow).toHaveTextContent('Materials: 2');
    expect(within(weekRow).getByTestId(`fc-week-check-${W[6]}-MG-20`)).toHaveAttribute('data-level', 'within');
    // A row no longer has its own Submit, only Save draft.
    expect(screen.queryByRole('button', { name: /^Submit commitment for/ })).toBeNull();
    fireEvent.click(screen.getByTestId(`fc-week-submit-${W[6]}`));
    await waitFor(() =>
      expect(
        responsesFor('sup-007', W[6])
          .filter((r) => r.status === 'Submitted')
          .map((r) => r.materialCode)
          .sort(),
      ).toEqual(['PK-PETB-8801', 'PK-PETB-8802']),
    );
  });

  it('a period above BE is red and cannot be submitted without a reason; with one, it is', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER, route: '/supplier/forecasts' });
    const weekRow = await screen.findByTestId(`fc-week-${W[2]}`);
    expect(within(weekRow).getByTestId(`fc-week-check-${W[2]}-MG-20`)).toHaveAttribute('data-level', 'cannotSupply');
    expect(weekRow).toHaveTextContent('Cannot be supplied');
    // Both lines were already committed; editing one puts the period back to
    // submit. Below forecast, the period's reason also covers the row.
    const section = screen.getByTestId('fc-sup-material-PK-PETB-8801');
    const row = within(section).getByTestId(`fc-sup-row-PK-PETB-8801-${W[2]}`);
    fireEvent.change(within(row).getByLabelText(/^Commitment quantity for/), { target: { value: '34000' } });
    const submit = screen.getByTestId(`fc-week-submit-${W[2]}`);
    expect(submit).toBeDisabled();
    expect(screen.getByTestId(`fc-week-refusal-${W[2]}`)).toHaveTextContent('Above BE: choose a reason.');
    fireEvent.change(within(weekRow).getByLabelText(/^Reason for .*: LTP above capacity/), { target: { value: 'capacity' } });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(responsesFor('sup-007', W[2]).find((r) => r.status === 'Submitted' && r.rootCause?.level1 === 'capacity')).toMatchObject({
        materialCode: 'PK-PETB-8801',
        forecastConfirmation: { confirmedQty: 34000 },
      }),
    );
  });

  it('capacity not confirmed: the period says so, links to capacity, and cannot be submitted (sup-002 only sees its own)', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUP_002, route: '/supplier/forecasts' });
    const weekRow = await screen.findByTestId(`fc-week-${M[2]}`);
    expect(within(weekRow).getByTestId(`fc-week-check-${M[2]}-MG-10`)).toHaveAttribute('data-level', 'unconfirmed');
    expect(within(weekRow).getByRole('link', { name: 'Confirm capacity' })).toHaveAttribute('href', expect.stringContaining('/supplier/capacity'));
    expect(screen.getByTestId(`fc-week-submit-${M[2]}`)).toBeDisabled();
    expect(screen.getByTestId(`fc-week-refusal-${M[2]}`)).toHaveTextContent('Confirm capacity for');
    // Scoping: no other supplier's group or period on this page.
    expect(screen.queryByTestId(`fc-week-${W[6]}`)).toBeNull();
    expect(screen.queryByText('PK-PETB-8801')).toBeNull();
  });
});

describe('Capacity pages show the LTP against capacity and BE (ENG-D18)', () => {
  it('supplier capacity: each week carries its LTP and flag; typing additional capacity moves red to amber', async () => {
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER, route: '/supplier/capacity' });
    const red = await screen.findByTestId(`capacity-ltp-${W[2]}`);
    await waitFor(() => expect(red).toHaveAttribute('data-level', 'cannotSupply'));
    expect(screen.getByTestId(`capacity-ltp-${W[6]}`)).toHaveAttribute('data-level', 'within');
    const week = screen.getByTestId(`capacity-week-${W[2]}`);
    expect(week).toHaveTextContent('72,800');
    // 60,000 + 12,800 = 72,800: exactly at BE is amber.
    fireEvent.change(within(week).getByLabelText(/^Additional capacity for/), { target: { value: '12800' } });
    expect(screen.getByTestId(`capacity-ltp-${W[2]}`)).toHaveAttribute('data-level', 'needsAdditional');
    fireEvent.change(within(week).getByLabelText(/^Additional capacity for/), { target: { value: '12799' } });
    expect(screen.getByTestId(`capacity-ltp-${W[2]}`)).toHaveAttribute('data-level', 'cannotSupply');
  });

  it('planner: the red week is flagged per supplier group, with a banner', async () => {
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    expect(await screen.findByTestId('pti-capacity-banner-red')).toHaveTextContent(': 1');
    await waitFor(() =>
      expect(screen.getByTestId(`capacity-ltp-sup-007-MG-20-${W[2]}`)).toHaveAttribute('data-level', 'cannotSupply'),
    );
    expect(screen.getByTestId(`capacity-ltp-sup-007-MG-20-${W[6]}`)).toHaveAttribute('data-level', 'within');
    expect(screen.getByTestId('capacity-red-count-sup-007-MG-20')).toHaveTextContent('Cannot be supplied: 1 wk');
  });
});
