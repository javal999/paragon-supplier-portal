// ────────────────────────────────────────────────────────────────────────────
// The leaked-render gate, run over the whole tree (replaces the
// `react/jsx-no-leaked-render` lint rule since 2026-10-29; see ./scan.js).
//
// House order (§42b): the POPULATION guard first, asserting membership, then
// both directions of the probe, then the tree-wide result. A clean tree means
// nothing until the scanner has been shown to fire on the defect it exists for.
// ────────────────────────────────────────────────────────────────────────────

import { beforeAll, describe, it, expect } from 'vitest';
import { join, relative, sep } from 'node:path';
/** @import { Finding, Site } from './scan' */
import { projectProgram, scanProgram, scanSnippet } from './scan';

const ROOT = join(__dirname, '..', '..', '..');
const SRC = join(ROOT, 'src');
const IS_SOURCE = /\.(jsx?|tsx?)$/;
const IS_TEST = /\.(test|spec)\.[jt]sx?$/;

/** @type {{ findings: Finding[]; sites: Site[] }} */
let tree = { findings: [], sites: [] };

beforeAll(() => {
  const program = projectProgram(ROOT);
  tree = scanProgram(
    program,
    (f) => f.startsWith(SRC.split(sep).join('/')) && IS_SOURCE.test(f) && !IS_TEST.test(f),
    (f) => relative(SRC, f).split(sep).join('/')
  );
}, 180_000);

describe('leaked-render gate · POPULATION — nothing below means anything without this', () => {
  it('walks the real tree and reaches known `&&` children', () => {
    /** @param {Site} s */
    const where = (s) => `${s.file} ${s.operands.join(' && ')}`;
    const sites = tree.sites.map(where);
    expect(sites).toContain('components/delivery/AgreementDrawdown.jsx allDraft');
    expect(sites).toContain(
      'components/delivery/AgreementDrawdown.jsx showPolicyHistory && ledger.policyDeviation'
    );
  });
});

describe('leaked-render gate · PROBE — fires on a number, accepts the safe twins', () => {
  it('✅ a number or a length before `&&` is a finding', () => {
    const bad = `/** @param {{ count: number; items: string[] }} p */
export const C = ({ count, items }) => (
  <div>
    {count && <b>a</b>}
    {items.length && <b>b</b>}
  </div>
);`;
    expect(scanSnippet(ROOT, bad).findings.map((f) => `${f.operand}: ${f.type}`)).toEqual([
      'count: number',
      'items.length: number'
    ]);
  });

  it('✅ an untyped value before `&&` is a finding: the checker cannot rule out a number', () => {
    const bad = `export const C = (/** @type {any} */ x) => <div>{x && <b>a</b>}</div>;`;
    expect(scanSnippet(ROOT, bad).findings).toHaveLength(1);
  });

  it('✅ a boolean, a comparison, a coerced number, a string or an object is not', () => {
    const good = `/** @param {{ count: number; open: boolean; name: string; po: { id: string } | null }} p */
export const C = ({ count, open, name, po }) => (
  <div>
    {open && <b>a</b>}
    {count > 0 && <b>b</b>}
    {!!count && <b>c</b>}
    {name && <b>{name}</b>}
    {po && open && <b>{po.id}</b>}
  </div>
);`;
    const r = scanSnippet(ROOT, good);
    expect(r.sites).toHaveLength(5);
    expect(r.findings).toEqual([]);
  });

  it('✅ `&&` in an attribute renders nothing and is not a site', () => {
    const attr = `export const C = (/** @type {number} */ n) => <input checked={n && true} />;`;
    expect(scanSnippet(ROOT, attr).sites).toEqual([]);
  });
});

describe('leaked-render gate · TREE — no number reaches the screen through `&&`', () => {
  it('finds nothing in src/', () => {
    expect(tree.findings).toEqual([]);
  });
});
