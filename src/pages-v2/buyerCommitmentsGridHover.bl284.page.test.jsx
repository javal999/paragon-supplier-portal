// ─────────────────────────────────────────────────────────────────────────────
// PEX-3 BR-02 (BL-284) — the buyer Commitments grid's week hover.
//
// Each supplier × material × period cell carries the heads-up note's terms:
// the LTP (planned use), PTI stock on hand and the gap between them (LTP − SOH).
// PTI reads every supplier's line, so no stock grant gates this side (Q-W3,
// PEX-D24). The ordered quantity on the cell is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { sdcClock } from '@services/sdc';
import BuyerCommitments from './BuyerCommitments';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

/** @param {string} supplierId @param {string} materialCode @param {string} period */
const openCell = async (supplierId, materialCode, period) => {
  renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
  await screen.findByTestId('fc-grid');
  const tip = screen.getByTestId(`term-tip-demand-${supplierId}-${materialCode}-${period}`);
  return within(tip).getByRole('tooltip');
};

describe('PEX-3 BR-02 (BL-284) — a week’s hover shows LTP, PTI stock on hand and the gap', () => {
  it('sup-007 PK-PETB-8801 W[0]: 34,300 LTP, 21,000 SOH, 13,300 gap', async () => {
    // 7,000/day × 7 days = 49,000; sup-007's 0.7 share is 34,300 (the cell's
    // forecast, unchanged); its SOH share is 0.7 × SAP's 30,000 = 21,000.
    const body = await openCell('sup-007', 'pk-petb-8801', W[0]);
    expect(body).toHaveTextContent('LTP (planned use) 34,300 PCS');
    expect(body).toHaveTextContent('PTI stock on hand 21,000 PCS');
    expect(body).toHaveTextContent('Gap (LTP − PTI stock on hand) 13,300 PCS');
    // The cell keeps the ordered quantity it read before this build.
    expect(screen.getByTestId(`fc-cell-sup-007-PK-PETB-8801-${W[0]}`)).toHaveTextContent('34,300');
  });

  it('the hover is per supplier: sup-012 carries its own share of the same week', async () => {
    const body = await openCell('sup-012', 'pk-petb-8801', W[0]);
    expect(body).toHaveTextContent('LTP (planned use) 14,700 PCS');
    expect(body).toHaveTextContent('PTI stock on hand 9,000 PCS');
    expect(body).toHaveTextContent('Gap (LTP − PTI stock on hand) 5,700 PCS');
  });

  it('a negative gap reads as it is: PTI’s stock covers the week', async () => {
    // PK-PETB-8802 W[0]: 5,500/day × 7 × 1.1 = 42,400; PTI holds 55,000.
    const body = await openCell('sup-007', 'pk-petb-8802', W[0]);
    expect(body).toHaveTextContent('LTP (planned use) 42,400 PCS');
    expect(body).toHaveTextContent('PTI stock on hand 55,000 PCS');
    expect(body).toHaveTextContent('Gap (LTP − PTI stock on hand) -12,600 PCS');
  });

  it('the hover is named for its period', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    await screen.findByTestId('fc-grid');
    const tip = screen.getByTestId(`term-tip-demand-sup-007-pk-petb-8802-${W[0]}`);
    expect(within(tip).getByRole('button')).toHaveAccessibleName(
      /^What “LTP, PTI stock on hand and gap for Week of /
    );
  });
});
