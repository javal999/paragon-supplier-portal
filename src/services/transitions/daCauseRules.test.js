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
  it('PSC-4 BR-01: only an LTP A upload is a cause; B, Festive and a choice are not', () => {
    const rows = [up('B', 115), up('Festive', 130), pick('Festive', 'A')];
    expect(daCauses({ ...base, ltpRows: rows })).toEqual([]);
    const [c] = daCauses({ ...base, ltpRows: [...rows, up('A', 120)] });
    expect(c ? daCauseText(c, (k) => k) : '').toBe('ltpA — → 120');
  });
  it('no DA week moved: no cause, the changes stay input changes (BR-03)', () => {
    expect(daCauses({ ...base, moved: false, ltpRows: [up('A', 120), pick('B', 'A')] })).toEqual(
      []
    );
  });
  it('only rows after the previous publication count, and an upload shows the series total before and after', () => {
    const rows = [up('A', 100), up('A', 120)];
    const [c] = daCauses({ ...base, since: { ltp: 1, osip: 0 }, ltpRows: rows });
    expect(c).toMatchObject({ kind: 'ltpA', before: 100, after: 120 });
    expect(daCauses({ ...base, since: { ltp: 2, osip: 0 }, ltpRows: rows })).toEqual([]);
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
      ltpRows: [],
      osipRows: [row('z|M', 'z'), row('z|OTHER', 'z'), row('f|sup', 'f')]
    });
    expect(causes).toHaveLength(1);
    expect(causes[0]).toMatchObject({ kind: 'safetyStock', detail: 'z', before: 1.65, after: 2 });
    expect(daCauseText(causes[0], () => 'Safety stock')).toBe('Safety stock Z 1.65 → 2');
  });
});

describe('daCauses: the safety stock switch (PEX-13 BR-03)', () => {
  /** @param {string} key @param {string} param @param {boolean | null} value @param {boolean | null} previous */
  const sw = (key, param, value, previous) => ({
    key,
    param,
    value,
    previous,
    reason: 'Supplier audit pending',
    setAt: 't',
    setBy: by
  });
  const args = { ...base, ltpRows: [] };

  it('switching it off is a cause, with the reason, when DA moved', () => {
    const causes = daCauses({
      ...args,
      osipRows: [sw('safetyStockOn|M', 'safetyStockOn', false, null)]
    });
    expect(causes).toHaveLength(1);
    expect(causes[0]).toMatchObject({
      kind: 'safetySwitch',
      before: 'on',
      after: 'off',
      reason: 'Supplier audit pending'
    });
    expect(daCauseText(causes[0], () => 'Safety stock switch')).toBe(
      'Safety stock switch on → off'
    );
  });

  it('switching it back on reads off → on; a reset to the default reads on', () => {
    const [c] = daCauses({
      ...args,
      osipRows: [sw('safetyStockOn|M', 'safetyStockOn', true, false)]
    });
    expect(c).toMatchObject({ before: 'off', after: 'on' });
    const [d] = daCauses({
      ...args,
      osipRows: [sw('safetyStockOn|M', 'safetyStockOn', null, false)]
    });
    expect(d).toMatchObject({ before: 'off', after: 'on' });
  });

  it('is no cause when no DA week moved (PEX-6 BR-03), for another material, or before the mark', () => {
    const row = sw('safetyStockOn|M', 'safetyStockOn', false, null);
    expect(daCauses({ ...args, moved: false, osipRows: [row] })).toEqual([]);
    expect(
      daCauses({
        ...args,
        osipRows: [sw('safetyStockOn|OTHER', 'safetyStockOn', false, null)]
      })
    ).toEqual([]);
    expect(daCauses({ ...args, since: { ltp: 0, osip: 1 }, osipRows: [row] })).toEqual([]);
  });

  it('the protection buffer switch is not a cause: it moves ROP Order only, no DA week', () => {
    expect(
      daCauses({
        ...args,
        osipRows: [sw('protectionBufferOn|M', 'protectionBufferOn', false, null)]
      })
    ).toEqual([]);
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
