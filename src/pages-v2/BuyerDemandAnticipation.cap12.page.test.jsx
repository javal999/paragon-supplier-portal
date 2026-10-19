// ─────────────────────────────────────────────────────────────────────────────
// CAP-12 (BL-181) on the Demand anticipation page — the two rows after
// "Would be": Open supply and Gap (warning tone above 0), with every figure
// read back from the service for the same scope, in both locales, and the
// figure never abbreviated to "DA" (CAP-D10).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { formatNumber } from '@lib/format';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/demand-anticipation';
// sup-007 × PK-PETB-8802 (DRC-2: a 2-week horizon): W36 is covered by its
// released call-offs, W37 has none, so it shows a gap.
const KEY = 'sup-007-PK-PETB-8802';

beforeEach(() => {
  sdcClock.reset();
  callOffStore.reset();
  purchaseOrderStore.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

const readRow = async () => {
  const page = await mockDataService.procurement.getDemandAnticipation({
    personaType: 'buyer',
    supplierId: null,
    businessRoles: SEEDED_SEAT_ROLES.buyer
  });
  const row = page.items.find((r) => `${r.supplierId}-${r.materialCode}` === KEY);
  if (!row) throw new Error(`no row ${KEY}`);
  return row;
};

describe('CAP-12 — Open supply and Gap rows', () => {
  it('follow the consumption row, carry the read’s figures, and a gap above 0 is in warning tone', async () => {
    const row = await readRow();
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const grid = await screen.findByTestId(`dant-grid-${KEY}`);
    const labels = within(grid)
      .getAllByRole('rowheader')
      .map((h) => h.textContent ?? '');
    const at = (/** @type {string} */ name) => labels.findIndex((l) => l.startsWith(name));
    expect(at('Would be')).toBeGreaterThan(-1);
    // Row order: … Would be, Surplus absorbed (DRC-4), Recorded consumption, Open supply, Gap.
    expect(at('Surplus absorbed')).toBe(at('Would be') + 1);
    expect(at('Recorded consumption')).toBe(at('Surplus absorbed') + 1);
    expect(at('Open supply')).toBe(at('Recorded consumption') + 1);
    expect(at('Gap')).toBe(at('Open supply') + 1);

    const short = row.weeks.find((w) => w.gap !== null && w.gap > 0);
    const covered = row.weeks.find((w) => w.openSupply > 0 && w.gap === 0);
    expect(short).toBeDefined();
    expect(covered).toBeDefined();
    const ws = /** @type {NonNullable<typeof short>} */ (short);
    const cv = /** @type {NonNullable<typeof covered>} */ (covered);
    expect(screen.getByTestId(`dant-supply-${KEY}-${cv.week}`)).toHaveTextContent(
      formatNumber(cv.openSupply)
    );
    const gap = screen.getByTestId(`dant-gap-${KEY}-${ws.week}`);
    expect(gap).toHaveTextContent(formatNumber(/** @type {number} */ (ws.gap)));
    expect(gap).toHaveAttribute('data-tone', 'warning');
    expect(gap.className).toContain('text-warning-hover');
    const none = screen.getByTestId(`dant-gap-${KEY}-${cv.week}`);
    expect(none).toHaveTextContent('0');
    expect(none).not.toHaveAttribute('data-tone');
    expect(document.body.textContent ?? '').not.toMatch(/\bDA\b/);
  });

  it('reads in Indonesian, never abbreviated', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const grid = await screen.findByTestId(`dant-grid-${KEY}`);
    expect(within(grid).getByText('Pasokan terbuka')).toBeInTheDocument();
    expect(within(grid).getByText('Kekurangan')).toBeInTheDocument();
    expect(within(grid).queryByText('Open supply')).toBeNull();
    expect(document.body.textContent ?? '').not.toMatch(/\bDA\b/);
  });
});
