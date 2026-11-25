/** @import React from 'react' */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { screen, within, render, fireEvent } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
/** @import { PlanningTerm } from '@lib/glossary' */
import { PLANNING_TERM_GLOSSARY, GLOSSARY_REGISTRIES } from '@lib/glossary';
/** @import { ForecastPageId } from './forecastPages' */
import { FORECAST_PAGES, linkTarget } from './forecastPages';
import TermTip from './TermTip';
import BuyerCommitments from '@pages-v2/BuyerCommitments';
import BuyerDataHealth from '@pages-v2/BuyerDataHealth';
import BuyerDemandForecast from '@pages-v2/BuyerDemandForecast';
import BuyerModelBacktest from '@pages-v2/BuyerModelBacktest';
import BuyerReliability from '@pages-v2/BuyerReliability';
import BuyerMaterialRequirement from '@pages-v2/BuyerMaterialRequirement';
import BuyerSafetyStock from '@pages-v2/BuyerSafetyStock';
import BuyerOrderPlan from '@pages-v2/BuyerOrderPlan';
import BuyerReschedule from '@pages-v2/BuyerReschedule';
import BuyerStabilise from '@pages-v2/BuyerStabilise';
import BuyerThisWeek from '@pages-v2/BuyerThisWeek';
import BuyerDemandAnticipation from '@pages-v2/BuyerDemandAnticipation';
import { BuyerFixedStockReconcile } from '@pages-v2/FixedStockReconcile';
import Glossary from '@pages-v2/Glossary';

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST UX PHASE 1 · TASK A4 — purpose headers, one banner, plain copy.
//
// Every buyer forecast page (phase 1's, plus phase 2's This week, less Forecast bias and Published versions,
// which B5 and B2 made tabs of Forecast quality and Publish to suppliers), rendered as a Material Planner:
//   · a purpose header whose Uses and Next links go to routes the router has;
//   · the one simulated-data banner, and neither of the two old labels;
//   · its menu label as the title and its new section in the crumb (F-19);
//   · no requirement code anywhere in its rendered text (F-18), including the
//     collapsed "About this page" section and the term tips;
// and each new planning term resolves in English and Indonesian (F-09).
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

/** @type {Record<ForecastPageId, React.FC>} */
const PAGES = {
  thisWeek: BuyerThisWeek,
  whatToOrder: BuyerOrderPlan,
  makeRoom: BuyerReschedule,
  publish: BuyerStabilise,
  responses: BuyerCommitments,
  // FSR-D3 (BL-251) — step 6 of the weekly strip.
  demandAnticipation: BuyerDemandAnticipation,
  forecastQuality: BuyerDemandForecast,
  stockCheck: BuyerFixedStockReconcile,
  materialRequirement: BuyerMaterialRequirement,
  safetyStock: BuyerSafetyStock,
  dataHealth: BuyerDataHealth,
  modelBacktest: BuyerModelBacktest,
  reliability: BuyerReliability
};
const IDS = /** @type {ForecastPageId[]} */ (Object.keys(PAGES));

/**
 * FSR-D3 (BL-251) — Demand anticipation (DA) joins the strip with the purpose
 * header and the chip, but keeps its own body: its figures are the hub sample
 * (FSR-D1) and what it publishes DOES reach suppliers inside the hub, so the
 * F-14 banner ("Nothing here reaches suppliers or SAP") would be false on it.
 * It keeps the Sample data badge, its own as-of line and no About section.
 * @type {ReadonlySet<ForecastPageId>}
 */
const HUB_SAMPLE_PAGES = new Set(/** @type {ForecastPageId[]} */ (['demandAnticipation']));

/**
 * P-12 — the pages split into tabs, and the tab that holds "About this page".
 * @type {Partial<Record<ForecastPageId, string>>}
 */
const ABOUT_TAB = { whatToOrder: 'How it is sized', makeRoom: 'Values and method' };

/**
 * The rendered text of every tab of the page (P-12), so a scan of the page's
 * text still reads what a tab other than the first holds.
 * @returns {string}
 */
const textOfEveryTab = () => {
  const tabs = screen.queryAllByRole('tab');
  if (tabs.length === 0) return document.body.textContent ?? '';
  return tabs
    .map((tab) => {
      fireEvent.click(tab);
      return document.body.textContent ?? '';
    })
    .join('\n');
};

/** The router's own paths, read from its source — a link is "working" when it is one of them. */
const ROUTES = new Set(
  [
    ...readFileSync(join(__dirname, '..', '..', 'router', 'AppRouter.jsx'), 'utf8').matchAll(
      /path="([^"]+)"/g
    )
  ].map((m) => m[1])
);

/** Requirement codes a planner must not read (FUX-R2, F-18). */
const REQUIREMENT_CODE = /\b(?:E14-\d+|ENG-[A-Z]\d+[a-z]?|BR-\d+|REQ-E\d+)|C8 §\d/;

/** @param {ForecastPageId} page */
const renderPage = async (page) => {
  const Page = PAGES[page];
  const view = renderWithProviders(<Page />, {
    identity: PLANNER,
    route: FORECAST_PAGES[page].path
  });
  await screen.findByTestId('purpose-header', {}, { timeout: 15000 });
  return view;
};

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('the requirement-code matcher (probed before it is trusted)', () => {
  it('fires on each code shape that reached the screen before A4', () => {
    for (const bad of [
      'E14-03 Material requirement',
      'owner’s decision (ENG-B66).',
      'limit (ENG-D13)',
      '(ENG-D8a)',
      'accuracy (BR-04)',
      'ratifies C8 §8',
      'REQ-E14-11'
    ]) {
      expect(REQUIREMENT_CODE.test(bad), bad).toBe(true);
    }
  });

  it('passes plain copy that only looks numeric', () => {
    for (const good of [
      'W36 · 127%',
      '1.0 = usual week-to-week movement',
      'PO-2026-0042',
      'RM-PKG-001',
      'E14 days',
      'BRAND-01'
    ]) {
      expect(REQUIREMENT_CODE.test(good), good).toBe(false);
    }
  });

  it('fires on a rendered page node, so a code inside "About this page" cannot hide', () => {
    const { container } = render(
      <details>
        <summary>About</summary>
        <p>Decided by the owner (ENG-D15)</p>
      </details>
    );
    expect(REQUIREMENT_CODE.test(container.textContent ?? '')).toBe(true);
  });
});

describe('the purpose-header map', () => {
  it('covers every forecast page (This week added by B1, Forecast bias and Published versions folded into tabs by B5 and B2), and every Uses and Next target is a route the router has', () => {
    expect(IDS).toContain('thisWeek');
    expect(IDS).toContain('forecastQuality');
    expect(IDS).not.toContain('forecastBias');
    expect(IDS).not.toContain('publishedVersions');
    expect(Object.keys(FORECAST_PAGES).sort()).toEqual([...IDS].sort());
    expect(ROUTES.has('/buyer/order-plan')).toBe(true);
    expect(ROUTES.has('/buyer/no-such-page')).toBe(false);
    for (const id of IDS) {
      const p = FORECAST_PAGES[id];
      expect(ROUTES.has(p.path), p.path).toBe(true);
      expect(ROUTES.has(linkTarget(p.uses).path), `${id} uses`).toBe(true);
      expect(ROUTES.has(linkTarget(p.next).path), `${id} next`).toBe(true);
      expect(p.uses, `${id} links to itself`).not.toBe(id);
      expect(p.next, `${id} links to itself`).not.toBe(id);
    }
  });

  it('follows the menu order for the Weekly plan and Review pages', () => {
    // FUX phase 2 B1 — This week starts the cycle, after the input check.
    expect(FORECAST_PAGES.thisWeek.uses).toBe('dataHealth');
    expect(FORECAST_PAGES.thisWeek.next).toBe('whatToOrder');
    expect(FORECAST_PAGES.whatToOrder.uses).toBe('thisWeek');
    expect(FORECAST_PAGES.whatToOrder.next).toBe('makeRoom');
    expect(FORECAST_PAGES.makeRoom.next).toBe('publish');
    expect(FORECAST_PAGES.publish.next).toBe('responses');
    // FSR-D3 (BL-251) — Demand anticipation (DA) is step 6, after Foresight
    // commitments (supersedes D-19); IA P-07 (IA-B10) — the cycle then ends
    // back at This week.
    expect(FORECAST_PAGES.responses.next).toBe('demandAnticipation');
    expect(FORECAST_PAGES.demandAnticipation.uses).toBe('publish');
    expect(FORECAST_PAGES.demandAnticipation.next).toBe('thisWeek');
    expect(FORECAST_PAGES.demandAnticipation.path).toBe('/buyer/demand-anticipation');
    expect(FORECAST_PAGES.thisWeek.sectionKey).toBe(FORECAST_PAGES.responses.sectionKey);
    expect(FORECAST_PAGES.demandAnticipation.sectionKey).toBe(FORECAST_PAGES.thisWeek.sectionKey);
    expect(FORECAST_PAGES.forecastQuality.uses).toBe('performance');
    expect(FORECAST_PAGES.forecastQuality.next).toBe('stockCheck');
  });
});

describe.each(IDS)('%s', (page) => {
  it('renders its purpose header with working Uses and Next links, the one banner, its menu title and new crumb', async () => {
    await renderPage(page);
    const p = FORECAST_PAGES[page];
    const header = screen.getByTestId('purpose-header');
    expect(header).toHaveAttribute('data-page', page);
    expect(within(header).getByTestId('purpose-decision')).toHaveTextContent(
      i18n.t(`fux.purpose.${page}`)
    );
    const uses = within(header).getByTestId('purpose-uses');
    const next = within(header).getByTestId('purpose-next');
    expect(uses).toHaveAttribute('href', linkTarget(p.uses).path);
    expect(next).toHaveAttribute('href', linkTarget(p.next).path);
    expect(uses).toHaveTextContent(i18n.t(linkTarget(p.uses).titleKey));
    expect(next).toHaveTextContent(i18n.t(linkTarget(p.next).titleKey));
    expect(
      ROUTES.has(
        /** @type {NonNullable<ReturnType<typeof uses.getAttribute>>} */ (uses.getAttribute('href'))
      )
    ).toBe(true);
    expect(
      ROUTES.has(
        /** @type {NonNullable<ReturnType<typeof next.getAttribute>>} */ (next.getAttribute('href'))
      )
    ).toBe(true);

    // Title and crumb (F-19): the menu label, under its new section.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t(p.titleKey));
    expect(document.body.textContent).toContain(i18n.t(p.sectionKey));

    if (HUB_SAMPLE_PAGES.has(page)) {
      // FSR-D3 / FSR-D1 — the hub-sample step keeps its Sample data badge and
      // no engine banner: what it publishes does reach suppliers in the hub.
      expect(screen.queryByTestId('simulated-data-banner')).toBeNull();
      expect(screen.getByTestId('sample-data-badge')).toBeInTheDocument();
      expect(
        await screen.findByTestId('data-health-chip', {}, { timeout: 15000 })
      ).toBeInTheDocument();
      return;
    }

    // F-14 — one banner, one wording; neither old label.
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Sample data. Nothing here reaches suppliers or SAP.'
    );
    expect(screen.queryByTestId('sample-data-badge')).toBeNull();
    const labels = [i18n.t('hub.sample.label'), i18n.t('widget.honesty.awaitingMdmFeed')].map((l) =>
      l.toLowerCase()
    );
    const asLabel = Array.from(document.body.querySelectorAll('*')).filter((el) =>
      labels.includes((el.textContent ?? '').trim().toLowerCase())
    );
    expect(asLabel.map((el) => el.outerHTML)).toEqual([]);

    // F-26 — one "Data as of" line; F-08 — the explanations sit in About.
    expect(screen.getByTestId('data-as-of')).toHaveTextContent('Data as of');
    const aboutTab = ABOUT_TAB[page];
    if (aboutTab) fireEvent.click(screen.getByRole('tab', { name: aboutTab }));
    expect(screen.getByTestId('about-this-page').tagName).toBe('DETAILS');
    expect(screen.getByTestId('about-this-page')).not.toHaveAttribute('open');
  });

  it('shows no requirement code anywhere in its rendered text', async () => {
    await renderPage(page);
    const text = textOfEveryTab();
    expect(text.match(new RegExp(REQUIREMENT_CODE, 'g')) ?? []).toEqual([]);
  });

  it('in Indonesian: the crumb no longer repeats "Prakiraan · Prakiraan"', async () => {
    await i18n.changeLanguage('id');
    await renderPage(page);
    expect(document.body.textContent).not.toMatch(/Prakiraan · Prakiraan/i);
    if (HUB_SAMPLE_PAGES.has(page)) {
      expect(screen.getByTestId('sample-data-badge')).toHaveTextContent('Data contoh');
      return;
    }
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Data contoh. Tidak ada yang sampai ke pemasok atau SAP.'
    );
  });
});

describe('page-specific copy (F-12, F-16, F-21)', () => {
  it('F-12: the override form says overrides do not change orders', async () => {
    renderWithProviders(<BuyerDemandForecast />, {
      identity: PLANNER,
      route: '/buyer/demand-forecast?tab=bias'
    });
    expect(
      await screen.findByTestId('fb-override-no-effect', {}, { timeout: 15000 })
    ).toHaveTextContent('Overrides do not change orders until the engine forecast is switched on.');
  });

  it('B5: the bias tab of Forecast quality keeps the purpose header, the one banner, its own Data as of, and no requirement code', async () => {
    renderWithProviders(<BuyerDemandForecast />, {
      identity: PLANNER,
      route: '/buyer/demand-forecast?tab=bias'
    });
    await screen.findByTestId('fb-kpis', {}, { timeout: 15000 });
    expect(screen.getByTestId('purpose-header')).toHaveAttribute('data-page', 'forecastQuality');
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Sample data. Nothing here reaches suppliers or SAP.'
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      i18n.t('hub.nav.pti.forecastQuality')
    );
    expect(screen.getByTestId('data-as-of')).toHaveTextContent('Data as of');
    expect(screen.getByTestId('about-this-page')).not.toHaveAttribute('open');
    const text = document.body.textContent ?? '';
    expect(text.match(new RegExp(REQUIREMENT_CODE, 'g')) ?? []).toEqual([]);
  });

  it('F-16: Forecast quality no longer says the backtest is not built', async () => {
    await renderPage('forecastQuality');
    const note = screen.getByTestId('df-main-not-built');
    expect(note).toHaveTextContent('Model backtest page');
    expect(note).not.toHaveTextContent('not built either');
  });

  it('F-21: the unitless plan-movement measures carry their scale', async () => {
    await renderPage('reliability');
    expect(screen.getByTestId('rel-scale-hint')).toHaveTextContent(
      '1.0 = usual week-to-week movement'
    );
  });

  it('Publish to suppliers carries the Data health chip', async () => {
    await renderPage('publish');
    expect(
      await screen.findByTestId('data-health-chip', {}, { timeout: 15000 })
    ).toBeInTheDocument();
  });
});

describe('planning terms (F-09)', () => {
  const TERMS = /** @type {PlanningTerm[]} */ (Object.keys(PLANNING_TERM_GLOSSARY));

  it('registers the eight terms as a glossary vocabulary', () => {
    // FUX2 B3 adds Safety stock, tipped in the "Why this quantity" panel.
    // UCX-P6 adds FG cap, tipped on the PO On Hold panel (PEX-8 BR-03).
    expect(TERMS).toEqual([
      'Zone Liability',
      'Zone Capacity',
      'MASC',
      'Tracking signal',
      'Reorder point',
      'P50/P90',
      'Safety stock',
      'FG cap'
    ]);
    expect(GLOSSARY_REGISTRIES.map((r) => r.sourceType)).toContain('PlanningTerm');
  });

  it.each(TERMS)('%s resolves in English and Indonesian, at the point of use', async (term) => {
    const entry = PLANNING_TERM_GLOSSARY[term];
    expect(entry.en.length).toBeGreaterThan(25);
    expect(entry.id.length).toBeGreaterThan(25);
    expect(entry.id).not.toBe(entry.en);
    const { unmount } = render(<TermTip term={term}>{term}</TermTip>);
    expect(screen.getByRole('tooltip')).toHaveTextContent(entry.en);
    unmount();
    await i18n.changeLanguage('id');
    render(<TermTip term={term}>{term}</TermTip>);
    expect(screen.getByRole('tooltip')).toHaveTextContent(entry.id);
  });

  it('the glossary page lists each term', () => {
    renderWithProviders(<Glossary />, { route: '/glossary' });
    for (const term of TERMS)
      expect(screen.getByTestId(`glossary-term-PlanningTerm.${term}`)).toBeInTheDocument();
  });
});
