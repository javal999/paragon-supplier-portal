// ────────────────────────────────────────────────────────────────────────────
// resolveImport — turn an import specifier into a file path, for specs that
// read source code as text (guards that follow a file's imports by hand).
//
// Since the import aliases landed (aliases.js, frontend-standard plan Phase 2)
// a specifier may be relative ('./x', '../../y') OR aliased ('@services/x'). A
// guard that only joined relative paths would silently stop finding aliased
// files and pass over an empty set. Use this helper instead of `join(dirname)`.
// ────────────────────────────────────────────────────────────────────────────

import { existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { ALIAS_FOLDERS } from '../../aliases';

const SRC = join(__dirname, '..');

/** Extensions tried, in order. `.js/.jsx` cover files already converted. */
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

/**
 * The absolute base path a specifier points at, without extension; `null` for
 * a package import ('react') or an unknown alias.
 * @param {string} fromFile
 * @param {string} specifier
 * @returns {string | null}
 */
export const specifierBase = (fromFile, specifier) => {
  if (specifier.startsWith('.')) return normalize(join(dirname(fromFile), specifier));
  const slash = specifier.indexOf('/');
  const alias = slash === -1 ? specifier : specifier.slice(0, slash);
  const folder = /** @type {Record<string, string>} */ (ALIAS_FOLDERS)[alias];
  if (!folder) return null;
  return normalize(join(SRC, folder, slash === -1 ? '' : specifier.slice(slash + 1)));
};

/**
 * The source file a specifier resolves to, or `null` if none exists.
 * @param {string} fromFile
 * @param {string} specifier
 * @returns {string | null}
 */
export const resolveImport = (fromFile, specifier) => {
  const base = specifierBase(fromFile, specifier);
  if (base === null) return null;
  for (const ext of EXTENSIONS) if (existsSync(base + ext)) return base + ext;
  return null;
};
