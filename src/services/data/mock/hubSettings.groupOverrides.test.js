import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
/** @import { InventoryPosition, QueryScope } from '../types' */
import { DataError } from '../types';
import { allPositions } from './inventoryReadModel';
import {
  DEFAULT_SETTING_STATE,
  groupOverrideKey,
  parseGroupOverrideKey,
  settingRefusal,
  staleOverrideKey
} from '../../transitions/hubSettings';
import {
  HUB_SETTINGS_KEY,
  groupSetting,
  hubSettingsStore,
  settingValue,
  stalePeriodFor
} from '../../transitions/hubSettingsStore';
import {
  positionDays,
  positionRisk,
  riskFor,
  stockFreshness,
  supplyBand
} from '../../transitions/inventoryRules';
import { deriveAlertConditions } from '../../transitions/inventoryAlertRules';
import { leadTimeRisk, staleApiHours, supplyBands } from '../../transitions/inventoryConfig';
import { sdcClock } from '../../sdc';

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E08-05 BR-03 AS FIRST WRITTEN (owner, 2026-10-23): "Alert thresholds and
// the stale period are configurable by ADM, per material group."
//
// A group override is a SCOPED KEY on the existing verb, `<baseKey>@MG-xx` on
// `t_setting_set`. These specs pin, on the sample data:
//   1. with no override, every reader returns exactly the global answer;
//   2. a group override moves the class and the alert of a material IN that
//      group and of no material in another group;
//   3. the stale period's precedence: supplier × material > group > global;
//   4. the verb's refusals, each beside the value it accepts.
// ─────────────────────────────────────────────────────────────────────────────

const svc = new MockCommandService();
const NOBODY = /** @type {const} */ ({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });

/**
 * @param {...string} roles
 * @returns {QueryScope}
 */
const seat = (...roles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: roles,
  actor: NOBODY
});

/**
 * @param {string} key
 * @param {unknown} value
 */
const setCmd = (key, value) => ({
  transitionId: 't_setting_set',
  entity: 'hubSetting',
  entityId: key,
  payload: { value, setBy: NOBODY }
});

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
async function set(key, value) {
  const r = await svc.dispatch(seat('compliance'), setCmd(key, value));
  expect(r.status, `${key}=${JSON.stringify(value)}: ${r.reason}`).toBe('done');
}

/**
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<string>}
 */
async function refusalOf(key, value) {
  const r = await svc.dispatch(seat('compliance'), setCmd(key, value));
  expect(r.status, `${key}=${JSON.stringify(value)} should be refused`).toBe('failed');
  // The dispatcher names the policy; the rest is the policy's `CODE: sentence`.
  const prefix = 'POLICY_REJECTED:setting_governed:';
  expect(r.reason?.startsWith(prefix), r.reason).toBe(true);
  return (r.reason ?? '').slice(prefix.length);
}

/**
 * @param {QueryScope} scope
 * @param {ReturnType<typeof setCmd>} cmd
 * @returns {Promise<string>}
 */
async function outcomeOf(scope, cmd) {
  try {
    const r = await svc.dispatch(scope, cmd);
    return r.status === 'failed' ? `failed/${r.reason ?? ''}` : `ok/${r.status}`;
  } catch (e) {
    return e instanceof DataError ? `throw/${e.code}` : `throw/${/** @type {Error} */ (e).name}`;
  }
}

const now = () => sdcClock.now();
/**
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {InventoryPosition}
 */
const position = (supplierId, materialCode) =>
  /** @type {InventoryPosition} */ (
    allPositions(now()).find((p) => p.supplierId === supplierId && p.materialCode === materialCode)
  );
/**
 * The class of one rule's alert for one position.
 * @param {string} rule
 * @param {string} supplierId
 * @param {string} materialCode
 * @returns {string | undefined}
 */
const alertClass = (rule, supplierId, materialCode) =>
  deriveAlertConditions(allPositions(now()), [], now()).find(
    (a) => a.rule === rule && a.supplierId === supplierId && a.subject === materialCode
  )?.riskClass;

beforeEach(() => {
  hubSettingsStore.reset();
  commandAuditSink.clear();
});
afterEach(() => hubSettingsStore.reset());

describe('GRP-KEY · the scoped key', () => {
  it('GRP-KEY-01 · parses a groupable key at a group, and nothing else', () => {
    expect(parseGroupOverrideKey('bands.criticalBelowDays@MG-20')).toEqual({
      baseKey: 'bands.criticalBelowDays',
      materialGroup: 'MG-20'
    });
    expect(groupOverrideKey('risk.highBelowMultiple', 'MG-04')).toBe(
      'risk.highBelowMultiple@MG-04'
    );
    // Known-false: a value that is not per group, a malformed group, a plain key.
    expect(parseGroupOverrideKey('callOff.overPct@MG-20')).toBeNull();
    expect(parseGroupOverrideKey('bands.criticalBelowDays@mg-20')).toBeNull();
    expect(parseGroupOverrideKey('bands.criticalBelowDays')).toBeNull();
  });
});

describe('GRP-NONE · with no group override, nothing changes', () => {
  it('GRP-NONE-01 · every position reads the same class with and without its group', () => {
    const ps = allPositions(now());
    expect(ps.length).toBeGreaterThan(10);
    for (const p of ps) {
      expect(positionRisk(p), `${p.supplierId} ${p.materialCode}`).toEqual(
        riskFor(positionDays(p), p.leadTimeDays)
      );
    }
    // The accessors without a group are the global values.
    expect(supplyBands('MG-20')).toEqual(supplyBands());
    expect(leadTimeRisk('MG-20')).toEqual(leadTimeRisk());
    expect(leadTimeRisk()).toEqual({ mediumBelowMultiple: 1.5, highBelowMultiple: 1 });
    expect(staleApiHours('MG-10')).toBe(staleApiHours());
    expect(stalePeriodFor('sup-008', 'PK-CART-9901', 'MG-23')).toBe(7);
  });
});

describe('GRP-RISK · a group override moves the class in its group and nowhere else', () => {
  it('GRP-RISK-01 · CR-24 High multiple: PK-PETB-8801 (MG-20) turns High; RM-EMUL-9410 (MG-02) stays Medium', async () => {
    // Controls, from the sample data: 17 days of cover against 14 days lead
    // time, and 22.1 against 21 — both Medium under the global 1 × / 1.5 ×.
    expect(positionRisk(position('sup-007', 'PK-PETB-8801')).riskClass).toBe('medium');
    expect(positionRisk(position('sup-002', 'RM-EMUL-9410')).riskClass).toBe('medium');
    expect(alertClass('ptiBelowRop', 'sup-007', 'PK-PETB-8801')).toBe('medium');
    expect(alertClass('coverage', 'sup-002', 'RM-EMUL-9410')).toBe('medium');

    await set('risk.highBelowMultiple@MG-20', 1.3);

    expect(positionRisk(position('sup-007', 'PK-PETB-8801')).riskClass).toBe('high');
    expect(alertClass('ptiBelowRop', 'sup-007', 'PK-PETB-8801')).toBe('high');
    // Another group: 22.1 < 1.3 × 21 would be High if the override leaked.
    expect(positionRisk(position('sup-002', 'RM-EMUL-9410')).riskClass).toBe('medium');
    expect(alertClass('coverage', 'sup-002', 'RM-EMUL-9410')).toBe('medium');

    // Clearing it (null) puts the group back on the global value.
    await set('risk.highBelowMultiple@MG-20', null);
    expect(positionRisk(position('sup-007', 'PK-PETB-8801')).riskClass).toBe('medium');
  });

  it('GRP-RISK-02 · CR-24 Medium multiple: a group can widen Low', async () => {
    // PK-PETB-8801: 17 days against 14 → Medium at 1.5 ×, Low at 1.2 ×.
    await set('risk.mediumBelowMultiple@MG-20', 1.2);
    expect(positionRisk(position('sup-007', 'PK-PETB-8801')).riskClass).toBe('low');
    expect(positionRisk(position('sup-002', 'RM-EMUL-9410')).riskClass).toBe('medium');
  });

  it('GRP-RISK-03 · CR-02 fallback bands: RM-EMUL-9430 (MG-02, no lead time) moves; an MG-20 band does not move it', async () => {
    const p = () => position('sup-010', 'RM-EMUL-9430');
    // 6 days of cover, no lead time on record: Critical → High.
    expect(positionRisk(p())).toMatchObject({
      riskClass: 'high',
      basis: { kind: 'fallbackBands' }
    });
    expect(alertClass('leadTimeMissing', 'sup-010', 'RM-EMUL-9430')).toBe('high');

    await set('bands.criticalBelowDays@MG-20', 5);
    expect(positionRisk(p()).riskClass).toBe('high');

    await set('bands.criticalBelowDays@MG-02', 5);
    expect(positionRisk(p()).riskClass).toBe('medium');
    expect(supplyBand(6, 'MG-02')).toBe('warning');
    expect(supplyBand(6)).toBe('critical');
    expect(alertClass('leadTimeMissing', 'sup-010', 'RM-EMUL-9430')).toBe('medium');
  });
});

describe('GRP-STALE · the stale period: supplier × material, then group, then global', () => {
  it('GRP-STALE-01 · manual supplier: the pair period beats the group period, which beats the weekly cutoff', async () => {
    // PK-PETB-8802 (MG-20, manual) was last updated 2026-08-30 02:00; now is 08-31 12:00.
    const p = () => position('sup-007', 'PK-PETB-8802');
    const pairKey = staleOverrideKey('sup-007', 'PK-PETB-8802');
    expect(settingValue(pairKey)).toBe(3); // shipped pair period
    expect(stockFreshness(p(), now())).toBe('current');

    await set('stale.defaultDays@MG-20', 1);
    // The pair keeps its own 3 days.
    expect(p().updateSla).toBe(3);
    expect(stockFreshness(p(), now())).toBe('current');

    await set(pairKey, null);
    // Now the group's 1 day decides: 34 hours old is stale.
    expect(stalePeriodFor('sup-007', 'PK-PETB-8802', 'MG-20')).toBe(1);
    expect(p().updateSla).toBe(1);
    expect(stockFreshness(p(), now())).toBe('stale');
    expect(alertClass('staleData', 'sup-007', 'PK-PETB-8802')).toBe('low');

    await set('stale.defaultDays@MG-20', null);
    // Back on the global rule: the weekly cutoff, and 7 days as the SLA.
    expect(p().updateSla).toBe(7);
    expect(stockFreshness(p(), now())).toBe('current');
  });

  it('GRP-STALE-02 · a group period reaches only its own group', async () => {
    // PK-CART-9901 (MG-23, manual) was last updated 2026-08-29: current by the weekly cutoff.
    const cart = () => position('sup-008', 'PK-CART-9901');
    expect(stockFreshness(cart(), now())).toBe('current');
    await set('stale.defaultDays@MG-20', 1);
    expect(stockFreshness(cart(), now())).toBe('current');
    await set('stale.defaultDays@MG-23', 1);
    expect(stockFreshness(cart(), now())).toBe('stale');
  });

  it('GRP-STALE-03 · API supplier: the group hours apply once the pair has no period of its own', async () => {
    // RM-COCO-8200 (MG-10, API) carries a shipped 1-day pair period.
    const p = () => position('sup-001', 'RM-COCO-8200');
    await set('stale.apiHours@MG-10', 1);
    expect(stockFreshness(p(), now())).toBe('current');
    await set(staleOverrideKey('sup-001', 'RM-COCO-8200'), null);
    expect(staleApiHours('MG-10')).toBe(1);
    expect(stockFreshness(p(), now())).toBe('stale');
    await set('stale.apiHours@MG-10', null);
    expect(stockFreshness(p(), now())).toBe('current');
  });
});

describe('GRP-POL · the verb refuses a bad group value by code, and accepts a good one', () => {
  it.each([
    [
      'High at Medium',
      'risk.highBelowMultiple@MG-20',
      1.5,
      1.4,
      /^GROUP_OVERRIDE_ORDER: MG-20: High must end below where Medium ends/
    ],
    [
      'Medium at or below High',
      'risk.mediumBelowMultiple@MG-20',
      0.9,
      1.2,
      /^GROUP_OVERRIDE_ORDER: MG-20: High must end below/
    ],
    [
      'Critical at Warning',
      'bands.criticalBelowDays@MG-20',
      30,
      29,
      /^GROUP_OVERRIDE_ORDER: MG-20: bands out of order: Critical/
    ],
    [
      'Warning above Healthy',
      'bands.warningBelowDays@MG-20',
      61,
      60,
      /^GROUP_OVERRIDE_ORDER: MG-20: bands out of order: Healthy would be empty/
    ],
    [
      'a fraction of a day',
      'bands.criticalBelowDays@MG-20',
      10.5,
      10,
      /^GROUP_OVERRIDE_VALUE_INVALID: .*must be a whole number/
    ],
    [
      'zero days',
      'stale.defaultDays@MG-20',
      0,
      1,
      /^GROUP_OVERRIDE_VALUE_INVALID: .*must be at least 1/
    ],
    [
      'zero multiple',
      'risk.highBelowMultiple@MG-20',
      0,
      0.5,
      /^GROUP_OVERRIDE_VALUE_INVALID: .*must be more than 0/
    ],
    [
      'not a number',
      'stale.apiHours@MG-20',
      'x',
      12,
      /^GROUP_OVERRIDE_VALUE_INVALID: .*must be a number or null/
    ]
  ])('GRP-POL · %s', async (_label, key, bad, good, why) => {
    expect(await refusalOf(key, bad)).toMatch(why);
    expect(hubSettingsStore.changes()).toHaveLength(0);
    // Probed both ways: the same key takes a sensible value.
    await set(key, good);
    expect(settingValue(key)).toBe(good);
  });

  it('GRP-POL-GLOBAL · a global change that would invert a group with an override is refused; one that keeps it is accepted', async () => {
    await set('bands.criticalBelowDays@MG-20', 25);
    // Globally 14 < 20 holds, but MG-20 would read Critical 25 ≥ Warning 20.
    expect(await refusalOf('bands.warningBelowDays', 20)).toMatch(
      /^GROUP_OVERRIDE_ORDER: MG-20: bands out of order: Critical must end below where Warning ends \(Critical below 25, Warning below 20 days\)/
    );
    await set('bands.warningBelowDays', 26);
    expect(groupSetting('bands.warningBelowDays', 'MG-20')).toBe(26);
  });

  it('GRP-POL-CLEAR · clearing a value that would leave the group out of order is refused; clearing in the right order works', async () => {
    await set('risk.mediumBelowMultiple@MG-20', 2);
    await set('risk.highBelowMultiple@MG-20', 1.8);
    expect(await refusalOf('risk.mediumBelowMultiple@MG-20', null)).toMatch(
      /^GROUP_OVERRIDE_ORDER: MG-20: High must end below where Medium ends \(High below 1.8/
    );
    await set('risk.highBelowMultiple@MG-20', null);
    await set('risk.mediumBelowMultiple@MG-20', null);
    expect(hubSettingsStore.state().groupOverrides).toEqual({});
  });

  it('GRP-POL-KEY · an undeclared group or a value that is not per group is NOT_FOUND; a declared group is addressable', async () => {
    expect(await outcomeOf(seat('compliance'), setCmd('bands.criticalBelowDays@MG-99', 10))).toBe(
      'throw/NOT_FOUND'
    );
    expect(await outcomeOf(seat('compliance'), setCmd('callOff.overPct@MG-20', 1))).toBe(
      'throw/NOT_FOUND'
    );
    expect(await outcomeOf(seat('compliance'), setCmd('bands.criticalBelowDays@MG-20', 10))).toBe(
      'ok/done'
    );
  });

  it('GRP-POL-ROLE · a lane measured by the thresholds cannot set them for a group', async () => {
    expect(await outcomeOf(seat('planning'), setCmd('bands.criticalBelowDays@MG-20', 10))).not.toBe(
      'ok/done'
    );
    expect(settingValue('bands.criticalBelowDays@MG-20')).toBeNull();
  });

  it('GRP-POL-PURE · the same predicate refuses on the pure state', () => {
    expect(settingRefusal('risk.highBelowMultiple@MG-04', 1.4, DEFAULT_SETTING_STATE)).toBeNull();
    expect(settingRefusal('risk.highBelowMultiple@MG-04', 1.6, DEFAULT_SETTING_STATE)).toMatch(
      /^GROUP_OVERRIDE_ORDER: MG-04/
    );
  });
});

describe('GRP-LEDGER · on the record with who and when, and re-checked on read', () => {
  it('GRP-LEDGER-01 · a group change is a row in the alerts history with previous, setBy and setAt', async () => {
    await set('bands.criticalBelowDays@MG-20', 10);
    await set('bands.criticalBelowDays@MG-20', null);
    const rows = hubSettingsStore.changesIn('alerts');
    expect(rows.map((c) => [c.key, c.previous, c.value])).toEqual([
      ['bands.criticalBelowDays@MG-20', null, 10],
      ['bands.criticalBelowDays@MG-20', 10, null]
    ]);
    expect(rows[0].setBy).toEqual(NOBODY);
    expect(typeof rows[0].setAt).toBe('string');
  });

  it('GRP-LEDGER-02 · a stored group row the verb would refuse is refused on read, by name', () => {
    window.localStorage.setItem(
      HUB_SETTINGS_KEY,
      JSON.stringify({
        v: 1,
        changes: [
          {
            key: 'bands.criticalBelowDays@MG-20',
            value: 12,
            setBy: NOBODY,
            setAt: '2026-10-23T01:00:00.000Z'
          },
          {
            key: 'bands.warningBelowDays@MG-20',
            value: 11,
            setBy: NOBODY,
            setAt: '2026-10-23T02:00:00.000Z'
          }
        ]
      })
    );
    hubSettingsStore.rehydrate();
    expect(settingValue('bands.criticalBelowDays@MG-20')).toBe(12);
    expect(settingValue('bands.warningBelowDays@MG-20')).toBeNull();
    expect(hubSettingsStore.readState().rejected).toEqual([
      {
        row: 'bands.warningBelowDays@MG-20',
        reason: expect.stringMatching(/^GROUP_OVERRIDE_ORDER: MG-20: bands out of order: Critical/)
      }
    ]);
  });
});
