// ─────────────────────────────────────────────────────────────────────────────
// BL-338 (PSC-3) on the screen — the batch LTP upload on Demand anticipation:
// three screens (LTP A, LTP Festive, LTP B), each taking one CSV with many
// materials; the computed total from the FG plan and the BOM beside the
// uploaded figure and the difference; "Not available" where the hub has no
// total; the FG breakdown behind a computed total; and the stamp each material
// carries after the one confirm (uploader, date, file name).
// Every expected figure is derived from the read model's own inputs, never
// restated; the named members (material, FGs) are the seeded dataset's.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { ltpInputStore } from '@services/data/mock/stores/ltpInputStore';
import { fgDemandInputs } from '@services/data/mock/ltpFgDemandReadModel';
import { compareLtpBatch, parseLtpBatchCsv } from '@services/transitions/ltpInputRules';
import { sdcClock } from '@services/sdc';
import { formatDate, formatNumber } from '@lib/format';
import i18n from '@lib/i18n';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/demand-anticipation';
// PK-PETB-8802 is used by SYN-FG-011 and SYN-FG-014, and SYN-FG-008 carries no
// plan; 2000028400 (the walkthrough pair) is used by no finished good at all.
const MAT = 'PK-PETB-8802';
const OTHER = 'RM-STEAR-7300';
const NO_PLAN_MAT = '2000028400';
const NO_PLAN_FG = 'SYN-FG-008';
const W1 = '2026-08-31';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  consumptionStore.reset();
  ltpInputStore.reset();
});
afterEach(() => {
  ltpInputStore.reset();
  sdcClock.reset();
  void i18n.changeLanguage('en');
});

const render = () =>
  renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });

/**
 * The panel opens on LTP A; a series' file input renders inside its own tab
 * panel, so the screen is selected first.
 * @param {'A' | 'Festive' | 'B'} series
 */
const openScreen = async (series) => {
  const label = series === 'A' ? 'LTP A' : series === 'Festive' ? 'LTP Festive' : 'LTP B';
  fireEvent.click(screen.getByRole('tab', { name: label }));
  return screen.findByTestId(`ltp-batch-panel-${series}`);
};

/**
 * @param {'A' | 'Festive' | 'B'} series
 * @param {string} text
 * @param {string} fileName
 */
const uploadFile = async (series, text, fileName) => {
  await openScreen(series);
  const input = screen.getByTestId(`ltp-batch-file-${series}`);
  const file = new File([text], fileName, { type: 'text/csv' });
  // jsdom's File carries no `text()` in this environment; a browser's does, and
  // the component reads the file the browser way. Shim only that method.
  if (typeof file.text !== 'function')
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  fireEvent.change(input, { target: { files: [file] } });
};

/**
 * The computed total per week the page reads, for one material.
 * @param {string} materialCode
 */
function computedOf(materialCode) {
  const inputs = fgDemandInputs(sdcClock.now());
  return Object.fromEntries(
    [...(inputs.totals?.get(materialCode) ?? new Map())].map(([week, qty]) => [week, qty])
  );
}

describe('PSC-3 — the three batch screens', () => {
  it('shows one screen per series on Demand anticipation, and keeps the LTP choice control', async () => {
    render();
    await screen.findByTestId('ltp-inputs');
    expect(
      screen
        .getByRole('tab', { name: 'LTP A' })
        .compareDocumentPosition(screen.getByRole('tab', { name: 'LTP Festive' })) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'LTP B' })).toBeInTheDocument();
    for (const series of /** @type {const} */ (['A', 'Festive', 'B'])) {
      await openScreen(series);
      expect(screen.getByTestId(`ltp-batch-file-${series}`)).toBeInTheDocument();
    }
    // The choice control stays until phase 2 retires it.
    expect(screen.getByTestId('ltp-in-choice')).toBeInTheDocument();
  });
});

describe('PSC-3 — the preview: computed total, upload and difference', () => {
  it('AC-01/AC-02: a 2-material file previews both materials once, computed beside the uploaded figure', async () => {
    const uploaded = 40_000;
    const text = ['material,week,quantity', `${MAT},${W1},${uploaded}`, `${OTHER},${W1},5000`].join(
      '\n'
    );
    render();
    await screen.findByTestId('ltp-inputs');
    await uploadFile('A', text, 'ltp-a-batch.csv');

    const parsed = parseLtpBatchCsv(text);
    if ('refusal' in parsed) throw new Error(parsed.refusal);

    const matSection = await screen.findByTestId(`ltp-batch-material-A-${MAT}`);
    expect(screen.getAllByTestId(/^ltp-batch-material-A-/)).toHaveLength(2);
    const computed = computedOf(MAT);
    const [row] = compareLtpBatch({ [W1]: uploaded }, computed);
    expect(within(matSection).getByTestId(`ltp-batch-computed-A-${MAT}-${W1}`)).toHaveTextContent(
      formatNumber(row.computed ?? Number.NaN)
    );
    expect(within(matSection).getByTestId(`ltp-batch-uploaded-A-${MAT}-${W1}`)).toHaveTextContent(
      formatNumber(uploaded)
    );
    // The upload differs from the computed total: both show and so does the difference.
    expect(row.difference).not.toBe(0);
    expect(within(matSection).getByTestId(`ltp-batch-difference-A-${MAT}-${W1}`)).toHaveTextContent(
      row.difference !== null && row.difference > 0
        ? `+${formatNumber(row.difference)}`
        : formatNumber(row.difference ?? Number.NaN)
    );
    // The other material's preview is its own row, once.
    expect(screen.getByTestId(`ltp-batch-material-A-${OTHER}`)).toBeInTheDocument();
  });

  it('AC-03: the drill-in shows the FG breakdown behind the computed total', async () => {
    render();
    await screen.findByTestId('ltp-inputs');
    await uploadFile('A', `${MAT},${W1},40000`, 'ltp-a-batch.csv');
    await screen.findByTestId(`ltp-batch-material-A-${MAT}`);
    fireEvent.click(screen.getByTestId(`ltp-batch-breakdown-toggle-A-${MAT}`));
    const breakdown = await screen.findByTestId(`ltp-batch-breakdown-A-${MAT}-${W1}`);
    for (const sku of ['SYN-FG-011', 'SYN-FG-014']) expect(breakdown).toHaveTextContent(sku);
  });

  it('names an FG with no plan as left out of the computed total', async () => {
    render();
    await screen.findByTestId('ltp-inputs');
    await uploadFile('A', `${MAT},${W1},40000`, 'ltp-a-batch.csv');
    const note = await screen.findByTestId(`ltp-batch-noplan-A-${MAT}`);
    expect(note).toHaveTextContent(NO_PLAN_FG);
  });

  it('AC-04: a material with no FG plan and no upload reads Not available', async () => {
    render();
    await screen.findByTestId('ltp-inputs');
    await uploadFile('A', `${NO_PLAN_MAT},${W1},100`, 'ltp-a-batch.csv');
    const section = await screen.findByTestId(`ltp-batch-material-A-${NO_PLAN_MAT}`);
    expect(
      within(section).getByTestId(`ltp-batch-computed-A-${NO_PLAN_MAT}-${W1}`)
    ).toHaveTextContent('Not available');
    expect(within(section).getByTestId(`ltp-batch-noplan-A-${NO_PLAN_MAT}`)).toBeInTheDocument();
  });

  it('AC-01: one confirm uploads both materials, and each shows its stamp', async () => {
    const text = ['material,week,quantity', `${MAT},${W1},40000`, `${OTHER},${W1},5000`].join('\n');
    render();
    await screen.findByTestId('ltp-inputs');
    await uploadFile('A', text, 'ltp-a-batch.csv');
    await screen.findByTestId(`ltp-batch-material-A-${MAT}`);
    fireEvent.click(screen.getByTestId('ltp-batch-confirm-A'));
    for (const mat of [MAT, OTHER]) {
      await waitFor(() =>
        expect(screen.getByTestId(`ltp-batch-stamp-A-${mat}`)).toHaveTextContent('ltp-a-batch.csv')
      );
      expect(screen.getByTestId(`ltp-batch-stamp-A-${mat}`)).toHaveTextContent(
        formatDate(sdcClock.now())
      );
    }
    // Both materials are on the ledger under the one file name.
    expect(ltpInputStore.all().map((r) => `${r.materialCode}|${r.sourceFile}`)).toEqual([
      `${MAT}|ltp-a-batch.csv`,
      `${OTHER}|ltp-a-batch.csv`
    ]);
    // BR-06: the published DA is marked out of date with the LTP cause.
    const note = await screen.findAllByTestId(/^dant-outofdate-/);
    expect(note.length).toBeGreaterThan(0);
    expect(note.some((el) => el.textContent?.includes('LTP A'))).toBe(true);
  });

  it('refuses a file naming a material that is not on the page', async () => {
    render();
    await screen.findByTestId('ltp-inputs');
    await uploadFile('A', 'NOPE-1,2026-08-31,1', 'bad.csv');
    expect(await screen.findByTestId('ltp-batch-problem-A')).toHaveTextContent('NOPE-1');
    expect(screen.queryByTestId('ltp-batch-confirm-A')).toBeNull();
  });
});
