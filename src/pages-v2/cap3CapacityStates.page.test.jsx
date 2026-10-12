// ─────────────────────────────────────────────────────────────────────────────
// CAP-3 (BL-172) — three capacity states, shown the same everywhere.
//
// BR-01: every surface that shows the LTP against capacity draws the ONE
// capacity-state pill (`LtpCheckPill`, `data-pill="capacity-state"`), with one
// colour per state. Surfaces derived from the tree (grep of the pill and of the
// level values): PTI Capacity, supplier Capacity, Submit per period. The
// planner exception list shows no capacity level, so it has no pill to share.
// BR-02: the PTI accordion header counts each non-green state.
// BR-03 / AC-02: an amber week offers "Confirm additional capacity"; it is
// saved with the capacity submission (`upsideConfirmed: true`) and the PTI
// header's "Needs additional" count drops.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { capacityStore, inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { allCapacityPlans } from '@services/data/mock/inventoryReadModel';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { isUpsideConfirmed, ltpCapacityLevel } from '@services/transitions/capacityRules';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import i18n from '@lib/i18n';
import { LtpCheckPill } from './inventory/inventoryDisplay';
import SupplierForecastCommitments from './SupplierForecastCommitments';
import SupplierCapacity from './SupplierCapacity';
import BuyerCapacity from './BuyerCapacity';

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  capacityStore.reset();
  sdcClock.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const PLAN_KEY = 'sup-007-pg-MG-20';
const AMBER = W[6];

/** sup-007's rigid-plastic plan, as the read model derives it today. */
const petPlan = () => {
  const p = allCapacityPlans().find(
    (x) => x.supplierId === 'sup-007' && x.planningGroupId === 'pg-MG-20'
  );
  if (!p?.latest) throw new Error('population: sup-007 pg-MG-20 has no submission');
  return p;
};

/**
 * Submit sup-007's plan again THROUGH THE VERB, with week `AMBER` amber: 5,000
 * under the LTP, 10,000 additional (AC-01's shape: LTP above allocated, within
 * BE). `confirmed` adds the BR-03 confirmation.
 * @param {boolean} confirmed
 */
const submitAmber = async (confirmed) => {
  const plan = petPlan();
  const demand = plan.weeks.find((w) => w.week === AMBER)?.demand ?? 0;
  // Population control: the week carries an LTP large enough to sit under.
  expect(demand).toBeGreaterThan(5000);
  const weeks = plan.weeks.map((w) => {
    const e = /** @type {NonNullable<typeof w.entry>} */ (w.entry);
    if (w.week !== AMBER) return { ...e };
    return {
      week: w.week,
      allocated: demand - 5000,
      upside: 10000,
      reason: 'capacity',
      ...(confirmed ? { upsideConfirmed: /** @type {const} */ (true) } : {})
    };
  });
  await new MockCommandService().dispatch(
    {
      personaType: 'supplier',
      supplierId: 'sup-007',
      businessRoles: PERSONA_SYSTEM_ROLES.supplier,
      actor: NO_PERSON
    },
    {
      transitionId: 't_capacity_submit',
      entity: 'capacitySubmission',
      payload: { supplierId: 'sup-007', planningGroupId: 'pg-MG-20', weeks }
    }
  );
};

/**
 * The shared pill, in the given colour.
 * @param {HTMLElement} el
 * @param {'success' | 'warning' | 'danger' | 'neutral'} tone
 */
const expectSharedPill = (el, tone) => {
  expect(el).toHaveAttribute('data-pill', 'capacity-state');
  expect(el).toHaveAttribute('data-tone', tone);
  expect(el.firstElementChild?.className).toContain(
    `bg-${tone === 'neutral' ? 'bg-hover' : `${tone}-soft`}`
  );
};

describe('the rule (AC-01)', () => {
  it('LTP 95,000 against allocated 90,000 and additional 10,000 is amber; a confirmation reads only on amber', () => {
    const entry = { allocated: 90000, upside: 10000 };
    expect(ltpCapacityLevel(95000, entry)).toBe('needsAdditional');
    expect(isUpsideConfirmed('needsAdditional', { ...entry, upsideConfirmed: true })).toBe(true);
    expect(isUpsideConfirmed('needsAdditional', entry)).toBe(false);
    // A week that is no longer amber has nothing to confirm.
    expect(isUpsideConfirmed('within', { ...entry, upsideConfirmed: true })).toBe(false);
  });
});

describe('BR-01 — one pill, one colour per state', () => {
  it('green Within capacity, amber Needs additional capacity, red Cannot be supplied', () => {
    render(
      <>
        <LtpCheckPill level="within" testId="p-within" />
        <LtpCheckPill level="needsAdditional" testId="p-amber" />
        <LtpCheckPill level="cannotSupply" testId="p-red" />
        <LtpCheckPill level="unconfirmed" testId="p-none" />
      </>
    );
    expectSharedPill(screen.getByTestId('p-within'), 'success');
    expect(screen.getByTestId('p-within')).toHaveTextContent('Within capacity');
    expectSharedPill(screen.getByTestId('p-amber'), 'warning');
    expect(screen.getByTestId('p-amber')).toHaveTextContent(/^Needs additional capacity$/);
    expectSharedPill(screen.getByTestId('p-red'), 'danger');
    expect(screen.getByTestId('p-red')).toHaveTextContent('Cannot be supplied');
    expectSharedPill(screen.getByTestId('p-none'), 'neutral');
  });

  it('the confirmation line reads in both languages', async () => {
    // Unmount before each language switch, so nothing mounted re-renders.
    const en = render(<LtpCheckPill level="needsAdditional" confirmed={false} testId="p" />);
    expect(screen.getByTestId('p-confirmation')).toHaveTextContent('Needs confirmation');
    en.unmount();
    await i18n.changeLanguage('id');
    try {
      const id = render(<LtpCheckPill level="needsAdditional" confirmed testId="q" />);
      expect(screen.getByTestId('q-confirmation')).toHaveTextContent('Tambahan dikonfirmasi');
      id.unmount();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

describe('PTI Capacity', () => {
  it('AC-01: the amber week draws the shared amber pill, reads Needs confirmation, and the header counts each non-green state', async () => {
    await submitAmber(false);
    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const pill = await screen.findByTestId(`capacity-ltp-${PLAN_KEY}-${AMBER}`);
    expectSharedPill(pill, 'warning');
    expect(pill).toHaveAttribute('data-confirmed', 'false');
    expect(pill).toHaveTextContent('Needs confirmation');
    expectSharedPill(screen.getByTestId(`capacity-ltp-${PLAN_KEY}-${W[2]}`), 'danger');
    expect(screen.getByTestId(`capacity-state-counts-${PLAN_KEY}`)).toHaveTextContent(
      'Needs additional: 1 wk · Cannot be supplied: 1 wk'
    );
    // BR-02 — the old "Weeks below the LTP" wording is gone.
    expect(screen.queryByText(/Weeks below the LTP/)).toBeNull();
  });
});

describe('Submit per period', () => {
  it('AC-01: the amber period draws the shared amber pill, and reads Confirmed additional once confirmed', async () => {
    await submitAmber(false);
    const first = renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const row = await screen.findByTestId(`fc-week-${AMBER}`);
    const pill = within(row).getByTestId(`fc-week-check-${AMBER}-pg-MG-20`);
    expectSharedPill(pill, 'warning');
    expect(pill).toHaveTextContent('Needs confirmation');
    first.unmount();

    await submitAmber(true);
    renderWithProviders(<SupplierForecastCommitments />, {
      identity: SUPPLIER,
      route: '/supplier/forecasts'
    });
    const again = await screen.findByTestId(`fc-week-check-${AMBER}-pg-MG-20`);
    expectSharedPill(again, 'warning');
    expect(again).toHaveAttribute('data-confirmed', 'true');
    expect(again).toHaveTextContent('Confirmed additional');
  });
});

describe('Supplier Capacity — BR-03 confirm additional capacity', () => {
  it('AC-01 + AC-02: the amber week offers the confirmation, saves it with Submit, and the PTI header count drops', async () => {
    await submitAmber(false);
    const sup = renderWithProviders(<SupplierCapacity />, {
      identity: SUPPLIER,
      route: '/supplier/capacity'
    });
    const pill = await screen.findByTestId(`capacity-ltp-${AMBER}`);
    await waitFor(() => expect(pill).toHaveAttribute('data-level', 'needsAdditional'));
    expectSharedPill(pill, 'warning');
    expect(pill).toHaveTextContent('Needs confirmation');
    // Only the amber week offers it.
    expect(screen.queryByTestId(`capacity-confirm-upside-${W[2]}`)).toBeNull();
    const box = screen.getByLabelText(
      `Confirm additional capacity for the week of ${formatDate(AMBER)}`
    );
    fireEvent.click(box);
    expect(screen.getByTestId(`capacity-ltp-${AMBER}`)).toHaveTextContent('Confirmed additional');
    fireEvent.click(screen.getByTestId('capacity-submit'));
    await waitFor(() =>
      expect(petPlan().latest?.weeks.find((w) => w.week === AMBER)).toMatchObject({
        upsideConfirmed: true
      })
    );
    sup.unmount();

    renderWithProviders(<BuyerCapacity />, { identity: PLANNER, route: '/buyer/capacity' });
    const pti = await screen.findByTestId(`capacity-ltp-${PLAN_KEY}-${AMBER}`);
    expect(pti).toHaveTextContent('Confirmed additional');
    expect(screen.queryByTestId(`capacity-amber-count-${PLAN_KEY}`)).toBeNull();
    expect(screen.getByTestId(`capacity-state-counts-${PLAN_KEY}`)).toHaveTextContent(
      'Confirmed additional: 1 wk · Cannot be supplied: 1 wk'
    );
  });

  it('changing the additional capacity clears the confirmation; a non-true value is never stored', async () => {
    await submitAmber(true);
    renderWithProviders(<SupplierCapacity />, { identity: SUPPLIER, route: '/supplier/capacity' });
    const box = await screen.findByLabelText(
      `Confirm additional capacity for the week of ${formatDate(AMBER)}`
    );
    await waitFor(() => expect(box).toBeChecked());
    fireEvent.change(
      screen.getByLabelText(`Additional capacity for the week of ${formatDate(AMBER)}`),
      { target: { value: '9000' } }
    );
    expect(box).not.toBeChecked();
    expect(screen.getByTestId(`capacity-ltp-${AMBER}`)).toHaveTextContent('Needs confirmation');

    // Store side: only a literal `true` is a confirmation.
    const plan = petPlan();
    const weeks = plan.weeks.map((w) => ({
      .../** @type {NonNullable<typeof w.entry>} */ (w.entry),
      ...(w.week === AMBER ? { upsideConfirmed: 'yes' } : {})
    }));
    await new MockCommandService().dispatch(
      {
        personaType: 'supplier',
        supplierId: 'sup-007',
        businessRoles: PERSONA_SYSTEM_ROLES.supplier,
        actor: NO_PERSON
      },
      {
        transitionId: 't_capacity_submit',
        entity: 'capacitySubmission',
        payload: { supplierId: 'sup-007', planningGroupId: 'pg-MG-20', weeks }
      }
    );
    expect(petPlan().latest?.weeks.find((w) => w.week === AMBER)).not.toHaveProperty(
      'upsideConfirmed'
    );
  });
});
