#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// Codemod: relative cross-folder imports → aliases (frontend-standard Phase 2)
// ════════════════════════════════════════════════════════════════════════════
//
// WHAT IT DOES
//   For every source file under src/, finds each RELATIVE module specifier
//   ('./x', '../../y') and resolves it. If the target sits in a DIFFERENT
//   top-level folder of src/ than the importing file, the specifier is
//   rewritten to that folder's alias (see aliases.js):
//     src/pages-v2/rfx/Foo.tsx:  '../../services/data/types'
//                             →  '@services/data/types'
//   Imports inside the same top-level folder are left relative, per the rule
//   in aliases.js. Only the string changes; nothing else in the file moves.
//
// WHICH SPECIFIERS
//   `import … from '…'`, `export … from '…'`, side-effect `import '…'`,
//   dynamic `import('…')`, `vi.mock('…')`, `vi.importActual('…')`,
//   `vi.importMock('…')` and `require('…')`. A spec that mocks a module must
//   name it the same way the code imports it, so mocks are rewritten too.
//
// FORECAST IS SKIPPED BY DEFAULT
//   Files whose path contains "forecast"/"Forecast" (the deferred module, plan
//   Phase 7) are not edited. Run with `--include-forecast` when Phase 7 starts.
//
// USAGE
//   node scripts/codemods/alias-imports.mjs            # rewrite in place
//   node scripts/codemods/alias-imports.mjs --dry-run  # report only
//   Then run `npm run gates`. The script is idempotent: a second run finds
//   nothing to change.
// ════════════════════════════════════════════════════════════════════════════

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const DRY_RUN = process.argv.includes('--dry-run');
const INCLUDE_FORECAST = process.argv.includes('--include-forecast');

// Read the alias list from aliases.js as TEXT (this script runs in plain Node,
// which cannot import a .ts module without a loader). The guard spec
// src/test/aliases.guard.test.js keeps aliases.js itself honest.
const aliasSource = readFileSync(join(ROOT, 'aliases.js'), 'utf8');
const FOLDER_TO_ALIAS = new Map(
  [...aliasSource.matchAll(/'(@[\w-]+)':\s*'([\w-]+)'/g)].map(([, alias, folder]) => [folder, alias]),
);
if (FOLDER_TO_ALIAS.size === 0) throw new Error('No aliases parsed from aliases.js — refusing to run');

const FORECAST = /[fF]orecast/;
const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs)$/;

// The quoted relative specifier in any of the forms listed in the header.
const SPECIFIER =
  /(\bfrom\s+|\bimport\s+|\bimport\(\s*|\bvi\.(?:mock|importActual|importMock)\(\s*|\brequire\(\s*)(['"])(\.{1,2}\/[^'"]*)\2/g;

/** Every source file under a directory, recursively. */
const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : SOURCE_FILE.test(entry) ? [full] : [];
  });

/** The top-level folder of src/ a path belongs to ('' for files at src/ root). */
const topFolder = (absPath) => {
  const rel = relative(SRC, absPath).split(sep);
  return rel.length > 1 ? rel[0] : '';
};

let filesChanged = 0;
let specifiersChanged = 0;
const skippedForecast = [];

for (const file of walk(SRC)) {
  const relFile = relative(ROOT, file);
  if (!INCLUDE_FORECAST && FORECAST.test(relFile)) {
    skippedForecast.push(relFile);
    continue;
  }
  const before = readFileSync(file, 'utf8');
  const fromFolder = topFolder(file);

  const after = before.replace(SPECIFIER, (whole, lead, quote, spec) => {
    const target = resolve(dirname(file), spec);
    if (!target.startsWith(SRC + sep)) return whole; // outside src/ (e.g. aliases.js)
    const toFolder = topFolder(target);
    const alias = FOLDER_TO_ALIAS.get(toFolder);
    if (!toFolder || toFolder === fromFolder || !alias) return whole;
    const rest = relative(join(SRC, toFolder), target).split(sep).join(posix.sep);
    // A bare folder import ('../../services') has no alias form: tsconfig maps
    // `@services/*` only. Leave it relative; none exist today.
    if (!rest) return whole;
    specifiersChanged += 1;
    return `${lead}${quote}${alias}/${rest}${quote}`;
  });

  if (after !== before) {
    filesChanged += 1;
    if (!DRY_RUN) writeFileSync(file, after);
  }
}

console.log(
  `${DRY_RUN ? '[dry run] would rewrite' : 'Rewrote'} ${specifiersChanged} import(s) in ${filesChanged} file(s).` +
    (INCLUDE_FORECAST ? '' : ` Skipped ${skippedForecast.length} forecast file(s) (plan Phase 7).`),
);
