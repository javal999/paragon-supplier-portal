// ─────────────────────────────────────────────────────────────────────────────
// CAP-11 (BL-180) on the screen — the Demand anticipation page after recording
// consumption: the Recorded consumption row, the Record consumption panel
// (typed, uploaded, an odd file refused with one line, the template download),
// the handoff notice for a seat without `forecast:publish`, the surplus alert
// on PTI alerts linking back to the supplier × material, and both locales with
// the figure never abbreviated to "DA".
//
// RETIRED with CAP-11 BR-02/03 (superseded by DRC-4 BR-02, BL-190): the
// "−n absorbed from the W36–W39 excess" cells, and "at W40, before W40–W43 is
// published, no week can be typed". Recorded consumption no longer lowers the
// demand anticipation; the alert test below is rewired to DRC-4's surplus.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { NO_PERSON } from '@context/noPerson';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';
import BuyerAlerts from './BuyerAlerts';
import { readFileText } from './inventory/inventoryDisplay';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/demand-anticipation';
// sup-002 × RM-STEAR-7300 — one supplier; W36 is published at 3,220 KG by the seed.
const KEY = 'sup-002-RM-STEAR-7300';
const W36 = '2026-08-31';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  consumptionStore.reset();
  inventoryAlertLedger.reset();
});
afterEach(() => {
  sdcClock.reset();
  vi.restoreAllMocks();
});

/**
 * P-12 — opens one of the page's tabs, by its visible name.
 * @param {string} name
 */
const openTab = async (name) => fireEvent.click(await screen.findByRole('tab', { name }));

/** No figure, label or message reads "DA" — it labels Delivery Agreements (CAP-D10). */
const expectNoAbbreviation = () => expect(document.body.textContent ?? '').not.toMatch(/\bDA\b/);

/** @param {string} csv @param {string} [name] */
const upload = (csv, name = 'consumption.csv') =>
  fireEvent.change(screen.getByTestId('consumption-upload-file'), {
    target: { files: [new File([csv], name, { type: 'text/csv' })] }
  });

/** IA review item 1 — the cards open folded; unfold every card's weeks grid. */
const openAllWeeks = async () => {
  await screen.findByTestId('dant-filters', {}, { timeout: 15000 });
  for (const b of screen.getAllByTestId(/^dant-weeks-toggle-/)) fireEvent.click(b);
};

describe('recording consumption (typed)', () => {
  it('shows Recorded consumption on W36 and leaves the demand anticipation as it was', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openAllWeeks();
    // P-12 — the panel is the "Record consumption" tab; the cards are "This week".
    await openTab('Record consumption');
    const panel = await screen.findByTestId('consumption-panel');
    expect(within(panel).getByTestId('consumption-source-marker')).toHaveTextContent(
      'Consumption recorded by the planner · awaiting SAP goods-issue feed'
    );
    fireEvent.change(within(panel).getByLabelText('Material'), {
      target: { value: 'RM-STEAR-7300' }
    });
    // The current week and the 12 before it (the moving average's 13 weeks), newest first.
    const options = [...within(panel).getByLabelText('Week').querySelectorAll('option')].map(
      (o) => o.value
    );
    expect(options).toHaveLength(13);
    expect(options.slice(0, 2)).toEqual([W36, '2026-08-24']);
    fireEvent.change(within(panel).getByTestId('consumption-qty'), { target: { value: '1000' } });
    fireEvent.click(within(panel).getByTestId('consumption-record'));
    await waitFor(() => expect(consumptionStore.all()).toHaveLength(1));
    expect(consumptionStore.all()[0]).toMatchObject({
      materialCode: 'RM-STEAR-7300',
      week: W36,
      qty: 1_000,
      unit: 'KG',
      source: 'manual'
    });
    expect(await screen.findByTestId('consumption-recorded-now')).toHaveTextContent(
      'Recorded for this week: 1,000 KG (typed).'
    );
    expectNoAbbreviation();
    await openTab('This week');
    const card = await screen.findByTestId(`dant-card-${KEY}`);
    expect(await within(card).findByTestId(`dant-consumption-${KEY}-${W36}`)).toHaveTextContent(
      '1,000'
    );
    expect(within(card).getByText('Recorded consumption')).toBeInTheDocument();
    // DRC-4 BR-02 replaced absorbing an excess: the published figure stays.
    // LTP 2,520 + safety order 950 (13-week SD, Team B2) in week 1.
    expect(within(card).getByTestId(`dant-figure-${KEY}-${W36}`)).toHaveTextContent('3,470');
    expect(within(card).queryByTestId(/^dant-absorbed-/)).toBeNull();
    expectNoAbbreviation();
  });

  it('control — before anything is recorded the row reads a dash', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openAllWeeks();
    const card = await screen.findByTestId(`dant-card-${KEY}`);
    expect(within(card).getByText('Recorded consumption')).toBeInTheDocument();
    expect(within(card).queryByTestId(`dant-consumption-${KEY}-${W36}`)).toBeNull();
  });

  it('a typed 0 is recorded and shows 0', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openAllWeeks();
    await openTab('Record consumption');
    const panel = await screen.findByTestId('consumption-panel');
    fireEvent.change(within(panel).getByLabelText('Material'), {
      target: { value: 'RM-STEAR-7300' }
    });
    fireEvent.change(within(panel).getByTestId('consumption-qty'), { target: { value: '0' } });
    fireEvent.click(within(panel).getByTestId('consumption-record'));
    await waitFor(() => expect(consumptionStore.all().map((r) => r.qty)).toEqual([0]));
    await openTab('This week');
    expect(await screen.findByTestId(`dant-consumption-${KEY}-${W36}`)).toHaveTextContent('0');
  });

  it('at W39 the week choice starts at W39, newest first, and still holds W36', async () => {
    sdcClock.set('2026-09-21T03:00:00.000Z');
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openTab('Record consumption');
    const panel = await screen.findByTestId('consumption-panel');
    const options = [...within(panel).getByLabelText('Week').querySelectorAll('option')].map(
      (o) => o.value
    );
    expect(options.slice(0, 4)).toEqual(['2026-09-21', '2026-09-14', '2026-09-07', W36]);
  });
});

describe('the upload', () => {
  it('records the template’s rows and lists each refused row', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openAllWeeks();
    await openTab('Record consumption');
    await screen.findByTestId('consumption-panel');
    upload(
      [
        'Material code,Week (Monday),Consumption,Unit',
        'RM-STEAR-7300,2026-08-31,1000,KG',
        'RM-NOPE-0000,2026-08-31,5,KG',
        'PK-PETB-8802,2026-09-07,5,PCS'
      ].join('\n')
    );
    const result = await screen.findByTestId('consumption-upload-result');
    expect(within(result).getByTestId('consumption-upload-saved')).toHaveTextContent(
      '1 week recorded.'
    );
    expect(within(result).getByTestId('consumption-upload-refused-row-3')).toHaveTextContent(
      'Row 3 · RM-NOPE-0000: not a material on this page'
    );
    expect(within(result).getByTestId('consumption-upload-refused-row-4')).toHaveTextContent(
      'the week is after the current week'
    );
    expect(consumptionStore.all()).toMatchObject([
      { materialCode: 'RM-STEAR-7300', week: W36, qty: 1_000, source: 'upload' }
    ]);
    await openTab('This week');
    expect(await screen.findByTestId(`dant-consumption-${KEY}-${W36}`)).toHaveTextContent('1,000');
  });

  it('refuses an old or unrelated file with one line and records nothing', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openTab('Record consumption');
    await screen.findByTestId('consumption-panel');
    upload('Material code,Stock on hand,Unit\nRM-STEAR-7300,100,KG\n', 'stock-template.csv');
    expect(await screen.findByTestId('consumption-upload-error')).toHaveTextContent(
      'This is not the consumption template: it has no column Week (Monday), Consumption. Download the template and fill it in.'
    );
    upload('not a spreadsheet', 'notes.txt');
    expect(await screen.findByTestId('consumption-upload-error')).toHaveTextContent(
      'This file cannot be read.'
    );
    expect(consumptionStore.all()).toEqual([]);
  });

  it('downloads the template prefilled per material and recordable week', async () => {
    /** @type {Blob[]} */
    const blobs = [];
    const create = vi.fn((/** @type {Blob} */ b) => {
      blobs.push(b);
      return 'blob:consumption';
    });
    const saved = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    // jsdom does not navigate: the anchor's click is the browser's download.
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
      await openTab('Record consumption');
      fireEvent.click(await screen.findByTestId('consumption-template-download'));
      expect(create).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
      const text = await readFileText(/** @type {File} */ (blobs[0]));
      expect(text.split('\n')[0]).toBe('Material code,Week (Monday),Consumption,Unit');
      expect(text).toContain('RM-STEAR-7300,2026-08-31,,KG');
    } finally {
      Object.assign(URL, { createObjectURL: saved.create, revokeObjectURL: saved.revoke });
    }
  });
});

describe('a seat without forecast:publish', () => {
  it('sees the handoff notice instead of recording; the rows and the template still read', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: ROUTE
    });
    expect(await screen.findByTestId(`dant-card-${KEY}`)).toBeInTheDocument();
    await openTab('Record consumption');
    expect(await screen.findByTestId('handoff-consumption-record')).toBeInTheDocument();
    expect(screen.queryByTestId('consumption-record')).toBeNull();
    expect(screen.queryByTestId('consumption-upload-file')).toBeNull();
    expect(screen.getByTestId('consumption-template-download')).toBeInTheDocument();
  });

  it('control — the planner seat sees the form and no notice', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    await openTab('Record consumption');
    expect(await screen.findByTestId('consumption-record')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-consumption-record')).toBeNull();
  });
});

describe('DRC-4 BR-02 — a surplus the last week cannot absorb, on PTI alerts', () => {
  it('shows the remaining amount and links to the supplier × material on Demand anticipation', async () => {
    // sup-007 × PK-PETB-8801: SOH share and open POs exceed its 2-week horizon.
    const row = (
      await mockDataService.procurement.getDemandAnticipation({
        personaType: 'buyer',
        supplierId: null,
        businessRoles: SEEDED_SEAT_ROLES.buyer
      })
    ).items.find((r) => r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8801');
    const plan = /** @type {NonNullable<typeof row>} */ (row).plan;
    expect(plan.unabsorbed).toBeGreaterThan(0);
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER, route: '/buyer/alerts' });
    const alert = await screen.findByTestId(
      'alert-demandAnticipationUnabsorbed|PK-PETB-8801|sup-007'
    );
    expect(alert).toHaveTextContent(
      'Supply above demand anticipation is more than the last week of the horizon can absorb'
    );
    expect(
      within(alert).getByTestId(
        'alert-unabsorbed-demandAnticipationUnabsorbed|PK-PETB-8801|sup-007'
      )
    ).toHaveTextContent(
      `${plan.unabsorbed.toLocaleString('en-US')} ${row?.uom} of the supply above demand anticipation over W36–W37 cannot be absorbed in W37.`
    );
    expect(
      within(alert).getByRole('link', { name: 'Open demand anticipation' }).getAttribute('href')
    ).toMatch(/\/buyer\/demand-anticipation\?supplier=sup-007&material=PK-PETB-8801$/);
    expectNoAbbreviation();
  });

  it('control — a pair whose check balances raises no such alert', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER, route: '/buyer/alerts' });
    await screen.findAllByTestId(/^alert-group-/);
    expect(
      screen.queryByTestId('alert-demandAnticipationUnabsorbed|RM-STEAR-7300|sup-002')
    ).toBeNull();
  });
});

describe('both locales (CAP-D10)', () => {
  it('renders the rows and the panel in Indonesian, with no "DA"', async () => {
    try {
      await i18n.changeLanguage('id');
      await mockDataService.commands.dispatch(
        { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON },
        {
          transitionId: 't_consumption_record',
          entity: 'consumption',
          payload: {
            materialCode: 'RM-STEAR-7300',
            week: W36,
            qty: 1_000,
            unit: 'KG',
            source: 'manual'
          }
        }
      );
      renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
      await openAllWeeks();
      const card = await screen.findByTestId(`dant-card-${KEY}`);
      expect(within(card).getByText('Pemakaian tercatat')).toBeInTheDocument();
      expect(within(card).getByText('Kelebihan diserap')).toBeInTheDocument();
      expect(within(card).getByTestId(`dant-consumption-${KEY}-${W36}`)).toHaveTextContent('1.000');
      expectNoAbbreviation();
      await openTab('Catat pemakaian');
      expect(await screen.findByTestId('consumption-source-marker')).toHaveTextContent(
        'Pemakaian dicatat oleh perencana · menunggu umpan pengeluaran barang SAP'
      );
      expect(screen.getByTestId('consumption-record')).toHaveTextContent('Catat pemakaian');
      expectNoAbbreviation();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
