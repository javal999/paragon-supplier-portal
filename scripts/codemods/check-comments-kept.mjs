#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// Check: no comment was lost converting TypeScript → JavaScript (Phases 3–4)
// ════════════════════════════════════════════════════════════════════════════
//
// WHY THIS EXISTS
//   The comments in this codebase carry the reasoning (rule IDs, rulings, the
//   "why" behind a guard). The owner asked that the conversion keep them. The
//   pilot measured `ts-to-jsdoc` deleting more than half of the comment text in
//   `src/components/ui-v2` — every comment attached to an `interface` or `type`
//   goes with the declaration. So no converted file merges without this check.
//
// WHAT IT COMPARES
//   For each converted `.js/.jsx` file, the original is the same path with
//   `.ts/.tsx` at a git revision (default: `main`). Both files' comments are
//   reduced to a multiset of words (4+ letters). JSDoc tags and their `{type}`
//   are ignored, since they are new in the JS file; a tag's description is
//   counted, since a field's comment moves there. A word the
//   original has more often than the conversion is LOST, and the check fails.
//   Words may be ADDED freely (new JSDoc descriptions are welcome).
//
//   It is a word count, not a diff: a comment may move (a typedef's comment now
//   sits above the `@typedef`) or re-wrap (Prettier) and still pass.
//
// USAGE
//   node scripts/codemods/check-comments-kept.mjs [--base <rev>] <file.js|file.jsx>…
//   Exit 0 when nothing is lost; exit 1 with the lost words per file otherwise.
// ════════════════════════════════════════════════════════════════════════════

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const baseFlag = args.indexOf('--base');
const BASE = baseFlag === -1 ? 'main' : args[baseFlag + 1];
const files = args.filter((a, i) => /\.(js|jsx)$/.test(a) && i !== baseFlag + 1);
if (files.length === 0) {
  console.error('usage: node scripts/codemods/check-comments-kept.mjs [--base <rev>] <files…>');
  process.exit(1);
}

const COMMENT = /\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
// A JSDoc tag and its `{type}` are new in the JS file and not counted; the
// DESCRIPTION after them (`@property {string} id The select's id`) is counted,
// because that is where a converted field comment now lives.
const JSDOC_TAG = /@(param|returns?|typedef|property|prop|template|import|type|satisfies|callback)\b(\s*\{[^}\n]*\})?/g;

/** Multiset of comment words (4+ letters, case kept) in a source text. */
const commentWords = (src) => {
  const text = (src.match(COMMENT) ?? []).join('\n').replace(JSDOC_TAG, ' ');
  const counts = new Map();
  for (const w of text.match(/[A-Za-z]{4,}/g) ?? []) counts.set(w, (counts.get(w) ?? 0) + 1);
  return counts;
};

/** The original TypeScript text of a converted file, or null if it had none. */
const original = (file) => {
  const candidates = file.endsWith('.jsx') ? [file.replace(/\.jsx$/, '.tsx')] : [file.replace(/\.js$/, '.ts'), file.replace(/\.js$/, '.tsx')];
  for (const path of candidates) {
    try {
      return execFileSync('git', ['show', `${BASE}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      // not at this path in BASE — try the next candidate
    }
  }
  return null;
};

let failed = 0;
let checked = 0;
for (const file of files) {
  const before = original(file);
  if (before === null) continue; // a new file, nothing to keep
  checked += 1;
  const was = commentWords(before);
  const now = commentWords(readFileSync(file, 'utf8'));
  const lost = [];
  for (const [word, n] of was) {
    const missing = n - (now.get(word) ?? 0);
    if (missing > 0) lost.push(missing > 1 ? `${word}×${missing}` : word);
  }
  if (lost.length > 0) {
    failed += 1;
    console.log(`LOST in ${file} (${lost.length} word(s)): ${lost.slice(0, 40).join(' ')}${lost.length > 40 ? ' …' : ''}`);
  }
}
console.log(`check-comments-kept: ${checked} file(s) checked against ${BASE}, ${failed} lost comment text.`);
process.exit(failed > 0 ? 1 : 0);
