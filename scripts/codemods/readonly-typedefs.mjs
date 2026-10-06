#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// Codemod: restore `readonly` in typedefs converted before 2026-10-05
// (frontend-standard plan, Phase 4 — one-off migration for batches B1–B5)
// ════════════════════════════════════════════════════════════════════════════
//
// WHY
//   Until 2026-10-05 `ts-to-js.mjs` wrote a plain `interface` as
//   `@typedef {object} X` + `@property` tags. JSDoc `@property` cannot express
//   `readonly`, so every interface with readonly members lost them (code that
//   writes such a field was no longer flagged). The owner ruled: keep readonly
//   everywhere. `ts-to-js.mjs` now writes such an interface as a type-literal
//   typedef (`@typedef {{ readonly a: T }} X`, member comments as labelled
//   prose). This script brings files converted EARLIER to the same form.
//
// WHAT IT CHANGES — and only this
//   For each given .js/.jsx file, the original TypeScript is read from git
//   (`--base`, default `main`). Every `interface` there that has a `readonly`
//   member and no `extends` clause (interfaces with `extends` were already
//   written as type literals, readonly kept) is rebuilt in the new form, and
//   the JSDoc block in the .js file that holds `@typedef {object} <Name>` is
//   replaced by it. Nothing else in the file is touched, so hand edits made
//   after conversion survive.
//
// USAGE
//   node scripts/codemods/readonly-typedefs.mjs [--base <rev>] <file.js|file.jsx>…
//   Then: npx prettier --write …, check-comments-kept.mjs, tsc.
// ════════════════════════════════════════════════════════════════════════════

import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const bi = args.indexOf('--base');
const BASE = bi === -1 ? 'main' : args[bi + 1];
const files = args.filter((a, i) => /\.(js|jsx)$/.test(a) && i !== bi + 1);

/** The TypeScript original of a converted file at BASE, or null. */
function original(file) {
  for (const p of file.endsWith('.jsx') ? [file.replace(/\.jsx$/, '.tsx')] : [file.replace(/\.js$/, '.ts'), file.replace(/\.js$/, '.tsx')]) {
    try {
      return { path: p, text: execFileSync('git', ['show', `${BASE}:${p}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) };
    } catch {
      /* not at this path */
    }
  }
  return null;
}

// ── The same text helpers ts-to-js.mjs uses (kept in step by hand) ──────────
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
const commentProse = (c) =>
  c.startsWith('//')
    ? [c.replace(/^\/\/\s?/, '')]
    : c
        .replace(/^\/\*\*?/, '')
        .replace(/\*\/$/, '')
        .split('\n')
        .map((l) => l.replace(/^\s*\*\s?/, '').replace(/\s+$/, ''))
        .filter((l, i, a) => !(l === '' && (i === 0 || i === a.length - 1)));
const leadingComments = (node, sf) => (ts.getLeadingCommentRanges(sf.text, node.getFullStart()) ?? []).map((r) => sf.text.slice(r.pos, r.end));
function typeText(node, sf) {
  const { code, comments } = stripComments(sf.text.slice(node.getFullStart(), node.end));
  return { text: code.replace(/\s+/g, ' ').trim(), comments };
}
const templateTags = (tps, sf) =>
  (tps ?? []).map((tp) => {
    const c = tp.constraint ? `{${typeText(tp.constraint, sf).text}} ` : '';
    const name = tp.default ? `[${tp.name.text}=${typeText(tp.default, sf).text}]` : tp.name.text;
    return `@template ${c}${name}`;
  });

/** The new typedef block (lines, without comment delimiters) for an interface. */
function typedefLines(node, sf) {
  const prose = [];
  const memberComments = new Set(node.members.flatMap((m) => leadingComments(m, sf)));
  const typeInner = new Set(node.members.flatMap((m) => (ts.isPropertySignature(m) && m.type ? typeText(m.type, sf).comments : [])));
  for (const c of stripComments(sf.text.slice(node.members.pos, node.end)).comments) {
    if (!memberComments.has(c) && !typeInner.has(c)) prose.push(...commentProse(c));
  }
  const literal = [];
  for (const m of node.members) {
    const desc = leadingComments(m, sf).flatMap(commentProse);
    const name = m.name ? m.name.getText(sf) : '';
    const opt = m.questionToken ? '?' : '';
    let t;
    if (ts.isPropertySignature(m)) t = m.type ? typeText(m.type, sf) : { text: 'any', comments: [] };
    else if (ts.isMethodSignature(m)) {
      const tp = m.typeParameters ? `<${m.typeParameters.map((p) => p.getText(sf)).join(', ')}>` : '';
      const ps = m.parameters.map((p) => stripComments(p.getText(sf)).code.replace(/\s+/g, ' ').trim()).join(', ');
      t = { text: `${tp}(${ps}) => ${m.type ? typeText(m.type, sf).text : 'void'}`, comments: [] };
    } else t = { text: stripComments(m.getText(sf)).code.replace(/\s+/g, ' ').replace(/;$/, '').trim(), comments: [] };
    const inner = t.comments.flatMap(commentProse);
    if (desc.length || inner.length) prose.push(`\`${name || 'signature'}\`: ${[...desc, ...inner].join(' ')}`);
    const ro = ts.isPropertySignature(m) && m.modifiers?.some((x) => x.kind === ts.SyntaxKind.ReadonlyKeyword) ? 'readonly ' : '';
    literal.push(ts.isPropertySignature(m) || ts.isMethodSignature(m) ? `${ro}${name}${opt}: ${t.text};` : `${t.text};`);
  }
  const body = literal.length ? ['@typedef {{', ...literal.map((l) => `  ${l}`), `}} ${node.name.text}`] : [`@typedef {{}} ${node.name.text}`];
  return [...prose, ...(prose.length ? [''] : []), ...templateTags(node.typeParameters, sf), ...body];
}

let changedFiles = 0;
let changedTypedefs = 0;
const missing = [];
for (const file of files) {
  const orig = original(file);
  if (!orig) continue;
  const sf = ts.createSourceFile(orig.path, orig.text, ts.ScriptTarget.Latest, true, orig.path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const targets = [];
  const visit = (n) => {
    if (
      ts.isInterfaceDeclaration(n) &&
      !n.heritageClauses?.length &&
      n.members.some((m) => m.modifiers?.some((x) => x.kind === ts.SyntaxKind.ReadonlyKeyword))
    ) {
      targets.push(n);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!targets.length) continue;
  let js = readFileSync(file, 'utf8');
  const before = js;
  for (const iface of targets) {
    const name = iface.name.text;
    // The block holding `@typedef {object} Name` (Prettier never edits comment bodies).
    const re = new RegExp(`(^[ \\t]*)/\\*\\*(?:(?!\\*/)[\\s\\S])*?@typedef \\{object\\} ${name}\\b(?:(?!\\*/)[\\s\\S])*?\\*/`, 'm');
    const m = re.exec(js);
    if (!m) {
      missing.push(`${file}: ${name}`);
      continue;
    }
    const indent = m[1];
    const lines = typedefLines(iface, sf);
    const block = `${indent}/**\n${lines.map((l) => `${indent} *${l ? ` ${l}` : ''}`).join('\n')}\n${indent} */`;
    js = js.slice(0, m.index) + block + js.slice(m.index + m[0].length);
    changedTypedefs += 1;
  }
  if (js !== before) {
    writeFileSync(file, js);
    changedFiles += 1;
  }
}
for (const m of missing) console.log(`  not found (already literal form?): ${m}`);
console.log(`readonly-typedefs: ${changedTypedefs} typedef(s) rewritten in ${changedFiles} file(s) against ${BASE}.`);
