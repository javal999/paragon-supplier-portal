// ─────────────────────────────────────────────────────────────────────────────
// IA review item 1 — Forecast quality opens both SKU lists (SKUs, and the
// demand range's SKUs) on their first rows; "Show all" reveals the rest, and
// the selected SKU stays listed when it sits past the cut.
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import i18n from '@lib/i18n';
import { mockDataService } from '@services/data/mock/mockDataService';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import BuyerDemandForecast from '../BuyerDemandForecast';
import { FQ_FIRST_ROWS } from './firstRows';

/** @import { QueryScope } from '@services/data/types' */

const WAIT = { timeout: 15000 };

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const read = async () =>
  /** @type {import('@services/data/types').DemandForecastView} */ (
    await mockDataService.procurement.getDemandForecast(buyerScope)
  );

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

/**
 * The ids of the body rows whose testid starts with `prefix`.
 * @param {HTMLElement} root
 * @param {string} prefix
 * @returns {string[]}
 */
const rowIds = (root, prefix) =>
  [...root.querySelectorAll(`tbody tr[data-testid^="${prefix}"]`)].map(
    (r) => /** @type {HTMLElement} */ (r).dataset.testid ?? ''
  );

describe('Forecast quality SKU lists open on their first rows', () => {
  it('SKUs: the first rows, then all of them, and the selected SKU stays listed', async () => {
    const run = await read();
    const skus = run.skus;
    if (skus.length <= FQ_FIRST_ROWS) throw new Error(`premise: more than ${FQ_FIRST_ROWS} SKUs`);
    renderWithProviders(<BuyerDemandForecast />, {
      identity: BUYER,
      route: '/buyer/demand-forecast'
    });
    const section = await screen.findByTestId('df-skus', {}, WAIT);
    const first = rowIds(section, 'df-sku-');
    expect(first).toHaveLength(FQ_FIRST_ROWS);
    const toggle = within(section).getByTestId('df-skus-toggle');
    expect(toggle).toHaveTextContent(`Show all ${skus.length} SKUs`);

    fireEvent.click(toggle);
    expect(rowIds(section, 'df-sku-')).toHaveLength(skus.length);
    const last = skus[skus.length - 1].skuCode;
    fireEvent.click(within(section).getByTestId(`df-sku-${last}`));
    fireEvent.click(within(section).getByTestId('df-skus-toggle'));
    expect(within(section).getByTestId('df-skus-toggle')).toHaveTextContent(
      `Show all ${skus.length} SKUs`
    );
    // The first rows plus the selected one, which sits past the cut.
    expect(rowIds(section, 'df-sku-')).toHaveLength(FQ_FIRST_ROWS + 1);
    expect(within(section).getByTestId(`df-sku-${last}`)).toHaveAttribute('aria-current', 'true');
  });

  it('Demand range SKUs: the first rows, then all of them', async () => {
    const run = await read();
    const n = run.range.skus.length;
    if (n <= FQ_FIRST_ROWS) throw new Error(`premise: more than ${FQ_FIRST_ROWS} range SKUs`);
    renderWithProviders(<BuyerDemandForecast />, {
      identity: BUYER,
      route: '/buyer/demand-forecast'
    });
    const section = await screen.findByTestId('df-range', {}, WAIT);
    expect(rowIds(section, 'df-range-sku-')).toHaveLength(FQ_FIRST_ROWS);
    expect(rowIds(section, 'df-range-sku-')).toEqual(
      run.range.skus.slice(0, FQ_FIRST_ROWS).map((s) => `df-range-sku-${s.key}`)
    );
    fireEvent.click(within(section).getByTestId('df-range-skus-toggle'));
    expect(rowIds(section, 'df-range-sku-')).toHaveLength(n);
  });
});
