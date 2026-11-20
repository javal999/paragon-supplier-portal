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

import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import {
  capacityStore,
  inventoryAlertLedger,
  stockAccessStore
} from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { fulfilByDay } from '@services/transitions/forecastRules';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { formatDate } from '@lib/format';
import SupplierForecastCommitments from './SupplierForecastCommitments';
/** @import { ForecastCommitmentLine } from '@services/data/types' */

const clearStorage = () => {
  try {
    window.localStorage.clear();
  } catch {
    // nothing stored
  }
};

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  capacityStore.reset();
  stockAccessStore.reset();
  sdcClock.reset();
  clearStorage();
});
afterEach(async () => {
  clearStorage();
  await i18n.changeLanguage('en');
});

const open = async () => {
  renderWithProviders(<SupplierForecastCommitments />, {
    identity: SUPPLIER,
    route: '/supplier/forecasts'
  });
  return screen.findByTestId('fc-sup-material-PK-PETB-8802');
};

/** The 8802 section's grid (`WeekGrid` renders a real table). */
const gridOf = () => screen.getByTestId('fc-sup-grid-PK-PETB-8802');

/**
 * The period columns of the active view (weekly by default).
 * @param {HTMLElement} grid
 * @param {'week' | 'month'} kind
 * @returns {string[]}
 */
const columnsOf = (grid, kind = 'week') =>
  [...grid.querySelectorAll(`thead th[data-${kind}]`)].map(
    (h) => /** @type {string} */ (h.getAttribute(`data-${kind}`))
  );

/**
 * The cell of grid row `rowId` under period `bucket`, through the column its
 * header names (G-15).
 * @param {HTMLElement} grid the <table>
 * @param {string} rowId
 * @param {string} bucket
 * @param {'week' | 'month'} [kind]
 * @returns {HTMLElement}
 */
const cellAt = (grid, rowId, bucket, kind = 'week') => {
  const heads = [...grid.querySelectorAll('thead th')];
  const col = heads.findIndex((h) => h.getAttribute(`data-${kind}`) === bucket);
  expect(col, `period ${bucket} is a column`).toBeGreaterThan(0);
  const row = grid.querySelector(`tbody tr[data-row="${rowId}"]`);
  expect(row, `row ${rowId}`).not.toBeNull();
  return /** @type {HTMLElement} */ (/** @type {Element} */ (row).querySelectorAll('td')[col - 1]);
};

/** @param {string} testId the grid's test id */
const toMonthly = (testId) =>
  fireEvent.click(
    within(screen.getByTestId(`${testId}-view`)).getByRole('button', { name: /Monthly/ })
  );

/**
 * The lines the page reads, in the service's order, for one material.
 * @param {string} materialCode
 * @returns {Promise<ForecastCommitmentLine[]>}
 */
const linesFor = async (materialCode) => {
  const view = await mockDataService.procurement.getForecastCommitments({
    personaType: 'supplier',
    supplierId: 'sup-007',
    businessRoles: PERSONA_SYSTEM_ROLES.supplier
  });
  const stream = /** @type {ForecastCommitmentLine} */ (
    view.items.find((l) => l.materialCode === materialCode)
  ).stream;
  return view.items.filter((l) => l.stream === stream && l.materialCode === materialCode);
};

describe('PEX-2 (BL-265) — periods are columns', () => {
  it('one column per period, oldest first: 17 weeks in Weekly, the months in Monthly; the row labels come first', async () => {
    await open();
    const grid = gridOf();
    // CAP-1 wave 3 — the grid is the shared WeekGrid: a real table.
    expect(grid.tagName).toBe('TABLE');
    expect(columnsOf(grid)).toEqual(W.slice(0, 17));
    expect(columnsOf(grid, 'month')).toEqual([]);
    // The measures are the grid's rows, pinned on the left (BR-02).
    const labels = [...grid.querySelectorAll('tbody th[scope="row"]')];
    expect(labels).toHaveLength(9);
    for (const l of labels) expect(l.className).toMatch(/\bsticky\b.*\bleft-0\b/);
    // CAP-2 BR-07 — Monthly shows the table's own month periods, the same
    // months the old table listed after its weeks; Weekly leaves them out.
    const lines = await linesFor('PK-PETB-8802');
    const months = lines.map((l) => l.periodBucket).filter((b) => /^\d{4}-\d{2}$/.test(b));
    expect(months.length).toBeGreaterThan(0);
    toMonthly('fc-sup-grid-PK-PETB-8802');
    expect(columnsOf(grid, 'month')).toEqual(months);
    expect(columnsOf(grid)).toEqual([]);
    const first = screen.getByTestId(`fc-sup-row-PK-PETB-8802-${months[0]}`);
    expect(first.tagName).toBe('TH');
    expect(first).toHaveTextContent(
      new Intl.DateTimeFormat('en-GB', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      }).format(new Date(`${months[0]}-01T00:00:00Z`))
    );
    // A month period is drawn by the page's own cell — the state pill, the
    // capacity left, the Acknowledge control — not by the read-only combined
    // month of CAP-2 BR-05, so the page prints no "Switch to Weekly" line.
    expect(
      within(cellAt(grid, 'status', months[0], 'month')).getByTestId(
        `fc-sup-state-PK-PETB-8802-${months[0]}`
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('fc-sup-grid-PK-PETB-8802-readonly')).toBeNull();
  });
});

describe('PEX-1 (BL-264) — zone names', () => {
  it('reads Zone Liability and Zone Capacity, never Firm, Trade-off or Forecast as a zone', async () => {
    const section = await open();
    expect(within(section).getAllByText('Zone Liability').length).toBeGreaterThan(0);
    expect(within(section).getAllByText('Zone Capacity').length).toBeGreaterThan(0);
    expect(within(section).queryByText(/^(Firm|Trade-off|Forecast)$/)).toBeNull();
    // BL-306 (UL-08): the zone tips sit on each period's chip; the Zone row
    // label carries the one `forecastZone` tip and no per-zone tip.
    expect(within(section).getAllByTestId('term-tip-zone-liability').length).toBeGreaterThan(0);
    expect(within(section).getAllByTestId('term-tip-zone-capacity').length).toBeGreaterThan(0);
    const zoneLabel = /** @type {HTMLElement} */ (
      gridOf().querySelector('tbody tr[data-row="zone"] th')
    );
    expect(zoneLabel.querySelector('[data-testid="term-tip-zone-liability"]')).toBeNull();
    expect(zoneLabel.querySelector('[data-testid="term-tip-forecast-zone"]')).not.toBeNull();
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
    // BL-284 / !161-7 (owner, 2026-11-19): the row is the gross LTP share, so
    // the note names the row as the LTP share to commit and the hover's gap as
    // context — it must not claim the row equals the gap.
    expect(within(section).getByTestId('fc-sup-demand-note-PK-PETB-8802')).toHaveTextContent(
      'The row is the LTP (planned use) share to commit. The gap on the hover (LTP − PTI stock on hand) is shown for context.'
    );
    expect(within(section).getByTestId('fc-sup-demand-note-PK-PETB-8802')).not.toHaveTextContent(
      'Ordered quantity ='
    );
  });

  it('ID — the same note in Indonesian', async () => {
    await i18n.changeLanguage('id');
    const section = await open();
    expect(within(section).getByTestId('fc-sup-demand-note-PK-PETB-8802')).toHaveTextContent(
      'Baris ini adalah bagian LTP (rencana pemakaian) yang perlu dikomitmenkan. Selisih pada hover (LTP − stok PTI yang ada) ditampilkan sebagai konteks.'
    );
  });

  it('PEX-3 BR-02 (BL-284) — a granted material’s hover shows the LTP, PTI stock on hand and the gap', async () => {
    // sup-007's seeded grant covers the two consignment bottles (PK-PETB-8801,
    // PK-PETB-8802). W[0] of 8802: LTP 42,400 (5,500/day × 7 days × 1.1);
    // PTI stock 55,000 (SAP, all plants); gap = LTP − SOH = −12,600.
    await open();
    const tip = screen.getByTestId(`term-tip-demand-pk-petb-8802-${W[0]}`);
    const body = within(tip).getByRole('tooltip');
    expect(body).toHaveTextContent(/^Ordered quantity for Week of /);
    expect(body).toHaveTextContent('LTP (planned use) 42,400 PCS');
    expect(body).toHaveTextContent('PTI stock on hand 55,000 PCS');
    expect(body).toHaveTextContent('Gap (LTP − PTI stock on hand) -12,600 PCS');
  });

  it('PEX-3 BR-02 (BL-284) — without the PTI-stock grant the hover keeps the ordered quantity only', async () => {
    // Q-W3 (PEX-D24): the per-week figures show only for a material the
    // supplier's granted PTI-stock access covers. Same material, grant off.
    const grant = stockAccessStore.get('sup-007');
    expect(grant?.active).toBe(true);
    stockAccessStore.put({ .../** @type {NonNullable<typeof grant>} */ (grant), active: false });
    await open();
    const tip = screen.getByTestId(`term-tip-demand-pk-petb-8802-${W[0]}`);
    const body = within(tip).getByRole('tooltip');
    expect(body).toHaveTextContent(/^Ordered quantity for Week of /);
    expect(body).toHaveTextContent(
      'LTP, PTI stock on hand and the gap are shown only for materials PTI has granted you stock access to.'
    );
    expect(body).not.toHaveTextContent('LTP (planned use)');
    expect(body).not.toHaveTextContent('PTI stock on hand 55,000');
  });

  it('PEX-3 BR-02 (BL-284) — a material outside the grant keeps the same read (RM belongs to sup-002)', async () => {
    // The head grant names the two bottles only; the walkthrough container
    // (2000028400) is sup-007's too but is not in the grant, so its hover shows
    // no figures either.
    await open();
    const tip = screen.getByTestId(`term-tip-demand-2000028400-${W[0]}`);
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'LTP, PTI stock on hand and the gap are shown only for materials PTI has granted you stock access to.'
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
    const grid = gridOf();
    const submittedCell = cellAt(grid, 'fulfilBy', W[1]);
    expect(within(submittedCell).getByTestId(/^fc-fulfil-/)).toHaveTextContent(
      `Fulfil by ${formatDate(by)} (lead time 14 days)`
    );
    // PEX-D22 — the open line is sup-007's awaiting Zone Liability week W[0];
    // a Trade-off week (W[6]) is an acknowledgement and has no fulfilment window.
    expect(within(cellAt(grid, 'fulfilBy', W[0])).getByTestId(/^fc-fulfil-/)).toHaveTextContent(
      'Lead time 14 days; the date is set when you submit'
    );
    const ack6 = cellAt(grid, 'fulfilBy', W[6]);
    expect(within(ack6).queryByTestId(/^fc-fulfil-/)).toBeNull();
    expect(ack6).toHaveTextContent('—');
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
    const grid = gridOf();
    const zoneLabel = /** @type {HTMLElement} */ (
      grid.querySelector('tbody tr[data-row="zone"] th')
    );
    expect(zoneLabel.querySelectorAll('button[aria-describedby]')).toHaveLength(1);
    const periods = grid.querySelectorAll('thead th[data-week], thead th[data-month]');
    const chipTips = section.querySelectorAll(
      '[data-testid="term-tip-zone-liability"], [data-testid="term-tip-zone-capacity"]'
    );
    expect(chipTips).toHaveLength(periods.length);
  });

  it('BL-304 (UL-06): the pinned label column and the scroll padding come from the shared grid', async () => {
    await open();
    const grid = gridOf();
    // G-02 — the row labels are sticky, 140 px under 768 px and 220 px from md up.
    const label = /** @type {HTMLElement} */ (grid.querySelector('tbody th[scope="row"]'));
    expect(label.className).toMatch(/\bsticky\b.*\bleft-0\b/);
    expect(label.className).toContain('w-[140px]');
    expect(label.className).toContain('md:w-[220px]');
    // G-13 (BL-186) — the scroll area's own padding is the label column's
    // width, so a focused field lands clear of the labels.
    const scroll = screen.getByTestId('fc-sup-grid-PK-PETB-8802-scroll');
    expect(scroll.className).toContain('scroll-ps-[140px]');
    expect(scroll.className).toContain('md:scroll-ps-[220px]');
  });
});
