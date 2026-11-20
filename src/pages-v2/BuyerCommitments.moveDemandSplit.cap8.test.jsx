// ─────────────────────────────────────────────────────────────────────────────
// CAP-8 (BL-177) — Move demand to several suppliers, on the planner's page and
// on the target supplier's page. Every walk that acts ends in the STORE or the
// READ.
//
// The fixture has no exception on a material with two other qualified
// suppliers, so each walk first makes one with the supplier's own verb:
// sup-005 commits 100 of its 400 kg Firm week of 31 Aug of RM-EMUL-9410 — a
// shortfall of 300 kg that sup-002 (headroom 200 kg) and sup-010 (no stated
// capacity, "—") can take. AC-01's 12 800 pcs becomes 300 kg here.
// BL-282: raw material is weekly like packaging, so the period is the week of
// 31 Aug (it was September: 1 800 kg, shortfall 1 300, headroom 942).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { sdcClock } from '@services/sdc';
import BuyerCommitments from './BuyerCommitments';
import SupplierForecastCommitments from './SupplierForecastCommitments';

const LOAD = { timeout: 15000 };
const MAT = 'RM-EMUL-9410';
const SEP = '2026-08-31';
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const SUP005_NAME = 'Sample Personal Care Emulsifiers GmbH';
const SUP002_NAME = 'PT Sample Specialty Fats';
const SUP010_NAME = 'PT Sample Halal Emulsifiers';

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  capacityStore.reset();
  sdcClock.reset();
});

/**
 * @param {string} supplierId
 * @param {string} supplierName
 * @returns {CurrentIdentity}
 */
const supplierSeat = (supplierId, supplierName) => ({
  personaType: 'supplier',
  supplierId,
  supplierName,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
});

/** sup-005 commits 100 of 400 kg (reason capacity): a 300 kg Firm exception. */
async function makeShortfall() {
  const svc = new MockCommandService();
  const scope = {
    personaType: /** @type {const} */ ('supplier'),
    supplierId: 'sup-005',
    businessRoles: PERSONA_SYSTEM_ROLES.supplier,
    actor: NO_PERSON
  };
  const v2 = /** @type {import('@services/sdc/types').ForecastPublication} */ (
    forecastVersionStore.get('FC-RM-V2')
  );
  const created = await svc.dispatch(scope, {
    transitionId: 't_requirementresponse_submit',
    entity: 'requirementResponse',
    payload: {
      publicationId: v2.publicationId,
      planVersion: v2.planVersion,
      supplierId: 'sup-005',
      materialCode: MAT,
      periodBucket: SEP,
      confirmedQty: 100,
      confirmedQtyRaw: '100',
      committedDate: SEP,
      rootCause: { level1: 'capacity' }
    }
  });
  const promoted = await svc.dispatch(scope, {
    transitionId: 't_requirementresponse_promote',
    entity: 'requirementResponse',
    entityId: /** @type {string} */ (created.entityId),
    payload: {}
  });
  expect(promoted.status).toBe('done');
}

const panel = () =>
  within(/** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]')));

/** @type {ReturnType<typeof renderWithProviders> | null} */
let page = null;

/** Open Move demand on sup-005's week-of-31-Aug line, on the Raw material tab. */
async function openMove() {
  page = renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
  fireEvent.click(await screen.findByRole('tab', { name: 'Raw material' }, LOAD));
  fireEvent.click(
    await screen.findByRole(
      'button',
      { name: new RegExp(`^Move demand for ${SUP005_NAME} ${MAT}`) },
      LOAD
    )
  );
  return panel();
}

/**
 * @param {ReturnType<typeof panel>} p
 * @param {string} supplierId
 * @param {string} qty
 */
const type = (p, supplierId, qty) =>
  fireEvent.change(p.getByTestId(`fc-move-qty-${supplierId}`), { target: { value: qty } });

const sourceLine = () =>
  forecastVersionStore
    .all()
    .find((v) => v.publicationId === 'FC-RM-V3')
    ?.lines.find(
      (l) => l.supplierId === 'sup-005' && l.materialCode === MAT && l.periodBucket === SEP
    );

describe('CAP-8 BR-01 / BR-02 — the Move demand rows', () => {
  it('one row per other qualified supplier: name, quantity, the material’s unit on every row, and the headroom or “—”', async () => {
    await makeShortfall();
    const p = await openMove();
    expect(p.getByTestId('fc-move-shortfall')).toHaveTextContent('Shortfall 300 KG');
    expect(p.getAllByTestId(/^fc-move-row-/).map((r) => r.getAttribute('data-testid'))).toEqual([
      'fc-move-row-sup-002',
      'fc-move-row-sup-010'
    ]);
    expect(p.getByTestId('fc-move-row-sup-002')).toHaveTextContent(SUP002_NAME);
    expect(p.getByTestId('fc-move-row-sup-010')).toHaveTextContent(SUP010_NAME);
    // BR-02 / CAP-D3 — the unit is the material's base unit, shown and not chosen.
    expect(p.getByTestId('fc-move-unit-sup-002')).toHaveTextContent('KG');
    expect(p.getByTestId('fc-move-unit-sup-010')).toHaveTextContent('KG');
    expect(p.queryByRole('combobox')).toBeNull();
    expect(p.getByTestId('fc-move-headroom-sup-002')).toHaveTextContent('200 KG');
    expect(p.getByTestId('fc-move-headroom-sup-010')).toHaveTextContent('—');
    expect(p.getByLabelText(`Quantity to move to ${SUP002_NAME}`)).toBeInTheDocument();
  });
});

describe('CAP-8 AC-01 — a shortfall split across two suppliers', () => {
  it('200 kg to sup-002 and 100 kg to sup-010: one version, each target’s line gains its quantity, the source records two allocations', async () => {
    await makeShortfall();
    const p = await openMove();
    type(p, 'sup-002', '200');
    type(p, 'sup-010', '100');
    expect(p.getByTestId('fc-move-total')).toHaveTextContent(
      'Moving 300 KG · Left as an exception 0 KG'
    );
    fireEvent.change(p.getByLabelText('Note'), { target: { value: 'Principal shipment late' } });
    fireEvent.click(p.getByTestId('fc-action-submit'));
    await waitFor(() => expect(forecastVersionStore.get('FC-RM-V3')).toBeDefined());
    const v3 = /** @type {import('@services/sdc/types').ForecastPublication} */ (
      forecastVersionStore.get('FC-RM-V3')
    );
    expect(
      v3.lines
        .filter((l) => l.materialCode === MAT && l.periodBucket === SEP)
        .map((l) => [l.supplierId, l.forecastQty])
        .sort()
    ).toEqual([
      ['sup-002', 1200],
      ['sup-005', 100],
      ['sup-010', 100]
    ]);
    expect(sourceLine()?.movedOut?.map((m) => [m.toSupplierId, m.qty])).toEqual([
      ['sup-002', 200],
      ['sup-010', 100]
    ]);
    expect(forecastVersionStore.get('FC-RM-V4')).toBeUndefined();
  });

  it('the target suppliers’ commitment pages show the new demand to confirm', async () => {
    await makeShortfall();
    const p = await openMove();
    type(p, 'sup-002', '200');
    type(p, 'sup-010', '100');
    fireEvent.change(p.getByLabelText('Note'), { target: { value: 'Principal shipment late' } });
    fireEvent.click(p.getByTestId('fc-action-submit'));
    await waitFor(() => expect(forecastVersionStore.get('FC-RM-V3')).toBeDefined());
    page?.unmount();

    const first = renderWithProviders(<SupplierForecastCommitments />, {
      identity: supplierSeat('sup-002', SUP002_NAME),
      route: '/supplier/forecasts'
    });
    const cells002 = await screen.findAllByTestId(/^fc-demand-/, {}, LOAD);
    expect(cells002.some((c) => /^1,200(?![\d,])/.test((c.textContent ?? '').trim()))).toBe(true);
    first.unmount();

    renderWithProviders(<SupplierForecastCommitments />, {
      identity: supplierSeat('sup-010', SUP010_NAME),
      route: '/supplier/forecasts'
    });
    const cells010 = await screen.findAllByTestId(/^fc-demand-/, {}, LOAD);
    expect(cells010.some((c) => /^100(?![\d,])/.test((c.textContent ?? '').trim()))).toBe(true);
  });

  it('a partial split leaves the rest as an exception, and its panel lists both allocations', async () => {
    await makeShortfall();
    const p = await openMove();
    type(p, 'sup-002', '120');
    type(p, 'sup-010', '80');
    expect(p.getByTestId('fc-move-total')).toHaveTextContent(
      'Moving 200 KG · Left as an exception 100 KG'
    );
    fireEvent.change(p.getByLabelText('Note'), { target: { value: 'Half from each' } });
    fireEvent.click(p.getByTestId('fc-action-submit'));
    await waitFor(() => expect(sourceLine()?.forecastQty).toBe(200));
    // Still an exception: Move demand is offered again on the remaining 100 kg.
    fireEvent.click(
      await screen.findByRole(
        'button',
        { name: new RegExp(`^Move demand for ${SUP005_NAME} ${MAT}`) },
        LOAD
      )
    );
    const again = panel();
    expect(again.getByTestId('fc-move-shortfall')).toHaveTextContent('Shortfall 100 KG');
    expect(again.getAllByTestId('fc-move-log').map((li) => li.textContent)).toEqual([
      expect.stringContaining(`Moved 120 KG to ${SUP002_NAME}: Half from each`),
      expect.stringContaining(`Moved 80 KG to ${SUP010_NAME}: Half from each`)
    ]);
  });
});

describe('CAP-8 AC-02 / BR-03 / BR-04 / BR-06 — refusal, warning and note', () => {
  it('AC-02 — more than the shortfall in total is refused on the page with the shortfall named, and not sent', async () => {
    await makeShortfall();
    const p = await openMove();
    fireEvent.change(p.getByLabelText('Note'), { target: { value: 'x' } });
    type(p, 'sup-002', '200');
    // Control: within the shortfall, nothing is refused and the confirm is on.
    expect(p.queryByTestId('fc-move-refusal')).toBeNull();
    expect(p.getByTestId('fc-action-submit')).toBeEnabled();
    type(p, 'sup-010', '101');
    expect(p.getByTestId('fc-move-refusal')).toHaveTextContent('More than the shortfall of 300 KG');
    expect(p.getByTestId('fc-move-refusal')).not.toHaveClass('sr-only');
    const confirm = p.getByTestId('fc-action-submit');
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAccessibleDescription('More than the shortfall of 300 KG');
    fireEvent.click(confirm);
    expect(forecastVersionStore.get('FC-RM-V3')).toBeUndefined();
  });

  it('BR-04 — above a target’s headroom warns on that row and does not block', async () => {
    await makeShortfall();
    const p = await openMove();
    type(p, 'sup-002', '200');
    // Control: at the headroom, no warning.
    expect(p.queryByTestId('fc-move-warn-sup-002')).toBeNull();
    type(p, 'sup-002', '250');
    expect(p.getByTestId('fc-move-warn-sup-002')).toHaveTextContent(
      'Above this supplier’s headroom of 200 KG. You can still move it.'
    );
    expect(p.getByTestId('fc-move-qty-sup-002')).toHaveAccessibleDescription(
      'Above this supplier’s headroom of 200 KG. You can still move it.'
    );
    // Unknown headroom never warns.
    type(p, 'sup-010', '50');
    expect(p.queryByTestId('fc-move-warn-sup-010')).toBeNull();
    fireEvent.change(p.getByLabelText('Note'), { target: { value: 'Over capacity on purpose' } });
    expect(p.getByTestId('fc-action-submit')).toBeEnabled();
    fireEvent.click(p.getByTestId('fc-action-submit'));
    await waitFor(() => expect(sourceLine()?.forecastQty).toBe(100));
  });

  it('BR-06 — the note stays required: a valid split waits for it', async () => {
    await makeShortfall();
    const p = await openMove();
    type(p, 'sup-002', '200');
    const confirm = p.getByTestId('fc-action-submit');
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAccessibleDescription('Required. The supplier can read it.');
    fireEvent.change(p.getByLabelText('Note'), { target: { value: '   ' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(p.getByLabelText('Note'), { target: { value: 'Covered by sup-002' } });
    expect(confirm).toBeEnabled();
  });
});
