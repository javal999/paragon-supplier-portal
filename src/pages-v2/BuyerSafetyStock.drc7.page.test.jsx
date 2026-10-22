import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerSafetyStock from './BuyerSafetyStock';
import { mockDataService } from '@services/data/mock/mockDataService';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';
import { qtyOf } from './materialPlan/planDisplay';
/** @import { QueryScope, SafetyStockView } from '@services/data/types' */

// ─────────────────────────────────────────────────────────────────────────────
// BL-193 (DRC-7) and BL-197 (DRC-11) on the Safety stock targets page: the
// OSIP safety order and ROP Fisik safety per supplier, the demand CV, the
// engine figure labelled as the challenger, the provisional labels, and the
// rule switches that recompute the view without storing anything.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {QueryScope} */
const buyerScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer
};

// BL-198 (DRC-12a) — these specs read RM-STEAR-7300 as an EXISTING material.
// On the sample data its first order (PO-2025-00116, 15,000 KG) is only 8,000
// KG received, so the default NPD rule [Default D1] would tag it NPD and its
// ROP Fisik demand would take the NPD branch. Receive the rest of that order
// first, so the tag drops and the consumption branch these specs test applies.
beforeEach(() => {
  goodsReceiptStore.add({
    id: 'gr-drc7-first-order',
    grNumber: 'GR-2026-DRC7',
    asnId: 'asn-drc7',
    asnNumber: 'ASN-DRC7',
    poNumber: 'PO-2025-00116',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Specialty Fats',
    receivedDate: '2026-08-20',
    receivedBy: 'Warehouse Supervisor',
    status: 'Posted to SAP',
    inspectionResults: [
      {
        materialCode: 'RM-STEAR-7300',
        description: 'Stearic acid',
        qtyExpected: 7000,
        qtyReceived: 7000,
        qtyAccepted: 7000,
        qtyRejected: 0,
        visualCheck: 'Pass',
        packagingCheck: 'Pass'
      }
    ],
    disposition: 'Accept'
  });
});

afterEach(() => {
  consumptionStore.reset();
  goodsReceiptStore.reset();
  void i18n.changeLanguage('en');
});

/**
 * Record the material's consumption (KG) for weeks before the hub's present.
 * @param {string} materialCode
 * @param {readonly [string, number][]} weeks
 */
const record = (materialCode, weeks) => {
  for (const [week, qty] of weeks)
    consumptionStore.add({
      materialCode,
      week,
      qty,
      unit: 'KG',
      source: 'manual',
      recordedAt: '2026-08-31T12:00:00.000Z',
      actor: NO_PERSON
    });
};

/**
 * Pick a rule switch option by its value (the native select carries the
 * option's index as its own value, the rules value in `data-value`).
 * @param {string} key
 * @param {string} value
 */
const pick = (key, value) => {
  const select = /** @type {HTMLSelectElement} */ (screen.getByTestId(`sst-osip-switch-${key}`));
  const option = /** @type {HTMLOptionElement} */ (
    select.querySelector(`option[data-value="${value}"]`)
  );
  fireEvent.change(select, { target: { value: option.value } });
};

const render = async () => {
  renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route: '/buyer/safety-stock' });
  return screen.findByTestId('sst-row-RM-STEAR-7300');
};

describe('BL-193 — OSIP safety beside the engine challenger', () => {
  it('the three OSIP columns carry the provisional label with their question IDs; the engine figure is labelled the challenger', async () => {
    await render();
    expect(screen.getByTestId('sst-osip-prov-safetyOrder')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (B2, B3, B4, MPQ)'
    );
    expect(screen.getByTestId('sst-osip-prov-fisikSafety')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (B1, B5, B6, B7, MPQ)'
    );
    expect(screen.getByTestId('sst-osip-prov-cv')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (C1)'
    );
    expect(screen.getByTestId('sst-osip-no-capacity')).toHaveTextContent(
      'Production capacity not available'
    );
    expect(screen.getByTestId('sst-challenger')).toHaveTextContent('Challenger: engine fill rate');
    // The challenger's figures are untouched.
    const run = /** @type {SafetyStockView} */ (
      await mockDataService.procurement.getSafetyStock(buyerScope)
    );
    const m = run.materials.find((x) => x.materialCode === 'RM-STEAR-7300');
    if (!m) throw new Error('RM-STEAR-7300 missing from the run');
    expect(screen.getByTestId('sst-ss-RM-STEAR-7300')).toHaveTextContent(
      qtyOf(m.safetyStock, m.uom)
    );
  });

  it('safety order per supplier: RM-STEAR-7300 × sup-002 = 700 (SD 157.94 over 7 LTP weeks, MPQ 25); no LTP reads so', async () => {
    const row = await render();
    expect(within(row).getByTestId('sst-osip-so-RM-STEAR-7300-sup-002')).toHaveTextContent('700');
    expect(screen.getByTestId('sst-osip-so-AI-PANTO-6640-sup-009')).toHaveTextContent(
      'No LTP over the lead time'
    );
    // Two sources, two lines, the primary first.
    const lines = within(screen.getByTestId('sst-row-PK-PETB-8801')).getAllByTestId(
      /^sst-osip-so-PK-PETB-8801-.*-line$/
    );
    expect(lines.map((l) => l.dataset.testid)).toEqual([
      'sst-osip-so-PK-PETB-8801-sup-007-line',
      'sst-osip-so-PK-PETB-8801-sup-012-line'
    ]);
  });

  it('ROP Fisik safety needs recorded consumption; with it, CEILING(1 day × min(2,000, 411.3), 25) = 425', async () => {
    await render();
    expect(screen.getByTestId('sst-osip-fisik-RM-STEAR-7300-sup-002')).toHaveTextContent(
      'No consumption recorded'
    );
  });

  it('…recorded: highest week 14,000 → 2,000 a day; LTP 20,152 over 7 weeks → 411.3 a day; the min rounds up to 425', async () => {
    record('RM-STEAR-7300', [
      ['2026-08-17', 14000],
      ['2026-08-24', 7000]
    ]);
    await render();
    expect(screen.getByTestId('sst-osip-fisik-RM-STEAR-7300-sup-002')).toHaveTextContent('425');
  });
});

describe('BL-193 — the rule switches recompute the view and store nothing', () => {
  it('fisikDemandIncludesLtp off: the min is the consumption alone → 2,000; the what-if note shows', async () => {
    record('RM-STEAR-7300', [
      ['2026-08-17', 14000],
      ['2026-08-24', 7000]
    ]);
    await render();
    expect(screen.queryByTestId('sst-osip-variant')).toBeNull();
    pick('fisikDemandIncludesLtp', 'off');
    expect(screen.getByTestId('sst-osip-fisik-RM-STEAR-7300-sup-002')).toHaveTextContent('2,000');
    expect(screen.getByTestId('sst-osip-variant')).toHaveTextContent('Not the default rules');
  });

  it("sdSource 'consumption12w': SD(14,000, 7,000) = 4,949.7 → 1.65 × √7 × 4,949.7 = 21,608 → 21,625", async () => {
    record('RM-STEAR-7300', [
      ['2026-08-17', 14000],
      ['2026-08-24', 7000]
    ]);
    await render();
    pick('sdSource', 'consumption12w');
    expect(screen.getByTestId('sst-osip-so-RM-STEAR-7300-sup-002')).toHaveTextContent('21,625');
    // A material with no consumption recorded now says so.
    expect(screen.getByTestId('sst-osip-so-PK-PETB-8801-sup-007')).toHaveTextContent(
      'No consumption recorded'
    );
  });

  it("safetyRounding 'moq' and fisikSafety 'sheet' recompute; switching back restores the default; nothing is recorded", async () => {
    await render();
    const before = consumptionStore.all().length;
    pick('safetyRounding', 'moq');
    // RM-STEAR-7300 × sup-002: MOQ 1,250 → 689.5 rounds up to 1,250.
    expect(screen.getByTestId('sst-osip-so-RM-STEAR-7300-sup-002')).toHaveTextContent('1,250');
    pick('fisikSafety', 'sheet');
    pick('safetyRounding', 'mpq');
    pick('fisikSafety', 'deck');
    expect(screen.getByTestId('sst-osip-so-RM-STEAR-7300-sup-002')).toHaveTextContent('700');
    expect(screen.queryByTestId('sst-osip-variant')).toBeNull();
    expect(consumptionStore.all().length).toBe(before);
  });
});

describe('BL-197 — demand CV and its category per material', () => {
  it('every material shows the service’s CV to two decimals and its category, or why it has none', async () => {
    const run = /** @type {SafetyStockView} */ (
      await mockDataService.procurement.getSafetyStock(buyerScope)
    );
    await render();
    const withCv = run.materials.filter((m) => m.osip.cv.cv !== null);
    expect(withCv.length).toBeGreaterThan(0);
    for (const m of run.materials) {
      const c = m.osip.cv;
      if (c.cv === null) {
        expect(screen.getByTestId(`sst-cv-${m.materialCode}`)).toHaveTextContent(
          c.noBom ? 'No BOM line' : 'No FG demand in the window'
        );
        continue;
      }
      expect(screen.getByTestId(`sst-cv-${m.materialCode}`)).toHaveTextContent(
        String(Math.round(c.cv * 100) / 100)
      );
      expect(screen.getByTestId(`sst-cv-cat-${m.materialCode}`)).toHaveTextContent(
        c.category === 'stable' ? 'Stable' : 'Fluctuative'
      );
    }
  });

  it('the definitions say each finished good is its own variant', async () => {
    await render();
    expect(screen.getByTestId('sst-osip-def-cv')).toHaveTextContent('each one is its own variant');
  });
});

describe('Bahasa Indonesia', () => {
  it('the OSIP columns, label and switches read from the ID fragment', async () => {
    await i18n.changeLanguage('id');
    await render();
    expect(screen.getByText('Pesanan pengaman (ROP Order)')).toBeInTheDocument();
    expect(screen.getByTestId('sst-osip-prov-cv')).toHaveTextContent(
      'Sementara: aturan menunggu Material Planning (C1)'
    );
    expect(screen.getByTestId('sst-challenger')).toHaveTextContent('Pembanding');
    expect(screen.getByText('Pengalih aturan OSIP')).toBeInTheDocument();
  });
});
