// BL-268 (PEX-6) — which input changes count as causes of a DA move.
import { describe, expect, it } from 'vitest';
import { compareVersions, daCauseText, daCauses, daMoved } from './daCauseRules';

const by = /** @type {any} */ ({ kind: 'UNATTRIBUTED' });
/** @param {'A' | 'Festive' | 'B'} series @param {number} qty */
const up = (series, qty) =>
  /** @type {any} */ ({
    key: `upload|M|${series}`,
    kind: 'upload',
    materialCode: 'M',
    series,
    weeks: { '2026-11-09': qty },
    sourceFile: 'f.csv',
    choice: null,
    previousChoice: null,
    setAt: 't',
    setBy: by
  });
/** @param {string} choice @param {string} previousChoice */
const pick = (choice, previousChoice) =>
  /** @type {any} */ ({
    key: 'choice|M',
    kind: 'choice',
    materialCode: 'M',
    series: null,
    weeks: null,
    sourceFile: null,
    choice,
    previousChoice,
    setAt: 't',
    setBy: by
  });
const base = { materialCode: 'M', since: { ltp: 0, osip: 0 }, moved: true, osipRows: [] };

describe('daMoved', () => {
  it('compares the weeks both versions hold; a rolled horizon is not a move', () => {
    expect(
      daMoved(
        [{ week: 'w1', da: 5 }],
        [
          { week: 'w1', da: 5 },
          { week: 'w2', da: 9 }
        ]
      )
    ).toBe(false);
    expect(daMoved([{ week: 'w1', da: 5 }], [{ week: 'w1', da: 6 }])).toBe(true);
  });
});

describe('daCauses', () => {
  it('PEX-6 AC-01: LTP B uploaded while the choice is A is no cause; switching A → B is', () => {
    const rows = [up('B', 115)];
    expect(daCauses({ ...base, choice: 'A', ltpRows: rows })).toEqual([]);
    const [c] = daCauses({ ...base, choice: 'B', ltpRows: [...rows, pick('B', 'A')] });
    expect(c ? daCauseText(c, (k) => k) : '').toBe('ltpB — → 115');
    const causes = daCauses({ ...base, choice: 'B', ltpRows: [pick('B', 'A')] });
    expect(causes.map((x) => daCauseText(x, () => 'LTP choice'))).toEqual(['LTP choice A → B']);
  });
  it('no DA week moved: no cause, the changes stay input changes (BR-03)', () => {
    expect(daCauses({ ...base, moved: false, choice: 'B', ltpRows: [pick('B', 'A')] })).toEqual([]);
  });
  it('only rows after the previous publication count, and an upload shows the series total before and after', () => {
    const rows = [up('A', 100), up('A', 120)];
    const [c] = daCauses({ ...base, since: { ltp: 1, osip: 0 }, choice: 'A', ltpRows: rows });
    expect(c).toMatchObject({ kind: 'ltpA', before: 100, after: 120 });
    expect(daCauses({ ...base, since: { ltp: 2, osip: 0 }, choice: 'A', ltpRows: rows })).toEqual(
      []
    );
  });
  it('a change of Z or g of this material is a safety stock cause; another material is not', () => {
    const row = (/** @type {string} */ key, /** @type {string} */ param) => ({
      key,
      param,
      value: 2,
      previous: 1.65,
      setAt: 't',
      setBy: by
    });
    const causes = daCauses({
      ...base,
      choice: 'A',
      ltpRows: [],
      osipRows: [row('z|M', 'z'), row('z|OTHER', 'z'), row('f|sup', 'f')]
    });
    expect(causes).toHaveLength(1);
    expect(causes[0]).toMatchObject({ kind: 'safetyStock', detail: 'z', before: 1.65, after: 2 });
    expect(daCauseText(causes[0], () => 'Safety stock')).toBe('Safety stock Z 1.65 → 2');
  });
});

describe('compareVersions', () => {
  it('lines the weeks up and gives second − first; a week one lacks has no difference', () => {
    const w = (/** @type {string} */ week, /** @type {number} */ da) => ({
      week,
      da,
      ltp: da,
      safety: 0
    });
    expect(compareVersions([w('w1', 10), w('w2', 20)], [w('w2', 25), w('w3', 5)])).toEqual([
      { week: 'w1', a: { da: 10, ltp: 10, safety: 0 }, b: null, delta: null },
      {
        week: 'w2',
        a: { da: 20, ltp: 20, safety: 0 },
        b: { da: 25, ltp: 25, safety: 0 },
        delta: 5
      },
      { week: 'w3', a: null, b: { da: 5, ltp: 5, safety: 0 }, delta: null }
    ]);
  });
});
