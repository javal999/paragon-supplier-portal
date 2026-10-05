// ────────────────────────────────────────────────────────────────────────────
// The import aliases are declared twice, and this spec keeps the two equal.
//
// `aliases.ts` (repo root) is the list Vite and Vitest read. `tsconfig.json`
// `compilerOptions.paths` repeats it because JSON cannot import a module. If
// they drift, the editor and `tsc` resolve an import one way and the build or
// the test run another. Both directions are checked: an alias missing from
// either side, or pointing at a different folder, fails here.
// ────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ALIAS_FOLDERS } from '../../aliases';

const ROOT = join(__dirname, '..', '..');

/**
 * tsconfig.json carries `//` comments, so strip them before JSON.parse.
 * @returns {Record<string, string[]>}
 */
const readTsconfigPaths = () => {
  const raw = readFileSync(join(ROOT, 'tsconfig.json'), 'utf8');
  const json = raw.replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(json).compilerOptions.paths;
};

describe('import aliases — aliases.ts and tsconfig.json paths agree', () => {
  const paths = readTsconfigPaths();
  const fromTsconfig = Object.fromEntries(
    Object.entries(paths).map(([key, [target]]) => [
      key.replace(/\/\*$/, ''),
      target.replace(/^\.\/src\//, '').replace(/\/\*$/, '')
    ])
  );

  it('declares the same aliases, pointing at the same folders', () => {
    expect(fromTsconfig).toEqual(ALIAS_FOLDERS);
  });

  it('points every alias at a folder that exists', () => {
    for (const folder of Object.values(ALIAS_FOLDERS)) {
      const dir = join(ROOT, 'src', folder);
      expect(existsSync(dir) && statSync(dir).isDirectory(), dir).toBe(true);
    }
  });
});
