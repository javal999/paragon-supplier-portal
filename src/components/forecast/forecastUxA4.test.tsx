import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { screen, within, render } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { PLANNING_TERM_GLOSSARY, GLOSSARY_REGISTRIES, type PlanningTerm } from '@lib/glossary';
import { FORECAST_PAGES, linkTarget, type ForecastPageId } from './forecastPages';
import TermTip from './TermTip';
import BuyerForecasts from '@pages-v2/BuyerForecasts';
import BuyerCommitments from '@pages-v2/BuyerCommitments';
import BuyerDataHealth from '@pages-v2/BuyerDataHealth';
import BuyerDemandForecast from '@pages-v2/BuyerDemandForecast';
import BuyerForecastBias from '@pages-v2/BuyerForecastBias';
import BuyerModelBacktest from '@pages-v2/BuyerModelBacktest';
import BuyerReliability from '@pages-v2/BuyerReliability';
import BuyerMaterialRequirement from '@pages-v2/BuyerMaterialRequirement';
import BuyerSafetyStock from '@pages-v2/BuyerSafetyStock';
import BuyerOrderPlan from '@pages-v2/BuyerOrderPlan';
import BuyerReschedule from '@pages-v2/BuyerReschedule';
import BuyerStabilise from '@pages-v2/BuyerStabilise';
import { BuyerFixedStockReconcile } from '@pages-v2/FixedStockReconcile';
import Glossary from '@pages-v2/Glossary';

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST UX PHASE 1 · TASK A4 — purpose headers, one banner, plain copy.
//
// Every one of the 13 buyer forecast pages, rendered as a Material Planner:
//   · a purpose header whose Uses and Next links go to routes the router has;
//   · the one simulated-data banner, and neither of the two old labels;
//   · its menu label as the title and its new section in the crumb (F-19);
//   · no requirement code anywhere in its rendered text (F-18), including the
//     collapsed "About this page" section and the term tips;
// and each new planning term resolves in English and Indonesian (F-09).
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

const PAGES: Record<ForecastPageId, React.FC> = {
  whatToOrder: BuyerOrderPlan,
  makeRoom: BuyerReschedule,
  publish: BuyerStabilise,
  responses: BuyerCommitments,
  forecastQuality: BuyerDemandForecast,
  stockCheck: BuyerFixedStockReconcile,
  materialRequirement: BuyerMaterialRequirement,
  safetyStock: BuyerSafetyStock,
  publishedVersions: BuyerForecasts,
  forecastBias: BuyerForecastBias,
  dataHealth: BuyerDataHealth,
  modelBacktest: BuyerModelBacktest,
  reliability: BuyerReliability,
};
const IDS = Object.keys(PAGES) as ForecastPageId[];

/** The router's own paths, read from its source — a link is "working" when it is one of them. */
const ROUTES = new Set(
  [...readFileSync(join(__dirname, '..', '..', 'router', 'AppRouter.tsx'), 'utf8').matchAll(/path="([^"]+)"/g)].map((m) => m[1]),
);

/** Requirement codes a planner must not read (FUX-R2, F-18). */
const REQUIREMENT_CODE = /\b(?:E14-\d+|ENG-[A-Z]\d+[a-z]?|BR-\d+|REQ-E\d+)|C8 §\d/;

const renderPage = async (page: ForecastPageId) => {
  const Page = PAGES[page];
  const view = renderWithProviders(<Page />, { identity: PLANNER, route: FORECAST_PAGES[page].path });
  await screen.findByTestId('purpose-header', {}, { timeout: 15000 });
  return view;
};

afterEach(() => {
  void i18n.changeLanguage('en');
});

describe('the requirement-code matcher (probed before it is trusted)', () => {
  it('fires on each code shape that reached the screen before A4', () => {
    for (const bad of ['E14-03 Material requirement', 'owner’s decision (ENG-B66).', 'limit (ENG-D13)', '(ENG-D8a)', 'accuracy (BR-04)', 'ratifies C8 §8', 'REQ-E14-11']) {
      expect(REQUIREMENT_CODE.test(bad), bad).toBe(true);
    }
  });

  it('passes plain copy that only looks numeric', () => {
    for (const good of ['W36 · 127%', '1.0 = usual week-to-week movement', 'PO-2026-0042', 'RM-PKG-001', 'E14 days', 'BRAND-01']) {
      expect(REQUIREMENT_CODE.test(good), good).toBe(false);
    }
  });

  it('fires on a rendered page node, so a code inside "About this page" cannot hide', () => {
    const { container } = render(
      <details>
        <summary>About</summary>
        <p>Decided by the owner (ENG-D15)</p>
      </details>,
    );
    expect(REQUIREMENT_CODE.test(container.textContent ?? '')).toBe(true);
  });
});

describe('the purpose-header map', () => {
  it('covers 13 pages, and every Uses and Next target is a route the router has', () => {
    expect(IDS).toHaveLength(13);
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

  it('follows the phase 1 menu order for the Weekly plan and Review pages', () => {
    expect(FORECAST_PAGES.whatToOrder.next).toBe('makeRoom');
    expect(FORECAST_PAGES.makeRoom.next).toBe('publish');
    expect(FORECAST_PAGES.publish.next).toBe('responses');
    expect(FORECAST_PAGES.responses.next).toBe('performance');
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
    expect(within(header).getByTestId('purpose-decision')).toHaveTextContent(i18n.t(`fux.purpose.${page}`));
    const uses = within(header).getByTestId('purpose-uses');
    const next = within(header).getByTestId('purpose-next');
    expect(uses).toHaveAttribute('href', linkTarget(p.uses).path);
    expect(next).toHaveAttribute('href', linkTarget(p.next).path);
    expect(uses).toHaveTextContent(i18n.t(linkTarget(p.uses).titleKey));
    expect(next).toHaveTextContent(i18n.t(linkTarget(p.next).titleKey));
    expect(ROUTES.has(uses.getAttribute('href')!)).toBe(true);
    expect(ROUTES.has(next.getAttribute('href')!)).toBe(true);

    // F-14 — one banner, one wording; neither old label.
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent('Sample data. Nothing here reaches suppliers or SAP.');
    expect(screen.queryByTestId('sample-data-badge')).toBeNull();
    const labels = [i18n.t('hub.sample.label'), i18n.t('widget.honesty.awaitingMdmFeed')].map((l) => l.toLowerCase());
    const asLabel = Array.from(document.body.querySelectorAll('*')).filter((el) =>
      labels.includes((el.textContent ?? '').trim().toLowerCase()),
    );
    expect(asLabel.map((el) => el.outerHTML)).toEqual([]);

    // Title and crumb (F-19): the menu label, under its new section.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(i18n.t(p.titleKey));
    expect(document.body.textContent).toContain(i18n.t(p.sectionKey));

    // F-26 — one "Data as of" line; F-08 — the explanations sit in About.
    expect(screen.getByTestId('data-as-of')).toHaveTextContent('Data as of');
    expect(screen.getByTestId('about-this-page').tagName).toBe('DETAILS');
    expect(screen.getByTestId('about-this-page')).not.toHaveAttribute('open');
  });

  it('shows no requirement code anywhere in its rendered text', async () => {
    await renderPage(page);
    const text = document.body.textContent ?? '';
    expect(text.match(new RegExp(REQUIREMENT_CODE, 'g')) ?? []).toEqual([]);
  });

  it('in Indonesian: the crumb no longer repeats "Prakiraan · Prakiraan"', async () => {
    await i18n.changeLanguage('id');
    await renderPage(page);
    expect(document.body.textContent).not.toMatch(/Prakiraan · Prakiraan/i);
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent('Data contoh. Tidak ada yang sampai ke pemasok atau SAP.');
  });
});

describe('page-specific copy (F-12, F-16, F-21)', () => {
  it('F-12: the override form says overrides do not change orders', async () => {
    await renderPage('forecastBias');
    expect(screen.getByTestId('fb-override-no-effect')).toHaveTextContent(
      'Overrides do not change orders until the engine forecast is switched on.',
    );
  });

  it('F-16: Forecast quality no longer says the backtest is not built', async () => {
    await renderPage('forecastQuality');
    const note = screen.getByTestId('df-main-not-built');
    expect(note).toHaveTextContent('Model backtest page');
    expect(note).not.toHaveTextContent('not built either');
  });

  it('F-21: the unitless plan-movement measures carry their scale', async () => {
    await renderPage('reliability');
    expect(screen.getByTestId('rel-scale-hint')).toHaveTextContent('1.0 = usual week-to-week movement');
  });

  it('Publish to suppliers carries the Data health chip', async () => {
    await renderPage('publish');
    expect(await screen.findByTestId('data-health-chip', {}, { timeout: 15000 })).toBeInTheDocument();
  });
});

describe('planning terms (F-09)', () => {
  const TERMS = Object.keys(PLANNING_TERM_GLOSSARY) as PlanningTerm[];

  it('registers the six terms as a glossary vocabulary', () => {
    expect(TERMS).toEqual(['Firm', 'Trade-off', 'MASC', 'Tracking signal', 'Reorder point', 'P50/P90']);
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
    for (const term of TERMS) expect(screen.getByTestId(`glossary-term-PlanningTerm.${term}`)).toBeInTheDocument();
  });
});
