import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerInventory from './BuyerInventory';
import { MockProcurementService } from '@services/data/mock/MockProcurementService';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { osipParamStore } from '@services/data/mock/stores/osipParamStore';
import { seedOsipParam } from '@test/osipParamSeed';

// ─────────────────────────────────────────────────────────────────────────────
// DRC-D15 (BL-196) — the supplier's ROP on the stock template is DISPLAY ONLY.
// Suppliers can still send it; the PTI stock view shows the system's ROP
// Supplier beside it, labelled. (That no alert reads it any more is pinned in
// `inventoryAlertRules.test.js`.)
//
// RM-STEAR-7300 × sup-002: NPD on the sample data (first order 8,000 of 15,000
// KG received), so its ROP Fisik demand is the highest LTP of the next 3
// months, 3,200 a week (BL-282: weekly periods) = 457.14 a day; ROP Supplier = CEILING(457.14 × bottleneck
// production lead time 34 days [Team B10, set here], MPQ 25) = 15,550 KG.
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() =>
  seedOsipParam(
    'bottleneckLeadTimeDays',
    { supplierId: 'sup-002', materialCode: 'RM-STEAR-7300' },
    34
  )
);
afterEach(() => {
  goodsReceiptStore.reset();
  osipParamStore.reset();
});

describe('DRC-D15 — the supplier ROP figure is display only', () => {
  it('the label says so; the system ROP Supplier sits under the supplier’s own figure', async () => {
    renderWithProviders(<BuyerInventory />, { identity: BUYER });
    const row = await screen.findByTestId('pti-stock-row-sup-002-RM-STEAR-7300');
    // Inventory UX P-01 — the supplier ROP moved from the table into the material drawer.
    expect(screen.queryByTestId('inv-supplier-rop-display-only')).toBeNull();
    fireEvent.click(row);
    const drawer = screen.getByTestId('material-drawer');
    expect(within(drawer).getByTestId('inv-supplier-rop-display-only')).toHaveTextContent(
      'Supplier’s figure, display only'
    );
    expect(within(drawer).getByTestId('inv-system-rop-sup-002-RM-STEAR-7300')).toHaveTextContent(
      'System: 15,550 KG'
    );
  });

  it('the system figure is PTI’s: a supplier’s read carries none', async () => {
    const svc = new MockProcurementService();
    const supplierRows = (
      await svc.getInventory({
        personaType: 'supplier',
        supplierId: 'sup-002',
        businessRoles: PERSONA_SYSTEM_ROLES.supplier,
        actor: NO_PERSON
      })
    ).items;
    expect(supplierRows.length).toBeGreaterThan(0);
    expect(supplierRows.every((r) => !('systemRopSupplier' in r))).toBe(true);
    const ptiRows = (
      await svc.getInventory({
        personaType: 'buyer',
        supplierId: null,
        businessRoles: PERSONA_SYSTEM_ROLES.buyer,
        actor: NO_PERSON
      })
    ).items;
    expect(
      ptiRows.find((r) => r.supplierId === 'sup-002' && r.materialCode === 'RM-STEAR-7300')
        ?.systemRopSupplier
    ).toMatchObject({ value: 15550, unavailable: null });
  });
});
