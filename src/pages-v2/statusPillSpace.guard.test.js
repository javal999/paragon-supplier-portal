// ────────────────────────────────────────────────────────────────────────────
// BL-83 — A STATUS PILL MUST NOT HOLD A SPACE BETWEEN TWO OF ITS OWN CHILDREN.
//
// `StatusPill` renders `inline-flex`. In a flex container a text run that is
// ONLY whitespace is not rendered, so `{t('rfx.dueSoon')} <Data>{date}</Data>`
// read "Segera ditutup02 Sep 2026" (and "Closing soon02 Sep 2026" in English).
// The fix is one inline wrapper — `<span>{label} <Data>…</Data></span>` — so the
// space sits inside ordinary inline text again.
//
// The backlog named two sites; deriving the population found a third
// (`BuyerForecasts`' "Viewed" pill). That is why this is a scan of the tree and
// not a test of the two named pills.
//
// ⚠️ PROBED BOTH WAYS: a clean scan is only worth anything if the same matcher
// fires on the known-bad shape and passes the known-good one, and if it read
// the files it claims to have read.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isJsxFile } from '@test/sourceFiles';

const SRC = join(process.cwd(), 'src');

/**
 * @param {string} dir
 * @param {string[]} [out]
 * @returns {string[]}
 */
function shippedTsx(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) shippedTsx(path, out);
    else if (isJsxFile(name) && !name.includes('.test.')) out.push(path);
  }
  return out;
}

const TAG = /(<[A-Za-z][^<>]*?\/>|<[A-Za-z][^<>]*>|<\/[A-Za-z][^<>]*>)/;

/**
 * The line of every `<StatusPill>` whose DIRECT children put a same-line space
 * between an expression or word and an element. A newline-only run is left
 * alone: JSX drops it before the browser sees it.
 * @param {string} source
 * @returns {number[]}
 */
export function pillsDroppingASpace(source) {
  /** @type {number[]} */
  const hits = [];
  for (const m of source.matchAll(/<StatusPill\b[^>]*>([\s\S]*?)<\/StatusPill>/g)) {
    let depth = 0;
    let direct = '';
    for (const token of /** @type {string} */ (m[1]).split(TAG)) {
      if (/^<[A-Za-z][^<>]*?\/>$/.test(token)) {
        if (depth === 0) direct += '<E/>';
      } else if (/^<[A-Za-z]/.test(token)) {
        if (depth === 0) direct += '<E>';
        depth += 1;
      } else if (token.startsWith('</')) {
        depth -= 1;
      } else if (depth === 0) {
        direct += token;
      }
    }
    if (/[}\w.)] +<E/.test(direct) || /<E\/?> +[{\w]/.test(direct)) {
      hits.push(source.slice(0, m.index).split('\n').length);
    }
  }
  return hits;
}

describe('BL-83 — no status pill drops the space between its label and its value', () => {
  it('the matcher fires on the shape that shipped, and passes the wrapped fix', () => {
    const bad = `<StatusPill variant="warning">
          {t('rfx.dueSoon')} <Data>{formatDate(deadline)}</Data>
        </StatusPill>`;
    const good = `<StatusPill variant="warning">
          <span>
            {t('rfx.dueSoon')} <Data>{formatDate(deadline)}</Data>
          </span>
        </StatusPill>`;
    const plain = `<StatusPill variant="neutral">{t('fc.pti.versions.notViewed')}</StatusPill>`;
    expect(pillsDroppingASpace(bad)).toEqual([1]);
    expect(pillsDroppingASpace(good)).toEqual([]);
    expect(pillsDroppingASpace(plain)).toEqual([]);
  });

  it('no shipped pill has the shape', () => {
    const files = shippedTsx(SRC);
    const withPills = files.filter((f) => readFileSync(f, 'utf8').includes('<StatusPill'));
    // Population control: the scan read the files the fix touched.
    const read = withPills.map((f) => relative(SRC, f).replace(/\\/g, '/'));
    expect(read).toContain('pages-v2/rfx/rfxDisplay.jsx');
    expect(read).toContain('pages-v2/BuyerForecasts.tsx');
    const offenders = withPills.flatMap((f) =>
      pillsDroppingASpace(readFileSync(f, 'utf8')).map(
        (line) => `${relative(SRC, f).replace(/\\/g, '/')}:${line}`
      )
    );
    expect(offenders).toEqual([]);
  });
});
