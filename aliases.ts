// ════════════════════════════════════════════════════════════════════════════
// Import aliases — the ONE list (frontend-standard plan, Phase 2, 2026-10-02)
// ════════════════════════════════════════════════════════════════════════════
//
// WHAT AN ALIAS IS
//   `import { Table } from '@components/ui-v2/Table'` instead of
//   `import { Table } from '../../../components/ui-v2/Table'`. The alias names
//   the top-level folder under `src/`, so an import reads the same from any
//   file, and moving a file does not break the imports inside it.
//
// THE RULE (same as the company React boilerplate)
//   · Import from ANOTHER top-level folder of src/ → use its alias.
//   · Import from the SAME top-level folder → stay relative (`./x`, `../rfx/y`).
//   The boilerplate defines @components, @hooks, @pages, @utils, @assets,
//   @locales, @i18n and @test. The portal's folders differ, so it has one alias
//   per folder it actually has.
//
// WHO READS THIS FILE
//   · `vite.config.ts`, `vitest.config.ts`, `vitest.drift.config.ts` import
//     ALIASES directly.
//   · `tsconfig.json` cannot import a module, so its `compilerOptions.paths`
//     repeats the list. `src/test/aliases.guard.test.ts` fails if the two ever
//     disagree, so add or rename an alias here AND in tsconfig.json together.
//
// WHY `@app-types` AND NOT `@types`
//   `@types/...` is npm's scope for type packages (`@types/react`). An alias
//   with that name would shadow them.
// ════════════════════════════════════════════════════════════════════════════

import { fileURLToPath } from 'node:url';

/** Alias name → folder under `src/`. */
export const ALIAS_FOLDERS = {
  '@assets': 'assets',
  '@components': 'components',
  '@context': 'context',
  '@data': 'data',
  '@hooks': 'hooks',
  '@lib': 'lib',
  '@pages': 'pages',
  '@pages-v2': 'pages-v2',
  '@router': 'router',
  '@services': 'services',
  '@styles': 'styles',
  '@test': 'test',
  '@app-types': 'types',
} as const;

/**
 * The same map with absolute folder paths, in the shape Vite's `resolve.alias`
 * takes. Absolute because Vite's root is `app/`, not the repo root.
 */
export const ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(ALIAS_FOLDERS).map(([alias, folder]) => [
    alias,
    fileURLToPath(new URL(`./src/${folder}`, import.meta.url)),
  ]),
);
