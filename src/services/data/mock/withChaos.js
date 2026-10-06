// ────────────────────────────────────────────────────────────────────────────
// withChaos — dev-only decorator that wraps an IDataService to inject latency
// (jitter range) and probabilistic failures, WITHOUT changing any method
// signature. Every method is already async, so we await a jittered delay and
// maybe throw DataError('CHAOS') before delegating to the real method.
//
// GATED: only wired in when import.meta.env.DEV && VITE_CHAOS === 'on'
// (see main.jsx). import.meta.env.DEV is statically false in the Vercel
// production build, so this module is dead code there and tree-shaken out.
// Tests get determinism by default (flag unset) and can opt in explicitly by
// passing a chaos-wrapped service to renderWithProviders.
// ────────────────────────────────────────────────────────────────────────────

/** @import { IDataService } from '../types' */
import { DataError } from '../types';

/**
 * 0..1
 *
 * @typedef {object} ChaosConfig
 * @property {number} minMs
 * @property {number} maxMs
 * @property {number} failureRate
 */

// Braces, not an expression body: an executor's return value is discarded, so
// returning the timer id would only look meaningful (ESLint no-promise-executor-return).
/** @param {number} ms */
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * @param {number} min
 * @param {number} max
 */
const jitter = (min, max) => min + Math.random() * Math.max(0, max - min);

// Wrap every method of a sub-service. `this` binds to the original target so
// internal delegations (e.g. getPurchaseOrder -> getPurchaseOrders) are not
// double-delayed or double-failed — chaos applies at the top call boundary only.
/**
 * @template {object} T
 * @param {T} target
 * @param {ChaosConfig} cfg
 * @returns {T}
 */
function chaosProxy(target, cfg) {
  return new Proxy(target, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);
      if (typeof value !== 'function') return value;
      const method = /** @type {(...args: unknown[]) => unknown} */ (value);
      return /** @param {...unknown} args */ async (...args) => {
        await sleep(jitter(cfg.minMs, cfg.maxMs));
        if (Math.random() < cfg.failureRate)
          throw new DataError('CHAOS', `Injected chaos failure on ${String(prop)}()`);
        return method.apply(obj, args);
      };
    }
  });
}

/**
 * @param {IDataService} inner
 * @param {ChaosConfig} cfg
 * @returns {IDataService}
 */
export function withChaos(inner, cfg) {
  return {
    suppliers: chaosProxy(inner.suppliers, cfg),
    procurement: chaosProxy(inner.procurement, cfg),
    risk: chaosProxy(inner.risk, cfg),
    discovery: chaosProxy(inner.discovery, cfg),
    analytics: chaosProxy(inner.analytics, cfg),
    collaboration: chaosProxy(inner.collaboration, cfg),
    delivery: chaosProxy(inner.delivery, cfg),
    chase: chaosProxy(inner.chase, cfg),
    enforcement: chaosProxy(inner.enforcement, cfg),
    // Files: only `put` is async, so only `put` takes chaos. `chaosProxy` would
    // turn the synchronous lookups (and the access log) into Promises and break their callers.
    files: {
      put: async (file) => {
        await sleep(jitter(cfg.minMs, cfg.maxMs));
        if (Math.random() < cfg.failureRate)
          throw new DataError('CHAOS', 'Injected chaos failure on put()');
        return inner.files.put(file);
      },
      urlFor: (id) => inner.files.urlFor(id),
      release: (id) => inner.files.release(id),
      isHeld: (id) => inner.files.isHeld(id),
      recordAccess: (fileId, by) => inner.files.recordAccess(fileId, by),
      accessLog: (fileId) => inner.files.accessLog(fileId)
    },
    // Commands go through chaos too (reads-only chaos → commands too, Step 3.5).
    commands: chaosProxy(inner.commands, cfg),
    getCapabilities: (scope) => inner.getCapabilities(scope)
  };
}

/** @returns {ChaosConfig} */
export function chaosConfigFromEnv() {
  /**
   * @param {unknown} v
   * @param {number} fallback
   */
  const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    minMs: num(import.meta.env.VITE_CHAOS_MIN_MS, 200),
    maxMs: num(import.meta.env.VITE_CHAOS_MAX_MS, 900),
    failureRate: num(import.meta.env.VITE_CHAOS_FAILURE_RATE, 0.15)
  };
}
