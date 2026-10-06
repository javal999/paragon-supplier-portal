import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { NO_PERSON } from '@context/noPerson';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { workingCalendarStore } from '@services/transitions/workingCalendarStore';
import { sdcClock } from '@services/sdc';
import SupplierForecastCommitments from './SupplierForecastCommitments';
import BuyerCommitments from './BuyerCommitments';

// ─────────────────────────────────────────────────────────────────────────────
// BL-48 · CR-26 on the screens — the deadline, the time left, and late, on the
// supplier's commitment page and on the planner's page. Derived at read from
// the one simulated clock (the present is Monday 31 August 2026, 19:00 WIB).
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  workingCalendarStore.reset();
  sdcClock.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/**
 * @param {string} supplierId
 * @param {string} supplierName
 * @returns {CurrentIdentity}
 */
const supplierSeat = (supplierId, supplierName) => ({
  personaType: 'supplier',
  supplierId,
  supplierName,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
});
const SUP_002 = supplierSeat('sup-002', 'PT Sample Specialty Fats');
const SUP_005 = supplierSeat('sup-005', 'PT Sample Distributor');

describe('BL-48 · the supplier commitment screen', () => {
  it('BL48-UI-SUP-01 · a Firm period past its deadline is marked late, with how late', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    // Packaging v2 was published Friday 28 August 09:00 WIB → Firm due Monday
    // 31 August 09:00 WIB (02:00Z); the present is 12:00Z, ten hours later.
    const due = await screen.findByTestId(`fc-due-PK-PETB-8802-${W[0]}`);
    expect(due).toHaveAttribute('data-timing', 'late');
    expect(due).toHaveTextContent('31 Aug 2026, 09:00 WIB');
    expect(due).toHaveTextContent('Late by 10 h');
  });

  it('BL48-UI-SUP-02 · a Trade-off period still open shows the time left', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const due = await screen.findByTestId(`fc-due-PK-PETB-8801-${W[3]}`);
    expect(due).toHaveAttribute('data-timing', 'open');
    expect(due.textContent).toMatch(/\d+ d \d+ h left$/);
  });

  it('BL48-UI-SUP-03 · a commitment that arrived in time says so', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    // Answered on version 2 on Saturday 29 August, before the Trade-off deadline.
    const due = await screen.findByTestId(`fc-due-PK-PETB-8802-${W[4]}`);
    expect(due).toHaveAttribute('data-timing', 'submittedOnTime');
    expect(due).toHaveTextContent('Submitted on time');
  });
});

describe('BL-48 · the demo states on the supplier screen', () => {
  it('BL48-UI-SUP-04 · a Firm period due TOMORROW shows its deadline and the hours left (sup-005)', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUP_005,
      route: '/supplier/forecasts'
    });
    // Raw-material v2 was published this morning, Monday 10:00 WIB → due Tuesday
    // 10:00 WIB (03:00Z); the present is Monday 12:00Z → 15 hours left.
    const due = await screen.findByTestId('fc-due-RM-EMUL-9410-2026-09');
    expect(due).toHaveAttribute('data-timing', 'open');
    expect(due.textContent).toMatch(/^01 Sept? 2026, 10:00 WIB15 h left$/);
  });

  it('BL48-UI-SUP-05 · a commitment that arrived after its version\'s deadline reads "submitted late" (sup-002)', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUP_002,
      route: '/supplier/forecasts'
    });
    // Answered on raw-material v1 (published Monday 3 August 09:00 WIB, Firm due
    // Tuesday 4 August 09:00) at 10:00 — carried forward, it keeps that verdict.
    const due = await screen.findByTestId('fc-due-RM-EMUL-9410-2026-09');
    expect(due).toHaveAttribute('data-timing', 'submittedLate');
    expect(due).toHaveTextContent('04 Aug 2026, 09:00 WIB');
    expect(due).toHaveTextContent('Submitted late by 1 h');
  });
});

describe('BL-48 · the planner', () => {
  it('BL48-UI-PTI-01 · the exception list carries the deadline and how late a missing commitment is', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    const list = await screen.findByTestId('fc-exceptions');
    const due = within(list).getByTestId(`fc-due-exception-sup-012-PK-PETB-8801-${W[0]}`);
    expect(due).toHaveAttribute('data-timing', 'late');
    expect(due).toHaveTextContent('Late by 10 h');
  });

  it('BL48-UI-PTI-02 · the grid shows time left on an awaiting period, and nothing on one committed in time', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    await screen.findByTestId('fc-grid');
    const open = screen.getByTestId(`fc-due-cell-sup-007-PK-PETB-8801-${W[3]}`);
    expect(open).toHaveAttribute('data-timing', 'open');
    expect(open.textContent).toMatch(/left$/);
    // Committed on time → the compact form stays silent.
    expect(screen.queryByTestId(`fc-due-cell-sup-007-PK-PETB-8802-${W[4]}`)).toBeNull();
  });
});
