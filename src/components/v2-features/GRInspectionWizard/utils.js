// ────────────────────────────────────────────────────────────────────────────
// GRInspectionWizard — pure helpers (no React): the line-draft shape, the two
// regulatory seeds, and the builders that turn a dock shipment or a live ASN
// into a receivable GR source.
// ────────────────────────────────────────────────────────────────────────────

/** @import { Shipment, ASN } from '@services/data/types' */
/** @import { UseFormReturn } from 'react-hook-form' */
import { seedQty } from '../grLineQuantities';
import { bpomOf } from '@services/sdc/bpom';
/** @import { BpomOutcome } from '@services/sdc/bpom' */
import { halalOf } from '@services/sdc/halal';
/** @import { HalalOutcome } from '@services/sdc/halal' */

/** @typedef {'shipment' | 'manual'} SourceMode */

/**
 * @typedef {object} LineDraft
 * @property {string} lineKey The row's React key: the source's id plus the line's position in that
 *   shipment / ASN, given once by the draft builders. Source lines carry no id
 *   and one material can appear on two lines (two lots), so materialCode is not
 *   unique; the receipt never adds, removes or reorders a line, so the position
 *   is fixed, and the source id makes a source switch remount the rows instead
 *   of reusing the previous source's. Never sent: the result names its fields.
 * @property {string} materialCode
 * @property {string} description
 * @property {number} qtyExpected
 * @property {string} qtyReceivedRaw RAW-BACKED (2f-a). `number` had no representation for "blank", so there was
 *   no string to parse and therefore no parse boundary to fix — converting the
 *   draft IS the fix, not a means to it. Same shape as QuoteForm.unitPrice,
 *   DraftRfq.totalQty and IntakeAdjustDrawer's acceptedRaw.
 * @property {string} qtyAcceptedRaw
 * @property {string} rejectionReason
 * @property {'Pass' | 'Fail'} visualCheck
 * @property {'Pass' | 'Fail' | 'N/A'} packagingCheck
 * @property {HalalOutcome} halal The halal gate, read ONCE from the material master (`halalOf`).
 *
 *   ⚠️ **NOT A BOOLEAN, and that is the whole of `INFERHALAL-READS-PROSE-01`'s
 *   fix.** The field this replaces was `halalRequired: boolean`, seeded by
 *   testing whether a SUPPLIER-TYPED `description` contained the substring
 *   `halal` — three defects on one line: a miss was a silent confident `false`,
 *   `"non-halal"` turned the check ON, and the four fixture labels it did fire
 *   on were the four CLAIMING THE MATERIAL ALREADY IS HALAL (an answer, read as
 *   a question). A boolean also has no room for *nobody has ruled*. The outcome
 *   type can refuse, and `qualityValid` blocks on a refusal.
 * @property {'Pass' | 'Fail'} [halalSealCheck] The halal seal answer, or ABSENT because nobody has given one.
 *
 *   ⚠️ **THIS IS THE SEAL CHECK AND ONLY THE SEAL CHECK** (Seat 3's three-fact
 *   split): a HUMAN's attestation at the dock, about a physical seal. It is NOT
 *   certificate verification — that is a lookup against the compliance registry,
 *   with its own clock and its own answerer, and it is **H3 (headless) / H4
 *   (wired, gated on `D-COMP-HALAL-4`)**. A `'Pass'` here means an inspector saw
 *   a seal; it does not mean a certificate is valid, and nothing in this file
 *   may make it mean that.
 *
 *   ⚠️ The `?` is the whole point and it always was — `'Pass' | 'Fail'` has no
 *   room for *unanswered*, so `undefined` IS the third state. What was wrong was
 *   never the type; it was that the builders never let `undefined` survive
 *   contact with a required line (`REQUIRED-OPENS-PRE-ANSWERED-01`).
 * @property {BpomOutcome} bpom The BPOM gate, read ONCE from the material master (`bpomOf`).
 *
 *   ⚠️ **NOT A BOOLEAN, and that is the whole of `INFERBPOM-REGULATORY-01`'s
 *   fix.** The field this replaces was `bpomRequired: boolean`, seeded from a
 *   code-prefix parse, and a boolean has no room for *nobody has ruled* — so
 *   every material the rule did not recognise came back `false`, and `false` is
 *   an ASSERTION ("this lot needs no BPOM check"). The outcome type can refuse,
 *   and `qualityValid` blocks on a refusal.
 * @property {'Pass' | 'Fail'} [bpomLotCheck] -  The BPOM lot answer, or ABSENT because nobody has given one — see
 *    `halalSealCheck` above and `seedBpom` below.
 * @property {boolean} labSampleRequired
 * @property {string} [labRequestId]
 */

/**
 * The wizard's draft: every value a clerk edits, held in one react-hook-form
 * `useForm` (frontend-standard "Forms"). Nothing here is validated by
 * react-hook-form — the gates are derived from these values in
 * `useInspectionDraft`, exactly as they were over the `useState` draft.
 * @typedef {object} GrDraft
 * @property {SourceMode} sourceMode Step 1: the dock list or a typed ASN number.
 * @property {string} selectedSourceId Step 1: the picked dock source's id.
 * @property {string} manualASN Step 1: the typed ASN number, untrimmed.
 * @property {string} receivedDate Step 2.
 * @property {string} receivedBy Step 2: a `ROLES` value, recorded verbatim.
 * @property {string} warehouse Step 2: a `LOCATIONS` value.
 * @property {string} notes Step 2.
 * @property {LineDraft[]} lines Steps 2 and 3: one draft per source line.
 * @property {string} dispositionReason Step 4: owed only by a Rejected roll-up.
 * @property {boolean} autoPostSap Step 4.
 * @property {string} finalNotes Step 4.
 */

/**
 * The react-hook-form handle every step reads through `useFormContext()`.
 * @typedef {UseFormReturn<GrDraft>} GrDraftForm
 */

// A normalized GR source — a shipment at dock OR a live submitted ASN. The dock
// list is the union of both; live ASNs without a dock appointment are labelled
// honestly (dock scheduling arrives via the TMS boundary, INT-TMS-01).
/**
 * shipment id, or `asn:<number>` for a store ASN
 *
 * @typedef {object} GrSource
 * @property {string} id
 * @property {string} asnNumber
 * @property {string} poNumber
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} dockLabel
 * @property {string} dockTime
 * @property {LineDraft[]} lines
 */

/**
 * A quantity in the Indonesian grouping the dock reads (`1.500`).
 * @param {number} n
 */
export const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n);

// ── ✅ CP-3 · H2 — `inferHalal` IS DELETED. THE PROSE PARSE IS GONE ──────────
// What stood here was a 40-line comment explaining why a live regulatory
// fail-open was being left in place. It is replaced by the fix, and the record
// of what was removed is kept because a retired rule has to be restated
// somewhere to prove it is retired (`bpomApplicability.test.js`'s precedent):
//
//   const inferHalal = (description: string): boolean =>
//     description.toLowerCase().includes('halal');
//
// ⚠️ THREE DISTINCT DEFECTS ON THAT ONE LINE, and they fail in three directions:
//   1. **FAILS OPEN.** A substring miss is a confident `false` — an ASSERTION
//      that no halal check is owed — arrived at silently.
//   2. **FAILS CLOSED ON NEGATION.** No word boundary, no negation handling:
//      `"non-halal"`, `"not halal certified"` and `"halal audit failed"` all
//      turn the check ON.
//   3. **IT READS AN ANSWER AND RETURNS A QUESTION**
//      (`HALAL-PROSE-READS-AN-ANSWER-01`). The four master labels it fired on
//      are the four that CLAIM THE MATERIAL ALREADY IS HALAL — *Halal
//      Certified*, *(Halal Emulsifier)*. A claim of compliance is the thing that
//      would make a check unnecessary; the rule treated it as the trigger.
//
// And it read `description`, which on the ASN lane is SUPPLIER-SUBMITTED FREE
// TEXT. C9 §3 forbids deriving semantics from `materialCode` because we do not
// promise its shape; deriving them from prose a counterparty types is the same
// class on a weaker input.
//
// ⚠️ THE BEHAVIOUR MOVED, AND IT MOVED IN ONE DIRECTION. The parse reached ZERO
// of the nine receivable lines. `halalOf` reaches all nine: FIVE gain a question
// that was never asked, FOUR change from a silent `false` to an honest refusal,
// and NOTHING moves from checked to unchecked. See `docs/findings.md` → H2.

/**
 * The BPOM gate for one line. **NO seeded check value — that is the fix.**
 *
 * ONE read, shared by both draft builders — the shipment lane and the ASN lane
 * cannot disagree about whether a material needs a BPOM lot check, because
 * neither of them decides it.
 *
 * ⚠️ **`REQUIRED-OPENS-PRE-ANSWERED-01` CLOSED HERE.** This returned
 * `bpomLotCheck: bpom.ok && bpom.applicable ? 'Pass' : undefined` — so the
 * moment the master ruled a lot APPLICABLE, the form ANSWERED the question it
 * had just decided to ask. A derived fact hand-stamped, on a regulatory
 * control. `bpomLotCheck` now starts absent and STAYS absent until a human
 * ticks it; `qualityValid` already blocked on `applicable && !bpomLotCheck`,
 * so removing the stamp is what activates a gate that was written correctly
 * and could never fire.
 *
 * **THE SEED IS NOT REPLACED BY A DIFFERENT SEED.** There is no `'Pending'`
 * token, no third radio option, no `null` sentinel — absence is absence, and
 * the three states are told apart by the SHAPE of the surface: no row (not
 * required) · row with nothing selected + an unanswered marker (required,
 * unanswered) · row with a selection (required, answered).
 * @param {string} materialCode
 * @returns {Pick<LineDraft, 'bpom' | 'bpomLotCheck'>}
 */
const seedBpom = (materialCode) => ({
  bpom: bpomOf(materialCode),
  bpomLotCheck: undefined
});

/**
 * The halal gate for one line — CP-3 · H2, and the exact shape of `seedBpom`.
 *
 * ONE read, shared by both draft builders, for the same reason: the shipment
 * lane and the ASN lane cannot disagree about whether a material needs a halal
 * check, because **neither of them decides it**. The old code had each builder
 * call the prose parse on its own `description` — two lanes, two different
 * strings, one regulatory question, and no guarantee they agreed.
 *
 * **NO SEEDED ANSWER**, on the `REQUIRED-OPENS-PRE-ANSWERED-01` ruling: the
 * question and the answer are different facts with different answerers.
 * `halalSealCheck` starts absent and stays absent until a human ticks it.
 * @param {string} materialCode
 * @returns {Pick<LineDraft, 'halal' | 'halalSealCheck'>}
 */
const seedHalal = (materialCode) => ({
  halal: halalOf(materialCode),
  halalSealCheck: undefined
});

/**
 * The line drafts for a shipment at the dock: one per line item, quantities
 * seeded from the shipped quantity, both regulatory gates read from the master.
 * @param {Shipment} s
 * @returns {LineDraft[]}
 */
const buildDraftFromShipment = (s) =>
  s.lineItems.map((li, n) => ({
    lineKey: `${s.id}#${n + 1}`,
    materialCode: li.materialCode,
    description: li.description,
    qtyExpected: li.qty,
    qtyReceivedRaw: seedQty(li.qty),
    qtyAcceptedRaw: seedQty(li.qty),
    rejectionReason: '',
    visualCheck: 'Pass',
    packagingCheck: 'Pass',
    // ⚠️ CP-3 · H2 — BOTH regulatory gates now read the MATERIAL CODE through
    // the master. Neither reads `description`, which stays on the draft for
    // DISPLAY only.
    ...seedHalal(li.materialCode),
    ...seedBpom(li.materialCode),
    labSampleRequired: false
  }));

/**
 * The line drafts for a live ASN: expected = ordered, received and accepted
 * seeded from the shipped quantity.
 * @param {ASN} a
 * @returns {LineDraft[]}
 */
const buildDraftFromAsn = (a) =>
  a.lineItems.map((li, n) => ({
    lineKey: `asn:${a.asnNumber}#${n + 1}`,
    materialCode: li.materialCode,
    description: li.description,
    qtyExpected: li.orderedQty,
    qtyReceivedRaw: seedQty(li.shippedQty),
    qtyAcceptedRaw: seedQty(li.shippedQty),
    rejectionReason: '',
    visualCheck: 'Pass',
    packagingCheck: 'Pass',
    ...seedHalal(li.materialCode),
    ...seedBpom(li.materialCode),
    labSampleRequired: false
  }));

/**
 * A dock shipment as a GR source.
 * @param {Shipment} s
 * @returns {GrSource}
 */
export const sourceFromShipment = (s) => ({
  id: s.id,
  asnNumber: s.asnNumber,
  poNumber: s.poNumber,
  supplierId: s.supplierId,
  supplierName: s.supplierName,
  dockLabel: s.dockAssignment ?? 'Pending dock',
  dockTime: s.dockTime ?? '—',
  lines: buildDraftFromShipment(s)
});

/**
 * A live ASN as a GR source.
 * @param {ASN} a
 * @returns {GrSource}
 */
export const sourceFromAsn = (a) => ({
  id: `asn:${a.asnNumber}`,
  asnNumber: a.asnNumber,
  poNumber: a.poReference,
  supplierId: a.supplierId,
  // The ASN carries no supplierName; its create stamps the supplier name into
  // details.originCity (else fall back to the id).
  supplierName: a.details.originCity || a.supplierId,
  dockLabel: 'No dock appointment',
  dockTime: 'Scheduled via TMS',
  lines: buildDraftFromAsn(a)
});
