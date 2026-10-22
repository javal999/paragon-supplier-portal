// ────────────────────────────────────────────────────────────────────────────
// BuyerSourcing — pure helpers (no React state, no hooks).
//
// Moved out of `BuyerSourcing.jsx` by the Phase 5 page split (no behaviour
// change): the RFQ group/footer rules, the lifecycle timeline, and the draft
// builders the RFQ wizard opens with.
// ────────────────────────────────────────────────────────────────────────────

/** @import { TFunction } from 'i18next' */
/** @import { TimelineEvent } from '@components/ui-v2/Timeline' */
/** @import { RFQ, RFQCategory } from '@data/mockRfqs' */
/** @import { BidCurrency } from '@lib/currencyPolicy' */
/** @import { FxPin } from '@lib/fxPin' */
/** @import { RequisitionPrefill } from '../sourcing/requisitionPrefill' */
/** @import { RfqDraftSeed } from '../sourcing/rfqDraft' */
/** @import { DraftRfq, GroupTab, KpiFilter, PinDraft } from './const' */
import { FileText, CheckCircle2, Send, ClipboardCheck, Trophy, Archive } from 'lucide-react';
import { isRfqCategory, isRfqUom } from '../sourcing/requisitionPrefill';
import { newItemDraft } from '../sourcing/rfqDraft';
import { formatDate } from '@lib/format';
import { daysUntil } from '@services/data/dayProjection';
import { rfqStageOf } from '../BuyerSourcingEvent/utils';
import { CATEGORY_LABEL_KEY } from './const';

/**
 * The localized label of an RFQ category.
 * @param {TFunction} t
 * @param {RFQCategory} c
 * @returns {string}
 */
export const categoryLabel = (t, c) => t(CATEGORY_LABEL_KEY[c]);

// ⚠️ `REFERENCE_TODAY = new Date('2026-05-18')` AND this page's private
// `daysUntil` ARE DELETED. The pin made every deadline on this board
// deterministic by making it wrong on a schedule nobody was watching, and
// `SupplierRFQs` carried a SECOND pin 23 days adrift — so one RFQ's deadline
// rendered two different day-counts on two surfaces of one app. The clock is
// now injected from the component and the arithmetic lives in
// `services/data/dayProjection`.
/**
 * Whether every invited supplier has responded (and at least one was invited).
 * @param {RFQ} r
 * @returns {boolean}
 */
export const isAllResponded = (r) =>
  r.invitedSupplierIds.length > 0 && r.respondedSupplierIds.length === r.invitedSupplierIds.length;

// ── 2e-b-3 (COS-04) — the shadowing locals are retired ───────────────────────
//
// This file carried its own `formatIDR`, `formatNumber` and `formatDate`, each a
// near-copy of the `lib/format` primitive of the same name. Same names, different
// behaviour — which is the whole problem: `formatDate` hardcoded `en-GB`, so the
// buyer's dates stayed English in Indonesian mode while every migrated page
// localised, and it dropped the `Asia/Jakarta` pin, so a date rendered by the
// runner's timezone instead of the business one. All three now come from
// `lib/format` (imported at the top), which is nullish-safe by contract.
//
// `formatMoney` STAYS: it is the currency-aware leg (CI-2) and `lib/format` has
// no equivalent — a quote may be priced in USD. Consolidating it belongs to the
// currency ruling (FIND-01 / 2e-c), not here.
//
// 2e-c-2 — `formatMoney` MOVED to `lib/format`, next to the rest of the app's
// money, and its currency argument is now REQUIRED. It lived here because
// `lib/format` had no currency-aware leg; the comment above recorded that
// consolidating it belonged to the currency ruling. This is that ruling.
// 2e-c-1-FIND-01 (a EUR bid rendering "€3") is closed in the moved
// implementation: EUR renders en-IE "€2.85" by operator ruling.

/**
 * A blank FX-pin draft for one currency, optionally superseding a pin.
 * @param {BidCurrency} currency
 * @param {FxPin} [superseding]
 * @returns {PinDraft}
 */
export const blankPinDraft = (currency, superseding) => ({
  currency,
  // Deliberately EMPTY, never seeded from the pin being superseded: a
  // pre-filled rate invites a buyer to accept the old number as if it were the
  // new one, which is precisely the edit-in-place behaviour D-1 forbids.
  rate: '',
  asOf: '',
  source: 'MANUAL',
  rateType: '',
  ...(superseding ? { superseding } : {})
});

/**
 * The RFQ's lifecycle as Timeline events (drafted → … → closed).
 * @param {RFQ} r
 * @param {TFunction} t
 * @returns {TimelineEvent[]}
 */
export const buildTimeline = (r, t) => {
  const totalInvited = r.invitedSupplierIds.length;
  const responded = r.respondedSupplierIds.length;
  const allResponded = isAllResponded(r);

  const isDraft = r.status === 'Draft';
  const isOpen = r.status === 'Open';
  const isAwarded = r.status === 'Awarded';
  const isClosed = r.status === 'Closed' || r.status === 'Cancelled';

  return [
    {
      id: 'drafted',
      title: t('sourcing.timeline.drafted'),
      timestamp: formatDate(r.createdAt),
      status: 'completed',
      icon: FileText
    },
    {
      id: 'sent',
      title: t(
        totalInvited === 1 ? 'sourcing.timeline.sentTo.one' : 'sourcing.timeline.sentTo.other',
        { count: totalInvited }
      ),
      timestamp: isDraft ? undefined : formatDate(r.createdAt),
      status: isDraft ? 'pending' : 'completed',
      icon: Send
    },
    {
      id: 'responses',
      title: t('sourcing.timeline.responses', {
        responded,
        total: totalInvited
      }),
      timestamp:
        responded > 0
          ? t('sourcing.timeline.latest', {
              date: formatDate(r.responseDeadline)
            })
          : undefined,
      status: isDraft ? 'pending' : allResponded || isAwarded || isClosed ? 'completed' : 'current',
      icon: CheckCircle2
    },
    {
      id: 'evaluation',
      title: t('sourcing.timeline.evaluation'),
      status: isAwarded || isClosed ? 'completed' : allResponded && isOpen ? 'current' : 'pending',
      icon: ClipboardCheck
    },
    {
      id: 'awarded',
      title: t('sourcing.timeline.awarded'),
      timestamp: isAwarded ? formatDate(r.awardDeadline) : undefined,
      status: isAwarded ? 'completed' : isClosed ? 'pending' : 'pending',
      icon: Trophy
    },
    {
      id: 'closed',
      title: t('sourcing.timeline.closed'),
      status: isClosed ? 'completed' : 'pending',
      icon: Archive
    }
  ];
};

/**
 * THE PANEL FOOTER'S ONE ACT, or `null` when there is no act to offer.
 *
 * ⚠️ **EVERY LABEL HERE NOW HAS A DESTINATION, AND THE ONES THAT HAD NONE ARE
 * GONE.** The button used to render one of five labels with NO handler at all.
 * Award and View award now open the event page at its award section, where the
 * award verb and the award record live; a Closed or Cancelled RFQ opens the
 * event page (a Closed one can still be awarded there). "Send reminder" and
 * "Continue draft" are withdrawn: no reminder write path exists for an RFQ, so
 * a reminder button would be a promise. A Draft's act is **Edit draft**
 * (BL-93), offered in the panel's lifecycle section beside Publish, where its
 * handoff notice lives — not duplicated here.
 * "View final report" is withdrawn with them — there is no report.
 * @param {RFQ} r
 * @returns {{ labelKey: string; to: string } | null}
 */
export const FOOTER_ACTION = (r) => {
  const event = `/buyer/rfq/${r.id}`;
  if (r.status === 'Open') {
    return isAllResponded(r)
      ? { labelKey: 'sourcing.footer.awardRfq', to: `${event}?section=award` }
      : null;
  }
  if (r.status === 'Awarded')
    return { labelKey: 'sourcing.footer.viewAward', to: `${event}?section=award` };
  if (r.status === 'Closed' || r.status === 'Cancelled') {
    return { labelKey: 'rfqCompare.footer.openEvent', to: event };
  }
  return null;
};

/**
 * The footer label, or `null` when the footer offers no act.
 * @param {RFQ} r
 * @param {TFunction} t
 * @returns {string | null}
 */
export const FOOTER_LABEL = (r, t) => {
  const action = FOOTER_ACTION(r);
  return action ? t(action.labelKey) : null;
};

// ⚠️ §68 — THIS USED TO RETURN `'primary'` FOR THE AWARD STATE. DP2-BUTTON-01
// reserved solid action-blue for the irreversible commit and Award was the one
// verb on this surface that qualified. The reserved-solid register is retired
// portal-wide (operator ruling), so every state — Award included — is the calm
// action-blue OUTLINE CTA.
//
// The FUNCTION survives rather than being inlined, and deliberately: it is the
// single place this surface's footer register is decided, so a future state
// that wants a different one has an obvious seat, and the spec that used to
// pin "Award is solid" now pins "nothing is" against the same seam.
/**
 * The footer button's register — always the outline CTA (§68).
 * @param {RFQ} _r
 * @returns {'outline'}
 */
export const FOOTER_VARIANT = (_r) => 'outline';

// A spread fraction as a signed percent (+8% / −3% / 0%), real minus for polish.
/**
 * @param {number} frac
 * @returns {string}
 */
export const fmtSignedPct = (frac) => {
  const pct = Math.round(frac * 100);
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct)}%`;
};

// ── RFx UX 1D (B-04) — the board as a work queue ─────────────────────────────
//
// "Needs my action" is DERIVED, never stored: the buyer's next act on an RFQ is
// the stage the event page's stage bar names (`rfqStageOf`, lane 1C), read from
// the status, the suppliers with a quote, the negotiation rounds and the awards
// in force. Waiting on suppliers is not the buyer's act, so an RFQ with no quote
// in has nothing to review or award and is not in the queue.

/** @typedef {'send' | 'quotes' | 'round' | 'award' | 'sap'} RfqNextStep */

/**
 * The buyer's next act on an RFQ, or `null` when nothing is the buyer's to do.
 * @param {RFQ} r
 * @param {{ quoted: number; rounds: readonly { closed: boolean }[]; inForce: readonly { status: string; lines: readonly unknown[] }[] }} ctx
 * @returns {RfqNextStep | null}
 */
export const rfqNextStep = (r, { quoted, rounds, inForce }) => {
  const { next } = rfqStageOf({
    status: r.status,
    invited: r.invitedSupplierIds.length,
    quoted,
    rounds,
    inForce
  });
  if (next === 'none' || next === 'cancelled') return null;
  if ((next === 'quotes' || next === 'award') && quoted === 0) return null;
  return next;
};

/**
 * Whether an RFQ belongs to a board tab. `next` is its `rfqNextStep`.
 * @param {RFQ} r
 * @param {GroupTab} group
 * @param {RfqNextStep | null} next
 * @returns {boolean}
 */
export const matchesGroup = (r, group, next) => {
  if (group === 'action') return next !== null;
  if (group === 'open') return r.status === 'Open' && !isAllResponded(r);
  // A partly awarded RFQ still has an award to finish, so it waits here.
  if (group === 'pending')
    return (r.status === 'Open' && isAllResponded(r)) || r.status === 'Partly awarded';
  if (group === 'draft') return r.status === 'Draft';
  if (group === 'awarded') return r.status === 'Awarded';
  if (group === 'closed') return r.status === 'Closed' || r.status === 'Cancelled';
  return false;
};

/**
 * Whether an RFQ is counted by a KPI tile — the one predicate behind the tile's
 * number and the rows it filters to, so the two cannot disagree.
 * @param {RFQ} r
 * @param {KpiFilter} kpi
 * @param {string} nowIso
 * @returns {boolean}
 */
export const matchesKpi = (r, kpi, nowIso) => {
  if (kpi === 'active') return r.status === 'Open';
  if (kpi === 'awaiting') {
    if (r.status !== 'Open') return false;
    const d = daysUntil(r.responseDeadline, nowIso);
    // An unreadable deadline is not evidence a response is due this week.
    return d !== null && d <= 7 && d >= 0;
  }
  if (kpi === 'ready') return r.status === 'Open' && isAllResponded(r);
  if (r.status !== 'Awarded') return false;
  const d = daysUntil(r.createdAt, nowIso);
  return d !== null && -d <= 90;
};

/**
 * The deadline the buyer's next act runs against: the response deadline until
 * the RFQ is out of its response window, the award deadline after.
 * @param {RFQ} r
 * @returns {string}
 */
export const nextDeadlineOf = (r) =>
  r.status === 'Draft' || r.status === 'Open' ? r.responseDeadline : r.awardDeadline;

/** @param {RFQ} r */
const isClosedRow = (r) => r.status === 'Closed' || r.status === 'Cancelled';

/**
 * Board order: by next deadline, soonest (and overdue) first, an RFQ with no
 * readable deadline after the dated ones, and Closed or Cancelled last.
 * @param {RFQ} a
 * @param {RFQ} b
 * @returns {number}
 */
export const byNextDeadline = (a, b) => {
  const closed = Number(isClosedRow(a)) - Number(isClosedRow(b));
  if (closed !== 0) return closed;
  const da = nextDeadlineOf(a) || '\uffff';
  const db = nextDeadlineOf(b) || '\uffff';
  if (da !== db) return da < db ? -1 : 1;
  return a.rfqNumber.localeCompare(b.rfqNumber);
};

/**
 * Fold a requisition prefill into a draft.
 *
 * ⚠️ **A NON-MEMBER LEAVES THE FIELD ALONE — IT DOES NOT WRITE A DEFAULT.**
 * `category` becomes `''`, which is the wizard's own "choose one" state and
 * which `isStepValid(0)` already refuses to advance past. `uom` has NO empty
 * member and defaults to 'KG', so a non-member unit leaves whatever was there
 * rather than claiming the requisition said KG — and the review step names the
 * omission, because inside a prefilled form an untouched default is otherwise
 * indistinguishable from a carried value.
 * @param {DraftRfq} base
 * @param {RequisitionPrefill} p
 * @returns {DraftRfq}
 */
export const applyPrefill = (base, p) => ({
  ...base,
  title: p.title,
  totalQty: p.totalQty,
  category: p.category,
  ...(p.uom ? { uom: p.uom } : {}),
  // ⚠️ `materials` IS DELIBERATELY NOT CARRIED. The PR's material is a display
  // string, not an S/4 code (C7 GG-4); `materialIds` are codes the buyer picks
  // from MATERIAL_CATALOG once a category is chosen. See `requisitionPrefill.js`.
  materials: [],
  sourceRequisitionId: p.sourceRequisitionId
});

// ── RFx UX B-12 — the wizard fills what Scope already said ───────────────────

/**
 * The unit an RFQ of this category is usually counted in: pieces for
 * packaging, NONE for `Other` (RFX-D30, owner ruling 2026-10-22: an "other"
 * material has no usual unit, so the buyer picks one and the Scope step waits
 * for it), kilograms for everything else. A default the buyer can change,
 * never a rule: the Scope step's select still offers every unit.
 * @param {RFQCategory | ''} category
 * @returns {DraftRfq['uom']}
 */
export const uomForCategory = (category) =>
  category === 'Packaging' ? 'PCS' : category === 'Other' ? '' : 'KG';

/**
 * The draft with a new category. The materials picked for the old one are
 * cleared (they belong to its catalogue), and the unit follows the category
 * ONLY while it is still the old category's default: a unit the buyer chose,
 * or one a requisition carried, is kept.
 * @param {DraftRfq} d
 * @param {RFQCategory | ''} category
 * @returns {DraftRfq}
 */
export const withCategory = (d, category) => ({
  ...d,
  category,
  materials: [],
  uom: d.uom === uomForCategory(d.category) ? uomForCategory(category) : d.uom
});

/**
 * The draft with its first quantity break seeded from the Scope step's total
 * quantity, as a TOTAL break. Only an empty break list is seeded, and only
 * from a readable whole quantity: a break the buyer set is never replaced, and
 * an unreadable quantity seeds nothing (the Breaks step then asks for one).
 * @param {DraftRfq} d
 * @param {{ ok: true; value: number } | { ok: false }} qty The ONE parse of `totalQty`.
 * @returns {DraftRfq}
 */
export const seedFirstBreak = (d, qty) =>
  d.tiers.length === 0 && qty.ok && Number.isInteger(qty.value) && qty.value > 0
    ? { ...d, tiers: [{ qty: qty.value, basis: 'total' }] }
    : d;

/**
 * A fresh draft. A function, not a constant: every opening gets its own item.
 * @returns {DraftRfq}
 */
export const emptyDraft = () => ({
  title: '',
  category: '',
  materials: [],
  totalQty: '',
  uom: 'KG',
  budget: '',
  responseDeadline: '',
  awardDeadline: '',
  // RFx UX 1D (B-03) — seeded from the Terms step's option list, so the select
  // shows the value the draft stores. FOB by owner ruling (Q4, 2026-10-19):
  // "CIF Jakarta" is not an option, and it used to be the silent default.
  incoterms: 'FOB',
  paymentTerms: 'Net 30',
  currency: 'IDR',
  invitedSupplierIds: [],
  projectName: '',
  items: [newItemDraft('other')],
  tiers: [],
  questions: [],
  allowAlternatives: false,
  samplesOn: false,
  samplesQty: '',
  samplesNeededBy: '',
  confidential: false,
  attachments: []
});

/**
 * Fold a generic seed (RFI, template, past RFQ; an RFP later) into a fresh
 * draft. What the seed does not carry keeps the wizard's default, and a category
 * or unit the RFQ vocabulary does not hold is left for the buyer to choose
 * rather than guessed — the `applyPrefill` rule.
 * @param {DraftRfq} base
 * @param {RfqDraftSeed} seed
 * @returns {DraftRfq}
 */
export const applySeed = (base, seed) => ({
  ...base,
  origin: seed.origin,
  ...(seed.title !== undefined ? { title: seed.title } : {}),
  ...(seed.projectName !== undefined ? { projectName: seed.projectName } : {}),
  ...(seed.category !== undefined && isRfqCategory(seed.category)
    ? { category: seed.category }
    : {}),
  ...(seed.uom !== undefined && isRfqUom(seed.uom) ? { uom: seed.uom } : {}),
  ...(seed.totalQty !== undefined ? { totalQty: seed.totalQty } : {}),
  ...(seed.currency !== undefined ? { currency: seed.currency } : {}),
  ...(seed.incoterms !== undefined ? { incoterms: seed.incoterms } : {}),
  ...(seed.paymentTerms !== undefined ? { paymentTerms: seed.paymentTerms } : {}),
  ...(seed.invitedSupplierIds !== undefined
    ? { invitedSupplierIds: [...seed.invitedSupplierIds] }
    : {}),
  ...(seed.items && seed.items.length > 0 ? { items: [...seed.items] } : {}),
  ...(seed.tiers !== undefined ? { tiers: [...seed.tiers] } : {}),
  ...(seed.questions !== undefined ? { questions: [...seed.questions] } : {}),
  ...(seed.allowAlternatives !== undefined ? { allowAlternatives: seed.allowAlternatives } : {}),
  ...(seed.samplesQty !== undefined ? { samplesOn: true, samplesQty: seed.samplesQty } : {}),
  ...(seed.confidential !== undefined ? { confidential: seed.confidential } : {}),
  // NR-1 BR-11 — the buyer's document requests, from every source.
  ...(seed.documentRequests !== undefined ? { documentRequests: [...seed.documentRequests] } : {}),
  // BL-93 — only `seedForEdit` carries these: an edit is the same event.
  ...(seed.responseDeadline !== undefined ? { responseDeadline: seed.responseDeadline } : {}),
  ...(seed.awardDeadline !== undefined ? { awardDeadline: seed.awardDeadline } : {}),
  ...(seed.samplesNeededBy !== undefined ? { samplesNeededBy: seed.samplesNeededBy } : {}),
  ...(seed.attachments !== undefined ? { attachments: [...seed.attachments] } : {}),
  ...(seed.budget !== undefined ? { budget: seed.budget } : {}),
  ...(seed.materials !== undefined ? { materials: [...seed.materials] } : {}),
  sourceRfiId: seed.sourceRfiId,
  sourceRfpId: seed.sourceRfpId,
  ...(seed.sourceRfpOptionRefs !== undefined
    ? { sourceRfpOptionRefs: [...seed.sourceRfpOptionRefs] }
    : {}),
  copiedFromRfqId: seed.copiedFromRfqId,
  templateId: seed.templateId
});
