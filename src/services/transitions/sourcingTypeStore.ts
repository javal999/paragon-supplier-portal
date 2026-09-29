// ────────────────────────────────────────────────────────────────────────────
// THE SOURCING TYPE MAP — Material G2 (MR-10 BR-06; plan AR-17; MAT-D13).
//
// Each sourcing category and purchasing group → Direct or Indirect, as
// Procurement sets it. Seeded with `DEFAULT_SOURCING_TYPE_MAP` (all Direct).
//
// APPEND ONLY (MAT-R3): every change is a new row and the latest row per key is
// in force, so the store is its own history. Written by the
// `t_sourcingtype_set` target and nothing else. An event's type is stored on
// the event at publish, so a later change here never moves a published event.
// ────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';
import {
  DEFAULT_SOURCING_TYPE_MAP,
  type SourcingType,
  type SourcingTypeKey,
  type SourcingTypeMap,
} from '../sourcing/sourcingType';

/** One change of one key, as recorded. Never edited. */
export interface SourcingTypeChange {
  readonly key: SourcingTypeKey;
  readonly sourcingType: SourcingType;
  /** Store-assigned from the hub clock, never a payload field. */
  readonly setAt: string;
  /** From the session, never from the form. */
  readonly setBy: ActorAttribution;
}

let changes: SourcingTypeChange[] = [];
let version = 0;
const listeners = new Set<() => void>();

function changed(): void {
  version += 1;
  listeners.forEach((l) => l());
}

let cached: { version: number; map: SourcingTypeMap } | null = null;

export const sourcingTypeStore = {
  /** The map in force: the seed with the latest change per key applied. */
  map(): SourcingTypeMap {
    if (cached?.version !== version) {
      const next: Record<string, SourcingType> = { ...DEFAULT_SOURCING_TYPE_MAP };
      for (const c of changes) next[c.key] = c.sourcingType;
      cached = { version, map: Object.freeze(next) };
    }
    return cached.map;
  },
  get(key: SourcingTypeKey): SourcingType | undefined {
    return this.map()[key];
  },
  /** Every change on record, oldest first. */
  changes(): readonly SourcingTypeChange[] {
    return changes;
  },
  /** APPEND ONLY — called by the `t_sourcingtype_set` target and nothing else. */
  append(change: SourcingTypeChange): void {
    changes = [...changes, change];
    changed();
  },
  /** Back to the seed — test isolation. */
  reset(): void {
    changes = [];
    changed();
  },
  version(): number {
    return version;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
