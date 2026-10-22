import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerMaterialRequirement from './BuyerMaterialRequirement';
import { mockDataService } from '@services/data/mock/mockDataService';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import i18n from '@lib/i18n';
/** @import { MaterialPlanView, MaterialRequirementView, QueryScope } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// DRC-6 (BL-192) — the lead time by step under each material's lead time on
// the Material requirement page, read only. Figures are read back from the
// service, plus one named member pinned by value: a sup-007 packaging source
// of 14 days, local, split 4 + 7 + 3 by the sample weights.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};

const run = async () =>
  /** @type {MaterialRequirementView} */ (
    await mockDataService.procurement.getMaterialRequirement(buyerScope)
  );

describe('DRC-6 — lead time by step on the Material requirement page', () => {
  it('every sourced material shows its route, its total in weeks and each step, adding up to the lead time', async () => {
    const r = await run();
    const sourced = r.materials.filter((m) => m.supplierId !== null);
    expect(sourced.length).toBeGreaterThan(0);
    renderWithProviders(<BuyerMaterialRequirement />, {
      identity: BUYER,
      route: '/buyer/material-requirement'
    });
    await screen.findByTestId(`mrq-row-${sourced[0].materialCode}`);
    for (const m of sourced) {
      const b = /** @type {NonNullable<MaterialPlanView['leadTimeSteps']>} */ (m.leadTimeSteps);
      expect(b.stepped).toBe(true);
      expect(b.totalDays).toBe(m.leadTimeDays);
      const block = screen.getByTestId(`mrq-lt-steps-${m.materialCode}`);
      expect(within(block).getByTestId(`mrq-lt-steps-${m.materialCode}-weeks`)).toHaveTextContent(
        `${b.totalWeeks} week`
      );
      for (const s of b.steps)
        expect(
          within(block).getByTestId(`mrq-lt-steps-${m.materialCode}-${s.step}`)
        ).toHaveTextContent(`${s.days} day`);
    }
  });

  it('a local 14-day source reads Local · 2 weeks: machine queue 4, production 7, delivery 3', async () => {
    const r = await run();
    const m = r.materials.find((x) => x.supplierId === 'sup-007' && x.leadTimeDays === 14);
    expect(m, 'a sup-007 14-day source').toBeDefined();
    const code = /** @type {MaterialPlanView} */ (m).materialCode;
    renderWithProviders(<BuyerMaterialRequirement />, {
      identity: BUYER,
      route: '/buyer/material-requirement'
    });
    const block = await screen.findByTestId(`mrq-lt-steps-${code}`);
    expect(within(block).getByTestId(`mrq-lt-steps-${code}-route`)).toHaveTextContent('Local');
    expect(within(block).getByTestId(`mrq-lt-steps-${code}-weeks`)).toHaveTextContent('2 weeks');
    expect(within(block).getByTestId(`mrq-lt-steps-${code}-machineQueue`)).toHaveTextContent(
      'Machine queue: 4 days'
    );
    expect(within(block).getByTestId(`mrq-lt-steps-${code}-production`)).toHaveTextContent(
      'Production: 7 days'
    );
    expect(within(block).getByTestId(`mrq-lt-steps-${code}-delivery`)).toHaveTextContent(
      'Delivery: 3 days'
    );
  });

  it('reads in Indonesian', async () => {
    const r = await run();
    const m = /** @type {MaterialPlanView} */ (
      r.materials.find((x) => x.supplierId === 'sup-007' && x.leadTimeDays === 14)
    );
    try {
      await i18n.changeLanguage('id');
      renderWithProviders(<BuyerMaterialRequirement />, {
        identity: BUYER,
        route: '/buyer/material-requirement'
      });
      const block = await screen.findByTestId(`mrq-lt-steps-${m.materialCode}`);
      expect(block).toHaveTextContent('Lokal');
      expect(block).toHaveTextContent('Antrean mesin: 4 hari');
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
