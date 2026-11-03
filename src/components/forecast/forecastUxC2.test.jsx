import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, waitFor, render } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { sapChangeMarkStore } from '@services/data/mock/stores/sapChangeMarkStore';
import { warehouseDecisionStore } from '@services/data/mock/stores/warehouseDecisionStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import { forecastOverrideStore } from '@services/data/mock/stores/forecastOverrideStore';
import { maxStockStore } from '@services/transitions/maxStock';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { formatDate } from '@lib/format';
/** @import { QueryScope } from '@services/data/types' */
import CycleSteps from './CycleSteps';
import TermTip from './TermTip';
import { CYCLE_STEPS } from './cycleCounts';
import BuyerStabilise from '@pages-v2/BuyerStabilise';
import BuyerDemandForecast from '@pages-v2/BuyerDemandForecast';
import BuyerReschedule from '@pages-v2/BuyerReschedule';
import BuyerCommitments from '@pages-v2/BuyerCommitments';
import BuyerReliability from '@pages-v2/BuyerReliability';
import { BuyerFixedStockReconcile } from '@pages-v2/FixedStockReconcile';

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST UX PHASE 3 · TASK C2 — keyboard, screen reader and narrow screens.
//
//   · the step bar marks the current step with aria-current="step";
//   · the tabs of Publish to suppliers and Forecast quality move by arrow key,
//     and focus stays on the tab reached (Forecast quality used to drop it);
//   · a term tip hides on Escape without losing focus;
//   · each switched-off act names its reason to a screen reader;
//   · at 390 px nothing outside a table's own scroll area is wider than the
//     screen, and a closed term tip takes no room.
// The Why this quantity panel's focus handling (focus in, Escape out, focus
// back to its control) is tested in BuyerOrderPlan.test.jsx.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const LOAD = { timeout: 15000 };

beforeEach(() => {
  callOffStore.reset();
  sapChangeMarkStore.reset();
  warehouseDecisionStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  requirementResponseStore.reset();
  forecastOverrideStore.reset();
  maxStockStore.reset();
});

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('the step bar (WCAG 1.3.1, 4.1.2)', () => {
  it.each(CYCLE_STEPS)('marks %s, and only it, as the current step', async (current) => {
    renderWithProviders(<CycleSteps current={current} />, { identity: PLANNER });
    const bar = await screen.findByRole('navigation', { name: 'Weekly cycle' });
    const links = within(bar).getAllByRole('link');
    expect(links).toHaveLength(CYCLE_STEPS.length);
    const marked = links.filter((l) => l.getAttribute('aria-current') === 'step');
    expect(marked).toEqual([screen.getByTestId(`cycle-step-${current}`)]);
  });

  it('wraps: one column on a phone, six only on a wide screen (FSR-D3 added step 6)', async () => {
    renderWithProviders(<CycleSteps current="publish" />, { identity: PLANNER });
    const list = /** @type {HTMLOListElement} */ (
      (await screen.findByTestId('cycle-steps')).querySelector('ol')
    );
    expect(list.className).toMatch(/(^| )grid-cols-1( |$)/);
    expect(list.className).toContain(`xl:grid-cols-${CYCLE_STEPS.length}`);
    expect(list.className).not.toMatch(/(^| )(sm|md):grid-cols-[56]/);
  });
});

describe('tabs move by arrow key, and focus stays on the tab reached (WCAG 2.1.1, 2.4.3)', () => {
  it('Publish to suppliers', async () => {
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    const publish = await screen.findByRole('tab', { name: /Version to publish/ }, LOAD);
    publish.focus();
    fireEvent.keyDown(publish, { key: 'ArrowRight' });
    const versions = await screen.findByRole(
      'tab',
      { name: /Published versions/, selected: true },
      LOAD
    );
    expect(document.activeElement).toBe(versions);
    expect(screen.getByRole('tabpanel', { name: 'Published versions' })).toBeInTheDocument();
    fireEvent.keyDown(versions, { key: 'ArrowLeft' });
    const back = await screen.findByRole(
      'tab',
      { name: /Version to publish/, selected: true },
      LOAD
    );
    expect(document.activeElement).toBe(back);
  });

  it('Forecast quality: each tab mounts its own frame, and the new frame takes focus', async () => {
    renderWithProviders(<BuyerDemandForecast />, {
      identity: PLANNER,
      route: '/buyer/demand-forecast'
    });
    const forecast = await screen.findByRole('tab', { name: 'Forecast vs plan' }, LOAD);
    forecast.focus();
    fireEvent.keyDown(forecast, { key: 'ArrowRight' });
    const bias = await screen.findByRole('tab', { name: /bias/i, selected: true }, LOAD);
    await waitFor(() => expect(document.activeElement).toBe(bias));
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    fireEvent.keyDown(bias, { key: 'Home' });
    const first = await screen.findByRole(
      'tab',
      { name: 'Forecast vs plan', selected: true },
      LOAD
    );
    await waitFor(() => expect(document.activeElement).toBe(first));
  });
});

describe('the term tip (WCAG 1.4.13, 2.4.7)', () => {
  it('Escape hides the open tip and keeps focus on its button; the next focus shows it again', () => {
    render(<TermTip term="MASC">MASC</TermTip>);
    const button = screen.getByRole('button', { name: /MASC/ });
    const tip = screen.getByRole('tooltip');
    expect(button).toHaveAccessibleDescription(
      /** @type {NonNullable<typeof tip.textContent>} */ (tip.textContent)
    );
    expect(button.className).toContain('focus-visible:outline-action');
    button.focus();
    expect(tip.className).toContain('group-focus-within:block');
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(tip.className).not.toContain('group-focus-within:block');
    expect(document.activeElement).toBe(button);
    fireEvent.blur(button);
    fireEvent.focus(button);
    expect(tip.className).toContain('group-focus-within:block');
  });
});

describe('a switched-off act says why (WCAG 4.1.2)', () => {
  const reschedule = async () =>
    /** @type {import('@services/data/types').RescheduleView} */ (
      await mockDataService.procurement.getReschedule(buyerScope)
    );

  it('Make warehouse room: Mark as taken to SAP and Send change to supplier, while the data is simulated', async () => {
    const proposals = (await reschedule()).warehouses
      .flatMap((w) => w.proposals)
      .filter((p) => p.rank !== null);
    const po = /** @type {import('@services/data/types').RescheduleProposalView} */ (
      proposals.find((p) => p.line.kind === 'poLine')
    );
    const co = /** @type {import('@services/data/types').RescheduleProposalView} */ (
      proposals.find((p) => p.line.kind === 'callOff' && p.type !== 'cancel')
    );
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const mark = await screen.findByTestId(`rs-mark-off-${po.id}`, {}, LOAD);
    expect(mark).toBeDisabled();
    expect(mark).toHaveAccessibleDescription(/Off on sample data.*SAP feed is live/);
    const send = screen.getByTestId(`rs-send-off-${co.id}`);
    expect(send).toBeDisabled();
    expect(send).toHaveAccessibleDescription(/Off on sample data.*SAP feed is live/);
  });

  it('Make warehouse room: Save decision, before a choice and while a note is missing', async () => {
    const plan = /** @type {import('@services/data/types').OrderPlanView} */ (
      await mockDataService.procurement.getOrderPlan(buyerScope)
    );
    const sw = /** @type {import('@services/data/types').WarehousePlanView} */ (
      plan.warehouses.find((w) => w.kind === 'packaging')
    ).shortfallWeeks[0];
    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    const week = await screen.findByTestId(`rs-decide-week-${sw.weekStart}`, {}, LOAD);
    const save = within(week).getByTestId(`rs-decide-save-${sw.weekStart}`);
    expect(save).toBeDisabled();
    expect(save).toHaveAccessibleDescription('Choose one of the options above before saving.');
    fireEvent.click(within(week).getByTestId(`rs-decide-choose-accept-${sw.weekStart}`));
    expect(save).toBeDisabled();
    expect(save).toHaveAccessibleDescription('Add a note to accept the overflow.');
    expect(within(week).getByTestId(`rs-decide-note-${sw.weekStart}`)).toHaveAccessibleDescription(
      'Required to accept the overflow.'
    );
  });

  it('Supplier responses: the confirm waits for a note, and for a quantity when moving demand', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    const what = `PT Sample Packaging Indonesia PK-PETB-8802 Week of ${formatDate(W[3])}`;
    fireEvent.click(await screen.findByRole('button', { name: `Move demand for ${what}` }, LOAD));
    const panel = within(
      /** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]'))
    );
    const confirm = panel.getByTestId('fc-action-submit');
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAccessibleDescription(
      'Enter a quantity for at least one supplier. Required. The supplier can read it.'
    );
    fireEvent.change(
      panel.getByLabelText('Quantity to move to Sample PET Bottle Manufacturer GmbH'),
      { target: { value: '8500' } }
    );
    expect(confirm).toHaveAccessibleDescription('Required. The supplier can read it.');
  });

  it('Forecast quality · bias tab: Record override waits for a valid quantity', async () => {
    renderWithProviders(<BuyerDemandForecast />, {
      identity: PLANNER,
      route: '/buyer/demand-forecast?tab=bias'
    });
    const value = await screen.findByTestId('fb-form-value', {}, LOAD);
    fireEvent.change(value, { target: { value: '' } });
    const submit = screen.getByTestId('fb-form-submit');
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleDescription(
      'Enter the new forecast as a whole number of zero or more to save.'
    );
  });

  it('Feedstock reconcile: Save waits for a valid max stock', async () => {
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: PLANNER,
      route: '/buyer/fs-reconcile'
    });
    fireEvent.click(await screen.findByTestId('fsr-max-edit-sup-007|PK-PETB-8801', {}, LOAD));
    fireEvent.change(screen.getByTestId('fsr-max-input'), { target: { value: '' } });
    const save = screen.getByTestId('fsr-max-save');
    expect(save).toBeDisabled();
    expect(save).toHaveAccessibleDescription(
      'Enter a whole number above zero, or clear the value.'
    );
    fireEvent.change(screen.getByTestId('fsr-max-input'), { target: { value: '0' } });
    expect(save).toHaveAccessibleDescription(
      'Enter a whole number above zero, or clear the value.'
    );
    expect(screen.getByTestId('fsr-max-input')).toHaveAccessibleDescription(
      'Enter a whole number above zero, or clear the value.'
    );
  });
});

// jsdom lays nothing out, so this asserts the markup that keeps a page inside a
// 390 px screen (measured in the browser for the PR): every table scrolls in
// its own area, no element outside one is given a width over the screen, and a
// closed term tip is display:none and capped to the screen when open.
describe('at 390 px, no page scrolls sideways (WCAG 1.4.10)', () => {
  const SCREEN = 390;
  /** @type {Record<string, number>} */
  const PX = { 'w-96': 384, 'w-[28rem]': 448, 'w-[32rem]': 512 };
  /**
   * The width a utility class fixes, in px, when it fixes one.
   * @param {string} cls
   * @returns {number | null}
   */
  const fixedWidth = (cls) => {
    if (PX[cls] !== undefined) return PX[cls];
    const m = /^(?:min-)?w-\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(cls);
    if (!m) return null;
    return Number(m[1]) * (m[2] === 'rem' ? 16 : 1);
  };
  /**
   * @param {Element} el
   * @returns {boolean}
   */
  const inScrollArea = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement)
      if (/(^| )overflow-(x-)?auto( |$)/.test(p.className)) return true;
    return false;
  };
  /** @param {HTMLElement} main */
  const check = (main) => {
    for (const table of main.querySelectorAll('table:not(.sr-only)'))
      expect(inScrollArea(table)).toBe(true);
    const wide = [...main.querySelectorAll('*')].filter((el) => {
      if (inScrollArea(el)) return false;
      // The page gutter is 16 px a side at 390 px.
      return String(el.className)
        .split(/\s+/)
        .some((c) => (fixedWidth(c) ?? 0) > SCREEN - 32);
    });
    expect(wide.map((el) => el.className)).toEqual([]);
    for (const tip of main.querySelectorAll('[role="tooltip"]')) {
      expect(tip.className).toMatch(/(^| )hidden( |$)/);
      expect(tip.className).not.toMatch(/(^| )invisible( |$)/);
      expect(tip.className).toContain('max-w-[calc(100vw-2rem)]');
    }
  };
  const original = window.innerWidth;
  afterEach(() => {
    window.innerWidth = original;
  });

  it('Publish to suppliers, which scrolled sideways before C2', async () => {
    window.innerWidth = SCREEN;
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    await screen.findByTestId('stb-series', {}, LOAD);
    const main = /** @type {HTMLElement} */ (document.querySelector('main'));
    expect(main.querySelectorAll('[role="tooltip"]').length).toBeGreaterThan(0);
    check(main);
  });

  it('Supplier reliability, which scrolled sideways before C2', async () => {
    window.innerWidth = SCREEN;
    renderWithProviders(<BuyerReliability />, { identity: PLANNER, route: '/buyer/reliability' });
    await screen.findByTestId('rel-scale-hint', {}, LOAD);
    check(/** @type {HTMLElement} */ (document.querySelector('main')));
  });
});
