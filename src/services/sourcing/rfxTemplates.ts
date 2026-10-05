// ────────────────────────────────────────────────────────────────────────────
// RFI AND RFP TEMPLATES — owner decision D2 (2026-09-21), REVERSING CE-04.
//
// A buyer may save an RFI or RFP as a template, and start a new event from one.
// The template holds the CONTENT of an event — questions, sections, terms,
// indicative-pricing options, the confidentiality and T&C settings — and never
// its invitees, dates or files: invitees and dates belong to one event, and a
// session-held file (BL-27) would be a dead reference after a reload.
//
// ── THE STORE FOLLOWS `customRoles.ts`, AND THE REASONS TRAVEL WITH IT ──────
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

import type {
  DocumentRequest,
  RfiQuestion,
  RfpPricingRequest,
  RfpTermRow,
  RfxCustomSection,
} from './types';
import { RFI_TEMPLATES, rfxCategoryFamily } from './rfxConfig';
import {
  customSectionsRefusal,
  rfiQuestionsRefusal,
  rfpPricingRequestRefusal,
  rfpTermsRefusal,
} from '../transitions/rfxRules';
import { documentRequestsRefusal } from '../transitions/rfxDocumentRules';
import { BID_CURRENCIES } from '@lib/currencyPolicy';

export const RFI_TEMPLATES_KEY = 'paragon.rfiTemplates';
export const RFP_TEMPLATES_KEY = 'paragon.rfpTemplates';

/** Envelope version. A future shape change is a migration, not a misread. */
const STORE_VERSION = 1;

/** What an RFI template carries: the content of an event, nothing about who or when. */
export interface RfiTemplateContent {
  readonly familyId: string;
  readonly description?: string;
  readonly questions: readonly RfiQuestion[];
  readonly customSections: readonly RfxCustomSection[];
  readonly confidential: boolean;
  readonly confidentialityTerms?: string;
  /** NR-1 BR-11 — the buyer's document requests. Never a supplier's documents. */
  readonly documentRequests?: readonly DocumentRequest[];
}

/** What an RFP template carries. */
export interface RfpTemplateContent {
  readonly familyId: string;
  readonly scope: string;
  readonly currency: string;
  readonly terms: readonly RfpTermRow[];
  readonly questions: readonly RfiQuestion[];
  readonly customSections: readonly RfxCustomSection[];
  readonly pricing?: RfpPricingRequest;
  readonly confidential: boolean;
  readonly confidentialityTerms?: string;
  /** The T&C text. A T&C FILE is session-held and is not kept in a template. */
  readonly termsText?: string;
  /** NR-1 BR-11 — the buyer's document requests. Never a supplier's documents. */
  readonly documentRequests?: readonly DocumentRequest[];
}

export interface SavedTemplate<C> {
  readonly id: string;
  /** The buyer's own name for it. Not an i18n key. */
  readonly name: string;
  readonly savedAt: string;
  readonly content: C;
}

export type RfiSavedTemplate = SavedTemplate<RfiTemplateContent>;
export type RfpSavedTemplate = SavedTemplate<RfpTemplateContent>;

export interface TemplateReadState<C> {
  readonly templates: readonly SavedTemplate<C>[];
  /** Rows refused on read, each with the refusal's own words. */
  readonly rejected: readonly { readonly id: string; readonly reason: string }[];
  /** The store exists and could not be read — DISTINCT from "no templates". */
  readonly unreadable: boolean;
}

export type SaveResult = { readonly ok: true; readonly id: string } | { readonly ok: false; readonly reason: string };

const NAME_MIN = 2;
const NAME_MAX = 80;

// ── The content rules, shared by save and read ──────────────────────────────

function nameRefusal(name: unknown): string | null {
  if (typeof name !== 'string') return 'TEMPLATE_NAME_REQUIRED: a template has a name';
  const n = name.trim();
  if (n.length < NAME_MIN || n.length > NAME_MAX) {
    return `TEMPLATE_NAME_LENGTH: a template name is ${NAME_MIN}-${NAME_MAX} characters`;
  }
  return null;
}

const familyRefusal = (familyId: unknown): string | null =>
  typeof familyId === 'string' && rfxCategoryFamily(familyId)
    ? null
    : `UNKNOWN_FAMILY: ${String(familyId)} is not a category family`;

const optionalText = (v: unknown): boolean => v === undefined || typeof v === 'string';

export function rfiTemplateContentRefusal(c: RfiTemplateContent): string | null {
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

export function rfpTemplateContentRefusal(c: RfpTemplateContent): string | null {
  if (!c || typeof c !== 'object') return 'TEMPLATE_MALFORMED: no content';
  const family = familyRefusal(c.familyId);
  if (family) return family;
  if (typeof c.scope !== 'string') return 'TEMPLATE_MALFORMED: the scope is text';
  if (!(BID_CURRENCIES as readonly string[]).includes(c.currency)) {
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

function makeStore<C>(key: string, contentRefusal: (c: C) => string | null, idPrefix: string) {
  let rows: SavedTemplate<C>[] = [];
  let state: TemplateReadState<C> = { templates: [], rejected: [], unreadable: false };
  let hydrated = false;

  const storage = (): Storage | null => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
    } catch {
      return null;
    }
  };

  function rowRefusal(row: unknown, seen: ReadonlySet<string>): { id: string; reason: string } | null {
    if (!row || typeof row !== 'object') return { id: '?', reason: 'not a template' };
    const r = row as Partial<SavedTemplate<C>>;
    const id = typeof r.id === 'string' ? r.id : '?';
    if (typeof r.id !== 'string' || !r.id.startsWith(idPrefix)) {
      return { id, reason: SYSTEM_IDS.has(id) ? `'${id}' is a system template` : 'not a saved template id' };
    }
    if (seen.has(r.id)) return { id, reason: `'${id}' appears twice in the store` };
    const name = nameRefusal(r.name);
    if (name) return { id, reason: name };
    if (typeof r.savedAt !== 'string') return { id, reason: 'TEMPLATE_MALFORMED: no save time' };
    const content = contentRefusal(r.content as C);
    return content ? { id, reason: content } : null;
  }

  function read(): TemplateReadState<C> {
    const s = storage();
    let raw: string | null = null;
    try {
      raw = s ? s.getItem(key) : null;
    } catch {
      return { templates: [], rejected: [], unreadable: false };
    }
    if (raw === null) return { templates: [], rejected: [], unreadable: false };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { templates: [], rejected: [], unreadable: true };
    }
    const env = parsed as { v?: unknown; templates?: unknown } | null;
    if (!env || typeof env !== 'object' || env.v !== STORE_VERSION || !Array.isArray(env.templates)) {
      return { templates: [], rejected: [], unreadable: true };
    }
    const kept: SavedTemplate<C>[] = [];
    const rejected: { id: string; reason: string }[] = [];
    const seen = new Set<string>();
    for (const row of env.templates as unknown[]) {
      const refusal = rowRefusal(row, seen);
      if (refusal) {
        rejected.push(refusal);
        continue;
      }
      const ok = row as SavedTemplate<C>;
      seen.add(ok.id);
      kept.push(ok);
    }
    return { templates: kept, rejected, unreadable: false };
  }

  function hydrate(): void {
    if (hydrated) return;
    state = read();
    rows = [...state.templates];
    hydrated = true;
  }

  function persist(): string | null {
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
    /** The honest read: templates in force, rows refused by name, unreadable. */
    readState(): TemplateReadState<C> {
      hydrate();
      return { ...state, templates: rows };
    },
    /** Save a template. Refused by name, and nothing is written, when invalid. */
    save(name: string, content: C, savedAt: string): SaveResult {
      hydrate();
      // ⚠️ An UNREADABLE store is not overwritten: writing would destroy
      // whatever the buyer's storage actually holds, silently.
      if (state.unreadable) return { ok: false, reason: 'STORE_UNREADABLE: the saved templates could not be read' };
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
    /** Delete one saved template. A system template cannot be deleted. */
    remove(id: string): boolean {
      hydrate();
      if (state.unreadable) return false;
      const before = rows.length;
      rows = rows.filter((r) => r.id !== id);
      if (rows.length === before) return false;
      persist();
      return true;
    },
    /** Test isolation: forget the hydrated copy so the next read re-reads storage. */
    reset(): void {
      rows = [];
      state = { templates: [], rejected: [], unreadable: false };
      hydrated = false;
    },
  };
}

export const rfiTemplateStore = makeStore<RfiTemplateContent>(RFI_TEMPLATES_KEY, rfiTemplateContentRefusal, 'rfit-');
export const rfpTemplateStore = makeStore<RfpTemplateContent>(RFP_TEMPLATES_KEY, rfpTemplateContentRefusal, 'rfpt-');

/** Test isolation: re-arm both stores' lazy hydration. */
export function resetRfxTemplatesForTest(): void {
  rfiTemplateStore.reset();
  rfpTemplateStore.reset();
}
