// ════════════════════════════════════════════════════════════════════════════
// ESLint — Phase 1 of the company frontend-standard alignment (2026-10-02)
// ════════════════════════════════════════════════════════════════════════════
//
// WHAT THIS FILE IS
//   The lint rules for this portal. They are PORTED from the company React
//   boilerplate (engineering-foundation/frontend/react/react-js-boilerplate,
//   `eslint.config.js`), so a rule here means the same thing it means in every
//   other Paragon frontend. Where this file departs from the boilerplate, the
//   departure is commented at the rule.
//
// WHY THE PORTAL HAS LINT NOW
//   Until 2026-10-02 `CLAUDE.md` said "this project has no lint script". The
//   owner lifted that rule to align with the company standard. Lint now runs as
//   gate 5/5 inside `npm run gates` (see `scripts/gates.mjs`).
//
// HOW SEVERITY WORKS (read this before changing a rule)
//   · 'error' — the codebase is already clean for this rule. A new violation
//     fails the commit (lint-staged) and fails `npm run gates`.
//   · 'warn'  — the codebase still has violations. They are reported, not
//     blocking. The total warning count may not GROW: gate 5 compares it with
//     the ceiling `lint.maxWarnings` in `scripts/floor.json`.
//   · Every rule below is written at its TARGET severity (the boilerplate's).
//     Rules that still had violations when lint was introduced (2026-10-02)
//     are listed in RULES_WITH_OPEN_VIOLATIONS and run as 'warn' until fixed.
//   · Promoting a rule: fix its last violation, delete its name from
//     RULES_WITH_OPEN_VIOLATIONS, and lower `lint.maxWarnings` in
//     `scripts/floor.json` in the same PR. `npm run lint` shows current counts.
//
// LANGUAGE TRANSITION (TypeScript → JavaScript)
//   The portal is being converted to JavaScript with JSDoc types (plan Phases
//   3–4). Until that finishes, BOTH languages live side by side:
//   · `.ts/.tsx` files are parsed by typescript-eslint. Rules that the
//     TypeScript compiler already enforces (undefined names, unused variables)
//     are switched off for them, so one mistake is not reported twice.
//   · `.js/.jsx` files under `src/` must carry JSDoc (`jsdoc/require-jsdoc`).
//     JSDoc is where their types live; `tsc` with `checkJs` reads it.
//
// FORECAST IS DEFERRED (plan Phase 7)
//   The forecast module's requirements are still being written. Its files are
//   linted so problems stay visible, but every rule is downgraded to 'warn' for
//   them, so lint never blocks forecast work. See FORECAST_FILES below.
// ════════════════════════════════════════════════════════════════════════════

import js from '@eslint/js';
import css from '@eslint/css';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginJsdoc from 'eslint-plugin-jsdoc';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';

// ── Which files belong to the deferred forecast module ──────────────────────
// Matches any path under src/ whose file or folder name contains "forecast"
// (e.g. `BuyerForecasts.tsx`, `services/engine/forecastBias.ts`,
// `pages-v2/demandForecast/…`). This is the ONE definition of the forecast
// scope for tooling; if another tool needs it, import it from here rather than
// copying the globs. When Phase 7 starts, delete this constant and the
// "forecast" block at the bottom of the file.
export const FORECAST_FILES = [
  'src/**/*{forecast,Forecast}*',
  'src/**/*{forecast,Forecast}*/**'
];

// ── Rules shared by JS and TS application code ──────────────────────────────
// Names and intent follow the boilerplate. Severity follows the measured run
// (see header). Each group keeps the boilerplate's section headings so the two
// files can be compared side by side.
const SHARED_RULES = {
  // ─── Prevent bugs (possible errors) ───
  'no-async-promise-executor': 'error',
  'no-compare-neg-zero': 'error',
  'no-cond-assign': ['error', 'always'],
  'no-const-assign': 'error',
  'no-constant-condition': ['error', { checkLoops: 'all' }],
  'no-dupe-else-if': 'error',
  'no-dupe-keys': 'error',
  'no-duplicate-case': 'error',
  // `allowSeparateTypeImports`: TypeScript files may import the same module
  // twice when one import is `import type`. Not a departure in spirit: the
  // boilerplate is JavaScript-only and never meets this case.
  'no-duplicate-imports': ['error', { allowSeparateTypeImports: true }],
  'no-ex-assign': 'error',
  'no-func-assign': 'error',
  'no-obj-calls': 'error',
  'no-promise-executor-return': 'error',
  'no-self-assign': 'error',
  'no-self-compare': 'error',
  'no-template-curly-in-string': 'error',
  'no-unreachable': 'error',
  'no-unsafe-finally': 'error',
  'no-unsafe-optional-chaining': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
  'react/jsx-key': 'error',
  'react/jsx-no-duplicate-props': 'error',
  // A bare `{count && <X/>}` renders "0" when count is 0. Use a ternary or `!!`.
  'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary', 'coerce'] }],
  'react/jsx-no-undef': 'error',
  'react/jsx-uses-vars': 'error',
  'react/no-children-prop': 'error',
  'react/no-danger-with-children': 'error',
  'react/no-string-refs': 'error',
  'react/no-this-in-sfc': 'error',
  'react/require-render-return': 'error',
  'react/void-dom-elements-no-children': 'error',
  'no-import-assign': 'warn',
  'no-unmodified-loop-condition': 'warn',
  'react/no-unknown-property': 'warn',

  // ─── Best practices ───
  // console.warn / console.error are allowed; console.log is not shipped.
  'no-console': ['error', { allow: ['warn', 'error'] }],
  'react/jsx-no-constructed-context-values': 'error',
  'react/jsx-no-target-blank': ['error', { allowReferrer: false }],
  'react/no-unescaped-entities': 'error',
  // An index key mis-renders rows when a list is reordered or filtered.
  'react/no-array-index-key': 'warn',

  // ─── Style / consistency ───
  // Components are arrow functions: `const Card = (props) => { … }`.
  'react/function-component-definition': [
    'error',
    {
      namedComponents: 'arrow-function',
      unnamedComponents: ['function-expression', 'arrow-function']
    }
  ],
  'react/jsx-boolean-value': ['warn', 'never'],
  'react/jsx-fragments': ['warn', 'syntax'],
  'react/jsx-pascal-case': 'error',
  'react/self-closing-comp': 'error',
  'react/style-prop-object': 'error',

  // ─── Off (same as the boilerplate) ───
  'react/display-name': 'off',
  'react/jsx-uses-react': 'off',
  'react/prop-types': 'off'
};

// Rules that only make sense where TypeScript is NOT checking the file.
// For `.ts/.tsx` the compiler (`strict`, `noUnusedLocals`) already reports
// these, so they are left off there to avoid double reports.
const JS_ONLY_RULES = {
  'no-dupe-args': 'error',
  'no-undef': 'error',
  'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
  'no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }]
};

/**
 * Copy a rules object with every 'error' turned into 'warn'.
 * Used for the deferred forecast files so lint reports but never blocks.
 * @param {Record<string, unknown>} rules
 * @returns {Record<string, unknown>}
 */
const asWarnings = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, setting]) => {
      if (setting === 'error') return [name, 'warn'];
      if (Array.isArray(setting) && setting[0] === 'error') return [name, ['warn', ...setting.slice(1)]];
      return [name, setting];
    })
  );

// ── Rules that still have violations in the codebase (plan Phase 2 fixes them)
// Each runs as 'warn' instead of its target severity until its count is zero.
// Grouped by how urgent the fix is, so Phase 2 can work top-down.
const RULES_WITH_OPEN_VIOLATIONS = [
  // Likely real bugs — fix first.
  'react-hooks/rules-of-hooks', // a hook called conditionally or in a loop
  'react/jsx-key', // list items rendered without a key
  'no-self-compare', // `x === x`, always true or a typo
  'no-promise-executor-return', // value returned from `new Promise(...)` is lost
  'no-template-curly-in-string', // "${x}" in plain quotes is never interpolated
  'react/jsx-no-leaked-render', // `{n && <X/>}` renders "0" when n is 0
  'react/no-array-index-key',
  // React Compiler readiness (eslint-plugin-react-hooks v7 recommended set).
  'react-hooks/exhaustive-deps',
  'react-hooks/set-state-in-effect',
  'react-hooks/static-components',
  'react-hooks/refs',
  'react-hooks/preserve-manual-memoization',
  'react-hooks/use-memo',
  'react-hooks/immutability',
  'react-hooks/globals',
  'react/jsx-no-constructed-context-values',
  // Style and structure.
  'no-duplicate-imports',
  'react/function-component-definition',
  'react/self-closing-comp',
  'react/jsx-max-depth',
  // CSS (Tailwind directives such as @tailwind/@apply read as unknown at-rules).
  'css/no-invalid-at-rules',
  'css/no-invalid-at-rule-placement',
  'css/no-invalid-properties',
  'css/no-important'
];

/**
 * Turn the rules in RULES_WITH_OPEN_VIOLATIONS into warnings, keeping options.
 * @param {Record<string, unknown>} rules
 * @returns {Record<string, unknown>}
 */
const withOpenViolationsAsWarnings = (rules) => {
  const out = { ...rules };
  for (const name of RULES_WITH_OPEN_VIOLATIONS) {
    // Only rules this block actually configures; adding a rule here would load
    // a plugin the block does not declare.
    if (!(name in out)) continue;
    const setting = out[name];
    if (Array.isArray(setting)) out[name] = ['warn', ...setting.slice(1)];
    else out[name] = 'warn';
  }
  return out;
};

const REACT_SETTINGS = { react: { version: 'detect' } };

export default defineConfig([
  // ── 1. Never linted ─────────────────────────────────────────────────────────
  // `.claude/` holds agent worktrees (full copies of the repo); linting them
  // would count every file several times.
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.claude/**', 'app/**', '*.tsbuildinfo']
  },

  // ── 2. Application code: JavaScript (the target language) ───────────────────
  {
    files: ['src/**/*.{js,jsx}'],
    ...pluginReactHooks.configs.flat.recommended,
    plugins: { js, react: pluginReact, 'react-hooks': pluginReactHooks, jsdoc: pluginJsdoc },
    extends: ['js/recommended'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } }
    },
    settings: REACT_SETTINGS,
    rules: {
      ...withOpenViolationsAsWarnings({
        ...pluginReactHooks.configs.flat.recommended.rules,
        ...SHARED_RULES,
        ...JS_ONLY_RULES
      }),
      // JSDoc is where a JavaScript file keeps its types (read by `tsc --checkJs`)
      // and its explanation for the next engineer. Required on every exported
      // function, arrow function and class. Departure from the boilerplate,
      // which asks for JSDoc by convention only.
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          // No auto-fix: the fixer inserts an EMPTY `/** */` stub, which
          // satisfies the rule while documenting nothing.
          enableFixer: false,
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
            ClassDeclaration: true
          }
        }
      ]
    }
  },

  // ── 3. Application code: TypeScript (until converted, plan Phases 3–4) ──────
  {
    files: ['src/**/*.{ts,tsx}'],
    ...pluginReactHooks.configs.flat.recommended,
    plugins: { react: pluginReact, 'react-hooks': pluginReactHooks },
    languageOptions: {
      parser: tseslint.parser,
      globals: globals.browser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } }
    },
    settings: REACT_SETTINGS,
    rules: withOpenViolationsAsWarnings({
      ...pluginReactHooks.configs.flat.recommended.rules,
      ...SHARED_RULES
    })
  },

  // ── 4. Max JSX depth for components and pages (boilerplate: 6) ──────────────
  // The boilerplate applies this to `components/` and `pages/`; the portal's
  // equivalents are `components/` and `pages-v2/`.
  {
    files: ['src/components/**/*.{js,jsx,tsx}', 'src/pages-v2/**/*.{js,jsx,tsx}'],
    plugins: { react: pluginReact },
    rules: { 'react/jsx-max-depth': ['warn', { max: 6 }] }
  },

  // ── 5. Test files: Vitest globals ───────────────────────────────────────────
  // Tests stay next to the code they test (portal convention, kept on purpose;
  // the boilerplate uses a central `src/__test__/` folder instead).
  {
    files: ['src/**/*.test.{js,jsx,ts,tsx}', 'src/test/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
    rules: {
      // Specs document behaviour through their `it(...)` titles; a JSDoc block
      // per helper would repeat it.
      'jsdoc/require-jsdoc': 'off'
    }
  },

  // ── 6. Tooling that runs in Node (gate, scripts, configs) ───────────────────
  // Not application code: Node globals, and no React rules.
  {
    files: ['gate/**/*.js', 'scripts/**/*.{js,mjs}', '*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.node, sourceType: 'module' },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // Node scripts report through the terminal on purpose.
      'no-console': 'off'
    }
  },

  // ── 7. CSS (boilerplate parity) ─────────────────────────────────────────────
  {
    files: ['src/**/*.css'],
    plugins: { css },
    language: 'css/css',
    extends: ['css/recommended'],
    rules: withOpenViolationsAsWarnings({
      'css/no-invalid-at-rules': 'error',
      'css/no-invalid-at-rule-placement': 'error',
      'css/no-invalid-properties': 'error',
      'css/no-important': 'error'
    })
  },

  // ── 8. Forecast: report, never block (plan Phase 7) ─────────────────────────
  // Must come after blocks 2–4 so it overrides their severities. Two halves,
  // because TS files do not load the jsdoc plugin or the JS-only rules.
  {
    files: FORECAST_FILES.map((glob) => (glob.endsWith('*') ? `${glob}.{ts,tsx}` : glob)),
    ignores: ['**/*.{js,jsx,css}'],
    rules: asWarnings({ ...pluginReactHooks.configs.flat.recommended.rules, ...SHARED_RULES })
  },
  {
    files: FORECAST_FILES.map((glob) => (glob.endsWith('*') ? `${glob}.{js,jsx}` : glob)),
    ignores: ['**/*.{ts,tsx,css}'],
    rules: asWarnings({
      ...pluginReactHooks.configs.flat.recommended.rules,
      ...SHARED_RULES,
      ...JS_ONLY_RULES,
      'jsdoc/require-jsdoc': 'error'
    })
  },

  // ── 9. Prettier owns formatting; turn off rules that fight it (must be last)
  eslintConfigPrettier
]);
