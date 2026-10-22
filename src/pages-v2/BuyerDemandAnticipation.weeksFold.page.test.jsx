// ─────────────────────────────────────────────────────────────────────────────
// IA review item 1 — Demand anticipation opens each card on its plan check; the
// weeks grid unfolds on request, and a card shown alone opens unfolded.
// ─────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const KEY = 'sup-002-RM-STEAR-7300';
const WAIT = { timeout: 15000 };

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  consumptionStore.reset();
});
afterEach(() => {
  sdcClock.reset();
  void i18n.changeLanguage('en');
});

/** The cards, by their own section (inner elements carry `dant-card-…` ids too). */
const allCards = () =>
  /** @type {HTMLElement[]} */ ([
    ...document.querySelectorAll('section[data-testid^="dant-card-"]')
  ]);

/** @param {string} route */
const render = (route) =>
  renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route });

describe('Demand anticipation cards fold their weeks', () => {
  it('several cards: each shows its plan check, and no weeks until asked', async () => {
    render('/buyer/demand-anticipation');
    const card = await screen.findByTestId(`dant-card-${KEY}`, {}, WAIT);
    const cards = allCards();
    if (cards.length < 2) throw new Error('premise: several cards');
    for (const c of cards) {
      const key = (c.dataset.testid ?? '').replace('dant-card-', '');
      expect(within(c).getByTestId(`dant-check-${key}`)).toBeInTheDocument();
      expect(c.querySelector('table')).toBeNull();
    }
    const toggle = within(card).getByTestId(`dant-weeks-toggle-${KEY}`);
    expect(toggle).toHaveTextContent('Show the weeks');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('Hide the weeks');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(card.querySelector(`#dant-weeks-${KEY} table`)).not.toBeNull();
    // Only this card unfolded.
    expect(cards.filter((c) => c.querySelector('table') !== null)).toEqual([card]);

    fireEvent.click(toggle);
    expect(card.querySelector('table')).toBeNull();
  });

  it('one card, filtered to its supplier and material, opens unfolded and can fold', async () => {
    render('/buyer/demand-anticipation?supplier=sup-002&material=RM-STEAR-7300');
    const card = await screen.findByTestId(`dant-card-${KEY}`, {}, WAIT);
    expect(allCards()).toHaveLength(1);
    const toggle = within(card).getByTestId(`dant-weeks-toggle-${KEY}`);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(card.querySelector('table')).not.toBeNull();
    fireEvent.click(toggle);
    expect(card.querySelector('table')).toBeNull();
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    render('/buyer/demand-anticipation');
    const card = await screen.findByTestId(`dant-card-${KEY}`, {}, WAIT);
    expect(within(card).getByTestId(`dant-weeks-toggle-${KEY}`)).toHaveTextContent(
      'Tampilkan minggu'
    );
  });
});
