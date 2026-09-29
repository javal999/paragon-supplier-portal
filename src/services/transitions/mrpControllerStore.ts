// ────────────────────────────────────────────────────────────────────────────
// THE MRP CONTROLLER LIST — Material C4 (MR-5 BR-01 to BR-04; plan AR-19).
//
// SAP names, per material, the planner who handles it: the MRP controller
// (MARC-DISPO), a short code such as `P12`. The material master carries only
// the CODE (`MaterialMasterEntry.mrpController`, fixture data labelled by the
// `materialMasterSap` capability until the MDM feed runs). WHO a code is — the
// name a supplier can ask for and the hub users behind it — is hub-mastered:
// this list, changed only by the governed verbs `t_mrpcontroller_set` and
// `t_mrpcontroller_unmap` (BL-157: the administrator can undo a mapping).
//
// ── WHAT LIVES HERE (the `threePlStore` shape, followed) ─────────────────────
//   1. THE SAMPLE LIST. Illustrative desks for three of the four fixture codes,
//      every name marked "(sample)". `P13` is deliberately left unmapped, so the
//      unmapped path (the code only, MR-5 BR-02) is visible in the demo.
//   2. THE ADMINISTRATOR'S CHANGES, appended over the sample list. Nothing is
//      edited; the latest change per code wins (MAT-R3).
//   3. THE ONE RULE for a mapping (`mrpControllerRefusal`), called by the
//      verb's policy hook and by the admin page's pre-check (MAT-R2).
//   4. THE ONE RESOLVER (`mrpControllerRef`) that turns a material's code into
//      what a reader may see: PTI sees the code and the name; a supplier sees
//      the NAME ONLY (MR-5 BR-04). The read model calls it, never a page.
//   5. THE ONE FILTER (`picFilterMatches`) every list's "PIC" filter uses,
//      including "My materials" for a seat with a chosen code.
//
// ── ⚠️ THE USER LABELS ARE LABELS, NOT PERSONS ───────────────────────────────
// The portal holds no persons (the actor is `UNATTRIBUTED`). A mapping names
// the hub users behind a code as typed labels — data, never an identity — so
// "My materials" works from the code a seat chooses, not from a login.
// ────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';

/** One MRP controller on the administrator's list (MR-5 BR-02). */
export interface MrpController {
  /** The SAP MRP controller code (MARC-DISPO), e.g. `P12`. What a material carries. */
  readonly code: string;
  /** Who the code is, as a supplier may read it, e.g. "Packaging planning desk". */
  readonly name: string;
  /** The hub users behind the code, as labels. One or more (MR-5 BR-02). */
  readonly userLabels: readonly string[];
}

/**
 * An administrator's change to one controller, as recorded. Never edited.
 * BL-157 — an unmapping is a change too, appended like any other: `unmapped`
 * is true, the name is empty and there are no user labels. From then on the
 * code reads as unmapped (the code only, MR-5 BR-02) until it is mapped again.
 */
export interface MrpControllerChange extends MrpController {
  readonly unmapped?: true;
  readonly setBy: ActorAttribution;
  /** Store-assigned from the hub clock, never a payload field. */
  readonly setAt: string;
}

/**
 * The shape of an MRP controller code: SAP's MARC-DISPO is at most 3
 * characters. Upper-case letters and digits only, so `p12` is not a second
 * spelling of `P12`. Also what makes a code addressable by the verb.
 */
export const MRP_CONTROLLER_CODE = /^[A-Z0-9]{1,3}$/;

/** THE SAMPLE LIST. `P13` (fragrance) is left unmapped on purpose. */
export const SAMPLE_MRP_CONTROLLERS: readonly MrpController[] = Object.freeze([
  {
    code: 'P10',
    name: 'Base raw material planning desk (sample)',
    userLabels: ['Material Planner, base raw material (sample)'],
  },
  {
    code: 'P11',
    name: 'Actives and extracts planning desk (sample)',
    userLabels: ['Material Planner, actives and extracts (sample)'],
  },
  {
    code: 'P12',
    name: 'Packaging planning desk (sample)',
    userLabels: ['Material Planner, packaging (sample)', 'Packaging buyer (sample)'],
  },
]);

// ── 1 · THE RULE ─────────────────────────────────────────────────────────────

/** The user labels as recorded: trimmed, blanks dropped, duplicates removed. */
export function userLabelsOf(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    const s = v.trim();
    if (s !== '' && !out.includes(s)) out.push(s);
  }
  return out;
}

/**
 * Why `t_mrpcontroller_set` would be refused, or null.
 * `MRP_CONTROLLER_CODE_INVALID` — not 1 to 3 upper-case letters or digits.
 * `MRP_CONTROLLER_NAME_REQUIRED` — no name of at least 2 characters.
 * `MRP_CONTROLLER_USERS_REQUIRED` — no hub user label (MR-5 BR-02: one or more).
 */
export function mrpControllerRefusal(code: unknown, name: unknown, userLabels: unknown): string | null {
  if (typeof code !== 'string' || !MRP_CONTROLLER_CODE.test(code)) {
    return `MRP_CONTROLLER_CODE_INVALID: an MRP controller code is 1 to 3 upper-case letters or digits, got ${JSON.stringify(code)}`;
  }
  if (typeof name !== 'string' || name.trim().length < 2) {
    return `MRP_CONTROLLER_NAME_REQUIRED: MRP controller ${code} needs a name a supplier can ask for`;
  }
  if (userLabelsOf(userLabels).length === 0) {
    return `MRP_CONTROLLER_USERS_REQUIRED: MRP controller ${code} must be mapped to at least one hub user`;
  }
  return null;
}

/**
 * BL-157 — why `t_mrpcontroller_unmap` would be refused, or null.
 * `MRP_CONTROLLER_CODE_INVALID` — not 1 to 3 upper-case letters or digits.
 * `MRP_CONTROLLER_NOT_MAPPED` — the code has no mapping in force to undo.
 */
export function mrpControllerUnmapRefusal(
  code: unknown,
  list: readonly MrpController[] = mrpControllerStore.all(),
): string | null {
  if (typeof code !== 'string' || !MRP_CONTROLLER_CODE.test(code)) {
    return `MRP_CONTROLLER_CODE_INVALID: an MRP controller code is 1 to 3 upper-case letters or digits, got ${JSON.stringify(code)}`;
  }
  if (!list.some((r) => r.code === code)) {
    return `MRP_CONTROLLER_NOT_MAPPED: MRP controller ${code} has no mapping to remove`;
  }
  return null;
}

// ── 2 · THE STORE ────────────────────────────────────────────────────────────

let changes: MrpControllerChange[] = [];
let version = 0;
const listeners = new Set<() => void>();

function changed(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export const mrpControllerStore = {
  /** The list in force: the sample list with the administrator's changes applied, by code. */
  all(): readonly MrpController[] {
    const byCode = new Map<string, MrpController>(SAMPLE_MRP_CONTROLLERS.map((r) => [r.code, r]));
    for (const c of changes) {
      // BL-157 — the latest change wins: an unmapping takes the code off the list.
      if (c.unmapped) byCode.delete(c.code);
      else byCode.set(c.code, { code: c.code, name: c.name, userLabels: c.userLabels });
    }
    return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  },
  get(code: string): MrpController | undefined {
    return mrpControllerStore.all().find((r) => r.code === code);
  },
  /** Every change the administrator made, oldest first. */
  changes(): readonly MrpControllerChange[] {
    return changes;
  },
  /** APPEND ONLY — called by the `mrpController` target (set and unmap) and nothing else. */
  append(change: MrpControllerChange): void {
    changes = [...changes, change];
    changed();
  },
  /** Back to the sample list — test isolation. */
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

/** Normalise a verified payload into a change record (the target calls this). */
export function mrpControllerChangeFrom(
  code: string,
  payload: Record<string, unknown>,
  setAt: string,
  setBy: ActorAttribution,
): MrpControllerChange | null {
  if (mrpControllerRefusal(code, payload.name, payload.userLabels)) return null;
  return {
    code,
    name: String(payload.name).trim(),
    userLabels: userLabelsOf(payload.userLabels),
    setBy,
    setAt,
  };
}

/** BL-157 — the change record an unmapping appends (the target calls this). */
export function mrpControllerUnmapFrom(code: string, setAt: string, setBy: ActorAttribution): MrpControllerChange | null {
  if (mrpControllerUnmapRefusal(code)) return null;
  return { code, name: '', userLabels: [], unmapped: true, setBy, setAt };
}

// ── 3 · THE RESOLVER ─────────────────────────────────────────────────────────

/** Who is reading: PTI sees the code, a supplier never does (MR-5 BR-04). */
export type MrpControllerAudience = 'buyer' | 'supplier';

/**
 * What a reader may see of a material's MRP controller (MR-5 BR-01, BR-02,
 * BR-04). PTI: `{ code, name? }` — an unmapped code shows the code only.
 * Supplier: `{ name }` — never the code; an unmapped code gives the supplier
 * nothing to show, so the result is undefined. Undefined, too, for a material
 * that carries no code.
 */
export function mrpControllerRef(
  code: string | undefined,
  audience: MrpControllerAudience,
  list: readonly MrpController[] = mrpControllerStore.all(),
): { readonly code?: string; readonly name?: string } | undefined {
  if (!code) return undefined;
  const name = list.find((r) => r.code === code)?.name;
  if (audience === 'supplier') return name ? { name } : undefined;
  return name ? { code, name } : { code };
}

// ── 4 · THE FILTER ───────────────────────────────────────────────────────────

/** The "My materials" filter value; every other non-empty value is a PIC key. */
export const PIC_FILTER_MINE = 'mine';

/**
 * The key a PIC filter option matches on: the code where the reader sees one
 * (PTI), the name otherwise (a supplier, which never sees a code).
 */
export const picKeyOf = (ref: { readonly code?: string; readonly name?: string } | undefined): string | undefined =>
  ref?.code ?? ref?.name;

/**
 * Does a row with this controller pass the PIC filter? `''` passes every row;
 * `mine` passes the rows of the seat's chosen code — and, with no code chosen,
 * none, so "My materials" never silently shows everything (MR-5 AC-02).
 */
export function picFilterMatches(
  ref: { readonly code?: string; readonly name?: string } | undefined,
  filter: string,
  myCode: string | null,
): boolean {
  if (filter === '') return true;
  if (filter === PIC_FILTER_MINE) return myCode !== null && ref?.code === myCode;
  return picKeyOf(ref) === filter;
}
