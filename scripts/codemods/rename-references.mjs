#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// Codemod: point references at converted files to their new names
// (frontend-standard plan, Phase 4 — run right after `ts-to-js.mjs`)
// ════════════════════════════════════════════════════════════════════════════
//
// WHY THIS EXISTS
//   Converting `x.ts` → `x.js` breaks every place that names the FILE rather
//   than importing the module: specs that `readFileSync('src/data/mockX.ts')`,
//   guards that expect `'components/ui-v2/Button.tsx'` in a census, configs
//   (`vitest.config.js` setupFiles, `app/index.html`'s `../src/main.tsx`), and
//   comments that say "see SelectField.tsx". Imports are unaffected: they name
//   modules without an extension. Measured on the dry run of all 1,182 files:
//   every one of the converted tree's test failures that was not a type error
//   was a stale file name of this kind.
//
// WHAT IT DOES
//   1. The RENAMED set: every `.js/.jsx` file under src/ whose `.ts/.tsx`
//      twin no longer exists but did at the git base (default `HEAD`).
//   2. Scans text files (src/, scripts/, app/, root configs, docs/frontend-standard)
//      for tokens ending in `.ts` / `.tsx`. A token is rewritten when it names
//      a renamed file — by repo-relative path, by a path relative to the file
//      it is in, by a suffix of a renamed path (`ui-v2/Button.tsx`), or by a
//      bare file name that only ONE renamed file has.
//   3. Anything else is left alone: a name shared by two renamed files is
//      reported, never guessed; files that are still TypeScript are untouched.
//
//   Historical prose (docs/ other than docs/frontend-standard, dated root plans)
//   is NOT edited:
//   a finding that says "BuyerInvoices.tsx" describes the tree when it was
//   written.
//
// USAGE
//   node scripts/codemods/rename-references.mjs [--base <rev>] [--dry-run]
// ════════════════════════════════════════════════════════════════════════════

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const BASE = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'HEAD';
const DRY_RUN = args.includes('--dry-run');

const toPosix = (p) => p.split('\\').join('/');
const walk = (dir, keep) =>
  readdirSync(dir).flatMap((e) => {
    if (e === 'node_modules' || e === '.git' || e === 'dist' || e === '.claude') return [];
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p, keep) : keep(p) ? [p] : [];
  });

// ── 1. The renamed set ──────────────────────────────────────────────────────
const inBase = new Set(
  execFileSync('git', ['ls-tree', '-r', '--name-only', BASE, 'src'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean),
);
/** old repo-relative path → new repo-relative path */
const renamed = new Map();
for (const abs of walk(join(ROOT, 'src'), (p) => /\.(js|jsx)$/.test(p))) {
  const rel = toPosix(relative(ROOT, abs));
  const old = rel.replace(/\.jsx$/, '.tsx').replace(/\.js$/, '.ts');
  if (inBase.has(old) && !existsSync(join(ROOT, old))) renamed.set(old, rel);
}
// Files that still exist under their .ts/.tsx name (not converted yet). A bare
// name or path suffix that ALSO matches one of these is not ours to rewrite:
// 'types.ts' may mean src/services/data/types.ts, which is still TypeScript.
const remaining = walk(join(ROOT, 'src'), (p) => /\.tsx?$/.test(p) && !p.endsWith('.d.ts')).map((p) => toPosix(relative(ROOT, p)));
const byBase = new Map(); // bare file name → [old paths]
for (const old of renamed.keys()) {
  const b = posix.basename(old);
  byBase.set(b, [...(byBase.get(b) ?? []), old]);
}

/** The new spelling of a token, or null when it does not name a renamed file. */
function rewrite(token, fileRel) {
  const newExt = (old) => renamed.get(old).slice(old.lastIndexOf('.'));
  const withExt = (old) => token.slice(0, token.lastIndexOf('.')) + newExt(old);
  const clean = token.replace(/^\.\//, '').replace(/^\/?/, '');
  // a. repo-relative ('src/data/mockX.ts', '/src/…')
  if (renamed.has(clean)) return withExt(clean);
  // b. relative to the file it is written in ('./setup.ts', '../src/main.tsx')
  if (token.startsWith('.')) {
    const fromFile = toPosix(posix.normalize(posix.join(posix.dirname(fileRel), token)));
    if (renamed.has(fromFile)) return withExt(fromFile);
    return null;
  }
  // c. a path suffix ('ui-v2/Button.tsx', 'components/ui-v2/Button.tsx')
  if (token.includes('/')) {
    const hits = [...renamed.keys()].filter((o) => o.endsWith(`/${clean}`));
    const stillTs = remaining.some((r) => r.endsWith(`/${clean}`));
    if (hits.length === 1 && stillTs) ambiguous.add(`${fileRel}: '${token}' also names a file that is still TypeScript — left as is`);
    return hits.length === 1 && !stillTs ? withExt(hits[0]) : null;
  }
  // d. a bare file name. Only names a renamed file has are considered.
  //    - No still-TypeScript file shares it: the only renamed file with that
  //      name, or else the one in the SAME folder as the reference.
  //    - A still-TypeScript file shares it ('types.ts'): only a renamed file in
  //      the same folder as the reference can be meant, and only if no
  //      still-TypeScript file sits in that folder too; otherwise it is left.
  const hits = byBase.get(token) ?? [];
  if (hits.length === 0) return null;
  const refDir = posix.dirname(fileRel.replace(/\.(jsx?)$/, ''));
  const sameDir = hits.filter((o) => posix.dirname(o) === refDir);
  const stillTs = remaining.filter((r) => posix.basename(r) === token);
  if (stillTs.length === 0) {
    if (hits.length === 1) return withExt(hits[0]);
    if (sameDir.length === 1) return withExt(sameDir[0]);
  } else if (sameDir.length === 1 && !stillTs.some((r) => posix.dirname(r) === refDir)) {
    return withExt(sameDir[0]);
  }
  ambiguous.add(`${fileRel}: '${token}' names ${hits.length} renamed file(s)${stillTs.length ? ' and a file that is still TypeScript' : ''} — left as is`);
  return null;
}
const ambiguous = new Set();

// ── 2. Scan and rewrite ─────────────────────────────────────────────────────
const TEXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|html|md|yml|yaml)$/;
const targets = [
  ...walk(join(ROOT, 'src'), (p) => TEXT.test(p)),
  ...walk(join(ROOT, 'scripts'), (p) => TEXT.test(p)),
  ...walk(join(ROOT, 'app'), (p) => TEXT.test(p)),
  ...(existsSync(join(ROOT, 'docs/frontend-standard')) ? walk(join(ROOT, 'docs/frontend-standard'), (p) => TEXT.test(p)) : []),
  // Root files: configs, plus the two living docs. Other root .md files are
  // dated plans and describe the tree as it was.
  ...readdirSync(ROOT)
    .filter((e) => TEXT.test(e) && statSync(join(ROOT, e)).isFile() && (!e.endsWith('.md') || e === 'CLAUDE.md' || e === 'README.md'))
    .map((e) => join(ROOT, e)),
].filter((p) => !p.endsWith('rename-references.mjs'));

// A path-ish token ending in .ts/.tsx, not part of `.d.ts`.
const TOKEN = /(?<![\w.@-])(?:\.{1,2}\/|\/)?[\w@-][\w./@-]*?(?<!\.d)\.tsx?\b(?!\w)/g;

let files = 0;
let edits = 0;
for (const abs of targets) {
  const fileRel = toPosix(relative(ROOT, abs));
  const before = readFileSync(abs, 'utf8');
  let n = 0;
  const after = before.replace(TOKEN, (tok) => {
    const r = rewrite(tok, fileRel);
    if (r === null || r === tok) return tok;
    n += 1;
    return r;
  });
  if (n > 0) {
    files += 1;
    edits += n;
    if (!DRY_RUN) writeFileSync(abs, after);
  }
}
for (const a of ambiguous) console.log(`  ${a}`);
console.log(
  `rename-references: ${renamed.size} renamed file(s); ${DRY_RUN ? 'would rewrite' : 'rewrote'} ${edits} reference(s) in ${files} file(s); ${ambiguous.size} ambiguous left for a person.`,
);
