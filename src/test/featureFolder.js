// ────────────────────────────────────────────────────────────────────────────
// featureFolder — read a component that was split into a FOLDER as one source
// text, for specs that assert over "the wizard's own source".
//
// WHY THIS EXISTS (frontend-standard Phase 5, PAGE-SPLIT-GUIDE)
//   `GRInspectionWizard.jsx` was one file, and a dozen specs read it by path:
//   "the wizard calls `bpomOf(`", "the wizard's settle sits in a try", "the
//   refusal lines carry no mode". The split turns it into
//   `GRInspectionWizard/index.jsx` + `components/`, `hooks/`, `utils.js`,
//   `const.js`, so the code those specs assert on now lives in several files.
//   Pointing each spec at the ONE file that happens to hold its line today would
//   make the spec silently stop seeing the rest of the wizard the next time code
//   moves inside the folder. Reading the folder keeps the claim "the wizard
//   does X" about the whole wizard.
//
// WHAT COUNTS
//   Every non-test source file (`.js/.jsx/.ts/.tsx`) anywhere under the folder,
//   in path order. The folder must hold an `index.*` — a folder without one is
//   not a split component, and reading it would hand the spec an unrelated set.
//   ⚠️ An EMPTY result throws instead of returning '' (EMPTY-INPUT-REPORTS-CLEAN-01):
//   every `not.toContain` over '' passes.
// ────────────────────────────────────────────────────────────────────────────

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isSourceFile, isTestFile } from './sourceFiles';

/** The split GR inspection wizard, as a glob key prefix (`/src/...`). */
export const GR_WIZARD_DIR = '/src/components/v2-features/GRInspectionWizard/';

/**
 * Absolute paths of the non-test source files under `absDir`, sorted.
 * @param {string} absDir
 * @returns {string[]}
 */
export const folderFiles = (absDir) => {
  if (!['index.jsx', 'index.tsx', 'index.js', 'index.ts'].some((f) => existsSync(join(absDir, f))))
    throw new Error(`featureFolder: ${absDir} has no index file — not a split component`);
  /**
   * @param {string} dir
   * @returns {string[]}
   */
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return walk(full);
      return isSourceFile(name) && !isTestFile(name) ? [full] : [];
    });
  return walk(absDir).sort();
};

/**
 * The text of a source file, or — when `absPath` is a split component's folder —
 * of every non-test source file under it, joined in path order.
 * @param {string} absPath
 * @returns {string}
 */
export const readSource = (absPath) =>
  statSync(absPath).isDirectory()
    ? folderFiles(absPath)
        .map((f) => readFileSync(f, 'utf8'))
        .join('\n')
    : readFileSync(absPath, 'utf8');

/**
 * The `[path, text]` entries of an `import.meta.glob` map that sit under
 * `dir` (a `/src/.../` prefix ending in `/`), tests excluded, in path order.
 * Throws unless the folder's `index.*` is among them.
 * @param {Readonly<Record<string, string>>} src
 * @param {string} dir
 * @returns {Array<[string, string]>}
 */
export const globFolderEntries = (src, dir) => {
  const entries = Object.entries(src)
    .filter(([p]) => p.startsWith(dir) && isSourceFile(p) && !isTestFile(p))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (!entries.some(([p]) => /^index\.[jt]sx?$/.test(p.slice(dir.length))))
    throw new Error(`featureFolder: no index file under ${dir} in the glob`);
  return entries;
};

/**
 * The joined text of {@link globFolderEntries}.
 * @param {Readonly<Record<string, string>>} src
 * @param {string} dir
 * @returns {string}
 */
export const globFolderSource = (src, dir) =>
  globFolderEntries(src, dir)
    .map(([, text]) => text)
    .join('\n');
