// ─────────────────────────────────────────────────────────────────────────────
// BL-233 wave 1 on the screen — term labels and their (i) on the Demand
// anticipation grid (`SC-HUB-TERM-LABELS-REQUIREMENTS-2026-10.md` §4):
//   AC-01 the row reads "Demand anticipation (DA)" in EN and in ID;
//   AC-02 its (i) shows the definition, the calculation, "Also called: DA …" and
//         "Not: Delivery Agreement …", and Escape closes it;
//   AC-03 every row label has an (i), and the corner ("Week") has none (BR-06).
// Plus the shared parts: TermLabel, a table header and a KPI card taking a term.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import TermLabel from '@components/ui-v2/TermLabel';
import KpiCard from '@components/ui-v2/KpiCard';
import { TableHeaderCell } from '@components/ui-v2/TableHeader';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/demand-anticipation';
const KEY = 'sup-007-PK-PETB-8802';

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  demandAnticipationStore.all();
});

const openGrid = async () => {
  await screen.findByTestId('dant-filters', {}, { timeout: 15000 });
  for (const b of screen.getAllByTestId(/^dant-weeks-toggle-/)) fireEvent.click(b);
  return screen.findByTestId(`dant-grid-${KEY}`);
};

describe('BL-233 on the Demand anticipation grid', () => {
  it('AC-01 / AC-02: the row reads "Demand anticipation (DA)" and its (i) carries the four lines', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const grid = await openGrid();
    const tip = within(grid).getByTestId('term-tip-demand-anticipation');
    expect(within(tip).getByText('Demand anticipation (DA)')).toBeInTheDocument();
    const button = within(tip).getByRole('button', {
      name: 'What “Demand anticipation (DA)” means'
    });
    const text = document.getElementById(button.getAttribute('aria-describedby') ?? '');
    expect(text).toHaveAttribute('role', 'tooltip');
    expect(text).toHaveTextContent('The weekly quantity PTI signals to the supplier');
    expect(text).toHaveTextContent(
      'How it is calculated: LTP of the week; week 1 also carries the safety order; plus carry-over'
    );
    expect(text).toHaveTextContent('Also called: DA (Material Planning team, OSIP playbook)');
    expect(text).toHaveTextContent('Not: Delivery Agreement (also DA, on the contract pages).');
    fireEvent.focus(button);
    expect(tip).toHaveAttribute('data-dismissed', 'false');
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(tip).toHaveAttribute('data-dismissed', 'true');
  });

  it('AC-03: every row label has an (i); the corner has none', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
    const grid = await openGrid();
    const rows = within(grid).getAllByRole('rowheader');
    expect(rows.length).toBeGreaterThan(10);
    const bare = rows.filter((r) => r.querySelector('[data-testid^="term-tip-"]') === null);
    expect(bare.map((r) => r.textContent)).toEqual([]);
    const corner = within(grid).getAllByRole('columnheader')[0];
    expect(corner.querySelector('[data-testid^="term-tip-"]')).toBeNull();
    // TL-D8, and the TL-D9 label kept.
    expect(within(grid).getByText('Carry-over')).toBeInTheDocument();
    expect(within(grid).getByText('Would be')).toBeInTheDocument();
  });

  it('AC-01 in Indonesian: the row and Carry-over keep the team’s words', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });
      const grid = await openGrid();
      expect(within(grid).getByText('Demand anticipation (DA)')).toBeInTheDocument();
      expect(within(grid).getByText('Carry-over')).toBeInTheDocument();
      expect(within(grid).getByText('FG demand')).toBeInTheDocument();
      expect(within(grid).queryByText('Antisipasi permintaan')).toBeNull();
      const tip = within(grid).getByTestId('term-tip-demand-anticipation');
      expect(within(tip).getByRole('tooltip')).toHaveTextContent(
        'Bukan: Delivery Agreement (juga DA, di halaman kontrak).'
      );
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

describe('BL-233 — the shared parts take a term', () => {
  it('TermLabel shows the entry’s label and leaves out the lines it does not have', () => {
    render(<TermLabel term="consumptionAverage" />);
    // TL-D14: the team's name is the label, so it has no other name to list.
    expect(screen.getByText('Moving average consumption')).toBeInTheDocument();
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent(
      'How it is calculated: Recorded consumption of the last 13 weeks'
    );
    expect(tip).not.toHaveTextContent('Also called');
    expect(tip).not.toHaveTextContent('Not:');
  });

  it('an entry with no other name shows no "Also called" line (BR-10)', () => {
    render(<TermLabel term="ltp" />);
    expect(screen.getByRole('tooltip')).not.toHaveTextContent('Also called');
  });

  it('a table header and a KPI card render the term’s label with its (i)', () => {
    render(
      <>
        <table>
          <thead>
            <tr>
              <TableHeaderCell term="supplyGap" />
            </tr>
          </thead>
        </table>
        <KpiCard term="openSupply" value="1" />
      </>
    );
    expect(screen.getByRole('columnheader')).toHaveTextContent(/^Gap/);
    expect(screen.getByTestId('term-tip-supply-gap')).toBeInTheDocument();
    expect(screen.getByTestId('term-tip-open-supply')).toHaveTextContent('Open supply');
  });
});
