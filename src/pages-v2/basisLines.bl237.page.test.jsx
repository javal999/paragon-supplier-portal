import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { demandAnticipationStore } from '@services/data/mock/stores/demandAnticipationStore';
import { whatIfScenarioStore } from '@services/data/mock/stores/whatIfScenarioStore';
import { sdcClock } from '@services/sdc';
import i18n from '@lib/i18n';
/** @import { QueryScope } from '@services/data/types' */
import BuyerOrderPlan from './BuyerOrderPlan';
import BuyerSafetyStock from './BuyerSafetyStock';
import BuyerMaterialRequirement from './BuyerMaterialRequirement';
import BuyerDemandAnticipation from './BuyerDemandAnticipation';
import BuyerWhatIfSandbox from './BuyerWhatIfSandbox';

// ─────────────────────────────────────────────────────────────────────────────
// FSR-D1 (BL-237, C-01) — one basis line per figure group, saying both the
// dataset and its standing. The engine figure groups (What to order's "Why
// this quantity", Material requirement, the Safety stock challenger columns)
// read "Challenger"; the hub sample groups (the OSIP columns, the Demand
// anticipation (DA) cards, the what-if sandbox) read "Plan of record".
// Presentation only: no figure on any page is asserted to have moved.
// ─────────────────────────────────────────────────────────────────────────────

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const LOAD = { timeout: 20000 };
const PLAN_OF_RECORD = /^Plan of record: hub sample data/;
const CHALLENGER = /^Challenger: engine dataset/;

beforeEach(() => {
  sdcClock.reset();
  demandAnticipationStore.reset();
  whatIfScenarioStore.reset();
});
afterEach(() => {
  void i18n.changeLanguage('en');
});

/**
 * The lines of one standing inside `root`.
 * @param {HTMLElement} root
 * @param {'planOfRecord' | 'challenger'} standing
 */
const linesOf = (root, standing) =>
  within(root)
    .getAllByTestId('basis-line')
    .filter((el) => el.getAttribute('data-standing') === standing);

describe('BL-237 basis lines', () => {
  it('What to order: the "Why this quantity" panel is the challenger', async () => {
    const plan = /** @type {import('@services/data/types').OrderPlanView} */ (
      await mockDataService.procurement.getOrderPlan(buyerScope)
    );
    const pk = /** @type {import('@services/data/types').WarehousePlanView} */ (
      plan.warehouses.find((w) => w.kind === 'packaging')
    );
    const rec = pk.materials.flatMap((m) => m.recommendations)[0];
    expect(rec).toBeDefined();
    renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
    fireEvent.click(
      await screen.findByTestId(`op-wq-open-${rec.materialCode}-${rec.weekStart}`, {}, LOAD)
    );
    const panel = await screen.findByTestId('op-wq-panel', {}, LOAD);
    const [line] = linesOf(panel, 'challenger');
    expect(line).toHaveTextContent(CHALLENGER);
    expect(line).toHaveTextContent('is the plan of record');
  });

  it('Safety stock targets: the OSIP columns are the plan of record, the engine columns the challenger', async () => {
    renderWithProviders(<BuyerSafetyStock />, { identity: PLANNER, route: '/buyer/safety-stock' });
    const basis = await screen.findByTestId('sst-basis', {}, LOAD);
    expect(linesOf(basis, 'planOfRecord')[0]).toHaveTextContent(PLAN_OF_RECORD);
    expect(linesOf(basis, 'challenger')[0]).toHaveTextContent(CHALLENGER);
    // The existing column markers keep their agreed labels (no relabel).
    expect(await screen.findByTestId('sst-challenger', {}, LOAD)).toHaveTextContent(
      'Challenger: engine fill rate'
    );
  });

  it('Material requirement: the netting is the challenger', async () => {
    renderWithProviders(<BuyerMaterialRequirement />, {
      identity: PLANNER,
      route: '/buyer/material-requirement'
    });
    await screen.findByTestId('mrq-kpis', {}, LOAD);
    const [line] = linesOf(document.body, 'challenger');
    expect(line).toHaveTextContent(CHALLENGER);
    expect(linesOf(document.body, 'planOfRecord')).toHaveLength(0);
  });

  it('Demand anticipation (DA): the cards are the plan of record', async () => {
    renderWithProviders(<BuyerDemandAnticipation />, {
      identity: PLANNER,
      route: '/buyer/demand-anticipation'
    });
    await screen.findByTestId('dant-filters', {}, LOAD);
    const [line] = linesOf(document.body, 'planOfRecord');
    expect(line).toHaveTextContent(PLAN_OF_RECORD);
    expect(line).toHaveTextContent('The engine dataset is the challenger.');
    expect(linesOf(document.body, 'challenger')).toHaveLength(0);
  });

  it('What-if sandbox: the headline results are the plan of record, in Indonesian too', async () => {
    renderWithProviders(<BuyerWhatIfSandbox />, {
      identity: PLANNER,
      route: '/buyer/what-if?supplier=sup-007&material=PK-PETB-8802'
    });
    const results = await screen.findByTestId('wi-results-table', {}, LOAD);
    const [line] = linesOf(document.body, 'planOfRecord');
    expect(line).toHaveTextContent(PLAN_OF_RECORD);
    // Above the results, not below them.
    expect(line.compareDocumentPosition(results)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    await i18n.changeLanguage('id');
    expect(screen.getByTestId('basis-line')).toHaveTextContent(/^Rencana acuan: data contoh hub/);
  });
});
