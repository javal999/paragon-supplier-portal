// ────────────────────────────────────────────────────────────────────────────
// E2E walkthrough 2026-11-12 — the SSTP pair (sup-007 × 2000028400) is seeded
// as the planners' sheet states it, the overrides reach this pair only, and the
// startup seed lands through the real verbs.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DECLARED_PRESENT } from '../fixturePresent';
import { SDC_SIMULATED_NOW, materialEntry, sdcClock } from '../../sdc';
import { leadTimeBreakdown } from '../../engine/leadTimeSteps';
import { generateEngineDataset } from '../../engine/synthetic/generate';
import { zoneLengthsFor } from '../../transitions/forecastConfig';
import { blanketBalances } from '../../transitions/supplyBelowDemandRules';
import { NO_PERSON } from '@context/noPerson';
import {
  SSTP,
  SSTP_FIGURES,
  SSTP_LTP_WEEKS,
  SSTP_EXCEL_WEEK_LABELS,
  sstpDemand
} from './fixtures/walkthroughSstp';
import {
  ENGINE_DATASET_SEED,
  engineDataset,
  engineGeneratorInput,
  withWalkthroughPair
} from './fixtures/engineDataset';
import { FORECAST_SOURCES } from './fixtures/forecastHub';
import { PTI_STOCK } from './fixtures/inventoryHub';
import { seedWalkthroughSstp } from './walkthroughSstpSeed';
import { MockProcurementService } from './MockProcurementService';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { callOffStore } from './stores/callOffStore';
import { asnStore } from './stores/asnStore';
import { goodsReceiptStore } from './stores/goodsReceiptStore';
import { ltpInputStore } from './stores/ltpInputStore';
import { osipParamStore } from './stores/osipParamStore';
import { feedstockConfirmationStore } from './stores/feedstockConfirmationStore';
import { inventoryDeclarationStore } from './stores/inventoryDeclarationStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';

const CODE = SSTP.materialCode;
const isPair = (/** @type {{ supplierId: string; materialCode: string }} */ s) =>
  s.supplierId === SSTP.supplierId && s.materialCode === CODE;

describe('the pair exists, with the sheet’s figures', () => {
  it('is a packaging material in PCS, 100% with sup-007', () => {
    expect(materialEntry(CODE)).toMatchObject({
      label: 'CONTAINER SSTP REVAMP MO',
      materialType: 'VERP',
      materialGroup: 'MG-20',
      canonicalUom: 'PCS',
      planningGroupId: 'pg-walkthrough-sstp'
    });
    expect(FORECAST_SOURCES.filter((s) => s.materialCode === CODE)).toEqual([
      { supplierId: 'sup-007', materialCode: CODE, share: 1 }
    ]);
  });

  it('the engine source carries lead time 5 weeks, MOQ 30,096, MPQ 27,311 and koli 144', () => {
    const data = engineDataset();
    const src = data.sources.filter((s) => s.materialCode === CODE);
    expect(src).toHaveLength(1);
    expect(src[0]).toMatchObject({
      supplierId: 'sup-007',
      leadTimeDays: 35,
      moq: 30_096,
      orderMultiple: 27_311,
      share: 1
    });
    expect(leadTimeBreakdown(src[0]).totalWeeks).toBe(5);
    expect(data.volumes.find((v) => v.materialCode === CODE)?.unitsPerPallet).toBe(144);
  });

  it('PTI SOH 31,630 and ROP Fisik 25,428 at plant J6', () => {
    expect(PTI_STOCK.filter((r) => r.materialCode === CODE)).toEqual([
      { materialCode: CODE, ptiSoh: 31_630, ptiRop: 25_428, consignment: false, plant: 'J6' }
    ]);
  });

  it('LTP A maps Excel W45 2026 … W18 2027 onto the app weeks, W46 = the declared present', () => {
    const weeks = Object.keys(SSTP_LTP_WEEKS);
    expect(weeks).toHaveLength(27);
    expect(SSTP_LTP_WEEKS[DECLARED_PRESENT]).toBe(20_067);
    expect(SSTP_EXCEL_WEEK_LABELS[DECLARED_PRESENT]).toBe('W46 2026');
    expect(weeks[0]).toBe('2026-08-24');
    expect(weeks[26]).toBe('2027-02-22');
    expect(SSTP_EXCEL_WEEK_LABELS['2027-02-22']).toBe('W18 2027');
    expect(SSTP_LTP_WEEKS['2027-02-22']).toBe(23_428);
    // A weekly forecast period is the week's LTP; past the sheet, nothing.
    expect(sstpDemand({ start: '2026-09-07', end: '2026-09-13' })).toBeCloseTo(25_348, 6);
    expect(sstpDemand({ start: '2027-03-01', end: '2027-03-31' })).toBe(0);
  });

  it('the umbrella line is 440,208; the call-offs are 21,168 (received) and 32,256 (in transit); OSPO 386,784', () => {
    const po = /** @type {import('../types').PurchaseOrder} */ (
      purchaseOrderStore.all().find((p) => p.poNumber === 'PO-2026-01910')
    );
    expect(po.lineItems.map((l) => [l.materialCode, l.quantity])).toEqual([[CODE, 440_208]]);
    const offs = callOffStore.all().filter(isPair);
    expect(offs.map((c) => [c.callOffNumber, c.quantity, c.needDate])).toEqual([
      ['CO-2026-0043', 21_168, '2026-08-26'],
      ['CO-2026-0044', 32_256, '2026-09-07']
    ]);
    const balance = blanketBalances(purchaseOrderStore.all(), callOffStore.all(), 'sup-007', CODE);
    expect(balance.reduce((n, l) => n + l.balance, 0)).toBe(SSTP_FIGURES.ospo);
    expect(SSTP_FIGURES.ospo).toBe(440_208 - 21_168 - 32_256);
    expect(
      asnStore
        .all()
        .filter((a) => a.lineItems.some((l) => l.materialCode === CODE))
        .map((a) => [a.asnNumber, a.status, a.callOffId])
    ).toEqual([
      ['ASN-2026-01910', 'Delivered', 'co-0043'],
      ['ASN-2026-01911', 'In Transit', 'co-0044']
    ]);
    expect(
      goodsReceiptStore
        .all()
        .filter((g) => g.inspectionResults.some((r) => r.materialCode === CODE))
        .map((g) => [g.grNumber, g.receivedDate, g.inspectionResults[0].qtyAccepted])
    ).toEqual([['GR-2026-1910', '2026-08-26', 21_168]]);
  });

  it('the supplier declared 30,096 finished stock today', () => {
    expect(inventoryDeclarationStore.latestFor('sup-007', CODE)).toMatchObject({
      totalQty: 30_096,
      uom: 'PCS'
    });
  });
});

describe('the overrides reach this pair only', () => {
  it('the hub dataset is the generator’s, byte for byte, plus one source, material, volume, value and SAP safety stock', () => {
    const generated = generateEngineDataset(
      engineGeneratorInput(SDC_SIMULATED_NOW, ENGINE_DATASET_SEED)
    );
    const data = engineDataset();
    expect(generated.sources.some((s) => s.materialCode === CODE)).toBe(false);
    expect(JSON.stringify(data.sources.filter((s) => s.materialCode !== CODE))).toBe(
      JSON.stringify(generated.sources)
    );
    for (const key of /** @type {const} */ ([
      'materials',
      'sources',
      'volumes',
      'materialValues',
      'sapSafetyStock'
    ]))
      expect(data[key].length, key).toBe(generated[key].length + 1);
    expect(JSON.stringify(withWalkthroughPair(generated))).toBe(JSON.stringify(data));
  });

  it('the 35-day lead time is the pair’s, not sup-007’s rigid plastics', () => {
    expect(zoneLengthsFor('sup-007', 'MG-20', 'VERP', CODE).firmDays).toBe(35);
    expect(zoneLengthsFor('sup-007', 'MG-20', 'VERP', 'PK-PETB-8801').firmDays).toBe(14);
    expect(zoneLengthsFor('sup-007', 'MG-20', 'VERP').firmDays).toBe(14);
    expect(zoneLengthsFor('sup-012', 'MG-20', 'VERP', CODE).firmDays).toBe(21);
  });
});

describe('the startup seed (main.jsx), through the verbs', () => {
  beforeEach(() => {
    sdcClock.reset();
    ltpInputStore.reset();
    osipParamStore.reset();
    feedstockConfirmationStore.reset();
    demandAnticipationStore.reset();
  });
  afterEach(() => {
    ltpInputStore.reset();
    osipParamStore.reset();
    feedstockConfirmationStore.reset();
    demandAnticipationStore.reset();
  });

  it('records LTP A, Max PTI and the feedstock, once', async () => {
    const first = await seedWalkthroughSstp();
    expect(first).toEqual({
      seeded: ['t_ltpinput_set', 't_osipparam_set', 't_feedstock_confirm'],
      skipped: [],
      refused: []
    });
    expect(ltpInputStore.all().find((r) => r.materialCode === CODE)?.weeks).toEqual(SSTP_LTP_WEEKS);
    expect(osipParamStore.valueOf(`maxPti|sup-007|${CODE}`)).toBe(25_488);
    expect(feedstockConfirmationStore.all().map((f) => [f.materialCode, f.feedstockQty])).toEqual([
      [CODE, 56_409]
    ]);
    const again = await seedWalkthroughSstp();
    expect(again.seeded).toEqual([]);
    expect(again.skipped).toHaveLength(3);
  });

  it('DA reads the sheet’s LTP, SOH, lead time and OSPO for the pair', async () => {
    await seedWalkthroughSstp();
    const scope = {
      personaType: /** @type {const} */ ('buyer'),
      supplierId: null,
      businessRoles: ['planning'],
      actor: NO_PERSON
    };
    const rows = (await new MockProcurementService().getDemandAnticipation(scope)).items.filter(
      isPair
    );
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row.weeks[0]).toMatchObject({ week: DECLARED_PRESENT });
    expect(row.weeks[0].inputs?.ltp).toBe(20_067);
    expect(row.weeks[1].inputs?.ltp).toBe(25_348);
    // The figure carries the pair's lead time (5 weeks → 5 horizon weeks).
    const today = /** @type {{ leadTimeWeeks: number; horizonWeeks: string[] }} */ (
      /** @type {unknown} */ (row.today)
    );
    expect(today.leadTimeWeeks).toBe(5);
    expect(today.horizonWeeks).toHaveLength(5);
    expect(row.stockOnRecord).toBe(true);
  });
});
