// ─────────────────────────────────────────────────────────────────────────────
// UCX-P6 (BL-367) · UCX-D19 — the DA publish remembers each supplier's
// agreement to take the remainder, shows its date and asks only about new or
// changed rows; no expiry, no re-ask. On the screen, over the sample data.
//
// The pairs are the sample's own (measured): at W37 `sup-002|RM-STEAR-7300`
// still carries its W36 quantity (standing), `sup-005|RM-EMUL-9410` moved
// 525 → 625 (changed), and `sup-007|PK-PETB-8802` has no agreement (new).
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { ltpInputStore } from '@services/data/mock/stores/ltpInputStore';
import { forecastVersionStore } from '@services/data/mock/stores/forecastHubStores';
import { sdcClock } from '@services/sdc';
import { formatDate, formatNumber } from '@lib/format';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const ROUTE = '/buyer/demand-anticipation';
const STEAR = 'sup-002|RM-STEAR-7300';
const CHANGED = 'sup-005|RM-EMUL-9410';
const NEW = 'sup-007|PK-PETB-8802';

/** The panel's testid for a pair's checkbox and its record line (hyphens, not the pipe key). */
const id = (/** @type {string} */ key) => key.replace('|', '-');

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  forecastVersionStore.reset();
  ltpInputStore.reset();
  // The seed is computed at the first read: take it before a test changes anything.
  demandAnticipationStore.all();
});

const renderPage = () =>
  renderWithProviders(<BuyerDemandAnticipation />, { identity: PLANNER, route: ROUTE });

/** Opens the publish confirm and returns it. */
const openConfirm = async () => {
  fireEvent.click(await screen.findByTestId('dant-publish-button', {}, { timeout: 15000 }));
  return screen.findByTestId('dant-publish-confirm');
};

/** Publishes with the given candidates ticked beyond the pre-ticked ones. */
const publishWith = async (/** @type {readonly string[]} */ tick) => {
  const confirm = await openConfirm();
  for (const key of tick) {
    const box = /** @type {HTMLInputElement} */ (
      within(confirm).getByTestId(`dant-agree-${id(key)}`)
    );
    if (!box.checked) fireEvent.click(box);
  }
  fireEvent.click(within(confirm).getByTestId('dant-publish-commit'));
  await waitFor(() => expect(demandAnticipationStore.all().length).toBeGreaterThan(1));
};

/** The read's row for a pair. */
const rowOf = async (/** @type {string} */ key) => {
  const { items } = await mockDataService.procurement.getDemandAnticipation({
    personaType: 'buyer',
    supplierId: null,
    businessRoles: SEEDED_SEAT_ROLES.buyer
  });
  const row = items.find((r) => `${r.supplierId}|${r.materialCode}` === key);
  if (!row) throw new Error(`no row ${key}`);
  return row;
};

describe('UCX-P6 — the DA publish remembers the agreement', () => {
  it('week 1: a row with no agreement is asked; publishing records it', async () => {
    renderPage();
    const confirm = await openConfirm();
    const box = within(confirm).getByTestId(`dant-agree-${id(STEAR)}`);
    expect(box).not.toBeChecked();
    expect(within(confirm).getByTestId(`dant-agree-record-${id(STEAR)}`)).toHaveTextContent(
      'New this week: no agreement on record'
    );
    fireEvent.click(box);
    expect(within(confirm).getByTestId('dant-publish-commit')).not.toBeDisabled();
    fireEvent.click(within(confirm).getByTestId('dant-publish-commit'));
    await waitFor(() => expect(demandAnticipationStore.all()).toHaveLength(2));
    expect(demandAnticipationStore.all()[1].agreedFirstOutside).toEqual(
      expect.arrayContaining([STEAR])
    );
  });

  it('next week: the standing row is pre-ticked with its date, and only new or changed rows ask', async () => {
    const first = renderPage();
    await publishWith([STEAR, CHANGED]);
    const agreedAt = demandAnticipationStore.all()[1].publishedAt;
    first.unmount();
    sdcClock.set('2026-09-08T03:00:00.000Z');
    renderPage();
    const confirm = await openConfirm();
    // Standing: pre-ticked, its first date shown, no decision asked.
    expect(within(confirm).getByTestId(`dant-agree-${id(STEAR)}`)).toBeChecked();
    expect(within(confirm).getByTestId(`dant-agree-record-${id(STEAR)}`)).toHaveTextContent(
      `Agreed ${formatDate(agreedAt)}`
    );
    // Changed: the quantity moved since the agreement — asked, with the old one.
    const changed = await rowOf(CHANGED);
    expect(within(confirm).getByTestId(`dant-agree-${id(CHANGED)}`)).not.toBeChecked();
    expect(within(confirm).getByTestId(`dant-agree-record-${id(CHANGED)}`)).toHaveTextContent(
      `Changed since ${formatDate(agreedAt)}: was ${formatNumber(
        /** @type {number} */ (changed.agreement?.qty)
      )}`
    );
    // New: no agreement on record.
    expect(within(confirm).getByTestId(`dant-agree-${id(NEW)}`)).not.toBeChecked();
    expect(within(confirm).getByTestId(`dant-agree-record-${id(NEW)}`)).toHaveTextContent(
      'New this week: no agreement on record'
    );
    // The summary counts what carries and what still needs a decision.
    expect(within(confirm).getByTestId('dant-agree-summary')).toHaveTextContent(
      /^\d+ agreements carry · \d+ to decide$/
    );
  });

  it('an unticked agreement is revoked: the row asks again as new', async () => {
    const first = renderPage();
    await publishWith([STEAR]);
    first.unmount();
    sdcClock.set('2026-09-08T03:00:00.000Z');
    const second = renderPage();
    const confirm = await openConfirm();
    // The planner changes the agreement: untick it and publish.
    expect(within(confirm).getByTestId(`dant-agree-${id(STEAR)}`)).toBeChecked();
    fireEvent.click(within(confirm).getByTestId(`dant-agree-${id(STEAR)}`));
    fireEvent.click(within(confirm).getByTestId('dant-publish-commit'));
    await waitFor(() => expect(demandAnticipationStore.all()).toHaveLength(3));
    expect(demandAnticipationStore.all()[2].agreedFirstOutside).not.toContain(STEAR);
    second.unmount();
    sdcClock.set('2026-09-15T03:00:00.000Z');
    renderPage();
    const third = await openConfirm();
    expect(within(third).getByTestId(`dant-agree-record-${id(STEAR)}`)).toHaveTextContent(
      'New this week: no agreement on record'
    );
    expect(within(third).getByTestId(`dant-agree-${id(STEAR)}`)).not.toBeChecked();
  });

  it('no expiry: the agreement still stands weeks later, with its original date', async () => {
    const first = renderPage();
    await publishWith([STEAR]);
    const agreedAt = demandAnticipationStore.all()[1].publishedAt;
    first.unmount();
    // Two planning weeks pass with no publish at all.
    sdcClock.set('2026-09-15T03:00:00.000Z');
    renderPage();
    const row = await rowOf(STEAR);
    expect(row.agreement?.agreedAt).toBe(agreedAt);
  });
});
