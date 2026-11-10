// ─────────────────────────────────────────────────────────────────────────────
// CAP-12 (BL-181) on the Demand anticipation page — the two rows after
// "Would be": Open supply and Gap (warning tone above 0), with every figure
// read back from the service for the same scope, in both locales, and the
// figure never abbreviated to "DA" (CAP-D10).
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
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
import { expectNoBareDa } from '@test/noBareDa';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/demand-anticipation';
// sup-002 × RM-EMUL-9410: W36 has no call-off, so it shows a gap; W37 is
// covered by its released call-off. (sup-007 × PK-PETB-8802 served here until
// BL-228: W36's surplus now carries into W37, so it has no gap left.)
const KEY = 'sup-002-RM-EMUL-9410';

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

/** IA review item 1 — the cards open folded; unfold every card's weeks grid. */
const openAllWeeks = async () => {
  await screen.findByTestId('dant-filters', {}, { timeout: 15000 });
  for (const b of screen.getAllByTestId(/^dant-weeks-toggle-/)) fireEvent.click(b);
};

describe('CAP-12 — Open supply and Gap rows', () => {
  it('follow the consumption row, carry the read’s figures, and a gap above 0 is in warning tone', async () => {
    const row = await readRow();
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openAllWeeks();
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
    expectNoBareDa();
  });

  it('reads in Indonesian, never abbreviated', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openAllWeeks();
    const grid = await screen.findByTestId(`dant-grid-${KEY}`);
    expect(within(grid).getByText('Pasokan terbuka')).toBeInTheDocument();
    expect(within(grid).getByText('Kekurangan')).toBeInTheDocument();
    expect(within(grid).queryByText('Open supply')).toBeNull();
    expectNoBareDa();
  });
});

// BL-228 — sup-002 × RM-EMUL-9410 carries W37's call-off above its figure into
// the next week: the owner's example, in the sample data. (BL-282: weekly raw
// material — W37's 2,000 against 1,200 carries 800 into W38, whose gap is 200;
// it was 40 carried into W39, gap 940, on the monthly figures.)
describe('BL-228 — a gap the carry reduced says so', () => {
  const CARRY_KEY = 'sup-002-RM-EMUL-9410';

  it('AC-06 — the reduced Gap cell names the carried quantity; an unreduced one has no tooltip', async () => {
    const page = await mockDataService.procurement.getDemandAnticipation({
      personaType: 'buyer',
      supplierId: null,
      businessRoles: SEEDED_SEAT_ROLES.buyer
    });
    const row = page.items.find((r) => `${r.supplierId}-${r.materialCode}` === CARRY_KEY);
    const carried = row?.weeks.filter((w) => w.gap !== null && w.carriedIn > 0) ?? [];
    const plain = row?.weeks.find((w) => w.gap !== null && w.carriedIn === 0);
    expect(carried.map((w) => [w.week, w.carriedIn, w.gap])).toContainEqual([
      '2026-09-14',
      800,
      200
    ]);
    expect(plain).toBeDefined();
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openAllWeeks();
    for (const w of carried) {
      expect(screen.getByTestId(`dant-gap-${CARRY_KEY}-${w.week}`)).toHaveAttribute(
        'title',
        `${formatNumber(w.carriedIn)} carried from earlier weeks`
      );
    }
    expect(
      screen.getByTestId(`dant-gap-${CARRY_KEY}-${/** @type {*} */ (plain).week}`)
    ).not.toHaveAttribute('title');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openAllWeeks();
    expect(screen.getByTestId(`dant-gap-${CARRY_KEY}-2026-09-14`)).toHaveAttribute(
      'title',
      '800 terbawa dari minggu sebelumnya'
    );
  });
});
