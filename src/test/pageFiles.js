// ────────────────────────────────────────────────────────────────────────────
// pageFiles — the shipped source files of the `src/pages-v2` PAGES, for guards
// that scan pages rather than the whole tree.
//
// WHY THIS EXISTS (frontend-standard Phase 5, PAGE-SPLIT-GUIDE)
//   A page used to be one file at the top of `pages-v2/`, so a guard could read
//   `readdirSync(pagesDir)` and have every page. The split guide turns a large
//   page into a FOLDER (`<PageName>/index.jsx` + `components/`, `hooks/`,
//   `utils.js`, `const.js`). A top-level `readdirSync` stops at the folder, so the
//   page's code left the guard's population the moment it moved — and the guard
//   kept passing, over fewer files (CLAUDE.md, "Deriving a population", rule 1).
//
// WHAT COUNTS
//   · every non-test `.jsx` / `.tsx` file directly in `pagesDir` (a page that is
//     still one file) — the population the guards read before any split;
//   · every non-test source file (`.js/.jsx/.ts/.tsx`) anywhere inside a direct
//     subfolder that holds an `index.jsx` / `index.tsx` — a page split into a
//     folder. Plain `.js` counts there because a split moves handlers into
//     `hooks/*.js`, and those handlers are part of the page.
//   Feature folders without an index (`rfqs/`, `rfx/`, `widgets/`, …) are NOT
//   pages and stay out, exactly as they were.
//
// Paths are returned RELATIVE to `pagesDir`, `/`-separated:
//   'BuyerAnalytics.jsx', 'SupplierRFQs/index.jsx', 'SupplierRFQs/hooks/x.js'.
// ────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, sep } from 'node:path';
import { isJsxFile, isSourceFile, isTestFile } from './sourceFiles';

/**
 * Every non-test source file under `dir`, relative to `root`.
 * @param {string} root
 * @param {string} dir
 * @returns {string[]}
 */
const filesUnder = (root, dir) =>
  readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) return filesUnder(root, rel);
    return isSourceFile(name) && !isTestFile(name) ? [rel] : [];
  });

/**
 * Whether a folder is a page split into a folder (it has an index component).
 * @param {string} folder
 * @returns {boolean}
 */
export const isPageFolder = (folder) =>
  existsSync(join(folder, 'index.jsx')) || existsSync(join(folder, 'index.tsx'));

/**
 * The shipped page files under `pagesDir`, single-file and folder pages alike.
 * @param {string} pagesDir
 * @returns {string[]}
 */
export const pageFiles = (pagesDir) =>
  readdirSync(pagesDir).flatMap((name) => {
    const full = join(pagesDir, name);
    if (statSync(full).isDirectory()) return isPageFolder(full) ? filesUnder(pagesDir, name) : [];
    return isJsxFile(name) && !isTestFile(name) ? [name] : [];
  });

/**
 * The shipped files of ONE page folder, relative to `pagesDir`
 * (`'BuyerContracts/index.jsx'`, `'BuyerContracts/hooks/x.js'`, …).
 *
 * For a spec that used to read a single page file as text: after a split the
 * page's code is the whole folder, and reading only `index.jsx` would shrink
 * the population an absence assertion runs over (CLAUDE.md, "Deriving a
 * population", rule 1). Throws when the folder has no index, so a renamed or
 * missing page cannot hand an absence assertion an empty population.
 * @param {string} pagesDir
 * @param {string} page  the folder name, e.g. `'BuyerContracts'`
 * @returns {string[]}
 */
export const pageFolderFiles = (pagesDir, page) => {
  if (!isPageFolder(join(pagesDir, page)))
    throw new Error(`pageFolderFiles: ${page}/ is not a page folder under ${pagesDir}`);
  return filesUnder(pagesDir, page);
};

/**
 * Every shipped file of ONE page folder as one text — the folder-shaped
 * equivalent of `readFileSync('<Page>.jsx')`. See `pageFolderFiles`.
 * @param {string} pagesDir
 * @param {string} page
 * @returns {string}
 */
export const pageFolderSource = (pagesDir, page) =>
  pageFolderFiles(pagesDir, page)
    .map((f) => readFileSync(join(pagesDir, f), 'utf8'))
    .join('\n');

// ── DERIVED PAGE-FOLDER MEMBERSHIP ─────────────────────────────────────────
// Until 2026-10-08 each guard that scans pages carried one hand-written line
// per split page (`expect(scanned).toContain('<Page>/index.jsx')`). Every split
// appended to the same lines, so parallel splits conflicted on them, and a split
// that forgot its line was not checked at all. The guards now DERIVE the page
// folders from the tree with the functions below and assert that every file of
// every page folder is in their population, so a split adds no line to any
// guard (PAGE-SPLIT-GUIDE, "Guards and tests that name a file").
//
// These read the tree themselves (`readdirSync` + `isPageFolder`), NOT through
// `pageFiles`, so a `pageFiles` that stopped descending into page folders is
// caught by name instead of agreeing with itself (CLAUDE.md §86: a gate must
// not derive its population through the code it is probing).

/**
 * The direct subfolders of `pagesDir`, split into page folders (they hold an
 * `index.jsx` / `index.tsx`) and feature folders (`contracts/`, `rfqs/`, …).
 * Direct children only: that is where a page lives (PAGE-SPLIT-GUIDE, "Target
 * shape"); a component split inside a feature folder is not a page.
 * @param {string} pagesDir
 * @returns {{ pages: string[], features: string[] }}  folder names, sorted
 */
export const pagesDirFolders = (pagesDir) => {
  const dirs = readdirSync(pagesDir)
    .filter((name) => statSync(join(pagesDir, name)).isDirectory())
    .sort();
  return {
    pages: dirs.filter((d) => isPageFolder(join(pagesDir, d))),
    features: dirs.filter((d) => !isPageFolder(join(pagesDir, d)))
  };
};

/**
 * Every page folder under `pagesDir` (`'BuyerSourcing'`, `'SupplierShipments'`, …).
 * @param {string} pagesDir
 * @returns {string[]}
 */
export const pageFolders = (pagesDir) => pagesDirFolders(pagesDir).pages;

/**
 * Every non-test source file under ONE direct subfolder of `pagesDir`, page
 * folder or not, relative to `pagesDir` and sorted. The guards use it as the
 * EXPECTED side: for a page folder, every file must be in their population;
 * for a feature folder, none may be.
 *
 * ⚠️ Deliberately a second walk (`readdirSync` recursive), not `filesUnder`:
 * `pageFiles` and `pageFolderFiles` both walk through `filesUnder`, so if the
 * expected side used it too, a `filesUnder` that skipped a subfolder would
 * shrink both sides alike and every guard would stay green (CLAUDE.md §86).
 * @param {string} pagesDir
 * @param {string} folder
 * @returns {string[]}
 */
export const folderSourceFiles = (pagesDir, folder) =>
  readdirSync(join(pagesDir, folder), { recursive: true, encoding: 'utf8' })
    .map((rel) => `${folder}/${rel.split(sep).join('/')}`)
    .filter((rel) => {
      const name = basename(rel);
      return isSourceFile(name) && !isTestFile(name) && statSync(join(pagesDir, rel)).isFile();
    })
    .sort();
