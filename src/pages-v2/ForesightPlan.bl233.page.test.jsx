// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 4 on the screen — the rest of Foresight (Goal C): What-if,
// Stabilise and the supplier's Forecasts. Every important row, header and KPI
// carries its (i), and the rulings hold: "PR Generated" and "Incoming" (TL-D12,
// with "Not Incoming DA"), "Carry-over" (TL-D8), "(DA)" on the labels (TL-D1).
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { textWithoutTips } from '@test/termText';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { whatIfScenarioStore } from '@services/data/mock/stores/whatIfScenarioStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import BuyerWhatIfSandbox from './BuyerWhatIfSandbox';
import BuyerStabilise from './BuyerStabilise';
import SupplierForecastCommitments from './SupplierForecastCommitments';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(async () => {
  sdcClock.reset();
  whatIfScenarioStore.reset();
  await i18n.changeLanguage('en');
});

/**
 * The label (without its tip) of every header of `role` in `root`, with
 * whether it carries an (i).
 * @param {HTMLElement} root
 * @param {'rowheader' | 'columnheader'} role
 */
const labelled = (root, role) =>
  within(root)
    .getAllByRole(role)
    .map((h) => ({
      label: textWithoutTips(h).trim(),
      tip: h.querySelector('[data-testid^="term-tip-"]') !== null
    }));

describe('BL-233 wave 4 — /buyer/what-if', () => {
  it('every result row carries an (i), with the ruled labels', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, {
      route: '/buyer/what-if?supplier=sup-007&material=PK-PETB-8802'
    });
    const table = await screen.findByTestId('wi-results-table', {}, { timeout: 15000 });
    const rows = labelled(table, 'rowheader');
    expect(rows.length).toBe(13);
    expect(rows.filter((r) => !r.tip)).toEqual([]);
    const text = rows.map((r) => r.label).join(' | ');
    expect(text).toContain('Demand anticipation (DA) over the lead time, before the check');
    expect(text).toContain('PR Generated');
    expect(text).toContain('Carry-over');
    expect(text).not.toContain('PR need');
    expect(text).not.toContain('Carried over');
  });

  it('the weeks grid reads "Incoming", and its (i) says it is not Incoming DA', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, {
      route: '/buyer/what-if?supplier=sup-007&material=PK-PETB-8802'
    });
    const tip = await screen.findByTestId('term-tip-what-if-incoming', {}, { timeout: 15000 });
    expect(within(tip).getByText('Incoming')).toBeInTheDocument();
    expect(within(tip).getByRole('tooltip')).toHaveTextContent(
      'Not: Incoming DA (the supplier-confirmed figure).'
    );
    expect(screen.getByTestId('term-tip-da-scenario')).toHaveTextContent(
      'Demand anticipation (DA) after the check, this scenario'
    );
  });

  // BL-249 (U-10): the headline total is before the plan check, the grid's
  // weekly rows after it (TL-D13's "After the check", as on the history page).
  it('names the DA headline "before the check" and the grid rows "after the check"', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, {
      route: '/buyer/what-if?supplier=sup-007&material=PK-PETB-8802'
    });
    const head = await screen.findByTestId('term-tip-da-over-lead-time', {}, { timeout: 15000 });
    expect(textWithoutTips(head).trim()).toBe(
      'Demand anticipation (DA) over the lead time, before the check'
    );
    expect(within(head).getByRole('tooltip')).toHaveTextContent(
      'before the plan check absorbs any surplus'
    );
    const plan = screen.getByTestId('term-tip-da-current-plan');
    expect(textWithoutTips(plan).trim()).toBe(
      'Demand anticipation (DA) after the check, current plan'
    );
    expect(within(plan).getByRole('tooltip')).toHaveTextContent('after the plan check absorbed');
    expect(textWithoutTips(screen.getByTestId('term-tip-da-scenario')).trim()).toBe(
      'Demand anticipation (DA) after the check, this scenario'
    );
  });

  it('reads the same in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerWhatIfSandbox />, {
      route: '/buyer/what-if?supplier=sup-007&material=PK-PETB-8802'
    });
    const head = await screen.findByTestId('term-tip-da-over-lead-time', {}, { timeout: 15000 });
    expect(textWithoutTips(head).trim()).toBe(
      'Demand anticipation (DA) sepanjang lead time, sebelum pemeriksaan'
    );
    expect(textWithoutTips(screen.getByTestId('term-tip-da-current-plan')).trim()).toBe(
      'Demand anticipation (DA) setelah pemeriksaan, rencana saat ini'
    );
    expect(textWithoutTips(screen.getByTestId('term-tip-da-scenario')).trim()).toBe(
      'Demand anticipation (DA) setelah pemeriksaan, skenario ini'
    );
  });
});

describe('BL-233 wave 4 — /buyer/stabilise', () => {
  it('the KPIs and every stabilising rule carry an (i)', async () => {
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    const rules = await screen.findByTestId('stb-rules', {}, { timeout: 20000 });
    const tips = within(rules).getAllByTestId(/^term-tip-rule-/);
    expect(tips.length).toBeGreaterThan(0);
    expect(within(rules).getByTestId('term-tip-rule-firm-frozen')).toHaveTextContent(
      'Zone Liability — kept as published'
    );
    for (const id of [
      'plan-movement',
      'weeks-changed-in-lead-time',
      'trade-off-within-limits',
      'weeks-held'
    ])
      expect(screen.getByTestId(`term-tip-${id}`)).toBeInTheDocument();
  });
});

describe('BL-233 wave 4 — /supplier/forecasts', () => {
  it('the commitment table’s measures carry an (i), the unit filled into the label', async () => {
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    await screen.findByTestId('fc-sup-material-PK-PETB-8801');
    // PEX-2 (BL-265) — the periods are columns, so the measures are the grid's
    // row labels (CAP-1 wave 3 renders the grid through `WeekGrid`).
    const headers = labelled(screen.getByTestId('fc-sup-grid-PK-PETB-8801'), 'rowheader');
    const tipped = headers.filter((h) => h.tip).map((h) => h.label);
    expect(tipped).toEqual(
      expect.arrayContaining([
        'Zone',
        'Commitment due',
        expect.stringMatching(/^Forecast \(\w+\)$/)
      ])
    );
    expect(tipped.some((l) => /^Commitment \(\w+\)$/.test(l))).toBe(true);
    expect(tipped.some((l) => /^Upside \(\w+\)$/.test(l))).toBe(true);
    // The corner names the label column and carries no (i).
    const corner = /** @type {HTMLElement} */ (
      screen.getByTestId('fc-sup-grid-PK-PETB-8801').querySelector('th[data-label-col]')
    );
    expect(textWithoutTips(corner).trim()).toBe('Period');
    expect(corner.querySelector('[data-testid^="term-tip-"]')).toBeNull();
  });
});
