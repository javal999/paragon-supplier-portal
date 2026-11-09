// BL-267 (PEX-5) — the LTP inputs rules: the doc's AC-01 example, BR-02 (A falls
// back to the forecast source), BR-07 (no choice reads A), the refusals, the file.
import { describe, expect, it } from 'vitest';
import {
  choiceInForce,
  ltpWeeks,
  materialLtpInputs,
  parseLtpCsv,
  parseLtpInputKey,
  ltpInputRefusal,
  ltpChoiceKey,
  ltpUploadKey,
  protectionForRopOrder
} from './ltpInputRules';
import { ropOrder } from './osipRules';

const W = ['2026-11-09', '2026-11-16', '2026-11-23'];
/** @param {any} p */
const upload = (series, qty, at = '2026-11-09T01:00:00.000Z') => ({
  key: ltpUploadKey('M-X', series),
  kind: 'upload',
  materialCode: 'M-X',
  series,
  weeks: Object.fromEntries(W.map((w) => [w, qty])),
  sourceFile: `${series}.csv`,
  choice: null,
  previousChoice: null,
  setAt: at,
  setBy: { kind: 'UNATTRIBUTED' }
});
/** @param {any} choice */
const choose = (choice) => ({
  key: ltpChoiceKey('M-X'),
  kind: 'choice',
  materialCode: 'M-X',
  series: null,
  weeks: null,
  sourceFile: null,
  choice,
  previousChoice: null,
  setAt: '2026-11-09T02:00:00.000Z',
  setBy: { kind: 'UNATTRIBUTED' }
});

describe('PEX-5 AC-01', () => {
  const rows = /** @type {any[]} */ ([
    upload('A', 100),
    upload('Festive', 130),
    upload('B', 115),
    choose('Festive')
  ]);
  const lw = ltpWeeks(W, [1, 1, 1], materialLtpInputs(rows, 'M-X'), 1);
  it('DA reads the chosen LTP (130)', () => expect(lw.used).toEqual([130, 130, 130]));
  it('strategic buffer = Festive − A = 30', () => expect(lw.strategicBuffer).toEqual([30, 30, 30]));
  it('protection buffer = B − A = 15', () => expect(lw.protectionBuffer).toEqual([15, 15, 15]));
  it('ROP Order adds the protection buffer over the horizon only', () => {
    expect(protectionForRopOrder(lw, 2)).toBe(30);
    expect(ropOrder({ cycleStock: 200, safetyOrder: 50, protectionBuffer: 30 })).toBe(280);
    expect(ropOrder({ cycleStock: 200, safetyOrder: 50 })).toBe(250);
  });
});

describe('PEX-6 AC-01 precondition (a B upload with choice A moves nothing)', () => {
  const rows = /** @type {any[]} */ ([upload('A', 100), upload('B', 115)]);
  it('DA stays on A', () =>
    expect(ltpWeeks(W, [1, 1, 1], materialLtpInputs(rows, 'M-X'), 1).used).toEqual([
      100, 100, 100
    ]));
});

describe('BR-02 and BR-07', () => {
  it('with nothing uploaded, DA reads the forecast source and the choice is A', () => {
    const lw = ltpWeeks(W, [7, 8, 9], materialLtpInputs([], 'M-X'), 1);
    expect(lw.used).toEqual([7, 8, 9]);
    expect(lw.aFromUpload).toBe(false);
    expect(lw.choice).toBe('A');
  });
  it('a choice of a series that is not uploaded reads A and says so', () => {
    const rows = /** @type {any[]} */ ([upload('A', 100), choose('B')]);
    const lw = ltpWeeks(W, [1, 1, 1], materialLtpInputs(rows, 'M-X'), 1);
    expect(lw.used).toEqual([100, 100, 100]);
    expect(lw.flags).toContain('CHOICE_SERIES_NOT_UPLOADED');
  });
  it('a later upload replaces the series; the latest choice wins', () => {
    const rows = /** @type {any[]} */ ([
      upload('A', 100),
      upload('A', 120),
      choose('B'),
      choose('A')
    ]);
    expect(ltpWeeks(W, [0, 0, 0], materialLtpInputs(rows, 'M-X'), 1).a).toEqual([120, 120, 120]);
    expect(choiceInForce(rows, 'M-X')).toBe('A');
  });
  it('a material is split to a supplier by its share', () => {
    const rows = /** @type {any[]} */ ([upload('A', 100)]);
    expect(ltpWeeks(W, [0, 0, 0], materialLtpInputs(rows, 'M-X'), 0.25).a).toEqual([25, 25, 25]);
  });
  it('a buffer is never below 0', () => {
    const rows = /** @type {any[]} */ ([upload('A', 100), upload('Festive', 80)]);
    expect(ltpWeeks(W, [0, 0, 0], materialLtpInputs(rows, 'M-X'), 1).strategicBuffer).toEqual([
      0, 0, 0
    ]);
  });
});

describe('keys, refusals and the file', () => {
  it('parses both key kinds and refuses the rest', () => {
    expect(parseLtpInputKey('upload|M-X|Festive')).toEqual({
      kind: 'upload',
      materialCode: 'M-X',
      series: 'Festive'
    });
    expect(parseLtpInputKey('choice|M-X')).toEqual({ kind: 'choice', materialCode: 'M-X' });
    expect(parseLtpInputKey('upload|M-X|C')).toBeNull();
    expect(parseLtpInputKey('choice|M-X|A')).toBeNull();
  });
  it('refuses a choice outside A, Festive, B, and an upload with no file name or a non-Monday', () => {
    expect(ltpInputRefusal({ kind: 'choice', materialCode: 'M-X' }, { ltpChoice: 'C' })).toMatch(
      /LTP_CHOICE_INVALID/
    );
    const k = /** @type {const} */ ({ kind: 'upload', materialCode: 'M-X', series: 'A' });
    expect(ltpInputRefusal(k, { weeks: { '2026-11-09': 1 }, sourceFile: ' ' })).toMatch(
      /SOURCE_FILE/
    );
    expect(ltpInputRefusal(k, { weeks: { '2026-11-10': 1 }, sourceFile: 'a.csv' })).toMatch(
      /not a Monday/
    );
    expect(ltpInputRefusal(k, { weeks: { '2026-11-09': -1 }, sourceFile: 'a.csv' })).toMatch(
      /not a number/
    );
    expect(ltpInputRefusal(k, { weeks: { '2026-11-09': 1 }, sourceFile: 'a.csv' })).toBeNull();
  });
  it('reads a file with or without a header, and refuses a bad line', () => {
    expect(parseLtpCsv('week,quantity\n2026-11-09,100\n2026-11-16;120\n')).toEqual({
      weeks: { '2026-11-09': 100, '2026-11-16': 120 }
    });
    expect(parseLtpCsv('2026-11-09,100')).toEqual({ weeks: { '2026-11-09': 100 } });
    expect('refusal' in parseLtpCsv('2026-11-09,abc')).toBe(true);
    expect('refusal' in parseLtpCsv('2026-11-10,5')).toBe(true);
    expect('refusal' in parseLtpCsv('')).toBe(true);
  });
});
