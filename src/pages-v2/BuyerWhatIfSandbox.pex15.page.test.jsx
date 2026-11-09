import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { sdcClock } from '@services/sdc';
import { whatIfScenarioStore } from '@services/data/mock/stores/whatIfScenarioStore';
import i18n from '@lib/i18n';
import BuyerWhatIfSandbox from './BuyerWhatIfSandbox';

// PEX-15 (BL-277) — the sandbox by level: the Material tab (today's sandbox) gains the LTP scenario
// presets; FG and BOM and Supplier are tabs of their own.

beforeEach(async () => {
  sdcClock.reset();
  whatIfScenarioStore.reset();
  await i18n.changeLanguage('en');
});

const PAIR = '/buyer/what-if?supplier=sup-007&material=PK-PETB-8802';
const render = (route = PAIR) =>
  renderWithProviders(<BuyerWhatIfSandbox />, { identity: BUYER, route });

describe('PEX-15 levels', () => {
  it('opens on the Material tab: the sandbox built today, then the three tabs in order', async () => {
    render();
    expect(await screen.findByTestId('wi-picker')).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Material', 'FG and BOM', 'Supplier']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('Material: Baseline loads LTP A; Festive and Protection buffer are unavailable until PEX-5 lands, never estimated', async () => {
    render();
    const presets = await screen.findByTestId('wi-scenario-presets');
    expect(within(presets).getByTestId('wi-preset-baseline')).toBeEnabled();
    expect(within(presets).getByTestId('wi-preset-festive')).toBeDisabled();
    expect(within(presets).getByTestId('wi-preset-protection')).toBeDisabled();
    expect(screen.getByTestId('wi-presets-unavailable')).toHaveTextContent('LTP Festive and LTP B');
    fireEvent.click(within(presets).getByTestId('wi-preset-baseline'));
    expect(screen.getByTestId('wi-edited')).toBeInTheDocument();
  });

  it('FG and BOM: lists the materials of the FG; a BOM constraint drops the FG quantity and recalculates every material', async () => {
    render(`${PAIR}&level=fg`);
    const table = await screen.findByTestId('wi-fg-table');
    expect(screen.getByRole('tab', { name: 'FG and BOM' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    const demand = within(screen.getByTestId('wi-fg-row-demand')).getAllByRole('cell');
    expect(demand.length).toBeGreaterThan(2);
    const materialRows = within(table)
      .getAllByRole('row')
      .filter((r) => /^wi-fg-row-(?!demand|produced)/.test(r.getAttribute('data-testid') ?? ''));
    expect(materialRows.length).toBeGreaterThan(0);
    const code = /** @type {string} */ (materialRows[0].getAttribute('data-testid')).replace(
      'wi-fg-row-',
      ''
    );
    const before = screen.getByTestId(`wi-fg-total-${code}`).textContent;
    expect(screen.getByTestId('wi-fg-summary')).toHaveTextContent('no BOM constraint applied');
    fireEvent.change(screen.getByTestId('wi-fg-limiting'), { target: { value: code } });
    fireEvent.change(screen.getByTestId('wi-fg-units'), { target: { value: '1' } });
    await waitFor(() =>
      expect(screen.getByTestId('wi-fg-summary')).toHaveTextContent('BOM constraint')
    );
    expect(screen.getByTestId(`wi-fg-total-${code}`).textContent).not.toBe(before);
    expect(
      within(screen.getByTestId(`wi-fg-row-${code}`)).getByText(/limiting/)
    ).toBeInTheDocument();
    // A bad value is refused in words and applies no constraint.
    fireEvent.change(screen.getByTestId('wi-fg-units'), { target: { value: '-3' } });
    expect(await screen.findByTestId('wi-fg-units-error')).toHaveTextContent('whole number');
    expect(screen.getByTestId('wi-fg-summary')).toHaveTextContent('no BOM constraint applied');
    expect(screen.getByTestId('wi-fg-scenario-note')).toHaveTextContent('LTP is per material');
  });

  it('Supplier: months of demand against confirmed capacity, with utilisation or "No capacity confirmed"', async () => {
    render(`${PAIR}&level=supplier`);
    const table = await screen.findByTestId('wi-supplier-table');
    const rows = within(table).getAllByTestId(/^wi-supplier-month-/);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const month = /** @type {string} */ (row.getAttribute('data-testid')).replace(
        'wi-supplier-month-',
        ''
      );
      const util = screen.getByTestId(`wi-supplier-util-${month}`).textContent ?? '';
      expect(util).toMatch(/^(\d[\d.,]*%|No capacity confirmed|Not available)$/);
    }
    expect(screen.getByTestId('wi-supplier-scenario-note')).toHaveTextContent('PEX-5');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render(`${PAIR}&level=fg`);
    await screen.findByTestId('wi-fg-table');
    expect(screen.getByTestId('wi-fg-scenario-note')).toHaveTextContent('LTP per material');
  });
});
