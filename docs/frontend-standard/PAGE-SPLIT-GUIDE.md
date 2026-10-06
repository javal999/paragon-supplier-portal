# Page split guide — frontend-standard Phase 5

**Status:** started 2026-10-06. **Applies to:** every page or feature component in `src/` over
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
