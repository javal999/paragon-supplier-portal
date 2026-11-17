// ────────────────────────────────────────────────────────────────────────────
// Pages read data through the seam, never from the mock layer.
//
// `mockDataService` is mounted behind `DataServiceContext`, and that context is
// the one place a real backend plugs in. A page that imports a read model,
// store or fixture from `src/services/data/mock/**` at runtime binds itself to
// the mock and the future swap silently skips that page. This is not
// hypothetical: the G1 build replayed in the 2026-11-17 model A/B did exactly
// that and every gate stayed green, because no gate can see an import.
//
// Scope: RUNTIME imports in `src/pages-v2/**` source files, specs excluded.
// JSDoc `@import` / `import('...')` type references and `import type` bind
// nothing at runtime, so they pass.
//
// LEGACY: six files already import the mock layer at runtime. The list is
// pinned so the debt is visible and cannot grow. Removing a row is progress;
// a row that stops importing fails here as stale, the same discipline as the
// ownerless `unprobeable` list.
// ────────────────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { isSourceFile, isTestFile, scriptKindOf } from './sourceFiles';

const ROOT = join(__dirname, '..', '..');
const PAGES = join(ROOT, 'src', 'pages-v2');
const MOCK = 'services/data/mock';

/** Runtime importers already on the wrong side of the seam, pinned 2026-11-17. */
const LEGACY = new Set([
  'src/pages-v2/BuyerSourcing/const.js',
  'src/pages-v2/BuyerStabilise/components/SeriesSection.jsx',
  'src/pages-v2/InterfaceMonitor.jsx',
  'src/pages-v2/interface/sapInterfaceDisplay.js',
  'src/pages-v2/plan-grid/planGridModel.js',
  'src/pages-v2/roles/roleModel.js'
]);

/**
 * Module specifiers in `text` that point at the mock layer and load at runtime.
 * Type-only imports and JSDoc-only references are skipped: they bind nothing.
 * @param {string} text
 * @param {string} path used for the parser's script kind
 * @returns {string[]}
 */
const mockSpecifiersIn = (text, path) => {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKindOf(path));
  /** @type {string[]} */
  const found = [];
  /**
   * @param {string} spec
   * @returns {void}
   */
  const note = (spec) => {
    if (spec.includes(MOCK)) found.push(spec);
  };
  /**
   * @param {ts.Node} node
   * @returns {void}
   */
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
      if (ts.isStringLiteral(node.moduleSpecifier)) note(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      note(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [arg] = node.arguments;
      if (arg && ts.isStringLiteral(arg)) note(arg.text);
    }
    node.forEachChild(visit);
  };
  visit(source);
  return found;
};

/**
 * @param {string} path absolute
 * @returns {string[]}
 */
const mockSpecifiersOfFile = (path) => mockSpecifiersIn(readFileSync(path, 'utf8'), path);

/**
 * Every non-spec source file under `src/pages-v2`, as repo-relative paths.
 * @param {string} dir
 * @returns {string[]}
 */
const pageSourceFiles = (dir) => {
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...pageSourceFiles(path));
    else if (isSourceFile(path) && !isTestFile(path)) out.push(relative(ROOT, path));
  }
  return out;
};

describe('page data seam — pages do not import the mock layer at runtime', () => {
  it('detects runtime imports of every shape the tree uses, and passes the harmless ones', () => {
    const bad = [
      "import { store } from '@services/data/mock/stores/exampleStore';",
      "import {\n  a,\n  b\n} from '@services/data/mock/someReadModel';",
      "import { fixture } from '../../services/data/mock/fixtures/example';",
      "const model = await import('@services/data/mock/dynamicReadModel');"
    ];
    for (const text of bad) expect(mockSpecifiersIn(text, 'probe.jsx')).not.toEqual([]);

    const good = [
      "import { useOrders } from '@services/query/hooks';",
      "import { mount } from '@services/data/service';",
      "/** @import { Row } from '@services/data/mock/someReadModel' */",
      "import type { Row } from '@services/data/mock/someReadModel';"
    ];
    for (const text of good) expect(mockSpecifiersIn(text, 'probe.jsx')).toEqual([]);
  });

  it('every runtime mock import under src/pages-v2 is on the pinned legacy list', () => {
    const files = pageSourceFiles(PAGES);
    expect(files.length).toBeGreaterThan(0);

    const offenders = files
      .flatMap((file) => mockSpecifiersOfFile(join(ROOT, file)).map((spec) => ({ file, spec })))
      .filter(({ file }) => !LEGACY.has(file))
      .map(({ file, spec }) => `${file} -> ${spec}`);

    expect(offenders).toEqual([]);
  });

  it('has no stale legacy row — every pinned file still imports the mock layer', () => {
    const stale = [...LEGACY].filter((file) => mockSpecifiersOfFile(join(ROOT, file)).length === 0);
    expect(stale).toEqual([]);
  });
});
