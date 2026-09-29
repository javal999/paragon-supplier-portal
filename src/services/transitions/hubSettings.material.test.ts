// ─────────────────────────────────────────────────────────────────────────────
// SC Hub Material · A3 (AR-08) — the values the material tasks read, set by
// the Hub administrator before any rule reads them.
//
// Proved here, pure (no store, no verb — the verb path is in
// `hubSettings.bl32.test.ts`, whose FLIPS table covers these keys):
//   1. each key's rule, unit, default and bounds, each bound probed both ways;
//   2. the ordering rule: the flag starts below the warning, whichever end moves;
//   3. a time of day is minutes after midnight, and 1439 reads 23:59.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTING_STATE,
  formatMinutesOfDay,
  hubSettingDef,
  parseTimeOfDay,
  settingRefusal,
} from './hubSettings';

const S = DEFAULT_SETTING_STATE;

/** key, rule, unit, section, default, min, max, whole number */
const MATERIAL: readonly [string, string, string, string, number, number, number, boolean][] = [
  ['stockSync.intervalHours', 'MR-1', 'hours', 'alerts', 2, 1, 24, true],
  ['stale.apiHours', 'MR-1', 'hours', 'alerts', 24, 1, 168, true],
  ['stockUpdate.cutoffDay', 'MR-1', 'weekday', 'alerts', 4, 1, 7, true],
  ['stockUpdate.cutoffTime', 'MR-1', 'time', 'alerts', 1439, 0, 1439, true],
  ['compliance.warnPct', 'MR-2', 'pct', 'tolerances', 80, 0, 100, false],
  ['compliance.flagPct', 'MR-2', 'pct', 'tolerances', 60, 0, 100, false],
  ['compliance.scoreWeight', 'MR-2', 'weight', 'tolerances', 0.1, 0, 0.5, false],
  ['shelfLife.defaultMonths', 'MR-6', 'months', 'tolerances', 6, 0, 60, true],
];

describe('MAT-A3 · the material values: default and bounds', () => {
  it.each(MATERIAL)('%s · %s, unit %s, default and bounds', (key, rule, unit, section, dflt, min, max, integer) => {
    const def = hubSettingDef(key)!;
    expect(def, key).toBeDefined();
    expect({ rule: def.rule, unit: def.unit, section: def.section, defaultValue: def.defaultValue }).toEqual({
      rule,
      unit,
      section,
      defaultValue: dflt,
    });
    expect(S.values[key]).toBe(dflt);
    // The bounds themselves pass the bounds check (probed on the good side).
    // The two compliance thresholds are also tied by the ordering rule, which
    // is what refuses a warning of 0 or a flag of 100 — never the bounds.
    const BOUNDS = /cannot be negative|must be at least|must be at most|whole number/;
    for (const v of [min, max]) {
      const r = settingRefusal(key, v, S);
      if (key.startsWith('compliance.') && key !== 'compliance.scoreWeight') expect(r ?? '').not.toMatch(BOUNDS);
      else expect(r, `${key}=${v}`).toBeNull();
    }
    if (key === 'compliance.warnPct') expect(settingRefusal(key, 0, S)).toMatch(/red flag must start below/);
    // …and one step outside each is refused by name.
    const step = integer ? 1 : 0.01;
    expect(settingRefusal(key, min - step, S)).toMatch(new RegExp(`^${key.replace('.', '\\.')} (cannot be negative|must be at least)`));
    expect(settingRefusal(key, max + step, S)).toBe(`${key} must be at most ${max}, got ${max + step}`);
    if (integer) expect(settingRefusal(key, min + 0.5, S)).toBe(`${key} must be a whole number, got ${min + 0.5}`);
  });

  it('MAT-A3-KEYS · the owner decisions as written: Thursday 23:59 WIB, API stale after 24 h, weight 0.10 (MAT-D7, D8, D9)', () => {
    expect(S.values['stockUpdate.cutoffDay']).toBe(4);
    expect(formatMinutesOfDay(S.values['stockUpdate.cutoffTime'] as number)).toBe('23:59');
    expect(S.values['stale.apiHours']).toBe(24);
    expect(S.values['compliance.scoreWeight']).toBe(0.1);
    // The single default stale period is untouched.
    expect(hubSettingDef('stale.defaultDays')).toMatchObject({ unit: 'days', defaultValue: 7, min: 1, max: 365 });
  });
});

describe('MAT-A3-ORDER · the flag starts below the warning (MR-2 BR-04)', () => {
  it('setting the flag above the warning is refused by the ordering rule', () => {
    expect(settingRefusal('compliance.flagPct', 85, S)).toBe(
      'compliance.flagPct: the red flag must start below the amber warning (flag below 85%, warning below 80%)',
    );
  });

  it('a flag equal to the warning is refused too — the amber band would be empty', () => {
    expect(settingRefusal('compliance.flagPct', 80, S)).toMatch(/^compliance\.flagPct: the red flag must start below/);
  });

  it('moving the warning below the flag is refused from the other end', () => {
    expect(settingRefusal('compliance.warnPct', 55, S)).toMatch(/^compliance\.warnPct: the red flag must start below/);
  });

  it('known-good: a flag below the warning, and a warning above the flag, pass', () => {
    expect(settingRefusal('compliance.flagPct', 79, S)).toBeNull();
    expect(settingRefusal('compliance.warnPct', 61, S)).toBeNull();
  });
});

describe('MAT-A3-TIME · a time of day is minutes after midnight, shown as HH:MM', () => {
  it('1439 formats as 23:59, 0 as 00:00, 1020 as 17:00', () => {
    expect(formatMinutesOfDay(1439)).toBe('23:59');
    expect(formatMinutesOfDay(0)).toBe('00:00');
    expect(formatMinutesOfDay(1020)).toBe('17:00');
  });

  it('HH:MM parses back to minutes; anything else is not a time', () => {
    expect(parseTimeOfDay('23:59')).toBe(1439);
    expect(parseTimeOfDay('7:05')).toBe(425);
    expect(parseTimeOfDay('24:00')).toBeNull();
    expect(parseTimeOfDay('12:60')).toBeNull();
    expect(parseTimeOfDay('noon')).toBeNull();
  });

  it('every time of day round-trips', () => {
    for (let m = 0; m < 1440; m++) expect(parseTimeOfDay(formatMinutesOfDay(m))).toBe(m);
  });
});
