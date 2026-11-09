import { describe, expect, it } from 'vitest';
import {
  PO_ON_HOLD_RULES,
  daNotCalledOff,
  decisionStanding,
  fgCap,
  graceState,
  optionConditions,
  outcomeOf,
  poOnHoldOptionRefusal,
  poOnHoldQty,
  suggestOption
} from './poOnHold';
import { osipParamKey, osipParamRefusal, parseOsipParamKey } from './osipParams';

describe('PEX-7 BR-01 — PO On Hold = max(0, OSPO − DA not yet called off)', () => {
  it('sums DA less call-offs per week, never below 0 for a week', () => {
    expect(
      daNotCalledOff([
        { da: 100, calledOff: 30 },
        { da: 50, calledOff: 80 }, // over-called week adds nothing, takes nothing
        { da: 40, calledOff: 0 }
      ])
    ).toBe(110);
  });
  it('is the part of OSPO DA does not absorb', () => {
    expect(poOnHoldQty({ ospo: 500, daNotCalledOff: 110 })).toBe(390);
  });
  it('is 0 when DA absorbs all of OSPO, and never negative', () => {
    expect(poOnHoldQty({ ospo: 100, daNotCalledOff: 100 })).toBe(0);
    expect(poOnHoldQty({ ospo: 100, daNotCalledOff: 250 })).toBe(0);
  });
});

describe('PEX-7 BR-02..BR-05 — the grace period', () => {
  it('defaults to 14 days for both periods (PEX-D7)', () => {
    expect(PO_ON_HOLD_RULES.graceDays).toBe(14);
    expect(PO_ON_HOLD_RULES.noMoveDays).toBe(14);
  });
  it('counts from the first day: due on first day + grace', () => {
    const g = graceState('2026-11-10', '2026-11-03', 14);
    expect(g.dueDay).toBe('2026-11-17');
    expect(g.daysLeft).toBe(7);
    expect(g.ended).toBe(false);
  });
  it('ends on the due day itself', () => {
    expect(graceState('2026-11-17', '2026-11-03', 14).ended).toBe(true);
    expect(graceState('2026-11-16', '2026-11-03', 14).ended).toBe(false);
  });
  it('a grace period of 0 days is over at once', () => {
    expect(graceState('2026-11-03', '2026-11-03', 0).ended).toBe(true);
  });
  it('the two settings are ledger keys grace|supplier|material and noMove|supplier|material (BR-04)', () => {
    expect(osipParamKey('grace', { supplierId: 's1', materialCode: 'M1' })).toBe('grace|s1|M1');
    expect(osipParamKey('noMove', { supplierId: 's1', materialCode: 'M1' })).toBe('noMove|s1|M1');
    expect(parseOsipParamKey('grace|s1|M1')).toEqual({
      param: 'grace',
      supplierId: 's1',
      materialCode: 'M1'
    });
    expect(parseOsipParamKey('grace|M1')).toBeNull();
  });
  it('accepts whole days 0..365 or null (reset); refuses the rest', () => {
    for (const p of /** @type {const} */ (['grace', 'noMove'])) {
      expect(osipParamRefusal(p, 14)).toBeNull();
      expect(osipParamRefusal(p, 0)).toBeNull();
      expect(osipParamRefusal(p, null)).toBeNull();
      expect(osipParamRefusal(p, 1.5)).not.toBeNull();
      expect(osipParamRefusal(p, -1)).not.toBeNull();
      expect(osipParamRefusal(p, 366)).not.toBeNull();
      expect(osipParamRefusal(p, '14')).not.toBeNull();
    }
  });
});

describe('PEX-8 BR-03 — FG cap', () => {
  it('AC-02: (1,000 + min(400, 300)) − 900 = 400', () => {
    expect(fgCap({ maxPti: 1000, maxSupplier: 400, sohSupplier: 300, sohPti: 900 })).toBe(400);
  });
  it('is floored at 0', () => {
    expect(fgCap({ maxPti: 100, maxSupplier: 50, sohSupplier: 50, sohPti: 900 })).toBe(0);
  });
  it('is null when any input is not on record (nothing guessed)', () => {
    expect(fgCap({ maxPti: null, maxSupplier: 400, sohSupplier: 300, sohPti: 900 })).toBeNull();
    expect(fgCap({ maxPti: 1000, maxSupplier: null, sohSupplier: 300, sohPti: 900 })).toBeNull();
  });
});

describe('PEX-8 BR-02 — the options and the pre-selected suggestion', () => {
  const base = { pipo: false, demand: 0, daysSinceMovement: 14, noMoveDays: 14 };
  it('AC-01: PIPO material → FS only', () => {
    expect(suggestOption({ ...base, pipo: true, demand: 80 })).toBe('fsOnly');
  });
  it('PEX-D5: PIPO with zero demand → FS only, never FG', () => {
    const f = { ...base, pipo: true };
    expect(suggestOption(f)).toBe('fsOnly');
    expect(optionConditions(f).fg).toBe(false);
  });
  it('AC-02: not PIPO, zero demand, no movement 14 days → FG', () => {
    expect(suggestOption(base)).toBe('fg');
  });
  it('AC-03: not PIPO, zero demand, stock moved 5 days ago → FG is not suggested', () => {
    const f = { ...base, daysSinceMovement: 5 };
    expect(optionConditions(f).fg).toBe(false);
    expect(suggestOption(f)).toBe('fsOnly');
  });
  it('demand dropped but above 0 → FS + spread', () => {
    expect(suggestOption({ ...base, demand: 120 })).toBe('fsSpread');
  });
  it('FG cannot be shown to hold with the PIPO flag or the movement unknown', () => {
    expect(optionConditions({ ...base, pipo: null }).fg).toBe(false);
    expect(optionConditions({ ...base, daysSinceMovement: null }).fg).toBe(false);
  });
  it('a custom no-movement period moves the FG boundary', () => {
    expect(optionConditions({ ...base, daysSinceMovement: 20, noMoveDays: 30 }).fg).toBe(false);
    expect(optionConditions({ ...base, daysSinceMovement: 30, noMoveDays: 30 }).fg).toBe(true);
  });
});

describe('PEX-8 — what the end of the grace period does', () => {
  it('FS only: the whole remainder as feedstock, one call-off [PEX-D3]', () => {
    expect(outcomeOf('fsOnly', 500, null)).toMatchObject({ feedstockQty: 500, stayOnHoldQty: 0 });
  });
  it('AC-01: FS + spread of 500 spreads the 500', () => {
    expect(outcomeOf('fsSpread', 500, null)).toMatchObject({ spreadQty: 500, feedstockQty: 0 });
  });
  it('AC-02 / BR-04: remainder 600, cap 400 → 400 as FG, 200 stays on hold', () => {
    expect(outcomeOf('fg', 600, 400)).toMatchObject({ fgQty: 400, stayOnHoldQty: 200 });
  });
  it('FG with no computable cap absorbs nothing: all stays on hold', () => {
    expect(outcomeOf('fg', 600, null)).toMatchObject({ fgQty: 0, stayOnHoldQty: 600 });
  });
});

describe('PEX-8 BR-01, BR-06 — who decides', () => {
  it('no suggestion, grace running: nothing yet', () => {
    expect(decisionStanding({ suggested: null, chosen: null, graceEnded: false })).toEqual({
      status: 'noSuggestion',
      effective: null
    });
  });
  it('suggested, grace running, no choice: waiting for the supplier', () => {
    expect(decisionStanding({ suggested: 'fsOnly', chosen: null, graceEnded: false })).toEqual({
      status: 'awaitingSupplier',
      effective: null
    });
  });
  it('the supplier’s choice is final and beats the suggestion', () => {
    expect(decisionStanding({ suggested: 'fsOnly', chosen: 'fsSpread', graceEnded: true })).toEqual(
      {
        status: 'chosen',
        effective: 'fsSpread'
      }
    );
  });
  it('AC-01 of PEX-8: the supplier chooses FS + spread over the suggested FS only', () => {
    expect(
      decisionStanding({ suggested: 'fsOnly', chosen: 'fsSpread', graceEnded: false }).effective
    ).toBe('fsSpread');
  });
  it('silence at the end of the grace period: the suggestion applies, marked no supplier response [PEX-D14]', () => {
    expect(decisionStanding({ suggested: 'fg', chosen: null, graceEnded: true })).toEqual({
      status: 'noSupplierResponse',
      effective: 'fg'
    });
  });
  it('the grace period ended with no suggestion and no choice: back to the planner', () => {
    expect(decisionStanding({ suggested: null, chosen: null, graceEnded: true })).toEqual({
      status: 'backToPlanner',
      effective: null
    });
  });
  it('refuses an option that is not one of the three', () => {
    expect(poOnHoldOptionRefusal('fsOnly')).toBeNull();
    expect(poOnHoldOptionRefusal('cancel')).not.toBeNull();
    expect(poOnHoldOptionRefusal(undefined)).not.toBeNull();
  });
});
