import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// The PTI hub role — which menu sections a PTI user sees (REQUIREMENTS §3.7).
//
// This is a VIEW preference, not an authorisation. What a seat may DO is still
// decided by its business roles in the identity panel; this only decides which
// sections of the menu and which Home tasks a Material Planner, Buyer or Finance
// user is shown. `all` exists for demos, so one seat can walk every section.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'MP' | 'BUY' | 'FIN' | 'ALL'} HubRole */

/** @type {readonly HubRole[]} */
export const HUB_ROLES = ['MP', 'BUY', 'FIN', 'ALL'];

export const HUB_ROLE_KEY = 'paragon.hubRole';
/** @type {HubRole} */
const DEFAULT_ROLE = 'ALL';

const listeners = /** @type {Set<() => void>} */ (new Set());

/** @returns {HubRole} */
function readStored() {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(HUB_ROLE_KEY) : null;
    return /** @type {readonly string[]} */ (HUB_ROLES).includes(raw ?? '')
      ? /** @type {HubRole} */ (raw)
      : DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}

/** @type {HubRole} */
let current = readStored();

/** @returns {HubRole} */
export function getHubRole() {
  return current;
}

/**
 * @param {HubRole} role
 * @returns {void}
 */
export function setHubRole(role) {
  current = role;
  try {
    window.localStorage?.setItem(HUB_ROLE_KEY, role);
  } catch {
    // Storage unavailable (private mode, tests): the choice lasts for the session.
  }
  listeners.forEach((l) => l());
}

/**
 * @param {() => void} listener
 * @returns {() => void}
 */
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @returns {[HubRole, (role: HubRole) => void]} */
export function useHubRole() {
  const role = useSyncExternalStore(subscribe, getHubRole, getHubRole);
  return [role, setHubRole];
}
