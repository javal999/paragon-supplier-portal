// ─────────────────────────────────────────────────────────────────────────────
// DRC-17 (BL-202) on the screen — the What-if sandbox page on fixture data:
// the analysis-only statement (BR-06), the PPT 7 preset reproducing 761,888 /
// 244,896 with its "Provisional" labels (BR-08), a switch moving the scenario
// against the current plan (BR-02, BR-03), saving and comparing up to 3
// (BR-05), the save verb's notice for a seat without it and the supplier's
// empty page (BR-07), both locales, and the figure never abbreviated to "DA".
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { whatIfScenarioStore } from '@services/data/mock/stores/whatIfScenarioStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import { expectNoBareDa } from '@test/noBareDa';
import BuyerWhatIfSandbox from './BuyerWhatIfSandbox';

const ROUTE = '/buyer/what-if';
const PAIR = '/buyer/what-if?supplier=sup-007&material=PK-PETB-8802';

beforeEach(async () => {
  sdcClock.reset();
  whatIfScenarioStore.reset();
  await i18n.changeLanguage('en');
});

/**
 * No figure, label or message reads a bare "DA" — it labels Delivery Agreements.
 * TL-D1 (supersedes CAP-D10) allows it only as the bracket in "Demand
 * anticipation (DA)", which the nav shows since TL-D18.
 */
const expectNoAbbreviation = () => expectNoBareDa();

describe('BR-06 · analysis only, stated on the page', () => {
  it('says nothing here changes the plan or reaches suppliers or SAP', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: ROUTE });
    expect(await screen.findByTestId('wi-analysis-only')).toHaveTextContent(
      'Analysis only — nothing here changes the plan or reaches suppliers or SAP'
    );
    expect(screen.getByTestId('wi-empty')).toBeInTheDocument();
  });
});

describe('BR-08 · the PPT 7 golden case', () => {
  it('loads from the button and reproduces ROP Order 761,888 and safety order 244,896', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: ROUTE });
    fireEvent.click(await screen.findByTestId('wi-load-ppt7'));
    expect(await screen.findByTestId('wi-preset-note')).toBeInTheDocument();
    expect(screen.getByTestId('wi-plan-ropOrder')).toHaveTextContent('761,888');
    expect(screen.getByTestId('wi-plan-safetyOrder')).toHaveTextContent('244,896');
    expect(screen.getByTestId('wi-plan-totalDa')).toHaveTextContent('761,888');
    expect(screen.getByTestId('wi-plan-prNeed')).toHaveTextContent('645,559');
    // Design rule 5 — each figure built on a [Default] names its questions.
    expect(screen.getByTestId('wi-prov-ropOrder')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (B4, B9; MPQ = order multiple until master data)'
    );
    expect(screen.getByTestId('wi-prov-totalDa')).toHaveTextContent('A8b, A9');
    // It opens on the two readings the slide used, so nothing reads as edited.
    expect(screen.getByTestId('wi-edited')).toHaveTextContent('0');
    // Without consumption or a supply area, ROP Fisik is not available.
    expect(screen.getByTestId('wi-plan-ropFisik')).toHaveTextContent('Not available');
    expectNoAbbreviation();
  });

  it('flipping Z [B3] moves the safety order against the current plan; reset brings it back', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, {
      route: `${ROUTE}?supplier=ppt7-golden&material=2000041501`
    });
    const z = await screen.findByLabelText('Z (B3)');
    fireEvent.change(z, { target: { value: '0' } });
    expect(screen.getByTestId('wi-scn-safetyOrder')).toHaveTextContent('0');
    expect(screen.getByTestId('wi-scn-safetyOrder-diff')).toHaveTextContent('−244,896');
    expect(screen.getByTestId('wi-scn-ropOrder-diff')).toHaveTextContent('−244,896');
    expect(screen.getByTestId('wi-sw-osip-z')).toHaveTextContent('changed');
    expect(screen.getByTestId('wi-edited')).toHaveTextContent('1 input or switch changed');
    fireEvent.click(screen.getByTestId('wi-reset'));
    expect(screen.getByTestId('wi-scn-safetyOrder-diff')).toHaveTextContent('no change');
  });

  it('BL-210 — a typed SD moves the safety order: 1.65 × √5 × 10,000 = 36,894 → MPQ 61,224', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, {
      route: `${ROUTE}?supplier=ppt7-golden&material=2000041501`
    });
    const sd = await screen.findByLabelText('SD (blank = computed)');
    expect(screen.getByTestId('wi-in-sd')).toHaveTextContent('SD in use: 57,801');
    fireEvent.change(sd, { target: { value: '10000' } });
    expect(screen.getByTestId('wi-in-sd')).toHaveTextContent('SD in use: 10,000');
    expect(screen.getByTestId('wi-scn-safetyOrder')).toHaveTextContent('61,224');
    expect(screen.getByTestId('wi-scn-safetyOrder-diff')).toHaveTextContent('−183,672');
    // Blank again: computed from the source, as the current plan.
    fireEvent.change(sd, { target: { value: '' } });
    expect(screen.getByTestId('wi-scn-safetyOrder-diff')).toHaveTextContent('no change');
    // The consumption window now feeds a figure: no "moves nothing" note on it.
    expect(screen.getByTestId('wi-switches')).not.toHaveTextContent(/fixed from this key/);
  });

  it('lists every rule switch with its question ID', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, {
      route: `${ROUTE}?supplier=ppt7-golden&material=2000041501`
    });
    const panel = await screen.findByTestId('wi-switches');
    for (const q of [
      '[A1]',
      '[A2]',
      '[A9]',
      '[B1]',
      '[B4]',
      '[B8]',
      '[D1]',
      '[E3]',
      '[F1]',
      '[A7]'
    ])
      expect(panel).toHaveTextContent(q);
  });
});

describe('BR-02 / BR-03 · a live pair against the current plan', () => {
  it('opens with the live values, the week grid, and a change shown as a difference', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: PAIR });
    expect(await screen.findByTestId('wi-grid')).toBeInTheDocument();
    expect(screen.getByTestId('wi-scn-prNeed-diff')).toHaveTextContent('no change');
    const ospo = /** @type {HTMLInputElement} */ (screen.getByTestId('wi-in-ospo'));
    // 100,000 more open PO: the PR need falls to 0.
    fireEvent.change(ospo, { target: { value: String(Number(ospo.value) + 100_000) } });
    expect(screen.getByTestId('wi-scn-prNeed')).toHaveTextContent('0');
    expect(screen.getByTestId('wi-scn-prNeed-diff')).toHaveTextContent('−');
    expectNoAbbreviation();
  });
});

describe('BR-05 · saving and comparing up to 3 scenarios', () => {
  it('saves a named scenario, lists it with its rules version, and compares at most 3', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: PAIR });
    const name = await screen.findByLabelText('Scenario name');
    for (const n of ['One', 'Two', 'Three', 'Four']) {
      fireEvent.change(name, { target: { value: n } });
      fireEvent.click(screen.getByTestId('wi-save'));
      await waitFor(() =>
        expect(screen.getByTestId('wi-save-outcome')).toHaveTextContent(`Saved “${n}”.`)
      );
    }
    await waitFor(() => expect(screen.getByTestId('wi-saved-wis-0004')).toBeInTheDocument());
    expect(whatIfScenarioStore.all()).toHaveLength(4);
    for (const id of ['wis-0001', 'wis-0002', 'wis-0003'])
      fireEvent.click(screen.getByTestId(`wi-compare-${id}`));
    expect(screen.getByTestId('wi-col-wis-0003')).toHaveTextContent('Three');
    expect(screen.getByTestId('wi-compare-wis-0004')).toBeDisabled();
    expect(screen.queryByTestId('wi-col-wis-0004')).toBeNull();
    expect(
      within(screen.getByTestId('wi-saved-wis-0001')).getByText(/rules osip-/)
    ).toBeInTheDocument();
  });

  it('a nameless save is refused before the act', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: PAIR });
    expect(await screen.findByTestId('wi-save')).toBeDisabled();
  });

  it('a scenario saved under older rules is flagged', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: PAIR });
    fireEvent.change(await screen.findByLabelText('Scenario name'), { target: { value: 'Old' } });
    fireEvent.click(screen.getByTestId('wi-save'));
    await waitFor(() => expect(whatIfScenarioStore.all()).toHaveLength(1));
    const saved = whatIfScenarioStore.all()[0];
    whatIfScenarioStore.add({ ...saved, name: 'Older', rulesVersion: 'osip-2026-10-01.1' });
    // The next read (after another save) shows the flag.
    fireEvent.change(screen.getByLabelText('Scenario name'), { target: { value: 'New' } });
    fireEvent.click(screen.getByTestId('wi-save'));
    expect(await screen.findByTestId('wi-rules-changed-wis-0002')).toHaveTextContent(
      'Rules changed since saving (osip-2026-10-01.1'
    );
  });
});

describe('BR-07 · who', () => {
  it('a seat without the save verb sees the hand-off notice, not the form', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, {
      route: PAIR,
      identity: { ...BUYER, businessRoles: ['finance'] }
    });
    expect(await screen.findByTestId('handoff-whatif-save')).toBeInTheDocument();
    expect(screen.queryByTestId('wi-save')).toBeNull();
    // The figures still read: no role gate on the page (§65).
    expect(screen.getByTestId('wi-results')).toBeInTheDocument();
  });

  it('a supplier persona reads nothing', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: PAIR, identity: SUPPLIER });
    expect(await screen.findByTestId('wi-supplier')).toHaveTextContent(
      'The what-if sandbox is PTI’s own planning tool'
    );
    expect(screen.queryByTestId('wi-results')).toBeNull();
  });
});

describe('Bahasa Indonesia', () => {
  it('renders the page, the statement and the figures in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerWhatIfSandbox />, {
      route: `${ROUTE}?supplier=ppt7-golden&material=2000041501`
    });
    expect(await screen.findByTestId('wi-analysis-only')).toHaveTextContent(
      'Hanya analisis — tidak ada yang di sini mengubah rencana atau sampai ke pemasok atau SAP'
    );
    expect(await screen.findByTestId('wi-prov-ropOrder')).toHaveTextContent(
      'Sementara: aturan menunggu Material Planning'
    );
    expect(screen.getByText('Rencana saat ini')).toBeInTheDocument();
    expect(screen.getByText('Sandbox what-if', { selector: 'h1' })).toBeInTheDocument();
    expectNoAbbreviation();
  });
});
