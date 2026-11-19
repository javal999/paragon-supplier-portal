// ─────────────────────────────────────────────────────────────────────────────
// PSC-5 BR-05 (BL-344) on the screen — the four demand presets on the Material
// tab. Each button rewrites the LTP row of the editor (the demand row) with its
// shape, and the FG tab's demand row reads the same after every one (PEX-D28:
// the FG tab stays unscaled). The expected rows are written out here, not
// imported from the rules: the page test pins the wiring and the shape, the
// rules spec pins the arithmetic at a known input.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import { sdcClock } from '@services/sdc';
import { whatIfScenarioStore } from '@services/data/mock/stores/whatIfScenarioStore';
import i18n from '@lib/i18n';
import BuyerWhatIfSandbox from './BuyerWhatIfSandbox';

const PAIR = '/buyer/what-if?supplier=sup-007&material=PK-PETB-8802';

beforeEach(async () => {
  sdcClock.reset();
  whatIfScenarioStore.reset();
  await i18n.changeLanguage('en');
});

/** The demand row of the Material tab, week by week, as the grid shows it. */
const demandRow = () =>
  screen.getAllByTestId(/^wi-ltp-/).map((el) => Number(/** @type {HTMLInputElement} */ (el).value));

/** The FG tab's demand row, cell by cell (label, weeks, total). */
const fgDemandRow = () =>
  within(screen.getByTestId('wi-fg-row-demand'))
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

/** Fire the tab button of the sandbox level. */
const openTab = (/** @type {string} */ name) => fireEvent.click(screen.getByRole('tab', { name }));

/**
 * The shape each preset writes, over the row it finds: the same rules the page
 * applies, written here so the spec does not read its expectation from the
 * module under test.
 * @param {string} preset
 * @param {readonly number[]} base
 * @returns {number[]}
 */
const shaped = (preset, base) => {
  switch (preset) {
    case 'skuRevamp':
      return base.map((q, i) =>
        i < 6 ? Math.round(q * (1 + 0.5 * ((i + 1) / 6))) : Math.round(q * 1.5)
      );
    case 'skuRetire':
      return base.map((q, i) => (i < 4 ? Math.round(q * ((4 - (i + 1)) / 4)) : 0));
    case 'oneShotUplift':
      return base.map((q, i) => (i === 4 ? Math.round(q * 1.5) : q));
    case 'levelTransition':
      return base.map((q, i) => (i >= 12 ? Math.round(q * 1.5) : q));
    default:
      throw new Error(`unknown preset ${preset}`);
  }
};

describe('PSC-5 BR-05 · the four demand presets on the Material tab', () => {
  it('offers the four shapes beside the LTP scenarios and says the FG tab stays unscaled', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, { route: PAIR });
    await screen.findByTestId('wi-grid');
    const group = screen.getByTestId('wi-demand-presets');
    for (const preset of ['skuRevamp', 'skuRetire', 'oneShotUplift', 'levelTransition'])
      expect(within(group).getByTestId(`wi-demand-${preset}`)).toBeEnabled();
    // BR-05's edge case and PEX-D28: the preset applies on the Material tab and
    // says the FG tab is unscaled.
    expect(screen.getByTestId('wi-demand-fg')).toHaveTextContent('FG tab stays unscaled');
  });

  for (const [preset, label] of [
    ['skuRevamp', 'SKU revamp'],
    ['skuRetire', 'SKU off/retired'],
    ['oneShotUplift', 'One-shot material uplift'],
    ['levelTransition', 'Material level transition']
  ]) {
    it(`${label}: loads its shape on the Material tab and leaves the FG tab's demand row unchanged`, async () => {
      renderWithProviders(<BuyerWhatIfSandbox />, { route: PAIR });
      await screen.findByTestId('wi-grid');
      // The FG tab read once, before any preset: the row the check compares to.
      openTab('FG and BOM');
      await screen.findByTestId('wi-fg-table');
      const fgBefore = fgDemandRow();
      expect(fgBefore.length).toBeGreaterThan(1);
      openTab('Material');
      const base = demandRow();
      expect(base.length).toBeGreaterThan(12);

      fireEvent.click(screen.getByTestId(`wi-demand-${preset}`));

      // The demand row is the preset's shape, week by week.
      expect(demandRow()).toEqual(shaped(preset, base));
      // And the button really moved the row: no preset is a no-op on this pair.
      expect(demandRow()).not.toEqual(base);

      // PEX-D28 — the FG tab stays unscaled: the same demand row after the preset.
      openTab('FG and BOM');
      await screen.findByTestId('wi-fg-table');
      expect(fgDemandRow()).toEqual(fgBefore);
      expect(screen.getByTestId('wi-fg-scenario-note')).toHaveTextContent('LTP is per material');
    });
  }

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerWhatIfSandbox />, { route: PAIR });
    await screen.findByTestId('wi-grid');
    expect(screen.getByTestId('wi-demand-presets')).toHaveTextContent('Bentuk permintaan');
    expect(screen.getByTestId('wi-demand-fg')).toHaveTextContent('Tab FG tetap tidak diskalakan');
  });
});
