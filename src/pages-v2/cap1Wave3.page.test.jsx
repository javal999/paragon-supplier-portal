// ─────────────────────────────────────────────────────────────────────────────
// CAP-1 wave 3 (SC-HUB-CAPACITY-REQUIREMENTS-2026-10 CAP-1, AC-05) — the last
// three time-series tables moved onto the shared `WeekGrid`:
//   · Table 8  Stabilise per series   (`BuyerStabilise/components/PeriodTable`)
//   · Table 9  Submit per period      (`SupplierForecastCommitments/…/PeriodSubmitSection`)
//   · Table 10 Commitment per material(`SupplierForecastCommitments/…/MaterialSection`)
// Every figure and pill is read back from the same service or rule the page
// reads, never restated, and each table's per-period action is walked to the
// STORE: the pivot changed the layout, not the numbers or the verbs.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { sdcClock } from '@services/sdc';
import { isoWeek } from '@services/engine/dates';
import { horizonWeeks } from '@services/transitions/capacityRules';
import { deadlineState, fulfilByDay, isAcknowledgeOnly } from '@services/transitions/forecastRules';
import { formatDate, formatNumber } from '@lib/format';
import { weekHeaderDate } from '@lib/weekMonths';
import i18n from '@lib/i18n';
import { qtyOf } from './materialPlan/planDisplay';
import BuyerStabilise from './BuyerStabilise';
import SupplierForecastCommitments from './SupplierForecastCommitments';
import { buildPeriodRows, draftOf, readDraft } from './SupplierForecastCommitments/utils';
import { forecastNow } from './forecasts/forecastDisplay';
/** @import { ForecastCommitmentLine, QueryScope, StabilisedPlanView, StabilisedSeriesView } from '@services/data/types' */
/** @import { PeriodResult } from '@services/engine/stabilise' */
/** @import { PeriodRow, RowDraft } from './SupplierForecastCommitments/const' */

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
/** @type {QueryScope} */
const supplierScope = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier
};
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

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
  sdcClock.reset();
  clearStorage();
});
afterEach(async () => {
  clearStorage();
  await i18n.changeLanguage('en');
});

/**
 * The column keys of the active view.
 * @param {HTMLElement} grid the <table>
 * @param {'week' | 'month'} [kind]
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

/**
 * PSC-5 BR-01 — the week header reads `W<iso week>` over the Monday date.
 * @param {string} testId the week header's test id
 * @param {string} week the Monday, ISO date
 */
const expectWeekHeader = (testId, week) => {
  const head = screen.getByTestId(testId);
  expect(head.tagName).toBe('TH');
  expect(head).toHaveTextContent(`W${isoWeek(week)}`);
  expect(head).toHaveTextContent(weekHeaderDate(week, 'en'));
  expect(head).not.toHaveTextContent('Sept');
};

/** A stabilise quantity with its unit, or `—` when there is none. */
const qty = (/** @type {number | null} */ x, /** @type {StabilisedSeriesView['uom']} */ uom) =>
  x === null ? '—' : `${qtyOf(x, uom)} ${uom}`;

/** A forecast quantity in the reader's language (the page's `qtyText`). */
const qtyText = (/** @type {number} */ n) => formatNumber(n, { maximumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────────────────────────
// Table 8 — Stabilise per series
// ─────────────────────────────────────────────────────────────────────────────
describe('CAP-1 wave 3 Table 8 — Stabilise per series, same figures and pills', () => {
  it('every measure × week equals the engine’s own value, and each week’s rule keeps its pill', async () => {
    const p = /** @type {StabilisedPlanView} */ (
      await mockDataService.procurement.getStabilisedPlan(buyerScope)
    );
    const found = p.engine.series.find((x) => x.latest.some((w) => w.rule === 'bandHeld'));
    expect(found, 'the fixture has a week held at the band').toBeDefined();
    const s = /** @type {NonNullable<typeof found>} */ (found);
    const key = `${s.supplierId}-${s.materialCode}`;
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    fireEvent.click(await screen.findByTestId(`stb-open-${key}`));
    const grid = await screen.findByTestId(`stb-weeks-${key}`);
    // The same weeks, oldest first, each headed W<iso> over its Monday.
    expect(columnsOf(grid)).toEqual(s.latest.map((w) => w.period));
    expectWeekHeader(`stb-week-${key}-${s.latest[0].period}`, s.latest[0].period);
    expectWeekHeader(`stb-week-${key}-${s.latest[1].period}`, s.latest[1].period);
    for (const w of /** @type {PeriodResult[]} */ (s.latest)) {
      /** @param {string} rowId */
      const cell = (rowId) => cellAt(grid, rowId, w.period);
      expect(cell('engineValue')).toHaveTextContent(qty(w.raw, s.uom));
      expect(cell('lastPublished')).toHaveTextContent(qty(w.previous, s.uom));
      expect(cell('firstPublished')).toHaveTextContent(qty(w.first, s.uom));
      expect(cell('dampedValue')).toHaveTextContent(qty(w.damped, s.uom));
      expect(cell('toPublish')).toHaveTextContent(qty(w.published, s.uom));
      expect(cell('allowedRange')).toHaveTextContent(
        w.range ? `${qtyOf(w.range.low, s.uom)} – ${qtyOf(w.range.high, s.uom)}` : '—'
      );
      expect(cell('zone')).toHaveTextContent(i18n.t(`stb.zone.${w.zone}`));
      // The rule keeps its pill, its reason and its flags — nothing truncated.
      expect(screen.getByTestId(`stb-rule-${key}-${w.period}`)).toHaveTextContent(
        i18n.t(`stb.rule.${w.rule}`)
      );
      const reasonNeeded = screen.queryByTestId(`stb-reason-needed-${key}-${w.period}`);
      expect(reasonNeeded !== null).toBe(w.beyondBand && w.rule !== 'override');
      expect(within(cell('rule')).queryByText(i18n.t('stb.detail.recommit')) !== null).toBe(
        w.previous !== null && w.awaitingCommitment
      );
    }
    // The eight metric rows the week columns carried, and no week row.
    expect(grid.querySelectorAll('tbody tr[data-row]')).toHaveLength(8);
    // The rule row's label is the term, so the long text stays in its cells.
    expect(grid.querySelector('tbody tr[data-row="rule"] th')).toHaveTextContent('Rule');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Table 9 — Submit per period
// ─────────────────────────────────────────────────────────────────────────────
describe('CAP-1 wave 3 Table 9 — Submit per period, same figures and pills', () => {
  /** The page's own Submit-all rule, fed the same inputs the page feeds. */
  const periodRows = async () => {
    const lines = (await mockDataService.procurement.getForecastCommitments(supplierScope)).items;
    const plans = (await mockDataService.procurement.getCapacityPlans(supplierScope)).items;
    // The page opens on the first line's stream and only that stream's Firm
    // periods carry Submit all (PEX-D22).
    const stream = lines[0].stream;
    const streamLines = lines.filter((l) => l.stream === stream);
    /** @type {Record<string, RowDraft>} */
    const drafts = {};
    const rowDraft = (/** @type {ForecastCommitmentLine} */ l) => drafts[l.key] ?? draftOf(l);
    const readRow = (/** @type {ForecastCommitmentLine} */ l) => readDraft(l, rowDraft(l));
    const commitLines = streamLines.filter(
      (l) => l.supplierId === 'sup-007' && !isAcknowledgeOnly(l.zone)
    );
    return /** @type {PeriodRow[]} */ (
      buildPeriodRows({
        commitLines,
        lines,
        plans,
        supplierId: 'sup-007',
        horizon: horizonWeeks(forecastNow()),
        weekReasons: {},
        drafts,
        rowDraft,
        readRow
      })
    );
  };

  it('every measure × period equals the Submit-all rule’s own value, pill included', async () => {
    const rows = await periodRows();
    expect(rows.length).toBeGreaterThan(1);
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const grid = await screen.findByTestId('fc-sup-weeks-grid');
    expect(columnsOf(grid)).toEqual(rows.map((r) => r.bucket));
    expectWeekHeader(`fc-week-${rows[0].bucket}`, rows[0].bucket);
    expectWeekHeader(`fc-week-${rows[1].bucket}`, rows[1].bucket);
    for (const row of rows) {
      /** @param {string} rowId */
      const cell = (rowId) => cellAt(grid, rowId, row.bucket);
      expect(cell('lines').textContent).toBe(
        row.pending.length > 0
          ? i18n.t('fc.sup.week.lines', { count: row.pending.length })
          : i18n.t('fc.sup.week.nothing')
      );
      for (const { group, check } of row.checks) {
        if (check.level === null) {
          expect(cell('checks')).toHaveTextContent(i18n.t('fc.sup.week.outsideHorizon'));
        } else {
          expect(screen.getByTestId(`fc-week-check-${row.bucket}-${group}`)).toHaveAttribute(
            'data-level',
            check.level
          );
          expect(screen.getByTestId(`fc-week-check-${row.bucket}-${group}`)).toHaveTextContent(
            i18n.t(`inv.ltp.level.${check.level}`)
          );
        }
      }
      // The reason control shows only where the period is above BE.
      expect(within(cell('reason')).queryByRole('combobox') !== null).toBe(row.red);
      expect(screen.getByTestId(`fc-week-submit-${row.bucket}`)).toBeInTheDocument();
    }
    // The four metric rows the period columns carried, and no period row.
    expect(grid.querySelectorAll('tbody tr[data-row]')).toHaveLength(4);
  });

  it('a period’s Submit all still works: the confirm sends every material of the period', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    await screen.findByTestId(`fc-week-${W[0]}`);
    expect(screen.getByTestId(`fc-week-submit-${W[0]}`)).not.toBeDisabled();
    fireEvent.click(screen.getByTestId(`fc-week-submit-${W[0]}`));
    fireEvent.click(screen.getByTestId('fc-week-confirm-submit'));
    await waitFor(() =>
      expect(
        requirementResponseStore
          .all()
          .filter(
            (r) =>
              r.supplierId === 'sup-007' &&
              r.periodBucket === W[0] &&
              r.publicationId === 'FC-PK-V2' &&
              r.status === 'Submitted'
          )
          .map((r) => r.materialCode)
          .sort()
      ).toEqual(['2000028400', 'PK-PETB-8802'])
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Table 10 — Commitment per material
// ─────────────────────────────────────────────────────────────────────────────
describe('CAP-1 wave 3 Table 10 — Commitment per material, same figures and pills', () => {
  /**
   * 8802's lines in the active stream, as the page filters them.
   * @param {string} code
   * @returns {Promise<ForecastCommitmentLine[]>}
   */
  const linesOf = async (code) => {
    const items = (await mockDataService.procurement.getForecastCommitments(supplierScope)).items;
    const stream = /** @type {ForecastCommitmentLine} */ (
      items.find((l) => l.materialCode === code)
    ).stream;
    return items.filter(
      (l) => l.supplierId === 'sup-007' && l.stream === stream && l.materialCode === code
    );
  };

  it('every measure × period equals the line’s own value: Weekly the weeks, Monthly the months', async () => {
    const mine = await linesOf('PK-PETB-8802');
    const weeks = mine.map((l) => l.periodBucket).filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b));
    const months = mine.map((l) => l.periodBucket).filter((b) => /^\d{4}-\d{2}$/.test(b));
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const grid = await screen.findByTestId('fc-sup-grid-PK-PETB-8802');
    // CAP-2 BR-07 — Weekly shows the same weeks as before the pivot.
    expect(columnsOf(grid)).toEqual(weeks);
    expectWeekHeader(`fc-sup-row-PK-PETB-8802-${weeks[0]}`, weeks[0]);
    expectWeekHeader(`fc-sup-row-PK-PETB-8802-${weeks[1]}`, weeks[1]);
    const checkRow = (/** @type {ForecastCommitmentLine} */ l) => {
      /** @param {string} rowId */
      const cell = (rowId) => cellAt(grid, rowId, l.periodBucket);
      expect(cell('zone')).toHaveTextContent(i18n.t(`fc.zone.${l.zone}`));
      expect(cell('demand')).toHaveTextContent(qtyText(l.forecastQty));
      if (l.previousQty !== null && l.previousQty !== l.forecastQty)
        expect(cell('demand')).toHaveTextContent(i18n.t('fc.was'));
      expect(screen.getByTestId(`fc-due-${l.materialCode}-${l.periodBucket}`)).toBeInTheDocument();
      const state = screen.getByTestId(`fc-sup-state-${l.materialCode}-${l.periodBucket}`);
      const deadline = deadlineState(l, forecastNow());
      const expected =
        l.state === 'awaiting'
          ? deadline === 'overdue'
            ? i18n.t('fc.deadline.overdue')
            : deadline === 'dueSoon'
              ? i18n.t('fc.deadline.dueSoon')
              : i18n.t(isAcknowledgeOnly(l.zone) ? 'fc.state.awaitingAck' : 'fc.state.awaiting')
          : i18n.t(`fc.state.${l.state}`);
      expect(state).toHaveTextContent(expected);
      if (isAcknowledgeOnly(l.zone)) {
        // An acknowledge-only period takes no quantity and keeps its note.
        expect(within(cell('commitment')).queryByRole('textbox')).toBeNull();
        expect(cell('commitment')).toHaveTextContent(i18n.t('fc.sup.ackOnly'));
      } else {
        const qty = /** @type {HTMLInputElement} */ (
          within(cell('commitment')).getByRole('textbox')
        );
        expect(qty.value).toBe(draftOf(l).qty);
        // PEX-10 — the fulfilment window keeps its same three readings.
        const days = l.leadTimeDays ?? null;
        const by = fulfilByDay(l.response?.submittedAt, days);
        expect(cell('fulfilBy')).toHaveTextContent(
          days === null
            ? i18n.t('fc.sup.fulfilNoLeadTime')
            : by
              ? i18n.t('fc.sup.fulfilBy', { date: formatDate(by), days })
              : i18n.t('fc.sup.fulfilPending', { days })
        );
      }
    };
    for (const l of mine.filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.periodBucket))) checkRow(l);
    expect(grid.querySelectorAll('tbody tr[data-row]')).toHaveLength(9);

    // Monthly shows exactly the table's own month periods — the same months.
    fireEvent.click(
      within(screen.getByTestId('fc-sup-grid-PK-PETB-8802-view')).getByRole('button', {
        name: /Monthly/
      })
    );
    expect(columnsOf(grid, 'month')).toEqual(months);
    expect(columnsOf(grid)).toEqual([]);
    for (const l of mine.filter((x) => /^\d{4}-\d{2}$/.test(x.periodBucket))) {
      /** @param {string} rowId */
      const cell = (rowId) => cellAt(grid, rowId, l.periodBucket, 'month');
      expect(cell('zone')).toHaveTextContent(i18n.t(`fc.zone.${l.zone}`));
      expect(cell('demand')).toHaveTextContent(qtyText(l.forecastQty));
      expect(
        screen.getByTestId(`fc-sup-state-${l.materialCode}-${l.periodBucket}`)
      ).toBeInTheDocument();
    }
  });

  it('a period’s own Draft and Acknowledge still work', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    await screen.findByTestId('fc-sup-material-PK-PETB-8802');
    const grid = screen.getByTestId('fc-sup-grid-PK-PETB-8802');
    // Save draft on the awaiting Zone Liability week (W[0]).
    fireEvent.click(
      within(cellAt(grid, 'actions', W[0])).getByRole('button', {
        name: `Save draft for Week of ${formatDate(W[0])}`
      })
    );
    await waitFor(() =>
      expect(
        requirementResponseStore
          .all()
          .some(
            (r) =>
              r.materialCode === 'PK-PETB-8802' &&
              r.periodBucket === W[0] &&
              r.status === 'Draft' &&
              r.publicationId === 'FC-PK-V2'
          )
      ).toBe(true)
    );
    // Acknowledge on a Zone Capacity week (W[9]).
    fireEvent.click(
      within(cellAt(grid, 'actions', W[9])).getByRole('button', {
        name: `Acknowledge Week of ${formatDate(W[9])}`
      })
    );
    await waitFor(() =>
      expect(
        requirementResponseStore
          .all()
          .find((r) => r.materialCode === 'PK-PETB-8802' && r.periodBucket === W[9])
      ).toMatchObject({ status: 'Submitted', acknowledgment: {} })
    );
  });
});
