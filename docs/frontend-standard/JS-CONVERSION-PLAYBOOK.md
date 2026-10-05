# TypeScript → JavaScript conversion playbook

**Status:** written from the Phase 3 pilot (`src/components/ui-v2`, 62 files), 2026-10-02.
**Applies to:** Phase 4 (the rest of `src/`) and Phase 7 (forecast, deferred while its
requirements are written). Earlier phases: tooling (#117), lint fixes (#118), import aliases
(#119), React 19 / Router 7 / Vite 7 (#120).

The portal moves to JavaScript to match the company React boilerplate. Types are kept as JSDoc,
checked by `tsc` (`allowJs` + `checkJs` in `tsconfig.json`). Shared contract types stay in
`.d.ts` files (owner ruling). Comments are kept verbatim (owner requirement).

## The procedure, per folder

1. **Draft with the tool, from the repo root** (so imported types resolve; run elsewhere, props
   collapse to `any`):
   `npx ts-to-jsdoc@2.4.0 -o <tmp> src/<folder>`
2. **Rename with history:** `git mv X.tsx X.jsx` / `git mv X.ts X.js`, then copy the tool's
   output over each file. The tool names every file `.js`; a file with JSX must be `.jsx`.
3. **Mechanical repairs:** `node scripts/codemods/jsdoc-fixups.mjs <files>` (idempotent).
4. **Format:** `npx prettier --write <files>`.
5. **Hand repairs** (see "What the tool loses"), file by file against the original
   (`git show main:<path>.tsx`).
6. **Done when all pass:**
   - `node scripts/codemods/check-comments-kept.mjs <files>` → 0 lost
   - `npx tsc --noEmit -p tsconfig.json` and `-p tsconfig.vitest.json` → 0 errors
   - `npx eslint <files>` → 0 errors (JSDoc is required on exported functions)
   - `npm run gates` under Node 24 (`npx -y -p node@24 node scripts/gates.mjs`)

## What the tool loses, measured on the pilot

| Loss | Effect if missed | Fixed by |
|---|---|---|
| `@returns {Element}` (the DOM type) on every component | every page using it fails TS2786; 4,957 of 6,442 errors | `jsdoc-fixups.mjs` (a) |
| `@param` without a name for destructured props | syntax error TS1003 | `jsdoc-fixups.mjs` (b) |
| runtime `import React` kept only for types | unused import | `jsdoc-fixups.mjs` (c, d) |
| `@template` on typedefs of generic components | TS2304 / TS2315 | `jsdoc-fixups.mjs` (e) |
| **comments above an `interface`/`type`, and on interface fields** | **documentation deleted silently** — 12 of 62 files, up to 155 words in one | hand, checked by `check-comments-kept.mjs` |
| `interface X extends Y` → typedef without `Y` | `children`, `className` vanish; 1,267 errors in callers | hand: `@typedef {Y & {…}} X` |
| `useRef<T>(null)`, `useState<T>(…)`, `querySelectorAll<T>` type arguments | refs typed `null`/`never` | hand: `/** @type {T} */ (value)` casts |
| `const X: T = …` annotations, `as T`, `!`, `as const` | types silently loosen; **a `@ts-expect-error` spec lost its meaning** | hand |
| types on inner arrow parameters | implicit `any` | hand: `/** @param {T} x */` |
| typedefs moved after `export default`; blank lines between statements removed | readability only | hand (optional, done in the pilot) |
| `@returns {any}` on helpers | weaker than the original | hand: remove it |
| a file it cannot transform comes back as raw TypeScript (prints `ManipulationError`) | Prettier fails on it | convert that file by hand |

Error counts on the pilot: 6,442 after the tool → 1,357 after `jsdoc-fixups.mjs` → 52 after the
`extends` typedefs → 0 after hand repairs (about 185 edits across two agents and the lead).

## The silent risk: guards that find files by extension

About 45 guard specs and gates (`src/lib/*Gate`, `src/**/*.guard.test.*`, contract tests)
collected their files with `/\.tsx?$/`, `endsWith('.tsx')` or `*.{ts,tsx}` globs. A file renamed
to `.jsx` dropped out of every one of them, and the guards **kept passing over a smaller
population**. The pilot widened all of them and added two things so it cannot recur:

- `src/test/sourceFiles.ts` — `isSourceFile`, `isTestFile`, `isJsxFile`, `scriptKindOf`.
  Note `isSourceFile` excludes `.d.ts`; where an old `/\.tsx?$/` population included
  `src/vite-env.d.ts`, use the inline `/\.[jt]sx?$/` so the population does not narrow.
- `src/test/languageNeutralScanners.guard.test.ts` — fails on any TS-only filter shape. A filter
  that really names one TypeScript file may carry `// language-neutral: <reason>` on the line.

Before converting a folder, also search it for regexes and globs that name *specific* modules by
`.ts` (lanes such as `/^\/src\/data\/mock[^/]*\.ts$/`): they must become `\.[jt]s$` in the same
change, or the module leaves its lane when renamed.

## Sizing Phase 4

| | Pilot (`ui-v2`) | Rest of `src/` (forecast excluded) |
|---|---|---|
| Files | 62 (15 specs) | 1,182 (495 specs) |
| Lines | 6,860 | 310,755 |

The pilot's components are small; the remaining pages are not (`BuyerSourcing.tsx` is 4,286
lines). Plan per folder, largest pages last, one PR per folder, and extend `jsdoc-fixups.mjs`
first with the remaining mechanical losses (`as T`, `!`, `as const`, generic call arguments,
const annotations), which were the bulk of the hand edits.
