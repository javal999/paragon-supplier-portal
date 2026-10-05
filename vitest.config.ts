import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { ALIASES } from './aliases';

// Separate from vite.config.ts on purpose: the app's vite root is 'app/'
// (index.html there loads ../src/main.tsx), but source and tests live at the
// repo root under src/. This config leaves `root` at its default (repo root)
// so `src/**` resolves for the test run.
export default defineConfig({
  plugins: [react()],
  // Same aliases as the app build (aliases.ts); vitest.drift.config.ts inherits them.
  resolve: { alias: ALIASES },
  // __DEPLOY_ENV__ is injected by vite `define` in the real build; define it here
  // too so components that read it don't hit a ReferenceError under test. Empty
  // string → the badge's hostname fallback path (ENV-BADGE-01).
  define: {
    __DEPLOY_ENV__: JSON.stringify(''),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // `.js/.jsx` are collected too, so specs keep running as the portal is
    // converted from TypeScript to JavaScript (frontend-standard plan, Phases
    // 3–4). Without them a converted spec would silently stop being collected.
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // ⚠️ `*.live.test.ts` READS THE REAL WALL CLOCK AND IS EXCLUDED ON PURPOSE.
    // It is run by `npm run drift` and by CI on the SCHEDULE trigger only. In
    // the default run — gate 3, and therefore every PR — it would go red on a
    // CALENDAR DAY with nobody touching a file, and its remedy is an operator
    // ruling on `MANDATE_LEAD_DAYS` that no PR author can take. Excluded rather
    // than skipped because `npm run gates` refuses a suite carrying skips.
    //
    // `configDefaults.exclude` is spread rather than replaced: writing a bare
    // array here would drop node_modules and dist from the exclusions and the
    // suite would start collecting other people's tests.
    //
    // The glob would silently swallow any FUTURE live spec, which is a suite
    // that shrinks without the floor noticing. `clockDrift.live.test.js` pins
    // the excluded set bilaterally, derived from disk, so a second one is red.
    exclude: [...configDefaults.exclude, 'src/**/*.live.test.{js,jsx,ts,tsx}'],
    css: false,
  },
});
