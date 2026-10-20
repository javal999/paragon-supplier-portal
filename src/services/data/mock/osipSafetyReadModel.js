// ────────────────────────────────────────────────────────────────────────────
// BL-193 (DRC-7) and BL-197 (DRC-11) — the inputs of the OSIP safety figures
// and CV, beside the Safety stock targets read.
//
// ONE place gathers what the pure rules (`osipSafetyRules`) read:
//   · sources, lead time, MPQ, MOQ, koli — the engine dataset's purchasing
//     info records (`MaterialSource`) and pallet sizes; the lead time is
//     `leadTimeBreakdown(...).totalWeeks` (DRC-6); MPQ = orderMultiple until
//     the master data feed carries MPQ (wave 2 default);
//   · LTP — the hub's current forecast versions (`allCommitmentLines`),
//     spread by day per week (`groupWeekLtp`), as demand anticipation reads it;
//   · recorded consumption — `consumptionStore` (CAP-11), the material's
//     figure times the supplier's LTP share of the material over the share
//     window (CAP-D11, `materialShares`), the same split demand anticipation
//     and DRC-18 use, so one week's consumption is divided one way only;
//   · supply area — the supplier master's country and city (DRC-B8);
//   · FG demand for CV — the engine dataset's weekly sell-in per SKU, stock-out
//     weeks filled as the engine's forecast fills them (ENG-B62), mapped to
//     components by the BOM lines valid this week;
//   · BL-196 / BL-198 — the source's lead time by step (DRC-6), which the
//     supplier-side ROPs read, and the LTP over the next 3 months, which an NPD
//     material's ROP Fisik demand reads (DRC-10 [Default B5]); same LTP read.
// Computed at read, never stored (law 0.5); the page applies the rules, so a
// switch variant needs no new read.
// ────────────────────────────────────────────────────────────────────────────

/** @import { MaterialCv, MaterialOsipInputs, OsipSupplierInput } from '../../transitions/osipSafetyRules' */
import { mockSuppliers } from '@data/mockSuppliers';
import { sdcClock } from '../../sdc';
import { addDays, dayOf, mondayOf } from '../../engine/dates';
import { fillStockouts, historyOf } from '../../engine/demandForecast';
import { leadTimeBreakdown } from '../../engine/leadTimeSteps';
import { groupWeekLtp } from '../../transitions/capacityRules';
import { consumptionInForce } from '../../transitions/consumptionRules';
import {
  DEMAND_ANTICIPATION_RULES,
  hubWeeks,
  materialShares
} from '../../transitions/demandAnticipationRules';
import { OSIP_RULES, supplyAreaOf } from '../../transitions/osipRules';
import { fisikConsumptionWeeks, materialCvs } from '../../transitions/osipSafetyRules';
import { npdLtpWeeks } from '../../transitions/osipRopRules';
import { engineDataset } from './fixtures/engineDataset';
import { allCommitmentLines, forecastSupplierName } from './forecastReadModel';
import { consumptionStore } from './stores/consumptionStore';

/**
 * The weeks of consumption read: the longer of the two windows in force. A
 * variant with a shorter window reads the last weeks of this series; a longer
 * one reads no weeks before it (BL-210).
 */
const CONSUMPTION_WEEKS = Math.max(OSIP_RULES.consumptionSdWeeks, fisikConsumptionWeeks());

/**
 * One material's sources (the primary one first) and each supplier's share of
 * its recorded weekly consumption: the material's recorded weeks in the window
 * ending this hub week, oldest first, times the supplier's LTP share over the
 * share window (CAP-D11; BL-211 — the one split, an even one with no LTP).
 * @param {string} code
 * @param {{ readonly lines: ReturnType<typeof allCommitmentLines>; readonly inForce: ReturnType<typeof consumptionInForce>; readonly nowIso: string }} ctx
 */
function materialConsumption(code, { lines, inForce, nowIso }) {
  const week = mondayOf(dayOf(nowIso));
  /** @type {number[]} */
  const recorded = [];
  for (let i = CONSUMPTION_WEEKS - 1; i >= 0; i--) {
    const r = inForce.get(`${code}|${addDays(week, -7 * i)}`);
    if (r) recorded.push(r.qty);
  }
  const sources = engineDataset()
    .sources.filter((s) => s.materialCode === code)
    .sort((a, b) => b.share - a.share || a.supplierId.localeCompare(b.supplierId));
  const ltpShares = materialShares(
    lines,
    code,
    sources.map((s) => s.supplierId),
    hubWeeks(nowIso, DEMAND_ANTICIPATION_RULES.shareWindowWeeks)
  );
  return {
    sources,
    /** @param {string} supplierId @returns {number[]} */
    consumptionOf: (supplierId) => recorded.map((q) => q * (ltpShares.get(supplierId) ?? 0))
  };
}

/**
 * BL-210 — what ROP Order's safety order reads for a pair besides its LTP,
 * lead time and MPQ: the supplier's share of the recorded consumption, MOQ and
 * koli, exactly as `osipSafetyInputs` gathers them. Keyed `supplierId|materialCode`,
 * one entry per engine source. The rolling demand anticipation passes them to
 * `rollingDaFigure`, so its week-1 safety order is ROP Order's under every switch.
 * @param {string} [nowIso]
 * @returns {Map<string, { consumption: number[]; moq: number; koli: number | null }>}
 */
export function osipSafetySizes(nowIso = sdcClock.now()) {
  const data = engineDataset();
  const ctx = {
    lines: allCommitmentLines(null),
    inForce: consumptionInForce(consumptionStore.all()),
    nowIso
  };
  const perPallet = new Map(data.volumes.map((v) => [v.materialCode, v.unitsPerPallet]));
  /** @type {Map<string, { consumption: number[]; moq: number; koli: number | null }>} */
  const out = new Map();
  for (const code of new Set(data.sources.map((s) => s.materialCode))) {
    const { sources, consumptionOf } = materialConsumption(code, ctx);
    for (const s of sources)
      out.set(`${s.supplierId}|${code}`, {
        consumption: consumptionOf(s.supplierId),
        moq: s.moq,
        koli: perPallet.get(code) ?? null
      });
  }
  return out;
}

/**
 * BL-193 / BL-197 — the OSIP inputs of every engine material, at the hub clock.
 * @param {string} [nowIso]
 * @returns {Map<string, MaterialOsipInputs>}
 */
export function osipSafetyInputs(nowIso = sdcClock.now()) {
  const data = engineDataset();
  const lines = allCommitmentLines(null);
  const week = mondayOf(dayOf(nowIso));
  const inForce = consumptionInForce(consumptionStore.all());
  const perPallet = new Map(data.volumes.map((v) => [v.materialCode, v.unitsPerPallet]));

  // DRC-11 — each SKU's weekly demand before this week, stock-outs filled.
  /** @type {Map<string, number[]>} */
  const skuWeekly = new Map();
  for (const fg of data.finishedGoods) {
    const h = historyOf(
      data.sales.filter((s) => s.skuCode === fg.skuCode),
      week
    );
    if (h) skuWeekly.set(fg.skuCode, fillStockouts(h.qty, h.stockout));
  }
  const bomLinks = data.bom.filter(
    (b) => b.validFrom <= week && (b.validTo === undefined || week < b.validTo)
  );
  const cvs = materialCvs({
    skuWeekly,
    bomLinks,
    materialCodes: data.materials.map((m) => m.materialCode)
  });

  /** @type {Map<string, MaterialOsipInputs>} */
  const out = new Map();
  for (const m of data.materials) {
    const code = m.materialCode;
    const { sources, consumptionOf } = materialConsumption(code, { lines, inForce, nowIso });
    const suppliers = sources.map((s) => {
      const breakdown = leadTimeBreakdown(s);
      const leadTimeWeeks = breakdown.totalWeeks;
      const supplier = mockSuppliers.find((x) => x.id === s.supplierId);
      return /** @type {OsipSupplierInput} */ ({
        supplierId: s.supplierId,
        supplierName: forecastSupplierName(s.supplierId),
        materialCode: code,
        ltp: hubWeeks(nowIso, Math.max(1, leadTimeWeeks)).map((w) =>
          groupWeekLtp(lines, s.supplierId, [code], w)
        ),
        leadTimeWeeks,
        // [Default, wave 2] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default).
        mpq: s.orderMultiple,
        moq: s.moq,
        koli: perPallet.get(code) ?? null,
        consumption: consumptionOf(s.supplierId),
        supplyArea: supplier ? supplyAreaOf(supplier) : null,
        // BL-196 — DRC-6 steps, for ROP Supplier / FS / to principal.
        leadTimeSteps: breakdown.steps,
        // BL-198 — DRC-10 "highest LTP over the next 3 months" (NPD).
        ltpNext3m: hubWeeks(nowIso, npdLtpWeeks()).map((w) =>
          groupWeekLtp(lines, s.supplierId, [code], w)
        )
      });
    });
    out.set(code, {
      suppliers,
      cv: /** @type {MaterialCv} */ (cvs.get(code))
    });
  }
  return out;
}
