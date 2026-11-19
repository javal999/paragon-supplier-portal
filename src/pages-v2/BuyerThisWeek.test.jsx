/** @import React from 'react' */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { screen, within, fireEvent, cleanup } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { formatDate } from '@lib/format';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { isoWeek } from '@services/engine/dates';
import { isLive } from '@services/liveness';
import { maxStockStore } from '@services/transitions/maxStock';
import { setHubRole } from '@components/layout-v2/hubRole';
/** @import { CycleStepId } from '@components/forecast/cycleCounts' */
import { CYCLE_STEPS } from '@components/forecast/cycleCounts';
import { FORECAST_PAGES } from '@components/forecast/forecastPages';
/** @import { QueryScope } from '@services/data/types' */
import BuyerThisWeek from './BuyerThisWeek';
import BuyerOrderPlan from './BuyerOrderPlan';
import BuyerReschedule from './BuyerReschedule';
import BuyerStabilise from './BuyerStabilise';
import BuyerCommitments from './BuyerCommitments';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';
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
/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const SLOW = { timeout: 20000 };

/** @type {Record<Exclude<CycleStepId, 'thisWeek'>, React.FC>} */
const WEEKLY = {
  whatToOrder: BuyerOrderPlan,
  makeRoom: BuyerReschedule,
  publish: BuyerStabilise,
  responses: BuyerCommitments,
  // FSR-D3 (BL-251) — step 6.
  demandAnticipation: BuyerDemandAnticipation
};

/**
 * The number in a "<n> things" figure.
 * @param {HTMLElement} el
 */
const leadingNumber = (el) =>
  Number(/** @type {RegExpExecArray} */ (/^(\d+)/.exec(el.textContent ?? ''))[1]);

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
    for (const id of /** @type {const} */ (['whatToOrder', 'makeRoom', 'publish', 'responses'])) {
      const card = screen.getByTestId(`tw-card-${id}`);
      expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent(
        i18n.t(FORECAST_PAGES[id].titleKey)
      );
      expect(screen.getByTestId(`tw-link-${id}`)).toHaveAttribute('href', FORECAST_PAGES[id].path);
    }
  });

  it('the input check is the Data health verdict, counted over every failing check in the report', async () => {
    const report = /** @type {import('@services/data/types').DataHealthView} */ (
      await mockDataService.procurement.getDataHealth(buyerScope)
    );
    const failing = report.feeds.flatMap((f) => f.checks).filter((c) => !c.passed).length;
    await renderThisWeek();
    expect(screen.getByTestId('tw-input-verdict')).toHaveTextContent(
      failing === 0 ? 'All checks pass' : `${failing} check`
    );
  });

  it('What to order: equals the page’s Recommended orders KPI over both warehouses, with the earliest release week its table lists', async () => {
    await renderThisWeek();
    const shown = leadingNumber(screen.getByTestId('tw-count-whatToOrder'));
    const firstRelease = screen.getByTestId('tw-first-release').textContent;
    cleanup();

    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    let kpi = 0;
    /** @type {string[]} */
    const releases = [];
    for (const name of ['Packaging warehouse', 'Raw material warehouse']) {
      fireEvent.click(await screen.findByRole('radio', { name }, SLOW));
      kpi += Number((await screen.findByTestId('op-kpi-orders', {}, SLOW)).textContent);
      for (const row of screen.queryAllByTestId(/^op-rec-/))
        releases.push(row.querySelectorAll('td')[3].textContent ?? '');
    }
    // The row reader reads the "Release in" column, and has rows to read.
    expect(releases.length).toBeGreaterThan(0);
    expect(releases.every((r) => /^W\d+/.test(r))).toBe(true);
    expect(kpi).toBeGreaterThan(0);
    expect(shown).toBe(kpi);

    const run = /** @type {import('@services/data/types').OrderPlanView} */ (
      await mockDataService.procurement.getOrderPlan(buyerScope)
    );
    const earliest = run.warehouses
      .flatMap((w) => w.materials.flatMap((m) => m.recommendations.map((r) => r.releaseWeek)))
      .sort()[0];
    const label = `W${isoWeek(earliest)}`;
    expect(
      releases.some((r) => /** @type {RegExpExecArray} */ (/^W\d+/.exec(r))[0] === label)
    ).toBe(true);
    expect(firstRelease).toBe(`First release ${label} · ${formatDate(earliest)}`);
  });

  it('Make warehouse room: equals the weeks the fill table marks over capacity, both warehouses', async () => {
    await renderThisWeek();
    const shown = leadingNumber(screen.getByTestId('tw-count-makeRoom'));
    cleanup();

    // P-12 — the fill table is the "Warehouse fill" tab.
    renderWithProviders(<BuyerReschedule />, {
      identity: PLANNER,
      route: '/buyer/reschedule?tab=fill'
    });
    let over = 0;
    for (const name of ['Packaging warehouse', 'Raw material warehouse']) {
      fireEvent.click(await screen.findByRole('radio', { name }, SLOW));
      // CAP-1 wave 2 — the status is a row of the week-as-column grid, so each
      // status cell is one week's state.
      over += screen
        .getAllByTestId(/^rs-fill-status-/)
        .filter((cell) =>
          /Over capacity|Cannot be relieved by open orders/.test(cell.textContent ?? '')
        ).length;
    }
    expect(over).toBeGreaterThan(0);
    expect(shown).toBe(over);
  });

  it('Publish to suppliers: the last published version per stream reads as on the publish page, and says publishing is withheld', async () => {
    expect(isLive('engineDataset')).toBe(false);
    await renderThisWeek();
    const mine = /** @type {const} */ (['packaging', 'rawMaterial']).map(
      (s) => screen.getByTestId(`tw-published-${s}`).textContent
    );
    expect(screen.getByTestId('tw-publish-state')).toHaveTextContent(
      'Publishing is withheld until real data arrives.'
    );
    cleanup();

    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    for (const [i, s] of /** @type {const} */ (['packaging', 'rawMaterial']).entries()) {
      expect((await screen.findByTestId(`stb-last-published-${s}`, {}, SLOW)).textContent).toBe(
        mine[i]
      );
    }
    expect(screen.getByTestId('stb-publish-withheld')).toBeInTheDocument();
  });

  it('Supplier responses: equals the exceptions the responses page lists, both streams', async () => {
    await renderThisWeek();
    const shown = leadingNumber(screen.getByTestId('tw-count-responses'));
    // C-06 (BL-239): the figure says it covers both streams, as the page lists one at a time.
    expect(screen.getByTestId('tw-count-responses')).toHaveTextContent(
      /open exceptions? \(packaging and raw material\)/
    );
    expect(
      within(screen.getByTestId('cycle-steps')).getByTestId('cycle-step-responses-figure')
    ).toHaveTextContent(/\(packaging and raw material\)/);
    cleanup();

    renderWithProviders(<BuyerCommitments />, { identity: PLANNER, route: '/buyer/collaboration' });
    let listed = 0;
    for (const name of ['Packaging', 'Raw material']) {
      fireEvent.click(await screen.findByRole('tab', { name }, SLOW));
      const heading = within(screen.getByTestId('fc-exceptions')).getByRole('heading', {
        level: 2
      });
      listed += Number(
        /** @type {RegExpExecArray} */ (/\((\d+)\)/.exec(heading.textContent ?? ''))[1]
      );
    }
    expect(shown).toBe(listed);
  });

  it("names its planning week beside Data as of, with the DA page's week and dates (U-12, BL-255)", async () => {
    await renderThisWeek();
    const line = screen.getByTestId('tw-planning-week');
    expect(line).toHaveTextContent('Planning week W36 · 31 Aug 2026 – 06 Sept 2026');
    expect(within(screen.getByTestId('data-as-of')).getByTestId('tw-planning-week')).toBe(line);
    cleanup();

    renderWithProviders(<BuyerDemandAnticipation />, {
      identity: PLANNER,
      route: '/buyer/demand-anticipation'
    });
    expect(await screen.findByTestId('dant-planning-week', {}, SLOW)).toHaveTextContent(
      'W36 (31 Aug 2026 – 06 Sept 2026)'
    );
  });

  it('states the failing input check once, in the input check card, and no step card repeats it', async () => {
    await renderThisWeek();
    // The fixture really carries a failing check, so the count does show on the page.
    expect(screen.getByTestId('tw-input-check')).toHaveTextContent(/1 check failing/);
    for (const id of ['whatToOrder', 'makeRoom', 'publish', 'responses']) {
      expect(screen.getByTestId(`tw-card-${id}`)).not.toHaveTextContent(/input checks? failing/);
    }
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    await renderThisWeek();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Minggu ini');
    expect(screen.getByTestId('tw-input-check')).toHaveTextContent('Cek masukan');
    expect(screen.getByTestId('tw-publish-state')).toHaveTextContent(
      'Penerbitan ditahan sampai data nyata masuk.'
    );
    expect(screen.getByTestId('tw-count-responses')).toHaveTextContent(
      /pengecualian terbuka \(kemasan dan bahan baku\)/
    );
    expect(screen.getByTestId('tw-planning-week')).toHaveTextContent(/^Minggu perencanaan W36 · /);
  });
});

describe('the cycle step bar (F-03, F-05)', () => {
  it.each(/** @type {(keyof typeof WEEKLY)[]} */ (Object.keys(WEEKLY)))(
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
      expect(within(bar).getAllByRole('link')).toHaveLength(CYCLE_STEPS.length);
      expect(within(bar).getByTestId('cycle-step-publish')).toHaveAttribute('data-blocked', 'true');
      expect(
        await within(bar).findByTestId('cycle-step-publish-figure', {}, SLOW)
      ).toHaveTextContent('Blocked');
      // Only Publish can be blocked (FUX2-R3); the others show a number.
      for (const id of /** @type {const} */ ([
        'whatToOrder',
        'makeRoom',
        'responses',
        'demandAnticipation'
      ])) {
        expect(within(bar).getByTestId(`cycle-step-${id}`)).toHaveAttribute(
          'data-blocked',
          'false'
        );
      }
    }
  );

  it('states the failing input check once, on This week, not under every step', async () => {
    await renderThisWeek();
    const bar = screen.getByTestId('cycle-steps');
    // The fixture really carries a failing check, so this proves the count shows somewhere.
    expect(screen.getByTestId('tw-input-check')).toHaveTextContent(/1 check failing/);
    expect(
      await within(bar).findByTestId('cycle-step-thisWeek-checks', {}, SLOW)
    ).toHaveTextContent(/input check failing/);
    for (const id of CYCLE_STEPS.filter((s) => s !== 'thisWeek')) {
      expect(within(bar).queryByTestId(`cycle-step-${id}-checks`)).toBeNull();
    }
  });

  it('shows the same figures as the This week cards', async () => {
    await renderThisWeek();
    const bar = screen.getByTestId('cycle-steps');
    expect(within(bar).getByTestId('cycle-step-whatToOrder-figure')).toHaveTextContent(
      /** @type {NonNullable<(ReturnType<typeof screen.getByTestId>)['textContent']>} */ (
        screen.getByTestId('tw-count-whatToOrder').textContent
      )
    );
    expect(within(bar).getByTestId('cycle-step-makeRoom-figure')).toHaveTextContent(
      /** @type {NonNullable<(ReturnType<typeof screen.getByTestId>)['textContent']>} */ (
        screen.getByTestId('tw-count-makeRoom').textContent
      )
    );
    expect(within(bar).getByTestId('cycle-step-responses-figure')).toHaveTextContent(
      /** @type {NonNullable<(ReturnType<typeof screen.getByTestId>)['textContent']>} */ (
        screen.getByTestId('tw-count-responses').textContent
      )
    );
  });
});

describe('My tasks leads the planner into This week (F-03)', () => {
  /** The element right after the page header: the first thing under it. */
  const firstUnderHeader = () => {
    // The page header and the task list are siblings in the page's content column.
    const column = screen.getByTestId('home-tasks').parentElement;
    let header = /** @type {HTMLElement} */ (screen.getByRole('heading', { level: 1 }));
    while (header.parentElement !== column)
      header = /** @type {HTMLElement} */ (header.parentElement);
    return header.nextElementSibling;
  };

  const renderHome = async () => {
    renderWithProviders(
      <Routes>
        <Route path="/buyer/home" element={<BuyerHome />} />
        <Route path="/buyer/this-week" element={<p data-testid="landed-this-week" />} />
      </Routes>,
      { identity: PLANNER, route: '/buyer/home' }
    );
    await screen.findByTestId('home-tasks', {}, SLOW);
  };

  it.each(/** @type {const} */ (['MP', 'ALL']))(
    'for %s the weekly plan card is the first element under the header, and the text link is gone',
    async (role) => {
      setHubRole(role);
      await renderHome();
      const card = await screen.findByTestId('home-weekly-plan');
      expect(firstUnderHeader()).toBe(card);
      expect(card.compareDocumentPosition(screen.getByTestId('home-tasks'))).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
      expect(card).toHaveClass('h-16');
      expect(within(card).getByRole('heading', { level: 2 })).toHaveTextContent(
        `Weekly plan, step 1 of ${CYCLE_STEPS.length}: This week`
      );
      expect(screen.queryByTestId('home-this-week')).toBeNull();
      expect(screen.queryByText('Start the weekly plan: This week')).toBeNull();
    }
  );

  it('the card names the failing input checks This week counts', async () => {
    const report = /** @type {import('@services/data/types').DataHealthView} */ (
      await mockDataService.procurement.getDataHealth(buyerScope)
    );
    const failing = report.feeds.flatMap((f) => f.checks).filter((c) => !c.passed).length;
    setHubRole('MP');
    await renderHome();
    expect(
      await screen.findByText(
        failing === 0
          ? 'Input check: all checks pass'
          : `Input check: ${failing} ${failing === 1 ? 'check' : 'checks'} failing`,
        {},
        SLOW
      )
    ).toHaveAttribute('data-testid', 'home-weekly-plan-status');
  });

  it('"Open This week" is an outline button that opens This week', async () => {
    setHubRole('MP');
    await renderHome();
    const open = await screen.findByRole('button', { name: 'Open This week' });
    expect(open).toHaveClass('border-action');
    fireEvent.click(open);
    expect(await screen.findByTestId('landed-this-week')).toBeInTheDocument();
    expect(FORECAST_PAGES.thisWeek.path).toBe('/buyer/this-week');
  });

  it('BUY and FIN keep the view they had: neither the card nor the link', async () => {
    for (const role of /** @type {const} */ (['BUY', 'FIN'])) {
      cleanup();
      setHubRole(role);
      await renderHome();
      expect(screen.queryByTestId('home-this-week')).toBeNull();
      expect(screen.queryByTestId('home-weekly-plan')).toBeNull();
      expect(firstUnderHeader()).toHaveTextContent('Sample data');
    }
  });
});

describe('Procurement on the feedstock reconcile (FUX-D6, F-15; DRC-15a)', () => {
  const K8801 = 'sup-007|PK-PETB-8801';

  it('the page names Performance as its section for a BUY viewer', async () => {
    setHubRole('BUY');
    renderWithProviders(<BuyerFixedStockReconcile />, {
      identity: PLANNER,
      route: '/buyer/fs-reconcile'
    });
    await screen.findByTestId(`fsr-row-${K8801}`);
    expect(
      /** @type {HTMLElement} */ (screen.getByRole('heading', { level: 1 }).parentElement)
        .previousElementSibling
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
