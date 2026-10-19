import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerSafetyStock from './BuyerSafetyStock';
import { consumptionStore } from '@services/data/mock/stores/consumptionStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { osipLevelStore } from '@services/data/mock/stores/osipLevelStore';
import { npdTagStore } from '@services/data/mock/stores/npdTagStore';
import { NO_PERSON } from '@context/noPerson';
import i18n from '@lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// BL-196 (DRC-10, DRC-D11) and BL-198 (DRC-12a) on the Safety stock targets
// page: the OSIP level and NPD tag, ROP Order / ROP Fisik / Max per supplier
// with their provisional labels, the engine reorder point labelled the
// challenger, the supplier-side ROPs and the level control in the detail panel,
// and the two read-only switches.
//
// RM-STEAR-7300 × sup-002 (outside Jabodetabek, f = 2; lead time 7 weeks; MPQ
// 25; MOQ 1,250; koli 700), with 14,000 and 7,000 KG of consumption recorded:
//   ROP Order  = cycle stock 20,147 + safety order 700 = 20,847
//   ROP Fisik  = CEILING(411.16 a day × 2, 25) 825 + safety 425 = 1,250 (level 4)
//   Max        = CEILING(1,250, koli 700) = 1,400
//   ROP Supplier = CEILING(411.16 × (11 + 23) days, 25) = 14,000
// ─────────────────────────────────────────────────────────────────────────────

afterEach(() => {
  consumptionStore.reset();
  goodsReceiptStore.reset();
  osipLevelStore.reset();
  npdTagStore.reset();
  void i18n.changeLanguage('en');
});

const recordConsumption = () => {
  for (const [week, qty] of /** @type {const} */ ([
    ['2026-08-17', 14000],
    ['2026-08-24', 7000]
  ]))
    consumptionStore.add({
      materialCode: 'RM-STEAR-7300',
      week,
      qty,
      unit: 'KG',
      source: 'manual',
      recordedAt: '2026-08-31T12:00:00.000Z',
      actor: NO_PERSON
    });
};

/** The rest of RM-STEAR-7300's first order (PO-2025-00116): the NPD tag drops. */
const fulfilFirstOrder = () =>
  goodsReceiptStore.add({
    id: 'gr-drc10',
    grNumber: 'GR-2026-DRC10',
    asnId: 'asn-drc10',
    asnNumber: 'ASN-DRC10',
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

/**
 * @param {string} key
 * @param {string} value
 */
const pickRop = (key, value) => {
  const select = /** @type {HTMLSelectElement} */ (screen.getByTestId(`sst-rop-switch-${key}`));
  const option = /** @type {HTMLOptionElement} */ (
    select.querySelector(`option[data-value="${value}"]`)
  );
  fireEvent.change(select, { target: { value: option.value } });
};

const render = async (route = '/buyer/safety-stock') => {
  renderWithProviders(<BuyerSafetyStock />, { identity: BUYER, route });
  return screen.findByTestId('sst-row-RM-STEAR-7300');
};

const ID = 'RM-STEAR-7300-sup-002';

describe('BL-196 — the ROP columns', () => {
  it('each carries the provisional label with its question IDs; the engine reorder point is the challenger', async () => {
    await render();
    expect(screen.getByTestId('sst-rop-prov-level')).toHaveTextContent(
      'Provisional: rule awaiting Material Planning (C2, D1)'
    );
    expect(screen.getByTestId('sst-rop-prov-ropOrder')).toHaveTextContent('(B2, B3, B4, B9, MPQ)');
    expect(screen.getByTestId('sst-rop-prov-ropFisik')).toHaveTextContent(
      '(B1, B5, B6, B7, C2, MPQ, MDQ)'
    );
    expect(screen.getByTestId('sst-rop-prov-max')).toHaveTextContent('(B8)');
    expect(screen.getByTestId('sst-rop-challenger')).toHaveTextContent(
      'Challenger: engine reorder point'
    );
  });

  it('RM-STEAR-7300 × sup-002 at level 4 (default): ROP Order 20,847 · ROP Fisik 1,250 · Max 1,400', async () => {
    recordConsumption();
    fulfilFirstOrder();
    await render();
    expect(screen.getByTestId('sst-level-RM-STEAR-7300')).toHaveTextContent('Level 4');
    expect(screen.getByTestId('sst-level-source-RM-STEAR-7300')).toHaveTextContent(
      'Default level (C2)'
    );
    expect(screen.getByTestId(`sst-rop-ropOrder-${ID}`)).toHaveTextContent('20,847 KG');
    expect(screen.getByTestId(`sst-rop-ropFisik-${ID}`)).toHaveTextContent('1,250 KG');
    expect(screen.getByTestId(`sst-rop-max-${ID}`)).toHaveTextContent('1,400 KG');
  });

  it('with no consumption recorded, ROP Fisik and Max say which input is missing', async () => {
    fulfilFirstOrder();
    await render();
    expect(screen.getByTestId(`sst-rop-ropFisik-${ID}`)).toHaveTextContent(
      'Not available: no ROP Fisik safety'
    );
    expect(screen.getByTestId(`sst-rop-max-${ID}`)).toHaveTextContent(
      'Not available: no ROP Fisik safety'
    );
  });

  it('the Max switch: sheet guidance = ROP Fisik 1,250 + its cycle 825 = 2,075', async () => {
    recordConsumption();
    fulfilFirstOrder();
    await render();
    pickRop('maxRule', 'sheetGuidance');
    expect(screen.getByTestId(`sst-rop-max-${ID}`)).toHaveTextContent('2,075 KG');
    expect(screen.getByTestId('sst-rop-variant')).toHaveTextContent('Not the default rules');
  });
});

describe('BL-196 — the detail panel: supplier-side ROPs and the level control', () => {
  it('ROP Supplier 14,000; ROP FS and ROP to principal name the step a local route lacks', async () => {
    recordConsumption();
    fulfilFirstOrder();
    await render();
    fireEvent.click(screen.getByTestId('sst-row-RM-STEAR-7300'));
    const panel = await screen.findByTestId('sst-rop-detail');
    expect(within(panel).getByTestId('sst-rop-detail-sup-002-ropSupplier')).toHaveTextContent(
      '14,000 KG'
    );
    expect(within(panel).getByTestId('sst-rop-detail-sup-002-ropFs')).toHaveTextContent(
      'Not available: no ordering-material lead time on this route'
    );
    expect(within(panel).getByTestId('sst-rop-detail-sup-002-ropToPrincipal')).toHaveTextContent(
      'Not available: no order-to-principal lead time on this route'
    );
    expect(within(panel).getByTestId('sst-rop-detail-prov-supplierRops')).toHaveTextContent(
      '(B10, MPQ)'
    );
  });

  it('the planner sets level 5: ROP Fisik becomes CEILING(822.3, MDQ = MOQ 1,250) + 425 = 1,675 and Max 2,100', async () => {
    recordConsumption();
    fulfilFirstOrder();
    await render();
    fireEvent.click(screen.getByTestId('sst-row-RM-STEAR-7300'));
    const select = /** @type {HTMLSelectElement} */ (await screen.findByTestId('sst-level-select'));
    const option = /** @type {HTMLOptionElement} */ (
      select.querySelector('option[data-value="5"]')
    );
    fireEvent.change(select, { target: { value: option.value } });
    fireEvent.click(screen.getByTestId('sst-level-save'));
    await waitFor(() =>
      expect(screen.getByTestId('sst-level-RM-STEAR-7300')).toHaveTextContent('Level 5')
    );
    expect(screen.getByTestId('sst-level-source-RM-STEAR-7300')).toHaveTextContent(
      'Set by the planner'
    );
    expect(screen.getByTestId(`sst-rop-ropFisik-${ID}`)).toHaveTextContent('1,675 KG');
    expect(screen.getByTestId(`sst-rop-max-${ID}`)).toHaveTextContent('2,100 KG');
    expect(osipLevelStore.all().map((r) => [r.materialCode, r.level])).toEqual([
      ['RM-STEAR-7300', 5]
    ]);
  });

  it('a seat without osiplevel:set reads who sets the level, not a control', async () => {
    renderWithProviders(<BuyerSafetyStock />, {
      identity: { ...BUYER, businessRoles: ['procurement'] },
      route: '/buyer/safety-stock?material=RM-STEAR-7300'
    });
    await screen.findByTestId('sst-rop-detail');
    expect(screen.getByTestId('handoff-osip-level')).toBeInTheDocument();
    expect(screen.queryByTestId('sst-level-save')).toBeNull();
  });

  it('?material= opens the material’s panel (the Home task links here)', async () => {
    await render('/buyer/safety-stock?material=RM-STEAR-7300');
    expect(await screen.findByTestId('sst-rop-detail')).toBeInTheDocument();
    expect(screen.getByTestId('sst-rop-detail-level')).toHaveTextContent('OSIP level 4');
  });
});

describe('BL-198 — the NPD tag beside the level', () => {
  it('first order open → NPD, and ROP Fisik takes the NPD demand: highest LTP of the next 3 months 2,940 → 420 a day; CEILING(840, 25) + 425 = 1,275', async () => {
    recordConsumption();
    await render();
    expect(screen.getByTestId('sst-npd-RM-STEAR-7300')).toHaveTextContent('NPD');
    expect(screen.getByTestId(`sst-rop-ropFisik-${ID}`)).toHaveTextContent('1,275 KG');
  });

  it('a note says most sample materials read as NPD because the sample PO history is partial (owner, 2026-10-19)', async () => {
    await render();
    expect(screen.getByTestId('sst-npd-sample-note')).toHaveTextContent(
      'the sample PO and goods-receipt history is partial, so most sample materials read as NPD until real PO history arrives'
    );
    await i18n.changeLanguage('id');
    expect(await screen.findByTestId('sst-npd-sample-note')).toHaveTextContent(
      'sebagian besar material contoh terbaca NPD'
    );
  });

  it('first order fully received → no tag', async () => {
    fulfilFirstOrder();
    await render();
    expect(screen.queryByTestId('sst-npd-RM-STEAR-7300')).toBeNull();
  });

  it("the NPD switch: 'one year after launch' drops RM-STEAR-7300's tag (launched 2022) and keeps PK-PETB-8801's (a parent launched 2025-11-24)", async () => {
    await render();
    expect(screen.getByTestId('sst-npd-RM-STEAR-7300')).toBeInTheDocument();
    pickRop('npdRule', 'oneYearAfterLaunch');
    expect(screen.queryByTestId('sst-npd-RM-STEAR-7300')).toBeNull();
    expect(screen.getByTestId('sst-npd-PK-PETB-8801')).toBeInTheDocument();
    pickRop('npdRule', '52WeeksHistory');
    expect(screen.queryByTestId('sst-npd-RM-STEAR-7300')).toBeNull();
  });

  it('the detail panel names the basis and the first order', async () => {
    await render('/buyer/safety-stock?material=RM-STEAR-7300');
    expect(await screen.findByTestId('sst-rop-detail-npd-basis')).toHaveTextContent(
      'First order not yet fully received'
    );
    expect(screen.getByTestId('sst-rop-detail-first-order')).toHaveTextContent(
      'First order PO-2025-00116: 8,000 of 15,000 KG received'
    );
  });
});
