import { fileURLToPath } from 'node:url';
import { defineConfig, normalizePath } from 'vite';
import react from '@vitejs/plugin-react';
import { ALIASES } from './aliases';

// ── VITE-DEV-ENTRY-01: the dev server could not load the entry ──────────────
// The Vite root is `app/`, and `app/index.html` loads `../src/main.jsx`, which
// sits ABOVE the root. `vite build` resolves that path on disk and is fine. The
// dev server cannot: it serves URLs, and `../src/main.jsx` from `/index.html`
// normalises to `/src/main.jsx`, which it looks for at `app/src/main.jsx`. The
// browser got a 404 and `npm run dev` showed a blank page.
//
// This plugin runs only under `vite` (dev, `apply: 'serve'`). It rewrites the
// entry to the dev server's absolute-path form, `/@fs/<repo>/src/main.jsx`,
// which Vite serves because `src/` is inside the workspace root. `vite build`
// and `vite preview` never run it, so the shipped bundle is unchanged.
//
// It THROWS when the entry it expects is missing, so a change to
// `app/index.html` fails loudly instead of bringing the blank page back.
export const DEV_ENTRY_SRC = '../src/main.jsx';
const DEV_ENTRY_FILE = normalizePath(fileURLToPath(new URL('./src/main.jsx', import.meta.url)));

/** @returns {import('vite').Plugin} */
export function devEntryAboveRoot() {
  return {
    name: 'paragon:dev-entry-above-root',
    apply: 'serve',
    // 'pre', so Vite's own HTML pass sees the rewritten entry and pre-transforms
    // it; after that pass it has already tried, and failed, to load the old one.
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const attr = `src="${DEV_ENTRY_SRC}"`;
        if (!html.includes(attr)) {
          throw new Error(
            `[paragon:dev-entry-above-root] app/index.html no longer loads ${DEV_ENTRY_SRC}. ` +
              'Update DEV_ENTRY_SRC in vite.config.js to the new entry (VITE-DEV-ENTRY-01).'
          );
        }
        return html.replace(attr, `src="/@fs/${DEV_ENTRY_FILE.replace(/^\//, '')}"`);
      }
    }
  };
}

export default defineConfig(() => ({
  root: 'app',
  // Root base for all targets. Vercel serves at the domain root (with the
  // vercel.json SPA rewrite); the former '/paragon-supplier-portal/' branch was
  // a GitHub Pages relic (VITE-BASE-01) that broke local `vite preview` and
  // served no purpose once Pages is retired.
  base: '/',
  publicDir: '../public',
  // Expose Vercel's build-time VERCEL_ENV ('production' | 'preview' |
  // 'development') to the client as __DEPLOY_ENV__ — the deploy-path-independent
  // signal the env badge keys off (ENV-BADGE-01). Empty off-Vercel, where the
  // badge falls back to the hostname allowlist.
  define: {
    __DEPLOY_ENV__: JSON.stringify(process.env.VERCEL_ENV ?? '')
  },
  plugins: [react(), devEntryAboveRoot()],
  // `@components/...`, `@services/...` etc. — the list and the rule live in aliases.js.
  resolve: {
    // Paradise stage 5b: lucide-react -> paradise/adapters/lucide-react.jsx. Remove this entry to undo.
    alias: [
      { find: /^lucide-react$/, replacement: fileURLToPath(new URL('./paradise/adapters/lucide-react.jsx', import.meta.url)) },
      ...Object.entries(ALIASES).map(([find, replacement]) => ({ find, replacement }))
    ]
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
}));
