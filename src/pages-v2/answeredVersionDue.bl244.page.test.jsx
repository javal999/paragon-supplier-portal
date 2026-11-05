// ─────────────────────────────────────────────────────────────────────────────
// BL-244 (U-16) — a carried-forward commitment shows the deadline of the
// version it answered; the cell now names that version: "04 Aug 2026, 09:00
// WIB (version 1)". Display only: the on-time / late verdict is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
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
import i18n from '@lib/i18n';
import SupplierForecastCommitments from './SupplierForecastCommitments';

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  workingCalendarStore.reset();
  sdcClock.reset();
});

/** @type {CurrentIdentity} */
const SUP_002 = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};

describe('BL-244 — the earlier version is named beside its deadline (U-16)', () => {
  it('a commitment carried forward from version 1 reads "(version 1)", verdict unchanged', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUP_002,
      route: '/supplier/forecasts'
    });
    const due = await screen.findByTestId('fc-due-RM-EMUL-9410-2026-09');
    expect(due).toHaveAttribute('data-timing', 'submittedLate');
    expect(due).toHaveTextContent('04 Aug 2026, 09:00 WIB (version 1)');
    expect(due).toHaveTextContent('Submitted late by 1 h');
  });

  it('a commitment that answered the current version names no version', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const due = await screen.findByTestId(`fc-due-PK-PETB-8802-${W[4]}`);
    expect(due).toHaveAttribute('data-timing', 'submittedOnTime');
    expect(due).not.toHaveTextContent('(version');
    // An awaited line shows this version's own deadline, with no version either.
    expect(screen.getByTestId(`fc-due-PK-PETB-8802-${W[0]}`)).not.toHaveTextContent('(version');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<SupplierForecastCommitments />, {
        identity: SUP_002,
        route: '/supplier/forecasts'
      });
      const due = await screen.findByTestId('fc-due-RM-EMUL-9410-2026-09');
      expect(due).toHaveTextContent('(versi 1)');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
