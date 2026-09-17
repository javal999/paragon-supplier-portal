import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// The PTI hub role — which menu sections a PTI user sees (REQUIREMENTS §3.7).
//
// This is a VIEW preference, not an authorisation. What a seat may DO is still
// decided by its business roles in the identity panel; this only decides which
// sections of the menu and which Home tasks a Material Planner, Buyer or Finance
// user is shown. `all` exists for demos, so one seat can walk every section.
// ─────────────────────────────────────────────────────────────────────────────

export type HubRole = 'MP' | 'BUY' | 'FIN' | 'ALL';

export const HUB_ROLES: readonly HubRole[] = ['MP', 'BUY', 'FIN', 'ALL'];

export const HUB_ROLE_KEY = 'paragon.hubRole';
const DEFAULT_ROLE: HubRole = 'ALL';

const listeners = new Set<() => void>();

function readStored(): HubRole {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(HUB_ROLE_KEY) : null;
    return (HUB_ROLES as readonly string[]).includes(raw ?? '') ? (raw as HubRole) : DEFAULT_ROLE;
  } catch {
    return DEFAULT_ROLE;
  }
}

let current: HubRole = readStored();

export function getHubRole(): HubRole {
  return current;
}

export function setHubRole(role: HubRole): void {
  current = role;
  try {
    window.localStorage?.setItem(HUB_ROLE_KEY, role);
  } catch {
    // Storage unavailable (private mode, tests): the choice lasts for the session.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHubRole(): [HubRole, (role: HubRole) => void] {
  const role = useSyncExternalStore(subscribe, getHubRole, getHubRole);
  return [role, setHubRole];
}
