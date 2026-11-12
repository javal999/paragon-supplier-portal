// ─────────────────────────────────────────────────────────────────────────────
// WHAT-IF SANDBOX — the SSTP preset (planner Excel, 4 Nov 2026), beside the
// PPT 7 golden case (BR-08). Owner (Levi) approved 2026-11-11 for the
// planners' comparison on 12 Nov 2026.
//
// Source: "Coret-coret demand ROP.xlsx", sheet "Simulasi SSTP - stable (2)",
// material 2000028400 CONTAINER SSTP REVAMP MO (analysis/e2e-walkthrough-
// 2026-11-12/EXCEL-SOURCE-SSTP.md). The preset loads the sheet's INPUTS only;
// every figure is still `runWhatIf`'s, the live plan's own functions under the
// rules in force. The app's results differ from the sheet's on purpose: that
// is what the planners compare. Nothing here is a formula.
//
// PURE. Plain data in, plain data out.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { WhatIfInputs, WhatIfSwitches } from './whatIfSandboxRules' */
import { OSIP_RULES } from './osipRules';
import { PPT7_SWITCHES, horizonOf } from './whatIfSandboxRules';

/** The SSTP case is offered under this supplier id; it names no real supplier (the sheet names none). */
export const SSTP_SUPPLIER_ID = 'sstp-excel';

/**
 * The sheet's inputs, as EXCEL-SOURCE-SSTP.md records them (cell refs are the sheet's).
 * `ltp`:  Row 20 "Consumption LTP" from W46 2026 (the sandbox's first week) to W18 2027.
 * `ltpPrior`:  Row 20, W45 2026: the week before; the sandbox's consumption history.
 * `soh`:  B13 SOH 4 Nov 2026 (B14 "SOH J603" 20,863 is not used).
 * `callOffInTransit`:  D22 call-off ETA W47.
 * `maxStockFisik` / `ropFisik`:  B11 / B12, PTI's physical max and ROP.
 */
export const SSTP_EXCEL = Object.freeze({
  material: '2000028400',
  label: 'CONTAINER SSTP REVAMP MO',
  firstWeek: 'W46 2026',
  ltp: Object.freeze([
    20067, 25348, 30091, 16806, 27268, 30131, 22027, 23388, 15385, 26729, 28710, 10063, 16666,
    15385, 18726, 13405, 13385, 16645, 16726, 20626, 30191, 23388, 30710, 30030, 22128, 23428
  ]),
  ltpPrior: 6723,
  leadTimeDays: 35,
  mpq: 27311,
  moq: 30096,
  koli: 144,
  soh: 31630,
  ospo: 386784,
  ospr: 0,
  callOffInTransit: 32256,
  maxStockFisik: 25488,
  ropFisik: 25428,
  z: 1.65
});

/**
 * The switches the SSTP case opens on: PPT 7's (SD over the lead-time weeks,
 * B2; plan check against SOH + OSPO + OSPR + PR, A2). Neither hides a figure.
 * @type {WhatIfSwitches}
 */
export const SSTP_SWITCHES = PPT7_SWITCHES;

/**
 * The SSTP sheet as sandbox inputs. Packaging (a container), so the 24-week
 * PM horizon; the sheet's W46 is the hub's planning week `weeks[0]`.
 * Readings the sheet does not state, each a build decision:
 *   · consumption = [W45 LTP]: the one week before the horizon, so ROP Fisik
 *     has a demand (the sheet states no recorded consumption);
 *   · supply area jabodetabek (f = 1 day): local, so Max rounds by koli as
 *     the sheet does; the sheet names no supplier;
 *   · the W47 call-off in transit is the planning week's released call-off:
 *     the sandbox has no later-week arrival input, so it lands on day 1;
 *   · Max = the sheet's Max Stock Fisik (B11), typed as the planner's Max.
 *     ROP Fisik has no typed input: the app computes its own.
 * @param {readonly string[]} weeks  The hub's Mondays from the planning week, at least 24.
 * @returns {WhatIfInputs}
 */
export function sstpInputs(weeks) {
  const n = horizonOf('PM');
  const horizon = weeks.slice(0, n);
  const x = SSTP_EXCEL;
  return {
    supplierId: SSTP_SUPPLIER_ID,
    materialCode: x.material,
    materialClass: 'PM',
    planningWeek: horizon[0],
    weeks: horizon,
    ltp: horizon.map((_, i) => x.ltp[i] ?? 0),
    festiveWeeks: [],
    upliftPct: 0,
    leadTime: { route: null, steps: [], days: x.leadTimeDays },
    supplyArea: 'jabodetabek',
    f: null,
    consumption: [x.ltpPrior],
    sd: null,
    bottleneckLeadTimeDays: null,
    mpq: x.mpq,
    moq: x.moq,
    koli: x.koli,
    maxOverride: x.maxStockFisik,
    soh: { J6: x.soh, J2: 0 },
    stockOnRecord: true,
    previous: false,
    ospoStart: x.ospo,
    newPoPrev: 0,
    callOffPrev: 0,
    callOff: x.callOffInTransit,
    carries: [],
    agreedFirstOutside: false,
    carryOverLimit: null,
    ospr: x.ospr,
    feedstock: null,
    level: OSIP_RULES.defaultLevel,
    npd: { firstOrderFulfilled: false, oneYearAfterLaunch: false, '52WeeksHistory': false }
  };
}
