// ────────────────────────────────────────────────────────────────────────────
// routerPages — the routes `AppRouter` mounts and the source files they render,
// DERIVED from the router itself, for guards that scan "every page".
//
// WHY THIS EXISTS
//   Two derivations each missed real pages, and each guard kept passing over
//   the smaller set (CLAUDE.md, "Deriving a population", rule 1):
//   · `pageWidth.guard` matched only `<Route path="…" element={<X />}>` on one
//     line and only DEFAULT imports, so the three `lazy()` pages wrapped in
//     `<Suspense>` (PlanGrid, BuyerCollaboration, SupplierForecasts) and the four
//     NAMED imports (AdminTolerances, AdminAlertThresholds and the two
//     FixedStockReconcile pages) were never checked.
//   · the DP2-BUTTON-01 and toast-honesty guards read `pageFiles`, which takes
//     only top-level files and top-level page folders, so a routed page that
//     lives in a feature folder (`admin/AdminSuppliers.jsx`,
//     `admin/AdminRuleValues/`) was outside both.
//
// WHAT COUNTS
//   · a route is every `<Route …>` with an `element={…}`; its component is the
//     first JSX element in that expression that is not a wrapper (`Suspense`,
//     its `LoadingState` fallback);
//   · a component's source is followed through the router's own imports —
//     default, named (`{ A, B as C }`) and `const X = lazy(() => import('…'))`;
//   · a routed file that is a page folder's `index.jsx` stands for the whole
//     folder, at any depth (`admin/AdminRuleValues/`), as PAGE-SPLIT-GUIDE has it.
// ────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { resolveImport } from './resolveImport';
import { isPageFolder, pageFolderFiles } from './pageFiles';

export const ROUTER = join(process.cwd(), 'src', 'router', 'AppRouter.jsx');

/** Elements that wrap a page rather than being one. */
const WRAPPERS = new Set(['Suspense', 'LoadingState']);

/**
 * Component name → import specifier, for every way the router imports one.
 * @param {string} routerSrc
 * @returns {Map<string, string>}
 */
export const routerImports = (routerSrc) => {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const m of routerSrc.matchAll(/import\s+(\w+)\s*(?:,\s*\{[^}]*\})?\s+from\s+'([^']+)'/g))
    map.set(m[1], m[2]);
  for (const m of routerSrc.matchAll(/import\s+(?:\w+\s*,\s*)?\{([^}]+)\}\s*from\s*'([^']+)'/g))
    for (const part of m[1].split(',')) {
      const local = part
        .trim()
        .split(/\s+as\s+/)
        .pop();
      if (local) map.set(local, m[2]);
    }
  for (const m of routerSrc.matchAll(
    /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'\s*\)\s*\)/g
  ))
    map.set(m[1], m[2]);
  return map;
};

/**
 * The text of the `{…}` expression that opens at `open` (the index of `{`).
 * @param {string} s
 * @param {number} open
 * @returns {string}
 */
const balancedBraces = (s, open) => {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return s.slice(open + 1, i);
  }
  return s.slice(open + 1);
};

/**
 * Every mounted route: its path (`null` for a pathless layout route) and the
 * page component its `element` renders.
 * @param {string} routerSrc
 * @returns {{ path: string | null; component: string }[]}
 */
export const routes = (routerSrc) =>
  [...routerSrc.matchAll(/<Route\b/g)].flatMap((m) => {
    const tagStart = m.index ?? 0;
    const at = routerSrc.indexOf('element={', tagStart);
    const next = routerSrc.indexOf('<Route', tagStart + 1);
    if (at === -1 || (next !== -1 && at > next)) return [];
    const element = balancedBraces(routerSrc, at + 'element='.length);
    const component = [...element.matchAll(/<([A-Z]\w*)/g)]
      .map((t) => t[1])
      .find((name) => !WRAPPERS.has(name));
    if (!component) return [];
    const head = routerSrc.slice(tagStart, at);
    const path = head.match(/\bpath="([^"]+)"/)?.[1] ?? null;
    return [{ path, component }];
  });

/**
 * The source file a routed component comes from, or `null` (a package import,
 * a component defined in the router).
 * @param {string} routerSrc
 * @param {string} component
 * @returns {string | null}
 */
export const sourceOf = (routerSrc, component) => {
  const specifier = routerImports(routerSrc).get(component);
  return specifier === undefined ? null : resolveImport(ROUTER, specifier);
};

/**
 * Every source file under `pagesDir` that a route renders, relative to
 * `pagesDir`, `/`-separated and sorted. A page folder's `index.jsx` brings the
 * whole folder, wherever the folder sits.
 * @param {string} pagesDir
 * @returns {string[]}
 */
export const routedPageFiles = (pagesDir) => {
  const routerSrc = readFileSync(ROUTER, 'utf-8');
  /** @type {Set<string>} */
  const out = new Set();
  for (const { component } of routes(routerSrc)) {
    const file = sourceOf(routerSrc, component);
    if (file === null) continue;
    const rel = relative(pagesDir, file).split(sep).join('/');
    if (rel.startsWith('..')) continue;
    const dir = dirname(file);
    if (/^index\.[jt]sx?$/.test(basename(file)) && isPageFolder(dir)) {
      const folder = relative(pagesDir, dir).split(sep).join('/');
      for (const f of pageFolderFiles(pagesDir, folder)) out.add(f);
    } else out.add(rel);
  }
  return [...out].sort();
};
