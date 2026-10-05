// ────────────────────────────────────────────────────────────────────────────
// RFI AND RFP TEMPLATES — owner decision D2 (2026-09-21), REVERSING CE-04.
//
// A buyer may save an RFI or RFP as a template, and start a new event from one.
// The template holds the CONTENT of an event — questions, sections, terms,
// indicative-pricing options, the confidentiality and T&C settings — and never
// its invitees, dates or files: invitees and dates belong to one event, and a
// session-held file (BL-27) would be a dead reference after a reload.
//
// ── THE STORE FOLLOWS `customRoles.js`, AND THE REASONS TRAVEL WITH IT ──────
//
// 1. **PERSISTED in `localStorage`** under `paragon.rfiTemplates` and
//    `paragon.rfpTemplates` — one key per event type, so a corrupt RFP store
//    never takes the RFI templates down with it. Local to this browser, shared
//    with nobody, and the surface says so.
//
// 2. **THE READ FAILS HONESTLY.** Absent storage is "no templates"; storage that
//    will not parse, or an envelope of the wrong version, is `unreadable` — a
//    DIFFERENT fact, reported rather than absorbed into an empty list
//    (`EMPTY-INPUT-REPORTS-CLEAN-01`).
//
// 3. **EVERY ROW IS RE-VALIDATED ON READ THROUGH THE SAME PREDICATES THE VERB
//    CALLS** — `rfiQuestionsRefusal`, `rfpTermsRefusal`,
//    `rfpPricingRequestRefusal`, not a second copy. A row the create verb would
//    refuse is refused here too, BY NAME, with the verb's own words, and the
//    rest of the store still loads. Hand-editing the JSON is not a way round the
//    create rules.
//
// 4. **THE SYSTEM TEMPLATES ARE NEVER WRITTEN HERE.** Procurement's
//    category-family templates (`RFI_TEMPLATES`) stay in `rfxConfig` and are
//    offered beside these as read-only. A stored row claiming a system
//    template's id is refused on read.
//
// Hydration is LAZY (on first read) so a test that sets storage before the
// first read is read honestly, and `resetRfxTemplatesForTest` re-arms it.
// ────────────────────────────────────────────────────────────────────────────

/** @import { DocumentRequest, RfiQuestion, RfpPricingRequest, RfpTermRow, RfxCustomSection } from './types' */
import { RFI_TEMPLATES, rfxCategoryFamily } from './rfxConfig';
import {
  customSectionsRefusal,
  rfiQuestionsRefusal,
  rfpPricingRequestRefusal,
  rfpTermsRefusal
} from '../transitions/rfxRules';
import { documentRequestsRefusal } from '../transitions/rfxDocumentRules';
import { BID_CURRENCIES } from '@lib/currencyPolicy';

export const RFI_TEMPLATES_KEY = 'paragon.rfiTemplates';
export const RFP_TEMPLATES_KEY = 'paragon.rfpTemplates';

/** Envelope version. A future shape change is a migration, not a misread. */
const STORE_VERSION = 1;

/** What an RFI template carries: the content of an event, nothing about who or when. */
/**
 * @typedef {object} RfiTemplateContent
 * @property {string} familyId
 * @property {string} [description]
 * @property {readonly RfiQuestion[]} questions
 * @property {readonly RfxCustomSection[]} customSections
 * @property {boolean} confidential
 * @property {string} [confidentialityTerms]
 * @property {readonly DocumentRequest[]} [documentRequests] -  NR-1 BR-11 — the buyer's document requests. Never a supplier's documents.
 */

/** What an RFP template carries. */
/**
 * @typedef {object} RfpTemplateContent
 * @property {string} familyId
 * @property {string} scope
 * @property {string} currency
 * @property {readonly RfpTermRow[]} terms
 * @property {readonly RfiQuestion[]} questions
 * @property {readonly RfxCustomSection[]} customSections
 * @property {RfpPricingRequest} [pricing]
 * @property {boolean} confidential
 * @property {string} [confidentialityTerms]
 * @property {string} [termsText] -  The T&C text. A T&C FILE is session-held and is not kept in a template.
 * @property {readonly DocumentRequest[]} [documentRequests] -  NR-1 BR-11 — the buyer's document requests. Never a supplier's documents.
 */

/**
 * @template C
 * @typedef {object} SavedTemplate
 * @property {string} id
 * @property {string} name -  The buyer's own name for it. Not an i18n key.
 * @property {string} savedAt
 * @property {C} content
 */

/** @typedef {SavedTemplate<RfiTemplateContent>} RfiSavedTemplate */
/** @typedef {SavedTemplate<RfpTemplateContent>} RfpSavedTemplate */

/**
 * @template C
 * @typedef {object} TemplateReadState
 * @property {readonly SavedTemplate<C>[]} templates
 * @property {readonly { readonly id: string; readonly reason: string }[]} rejected -  Rows refused on read, each with the refusal's own words.
 * @property {boolean} unreadable -  The store exists and could not be read — DISTINCT from "no templates".
 */

/** @typedef {{ readonly ok: true; readonly id: string } | { readonly ok: false; readonly reason: string }} SaveResult */

const NAME_MIN = 2;
const NAME_MAX = 80;

// ── The content rules, shared by save and read ──────────────────────────────

/**
 * @param {unknown} name
 * @returns {string | null}
 */
function nameRefusal(name) {
  if (typeof name !== 'string') return 'TEMPLATE_NAME_REQUIRED: a template has a name';
  const n = name.trim();
  if (n.length < NAME_MIN || n.length > NAME_MAX) {
    return `TEMPLATE_NAME_LENGTH: a template name is ${NAME_MIN}-${NAME_MAX} characters`;
  }
  return null;
}

/**
 * @param {unknown} familyId
 * @returns {string | null}
 */
const familyRefusal = (familyId) =>
  typeof familyId === 'string' && rfxCategoryFamily(familyId)
    ? null
    : `UNKNOWN_FAMILY: ${String(familyId)} is not a category family`;

/**
 * @param {unknown} v
 * @returns {boolean}
 */
const optionalText = (v) => v === undefined || typeof v === 'string';

/**
 * @param {RfiTemplateContent} c
 * @returns {string | null}
 */
export function rfiTemplateContentRefusal(c) {
  if (!c || typeof c !== 'object') return 'TEMPLATE_MALFORMED: no content';
  const family = familyRefusal(c.familyId);
  if (family) return family;
  if (!rfxCategoryFamily(c.familyId)?.templateId) {
    return `UNKNOWN_FAMILY: ${c.familyId} carries no information-request template`;
  }
  if (!Array.isArray(c.questions) || c.questions.length === 0) {
    return 'NO_QUESTIONS: an RFI asks at least one question';
  }
  if (!Array.isArray(c.customSections)) return 'SECTIONS_MALFORMED: custom sections are a list';
  if (typeof c.confidential !== 'boolean') return 'TEMPLATE_MALFORMED: confidential is yes or no';
  if (!optionalText(c.description) || !optionalText(c.confidentialityTerms)) {
    return 'TEMPLATE_MALFORMED: descriptions are text';
  }
  if (c.documentRequests !== undefined) {
    const docs = documentRequestsRefusal(c.documentRequests);
    if (docs) return docs;
  }
  return rfiQuestionsRefusal(c.questions, c.customSections);
}

/**
 * @param {RfpTemplateContent} c
 * @returns {string | null}
 */
export function rfpTemplateContentRefusal(c) {
  if (!c || typeof c !== 'object') return 'TEMPLATE_MALFORMED: no content';
  const family = familyRefusal(c.familyId);
  if (family) return family;
  if (typeof c.scope !== 'string') return 'TEMPLATE_MALFORMED: the scope is text';
  if (!(/** @type {readonly string[]} */ (BID_CURRENCIES).includes(c.currency))) {
    return `UNKNOWN_CURRENCY: ${String(c.currency)}`;
  }
  if (!Array.isArray(c.terms)) return 'TEMPLATE_MALFORMED: terms are a list';
  const terms = rfpTermsRefusal(c.terms);
  if (terms) return terms;
  if (!Array.isArray(c.questions) || !Array.isArray(c.customSections)) {
    return 'TEMPLATE_MALFORMED: questions and sections are lists';
  }
  const questions = rfiQuestionsRefusal(c.questions, c.customSections);
  if (questions) return questions;
  const sections = customSectionsRefusal(c.customSections);
  if (sections) return sections;
  const pricing = rfpPricingRequestRefusal(c.pricing);
  if (pricing) return pricing;
  if (typeof c.confidential !== 'boolean') return 'TEMPLATE_MALFORMED: confidential is yes or no';
  if (!optionalText(c.confidentialityTerms) || !optionalText(c.termsText)) {
    return 'TEMPLATE_MALFORMED: terms texts are text';
  }
  if (c.documentRequests !== undefined) return documentRequestsRefusal(c.documentRequests);
  return null;
}

// ── One store per event type ────────────────────────────────────────────────

const SYSTEM_IDS = new Set(RFI_TEMPLATES.map((tpl) => tpl.id));

/**
 * @template C
 * @param {string} key
 * @param {(c: C) => string | null} contentRefusal
 * @param {string} idPrefix
 */
function makeStore(key, contentRefusal, idPrefix) {
  /** @type {SavedTemplate<C>[]} */
  let rows = [];
  /** @type {TemplateReadState<C>} */
  let state = { templates: [], rejected: [], unreadable: false };
  let hydrated = false;

  /** @returns {Storage | null} */
  const storage = () => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
    } catch {
      return null;
    }
  };

  /**
   * @param {unknown} row
   * @param {ReadonlySet<string>} seen
   * @returns {{ id: string; reason: string } | null}
   */
  function rowRefusal(row, seen) {
    if (!row || typeof row !== 'object') return { id: '?', reason: 'not a template' };
    const r = /** @type {Partial<SavedTemplate<C>>} */ (row);
    const id = typeof r.id === 'string' ? r.id : '?';
    if (typeof r.id !== 'string' || !r.id.startsWith(idPrefix)) {
      return {
        id,
        reason: SYSTEM_IDS.has(id) ? `'${id}' is a system template` : 'not a saved template id'
      };
    }
    if (seen.has(r.id)) return { id, reason: `'${id}' appears twice in the store` };
    const name = nameRefusal(r.name);
    if (name) return { id, reason: name };
    if (typeof r.savedAt !== 'string') return { id, reason: 'TEMPLATE_MALFORMED: no save time' };
    const content = contentRefusal(/** @type {C} */ (r.content));
    return content ? { id, reason: content } : null;
  }

  /** @returns {TemplateReadState<C>} */
  function read() {
    const s = storage();
    /** @type {string | null} */
    let raw = null;
    try {
      raw = s ? s.getItem(key) : null;
    } catch {
      return { templates: [], rejected: [], unreadable: false };
    }
    if (raw === null) return { templates: [], rejected: [], unreadable: false };
    /** @type {unknown} */
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { templates: [], rejected: [], unreadable: true };
    }
    const env = /** @type {{ v?: unknown; templates?: unknown } | null} */ (parsed);
    if (
      !env ||
      typeof env !== 'object' ||
      env.v !== STORE_VERSION ||
      !Array.isArray(env.templates)
    ) {
      return { templates: [], rejected: [], unreadable: true };
    }
    /** @type {SavedTemplate<C>[]} */
    const kept = [];
    /** @type {{ id: string; reason: string }[]} */
    const rejected = [];
    const seen = /** @type {Set<string>} */ (new Set());
    for (const row of /** @type {unknown[]} */ (env.templates)) {
      const refusal = rowRefusal(row, seen);
      if (refusal) {
        rejected.push(refusal);
        continue;
      }
      const ok = /** @type {SavedTemplate<C>} */ (row);
      seen.add(ok.id);
      kept.push(ok);
    }
    return { templates: kept, rejected, unreadable: false };
  }

  /** @returns {void} */
  function hydrate() {
    if (hydrated) return;
    state = read();
    rows = [...state.templates];
    hydrated = true;
  }

  /** @returns {string | null} */
  function persist() {
    const s = storage();
    if (!s) return 'STORAGE_UNAVAILABLE: this browser does not keep templates';
    try {
      s.setItem(key, JSON.stringify({ v: STORE_VERSION, templates: rows }));
      return null;
    } catch {
      return 'STORAGE_UNAVAILABLE: this browser refused to keep the template';
    }
  }

  return {
    /**
     * The honest read: templates in force, rows refused by name, unreadable.
     * @returns {TemplateReadState<C>}
     */
    readState() {
      hydrate();
      return { ...state, templates: rows };
    },
    /**
     * Save a template. Refused by name, and nothing is written, when invalid.
     * @param {string} name
     * @param {C} content
     * @param {string} savedAt
     * @returns {SaveResult}
     */
    save(name, content, savedAt) {
      hydrate();
      // ⚠️ An UNREADABLE store is not overwritten: writing would destroy
      // whatever the buyer's storage actually holds, silently.
      if (state.unreadable)
        return { ok: false, reason: 'STORE_UNREADABLE: the saved templates could not be read' };
      const n = nameRefusal(name);
      if (n) return { ok: false, reason: n };
      const c = contentRefusal(content);
      if (c) return { ok: false, reason: c };
      const id = `${idPrefix}${Date.now().toString(36)}-${rows.length + 1}`;
      rows = [{ id, name: name.trim(), savedAt, content }, ...rows];
      const failed = persist();
      if (failed) {
        rows = rows.slice(1);
        return { ok: false, reason: failed };
      }
      return { ok: true, id };
    },
    /**
     * Delete one saved template. A system template cannot be deleted.
     * @param {string} id
     * @returns {boolean}
     */
    remove(id) {
      hydrate();
      if (state.unreadable) return false;
      const before = rows.length;
      rows = rows.filter((r) => r.id !== id);
      if (rows.length === before) return false;
      persist();
      return true;
    },
    /**
     * Test isolation: forget the hydrated copy so the next read re-reads storage.
     * @returns {void}
     */
    reset() {
      rows = [];
      state = { templates: [], rejected: [], unreadable: false };
      hydrated = false;
    }
  };
}

export const rfiTemplateStore = /** @type {typeof makeStore<RfiTemplateContent>} */ (makeStore)(
  RFI_TEMPLATES_KEY,
  rfiTemplateContentRefusal,
  'rfit-'
);
export const rfpTemplateStore = /** @type {typeof makeStore<RfpTemplateContent>} */ (makeStore)(
  RFP_TEMPLATES_KEY,
  rfpTemplateContentRefusal,
  'rfpt-'
);

/**
 * Test isolation: re-arm both stores' lazy hydration.
 * @returns {void}
 */
export function resetRfxTemplatesForTest() {
  rfiTemplateStore.reset();
  rfpTemplateStore.reset();
}
