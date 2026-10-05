# TypeScript → JavaScript conversion playbook

**Status:** pilot 2026-10-02 (`src/components/ui-v2`, 62 files); converter + dry run on all
1,182 remaining files 2026-10-05.
**Applies to:** Phase 4 (the rest of `src/`) and Phase 7 (forecast, deferred while its
requirements are written). Earlier phases: tooling (#117), lint fixes (#118), import aliases
(#119), React 19 / Router 7 / Vite 7 (#120).

The portal moves to JavaScript to match the company React boilerplate. Types are kept as JSDoc,
checked by `tsc` (`allowJs` + `checkJs` in `tsconfig.json`). Shared contract types stay in
`.d.ts` files (owner ruling). Comments are kept verbatim (owner requirement).

## The procedure, per folder (since 2026-10-05: our own converter)

The pilot drafted with `ts-to-jsdoc`, which re-prints files and loses comments and types (see
"What the tool loses" below). `scripts/codemods/ts-to-js.mjs` replaces it: it parses each file
and applies small text edits to the ORIGINAL, so comments, blank lines and formatting it does
not touch stay byte-identical. Its header lists every translation it makes.

1. **Convert** (renames with `git mv`, so history follows):
   `node scripts/codemods/ts-to-js.mjs src/<folder>/**/*.{ts,tsx}`
   It prints every spot it could not translate; each keeps a `TODO(ts-to-js)` comment.
2. **Point references at the new names:** `node scripts/codemods/rename-references.mjs`.
   Specs that read a file by path, guards that list file names, configs
   (`vitest.config.ts` `setupFiles`, `app/index.html` → `../src/main.jsx`) and comments that
   name a file. It reports a bare name it cannot place (`'types.ts'` names seven files).
3. **Format:** `npx prettier --write <files>`.
4. **Check casts Prettier may have moved:** `grep -rnE '\*/ \(\(' <files>`. A hit is either a lazy
   initializer (`/** @type {() => T} */ (() => …)`, fine) or a JSDoc cast that opened a
   parenthesised expression, which Prettier moves OUTSIDE the parentheses so it re-types the whole
   expression. Rewrite that one as a local variable (found once in B3, `callOffRules.test.js`).
5. **Repair by hand** what was flagged, what `tsc` reports, and every guard that reads
   TypeScript declarations as text (see "Guards that parse TypeScript" below).
6. **Done when all pass:**
   - `node scripts/codemods/check-comments-kept.mjs <files>` → 0 lost (it uses the TypeScript
     parser to find comments; a regex read the `/*` in `'/src/**/*.ts'` as a comment)
   - `npx tsc --noEmit -p tsconfig.json` and `-p tsconfig.vitest.json` → 0 errors
   - `npx eslint <files>` → 0 errors
   - `npm run gates` under Node 24 (`npx -y -p node@24 node scripts/gates.mjs`)

### ⚠️ The commit hook must not apply `react/jsx-no-leaked-render`'s fix

The pre-commit hook runs `eslint --fix` on staged JS. Until 2026-10-05 that applied
`react/jsx-no-leaked-render`'s fix, which rewrites `a && b` inside JSX as `a ? b : null` — a
BEHAVIOUR change (`{0 && <X/>}` stops rendering "0"; `checked={a && b}` becomes `null`, an
uncontrolled checkbox). It rewrote 190 sites in B1 and B6 unseen; B7's `RfxInviteeStep` type error
exposed it. All were reverted to `&&` (only ternaries directly in a JSX expression, at sites ESLint
flagged in an UNFIXED conversion; checked per file by `: null` count, the rule's site count and the
text of every flagged `&&`), and `lint-staged.config.js` now runs
`eslint --fix --rule "react/jsx-no-leaked-render: off"`. **Before converting a folder, commit with
the current hook config, and after converting, check the rule's site count did not drop.**

## Dry run of the converter on everything (2026-10-05)

All 1,182 non-forecast TypeScript files outside `ui-v2`, converted in a scratch worktree on top
of the pilot plus `main`. Baseline before converting: 525 spec files, 8,122 tests, 0 failing.

| Step | Result |
|---|---|
| `ts-to-js.mjs` | 20 s; 1 spot flagged for a person |
| Prettier | 0 files it cannot parse |
| `check-comments-kept.mjs` | 0 files lost comment text |
| `tsc` (specs surface) | 116 errors (app surface: 40) |
| `rename-references.mjs` | 1,731 references rewritten in 485 files; 30 ambiguous left |
| Test suite after both | 26 of 525 spec files failing (48 tests) — **none a behaviour change** |

Every one of the 26 reads source STRUCTURE, not behaviour: a guard matching `nowIso: string`
or `Record<Grade, …>` in a file's text, a contract test pinning a `.ts` path inside
`docs/contracts/*.md`, a population derived from `interface` declarations.

## Guards that parse TypeScript, and the ratified contracts

Two kinds of failure in the dry run are not tooling problems:

1. **Guards that read a declaration's TEXT** (`enforcement`, `projectionGate`,
   `storedFieldGate`, `chartPalette`, `complianceSapSync`, `retiredDayFields` …). After
   conversion the same fact is written as JSDoc (`@param {string} nowIso`). Each guard needs its
   matcher taught the JSDoc form, with a known-good and known-bad probe, folder by folder as the
   files it reads convert.
2. **The ratified contracts** (`docs/contracts/C1`, `C3`, `C9`, `C11`, `C12`) cite 43 source
   files by path and describe TypeScript declarations; specs pin those citations. **Owner
   ruling (2026-10-05): follow the boilerplate fully — the contract-cited files convert too.**
   `CLAUDE.md` records that a contract changes only by re-ratification with SOMO, so the PR that
   converts a cited file also amends the contract's citations (`.ts` → `.js`, declarations
   described in their JSDoc form) and is flagged **needs SOMO ratification before merge**.
   `src/services/data/types.js` converts to `types.js` as well (its two runtime enums,
   `POStatus` and `ChannelType`, become `/** @type {const} */` objects with a typedef of their values); this replaces the
   earlier "keep it as `types.d.ts`" ruling, since a `.d.ts` file cannot hold runtime values.

### Text matchers taught the JSDoc form so far (B1–B7)

- `projectionGate/dayCounts.js`: `takesInjectedNow` now reads a `nowIso`/`now` parameter typed by
  TS syntax or `@param` (B3); `writesField` also accepts the last shorthand member of an object,
  because Prettier here writes no trailing comma (`trailingComma: none`) — `daysToImpact,` became
  `daysToImpact` before `}`. A write matcher keyed on a trailing comma misses that shape.
- Helpers that read either form: `src/test/declaredFields.js`; `declaredType`, `declaredAlias`,
  `importsOf` in `src/lib/enforcement.test.js`; `deriveInterfaceMembers` (+ its spec) in
  `src/services/contracts/__tests__/deriveC1Surface.js` for interface-or-typedef members.
- B4: `dayCounts.js` JSDoc type-literal members count only at line start (parity with the TS
  regex); `storedFieldGate/derive.js` skips a JS constructor assignment to a member a base type
  already declares (`this.name = …` on an `Error` subclass); `unionMembers()` in
  `complianceSapSync.test.js`; `deriveMethodParams` / `deriveUnionLiterals` in `deriveC1Surface.js`.
- B5: `pinReach` `importsOf` follows `.js`/`.jsx` hops and its "cited file exists" gate skips
  `.claude/` worktree copies; `ledgerTruth` reads shapes through the `deriveC1Surface` helpers;
  `deriveC9FieldList.js` reads TS interfaces or JS type-literal typedefs.
- B6: `chipCoverage.test.js` `feedsStringApi()` reads a helper's string return type as
  `(…): string =>` or `@returns {string}` (one function for the derivation and the ruling test).
  Converter: `useState<T>(fn)` with a function passed by name is a lazy initializer
  (`() => T` cast), like an inline arrow.
- B7: `chipCoverage` `feedsStringApi(lines, i)` also reads the doc block ABOVE the nearest
  declaration (a JSDoc `@returns` sits above the line the TS annotation was on);
  `chartPalette.guard` reads `GRADE_TONE` as `: Record<Grade, …>` or `@type {Record<Grade, …>}`;
  `pageWidth.guard` and `wizardSettleSpeaks.test` known-good paths name the `.jsx` files.
- **A default parameter from an enum loses its type.** `s = SupplierStatus.ACTIVE` inferred the
  enum in TS; with the enum now a const object it infers the literal `'Active'`. Add the
  `@param {SupplierStatus} [s]` the TS left implicit (`sourcingType.test.js`, B7).
- **`readonly` is KEPT (owner ruling 2026-10-05).** JSDoc `@property` cannot express `readonly`,
  so `ts-to-js.mjs` writes an interface with ANY readonly member as a type-literal typedef
  (`@typedef {{ readonly a: T }} X`); each member's comment becomes a labelled line of prose above
  it (`` `a`: … ``). Interfaces with no readonly member keep the `@typedef {object}` + `@property`
  form. Batches converted before the ruling (B1–B4, and B5's first pass) were migrated with
  `scripts/codemods/readonly-typedefs.mjs`, which rebuilds those blocks from the TS originals at
  `--base`. That script regenerates prose from the TS text, so run `rename-references.mjs` again
  after it (it restores `.ts` names in comments). Text matchers that read shapes must read the
  type-literal form too (`deriveC9FieldList.js` reads both).
- Interfaces that REDECLARE a base member convert to `Omit<Base, 'k'> & {…}` (B4); B1–B3's few
  heritage typedefs used a plain intersection, which is equivalent unless the member is an array or
  function type (tsc found no difference there).
- Still text-only, passing today: `dayCounts.js` "named endpoint EXISTS" (`\bfield\??:`), which
  in converted data files is satisfied by fixture assignments rather than declarations.

## Phase 3 pilot history

The rest of this page records the pilot, drafted with `ts-to-jsdoc` and repaired by hand
(`scripts/codemods/jsdoc-fixups.mjs`). It explains why the converter exists.

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

- `src/test/sourceFiles.js` — `isSourceFile`, `isTestFile`, `isJsxFile`, `scriptKindOf`.
  Note `isSourceFile` excludes `.d.ts`; where an old `/\.tsx?$/` population included
  `src/vite-env.d.ts`, use the inline `/\.[jt]sx?$/` so the population does not narrow.
- `src/test/languageNeutralScanners.guard.test.js` — fails on any TS-only filter shape. A filter
  that really names one TypeScript file may carry `// language-neutral: <reason>` on the line.

Before converting a folder, also search it for regexes and globs that name *specific* modules by
`.ts` (lanes such as `/^\/src\/data\/mock[^/]*\.ts$/`): they must become `\.[jt]s$` in the same
change, or the module leaves its lane when renamed.

## Sizing Phase 4

| | Pilot (`ui-v2`) | Rest of `src/` (forecast excluded) |
|---|---|---|
| Files | 62 (15 specs) | 1,182 (495 specs) |
| Lines | 6,860 | 310,755 |

The pilot's components are small; the remaining pages are not (`BuyerSourcing.jsx` is 4,286
lines). Plan per folder, largest pages last, one PR per folder, and extend `jsdoc-fixups.mjs`
first with the remaining mechanical losses (`as T`, `!`, `as const`, generic call arguments,
const annotations), which were the bulk of the hand edits.
