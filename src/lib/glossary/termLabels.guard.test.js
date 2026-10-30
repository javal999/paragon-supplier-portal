// BL-233 — the term-label glossary's guards (spec AC-01, AC-04, AC-05, AC-06).
//
// AC-04: a label shown through an i18n key (a CSV header, a sentence, an older
// call site) must be the label of its glossary entry, in EN and in ID; the
// label shown through `TermLabel` IS the entry, so this pins the other copies.
// AC-05: every line of every entry has EN and ID text. AC-06: every "Also
// called" name names its source (BR-10). Each predicate is fired at a known-bad
// and a known-good input below, so a predicate that matches nothing cannot pass
// green over the real glossary.
import { describe, it, expect } from 'vitest';
import { resources } from '@lib/i18n';
import { TERM_LABEL_GLOSSARY } from './index';

/** @typedef {import('./types').TermEntry} TermEntry */
/** @typedef {{ readonly en: string; readonly id: string }} LocaleText */

/** @type {Record<string, string>} */
const EN = resources.en.translation;
/** @type {Record<string, string>} */
const ID = resources.id.translation;

const ENTRIES = /** @type {[string, TermEntry][]} */ (Object.entries(TERM_LABEL_GLOSSARY));

/**
 * A locale pair with a side missing or blank.
 * @param {LocaleText | undefined} text
 * @returns {boolean}
 */
const lacksALocale = (text) => text !== undefined && (!text.en?.trim() || !text.id?.trim());

/**
 * The lines of an entry that lack EN or ID (AC-05).
 * @param {TermEntry} e
 * @returns {string[]}
 */
const missingLocales = (e) =>
  [
    ['label', e.label],
    ['definition', { en: e.en, id: e.id }],
    ['formula', e.formula],
    ['notToConfuse', e.notToConfuse],
    ...(e.alsoCalled ?? []).map((a, i) => [`alsoCalled[${i}].source`, a.source])
  ]
    .filter(([, text]) => lacksALocale(/** @type {LocaleText | undefined} */ (text)))
    .map(([line]) => /** @type {string} */ (line));

/**
 * "Also called" names with no name or no source (AC-06, BR-10).
 * @param {TermEntry} e
 * @returns {string[]}
 */
const unsourcedNames = (e) =>
  (e.alsoCalled ?? [])
    .filter((a) => !a.name?.trim() || lacksALocale(a.source) || !a.source)
    .map((a) => a.name || '(no name)');

/**
 * The i18n keys whose text differs from the entry's label (AC-04).
 * @param {TermEntry} e
 * @param {Record<string, string>} en
 * @param {Record<string, string>} id
 * @returns {string[]}
 */
const drifted = (e, en, id) =>
  (e.labelKeys ?? []).flatMap((k) => [
    ...(en[k] === e.label.en ? [] : [`${k} (en: ${JSON.stringify(en[k])})`]),
    ...(id[k] === e.label.id ? [] : [`${k} (id: ${JSON.stringify(id[k])})`])
  ]);

/** @param {string} text */
const words = (text) => text.trim().split(/\s+/).length;

/**
 * A requirement or decision code (DRC-10, CR-24, MR-7, E14-04, BR-05, INV-D8 …).
 * Codes are for the builders' documents; the reader sees words (F-18).
 */
const CODE = /\b(?:DRC|CR|MR|CAP|INV|ENG|E14|BR|REQ|TL)-[A-Z]?\d+[a-z]?\b/;

/**
 * The lines of an entry, in both locales, that show a requirement code.
 * @param {TermEntry} e
 * @returns {(string | undefined)[]}
 */
const codedLines = (e) =>
  [
    e.label.en,
    e.label.id,
    e.en,
    e.id,
    e.formula?.en,
    e.formula?.id,
    e.notToConfuse?.en,
    e.notToConfuse?.id,
    ...(e.alsoCalled ?? []).flatMap((a) => [a.name, a.source.en, a.source.id])
  ].filter((line) => typeof line === 'string' && CODE.test(line));

describe('term-label glossary (BL-233)', () => {
  it('holds the wave 1 to 4 population, named', () => {
    // A named member, not a count: the guards below run over these entries.
    expect(Object.keys(TERM_LABEL_GLOSSARY)).toEqual(
      expect.arrayContaining([
        'demandAnticipation',
        'carryOver',
        'alertDemandAnticipationUnabsorbed',
        'freeToCallOff',
        'tradeNameStatus',
        'ropFisik',
        'maxStockSupplier',
        'prGenerated',
        'ruleOverride'
      ])
    );
  });

  it('AC-04: every i18n copy of a label is the label of its glossary entry, in EN and ID', () => {
    const bad = ENTRIES.flatMap(([term, e]) => drifted(e, EN, ID).map((d) => `${term}: ${d}`));
    expect(bad, `label drifted from its glossary entry:\n${bad.join('\n')}`).toEqual([]);
  });

  it('AC-05: every line of every entry has EN and ID text', () => {
    const bad = ENTRIES.flatMap(([term, e]) => missingLocales(e).map((l) => `${term}.${l}`));
    expect(bad, `line missing a locale:\n${bad.join('\n')}`).toEqual([]);
  });

  it('AC-06: every "Also called" name names its source', () => {
    const bad = ENTRIES.flatMap(([term, e]) => unsourcedNames(e).map((n) => `${term}: ${n}`));
    expect(bad, `name with no source:\n${bad.join('\n')}`).toEqual([]);
  });

  it('F-18: no line of any tip shows a requirement code', () => {
    const bad = ENTRIES.flatMap(([term, e]) => codedLines(e).map((l) => `${term}: ${l}`));
    expect(bad, `requirement code on screen:\n${bad.join('\n')}`).toEqual([]);
  });

  it('BR-07: a definition is at most 40 words', () => {
    const long = ENTRIES.filter(([, e]) => words(e.en) > 40).map(
      ([term, e]) => `${term} (${words(e.en)})`
    );
    expect(long, `definition over 40 words:\n${long.join('\n')}`).toEqual([]);
  });

  it('every i18n key an entry names exists', () => {
    const bad = ENTRIES.flatMap(([term, e]) =>
      (e.labelKeys ?? []).filter((k) => !(k in EN)).map((k) => `${term}: ${k}`)
    );
    expect(bad).toEqual([]);
  });

  it('TL-D1: the figure reads "Demand anticipation (DA)" in EN and ID and says it is not a Delivery Agreement', () => {
    const e = TERM_LABEL_GLOSSARY.demandAnticipation;
    expect(e.label).toEqual({ en: 'Demand anticipation (DA)', id: 'Demand anticipation (DA)' });
    expect(e.notToConfuse?.en).toMatch(/^Delivery Agreement/);
    expect(e.alsoCalled?.map((a) => a.name)).toEqual(['DA']);
  });

  it('TL-D8: the carried quantity reads "Carry-over" in EN and ID, also called sisa DA', () => {
    const e = TERM_LABEL_GLOSSARY.carryOver;
    expect(e.label).toEqual({ en: 'Carry-over', id: 'Carry-over' });
    expect(e.alsoCalled?.map((a) => a.name)).toEqual(['sisa DA']);
  });

  it('TL-D14: the 13-week average reads the team’s "Moving average consumption" in EN and ID', () => {
    expect(TERM_LABEL_GLOSSARY.consumptionAverage.label).toEqual({
      en: 'Moving average consumption',
      id: 'Moving average consumption'
    });
  });

  it('TL-D15: ROP Order is under the safety order’s "Not", never its "Also called"', () => {
    const e = TERM_LABEL_GLOSSARY.safetyOrder;
    expect(e.notToConfuse?.en).toMatch(/ROP Order \(LTP × lead time \+ safety order\)/);
    const names = ENTRIES.flatMap(([, x]) => (x.alsoCalled ?? []).map((a) => a.name));
    expect(names).not.toContain('ROP Order');
  });

  it('TL-D12: Max reads "Max Stock" and the supplier’s "Max Stock Supplier", in EN and ID', () => {
    expect(TERM_LABEL_GLOSSARY.maxStock.label).toEqual({ en: 'Max Stock', id: 'Max Stock' });
    expect(TERM_LABEL_GLOSSARY.maxStockSupplier.label).toEqual({
      en: 'Max Stock Supplier',
      id: 'Max Stock Supplier'
    });
  });

  it('TL-D6 / TL-D11: the team’s English words stay English in ID', () => {
    for (const term of /** @type {const} */ ([
      'ropSupplier',
      'uplift',
      'protectionBuffer',
      'strategicBuffer',
      'replenishmentCycle'
    ])) {
      const { label } = TERM_LABEL_GLOSSARY[term];
      expect(label.id, term).toBe(label.en);
    }
    expect(TERM_LABEL_GLOSSARY.safetyOrderRopOrder.label.id).toBe('Safety order (ROP Order)');
    expect(TERM_LABEL_GLOSSARY.bottleneckLeadTime.label.id).toMatch(/\(ROP Supplier\)$/);
  });

  it('TL-D12 / TL-D8 / TL-D1 on the what-if: PR Generated, Incoming, Carry-over, (DA)', () => {
    expect(TERM_LABEL_GLOSSARY.prGenerated.label).toEqual({
      en: 'PR Generated',
      id: 'PR Generated'
    });
    expect(TERM_LABEL_GLOSSARY.whatIfIncoming.label.en).toBe('Incoming');
    expect(TERM_LABEL_GLOSSARY.whatIfIncoming.notToConfuse?.en).toMatch(/^Incoming DA/);
    expect(TERM_LABEL_GLOSSARY.whatIfCarryOver.label).toEqual({
      en: 'Carry-over',
      id: 'Carry-over'
    });
    for (const term of /** @type {const} */ (['daOverLeadTime', 'daCurrentPlan', 'daScenario'])) {
      const { label } = TERM_LABEL_GLOSSARY[term];
      expect(label.en, term).toMatch(/^Demand anticipation \(DA\)/);
      expect(label.id, term).toMatch(/^Demand anticipation \(DA\)/);
    }
  });

  it('TL-D9 / TL-D13: the labels waiting on the team keep their wording', () => {
    expect(TERM_LABEL_GLOSSARY.wouldBe.label).toEqual({
      en: 'Would be',
      id: 'Jika dihitung ulang'
    });
    expect(TERM_LABEL_GLOSSARY.surplusAbsorbed.label).toEqual({
      en: 'Surplus absorbed',
      id: 'Kelebihan diserap'
    });
    expect(TERM_LABEL_GLOSSARY.daAfterCheck.label).toEqual({
      en: 'After the check',
      id: 'Setelah pemeriksaan'
    });
  });
});

describe('the predicates still fire, both ways', () => {
  /** @type {TermEntry} */
  const good = {
    label: { en: 'Gap', id: 'Kekurangan' },
    en: 'A real definition.',
    id: 'Definisi yang nyata.',
    alsoCalled: [{ name: 'X', source: { en: 'Team', id: 'Tim' } }],
    labelKeys: ['k']
  };

  it('drifted flags a key whose text differs in either locale, and passes an equal one', () => {
    expect(drifted(good, { k: 'Gap' }, { k: 'Kekurangan' })).toEqual([]);
    expect(drifted(good, { k: 'Gaps' }, { k: 'Kekurangan' })).toEqual(['k (en: "Gaps")']);
    expect(drifted(good, { k: 'Gap' }, {})).toEqual(['k (id: undefined)']);
  });

  it('missingLocales flags a blank ID line, and passes a full entry', () => {
    expect(missingLocales(good)).toEqual([]);
    expect(missingLocales({ ...good, formula: { en: 'a − b', id: ' ' } })).toEqual(['formula']);
  });

  it('codedLines flags a code in a formula or a source, and passes plain words', () => {
    expect(codedLines(good)).toEqual([]);
    expect(codedLines({ ...good, formula: { en: 'LTP × lead time (DRC-10).', id: 'x' } })).toEqual([
      'LTP × lead time (DRC-10).'
    ]);
    expect(
      codedLines({ ...good, alsoCalled: [{ name: 'X', source: { en: 'hub, CR-24', id: 'hub' } }] })
    ).toEqual(['hub, CR-24']);
  });

  it('unsourcedNames flags a name with no source, and passes a sourced one', () => {
    expect(unsourcedNames(good)).toEqual([]);
    expect(
      unsourcedNames({
        ...good,
        alsoCalled: [{ name: 'Y', source: /** @type {LocaleText} */ ({ en: '', id: '' }) }]
      })
    ).toEqual(['Y']);
  });
});
