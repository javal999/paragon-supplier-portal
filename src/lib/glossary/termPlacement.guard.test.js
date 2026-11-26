// UCX-P9 (BL-370) — WHERE AN (i) TIP MAY SIT, AND WHICH LABELS DID NOT MOVE.
//
// Two rules this build answers, and this file is what keeps them after it:
//
//   1. TL-D4 (accepted 2026-10-29) puts the (i) tip on column headers, grid row
//      labels and KPI titles; UCX-D30 (2026-11-22) keeps it OFF form fields and
//      gives a field a visible hint instead. A form field in this tree is a
//      control inside a `<label>`, so a tip with a `<label>` ancestor is a tip
//      on a form field; a tip inside a `<form>` is the same defect one layer out.
//   2. BR-03: no agreed label changes without an owner ruling. The labels this
//      build touches are PINNED below, so a later edit that renames one goes red
//      here rather than shipping quietly.
//
// ⚠️ THE POPULATION IS DERIVED FROM THE SOURCE, NEVER LISTED. Every `.js/.jsx`
//   under `src/` is parsed with the TypeScript compiler and every `<TermTip>`,
//   `<TermLabel>` and `<TermInfo>` is found through the JSX tree — a grep would
//   miss a site split over lines and would count a mention in a comment.
//
// ⚠️ AND THE PREDICATES ARE PROBED BOTH WAYS (the `docs/findings.md` §39 rule):
//   a synthetic tip inside a `<label>` must be FLAGGED, and a synthetic tip in a
//   `<th>` must be ACQUITTED. A one-sided probe would pass a guard that condemns
//   every real site.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { resources } from '@lib/i18n';
import { TERM_LABEL_GLOSSARY } from './index';
import { isTestFile, scriptKindOf } from '@test/sourceFiles';

const ROOT = join(__dirname, '..', '..', '..');
const SRC = join(ROOT, 'src');

/** @typedef {{ readonly en: string; readonly id: string }} LocaleText */

/** The three components that render an (i) tip. */
const TIP_TAGS = new Set(['TermTip', 'TermLabel', 'TermInfo']);

/** @type {Record<string, string>} */
const EN = resources.en.translation;
/** @type {Record<string, string>} */
const ID = resources.id.translation;

/**
 * Every application source file under `src/`, excluding specs (a spec renders
 * no tip) and `.d.ts`.
 * @param {string} dir
 * @param {string[]} [out]
 * @returns {string[]}
 */
function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(name) && !name.endsWith('.d.ts') && !isTestFile(name))
      out.push(full);
  }
  return out;
}

/**
 * One tip site found in a source text.
 * @typedef {{
 *     readonly file: string;
 *     readonly line: number;
 *     readonly tag: string;
 *     readonly container: string | null;
 *   }} TipSite
 */

/**
 * The tip sites in one source text, each with the nearest enclosing JSX element
 * that is a form container (`label` or `form`), or null.
 *
 * ⚠️ `setParentNodes` is TRUE: the ancestor walk is the whole point, and a
 * source file parsed without parents has none to walk.
 * @param {string} text
 * @param {string} file
 * @returns {TipSite[]}
 */
export function tipSitesIn(text, file) {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKindOf(file));
  /** @type {TipSite[]} */
  const found = [];
  /** @param {ts.Node} node */
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      if (TIP_TAGS.has(tag)) {
        /** @type {string | null} */
        let container = null;
        /** @type {ts.Node | undefined} */
        let p = node.parent;
        while (p) {
          // ⚠️ THE CONTAINER IS THE `JsxElement`, NOT ITS `openingElement` —
          // an ancestor chain from a tip goes openingElement → jsxElement, so
          // testing `isJsxOpeningElement` here never sees a `<label>` and
          // acquits the whole tree. The probe at the foot of this file is what
          // caught that; it is the `EMPTY-INPUT-REPORTS-CLEAN` shape.
          if (ts.isJsxElement(p)) {
            const parentTag = p.openingElement.tagName.getText(sf);
            if (parentTag === 'label' || parentTag === 'form') {
              container = parentTag;
              break;
            }
          }
          p = p.parent;
        }
        found.push({
          file,
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          tag,
          container
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** Every tip site in the tree, derived. */
const ALL_SITES = sourceFiles(SRC).flatMap((f) =>
  tipSitesIn(readFileSync(f, 'utf8'), f.replace(`${ROOT}/`, ''))
);

/**
 * The sites that sit on a form field — an (i) where UCX-D30 forbids one.
 * @param {readonly TipSite[]} sites
 * @returns {string[]}
 */
const onAFormField = (sites) =>
  sites
    .filter((s) => s.container !== null)
    .map((s) => `${s.file}:${s.line} <${s.tag}> in <${s.container}>`);

/**
 * The labels this build touched or leaned on, pinned EXACTLY (BR-03). A rename
 * reddens this list, which is the point: a label changes by an owner ruling
 * with a decision ID, never by a wording pass.
 *
 * ⚠️ `as const` and NO annotation: the literal keys are the type, so
 * `TERM_LABEL_GLOSSARY[term]` indexes the closed glossary rather than a
 * widened `string`.
 */
const PINNED_LABELS = /** @type {const} */ ([
  ['grQtyCheck', { en: 'Quantity check', id: 'Pemeriksaan kuantitas' }],
  ['summaryConfirmations', { en: 'Confirmations', id: 'Konfirmasi' }],
  ['ltp', { en: 'LTP', id: 'LTP' }],
  ['ltpA', { en: 'LTP A', id: 'LTP A' }],
  ['ltpFestive', { en: 'LTP Festive', id: 'LTP Festive' }],
  ['ltpB', { en: 'LTP B', id: 'LTP B' }],
  ['daysOfSupply', { en: 'Days of supply', id: 'Hari persediaan' }],
  ['supplierCover', { en: 'Risk · supplier cover', id: 'Risiko · cakupan stok pemasok' }],
  ['forecastShortfall', { en: 'Shortfall', id: 'Kekurangan' }],
  [
    'alertLeadTimeMissing',
    {
      en: 'No supplier lead time on record: risk uses the day bands until the master data is fixed',
      id: 'Lead time pemasok belum tercatat: risiko memakai pita hari sampai data induk diperbaiki'
    }
  ]
]);

/**
 * The i18n labels this build shows beside a term, pinned in both locales.
 * @type {readonly (readonly [string, string, string])[]}
 */
const PINNED_KEYS = /** @type {const} */ ([
  ['fc.gr.col.qtyCheck', 'Quantity check (CR-25)', 'Pemeriksaan kuantitas (CR-25)'],
  ['co.change.reasonCodeNone', 'Not coded', 'Tanpa kode'],
  ['co.changeReason.ltp-dropped', 'LTP dropped', 'LTP turun'],
  ['oc.summary.short.shipping', 'Ship', 'Kirim'],
  ['ltpIn.series.A', 'LTP A', 'LTP A'],
  ['ltpIn.series.Festive', 'LTP Festive', 'LTP Festive'],
  ['ltpIn.series.B', 'LTP B', 'LTP B'],
  ['co.runOut.due', 'Raise the next PO', 'Buat PO berikutnya'],
  ['co.runOut.nextInLine', 'Next in line:', 'Berikutnya:']
]);

describe('UCX-P9 · an (i) tip never sits on a form field (TL-D4, UCX-D30)', () => {
  it('derives the tip population and names a known site in it', () => {
    // Anti-vacuity: a scanner that finds nothing would acquit the whole tree.
    const files = new Set(ALL_SITES.map((s) => s.file));
    expect(files.size, 'no file in the tree renders a tip — the matcher is dead').toBeGreaterThan(
      0
    );
    expect([...files]).toContain('src/pages-v2/poOnHold/PoOnHoldPanel.jsx');
    expect([...files]).toContain('src/pages-v2/SupplierGoodsReceipts.jsx');
    // A known-ABSENT member, same run: a lib file with no JSX renders no tip.
    expect([...files]).not.toContain('src/lib/format.js');
  });

  it('no tip has a <label> or <form> ancestor', () => {
    const bad = onAFormField(ALL_SITES);
    expect(bad, `an (i) sits on a form field (UCX-D30):\n${bad.join('\n')}`).toEqual([]);
  });

  it('still fires at the defect it removed, and acquits a header', () => {
    // KNOWN-BAD: a tip inside the label that wraps a control.
    const bad = tipSitesIn(
      'const A = () => (<label>Qty<input /><TermTip term="Reorder point" /></label>);',
      'probe.jsx'
    );
    expect(onAFormField(bad)).toEqual(['probe.jsx:1 <TermTip> in <label>']);
    // KNOWN-BAD, one layer out: a tip inside a form.
    const inForm = tipSitesIn(
      'const B = () => (<form><TermLabel term="grQtyCheck" /></form>);',
      'probe.jsx'
    );
    expect(onAFormField(inForm)).toEqual(['probe.jsx:1 <TermLabel> in <form>']);
    // KNOWN-GOOD: the legal home — a column header — must pass.
    const good = tipSitesIn(
      'const C = () => (<th><TermLabel term="grQtyCheck" /></th>);',
      'probe.jsx'
    );
    expect(good).toHaveLength(1);
    expect(onAFormField(good)).toEqual([]);
  });
});

describe('UCX-P9 · no agreed label changed (TL BR-03)', () => {
  it('pins every term label this build touched or relied on', () => {
    const bad = PINNED_LABELS.filter(
      ([term, label]) =>
        TERM_LABEL_GLOSSARY[term].label.en !== label.en ||
        TERM_LABEL_GLOSSARY[term].label.id !== label.id
    ).map(([term, label]) => {
      const got = TERM_LABEL_GLOSSARY[term].label;
      return `${term}: expected ${JSON.stringify(label)}, got ${JSON.stringify(got)}`;
    });
    expect(bad, `an agreed label moved:\n${bad.join('\n')}`).toEqual([]);
  });

  it('pins the i18n labels the pages show beside the explained terms', () => {
    const bad = PINNED_KEYS.flatMap(([key, en, id]) => [
      ...(EN[key] === en ? [] : [`${key} (en: ${JSON.stringify(EN[key])})`]),
      ...(ID[key] === id ? [] : [`${key} (id: ${JSON.stringify(ID[key])})`])
    ]);
    expect(bad, `a page label moved:\n${bad.join('\n')}`).toEqual([]);
  });

  it('the buyer keeps the internal code the supplier no longer reads', () => {
    // UCX-F25: the PTI column header may keep CR-25; the supplier row label is
    // the new `grQtyCheck` term. If a later edit folds the two together, one of
    // the two assertions above goes red — this one says which half is which.
    expect(EN['fc.gr.col.qtyCheck']).toContain('CR-25');
    expect(TERM_LABEL_GLOSSARY.grQtyCheck.label.en).not.toContain('CR-25');
    expect(TERM_LABEL_GLOSSARY.grQtyCheck.label.id).not.toContain('CR-25');
  });
});
