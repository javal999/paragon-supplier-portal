// ════════════════════════════════════════════════════════════════════════════
// lint-staged — what the Husky pre-commit hook runs (`.husky/pre-commit`)
// ════════════════════════════════════════════════════════════════════════════
//
// Only files STAGED for the commit are checked, so a commit never touches
// files its author did not change. Adapted from the company React
// boilerplate's `lint-staged` block, with one deliberate difference per
// language while the portal moves from TypeScript to JavaScript:
//
//   · JavaScript in src/ (converted code): auto-fix with ESLint, then format
//     with Prettier — the boilerplate's behaviour, with ONE rule's auto-fix
//     switched off: `react/jsx-no-leaked-render`. Its fix rewrites `a && b`
//     inside JSX as `a ? b : null`, which CHANGES BEHAVIOUR — `{0 && <X/>}`
//     stops rendering "0", and in an attribute `checked={a && b}` becomes
//     `null` instead of `false`, which turns a controlled checkbox into an
//     uncontrolled one. It rewrote every flagged site, unseen, during the
//     Phase 4 conversion (found 2026-10-05; all reverted to `&&`). The rule
//     still REPORTS — as a warning under the `lint.maxWarnings` ceiling — so
//     each site is fixed by a person, on purpose, in its own change.
//   · TypeScript in src/ (not yet converted): ESLint WITHOUT --fix and no
//     Prettier. Auto-fixing or reformatting a .ts file would bury a small
//     change under whole-file churn; those files are formatted when their
//     folder is converted (plan Phase 4). The commit still fails on any lint
//     ERROR, so rules already at zero violations stay at zero.
//   · Node tooling (gate/, scripts/, root configs): ESLint only.
//
// Forecast files need no special case here: Phase 7 (2026-10-06) converted them
// to JavaScript, and `eslint.config.js` applies the same rules to them as to
// every other file. The TypeScript line above now only meets `vite-env.d.ts`.
//
// To skip the hook in an emergency: `HUSKY=0 git commit ...`. Prefer fixing the
// error — CI runs the same lint as gate 5 of `npm run gates` and will fail too.
// ════════════════════════════════════════════════════════════════════════════

export default {
  'src/**/*.{js,jsx}': ['eslint --fix --rule "react/jsx-no-leaked-render: off"', 'prettier --write'],
  'src/**/*.{ts,tsx}': ['eslint'],
  '{gate,scripts}/**/*.{js,mjs}': ['eslint'],
  '*.{js,mjs,cjs}': ['eslint']
};
