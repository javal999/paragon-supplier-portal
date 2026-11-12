// ─────────────────────────────────────────────────────────────────────────────
// PEX wave 1, Lane A — the supplier Foresight commitments page
// (`SC-HUB-PLAN-EXECUTION-REQUIREMENTS-2026-11.md`):
//   · PEX-2 (BL-265) — one column per period, 17 weeks then months, the row
//     labels pinned left.
//   · PEX-1 (BL-264) — the zones read Zone Liability and Zone Capacity, in
//     English in both locales, each with a term tip.
//   · PEX-3 (BL-266) — the one-line note on the ordered quantity, and the
//     per-week hover.
//   · PEX-10 (BL-273) — "Fulfil by <date> (lead time n days)".
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { fulfilByDay } from '@services/transitions/forecastRules';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { formatDate } from '@lib/format';
import SupplierForecastCommitments from './SupplierForecastCommitments';

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  capacityStore.reset();
  sdcClock.reset();
});
afterEach(async () => {
  await i18n.changeLanguage('en');
});

const open = async () => {
  renderWithProviders(<SupplierForecastCommitments />, {
    identity: SUPPLIER,
    route: '/supplier/forecasts'
  });
  return screen.findByTestId('fc-sup-material-PK-PETB-8802');
};

/** @param {HTMLElement} section */
const columnsOf = (section) =>
  within(section)
    .getAllByTestId(/^fc-sup-row-PK-PETB-8802-/)
    .map((c) => /** @type {string} */ (c.dataset.testid).replace('fc-sup-row-PK-PETB-8802-', ''));

describe('PEX-2 (BL-265) — periods are columns', () => {
  it('one column per period, oldest first: 17 weeks, then months; the row labels come first', async () => {
    const section = await open();
    const cols = columnsOf(section);
    expect(cols.slice(0, 17)).toEqual(W.slice(0, 17));
    expect(cols.filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c))).toHaveLength(17);
    expect(cols.slice(17).every((c) => /^\d{4}-\d{2}$/.test(c))).toBe(true);
    const grid = screen.getByTestId('fc-sup-grid-PK-PETB-8802');
    const labels = [...grid.querySelectorAll('[data-grid-label]')];
    expect(labels).toHaveLength(10);
    // The labels precede every period column and are pinned on the left.
    expect(grid.firstElementChild).toBe(labels[0]);
    for (const l of labels) expect(l.className).toMatch(/\bsticky\b.*\bleft-0\b/);
  });
});

describe('PEX-1 (BL-264) — zone names', () => {
  it('reads Zone Liability and Zone Capacity, never Firm, Trade-off or Forecast as a zone', async () => {
    const section = await open();
    expect(within(section).getAllByText('Zone Liability').length).toBeGreaterThan(0);
    expect(within(section).getAllByText('Zone Capacity').length).toBeGreaterThan(0);
    expect(within(section).queryByText(/^(Firm|Trade-off|Forecast)$/)).toBeNull();
    // BL-306 (UL-08): the zone tips sit on each period's chip, not three on the label.
    expect(within(section).getAllByTestId('term-tip-zone-liability').length).toBeGreaterThan(0);
    expect(within(section).getAllByTestId('term-tip-zone-capacity').length).toBeGreaterThan(0);
    const zoneLabel = within(section)
      .getAllByText((_, el) => el?.hasAttribute('data-grid-label') ?? false)
      .find((el) => el.querySelector('[data-testid="term-tip-zone-liability"]'));
    expect(zoneLabel).toBeUndefined();
  });

  it('BR-04 — the two names stay English in Indonesian', async () => {
    await i18n.changeLanguage('id');
    const section = await open();
    expect(within(section).getAllByText('Zone Liability').length).toBeGreaterThan(0);
    expect(within(section).getAllByText('Zone Capacity').length).toBeGreaterThan(0);
    expect(within(section).queryByText(/^(Pasti|Kompromi|Prakiraan)$/)).toBeNull();
  });
});

describe('PEX-3 (BL-266) — where the ordered quantity comes from', () => {
  it('states the rule once per material', async () => {
    const section = await open();
    expect(within(section).getByTestId('fc-sup-demand-note-PK-PETB-8802')).toHaveTextContent(
      'Ordered quantity = LTP (planned use) − PTI stock on hand.'
    );
  });

  it('ID — the same note in Indonesian', async () => {
    await i18n.changeLanguage('id');
    const section = await open();
    expect(within(section).getByTestId('fc-sup-demand-note-PK-PETB-8802')).toHaveTextContent(
      'Kuantitas pesanan = LTP (rencana pemakaian) − stok PTI yang ada.'
    );
  });

  it('a week’s hover names its ordered quantity and says LTP and SOH per week are not in the data', async () => {
    await open();
    const tip = screen.getByTestId(`term-tip-demand-pk-petb-8802-${W[0]}`);
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(/^Ordered quantity for Week of /);
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'LTP and PTI stock on hand per week are not in the Foresight data yet, so the gap is not shown.'
    );
  });
});

describe('PEX-10 (BL-273) — the fulfilment window', () => {
  it('BR-01 — the confirmation day in WIB + the lead time, in days', () => {
    // 23:30 UTC is 06:30 the next day in Jakarta.
    expect(fulfilByDay('2026-11-02T23:30:00.000Z', 28)).toBe('2026-12-01');
    expect(fulfilByDay('2026-11-02T02:00:00.000Z', 0)).toBe('2026-11-02');
    expect(fulfilByDay(null, 28)).toBeNull();
    expect(fulfilByDay('2026-11-02T02:00:00.000Z', null)).toBeNull();
  });

  it('BR-02 — a submitted commitment reads "Fulfil by <date> (lead time n days)"; an open one gives the lead time', async () => {
    await open();
    const submitted = requirementResponseStore
      .all()
      .find(
        (r) =>
          r.supplierId === 'sup-007' &&
          r.materialCode === 'PK-PETB-8802' &&
          r.periodBucket === W[1] &&
          r.status === 'Submitted'
      );
    expect(submitted?.submittedAt).toBeDefined();
    const by = /** @type {string} */ (fulfilByDay(submitted?.submittedAt, 14));
    const col = screen.getByTestId(`fc-sup-row-PK-PETB-8802-${W[1]}`);
    expect(within(col).getByTestId(/^fc-fulfil-/)).toHaveTextContent(
      `Fulfil by ${formatDate(by)} (lead time 14 days)`
    );
    // PEX-D22 — the open line is sup-007's awaiting Zone Liability week W[0];
    // a Trade-off week (W[6]) is an acknowledgement and has no fulfilment window.
    const open0 = screen.getByTestId(`fc-sup-row-PK-PETB-8802-${W[0]}`);
    expect(within(open0).getByTestId(/^fc-fulfil-/)).toHaveTextContent(
      'Lead time 14 days; the date is set when you submit'
    );
    const ack6 = screen.getByTestId(`fc-sup-row-PK-PETB-8802-${W[6]}`);
    expect(within(ack6).queryByTestId(/^fc-fulfil-/)).toBeNull();
  });
});

describe('UI layering review 2026-11 — the commitments grid', () => {
  it('BL-307 (UL-09): the forecast figure is left-aligned like every other row', async () => {
    const section = await open();
    const cells = section.querySelectorAll('[data-testid^="fc-demand-"]');
    expect(cells.length).toBeGreaterThan(0);
    for (const c of cells) expect(c.className).not.toMatch(/\btext-right\b/);
  });

  it('BL-306 (UL-08): one ⓘ on the Zone label, and one on each period chip', async () => {
    const section = await open();
    const labels = [...section.querySelectorAll('[data-grid-label]')];
    const zoneLabel = labels.find((l) => l.querySelector('[data-testid="term-tip-forecast-zone"]'));
    expect(zoneLabel?.querySelectorAll('button[aria-describedby]')).toHaveLength(1);
    const periods = section.querySelectorAll('[data-testid^="fc-sup-row-"]');
    const chipTips = section.querySelectorAll(
      '[data-testid="term-tip-zone-liability"], [data-testid="term-tip-zone-capacity"]'
    );
    expect(chipTips).toHaveLength(periods.length);
  });

  it('BL-304 (UL-06): below md the pinned label column is 7rem and the scroll area pads by it plus the cell padding', async () => {
    const section = await open();
    const grid = /** @type {HTMLElement} */ (
      section.querySelector('[data-testid^="fc-sup-grid-"]')
    );
    expect(grid.className).toContain('grid-cols-[7rem]');
    expect(grid.className).toContain('md:grid-cols-[max-content]');
    expect(/** @type {HTMLElement} */ (grid.parentElement).className).toContain(
      'scroll-ps-[7.75rem]'
    );
  });
});
