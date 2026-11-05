// ────────────────────────────────────────────────────────────────────────────
// BL-202 (DRC-17) — the what-if sandbox's live inputs and saved scenarios.
//
// ONE place gathers today's live values for one supplier × material (BR-02),
// from the read models the live plan itself reads, so "the current plan" in
// the sandbox is the live plan's figure:
//   · lead time, MPQ, MOQ, pallet, consumption, supply area, LTP over the next
//     3 months — `osipSafetyInputs` (BL-193/196), the Safety stock read;
//   · level and NPD tags — `osipRopInputs` (BL-196/198);
//   · the DA position (SOH share, OSPO chain, call-offs, carries, agreement) —
//     the rolling DA's own inputs (`demandAnticipationToPublish`, BL-188) for
//     a pair the LTP names; for any other pair the same sources the DA reads
//     (PTI stock × LTP share, CAP-12's blanket balance, released call-offs);
//   · SOH per plant — `ptiStockStore` (DRC-D12), the pair's share of each plant;
//   · LTP over the sandbox horizon — the current forecast versions
//     (`groupWeekLtp`), as DA and capacity read them;
//   · festive weeks — the demand-event calendar's windows (`festiveWindows`,
//     DRC-9a), where the uplift applies;
//   · feedstock — the supplier's confirmation in force (BL-194).
// Computed at read, never stored (law 0.5). The sandbox runs on the page.
//
// BR-08 — the PPT 7 golden case (`__fixtures__/osipGolden.json`) is offered as
// one more pair, `PPT7_SUPPLIER_ID`, so its scenarios save and compare too.
// ────────────────────────────────────────────────────────────────────────────

/** @import { MaterialClass, WhatIfInputs } from '../../transitions/whatIfSandboxRules' */
/** @import { WhatIfScenario } from './stores/whatIfScenarioStore' */
/** @import { NpdRule } from '../../transitions/osipRopRules' */
import golden from '../../transitions/__fixtures__/osipGolden.json';
import { materialEntry, sdcClock } from '../../sdc';
import { leadTimeBreakdown } from '../../engine/leadTimeSteps';
import { groupWeekLtp } from '../../transitions/capacityRules';
import {
  DEMAND_ANTICIPATION_RULES,
  chainFor,
  hubWeeks,
  materialShares
} from '../../transitions/demandAnticipationRules';
import { blanketBalances, openSupplyIndex } from '../../transitions/supplyBelowDemandRules';
import { addDays } from '../../transitions/inventoryRules';
import { festiveWindows } from '../../transitions/drcBufferRules';
import { NPD_RULES } from '../../transitions/osipRopRules';
import { OSIP_RULES, RULES_VERSION } from '../../transitions/osipRules';
import { cycleDaysOf } from '../../transitions/osipParams';
import { primarySource } from '../../engine/requirement';
import {
  PPT7_SUPPLIER_ID,
  horizonOf,
  materialClassOf,
  ppt7Inputs,
  rulesChangedSince
} from '../../transitions/whatIfSandboxRules';
import { osipSafetyInputs } from './osipSafetyReadModel';
import { osipRopInputs } from './osipRopReadModel';
import { demandAnticipationToPublish } from './demandAnticipationReadModel';
import { feedstockInForce } from './feedstockConfirmationReadModel';
import { allCommitmentLines, forecastSupplierName } from './forecastReadModel';
import { engineDataset } from './fixtures/engineDataset';
import { ptiStockStore } from './stores/ptiStockStore';
import { purchaseOrderStore } from './stores/purchaseOrderStore';
import { callOffStore } from './stores/callOffStore';
import { demandAnticipationStore } from './stores/demandAnticipationStore';
import { whatIfScenarioStore } from './stores/whatIfScenarioStore';

/**
 * One supplier × material the sandbox offers (BR-01).
 * `preset`:  The PPT 7 golden case (BR-08), not a live pair.
 * `inPlan`:  The LTP names the pair, so the rolling DA holds its position.
 * `primary`:  The material's primary supplier (`primarySource`, the largest
 *   share), the pair `?material=` alone opens (U-09, BL-247).
 * @typedef {{
 *   readonly supplierId: string;
 *   readonly supplierName: string;
 *   readonly materialCode: string;
 *   readonly materialLabel: string;
 *   readonly uom: string;
 *   readonly materialClass: MaterialClass;
 *   readonly horizonWeeks: number;
 *   readonly preset: boolean;
 *   readonly inPlan: boolean;
 *   readonly primary: boolean;
 * }} WhatIfPair
 */

/**
 * A saved scenario as the page reads it. `rulesChanged`: saved under another
 * `RULES_VERSION` than the one in force (BR-05).
 * @typedef {WhatIfScenario & { readonly rulesChanged: boolean }} WhatIfScenarioView
 */

/**
 * The sandbox of one pair: today's live inputs and its saved scenarios.
 * @typedef {{
 *   readonly pair: WhatIfPair;
 *   readonly live: WhatIfInputs;
 *   readonly scenarios: readonly WhatIfScenarioView[];
 *   readonly rulesVersion: string;
 *   readonly own: { readonly z: number | null; readonly g: number | null };
 * }} WhatIfSandbox
 */

/**
 * BR-04 — RM or PM: the master's SAP type, else the engine's warehouse kind.
 * @param {string} materialCode
 * @returns {MaterialClass}
 */
function classOf(materialCode) {
  const kind = engineDataset().materials.find((m) => m.materialCode === materialCode)?.kind;
  return materialClassOf(materialEntry(materialCode)?.materialType ?? null, kind ?? null);
}

/**
 * Whether the sandbox offers the pair (the save verb's check).
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {boolean}
 */
export function isWhatIfPair(supplierId, materialCode) {
  if (supplierId === PPT7_SUPPLIER_ID) return materialCode === golden.ppt7.material;
  const data = engineDataset();
  return (
    data.materials.some((m) => m.materialCode === materialCode) &&
    data.sources.some((s) => s.supplierId === supplierId && s.materialCode === materialCode)
  );
}

/** @returns {WhatIfPair} */
const ppt7Pair = () => ({
  supplierId: PPT7_SUPPLIER_ID,
  supplierName: '',
  materialCode: golden.ppt7.material,
  materialLabel: '',
  uom: 'PCS',
  materialClass: 'PM',
  horizonWeeks: horizonOf('PM'),
  preset: true,
  inPlan: false,
  primary: false
});

/**
 * BR-01 — every pair the sandbox offers: the PPT 7 case first, then every
 * supplier × material the Safety stock read holds, by material then supplier.
 * @param {string} [nowIso]
 * @returns {WhatIfPair[]}
 */
export function whatIfPairs(nowIso = sdcClock.now()) {
  const osip = osipSafetyInputs(nowIso);
  const { sources } = engineDataset();
  const inPlan = new Set(
    demandAnticipationToPublish([], nowIso).figures.map((f) => `${f.supplierId}|${f.materialCode}`)
  );
  /** @type {WhatIfPair[]} */
  const live = [];
  for (const [code, m] of osip) {
    const entry = materialEntry(code);
    const materialClass = classOf(code);
    for (const s of m.suppliers)
      live.push({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        materialCode: code,
        materialLabel: entry?.label ?? code,
        uom: entry?.canonicalUom ?? '',
        materialClass,
        horizonWeeks: horizonOf(materialClass),
        preset: false,
        inPlan: inPlan.has(`${s.supplierId}|${code}`),
        primary: primarySource(sources, code)?.supplierId === s.supplierId
      });
  }
  live.sort(
    (a, b) =>
      a.materialCode.localeCompare(b.materialCode) || a.supplierName.localeCompare(b.supplierName)
  );
  return [ppt7Pair(), ...live];
}

/**
 * The weeks of the horizon whose Monday falls in a festive window's month.
 * @param {readonly string[]} weeks
 * @returns {string[]}
 */
function festiveWeeksOf(weeks) {
  const months = new Set(festiveWindows().flatMap((w) => w.months));
  return weeks.filter((w) => months.has(w.slice(0, 7)));
}

/**
 * The pair's share of each plant's SOH (DRC-D12), summing to `pairSoh`.
 * @param {string} materialCode
 * @param {number} pairSoh
 * @returns {{ J6: number; J2: number }}
 */
function plantSplit(materialCode, pairSoh) {
  const records = ptiStockStore.forMaterial(materialCode);
  const total = records.reduce((n, r) => n + r.ptiSoh, 0);
  const j6 = records.filter((r) => r.plant === 'J6').reduce((n, r) => n + r.ptiSoh, 0);
  const atJ6 = total > 0 ? Math.round((pairSoh * j6) / total) : pairSoh;
  return { J6: atJ6, J2: pairSoh - atJ6 };
}

/**
 * BR-02 — today's live inputs of one pair, or null when the sandbox does not
 * offer it.
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} [nowIso]
 * @returns {WhatIfInputs | null}
 */
export function whatIfLiveInputs(supplierId, materialCode, nowIso = sdcClock.now()) {
  const materialClass = classOf(materialCode);
  if (supplierId === PPT7_SUPPLIER_ID) {
    if (materialCode !== golden.ppt7.material) return null;
    return ppt7Inputs(golden.ppt7, hubWeeks(nowIso, horizonOf('PM')));
  }
  const s = osipSafetyInputs(nowIso)
    .get(materialCode)
    ?.suppliers.find((x) => x.supplierId === supplierId);
  if (!s) return null;
  const rop = osipRopInputs([materialCode], nowIso).get(materialCode);
  const source = engineDataset().sources.find(
    (x) => x.supplierId === supplierId && x.materialCode === materialCode
  );
  const weeks = hubWeeks(nowIso, horizonOf(materialClass));
  const lines = allCommitmentLines(null);
  const planningWeek = weeks[0];

  // The DA position — the rolling DA's own inputs when the LTP names the pair,
  // with the agreements of the publication in force (BL-188).
  const first = demandAnticipationToPublish([], nowIso);
  const agreed = first.inForce?.agreedFirstOutside ?? [];
  const ctx = agreed.length > 0 ? demandAnticipationToPublish(agreed, nowIso) : first;
  const da = ctx.figures.find(
    (f) => f.supplierId === supplierId && f.materialCode === materialCode
  );
  const combined = ptiStockStore.forMaterial(materialCode);
  const stockOnRecord = combined.length > 0;
  /** @type {number} */
  let pairSoh;
  if (da) pairSoh = da.inputs.soh ?? 0;
  else {
    // CAP-D11 — the supplier's share of the material's LTP over the share window.
    const share =
      materialShares(
        lines,
        materialCode,
        engineDataset()
          .sources.filter((x) => x.materialCode === materialCode)
          .map((x) => x.supplierId),
        hubWeeks(nowIso, DEMAND_ANTICIPATION_RULES.shareWindowWeeks)
      ).get(supplierId) ?? 0;
    pairSoh = Math.round(share * combined.reduce((n, r) => n + r.ptiSoh, 0));
  }
  const supply = openSupplyIndex(callOffStore.all());
  const chain = chainFor(demandAnticipationStore.all(), supplierId, materialCode, planningWeek);
  const ospoOpen = blanketBalances(
    purchaseOrderStore.all(),
    callOffStore.all(),
    supplierId,
    materialCode
  ).reduce((n, l) => n + l.balance, 0);
  const previous = da ? da.inputs.previous : chain.previous;
  const lt = source ? leadTimeBreakdown(source) : null;
  /** @type {Record<NpdRule, boolean>} */
  const npd = /** @type {Record<NpdRule, boolean>} */ (
    Object.fromEntries(NPD_RULES.map((r) => [r, rop ? rop.npd[r].npd : false]))
  );
  return {
    supplierId,
    materialCode,
    materialClass,
    planningWeek,
    weeks,
    ltp: weeks.map((w) => groupWeekLtp(lines, supplierId, [materialCode], w)),
    festiveWeeks: festiveWeeksOf(weeks),
    upliftPct: 0,
    leadTime: lt ? { route: lt.route, steps: [...lt.steps], days: lt.totalDays } : null,
    supplyArea: s.supplyArea,
    // [Team B6] the supplier's own f, else its area's.
    f: cycleDaysOf(s.fDays, s.supplyArea),
    consumption: [...s.consumption],
    // BL-210 — no typed SD: computed per `sdSource`.
    sd: null,
    // [Team B10] the planner's value, null when not set.
    bottleneckLeadTimeDays: s.bottleneckLeadTimeDays ?? null,
    // [Default, wave 2] MPQ = orderMultiple until the master data feed carries MPQ (wave 2 default).
    mpq: s.mpq,
    moq: s.moq,
    koli: s.koli,
    maxOverride: null,
    soh: plantSplit(materialCode, pairSoh),
    stockOnRecord: da ? da.inputs.soh !== null : stockOnRecord,
    previous: previous !== null,
    ospoStart: previous ? previous.ospo : da ? da.inputs.ospoOpen : ospoOpen,
    newPoPrev: previous ? previous.additionalPo : 0,
    callOffPrev: da
      ? da.inputs.callOffPrev
      : (supply.get(`${supplierId}|${materialCode}|${addDays(planningWeek, -7)}`) ?? 0),
    callOff: da
      ? da.inputs.callOff
      : (supply.get(`${supplierId}|${materialCode}|${planningWeek}`) ?? 0),
    carries: da ? [...da.inputs.carries] : chain.carries,
    agreedFirstOutside: da ? da.inputs.agreedFirstOutside : false,
    // [Default A8b] — the hub holds no sales-order quantity per supplier × material.
    carryOverLimit: da ? da.inputs.salesOrderQty4w : null,
    // DRC-B17 — the hub's PRs carry no material code.
    ospr: da ? da.inputs.ospr : null,
    feedstock: feedstockInForce(supplierId, materialCode)?.feedstockQty ?? null,
    level: rop ? rop.level.level : OSIP_RULES.defaultLevel,
    npd
  };
}

/**
 * The saved scenarios of a pair, oldest first, each flagged when the rules
 * changed since it was saved (BR-05).
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {WhatIfScenarioView[]}
 */
export function whatIfScenarios(supplierId, materialCode) {
  return whatIfScenarioStore
    .forPair(supplierId, materialCode)
    .map((s) => ({ ...s, rulesChanged: rulesChangedSince(s) }));
}

/**
 * DRC-17 — one pair's sandbox: the pair, today's live inputs and its saved
 * scenarios; null when the sandbox does not offer the pair.
 * @param {string} supplierId
 * @param {string} materialCode
 * @param {string} [nowIso]
 * @returns {WhatIfSandbox | null}
 */
export function whatIfSandbox(supplierId, materialCode, nowIso = sdcClock.now()) {
  if (!isWhatIfPair(supplierId, materialCode)) return null;
  const live = whatIfLiveInputs(supplierId, materialCode, nowIso);
  if (!live) return null;
  const entry = materialEntry(materialCode);
  /** @type {WhatIfPair} */
  const pair =
    supplierId === PPT7_SUPPLIER_ID
      ? ppt7Pair()
      : {
          supplierId,
          supplierName: forecastSupplierName(supplierId),
          materialCode,
          materialLabel: entry?.label ?? materialCode,
          uom: entry?.canonicalUom ?? '',
          materialClass: live.materialClass,
          horizonWeeks: live.weeks.length,
          preset: false,
          inPlan: demandAnticipationToPublish([], nowIso).figures.some(
            (f) => f.supplierId === supplierId && f.materialCode === materialCode
          ),
          primary: primarySource(engineDataset().sources, materialCode)?.supplierId === supplierId
        };
  // [Team B3, B7] the material's own Z and g: the switches the pair opens on.
  const s = osipSafetyInputs(nowIso)
    .get(materialCode)
    ?.suppliers.find((x) => x.supplierId === supplierId);
  return {
    pair,
    live,
    scenarios: whatIfScenarios(supplierId, materialCode),
    rulesVersion: RULES_VERSION,
    own: { z: s?.z ?? null, g: s?.g ?? null }
  };
}
