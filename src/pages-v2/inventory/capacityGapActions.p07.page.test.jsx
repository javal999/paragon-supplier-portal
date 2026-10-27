// ─────────────────────────────────────────────────────────────────────────────
// INV-D8 (Inventory UX P-07) — PTI acts on a capacity gap week.
//
//   · PTI Capacity: a "PTI's decision" row offers "Accept additional capacity"
//     on an amber week only, says what a red week's additional capacity cannot
//     cover, and offers "Ask supplier" (topic capacityGap) on both; a week
//     within capacity has no action. The accept is recorded on the supplier ×
//     planning group × week and shown, and the row header reads "PTI's
//     decision: pending / accepted <date>".
//   · A seat without `capacitydecision:accept` is told whose act it is (§84).
//   · Supplier Capacity: "PTI accepted your additional capacity on <date>",
//     read only, on that week — and only on the supplier's own decisions.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { BUYER, SUPPLIER, renderWithProviders } from '@test/test-utils';
import { capacityDecisionStore } from '@services/data/mock/stores/capacityDecisionStore';
import { supplierAskStore } from '@services/data/mock/stores/supplierAskStore';
import { capacityWeekLevel } from '@services/data/mock/targets/capacityDecision';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import { NO_PERSON } from '@context/noPerson';
import BuyerCapacity from '../BuyerCapacity';
import SupplierCapacity from '../SupplierCapacity';
import { qty } from './inventoryDisplay';

const SUP5 = 'sup-005-pg-MG-02';
const SUP7 = 'sup-007-pg-MG-20';
/** @param {string} plan @param {string} week */
const key = (plan, week) => `${plan}-${week}`;

beforeEach(() => {
  capacityDecisionStore.reset();
  supplierAskStore.reset();
  sdcClock.reset();
  try {
    window.localStorage.clear();
  } catch {
    /* storage unavailable: the grid opens on Weekly anyway */
  }
});

describe('population control', () => {
  it('the weeks this file rests on are amber, red and within', () => {
    expect(capacityWeekLevel('sup-005', 'pg-MG-02', '2026-10-12')).toBe('needsAdditional');
    expect(capacityWeekLevel('sup-005', 'pg-MG-02', '2026-10-19')).toBe('needsAdditional');
    expect(capacityWeekLevel('sup-005', 'pg-MG-02', '2026-08-31')).toBe('within');
    expect(capacityWeekLevel('sup-007', 'pg-MG-20', '2026-09-14')).toBe('cannotSupply');
  });
});

describe('INV-D8 · PTI Capacity — actions on gap weeks only', () => {
  it('amber: Accept (not yet accepted) and Ask supplier; an accepted amber week reads Accepted <date>', async () => {
    renderWithProviders(<BuyerCapacity />, { route: '/buyer/capacity' });
    const accept = await screen.findByTestId(`capacity-accept-${key(SUP5, '2026-10-19')}`);
    expect(accept).toHaveTextContent('Accept additional capacity');
    expect(screen.getByTestId(`capacity-ask-${key(SUP5, '2026-10-19')}-open`)).toHaveTextContent(
      'Ask about the capacity gap'
    );
    // The sample acceptance: shown, and no second Accept on that week.
    expect(screen.getByTestId(`capacity-accepted-${key(SUP5, '2026-10-12')}`)).toHaveTextContent(
      `Accepted ${formatDate('2026-08-31T03:10:00.000Z')}`
    );
    expect(screen.queryByTestId(`capacity-accept-${key(SUP5, '2026-10-12')}`)).toBeNull();
  });

  it('red: no Accept; it says what the additional capacity cannot cover; Ask supplier is there', async () => {
    renderWithProviders(<BuyerCapacity />, { route: '/buyer/capacity' });
    const red = await screen.findByTestId(`capacity-cannot-cover-${key(SUP7, '2026-09-14')}`);
    expect(red).toHaveTextContent(
      `Additional capacity cannot cover this week. Still short: ${qty(12800)} PCS`
    );
    expect(screen.queryByTestId(`capacity-accept-${key(SUP7, '2026-09-14')}`)).toBeNull();
    // The sample capacity ask on this week is live, so the control shows it.
    expect(
      await screen.findByTestId(`capacity-ask-${key(SUP7, '2026-09-14')}-existing`)
    ).toBeTruthy();
  });

  it('a week within capacity has no action', async () => {
    renderWithProviders(<BuyerCapacity />, { route: '/buyer/capacity' });
    const cell = await screen.findByTestId(`capacity-no-action-${key(SUP5, '2026-08-31')}`);
    expect(cell).toHaveTextContent('—');
    expect(screen.queryByTestId(`capacity-accept-${key(SUP5, '2026-08-31')}`)).toBeNull();
    expect(screen.queryByTestId(`capacity-ask-${key(SUP5, '2026-08-31')}-open`)).toBeNull();
  });

  it('Ask supplier on a gap week opens on the capacityGap topic for that planning group and week', async () => {
    renderWithProviders(<BuyerCapacity />, { route: '/buyer/capacity' });
    fireEvent.click(await screen.findByTestId(`capacity-ask-${key(SUP5, '2026-10-19')}-open`));
    const topic = /** @type {HTMLSelectElement} */ (
      screen.getByTestId(`capacity-ask-${key(SUP5, '2026-10-19')}-topic`)
    );
    expect(topic.value).toBe('capacityGap');
    fireEvent.click(screen.getByTestId(`capacity-ask-${key(SUP5, '2026-10-19')}-submit`));
    await waitFor(() =>
      expect(supplierAskStore.all().slice(-1)[0]).toMatchObject({
        supplierId: 'sup-005',
        planningGroupId: 'pg-MG-02',
        week: '2026-10-19',
        topic: 'capacityGap'
      })
    );
  });
});

describe('INV-D8 · the accept is recorded and shown', () => {
  it('Accept records the decision; the week reads Accepted; the header loses its pending week', async () => {
    renderWithProviders(<BuyerCapacity />, { route: '/buyer/capacity' });
    const header = await screen.findByTestId(`capacity-decision-header-${SUP5}`);
    expect(header).toHaveTextContent(
      `PTI’s decision: accepted ${formatDate('2026-08-31T03:10:00.000Z')} · 1 wk pending`
    );
    expect(screen.getByTestId(`capacity-decision-header-${SUP7}`)).toHaveTextContent(
      'PTI’s decision: pending'
    );

    fireEvent.click(screen.getByTestId(`capacity-accept-${key(SUP5, '2026-10-19')}`));
    expect(
      await screen.findByTestId(`capacity-accepted-${key(SUP5, '2026-10-19')}`)
    ).toHaveTextContent(`Accepted ${formatDate(sdcClock.now())}`);
    expect(capacityDecisionStore.find('sup-005', 'pg-MG-02', '2026-10-19')).toMatchObject({
      decision: 'accepted',
      decidedAt: sdcClock.now()
    });
    expect(screen.queryByTestId(`capacity-accept-${key(SUP5, '2026-10-19')}`)).toBeNull();
    const after = screen.getByTestId(`capacity-decision-header-${SUP5}`);
    expect(after).toHaveTextContent(`PTI’s decision: accepted ${formatDate(sdcClock.now())}`);
    expect(after).not.toHaveTextContent('pending');
  });

  it('a seat without capacitydecision:accept sees whose act it is, not the button', async () => {
    renderWithProviders(<BuyerCapacity />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: '/buyer/capacity'
    });
    await screen.findByTestId(`capacity-decision-header-${SUP5}`);
    expect(screen.queryByTestId(`capacity-accept-${key(SUP5, '2026-10-19')}`)).toBeNull();
    expect(screen.getAllByTestId('handoff-capacitydecision-accept').length).toBeGreaterThan(0);
  });
});

describe('INV-D8 · the supplier sees PTI’s acceptance, read only', () => {
  it('sup-005 reads "PTI accepted your additional capacity on <date>" on the accepted week only', async () => {
    renderWithProviders(<SupplierCapacity />, {
      identity: {
        ...SUPPLIER,
        supplierId: 'sup-005',
        supplierName: 'Sample Personal Care Emulsifiers GmbH'
      },
      route: '/supplier/capacity?group=pg-MG-02'
    });
    const line = await screen.findByTestId('capacity-pti-accepted-2026-10-12');
    expect(line).toHaveTextContent(
      `PTI accepted your additional capacity on ${formatDate('2026-08-31T03:10:00.000Z')}`
    );
    expect(screen.queryByTestId('capacity-pti-accepted-2026-10-19')).toBeNull();
    // Read only: the row carries no control.
    expect(within(line).queryByRole('button')).toBeNull();
  });

  it('sup-007 (no decision of its own) has no PTI decision row', async () => {
    renderWithProviders(<SupplierCapacity />, {
      identity: SUPPLIER,
      route: '/supplier/capacity?group=pg-MG-20'
    });
    await screen.findByTestId('capacity-grid');
    expect(screen.queryByText('PTI’s decision')).toBeNull();
    expect(screen.queryByTestId(/^capacity-pti-accepted-/)).toBeNull();
  });
});

describe('BL-227 · Undo, and an accepted week that has turned red', () => {
  it('Undo on an accepted amber week takes the acceptance back: Accept returns, the header shows the week pending', async () => {
    renderWithProviders(<BuyerCapacity />, { route: '/buyer/capacity' });
    const undo = await screen.findByTestId(`capacity-undo-${key(SUP5, '2026-10-12')}`);
    expect(undo).toHaveTextContent('Undo');
    fireEvent.click(undo);
    expect(
      await screen.findByTestId(`capacity-accept-${key(SUP5, '2026-10-12')}`)
    ).toBeInTheDocument();
    expect(screen.queryByTestId(`capacity-accepted-${key(SUP5, '2026-10-12')}`)).toBeNull();
    expect(capacityDecisionStore.get('capd-0001')?.decision).toBe('withdrawn');
    expect(screen.getByTestId(`capacity-decision-header-${SUP5}`)).toHaveTextContent(
      'PTI’s decision: pending'
    );
  });

  it('a week not accepted has no Undo (control)', async () => {
    renderWithProviders(<BuyerCapacity />, { route: '/buyer/capacity' });
    await screen.findByTestId(`capacity-accept-${key(SUP5, '2026-10-19')}`);
    expect(screen.queryByTestId(`capacity-undo-${key(SUP5, '2026-10-19')}`)).toBeNull();
  });

  it('an acceptance on a week that is now red says it counts again, offers Undo, and the header does not count it', async () => {
    // The week was amber when PTI accepted; the plan has since turned it red.
    capacityDecisionStore.insert({
      supplierId: 'sup-007',
      planningGroupId: 'pg-MG-20',
      week: '2026-09-14',
      decision: 'accepted',
      decidedAt: '2026-08-20T03:00:00.000Z',
      decidedBy: NO_PERSON
    });
    renderWithProviders(<BuyerCapacity />, { route: '/buyer/capacity' });
    expect(
      await screen.findByTestId(`capacity-accepted-now-red-${key(SUP7, '2026-09-14')}`)
    ).toHaveTextContent('counts toward the alert again');
    expect(screen.getByTestId(`capacity-undo-${key(SUP7, '2026-09-14')}`)).toBeInTheDocument();
    expect(screen.getByTestId(`capacity-decision-header-${SUP7}`)).toHaveTextContent(
      'PTI’s decision: pending'
    );
    // An amber accepted week carries no such note (control).
    expect(screen.queryByTestId(`capacity-accepted-now-red-${key(SUP5, '2026-10-12')}`)).toBeNull();
  });

  it('a seat without capacitydecision:accept gets no Undo', async () => {
    renderWithProviders(<BuyerCapacity />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: '/buyer/capacity'
    });
    await screen.findByTestId(`capacity-accepted-${key(SUP5, '2026-10-12')}`);
    expect(screen.queryByTestId(`capacity-undo-${key(SUP5, '2026-10-12')}`)).toBeNull();
  });
});
