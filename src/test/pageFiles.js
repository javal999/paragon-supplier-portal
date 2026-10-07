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

import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
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
 * Every shipped source file of ONE page folder (`<folder>/index.jsx`, its
 * `components/`, `hooks/`, `utils.js`, `const.js`), as absolute paths, sorted.
 * A guard that resolves a route to `<PageName>/index.jsx` and reads only that
 * file stops seeing the code the split moved into `components/`; this is the
 * folder it must read instead. Empty for a folder that is not a page.
 * @param {string} folder  Absolute path of the page folder.
 * @returns {string[]}
 */
export const pageFolderFiles = (folder) =>
  isPageFolder(folder)
    ? filesUnder(dirname(folder), basename(folder))
        .map((rel) => join(dirname(folder), rel))
        .sort()
    : [];

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
