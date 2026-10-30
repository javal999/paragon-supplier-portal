// ────────────────────────────────────────────────────────────────────────────
// policies/bindings.js — the NAME → function table and its two accessors.
//
// Every other file in this folder calls `bindPolicyHook` at load; the
// dispatcher calls `resolvePolicyHook`. Kept alone so the table exists before
// any group file binds into it, and so no group file imports another.
// ────────────────────────────────────────────────────────────────────────────

/** @import { PolicyHookFn } from '../dispatcher' */

const BINDINGS = /** @type {Map<string, PolicyHookFn>} */ (new Map());

/**
 * @param {string} name
 * @param {PolicyHookFn} fn
 * @returns {void}
 */
export function bindPolicyHook(name, fn) {
  BINDINGS.set(name, fn);
}

/**
 * @param {string} name
 * @returns {PolicyHookFn | undefined}
 */
export function resolvePolicyHook(name) {
  return BINDINGS.get(name);
}
