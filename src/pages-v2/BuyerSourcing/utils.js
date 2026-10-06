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
/** @import { DraftRfq, GroupTab, PinDraft } from './const' */
import { FileText, CheckCircle2, Send, ClipboardCheck, Trophy, Archive } from 'lucide-react';
import { isRfqCategory, isRfqUom } from '../sourcing/requisitionPrefill';
import { newItemDraft } from '../sourcing/rfqDraft';
import { formatDate } from '@lib/format';
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

/**
 * Whether an RFQ belongs to a board tab.
 * @param {RFQ} r
 * @param {GroupTab} group
 * @returns {boolean}
 */
export const matchesGroup = (r, group) => {
  if (group === 'all') return true;
  if (group === 'open') return r.status === 'Open' && !isAllResponded(r);
  if (group === 'pending') return r.status === 'Open' && isAllResponded(r);
  if (group === 'awarded') return r.status === 'Awarded';
  if (group === 'closed') return r.status === 'Closed' || r.status === 'Cancelled';
  return true;
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
  incoterms: 'CIF Jakarta',
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
