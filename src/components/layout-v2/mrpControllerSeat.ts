import { useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// The seat's own MRP controller code — Material C4 (MR-5 BR-03, AC-02).
//
// "My materials" needs to know which planner the seat is. The portal holds no
// persons (the actor is `UNATTRIBUTED`), so the planner chooses their SAP MRP
// controller code here, in the identity panel. Like the hub role, this is a
// VIEW preference, not an authorisation: it decides which rows "My materials"
// shows and nothing else. Kept in the browser, like the hub role.
// ─────────────────────────────────────────────────────────────────────────────

export const MY_MRP_CONTROLLER_KEY = 'paragon.myMrpController';

const listeners = new Set<() => void>();

function readStored(): string | null {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(MY_MRP_CONTROLLER_KEY) : null;
    return raw && raw.trim() !== '' ? raw : null;
  } catch {
    return null;
  }
}

let current: string | null = readStored();

export function getMyMrpController(): string | null {
  return current;
}

/** Choose the seat's controller code, or null for none. */
export function setMyMrpController(code: string | null): void {
  current = code;
  try {
    if (code === null) window.localStorage?.removeItem(MY_MRP_CONTROLLER_KEY);
    else window.localStorage?.setItem(MY_MRP_CONTROLLER_KEY, code);
  } catch {
    // Storage unavailable (private mode, tests): the choice lasts for the session.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMyMrpController(): [string | null, (code: string | null) => void] {
  const code = useSyncExternalStore(subscribe, getMyMrpController, getMyMrpController);
  return [code, setMyMrpController];
}
