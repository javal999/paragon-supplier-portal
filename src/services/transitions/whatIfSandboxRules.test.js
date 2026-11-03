// ─────────────────────────────────────────────────────────────────────────────
// BL-202 (DRC-17) — the what-if sandbox's run, over the live plan's own
// functions. The PPT 7 golden case reproduces (BR-08); a sample of switches
// each move the figure they should and leave the rest (BR-02); the difference
// against the current plan is worked by hand for two materials (BR-03); the
// horizon is 52 weeks for RM and 24 for PM (BR-04).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import golden from './__fixtures__/osipGolden.json';
import { OSIP_RULES, RULES_VERSION } from './osipRules';
import { npdLtpWeeks } from './osipRopRules';
import {
  DEFAULT_SWITCHES,
  HEADLINE_KEYS,
  PPT7_SUPPLIER_ID,
  PPT7_SWITCHES,
  SWITCH_CATALOG,
  WHAT_IF_RULES,
  changedSwitches,
  compareRuns,
  headline,
  horizonOf,
  inputsProblem,
  materialClassOf,
  mergeSwitches,
  ppt7Inputs,
  rulesChangedSince,
  runWhatIf,
  scenarioRefusal,
  switchValue,
  withSwitch
} from './whatIfSandboxRules';
/** @import { HeadlineKey, WhatIfInputs, WhatIfRun, WhatIfSwitches } from './whatIfSandboxRules' */

/** The hub's Mondays from 2026-08-31, enough for either horizon. */
const MONDAYS = Array.from({ length: 60 }, (_, i) =>
  new Date(Date.UTC(2026, 7, 31) + i * 7 * 86_400_000).toISOString().slice(0, 10)
);

const ppt7 = () => ppt7Inputs(golden.ppt7, MONDAYS);

/**
 * A small packaging material worked by hand below: 70 a week (10 a day), lead
 * time 2 weeks, MPQ 10, pallet 50, Jabodetabek (f = 1 day), 100 in stock, an
 * open PO of 1,000 not yet called off, 13 recorded weeks of 70.
 * @param {Partial<WhatIfInputs>} [over]
 * @returns {WhatIfInputs}
 */
const hand = (over = {}) => ({
  ...ppt7(),
  supplierId: 'sup-007',
  materialCode: 'PK-HAND',
  ltp: MONDAYS.slice(0, 24).map(() => 70),
  leadTime: { route: null, steps: [], days: 14 },
  supplyArea: 'jabodetabek',
  f: null,
  consumption: Array.from({ length: 13 }, () => 70),
  mpq: 10,
  moq: 10,
  koli: 50,
  soh: { J6: 0, J2: 100 },
  ospoStart: 1000,
  ...over
});

/**
 * @param {WhatIfRun} run
 * @param {HeadlineKey} key
 */
const h = (run, key) => headline(run, key);

describe('BR-08 · the PPT 7 golden case reproduces (bottle 2000041501)', () => {
  // On the readings the slide used, kept as variants on 2026-10-28 [B2, A2].
  const run = runWhatIf(ppt7(), PPT7_SWITCHES);
  const e = golden.ppt7.expected;

  it('safety order 244,896 and ROP Order 761,888', () => {
    expect(run.safety.safetyOrder.value).toBe(e.safetyOrder);
    expect(run.rops.ropOrder.value).toBe(e.ropOrder);
    expect(run.rops.ropOrder.cycleStock).toBe(e.cycleStock);
  });

  it('incoming DA W33–W37 and its total; PR need 645,559; the check gap is 0', () => {
    expect(run.da?.weeks.map((w) => w.da)).toEqual(e.incomingDa);
    expect(run.totalDa).toBe(e.totalDa);
    expect(run.prNeed).toBe(-e.prGenerated);
    expect(run.da?.gap).toBe(e.planCheckGap);
    expect(run.prRecommendation).toBe(0);
  });

  it('is a packaging case on the 24-week horizon, on two switches away from the rules in force', () => {
    const i = ppt7();
    expect(i.supplierId).toBe(PPT7_SUPPLIER_ID);
    expect(i.weeks).toHaveLength(24);
    expect(i.materialClass).toBe('PM');
    expect(changedSwitches(DEFAULT_SWITCHES)).toEqual([]);
    expect(changedSwitches(PPT7_SWITCHES)).toEqual(['osip.planCheckBasis', 'osip.sdSource']);
    expect(changedSwitches(PPT7_SWITCHES, PPT7_SWITCHES)).toEqual([]);
  });

  it('[Team B2, A2] under the rules in force: SS 183,672; Total DA against Total OSPO', () => {
    // 13 weeks: the slide's 12, then 0 → SD 46,853.1 → 1.65 × √5 × 46,853.1 = 172,865 → 3 × 61,224.
    const now = runWhatIf(ppt7());
    expect(now.safety.safetyOrder.value).toBe(183672);
    expect(now.da?.supply).toBe(golden.ppt7.ospo);
    expect(now.da?.gap).toBe(now.totalDa);
  });

  it('with no consumption or supply area, ROP Fisik, Max and the trigger read not available', () => {
    expect(run.rops.ropFisik.value).toBeNull();
    expect(run.max).toBeNull();
    expect(run.flags).toContain('NO_TRIGGER');
    expect(run.totalDrafted).toBe(0);
  });
});

describe('BR-02 · each switch moves the figure it should and nothing else (sample)', () => {
  /**
   * The headline keys whose value differs between two runs.
   * @param {WhatIfInputs} inputs
   * @param {WhatIfSwitches} switches
   */
  const moved = (inputs, switches, base = DEFAULT_SWITCHES) =>
    compareRuns(runWhatIf(inputs, base), runWhatIf(inputs, switches))
      .filter((d) => d.changed)
      .map((d) => d.key);

  it('z [B3] moves the safety order and what is built on it, not ROP Fisik or Max', () => {
    const keys = moved(ppt7(), withSwitch(DEFAULT_SWITCHES, 'osip.z', 2));
    expect(keys).toEqual(expect.arrayContaining(['safetyOrder', 'ropOrder', 'totalDa', 'prNeed']));
    expect(keys).not.toContain('ropFisik');
    expect(keys).not.toContain('max');
  });

  it('daSafetyPlacement spread [A1] moves the DA weeks, not their total or ROP Order', () => {
    const plan = runWhatIf(ppt7(), PPT7_SWITCHES);
    const spread = runWhatIf(ppt7(), withSwitch(PPT7_SWITCHES, 'osip.daSafetyPlacement', 'spread'));
    expect(spread.da?.weeks[0].safety).toBe(48980);
    expect(spread.totalDa).toBe(plan.totalDa);
    expect(
      compareRuns(plan, spread)
        .filter((d) => d.changed)
        .map((d) => d.key)
    ).not.toContain('ropOrder');
  });

  it('planCheckBasis [A2] moves only the PR recommendation of the check', () => {
    for (const basis of ['ospoOsprPr', 'totalOspo'])
      expect(
        moved(ppt7(), withSwitch(PPT7_SWITCHES, 'osip.planCheckBasis', basis), PPT7_SWITCHES),
        basis
      ).toEqual(['prRecommendation']);
  });

  it('sdSource [B2] moves the safety order and what is built on it', () => {
    const keys = moved(ppt7(), withSwitch(PPT7_SWITCHES, 'osip.sdSource', 'ltp13w'), PPT7_SWITCHES);
    expect(keys).toEqual(expect.arrayContaining(['safetyOrder', 'ropOrder', 'totalDa']));
  });

  it('g [B7] moves ROP Fisik (and Max and the trigger), not the safety order', () => {
    const keys = moved(hand(), withSwitch(DEFAULT_SWITCHES, 'osip.fixedSafetyDays', 3));
    expect(keys).toContain('ropFisik');
    expect(keys).not.toContain('safetyOrder');
    expect(keys).not.toContain('ropOrder');
  });

  it('maxRule sheetGuidance [B8] moves Max, not ROP Fisik or ROP Order', () => {
    const keys = moved(hand(), withSwitch(DEFAULT_SWITCHES, 'osip.maxRule', 'sheetGuidance'));
    expect(keys).toContain('max');
    expect(keys).not.toContain('ropFisik');
    expect(keys).not.toContain('ropOrder');
  });

  it('a switch that feeds no sandbox figure moves none (cvThreshold [C1])', () => {
    expect(moved(hand(), withSwitch(DEFAULT_SWITCHES, 'osip.cvThreshold', 0.1))).toEqual([]);
  });

  it('the catalogue holds every OSIP_RULES key but replenishmentCycleDays (edited as f)', () => {
    const keys = SWITCH_CATALOG.filter((s) => s.path.startsWith('osip.')).map((s) =>
      s.path.slice(5)
    );
    expect(new Set(keys)).toEqual(
      new Set(Object.keys(OSIP_RULES).filter((k) => k !== 'replenishmentCycleDays'))
    );
    // And the later modules' switches, each with its question ID.
    for (const [path, q] of [
      ['npdRule', 'D1'],
      ['plantComparison', 'F1'],
      ['maxCap', 'A7'],
      ['reArm', 'F2'],
      ['productionLimitSource', 'E3']
    ])
      expect(SWITCH_CATALOG.find((s) => s.path === path)?.question).toBe(q);
    for (const s of SWITCH_CATALOG)
      expect(switchValue(DEFAULT_SWITCHES, s.path), s.path).not.toBeUndefined();
  });
});

describe('BR-03 · the difference against the current plan, worked by hand', () => {
  it('PPT 7 with 100,000 more SOH: PR need 645,559 → 545,559; first shortage W1 → W2', () => {
    const plan = runWhatIf(ppt7(), PPT7_SWITCHES);
    const more = runWhatIf(
      { ...ppt7(), soh: { J6: 0, J2: golden.ppt7.soh + 100_000 } },
      PPT7_SWITCHES
    );
    const diff = Object.fromEntries(compareRuns(plan, more).map((d) => [d.key, d]));
    // PR need = ROP Order − SOH − OSPO − OSPR = 761,888 − 216,329 − 0 − 0.
    expect(diff.prNeed).toMatchObject({ plan: 645_559, scenario: 545_559, delta: -100_000 });
    // ROP Order and total DA do not read SOH.
    expect(diff.ropOrder.changed).toBe(false);
    expect(diff.totalDa.changed).toBe(false);
    // Week 1 needs 193,872: 116,329 runs out in it; 216,329 leaves 22,457,
    // which week 2's 129,248 runs out.
    expect(diff.firstShortageWeek).toMatchObject({ plan: MONDAYS[0], scenario: MONDAYS[1] });
    expect(more.weeks[0].soh).toBe(22_457);
    expect(diff.firstShortageWeek.delta).toBeNull();
  });

  // The earlier quantity rule: fill up to Max, rounded to the MPQ [F5 variant].
  const FILL = withSwitch(DEFAULT_SWITCHES, 'quantityRule', 'fillToMax');

  it("'fillToMax': the hand material: ROP Order 140, ROP Fisik 20, Max 50; the trigger calls off 30 every 3 days", () => {
    const run = runWhatIf(hand(), FILL);
    // Safety order: SD of [70, 70] = 0 → 0. Cycle stock = 70 + 70.
    expect(run.rops.ropOrder.value).toBe(140);
    // Demand = min(70 ÷ 7, —, 70 ÷ 7) = 10 a day; safety = CEILING(1 × 10, 10)
    // = 10; cycle = CEILING(10 × 1, 10) = 10; ROP Fisik = 20.
    expect(run.rops.ropFisik.value).toBe(20);
    // Max (local) = CEILING(20, pallet 50) = 50.
    expect(run.max).toBe(50);
    // Week 1: 100 falls 10 a day to 30, never at 20. Week 2: day 8 starts at 20
    // → room 50 − 20 = 30, arriving day 9; day 11 again; end of week 20.
    expect(run.weeks[0]).toMatchObject({ drafted: 0, incoming: 0, soh: 30 });
    expect(run.weeks[1]).toMatchObject({ drafted: 60, incoming: 60, soh: 20 });
    expect(run.weeksAboveMax).toEqual([]);
    // The open PO of 1,000 is all the trigger can call off: 100 + 1,000 covers
    // 1,100 ÷ 70 = 15.7 weeks, so the stock runs out in week 16, and what no
    // balance covers is the PR recommendation (DRC-13 BR-02).
    expect(run.totalDrafted).toBe(1000);
    expect(run.firstShortageWeek).toBe(MONDAYS[15]);
    expect(run.triggerPr).toBeGreaterThan(0);
    // DA: 70 + 70; the check absorbs the 960 surplus in the last week (70).
    expect(run.da?.daInForce).toEqual([70, 0]);
    expect(run.prNeed).toBe(0);
  });

  it("'fillToMax', Max 20 typed, 'everyCheck' [Owner FSR-D6]: a call-off of 10 every day keeps the stock between 0 and 10 until the PO runs out", () => {
    const plan = runWhatIf(hand(), FILL);
    const capped = runWhatIf(hand({ maxOverride: 20 }), FILL);
    expect(capped.maxSource).toBe('override');
    const diff = Object.fromEntries(compareRuns(plan, capped).map((d) => [d.key, d]));
    expect(diff.max).toMatchObject({ plan: 50, scenario: 20, delta: -30 });
    // Day 8 starts at 20: room 20 − 20 = 0, nothing. Day 9 at 10: room 10, one
    // call-off of 10 arriving day 10. Day 10 starts at 10 again (0 + 10): the
    // trigger is still armed (BL-261), so another 10 goes out — a chain of 10
    // a day (days 9 to 13: 50 in week 2), the stock never below 0, until the
    // 1,000 is used up in week 15.
    expect(capped.weeks[1].drafted).toBe(50);
    expect(capped.totalDrafted).toBe(1000);
    expect(diff.firstShortageWeek).toMatchObject({ plan: MONDAYS[15], scenario: MONDAYS[15] });
  });

  it("'fillToMax', Max 20 typed, 'aboveRopFisik' (DRC-B37): one call-off of 10, then the trigger waits to re-arm", () => {
    const B37 = withSwitch(FILL, 'reArm', 'aboveRopFisik');
    const plan = runWhatIf(hand(), B37);
    const capped = runWhatIf(hand({ maxOverride: 20 }), B37);
    const diff = Object.fromEntries(compareRuns(plan, capped).map((d) => [d.key, d]));
    // The trigger waits for SOH above ROP Fisik — it never rises, so the stock
    // runs out on day 11 (week 2).
    expect(capped.totalDrafted).toBe(10);
    expect(diff.firstShortageWeek).toMatchObject({ plan: MONDAYS[15], scenario: MONDAYS[1] });
  });

  it("the PR recommendation reading (BL-261): 'openLatest' is the open recommendation as the ledger reads it; 'arrivesAfterLeadTime' lands it as supply", () => {
    expect(WHAT_IF_RULES.prRecommendation).toBe('openLatest');
    const run = runWhatIf(hand());
    // The PO (1,000) runs out in week 16; from then on every daily check
    // recommends a PR for the room, and the latest replaces the earlier one
    // (DRC-13 BR-02): the weeks carry the growth, and sum to the headline.
    expect(run.weeks.slice(0, 15).map((w) => w.prQty)).toEqual(Array(15).fill(0));
    expect(run.weeks[23].prQty).toBe(70);
    expect(run.triggerPr).toBe(run.weeks.reduce((n, w) => n + w.prQty, 0));
    const last = run.weeks[23];
    // Max 50 less the end-of-horizon stock, before the last day's demand.
    expect(run.triggerPr).toBe(50 - last.soh - 10);
    // The alternative: each PR raised lands 14 days later as open supply.
    const lands = runWhatIf(hand(), DEFAULT_SWITCHES, {
      ...WHAT_IF_RULES,
      prRecommendation: 'arrivesAfterLeadTime'
    });
    expect(lands.weeks.slice(18).some((w) => w.incoming > 0)).toBe(true);
    expect(lands.weeks[23].soh).toBeGreaterThan(run.weeks[23].soh);
  });

  it('[Team F5] the hand material on the default: the call-off is the MOQ 10 rounded to the pallet 50, called off above Max [Owner BL-230]', () => {
    const run = runWhatIf(hand());
    // Day 8 starts at 20 (at ROP Fisik): room 50 − 20 = 30 < 50, so the 50 is
    // called off anyway, flagged ABOVE_MAX; it lands day 9 at 10 + 50 = 60 > Max
    // 50, which re-arms the trigger; 10 a day brings it back to 20 on day 13 and
    // a second 50 goes out: 100 drafted in week 2.
    expect(run.weeks[1].drafted).toBe(100);
    expect(run.firstShortageWeek).toBe(MONDAYS[15]);
    // 'wait' lets A7 win: a pallet fits under Max only once the stock is at 0
    // (day 10, room 50), so each call-off goes out a day too late and the
    // stock runs short in week 2, not when the PO balance runs out (week 16).
    const wait = runWhatIf(hand(), withSwitch(DEFAULT_SWITCHES, 'minimumDeliveryAboveMax', 'wait'));
    expect(wait.weeks[1].drafted).toBe(50);
    expect(wait.firstShortageWeek).toBe(MONDAYS[1]);
  });

  it('every headline key is compared', () => {
    expect(compareRuns(runWhatIf(hand()), runWhatIf(hand())).map((d) => d.key)).toEqual([
      ...HEADLINE_KEYS
    ]);
    expect(h(runWhatIf(hand()), 'carried')).toBe(70);
  });
});

describe('BR-04 · the horizon: RM 52 weeks, PM 24', () => {
  it('classifies by SAP material type through the forecast streams', () => {
    expect(materialClassOf('VERP')).toBe('PM');
    expect(materialClassOf('ROH')).toBe('RM');
    expect(materialClassOf(null, 'packaging')).toBe('PM');
    expect(materialClassOf(null, 'rawMaterial')).toBe('RM');
    expect(horizonOf('RM')).toBe(52);
    expect(horizonOf('PM')).toBe(24);
    expect(WHAT_IF_RULES.horizonWeeks).toEqual({ RM: 52, PM: 24 });
  });

  it('a run covers every week of its inputs', () => {
    const rm = { ...hand(), weeks: MONDAYS.slice(0, 52), ltp: MONDAYS.slice(0, 52).map(() => 70) };
    expect(runWhatIf(rm).weeks).toHaveLength(52);
    expect(runWhatIf(hand()).weeks).toHaveLength(24);
  });
});

describe('BR-05 · saved scenarios: the save rule and the rules version', () => {
  const pairKnown = () => true;
  /** @param {Record<string, unknown>} over */
  const payload = (over = {}) => ({
    name: 'Z 2.0',
    supplierId: PPT7_SUPPLIER_ID,
    materialCode: '2000041501',
    inputs: ppt7(),
    switches: withSwitch(DEFAULT_SWITCHES, 'osip.z', 2),
    ...over
  });

  it('a well-formed scenario passes', () => {
    expect(scenarioRefusal(payload(), { pairKnown })).toBeNull();
    expect(inputsProblem(ppt7())).toBeNull();
  });

  it('refuses a missing or long name, an unknown pair, bad inputs and a bad switch', () => {
    expect(scenarioRefusal(payload({ name: '  ' }), { pairKnown })).toBe('NAME_REQUIRED');
    expect(scenarioRefusal(payload({ name: 'x'.repeat(61) }), { pairKnown })).toBe('NAME_TOO_LONG');
    expect(scenarioRefusal(payload(), { pairKnown: () => false })).toBe('UNKNOWN_PAIR');
    expect(scenarioRefusal(payload({ inputs: { ...ppt7(), mpq: -1 } }), { pairKnown })).toBe(
      'INPUTS_INVALID:mpq'
    );
    expect(scenarioRefusal(payload({ inputs: { ...ppt7(), ltp: [1] } }), { pairKnown })).toBe(
      'INPUTS_INVALID:ltp'
    );
    expect(
      scenarioRefusal(payload({ switches: withSwitch(DEFAULT_SWITCHES, 'osip.sdSource', 'x') }), {
        pairKnown
      })
    ).toBe('SWITCHES_INVALID:osip.sdSource');
    expect(
      scenarioRefusal(payload({ inputs: { ...ppt7(), materialCode: 'other' } }), { pairKnown })
    ).toBe('INPUTS_INVALID:pair');
  });

  it('a rules-version change is flagged; stored switches missing a key take today’s value', () => {
    expect(rulesChangedSince({ rulesVersion: RULES_VERSION })).toBe(false);
    expect(rulesChangedSince({ rulesVersion: 'osip-2026-10-01.1' })).toBe(true);
    const merged = mergeSwitches({ osip: { ...OSIP_RULES, z: 2 }, npdRule: 'oneYearAfterLaunch' });
    expect(merged.osip.z).toBe(2);
    expect(merged.maxCap).toBe(DEFAULT_SWITCHES.maxCap);
    expect(changedSwitches(merged).sort()).toEqual(['npdRule', 'osip.z']);
  });
});

describe('BL-212 · the NPD LTP window is read from the rules in use', () => {
  // An NPD material: 70 a week for the first 13 weeks, then 700. The NPD demand
  // is the highest LTP over the window ÷ 7 (DRC-10 [Default B5]).
  const npdHand = () =>
    hand({
      ltp: MONDAYS.slice(0, 24).map((_, i) => (i < 13 ? 70 : 700)),
      npd: { firstOrderFulfilled: true, oneYearAfterLaunch: true, '52WeeksHistory': true }
    });

  it('the default window (13 weeks, [Default A11]) reads 70 a week → 10 a day', () => {
    expect(npdLtpWeeks()).toBe(13);
    expect(npdLtpWeeks(OSIP_RULES)).toBe(OSIP_RULES.consumptionMovingAvgWeeks);
    expect(runWhatIf(npdHand()).safety.fisik.demandPerDay).toBe(10);
  });

  it('a 26-week window through a rules variant reaches the 700 weeks: 100 a day, and ROP Fisik moves', () => {
    const plan = runWhatIf(npdHand());
    const wide = runWhatIf(
      npdHand(),
      withSwitch(DEFAULT_SWITCHES, 'osip.consumptionMovingAvgWeeks', 26)
    );
    expect(npdLtpWeeks({ ...OSIP_RULES, consumptionMovingAvgWeeks: 26 })).toBe(26);
    expect(wide.safety.fisik.demandPerDay).toBe(100);
    expect(h(wide, 'ropFisik')).not.toBe(h(plan, 'ropFisik'));
  });

  it('the window switch is listed as feeding a sandbox figure', () => {
    expect(SWITCH_CATALOG.find((s) => s.path === 'osip.consumptionMovingAvgWeeks')?.feeds).toBe(
      true
    );
  });
});

describe('BL-210 · the live functions read every input the sandbox changes', () => {
  /**
   * The hand material with a varied LTP and consumption, so SD, koli and MOQ
   * all matter: LTP 50, 90 over the 2-week lead time; consumption 35 to 100.
   * @param {Partial<WhatIfInputs>} [over]
   * @returns {WhatIfInputs}
   */
  const varied = (over = {}) =>
    hand({
      ltp: MONDAYS.slice(0, 24).map((_, i) => (i % 2 === 0 ? 50 : 90)),
      consumption: [40, 70, 100, 70, 40, 100, 70, 40, 100, 70, 40, 100, 35],
      mpq: 10,
      moq: 25,
      koli: 50,
      ...over
    });

  it('DA’s week-1 safety order equals ROP Order’s under every switch value', () => {
    /** @type {WhatIfSwitches[]} */
    const variants = [DEFAULT_SWITCHES];
    for (const spec of SWITCH_CATALOG) {
      const values =
        spec.kind === 'boolean'
          ? [true, false]
          : spec.kind === 'choice'
            ? (spec.options ?? [])
            : [/** @type {number} */ (switchValue(DEFAULT_SWITCHES, spec.path)) + 1, 1];
      for (const v of values) variants.push(withSwitch(DEFAULT_SWITCHES, spec.path, v));
    }
    // And the two switches that used to split them, together.
    for (const sdSource of /** @type {const} */ (['ltp13w', 'ltp', 'consumption12w']))
      for (const safetyRounding of /** @type {const} */ (['mpq', 'koli', 'moq']))
        variants.push({ ...DEFAULT_SWITCHES, osip: { ...OSIP_RULES, sdSource, safetyRounding } });
    for (const switches of variants) {
      const run = runWhatIf(varied(), switches);
      const label = JSON.stringify(
        changedSwitches(switches).map((p) => [p, switchValue(switches, p)])
      );
      expect(run.safety.safetyOrder.value, label).not.toBeNull();
      expect(run.da?.safetyOrder, label).toBe(run.safety.safetyOrder.value);
    }
    // Control, worked by hand on the lead-time SD: 1.65 × √2 × SD(50, 90) =
    // 1.65 × √2 × 28.28 = 66.0 → MPQ 10: 70, koli 50: 100, MOQ 25: 75 — the variants really differ.
    const leadTimeSd = withSwitch(DEFAULT_SWITCHES, 'osip.sdSource', 'ltp');
    /** @param {string} rounding */
    const daSafety = (rounding) =>
      runWhatIf(varied(), withSwitch(leadTimeSd, 'osip.safetyRounding', rounding)).da?.safetyOrder;
    expect([daSafety('mpq'), daSafety('koli'), daSafety('moq')]).toEqual([70, 100, 75]);
    const fromConsumption = runWhatIf(
      varied(),
      withSwitch(DEFAULT_SWITCHES, 'osip.sdSource', 'consumption12w')
    );
    // The consumption SD is not the LTP's √800 = 28.28; DA reads the same one.
    expect(fromConsumption.safety.safetyOrder.sd).not.toBeCloseTo(Math.sqrt(800), 3);
    const z5 = { ...DEFAULT_SWITCHES, osip: { ...OSIP_RULES, z: 5 } };
    expect(
      runWhatIf(varied(), {
        ...z5,
        osip: { ...z5.osip, sdSource: 'consumption12w' }
      }).da?.safetyOrder
    ).not.toBe(runWhatIf(varied(), z5).da?.safetyOrder);
  });

  it('the consumption window [A11] moves ROP Fisik: 13 weeks → 10 a day (LTP binds), 1 week → 5 a day', () => {
    const spec = SWITCH_CATALOG.find((s) => s.path === 'osip.consumptionMovingAvgWeeks');
    expect(spec).toMatchObject({ feeds: true });
    expect(spec?.note).toBeUndefined();
    // LTP 70 a week, MPQ 1. 13 weeks: highest day 100/7, min with LTP 70/7 = 10.
    // The last week only: 35/7 = 5 a day.
    const inputs = varied({ ltp: MONDAYS.slice(0, 24).map(() => 70), mpq: 1 });
    const wide = runWhatIf(inputs);
    const narrow = runWhatIf(
      inputs,
      withSwitch(DEFAULT_SWITCHES, 'osip.consumptionMovingAvgWeeks', 1)
    );
    expect(wide.safety.fisik.demandPerDay).toBe(10);
    expect(narrow.safety.fisik.demandPerDay).toBe(5);
    expect(wide.safety.fisik.value).toBe(10);
    expect(narrow.safety.fisik.value).toBe(5);
    expect(h(narrow, 'ropFisik')).not.toBe(h(wide, 'ropFisik'));
  });

  it('a typed SD drives the safety order in ROP Order and in DA alike; blank keeps the computed one', () => {
    const base = runWhatIf(varied());
    expect(runWhatIf(varied({ sd: null })).safety.safetyOrder).toEqual(base.safety.safetyOrder);
    // 1.65 × √2 × 100 = 233.35 → up to the MPQ 10 → 240.
    const typed = runWhatIf(varied({ sd: 100 }));
    expect(typed.safety.safetyOrder).toMatchObject({ sd: 100, value: 240 });
    expect(typed.da?.safetyOrder).toBe(240);
    expect(typed.rops.ropOrder.value).toBe(
      /** @type {number} */ (base.rops.ropOrder.value) -
        /** @type {number} */ (base.safety.safetyOrder.value) +
        240
    );
  });

  it('a typed SD is checked like any input; a scenario saved without one still passes', () => {
    expect(inputsProblem(varied({ sd: -1 }))).toBe('sd');
    expect(inputsProblem(varied({ sd: 12.5 }))).toBeNull();
    const { sd: _omit, ...old } = varied();
    expect(inputsProblem(old)).toBeNull();
  });
});
