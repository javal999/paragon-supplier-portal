// ─────────────────────────────────────────────────────────────────────────────
// CAP-11 (BL-180) on the screen — the Demand anticipation page after recording
// consumption in the frozen horizon: the Recorded consumption and Absorbed
// rows ("−n absorbed from the W36–W39 excess", BR-05), the Record consumption
// panel (typed, uploaded, an odd file refused with one line, the template
// download), the handoff notice for a seat without `forecast:publish`, the
// unabsorbed alert on PTI alerts linking back to the supplier × material
// (BR-04), and both locales with the figure never abbreviated to "DA".
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { MockCommandService } from '@services/data/mock/MockCommandService';
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
// sup-002 × RM-STEAR-7300 — one supplier; W36 is frozen at 4,120 KG by the seed.
const KEY = 'sup-002-RM-STEAR-7300';
const W36 = '2026-08-31';
const H2 = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'];

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

/** No figure, label or message reads "DA" — it labels Delivery Agreements (CAP-D10). */
const expectNoAbbreviation = () => expect(document.body.textContent ?? '').not.toMatch(/\bDA\b/);

/** @param {string} csv @param {string} [name] */
const upload = (csv, name = 'consumption.csv') =>
  fireEvent.change(screen.getByTestId('consumption-upload-file'), {
    target: { files: [new File([csv], name, { type: 'text/csv' })] }
  });

describe('recording consumption in the frozen horizon (typed)', () => {
  it('shows Recorded consumption on W36 and −780 absorbed from the W36–W39 excess on W40–W43', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const panel = await screen.findByTestId('consumption-panel');
    expect(within(panel).getByTestId('consumption-source-marker')).toHaveTextContent(
      'Consumption recorded by the planner · awaiting SAP goods-issue feed'
    );
    fireEvent.change(within(panel).getByLabelText('Material'), {
      target: { value: 'RM-STEAR-7300' }
    });
    // At the present only W36 is frozen and not in the future.
    expect(
      [...within(panel).getByLabelText('Week').querySelectorAll('option')].map((o) => o.value)
    ).toEqual([W36]);
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
    const card = screen.getByTestId(`dant-card-${KEY}`);
    expect(await within(card).findByTestId(`dant-consumption-${KEY}-${W36}`)).toHaveTextContent(
      '1,000'
    );
    expect(within(card).getByText('Recorded consumption')).toBeInTheDocument();
    expect(within(card).getByText('Absorbed')).toBeInTheDocument();
    // 4,120 − 1,000 = 3,120 over four weeks.
    for (const w of H2)
      expect(within(card).getByTestId(`dant-absorbed-${KEY}-${w}`)).toHaveTextContent(
        '−780 absorbed from the W36–W39 excess'
      );
    // The frozen week keeps its figure; the next horizon's figure in force drops.
    expect(within(card).getByTestId(`dant-figure-${KEY}-${W36}`)).toHaveTextContent('4,120');
    expect(within(card).getByTestId(`dant-figure-${KEY}-${H2[1]}`)).toHaveTextContent('2,155');
    expect(screen.getByTestId('consumption-recorded-now')).toHaveTextContent(
      'Recorded for this week: 1,000 KG (typed).'
    );
    expectNoAbbreviation();
  });

  it('control — before anything is recorded the two rows read a dash', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const card = await screen.findByTestId(`dant-card-${KEY}`);
    expect(within(card).getByText('Recorded consumption')).toBeInTheDocument();
    expect(within(card).queryByTestId(`dant-consumption-${KEY}-${W36}`)).toBeNull();
    expect(within(card).queryByTestId(`dant-absorbed-${KEY}-${H2[0]}`)).toBeNull();
  });

  it('at W39 the week choice is the frozen horizon’s weeks up to now, newest first', async () => {
    sdcClock.set('2026-09-21T03:00:00.000Z');
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const panel = await screen.findByTestId('consumption-panel');
    expect(
      [...within(panel).getByLabelText('Week').querySelectorAll('option')].map((o) => o.value)
    ).toEqual(['2026-09-21', '2026-09-14', '2026-09-07', W36]);
  });

  it('at W40, before W40–W43 is published, no week can be typed and the upload stays', async () => {
    sdcClock.set('2026-09-28T03:00:00.000Z');
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    expect(await screen.findByTestId('consumption-no-weeks')).toHaveTextContent(
      'The current horizon is not frozen yet'
    );
    expect(screen.queryByTestId('consumption-record')).toBeNull();
    expect(screen.getByTestId('consumption-upload-choose')).toBeInTheDocument();
  });
});

describe('the upload', () => {
  it('records the template’s rows and lists each refused row', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
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
    expect(await screen.findByTestId(`dant-absorbed-${KEY}-${H2[0]}`)).toHaveTextContent(
      '−780 absorbed from the W36–W39 excess'
    );
  });

  it('refuses an old or unrelated file with one line and records nothing', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
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
    expect(await screen.findByTestId('handoff-consumption-record')).toBeInTheDocument();
    expect(screen.queryByTestId('consumption-record')).toBeNull();
    expect(screen.queryByTestId('consumption-upload-file')).toBeNull();
    expect(screen.getByTestId('consumption-template-download')).toBeInTheDocument();
    expect(screen.getByTestId(`dant-card-${KEY}`)).toBeInTheDocument();
  });

  it('control — the planner seat sees the form and no notice', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    expect(await screen.findByTestId('consumption-record')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-consumption-record')).toBeNull();
  });
});

describe('BR-04 — the unabsorbed excess on PTI alerts', () => {
  it('shows the remaining amount and links to the supplier × material on Demand anticipation', async () => {
    // W39: record 100 KG in each frozen week; the excess outgrows W40–W43.
    sdcClock.set('2026-09-21T03:00:00.000Z');
    const cmd = new MockCommandService();
    for (const week of [W36, '2026-09-07', '2026-09-14', '2026-09-21']) {
      const res = await cmd.dispatch(
        { personaType: 'buyer', supplierId: null, businessRoles: ['planning'], actor: NO_PERSON },
        {
          transitionId: 't_consumption_record',
          entity: 'consumption',
          payload: { materialCode: 'RM-STEAR-7300', week, qty: 100, unit: 'KG', source: 'manual' }
        }
      );
      expect(res.status, res.reason).toBe('done');
    }
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER, route: '/buyer/alerts' });
    const alert = await screen.findByTestId(
      'alert-demandAnticipationUnabsorbed|RM-STEAR-7300|sup-002'
    );
    expect(alert).toHaveTextContent(
      'Consumption below demand anticipation left an excess the next horizon cannot absorb'
    );
    // 12,940 frozen − 400 consumed − 11,742 the next horizon can take.
    expect(
      within(alert).getByTestId(
        'alert-unabsorbed-demandAnticipationUnabsorbed|RM-STEAR-7300|sup-002'
      )
    ).toHaveTextContent('798 KG of the W36–W39 excess cannot be absorbed by W43.');
    expect(
      within(alert).getByRole('link', { name: 'Open demand anticipation' }).getAttribute('href')
    ).toMatch(/\/buyer\/demand-anticipation\?supplier=sup-002&material=RM-STEAR-7300$/);
    expectNoAbbreviation();
  });

  it('control — no consumption recorded, no such alert', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: PLANNER, route: '/buyer/alerts' });
    await screen.findAllByTestId(/^alert-group-/);
    expect(
      screen.queryByTestId('alert-demandAnticipationUnabsorbed|RM-STEAR-7300|sup-002')
    ).toBeNull();
  });
});

describe('both locales (CAP-D10)', () => {
  it('renders the rows, the panel and the absorbed cell in Indonesian, with no "DA"', async () => {
    try {
      await i18n.changeLanguage('id');
      const cmd = new MockCommandService();
      await cmd.dispatch(
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
      const card = await screen.findByTestId(`dant-card-${KEY}`);
      expect(within(card).getByText('Pemakaian tercatat')).toBeInTheDocument();
      expect(within(card).getByText('Diserap')).toBeInTheDocument();
      expect(within(card).getByTestId(`dant-absorbed-${KEY}-${H2[0]}`)).toHaveTextContent(
        /^−780 diserap dari kelebihan W36–W39$/
      );
      expect(screen.getByTestId('consumption-source-marker')).toHaveTextContent(
        'Pemakaian dicatat oleh perencana · menunggu umpan pengeluaran barang SAP'
      );
      expect(screen.getByTestId('consumption-record')).toHaveTextContent('Catat pemakaian');
      expectNoAbbreviation();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
