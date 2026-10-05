// ────────────────────────────────────────────────────────────────────────────
// No source scanner may be TypeScript-only (frontend-standard plan, Phase 3).
//
// A guard that collects files with `/\.tsx?$/` stops checking every file that
// is converted to `.js/.jsx`, and keeps passing over a smaller population —
// the failure is silent. This spec reads every source file and refuses the
// TS-only filter shapes found in this tree when the conversion started. Use
// `src/test/sourceFiles.ts` (isSourceFile / isTestFile / isJsxFile /
// scriptKindOf) or a pattern that names all four extensions.
//
// Known-bad and known-good probes run first, so a matcher that can no longer
// see the shapes cannot pass by finding nothing.
// ────────────────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isSourceFile } from './sourceFiles';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const SELF = 'src/test/languageNeutralScanners.guard.test.ts';
/** The helper DEFINES the neutral filters, so it necessarily names each extension. */
const HELPER = 'src/test/sourceFiles.ts';

/**
 * The TS-only filter shapes. Each is a literal written in a scanner, so each
 * is matched as text. Kept as data so a new shape is one line.
 */
const TS_ONLY_SHAPES: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: "regex /\\.tsx?$/ (no js)", re: /\\\.tsx\?\$/ },
  { name: "regex /\\.(ts|tsx)$/", re: /\\\.\(ts\|tsx\)\$/ },
  { name: "endsWith('.tsx') / endsWith('.ts')", re: /endsWith\(\s*['"]\.tsx?['"]\s*\)/ },
  { name: "glob {ts,tsx}", re: /\{ts,tsx\}/ },
  // `/\.ts$/`, `/\.test\.ts$/`, `/Config\.ts$/` … (but not the `.d.ts` exclusion).
  { name: "regex /\.ts$/ (no js)", re: /(?<!\\\.d)\\\.ts\$/ },
  { name: "glob *.ts / *.tsx", re: /\*\.tsx?['"]/ },
];

/**
 * Lines that pass: the language-neutral forms, and a line carrying an explicit
 * `language-neutral: <reason>` marker — for a filter that really is about one
 * TypeScript file (e.g. `endsWith('enforcement.ts')`), where the reason says so.
 */
const NEUTRAL = /\\\.\(ts\|tsx\|js\|jsx\)|\\\.\[jt\]sx\?|\{ts,tsx,js,jsx\}|language-neutral:/;

const offences = (text: string): string[] =>
  text
    .split('\n')
    .filter((line) => !NEUTRAL.test(line))
    .flatMap((line) => TS_ONLY_SHAPES.filter((s) => s.re.test(line)).map((s) => s.name));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : isSourceFile(p) ? [p] : [];
  });

describe('source scanners are language-neutral (TS → JS conversion)', () => {
  it('KNOWN-BAD: the matcher sees each TS-only shape', () => {
    expect(offences("if (/\\.tsx?$/.test(name)) out.push(p);")).toHaveLength(1);
    expect(offences("else if (name.endsWith('.tsx')) out.push(p);")).toHaveLength(1);
    expect(offences("import.meta.glob('/src/**/*.{ts,tsx}')")).toHaveLength(1);
    expect(offences('if (/\\.(ts|tsx)$/.test(e.name)) acc.push(full);')).toHaveLength(1);
    expect(offences("if (/\\.ts$/.test(n) && !/\\.test\\.ts$/.test(n)) out.push(p);")).toHaveLength(1);
    expect(offences("import.meta.glob('/src/**/*.ts')")).toHaveLength(1);
  });

  it('KNOWN-GOOD: the neutral forms pass', () => {
    expect(offences('if (/\\.(ts|tsx|js|jsx)$/.test(name)) out.push(p);')).toEqual([]);
    expect(offences('if (/\\.[jt]sx?$/.test(name)) out.push(p);')).toEqual([]);
    expect(offences("import.meta.glob('/src/**/*.{ts,tsx,js,jsx}')")).toEqual([]);
    expect(offences('if (isSourceFile(name)) out.push(p);')).toEqual([]);
    expect(offences("if (/\\.[jt]s$/.test(n) && !/\\.d\\.ts$/.test(n)) out.push(p);")).toEqual([]);
    expect(offences("if (f.endsWith('.ts')) n++; // language-neutral: only the .ts barrel")).toEqual([]);
  });

  it('no file under src/ filters sources by TypeScript extensions only', () => {
    const files = walk(SRC).map((p) => relative(ROOT, p).split('\\').join('/'));
    // Population, by membership: the scanners this guard exists for are in it.
    expect(files).toContain('src/lib/a11yGate/a11yGate.test.ts');
    expect(files).toContain('src/test/sourceFiles.ts');
    const found = files
      .filter((f) => f !== SELF && f !== HELPER)
      .flatMap((f) => offences(readFileSync(join(ROOT, f), 'utf8')).map((o) => `${f}: ${o}`));
    expect(found).toEqual([]);
  });
});
