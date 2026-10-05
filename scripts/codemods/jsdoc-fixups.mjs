#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// Codemod: repair ts-to-jsdoc output (frontend-standard plan, Phases 3–4)
// ════════════════════════════════════════════════════════════════════════════
//
// HOW A FOLDER IS CONVERTED FROM TYPESCRIPT TO JAVASCRIPT
//   1. `npx ts-to-jsdoc@2.4.0 -o <tmp> src/<folder>` run FROM THE REPO ROOT,
//      so imported types resolve (run elsewhere, props types collapse to any).
//   2. `git mv` each `.tsx` → `.jsx` and `.ts` → `.js` (keeps history), then
//      copy the tool's output over it. The tool names every file `.js`.
//   3. `node scripts/codemods/jsdoc-fixups.mjs <files…>`  ← this script
//   4. `npx prettier --write <files…>`, then fix what `tsc` and ESLint still
//      report by hand (see "WHAT IS LEFT FOR A PERSON" below).
//
// WHAT THIS SCRIPT FIXES (defects the tool makes on every file)
//   a. `@returns {Element}` — the tool writes the bare global `Element`, which
//      TypeScript reads as the DOM `Element`, not a React element. Every page
//      that renders the component then fails with TS2786. → `React.ReactNode`.
//   b. `@param {Props}` with no name — emitted for a destructured parameter;
//      a JSDoc @param without a name is a syntax error (TS1003). → `props`.
//   c. `import React` kept only for types — once `React.FC<…>` becomes JSDoc,
//      the runtime import is unused (TS6133, ESLint no-unused-vars). The
//      default import is dropped when no CODE uses `React`, and a type-only
//      `/** @import * as React from 'react' */` is added when JSDoc still does.
//   d. `import type React from 'react'` → the tool's `@import React` tag is
//      dropped when (c) added the namespace import, to avoid a duplicate.
//   e. A generic component's typedefs get the component's `@template` line.
//
// WHAT IS LEFT FOR A PERSON (the tool loses information this script cannot recover)
//   · `interface X extends Y` becomes a typedef WITHOUT `Y` — rewrite as
//     `@typedef {Y & { … }} X`.
//   · Overloads, discriminated-union props, and inner helpers whose parameter
//     types TypeScript used to infer from context (add a JSDoc `@param`).
//   · `useRef(null)` / `useState([])`: plain JS infers `null` / `never[]`;
//     annotate the initial value, e.g. `useRef(/** @type {HTMLDivElement | null} */ (null))`.
//   · A file the tool cannot transform comes back as unconverted TypeScript
//     (it prints "ManipulationError"); convert that one by hand.
//
// USAGE: node scripts/codemods/jsdoc-fixups.mjs src/components/ui-v2/*.{js,jsx}
// Idempotent: a second run changes nothing.
// ════════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from 'node:fs';

const files = process.argv.slice(2).filter((f) => /\.(js|jsx)$/.test(f));
if (files.length === 0) {
  console.error('usage: node scripts/codemods/jsdoc-fixups.mjs <file.js|file.jsx>…');
  process.exit(1);
}

const REACT_NS_IMPORT = "/** @import * as React from 'react' */";

/** Source with comments blanked out, to ask "does CODE use this name?". */
const codeOnly = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1 ');

let changed = 0;
for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let src = before;

  // a. DOM `Element` in a @returns tag → a React element.
  //    `React.ReactNode`, not `React.JSX.Element`: the TypeScript source typed
  //    components as `React.FC`, which may return null, and React 19 accepts
  //    any ReactNode-returning function as a component.
  src = src
    .replace(/^(\s*\*\s*@returns\s*\{)([^}\n]*)\}/gm, (_m, head, type) =>
      `${head}${type.replace(/(?<![\w.])(?:React\.JSX\.)?Element\b/g, 'React.ReactNode')}}`
    );

  // b. Unnamed @param (a destructured parameter) → named `props`.
  src = src.replace(/^(\s*\*\s*@param\s*\{[^\n]*\})[ \t]*$/gm, '$1 props');

  // c. A runtime `import React` that only types use.
  const usesReactInCode = /\bReact\b/.test(
    codeOnly(src).replace(/^\s*import\s+React\b[^\n]*$/m, '')
  );
  if (!usesReactInCode) {
    src = src
      .replace(/^import React from ['"]react['"];?\n/m, '')
      .replace(/^import React,\s*(\{[^}]*\})\s*from\s*(['"]react['"]);?/m, 'import $1 from $2;');
  }
  const comments = (src.match(/\/\*[\s\S]*?\*\//g) ?? []).join('\n');
  const jsdocUsesReact = /\bReact\./.test(comments);
  if (!usesReactInCode && jsdocUsesReact && !src.includes(REACT_NS_IMPORT)) {
    src = `${REACT_NS_IMPORT}\n${src}`;
  }

  // e. Generic props: the tool puts `@template {string} T` on the component but
  //    not on the typedefs that use `T`, so `T` is unknown there (TS2304) and
  //    `Props<T>` "is not generic" (TS2315). Copy the file's template line
  //    into every typedef block that mentions `T` without declaring it.
  const template = /^\s*\*\s*(@template\b[^\n]*\bT)\s*$/m.exec(src)?.[1];
  if (template) {
    src = src.replace(/\/\*\*((?:(?!\*\/)[\s\S])*?@typedef(?:(?!\*\/)[\s\S])*?)\*\//g, (block, body) =>
      /@template\b/.test(body) || !/[{<|(,\s]T[\s>\]|),;}[]/.test(body)
        ? block
        : block.replace(/^(\s*)\* @typedef/m, `$1* ${template}\n$1* @typedef`)
    );
  }

  // d. The tool turns `import type React from 'react'` into a default-import
  //    JSDoc tag, which clashes with the namespace import added in (c).
  if (src.includes(REACT_NS_IMPORT)) {
    src = src.replace(/^\/\*\* @import React from ['"]react['"] \*\/\n/m, '');
  }

  if (src !== before) {
    writeFileSync(file, src);
    changed += 1;
  }
}
console.log(`jsdoc-fixups: ${changed} of ${files.length} file(s) changed.`);
