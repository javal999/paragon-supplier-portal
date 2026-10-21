// ────────────────────────────────────────────────────────────────────────────
// §70 — A PAGE INSIDE THE SHELL DOES NOT SET ITS OWN WIDTH.
//
// `AppShellV2` renders `<main className="flex-1 overflow-auto bg-bg-page p-8">`.
// It supplies the padding and constrains nothing, so a page fills the viewport
// by rendering its content directly. Derived from `AppRouter`: of the 42 mounted
// routes, 40 did exactly that and the TWO Roles routes did not — they carried
// `p-6` on top of the shell's `p-8` and a `max-w-*` container, and they did not
// agree with each other (`max-w-6xl` catalogue, `max-w-4xl` detail). At 1920px
// the catalogue used 1152px of an available 1610px and the detail used 896px.
//
// ⚠️ **A `max-w-*` IN THIS TREE BELONGS ON PROSE, NEVER ON A CONTAINER.**
// `PageHeader`'s subtitle is `max-w-prose`; Glossary and ProcessFlows put
// `max-w-4xl` on a `<p>`. That is a MEASURE constraint — how long a line of text
// may run — and it is a different thing from how wide a page is. This gate
// therefore matches a large `max-w-*` on a `<div>` and leaves `<p>` alone.
//
// ⚠️ **AND THE EXCLUSION IS PRINCIPLED, NOT AN ALLOWLIST.** `/login` and
// `/register` render NO `AppShellV2` — they are full-bleed flows that own their
// own chrome, and `SupplierRegistration`'s `max-w-3xl mx-auto` is a CENTRED FORM,
// which is a legitimate width for a page with no shell around it. They are out of
// scope because they are not shell pages, not because they were forgiven. (That
// file is routed as `SupplierRegistrationV2` — an aliased import, which is
// exactly the kind of thing a name-based exclusion gets wrong.)
//
// ⚠️ RULE 4 — the matcher is probed BOTH ways before any claim about the tree,
// and the population is asserted by MEMBERSHIP (`EMPTY-INPUT-REPORTS-CLEAN-01`:
// a scan that read no files reports clean, and "clean" is what gets believed).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { resolveImport, specifierBase } from '@test/resolveImport';
import { ROUTER, routes as routerRoutes, sourceOf as routerSourceOf } from '@test/routerPages';
import {
  folderSourceFiles,
  isPageFolder,
  pageFolderFiles,
  pageFolderSource,
  pageFolders
} from '@test/pageFiles';

const routerSrc = readFileSync(ROUTER, 'utf-8');

/** Comments stripped — a rule stated in the file it governs reads as a violation
 *  of itself (§68's gate tripped on its own explanation twice, and the note this
 * @param {string} s
 * @returns {string}
 *  batch added to `RolesCatalogue` names the very classes it removed). */
const withoutProse = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** Route path → component name, DERIVED from the router source (§65a: the
 * coverage guard that asserted its own table's length never read the router).
 * Every `<Route>` with an `element`, multi-line and `<Suspense>`-wrapped ones
 * included (`src/test/routerPages.js`). A pathless layout route has no path.
 * @returns {{ path: string; component: string }[]}
 */
const routes = () =>
  routerRoutes(routerSrc).map((r) => ({ path: r.path ?? '(layout)', component: r.component }));

/** Component name → source file, following the router's own imports: default,
 * ALIASED (`SupplierRegistrationV2` is `pages-v2/SupplierRegistration`), named
 * (`{ AdminTolerances }`) and `lazy(() => import(…))`.
 * @param {string} component
 * @returns {string | null}
 */
const sourceOf = (component) => routerSourceOf(routerSrc, component);

/**
 * The page's source text. A page split into a folder resolves to its
 * `index.jsx`, but its containers now live in `components/` too, so the whole
 * folder is read (PAGE-SPLIT-GUIDE): reading only the index would let a
 * section moved out of it set its own width with nothing going red.
 * @param {string} file
 * @returns {string}
 */
function pageSource(file) {
  const dir = dirname(file);
  return /^index\.[jt]sx?$/.test(basename(file)) && isPageFolder(dir)
    ? pageFolderSource(dirname(dir), basename(dir))
    : readFileSync(file, 'utf-8');
}

/** The matcher: a container `<div>` that sets a large max-width. */
const CONTAINER_WIDTH = /<div[^>]*className="[^"]*\bmax-w-(?:3|4|5|6|7)xl\b/;
/**
 * @param {string} source
 * @returns {boolean}
 */
const setsOwnWidth = (source) => CONTAINER_WIDTH.test(withoutProse(source));

describe('⚠️ §70 · THE MATCHER, BEFORE ANY CLAIM ABOUT THE TREE', () => {
  it('✅ FIRES on a container that sets its own width — the known-GOOD probe', () => {
    expect(setsOwnWidth('<div className="p-6 max-w-6xl" data-testid="x">')).toBe(true);
    expect(setsOwnWidth('<div className="max-w-4xl">')).toBe(true);
    expect(setsOwnWidth('<div className="mx-auto max-w-3xl flex">')).toBe(true);
  });

  it('does NOT fire on a PROSE measure, which is a different constraint', () => {
    expect(setsOwnWidth('<p className="mt-1 max-w-4xl text-meta">')).toBe(false);
    expect(setsOwnWidth('<p className="text-base mt-2 max-w-prose">')).toBe(false);
    expect(setsOwnWidth('<div className="max-w-prose">')).toBe(false);
    // …nor on the note that RECORDS the removal, which names the class it removed.
    expect(setsOwnWidth('{/* was <div className="p-6 max-w-6xl"> until §70 */}')).toBe(false);
    expect(setsOwnWidth('// the max-w-4xl container is gone')).toBe(false);
  });

  it('⚠️ AND THE POPULATION IS NON-EMPTY — by membership, never by count', () => {
    const paths = routes().map((r) => r.path);
    expect(paths).toContain('/buyer/roles');
    expect(paths).toContain('/buyer/roles/:roleId');
    expect(paths).toContain('/register');
    expect(paths).not.toContain('/buyer/nonexistent');
    // …and the imports actually resolve, or every per-file assertion below is
    // vacuously true over an empty set of readable sources.
    expect(sourceOf('RolesCatalogue')).toMatch(/RolesCatalogue\.jsx$/);
    // The ALIASED import is the one a name-based lookup gets wrong.
    expect(sourceOf('SupplierRegistrationV2')).toMatch(/SupplierRegistration\/index\.jsx$/);
    // A NAMED import and a LAZY import resolve too. Until 2026-10-13 the lookup
    // read only default imports and the route matcher only one-line routes, so
    // these seven shell pages were never checked: the four named imports
    // (AdminTolerances, AdminAlertThresholds, Buyer/SupplierFixedStockReconcile)
    // and the `lazy()` pages inside `<Suspense>`. IA P-04 and P-10 (2026-10-21)
    // left the router with no lazy route: the two SDC pages are lazy-loaded tabs
    // of Foresight commitments now, and PlanGrid is retired. The named imports
    // still resolve, and no route may name a page the router no longer imports.
    expect(sourceOf('AdminTolerances')).toMatch(/admin\/AdminRuleValues\/index\.jsx$/);
    expect(sourceOf('SupplierFixedStockReconcile')).toMatch(/FixedStockReconcile\.jsx$/);
    const byComponent = new Map(routes().map((r) => [r.component, r.path]));
    expect(byComponent.get('AdminTolerances')).toBe('/buyer/admin/tolerances');
    expect(byComponent.has('BuyerCollaboration')).toBe(false);
    expect(byComponent.has('SupplierForecasts')).toBe(false);
    // Known-false: a wrapper is never taken for the page it wraps.
    expect(byComponent.has('Suspense')).toBe(false);
    expect(byComponent.has('LoadingState')).toBe(false);
    // A split page is read as its whole folder: the grid and charts
    // `<details>` container moved to `components/CoverageDetails.jsx`.
    const commitments = pageSource(/** @type {string} */ (sourceOf('BuyerCommitments')));
    expect(commitments).toContain('<AppShellV2');
    expect(commitments).toContain('data-testid="fc-coverage-details"');
    // Known-false: a single-file page is read as itself, not as its directory.
    expect(pageSource(/** @type {string} */ (sourceOf('RolesCatalogue')))).not.toContain(
      'data-testid="fc-coverage-details"'
    );
  });
});

// ── Page folders the router imports, DERIVED (PAGE-SPLIT-GUIDE). A split adds
// no line here. Every router import whose specifier names a page folder under
// `src/pages-v2` (a folder holding an `index.jsx`) must resolve to that folder's
// index — a stale `<Page>.jsx` left beside the folder would win resolution —
// and `pageSource` must read every file in the folder, not only the index.
// Static and `lazy(() => import(…))` imports both count. The folder test is
// `isPageFolder` on the specifier's base path, not `resolveImport`'s answer, so
// a resolver that stopped finding folder indexes goes red by the page's name.
const PAGES_DIR = join(process.cwd(), 'src', 'pages-v2');

/** @returns {{ page: string, specifier: string }[]} */
function routedPageFolders() {
  const specifiers = [
    ...routerSrc.matchAll(/import\s+\w+\s+from\s+'([^']+)'/g),
    ...routerSrc.matchAll(/lazy\(\s*\(\)\s*=>\s*import\(\s*'([^']+)'\s*\)\s*\)/g)
  ].map((m) => m[1]);
  return specifiers.flatMap((specifier) => {
    const base = specifierBase(ROUTER, specifier);
    if (base === null || dirname(base) !== PAGES_DIR || !isPageFolder(base)) return [];
    return [{ page: basename(base), specifier }];
  });
}
const ROUTED_PAGE_FOLDERS = routedPageFolders();

describe('§70 · every page folder the router imports is read as its whole folder', () => {
  it('⚠️ THE DERIVATION FINDS KNOWN MEMBERS — by membership, never by count', () => {
    const pages = ROUTED_PAGE_FOLDERS.map((r) => r.page);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages).toContain('BuyerSourcing');
    expect(pages).toContain('SupplierShipments');
    // A page folder behind a redirect-free route is found; the SDC folders are
    // tabs now (IA P-04), reached through their host page, not the router.
    expect(pages).toContain('BuyerCommitments');
    expect(pages).not.toContain('SupplierForecasts');
    // Known-false: a routed single-file page is not a page folder.
    expect(pages).not.toContain('RolesCatalogue');
    // Every member is a page folder in the tree. (Not the converse: a page the
    // router does not import, e.g. `BuyerForecasts.jsx`, may be split one day.)
    for (const p of pages) expect(pageFolders(PAGES_DIR)).toContain(p);
  });

  it.each(ROUTED_PAGE_FOLDERS.map((r) => /** @type {const} */ ([r.page, r.specifier])))(
    '%s/ — resolves to its index.jsx and is read as the whole folder',
    (page, specifier) => {
      const file = resolveImport(ROUTER, specifier);
      expect(file).toBe(join(PAGES_DIR, page, 'index.jsx'));
      const src = pageSource(/** @type {string} */ (file));
      // The expected side is an independent walk (`folderSourceFiles`), so a
      // `pageFolderFiles` that skipped a subfolder fails here too.
      const files = folderSourceFiles(PAGES_DIR, page);
      expect(files).toContain(`${page}/index.jsx`);
      const walked = new Set(pageFolderFiles(PAGES_DIR, page));
      const skipped = files.filter((f) => !walked.has(f));
      expect(skipped, `pageFolderFiles skipped: ${skipped.join(', ')}`).toEqual([]);
      expect(walked.size).toBe(files.length);
      const unread = files.filter((f) => !src.includes(readFileSync(join(PAGES_DIR, f), 'utf-8')));
      expect(unread, `not read by pageSource: ${unread.join(', ')}`).toEqual([]);
    }
  );
});

describe('§70 · no page inside AppShellV2 sets its own width', () => {
  it('⚠️ EVERY shell route fills the shell — the shell owns padding and width', () => {
    const offenders = routes()
      .map((r) => ({ ...r, file: sourceOf(r.component) }))
      .filter((r) => r.file !== null)
      .map((r) => ({ ...r, src: pageSource(/** @type {string} */ (r.file)) }))
      // Not a shell page ⇒ out of scope on principle: a full-bleed flow owns its
      // own chrome, and a centred form is a legitimate width without a shell.
      .filter((r) => r.src.includes('<AppShellV2'))
      .filter((r) => setsOwnWidth(r.src))
      .map((r) => `${r.path} (${r.component})`);

    expect(
      offenders,
      'A route inside AppShellV2 set its own container width. The shell already ' +
        'supplies padding (`main … p-8`) and constrains nothing, so 42 of 42 routes ' +
        'fill it. Do not add a width to match a neighbour — remove the wrapper. If a ' +
        'page genuinely needs a measure constraint, put `max-w-prose` (or a max-w on ' +
        'the `<p>`) on the TEXT, which is what PageHeader, Glossary and ProcessFlows ' +
        'do. §70 fixed the two Roles routes, which were the only exceptions and did ' +
        'not even agree with each other.'
    ).toEqual([]);
  });

  it('and the sanctioned measure constraint is still where it belongs', () => {
    // Bilateral: if `max-w-prose` vanishes from PageHeader, the rule above stops
    // having a legitimate alternative to point at, and "put it on the text"
    // becomes advice with no example in the tree.
    const header = readFileSync(
      join(process.cwd(), 'src/components/ui-v2/PageHeader.jsx'),
      'utf-8'
    );
    expect(header).toMatch(/max-w-prose/);
    expect(setsOwnWidth(header)).toBe(false);
  });
});
