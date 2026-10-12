// @vitest-environment node
// ────────────────────────────────────────────────────────────────────────────
// VITE-DEV-ENTRY-01: `npm run dev` served a blank page, because the entry
// `../src/main.jsx` sits above the Vite root `app/` and the dev server 404'd it.
// `devEntryAboveRoot` (vite.config.js) rewrites the entry for the dev server.
//
// These specs fire the plugin at the REAL `app/index.html`, the input that had
// the defect, and require the rewritten entry to name a file that exists. They
// also hold the two properties that keep the fix safe: it never runs for
// `vite build`, and it fails loudly when the entry it expects is gone.
// ────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import viteConfig, { DEV_ENTRY_SRC, devEntryAboveRoot } from '../../vite.config';

const ROOT = join(__dirname, '..', '..');
const INDEX_HTML = readFileSync(join(ROOT, 'app', 'index.html'), 'utf8');

/** @param {string} html */
function transform(html) {
  const hook = /** @type {{ order: string, handler: (html: string) => string }} */ (
    /** @type {unknown} */ (devEntryAboveRoot().transformIndexHtml)
  );
  return hook.handler(html);
}

/** @param {string} html @returns {string[]} */
function scriptSrcs(html) {
  return [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
}

describe('VITE-DEV-ENTRY-01 — the dev server can load the entry', () => {
  it('app/index.html still loads the entry the plugin rewrites', () => {
    expect(scriptSrcs(INDEX_HTML)).toEqual([DEV_ENTRY_SRC]);
  });

  it('rewrites the real entry to an /@fs path that names src/main.jsx on disk', () => {
    const [src] = scriptSrcs(transform(INDEX_HTML));
    expect(src.startsWith('/@fs/')).toBe(true);
    const file = src.slice('/@fs'.length);
    expect(file.endsWith('/src/main.jsx')).toBe(true);
    expect(existsSync(file) || existsSync(file.slice(1))).toBe(true);
  });

  it('changes nothing else in the page', () => {
    const out = transform(INDEX_HTML);
    const [src] = scriptSrcs(out);
    expect(out.replace(src, DEV_ENTRY_SRC)).toBe(INDEX_HTML);
  });

  it('runs before Vite’s own HTML pass, so Vite pre-transforms the new path', () => {
    expect(devEntryAboveRoot().transformIndexHtml).toMatchObject({ order: 'pre' });
  });

  it('runs for the dev server only, so `vite build` output is unchanged', () => {
    expect(devEntryAboveRoot().apply).toBe('serve');
  });

  it('is registered in the Vite config', () => {
    const config = /** @type {() => { plugins: Array<{ name?: string }> }} */ (
      /** @type {unknown} */ (viteConfig)
    )();
    const names = config.plugins.flat().map((p) => p?.name);
    expect(names).toContain('paragon:dev-entry-above-root');
  });

  it('throws, naming the defect, when the page no longer loads that entry', () => {
    const moved = INDEX_HTML.replace(DEV_ENTRY_SRC, '../src/index.jsx');
    expect(() => transform(moved)).toThrow(/VITE-DEV-ENTRY-01/);
  });
});
