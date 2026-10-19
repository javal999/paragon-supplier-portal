// ─────────────────────────────────────────────────────────────────────────────
// DRC-18 (BL-203) on the screen — the Demand anticipation grid's read-only
// rows: FG demand, LTP − FG demand, and Consumption, 13-week average
// [Default A11], with fewer than 13 weeks of history said on screen, and both
// locales. Every expected figure is derived from the read model's own inputs,
// never restated.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { allDemandAnticipation } from '@services/data/mock/demandAnticipationReadModel';
import { fgDemandByMaterial } from '@services/data/mock/ltpFgDemandReadModel';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { NO_PERSON } from '@context/noPerson';
import { formatNumber } from '@lib/format';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/demand-anticipation';
// sup-007 × PK-PETB-8802 — one supplier, so its share is the whole material.
const SUPPLIER = 'sup-007';
const MATERIAL = 'PK-PETB-8802';
const KEY = `${SUPPLIER}-${MATERIAL}`;
const W36 = '2026-08-31';
const W35 = '2026-08-24';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  consumptionStore.reset();
});
afterEach(() => {
  consumptionStore.reset();
});

/** The row as the read builds it, and the engine's FG demand for its material. */
function expected() {
  const now = sdcClock.now();
  const row = allDemandAnticipation(now).find(
    (r) => r.supplierId === SUPPLIER && r.materialCode === MATERIAL
  );
  if (!row || row.share === null) throw new Error('fixture row missing');
  const gross = fgDemandByMaterial(now)?.get(MATERIAL);
  if (!gross) throw new Error('engine has no requirement for the material');
  return { row, gross, share: row.share };
}

describe('DRC-18 — the three rows on the grid', () => {
  it('FG demand is the share of the engine requirement; LTP − FG demand sits beside it', async () => {
    const { row, gross, share } = expected();
    // Named member: the engine holds a positive FG demand for this material in the shown weeks.
    expect(row.weeks.some((w) => (gross.get(w.week) ?? 0) > 0)).toBe(true);
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const card = await screen.findByTestId(`dant-card-${KEY}`);
    expect(within(card).getByText('FG demand')).toBeInTheDocument();
    expect(within(card).getByText('LTP − FG demand')).toBeInTheDocument();
    expect(within(card).getByText('Consumption, 13-week average')).toBeInTheDocument();
    // Design rule 5 — the [Default A11] figure carries the Provisional label with its question.
    expect(within(card).getByTestId(`dant-cavg-provisional-${KEY}`)).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (A11)'
    );
    for (const w of row.weeks) {
      const fg = Math.round((gross.get(w.week) ?? 0) * share);
      expect(within(card).getByTestId(`dant-fg-${KEY}-${w.week}`)).toHaveTextContent(
        formatNumber(fg)
      );
      const ltp = w.inputs?.ltp;
      if (ltp !== undefined)
        expect(within(card).getByTestId(`dant-ltpfg-${KEY}-${w.week}`)).toHaveTextContent(
          formatNumber(ltp - fg)
        );
    }
    expect(within(card).queryByTestId(`dant-fg-unavailable-${KEY}`)).toBeNull();
  });

  it('with no consumption recorded, the average reads — and the label says why', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const card = await screen.findByTestId(`dant-card-${KEY}`);
    expect(within(card).getByTestId(`dant-cavg-note-${KEY}`)).toHaveTextContent(
      'No consumption recorded in the last 13 weeks'
    );
    expect(within(card).queryByTestId(`dant-cavg-${KEY}-${W36}`)).toBeNull();
  });

  it('with 2 weeks recorded, it averages those 2 and says so (fewer than 13 weeks)', async () => {
    const at = sdcClock.now();
    for (const [week, qty] of /** @type {const} */ ([
      [W35, 30_000],
      [W36, 10_000]
    ]))
      consumptionStore.add({
        materialCode: MATERIAL,
        week,
        qty,
        unit: 'PCS',
        source: 'manual',
        recordedAt: at,
        actor: NO_PERSON
      });
    const { row, share } = expected();
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const card = await screen.findByTestId(`dant-card-${KEY}`);
    expect(within(card).getByTestId(`dant-cavg-note-${KEY}`)).toHaveTextContent(
      'Averages 2 of 13 weeks: only those have consumption recorded'
    );
    const avg = formatNumber(Math.round(20_000 * share));
    // Every shown week reads the window ending at the current hub week.
    for (const w of row.weeks)
      expect(within(card).getByTestId(`dant-cavg-${KEY}-${w.week}`)).toHaveTextContent(avg);
  });

  it('reads in Indonesian', async () => {
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
      const card = await screen.findByTestId(`dant-card-${KEY}`);
      expect(within(card).getByText('Permintaan FG')).toBeInTheDocument();
      expect(within(card).getByText('LTP − permintaan FG')).toBeInTheDocument();
      expect(within(card).getByText('Konsumsi, rata-rata 13 minggu')).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
