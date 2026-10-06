// ────────────────────────────────────────────────────────────────────────────
// sourceFiles — what counts as a SOURCE file and a TEST file, in ONE place.
//
// WHY THIS EXISTS (frontend-standard plan, Phase 3 pilot, 2026-10-02)
//   The portal is moving from TypeScript to JavaScript. Dozens of guard specs
//   and gates (src/lib/*Gate, src/**/*.guard.test.*) find the files they check
//   by extension. Written against `/\.tsx?$/`, each one silently STOPPED
//   checking a file the moment it was renamed to `.jsx` — and kept passing,
//   over a smaller population. Every scanner now asks this module instead, and
//   `src/test/languageNeutralScanners.guard.test.js` fails if a TS-only filter
//   is written again.
// ────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';

/**
 * Any application or spec source file, in either language. Excludes `.d.ts`.
 * @param {string} path
 * @returns {boolean}
 */
export const isSourceFile = (path) => /\.(ts|tsx|js|jsx)$/.test(path) && !path.endsWith('.d.ts');

/**
 * A spec file (`x.test.tsx`, `x.test.js`, …).
 * @param {string} path
 * @returns {boolean}
 */
export const isTestFile = (path) => /\.test\.(ts|tsx|js|jsx)$/.test(path);

/**
 * A source file that may contain JSX (`.tsx` or `.jsx`).
 * @param {string} path
 * @returns {boolean}
 */
export const isJsxFile = (path) => /\.(tsx|jsx)$/.test(path);

/**
 * The TypeScript parser mode for a path, so `.js/.jsx` parse as JavaScript.
 * @param {string} path
 * @returns {ts.ScriptKind}
 */
export const scriptKindOf = (path) =>
  path.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : path.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : path.endsWith('.js')
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
