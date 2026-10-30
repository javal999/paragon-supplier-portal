// ────────────────────────────────────────────────────────────────────────────
// dispatcher/ — the single command validator/executor (v2.2 Step 3.4 + 3.5).
//
// This index re-exports what `dispatcher.js` exported before it became a
// folder, so every `./dispatcher` import resolves unchanged:
//   · `createDispatcher.js` — the factory: validation order, apply, emit, settle;
//   · `types.js`            — `CommandTarget`, the hook, cascade and settle types.
// ────────────────────────────────────────────────────────────────────────────

/** @typedef {import('./types').CommandTarget} CommandTarget */
/** @typedef {import('./types').PolicyDecision} PolicyDecision */
/** @typedef {import('./types').PolicyHookFn} PolicyHookFn */
/** @typedef {import('./types').CascadeCommand} CascadeCommand */
/** @typedef {import('./types').CascadeContext} CascadeContext */
/** @typedef {import('./types').SettleContext} SettleContext */
/** @typedef {import('./types').DispatcherDeps} DispatcherDeps */
/** @typedef {import('./types').Dispatcher} Dispatcher */

export { createDispatcher } from './createDispatcher';
