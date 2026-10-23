# Page split guide — frontend-standard Phase 5

**Status:** started 2026-10-06; waves 1–11 done by 2026-10-22. See "Where it stands" at the end.
**Applies to:** every page or feature component in `src/` over
800 lines. Largest first, **one PR per page**. Phases 1–4 and 7 (the JavaScript conversion) are
done; see `JS-CONVERSION-PLAYBOOK.md`.

## Why

The biggest pages are one workspace component holding every piece of state, every handler and
every section of JSX: `BuyerSourcing`'s `SourcingWorkspace` alone is about 3,200 lines. Nobody can
review a change to a function that size, and every edit risks a section it does not touch. The
company React boilerplate keeps a page as a folder: `pages/<route>/index.jsx` plus
`components/`.

## The rule that overrides every other: behaviour does not change

A split PR moves code and threads props. It does **not** change:

- anything rendered: text, i18n keys, `data-testid`, class names, ARIA, element order;
- any handler's effect, any dispatched command, any query key;
- any test assertion. Tests may change only their import path, if a moved name is imported
  directly.

If a split exposes a bug, write it down in the PR description and fix it in a separate PR. A split
that also fixes something cannot be reviewed as a split.

## Target shape

```
src/pages-v2/<PageName>/
  index.jsx            the page: the default export the router imports, plus every named export
                       other modules import today (re-exported if the code moved)
  components/
    <Section>.jsx      one visible section or dialog per file, PascalCase
  hooks/
    use<Thing>.js      state + handlers lifted out of the workspace, when a section needs them
  utils.js             pure helpers (no React)
  const.js             module-scope constants
```

- `./<PageName>` keeps resolving: a folder with `index.jsx` replaces the file, so the router,
  tests and `vi.mock('./<PageName>')` calls need no change. Check every importer anyway.
- Tests stay where they are (next to the old file) unless a test is only about one moved
  component.
- **No file over 800 lines** when the page is done; aim for under 400. **JSX nesting ≤ 6**
  (`react/jsx-max-depth`, warning today); a split should remove the page's depth warnings, not
  add any.
- Every new component, hook and helper gets a short JSDoc block: what it renders or does, which
  props it needs and why. The next engineer reads the folder, not the PR.
- Props are passed explicitly. Do not add a React context to avoid threading props unless the
  same value crosses three or more levels; say so in the PR if you do.

## How to split a workspace component

1. Map it first: its `useState`/`useMemo`/query hooks, its handlers, and the JSX sections in
   render order. Put the map in the PR description.
2. Move module-scope constants and pure helpers to `const.js` / `utils.js`.
3. Move each JSX section into `components/<Section>.jsx` with the props it reads. Leave state in
   the workspace unless one section owns it exclusively; then move it with the section.
4. Group handlers that only one section uses into that section or a `hooks/use<X>.js`.
5. After each step: `npx tsc --noEmit -p tsconfig.vitest.json` and the page's own tests.

## Guards and tests that name a file

Several guards key on a file path, e.g. `src/lib/moduleScopeLiteralGate/grandfathered.js`
(`'src/pages-v2/BuyerSourcing.jsx::MATERIAL_CATALOG'`). When code moves, update the key to the
new path; **never** delete a row to make a guard pass, and never weaken a matcher. A guard whose
population drops when files move is reporting on its matcher (CLAUDE.md, "Deriving a
population"): fix the matcher, and probe it both ways.

### The page-scanning guards derive page folders; a split adds no line to them

Until 2026-10-08 every split appended membership lines (`expect(scanned).toContain('<Page>/index.jsx')`)
to three guards, and parallel splits conflicted on those lines. The guards now derive the page
folders from the tree: every direct subfolder of `src/pages-v2` that holds an `index.jsx`
(`pagesDirFolders` / `pageFolders` in `src/test/pageFiles.js`). For each page folder they assert:

| Guard | What it asserts per page folder |
|---|---|
| `src/pages-v2/chartPalette.guard.test.jsx` (DP2-BUTTON-01) | every non-test file in the folder is in the scanned population |
| `src/pages-v2/toastHonesty.guard.test.jsx` | every non-test file in the folder is in `pageFiles(PAGES_DIR)` |
| `src/router/pageWidth.guard.test.js` | the router's import of the folder resolves to its `index.jsx`, and `pageSource` reads every file in the folder |

Each guard also checks that no feature-folder file (`contracts/`, `shipments/`, …) is read as a
page and that no `<Page>.jsx` is left beside its folder. The expected file list comes from
`folderSourceFiles`, a second walk of the tree, so a bug in `pageFiles` cannot hide itself.

**Routed pages in a feature folder count as pages** (since 2026-10-13). A page the router renders
can live in a feature folder: `admin/AdminSuppliers.jsx`, `admin/AdminRuleValues/`,
`materials/BuyerTradeNames.jsx`. `src/test/routerPages.js` derives every route from `AppRouter`, including
multi-line routes, `<Suspense>`-wrapped `lazy()` pages and named imports. `routedPageFiles` returns
the files those routes render; a page folder's `index.jsx` brings its whole folder at any depth.
DP2-BUTTON-01 and the toast-honesty guard scan `pageFiles` plus `routedPageFiles`. The
page-width guard reads its routes and their sources through the same module. The feature-folder
check therefore excludes only files no route renders. A split of a routed page inside a feature
folder adds no guard line either.

**What a new split must do in these guards: nothing.** Run them; a failure names the page and
the file. Add a line only for a **content** check: a test that asserts a toast, a test id or a
handler still sits in a specific moved file (for example, `toastHonesty` checks that
`BuyerStabilise/index.jsx` still holds its two toasts). Membership is never written by hand.

## Forms

`react-hook-form` (the boilerplate's form library, `^7.71`) comes in with the first page that is
really a form, `SupplierRegistration`, and then the wizards (`GRInspectionWizard`,
`RfpCreateWizard`, `RfiCreateWizard`). It is added to `package.json` in that PR, not before.
Converting a form is not a pure move, so that PR carries tests for the form's states before it
converts it.

## Done when

- `npx -y -p node@24 node scripts/gates.mjs` is green; the test floor is unchanged (or bumped for
  tests the PR added); the lint ceiling is lowered if warnings fell, never raised.
- No file in the page folder is over 800 lines.
- The PR lists the new files with line counts, the guards it touched, and why.

## Order

| Wave | Pages |
|---|---|
| 1 | `BuyerSourcing`, `SupplierShipments`, `SupplierRFQs` |
| 2 | `GRInspectionWizard`, `BuyerContracts`, `SupplierRegistration` (+ react-hook-form) |
| 3 | `SupplierForecasts` and the forecast pages, when the forecast UX work is quiet |
| then | every other page over 800 lines, largest first |

Non-page files over 800 lines (`MockCommandService.js`, `commandHooks.js`, `types.js`, the i18n
tables and fixtures) are out of scope: they are lists, not components, and splitting them buys
nothing a reader needs.

## Where it stands (2026-10-22)

**Done.** Waves 1–11 are merged or in review. Every page that was over 800 lines on 2026-10-21 now
lives in the folder shape. Wave 10 (MR !27) split `BuyerCallOffs`, `BuyerCollaboration` and
`SupplierDocuments`. Wave 11 split `SupplierOrders`, `BuyerOrders` and `SupplierCallOffs`, the last
three held for the IA work. `react-hook-form` is in `SupplierRegistration` and
`GRInspectionWizard` (MR !21). Before the conversion, 31 specs in
`GRInspectionWizard.formStates.test.jsx` pinned the wizard's behaviour.

**Left.**

- `SupplierRfp.jsx` has grown past the line (967 lines on 2026-10-22) with the RFx UX waves. It
  is split next, once no open branch edits it.
- The `react-hook-form` conversion of `RfpCreateWizard` and `RfiCreateWizard`. The RFx and IA
  branches that edited them are now on `main`, so they are no longer held.
