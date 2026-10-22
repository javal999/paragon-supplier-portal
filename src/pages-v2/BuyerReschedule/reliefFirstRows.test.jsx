// ─────────────────────────────────────────────────────────────────────────────
// IA F-2 — the ranked relief opens on its highest-ranked rows; "Show all"
// reveals the rest, and a selected proposal stays visible when the list folds,
// so nothing is sent that the planner cannot see.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import BuyerReschedule from '../BuyerReschedule';
import { RELIEF_FIRST_ROWS } from './components/ReliefSection';

const WAIT = { timeout: 15000 };
/** @param {HTMLElement} section */
const reliefRows = (section) =>
  within(section)
    .getAllByTestId(/^rs-relief-/)
    .filter((el) => el.tagName === 'TR');

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('the ranked relief opens on its first rows', () => {
  it('folds to the first rows, and keeps a selected row past them visible', async () => {
    renderWithProviders(<BuyerReschedule />, { identity: BUYER, route: '/buyer/reschedule' });
    const section = await screen.findByTestId('rs-relief', {}, WAIT);
    expect(reliefRows(section)).toHaveLength(RELIEF_FIRST_ROWS);

    const toggle = within(section).getByTestId('rs-show-all-relief');
    expect(toggle.textContent).toMatch(/^Show all \d+ proposals$/);
    fireEvent.click(toggle);
    const all = reliefRows(section);
    expect(all.length).toBeGreaterThan(RELIEF_FIRST_ROWS);

    // Select the last row, which sits past the first rows, then fold the list.
    const last = /** @type {HTMLElement} */ (all[all.length - 1]);
    const id = /** @type {string} */ (last.dataset.testid).slice('rs-relief-'.length);
    const box = within(last).queryByRole('checkbox');
    if (!box) throw new Error(`fixture premise: ${id} is selectable for this seat`);
    fireEvent.click(box);
    fireEvent.click(within(section).getByTestId('rs-show-all-relief'));

    const folded = reliefRows(section).map((tr) => tr.dataset.testid);
    expect(folded).toHaveLength(RELIEF_FIRST_ROWS + 1);
    expect(folded).toContain(`rs-relief-${id}`);
  });
});
