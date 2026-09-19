// ────────────────────────────────────────────────────────────────────────────
// RFx CONFIGURATION — the RFI question library, the per-category templates, and
// the RFP standard term list (REQ-E03-02 and REQ-E03-04).
//
// Governed platform data, not a user-editable form builder: Procurement keeps
// ONE template per category family and the buyer adds or removes questions FOR
// ONE EVENT (the event carries its own question list, this file carries the
// starting point). Same shape as `forecastConfig` / `callOffRules` — the
// thresholds and lists live in one module so a change is one edit in one place.
//
// Every prompt, option and term is an i18n KEY, never a literal: SC-04 is
// business language in EN and ID, and a string authored here in English would
// be a screen half the users cannot read.
// ────────────────────────────────────────────────────────────────────────────

import type {
  RfiQuestion,
  RfiTemplate,
  RfpTermDefinition,
  RfpTermGroup,
} from './types';

/**
 * REQ-E03-01 BR-01 — the SAP MM purchasing groups (EKGRP) the supplier master
 * assigns. Codes are SAP-shaped (3 characters); the name is an i18n key.
 */
export const PURCHASING_GROUPS: readonly { readonly code: string; readonly nameKey: string }[] = [
  { code: '101', nameKey: 'rfx.pg.101' },
  { code: '102', nameKey: 'rfx.pg.102' },
  { code: '103', nameKey: 'rfx.pg.103' },
  { code: '104', nameKey: 'rfx.pg.104' },
];

/** The purchasing-group name key for a code, or undefined for an unknown code. */
export const purchasingGroupNameKey = (code: string | undefined): string | undefined =>
  PURCHASING_GROUPS.find((g) => g.code === code)?.nameKey;

// ── The RFI question library (REQ-E03-02, sections A to E) ───────────────────
//
// Sections A to D map to the capability / experience / facility / product
// structure of BR-02, so an answer is stored against the supplier and a later
// RFQ reads it (BR-04). Section E is compliance. Section F is empty here: it is
// what the buyer adds for one event.
//
// ⚠️ COMPANY IDENTITY IS DELIBERATELY ABSENT. Legal name, tax id, address and
// bank come from the supplier master and are never asked again (REQ-E03-02
// template rules). A question for any of them would be this file re-collecting
// data the platform already holds, and the two copies would disagree.

const SHARED_QUESTIONS: readonly RfiQuestion[] = [
  // A — Capability
  {
    id: 'a-categories',
    sectionId: 'capability',
    promptKey: 'rfx.q.a-categories',
    type: 'multipleChoice',
    options: ['packaging', 'rawMaterial', 'activeIngredient', 'fragrance'],
    required: true,
  },
  {
    id: 'a-testing',
    sectionId: 'capability',
    promptKey: 'rfx.q.a-testing',
    type: 'yesNo',
    required: true,
    weight: 2,
    optionScores: { yes: 100, no: 0 },
  },
  {
    id: 'a-description',
    sectionId: 'capability',
    promptKey: 'rfx.q.a-description',
    type: 'text',
    required: true,
  },
  // B — Experience
  {
    id: 'b-years',
    sectionId: 'experience',
    promptKey: 'rfx.q.b-years',
    type: 'numberWithUnit',
    unitKey: 'rfx.unit.years',
    required: true,
    weight: 3,
    scale: { worst: 0, best: 15 },
  },
  {
    id: 'b-references',
    sectionId: 'experience',
    promptKey: 'rfx.q.b-references',
    type: 'text',
    required: true,
  },
  {
    id: 'b-export',
    sectionId: 'experience',
    promptKey: 'rfx.q.b-export',
    type: 'text',
    required: false,
  },
  // C — Facilities
  {
    id: 'c-location',
    sectionId: 'facilities',
    promptKey: 'rfx.q.c-location',
    type: 'text',
    required: true,
  },
  {
    id: 'c-type',
    sectionId: 'facilities',
    promptKey: 'rfx.q.c-type',
    type: 'singleChoice',
    options: ['factory', 'warehouse'],
    required: true,
  },
  {
    id: 'c-capacity',
    sectionId: 'facilities',
    promptKey: 'rfx.q.c-capacity',
    type: 'numberWithUnit',
    unitKey: 'rfx.unit.perMonth',
    required: true,
    weight: 3,
    scale: { worst: 0, best: 500_000 },
  },
  {
    id: 'c-certificates',
    sectionId: 'facilities',
    promptKey: 'rfx.q.c-certificates',
    type: 'attachment',
    required: false,
  },
  // D — Products
  {
    id: 'd-product',
    sectionId: 'products',
    promptKey: 'rfx.q.d-product',
    type: 'text',
    required: true,
  },
  {
    id: 'd-specification',
    sectionId: 'products',
    promptKey: 'rfx.q.d-specification',
    type: 'text',
    required: true,
  },
  {
    id: 'd-moq',
    sectionId: 'products',
    promptKey: 'rfx.q.d-moq',
    type: 'numberWithUnit',
    unitKey: 'rfx.unit.perOrder',
    required: true,
  },
  {
    id: 'd-leadtime',
    sectionId: 'products',
    promptKey: 'rfx.q.d-leadtime',
    type: 'numberWithUnit',
    unitKey: 'rfx.unit.days',
    required: true,
    weight: 2,
    // Fewer days is better, so `best` sits BELOW `worst` — the scale is
    // direction-free by construction rather than by a second "higherIsBetter"
    // flag that a caller could set the wrong way round.
    scale: { worst: 60, best: 7 },
  },
  {
    id: 'd-sample',
    sectionId: 'products',
    promptKey: 'rfx.q.d-sample',
    type: 'yesNo',
    required: false,
  },
  {
    id: 'd-datasheet',
    sectionId: 'products',
    promptKey: 'rfx.q.d-datasheet',
    type: 'attachment',
    required: false,
  },
  // E — Compliance
  {
    id: 'e-halal',
    sectionId: 'compliance',
    promptKey: 'rfx.q.e-halal',
    type: 'singleChoice',
    options: ['certified', 'inProgress', 'none'],
    required: true,
    weight: 3,
    optionScores: { certified: 100, inProgress: 50, none: 0 },
  },
  {
    id: 'e-halal-certificate',
    sectionId: 'compliance',
    promptKey: 'rfx.q.e-halal-certificate',
    type: 'attachment',
    required: false,
  },
  {
    id: 'e-halal-expiry',
    sectionId: 'compliance',
    promptKey: 'rfx.q.e-halal-expiry',
    type: 'date',
    required: false,
  },
  {
    id: 'e-bpom',
    sectionId: 'compliance',
    promptKey: 'rfx.q.e-bpom',
    type: 'yesNo',
    required: true,
    weight: 2,
    optionScores: { yes: 100, no: 0 },
  },
  {
    id: 'e-iso9001',
    sectionId: 'compliance',
    promptKey: 'rfx.q.e-iso9001',
    type: 'yesNo',
    required: true,
    weight: 2,
    optionScores: { yes: 100, no: 0 },
  },
  {
    id: 'e-sustainability',
    sectionId: 'compliance',
    promptKey: 'rfx.q.e-sustainability',
    type: 'text',
    required: false,
  },
];

/** Packaging-specific processes (section A). */
const PACKAGING_PROCESS: RfiQuestion = {
  id: 'a-process-packaging',
  sectionId: 'capability',
  promptKey: 'rfx.q.a-process-packaging',
  type: 'multipleChoice',
  options: ['injectionMoulding', 'blowMoulding', 'printing', 'assembly'],
  required: true,
};

/** Raw-material-specific processes (section A). */
const RAW_MATERIAL_PROCESS: RfiQuestion = {
  id: 'a-process-raw',
  sectionId: 'capability',
  promptKey: 'rfx.q.a-process-raw',
  type: 'multipleChoice',
  options: ['compounding', 'blending', 'refining', 'esterification'],
  required: true,
};

/** GMP applies to cosmetic raw material, not to a bottle moulder. */
const GMP_QUESTION: RfiQuestion = {
  id: 'e-gmp22716',
  sectionId: 'compliance',
  promptKey: 'rfx.q.e-gmp22716',
  type: 'yesNo',
  required: true,
  weight: 2,
  optionScores: { yes: 100, no: 0 },
};

const withProcess = (process: RfiQuestion, extra: readonly RfiQuestion[] = []): readonly RfiQuestion[] => {
  const head = SHARED_QUESTIONS.slice(0, 1);
  const tail = SHARED_QUESTIONS.slice(1);
  return [...head, process, ...tail, ...extra];
};

/** The templates Procurement keeps, one per category family (REQ-E03-02). */
export const RFI_TEMPLATES: readonly RfiTemplate[] = [
  {
    id: 'packaging',
    nameKey: 'rfx.template.packaging',
    questions: withProcess(PACKAGING_PROCESS),
  },
  {
    id: 'rawMaterial',
    nameKey: 'rfx.template.rawMaterial',
    questions: withProcess(RAW_MATERIAL_PROCESS, [GMP_QUESTION]),
  },
];

/** A template by id, or undefined. */
export const rfiTemplate = (id: string): RfiTemplate | undefined =>
  RFI_TEMPLATES.find((tpl) => tpl.id === id);

/**
 * The category families a sourcing event is raised for (section 3.6a CE-03).
 *
 * ⚠️ **ONE LIST, TWO JOBS, AND THAT IS WHY IT IS HERE AND NOT IN A SCREEN.**
 * The family a buyer picks does two things at once: it names the RFI template
 * Procurement keeps for it, and it names the category the supplier master files
 * its suppliers under — which is what the invitee search filters on. Two lists
 * would let a wizard open the packaging template and then offer raw-material
 * suppliers, and nothing would say so.
 *
 * `templateId` is `undefined` for a family with no RFI template: an RFP is
 * raised per family too and does not read a template at all, so a family that
 * only ever carries terms is representable rather than fabricated.
 */
export const RFX_CATEGORY_FAMILIES: readonly {
  readonly id: string;
  readonly labelKey: string;
  /** The supplier-master category the invitee search narrows to. */
  readonly supplierCategory: string;
  readonly templateId?: string;
}[] = [
  { id: 'packaging', labelKey: 'rfx.family.packaging', supplierCategory: 'Packaging', templateId: 'packaging' },
  { id: 'rawMaterial', labelKey: 'rfx.family.rawMaterial', supplierCategory: 'Raw Material', templateId: 'rawMaterial' },
];

/** A category family by id, or undefined. */
export const rfxCategoryFamily = (id: string) => RFX_CATEGORY_FAMILIES.find((f) => f.id === id);

/**
 * THE CENTRAL QUESTION LIBRARY — every question any template carries, once.
 *
 * CE-03 / CE-05: this is what "add from the library" offers, and adding from it
 * copies the question ONTO ONE EVENT. Nothing in the app writes here; the
 * library changes when Procurement asks IT to change this file (CE-05), which
 * is why there is no admin screen and no save-as-template (CE-04).
 */
export const RFI_QUESTION_LIBRARY: readonly RfiQuestion[] = RFI_TEMPLATES.flatMap(
  (tpl) => tpl.questions,
).filter((q, i, all) => all.findIndex((x) => x.id === q.id) === i);

/** The section order every RFI surface renders in (A to F). */
export const RFI_SECTION_ORDER = [
  'capability',
  'experience',
  'facilities',
  'products',
  'compliance',
  'event',
] as const;

// ── The RFP standard term list (REQ-E03-04) ─────────────────────────────────

export const RFP_TERM_GROUP_ORDER: readonly RfpTermGroup[] = [
  'price',
  'payment',
  'delivery',
  'quality',
  'serviceLevel',
  'contract',
  'other',
];

/**
 * The standard terms a buyer picks from for each RFP. Two carry `scorable`: the
 * price basis and the standard lead time are the only rows whose proposed value
 * is a NUMBER, and CR-15 scores those axes and nothing else here.
 */
export const RFP_STANDARD_TERMS: readonly RfpTermDefinition[] = [
  { id: 'priceBasis', group: 'price', labelKey: 'rfx.term.priceBasis', scorable: 'price' },
  { id: 'priceValidity', group: 'price', labelKey: 'rfx.term.priceValidity' },
  { id: 'priceAdjustment', group: 'price', labelKey: 'rfx.term.priceAdjustment' },
  { id: 'volumeDiscount', group: 'price', labelKey: 'rfx.term.volumeDiscount' },
  { id: 'paymentTerms', group: 'payment', labelKey: 'rfx.term.paymentTerms' },
  { id: 'currency', group: 'payment', labelKey: 'rfx.term.currency' },
  { id: 'incoterms', group: 'delivery', labelKey: 'rfx.term.incoterms' },
  { id: 'leadTime', group: 'delivery', labelKey: 'rfx.term.leadTime', scorable: 'leadTime' },
  { id: 'moq', group: 'delivery', labelKey: 'rfx.term.moq' },
  { id: 'allocation', group: 'delivery', labelKey: 'rfx.term.allocation' },
  { id: 'consignment', group: 'delivery', labelKey: 'rfx.term.consignment' },
  { id: 'specCompliance', group: 'quality', labelKey: 'rfx.term.specCompliance' },
  { id: 'claimHandling', group: 'quality', labelKey: 'rfx.term.claimHandling' },
  { id: 'halalBpom', group: 'quality', labelKey: 'rfx.term.halalBpom' },
  { id: 'packagingLabelling', group: 'quality', labelKey: 'rfx.term.packagingLabelling' },
  { id: 'otifCommitment', group: 'serviceLevel', labelKey: 'rfx.term.otifCommitment' },
  { id: 'latePenalty', group: 'serviceLevel', labelKey: 'rfx.term.latePenalty' },
  { id: 'contractDuration', group: 'contract', labelKey: 'rfx.term.contractDuration' },
  { id: 'renewalNotice', group: 'contract', labelKey: 'rfx.term.renewalNotice' },
  { id: 'otherTerms', group: 'other', labelKey: 'rfx.term.otherTerms' },
];

/** A standard term by id, or undefined for a term the list does not carry. */
export const rfpTerm = (id: string): RfpTermDefinition | undefined =>
  RFP_STANDARD_TERMS.find((term) => term.id === id);
