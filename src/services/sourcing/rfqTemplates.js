// ────────────────────────────────────────────────────────────────────────────
// RFQ TEMPLATES — "Save as template" and "Start from template" (D2).
//
// A template keeps what an RFQ ASKS — its items with their spec sheets, the
// quantity breaks, the one-time costs, the questions and the options — and
// never who was asked or when: no invitees, no dates. It is stored in this
// browser's `localStorage` under `paragon.rfqTemplates`, the `customRoles`
// precedent, and the page says where it lives (this browser, not shared).
//
// ── THE READ IS HONEST, ON THE `customRoles` SHAPE ─────────────────────────
//   · ABSENT storage, CORRUPT storage and an EMPTY list are three different
//     facts, and `readState()` says which one it met. A corrupt store is not a
//     silent "no templates" (`EMPTY-INPUT-REPORTS-CLEAN-01`).
//   · Every stored row is RE-VALIDATED on the way back in, through the SAME
//     rules the create verb applies (`itemRefusal`, `tiersRefusal`), and a row
//     that fails is REFUSED BY NAME with the rule's own words, not dropped.
//   · The two SYSTEM templates are code, never written to storage and never
//     read from it; a stored row claiming a system id is refused.
//
// ⚠️ **WHY THIS IS A STORE WRITE AND NOT A DISPATCHED VERB.** A template is the
// buyer's own authoring aid: no supplier reads it, nothing downstream moves
// because of it, and it binds nobody. The RFQ created FROM a template is the
// governed record, and it goes through `t_rfq_create` like every other one,
// carrying `templateId` so its origin is on the record.
// ────────────────────────────────────────────────────────────────────────────

/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { BID_CURRENCIES } from '@lib/currencyPolicy';
/** @import { DocumentRequest, RfiQuestion } from './types' */
/** @import { RfqItem, RfqQuantityTier } from './rfqModel' */
import { itemRefusal, rfqCreateRefusal, tiersRefusal } from './rfqModel';
import { specSheetFor } from './rfqItemTypes';
import { documentRequestsRefusal } from '../transitions/rfxDocumentRules';
import { sdcClock } from '../sdc/clock';

/** What a template carries. No invitees, no dates. */
/**
 * `samplesQty`:  The sample quantity only — the date it is needed is a date, and dates are not kept.
 * `documentRequests`:  NR-1 BR-11 — the buyer's document requests. Never a supplier's documents.
 *
 * @typedef {{
 *   readonly category?: string;
 *   readonly uom?: string;
 *   readonly currency?: BidCurrency;
 *   readonly items: readonly RfqItem[];
 *   readonly tiers: readonly RfqQuantityTier[];
 *   readonly questions?: readonly RfiQuestion[];
 *   readonly allowAlternatives?: boolean;
 *   readonly samplesQty?: number;
 *   readonly confidential?: boolean;
 *   readonly documentRequests?: readonly DocumentRequest[];
 * }} RfqTemplateContent
 */

/**
 * `nameKey`:  i18n key — the system templates only.
 * `name`:  The buyer's own name for a saved template. User text, not translated.
 *
 * @typedef {{
 *   readonly id: string;
 *   readonly nameKey?: string;
 *   readonly name?: string;
 *   readonly system: boolean;
 *   readonly createdAt?: string;
 *   readonly content: RfqTemplateContent;
 * }} RfqTemplate
 */

export const RFQ_TEMPLATES_KEY = 'paragon.rfqTemplates';
const STORE_VERSION = 1;

/**
 * @param {Parameters<typeof specSheetFor>[0]} type
 * @param {Record<string, string>} values
 */
const withValue = (type, values) =>
  specSheetFor(type).map((f) => (values[f.key] ? { ...f, value: values[f.key] } : f));

/**
 * The two read-only system templates. Code, never storage.
 * @type {readonly RfqTemplate[]}
 */
export const SYSTEM_RFQ_TEMPLATES = [
  {
    id: 'sys-sticker-roll-tiered',
    nameKey: 'rfqAuthoring.template.sys.stickerRoll',
    system: true,
    content: {
      category: 'Packaging',
      uom: 'PCS',
      currency: 'IDR',
      items: [
        {
          lineNo: 1,
          itemType: 'sticker',
          description: 'Variant sticker, roll',
          variantCount: 1,
          uom: 'PCS',
          specFields: withValue('sticker', { form: 'roll' }),
          oneTimeCosts: ['dieCutPlate', 'printingPlate']
        }
      ],
      tiers: [
        { qty: 3_000, basis: 'perVariant' },
        { qty: 5_000, basis: 'perVariant' },
        { qty: 10_000, basis: 'perVariant' },
        { qty: 25_000, basis: 'perVariant' },
        { qty: 50_000, basis: 'perVariant' }
      ]
    }
  },
  {
    id: 'sys-unit-box-papercard',
    nameKey: 'rfqAuthoring.template.sys.unitBox',
    system: true,
    content: {
      category: 'Packaging',
      uom: 'PCS',
      currency: 'IDR',
      items: [
        {
          lineNo: 1,
          itemType: 'unitBox',
          description: 'Unit box, papercard',
          variantCount: 1,
          uom: 'PCS',
          specFields: withValue('unitBox', {
            boxType: 'Tuck end',
            materialGsm: 'Ivory papercard 300 gsm'
          }),
          oneTimeCosts: ['dieCutPlate', 'printingPlate']
        }
      ],
      tiers: [
        { qty: 10_000, basis: 'total' },
        { qty: 20_000, basis: 'total' },
        { qty: 30_000, basis: 'total' }
      ]
    }
  }
];

/** What the last read found. A surface renders `rejected` and `unreadable`. */
/**
 * `saved`:  The saved templates that validated. The system ones are NOT in here.
 * `unreadable`:  Storage exists but could not be parsed — DISTINCT from "nothing saved".
 * `absent`:  Nothing has ever been saved in this browser.
 *
 * @typedef {{
 *   readonly saved: readonly RfqTemplate[];
 *   readonly rejected: readonly { readonly id: string; readonly reason: string }[];
 *   readonly unreadable: boolean;
 *   readonly absent: boolean;
 * }} RfqTemplateReadState
 */

/** @type {RfqTemplateReadState} */
const ABSENT = Object.freeze({
  saved: Object.freeze([]),
  rejected: Object.freeze([]),
  unreadable: false,
  absent: true
});

/**
 * Why a template's CONTENT is refused, or `null`. The same rules the create verb
 * applies, except that a template may leave buyer values blank — it keeps the
 * sheet, and the buyer fills it for the event.
 * @param {unknown} content
 * @returns {string | null}
 */
export function templateContentRefusal(content) {
  const c = /** @type {Partial<RfqTemplateContent> | null} */ (content);
  if (!c || typeof c !== 'object') return 'TEMPLATE_MALFORMED: not a template';
  if (!Array.isArray(c.items) || c.items.length === 0)
    return 'NO_ITEMS: a template keeps at least one item';
  for (const [i, item] of c.items.entries()) {
    const r = itemRefusal(item, i, { requireValues: false });
    if (r) return r;
  }
  const t = tiersRefusal(c.tiers, 'the template');
  if (t) return t;
  if (c.currency !== undefined && !BID_CURRENCIES.includes(c.currency)) {
    return `CURRENCY_NOT_PERMITTED: ${String(c.currency)}`;
  }
  const rest = rfqCreateRefusal({ ...(c.questions ? { questions: c.questions } : {}) });
  if (rest) return rest;
  // NR-1 BR-02 — a request naming an item is judged against the template's own items.
  if (c.documentRequests !== undefined) {
    const docs = documentRequestsRefusal(
      c.documentRequests,
      c.items.map((i) => i.lineNo)
    );
    if (docs) return docs;
  }
  return null;
}

/** @type {RfqTemplate[]} */
let saved = [];
/** @type {RfqTemplateReadState} */
let state = ABSENT;
let hydrated = false;

/** @returns {RfqTemplateReadState} */
function readFromStorage() {
  /** @type {string | null} */
  let raw;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return ABSENT;
    raw = window.localStorage.getItem(RFQ_TEMPLATES_KEY);
  } catch {
    return ABSENT;
  }
  if (raw === null) return ABSENT;
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...ABSENT, absent: false, unreadable: true };
  }
  const env = /** @type {{ v?: unknown; templates?: unknown } | null} */ (parsed);
  if (!env || typeof env !== 'object' || env.v !== STORE_VERSION || !Array.isArray(env.templates)) {
    return { ...ABSENT, absent: false, unreadable: true };
  }
  /** @type {RfqTemplate[]} */
  const kept = [];
  /** @type {{ id: string; reason: string }[]} */
  const rejected = [];
  const seen = /** @type {Set<string>} */ (new Set());
  for (const [i, row] of /** @type {unknown[]} */ (env.templates).entries()) {
    const r = /** @type {Partial<RfqTemplate> | null} */ (row);
    if (
      !r ||
      typeof r !== 'object' ||
      typeof r.id !== 'string' ||
      typeof r.name !== 'string' ||
      !r.name.trim()
    ) {
      rejected.push({ id: `row ${i}`, reason: 'TEMPLATE_MALFORMED: not a saved template' });
      continue;
    }
    if (SYSTEM_RFQ_TEMPLATES.some((s) => s.id === r.id)) {
      rejected.push({
        id: r.id,
        reason: 'TEMPLATE_SYSTEM_ID: a saved template may not claim a system template id'
      });
      continue;
    }
    if (seen.has(r.id)) {
      rejected.push({ id: r.id, reason: 'TEMPLATE_DUPLICATE: the id appears twice in the store' });
      continue;
    }
    const refusal = templateContentRefusal(r.content);
    if (refusal) {
      rejected.push({ id: r.id, reason: refusal });
      continue;
    }
    seen.add(r.id);
    kept.push({
      id: r.id,
      name: r.name.trim(),
      system: false,
      ...(typeof r.createdAt === 'string' ? { createdAt: r.createdAt } : {}),
      content: /** @type {RfqTemplateContent} */ (r.content)
    });
  }
  return { saved: kept, rejected, unreadable: false, absent: false };
}

/** @returns {void} */
function hydrate() {
  if (hydrated) return;
  state = readFromStorage();
  saved = [...state.saved];
  hydrated = true;
}

/** @returns {boolean} */
function persist() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(
      RFQ_TEMPLATES_KEY,
      JSON.stringify({ v: STORE_VERSION, templates: saved })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * @typedef {| { readonly ok: true; readonly template: RfqTemplate; readonly persisted: boolean }
 *   | { readonly ok: false; readonly reason: string }} SaveTemplateOutcome
 */

export const rfqTemplateStore = {
  /**
   * System templates first, then the saved ones, oldest first.
   * @returns {readonly RfqTemplate[]}
   */
  all() {
    hydrate();
    return [...SYSTEM_RFQ_TEMPLATES, ...saved];
  },
  /**
   * @param {string} id
   * @returns {RfqTemplate | undefined}
   */
  byId(id) {
    return rfqTemplateStore.all().find((t) => t.id === id);
  },
  /** @returns {RfqTemplateReadState} */
  readState() {
    hydrate();
    return state;
  },
  /**
   * Save a template. The content is judged by the SAME rule the read applies, so
   * nothing can be saved that the next read would refuse. `persisted: false`
   * means this browser would not keep it (private mode, quota): the template
   * stands for this session and the surface says so.
   * @param {string} name
   * @param {RfqTemplateContent} content
   * @returns {SaveTemplateOutcome}
   */
  save(name, content) {
    hydrate();
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, reason: 'TEMPLATE_UNNAMED: a template needs a name' };
    const refusal = templateContentRefusal(content);
    if (refusal) return { ok: false, reason: refusal };
    /** @type {RfqTemplate} */
    const template = {
      id: `tpl-${Date.now().toString(36)}-${saved.length + 1}`,
      name: trimmed,
      system: false,
      createdAt: sdcClock.now(),
      content
    };
    saved = [...saved, template];
    const persisted = persist();
    state = { saved, rejected: state.rejected, unreadable: false, absent: false };
    return { ok: true, template, persisted };
  },
  /**
   * Forget everything, in memory and on disk (test isolation).
   * @returns {void}
   */
  reset() {
    saved = [];
    state = ABSENT;
    hydrated = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage)
        window.localStorage.removeItem(RFQ_TEMPLATES_KEY);
    } catch {
      // nothing to clear
    }
  },
  /**
   * Drop the in-memory copy WITHOUT touching storage — what a reload does.
   * @returns {void}
   */
  rehydrate() {
    saved = [];
    state = ABSENT;
    hydrated = false;
    hydrate();
  }
};
