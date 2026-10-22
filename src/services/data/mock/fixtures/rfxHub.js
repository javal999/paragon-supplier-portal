// ────────────────────────────────────────────────────────────────────────────
// RFx sample data (REQ-E03-01 to REQ-E03-05), dated relative to the declared
// present so every clock-derived state reads the same on any day the present is
// bumped to. Nothing here stores "open", "overdue" or "closing soon": those are
// derived from the deadlines below at read (law 0.5).
//
// What each seed shows at the declared present:
//   · rfi-001  — a packaging RFI in progress: two SUBMITTED responses the buyer
//     compares (sup-007, sup-008) and one DRAFT the buyer cannot see (sup-013),
//     plus a deadline extended for sup-013 alone.
//   · rfp-001  — an annual-terms RFP with THREE submitted proposals, two of them
//     carrying deviations with the comment the verb requires.
//   · rfq-014  — a CLOSED tender with FOUR quotes, ranked by CR-15, with one
//     negotiation round open on a two-supplier shortlist: sup-015 has revised,
//     sup-007 has not (its Home task), and the round closes soon (PTI's task).
//   · rfq-015  — an AWARDED tender recording a 70/30 split across two suppliers,
//     with the reason kept and the two losing quotes marked Not awarded.
//   · rfi-002  — the Oslo sticker capability RFI: every question kind, a
//     buyer-added section, an indicative price range, a brief attachment.
//   · rfp-002  — Tundra, open-spec bottle and pump: indicative pricing on two
//     options × 10K/50K/100K, custom terms, and sup-007's answer proposing an
//     option of its own.
//   · rfp-003  — ICY, full-service lip product: formula and pack options at
//     25K/50K per variant, CONFIDENTIAL with a T&C document, not yet accepted.
//   · rfi-003 / rfp-004 — Redwood 2.0 DRAFTS (BL-93): not sent, so only the
//     buyer sees them, and "Edit draft" re-opens their wizard.
//   · Attachments on seeded events are metadata only — the hub never held the
//     bytes, so every surface reads them as "not available in this session".
//   · sup-013  — invited and quoting with NO OTIF HISTORY, so every surface has
//     to say "No history" rather than 0% and CR-15 scores its reliability 50.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
import { rfiTemplate } from '../../../sourcing/rfxConfig';
/** @import { AwardRecord, NegotiationRound, RfiEvent, RfiResponse, RfpEvent, RfpResponse } from '../../../sourcing/types' */
/** @import { RfxIntentRecord } from '../../../sourcing/rfxIntent' */

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);

/**
 * A calendar day `offset` days from the declared present.
 * @param {number} offset
 * @returns {string}
 */
const day = (offset) => new Date(P + offset * DAY_MS).toISOString().slice(0, 10);
/**
 * An instant `offset` days from the declared present at `hourUtc` (WIB is UTC+7).
 * @param {number} offset
 * @returns {string}
 */
const at = (offset, hourUtc = 3) =>
  new Date(P + offset * DAY_MS + hourUtc * 3_600_000).toISOString();

const PACKAGING_QUESTIONS = /** @type {import('../../../sourcing/types').RfiTemplate} */ (
  rfiTemplate('packaging')
).questions;

// ── REQ-E03-02 — the RFI in progress ────────────────────────────────────────

/** @type {readonly RfiEvent[]} */
export const RFI_EVENT_SEED = [
  {
    id: 'rfi-001',
    eventNumber: 'RFI-2026-001',
    title: 'Packaging capability — 2027 bottle programme',
    templateId: 'packaging',
    materialCategory: 'Packaging',
    purchasingGroup: '101',
    status: 'Open',
    createdAt: at(-12),
    responseDeadline: day(6),
    invitees: [
      { supplierId: 'sup-007' },
      { supplierId: 'sup-008' },
      // Extended for this invitee ALONE (REQ-E03-02 edge case) — a new supplier
      // that asked for more time. The event's own deadline is untouched, which
      // is what keeps "extended for everyone" and "extended for one" apart.
      { supplierId: 'sup-013', deadline: day(10) }
    ],
    questions: [
      ...PACKAGING_QUESTIONS,
      // Section F — the questions this buyer added for THIS event only.
      {
        id: 'f-recycled-content',
        sectionId: 'event',
        promptKey: 'rfx.q.f-recycled-content',
        type: 'numberWithUnit',
        unitKey: 'rfx.unit.percent',
        required: true,
        weight: 2,
        scale: { worst: 0, best: 50 }
      },
      {
        id: 'f-tooling-owner',
        sectionId: 'event',
        promptKey: 'rfx.q.f-tooling-owner',
        type: 'singleChoice',
        options: ['supplier', 'pti', 'shared'],
        required: true
      }
    ],
    extensions: [{ at: at(-2), deadline: day(10), supplierIds: ['sup-013'] }]
  },
  {
    // RFx authoring batch — an OSLO-style sticker capability RFI that asks with
    // EVERY question kind, including a buyer-added section, choice questions
    // written in the option editor, bounded numbers and an INDICATIVE price
    // range. sup-008 has answered it; sup-007 (the seeded supplier seat) has
    // not, so the supplier form shows every kind to fill in.
    id: 'rfi-002',
    eventNumber: 'RFI-2026-002',
    title: 'Oslo sticker capability — variant labels 2027',
    description:
      'PTI is preparing 8 variant stickers for the Oslo range and wants to know which label converters can print, finish and supply them on rolls.',
    templateId: 'packaging',
    materialCategory: 'Packaging',
    purchasingGroup: '104',
    status: 'Open',
    createdAt: at(-5),
    responseDeadline: day(9),
    invitees: [{ supplierId: 'sup-007' }, { supplierId: 'sup-008' }],
    customSections: [{ id: 'custom-printing', title: 'Printing and finishing' }],
    attachments: [
      {
        id: 'att-seed-oslo-brief',
        name: 'Oslo sticker brief v2.pdf',
        size: 356_210,
        type: 'application/pdf',
        addedAt: at(-5)
      }
    ],
    questions: [
      {
        id: 'oslo-machine',
        sectionId: 'custom-printing',
        promptKey: 'rfx.q.oslo-machine',
        type: 'text',
        required: true,
        help: 'Brand and model of the press you would run this on.'
      },
      {
        id: 'oslo-dieCut',
        sectionId: 'custom-printing',
        promptKey: 'rfx.q.oslo-dieCut',
        type: 'singleChoice',
        options: ['flexible', 'flatbed', 'both'],
        optionLabels: { flexible: 'Flexible (rotary) die', flatbed: 'Flatbed die', both: 'Both' },
        required: true
      },
      {
        id: 'oslo-finishing',
        sectionId: 'custom-printing',
        promptKey: 'rfx.q.oslo-finishing',
        type: 'multipleChoice',
        options: ['matteLam', 'glossLam', 'hotStamp', 'spotUv'],
        optionLabels: {
          matteLam: 'Matte lamination',
          glossLam: 'Gloss lamination',
          hotStamp: 'Hot stamping',
          spotUv: 'Spot UV'
        },
        required: true
      },
      {
        id: 'oslo-colours',
        sectionId: 'custom-printing',
        promptKey: 'rfx.q.oslo-colours',
        type: 'numberWithUnit',
        unitKey: 'rfx.unit.colours',
        min: 1,
        max: 10,
        required: true
      },
      {
        id: 'oslo-process',
        sectionId: 'custom-printing',
        promptKey: 'rfx.q.oslo-process',
        type: 'longText',
        required: false,
        help: 'From artwork approval to delivery, in your own words.'
      },
      {
        id: 'oslo-defect',
        sectionId: 'compliance',
        promptKey: 'rfx.q.oslo-defect',
        type: 'percentage',
        max: 5,
        required: true
      },
      {
        id: 'oslo-plate',
        sectionId: 'products',
        promptKey: 'rfx.q.oslo-plate',
        type: 'money',
        currency: 'IDR',
        required: false
      },
      {
        id: 'oslo-price',
        sectionId: 'products',
        promptKey: 'rfx.q.oslo-price',
        type: 'priceRange',
        currency: 'IDR',
        unitKey: 'rfx.unit.perPiece',
        required: true,
        help: 'An indicative range for a 50 x 80 mm sticker at 10,000 pieces. Not a quotation.'
      },
      {
        id: 'oslo-sample',
        sectionId: 'products',
        promptKey: 'rfx.q.oslo-sample',
        type: 'date',
        required: false
      },
      {
        id: 'oslo-halal',
        sectionId: 'compliance',
        promptKey: 'rfx.q.oslo-halal',
        type: 'yesNo',
        required: true,
        weight: 2,
        optionScores: { yes: 100, no: 0 }
      },
      {
        id: 'oslo-portfolio',
        sectionId: 'products',
        promptKey: 'rfx.q.oslo-portfolio',
        type: 'attachment',
        required: false
      }
    ],
    extensions: []
  },
  {
    // BL-93 — a DRAFT RFI, so "Edit draft" has something to open on the RFI
    // board: Redwood 2.0 mold makers, not yet sent. Suppliers do not see it.
    id: 'rfi-003',
    eventNumber: 'RFI-2026-003',
    title: 'Redwood 2.0 mold makers — capability check',
    description:
      'PTI is looking for mold makers for the five Redwood 2.0 lip cream components (outer cap, inner cap, base, applicator wand, wiper).',
    templateId: 'packaging',
    materialCategory: 'Packaging',
    purchasingGroup: '104',
    status: 'Draft',
    createdAt: at(-1),
    responseDeadline: day(12),
    invitees: [{ supplierId: 'sup-007' }, { supplierId: 'sup-013' }],
    questions: PACKAGING_QUESTIONS,
    extensions: []
  }
];

/**
 * @param {Record<string, string | number | readonly string[]>} overrides
 * @returns {RfiResponse['answers']}
 */
const packagingAnswers = (overrides) =>
  Object.entries(overrides).map(([questionId, value]) => ({ questionId, value }));

/** @type {readonly RfiResponse[]} */
export const RFI_RESPONSE_SEED = [
  {
    id: 'rfi-resp-001',
    rfiId: 'rfi-001',
    supplierId: 'sup-007',
    status: 'Submitted',
    updatedAt: at(-4),
    submittedAt: at(-4),
    answers: [
      ...packagingAnswers({
        'a-categories': ['packaging'],
        'a-process-packaging': ['injectionMoulding', 'blowMoulding', 'printing'],
        'a-testing': 'yes',
        'b-years': 12,
        'b-export': 'Malaysia, Philippines',
        'c-location': 'Tangerang, Banten',
        'c-type': 'factory',
        'c-capacity': 420_000,
        'd-product': 'PET bottle 100ml airless pump',
        'd-moq': 50_000,
        'd-leadtime': 21,
        'd-sample': 'yes',
        'e-halal': 'certified',
        'e-bpom': 'yes',
        'e-iso9001': 'yes',
        'f-recycled-content': 30,
        'f-tooling-owner': 'shared'
      }),
      {
        questionId: 'a-description',
        value: 'Injection and blow moulding with in-house printing and assembly.',
        description: 'Four moulding lines, two printing lines, one assembly cell.'
      },
      {
        questionId: 'b-references',
        value: 'Three national personal-care brands since 2019.',
        description: 'Airless pump and dropper formats, 30ml to 250ml.'
      },
      {
        questionId: 'd-specification',
        value: 'PET, 28mm neck, airless pump, 100ml fill',
        description: 'Food-grade PET resin, dosing 0.5ml per stroke.'
      }
    ]
  },
  {
    id: 'rfi-resp-002',
    rfiId: 'rfi-001',
    supplierId: 'sup-008',
    status: 'Submitted',
    updatedAt: at(-3),
    submittedAt: at(-3),
    answers: [
      ...packagingAnswers({
        'a-categories': ['packaging'],
        'a-process-packaging': ['printing', 'assembly'],
        'a-testing': 'no',
        'b-years': 7,
        'b-export': 'None',
        'c-location': 'Bekasi, West Java',
        'c-type': 'factory',
        'c-capacity': 180_000,
        'd-product': 'Folding carton 12s shipper',
        'd-moq': 20_000,
        'd-leadtime': 28,
        'd-sample': 'yes',
        'e-halal': 'inProgress',
        'e-bpom': 'no',
        'e-iso9001': 'yes',
        'f-recycled-content': 45,
        'f-tooling-owner': 'pti'
      }),
      {
        questionId: 'a-description',
        value: 'Offset printing and carton converting.',
        description: 'Two offset presses and one die-cutting line.'
      },
      {
        questionId: 'b-references',
        value: 'Two cosmetics brands and one food manufacturer.',
        description: 'Secondary packaging only.'
      },
      {
        questionId: 'd-specification',
        value: 'E-flute corrugated shipper, 12 units',
        description: 'Recycled board, four-colour print.'
      }
    ]
  },
  {
    // ⚠️ A DRAFT — the buyer must NOT see this, and the read filters it out.
    // It is also incomplete on purpose: submitting it is refused until the
    // required questions are answered (REQ-E03-02 template rule).
    id: 'rfi-resp-003',
    rfiId: 'rfi-001',
    supplierId: 'sup-013',
    status: 'Draft',
    updatedAt: at(-1),
    answers: packagingAnswers({
      'a-categories': ['packaging'],
      'a-process-packaging': ['injectionMoulding'],
      'b-years': 1
    })
  },
  {
    // sup-008's answer to the Oslo RFI: every kind answered, including the
    // indicative price range the buyer sees labelled Indicative.
    id: 'rfi-resp-004',
    rfiId: 'rfi-002',
    supplierId: 'sup-008',
    status: 'Submitted',
    updatedAt: at(-1),
    submittedAt: at(-1),
    answers: [
      { questionId: 'oslo-machine', value: 'Mark Andy P5, 8 colours with rotary die station' },
      { questionId: 'oslo-dieCut', value: 'flexible' },
      { questionId: 'oslo-finishing', value: ['matteLam', 'hotStamp'] },
      { questionId: 'oslo-colours', value: 6 },
      { questionId: 'oslo-defect', value: 0.5 },
      { questionId: 'oslo-plate', value: 1_250_000 },
      { questionId: 'oslo-price', range: { min: 210, max: 260 } },
      { questionId: 'oslo-sample', value: day(14) },
      { questionId: 'oslo-halal', value: 'yes' }
    ]
  }
];

// ── REQ-E03-04 — the RFP with three proposals ───────────────────────────────

/** @type {readonly RfpEvent[]} */
export const RFP_EVENT_SEED = [
  {
    id: 'rfp-001',
    eventNumber: 'RFP-2026-001',
    title: 'Annual packaging supply terms 2027',
    scope:
      'Primary and secondary packaging for the Wardah and Emina lines, twelve months from January 2027.',
    materialCategory: 'Packaging',
    purchasingGroup: '101',
    status: 'Open',
    createdAt: at(-15),
    responseDeadline: day(4),
    currency: 'IDR',
    invitees: [
      { supplierId: 'sup-007' },
      { supplierId: 'sup-008' },
      { supplierId: 'sup-015' },
      // Invited and still to answer — the supplier whose Home list this puts
      // "Proposal requests to answer" on.
      { supplierId: 'sup-013' }
    ],
    terms: [
      { termId: 'priceBasis', requestedValue: '1500' },
      { termId: 'priceValidity', requestedValue: '12 months' },
      { termId: 'priceAdjustment', requestedValue: 'Fixed for the contract year' },
      { termId: 'paymentTerms', requestedValue: '60' },
      { termId: 'incoterms', requestedValue: 'DDP Jakarta' },
      { termId: 'leadTime', requestedValue: '21' },
      { termId: 'moq', requestedValue: '50,000 pcs' },
      { termId: 'allocation', requestedValue: '400,000 pcs per month' },
      {
        termId: 'specCompliance',
        requestedValue: 'Full compliance with PTI specification PK-2027'
      },
      { termId: 'halalBpom', requestedValue: 'Halal certificate valid for the contract term' },
      { termId: 'otifCommitment', requestedValue: '95%' },
      { termId: 'contractDuration', requestedValue: '12 months' }
    ],
    extensions: []
  },
  {
    // RFx authoring batch — a TUNDRA-style open-spec RFP: PTI does not fix the
    // bottle and pump, it asks for options and INDICATIVE prices at three
    // quantity points. sup-007 has answered with prices and one option of its
    // own; sup-015 has not answered yet.
    id: 'rfp-002',
    eventNumber: 'RFP-2026-002',
    title: 'Tundra — open-spec bottle and pump',
    scope:
      'A 150 ml bottle with pump for the Tundra body lotion. The shape follows the reference image; material, neck and pump are open for your recommendation.',
    materialCategory: 'Packaging',
    purchasingGroup: '101',
    status: 'Open',
    createdAt: at(-6),
    responseDeadline: day(9),
    currency: 'IDR',
    invitees: [{ supplierId: 'sup-007' }, { supplierId: 'sup-015' }],
    terms: [
      { termId: 'priceValidity', requestedValue: '6 months' },
      { termId: 'paymentTerms', requestedValue: '60' },
      { termId: 'leadTime', requestedValue: '45' },
      {
        termId: 'custom-dosage',
        label: 'Pump dosage per stroke',
        group: 'quality',
        valueKind: 'numberWithUnit',
        unit: 'ml',
        requestedValue: '1.5'
      },
      {
        termId: 'custom-pcr',
        label: 'Recycled (PCR) resin available',
        group: 'quality',
        valueKind: 'yesNo',
        requestedValue: 'yes'
      }
    ],
    attachments: [
      {
        id: 'att-seed-tundra-ref',
        name: 'Tundra reference bottle and pump.jpg',
        size: 482_133,
        type: 'image/jpeg',
        addedAt: at(-6)
      }
    ],
    pricing: {
      options: [
        {
          id: 'opt-full-set',
          title: 'Full set: bottle, pump and cap',
          description: '150 ml bottle, lotion pump and over-cap, one colour print on the bottle.'
        },
        {
          id: 'opt-pump-cap',
          title: 'Pump and cap only',
          description: 'PTI sources the bottle; you supply a matching pump and over-cap.'
        }
      ],
      quantityPoints: [10_000, 50_000, 100_000],
      quantityBasis: 'total',
      samplesRequested: true
    },
    extensions: []
  },
  {
    // RFx authoring batch — an ICY-style FULL-SERVICE RFP for a lip product:
    // two formula options and three secondary-pack options, INDICATIVE prices
    // at MOQ points of 25K and 50K PER VARIANT, samples and a timeline. It is
    // CONFIDENTIAL with a T&C document, so the seeded supplier seat (sup-007)
    // meets the gate first and sees nothing of the brief until it accepts.
    id: 'rfp-003',
    eventNumber: 'RFP-2026-003',
    title: 'ICY — full-service lip product',
    scope:
      'Formula, filling and secondary pack for a new lip product in 6 variants. Propose the formula base, the pack and a development timeline from brief to first production.',
    materialCategory: 'Packaging',
    purchasingGroup: '104',
    status: 'Open',
    createdAt: at(-3),
    responseDeadline: day(12),
    currency: 'IDR',
    invitees: [{ supplierId: 'sup-007' }, { supplierId: 'sup-015' }],
    terms: [
      { termId: 'priceValidity', requestedValue: '6 months' },
      { termId: 'paymentTerms', requestedValue: '45' },
      { termId: 'leadTime', requestedValue: '60' },
      {
        termId: 'custom-formula-owner',
        label: 'Formula ownership',
        group: 'contract',
        valueKind: 'choice',
        options: ['PTI owns the formula', 'Supplier owns the formula', 'Shared'],
        requestedValue: 'PTI owns the formula'
      },
      {
        termId: 'custom-shelf-life',
        label: 'Shelf life',
        group: 'quality',
        valueKind: 'numberWithUnit',
        unit: 'months',
        requestedValue: '24'
      },
      {
        termId: 'custom-stability',
        label: 'Stability test report provided',
        group: 'quality',
        valueKind: 'yesNo',
        requestedValue: 'yes'
      }
    ],
    customSections: [{ id: 'custom-development', title: 'Development' }],
    questions: [
      {
        id: 'icy-timeline',
        sectionId: 'custom-development',
        promptKey: 'rfx.q.icy-timeline',
        type: 'longText',
        required: true
      },
      {
        id: 'icy-halal',
        sectionId: 'compliance',
        promptKey: 'rfx.q.icy-halal',
        type: 'yesNo',
        required: true
      },
      {
        id: 'icy-shades',
        sectionId: 'custom-development',
        promptKey: 'rfx.q.icy-shades',
        type: 'numberWithUnit',
        unitKey: 'rfx.unit.shades',
        min: 1,
        max: 20,
        required: false
      }
    ],
    confidentiality: {
      terms:
        'The ICY brief, formula targets and pack artwork are PTI confidential. Use them only to prepare this proposal, and share them with nobody outside your company.'
    },
    termsDocument: {
      text: 'Proposals are indicative and non-binding for both parties. Samples requested under this RFP are free of charge up to 3 rounds. PTI may share the outcome, but never another supplier’s prices.'
    },
    pricing: {
      options: [
        {
          id: 'opt-formula-1',
          title: 'Formula option 1: matte lip cream',
          description: '8 shades, transfer-resistant.'
        },
        {
          id: 'opt-formula-2',
          title: 'Formula option 2: satin lip tint',
          description: '6 shades, hydrating base.'
        },
        { id: 'opt-pack-1', title: 'Secondary pack option 1: unit box, 3 colours + hot stamp' },
        { id: 'opt-pack-2', title: 'Secondary pack option 2: unit box, 2 colours + spot UV' },
        { id: 'opt-pack-3', title: 'Secondary pack option 3: printed sleeve, 1 colour' }
      ],
      quantityPoints: [25_000, 50_000],
      quantityBasis: 'perVariant',
      samplesRequested: true
    },
    extensions: []
  },
  {
    // BL-93 — a DRAFT RFP: Redwood 2.0 mold tooling terms, not yet sent.
    id: 'rfp-004',
    eventNumber: 'RFP-2026-004',
    title: 'Redwood 2.0 — mold tooling terms',
    scope:
      'Terms for building and holding the Redwood 2.0 molds: who owns the tooling, how long a trial run takes, and the payment schedule for the mold cost.',
    materialCategory: 'Packaging',
    purchasingGroup: '104',
    status: 'Draft',
    createdAt: at(-1),
    responseDeadline: day(13),
    currency: 'IDR',
    invitees: [{ supplierId: 'sup-007' }, { supplierId: 'sup-013' }],
    terms: [
      { termId: 'paymentTerms', requestedValue: '60' },
      { termId: 'leadTime', requestedValue: '45' },
      { termId: 'contractDuration', requestedValue: '24 months' }
    ],
    extensions: []
  }
];

/** @type {readonly RfpResponse[]} */
export const RFP_RESPONSE_SEED = [
  {
    id: 'rfp-resp-001',
    rfpId: 'rfp-001',
    supplierId: 'sup-007',
    status: 'Submitted',
    updatedAt: at(-5),
    submittedAt: at(-5),
    answers: [
      { termId: 'priceBasis', proposedValue: '1480', stance: 'comply' },
      { termId: 'priceValidity', proposedValue: '12 months', stance: 'comply' },
      { termId: 'priceAdjustment', proposedValue: 'Fixed for the contract year', stance: 'comply' },
      { termId: 'paymentTerms', proposedValue: '60', stance: 'comply' },
      { termId: 'incoterms', proposedValue: 'DDP Jakarta', stance: 'comply' },
      { termId: 'leadTime', proposedValue: '21', stance: 'comply' },
      { termId: 'moq', proposedValue: '50,000 pcs', stance: 'comply' },
      { termId: 'allocation', proposedValue: '400,000 pcs per month', stance: 'comply' },
      { termId: 'specCompliance', proposedValue: 'Full compliance with PK-2027', stance: 'comply' },
      { termId: 'halalBpom', proposedValue: 'Halal valid to November 2027', stance: 'comply' },
      { termId: 'otifCommitment', proposedValue: '95%', stance: 'comply' },
      { termId: 'contractDuration', proposedValue: '12 months', stance: 'comply' }
    ]
  },
  {
    id: 'rfp-resp-002',
    rfpId: 'rfp-001',
    supplierId: 'sup-008',
    status: 'Submitted',
    updatedAt: at(-4),
    submittedAt: at(-4),
    answers: [
      { termId: 'priceBasis', proposedValue: '1390', stance: 'comply' },
      {
        termId: 'priceValidity',
        proposedValue: '6 months',
        stance: 'deviate',
        comment: 'Board prices are re-quoted twice a year by our own supplier.'
      },
      {
        termId: 'priceAdjustment',
        proposedValue: 'Index-linked to pulp price',
        stance: 'deviate',
        comment: 'Pulp moved 18% last year; a fixed price would carry a risk premium.'
      },
      {
        termId: 'paymentTerms',
        proposedValue: '45',
        stance: 'deviate',
        comment: 'Our working capital facility is set at 45 days.'
      },
      { termId: 'incoterms', proposedValue: 'DDP Jakarta', stance: 'comply' },
      {
        termId: 'leadTime',
        proposedValue: '28',
        stance: 'deviate',
        comment: 'Die-cutting is a single line; 28 days is the honest promise.'
      },
      { termId: 'moq', proposedValue: '20,000 pcs', stance: 'comply' },
      {
        termId: 'allocation',
        proposedValue: '250,000 pcs per month',
        stance: 'deviate',
        comment: 'Capacity is 250,000 until the second die-cutter lands in Q3 2027.'
      },
      { termId: 'specCompliance', proposedValue: 'Full compliance with PK-2027', stance: 'comply' },
      {
        termId: 'halalBpom',
        proposedValue: 'Halal certification in progress',
        stance: 'deviate',
        comment: 'BPJPH audit booked for November 2026.'
      },
      {
        termId: 'otifCommitment',
        proposedValue: '90%',
        stance: 'deviate',
        comment: 'We commit to 90% and review after two quarters.'
      },
      { termId: 'contractDuration', proposedValue: '12 months', stance: 'comply' }
    ],
    otherTerms: 'Tooling amortised over the first 300,000 units.'
  },
  {
    id: 'rfp-resp-003',
    rfpId: 'rfp-001',
    supplierId: 'sup-015',
    status: 'Submitted',
    updatedAt: at(-3),
    submittedAt: at(-3),
    answers: [
      {
        termId: 'priceBasis',
        proposedValue: '1520',
        stance: 'deviate',
        comment: 'Includes the recycled-content resin PTI asked for.'
      },
      { termId: 'priceValidity', proposedValue: '12 months', stance: 'comply' },
      { termId: 'priceAdjustment', proposedValue: 'Fixed for the contract year', stance: 'comply' },
      { termId: 'paymentTerms', proposedValue: '60', stance: 'comply' },
      { termId: 'incoterms', proposedValue: 'DDP Jakarta', stance: 'comply' },
      { termId: 'leadTime', proposedValue: '18', stance: 'comply' },
      { termId: 'moq', proposedValue: '50,000 pcs', stance: 'comply' },
      { termId: 'allocation', proposedValue: '400,000 pcs per month', stance: 'comply' },
      { termId: 'specCompliance', proposedValue: 'Full compliance with PK-2027', stance: 'comply' },
      { termId: 'halalBpom', proposedValue: 'Halal valid to November 2027', stance: 'comply' },
      { termId: 'otifCommitment', proposedValue: '95%', stance: 'comply' },
      {
        termId: 'contractDuration',
        proposedValue: '24 months',
        stance: 'deviate',
        comment: 'A two-year term lets us amortise the tooling.'
      }
    ]
  },
  {
    // sup-007's Tundra proposal: indicative prices on both of PTI's options,
    // plus an option of its OWN (a stock bottle it already moulds), a sample
    // offer, a timeline note and a validity date.
    id: 'rfp-resp-004',
    rfpId: 'rfp-002',
    supplierId: 'sup-007',
    status: 'Submitted',
    updatedAt: at(-1),
    submittedAt: at(-1),
    answers: [
      { termId: 'priceValidity', proposedValue: '6 months', stance: 'comply' },
      { termId: 'paymentTerms', proposedValue: '60', stance: 'comply' },
      {
        termId: 'leadTime',
        proposedValue: '50',
        stance: 'deviate',
        comment: 'A new pump tool adds five days to the first run.'
      },
      { termId: 'custom-dosage', proposedValue: '1.5', stance: 'comply' },
      { termId: 'custom-pcr', proposedValue: 'yes', stance: 'comply' }
    ],
    pricing: {
      prices: [
        { optionId: 'opt-full-set', qty: 10_000, unitPrice: 4_850 },
        { optionId: 'opt-full-set', qty: 50_000, unitPrice: 4_200 },
        { optionId: 'opt-full-set', qty: 100_000, unitPrice: 3_900 },
        { optionId: 'opt-pump-cap', qty: 10_000, unitPrice: 2_650 },
        { optionId: 'opt-pump-cap', qty: 50_000, unitPrice: 2_300 },
        { optionId: 'opt-pump-cap', qty: 100_000, unitPrice: 2_150 },
        { optionId: 'sup-opt-1', qty: 50_000, unitPrice: 3_600 },
        { optionId: 'sup-opt-1', qty: 100_000, unitPrice: 3_350 }
      ],
      proposedOptions: [
        {
          id: 'sup-opt-1',
          title: 'Stock 150 ml bottle with 24/410 lotion pump',
          description:
            'Our existing mould, so no bottle tooling cost; shape differs slightly from the reference.'
        }
      ],
      sample: { canSample: true, readyDate: day(20) },
      timelineNote:
        'Samples 3 weeks after PTI confirms the option; first production 7 weeks after sample approval.',
      validUntil: day(120)
    }
  }
];

// ── BL-132 — intent on an RFI and an RFP ────────────────────────────────────
//
//   · sup-013 said "I will respond" on rfi-001 before it began its draft.
//   · sup-015 DECLINED rfp-003 (ICY), with a reason from the list and its own
//     words, before accepting the confidentiality terms. The buyer reads both
//     on the invitee table. sup-007, the demo supplier seat, has said nothing
//     anywhere, so the whole intent path is open to it.

/** @type {readonly RfxIntentRecord[]} */
export const RFI_INTENT_SEED = [
  { id: 'rfii-0001', eventId: 'rfi-001', supplierId: 'sup-013', intent: 'respond', at: at(-2) }
];

/** @type {readonly RfxIntentRecord[]} */
export const RFP_INTENT_SEED = [
  {
    id: 'rfpi-0001',
    eventId: 'rfp-003',
    supplierId: 'sup-015',
    intent: 'decline',
    reason: 'notOurProduct',
    text: 'We fill lip products but do not develop formulas. We could quote filling and the pack only.',
    at: at(-1)
  }
];

// ── REQ-E03-03 / REQ-E03-05 — the two sourcing events ───────────────────────

/**
 * Added to the RFQ store BESIDE the legacy fixture set, not into it: the legacy
 * rows carry hand-written 2026-05 dates and no present-relative meaning, and
 * re-dating them would move thirteen documents nine specs depend on.
 * @type {readonly RFQ[]}
 */
export const RFX_RFQ_SEED = [
  {
    id: 'rfq-014',
    rfqNumber: 'RFQ-2026-014',
    title: 'PET bottle 100ml and flip-top cap — Q4 2026 tender',
    materialCategory: 'Packaging',
    materialIds: ['PK-PETB-8802', 'PK-CAPF-8820'],
    buyerId: 'buyer-001',
    status: 'Closed',
    createdAt: day(-21),
    responseDeadline: day(-2),
    awardDeadline: day(9),
    invitedSupplierIds: ['sup-007', 'sup-008', 'sup-013', 'sup-015'],
    respondedSupplierIds: ['sup-007', 'sup-008', 'sup-013', 'sup-015'],
    totalQty: 900_000,
    uom: 'PCS',
    estimatedValue: 1_260_000_000,
    currency: 'IDR',
    incoterms: 'DDP Jakarta',
    paymentTerms: 'Net 60',
    sourceRfiId: 'rfi-001',
    lineItems: [
      {
        lineNo: 1,
        materialCode: 'PK-PETB-8802',
        description: 'PET Bottle 100ml Clear — Emina Series',
        quantity: 600_000,
        uom: 'PCS',
        specification: 'Food-grade PET, 24mm neck finish, 100ml fill'
      },
      {
        lineNo: 2,
        materialCode: 'PK-CAPF-8820',
        description: 'Flip-Top Cap 24mm',
        quantity: 300_000,
        uom: 'PCS',
        specification: 'PP flip-top, 24mm, induction liner'
      }
    ],
    extensions: []
  },
  {
    id: 'rfq-015',
    rfqNumber: 'RFQ-2026-015',
    title: 'Shipper box — 2026 H2 dual source',
    materialCategory: 'Packaging',
    materialIds: ['PK-CART-9910'],
    buyerId: 'buyer-001',
    status: 'Awarded',
    createdAt: day(-46),
    responseDeadline: day(-25),
    awardDeadline: day(-12),
    invitedSupplierIds: ['sup-007', 'sup-008', 'sup-013', 'sup-015'],
    respondedSupplierIds: ['sup-008', 'sup-015', 'sup-007'],
    totalQty: 400_000,
    uom: 'PCS',
    estimatedValue: 520_000_000,
    currency: 'IDR',
    incoterms: 'DDP Jakarta',
    paymentTerms: 'Net 45',
    awardedSupplierId: 'sup-015',
    awardedQuotationId: 'qt-015a',
    lineItems: [
      {
        lineNo: 1,
        materialCode: 'PK-CART-9910',
        description: 'Shipper Box — Emina Bright Stuff Range (12-pack)',
        quantity: 400_000,
        uom: 'PCS',
        specification: 'E-flute, four-colour print, recycled board'
      }
    ],
    extensions: []
  }
];

/**
 * @param {string} materialCode
 * @param {number} quantity
 * @param {number} unitPrice
 * @param {number} lineNo
 */
const lineQuote = (materialCode, quantity, unitPrice, lineNo, uom = 'PCS') => ({
  lineNo,
  materialCode,
  quantity,
  uom,
  unitPrice
});

/**
 * Sum of quantity × unit price — the header total a lined quote derives.
 * @param {readonly { quantity: number; unitPrice: number }[]} lines
 * @returns {number}
 */
const linesTotal = (lines) => lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

const RFQ014_LINES = /** @type {const} */ ({
  'sup-007': [
    lineQuote('PK-PETB-8802', 600_000, 1_150, 1),
    lineQuote('PK-CAPF-8820', 300_000, 720, 2)
  ],
  'sup-008': [
    lineQuote('PK-PETB-8802', 600_000, 1_240, 1),
    lineQuote('PK-CAPF-8820', 300_000, 690, 2)
  ],
  'sup-013': [
    lineQuote('PK-PETB-8802', 600_000, 1_090, 1),
    lineQuote('PK-CAPF-8820', 300_000, 760, 2)
  ],
  'sup-015': [
    lineQuote('PK-PETB-8802', 600_000, 1_120, 1),
    lineQuote('PK-CAPF-8820', 300_000, 700, 2)
  ]
});

const RFQ015_LINES = /** @type {const} */ ({
  'sup-007': [lineQuote('PK-CART-9910', 400_000, 1_390, 1)],
  'sup-008': [lineQuote('PK-CART-9910', 400_000, 1_280, 1)],
  'sup-015': [lineQuote('PK-CART-9910', 400_000, 1_310, 1)]
});

/**
 * ⚠️ **THE STORED SCORE FIELDS ARE NOT WHAT THE COMPARISON SHOWS.** `priceScore`
 * / `leadTimeScore` / `reliabilityScore` / `aiCompositeScore` are the retired
 * hand-authored axes (the fabricated-score root cause, F0.3-FIND-01); the
 * comparison COMPUTES all four through `scoreQuotations`, with reliability read
 * from the supplier's OTIF (CR-15). They are written 0 here rather than filled
 * with plausible numbers precisely so that a surface reading them by mistake
 * shows an obvious zero instead of a number nobody derived. `complianceScore` is
 * the one that is still an INPUT — declared SIMULATED, passed through verbatim.
 */
const retiredAxes = {
  priceScore: 0,
  leadTimeScore: 0,
  reliabilityScore: 0,
  aiCompositeScore: 0,
  aiRecommended: false
};

/** @type {readonly Quotation[]} */
export const RFX_QUOTATION_SEED = [
  // — rfq-014: four quotes, closed, ready for negotiation ——————————————
  {
    id: 'qt-014a',
    rfqId: 'rfq-014',
    supplierId: 'sup-007',
    submittedAt: day(-6),
    unitPrice: 1_150,
    totalPrice: linesTotal(RFQ014_LINES['sup-007']),
    currency: 'IDR',
    leadTimeDays: 21,
    moq: 50_000,
    paymentTermsOffered: 'Net 60',
    validUntil: day(30),
    complianceScore: 92,
    ...retiredAxes,
    status: 'Under Review',
    notes: 'Tooling shared, first article in three weeks.',
    lines: RFQ014_LINES['sup-007'],
    roundNumber: 0
  },
  {
    id: 'qt-014b',
    rfqId: 'rfq-014',
    supplierId: 'sup-008',
    submittedAt: day(-5),
    unitPrice: 1_240,
    totalPrice: linesTotal(RFQ014_LINES['sup-008']),
    currency: 'IDR',
    leadTimeDays: 28,
    moq: 20_000,
    paymentTermsOffered: 'Net 45',
    validUntil: day(25),
    complianceScore: 74,
    ...retiredAxes,
    status: 'Under Review',
    lines: RFQ014_LINES['sup-008'],
    roundNumber: 0
  },
  {
    // The bidder with NO OTIF HISTORY — cheapest on the preform line, and the
    // one the comparison must describe honestly rather than score at zero.
    id: 'qt-014c',
    rfqId: 'rfq-014',
    supplierId: 'sup-013',
    submittedAt: day(-4),
    unitPrice: 1_090,
    totalPrice: linesTotal(RFQ014_LINES['sup-013']),
    currency: 'IDR',
    leadTimeDays: 24,
    moq: 100_000,
    paymentTermsOffered: 'Net 30',
    validUntil: day(21),
    complianceScore: 68,
    ...retiredAxes,
    status: 'Under Review',
    notes: 'First tender with PTI.',
    lines: RFQ014_LINES['sup-013'],
    roundNumber: 0
  },
  {
    id: 'qt-014d',
    rfqId: 'rfq-014',
    supplierId: 'sup-015',
    submittedAt: day(-3),
    unitPrice: 1_120,
    totalPrice: linesTotal(RFQ014_LINES['sup-015']),
    currency: 'IDR',
    leadTimeDays: 18,
    moq: 50_000,
    paymentTermsOffered: 'Net 60',
    validUntil: day(28),
    complianceScore: 90,
    ...retiredAxes,
    status: 'Under Review',
    lines: RFQ014_LINES['sup-015'],
    roundNumber: 0
  },
  {
    // Round 1, sup-015 has answered. The version it supersedes is KEPT above
    // (AC-03) — a revision never overwrites the bid it improves on.
    id: 'qt-014d-r1',
    rfqId: 'rfq-014',
    supplierId: 'sup-015',
    submittedAt: at(-1),
    unitPrice: 1_080,
    totalPrice: linesTotal([
      lineQuote('PK-PETB-8802', 600_000, 1_080, 1),
      lineQuote('PK-CAPF-8820', 300_000, 680, 2)
    ]),
    currency: 'IDR',
    leadTimeDays: 18,
    moq: 50_000,
    paymentTermsOffered: 'Net 60',
    validUntil: day(28),
    complianceScore: 90,
    ...retiredAxes,
    status: 'Under Review',
    notes: 'Revised against the target; tooling contribution unchanged.',
    lines: [
      lineQuote('PK-PETB-8802', 600_000, 1_080, 1),
      lineQuote('PK-CAPF-8820', 300_000, 680, 2)
    ],
    roundNumber: 1,
    supersedesQuotationId: 'qt-014d'
  },
  // — rfq-015: the two-supplier split award ————————————————————————————
  {
    id: 'qt-015a',
    rfqId: 'rfq-015',
    supplierId: 'sup-015',
    submittedAt: day(-30),
    unitPrice: 1_310,
    totalPrice: linesTotal(RFQ015_LINES['sup-015']),
    currency: 'IDR',
    leadTimeDays: 18,
    paymentTermsOffered: 'Net 45',
    validUntil: day(-2),
    complianceScore: 90,
    ...retiredAxes,
    status: 'Awarded',
    lines: RFQ015_LINES['sup-015'],
    roundNumber: 0
  },
  {
    id: 'qt-015b',
    rfqId: 'rfq-015',
    supplierId: 'sup-008',
    submittedAt: day(-29),
    unitPrice: 1_280,
    totalPrice: linesTotal(RFQ015_LINES['sup-008']),
    currency: 'IDR',
    leadTimeDays: 28,
    paymentTermsOffered: 'Net 45',
    validUntil: day(-2),
    complianceScore: 74,
    ...retiredAxes,
    status: 'Awarded',
    lines: RFQ015_LINES['sup-008'],
    roundNumber: 0
  },
  {
    id: 'qt-015c',
    rfqId: 'rfq-015',
    supplierId: 'sup-007',
    submittedAt: day(-28),
    unitPrice: 1_390,
    totalPrice: linesTotal(RFQ015_LINES['sup-007']),
    currency: 'IDR',
    leadTimeDays: 21,
    paymentTermsOffered: 'Net 45',
    validUntil: day(-2),
    complianceScore: 92,
    ...retiredAxes,
    status: 'Rejected',
    lines: RFQ015_LINES['sup-007'],
    roundNumber: 0
  }
];

// ── REQ-E03-05 — the open round and the recorded award ──────────────────────

/** @type {readonly NegotiationRound[]} */
export const NEGOTIATION_ROUND_SEED = [
  {
    id: 'nr-0001',
    rfqId: 'rfq-014',
    roundNumber: 1,
    openedAt: at(-2),
    // Closes inside the window that puts it on the buyer's Home list.
    deadline: day(2),
    invitedSupplierIds: ['sup-007', 'sup-015'],
    message:
      'Both bids are close. We are looking for a bottle price at or below 1,080 with the lead time held.',
    targetUnitPrice: 1_080,
    bestAndFinal: false,
    closed: false
  }
];

/** @type {readonly AwardRecord[]} */
export const AWARD_SEED = [
  {
    id: 'aw-0001',
    eventType: 'rfq',
    eventId: 'rfq-015',
    awardedAt: at(-12),
    // A legacy RFQ's line item has one break: its own quantity (RFx C1).
    lines: [
      {
        supplierId: 'sup-015',
        quotationId: 'qt-015a',
        itemCode: 'PK-CART-9910',
        sharePct: 70,
        quantity: 280_000,
        splitBasis: 'pct',
        awardTierQty: 400_000
      },
      {
        supplierId: 'sup-008',
        quotationId: 'qt-015b',
        itemCode: 'PK-CART-9910',
        sharePct: 30,
        quantity: 120_000,
        splitBasis: 'pct',
        awardTierQty: 400_000
      }
    ],
    reason:
      'Dual sourced for supply security: the second source covers the single die-cutting line risk.',
    bestScoredQuotationId: 'qt-015a',
    notAwardedSupplierIds: ['sup-007']
  }
];
