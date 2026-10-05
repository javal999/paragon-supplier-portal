#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// ts-to-js — convert TypeScript files to JavaScript + JSDoc, IN PLACE
// (frontend-standard plan, Phase 4; replaces the ts-to-jsdoc draft step)
// ════════════════════════════════════════════════════════════════════════════
//
// WHY A CONVERTER OF OUR OWN
//   The Phase 3 pilot drafted with `ts-to-jsdoc`, which re-prints each file. The
//   re-print deleted every comment attached to an interface or type, removed
//   blank lines, and DROPPED type information it could not express: `as T`,
//   `x!`, `as const`, generic call arguments, const annotations. About 185 hand
//   edits went into putting that back for 62 files (see
//   docs/frontend-standard/JS-CONVERSION-PLAYBOOK.md).
//
//   This converter never re-prints. It parses the file with the TypeScript
//   compiler, then applies small TEXT EDITS to the original: it removes type
//   syntax and inserts the equivalent JSDoc next to it. Everything it does not
//   touch — comments, blank lines, formatting, code — stays byte-identical.
//
// WHAT IT TRANSLATES (TypeScript → JSDoc)
//   import type { A } from 'm'            → /** @import { A } from 'm' */
//   import { a, type B } / value imports used only as types → split into @import
//   interface X extends Y { a?: T }       → /** @typedef {…} X */ (comments kept)
//   type X<T> = …                         → /** @template T @typedef {…} X */
//   const x: T = v / let x: T             → /** @type {T} */ const x = v
//   function f<T>(a: A, b?: B): R         → /** @template T @param {A} a @param {B} [b] @returns {R} */
//   (x: T) => …  inline callback          → /** @param {T} x */ (x) => …
//   expr as T / as const / satisfies T    → /** @type {T} */ (expr) / {const} / @satisfies
//   expr!                                 → /** @type {NonNullable<typeof expr>} */ (expr)
//   useState<T>(v), useRef<T>(null), new Map<K, V>(), querySelector<T>(…) → casts
//   any other f<A>(…)                     → /** @type {typeof f<A>} */ (f)(…)
//   class fields, `private`, `implements` → @type / @private / @implements
//
// WHAT IT FLAGS FOR A PERSON (listed per file, nothing is guessed)
//   enums, overloads, `declare`, namespaces, constructor parameter properties,
//   abstract members, a non-null or generic call whose type it cannot name.
//   A flagged spot keeps a `TODO(ts-to-js)` comment and usually a tsc error.
//
// USAGE
//   node scripts/codemods/ts-to-js.mjs [--dry-run] <file.ts|file.tsx>…
//   Each file is `git mv`-ed to .js/.jsx (history kept) and rewritten. Then:
//   npx prettier --write …, node scripts/codemods/check-comments-kept.mjs …,
//   npx tsc --noEmit -p tsconfig.json, and fix what is flagged.
// ════════════════════════════════════════════════════════════════════════════

import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY_RUN = process.argv.includes('--dry-run');
const inputs = process.argv
  .slice(2)
  .filter((a) => !a.startsWith('--'))
  .map((f) => resolve(f));
if (inputs.length === 0) {
  console.error('usage: node scripts/codemods/ts-to-js.mjs [--dry-run] <file.ts|file.tsx>…');
  process.exit(1);
}

// ── A program over the whole spec surface, for the type checker ─────────────
// Only two translations need types (a non-null or generic call the syntax
// cannot name); everything else is syntactic.
const cfgPath = join(ROOT, 'tsconfig.vitest.json');
const cfg = ts.getParsedCommandLineOfConfigFile(cfgPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
const program = ts.createProgram({ rootNames: cfg.fileNames, options: cfg.options });
const checker = program.getTypeChecker();

// ── Small text helpers ──────────────────────────────────────────────────────

/** Remove comments from a type's source text; return the code and the comments. */
function stripComments(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
  let code = '';
  const comments = [];
  for (let k = scanner.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = scanner.scan()) {
    const tok = scanner.getTokenText();
    if (k === ts.SyntaxKind.SingleLineCommentTrivia || k === ts.SyntaxKind.MultiLineCommentTrivia) {
      comments.push(tok);
      code += k === ts.SyntaxKind.MultiLineCommentTrivia && tok.includes('\n') ? '\n' : ' ';
    } else code += tok;
  }
  return { code, comments };
}

/** The prose of a comment: no `//`, `/*`, `*\/` or leading `*`. */
const commentProse = (c) =>
  c.startsWith('//')
    ? [c.replace(/^\/\/\s?/, '')]
    : c
        .replace(/^\/\*\*?/, '')
        .replace(/\*\/$/, '')
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').replace(/\s+$/, ''))
        .filter((l, i, a) => !(l === '' && (i === 0 || i === a.length - 1)));

/**
 * Collapse a type's text: comments out, whitespace to single spaces. A comment
 * that documents a member of an object type inside it (`{ /** doc *\/ a: T }`)
 * comes back labelled with the member, as `\`a\`: doc`, so the prose still says
 * which field it describes.
 */
function typeText(node, sf) {
  // FULL text, leading trivia included: in `type X = /** doc */ | 'a' | …` the
  // first member's comment sits before the type's first token.
  const { code, comments } = stripComments(sf.text.slice(node.getFullStart(), node.end));
  const label = new Map();
  const visit = (n) => {
    if ((ts.isPropertySignature(n) || ts.isMethodSignature(n)) && n.name) {
      for (const c of leadingComments(n, sf)) label.set(c, n.name.getText(sf));
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  const labelled = comments.map((c) => (label.has(c) ? { c, member: label.get(c) } : { c }));
  return { text: code.replace(/\s+/g, ' ').trim(), comments, labelled };
}

/** Prose lines for a type's comments, labelling each member's comment. */
const typeProse = (tt) =>
  tt.labelled.flatMap(({ c, member }) => {
    const lines = commentProse(c);
    return member && lines.length ? [`\`${member}\`: ${lines[0]}`, ...lines.slice(1)] : lines;
  });

/** Leading comments of a node (JSDoc, block and line comments). */
const leadingComments = (node, sf) =>
  (ts.getLeadingCommentRanges(sf.text, node.getFullStart()) ?? []).map((r) => sf.text.slice(r.pos, r.end));

/** Column of a position, for indenting a new JSDoc block to match. */
function indentAt(sf, pos) {
  const lineStart = sf.text.lastIndexOf('\n', pos - 1) + 1;
  return /^[ \t]*/.exec(sf.text.slice(lineStart))[0];
}

/** Build a JSDoc block from lines, indented like the node it precedes. */
function jsdocBlock(lines, indent, inline = false) {
  if (inline || lines.length === 1) return `/** ${lines.join(' ')} */${inline ? ' ' : `\n${indent}`}`;
  return `/**\n${lines.map((l) => `${indent} *${l ? ` ${l}` : ''}`).join('\n')}\n${indent} */\n${indent}`;
}

/** `@template` lines for a node's type parameters. */
const templateTags = (tps, sf) =>
  (tps ?? []).map((tp) => {
    const c = tp.constraint ? `{${typeText(tp.constraint, sf).text}} ` : '';
    const name = tp.default ? `[${tp.name.text}=${typeText(tp.default, sf).text}]` : tp.name.text;
    return `@template ${c}${name}`;
  });

/**
 * Is this identifier used as a TYPE (so its import can become `@import`)?
 * True inside any type node, including an interface's `extends` and a class's
 * `implements`; false for a class's `extends Base` (a value) and everywhere else.
 */
function inTypePosition(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isExpressionWithTypeArguments(p) && ts.isHeritageClause(p.parent))
      return !(p.parent.token === ts.SyntaxKind.ExtendsKeyword && ts.isClassLike(p.parent.parent));
    if (ts.isTypeNode(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p)) return true;
    if (ts.isStatement(p) || ts.isSourceFile(p)) return false;
  }
  return false;
}

/** Simple entity chain (`a`, `a.b.c`, `this.x`) usable in `typeof`. */
const isEntityChain = (e) =>
  ts.isIdentifier(e) || e.kind === ts.SyntaxKind.ThisKeyword || (ts.isPropertyAccessExpression(e) && !e.questionDotToken && ts.isIdentifier(e.name) && isEntityChain(e.expression));

/**
 * A type EXPRESSION for an expression, built from its shape so that it needs no
 * import: `a.b` → `typeof a.b`, `f(x)` → `ReturnType<typeof f>`, `e.p` →
 * `(T)['p']`, `e!` → `NonNullable<T>`, `arr[i]` → `(T)[number]`, `await e` →
 * `Awaited<T>`, `import('m')` → `Promise<typeof import('m')>`. Returns null
 * for a shape it does not know. Every result is checked by tsc afterwards, so
 * an imprecise one (an overloaded or generic callee) surfaces as an error.
 */
function typeExprOf(e, sf) {
  if (ts.isParenthesizedExpression(e)) return typeExprOf(e.expression, sf);
  if (isEntityChain(e)) return `typeof ${e.getText(sf)}`;
  if (ts.isNonNullExpression(e)) {
    const t = typeExprOf(e.expression, sf);
    return t && `NonNullable<${t}>`;
  }
  if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.name)) {
    const t = typeExprOf(e.expression, sf);
    return t && `(${t})['${e.name.text}']`;
  }
  if (ts.isAwaitExpression(e)) {
    const t = typeExprOf(e.expression, sf);
    return t && `Awaited<${t}>`;
  }
  if (ts.isCallExpression(e) && e.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(e.arguments[0])) {
    return `Promise<typeof import('${e.arguments[0].text}')>`;
  }
  if (ts.isCallExpression(e) && !e.typeArguments) {
    const t = typeExprOf(e.expression, sf);
    return t && `ReturnType<${t}>`;
  }
  if (ts.isElementAccessExpression(e)) {
    const t = typeExprOf(e.expression, sf);
    if (!t) return null;
    const objType = checker.getTypeAtLocation(e.expression);
    if (checker.isArrayType(objType) || checker.isTupleType(objType)) return `(${t})[number]`;
    if (ts.isStringLiteral(e.argumentExpression)) return `(${t})['${e.argumentExpression.text}']`;
    return null;
  }
  return null;
}

/**
 * `@template` lines and the `<T, …>` argument list for a re-exported type, read
 * from its original declaration: `export type { Of } from './types'` where `Of<T>`
 * is generic must become `@template T @typedef {import('./types').Of<T>} Of`.
 */
function reexportTemplate(nameNode) {
  let sym = checker.getSymbolAtLocation(nameNode);
  if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  const decl = sym?.declarations?.find((d) => d.typeParameters?.length || ts.isJSDocTypedefTag(d));
  const tps = decl?.typeParameters ?? (decl && ts.isJSDocTypedefTag(decl) ? ts.getEffectiveTypeParameterDeclarations(decl) : []);
  if (!tps || tps.length === 0) return { tags: [], args: '' };
  const dsf = decl.getSourceFile();
  return {
    tags: tps.map((tp) => {
      // In a JSDoc typedef the constraint sits on the `@template {C} T` tag.
      const c = tp.constraint
        ? tp.constraint.getText(dsf)
        : tp.parent && ts.isJSDocTemplateTag(tp.parent) && tp.parent.constraint
          ? tp.parent.constraint.getText(dsf).replace(/^\{|\}$/g, '')
          : null;
      return `@template ${c ? `{${c}} ` : ''}${tp.default ? `[${tp.name.text}=${tp.default.getText(dsf)}]` : tp.name.text}`;
    }),
    args: `<${tps.map((tp) => tp.name.text).join(', ')}>`,
  };
}

/**
 * The checker's name for a type when it is ONE named type (`TransitionDef`,
 * `Map<string, Row>`) and that name resolves, at `node`, to the SAME symbol —
 * so the app's `TransitionEvent` is never written where the DOM's would be read.
 */
function sameSymbolName(type, node) {
  const sym = type.aliasSymbol ?? type.getSymbol();
  if (!sym) return null;
  const text = checker.typeToString(type, node, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
  const m = /^([A-Za-z_$][\w$]*)(<.*>)?$/.exec(text);
  if (!m || m[1] !== sym.getName() || text.length > 160) return null;
  // Every name inside the type arguments must resolve here too
  // (`Map<string, GrossCell>` with no GrossCell in scope is not usable).
  if (m[2]) {
    for (const n of new Set(m[2].replace(/"[^"]*"|'[^']*'/g, '').match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? [])) {
      if (!checker.resolveName(n, node, ts.SymbolFlags.Type | ts.SymbolFlags.Namespace, false)) return null;
    }
  }
  let found = checker.resolveName(m[1], node, ts.SymbolFlags.Type, false);
  if (found && found.flags & ts.SymbolFlags.Alias) found = checker.getAliasedSymbol(found);
  if (found === sym) return text;
  if (found) return null; // the name means something ELSE here (the DOM's TransitionEvent)
  // Not in scope at all: reference it where it is declared, `import('…').Name`,
  // a JSDoc form that needs no import line. Only for app files, never a library.
  const declFile = sym.declarations?.[0]?.getSourceFile().fileName;
  if (!declFile || declFile.includes('/node_modules/') || (m[2] && /\b[A-Z]/.test(m[2]))) return null;
  let rel = toPosixRel(node.getSourceFile().fileName, declFile);
  return `import('${rel}').${text}`;
}

/** `./x` / `../y` module path from one source file to another, without extension. */
function toPosixRel(fromFile, toFile) {
  let rel = relative(dirname(fromFile), toFile).split('\\').join('/').replace(/\.(d\.ts|tsx?|jsx?)$/, '');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

/** A type the checker names, only if every name in it resolves at `node`. */
function nameableType(type, node) {
  const text = checker.typeToString(type, node, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
  if (text.length > 160 || /import\(|\.\.\.|\bany\b/.test(text)) return null;
  const names = text.replace(/"[^"]*"|'[^']*'/g, '').match(/\b[A-Z][A-Za-z0-9_]*\b/g) ?? [];
  for (const n of new Set(names)) {
    const sym = checker.resolveName(n, node, ts.SymbolFlags.Type | ts.SymbolFlags.Namespace, false);
    if (!sym) return null;
  }
  return text;
}

// ── The converter ───────────────────────────────────────────────────────────

/**
 * Convert one source file's text. Returns `{ text, flags }`.
 * @param {ts.SourceFile} sf
 */
function convert(sf) {
  const edits = []; // { start, end, text }
  const flags = [];
  const flag = (node, what) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    flags.push(`${line + 1}: ${what}`);
  };
  const del = (start, end) => edits.push({ start, end, text: '' });

  /**
   * A JSDoc cast that would be the FIRST token inside an existing parenthesised
   * expression — `(x!.a ?? 0)` → `(/** @type *\/ (x).a ?? 0)` — is moved OUT of
   * the parentheses by Prettier, which then casts the whole expression. No
   * written form survives repeated Prettier runs, so the spot is flagged for a
   * person to rewrite as a local variable (frontend-standard Phase 4 playbook).
   */
  const flagIfOpensParens = (target, castNode) => {
    const start = target.getStart(sf);
    // Climb the nodes that START where the target starts; the first enclosing
    // parenthesised expression among them is the one Prettier would rewrite.
    for (let p = target.parent; p && p.getStart(sf) >= start - 1; p = p.parent) {
      // Safe when the parentheses hold ONLY the cast (`(foo as Bar).baz`):
      // risky when the cast is merely the start of a longer expression.
      if (ts.isParenthesizedExpression(p) && p.expression.getStart(sf) === start && p.expression !== castNode) {
        flag(target, 'JSDoc cast would open a parenthesised expression — Prettier moves it outside; rewrite as a local variable');
        return;
      }
      if (p.getStart(sf) !== start) return;
    }
  };

  const ins = (pos, text) => edits.push({ start: pos, end: pos, text });
  const rep = (start, end, text) => edits.push({ start, end, text });
  const src = sf.text;

  /**
   * Delete a `<…>` type-argument or type-parameter list. The list's own range
   * stops at its last element, so search outward for the brackets: when the
   * list is broken over lines, `>` sits after a newline.
   */
  const delAngles = (list) => {
    const lt = src.lastIndexOf('<', list.pos);
    const gt = src.indexOf('>', list.end);
    del(lt, gt + 1);
    return gt;
  };

  /** Delete `: T` (and an optional `?`/`!` before it) after a name. */
  const dropAnnotation = (nameEnd, type) => {
    if (type) del(nameEnd, type.end);
  };

  /** Where a declaration's JSDoc goes, and the JSDoc already there. */
  const docTarget = (node) => {
    let target = node;
    if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isVariableDeclaration(node.parent)) {
      const list = node.parent.parent;
      if (ts.isVariableDeclarationList(list) && list.declarations.length === 1 && ts.isVariableStatement(list.parent)) target = list.parent;
      else return null;
    } else if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isPropertyAssignment(node.parent)) {
      target = node.parent;
    } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      return null; // inline: callers emit an inline block
    }
    const docs = target.jsDoc ?? [];
    return { target, doc: docs[docs.length - 1] };
  };

  /** Add tag lines to a node: merged into its last JSDoc, or as a new block. */
  const addTags = (node, tags, inlineAt) => {
    if (tags.length === 0) return;
    const t = docTarget(node);
    if (!t) {
      ins(inlineAt ?? node.getStart(sf), jsdocBlock(tags, '', true));
      return;
    }
    if (t.doc) {
      const close = t.doc.end - 2; // position of `*/`
      const indent = indentAt(sf, t.doc.pos);
      const oneLine = !src.slice(t.doc.pos, t.doc.end).includes('\n');
      if (oneLine) {
        // `/** text */` → multi-line block with the text, then the tags.
        const prose = src.slice(t.doc.pos + 3, close).trim();
        rep(t.doc.pos, t.doc.end, `/**\n${indent} * ${prose}\n${tags.map((l) => `${indent} * ${l}`).join('\n')}\n${indent} */`);
      } else {
        const lineStart = src.lastIndexOf('\n', close - 1) + 1;
        ins(lineStart, tags.map((l) => `${indent} * ${l}\n`).join(''));
      }
    } else {
      const start = t.target.getStart(sf);
      const indent = indentAt(sf, start);
      // If code precedes the target on its line (`{ a: …, b: (c) => … }`), a
      // block placed there is read by Prettier as a TRAILING comment of `a`.
      const lineStart = src.lastIndexOf('\n', start - 1) + 1;
      const codeBefore = src.slice(lineStart, start).trim().length > 0;
      ins(start, `${codeBefore ? `\n${indent}` : ''}${jsdocBlock(tags, indent)}`);
    }
  };

  // ── Imports: type-only, and value imports used only as types ─────────────
  const typeOnlyUse = new Map(); // local name -> true when used only in types
  const usesOf = (name) => {
    const uses = [];
    const visit = (n) => {
      if (ts.isIdentifier(n) && n.text === name && !ts.isImportSpecifier(n.parent) && !ts.isImportClause(n.parent) && !ts.isNamespaceImport(n.parent)) uses.push(n);
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return uses;
  };
  const onlyTypes = (name) => {
    if (!typeOnlyUse.has(name)) {
      const uses = usesOf(name);
      // JSX tag names are value uses; `inTypePosition` already says no for them.
      typeOnlyUse.set(name, uses.length > 0 && uses.every(inTypePosition));
    }
    return typeOnlyUse.get(name);
  };

  // Types this file re-exports without `from` (`export type { A }`), by local
  // name. When A was IMPORTED, an `@import` would not re-export it, so it
  // becomes `@typedef {import('m').A} A` instead (which does both).
  const reexported = new Set();
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st) && !st.moduleSpecifier && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const e of st.exportClause.elements) if (st.isTypeOnly || e.isTypeOnly) reexported.add((e.propertyName ?? e.name).text);
    }
  }

  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && st.importClause) {
      const ic = st.importClause;
      const mod = st.moduleSpecifier.getText(sf);
      const typeNames = [];
      let keepDefault = ic.name && !ic.isTypeOnly && !onlyTypes(ic.name.text);
      let defaultAsType = ic.name && !keepDefault ? ic.name.text : null;
      let ns = null;
      let nsAsType = false;
      const keepNamed = [];
      if (ic.namedBindings && ts.isNamespaceImport(ic.namedBindings)) {
        ns = ic.namedBindings.name.text;
        nsAsType = ic.isTypeOnly || onlyTypes(ns);
      } else if (ic.namedBindings) {
        for (const el of ic.namedBindings.elements) {
          const local = el.name.text;
          const spec = el.propertyName ? `${el.propertyName.text} as ${local}` : local;
          if (ic.isTypeOnly || el.isTypeOnly || onlyTypes(local)) typeNames.push(spec);
          else keepNamed.push(spec);
        }
      }
      const tags = [];
      const modPath = st.moduleSpecifier.text;
      for (const spec of [...typeNames]) {
        const [orig, , local = orig] = spec.split(' ');
        if (reexported.has(local)) {
          typeNames.splice(typeNames.indexOf(spec), 1);
          const el = ic.namedBindings.elements.find((x) => x.name.text === local);
          const g = reexportTemplate(el.name);
          const typedef = `@typedef {import('${modPath}').${orig}${g.args}} ${local}`;
          tags.push(g.tags.length ? `/**\n${[...g.tags, typedef].map((l) => ` * ${l}`).join('\n')}\n */` : `/** ${typedef} */`);
        }
      }
      if (defaultAsType) tags.push(`/** @import ${defaultAsType} from ${mod} */`);
      if (ns && nsAsType) tags.push(`/** @import * as ${ns} from ${mod} */`);
      if (typeNames.length) tags.push(`/** @import { ${typeNames.join(', ')} } from ${mod} */`);
      const runtime = [];
      if (keepDefault) runtime.push(ic.name.text);
      if (ns && !nsAsType) runtime.push(`* as ${ns}`);
      if (keepNamed.length) runtime.push(`{ ${keepNamed.join(', ')} }`);
      const changed = tags.length > 0 || ic.isTypeOnly;
      if (changed) {
        const runtimeLine = runtime.length ? `import ${runtime.join(', ')} from ${mod};` : '';
        // A comment INSIDE the braces (`import { // why\n a } …`) would be lost
        // by the rewrite; it moves above the import as line comments.
        const inner = stripComments(st.getText(sf)).comments.flatMap(commentProse).map((l) => `//${l ? ` ${l}` : ''}`);
        rep(st.getStart(sf), st.end, [...inner, ...tags, runtimeLine].filter(Boolean).join('\n'));
      }
      continue;
    }
    if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      const all = st.exportClause.elements;
      const typeEls = all.filter((e) => st.isTypeOnly || e.isTypeOnly);
      if (typeEls.length === 0) continue;
      const keep = all.filter((e) => !typeEls.includes(e)).map((e) => e.getText(sf));
      const lines = st.moduleSpecifier
        ? typeEls.map((e) => {
            const g = reexportTemplate(e.propertyName ?? e.name);
            const typedef = `@typedef {import(${st.moduleSpecifier.getText(sf)}).${(e.propertyName ?? e.name).text}${g.args}} ${e.name.text}`;
            return g.tags.length ? `/**\n${[...g.tags, typedef].map((l) => ` * ${l}`).join('\n')}\n */` : `/** ${typedef} */`;
          })
        : []; // a local type is already exported by its @typedef
      if (keep.length) lines.push(`export { ${keep.join(', ')} }${st.moduleSpecifier ? ` from ${st.moduleSpecifier.getText(sf)}` : ''};`);
      rep(st.getStart(sf), st.end, lines.join('\n'));
    }
  }

  // ── Declarations of types ────────────────────────────────────────────────
  const typedefFor = (node, body, extraProse = []) => {
    // Comments ABOVE the declaration stay where they are (outside node.getStart()).
    const indent = indentAt(sf, node.getStart(sf));
    const tags = [...templateTags(node.typeParameters, sf)];
    const lines = [...extraProse, ...(extraProse.length ? [''] : []), ...tags, ...body];
    rep(node.getStart(sf), node.end, jsdocBlock(lines, indent).trimEnd());
  };

  const memberProse = (m) => leadingComments(m, sf).flatMap(commentProse);

  const visitTypeDecl = (node) => {
    if (ts.isTypeAliasDeclaration(node)) {
      const { code, comments } = stripComments(sf.text.slice(node.type.getFullStart(), node.type.end).replace(/^\s+/, ''));
      const lines = code.split('\n');
      const minIndent = Math.min(...lines.slice(1).filter((l) => l.trim()).map((l) => /^\s*/.exec(l)[0].length), Infinity);
      const typeLines = lines.map((l, i) => (i === 0 ? l.trim() : l.slice(Number.isFinite(minIndent) ? minIndent : 0).replace(/\s+$/, ''))).filter((l) => l.trim());
      const prose = comments.flatMap(commentProse);
      const body = typeLines.length === 1
        ? [`@typedef {${typeLines[0]}} ${node.name.text}`]
        : [`@typedef {${typeLines[0]}`, ...typeLines.slice(1, -1).map((l) => `  ${l}`), `  ${typeLines[typeLines.length - 1]}} ${node.name.text}`];
      typedefFor(node, body, prose);
      return true;
    }
    if (ts.isInterfaceDeclaration(node)) {
      // `interface X extends Base { a: T }` OVERRIDES Base's `a`; an intersection
      // would AND the two types instead. So a base whose members X redeclares
      // is written `Omit<Base, 'a'>` — the same type TypeScript gave X.
      const own = new Set(node.members.map((m) => m.name?.getText(sf)).filter(Boolean).map((n) => n.replace(/^['"]|['"]$/g, '')));
      const heritage = (node.heritageClauses ?? []).flatMap((h) =>
        h.types.map((t) => {
          const text = typeText(t, sf).text;
          const baseProps = checker.getTypeAtLocation(t).getProperties().map((p) => p.getName());
          const overridden = baseProps.filter((n) => own.has(n));
          return overridden.length ? `Omit<${text}, ${overridden.map((n) => `'${n}'`).join(' | ')}>` : text;
        })
      );
      // `@typedef {object}` + `@property` cannot say `readonly` (owner ruling
      // 2026-10-05: keep readonly everywhere), so an interface with any readonly
      // member is written as a type-literal typedef instead; each member's comment
      // becomes a labelled line of prose above it.
      const anyReadonly = node.members.some((m) => m.modifiers?.some((x) => x.kind === ts.SyntaxKind.ReadonlyKeyword));
      const simple = !anyReadonly && node.members.every((m) => ts.isPropertySignature(m) || ts.isMethodSignature(m));
      const props = [];
      const prose = [];
      const literal = [];
      // Every comment in the body: those attached to a member become its
      // description; the rest (e.g. a note where a removed field used to be)
      // become prose on the typedef, so nothing is dropped.
      const memberComments = new Set(node.members.flatMap((m) => leadingComments(m, sf)));
      const bodyText = sf.text.slice(node.members.pos, node.end);
      const loose = stripComments(bodyText).comments.filter((c) => !memberComments.has(c));
      const typeInner = new Set(node.members.flatMap((m) => (ts.isPropertySignature(m) && m.type ? typeText(m.type, sf).comments : [])));
      for (const c of loose) if (!typeInner.has(c)) prose.push(...commentProse(c));
      for (const m of node.members) {
        const desc = memberProse(m);
        const name = m.name ? m.name.getText(sf) : '';
        const opt = !!m.questionToken;
        let t;
        if (ts.isPropertySignature(m)) t = m.type ? typeText(m.type, sf) : { text: 'any', comments: [] };
        else if (ts.isMethodSignature(m)) {
          const tp = m.typeParameters ? `<${m.typeParameters.map((p) => p.getText(sf)).join(', ')}>` : '';
          const ps = m.parameters.map((p) => stripComments(p.getText(sf)).code.replace(/\s+/g, ' ').trim()).join(', ');
          t = { text: `${tp}(${ps}) => ${m.type ? typeText(m.type, sf).text : 'void'}`, comments: [] };
        } else t = { text: stripComments(m.getText(sf)).code.replace(/\s+/g, ' ').replace(/;$/, '').trim(), comments: [] };
        const inner = t.comments.flatMap(commentProse);
        if (simple && !heritage.length) {
          const all = [...desc, ...inner];
          // A description that starts with a symbol (e.g. ⚠️) right after the
          // name is a parse error in tsc's JSDoc reader; JSDoc's ` - ` fixes it.
          const sep = all.length && !/^[A-Za-z0-9`'"(*_]/.test(all[0]) ? ' - ' : ' ';
          props.push(`@property {${t.text}} ${opt ? `[${name}]` : name}${all.length ? `${sep}${all[0]}` : ''}`);
          for (const more of all.slice(1)) props.push(`  ${more}`);
        } else {
          if (desc.length || inner.length) prose.push(`\`${name || 'signature'}\`: ${[...desc, ...inner].join(' ')}`);
          literal.push(ts.isPropertySignature(m) || ts.isMethodSignature(m) ? `${ts.isPropertySignature(m) && m.modifiers?.some((x) => x.kind === ts.SyntaxKind.ReadonlyKeyword) ? 'readonly ' : ''}${name}${opt ? '?' : ''}: ${t.text};` : `${t.text};`);
        }
      }
      if (simple && !heritage.length) {
        typedefFor(node, [`@typedef {object} ${node.name.text}`, ...props], prose);
      } else {
        const obj = literal.length ? `{\n${literal.map((l) => `  ${l}`).join('\n')}\n}` : '{}';
        const full = [...heritage, ...(literal.length || !heritage.length ? [obj] : [])].join(' & ');
        const fl = full.split('\n');
        const body = fl.length === 1 ? [`@typedef {${fl[0]}} ${node.name.text}`] : [`@typedef {${fl[0]}`, ...fl.slice(1, -1).map((l) => `  ${l}`), `  ${fl[fl.length - 1]}} ${node.name.text}`];
        typedefFor(node, body, prose);
      }
      return true;
    }
    if (ts.isEnumDeclaration(node)) {
      // `enum E { A = 'a' }` → `const E = /** @type {const} */ ({ A: 'a' });`
      // plus `@typedef` of its values, edited in place so member comments stay.
      // Only enums whose every member has a value; others are left for a person.
      if (node.members.some((m) => !m.initializer) || node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ConstKeyword || m.kind === ts.SyntaxKind.DeclareKeyword)) {
        flag(node, 'enum without explicit values (or const/declare enum) — convert by hand');
        return true;
      }
      const name = node.name.text;
      const exported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      const open = src.indexOf('{', node.name.end);
      rep(node.getStart(sf), open + 1, `${exported ? 'export ' : ''}const ${name} = /** @type {const} */ ({`);
      for (const m of node.members) rep(m.name.end, m.initializer.getStart(sf), ': ');
      rep(node.end - 1, node.end, `});\n${indentAt(sf, node.getStart(sf))}/** @typedef {(typeof ${name})[keyof typeof ${name}]} ${name} */`);
      return true;
    }
    if (ts.isModuleDeclaration(node)) { flag(node, 'namespace/module declaration — convert by hand'); return true; }
    if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)) { flag(node, '`declare` — convert by hand'); return true; }
    return false;
  };

  // ── Functions: params, return type, type parameters ──────────────────────
  /** `@param`/`@returns` lines for a signature, read without editing it. */
  const signatureTags = (fn) => {
    const tags = [...templateTags(fn.typeParameters, sf)];
    fn.parameters.forEach((p, i) => {
      const name = ts.isIdentifier(p.name) ? p.name.text : i === 0 ? 'props' : `arg${i}`;
      let t = p.type ? typeText(p.type, sf).text : '*';
      if (p.dotDotDotToken) t = `...${t.replace(/\[\]$/, '')}`;
      tags.push(`@param {${t}} ${p.questionToken || p.initializer ? `[${name}]` : name}`);
    });
    if (fn.type) tags.push(`@returns {${typeText(fn.type, sf).text}}`);
    return tags;
  };

  const visitFunction = (fn) => {
    // An overload signature (`function f(a: A): R;`, no body) becomes a JSDoc
    // `@overload` block in its place; the implementation below keeps its own.
    if ((ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn)) && !fn.body) {
      rep(fn.getStart(sf), fn.end, jsdocBlock(['@overload', ...signatureTags(fn)], indentAt(sf, fn.getStart(sf))).trimEnd());
      return;
    }
    const tags = [...templateTags(fn.typeParameters, sf)];
    let anyType = !!fn.typeParameters;
    fn.parameters.forEach((p, i) => {
      if (p.name.kind === ts.SyntaxKind.Identifier && p.name.text === 'this') {
        if (p.type) tags.push(`@this {${typeText(p.type, sf).text}}`);
        // remove `this: T,` entirely
        const next = fn.parameters[i + 1];
        del(p.getStart(sf), next ? next.getStart(sf) : p.end);
        anyType = true;
        return;
      }
      // `constructor(private readonly x: T)` → `constructor(x)` + `this.x = x;`
      const propMods = (p.modifiers ?? []).filter((m) => [ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword].includes(m.kind));
      if (propMods.length && ts.isConstructorDeclaration(fn) && fn.body && ts.isIdentifier(p.name)) {
        for (const m of propMods) del(m.getStart(sf), m.end + src.slice(m.end).match(/^\s*/)[0].length);
        const bodyIndent = `${indentAt(sf, fn.getStart(sf))}  `;
        ins(fn.body.getStart(sf) + 1, `\n${bodyIndent}this.${p.name.text} = ${p.name.text};`);
      } else if (propMods.length) {
        flag(p, 'constructor parameter property — convert by hand');
      }
      const name = ts.isIdentifier(p.name) ? p.name.text : i === 0 ? 'props' : `arg${i}`;
      if (p.type) {
        anyType = true;
        const tt = typeText(p.type, sf);
        let t = tt.text;
        // Comments inside an inline type (e.g. a field's doc in `{ /** … */ a: T }`)
        // cannot live inside the JSDoc type, so they become prose above the tag.
        tags.unshift(...typeProse(tt));
        // A rest parameter: `...X[]` → JSDoc `...X` (each argument is X). A
        // tuple or other non-array type (`Parameters<typeof f>`) is written as is —
        // `...T` would mean "each argument is the whole tuple".
        if (p.dotDotDotToken) t = /\[\]$/.test(t) ? `...${t.slice(0, -2).replace(/^\((.*)\)$/, '$1')}` : /^(?:readonly )?Array<(.+)>$/.test(t) ? `...${RegExp.$1}` : t;
        const opt = p.questionToken || p.initializer;
        tags.push(`@param {${t}} ${opt ? `[${name}]` : name}`);
      } else if (p.questionToken) {
        anyType = true;
        tags.push(`@param {*} [${name}]`);
      }
      if (p.questionToken) del(p.questionToken.getStart(sf), p.questionToken.end);
      if (p.type) dropAnnotation((p.questionToken ?? p.name).end, p.type);
    });
    // `(a): a is NonNullable<typeof a> => …` — JSDoc cannot name the parameter
    // in an inline predicate, and TypeScript (5.5+) INFERS this exact predicate
    // from `a !== undefined` / `a != null`, so the annotation is dropped.
    const inferablePredicate =
      fn.type && ts.isTypePredicateNode(fn.type) && fn.type.type &&
      /^NonNullable<typeof \w+>$/.test(typeText(fn.type.type, sf).text);
    if (fn.type && !inferablePredicate) {
      anyType = true;
      tags.push(`@returns {${typeText(fn.type, sf).text}}`);
      // `): R =>` / `): R {` — remove from the `)` to the end of the type.
      const close = src.lastIndexOf(')', fn.type.getStart(sf));
      del(close + 1, fn.type.end);
    } else if (inferablePredicate) {
      const close = src.lastIndexOf(')', fn.type.getStart(sf));
      del(close + 1, fn.type.end);
    }
    if (fn.typeParameters) delAngles(fn.typeParameters);
    if (!anyType) return;
    const inlineAt = ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) ? fn.getStart(sf) : undefined;
    addTags(fn, tags, inlineAt);
  };

  // ── Walk everything ──────────────────────────────────────────────────────
  const visit = (node) => {
    if (visitTypeDecl(node)) return; // the whole declaration was replaced

    if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node)) {
      visitFunction(node);
    }

    // const x: T = v
    if (ts.isVariableDeclaration(node) && (node.type || node.exclamationToken)) {
      const list = node.parent;
      if (node.exclamationToken) del(node.exclamationToken.getStart(sf), node.exclamationToken.end);
      if (node.type) {
        const tt = typeText(node.type, sf);
        const t = tt.text;
        const prose = typeProse(tt);
        const single = ts.isVariableDeclarationList(list) && list.declarations.length === 1;
        if (single && ts.isVariableStatement(list.parent)) {
          addTags({ ...list.parent, jsDoc: list.parent.jsDoc, getStart: () => list.parent.getStart(sf) }, [...prose, `@type {${t}}`]);
        } else if (node.initializer) {
          // `for (let n: T = v; …)` or several declarators: tsc ignores a JSDoc in
          // a for header, so the initializer carries the type as a cast.
          ins(node.initializer.getStart(sf), `/** @type {${t}} */ (`);
          ins(node.initializer.end, ')');
        } else if (single) {
          ins(list.getStart(sf), `/** @type {${t}} */ `);
        } else {
          flag(node, 'typed declaration in a multi-declarator list without initializer');
        }
        dropAnnotation((node.exclamationToken ?? node.name).end, node.type);
      }
    }

    // class members
    if (ts.isPropertyDeclaration(node)) {
      const tags = [];
      if (node.type) tags.push(`@type {${typeText(node.type, sf).text}}`);
      if (node.questionToken) del(node.questionToken.getStart(sf), node.questionToken.end);
      if (node.exclamationToken) del(node.exclamationToken.getStart(sf), node.exclamationToken.end);
      if (node.type) dropAnnotation((node.questionToken ?? node.exclamationToken ?? node.name).end, node.type);
      dropModifiers(node, tags);
      if (tags.length) addTags({ ...node, jsDoc: node.jsDoc, getStart: () => node.getStart(sf) }, tags);
    }
    if ((ts.isMethodDeclaration(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node) || ts.isConstructorDeclaration(node)) && node.modifiers) {
      const tags = [];
      dropModifiers(node, tags);
      if (tags.length) addTags({ ...node, jsDoc: node.jsDoc, getStart: () => node.getStart(sf) }, tags);
    }
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      for (const h of node.heritageClauses ?? []) {
        if (h.token === ts.SyntaxKind.ImplementsKeyword) {
          const tags = h.types.map((t) => `@implements {${typeText(t, sf).text}}`);
          del(h.getFullStart(), h.end);
          addTags({ ...node, jsDoc: node.jsDoc, getStart: () => node.getStart(sf) }, tags);
        } else {
          for (const t of h.types) if (t.typeArguments) {
            ins(node.getStart(sf), `/** @extends {${typeText(t, sf).text}} */\n${indentAt(sf, node.getStart(sf))}`);
            delAngles(t.typeArguments);
          }
        }
      }
      if (node.typeParameters) {
        addTags({ ...node, jsDoc: node.jsDoc, getStart: () => node.getStart(sf) }, templateTags(node.typeParameters, sf));
        delAngles(node.typeParameters);
      }
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword)) flag(node, 'abstract class — convert by hand');
    }

    // expr as T / as const / <T>expr / satisfies T
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) {
      const isConst = ts.isTypeReferenceNode(node.type) && node.type.typeName.getText(sf) === 'const';
      const tt = typeText(node.type, sf);
      const tag0 = ts.isSatisfiesExpression(node) ? `@satisfies {${tt.text}}` : `@type {${isConst ? 'const' : tt.text}}`;
      const prose = tt.comments.flatMap(commentProse);
      const tag = prose.length ? `\n * ${prose.join('\n * ')}\n * ${tag0}\n` : tag0;
      if (ts.isTypeAssertionExpression(node)) {
        rep(node.getStart(sf), node.expression.getStart(sf), `/** ${tag} */ (`);
        ins(node.expression.end, ')');
      } else {
        flagIfOpensParens(node.expression, node);
        ins(node.expression.getStart(sf), `/** ${tag} */ (`);
        rep(node.expression.end, node.end, ')');
      }
    }

    // expr!
    if (ts.isNonNullExpression(node)) {
      const e = node.expression;
      let cast = null;
      const named = nameableType(checker.getNonNullableType(checker.getTypeAtLocation(e)), node);
      const shaped = typeExprOf(e, sf);
      // Prefer the SHAPE (`NonNullable<ReturnType<typeof f>>` …): it is right by
      // construction. A checker-printed name is the fallback, and only after
      // `nameableType` found every name in scope — even then a name can resolve
      // to a different type here (the app's `TransitionEvent` vs the DOM's).
      // A single named type that verifiably means the same type here beats the
      // shape (which cannot see through generic methods such as `flatMap`).
      const exact = sameSymbolName(checker.getNonNullableType(checker.getTypeAtLocation(e)), node);
      cast = exact ?? (shaped ? `NonNullable<${shaped}>` : named);
      if (cast) {
        flagIfOpensParens(e, node);
        ins(e.getStart(sf), `/** @type {${cast}} */ (`);
        rep(e.end, node.end, ')');
      } else {
        rep(e.end, node.end, '/* TODO(ts-to-js): non-null */');
        flag(node, `non-null \`${e.getText(sf).slice(0, 40)}!\` — type not nameable, add a cast by hand`);
      }
    }

    // generic calls and `new X<T>()`
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && node.typeArguments?.length) {
      const args = node.typeArguments.map((t) => typeText(t, sf).text);
      const gt = delAngles(node.typeArguments);
      const callee = ts.isNewExpression(node) ? node.expression.getText(sf) : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : node.expression.getText(sf);
      const arg0 = node.arguments?.[0];
      const argProse = node.typeArguments.flatMap((t) => typeText(t, sf).comments.flatMap(commentProse));
      const castTag = (t) => (argProse.length ? `/**\n * ${argProse.join('\n * ')}\n * @type {${t}}\n */ (` : `/** @type {${t}} */ (`);
      const castArg = (t) => {
        if (arg0) {
          ins(arg0.getStart(sf), castTag(t));
          ins(arg0.end, ')');
        } else {
          // `useState<T>()` → useState(/** @type {T | undefined} */ (undefined))
          const open = src.indexOf('(', gt);
          ins(open + 1, `/** @type {${t} | undefined} */ (undefined)`);
        }
      };
      const castResult = (t) => {
        ins(node.getStart(sf), castTag(t));
        ins(node.end, ')');
      };
      if (ts.isNewExpression(node)) castResult(`${callee}<${args.join(', ')}>`);
      else if (callee === 'useState') {
        // A lazy initializer (`useState<T>(() => …)`) is a function returning T.
        const lazy = arg0 && (ts.isArrowFunction(arg0) || ts.isFunctionExpression(arg0));
        castArg(lazy ? `() => ${args[0]}` : args[0]);
      }
      else if (callee === 'useRef' || callee === 'createContext') {
        const lit = arg0?.kind === ts.SyntaxKind.NullKeyword ? ' | null' : '';
        castArg(`${args[0]}${lit}`);
      } else if (callee === 'useMemo' || callee === 'useCallback') castResult(args[0]);
      else if (callee === 'reduce' && node.arguments.length > 1) {
        const init = node.arguments[1];
        ins(init.getStart(sf), `/** @type {${args[0]}} */ (`);
        ins(init.end, ')');
      } else if (callee === 'querySelector' || callee === 'closest') castResult(`${args[0]} | null`);
      else if (callee === 'querySelectorAll') castResult(`NodeListOf<${args[0]}>`);
      // `Object.freeze<T>(v)` is overloaded (`T extends Function` first), so an
      // instantiation cast picks the wrong overload: cast the argument instead.
      else if (callee === 'freeze') castArg(args[0]);
      else if (['toEqual', 'toBe', 'fn', 'mocked'].includes(callee)) {
        /* type arguments that only narrow a test helper: dropping them is safe */
      } else if (isEntityChain(node.expression)) {
        // Any other generic call: cast the CALLEE to its instantiation,
        // `/** @type {typeof f<A, B>} *\/ (f)(…)`. Unlike casting the result,
        // this keeps the arguments contextually typed (a `mutationFn`'s
        // parameter, a type guard's narrowing). `(a.b)(…)` keeps `this` = a.
        const calleeText = node.expression.getText(sf);
        ins(node.expression.getStart(sf), castTag(`typeof ${calleeText}<${args.join(', ')}>`));
        ins(node.expression.end, ')');
      } else {
        const t = nameableType(checker.getTypeAtLocation(node), node);
        if (t) castResult(t);
        else if (callee === 'importOriginal' && /^typeof import\(/.test(args[0])) castResult(`Promise<${args[0]}>`);
        else flag(node, `generic call \`${callee}<${args.join(', ')}>\` — callee is not a simple name and the result type is not nameable; add a cast by hand`);
      }
    }

    // <Comp<T> …/> — JavaScript has no JSX type arguments; inference takes over
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.typeArguments) {
      delAngles(node.typeArguments);
    }

    ts.forEachChild(node, visit);
  };

  /** Drop TS-only modifiers, turning the meaningful ones into tags. */
  function dropModifiers(node, tags) {
    for (const m of node.modifiers ?? []) {
      const map = {
        [ts.SyntaxKind.PrivateKeyword]: '@private',
        [ts.SyntaxKind.ProtectedKeyword]: '@protected',
        [ts.SyntaxKind.PublicKeyword]: null,
        [ts.SyntaxKind.ReadonlyKeyword]: '@readonly',
        [ts.SyntaxKind.OverrideKeyword]: '@override',
        [ts.SyntaxKind.AbstractKeyword]: 'abstract',
        [ts.SyntaxKind.DeclareKeyword]: 'declare',
      };
      if (!(m.kind in map)) continue;
      const tag = map[m.kind];
      if (tag === 'abstract' || tag === 'declare') {
        flag(node, `\`${tag}\` member — convert by hand`);
        continue;
      }
      if (tag) tags.push(tag);
      const after = src.slice(m.end).match(/^\s*/)[0].length;
      del(m.getStart(sf), m.end + after);
    }
  }

  ts.forEachChild(sf, visit);

  // Apply edits back to front. Edits never overlap except zero-width inserts at
  // the same position, which keep their insertion order.
  edits.forEach((e, i) => (e.i = i));
  edits.sort((a, b) => b.start - a.start || b.end - a.end || b.i - a.i);
  let out = src;
  let lastStart = Infinity;
  for (const e of edits) {
    if (e.end > lastStart) {
      flags.push(`internal: overlapping edits near offset ${e.start} — check this spot`);
      continue;
    }
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
    if (e.start !== e.end) lastStart = e.start;
  }
  // A JavaScript file with no import/export is a SCRIPT, and its typedefs
  // cannot be imported. A file left holding only typedefs stays a module.
  const outSf = ts.createSourceFile('x.js', out, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
  if (!outSf.statements.some((st) => ts.isImportDeclaration(st) || ts.isExportDeclaration(st) || ts.isExportAssignment(st) || st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))) {
    out += `${out.endsWith('\n') ? '' : '\n'}\n// Types only: \`export {}\` keeps this a module so its typedefs can be imported.\nexport {};\n`;
  }
  return { text: out, flags };
}

// ── Run ─────────────────────────────────────────────────────────────────────
let totalFlags = 0;
for (const file of inputs) {
  const sf = program.getSourceFile(file);
  if (!sf) {
    console.error(`not in the program (tsconfig.vitest.json): ${file}`);
    process.exitCode = 1;
    continue;
  }
  const { text, flags } = convert(sf);
  const target = file.replace(/\.tsx$/, '.jsx').replace(/\.ts$/, '.js');
  const rel = (p) => p.slice(ROOT.length + 1);
  if (!DRY_RUN) {
    execFileSync('git', ['mv', rel(file), rel(target)], { cwd: ROOT });
    writeFileSync(target, text);
  }
  totalFlags += flags.length;
  if (flags.length) console.log(`${rel(target)}\n${flags.map((f) => `  ${f}`).join('\n')}`);
}
console.log(`ts-to-js: ${inputs.length} file(s) ${DRY_RUN ? 'checked (dry run)' : 'converted'}, ${totalFlags} spot(s) flagged for a person.`);
