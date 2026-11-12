// ─────────────────────────────────────────────────────────────────────────────
// The SSTP preset (planner Excel "Simulasi SSTP - stable (2)", 4 Nov 2026).
//
// Two kinds of assertion, kept apart on purpose:
//   1. GOLDEN — what the app computes for the sheet's inputs today, pinned so a
//      rule change shows up here by name (the figures the planners compare on
//      12 Nov 2026).
//   2. EXCEL BESIDE IT — the sheet's own figures (EXCEL-SOURCE-SSTP.md,
//      reproduced by analysis/.../build/excel_model.py), recorded next to the
//      app's. Only the figures the app is meant to match are asserted equal;
//      the rest are asserted to DIFFER, so a silent convergence is seen too.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { safetyOrder } from './osipRules';
import { daNotCalledOff, poOnHoldQty } from './poOnHold';
import { feedstockRemainders } from './feedstockReconcile';
import { PPT7_SWITCHES, changedSwitches, inputsProblem, runWhatIf } from './whatIfSandboxRules';
import { SSTP_EXCEL, SSTP_SUPPLIER_ID, SSTP_SWITCHES, sstpInputs } from './whatIfSstpPreset';

/** The hub's Mondays from 2026-08-31 (the hub's present), enough for the PM horizon. */
const MONDAYS = Array.from({ length: 30 }, (_, i) =>
  new Date(Date.UTC(2026, 7, 31) + i * 7 * 86_400_000).toISOString().slice(0, 10)
);

const inputs = () => sstpInputs(MONDAYS);
const run = () => runWhatIf(inputs(), SSTP_SWITCHES);

/**
 * The comparison figures the app gives for the sheet, from the rule functions.
 * PO On Hold and the feedstock reconcile are not sandbox figures: they are
 * read by their own rules (`poOnHold`, `feedstockReconcile`) on the run's DA.
 */
function appFigures() {
  const r = run();
  const da = /** @type {NonNullable<typeof r.da>} */ (r.da);
  const i = inputs();
  const ssRaw = safetyOrder(
    { ltp: r.weeks.map((w) => w.ltp), leadTimeWeeks: da.leadTimeWeeks, mpq: i.mpq },
    SSTP_SWITCHES.osip
  ).raw;
  const notCalled = daNotCalledOff(
    da.horizonWeeks.map((_, k) => ({ da: da.daInForce[k], calledOff: k === 0 ? i.callOff : 0 }))
  );
  return {
    run: r,
    daRaw: da.weeks.map((w) => w.da),
    daInForce: [...da.daInForce],
    totalDa: da.totalDa,
    cycleStock: da.cycleStock,
    ssRaw,
    ss: da.safetyOrder,
    ropOrder: da.ropOrder,
    pr: da.pr,
    gap: da.gap,
    poOnHold: poOnHoldQty({ ospo: da.ospo, daNotCalledOff: notCalled }),
    // The W47 call-off is released against the same PO, not yet shipped.
    fsNotYetCalledOff: feedstockRemainders({
      poOrdered: i.ospoStart + i.callOff,
      calledOff: i.callOff,
      asnRequested: 0
    }).notYetCalledOff,
    ropFisik: r.rops.ropFisik.value,
    maxSystem: r.rops.max.value,
    max: r.max
  };
}

describe('SSTP preset — inputs', () => {
  it('loads the sheet: W46 LTP first, lead time 35 days, MPQ/MOQ/koli, SOH J6, OSPO, call-off, Max', () => {
    const i = inputs();
    expect(i.supplierId).toBe(SSTP_SUPPLIER_ID);
    expect(i.materialCode).toBe('2000028400');
    expect(i.materialClass).toBe('PM');
    expect(i.weeks).toHaveLength(24);
    expect(i.ltp.slice(0, 3)).toEqual([20067, 25348, 30091]);
    expect(i.ltp[23]).toBe(30030);
    expect(i.consumption).toEqual([6723]);
    expect(i.leadTime?.days).toBe(35);
    expect([i.mpq, i.moq, i.koli]).toEqual([27311, 30096, 144]);
    expect(i.soh).toEqual({ J6: 31630, J2: 0 });
    expect([i.ospoStart, i.ospr, i.callOff, i.maxOverride]).toEqual([386784, 0, 32256, 25488]);
    expect(inputsProblem(i)).toBeNull();
  });

  it('opens on the PPT 7 switches (B2 SD over the lead-time weeks, A2 SOH + OSPO + OSPR + PR)', () => {
    expect(SSTP_SWITCHES).toBe(PPT7_SWITCHES);
    expect(changedSwitches(SSTP_SWITCHES)).toEqual(['osip.planCheckBasis', 'osip.sdSource']);
  });
});

describe('SSTP preset — golden: what the app computes today', () => {
  it('pins DA, ROP Order, safety, ROP Fisik, Max, PR, plan check, PO On Hold and feedstock', () => {
    const a = appFigures();
    expect(a.run.leadTimeWeeks).toBe(5);
    expect(a.daRaw).toEqual([47378, 25348, 30091, 16806, 27268]);
    expect(a.daInForce).toEqual([47378, 25348, 30091, 16806, 0]);
    expect(a.totalDa).toBe(146891);
    expect(a.cycleStock).toBe(119580);
    expect(Math.round(a.ssRaw)).toBe(19936);
    expect(a.ss).toBe(27311);
    expect(a.ropOrder).toBe(146891);
    expect(a.pr).toBe(0);
    expect(a.gap).toBe(-271523);
    expect(a.run.da?.supply).toBe(418414);
    expect(a.run.da?.remainder).toBe(15122);
    expect(a.poOnHold).toBe(299417);
    expect(a.fsNotYetCalledOff).toBe(386784);
    expect(a.ropFisik).toBe(54622);
    expect(a.maxSystem).toBe(54720);
    expect(a.max).toBe(25488);
    expect(a.run.maxSource).toBe('override');
    expect(a.run.totalDrafted).toBe(386784);
    expect(a.run.triggerPr).toBe(92424);
    expect(a.run.firstShortageWeek).toBe('2027-01-25');
    expect(a.run.flags).toEqual([]);
  });
});

/** The sheet's figures (EXCEL-SOURCE-SSTP.md; excel_model.py reproduces each). */
const EXCEL = Object.freeze({
  daW46toW52: [0, 0, 60192, 0, 30096, 30096, 30096],
  totalDa: 150480,
  cycleStock: 129644,
  ssRaw: 23212,
  ss: 27311,
  ropOrder: 156955,
  pr: 0,
  daMinusOspo: -236304,
  poOnHold: 216903,
  fsReconcile: 270183,
  ropFisik: 25428,
  max: 25488
});

describe('SSTP preset — the Excel beside the app', () => {
  const a = appFigures();

  it('matches where the app is meant to: SS order 27,311 after MPQ rounding, PR 0, Max (typed)', () => {
    expect(a.ss).toBe(EXCEL.ss);
    expect(a.pr).toBe(EXCEL.pr);
    expect(a.max).toBe(EXCEL.max);
    expect(SSTP_EXCEL.z).toBe(SSTP_SWITCHES.osip.z);
  });

  it('differs where the rules differ (known, listed in SANDBOX-SSTP-COMPARISON.md)', () => {
    expect(a.daRaw).not.toEqual(EXCEL.daW46toW52.slice(0, 5));
    expect(a.totalDa).not.toBe(EXCEL.totalDa);
    expect(a.cycleStock).not.toBe(EXCEL.cycleStock);
    expect(Math.round(a.ssRaw)).not.toBe(EXCEL.ssRaw);
    expect(a.ropOrder).not.toBe(EXCEL.ropOrder);
    expect(a.totalDa - SSTP_EXCEL.ospo).not.toBe(EXCEL.daMinusOspo);
    expect(a.poOnHold).not.toBe(EXCEL.poOnHold);
    expect(a.fsNotYetCalledOff).not.toBe(EXCEL.fsReconcile);
    expect(a.ropFisik).not.toBe(EXCEL.ropFisik);
  });
});
