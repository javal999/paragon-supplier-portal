// ─────────────────────────────────────────────────────────────────────────────
// UCX-P4 v2 (BL-365) — the supplier's one weekly page.
//
// The DONE WHEN lines this file proves:
//   · one confirmation per material each week, and a week-level confirmation
//     that carries ONLY the DA, the due POs and the Foresight periods
//     (UCX-D17) — no stock, feedstock or capacity item;
//   · a typed figure is written through the EXISTING stock verbs
//     (`t_inventorydeclaration_declare`, `t_feedstock_confirm`) and the week
//     through the existing DA confirmation (`t_daconfirmation_confirm`); the
//     page dispatches no other verb;
//   · a verb's refusal is rendered on its own row;
//   · "Last confirmed" per material and "Last changed" on capacity;
//   · the walk's control count, with 5 materials and 3 groups.
//
// The DA view stays off (DRC-D10): the page never renders a published DA
// figure, and the pinning spec (`supplierDaView.bl204.test.js`) is untouched.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { daConfirmationStore } from '@services/data/mock/stores/daConfirmationStore';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { inventoryDeclarationStore } from '@services/data/mock/stores/inventoryDeclarationStore';
import { feedstockConfirmationStore } from '@services/data/mock/stores/feedstockConfirmationStore';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { SUPPLIER_DA_VIEW_ENABLED } from '@services/transitions/supplierDaView';
import { sdcClock } from '@services/sdc';
import { dayOf } from '@services/transitions/inventoryRules';
import { NO_PERSON } from '@context/noPerson';
import { formatDate } from '@lib/format';
import SupplierWeekly from './SupplierWeekly';
/** @import { CommandResult } from '@services/data/types' */

/** A failed dispatch with the two result fields every CommandResult carries.
 * @param {string} reason
 * @returns {CommandResult}
 */
const failedResult = (reason) =>
  /** @type {CommandResult} */ ({
    status: 'failed',
    reason,
    correlationId: 'test',
    transitionId: 'test'
  });

const ROUTE = '/supplier/weekly';
const SUPPLIER_ID = SUPPLIER.supplierId ?? 'sup-007';

/** The supplier command scope, the same seat the page renders. */
const SCOPE = {
  personaType: /** @type {const} */ ('supplier'),
  supplierId: SUPPLIER_ID,
  supplierName: SUPPLIER.supplierName,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  daConfirmationStore.reset();
  inventoryDeclarationStore.reset();
  feedstockConfirmationStore.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Render and wait for the page's data. */
async function renderPage() {
  renderWithProviders(<SupplierWeekly />, { identity: SUPPLIER, route: ROUTE });
  await screen.findByTestId('supplier-weekly');
}

/**
 * Seed one confirmed week through the REAL verbs, so `weeklyUpdateStatus` and
 * `feedstockCycleStatus` read what a confirmed week really writes.
 */
async function seedConfirmedWeek() {
  const positions = (await mockDataService.procurement.getInventory(SCOPE)).items;
  for (const p of positions) {
    await mockDataService.commands.dispatch(SCOPE, {
      transitionId: 't_inventorydeclaration_declare',
      entity: 'inventoryDeclaration',
      payload: {
        supplierId: SUPPLIER_ID,
        materialCode: p.materialCode,
        totalQty: p.supplierSoh ?? 100,
        channel: 'manual',
        inProductionQty: 0
      }
    });
    await mockDataService.commands.dispatch(SCOPE, {
      transitionId: 't_feedstock_confirm',
      entity: 'feedstockConfirmation',
      payload: {
        supplierId: SUPPLIER_ID,
        materialCode: p.materialCode,
        feedstockQty: 1000,
        confirmedOn: dayOf(sdcClock.now())
      }
    });
  }
}

describe('UCX-P4 · the page and its five materials', () => {
  it('lists one row per material, three figures each, and a per-material Confirm', async () => {
    await renderPage();
    // The demo supplier holds five materials (the review's walk uses five).
    for (const code of [
      '2000028400',
      'PK-CAPF-8820',
      'PK-PETB-8801',
      'PK-PETB-8802',
      'PK-PETB-8810'
    ]) {
      const row = screen.getByTestId(`weekly-row-${code}`);
      expect(row).toBeInTheDocument();
      expect(within(row).getAllByRole('spinbutton')).toHaveLength(3);
      expect(screen.getByTestId(`weekly-confirm-${code}`)).toBeInTheDocument();
    }
    // The counter starts at zero: the feedstock half is not confirmed for any
    // packaging material (the seed has none), so no material counts yet.
    expect(screen.getByTestId('weekly-count').textContent).toContain('0 of 5');
  });

  it('pre-fills the figures and shows Last confirmed per material', async () => {
    await renderPage();
    const soh = /** @type {HTMLInputElement} */ (screen.getByTestId('weekly-soh-PK-PETB-8801'));
    expect(soh.value).toBe('85000');
    const production = /** @type {HTMLInputElement} */ (
      screen.getByTestId('weekly-production-PK-PETB-8801')
    );
    expect(production.value).toBe('60000');
    // BL-358 — the completion date rides the in-production figure: the page
    // pre-fills the latest run's own date (derived here, never hardcoded).
    const positions = (await mockDataService.procurement.getInventory(SCOPE)).items;
    const dates = (positions.find((p) => p.materialCode === 'PK-PETB-8801')?.incoming ?? [])
      .filter((i) => i.source === 'production')
      .map((i) => i.date)
      .filter(/** @returns {d is string} */ (d) => typeof d === 'string')
      .sort();
    // BL-358 — with its runs unchanged, the date is READ-ONLY: editing it could
    // not change the runs, so the page shows the latest run's own date.
    const completion = screen.getByTestId('weekly-completion-PK-PETB-8801');
    expect(completion.tagName).not.toBe('INPUT');
    expect(completion.textContent).toBe(formatDate(dates[dates.length - 1]));
    // A material that was declared today shows its date, never "Never".
    const last = screen.getByTestId('weekly-last-PK-PETB-8801');
    expect(last.textContent).not.toBe('Never');
    expect(screen.getByTestId('weekly-last-PK-CAPF-8820').textContent).toBe('Never');
  });

  it('shows capacity status and Last changed for each group, and opens it', async () => {
    await renderPage();
    expect(screen.getByTestId('weekly-group-pg-MG-20')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-group-pg-MG-21')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-group-pg-walkthrough-sstp')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-changed-pg-MG-20').textContent).not.toBe('not yet');
    expect(screen.getByTestId('weekly-changed-pg-MG-21').textContent).toBe('not yet');
    for (const group of ['pg-MG-20', 'pg-MG-21', 'pg-walkthrough-sstp']) {
      const link = screen.getByTestId(`weekly-open-${group}`);
      expect(link.getAttribute('href')).toContain(`/supplier/capacity?group=${group}`);
    }
  });

  it('carries ONLY the DA, the due POs and the Foresight periods (UCX-D17)', async () => {
    await renderPage();
    const carry = screen.getByTestId('weekly-carry');
    expect(within(carry).getByTestId('weekly-carry-demandAnticipation')).toBeInTheDocument();
    expect(within(carry).getByTestId('weekly-carry-purchaseOrders')).toBeInTheDocument();
    expect(within(carry).getByTestId('weekly-carry-foresight')).toBeInTheDocument();
    // No stock, in-production, feedstock or capacity item is carried.
    for (const forbidden of ['stock', 'feedstock', 'capacity', 'inProduction']) {
      expect(within(carry).queryByTestId(`weekly-carry-${forbidden}`)).toBeNull();
    }
    // The DA view stays off and no DA figure is rendered as a table column.
    expect(SUPPLIER_DA_VIEW_ENABLED).toBe(false);
    const table = screen.getByTestId('weekly-row-PK-PETB-8801').closest('table');
    if (table === null) throw new Error('the row is not inside a table');
    const heads = within(/** @type {HTMLElement} */ (table))
      .getAllByRole('columnheader')
      .map((h) => h.textContent ?? '');
    expect(heads.join(' ')).not.toMatch(/published|demand/i);
  });
});

describe('UCX-P4 · the write path is the existing verbs', () => {
  it('a figure change is typed in place and flips the row to Changed', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('weekly-soh-PK-PETB-8801'), {
      target: { value: '90000' }
    });
    expect(screen.getByTestId('weekly-status-PK-PETB-8801').textContent).toContain('Changed');
    expect(screen.getByTestId('weekly-confirm-PK-PETB-8801').textContent).toContain(
      'Confirm the new figures'
    );
  });

  it('Confirm writes the stock declaration and the feedstock through the existing verbs, keeping the runs', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    await renderPage();
    fireEvent.change(screen.getByTestId('weekly-feedstock-PK-PETB-8801'), {
      target: { value: '12000' }
    });
    fireEvent.click(screen.getByTestId('weekly-confirm-PK-PETB-8801'));
    await waitFor(() =>
      expect(screen.getByTestId('weekly-status-PK-PETB-8801').textContent).toContain('Confirmed')
    );
    const ids = dispatch.mock.calls.map((c) => c[1].transitionId);
    expect(ids).toEqual(['t_inventorydeclaration_declare', 't_feedstock_confirm']);
    // The stock half is the existing declaration store, and BL-358's two runs
    // survive an unchanged in-production figure.
    const declaration = inventoryDeclarationStore.latestFor(SUPPLIER_ID, 'PK-PETB-8801');
    expect(declaration?.totalQty).toBe(85000);
    expect(declaration?.inProductionQty).toBe(60000);
    expect(declaration?.inProductionRuns).toHaveLength(2);
    // The feedstock half is the feedstock store, never the stock figure.
    const feed = feedstockConfirmationStore
      .all()
      .filter((r) => r.supplierId === SUPPLIER_ID && r.materialCode === 'PK-PETB-8801')
      .pop();
    expect(feed?.feedstockQty).toBe(12000);
    expect(declaration?.totalQty).toBe(85000);
  });

  it('a refusal from the stock verb shows on its own row', async () => {
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    dispatch.mockResolvedValueOnce(failedResult('SCOPE_DENIED'));
    await renderPage();
    fireEvent.change(screen.getByTestId('weekly-feedstock-PK-PETB-8801'), {
      target: { value: '12000' }
    });
    fireEvent.click(screen.getByTestId('weekly-confirm-PK-PETB-8801'));
    const refusal = await screen.findByTestId('weekly-refusal-PK-PETB-8801');
    expect(refusal.textContent).toContain('SCOPE_DENIED');
  });

  it('a refusal from the feedstock verb shows on its own row', async () => {
    const real = mockDataService.commands.dispatch;
    vi.spyOn(mockDataService.commands, 'dispatch').mockImplementation(async (scope, input, c) =>
      input.transitionId === 't_feedstock_confirm'
        ? failedResult('QTY_INVALID')
        : real.call(mockDataService.commands, scope, input, c)
    );
    await renderPage();
    fireEvent.change(screen.getByTestId('weekly-feedstock-PK-PETB-8801'), {
      target: { value: '12000' }
    });
    fireEvent.click(screen.getByTestId('weekly-confirm-PK-PETB-8801'));
    const refusal = await screen.findByTestId('weekly-refusal-PK-PETB-8801');
    // The feedstock rule's own words, not the raw code.
    expect(refusal.textContent).toContain('quantity');
  });

  it('a CHANGED in-production figure replaces the runs as the single MAT-D4 pair', async () => {
    await renderPage();
    fireEvent.change(screen.getByTestId('weekly-production-PK-PETB-8801'), {
      target: { value: '70000' }
    });
    // A changed figure replaces the runs, so its completion date becomes an
    // editable field, pre-filled with the latest run's date (MAT-D4).
    const completion = /** @type {HTMLInputElement} */ (
      screen.getByTestId('weekly-completion-PK-PETB-8801')
    );
    expect(completion.tagName).toBe('INPUT');
    expect(completion.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    fireEvent.change(screen.getByTestId('weekly-feedstock-PK-PETB-8801'), {
      target: { value: '12000' }
    });
    fireEvent.click(screen.getByTestId('weekly-confirm-PK-PETB-8801'));
    await waitFor(() =>
      expect(screen.getByTestId('weekly-status-PK-PETB-8801').textContent).toContain('Confirmed')
    );
    const declaration = inventoryDeclarationStore.latestFor(SUPPLIER_ID, 'PK-PETB-8801');
    expect(declaration?.inProductionQty).toBe(70000);
    expect(declaration?.inProductionRuns).toBeUndefined();
  });
});

describe('UCX-P4 · Confirm the week', () => {
  it('is off until every material is confirmed, then writes the DA confirmation for the published materials', async () => {
    await seedConfirmedWeek();
    const dispatch = vi.spyOn(mockDataService.commands, 'dispatch');
    await renderPage();
    expect(screen.getByTestId('weekly-count').textContent).toContain('5 of 5');
    const week = screen.getByTestId('weekly-confirm-week');
    expect(week).not.toBeDisabled();
    fireEvent.click(week);
    await screen.findByTestId('weekly-week-done');
    expect(screen.getByTestId('weekly-week-done').textContent).toContain('W36');
    // The ONE new dispatch is the existing PSC-1 DA confirmation, with the
    // publication's own materials — never a DA figure from the page.
    const ids = dispatch.mock.calls.map((c) => c[1].transitionId);
    expect(ids).toEqual(['t_daconfirmation_confirm']);
    const input =
      /** @type {{ payload: { week: string; publicationId: string; soh: { materialCode: string; soh: number }[] } }} */ (
        /** @type {unknown} */ (dispatch.mock.calls[0][1])
      );
    const payload = input.payload;
    expect(payload.week).toBe('2026-08-31');
    expect(payload.publicationId).toBe('dap-0001');
    expect(payload.soh.map((s) => s.materialCode).sort()).toEqual([
      '2000028400',
      'PK-PETB-8801',
      'PK-PETB-8802'
    ]);
    const record = daConfirmationStore
      .all()
      .find((r) => r.supplierId === SUPPLIER_ID && r.week === '2026-08-31');
    expect(record?.publicationId).toBe('dap-0001');
    // No DA figure is in the record's payload: only the supplier's own stock.
    for (const line of record?.soh ?? []) expect(typeof line.soh).toBe('number');
  });

  it('shows the DA confirmation’s refusal in the week card', async () => {
    await seedConfirmedWeek();
    vi.spyOn(mockDataService.commands, 'dispatch').mockResolvedValueOnce(
      failedResult('NO_PUBLICATION')
    );
    await renderPage();
    fireEvent.click(screen.getByTestId('weekly-confirm-week'));
    const refusal = await screen.findByTestId('weekly-week-refusal');
    expect(refusal.textContent).toContain('NO_PUBLICATION');
    // The week stays open to retry: no success state is shown.
    expect(screen.queryByTestId('weekly-week-done')).toBeNull();
  });

  it('shows the week blocked while a material is unconfirmed', async () => {
    await renderPage();
    expect(screen.getByTestId('weekly-confirm-week')).toBeDisabled();
  });

  it('blocks the week while a published material has an UNSAVED change', async () => {
    await seedConfirmedWeek();
    await renderPage();
    expect(screen.getByTestId('weekly-confirm-week')).not.toBeDisabled();
    // An edit that is not yet confirmed is not the figure in force — the week
    // must not confirm a figure the stock record does not hold.
    fireEvent.change(screen.getByTestId('weekly-soh-PK-PETB-8802'), {
      target: { value: '23000' }
    });
    expect(screen.getByTestId('weekly-confirm-week')).toBeDisabled();
  });
});

describe('UCX-P4 · the walk’s counts (UCX-R5: one click per field, one per confirmation)', () => {
  it('with 5 materials and 3 groups: 1 + 5 × (3 fields + 1 confirm) + 1 + 3 × 4 = 34 clicks', async () => {
    await renderPage();
    // The page's own controls: 5 materials × (3 figure fields + 1 Confirm),
    // one week Confirm, and one Open capacity per group. The capacity page's
    // other three clicks per group (field, Copy to all, Submit) stay there.
    expect(document.querySelectorAll('[data-testid^="weekly-row-"]')).toHaveLength(5);
    expect(document.querySelectorAll('input[type="number"]')).toHaveLength(15);
    expect(
      document.querySelectorAll(
        '[data-testid^="weekly-confirm-PK"], [data-testid="weekly-confirm-2000028400"]'
      )
    ).toHaveLength(5);
    expect(document.querySelectorAll('[data-testid="weekly-confirm-week"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-testid^="weekly-open-pg"]')).toHaveLength(3);
  });
});
