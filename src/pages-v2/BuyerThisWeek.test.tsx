import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, cleanup } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { isoWeek } from '@services/engine/dates';
import { isLive } from '@services/liveness';
import { maxStockStore } from '@services/transitions/maxStock';
import { setHubRole } from '@components/layout-v2/hubRole';
import { CYCLE_STEPS, type CycleStepId } from '@components/forecast/cycleCounts';
import { FORECAST_PAGES } from '@components/forecast/forecastPages';
import type { QueryScope } from '@services/data/types';
import BuyerThisWeek from './BuyerThisWeek';
import BuyerOrderPlan from './BuyerOrderPlan';
import BuyerReschedule from './BuyerReschedule';
import BuyerStabilise from './BuyerStabilise';
import BuyerCommitments from './BuyerCommitments';
import BuyerHome from './BuyerHome';
import { BuyerFixedStockReconcile } from './FixedStockReconcile';

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST UX PHASE 2 · TASK B1 — "This week" and the cycle step bar (F-02,
// F-03, F-05, F-15, FUX-D6).
//
// Each number on This week is compared with what its own page RENDERS for the
// same data — read off the page's table, never recomputed by the rule under
// test — so a drift between the start page and the page it links to is red.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const buyerScope: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const SLOW = { timeout: 20000 };

const WEEKLY: Record<Exclude<CycleStepId, 'thisWeek'>, React.FC> = {
  whatToOrder: BuyerOrderPlan,
  makeRoom: BuyerReschedule,
  publish: BuyerStabilise,
  responses: BuyerCommitments
};

/** The number in a "<n> things" figure. */
const leadingNumber = (el: HTMLElement) => Number(/^(\d+)/.exec(el.textContent ?? '')![1]);

const renderThisWeek = async () => {
  renderWithProviders(<BuyerThisWeek />, { identity: PLANNER, route: '/buyer/this-week' });
  await screen.findByTestId('tw-count-whatToOrder', {}, SLOW);
  await screen.findByTestId('tw-count-makeRoom', {}, SLOW);
  await screen.findByTestId('tw-count-responses', {}, SLOW);
  await screen.findByTestId('tw-published-packaging', {}, SLOW);
  await screen.findByTestId('tw-input-verdict', {}, SLOW);
};

beforeEach(() => {
  maxStockStore.reset();
});

afterEach(() => {
  setHubRole('ALL');
  void i18n.changeLanguage('en');
});

describe('This week — the page (F-03)', () => {
  it('renders its title, purpose header, banner, date line, step bar, input check and 4 step cards in cycle order, each linking to its page', async () => {
    await renderThisWeek();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This week');
    expect(screen.getByTestId('purpose-header')).toHaveAttribute('data-page', 'thisWeek');
    expect(screen.getByTestId('purpose-decision')).toHaveTextContent(
      'What to work on first this week.'
    );
    expect(screen.getByTestId('purpose-uses')).toHaveAttribute('href', '/buyer/data-health');
    expect(screen.getByTestId('purpose-next')).toHaveAttribute('href', '/buyer/order-plan');
    expect(screen.getByTestId('simulated-data-banner')).toBeInTheDocument();
    expect(screen.getByTestId('data-as-of')).toHaveTextContent('Data as of');
    expect(screen.getByTestId('cycle-steps')).toHaveAttribute('data-current', 'thisWeek');

    expect(screen.getByTestId('tw-input-check')).toHaveTextContent('Input check');
    expect(screen.getByTestId('tw-input-link')).toHaveAttribute('href', '/buyer/data-health');

    const cards = screen.getAllByTestId(/^tw-card-/).map((c) => c.getAttribute('data-testid'));
    expect(cards).toEqual([
      'tw-card-whatToOrder',
      'tw-card-makeRoom',
      'tw-card-publish',
      'tw-card-responses'
    ]);
    for (const id of ['whatToOrder', 'makeRoom', 'publish', 'responses'] as const) {
      const card = screen.getByTestId(`tw-card-${id}`);
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
        i18n.t(FORECAST_PAGES[id].titleKey)
      );
      expect(screen.getByTestId(`tw-link-${id}`)).toHaveAttribute('href', FORECAST_PAGES[id].path);
    }
  });

  it('the input check is the Data health verdict, counted over every failing check in the report', async () => {
    const report = (await mockDataService.procurement.getDataHealth(buyerScope))!;
    const failing = report.feeds.flatMap((f) => f.checks).filter((c) => !c.passed).length;
    await renderThisWeek();
    expect(screen.getByTestId('tw-input-verdict')).toHaveTextContent(
      failing === 0 ? 'All checks pass' : `${failing} check`
    );
  });

  it('What to order: equals the materials the order plan lists with a release this week or late to release, both warehouses', async () => {
    await renderThisWeek();
    const shown = leadingNumber(screen.getByTestId('tw-count-whatToOrder'));
    cleanup();

    const run = (await mockDataService.procurement.getOrderPlan(buyerScope))!;
    const thisWeek = `W${isoWeek(run.weeks[0])}`;
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const rows: { code: string; release: string }[] = [];
    for (const name of ['Packaging warehouse', 'Raw material warehouse']) {
      fireEvent.click(await screen.findByRole('radio', { name }, SLOW));
      for (const row of screen.queryAllByTestId(/^op-rec-/)) {
        rows.push({
          code: row
            .getAttribute('data-testid')!
            .replace(/^op-rec-/, '')
            .replace(/-\d{4}-\d{2}-\d{2}$/, ''),
          release: row.querySelectorAll('td')[3].textContent ?? ''
        });
      }
    }
    const due = (label: string) =>
      new Set(
        rows
          .filter(
            (r) => /^W\d+/.exec(r.release)![0] === label || r.release.includes('Late to release')
          )
          .map((r) => r.code)
      ).size;
    // The instrument reads the "Release in" column, and can fire: counted by the
    // first listed release week instead, it finds that row's material.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => /^W\d+/.test(r.release))).toBe(true);
    expect(due(/^W\d+/.exec(rows[0].release)![0])).toBeGreaterThan(0);
    // The sample run starts in a week no recommendation releases in, so the
    // figure is 0 on both pages — the same 0.
    expect(shown).toBe(due(thisWeek));
  });

  it('Make warehouse room: equals the weeks the fill table marks over capacity, both warehouses', async () => {
    await renderThisWeek();
    const shown = leadingNumber(screen.getByTestId('tw-count-makeRoom'));
    cleanup();

    renderWithProviders(<BuyerReschedule />, { identity: PLANNER, route: '/buyer/reschedule' });
    let over = 0;
    for (const name of ['Packaging warehouse', 'Raw material warehouse']) {
      fireEvent.click(await screen.findByRole('radio', { name }, SLOW));
      over += screen
        .getAllByTestId(/^rs-week-/)
        .filter((row) =>
          /Over capacity|Cannot be relieved by open orders/.test(
            row.querySelectorAll('td')[5].textContent ?? ''
          )
        ).length;
    }
    expect(over).toBeGreaterThan(0);
    expect(shown).toBe(over);
  });

  it('Publish to suppliers: the last published version per stream reads as on the publish page, and says publishing is withheld', async () => {
    expect(isLive('engineDataset')).toBe(false);
    await renderThisWeek();
    const mine = (['packaging', 'rawMaterial'] as const).map(
      (s) => screen.getByTestId(`tw-published-${s}`).textContent
    );
    expect(screen.getByTestId('tw-publish-state')).toHaveTextContent(
      'Publishing is withheld until real data arrives.'
    );
    cleanup();

    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    for (const [i, s] of (['packaging', 'rawMaterial'] as const).entries()) {
      expect((await screen.findByTestId(`stb-last-published-${s}`, {}, SLOW)).textContent).toBe(
        mine[i]
      );
    }
    expect(screen.getByTestId('stb-publish-withheld')).toBeInTheDocument();
  });

  it('Supplier responses: equals the exceptions the responses page lists, both streams', async () => {
    await renderThisWeek();
    const shown = leadingNumber(screen.getByTestId('tw-count-responses'));
    cleanup();

    renderWithProviders(<BuyerCommitments />, { identity: PLANNER, route: '/buyer/collaboration' });
    let listed = 0;
    for (const name of ['Packaging', 'Raw material']) {
      fireEvent.click(await screen.findByRole('tab', { name }, SLOW));
      const heading = within(screen.getByTestId('fc-exceptions')).getByRole('heading', {
        level: 2
      });
      listed += Number(/\((\d+)\)/.exec(heading.textContent ?? '')![1]);
    }
    expect(shown).toBe(listed);
  });

  it('a step card shows the failing checks its page’s Data health chip shows', async () => {
    await renderThisWeek();
    const num = (text: string | null | undefined) => (text ? Number(/(\d+)/.exec(text)![1]) : null);
    const card = num(screen.queryByTestId('tw-checks-whatToOrder')?.textContent);
    cleanup();
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    const chip = await screen.findByTestId('data-health-chip', {}, SLOW);
    expect(card).toBe(num(within(chip).queryByTestId('data-health-chip-failing')?.textContent));
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    await renderThisWeek();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Minggu ini');
    expect(screen.getByTestId('tw-input-check')).toHaveTextContent('Cek masukan');
    expect(screen.getByTestId('tw-publish-state')).toHaveTextContent(
      'Penerbitan ditahan sampai data nyata masuk.'
    );
  });
});

describe('the cycle step bar (F-03, F-05)', () => {
  it.each(Object.keys(WEEKLY) as (keyof typeof WEEKLY)[])(
    'on %s: marks that page only, links every step, and shows Publish blocked while withheld',
    async (page) => {
      const Page = WEEKLY[page];
      renderWithProviders(<Page />, { identity: PLANNER, route: FORECAST_PAGES[page].path });
      const bar = await screen.findByTestId('cycle-steps', {}, SLOW);
      expect(bar).toHaveAttribute('data-current', page);
      for (const id of CYCLE_STEPS) {
        const step = within(bar).getByTestId(`cycle-step-${id}`);
        expect(step).toHaveAttribute('href', FORECAST_PAGES[id].path);
        expect(step).toHaveTextContent(i18n.t(FORECAST_PAGES[id].titleKey));
        if (id === page) expect(step).toHaveAttribute('aria-current', 'step');
        else expect(step).not.toHaveAttribute('aria-current');
      }
      expect(within(bar).getAllByRole('link')).toHaveLength(5);
      expect(within(bar).getByTestId('cycle-step-publish')).toHaveAttribute('data-blocked', 'true');
      expect(
        await within(bar).findByTestId('cycle-step-publish-figure', {}, SLOW)
      ).toHaveTextContent('Blocked');
      // Only Publish can be blocked (FUX2-R3); the others show a number.
      for (const id of ['whatToOrder', 'makeRoom', 'responses'] as const) {
        expect(within(bar).getByTestId(`cycle-step-${id}`)).toHaveAttribute(
          'data-blocked',
          'false'
        );
      }
    }
  );

  it('shows the same figures as the This week cards', async () => {
    await renderThisWeek();
    const bar = screen.getByTestId('cycle-steps');
    expect(within(bar).getByTestId('cycle-step-whatToOrder-figure')).toHaveTextContent(
      screen.getByTestId('tw-count-whatToOrder').textContent!
    );
    expect(within(bar).getByTestId('cycle-step-makeRoom-figure')).toHaveTextContent(
      screen.getByTestId('tw-count-makeRoom').textContent!
    );
    expect(within(bar).getByTestId('cycle-step-responses-figure')).toHaveTextContent(
      screen.getByTestId('tw-count-responses').textContent!
    );
  });
});

describe('My tasks links to This week for the planner (F-03)', () => {
  it('shows the link for MP and not for FIN', async () => {
    setHubRole('MP');
    renderWithProviders(<BuyerHome />, { identity: PLANNER, route: '/buyer/home' });
    expect(await screen.findByTestId('home-this-week')).toHaveAttribute('href', '/buyer/this-week');
    cleanup();
    setHubRole('FIN');
    renderWithProviders(<BuyerHome />, { identity: PLANNER, route: '/buyer/home' });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByTestId('home-this-week')).toBeNull();
  });
});

describe('Procurement on the end-of-cycle stock check (FUX-D6, F-15)', () => {
  const K8801 = 'packaging|2026-08-31|sup-007|PK-PETB-8801';

  it('the page names Performance as its section for a BUY viewer', async () => {
    setHubRole('BUY');
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: PLANNER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(
      screen.getByRole('heading', { level: 1 }).parentElement!.previousElementSibling
    ).toHaveTextContent(/^Performance · /);
  });

  it('a seat without maxstock:set sees the handoff notice instead of the Set max stock control', async () => {
    setHubRole('BUY');
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: { ...BUYER, businessRoles: ['planning'] },
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(screen.queryByTestId(`fsr-max-edit-${K8801}`)).toBeNull();
    expect(screen.getByTestId(`handoff-maxstock-${K8801}`)).toHaveAttribute(
      'data-handoff',
      'withheld'
    );
  });

  it('a procurement seat holding maxstock:set gets the control', async () => {
    setHubRole('BUY');
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: '/buyer/fs-reconcile'
    });
    expect(await screen.findByTestId(`fsr-max-edit-${K8801}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`handoff-maxstock-${K8801}`)).toBeNull();
  });
});
