// ────────────────────────────────────────────────────────────────────────────
// CUSTOM ROLES — DUPLICATE-AND-NARROW, AS A PARENT REFERENCE (D1).
//
// A custom role is a COPY of one system role plus additions. It is stored as
// **`{ parent, adds }`, never as a snapshot of atoms**, and the difference is
// the whole ruling:
//
//   > A SNAPSHOT SILENTLY KEEPS YESTERDAY'S TRUTH.
//
// The instance is live in this tree — the invoice surface hardcoded a
// terminality the flow declared while the machine moved underneath it. A
// snapshot of `SYSTEM_ROLES.procurement` is that defect with a store: add
// `rfq:split` to `procurement` next quarter and every custom copy silently
// fails to gain it, which is the SILENT DROP the additive-only ruling exists to
// forbid, arriving by the other door. A parent reference gains it in the same
// commit, with no edit here and none on the page.
//
// It also inherits the gate. `businessRoles.test.js` asserts BOTH directions of
// (bundle atoms ⊆ catalog) and (catalog ⊆ bundles ∪ automation), and both
// iterate `SYSTEM_ROLES`. A snapshot stored out here would be **outside that
// population** — free to hold a retired atom forever, invisible to the one gate
// built for exactly this question. A parent reference is checked by that gate
// every run, because it resolves through `SYSTEM_ROLES` at read.
//
// ── ⚠️ THE EXCEPTION, AND IT IS THE SAME SHAPE ONE LAYER DOWN (D1) ──────────
// **IF A PARENT ATOM IS EVER REMOVED, THE CHILD MUST NOT SILENTLY LOSE IT.**
// So the grant records `parentAtomsAtGrant` — a baseline that is NEVER the
// resolution source — and anything the parent has since dropped is RETAINED and
// NAMED (`retainedFromParent`). The child keeps what it was granted; the fact
// that the parent no longer carries it becomes a stated difference rather than
// a quiet subtraction. Exactly the additive rule, applied to the parent's own
// movement instead of to the child's.
//
// ⚠️ **THE RETAINED SET IS UNREACHABLE TODAY AND HAS NO SURFACE, DELIBERATELY.**
// `LANE_BUNDLES` is a frozen module constant, so a parent cannot lose an atom
// WITHIN a session. It CAN now lose one ACROSS a deploy, because a grant
// outlives the browser session — which is exactly the case `parentAtomsAtGrant`
// was recorded for, and the reason it was recorded before it could ever fire. Building a notice for it would invent
// a surface for a fact that cannot occur, which is the class this project
// spends its time removing. The RULE is built and pinned by tests; the notice
// becomes owed the day a grant outlives a deploy.
//
// ── ⚠️ IT SURVIVES A RELOAD, AND THE RULING THAT SAID OTHERWISE IS SUPERSEDED
// A custom role PERSISTS via `localStorage`. The session-scoped ruling this file
// originally carried was reversed by the operator, on the demo's grounds rather
// than the architecture's: *a reviewer will create a role, refresh, and see it
// gone — and that reads as broken even when the page said it would happen.* An
// honest statement does not repair an experience that looks like a defect.
//
// The precedent is the operator's own reference platform, which states the same
// thing on the page: role changes persist via browser storage; backend
// integration ships post-handover. What the page must therefore say is not
// *"this vanishes"* but WHERE it lives — local to this browser, not shared with
// anybody, not a backend. See `roles.page.readOnlyBody`.
//
// The attribution problem does NOT go away and is not pretended away: a grant is
// still recorded against `UNATTRIBUTED: NO_PERSON_IN_SESSION`, and the surface
// still says so at the point of creation. Durability and accountability are
// separate questions, and only one of them has been answered.
//
// The store's own guarantees live beside the store, below.
// ────────────────────────────────────────────────────────────────────────────

/** @import { TransitionRole } from './schema' */
/** @import { ActorAttribution } from '@lib/enforcement' */
import { asActorAttribution } from '@lib/enforcement';
import { getKnownFlows } from './registry';
/** @import { BusinessRoleId, SystemRoleId } from './businessRoles' */
import {
  SYSTEM_ROLES,
  PERSONA_SYSTEM_ROLES,
  AUTOMATION_ROLE,
  atomsFor,
  isSystemRole
} from './businessRoles';

/** The side a role sits on. `admin` is the ONE role that spans; see below. */
/** @typedef {'buyer' | 'supplier'} RoleSide */

/**
 * A granted custom role. `parent` + `adds` is the definition; everything else
 * is provenance the store assigns.
 *
 * ⚠️ **`parentAtomsAtGrant` AND `grantedAt` ARE STORE-ASSIGNED, NEVER PAYLOAD
 * FIELDS** — the `pinnedAt` / `setAt` discipline. A caller that could set
 * `grantedAt` could backdate its own audit entry; a caller that could set the
 * baseline could fake the drift check into silence, which is the one thing the
 * baseline exists to prevent.
 */
/**
 * `displayName`:  User text. NOT an i18n key and NOT translated — see `roleModel.js`.
 * `adds`:  Atoms added on top of the parent. Always a widening (additive-only).
 * `parentAtomsAtGrant`:  The parent's atoms at the moment of the grant. The DRIFT BASELINE ONLY.
 *
 * @typedef {{
 *   readonly id: BusinessRoleId;
 *   readonly parent: SystemRoleId;
 *   readonly displayName: string;
 *   readonly description: string;
 *   readonly adds: readonly TransitionRole[];
 *   readonly parentAtomsAtGrant: readonly TransitionRole[];
 *   readonly grantedBy: ActorAttribution;
 *   readonly grantedAt: string;
 * }} CustomRoleDefinition
 */

// ── THE STORE — PERSISTED, AND VALIDATED ON THE WAY BACK IN ─────────────────
//
// ⚠️ **A CUSTOM ROLE SURVIVES A RELOAD (operator ruling, superseding the
// session-scoped one).** The reason is the demo's rather than the
// architecture's: *a reviewer will create a role, refresh, and see it gone — and
// that reads as broken even when the page said it would happen.* An honest
// statement does not repair an experience that looks like a defect.
//
// **THIS IS NOT A SECOND SOURCE OF TRUTH, BECAUSE THERE IS NO FIRST ONE.** No
// backend holds a role and `SYSTEM_ROLES` is a frozen constant. The seeded roles
// are NEVER written here and never read from here — only custom ones persist, so
// there is nothing for a stored row to disagree with.
//
// ── THE FOUR THINGS THAT MUST BE TRUE, AND WHERE EACH ONE LIVES ─────────────
//
// 1. **SYSTEM ROLES ARE NEVER WRITTEN.** The store only ever holds custom
//    definitions, and a stored row claiming a system id is REFUSED BY NAME on
//    read (`grantableIdRefusal`). A write that could shadow `finance` is the
//    shape being refused, and it is refused at the point it would take effect
//    rather than at the point it was written — a file somebody edits by hand is
//    exactly the caller this guard is for.
//
// 2. **THE READ FAILS HONESTLY.** Absent, corrupt or unparseable storage yields
//    NO custom roles. It does not throw, and — the half that matters — it does
//    not return a silent empty success that hides a parse failure.
//    `EMPTY-INPUT-REPORTS-CLEAN-01` has repeated instances in this project and a
//    storage read is precisely its shape: *"zero custom roles"* and *"the store
//    is unreadable"* are different facts, so `readState()` reports which.
//
// 3. **THE TENANCY GATE STILL LIVES AT THE VERB.** Persistence changes where a
//    role is kept, not who may grant one. Every row is re-validated on read
//    through the SAME predicates `role_grant_governed` calls — literally the
//    same functions, not a second copy — so a row that `t_role_grant` would have
//    refused is refused here too, with the same words, and named rather than
//    dropped quietly. Hand-editing the JSON is not a way around the tenancy rule.
//
// 4. **AN UNSEEDED REGISTRY MUST NOT READ AS A CORRUPT STORE.** Validation needs
//    the atom catalog, which is empty until the shipped flows self-register.
//    Validating against an empty catalog would refuse EVERY row and look exactly
//    like corruption — a mass rejection produced by the instrument rather than by
//    the data. So an empty catalog SUSPENDS hydration instead of failing it, and
//    says so.
//
// Hydration is LAZY — on first read, never at module load — for reason 4: at
// import time the registry may not be seeded yet, and a store that hydrates
// before the catalog exists is the empty-input bug with a different name.

/** The one key. Namespaced beside `paragon.identity`, and deliberately NOT in it:
 *  the seat key holds a PREFERENCE; a role definition is a governed record. */
export const CUSTOM_ROLES_KEY = 'paragon.customRoles';

/** Storage envelope. Versioned so a future shape change is a migration, not a
 *  silent misread of an older one. */
const STORE_VERSION = 1;

/**
 * Why a persisted row was refused, or why the whole store could not be read.
 * A surface renders these; nothing swallows them.
 */
/**
 * `roles`:  The rows that validated and are in force.
 * `rejected`:  Rows refused on read, each with the refusal's own words.
 * `unreadable`:  The store exists but could not be parsed — DISTINCT from "no store".
 * `suspended`:  The catalog was empty, so validation was suspended (reason 4 above).
 *
 * @typedef {{
 *   readonly roles: readonly CustomRoleDefinition[];
 *   readonly rejected: readonly { readonly id: string; readonly reason: string }[];
 *   readonly unreadable: boolean;
 *   readonly suspended: boolean;
 * }} CustomRoleReadState
 */

/** @type {CustomRoleReadState} */
const EMPTY_READ = Object.freeze({
  roles: Object.freeze([]),
  rejected: Object.freeze([]),
  unreadable: false,
  suspended: false
});

/** @type {CustomRoleDefinition[]} */
let rows = [];
/** @type {CustomRoleReadState} */
let readState = EMPTY_READ;
let hydrated = false;

/** The atoms any registered transition requires. Local, to avoid importing
 * @returns {readonly string[]}
 *  `./roles` (which imports this module) — the cycle, not a preference. */
function catalogAtoms() {
  const atoms = /** @type {Set<string>} */ (new Set());
  for (const flow of getKnownFlows()) {
    for (const t of flow.transitions) atoms.add(t.requiredRole);
  }
  return [...atoms];
}

/**
 * Is this the shape a definition has? Structural only — the RULES are below.
 * @param {unknown} v
 * @returns {v is CustomRoleDefinition}
 */
function isDefinitionShaped(v) {
  if (!v || typeof v !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (v);
  return (
    typeof o.id === 'string' &&
    typeof o.parent === 'string' &&
    typeof o.displayName === 'string' &&
    typeof o.description === 'string' &&
    Array.isArray(o.adds) &&
    o.adds.every((a) => typeof a === 'string') &&
    Array.isArray(o.parentAtomsAtGrant) &&
    o.parentAtomsAtGrant.every((a) => typeof a === 'string') &&
    typeof o.grantedAt === 'string'
  );
  // `grantedBy` is DELIBERATELY not shape-checked here. Checking it would refuse
  // the row as "not a role definition" — true, but named by POSITION, because a
  // row rejected at this stage has no id anybody trusts yet. Letting it through
  // to `asActorAttribution` gets the same refusal with the role's own name on it
  // and the actual reason, which is what somebody fixing the store needs.
}

/**
 * Read + validate the store. Never throws; reports which failure it hit.
 * @returns {CustomRoleReadState}
 */
function readFromStorage() {
  /** @type {string | null} */
  let raw = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return EMPTY_READ;
    raw = window.localStorage.getItem(CUSTOM_ROLES_KEY);
  } catch {
    // Private browsing / disabled storage. Nothing stored is a legitimate
    // answer; an inaccessible store is not a corrupt one.
    return EMPTY_READ;
  }
  if (raw === null) return EMPTY_READ;

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY_READ, unreadable: true };
  }
  const env = /** @type {{ v?: unknown; roles?: unknown } | null} */ (parsed);
  if (!env || typeof env !== 'object' || env.v !== STORE_VERSION || !Array.isArray(env.roles)) {
    return { ...EMPTY_READ, unreadable: true };
  }

  const catalog = catalogAtoms();
  if (catalog.length === 0) {
    // Reason 4. Refusing every row here would be the instrument reporting on
    // itself, and it would look identical to a corrupt store.
    return { ...EMPTY_READ, suspended: true };
  }

  /** @type {CustomRoleDefinition[]} */
  const kept = [];
  /** @type {{ id: string; reason: string }[]} */
  const rejected = [];
  const seen = /** @type {Set<string>} */ (new Set());
  for (const [i, row] of /** @type {readonly unknown[]} */ (env.roles).entries()) {
    if (!isDefinitionShaped(row)) {
      rejected.push({ id: `row ${i}`, reason: 'not a role definition' });
      continue;
    }
    const actor = asActorAttribution(/** @type {{ grantedBy: unknown }} */ (row).grantedBy);
    if (!actor) {
      rejected.push({ id: row.id, reason: 'grantedBy is not a recorded attribution' });
      continue;
    }
    const refusal = refusalFor(row, catalog, seen);
    if (refusal) {
      rejected.push({ id: row.id, reason: refusal });
      continue;
    }
    seen.add(row.id);
    kept.push({ ...row, grantedBy: actor });
  }
  return { roles: kept, rejected, unreadable: false, suspended: false };
}

/** @returns {void} */
function hydrate() {
  if (hydrated) return;
  readState = readFromStorage();
  // A SUSPENDED read is not a completed one — do not latch it, or a store read
  // before the flows registered would look empty for the rest of the session.
  if (readState.suspended) {
    rows = [];
    return;
  }
  hydrated = true;
  rows = [...readState.roles];
}

/** @returns {void} */
function persist() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      CUSTOM_ROLES_KEY,
      JSON.stringify({ v: STORE_VERSION, roles: rows })
    );
  } catch {
    // Quota / private browsing. The in-session grant still stands; what is lost
    // is durability, and losing it silently is better than refusing an act the
    // dispatcher already accepted and recorded in the audit trail.
  }
}

export const customRoleStore = {
  /**
   * Every granted role, oldest first.
   * @returns {readonly CustomRoleDefinition[]}
   */
  all() {
    hydrate();
    return rows;
  },
  /**
   * One granted role, or undefined.
   * @param {string} id
   * @returns {CustomRoleDefinition | undefined}
   */
  byId(id) {
    hydrate();
    return rows.find((r) => r.id === id);
  },
  /**
   * What the last read of the store found — including what it REFUSED and
   * whether it could be parsed at all. A surface reads this so a rejection is
   * stated rather than absorbed.
   * @returns {CustomRoleReadState}
   */
  readState() {
    hydrate();
    return readState;
  },
  /** APPEND ONLY — there is no update path, so there is none to guard. A new
   * @param {CustomRoleDefinition} def
   * @returns {void}
   *  array reference so a memoised read genuinely recomputes. */
  append(def) {
    hydrate();
    rows = [...rows, def];
    persist();
  },
  /** Forget everything, in memory AND on disk — test isolation, and the one
   * @returns {void}
   *  honest way to undo a grant on an append-only ledger with no revoke verb. */
  reset() {
    rows = [];
    readState = EMPTY_READ;
    hydrated = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(CUSTOM_ROLES_KEY);
      }
    } catch {
      // nothing to do; the in-memory state is already clear
    }
  },
  /**
   * Drop the in-memory copy WITHOUT touching storage — what a reload does.
   * @returns {void}
   */
  rehydrate() {
    rows = [];
    readState = EMPTY_READ;
    hydrated = false;
    hydrate();
  }
};

// ── TENANCY ─────────────────────────────────────────────────────────────────

/**
 * The side a SYSTEM role sits on, or `null` for `admin`.
 *
 * ⚠️ **`admin` RETURNS `null` BECAUSE IT IS NOT ON A SIDE**, and that is the
 * reason it cannot be a parent. A copy of `admin` would span both tenancies by
 * construction — see `assertCopyableParent`.
 * @param {SystemRoleId} id
 * @returns {RoleSide | null}
 */
export function sideOfSystemRole(id) {
  if (/** @type {readonly string[]} */ (PERSONA_SYSTEM_ROLES.buyer).includes(id)) return 'buyer';
  if (/** @type {readonly string[]} */ (PERSONA_SYSTEM_ROLES.supplier).includes(id))
    return 'supplier';
  return null;
}

/**
 * Every atom any assignable role on `side` can hold. The tenancy boundary.
 * @param {RoleSide} side
 * @returns {readonly TransitionRole[]}
 */
export function atomsOfSide(side) {
  return atomsFor(PERSONA_SYSTEM_ROLES[side]);
}

// ── RESOLUTION ──────────────────────────────────────────────────────────────

/**
 * What the parent held at grant time and no longer holds — RETAINED by the
 * child, and named (D1's exception). Empty in every reachable state today; see
 * the header.
 * @param {CustomRoleDefinition} def
 * @returns {readonly TransitionRole[]}
 */
export function retainedFromParent(def) {
  const live = /** @type {Set<string>} */ (new Set(SYSTEM_ROLES[def.parent]));
  return def.parentAtomsAtGrant.filter((a) => !live.has(a));
}

/**
 * THE MERGE RULE, AND IT IS THE UNION (D4): the parent's atoms AS THEY ARE NOW,
 * plus the additions, plus anything the parent has dropped since the grant.
 * Deduped, and it can only ever be a superset of the parent.
 * @param {CustomRoleDefinition} def
 * @returns {readonly TransitionRole[]}
 */
export function atomsOfCustomRole(def) {
  return [...new Set([...SYSTEM_ROLES[def.parent], ...def.adds, ...retainedFromParent(def)])];
}

/**
 * ⚠️ **THE ATOMS A SEAT HOLDS — AND THIS, NOT `atomsFor`, IS WHAT A SEAT
 * RESOLVES THROUGH.**
 *
 * `atomsFor` knows the SYSTEM vocabulary (the seeded bundles plus the automation
 * grant) and, by its own contract, contributes NOTHING for an id it does not
 * recognise. That silence is correct for the tenancy questions `PERSONA_ROLES`
 * asks and catastrophic for a seat: a session holding a custom role would
 * resolve to ZERO atoms and be refused `ROLE_NOT_PERMITTED` on every act, with
 * nothing to say why.
 *
 * So every SEAT resolution goes through here — the dispatcher's `resolveRoles`,
 * `capabilitiesFor`, and the cross-role handoff. `businessRoles.test.js` pins
 * that there are no others.
 * @param {readonly BusinessRoleId[]} roles
 * @returns {readonly TransitionRole[]}
 */
export function atomsForSeat(roles) {
  const atoms = /** @type {Set<TransitionRole>} */ (new Set(atomsFor(roles)));
  for (const r of roles) {
    const custom = customRoleStore.byId(r);
    if (custom) for (const a of atomsOfCustomRole(custom)) atoms.add(a);
  }
  return [...atoms];
}

// ── THE GRANT'S PRECONDITIONS, AS PREDICATES ────────────────────────────────
//
// These are read by the policy hook (`policies.js`), which is where a refusal
// gets its wording. They live here so the RULE and the STORE cannot drift, and
// so a test can probe each one without going through a dispatch.

/** A custom role id: lowercase slug, and distinguishable from a system one. */
export const CUSTOM_ROLE_ID = /^[a-z0-9][a-z0-9-]{1,47}$/;

/**
 * Display text a custom role may carry: 2–80 characters, no leading or trailing
 * space.
 *
 * ⚠️ **IT DOES NOT FORBID `:` OR `.`, AND THAT IS A MEASUREMENT RATHER THAN
 * AN OVERSIGHT.** `roleModel.js` passes a custom role's display name through
 * `t()` as its own key, so i18next's missing-key fallback renders it verbatim —
 * which is the honest answer for user text nobody has translated. The obvious
 * fear is that i18next reads `:` as a namespace separator and `.` as a key
 * separator and would TRUNCATE such a name. **Probed against this app's own
 * i18n instance before the rule was written: `t('Night: Jakarta')` and
 * `t('The dock, after hours.')` both come back whole**, because neither prefix
 * names a loaded namespace. Banning both characters would have made a
 * description unable to end in a full stop, to prevent a truncation that does
 * not happen.
 *
 * The ONE prefix that genuinely resolves is this app's only loaded namespace,
 * and it is refused by name below rather than by banning a character class.
 */
export const CUSTOM_ROLE_TEXT = /^\S(?:.{0,78}\S)?$/;

/** The only namespace prefix i18next would actually resolve here. */
export const I18N_NAMESPACE_PREFIX = /^translation:/i;

/**
 * Why a parent cannot be copied, or `null` if it can.
 * @param {string} parent
 * @returns {string | null}
 */
export function copyableParentRefusal(parent) {
  if (!isSystemRole(parent)) {
    return `'${parent}' is not a system role (${Object.keys(SYSTEM_ROLES).join(', ')})`;
  }
  if (sideOfSystemRole(parent) === null) {
    // The `admin` arm, and it is the tenancy ruling at the verb.
    return (
      `'${parent}' spans both tenancies and cannot be copied — a custom role ` +
      'may not span tenancies, and a copy of it would by construction'
    );
  }
  return null;
}

/**
 * Why an atom may not be added to a child of `parent`, or `null` if it may.
 *
 * ⚠️ **THE TENANCY ARM IS THE ONE THAT MATTERS AND IT REFUSES BY NAME.** The
 * buyer and supplier atom sets are DISJOINT and have been since the beginning —
 * `businessRoles.test.js` pins it, and the retired persona grant never crossed
 * it either. Nothing in a FORM can be trusted to keep it that way: a surface can
 * prevent the gesture, only the verb can prevent the act.
 * @param {SystemRoleId} parent
 * @param {string} atom
 * @param {readonly string[]} catalog
 * @returns {string | null}
 */
export function addableAtomRefusal(parent, atom, catalog) {
  if (!catalog.includes(atom)) {
    return `'${atom}' is not a permission any registered transition requires`;
  }
  const side = sideOfSystemRole(parent);
  if (side === null) return `'${parent}' is not on a side`;
  const assignable = /** @type {Set<string>} */ (
    new Set([...atomsOfSide('buyer'), ...atomsOfSide('supplier')])
  );
  if (!assignable.has(atom)) {
    // Machine-only: in the catalog, in `AUTOMATION_ATOMS`, in no bundle a person
    // can hold. A super admin cannot fire these either — a custom role must not
    // be the door that reintroduces them.
    return `'${atom}' has no human owner and is held only by the automation grant`;
  }
  if (!(/** @type {readonly string[]} */ (atomsOfSide(side)).includes(atom))) {
    /** @type {RoleSide} */
    const other = side === 'buyer' ? 'supplier' : 'buyer';
    return (
      `'${atom}' is a ${other}-side permission and '${parent}' is ${side}-side — ` +
      'a custom role may not span tenancies'
    );
  }
  return null;
}

/**
 * Why an id may not be granted, or `null` if it may.
 * @param {string} id
 * @returns {string | null}
 */
export function grantableIdRefusal(id) {
  if (!CUSTOM_ROLE_ID.test(id)) {
    return `'${id}' is not a role id (lowercase letters, digits and hyphens, 2–48 characters)`;
  }
  if (isSystemRole(id)) return `'${id}' is already a system role`;
  if (id === AUTOMATION_ROLE) return `'${id}' is the machine grant and is never assignable`;
  if (customRoleStore.byId(id)) return `'${id}' has already been granted`;
  return null;
}

// The store's replay check sits below the predicates it reuses, because it reads
// their `const` patterns (CUSTOM_ROLE_ID, CUSTOM_ROLE_TEXT, I18N_NAMESPACE_PREFIX).
/**
 * ⚠️ **THE SAME RULES THE VERB APPLIES, CALLED AS THE SAME FUNCTIONS.** Not a
 * re-implementation: `role_grant_governed` calls exactly these, so "a row
 * `role:grant` would have accepted" is a statement this code can actually make.
 * A second copy of the tenancy rule would be a second vocabulary that agrees
 * until the day it does not.
 * @param {CustomRoleDefinition} def
 * @param {readonly string[]} catalog
 * @param {ReadonlySet<string>} seenIds
 * @returns {string | null}
 */
function refusalFor(def, catalog, seenIds) {
  if (seenIds.has(def.id)) return `'${def.id}' appears twice in the store`;
  if (isSystemRole(def.id)) return `'${def.id}' is already a system role`;
  if (def.id === AUTOMATION_ROLE) {
    return `'${def.id}' is the machine grant and is never assignable`;
  }
  if (!CUSTOM_ROLE_ID.test(def.id)) {
    return `'${def.id}' is not a role id (lowercase letters, digits and hyphens, 2–48 characters)`;
  }
  const parent = copyableParentRefusal(def.parent);
  if (parent) return parent;
  for (const field of /** @type {const} */ (['displayName', 'description'])) {
    const value = def[field];
    if (!CUSTOM_ROLE_TEXT.test(value.trim())) {
      return `${field} must be 2-80 characters of text`;
    }
    if (I18N_NAMESPACE_PREFIX.test(value.trim())) {
      return `${field} may not begin with a translation namespace`;
    }
  }
  for (const atom of def.adds) {
    const refusal = addableAtomRefusal(/** @type {SystemRoleId} */ (def.parent), atom, catalog);
    if (refusal) return refusal;
  }
  return null;
}
