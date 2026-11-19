// ─────────────────────────────────────────────────────────────────────────────
// CAP-4 (BL-173) and CAP-5 (BL-174) — the surfaces.
//
// CAP-4 AC-01: Force Majeure on a below-LTP week refuses Submit until a note is
// entered, on supplier Capacity and on the commitment page. AC-02: the
// administrator's reason-code settings list both new codes and can rename or
// retire them. BR-03 (CAP-D2): a Discontinued answer puts "find another
// source" on the planner's alerts. CAP-5 AC-01 / BR-03: the Reason filter on
// the exception list and on PTI Capacity, with a count per reason. Every
// expected figure is read from the service the page reads, never restated.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { reasonCodeStore } from '@services/transitions/reasonCodes';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { MockProcurementService } from '@services/data/mock/MockProcurementService';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import SupplierCapacity from './SupplierCapacity';
import SupplierForecastCommitments from './SupplierForecastCommitments';
import BuyerCommitments from './BuyerCommitments';
import BuyerCapacity from './BuyerCapacity';
import BuyerAlerts from './BuyerAlerts';
import AdminReasonCodes from './admin/AdminReasonCodes';
/** @import { CapacityPlan, ForecastCommitmentLine, QueryScope } from '@services/data/types' */

const svc = new MockCommandService();
const reads = new MockProcurementService();
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {QueryScope} */
const sup007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

beforeEach(() => {
  reasonCodeStore.reset();
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  capacityStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

/**
 * Commit a line below forecast with a reason, and submit it (the supplier's two verbs).
 * @param {string} materialCode
 * @param {string} period
 * @param {string} level1
 */
const commitShort = async (materialCode, period, level1) => {
  const l = /** @type {ForecastCommitmentLine} */ (
    (await reads.getForecastCommitments(sup007)).items.find(
      (x) => x.materialCode === materialCode && x.periodBucket === period
    )
  );
  const qty = Math.floor(l.forecastQty / 2);
  const draft = await svc.dispatch(sup007, {
    transitionId: 't_requirementresponse_submit',
    entity: 'requirementResponse',
    payload: {
      publicationId: l.publicationId,
      planVersion: l.planVersion,
      supplierId: l.supplierId,
      materialCode: l.materialCode,
      periodBucket: l.periodBucket,
      confirmedQty: qty,
      confirmedQtyRaw: String(qty),
      committedDate: l.periodStart,
      rootCause: { level1, note: `probe ${level1}` }
    }
  });
  expect(draft.status).toBe('done');
  const res = await svc.dispatch(sup007, {
    transitionId: 't_requirementresponse_promote',
    entity: 'requirementResponse',
    entityId: /** @type {string} */ (draft.entityId),
    payload: {}
  });
  expect(res.status, res.reason).toBe('done');
};

/** @returns {Promise<CapacityPlan>} */
const mg20 = async () =>
  /** @type {CapacityPlan} */ (
    (await reads.getCapacityPlans(sup007)).items.find((p) => p.planningGroupId === 'pg-MG-20')
  );

/**
 * Re-submit sup-007's rigid plastics capacity as it stands, with `week` short and carrying `reason`.
 * @param {string} week
 * @param {string} reason
 */
const capacityShort = async (week, reason) => {
  const p = await mg20();
  const res = await svc.dispatch(sup007, {
    transitionId: 't_capacity_submit',
    entity: 'capacitySubmission',
    payload: {
      supplierId: 'sup-007',
      planningGroupId: 'pg-MG-20',
      weeks: p.weeks.map((w) => {
        if (w.week === week)
          return { week: w.week, allocated: Math.floor(w.demand / 2), reason, note: 'probe' };
        const allocated = w.entry?.allocated ?? w.demand;
        return {
          week: w.week,
          allocated,
          ...(w.entry?.upside !== undefined ? { upside: w.entry.upside } : {}),
          ...(allocated < w.demand
            ? { reason: w.entry?.reason ?? 'capacity', note: w.entry?.note ?? 'probe' }
            : {})
        };
      })
    }
  });
  expect(res.status, res.reason).toBe('done');
};

/** @param {HTMLElement} grid */
const weekColumns = (grid) =>
  [...grid.querySelectorAll('thead th[data-week]')].map((h) => h.getAttribute('data-week'));

// ── CAP-4 ────────────────────────────────────────────────────────────────────

describe('CAP-4 AC-01 — Force Majeure without a note refuses Submit', () => {
  it('supplier Capacity: the note appears for Force Majeure, Submit is refused until it is filled', async () => {
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER, route: '/supplier/capacity' });
    fireEvent.click(await screen.findByRole('tab', { name: 'Rigid plastic packaging' }));
    // The sample's short week is 7 Sep (W[1]) since PEX-D22 moved it into Zone Liability.
    const wShort = formatDate(W[1]);
    const select = screen.getByLabelText(`Reason for the week of ${wShort}`);
    // BR-04 — the option reads the reason's name, never the code.
    expect(within(select).getByRole('option', { name: 'Force Majeure' })).toHaveValue(
      'force-majeure'
    );
    expect(within(select).getByRole('option', { name: 'Discontinued' })).toHaveValue(
      'discontinued'
    );
    // Known-good control: the seeded reason (Material) needs no note, and Submit is ready.
    expect(screen.queryByLabelText(`Note for the week of ${wShort}`)).toBeNull();
    expect(screen.getByTestId('capacity-submit')).not.toBeDisabled();
    fireEvent.change(select, { target: { value: 'force-majeure' } });
    const note = screen.getByLabelText(`Note for the week of ${wShort}`);
    expect(screen.getByTestId('capacity-submit')).toBeDisabled();
    expect(screen.getByTestId('capacity-refusal')).toHaveTextContent(
      `Add a note for the reason in the week of ${wShort}`
    );
    fireEvent.change(note, { target: { value: 'Flood closed the plant' } });
    expect(screen.queryByTestId('capacity-refusal')).toBeNull();
    expect(screen.getByTestId('capacity-submit')).not.toBeDisabled();
  });

  // PEX-D22 — on sup-007's awaiting Zone Liability week (8802, W[0]); it used
  // the Trade-off week W[7], which now takes an acknowledgement only.
  it('the commitment page: Force Majeure below forecast shows the note and refuses until it is filled', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER });
    // CAP-1 wave 3 — the period is a column of the material's grid; its
    // controls and its refusal are scoped to the section.
    const section = await screen.findByTestId('fc-sup-material-PK-PETB-8802');
    const period = `Week of ${formatDate(W[0])}`;
    fireEvent.change(within(section).getByLabelText(`Commitment quantity for ${period}`), {
      target: { value: '20000' }
    });
    const reason = within(section).getByLabelText(`Reason below forecast for ${period}`);
    fireEvent.change(reason, { target: { value: 'material' } });
    // Known-good control: Material needs no note.
    expect(within(section).queryByLabelText(`Note for ${period}`)).toBeNull();
    expect(
      within(section).queryByText('Force Majeure, Discontinued and Other need a note.')
    ).toBeNull();
    fireEvent.change(reason, { target: { value: 'force-majeure' } });
    const note = within(section).getByLabelText(`Note for ${period}`);
    expect(
      within(section).getByText('Force Majeure, Discontinued and Other need a note.')
    ).toBeTruthy();
    fireEvent.change(note, { target: { value: 'Port closed by the storm' } });
    expect(
      within(section).queryByText('Force Majeure, Discontinued and Other need a note.')
    ).toBeNull();
  });

  it('the commitment verb refuses Discontinued without a note, whatever the channel', async () => {
    const l = /** @type {ForecastCommitmentLine} */ (
      (await reads.getForecastCommitments(sup007)).items.find(
        (x) => x.materialCode === 'PK-PETB-8802' && x.periodBucket === W[0]
      )
    );
    expect(l.zone).toBe('firm');
    const draft = await svc.dispatch(sup007, {
      transitionId: 't_requirementresponse_submit',
      entity: 'requirementResponse',
      payload: {
        publicationId: l.publicationId,
        planVersion: l.planVersion,
        supplierId: l.supplierId,
        materialCode: l.materialCode,
        periodBucket: l.periodBucket,
        confirmedQty: 1,
        confirmedQtyRaw: '1',
        committedDate: l.periodStart,
        rootCause: { level1: 'discontinued' }
      }
    });
    expect(draft.status).toBe('failed');
    expect(draft.reason).toMatch(/OTHER_REASON_NEEDS_NOTE/);
  });
});

describe('CAP-4 AC-02 — the administrator lists both codes and can rename or retire them', () => {
  it('both lists show Force Majeure and Discontinued in EN and ID, between Quality and Other', () => {
    renderWithProviders(<AdminReasonCodes />, { identity: BUYER });
    for (const list of ['capacityShortfall', 'commitmentShortfall']) {
      const box = screen.getByTestId(`admin-rsn-list-${list}`);
      const rows = within(box)
        .getAllByTestId(new RegExp(`^admin-rsn-row-${list}-`))
        .map((r) => r.getAttribute('data-testid')?.replace(`admin-rsn-row-${list}-`, ''));
      expect(rows).toEqual([
        'capacity',
        'material',
        'logistics',
        'quality',
        'force-majeure',
        'discontinued',
        'other'
      ]);
      const fm = screen.getByTestId(`admin-rsn-row-${list}-force-majeure`);
      expect(within(fm).getByText('Force Majeure')).toBeTruthy();
      expect(within(fm).getByText('Keadaan kahar')).toBeTruthy();
      const disc = screen.getByTestId(`admin-rsn-row-${list}-discontinued`);
      expect(within(disc).getByText('Discontinued')).toBeTruthy();
      expect(within(disc).getByText('Dihentikan')).toBeTruthy();
    }
  });

  it('rename Force Majeure and retire Discontinued on the capacity list; the supplier picker follows', async () => {
    const r = renderWithProviders(<AdminReasonCodes />, { identity: BUYER });
    fireEvent.click(screen.getByTestId('admin-rsn-rename-capacityShortfall-force-majeure'));
    fireEvent.change(screen.getByTestId('admin-rsn-label-en'), {
      target: { value: 'Act of God' }
    });
    fireEvent.change(screen.getByTestId('admin-rsn-label-id'), {
      target: { value: 'Bencana alam' }
    });
    fireEvent.click(screen.getByTestId('admin-rsn-submit'));
    await waitFor(() =>
      expect(
        within(screen.getByTestId('admin-rsn-row-capacityShortfall-force-majeure')).getByText(
          'Act of God'
        )
      ).toBeTruthy()
    );
    fireEvent.click(screen.getByTestId('admin-rsn-toggle-capacityShortfall-discontinued'));
    fireEvent.click(screen.getByTestId('admin-rsn-submit'));
    await waitFor(() =>
      expect(
        within(screen.getByTestId('admin-rsn-row-capacityShortfall-discontinued')).getByText(
          'Retired'
        )
      ).toBeTruthy()
    );
    r.unmount();
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER, route: '/supplier/capacity' });
    fireEvent.click(await screen.findByRole('tab', { name: 'Rigid plastic packaging' }));
    const select = screen.getByLabelText(`Reason for the week of ${formatDate(W[1])}`);
    expect(within(select).getByRole('option', { name: 'Act of God' })).toHaveValue('force-majeure');
    expect(within(select).queryByRole('option', { name: /Discontinued/ })).toBeNull();
    // The renamed code keeps its rule: it still needs a note.
    fireEvent.change(select, { target: { value: 'force-majeure' } });
    expect(screen.getByTestId('capacity-submit')).toBeDisabled();
  });
});

describe('CAP-4 BR-03 (CAP-D2) — Discontinued puts "find another source" on the planner’s alerts', () => {
  // PEX-D22 — on a Zone Liability week (W[0]); it used the Trade-off week W[6].
  it('a Discontinued commitment: one High alert for that supplier × material, linked to the commitments page', async () => {
    await commitShort('PK-PETB-8801', W[0], 'discontinued');
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER, route: '/buyer/alerts' });
    const alert = await screen.findByTestId('alert-supplyDiscontinued|PK-PETB-8801|sup-007');
    expect(alert).toHaveTextContent(
      'The supplier marked this material Discontinued: it needs another source'
    );
    expect(alert).toHaveTextContent('High');
    expect(
      within(alert).getByRole('link', { name: 'Open Foresight commitments' }).getAttribute('href')
    ).toMatch(/\/buyer\/collaboration\?material=PK-PETB-8801$/);
    // Known-false: the other material of the group carries no such answer.
    expect(screen.queryByTestId('alert-supplyDiscontinued|PK-PETB-8802|sup-007')).toBeNull();
  });

  it('a Discontinued capacity week: an alert for every material of the group; the supplier never sees it', async () => {
    const before = (await reads.getInventoryAlerts(buyer)).items.filter(
      (a) => a.rule === 'supplyDiscontinued'
    );
    expect(before).toEqual([]);
    await capacityShort('2026-09-21', 'discontinued');
    const p = await mg20();
    const after = (await reads.getInventoryAlerts(buyer)).items
      .filter((a) => a.rule === 'supplyDiscontinued')
      .map((a) => a.key);
    expect(after).toEqual(p.materials.map((m) => `supplyDiscontinued|${m}|sup-007`));
    expect(
      (await reads.getInventoryAlerts(sup007)).items.some((a) => a.rule === 'supplyDiscontinued')
    ).toBe(false);
  });
});

// ── CAP-5 ────────────────────────────────────────────────────────────────────

/** @returns {string[]} */
const exceptionIds = () =>
  within(screen.getByTestId('fc-exceptions'))
    .queryAllByTestId(/^fc-exception-/)
    .map((el) => /** @type {string} */ (el.getAttribute('data-testid')));

describe('CAP-5 — the Reason filter on the exception list', () => {
  it('AC-01 / BR-03 — Discontinued shows only its exceptions, each option counts; clearing restores the list', async () => {
    // PEX-D22 — on a Zone Liability week (W[0]); it used the Trade-off week W[6].
    await commitShort('PK-PETB-8801', W[0], 'discontinued');
    await commitShort('PK-PETB-8802', W[0], 'force-majeure');
    const lines = (await reads.getForecastCommitments(buyer)).items;
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    await screen.findByTestId('fc-exceptions');
    const all = exceptionIds();
    /** @param {string} id */
    const reasonOf = (id) =>
      lines.find((l) => `fc-exception-${l.supplierId}-${l.materialCode}-${l.periodBucket}` === id)
        ?.response?.rootCause?.level1;
    const discontinued = all.filter((id) => reasonOf(id) === 'discontinued');
    expect(discontinued).toEqual([`fc-exception-sup-007-PK-PETB-8801-${W[0]}`]);
    const unreasoned = all.filter((id) => !reasonOf(id)).length;

    fireEvent.click(screen.getByTestId('fc-reason-filter-toggle'));
    const option = screen.getByTestId('fc-reason-filter-option-discontinued');
    expect(option.closest('label')).toHaveTextContent('Discontinued (1)');
    expect(
      screen.getByTestId('fc-reason-filter-option-force-majeure').closest('label')
    ).toHaveTextContent('Force Majeure (1)');
    expect(screen.getByTestId('fc-reason-filter-option-_none').closest('label')).toHaveTextContent(
      `No reason (${unreasoned})`
    );
    fireEvent.click(option);
    expect(exceptionIds()).toEqual(discontinued);
    expect(screen.getByTestId('fc-reason-filter-toggle')).toHaveTextContent('Discontinued');
    // Two reasons: both sets, in the list's own order.
    fireEvent.click(screen.getByTestId('fc-reason-filter-option-force-majeure'));
    expect(exceptionIds()).toEqual(
      all.filter((id) => ['discontinued', 'force-majeure'].includes(reasonOf(id) ?? ''))
    );
    fireEvent.click(screen.getByTestId('fc-reason-filter-clear'));
    expect(exceptionIds()).toEqual(all);
  });
});

describe('CAP-5 BR-02 — the Reason filter on PTI Capacity hides non-matching weeks', () => {
  it('reason=force-majeure shows only that week of the plan; plans without one drop out', async () => {
    await capacityShort('2026-09-21', 'force-majeure');
    renderWithProviders(<BuyerCapacity />, {
      identity: PLANNER,
      route: '/buyer/capacity?reason=force-majeure'
    });
    const grid = await screen.findByTestId('capacity-grid-sup-007-pg-MG-20');
    expect(weekColumns(grid)).toEqual(['2026-09-21']);
    expect(screen.queryByTestId('capacity-plan-sup-005-pg-MG-02')).toBeNull();
    fireEvent.click(screen.getByTestId('capacity-filter-reason-toggle'));
    expect(
      screen.getByTestId('capacity-filter-reason-option-force-majeure').closest('label')
    ).toHaveTextContent('Force Majeure (1)');
    // Clearing the reason restores every week of the plan.
    fireEvent.click(screen.getByTestId('capacity-filter-reason-clear'));
    const p = await mg20();
    await waitFor(() =>
      expect(weekColumns(screen.getByTestId('capacity-grid-sup-007-pg-MG-20'))).toEqual(
        p.weeks.map((w) => w.week)
      )
    );
  });

  it('with Gaps only: the reason and the gap both have to hold', async () => {
    await capacityShort('2026-09-21', 'force-majeure');
    const p = await mg20();
    const gapsWithMaterial = p.weeks
      .filter((w) => w.entry && w.entry.allocated < w.demand && w.entry.reason === 'material')
      .map((w) => w.week);
    expect(gapsWithMaterial.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerCapacity />, {
      identity: PLANNER,
      route: '/buyer/capacity?gapsOnly=1&reason=material,force-majeure'
    });
    const grid = await screen.findByTestId('capacity-grid-sup-007-pg-MG-20');
    expect(weekColumns(grid)).toEqual([...gapsWithMaterial, '2026-09-21'].sort());
  });
});
