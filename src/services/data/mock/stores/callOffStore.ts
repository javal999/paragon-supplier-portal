// ────────────────────────────────────────────────────────────────────────────
// Mutable call-off store (REQ-E09-03). The hub is the record for call-offs.
//
// Same immutable-update contract as the other stores: commands swap in new
// objects, reads resolve from here, `reset()` restores the seed for tests.
// Numbers are store-assigned on creation.
// ────────────────────────────────────────────────────────────────────────────

import { CALL_OFF_SEED } from '../fixtures/callOffs';
// BL-64 — the delivery history behind the compliance gate's OTIF boundary.
import { GATE_DEMO_CALL_OFFS } from '../fixtures/gateDemo';
import type { CallOff } from '../../types';

const clone = (c: CallOff): CallOff => ({
  ...c,
  ...(c.confirmation
    ? { confirmation: { ...c.confirmation, deliveries: c.confirmation.deliveries.map((d) => ({ ...d })) } }
    : {}),
  dispatches: c.dispatches.map((d) => ({ ...d })),
  notes: c.notes.map((n) => ({ ...n })),
});

const SEED: readonly CallOff[] = [...CALL_OFF_SEED, ...GATE_DEMO_CALL_OFFS];

let rows: CallOff[] = SEED.map(clone);
let seq = SEED.length;

export const callOffStore = {
  all(): readonly CallOff[] {
    return rows;
  },
  get(id: string): CallOff | undefined {
    return rows.find((c) => c.id === id);
  },
  add(row: CallOff): void {
    rows = [...rows, row];
  },
  update(id: string, next: (c: CallOff) => CallOff): void {
    rows = rows.map((c) => (c.id === id ? next(c) : c));
  },
  /** Store-assigned id and number for a new call-off. */
  nextIdentity(): { id: string; callOffNumber: string } {
    seq += 1;
    const n = String(seq).padStart(4, '0');
    return { id: `co-${n}`, callOffNumber: `CO-2026-${n}` };
  },
  reset(): void {
    rows = SEED.map(clone);
    seq = SEED.length;
  },
};
