// ─────────────────────────────────────────────────────────────────────────────
// Forecast collaboration on the screens (REQ-E06-01 to REQ-E06-03): the menu,
// the supplier's Forecast & commitments page, PTI Forecasts and Commitments &
// gaps, the alert, Home tasks and the Order summary foresight status. Every walk
// that acts ends in the STORE or the READ.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { PTI_NAV } from '@components/layout-v2/navConfig';
import { forecastCollaborationEn, forecastCollaborationId } from '@lib/i18n/forecastCollaboration';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import i18n from '@lib/i18n';
import SupplierForecastCommitments from './SupplierForecastCommitments';
import BuyerStabilise from './BuyerStabilise';
import BuyerCommitments from './BuyerCommitments';
import BuyerAlerts from './BuyerAlerts';
import BuyerHome from './BuyerHome';
import SupplierHome from './SupplierHome';
import BuyerOrderSummary from './BuyerOrderSummary';

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {CurrentIdentity} */
const SUP_002 = {
  personaType: 'supplier',
  supplierId: 'sup-002',
  supplierName: 'PT Sample Specialty Fats',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};
const panel = () =>
  within(/** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]')));
/** @param {string} bucket */
const week = (bucket) => `Week of ${formatDate(bucket)}`;
/**
 * @param {string} supplierId
 * @param {string} material
 * @param {string} period
 */
const responsesFor = (supplierId, material, period) =>
  requirementResponseStore
    .all()
    .filter(
      (r) => r.supplierId === supplierId && r.materialCode === material && r.periodBucket === period
    );

describe('menu and copy (section 3.7)', () => {
  it('PTI Weekly plan: This week, What to order, Make warehouse room, Publish, Foresight commitments, then Demand anticipation (FUX phase 1 and phase 2 B1, F-03; CAP-10; IA P-07)', () => {
    const weekly = /** @type {import('@components/layout-v2/navConfig').NavSection} */ (
      PTI_NAV.find((s) => s.id === 'weeklyPlan')
    );
    expect(weekly.items.map((i) => [i.labelKey, i.path])).toEqual([
      ['hub.nav.pti.thisWeek', '/buyer/this-week'],
      ['hub.nav.pti.whatToOrder', '/buyer/order-plan'],
      ['hub.nav.pti.makeRoom', '/buyer/reschedule'],
      ['hub.nav.pti.publishToSuppliers', '/buyer/stabilise'],
      ['hub.nav.pti.supplierResponses', '/buyer/collaboration'],
      ['hub.nav.pti.demandAnticipation', '/buyer/demand-anticipation']
      // IA P-07 (IA-B10) — the what-if sandbox left the menu for a row action.
    ]);
    expect(PTI_NAV.find((s) => s.id === 'forecast')).toBeUndefined();
  });

  it('every new string exists in EN and ID', () => {
    expect(Object.keys(forecastCollaborationId).sort()).toEqual(
      Object.keys(forecastCollaborationEn).sort()
    );
  });
});

describe('Supplier — Forecast & commitments (REQ-E06-01 SUP, REQ-E06-02)', () => {
  it('shows its own periods with zone and state, records the view, and never another supplier’s materials', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const section = await screen.findByTestId('fc-sup-material-PK-PETB-8801');
    const firmShort = within(section).getByTestId(`fc-sup-row-PK-PETB-8801-${W[1]}`);
    expect(firmShort).toHaveTextContent('Zone Liability');
    expect(firmShort).toHaveTextContent('Outside tolerance');
    expect(within(section).getByTestId(`fc-sup-row-PK-PETB-8801-${W[8]}`)).toHaveTextContent(
      'Acknowledged'
    );
    expect(screen.getByTestId(`fc-sup-row-PK-PETB-8802-${W[0]}`)).toHaveTextContent('Overdue');
    expect(screen.getByTestId('fc-sup-version')).toHaveTextContent('Version 2');
    expect(screen.queryByText('RM-STEAR-7300')).toBeNull();
    await waitFor(() => expect(forecastViewStore.find('FC-PK-V2', 'sup-007')).toBeDefined());
  });

  it('BR-06 — Changes lists only the periods whose quantity moved', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER });
    fireEvent.click(await screen.findByRole('tab', { name: /Changes/ }));
    const changes = screen.getByTestId('fc-changes');
    const moved = within(changes).getByTestId(`fc-change-PK-PETB-8802-${W[0]}`);
    expect(moved).toHaveTextContent('38,500');
    expect(moved).toHaveTextContent('42,400');
    expect(moved).toHaveTextContent('+3,900');
    expect(within(changes).queryByTestId(`fc-change-PK-PETB-8802-${W[1]}`)).toBeNull();
  });

  it('below forecast cannot be submitted without a reason; with one it is submitted to PTI', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER });
    const section = await screen.findByTestId('fc-sup-material-PK-PETB-8802');
    const row = within(section).getByTestId(`fc-sup-row-PK-PETB-8802-${W[6]}`);
    // BR-09 — pre-filled with the forecast quantity.
    const qty = /** @type {HTMLInputElement} */ (
      within(row).getByLabelText(`Commitment quantity for ${week(W[6])}`)
    );
    expect(qty.value).toBe('38500');
    // CAP-6 (BL-175) AC-01 — a quantity per period: no date input, no Date column.
    expect(within(row).queryByLabelText(/Commitment date/)).toBeNull();
    expect(within(row).queryByDisplayValue(W[6])).toBeNull();
    // PEX-2 (BL-265) — the periods are columns; the measures are the grid's row labels.
    const labels = [...section.querySelectorAll('[data-grid-label]')].map((h) => h.textContent);
    expect(labels.some((l) => /Commitment/.test(l ?? ''))).toBe(true);
    expect(labels.some((l) => /date/i.test(l ?? ''))).toBe(false);
    fireEvent.change(qty, { target: { value: '30000' } });
    // BL-133 (ENG-D19) — the period is submitted with its one Submit all.
    const submit = screen.getByTestId(`fc-week-submit-${W[6]}`);
    expect(submit).toBeDisabled();
    expect(row).toHaveTextContent('Below forecast: choose a reason.');
    fireEvent.change(within(row).getByLabelText(`Reason below forecast for ${week(W[6])}`), {
      target: { value: 'material' }
    });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    fireEvent.click(screen.getByTestId('fc-week-confirm-submit'));
    // CAP-6 BR-02 — no date was sent; the record carries the period start.
    await waitFor(() =>
      expect(
        responsesFor('sup-007', 'PK-PETB-8802', W[6]).find((r) => r.status === 'Submitted')
      ).toMatchObject({
        forecastConfirmation: { confirmedQty: 30000, committedDate: W[6] },
        rootCause: { level1: 'material' }
      })
    );
  });

  it('BR-10 — Save draft keeps it from PTI', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER });
    const section = await screen.findByTestId('fc-sup-material-PK-PETB-8802');
    const row = within(section).getByTestId(`fc-sup-row-PK-PETB-8802-${W[7]}`);
    fireEvent.click(within(row).getByRole('button', { name: `Save draft for ${week(W[7])}` }));
    await waitFor(() =>
      expect(responsesFor('sup-007', 'PK-PETB-8802', W[7]).map((r) => r.status)).toEqual(['Draft'])
    );
  });

  it('BR-08 — a Forecast period is acknowledged, not committed', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER });
    const section = await screen.findByTestId('fc-sup-material-PK-PETB-8802');
    const row = within(section).getByTestId(`fc-sup-row-PK-PETB-8802-${W[9]}`);
    expect(within(row).queryByLabelText(/Commitment quantity/)).toBeNull();
    fireEvent.click(within(row).getByRole('button', { name: `Acknowledge ${week(W[9])}` }));
    await waitFor(() =>
      expect(responsesFor('sup-007', 'PK-PETB-8802', W[9])[0]).toMatchObject({
        status: 'Submitted',
        acknowledgment: {}
      })
    );
  });

  it('BR-06 — uploaded commitments are checked row by row: valid rows saved, refused rows listed with row and reason', async () => {
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER });
    await screen.findByTestId('fc-sup-version');
    const csv = [
      'Material code,Period,Zone,Forecast quantity,Unit,Committed quantity,Commitment date (YYYY-MM-DD),Upside quantity,Reason (capacity; material; logistics; quality; other),Note',
      // CAP-6 AC-02 — an old file's date column, here malformed, is ignored.
      `PK-PETB-8802,${W[6]},tradeOff,38500,PCS,38500,not-a-date,,,`,
      `PK-PETB-8802,${W[7]},tradeOff,38500,PCS,20000,${W[7]},,,`,
      `PK-PETB-8802,${W[5]},tradeOff,38500,PCS,1.500,${W[5]},,,`,
      `RM-STEAR-7300,2026-09,firm,12600,KG,12600,2026-09-01,,,`
    ].join('\n');
    fireEvent.change(screen.getByTestId('fc-upload-file'), {
      target: { files: [new File([csv], 'commitments.csv', { type: 'text/csv' })] }
    });
    const result = await screen.findByTestId('fc-upload-result');
    expect(within(result).getByTestId('fc-upload-saved')).toHaveTextContent('Periods saved: 1');
    expect(within(result).getByTestId('fc-upload-refused-row-3')).toHaveTextContent('a reason');
    expect(within(result).getByTestId('fc-upload-refused-row-4')).toHaveTextContent(
      'reads differently in Indonesian and English'
    );
    expect(within(result).getByTestId('fc-upload-refused-row-5')).toHaveTextContent(
      'not in your current forecast'
    );
    await waitFor(() =>
      expect(responsesFor('sup-007', 'PK-PETB-8802', W[6]).map((r) => r.status)).toEqual([
        'Submitted'
      ])
    );
  });

  it('PTI’s revision request is visible to the supplier, with its note', async () => {
    const line = /** @type {import('@services/sdc/types').RequirementResponse} */ (
      requirementResponseStore
        .all()
        .find(
          (r) =>
            r.supplierId === 'sup-007' &&
            r.materialCode === 'PK-PETB-8802' &&
            r.periodBucket === W[3]
        )
    );
    requirementResponseStore.update(line.id, (r) => ({
      ...r,
      status: 'Disputed',
      disputeResponse: [
        { kind: 'raised', text: 'Launch week, please find more', at: '2026-08-31T03:00:00.000Z' }
      ]
    }));
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER });
    const log = await screen.findByTestId(`fc-sup-log-PK-PETB-8802-${W[3]}`);
    expect(log).toHaveTextContent('PTI asked for a revision');
    expect(log).toHaveTextContent('Launch week, please find more');
    expect(screen.getByTestId(`fc-sup-row-PK-PETB-8802-${W[3]}`)).toHaveTextContent(
      'Revision requested'
    );
  });

  it('CAP-7 AC-02 / BR-02 — a line already in Revision requested counts on Home and can still be resubmitted', async () => {
    const line = /** @type {import('@services/sdc/types').RequirementResponse} */ (
      requirementResponseStore
        .all()
        .find(
          (r) =>
            r.supplierId === 'sup-007' &&
            r.materialCode === 'PK-PETB-8802' &&
            r.periodBucket === W[3]
        )
    );
    requirementResponseStore.update(line.id, (r) => ({
      ...r,
      status: 'Disputed',
      disputeResponse: [
        { kind: 'raised', text: 'Launch week, please find more', at: '2026-08-31T03:00:00.000Z' }
      ]
    }));
    const home = renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
    expect(await screen.findByTestId('home-task-commitments-revision')).toBeInTheDocument();
    home.unmount();
    renderWithProviders(<SupplierForecastCommitments />, { identity: SUPPLIER });
    const row = await screen.findByTestId(`fc-sup-row-PK-PETB-8802-${W[3]}`);
    expect(row).toHaveTextContent('Revision requested');
    const qty = /** @type {HTMLInputElement} */ (
      within(row).getByLabelText(`Commitment quantity for ${week(W[3])}`)
    );
    fireEvent.change(qty, { target: { value: qty.value === '' ? '38500' : qty.value } });
    const submit = screen.getByTestId(`fc-week-submit-${W[3]}`);
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    fireEvent.click(screen.getByTestId('fc-week-confirm-submit'));
    await waitFor(() =>
      expect(
        responsesFor('sup-007', 'PK-PETB-8802', W[3])
          .filter((r) => r.id !== line.id)
          .map((r) => r.status)
      ).toContain('Submitted')
    );
    await waitFor(() =>
      expect(screen.getByTestId(`fc-sup-row-PK-PETB-8802-${W[3]}`)).not.toHaveTextContent(
        'Revision requested'
      )
    );
  });
});

// FUX phase 2 B2 — Published versions is the `?tab=versions` tab of Publish to suppliers.
const VERSIONS_TAB = '/buyer/stabilise?tab=versions';

describe('Supplier — the Due rule is visible, once (a11y finding 19, supplier side)', () => {
  it('states the rule in one line above the material tables, and no Due header carries a hover title', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    await screen.findByTestId('fc-sup-material-PK-PETB-8801');
    const note = screen.getByTestId('fc-sup-due-rule');
    expect(note).toHaveTextContent(/^Commitment due: Zone Liability: /);
    expect(note).toHaveTextContent(/working days/);
    expect(screen.getAllByTestId('fc-sup-due-rule')).toHaveLength(1);
    // PEX-2 (BL-265) — "Commitment due" is a row label of the grid now.
    const dueLabels = [...document.querySelectorAll('[data-grid-label]')].filter((h) =>
      /Commitment due/.test(h.textContent ?? '')
    );
    expect(dueLabels.length).toBeGreaterThan(0);
    for (const header of dueLabels) expect(header.querySelector('[title]')).toBeNull();
  });
});

describe('PTI — Published versions (REQ-E06-01 MP, FUX-D1, FUX phase 2 B2)', () => {
  it('lists versions with who viewed them, as a tab of Publish to suppliers', async () => {
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: VERSIONS_TAB });
    const v1 = await screen.findByTestId('fc-version-FC-PK-V1', {}, { timeout: 20000 });
    expect(within(v1).getByTestId('fc-viewed-FC-PK-V1-sup-007')).toHaveTextContent('Viewed');
    expect(screen.getByTestId('fc-viewed-FC-PK-V2-sup-012')).toHaveTextContent('Not viewed');
    expect(screen.getByTestId('fc-pti-versions-banner')).toHaveTextContent('version 2: 2');
    // B2 — the list sits on the publishing page, so the "published from" pointer is gone:
    // the page's heading and its other tab are where a plan is published.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Publish to suppliers' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /Published versions/, selected: true })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Version to publish', selected: false })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('fc-pti-versions-publish-from')).toBeNull();
  }, 60000);

  it('FUX-D1 — no Re-publish, no Emergency re-publication and no publish handoff, for any role', async () => {
    /** @type {CurrentIdentity[]} */
    const seats = [PLANNER, BUYER, { ...BUYER, businessRoles: ['finance'] }];
    for (const identity of seats) {
      const { unmount } = renderWithProviders(<BuyerStabilise />, {
        identity,
        route: VERSIONS_TAB
      });
      await screen.findByTestId('fc-version-FC-PK-V1', {}, { timeout: 20000 });
      expect(screen.queryByTestId('fc-republish')).toBeNull();
      expect(screen.queryByTestId('fc-republish-emergency')).toBeNull();
      expect(screen.queryByTestId('handoff-forecast-publish')).toBeNull();
      expect(screen.queryByRole('button', { name: /re-publish|emergency/i })).toBeNull();
      unmount();
    }
    // Nothing on this page wrote a version.
    expect(forecastVersionStore.get('FC-PK-V3')).toBeUndefined();
  }, 60000);

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: VERSIONS_TAB });
      expect(
        await screen.findByRole('tab', { name: /Versi terbit/, selected: true }, { timeout: 20000 })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 1, name: 'Terbitkan ke pemasok' })
      ).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Versi untuk diterbitkan' })).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  }, 60000);
});

describe('PTI — Commitments & gaps (REQ-E06-03)', () => {
  it('ranks exceptions: overdue first, then Firm, then the rest', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    const list = await screen.findByTestId('fc-exceptions');
    const ids = within(list)
      .getAllByTestId(/^fc-exception-/)
      .map((el) =>
        /** @type {NonNullable<ReturnType<typeof el.getAttribute>>} */ (
          el.getAttribute('data-testid')
        ).replace('fc-exception-', '')
      );
    expect(ids.slice(0, 4).sort()).toEqual(
      [
        `sup-007-PK-PETB-8802-${W[0]}`,
        `sup-012-PK-PETB-8801-${W[0]}`,
        `sup-012-PK-PETB-8801-${W[1]}`,
        `sup-012-PK-PETB-8801-${W[2]}`
      ].sort()
    );
    expect(ids.slice(4)).toEqual([`sup-007-PK-PETB-8801-${W[1]}`, `sup-007-PK-PETB-8802-${W[3]}`]);
  });

  it('F-23 — the exceptions table comes first; the grid and the cumulative chart sit in a collapsed Coverage section below it', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    const exceptions = await screen.findByTestId('fc-exceptions');
    const details = screen.getByTestId('fc-coverage-details');
    expect(details.tagName).toBe('DETAILS');
    expect(details).not.toHaveAttribute('open');
    expect(details.querySelector('summary')).toHaveTextContent('Coverage');
    expect(
      exceptions.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(within(details).getByTestId('fc-grid')).toBeInTheDocument();
    expect(within(details).getByTestId('fc-cumulative')).toBeInTheDocument();
    expect(
      exceptions.compareDocumentPosition(screen.getByTestId('fc-coverage')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('the grid colours each period per CR-22, and over-commit reads as information', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    await screen.findByTestId('fc-grid');
    expect(screen.getByTestId(`fc-cell-sup-007-PK-PETB-8802-${W[3]}`)).toHaveAttribute(
      'data-colour',
      'red'
    );
    expect(screen.getByTestId(`fc-cell-sup-007-PK-PETB-8802-${W[2]}`)).toHaveAttribute(
      'data-colour',
      'amber'
    );
    expect(screen.getByTestId(`fc-cell-sup-007-PK-PETB-8802-${W[4]}`)).toHaveAttribute(
      'data-colour',
      'green'
    );
    expect(screen.getByTestId(`fc-cell-sup-007-PK-PETB-8802-${W[0]}`)).toHaveAttribute(
      'data-colour',
      'none'
    );
    expect(screen.getByTestId('fc-cumulative-PK-PETB-8802')).toBeInTheDocument();
    // Raw material: the Firm over-commit is information, and coverage is labelled an estimate.
    fireEvent.click(screen.getByRole('tab', { name: 'Raw material' }));
    expect(await screen.findByTestId('fc-cell-sup-002-RM-STEAR-7300-2026-10')).toHaveTextContent(
      'Above forecast'
    );
    const coverage = screen.getByTestId('fc-coverage');
    expect(coverage).toHaveTextContent('Estimate');
    expect(within(coverage).getByTestId('fc-coverage-sup-005-RM-EMUL-9410')).toHaveTextContent(
      'Distributor: 60 days from principal'
    );
  });

  it('accept: the exception leaves the list', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    const what = `PT Sample Packaging Indonesia PK-PETB-8801 ${week(W[1])}`;
    fireEvent.click(await screen.findByRole('button', { name: `Accept ${what}` }));
    fireEvent.click(panel().getByTestId('fc-action-submit'));
    const id = responsesFor('sup-007', 'PK-PETB-8801', W[1])[0].id;
    await waitFor(() =>
      expect(
        /** @type {import('@services/sdc/types').RequirementResponse} */ (
          requirementResponseStore.get(id)
        ).status
      ).toBe('Accepted')
    );
    await waitFor(() =>
      expect(screen.queryByTestId(`fc-exception-sup-007-PK-PETB-8801-${W[1]}`)).toBeNull()
    );
  });

  // CAP-7 (BL-176) — Request revision is hidden by REQUEST_REVISION_ENABLED
  // (false, "hide first", 2026-10-12). Its walk with the flag on lives in
  // BuyerCommitments.requestRevisionFlag.test.jsx, so the path stays tested.
  it('CAP-7 AC-01 — no exception shows Request revision; Accept and Move demand stay, with no handoff for the withdrawn verb', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    const what = `PT Sample Packaging Indonesia PK-PETB-8802 ${week(W[3])}`;
    const exceptions = await screen.findByTestId('fc-exceptions');
    // Control: the exception with a response renders its other two actions.
    expect(await screen.findByRole('button', { name: `Accept ${what}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Move demand for ${what}` })).toBeInTheDocument();
    expect(within(exceptions).getAllByRole('button', { name: /^Accept / }).length).toBeGreaterThan(
      0
    );
    expect(screen.queryAllByRole('button', { name: /Request revision/ })).toEqual([]);
    expect(exceptions).not.toHaveTextContent('Request revision');
    expect(screen.queryByTestId('handoff-commitment-review')).toBeNull();
  });

  it('move demand: only qualified suppliers are offered; a note is required; a new version is published', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    const what = `PT Sample Packaging Indonesia PK-PETB-8802 ${week(W[3])}`;
    fireEvent.click(await screen.findByRole('button', { name: `Move demand for ${what}` }));
    // CAP-8 BR-01 — one row per other qualified supplier.
    expect(
      panel()
        .getAllByTestId(/^fc-move-row-/)
        .map((r) => r.getAttribute('data-testid'))
    ).toEqual(['fc-move-row-sup-012']);
    fireEvent.change(panel().getByTestId('fc-move-qty-sup-012'), { target: { value: '8500' } });
    expect(panel().getByTestId('fc-action-submit')).toBeDisabled();
    fireEvent.change(panel().getByLabelText('Note'), {
      target: { value: 'Moulding line down that week' }
    });
    fireEvent.click(panel().getByTestId('fc-action-submit'));
    await waitFor(() =>
      expect(forecastVersionStore.get('FC-PK-V3')?.changeNote).toBe('Moulding line down that week')
    );
    expect(
      /** @type {import('@services/sdc/types').ForecastPublication} */ (
        forecastVersionStore.get('FC-PK-V3')
      ).lines
        .filter((l) => l.materialCode === 'PK-PETB-8802' && l.periodBucket === W[3])
        .map((l) => [l.supplierId, l.forecastQty])
    ).toEqual([
      ['sup-007', 30000],
      ['sup-012', 8500]
    ]);
  });

  it('a seat without the planning lane sees handoffs instead of the actions', async () => {
    renderWithProviders(<BuyerCommitments />, {
      identity: { ...BUYER, businessRoles: ['finance'] }
    });
    await screen.findByTestId('fc-exceptions');
    expect(screen.getAllByTestId('handoff-forecast-reassign').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^Move demand for/ })).toBeNull();
  });
});

describe('Alert, Home tasks and the Order summary', () => {
  it('REQ-E08-05 — the new rule shows on the alert page and opens Commitments & gaps', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER });
    const alert = await screen.findByTestId('alert-commitmentBelowForecast|RM-STEAR-7300|sup-002');
    expect(alert).toHaveTextContent('Committed quantity below forecast beyond tolerance');
    expect(within(alert).getByText('High')).toBeInTheDocument();
    expect(within(alert).getByRole('link', { name: 'Open Foresight commitments' })).toHaveAttribute(
      'href',
      '/buyer/collaboration?material=RM-STEAR-7300&supplier=sup-002'
    );
  });

  it('#74 — that link opens Commitments & gaps narrowed to the alert’s supplier and material', async () => {
    /** @returns {Promise<string[]>} the exception rows' ids, `<supplier>-<material>-<period>` */
    const exceptionIds = async () =>
      within(await screen.findByTestId('fc-exceptions'))
        .queryAllByTestId(/^fc-exception-/)
        .map((el) => String(el.getAttribute('data-testid')).replace('fc-exception-', ''));

    // Control: unfiltered, the page lists other suppliers, so the narrowing below is real.
    const { unmount } = renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    expect((await exceptionIds()).some((id) => !id.startsWith('sup-002-'))).toBe(true);
    unmount();

    renderWithProviders(<BuyerCommitments />, {
      identity: PLANNER,
      route: '/buyer/collaboration?material=RM-STEAR-7300&supplier=sup-002'
    });
    const ids = await exceptionIds();
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id) => !id.startsWith('sup-002-RM-STEAR-7300-'))).toEqual([]);
  });

  it('#74 — `?supplier=` alone narrows Commitments & gaps to that supplier', async () => {
    // RM-STEAR-7300 is sup-002's alone, so the test above passes on `material`
    // even if `supplier` were ignored; this one reads `supplier` and nothing else.
    renderWithProviders(<BuyerCommitments />, {
      identity: PLANNER,
      route: '/buyer/collaboration?supplier=sup-007'
    });
    const ids = within(await screen.findByTestId('fc-exceptions'))
      .queryAllByTestId(/^fc-exception-/)
      .map((el) => String(el.getAttribute('data-testid')).replace('fc-exception-', ''));
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id) => !id.startsWith('sup-007-'))).toEqual([]);
  });

  // ⚠️ PREMISE CHANGED BY BL-48 (CR-26): at 3 working days sup-007's Trade-off
  // periods are due soon at the present (their reminder is past), so the Home
  // due-soon task that used to be absent here is now present beside the overdue one.
  it('supplier Home: a new version to review, overdue Firm commitments and Trade-off commitments due soon (sup-007)', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUPPLIER });
    expect(await screen.findByTestId('home-task-new-forecast')).toHaveTextContent(
      'New forecast version to review'
    );
    expect(await screen.findByTestId('home-task-commitments-overdue')).toHaveTextContent(
      'Forecast commitments overdue'
    );
    expect(await screen.findByTestId('home-task-commitments-due-soon')).toHaveTextContent(
      'Forecast commitments due soon'
    );
  });

  // ⚠️ PREMISE CHANGED BY THE BL-48 DEMO DATA: raw-material v2 is now published
  // this morning (it was four days ago), so sup-002 has nothing due soon yet —
  // the Home task that stood here is gone. The positive control is the deadline
  // itself, on sup-002's commitment page: open, with time left.
  it('supplier Home (sup-002): no commitment task yet — the raw-material version was published this morning', async () => {
    const { unmount } = renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUP_002,
      route: '/supplier/forecasts'
    });
    const due = await screen.findByTestId('fc-due-RM-EMUL-9410-2026-10');
    expect(due).toHaveAttribute('data-timing', 'open');
    expect(due.textContent).toMatch(/07 Sept? 2026, 10:00 WIB/);
    unmount();
    renderWithProviders(<SupplierHome />, { identity: SUP_002 });
    // Control: Home's task area has rendered, so the absences below are real.
    expect(await screen.findByTestId(/^home-(tasks|empty)$/)).toBeInTheDocument();
    expect(screen.queryByTestId('home-task-commitments-due-soon')).toBeNull();
    expect(screen.queryByTestId('home-task-commitments-overdue')).toBeNull();
    expect(screen.queryByTestId('home-task-new-forecast')).toBeNull(); // sup-002 opened version 2
  });

  it('PTI Home: missing commitments escalate after the deadline; exceptions to review', async () => {
    renderWithProviders(<BuyerHome />, { identity: PLANNER });
    expect(await screen.findByTestId('home-task-missing-commitments')).toHaveTextContent(
      'Missing forecast commitments'
    );
    expect(await screen.findByTestId('home-task-commitment-exceptions')).toHaveTextContent(
      'outside tolerance'
    );
  });

  it('REQ-E07-03 — foresight reads the commitments and links to them for the PO’s material', async () => {
    renderWithProviders(<BuyerOrderSummary />, { identity: PLANNER });
    const gap = await screen.findByTestId('order-summary-foresight-po-016');
    await waitFor(() => expect(gap).toHaveTextContent('Gap'));
    // REQ-E07-03 BR-05 — the foresight destination is filtered to the PO's
    // supplier and materials, and says it came from the summary (BR-04).
    expect(within(gap).getByRole('link')).toHaveAttribute(
      'href',
      '/buyer/collaboration?po=po-016&supplier=sup-002&material=RM-STEAR-7300&from=order-summary'
    );
    expect(screen.getByTestId('order-summary-foresight-po-002')).toHaveTextContent('Awaiting');
  });
});
