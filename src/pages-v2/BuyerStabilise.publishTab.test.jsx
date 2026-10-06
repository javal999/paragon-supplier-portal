/** @import React from 'react' */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { screen, within, fireEvent, cleanup } from '@testing-library/react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { SEEDED_SEAT_ROLES, PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { UTILITY_NAV, navFor } from '@components/layout-v2/navConfig';
/** @import { ForecastPageId } from '@components/forecast/forecastPages' */
import { FORECAST_PAGES, linkTarget } from '@components/forecast/forecastPages';
/** @import { QueryScope } from '@services/data/types' */
import BuyerStabilise from './BuyerStabilise';

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST UX PHASE 2 · TASK B2 — Published versions as a tab of Publish to
// suppliers, and the checklist before the publish act (F-01, F-13, FUX2-R1).
//
// The redirect target is read from the router's source, never restated, and the
// checklist's figures are compared with what the SAME page renders elsewhere
// (its Data health chip, its cycle step bar, its rule counts) — so the checklist
// cannot drift from the numbers beside it.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const SLOW = { timeout: 20000 };
// The page computes the engine's plan; several mounts per spec need more than the default 5 s on a busy machine.
vi.setConfig({ testTimeout: 60000 });

const ROUTER_SRC = readFileSync(join(__dirname, '..', 'router', 'AppRouter.tsx'), 'utf8');
const CHUNKS = ROUTER_SRC.split('<Route')
  .slice(1)
  .map((c) => c.split('<Route')[0]);
/** path → Navigate target, for every plain redirect the router declares. */
const NAVIGATES = new Map(
  CHUNKS.map(
    (c) =>
      /** @type {const} */ ([
        /path="([^"]+)"/.exec(c)?.[1],
        /<Navigate\s+to="([^"]+)"/.exec(c)?.[1]
      ])
  ).filter(/** @returns {e is readonly [string, string]} */ (e) => !!e[0] && !!e[1])
);
/** The routes that paint a page (not a redirect). */
const PAGE_ROUTES = new Set(
  CHUNKS.filter((c) => !/<(Navigate|LegacyRedirect)\b/.test(c))
    .map((c) => /path="([^"]+)"/.exec(c)?.[1])
    .filter(/** @returns {p is string} */ (p) => !!p)
);

/** @type {React.FC} */
const LocationProbe = () => {
  const loc = useLocation();
  return <output data-testid="location">{`${loc.pathname}${loc.search}`}</output>;
};

/** @param {string} route */
const renderAt = (route) =>
  renderWithProviders(
    <>
      <BuyerStabilise />
      <LocationProbe />
    </>,
    { identity: PLANNER, route }
  );

afterEach(() => {
  vi.restoreAllMocks();
  void i18n.changeLanguage('en');
});

describe('the router population (probed before it is trusted)', () => {
  it('reads redirects and pages from AppRouter', () => {
    expect(NAVIGATES.get('/')).toBe('/buyer/home');
    expect(PAGE_ROUTES.has('/buyer/stabilise')).toBe(true);
    expect(PAGE_ROUTES.has('/buyer/no-such-page')).toBe(false);
  });
});

describe('FUX2-R1 — /buyer/forecasts lands on Publish to suppliers, Published versions selected', () => {
  it('redirects to the tab and shows the versions', async () => {
    const target = NAVIGATES.get('/buyer/forecasts');
    expect(target).toBe('/buyer/stabilise?tab=versions');
    expect(PAGE_ROUTES.has('/buyer/forecasts')).toBe(false);
    renderWithProviders(
      <>
        <Routes>
          <Route
            path="/buyer/forecasts"
            element={<Navigate to={/** @type {NonNullable<typeof target>} */ (target)} replace />}
          />
          <Route path="/buyer/stabilise" element={<BuyerStabilise />} />
        </Routes>
        <LocationProbe />
      </>,
      { identity: PLANNER, route: '/buyer/forecasts' }
    );
    expect(await screen.findByTestId('fc-version-FC-PK-V1', {}, SLOW)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/stabilise?tab=versions');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Publish to suppliers' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /Published versions/, selected: true })
    ).toBeInTheDocument();
    // FUX2-R4 — the page keeps its purpose header and banner on the tab.
    expect(screen.getByTestId('purpose-header')).toHaveAttribute('data-page', 'publish');
    expect(screen.getByTestId('simulated-data-banner')).toBeInTheDocument();
    // The publish act and its checklist belong to the other tab.
    expect(screen.queryByTestId('stb-checklist')).toBeNull();
  });
});

describe('the tab is kept in the address', () => {
  it('selecting a tab writes ?tab=versions, and a reload at that address opens the same tab', async () => {
    renderAt('/buyer/stabilise');
    expect(await screen.findByTestId('stb-publish', {}, SLOW)).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Version to publish', selected: true })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Published versions/ }));
    expect(await screen.findByTestId('fc-pti-versions', {}, SLOW)).toBeInTheDocument();
    const address =
      /** @type {NonNullable<(ReturnType<typeof screen.getByTestId>)['textContent']>} */ (
        screen.getByTestId('location').textContent
      );
    expect(address).toBe('/buyer/stabilise?tab=versions');

    // "Reload": a fresh mount at the address the tab wrote.
    cleanup();
    renderAt(address);
    expect(await screen.findByTestId('fc-pti-versions', {}, SLOW)).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /Published versions/, selected: true })
    ).toBeInTheDocument();

    // And back: the default tab drops the parameter.
    fireEvent.click(screen.getByRole('tab', { name: 'Version to publish' }));
    expect(await screen.findByTestId('stb-publish', {}, SLOW)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/buyer\/stabilise$/);
  });

  it('an unknown tab value opens Version to publish', async () => {
    renderAt('/buyer/stabilise?tab=nonsense');
    expect(await screen.findByTestId('stb-publish', {}, SLOW)).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Version to publish', selected: true })
    ).toBeInTheDocument();
  });

  it('the "Published versions" link above the act opens the tab', async () => {
    renderAt('/buyer/stabilise');
    fireEvent.click(await screen.findByTestId('stb-versions-link', {}, SLOW));
    expect(await screen.findByTestId('fc-pti-versions', {}, SLOW)).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/buyer/stabilise?tab=versions');
  });
});

describe('the publish checklist (F-01, evaluation §5)', () => {
  /** @param {string | null | undefined} text */
  const num = (text) => Number((text ?? '').match(/\d+/)?.[0] ?? NaN);

  it('shows 4 items above the refused publish act, each with its state and a link to the page that resolves it', async () => {
    renderAt('/buyer/stabilise');
    const list = await screen.findByTestId('stb-checklist', {}, SLOW);
    // The figures the checklist shows are read once their data has arrived.
    await screen.findByTestId('stb-run-engine', {}, SLOW);
    await within(list).findByText(/recommended order/, {}, SLOW);
    await within(list).findByText(/over capacity/, {}, SLOW);

    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('data-testid'))
    ).toEqual(['stb-check-inputs', 'stb-check-orders', 'stb-check-warehouse', 'stb-check-held']);
    /** @type {Record<string, string>} */
    const links = {
      inputs: FORECAST_PAGES.dataHealth.path,
      orders: FORECAST_PAGES.whatToOrder.path,
      warehouse: FORECAST_PAGES.makeRoom.path,
      held: FORECAST_PAGES.publish.path
    };
    for (const [id, href] of Object.entries(links)) {
      expect(screen.getByTestId(`stb-check-${id}-link`)).toHaveAttribute('href', href);
      expect(screen.getByTestId(`stb-check-${id}`)).not.toHaveAttribute('data-state', 'unknown');
    }
    expect(screen.getByTestId('stb-check-orders-link')).toHaveTextContent('What to order');
    expect(screen.getByTestId('stb-check-warehouse-link')).toHaveTextContent('Make warehouse room');

    // Orders carry a number, never a "reviewed" status (FUX2-R3); it is the step bar's number.
    expect(screen.getByTestId('stb-check-orders')).toHaveAttribute('data-state', 'count');
    expect(num(screen.getByTestId('stb-check-orders-state').textContent)).toBe(
      num(screen.getByTestId('cycle-step-whatToOrder-figure').textContent)
    );
    // Warehouse weeks: the step bar's number, a warning while any remain.
    const over = num(screen.getByTestId('cycle-step-makeRoom-figure').textContent);
    expect(num(screen.getByTestId('stb-check-warehouse-state').textContent)).toBe(over);
    expect(screen.getByTestId('stb-check-warehouse')).toHaveAttribute(
      'data-state',
      over > 0 ? 'attention' : 'pass'
    );
    // Held weeks without a reason: the page's own rule counts for the engine plan.
    const held =
      num(screen.getByTestId('stb-count-bandHeld').textContent) +
      num(screen.getByTestId('stb-count-cumulativeHeld').textContent);
    expect(held).toBeGreaterThan(0);
    expect(screen.getByTestId('stb-check-held-state')).toHaveTextContent(`${held} held week`);
    expect(screen.getByTestId('stb-check-held')).toHaveAttribute('data-state', 'attention');

    // Above the act, and the act is still refused exactly as phase 1 left it.
    const withheld = screen.getByTestId('stb-publish-withheld');
    expect(list.compareDocumentPosition(withheld) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(withheld).toHaveTextContent('Nothing can be published until real data arrives');
    expect(screen.queryByTestId('stb-publish-packaging')).toBeNull();
  });

  it('a failing Data health check shows on it, with the count the page’s Data health chip shows', async () => {
    renderAt('/buyer/stabilise');
    const item = await screen.findByTestId('stb-check-inputs', {}, SLOW);
    const chip = await screen.findByTestId('data-health-chip-failing', {}, SLOW);
    // The synthetic dataset flags stock accuracy on cycle counts, which reaches this step.
    expect(num(chip.textContent)).toBeGreaterThan(0);
    await within(item).findByText(/input check/, {}, SLOW);
    expect(item).toHaveAttribute('data-state', 'attention');
    expect(num(screen.getByTestId('stb-check-inputs-state').textContent)).toBe(
      num(chip.textContent)
    );
    expect(screen.getByTestId('stb-check-inputs-state')).toHaveTextContent(/input checks? failing/);
    expect(screen.getByTestId('stb-check-inputs-link')).toHaveTextContent('Data health');
  });

  it('with every check passing, the inputs item says so', async () => {
    const r = /** @type {import('../services/data/types').DataHealthView} */ (
      await mockDataService.procurement.getDataHealth(buyerScope)
    );
    const passing = {
      ...r,
      feeds: r.feeds.map((f) => ({
        ...f,
        checks: f.checks.map((c) => ({ ...c, passed: true, failures: [] }))
      }))
    };
    vi.spyOn(mockDataService.procurement, 'getDataHealth').mockResolvedValue(passing);
    renderAt('/buyer/stabilise');
    const item = await screen.findByTestId('stb-check-inputs', {}, SLOW);
    await within(item).findByText(
      'Inputs pass',
      { selector: '[data-testid="stb-check-inputs-state"]' },
      SLOW
    );
    expect(item).toHaveAttribute('data-state', 'pass');
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderAt('/buyer/stabilise');
    const list = await screen.findByTestId('stb-checklist', {}, SLOW);
    expect(list).toHaveTextContent('Sebelum Anda menerbitkan');
    for (const label of [
      'Masukan lolos',
      'Pesanan ditinjau',
      'Minggu gudang diselesaikan',
      'Minggu tertahan punya alasan'
    ]) {
      expect(list).toHaveTextContent(label);
    }
    await screen.findByTestId('stb-run-engine', {}, SLOW);
    expect(screen.getByTestId('stb-check-held-state')).toHaveTextContent(
      'minggu tertahan tanpa alasan'
    );
    expect(
      screen.getByRole('tab', { name: 'Versi untuk diterbitkan', selected: true })
    ).toBeInTheDocument();
  });
});

describe('menu and page map after the merge', () => {
  it('the user menu no longer lists Published versions, and no menu item opens the old route', () => {
    const utility = UTILITY_NAV.buyer;
    expect(utility.map((i) => i.labelKey)).not.toContain('hub.nav.pti.engine.publishedVersions');
    // Known-good control: the other engine pages are still there.
    expect(utility.map((i) => i.path)).toContain('/buyer/data-health');
    const everyPath = [
      ...utility,
      ...navFor('buyer', 'MP').flatMap((s) => s.items),
      ...navFor('buyer', 'BUY').flatMap((s) => s.items)
    ].map((i) => i.path);
    expect(everyPath).not.toContain('/buyer/forecasts');
    expect(everyPath).toContain('/buyer/stabilise');
  });

  it('no forecastPages.ts link points to a removed or redirected route', () => {
    const ids = /** @type {ForecastPageId[]} */ (Object.keys(FORECAST_PAGES));
    expect(ids).not.toContain('publishedVersions');
    const targets = ids.flatMap((id) => {
      const p = FORECAST_PAGES[id];
      return [p.path, linkTarget(p.uses).path, linkTarget(p.next).path];
    });
    // Population control: the map links to the publish page itself.
    expect(targets).toContain('/buyer/stabilise');
    expect(targets.filter((path) => !PAGE_ROUTES.has(path))).toEqual([]);
    expect(targets).not.toContain('/buyer/forecasts');
  });
});
