import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerOrderPlan from '@pages-v2/BuyerOrderPlan';
import { mockDataService } from '@services/data/mock/mockDataService';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
/** @import { QueryScope } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// FUX phase 3, C1 — the "Why this quantity" panel at narrow widths.
//
// The panel opens in a full-width row of the order table, inside the table's
// own sideways-scrolling wrapper (`ui-v2/Table`). jsdom has no layout, so the
// wrapper's visible width is set to what it measured in the built app as a
// Material Planner: 1096 px at a 1440 px screen, 680 px at 1024 and 424 px at
// 768. The panel must take that visible width (less the cell's 2 × 16 px
// padding), stick to its left edge, and stack its 3 blocks when 3 columns do
// not fit.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};
const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const BLOCKS = ['op-wq-requirement', 'op-wq-safety', 'op-wq-sizing'];
const PANEL_TIMEOUT = 30000;

/**
 * The table wrapper (`<div>` whose child is the `<table>`) reports `area` px; everything else 0, as in jsdom.
 * @param {number} area
 */
function setScrollAreaWidth(area) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    /** @this {HTMLElement} */ function () {
      return this.firstElementChild?.tagName === 'TABLE' ? area : 0;
    }
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function openFirstPanel() {
  const run = /** @type {import('@services/data/types').OrderPlanView} */ (
    await mockDataService.procurement.getOrderPlan(buyerScope)
  );
  const rec = run.warehouses.flatMap((w) => w.materials.flatMap((m) => m.recommendations))[0];
  expect(rec).toBeDefined();
  renderWithProviders(<BuyerOrderPlan />, { identity: PLANNER, route: '/buyer/order-plan' });
  const toggle = await screen.findByTestId(`op-wq-open-${rec.materialCode}-${rec.weekStart}`);
  fireEvent.click(toggle);
  const panel = await screen.findByTestId('op-wq-panel');
  return { toggle, panel };
}

describe('Why this quantity panel — narrow widths (FUX3 C1)', () => {
  it.each([
    [1024, 680],
    [768, 424]
  ])(
    'at a %i px screen (scroll area %i px) the panel fits the visible width and its 3 blocks stack',
    async (_screen, area) => {
      setScrollAreaWidth(area);
      const { panel } = await openFirstPanel();
      await waitFor(() => expect(panel).toHaveAttribute('data-layout', 'stacked'));
      const width = parseFloat(panel.style.width);
      expect(width).toBe(area - 32);
      expect(width).toBeLessThanOrEqual(area);
      // Sticky to the scroll area's left edge, so scrolling the table sideways leaves it in view.
      expect(panel.className).toMatch(/\bsticky\b/);
      expect(panel.className).toMatch(/\bleft-4\b/);
      const grid = within(panel).getByTestId('op-wq-blocks');
      expect(grid.className).toMatch(/\bgrid-cols-1\b/);
      expect(grid.className).not.toMatch(/grid-cols-3/);
      for (const id of BLOCKS) expect(grid).toContainElement(within(panel).getByTestId(id));
    },
    PANEL_TIMEOUT
  );

  it(
    'at a 1440 px screen (scroll area 1096 px) the 3 blocks sit side by side, still inside the visible width',
    async () => {
      setScrollAreaWidth(1096);
      const { panel } = await openFirstPanel();
      await waitFor(() => expect(panel).toHaveAttribute('data-layout', 'columns'));
      expect(parseFloat(panel.style.width)).toBe(1064);
      const grid = within(panel).getByTestId('op-wq-blocks');
      expect(grid.className).toMatch(/\bgrid-cols-3\b/);
      for (const id of BLOCKS) expect(grid).toContainElement(within(panel).getByTestId(id));
    },
    PANEL_TIMEOUT
  );

  it(
    'keeps its keyboard behaviour when stacked: focus moves in on open and back to the row button on close',
    async () => {
      setScrollAreaWidth(424);
      const { toggle, panel } = await openFirstPanel();
      expect(document.activeElement).toBe(within(panel).getByRole('heading', { level: 3 }));
      fireEvent.keyDown(/** @type {Element} */ (document.activeElement), { key: 'Escape' });
      expect(screen.queryByTestId('op-wq-panel')).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(toggle));
    },
    PANEL_TIMEOUT
  );
});
