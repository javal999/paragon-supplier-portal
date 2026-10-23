// ─────────────────────────────────────────────────────────────────────────────
// INV-D2 (BL-65, Inventory UX S-05) — "Copy W36 to all weeks" on supplier
// Capacity. Capacity stays one value per week; the action copies the FIRST
// week's figure of one row (Allocated, or Additional capacity) into every other
// week of that row, in the form only. Submit still sends it through the same
// verb and its rules.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { allCapacityPlans } from '@services/data/mock/inventoryReadModel';
import { isoWeek } from '@services/engine/dates';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import i18n from '@lib/i18n';
import { inventoryCapacityEn, inventoryCapacityId } from '@lib/i18n/inventoryCapacity';
import { qty } from './inventory/inventoryDisplay';
import SupplierCapacity from './SupplierCapacity';

beforeEach(async () => {
  capacityStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
  await i18n.changeLanguage('en');
});

const ROUTE = '/supplier/capacity?group=pg-MG-20';

/** sup-007's rigid-plastic plan, as the read model derives it today. */
const plan = () => {
  const p = allCapacityPlans().find(
    (x) => x.supplierId === 'sup-007' && x.planningGroupId === 'pg-MG-20'
  );
  if (!p?.latest) throw new Error('population: sup-007 pg-MG-20 has no submission');
  return p;
};

/** @param {string} week */
const allocatedInput = (week) =>
  /** @type {HTMLInputElement} */ (
    screen.getByLabelText(`Allocated capacity for the week of ${formatDate(week)}`)
  );
/** @param {string} week */
const upsideInput = (week) =>
  /** @type {HTMLInputElement} */ (
    screen.getByLabelText(`Additional capacity for the week of ${formatDate(week)}`)
  );

const open = async () => {
  renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER, route: ROUTE });
  const p = plan();
  await screen.findByLabelText(`Allocated capacity for the week of ${formatDate(p.weeks[0].week)}`);
  return p;
};

describe('INV-D2 — Copy to all weeks', () => {
  it('fills all 13 weeks of Allocated in the form, sends nothing until Submit, and Submit sends them', async () => {
    const p = await open();
    const weeks = p.weeks.map((w) => w.week);
    // Population control: the 13-week horizon.
    expect(weeks).toHaveLength(13);
    const first = `W${isoWeek(weeks[0])}`;
    // Above every week's LTP, so no week needs a reason.
    const value = Math.max(...p.weeks.map((w) => w.demand)) + 1000;
    const upsideBefore = weeks.map((w) => upsideInput(w).value);
    const latestBefore = p.latest?.id;
    const submissionsBefore = capacityStore.all().length;

    fireEvent.change(allocatedInput(weeks[0]), { target: { value: String(value) } });
    const copy = screen.getByTestId('capacity-copy-allocated');
    // The label names the source week; the accessible name adds the row and the figure.
    expect(copy).toHaveTextContent(`Copy ${first} to all weeks`);
    expect(copy).toHaveAccessibleName(`Copy ${first} to all weeks: Allocated, ${qty(value)}`);
    fireEvent.click(copy);

    for (const w of weeks) expect(allocatedInput(w).value).toBe(String(value));
    // Copy does nothing to the other row.
    expect(weeks.map((w) => upsideInput(w).value)).toEqual(upsideBefore);
    // Nothing is sent: the store and the plan's latest submission are unchanged.
    expect(capacityStore.all()).toHaveLength(submissionsBefore);
    expect(plan().latest?.id).toBe(latestBefore);

    fireEvent.click(screen.getByTestId('capacity-submit'));
    await waitFor(() => expect(plan().latest?.id).not.toBe(latestBefore));
    const sent = plan().latest?.weeks ?? [];
    expect(sent.map((w) => w.week)).toEqual(weeks);
    for (const w of sent) expect(w.allocated).toBe(value);
    // The additional capacity went as it stood before the copy.
    expect(sent.map((w) => (w.upside === undefined ? '' : String(w.upside)))).toEqual(upsideBefore);
  });

  it('a week the copy puts below the LTP still needs a reason before Submit', async () => {
    const p = await open();
    const [w0, ...rest] = p.weeks;
    // Population control: a later week whose LTP is above the first week's and
    // that carries no seeded reason, so the copy alone puts it below the LTP.
    const target = rest.find((w) => w.demand > w0.demand && !w.entry?.reason);
    expect(target, 'a later week with a higher LTP and no reason').toBeDefined();
    const t = /** @type {NonNullable<typeof target>} */ (target);
    const value = w0.demand;

    fireEvent.change(allocatedInput(w0.week), { target: { value: String(value) } });
    fireEvent.click(screen.getByTestId('capacity-copy-allocated'));

    expect(allocatedInput(t.week).value).toBe(String(value));
    expect(screen.getByTestId('capacity-submit')).toBeDisabled();
    expect(screen.getByTestId('capacity-refusal')).toHaveTextContent(
      /is below the LTP\. Choose a reason\./
    );
    expect(
      screen.getByLabelText(`Reason for the week of ${formatDate(t.week)}`)
    ).toBeInTheDocument();
  });

  it('Additional capacity copies its own row only; an empty first week cannot be copied', async () => {
    const p = await open();
    const weeks = p.weeks.map((w) => w.week);
    const allocatedBefore = weeks.map((w) => allocatedInput(w).value);

    fireEvent.change(upsideInput(weeks[0]), { target: { value: '2500' } });
    fireEvent.click(screen.getByTestId('capacity-copy-upside'));
    for (const w of weeks) expect(upsideInput(w).value).toBe('2500');
    expect(weeks.map((w) => allocatedInput(w).value)).toEqual(allocatedBefore);

    // Known-bad control: with the first week empty there is nothing to copy.
    fireEvent.change(allocatedInput(weeks[0]), { target: { value: '' } });
    const copy = screen.getByTestId('capacity-copy-allocated');
    expect(copy).toBeDisabled();
    fireEvent.click(copy);
    expect(allocatedInput(weeks[1]).value).toBe(allocatedBefore[1]);
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER, route: ROUTE });
      const copy = await screen.findByTestId('capacity-copy-allocated');
      const first = `W${isoWeek(plan().weeks[0].week)}`;
      expect(copy).toHaveTextContent(`Salin ${first} ke semua minggu`);
    } finally {
      await i18n.changeLanguage('en');
    }
  });

  it('every key exists in EN and ID', () => {
    for (const k of [
      'inv.capacity.copyToAll',
      'inv.capacity.copyToAllFor',
      'inv.capacity.copyToAllEmpty'
    ]) {
      expect(inventoryCapacityEn).toHaveProperty([k]);
      expect(inventoryCapacityId).toHaveProperty([k]);
    }
  });
});
