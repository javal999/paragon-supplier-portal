// ─────────────────────────────────────────────────────────────────────────────
// IA F-1 — Recommended orders opens on its soonest rows; "Show all" reveals the
// rest and "Show the first …" folds them again. The rows are sorted by week, so
// what is shown first is what is due first.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import BuyerOrderPlan from '../BuyerOrderPlan';
import { RECS_FIRST_ROWS } from './components/RecommendationsSection';

const WAIT = { timeout: 15000 };
/** @param {HTMLElement} section */
const recRows = (section) =>
  within(section)
    .getAllByTestId(/^op-rec-/)
    .filter((el) => el.tagName === 'TR');

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('Recommended orders opens on its first rows', () => {
  it('shows the first rows, sorted by week, and "Show all" reveals the rest', async () => {
    renderWithProviders(<BuyerOrderPlan />, { identity: BUYER, route: '/buyer/order-plan' });
    const section = await screen.findByTestId('op-recs', {}, WAIT);
    const first = recRows(section);
    expect(first).toHaveLength(RECS_FIRST_ROWS);
    const weeks = first.map((tr) => /** @type {string} */ (tr.dataset.testid).slice(-10));
    expect([...weeks].sort()).toEqual(weeks);

    const toggle = within(section).getByTestId('op-recs-toggle');
    expect(toggle.textContent).toMatch(/^Show all \d+ recommended orders$/);
    const total = Number(/** @type {string} */ (toggle.textContent).match(/\d+/)?.[0]);
    expect(total).toBeGreaterThan(RECS_FIRST_ROWS);
    fireEvent.click(toggle);
    expect(recRows(section)).toHaveLength(total);

    fireEvent.click(within(section).getByTestId('op-recs-toggle'));
    expect(recRows(section)).toHaveLength(RECS_FIRST_ROWS);
  });
});
