// ────────────────────────────────────────────────────────────────────────────
// leakedRenderGate — a NUMBER before `&&` in JSX children renders itself.
//
// `{count && <Badge />}` paints "0" when count is 0, and `{ratio && <X />}`
// paints "NaN". Every other falsy value renders nothing visible: false, null,
// undefined and "" (an empty text node). So the defect is a TYPE question, not
// a syntax one, and this gate asks the type checker, reading the project's
// JSDoc types through `tsconfig.json` (allowJs + checkJs).
//
// It replaces `react/jsx-no-leaked-render` (switched off 2026-10-29). That rule
// reads syntax only: on main 94c949da it flagged 480 sites, and the checker
// found a number before `&&` in none of them. This gate checks every `&&`
// written as a JSX child (1,156 on that commit, including the `!!x` and
// comparison forms the rule accepted) and asks the type, so it can tell a
// count from a boolean.
//
// A FINDING is a non-final operand of an `&&` chain written directly as a JSX
// child (`<p>{a && b && <X />}</p>`) whose type can be a number or bigint, or
// is `any` / `unknown` (the checker cannot prove it is not a number).
//
// ⚠️ WHAT IT DELIBERATELY DOES NOT SEE, SAID RATHER THAN LEFT TO BE DISCOVERED:
//   · `&&` in an ATTRIBUTE (`checked={a && b}`): nothing is rendered there.
//   · `&&` nested inside another expression in a child, such as a ternary
//     branch or a `.map` callback's returned JSX: the outer child is the
//     ternary or the call, not the chain. The chain inside a `.map` callback's
//     JSX IS seen, because that JSX is itself a JSX element with children.
//   · Values the JSDoc types misdescribe. The gate trusts the types.
// ────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';

/**
 * @typedef {object} Finding
 * @property {string} file
 * @property {number} line
 * @property {string} operand The operand's source text.
 * @property {string} type The checker's type for it.
 */

/**
 * @typedef {object} Site
 * @property {string} file
 * @property {number} line
 * @property {string[]} operands Source text of the non-final operands.
 */

/**
 * @param {ts.Type} t
 * @returns {boolean}
 */
const mayBeNumber = (t) =>
  t.isUnion()
    ? t.types.some(mayBeNumber)
    : !!(
        t.flags &
        (ts.TypeFlags.NumberLike |
          ts.TypeFlags.BigIntLike |
          ts.TypeFlags.Any |
          ts.TypeFlags.Unknown)
      );

/**
 * The operands of an `&&` chain, left to right, without the final one (the
 * value rendered when every guard is truthy).
 * @param {ts.Expression} e
 * @returns {ts.Expression[]}
 */
const guardOperands = (e) => {
  /** @type {ts.Expression[]} */
  const out = [];
  /** @param {ts.Expression} x */
  const walk = (x) => {
    while (ts.isParenthesizedExpression(x)) x = x.expression;
    if (
      ts.isBinaryExpression(x) &&
      x.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      walk(x.left);
      walk(x.right);
    } else out.push(x);
  };
  walk(e);
  return out.slice(0, -1);
};

/**
 * @param {ts.Expression | undefined} e
 * @returns {boolean}
 */
const isAndChain = (e) => {
  while (e && ts.isParenthesizedExpression(e)) e = e.expression;
  return (
    !!e &&
    ts.isBinaryExpression(e) &&
    e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
  );
};

/**
 * Scans the given source files of a program.
 * @param {ts.Program} program
 * @param {(fileName: string) => boolean} include
 * @param {(fileName: string) => string} [label] How a file is named in results.
 * @returns {{ findings: Finding[]; sites: Site[] }}
 */
export function scanProgram(program, include, label = (f) => f) {
  const checker = program.getTypeChecker();
  /** @type {Finding[]} */
  const findings = [];
  /** @type {Site[]} */
  const sites = [];
  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || !include(sf.fileName)) continue;
    const file = label(sf.fileName);
    /** @param {ts.Node} n */
    const visit = (n) => {
      if (
        ts.isJsxExpression(n) &&
        (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent)) &&
        isAndChain(n.expression)
      ) {
        const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
        const ops = guardOperands(/** @type {ts.Expression} */ (n.expression));
        sites.push({ file, line, operands: ops.map((o) => o.getText(sf)) });
        for (const o of ops) {
          const t = checker.getTypeAtLocation(o);
          if (mayBeNumber(t)) {
            findings.push({ file, line, operand: o.getText(sf), type: checker.typeToString(t) });
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return { findings, sites };
}

/**
 * A program over the project's own `tsconfig.json`.
 * @param {string} root The repository root.
 * @returns {ts.Program}
 */
export function projectProgram(root) {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) throw new Error(`no tsconfig.json under ${root}`);
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
  );
  if (!parsed) throw new Error(`cannot read ${configPath}`);
  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: { ...parsed.options, noEmit: true }
  });
}

/**
 * A program holding one in-memory JSX file, checked with the project's
 * options, for probing the scanner.
 * @param {string} root The repository root (for the compiler options).
 * @param {string} code
 * @returns {{ findings: Finding[]; sites: Site[] }}
 */
export function scanSnippet(root, code) {
  const configPath = /** @type {string} */ (
    ts.findConfigFile(root, ts.sys.fileExists, 'tsconfig.json')
  );
  const parsed = /** @type {ts.ParsedCommandLine} */ (
    ts.getParsedCommandLineOfConfigFile(
      configPath,
      {},
      { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
    )
  );
  const options = { ...parsed.options, noEmit: true, types: [] };
  const name = `${root}/__probe__.jsx`;
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = (f, lang, ...rest) =>
    f === name
      ? ts.createSourceFile(f, code, lang, true, ts.ScriptKind.JSX)
      : getSourceFile(f, lang, ...rest);
  const fileExists = host.fileExists;
  host.fileExists = (f) => f === name || fileExists(f);
  const program = ts.createProgram({ rootNames: [name], options, host });
  return scanProgram(
    program,
    (f) => f === name,
    () => 'probe.jsx'
  );
}
