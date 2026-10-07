// ─────────────────────────────────────────────────────────────────────────────
// GL-1 · EVERY REFUSAL SITE HAS A DESTINATION — derived, never listed.
//
// `HALAL-REFUSAL-DEAD-ENDS-01` is about a refusal that tells a clerk only that
// they are stuck. The chips fix that at the sites that exist TODAY; this file is
// what stops site number twenty-one from shipping as a fresh dead end.
//
// ── THE DERIVATION ──────────────────────────────────────────────────────────
//   The population is NOT a list of files. It is derived, in this order:
//     1. the REGISTERED vocabularies, read from `GLOSSARY_REGISTRIES` — so a
//        vocabulary added to the glossary immediately widens this guard;
//     2. every `Record<Vocab, string>` message map declared anywhere under
//        `src/`, found by scanning source;
//     3. every USE of one of those maps;
//     4. each use split into RENDER (JSX — a chip can attach) and NON-RENDER
//        (the value is handed to a string-typed API — a chip cannot).
//   Every RENDER use must offer a glossary destination. Nothing is exempted by
//   name; a use is exempt only if the derivation can SEE that it is not JSX.
//
// ── ⚠️ WHY THE INSTRUMENT IS SANITY-CHECKED BEFORE IT IS BELIEVED ───────────
//   `CENSUS-MUST-DERIVE-01`, and the two R1 failures behind it: a matcher that
//   comes back clean is reporting on itself until proven otherwise. So the first
//   test below asserts a KNOWN-TRUE render site is found and a KNOWN-TRUE
//   string-API use is correctly excluded, and the population is asserted to be
//   neither zero nor suspiciously small — BEFORE any conclusion is drawn from it.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import ts from 'typescript';
import { GLOSSARY_REGISTRIES } from '@lib/glossary';
import { isTestFile, scriptKindOf } from '@test/sourceFiles';

const ROOT = join(__dirname, '..', '..', '..');
const SRC = join(ROOT, 'src');

/**
 * Every `.ts`/`.tsx` under `src/`, excluding specs (a spec renders no refusal).
 * @param {string} dir
 * @param {string[]} [out]
 * @returns {string[]}
 */
function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(name) && !isTestFile(name)) out.push(full);
  }
  return out;
}

const REGISTERED_VOCABULARIES = GLOSSARY_REGISTRIES.map(
  (r) => /** @type {string} */ (r.sourceType)
);

/**
 * 1-indexed
 * `chipsInFile`:  Chip elements anywhere in the file — the proximity check's counterweight.
 *
 * @typedef {{
 *     readonly file: string;
 *     readonly line: number;
 *     readonly mapName: string;
 *     readonly vocabulary: string;
 *     readonly isRender: boolean;
 *     readonly hasChip: boolean;
 *     readonly chipsInFile: number;
 *   }} MapUse
 */

/**
 * How far a chip may sit from the message it belongs to. Twenty lines, because
 * the FX refusal's interpolation object alone runs thirteen — a tighter window
 * accused a site that was correctly chipped.
 *
 * ⚠️ A window this wide can in principle be fooled by a NEIGHBOUR's chip, so it
 * is not the only check: `chips per file >= render uses per file` runs beside it
 * below, and a genuinely missing chip fails that one regardless of proximity.
 */
const CHIP_WINDOW = 20;
/** How far back to look for the string-typed API a non-render use feeds. */
const CONTEXT_WINDOW = 6;

/**
 * Every `const`/`let` NAME initialised with an object literal and declared as
 * `Record<…>`, with the generic body as written (`A, B`).
 *
 * Reads the declaration in EITHER form, through the TypeScript parser
 * (frontend-standard Phase 4): the TS annotation
 * `const X: Record<A, string> = {` and the JSDoc one
 * `/** &#64;type {Record<A, string>} *\/ const X = {` (`ts.getJSDocType`). The
 * regex it replaces, `(?:const|let)\s+(\w+)\s*:\s*Record<…>\s*=\s*\{`, read
 * only the first, so every converted `.js`/`.jsx` map left the population.
 * @param {string} src
 * @param {string} full
 * @returns {Array<[name: string, body: string]>}
 */
function recordDecls(src, full) {
  const sf = ts.createSourceFile(full, src, ts.ScriptTarget.Latest, true, scriptKindOf(full));
  /** @type {Array<[string, string]>} */
  const out = [];
  /**
   * @param {ts.Node} n
   * @returns {void}
   */
  const visit = (n) => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer &&
      n.initializer.getText(sf).startsWith('{') &&
      ts.isVariableDeclarationList(n.parent) &&
      n.parent.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)
    ) {
      const type = n.type ?? ts.getJSDocType(n);
      if (
        type &&
        ts.isTypeReferenceNode(type) &&
        type.typeName.getText(sf) === 'Record' &&
        type.typeArguments
      ) {
        out.push([n.name.text, type.typeArguments.map((a) => a.getText(sf)).join(', ')]);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/**
 * Whether the lines before a use show the message going to a string-typed API:
 * a toast `description:`, or a helper whose return type is `string`. The return
 * type is read in EITHER form: the TS annotation `(…): string =>` on the
 * declaration line, or, once converted to JS, the JSDoc `&#64;returns {string}`
 * in the doc block ABOVE the declaration (frontend-standard Phase 4, B6/B7) —
 * so for the JSDoc form the window is extended upward over the doc block of the
 * nearest declaration inside it. ONE definition, used by the derivation and by
 * the ruling test, so the two cannot disagree.
 * @param {readonly string[]} lines  the file's lines
 * @param {number} i  0-based index of the use
 * @returns {boolean}
 */
function feedsStringApi(lines, i) {
  const from = Math.max(0, i - CONTEXT_WINDOW);
  const back = lines.slice(from, i + 1).join('\n');
  if (/\bdescription:/.test(back) || /\)\s*:\s*string\s*=>/.test(back)) return true;
  // The nearest declaration in the window, then the doc block directly above it.
  let decl = -1;
  for (let k = i; k >= from; k -= 1) {
    if (/^\s*(?:export\s+)?(?:const|let|function)\s/.test(lines[k])) {
      decl = k;
      break;
    }
  }
  if (decl === -1) return /@returns \{string\}/.test(back);
  let top = decl;
  while (top > 0 && /^\s*(?:\/\*\*|\*)/.test(lines[top - 1])) top -= 1;
  return /@returns \{string\}/.test(lines.slice(top, i + 1).join('\n'));
}

/** @returns {MapUse[]} */
function deriveUses() {
  /** @type {MapUse[]} */
  const uses = [];
  // The generic body is captured WHOLE (`Record< … > = {`) rather than matched
  // key-first, so both halves can be tested. Matching only the key type swept in
  // `ingest.js`'s `Record<QtyRefusalReason, ParseReason>` — a union-to-union
  // translation table in a service, with no message and no surface to chip.
  for (const full of sourceFiles(SRC)) {
    const src = readFileSync(full, 'utf8');
    const file = relative(ROOT, full).split(sep).join('/');
    const maps = /** @type {Map<string, string>} */ (new Map());
    for (const [name, body] of recordDecls(src, full)) {
      // `Exclude<Vocab, …>` counts: a map over a NARROWED registered vocabulary
      // is still a map over registered terms (`RFQ_BUDGET_REFUSAL_KEY` is this).
      const vocabulary = REGISTERED_VOCABULARIES.find((v) =>
        new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(body)
      );
      // …and the VALUE must be an i18n key. That is what makes it a MESSAGE map
      // — the shape whose member is already the key of a user-facing sentence.
      if (vocabulary && /,\s*string\s*$/.test(body.trim())) maps.set(name, vocabulary);
    }
    if (maps.size === 0) continue;

    const lines = src.split(/\r?\n/);
    const chipsInFile = (src.match(/<GlossaryTermChip\b/g) ?? []).length;
    for (let i = 0; i < lines.length; i += 1) {
      for (const [mapName, vocabulary] of maps) {
        // A USE, not the declaration: the map name followed by a `[` index.
        if (!new RegExp(`\\b${mapName}\\s*\\[`).test(lines[i])) continue;
        if (/:\s*Record</.test(lines[i])) continue;

        // NON-RENDER: the message is being handed to a string-typed API — a
        // toast `description`, or a helper that returns a bare i18n key which a
        // toast then consumes. Neither can hold a React element.
        const isRender = !feedsStringApi(lines, i);
        const ahead = lines.slice(i, i + CHIP_WINDOW + 1).join('\n');
        uses.push({
          file,
          line: i + 1,
          mapName,
          vocabulary,
          isRender,
          hasChip: /<GlossaryTermChip\b/.test(ahead),
          chipsInFile
        });
      }
    }
  }
  return uses;
}

const USES = deriveUses();

describe('GL-1 chip coverage — the instrument, before the conclusion', () => {
  it('scans the REGISTERED vocabularies, read from the glossary itself', () => {
    expect(REGISTERED_VOCABULARIES.length).toBeGreaterThan(10);
    // The four that actually reach a refusal surface today. If the glossary ever
    // drops one of these, this guard silently stops covering its sites.
    expect(REGISTERED_VOCABULARIES).toEqual(
      expect.arrayContaining([
        'QtyRefusalReason',
        'FxRefusalReason',
        'HalalRefusalReason',
        'BpomRefusalReason'
      ])
    );
  });

  it('finds a population that is neither empty nor suspiciously small', () => {
    // Twenty-odd message-map uses across a dozen surfaces. A single-digit answer
    // here means the matcher stopped seeing the tree, not that the tree changed.
    expect(USES.length).toBeGreaterThan(15);
    expect(new Set(USES.map((u) => u.file)).size).toBeGreaterThan(8);
  });

  it('finds a KNOWN-TRUE render site — the goods-receipt halal refusal', () => {
    // The exact site HALAL-REFUSAL-DEAD-ENDS-01 was found at.
    const halal = USES.filter(
      (u) => u.file.endsWith('GRInspectionWizard.jsx') && u.vocabulary === 'HalalRefusalReason'
    );
    expect(halal.length).toBeGreaterThan(0);
    expect(halal.every((u) => u.isRender)).toBe(true);
  });

  it('classifies a KNOWN-TRUE string-API use as NON-render', () => {
    // `useToast({ description })` is typed `string`. This must come back
    // non-render, or the guard would be demanding an impossible chip.
    const toastBound = USES.filter((u) => !u.isRender);
    expect(toastBound.length).toBeGreaterThan(0);
    expect(toastBound.some((u) => u.file.endsWith('SupplierForecasts.jsx'))).toBe(true);
  });
});

describe('GL-1 chip coverage — the conclusion (HALAL-REFUSAL-DEAD-ENDS-01)', () => {
  it('EVERY rendered refusal over a registered vocabulary offers a definition', () => {
    const naked = USES.filter((u) => u.isRender && !u.hasChip).map(
      (u) => `${u.file}:${u.line} — ${u.mapName}<${u.vocabulary}> has no glossary destination`
    );
    expect(naked, `a refusal renders with nowhere to go from:\n${naked.join('\n')}`).toEqual([]);
  });

  it('carries at least one chip PER rendered refusal in each file', () => {
    // The counterweight to a 20-line proximity window: a file with three
    // rendered refusals and two chips fails here even if all three happen to sit
    // within twenty lines of the same two.
    const short = [...new Set(USES.filter((u) => u.isRender).map((u) => u.file))]
      .map((file) => {
        const inFile = USES.filter((u) => u.file === file && u.isRender);
        return { file, need: inFile.length, have: inFile[0].chipsInFile };
      })
      .filter((r) => r.have < r.need)
      .map((r) => `${r.file} — ${r.need} rendered refusals, ${r.have} chips`);
    expect(short, `fewer chips than rendered refusals:\n${short.join('\n')}`).toEqual([]);
  });

  it('covers every surface that renders one, in both personas', () => {
    const rendering = new Set(USES.filter((u) => u.isRender).map((u) => u.file));
    // The chips are not a buyer feature: a supplier hits a refusal on their own
    // orders and forecasts, and lands on the same persona-neutral page.
    expect([...rendering].some((f) => f.includes('Supplier'))).toBe(true);
    expect([...rendering].some((f) => f.includes('Buyer'))).toBe(true);
  });

  it('records, rather than hides, the uses a chip CANNOT attach to', () => {
    // The honest half. `Toast.description` is `string`; widening it to
    // `ReactNode` to fit a chip in would be a change to a shared contract for a
    // link inside a notification that disappears in four seconds — the wrong
    // trade, and out of GL-1's fence. These uses stay chip-less BY RULING, and
    // this test exists so the ruling is visible rather than assumed.
    const cannot = USES.filter((u) => !u.isRender);
    expect(cannot.length).toBeGreaterThan(0);
    for (const u of cannot) {
      const src = readFileSync(join(ROOT, u.file), 'utf8').split(/\r?\n/);
      expect(
        feedsStringApi(src, u.line - 1),
        `${u.file}:${u.line} was excluded without a visible string-typed consumer`
      ).toBe(true);
    }
  });
});
