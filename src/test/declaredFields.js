// ────────────────────────────────────────────────────────────────────────────
// declaredFields — the fields a file DECLARES on its types, in either language.
//
// WHY THIS EXISTS (frontend-standard plan, Phase 4, 2026-10-05)
//   Several specs read a fixture's SOURCE to prove a retired field is not
//   declared (`retiredDayFields.test.ts`, `obligationRollup.test.ts`). They
//   matched `^\s*daysUntilExpiry\s*:\s*number\s*;` — the TypeScript interface
//   form. After conversion the same declaration is JSDoc
//   (`@property {number} daysUntilExpiry`), the regex matched nothing, and the
//   CONTROL (`endDate: string;`) went red. This reads both forms through the
//   TypeScript parser instead of a wider regex:
//     - `interface X { f: T }` and `type X = { f: T }` members (TS form);
//     - `@property {T} f` / `@prop {T} [f]` tags, including inside
//       `@typedef {object} X` (JSDoc form), and type-literal members written
//       inside a JSDoc type (`@typedef {{ f: T }} X`).
// ────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';
import { scriptKindOf } from './sourceFiles';

/**
 * @typedef {object} DeclaredField
 * @property {string} name     the property name
 * @property {string} type     the declared type, as written (`number`, `string | undefined` …)
 * @property {boolean} optional `f?: T` or `@property {T} [f]`
 * @property {'ts' | 'jsdoc'} form which syntax declared it
 */

/**
 * Every field declared on a type anywhere in `src`, in TS or JSDoc form.
 * @param {string} src the file's text
 * @param {string} fileName its path (picks the parser mode: `.js/.jsx` parse as JavaScript)
 * @returns {DeclaredField[]}
 */
export function declaredFields(src, fileName) {
  const sf = ts.createSourceFile(
    fileName,
    src,
    ts.ScriptTarget.Latest,
    true,
    scriptKindOf(fileName)
  );
  /** @type {DeclaredField[]} */
  const out = [];
  /** @param {ts.Node} n @param {'ts' | 'jsdoc'} form */
  const visit = (n, form) => {
    if (ts.isPropertySignature(n) && n.name && n.type) {
      out.push({
        name: n.name.getText(sf),
        type: n.type.getText(sf).trim(),
        optional: !!n.questionToken,
        form
      });
    } else if (ts.isJSDocPropertyTag(n) && n.typeExpression) {
      // Only `@property`/`@prop` tags count; a `@param` is not a field.
      out.push({
        name: n.name.getText(sf),
        type: n.typeExpression.type.getText(sf).trim(),
        optional: n.isBracketed || n.typeExpression.type.kind === ts.SyntaxKind.JSDocOptionalType,
        form: 'jsdoc'
      });
    }
    // JSDoc hangs off the node it documents and is not reached by forEachChild.
    for (const doc of /** @type {{ jsDoc?: ts.JSDoc[] }} */ (/** @type {unknown} */ (n)).jsDoc ??
      []) {
      ts.forEachChild(doc, (c) => visit(c, 'jsdoc'));
    }
    ts.forEachChild(n, (c) => visit(c, form));
  };
  visit(sf, 'ts');
  return out;
}

/**
 * Does `src` declare a field `name` (optionally: of exactly type `type`)?
 * @param {string} src
 * @param {string} fileName
 * @param {string} name
 * @param {string} [type]
 * @returns {boolean}
 */
export function declaresField(src, fileName, name, type) {
  return declaredFields(src, fileName).some(
    (f) => f.name === name && (type === undefined || f.type === type)
  );
}
