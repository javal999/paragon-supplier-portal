// ─────────────────────────────────────────────────────────────────────────────
// PSC-1 (BL-336) — the one-time weekly confirmation on the supplier's DA page,
// with `SUPPLIER_DA_VIEW_ENABLED` switched ON for this file only (it ships
// false; see `SupplierDemandAnticipation.bl204.page.test.jsx`).
//
// AC-01 the Friday publication and BOTH deadlines; AC-02 SOH is one figure that
// pre-fills the stock page and reads back from the stock record; AC-03 the first
// confirmation is explicit, a no-change week is carried forward, a changed week
// records the change and who made it; AC-04 only the changed field is recorded
// as a supplier change; AC-05 a first week with no submit is not a confirmation;
// AC-06 a monthly Foresight period shows only in its publication week; AC-07 the
// page lists the DA materials, the due POs, the capacity groups and the
// feedstock rows.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { daConfirmationStore } from '@services/data/mock/stores/daConfirmationStore';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { inventoryDeclarationStore } from '@services/data/mock/stores/inventoryDeclarationStore';
import {
  allDemandAnticipation,
  supplierDemandAnticipation
} from '@services/data/mock/demandAnticipationReadModel';
import { daConfirmationStatus } from '@services/transitions/daConfirmationRules';
import { sdcClock } from '@services/sdc';
import { formatNumber } from '@lib/format';
import SupplierDemandAnticipation from './SupplierDemandAnticipation';
import SupplierInventory from './SupplierInventory';
import { foresightPublishedInWeek } from './demandAnticipation/DaConfirmationPanel';

vi.mock('@services/transitions/supplierDaView', async (importOriginal) => ({
  .../** @type {object} */ (await importOriginal()),
  SUPPLIER_DA_VIEW_ENABLED: true
}));

const ROUTE = '/supplier/demand-anticipation';
const SUPPLIER_ID = SUPPLIER.supplierId ?? 'sup-007';
const CODE = 'PK-PETB-8802';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  daConfirmationStore.reset();
  inventoryDeclarationStore.reset();
});

/**
 * The published row the page opens on, read from the same source the page reads.
 * @returns {import('@services/data/mock/demandAnticipationReadModel').SupplierDaRow}
 */
function ownRow() {
  const row = supplierDemandAnticipation().find(
    (r) => r.supplierId === SUPPLIER.supplierId && r.materialCode === CODE
  );
  if (!row) throw new Error(`no published DA for ${CODE}`);
  return row;
}

/** @param {string} value */
const typeSoh = (value) =>
  fireEvent.change(screen.getByTestId(`da-confirm-soh-${CODE}`), { target: { value } });

describe('PSC-1 AC-01 · the Friday publication and both deadlines', () => {
  it('shows the publication and the Wednesday confirmation and Thursday stock deadlines', async () => {
    const row = ownRow();
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId('da-confirm');
    expect(screen.getByTestId('da-confirm-publication').textContent).toContain('Published for');
    // BR-01 — Zone Liability and the DA read the same publication.
    expect(screen.getByTestId('da-confirm-zones').textContent).toContain('Zone Liability');
    const due = screen.getByTestId('da-confirm-due').textContent ?? '';
    const cutoff = screen.getByTestId('da-confirm-stock-cutoff').textContent ?? '';
    expect(due).toContain('23:59 WIB');
    expect(cutoff).toContain('23:59 WIB');
    // The two deadlines are different days: Wednesday, then Thursday.
    expect(due).not.toBe(cutoff);
    // The confirmation deadline is after the publication it confirms.
    expect(Date.parse(row.confirmation.dueAt)).toBeGreaterThan(Date.parse(row.publishedAt));
  });

  it('the stock page shows the Thursday cutoff too (the same weekly cycle)', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      route: '/supplier/inventory'
    });
    const status = await screen.findByTestId('weekly-status');
    expect(status.textContent).toContain('23:59');
  });
});

describe('PSC-1 AC-02 · SOH is one figure, pre-filled here and written there', () => {
  it('the confirmation writes no stock record, and pre-fills the stock entry form with 1,200', async () => {
    const before = inventoryDeclarationStore.all().length;
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId('da-confirm');
    typeSoh('1200');
    fireEvent.click(screen.getByTestId('da-confirm-submit'));
    await waitFor(() => expect(daConfirmationStore.all()).toHaveLength(1));
    // BR-06 / REQ-E08-02 BR-09 — the confirmation writes NO stock record.
    expect(inventoryDeclarationStore.all()).toHaveLength(before);
    expect(daConfirmationStore.all()[0].supplierId).toBe(SUPPLIER_ID);
    expect(daConfirmationStore.all()[0].soh).toContainEqual({ materialCode: CODE, soh: 1200 });

    // The stock page is the single entry point; its form arrives pre-filled.
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      route: `/supplier/inventory?enter=${CODE}`
    });
    await screen.findByTestId('stock-entry-panel');
    const panel = within(screen.getByRole('dialog'));
    await waitFor(() => expect(panel.getByLabelText(/Stock on hand/)).toHaveValue('1200'));
  });

  it('an edit on the stock page reads back on the DA page, from the stock record', async () => {
    renderWithProviders(<SupplierInventory />, {
      identity: SUPPLIER,
      route: `/supplier/inventory?enter=${CODE}`
    });
    await screen.findByTestId('stock-entry-panel');
    const panel = within(screen.getByRole('dialog'));
    fireEvent.change(panel.getByLabelText(/Stock on hand/), { target: { value: '1250' } });
    // MAT-D4 — in production is required, 0 allowed.
    fireEvent.change(panel.getByLabelText(/In production/), { target: { value: '0' } });
    fireEvent.click(panel.getByTestId('stock-entry-submit'));
    await waitFor(() =>
      expect(inventoryDeclarationStore.latestFor(SUPPLIER_ID, CODE)?.totalQty).toBe(1250)
    );

    // The DA page's current week reads the STOCK RECORD, not the confirmation.
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId('da-confirm');
    await waitFor(() => expect(screen.getByTestId(`da-confirm-soh-${CODE}`)).toHaveValue(1250));
    expect(screen.getByTestId(`da-confirm-row-${CODE}`).textContent).toContain(
      'From the stock record'
    );
  });
});

describe('PSC-1 AC-03 / AC-05 · explicit first, carried forward after, changes recorded', () => {
  it('a first week with no submit is not a confirmation', async () => {
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId('da-confirm');
    expect(screen.getByTestId('da-confirm-status').textContent).toContain('First confirmation due');
    expect(daConfirmationStore.all()).toHaveLength(0);
  });

  it('the first confirmation is explicit, and the next week with no submit is carried forward', async () => {
    const row = ownRow();
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId('da-confirm');
    typeSoh('1200');
    fireEvent.click(screen.getByTestId('da-confirm-submit'));
    await waitFor(() => expect(daConfirmationStore.all()).toHaveLength(1));

    // A later week with no record of its own carries the last confirmation.
    const laterWeek = new Date(Date.parse(`${row.planningWeek}T00:00:00.000Z`) + 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const { status, carriedFromWeek } = daConfirmationStatus(
      daConfirmationStore.all(),
      SUPPLIER_ID,
      laterWeek
    );
    expect(status).toBe('carriedForward');
    expect(carriedFromWeek).toBe(row.planningWeek);
    // BR-05 — a carried-forward week writes no record.
    expect(daConfirmationStore.all()).toHaveLength(1);
  });

  it('a changed week records the change and who made it', async () => {
    const row = ownRow();
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId('da-confirm');
    typeSoh('1200');
    fireEvent.click(screen.getByTestId('da-confirm-submit'));
    await waitFor(() => expect(daConfirmationStore.all()).toHaveLength(1));

    // Change it against the figure in force (the stock record’s own figure).
    typeSoh('999');
    fireEvent.click(screen.getByTestId('da-confirm-submit'));
    await waitFor(() => expect(daConfirmationStore.all()).toHaveLength(2));
    const latest = daConfirmationStore.all()[1];
    expect(latest.week).toBe(row.planningWeek);
    expect(latest.changedFields).toContain(`soh:${CODE}`);
    expect(latest.recordedBy).toBeTruthy();
  });
});

describe('PSC-1 AC-04 · only the differences are supplier changes', () => {
  it('changing one figure records that field and leaves the others as pre-filled', async () => {
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId('da-confirm');
    // The page arrives pre-filled; submitting it unchanged records NO change.
    fireEvent.click(screen.getByTestId('da-confirm-submit'));
    await waitFor(() => expect(daConfirmationStore.all()).toHaveLength(1));
    expect(daConfirmationStore.all()[0].changedFields).toEqual([]);

    // Change exactly one figure and submit the change.
    fireEvent.change(screen.getByTestId(`da-confirm-soh-${CODE}`), { target: { value: '7' } });
    fireEvent.click(screen.getByTestId('da-confirm-submit'));
    await waitFor(() => expect(daConfirmationStore.all()).toHaveLength(2));
    const latest = daConfirmationStore.all()[1];
    expect(latest.changedFields).toEqual([`soh:${CODE}`]);
  });
});

describe('PSC-1 AC-06 · a monthly Foresight period shows only in its publication week', () => {
  const WEEK = '2026-09-07';
  const NEXT = '2026-09-14';
  const MONTH = '2026-09';

  it('a month period is counted only for the week it was published in', () => {
    const monthly = [
      { materialCode: 'RM-X', periodBucket: MONTH, publishedAt: `${WEEK}T06:00:00.000Z` }
    ];
    expect(foresightPublishedInWeek(monthly, WEEK, NEXT)).toEqual(['RM-X']);
    expect(foresightPublishedInWeek(monthly, '2026-09-14', '2026-09-21')).toEqual([]);
  });

  it('a weekly period published this week counts; one published earlier does not', () => {
    expect(
      foresightPublishedInWeek(
        [{ materialCode: 'PK-Y', periodBucket: WEEK, publishedAt: `${WEEK}T06:00:00.000Z` }],
        WEEK,
        NEXT
      )
    ).toEqual(['PK-Y']);
    expect(
      foresightPublishedInWeek(
        [{ materialCode: 'PK-Y', periodBucket: WEEK, publishedAt: `2026-08-31T06:00:00.000Z` }],
        NEXT,
        '2026-09-21'
      )
    ).toEqual([]);
  });
});

describe('PSC-1 AC-07 · the page lists what the week’s confirmation covers', () => {
  it('lists the DA materials, the due POs, the capacity groups and the feedstock rows', async () => {
    renderWithProviders(<SupplierDemandAnticipation />, { identity: SUPPLIER, route: ROUTE });
    await screen.findByTestId('da-confirm');
    const planner = allDemandAnticipation().filter((r) => r.supplierId === SUPPLIER.supplierId);
    for (const r of planner)
      expect(screen.getByTestId(`da-confirm-row-${r.materialCode}`)).toBeInTheDocument();
    expect(screen.getByTestId('da-confirm-pos')).toBeInTheDocument();
    expect(screen.getByTestId('da-confirm-capacity')).toBeInTheDocument();
    // sup-007 supplies packaging, so the feedstock rows are listed.
    expect(screen.getByTestId('da-confirm-feedstock')).toBeInTheDocument();
    // The published DA total is the planner's own figure, never restated here.
    expect(screen.getByTestId(`da-confirm-row-${CODE}`).textContent).toContain(
      formatNumber(ownRow().totalDa)
    );
  });
});
