import { describe, it, expect, afterEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerStabilise from './BuyerStabilise';
import { mockDataService } from '@services/data/mock/mockDataService';
import { isLive } from '@services/liveness';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { formatDate, formatNumber } from '@lib/format';
import i18n from '@lib/i18n';
/** @import { QueryScope } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E14-06 — the planner's Stabilise and publish page. Every figure is read
// back from the service for the same scope, never restated. Nothing on it
// reaches a supplier: the service gives a supplier nothing, and the publish
// act is withheld while the engine data is simulated.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
/** @type {QueryScope} */
const supplierScope = {
  personaType: 'supplier',
  supplierId: 'sup-012',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier
};
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

afterEach(() => {
  void i18n.changeLanguage('en');
});

const plan = async () =>
  /** @type {import('@services/data/types').StabilisedPlanView} */ (
    await mockDataService.procurement.getStabilisedPlan(buyerScope)
  );
/** @param {number | null} x */
const ratio = (x) => (x === null ? '—' : formatNumber(Math.round(x * 1000) / 1000));
/** @param {number | null} x */
const share = (x) => (x === null ? '—' : `${formatNumber(Math.round(x * 1000) / 10)}%`);

describe('BuyerStabilise — the planner page (REQ-E14-06)', () => {
  it('renders inside the app shell with the SIMULATED engine pill — never Live — and says nothing here reaches a supplier', async () => {
    expect(isLive('engineDataset')).toBe(false);
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    expect(
      await screen.findByRole('heading', { name: 'Publish to suppliers' })
    ).toBeInTheDocument();
    // FUX A4 (F-14): one simulated-data banner in place of the engine pill.
    expect(screen.getByTestId('simulated-data-banner')).toHaveTextContent(
      'Sample data. Nothing here reaches suppliers or SAP.'
    );
    expect(screen.queryByText('Live')).toBeNull();
    expect(screen.getByTestId('stb-withheld-note')).toHaveTextContent(
      'Nothing on this page is shown to a supplier'
    );
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('BR-06: the page says the demand range now exists but is not published, links to it, and shows the quantity only', async () => {
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    const note = await screen.findByTestId('stb-range-note');
    expect(note).toHaveTextContent('now exists on the Forecast quality page');
    expect(note).toHaveTextContent('It is not published here');
    expect(note).toHaveTextContent('Suppliers see the quantity only');
    expect(screen.getByTestId('stb-range-link')).toHaveAttribute('href', '/buyer/demand-forecast');
    const p = await plan();
    expect(p.rangeBuilt).toBe(true);
    expect(p.rangePublished).toBe(false);
    // Known-false: no P50 / P90 column sits beside the published quantity.
    expect(screen.queryByText('P90')).toBeNull();
  });

  it('X-03: the publish act is withheld in place — no publish button while the engine data is simulated', async () => {
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    expect(await screen.findByTestId('stb-publish-withheld')).toHaveTextContent(
      'never shown to a supplier'
    );
    expect(screen.queryByTestId('stb-publish-packaging')).toBeNull();
    expect(screen.queryByTestId('stb-publish-rawMaterial')).toBeNull();
  });

  it('FUX-D1 — the only publish point: the withheld text says so, with the last published version per stream and a link to Published versions', async () => {
    const versions = (await mockDataService.procurement.getForecastVersions(buyerScope)).items;
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    const withheld = await screen.findByTestId('stb-publish-withheld');
    expect(withheld).toHaveTextContent('Nothing can be published until real data arrives');
    expect(withheld).toHaveTextContent('This is the only place a plan is published to suppliers.');
    for (const stream of /** @type {const} */ (['packaging', 'rawMaterial'])) {
      const current = /** @type {import('@services/data/types').ForecastVersionView} */ (
        versions.find((v) => v.stream === stream && v.isCurrent)
      );
      const line = await screen.findByTestId(`stb-last-published-${stream}`);
      expect(line).toHaveTextContent(
        `Last published (${stream === 'packaging' ? 'Packaging' : 'Raw material'}): Version ${current.version}, ${formatDate(current.publishedAt)}`
      );
    }
    expect(screen.getByTestId('stb-versions-link')).toHaveAttribute(
      'href',
      '/buyer/stabilise?tab=versions'
    );
    expect(screen.getByTestId('stb-versions-link')).toHaveTextContent('Published versions');
  });

  it('X-03: a supplier scope gets nothing from the service at all', async () => {
    expect(await mockDataService.procurement.getStabilisedPlan(supplierScope)).toBeNull();
  });

  it('the values in use: the damping weight in force (50%, ENG-D9) and the ENG-D8 band', async () => {
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    expect(await screen.findByTestId('stb-setting-weight')).toHaveTextContent('50%');
    expect(screen.getByTestId('stb-setting-band')).toHaveTextContent(
      '±10% a version · ±20% from the first value'
    );
  });

  it('FSR-D5 (BL-238): under "Per supplier and material" a basis line names the replay and the sample Version 2, linking to the versions tab', async () => {
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    await screen.findByTestId('stb-run-engine');
    const basis = screen.getByTestId('stb-series-basis');
    expect(basis).toHaveTextContent(
      'Engine value, Last published and First published are the engine’s versions replayed 12 weeks back. Suppliers hold the sample Version 2: see Published versions.'
    );
    expect(screen.getByTestId('stb-series-basis-link')).toHaveAttribute(
      'href',
      '/buyer/stabilise?tab=versions'
    );
    // Inside the series section, under its table.
    expect(screen.getByTestId('stb-series')).toContainElement(basis);
    // FUX-D4 keeps the Source column: no column is renamed by the line.
    expect(screen.getByRole('radio', { name: /SAP’s published plan/ })).toBeInTheDocument();
  });

  it('the effect on plan change, raw against stabilised — the service’s own figures, on both sources', async () => {
    const p = await plan();
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    await screen.findByTestId('stb-run-engine');
    expect(screen.getByTestId('stb-kpi-masc-raw')).toHaveTextContent(
      ratio(p.engine.totals.raw.masc)
    );
    expect(screen.getByTestId('stb-kpi-masc-stab')).toHaveTextContent(
      ratio(p.engine.totals.stabilised.masc)
    );
    fireEvent.click(screen.getByRole('radio', { name: /SAP’s published plan/ }));
    await screen.findByTestId('stb-run-sapHistory');
    const h = p.sapHistory.totals;
    expect(screen.getByTestId('stb-kpi-masc-raw')).toHaveTextContent(ratio(h.raw.masc));
    expect(screen.getByTestId('stb-kpi-masc-stab')).toHaveTextContent(ratio(h.stabilised.masc));
    expect(screen.getByTestId('stb-kpi-share-raw')).toHaveTextContent(
      share(h.raw.insideLeadTime.share)
    );
    expect(screen.getByTestId('stb-kpi-share-stab')).toHaveTextContent('0%');
    // F-24 — the Trade-off KPI reads as a count after stabilising, with the raw count beneath.
    expect(screen.getByTestId('stb-kpi-band-stab')).toHaveTextContent(
      `${h.stabilised.tradeOff.withinBand} of ${h.stabilised.tradeOff.revisions}`
    );
    expect(screen.getByTestId('stb-kpi-band-raw')).toHaveTextContent(
      `after stabilising (before: ${h.raw.tradeOff.withinBand} of ${h.raw.tradeOff.revisions})`
    );
    expect(screen.getByText('Zone Capacity within the tolerance band')).toBeInTheDocument();
    expect(screen.queryByText('Trade-off revisions inside the band')).toBeNull();
    // Stabilising the plan suppliers saw lowers the movement.
    expect(/** @type {NonNullable<typeof h.stabilised.masc>} */ (h.stabilised.masc)).toBeLessThan(
      /** @type {NonNullable<typeof h.raw.masc>} */ (h.raw.masc)
    );
    for (const r of /** @type {const} */ (['firmFrozen', 'damped', 'bandHeld', 'cumulativeHeld'])) {
      expect(screen.getByTestId(`stb-count-${r}`)).toHaveTextContent(formatNumber(h.counts[r]));
    }
  });

  it('AC-03: a week held at the band shows the engine value, the damped value, the range, what is published and why', async () => {
    const p = await plan();
    const s = /** @type {import('@services/data/types').StabilisedSeriesView} */ (
      p.engine.series.find((x) => x.latest.some((w) => w.rule === 'bandHeld'))
    );
    expect(s).toBeDefined();
    const w = /** @type {import('@services/engine/stabilise').PeriodResult} */ (
      s.latest.find((x) => x.rule === 'bandHeld')
    );
    const key = `${s.supplierId}-${s.materialCode}`;
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    fireEvent.click(await screen.findByTestId(`stb-open-${key}`));
    const row = await screen.findByTestId(`stb-week-${key}-${w.period}`);
    expect(within(row).getByTestId(`stb-rule-${key}-${w.period}`)).toHaveTextContent(
      'Zone Capacity — held at ±10% a version'
    );
    expect(within(row).getByTestId(`stb-reason-needed-${key}-${w.period}`)).toHaveTextContent(
      'needs a reason'
    );
    expect(within(row).getByText('Zone Capacity')).toBeInTheDocument();
    expect(w.published).not.toBe(w.damped);
  });

  it('reads in Indonesian', async () => {
    await i18n.changeLanguage('id');
    renderWithProviders(<BuyerStabilise />, { identity: PLANNER, route: '/buyer/stabilise' });
    expect(
      await screen.findByRole('heading', { name: 'Terbitkan ke pemasok' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('stb-publish-withheld')).toHaveTextContent(
      'tidak pernah ditampilkan ke pemasok'
    );
    expect(screen.getByTestId('stb-publish-withheld')).toHaveTextContent(
      'Ini satu-satunya tempat rencana diterbitkan ke pemasok.'
    );
    await screen.findByTestId('stb-run-engine');
    const p = (await plan()).engine.totals;
    expect(screen.getByText('Zone Capacity dalam rentang toleransi')).toBeInTheDocument();
    expect(screen.getByTestId('stb-kpi-band-stab')).toHaveTextContent(
      `${p.stabilised.tradeOff.withinBand} dari ${p.stabilised.tradeOff.revisions}`
    );
    expect(screen.getByTestId('stb-kpi-band-raw')).toHaveTextContent(
      `setelah distabilkan (sebelum: ${p.raw.tradeOff.withinBand} dari ${p.raw.tradeOff.revisions})`
    );
    expect(await screen.findByTestId('stb-last-published-packaging')).toHaveTextContent(
      'Terakhir diterbitkan'
    );
    expect(screen.getByTestId('stb-versions-link')).toHaveTextContent('Versi terbit');
  });
});
