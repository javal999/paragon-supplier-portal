/** @import React from 'react' */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  Award,
  Plus,
  Download,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
  ClipboardCheck,
  Trophy,
  Archive,
  Ban,
  RotateCcw,
  Pencil,
  ArrowLeftRight
} from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import ProvenanceMarker from '@components/ui-v2/ProvenanceMarker';
import KpiCard from '@components/ui-v2/KpiCard';
import BulkActionsBar from '@components/ui-v2/BulkActionsBar';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability, useVerbAvailabilities, useNextAct } from '@hooks/useVerbAvailability';
import NextActLine from '@components/ui-v2/NextActLine';
import SubTabs from '@components/ui-v2/SubTabs';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import SearchBar from '@components/ui-v2/SearchBar';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import SidePanel from '@components/ui-v2/SidePanel';
/** @import { TimelineEvent } from '@components/ui-v2/Timeline' */
import Timeline from '@components/ui-v2/Timeline';
import ScoreBadge from '@components/ui-v2/ScoreBadge';
import Data from '@components/ui-v2/Data';
import LivenessPill from '@components/ui-v2/LivenessPill';
import ModelMarker from '@components/ui-v2/ModelMarker';
import Button from '@components/ui-v2/Button';
/** @import { WizardStep } from '@components/ui-v2/Wizard' */
import Wizard from '@components/ui-v2/Wizard';
import ModalOverlay from '@components/ui-v2/ModalOverlay';
/** @import { RequisitionPrefill } from './sourcing/requisitionPrefill' */
import {
  RFQ_CATEGORY_OPTIONS,
  RFQ_UOM_OPTIONS,
  isRfqCategory,
  isRfqUom,
  prefillFromRequisition,
  requisitionSourcingStates
} from './sourcing/requisitionPrefill';
import { useToast } from '@hooks/useToast';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import EmptyState from '@components/ui-v2/EmptyState';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  useRFQs,
  useQuotations,
  useSuppliers,
  useRequisitions,
  useInviteeCandidates,
  useRfqComplianceGate,
  useRfiEvents,
  useRfpEvents,
  useRfpAwards,
  useAwards
} from '@services/query/hooks';
import { awardedRefsOf } from './rfx/RfpAwardSection';
import {
  defaultEvaluationTierQty,
  eventPiecesAt,
  isTieredRfq,
  quoteTotalAt,
  scoreRfqAt
} from '@services/sourcing/rfqComparison';
import { downloadComparison } from './rfx/comparisonExport';
// RFx spec 2026-09-21 — the rebuilt authoring: items, breaks, questions and
// options, templates and copying, and the generic "start from…" seed.
import {
  ItemsStep,
  QuestionsOptionsStep,
  SaveTemplateDialog,
  StepRefusal,
  TemplatePicker,
  TierEditor,
  authoringReviewRows,
  refusalMessage
} from './sourcing/RfqAuthoring';
/** @import { RfqAuthoringDraft, RfqDraftSeed } from './sourcing/rfqDraft' */
import {
  buildRfqAuthoringPayload,
  itemsStepRefusal,
  newItemDraft,
  optionsStepRefusal,
  seedForEdit,
  seedFromRfiPrefill,
  seedFromRfp,
  templateContentFromDraft,
  templateContentFromRfq,
  tiersStepRefusal
} from './sourcing/rfqDraft';
import { prefillRfqFromRfi, prefillRfqItemsFromRfp } from '@services/sourcing/rfxPrefill';
/** @import { RfqTemplateContent } from '@services/sourcing/rfqTemplates' */
import { GateMarker } from './rfx/rfxDisplay';
import { EligibilityMarker, SourcingTypePill, useSourcingTypeMap } from './rfx/eligibilityDisplay';
import { CATEGORY_TO_SUPPLIER_CATEGORY, mappedSourcingType } from '@services/sourcing/sourcingType';
import { RfqPrefillBanner } from './rfx/rfqSources';
import { DraftRevisionNote, draftEditRefusal } from './rfx/draftEdit';
import { matchesSupplierFilters } from '@services/sourcing/supplierFilters';
import SupplierFilterBar, {
  bandLabel,
  certLabel,
  useSupplierFilterLabels,
  useSupplierFilterParams
} from './suppliers/SupplierFilterBar';
import { PURCHASING_GROUPS, purchasingGroupNameKey } from '@services/sourcing/rfxConfig';
import { reliabilityScoreFor } from '@services/transitions/rfxRules';
import { documentRequestsRefusal } from '@services/transitions/rfxDocumentRules';
import DocumentRequestsEditor, {
  DocumentRequestsSummary,
  remapRequestsOnItemsChanged
} from './rfx/DocumentRequestsEditor';
import {
  useRfqCreate,
  useRfqReviseDraft,
  useRfqFxPin,
  useRfqCancel,
  useRfqPublish,
  useRfqReopen,
  useQuotationReview
} from '@services/query/commandHooks';
/** @import { RfqDraftRefusal } from './sourcing/rfqCreateModel' */
import {
  buildRfqCreatePayload,
  normalizeRfqCreateDraft,
  readRfqBudget,
  readRfqTotalQty
} from './sourcing/rfqCreateModel';
/** @import { QtyRefusalReason } from '@lib/localeNumber' */
// 2e-b-3 (COS-04) — the canonical formatters, replacing this file's own copies.
import { formatDate, formatIDR, formatMoney, formatNumber } from '@lib/format';
import { scoreQuotations, AXIS_LIVENESS, COMPOSITE_LIVENESS } from '@lib/quoteScore';
/** @import { QuoteSpread, SilentReason, SpreadDeps } from '@lib/shouldCostSpread' */
import { spreadForQuote } from '@lib/shouldCostSpread';
/** @import { BidCurrency } from '@lib/currencyPolicy' */
import { BASE_CURRENCY, BID_CURRENCIES, FX_PIN_MAX_AGE_DAYS } from '@lib/currencyPolicy';
/** @import { FxPin, FxPinSource, FxRefusalReason } from '@lib/fxPin' */
import { effectivePin, isStalePin, pinHistory } from '@lib/fxPin';
/** @import { FxRateRefusalReason, FxVintageRefusalReason } from './sourcing/fxRateInput' */
import { readFxRate, readFxVintage } from './sourcing/fxRateInput';
// RFx spec 2026-09-21 — invitees' intent and the clarification Q&A (B3).
import RfqEngagementSection from './sourcing/RfqEngagementSection';
import { MATERIAL_BASKET_CLASSIFICATION } from '@services/data/mock/fixtures/commodityMaterialMap';
import {
  ROOT_BENCHMARKS,
  SHOULD_COST_MATERIALS,
  SIMULATED_SPOT_FX
} from '@services/data/mock/fixtures/commodityBaskets';
import { useTranslation } from 'react-i18next';
/** @import { TFunction } from 'i18next' */
/** @import { RFQ, RFQCategory, RFQStatus } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
import { daysUntil } from '@services/data/dayProjection';
/** @import { PurchaseRequisition, PRStatus } from '@services/data/types' */
/** @import { Supplier } from '@services/data/types' */
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '@components/ui-v2/GlossaryTermChip';
import { useRefusalText } from '@hooks/useRefusalText';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';

// ⚠️ ANCHORED — this surface rendered values derived from anchored
// fixture data against the WALL CLOCK, so what a reader saw moved every day
// with no commit involved. Module-scope `DECLARED_PRESENT`, the shipped
// pattern from `BuyerShipments` / `BuyerGoodsReceipt`, and behaviour-
// preserving for the same reason they are: this surface's families shift by
// `DECLARED_PRESENT - anchor` and so does this pin, so every rendered
// day-count is answered at the instant the fixtures were authored for.
//
// ⚠️ SESSION-WRITTEN STATE KEEPS THE WALL CLOCK. This constant is for READ
// projections only. A timestamp stamped onto something the user just did is a
// fact about this session, not about the fixture set, and anchoring one would
// tell the reader their own action happened weeks ago.
const TODAY = DECLARED_PRESENT;

/** @typedef {'all' | 'open' | 'pending' | 'awarded' | 'closed'} GroupTab */

// Category label keys — the RFQCategory enum stays the logic value; only the
// rendered label is localized (mirrors the type-label precedent in contracts.js).
/** @type {Record<RFQCategory, string>} */
const CATEGORY_LABEL_KEY = {
  Fragrance: 'sourcing.category.fragrance',
  'Active Ingredients': 'sourcing.category.activeIngredients',
  Packaging: 'sourcing.category.packaging',
  Emulsifiers: 'sourcing.category.emulsifiers',
  Botanical: 'sourcing.category.botanical',
  Other: 'sourcing.category.other'
};

/**
 * @param {TFunction} t
 * @param {RFQCategory} c
 * @returns {string}
 */
const categoryLabel = (t, c) => t(CATEGORY_LABEL_KEY[c]);

// C.2 — the vocabulary moved to `sourcing/requisitionPrefill.js` so the
// membership check that decides whether a requisition's category can be carried
// and the `<select>` a buyer picks from are the SAME list. Two copies would
// drift, and the drift would show up as a field the prefill refuses to fill for
// a category the wizard happily offers.
/** @type {readonly RFQCategory[]} */
const CATEGORY_OPTIONS = RFQ_CATEGORY_OPTIONS;

// Material G2 (AR-17) — `CATEGORY_TO_SUPPLIER_CATEGORY` moved to
// `services/sourcing/sourcingType.js`: the invitee pool and the sourcing type
// read the one list.

/** @type {Record<RFQCategory, string[]>} */
const MATERIAL_CATALOG = {
  Fragrance: [
    'Wardah Floral Accord',
    'Sample Citrus Compound',
    'Make Over Oud Base',
    'Emina Fresh Accord'
  ],
  'Active Ingredients': [
    'Niacinamide USP',
    'Sodium Hyaluronate HMW',
    'Vitamin C Derivative',
    'Retinyl Palmitate',
    'Salicylic Acid'
  ],
  Packaging: [
    'PET Bottle 100ml',
    'PET Bottle 200ml',
    'Airless Pump 15ml',
    'Folding Carton 150gsm',
    'Shipper Box 12-pack'
  ],
  Emulsifiers: ['Glyceryl Stearate SE', 'Polysorbate 80', 'Cetearyl Alcohol', 'Lecithin (Soy)'],
  Botanical: [
    'Centella Asiatica Extract',
    'Green Tea Extract',
    'Rice Bran Extract',
    'Mulberry Extract'
  ],
  Other: ['Custom material — specify in notes']
};

const UOM_OPTIONS = RFQ_UOM_OPTIONS; // C.2 — shared with the prefill membership check
const INCOTERMS_OPTIONS = ['FOB', 'CIF', 'EXW', 'DDP', 'FCA'];
const PAYMENT_TERMS_OPTIONS = ['Net 30', 'Net 45', 'Net 60', 'Letter of Credit', 'Advance Payment'];

/** @type {Record< RFQStatus, 'success' | 'warning' | 'info' | 'neutral' | 'danger' >} */
const STATUS_VARIANT = {
  Draft: 'neutral',
  Open: 'info',
  Closed: 'neutral',
  'Partly awarded': 'info',
  Awarded: 'success',
  Cancelled: 'danger'
};

// ⚠️ `REFERENCE_TODAY = new Date('2026-05-18')` AND this page's private
// `daysUntil` ARE DELETED. The pin made every deadline on this board
// deterministic by making it wrong on a schedule nobody was watching, and
// `SupplierRFQs` carried a SECOND pin 23 days adrift — so one RFQ's deadline
// rendered two different day-counts on two surfaces of one app. The clock is
// now injected from the component and the arithmetic lives in
// `services/data/dayProjection`.
/**
 * @param {RFQ} r
 * @returns {boolean}
 */
const isAllResponded = (r) =>
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

// A score axis, or honest silence (2e-c-3). The score cells used to read
// `scoreById.get(id)?.priceScore ?? 0`, which was harmless while the engine
// always scored — the map was never missing an entry. Now that a comparison can
// be REFUSED the map is legitimately empty, and `?? 0` would render every axis
// as a real score of 0: the WORST value on each bar, for quotes the engine
// explicitly declined to rank. An absent score is not a bad score.
/** @type {React.FC<{ score: number | undefined }>} */
const ScoreOrSilence = ({ score }) =>
  score === undefined ? (
    <span className="text-text-tertiary">—</span>
  ) : (
    <ScoreBadge score={score} size="sm" variant="bar" />
  );

// Field chrome for the FX-pin dialog — same tokens as the supplier quote form,
// so the portal's two governed numeric-entry surfaces read identically.
const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

// ── CP-0 · 2e-c-4 — the recorded FX basis, made visible ─────────────────────
//
// D-1 requires a pin to be auditable. An audit trail nobody can read from the
// screen is an audit trail only an engineer can consult, so this states, per
// foreign currency: the rate IN FORCE, its VINTAGE, its SOURCE, and — when a
// rate has been superseded — that earlier ones exist and are kept.
//
// The vintage is deliberately as prominent as the rate. A rate is not a fact on
// its own; a rate AS OF a date is. Showing 17,250 without saying when it was
// true is the same class of omission as showing a score without its liveness.

/** The draft a buyer confirms before a rate is recorded. */
/**
 * @typedef {object} PinDraft
 * @property {BidCurrency} currency
 * @property {string} rate
 * @property {string} asOf
 * @property {FxPinSource} source
 * @property {string} rateType
 * @property {FxPin} [superseding] -  The pin this one would supersede, if any — drives the confirm copy.
 */

/**
 * @param {BidCurrency} currency
 * @param {FxPin} [superseding]
 * @returns {PinDraft}
 */
const blankPinDraft = (currency, superseding) => ({
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

// ── CP-0 · 2e-c-6 — every named cause has a translation, by construction ─────
//
// The arc's five user-facing reason strings were all looked up by CONCATENATION
// (`t(\`sourcing.fx.refused.${reason}\`)`), which means nothing could tell that a
// reason had no key: a new refusal ships, and the buyer reads the raw key on
// screen — in both languages equally. An i18n sweep that only checks today's
// keys is a sweep that has to be run again every time a reason is added.
//
// These are EXACT maps, the same shape and for the same reason as
// `RFQ_QTY_REFUSAL_KEY` below: `Record<Reason, string>` makes a reason with no
// key a COMPILE error rather than a rendering defect. Widening any of these
// unions now fails the build until the EN and ID strings exist. The parity guard
// in `fragments.test.js` then does the other half — that the ID key is really
// there, and interpolates the same variables.
/** @type {Record<FxRefusalReason, string>} */
export const FX_REFUSAL_KEY = {
  FX_UNPINNED: 'sourcing.cmp.fx.refused.FX_UNPINNED',
  FX_STALE: 'sourcing.cmp.fx.refused.FX_STALE'
};

/** @type {Record<FxRateRefusalReason, string>} */
export const FX_RATE_REFUSAL_KEY = {
  EMPTY_QTY: 'sourcing.fx.refused.EMPTY_QTY',
  NOT_NUMERIC: 'sourcing.fx.refused.NOT_NUMERIC',
  AMBIGUOUS_QTY: 'sourcing.fx.refused.AMBIGUOUS_QTY',
  ZERO_RATE: 'sourcing.fx.refused.ZERO_RATE'
};

/** @type {Record<FxVintageRefusalReason, string>} */
export const FX_VINTAGE_REFUSAL_KEY = {
  EMPTY_VINTAGE: 'sourcing.fx.refused.EMPTY_VINTAGE',
  UNREADABLE_VINTAGE: 'sourcing.fx.refused.UNREADABLE_VINTAGE',
  FUTURE_VINTAGE: 'sourcing.fx.refused.FUTURE_VINTAGE'
};

/** @type {Record<FxPinSource, string>} */
export const FX_PIN_SOURCE_KEY = {
  MANUAL: 'sourcing.cmp.fx.basis.source.MANUAL',
  SAP_EXHGRATE: 'sourcing.cmp.fx.basis.source.SAP_EXHGRATE'
};

/** Honest silence on the should-cost cell — one key per named cause. The
 * @type {Record<SilentReason, string>}
 *  `currency-unsupported` member is D-4's fourth reason (2e-c-5). */
export const SPREAD_SILENT_KEY = {
  unmapped: 'sourcing.cmp.spread.silent.unmapped',
  tail: 'sourcing.cmp.spread.silent.tail',
  'unit-mismatch': 'sourcing.cmp.spread.silent.unit-mismatch',
  'currency-unsupported': 'sourcing.cmp.spread.silent.currency-unsupported'
};

/**
 * The refusal key for a typed pin field, or `null` when it reads (and when it is
 * still untouched — an empty field does not nag, it blocks at the button).
 *
 * One parser call, properly narrowed. The retired form called the parser TWICE
 * per render and reached the reason through `as { reason: string }` — a cast
 * that would have gone on compiling if the outcome shape changed underneath it.
 * @param {string} raw
 * @returns {string | null}
 */
const fxRateRefusalKey = (raw) => {
  if (raw.trim() === '') return null;
  const outcome = readFxRate(raw);
  return outcome.ok ? null : FX_RATE_REFUSAL_KEY[outcome.reason];
};

/**
 * @param {string} raw
 * @returns {string | null}
 */
const fxVintageRefusalKey = (raw) => {
  if (raw.trim() === '') return null;
  const outcome = readFxVintage(raw);
  return outcome.ok ? null : FX_VINTAGE_REFUSAL_KEY[outcome.reason];
};

/** A field-level refusal line in the pin dialog — same DOM as before, so the
 * @type {React.FC<{ messageKey: string | null; testId: string; t: TFunction }>}
 *  `fx-rate-refusal` / `fx-asof-refusal` witnesses are untouched. */
const FieldRefusal = ({ messageKey, testId, t }) =>
  messageKey === null ? null : (
    <div role="alert" data-testid={testId} className="mt-1 text-[11px] text-danger">
      {t(messageKey)}
    </div>
  );

/** @type {React.FC<{ currencies: readonly BidCurrency[]; pins: readonly FxPin[] | undefined; onPin: (c: BidCurrency) => void; t: TFunction; }>} */
const FxBasisPanel = ({ currencies, pins, onPin, t }) => (
  <div className="mb-3 rounded-md border border-border-subtle bg-surface-subtle px-3 py-2">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-label uppercase text-text-tertiary">
        {t('sourcing.cmp.fx.basis.title')}
      </span>
      <LivenessPill capability="commodityIntel" />
    </div>
    <ul className="flex flex-col gap-1.5">
      {currencies.map((c) => {
        const pin = effectivePin(pins, c);
        const history = pinHistory(pins, c);
        const stale = pin ? isStalePin(pin) : false;
        return (
          <li key={c} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <Data as="span" className="font-semibold">
              1 {c}
            </Data>
            {pin ? (
              <>
                <span className="text-text-tertiary">=</span>
                <Data as="span" className="font-semibold">
                  {formatMoney(pin.rate, pin.base)}
                </Data>
                {/* The vintage, never optional — see the block comment. */}
                <span
                  className={stale ? 'text-warning-hover font-medium' : 'text-text-secondary'}
                  data-testid={`fx-vintage-${c}`}
                >
                  {t('sourcing.cmp.fx.basis.asOf', { date: formatDate(pin.asOf) })}
                </span>
                <span className="text-text-tertiary">
                  {t(FX_PIN_SOURCE_KEY[pin.source])}
                  {pin.rateType ? ` · ${pin.rateType}` : ''}
                </span>
                {/* Superseded pins are KEPT (D-1). Saying how many exist is what
                    makes "the prior basis is preserved" a visible property
                    rather than a claim in a comment. */}
                {history.length > 1 && (
                  <span className="text-text-tertiary" data-testid={`fx-history-${c}`}>
                    {t(
                      history.length === 2
                        ? 'sourcing.cmp.fx.basis.superseded.one'
                        : 'sourcing.cmp.fx.basis.superseded.other',
                      { count: history.length - 1 }
                    )}
                  </span>
                )}
              </>
            ) : (
              <span className="text-warning-hover" data-testid={`fx-missing-${c}`}>
                {t('sourcing.cmp.fx.basis.none')}
              </span>
            )}
            <Button variant="outline" onClick={() => onPin(c)}>
              {/* A supersede is a NEW RECORDED ACT, not an edit, and the label
                  says so — "Edit rate" would describe a mutation that cannot
                  happen and would misrepresent what lands in the audit trail. */}
              {t(pin ? 'sourcing.cmp.fx.basis.supersede' : 'sourcing.cmp.fx.basis.record', {
                currency: c
              })}
            </Button>
          </li>
        );
      })}
    </ul>
  </div>
);

// 2e-c-5 — the `isSpreadCurrency` guard that lived here is GONE. Policy is still
// wider than capability, but deciding that is the resolver's job now: it runs
// the check as its first gate and returns the same honest silence. The guard was
// only ever here because `SpreadCurrency` was a 2-union the surface had to
// narrow to; with the union retired, a surface that kept its own copy would be a
// second place for the rule to drift.

// CP-0 · W1 · 2e-b-4a — each wizard-number refusal names its own rule. A buyer
// who left the quantity blank, one who typed something unreadable, and one who
// typed a token legal under both conventions have made three different mistakes
// and need three different answers — not one anonymous disabled button.
//
// The maps are EXACT because `RfqDraftRefusal` is discriminated by field:
// `EMPTY_QTY` exists on the quantity (required) and is excluded from the budget
// (optional — a blank there is the answer), so neither map carries an entry it
// can never use.
/** @type {Record<QtyRefusalReason, string>} */
const RFQ_QTY_REFUSAL_KEY = {
  EMPTY_QTY: 'sourcing.wizard.qty.refused.empty',
  NOT_NUMERIC: 'sourcing.wizard.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'sourcing.wizard.qty.refused.ambiguous'
};

/** @type {Record< Exclude<QtyRefusalReason, 'EMPTY_QTY'>, string >} */
const RFQ_BUDGET_REFUSAL_KEY = {
  NOT_NUMERIC: 'sourcing.wizard.budget.refused.notNumeric',
  AMBIGUOUS_QTY: 'sourcing.wizard.budget.refused.ambiguous'
};

/**
 * The i18n key for a refusal, chosen by the field it came from.
 * @param {RfqDraftRefusal} refusal
 * @returns {string}
 */
const rfqRefusalKey = (refusal) =>
  refusal.field === 'totalQty'
    ? RFQ_QTY_REFUSAL_KEY[refusal.reason]
    : RFQ_BUDGET_REFUSAL_KEY[refusal.reason];

/**
 * @param {RFQ} r
 * @param {TFunction} t
 * @returns {TimelineEvent[]}
 */
const buildTimeline = (r, t) => {
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
 * @param {RFQ} _r
 * @returns {'outline'}
 */
export const FOOTER_VARIANT = (_r) => 'outline';

/** @type {React.FC<{ label: string; rows: [string, React.ReactNode][]; onEdit: () => void; }>} */
const ReviewSection = ({ label, rows, onEdit }) => {
  const { t } = useTranslation();
  return (
    <section className="border border-border-subtle rounded-md">
      <header className="flex items-center justify-between px-4 py-2 bg-bg-hover">
        <span className="text-label text-text-tertiary uppercase">{label}</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-teal-hover hover:text-teal-hover"
        >
          {t('sourcing.wizard.review.edit')}
        </button>
      </header>
      <dl className="px-4 py-3 divide-y divide-border-subtle">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-2 gap-4">
            <dt className="text-text-tertiary">{k}</dt>
            <dd className="text-text-primary text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

/**
 * `tag`: An honest-marker tag on the row label, with a tooltip explaining it. Two
 * `tag`: DIFFERENT qualifiers use it, and they must not be conflated:
 * `tag`:   · "Simulated" — the axis has no live data source yet (compliance /
 * `tag`:     reliability / the composite that inherits their weakest link);
 * `tag`:   · "Estimated" — the data is REAL supplier input, but it is indicative at
 * `tag`:     this stage rather than a commitment (lead time, 2e-b-1a).
 * `tag`: Generalised from the old `sim`/`simLabel`/`simTitle` triple so the second
 * `tag`: qualifier reuses the grammar instead of inventing a rival one. Rows with no
 * `tag`: qualifier render plain.
 * @type {React.FC<{ label: string; tag?: string; tagTitle?: string; children: React.ReactNode; }>}
 */
const ComparisonRow = ({ label, tag, tagTitle, children }) => (
  <tr className="border-t border-border-subtle">
    <th
      scope="row"
      className="text-left px-2 py-2 font-medium text-text-tertiary uppercase tracking-wider text-[10px] w-36 min-w-[9rem] align-middle"
    >
      {label}
      {tag && (
        <span
          title={tagTitle}
          className="ml-1.5 inline-block normal-case tracking-normal text-[9px] font-medium text-text-tertiary border border-border-subtle rounded px-1 py-px align-middle"
        >
          {tag}
        </span>
      )}
    </th>
    {children}
  </tr>
);

// CI-2 should-cost-vs-quote spread deps — the SIMULATED join + the commodity
// fixtures the resolver reads. Module-level (static fixtures, no per-render cost);
// `materials` is keyed by `sc-*` id for O(1) lookup inside `spreadForQuote`.
/** @type {SpreadDeps} */
const SPREAD_DEPS = {
  join: MATERIAL_BASKET_CLASSIFICATION,
  materials: Object.fromEntries(SHOULD_COST_MATERIALS.map((m) => [m.id, m])),
  roots: ROOT_BENCHMARKS,
  fx: SIMULATED_SPOT_FX
};

// A spread fraction as a signed percent (+8% / −3% / 0%), real minus for polish.
/**
 * @param {number} frac
 * @returns {string}
 */
const fmtSignedPct = (frac) => {
  const pct = Math.round(frac * 100);
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct)}%`;
};

// The CI-2 spread cell: a MODELED, banded reference the buyer READS beside the
// quote — never a verdict, never into the score. A spread vs a SIMULATED basket
// is a rehearsal, so it wears BOTH honesty axes (feed = LivenessPill "Sample",
// epistemic = ModelMarker "Model") and honest silence when there is no reference.
/** @type {React.FC<{ result: QuoteSpread; t: TFunction }>} */
const SpreadCell = ({ result, t }) => {
  if (result.kind === 'silent') {
    // Honest silence — a specific reason, never a fabricated percentage.
    return (
      <span className="text-[10px] text-text-tertiary whitespace-normal">
        {t(SPREAD_SILENT_KEY[result.reason])}
      </span>
    );
  }
  const { spread, shouldCost, currency, basis } = result;
  return (
    <div className="flex flex-col items-start gap-1">
      {/* The spread RANGE — deliberately plain sans, NOT <Data>: the DP-3
          mono + data-navy grammar is reserved for OBSERVED data, and a modeled
          figure must never wear it (build-plan §2). Neutral tone, no semantic
          red/green — a spread vs a SIMULATED basket informs, it does not judge. */}
      <span className="text-xs font-semibold text-text-primary tabular-nums whitespace-nowrap">
        {t('sourcing.cmp.spread.range', {
          low: fmtSignedPct(spread.lowPct),
          high: fmtSignedPct(spread.highPct)
        })}
      </span>
      {/* The modeled anchor renders in the QUOTE's own currency — IDR is never
          shown as the basis for a USD deal (CI-2 currency-leg ruling). */}
      <span className="text-[10px] text-text-tertiary whitespace-nowrap">
        {t('sourcing.cmp.spread.vsModel', {
          value: formatMoney(shouldCost.midPerKg, currency)
        })}
      </span>
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <LivenessPill capability="commodityIntel" />
        <ModelMarker label={t('sourcing.cmp.model')} title={t('sourcing.cmp.modelTitle')} />
        {/* FX-converted marker — ONLY the FX_CONVERTED branch, where the
            should-cost was pushed through the FX pair (the more-modeled path).
            ENGINE_NATIVE reads the FX-free basis and carries no FX marker.
            2e-c-5: reads the BRANCH the engine took, not a boolean that meant
            "not the other branch" and would have claimed an FX conversion for a
            currency with no FX pair at all. */}
        {basis === 'FX_CONVERTED' && (
          <span
            title={t('sourcing.cmp.fxTitle')}
            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-text-secondary border border-dashed border-border-input rounded px-1 py-px"
          >
            <ArrowLeftRight size={9} aria-hidden="true" />
            {t('sourcing.cmp.fx')}
          </span>
        )}
      </span>
    </div>
  );
};

/** @type {React.FC<{ highlight?: boolean; children: React.ReactNode; }>} */
const ComparisonCell = ({ highlight, children }) => (
  <td
    className={`px-2 py-2 align-middle ${
      highlight ? 'border-x-2 border-action bg-action-soft/40' : ''
    }`}
  >
    {children}
  </td>
);

/**
 * @param {RFQ} r
 * @param {GroupTab} group
 * @returns {boolean}
 */
const matchesGroup = (r, group) => {
  if (group === 'all') return true;
  if (group === 'open') return r.status === 'Open' && !isAllResponded(r);
  if (group === 'pending') return r.status === 'Open' && isAllResponded(r);
  if (group === 'awarded') return r.status === 'Awarded';
  if (group === 'closed') return r.status === 'Closed' || r.status === 'Cancelled';
  return true;
};

/**
 * `sourceRequisitionId`:  C.2 — set ONLY when the buyer started from a requisition.
 * `origin`:  Where a seeded draft came from — the review names it ("Created from …").
 * `unlinkedDocRequestIds`: NR-1 BR-02 — document requests whose item the buyer removed. Wizard state only (never in the payload): the Documents step names each one until it is edited or dismissed.
 *
 * @typedef {RfqAuthoringDraft & {
 *     title: string;
 *     category: RFQCategory | '';
 *     materials: string[];
 *     totalQty: string;
 *     uom: (typeof UOM_OPTIONS)[number];
 *     budget: string;
 *     responseDeadline: string;
 *     awardDeadline: string;
 *     incoterms: string;
 *     paymentTerms: string;
 *     invitedSupplierIds: string[];
 *     sourceRequisitionId?: string;
 *     origin?: RfqDraftSeed['origin'];
 *     unlinkedDocRequestIds?: string[];
 *   }} DraftRfq
 */

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
const applyPrefill = (base, p) => ({
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
const emptyDraft = () => ({
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
const applySeed = (base, seed) => ({
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

/**
 * @typedef {object} SourcingWorkspaceProps
 * @property {RFQ[]} baseRfqs
 * @property {Quotation[]} quotations
 * @property {Supplier[]} suppliers
 * @property {PurchaseRequisition[]} sourceableRequisitions C.2 — the requisitions a sourcing event may be raised FROM, already
 *   narrowed at the seam to `t_pr_source`'s from-states. May be EMPTY, and the
 *   picker renders that honestly rather than as a blank control.
 */

/** @type {React.FC<SourcingWorkspaceProps>} */
const SourcingWorkspace = ({
  baseRfqs,
  quotations,
  suppliers,
  sourceableRequisitions: sourceablePrs
}) => {
  const supplierNameById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s.name])),
    [suppliers]
  );
  const [group, setGroup] = useState(/** @type {GroupTab} */ ('all'));
  const [selectedCats, setSelectedCats] = useState(/** @type {RFQCategory[]} */ ([]));
  const [search, setSearch] = useState('');
  // 2e-c-4 — the panel holds the selected RFQ's ID, and the RFQ itself is
  // DERIVED from the live query result. It used to hold the RFQ OBJECT, which
  // was a snapshot taken when the row was clicked: a command that mutated the
  // RFQ invalidated the query and re-fetched, but the open panel kept rendering
  // the stale copy. Award masked it (the panel closes on award), and the FX pin
  // exposed it — a buyer recorded a rate and the comparison went on refusing,
  // because the panel was still reading an RFQ with no `fxPins` on it.
  const [selectedRfqId, setSelectedRfqId] = useState(/** @type {string | null} */ (null));
  const [awardsOpen, setAwardsOpen] = useState(true);
  // DERIVED from the live list, so a command that mutates this RFQ is reflected
  // in the OPEN panel — the whole point of holding the id rather than the row.
  const selectedRfq = useMemo(
    () => (selectedRfqId ? (baseRfqs.find((r) => r.id === selectedRfqId) ?? null) : null),
    [baseRfqs, selectedRfqId]
  );

  // WHO ACTS NEXT (S2a). `RFQStatus` matches the machine exactly — no
  // projection member — so `status` is the canonical state on this surface.
  const nextAct = useNextAct('rfq', selectedRfq?.status);
  // 2e-c-4 — the pin draft a buyer confirms before a rate is recorded. Null =
  // no dialog. Recording the basis a contract will be awarded on is a governed
  // act, so it is confirm-before-commit like every other one on this surface.
  const [pinDraft, setPinDraft] = useState(/** @type {PinDraft | null} */ (null));
  const [wizardOpen, setWizardOpen] = useState(false);
  // BL-93 — the Draft RFQ the open wizard is EDITING, by id. Null = the wizard
  // raises a new RFQ. Held as an id and re-derived from the live list, so a
  // draft that leaves Draft underneath the wizard (a colleague sent it) is
  // seen as no longer editable rather than edited from a snapshot.
  const [editingRfqId, setEditingRfqId] = useState(/** @type {string | null} */ (null));
  const editingRfq = useMemo(
    () => (editingRfqId ? (baseRfqs.find((r) => r.id === editingRfqId) ?? null) : null),
    [baseRfqs, editingRfqId]
  );

  // §73 — the seat's authority over `t_rfq_create` (atom `rfq:create`,
  // held by `procurement`). One verb, one notice, one placement.
  const rfqCreateAvailability = useVerbAvailability('rfq:create');

  // §76 — THE SIX NON-CREATE VERBS, ONE NOTICE PER ACT. THE GROUPING IS GONE.
  //
  // §74 collapsed these into two group notices — one per ADJACENT action
  // group, naming the first withheld atom — on the reading that the RFQ side
  // panel is a CONTROL, so a seat withheld from the group should read the
  // owner once. **The panel is not a control; it is a WORKSPACE** (operator
  // ruling, §76): four separable acts on the selected RFQ, four dispatches,
  // four confirmations, each with its own from-state. A notice that spans them
  // answers about a group nobody performs.
  //
  // ⚠️ **AND THE COLLAPSE COST INFORMATION THAT THE HOOK ALREADY HAD.**
  // `firstWithheld(publish, reopen, cancel)` renders ONE line for a seat that
  // may hold one of the three and not the others: the notice names the first
  // withheld owner and the held verb's button renders beside it, so the reader
  // cannot tell WHICH act the line is about. Per-verb, a partially-held seat
  // reads its own controls and the owner of each act it lacks — which is the
  // constraint working, not an exception to it. Today every one of the six is
  // held by `procurement` and by nothing else, so the strings coincide; the
  // day a bundle splits, the surface is already right and no grouping has to
  // be re-taken.
  //
  // `useVerbAvailabilities` needed no change to carry this: it is already one
  // independent resolution per atom, and the group was imposed on top of it.
  const rfqVerbs = useVerbAvailabilities(
    /** @type {const} */ ({
      publish: 'rfq:publish',
      reopen: 'rfq:reopen',
      cancel: 'rfq:cancel',
      award: 'rfq:award',
      review: 'quotation:review',
      fxPin: 'rfq:fx-pin'
    })
  );
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState(/** @type {() => DraftRfq} */ (emptyDraft));
  // Templates and copying (D2): the picker, and the "Save as template" dialog
  // with the content it would save.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [templateToSave, setTemplateToSave] = useState(
    /** @type {{ content: RfqTemplateContent; name: string } | null} */ (null)
  );
  const [supplierSearch, setSupplierSearch] = useState('');
  // REQ-E03-01 BR-01 — the purchasing-group filter, usable alone or with the
  // category one. '' means the filter is off, which is a different state from
  // "matched nothing" and is what the empty state has to be able to say.
  const [inviteeGroup, setInviteeGroup] = useState('');
  // BL-52 / REQ-E03-01 BR-05 — certificate validity, band and country, in the
  // page address, composing with the category and purchasing-group filters.
  const { filters: inviteeFilters, setFilters: setInviteeFilters } = useSupplierFilterParams();
  const inviteeFilterLabels = useSupplierFilterLabels();
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  // BL-37 — the award records, so the history can name EVERY supplier of a split.
  const awardsQuery = useAwards();
  const awardByRfq = useMemo(
    () =>
      new Map((awardsQuery.data?.items ?? []).map((a) => /** @type {const} */ ([a.eventId, a]))),
    [awardsQuery.data]
  );
  /**
   * B1 review fix (c) — the comparison as CSV (items × suppliers × breaks),
   * built in the browser. Says so when there is nothing to export rather than
   * handing over an empty file.
   * @param {readonly RFQ[]} scope
   * @param {string} filename
   */
  const exportComparison = (scope, filename) => {
    const rows = downloadComparison(
      filename,
      scope,
      quotations,
      (id) => supplierNameById.get(id) ?? id,
      t
    );
    toast(
      rows > 0
        ? { variant: 'success', title: t('rfqCompare.export.done') }
        : { variant: 'info', title: t('rfqCompare.export.empty') }
    );
  };
  const createMutation = useRfqCreate();
  const reviseMutation = useRfqReviseDraft();
  const cancelMutation = useRfqCancel();
  const reopenMutation = useRfqReopen();
  const publishMutation = useRfqPublish();
  const reviewMutation = useQuotationReview();
  const fxPinMutation = useRfqFxPin();

  /** @param {RFQ} r */
  const openRfq = (r) => {
    setSelectedRfqId(r.id);
  };

  // Award the selected quotation (fires the cascade source t_rfq_award): the
  // winner is awarded, every other quotation on the RFQ is rejected, and the
  // reads re-derive. Honest toast; a failed dispatch surfaces its reason.
  // 2e-c-4 — record (or supersede) the FX basis. The rate and the vintage are
  // both read ONCE here, through the pure gates, and the parsed values are what
  // the dispatch carries: the number the buyer confirmed is the number that
  // lands on the ledger, with no second reading to disagree with it.
  const handlePinConfirm = () => {
    if (!selectedRfq || !pinDraft) return;
    const rate = readFxRate(pinDraft.rate);
    const vintage = readFxVintage(pinDraft.asOf);
    // The dialog's own button is already disabled on a refusal; this is the
    // structural twin, so a keyboard or a future caller cannot route around it.
    if (!rate.ok || !vintage.ok) return;
    const currency = pinDraft.currency;
    const superseding = Boolean(pinDraft.superseding);
    fxPinMutation.mutate(
      {
        rfqId: selectedRfq.id,
        quote: currency,
        rate: rate.value,
        asOf: vintage.value,
        source: pinDraft.source,
        ...(pinDraft.rateType.trim() ? { rateType: pinDraft.rateType.trim() } : {})
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.fxPinFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.fxPinFailed.default')
            });
            return;
          }
          setPinDraft(null);
          // Two distinct messages, because they are two distinct acts. A
          // supersede says the prior basis is KEPT — the buyer has not erased
          // anything, and the trail will show both.
          toast({
            variant: 'success',
            title: t(
              superseding ? 'sourcing.toast.fxSuperseded.title' : 'sourcing.toast.fxPinned.title',
              { currency }
            ),
            description: t(
              superseding ? 'sourcing.toast.fxSuperseded.desc' : 'sourcing.toast.fxPinned.desc'
            )
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.fxPinFailed.title'),
            description: t('sourcing.toast.fxPinFailed.default')
          })
      }
    );
  };

  // Move a submitted quote into evaluation (fires t_quotation_review, Submitted →
  // Under Review). No cascade, no artifact — a buyer-side lifecycle advance. On a
  // non-failed outcome the quotation reads re-derive and the pill flips in place.
  /** @param {string} quotationId */
  const handleReview = (quotationId) => {
    reviewMutation.mutate(
      { quotationId },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.reviewFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.reviewFailed.default')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.reviewed.title'),
            description: t('sourcing.toast.reviewed.desc')
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.reviewFailed.title'),
            description: t('sourcing.toast.reviewFailed.default')
          })
      }
    );
  };

  // PF-1a — publish the RFQ (fires t_rfq_publish, Draft → Open). THE ACT THAT
  // MAKES THE EVENT VISIBLE: supplier reads exclude Draft, so until this fires
  // the invited list has not been shown anything. The panel stays open — the
  // buyer's next move (award, cancel, pin a rate) is on this same RFQ, and the
  // board re-derives underneath it.
  const handlePublish = () => {
    if (!selectedRfq) return;
    const rfqNumber = selectedRfq.rfqNumber;
    const invitedCount = selectedRfq.invitedSupplierIds.length;
    publishMutation.mutate(
      { rfqId: selectedRfq.id },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.publishFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.publishFailed.default')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.published.title', { rfqNumber }),
            // Manual plural selection, the convention this file already uses for
            // the create toast — not i18next's `_one/_other` suffixes, which are
            // configured nowhere here and would silently fall back.
            description: t(
              invitedCount === 1
                ? 'sourcing.toast.published.desc.one'
                : 'sourcing.toast.published.desc.other',
              { count: invitedCount }
            )
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.publishFailed.title'),
            description: t('sourcing.toast.publishFailed.dispatch')
          })
      }
    );
  };

  // Cancel the RFQ (fires t_rfq_cancel, Draft/Open/Closed → Cancelled). Terminal
  // abandon — no cascade, no artifact. On success the board re-derives and the
  // panel closes (its local snapshot would otherwise show the stale prior status).
  const handleCancel = () => {
    if (!selectedRfq) return;
    const rfqNumber = selectedRfq.rfqNumber;
    cancelMutation.mutate(
      { rfqId: selectedRfq.id },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.cancelFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.cancelFailed.default')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.cancelled.title', { rfqNumber }),
            description: t('sourcing.toast.cancelled.desc')
          });
          closePanel();
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.cancelFailed.title'),
            description: t('sourcing.toast.cancelFailed.dispatch')
          })
      }
    );
  };

  // Reopen a closed RFQ (fires t_rfq_reopen, Closed → Open) for further responses.
  const handleReopen = () => {
    if (!selectedRfq) return;
    const rfqNumber = selectedRfq.rfqNumber;
    reopenMutation.mutate(
      { rfqId: selectedRfq.id },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.reopenFailed.title'),
              description:
                refusalText(result.reason) ??
                result.reason ??
                t('sourcing.toast.reopenFailed.default')
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.reopened.title', { rfqNumber }),
            description: t('sourcing.toast.reopened.desc')
          });
          closePanel();
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.reopenFailed.title'),
            description: t('sourcing.toast.reopenFailed.dispatch')
          })
      }
    );
  };

  function closePanel() {
    setSelectedRfqId(null);
  }

  const quotesForSelected = useMemo(() => {
    if (!selectedRfq) return [];
    return quotations.filter((q) => q.rfqId === selectedRfq.id);
  }, [selectedRfq, quotations]);

  // 2e-c-4 — the currency is resolved ONCE, here, and every consumer reads the
  // resolved value. It used to be re-derived per cell (`q.currency ??
  // BASE_CURRENCY` at the unit-price, spread and total-price cells), which is
  // the same convention restated three times: three places to forget it, and
  // three places for the engine's view of a quote to drift from the surface's.
  //
  // REQ-E03-05 / CR-15 — THE RELIABILITY AXIS IS THE SUPPLIER'S OTIF, and it is
  // resolved HERE for the same reason the currency is. It used to be the
  // quotation's stored `reliabilityScore`, which is one of the retired
  // hand-authored axes (F0.3-FIND-01): a quote cannot state how reliable its
  // author is, the performance record can. A supplier with no OTIF history
  // scores 50 — the rule says so, and `reliabilityScoreFor` is where it lives so
  // the screen and the award verb cannot disagree about it.
  // THE PANEL NEVER DISAGREES WITH THE EVENT PAGE ON A TIERED RFQ. It reads the
  // same default evaluation break the event page opens at (nearest
  // `totalQty`) and shows each quote's cost per piece and total AT THAT
  // BREAK, not the stored first-break header; the ranking below is scored with
  // the same rule (`scoreRfqAt`). Choosing another break happens on the event
  // page, which the panel links to.
  const panelEvalQty =
    selectedRfq && isTieredRfq(selectedRfq) ? defaultEvaluationTierQty(selectedRfq) : null;
  const pricedQuotes = useMemo(
    () =>
      quotesForSelected.map((q) => {
        const atBreak =
          selectedRfq && panelEvalQty !== null ? quoteTotalAt(selectedRfq, q, panelEvalQty) : null;
        const pieces =
          selectedRfq && panelEvalQty !== null ? eventPiecesAt(selectedRfq, panelEvalQty) : 0;
        return {
          ...q,
          ...(atBreak !== null && pieces > 0
            ? { unitPrice: atBreak / pieces, totalPrice: atBreak }
            : {}),
          currency: q.currency ?? BASE_CURRENCY,
          reliabilityScore: reliabilityScoreFor(
            suppliers.find((s) => s.id === q.supplierId)?.otif ?? null
          )
        };
      }),
    [quotesForSelected, suppliers, selectedRfq, panelEvalQty]
  );

  // The actually-awarded quotation (Awarded RFQs only), resolved from the real
  // award metadata — NOT the AI-recommended pick, which may differ. Drives the
  // award-summary block so the panel names the true winner at a glance.
  const awardedQuote = useMemo(() => {
    if (!selectedRfq || selectedRfq.status !== 'Awarded') return null;
    return pricedQuotes.find((q) => q.id === selectedRfq.awardedQuotationId) ?? null;
  }, [selectedRfq, pricedQuotes]);

  // Governed derived scores (F0.3 quote-scoring primitive): the drawer COMPUTES
  // the comparison axes via `scoreQuotations` instead of reading the hand-authored
  // fixture literals (the fabricated-score root cause). price/leadTime are LIVE
  // (ratio-to-best over this RFQ's set), reliability is declared SIMULATED,
  // compliance is the CR-23 gate (who is scored, not a weight), the composite carries weakest-link liveness, and topRanked =
  // argmax(composite) — replacing the old fixture `aiRecommended` flag.
  //
  // 2e-c-3 — the engine now returns a DISCRIMINATED OUTCOME. A multi-currency
  // set with no recorded FX basis (or one too old to rank on) is REFUSED, not
  // approximated: `scoreById` stays empty, `topRankedId` stays null, and the
  // surface says why. This is the operator's ruling (b) on 2e-c-2-FIND-01 —
  // withhold the ranking rather than publish one computed from bare numerals.
  // CR-23 / REQ-E03-05 BR-01a — only suppliers that PASS the compliance gate
  // are scored. A failing supplier's quote stays in the comparison, marked; it
  // is never ranked and cannot be selected for award. No gate read yet = not
  // qualified: a pass is never assumed.
  const rfqGates = useRfqComplianceGate(selectedRfq?.id);
  /** @param {string} supplierId */
  const gateOf = (supplierId) => rfqGates.data?.items.find((g) => g.supplierId === supplierId);
  const qualifiedQuotes = useMemo(
    () =>
      pricedQuotes.filter((q) =>
        rfqGates.data?.items.some((g) => g.supplierId === q.supplierId && g.passes)
      ),
    [pricedQuotes, rfqGates.data]
  );
  /** BL-64 — the gate has answered and no quoting supplier passes it: nothing can be awarded. */
  const noneAwardable =
    rfqGates.data !== undefined && pricedQuotes.length > 0 && qualifiedQuotes.length === 0;
  const scoring = useMemo(
    () =>
      selectedRfq && panelEvalQty !== null
        ? scoreRfqAt(
            selectedRfq,
            qualifiedQuotes,
            panelEvalQty,
            (sid) => reliabilityScoreFor(suppliers.find((s) => s.id === sid)?.otif ?? null),
            { pins: selectedRfq.fxPins }
          )
        : scoreQuotations(qualifiedQuotes, { pins: selectedRfq?.fxPins }),
    [qualifiedQuotes, selectedRfq, panelEvalQty, suppliers]
  );
  /** The non-base currencies actually bid on this RFQ — what needs a basis. */
  const foreignCurrencies = useMemo(
    () => [...new Set(pricedQuotes.map((q) => q.currency))].filter((c) => c !== BASE_CURRENCY),
    [pricedQuotes]
  );
  const scoreById = useMemo(
    () =>
      new Map(
        scoring.kind === 'scored'
          ? scoring.scores.map((s) => /** @type {const} */ ([s.quoteId, s]))
          : []
      ),
    [scoring]
  );
  // A refused comparison has NO recommendation. Not a fallback to the first
  // quote, not the previous winner — nothing, because there is no basis on
  // which one bid beats another.
  const topRankedId =
    scoring.kind === 'scored' ? (scoring.scores.find((s) => s.topRanked)?.quoteId ?? null) : null;

  // The board reads the seam list ALONE. A created RFQ arrives here through
  // getRFQs after the create dispatch invalidates — never a client-fabricated
  // peer spread in (the retired `extraRfqs` anti-pattern, C6 §1).
  const rfqs = baseRfqs;
  // ONE clock read for the board, captured once and injected into every
  // day-count below — the replacement for the deleted `REFERENCE_TODAY` pin.
  const nowIso = TODAY;

  // ⚠️ **THE ONE ENTRY POINT, AND IT TAKES THE PREFILL AS AN ARGUMENT.** The
  // page's own "New RFQ" button calls it with nothing; the in-wizard requisition
  // picker calls it with a prefill; C.3's deep link from the requisition surface
  // will call THIS SAME function with a prefill built by the same
  // `prefillFromRequisition`. One entry shape, three callers — a second opener
  // taking a different shape is how C.3 would end up rewriting C.2.
  /** @param {RequisitionPrefill} [prefill] */
  const openWizard = (prefill) => {
    setEditingRfqId(null);
    setDraft(prefill ? applyPrefill(emptyDraft(), prefill) : emptyDraft());
    setWizardStep(0);
    setSupplierSearch('');
    setWizardOpen(true);
  };

  // ⚠️ **THE GENERIC ENTRANCE — ONE SEED SHAPE FOR EVERY OTHER SOURCE.** An RFI,
  // a template and a past RFQ each become an `RfqDraftSeed` (`rfqDraft.js`) and
  // open the wizard through here. An RFP source is one more `seedFrom…` feeding
  // this same function; nothing in the wizard changes for it.
  /** @param {RfqDraftSeed} seed */
  const openWizardFromSeed = (seed) => {
    setEditingRfqId(null);
    setDraft(applySeed(emptyDraft(), seed));
    setWizardStep(0);
    setSupplierSearch('');
    setPickerOpen(false);
    setWizardOpen(true);
  };

  // Re-point the OPEN wizard at a requisition, without closing it. The picker
  // sits in step 0, so it must not reset the step the way `openWizard` does.
  /** @param {RequisitionPrefill | null} prefill */
  const applySource = (prefill) => {
    setDraft((d) =>
      prefill
        ? applyPrefill(d, prefill)
        : // Clearing the source clears ONLY what the prefill owns. Anything the
          // buyer typed themselves stays — dropping their edits because they
          // changed their mind about the origin would be the surface deciding
          // their work was the requisition's rather than theirs.
          { ...d, sourceRequisitionId: undefined }
    );
  };

  // BL-93 — THE EDIT ENTRANCE. The same wizard, opened on every stored field
  // of a Draft RFQ (`seedForEdit`), saving through `t_rfq_revise_draft`.
  /** @param {RFQ} rfq */
  const openWizardForEdit = (rfq) => {
    setEditingRfqId(rfq.id);
    setDraft(applySeed(emptyDraft(), seedForEdit(rfq)));
    setWizardStep(0);
    setSupplierSearch('');
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setEditingRfqId(null);
  };

  // ⚠️ **C.3's DEEP LINK — A THIRD CALLER OF `openWizard`, NOT A SECOND ENTRY
  // SHAPE.** The requisition surface navigates here with a requisition ID in
  // router state; this resolves it against the SAME `sourceablePrs` the picker
  // offers and calls the SAME `openWizard(prefill)`. Nothing about the signature
  // changed to accommodate it, which is the decomposition's constraint: C.3 must
  // not rewrite C.2.
  //
  // ⚠️ **THE ID TRAVELS, NOT THE PREFILL.** Sending the built prefill through
  // history state would ship a SNAPSHOT taken on another page — stale the moment
  // the requisition moves, and un-revalidatable here. Sending the id means this
  // page derives the prefill from its own live read, and an id that no longer
  // qualifies (already sourced, since withdrawn) simply opens an ordinary
  // wizard rather than one prefilled from a document that has moved on.
  const location = useLocation();
  const navigate = useNavigate();
  const consumedDeepLink = useRef(/** @type {string | null | null} */ (null));
  const deepLinkId =
    typeof (
      /** @type {{ sourceRequisitionId?: unknown } | null} */ (location.state)?.sourceRequisitionId
    ) === 'string'
      ? /** @type {{ sourceRequisitionId: string }} */ (location.state).sourceRequisitionId
      : null;

  useEffect(() => {
    if (!deepLinkId || consumedDeepLink.current === deepLinkId) return;
    consumedDeepLink.current = deepLinkId;
    const pr = sourceablePrs.find((r) => r.id === deepLinkId);
    openWizard(pr ? prefillFromRequisition(pr) : undefined);
    // Clear the state so a re-render, a back-navigation, or a refresh does not
    // re-open a wizard the buyer has already closed. `replace` keeps the history
    // entry rather than adding one.
    navigate(location.pathname + location.search, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkId, sourceablePrs]);

  // ⚠️ **RFI → RFQ (REQ-E03-03 BR-02), AND IT WAS BROKEN UNTIL NOW.** The RFI's
  // "Create RFQ" button has always navigated to `/buyer/rfq?rfi=<id>`, and
  // nothing here read the parameter, so `prefillRfqFromRfi` had no caller. The
  // id travels, not the prefill (the requisition rule above): this page reads
  // the RFI from its own live query, builds the prefill through the existing
  // pure function, and opens the wizard through the generic seed entrance.
  // The parameter is then removed so a refresh or a back-navigation does not
  // re-open a wizard the buyer already closed.
  const [searchParams, setSearchParams] = useSearchParams();
  const rfiParam = searchParams.get('rfi');
  const rfiEvents = useRfiEvents();
  const consumedRfi = useRef(/** @type {string | null | null} */ (null));
  useEffect(() => {
    if (!rfiParam || consumedRfi.current === rfiParam || rfiEvents.isPending) return;
    consumedRfi.current = rfiParam;
    const event = (rfiEvents.data?.items ?? []).find((e) => e.id === rfiParam);
    if (event) {
      openWizardFromSeed(
        seedFromRfiPrefill(prefillRfqFromRfi(event, event.responses), event.eventNumber)
      );
    } else {
      toast({
        variant: 'error',
        title: t('rfqAuthoring.prefill.rfiMissing.title'),
        description: t('rfqAuthoring.prefill.rfiMissing.desc', { id: rfiParam })
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('rfi');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfiParam, rfiEvents.isPending, rfiEvents.data]);

  // RFP → RFQ (spec D3) — the same entrance as `?rfi=`, and the same rule: the
  // ids travel, not the prefill. `?rfp=<id>&options=<id>,<id>` names the RFP and
  // the options the buyer chose on it (PTI's or a supplier's own); this page
  // reads the RFP from its own live query, runs the existing pure
  // `prefillRfqItemsFromRfp`, and opens the wizard through the generic seed. An
  // RFP it cannot find, or options that name nothing on it, open NOTHING
  // pre-filled and say so — never a blank wizard that looks like a pre-fill.
  const rfpParam = searchParams.get('rfp');
  const optionsParam = searchParams.get('options');
  const rfpEvents = useRfpEvents();
  // RFx D3 (NR-2 BR-08) — the RFP's awards in force: an option one of them
  // placed is left out of the pre-fill, by the rule the create policy refuses it by.
  const rfpAwards = useRfpAwards();
  const consumedRfp = useRef(/** @type {string | null | null} */ (null));
  useEffect(() => {
    if (!rfpParam || consumedRfp.current === rfpParam || rfpEvents.isPending || rfpAwards.isPending)
      return;
    consumedRfp.current = rfpParam;
    const event = (rfpEvents.data?.items ?? []).find((e) => e.id === rfpParam);
    const chosen = (optionsParam ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const awarded = [
      ...awardedRefsOf((rfpAwards.data?.items ?? []).filter((a) => a.eventId === rfpParam)).keys()
    ];
    const seed = event ? prefillRfqItemsFromRfp(event, event.responses, chosen, awarded) : null;
    if (rfqCreateAvailability.kind !== 'held') {
      // The entrance is the unit (§84): a seat without `rfq:create` does not get
      // a wizard the dispatcher would refuse at the end. The page header's
      // handoff notice already names whose act it is.
    } else if (event && seed && seed.items.length > 0) {
      openWizardFromSeed(seedFromRfp(seed, event.eventNumber));
    } else {
      toast({
        variant: 'error',
        title: t('rfqAuthoring.prefill.rfpMissing.title'),
        description: t('rfqAuthoring.prefill.rfpMissing.desc', { id: rfpParam })
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('rfp');
    next.delete('options');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfpParam, rfpEvents.isPending, rfpEvents.data, rfpAwards.isPending, rfpAwards.data]);

  /**
   * @template {keyof DraftRfq} K
   * @param {K} key
   * @param {DraftRfq[K]} value
   */
  const updateDraft = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  /** @param {string} m */
  const toggleMaterial = (m) => {
    setDraft((d) => ({
      ...d,
      materials: d.materials.includes(m) ? d.materials.filter((x) => x !== m) : [...d.materials, m]
    }));
  };

  /** @param {string} id */
  const toggleSupplier = (id) => {
    setDraft((d) => ({
      ...d,
      invitedSupplierIds: d.invitedSupplierIds.includes(id)
        ? d.invitedSupplierIds.filter((x) => x !== id)
        : [...d.invitedSupplierIds, id]
    }));
  };

  // ── CP-0 · W1 · 2e-b-4a — the ONE read of the wizard's two numbers ─────────
  // The step gate, the review summary, and the dispatched payload ALL read this
  // one result. Before, each re-read `draft.totalQty` with its own recipe, so
  // the number that unlocked the wizard, the number the buyer confirmed on the
  // review step, and the number the RFQ was minted with could be three different
  // numbers — and "2,400" could be all three at once as NaN.
  const rfqNumbers = useMemo(() => normalizeRfqCreateDraft(draft), [draft]);

  // The two FIELD-LEVEL reads (2e-b-4b). Same parser, same strings — these
  // cannot disagree with the composite above; they exist because the composite
  // is sequential and so can only ever name one field at a time. On a fresh
  // wizard the quantity is blank, so without these the budget input could never
  // report its own refusal.
  // The chosen requisition, re-derived from the draft's key rather than held in
  // a second state. One source of truth: if `sourceRequisitionId` is set, the
  // row it names is what the review reports — there is no way for a stale copy
  // to describe a requisition the payload no longer points at.
  const sourcePrefill = useMemo(() => {
    if (!draft.sourceRequisitionId) return null;
    const pr = sourceablePrs.find((r) => r.id === draft.sourceRequisitionId);
    if (!pr) return null;
    return { ...prefillFromRequisition(pr), label: `${pr.prNumber} · ${pr.material}` };
  }, [draft.sourceRequisitionId, sourceablePrs]);

  const qtyRead = useMemo(() => readRfqTotalQty(draft.totalQty), [draft.totalQty]);
  const budgetRead = useMemo(() => readRfqBudget(draft.budget), [draft.budget]);

  const itemsRefusal = useMemo(() => itemsStepRefusal(draft.items), [draft.items]);
  const tiersRefusal = useMemo(() => tiersStepRefusal(draft.tiers), [draft.tiers]);
  const optionsRefusal = optionsStepRefusal(draft);
  // NR-1 BR-02 — the items a document request may name, as the payload numbers
  // them (`toRfqItem`: line = position + 1), so the level select and the verb's
  // `itemLineNo` check read the same numbers.
  const docItems = draft.items.map((item, i) => ({ lineNo: i + 1, description: item.description }));
  const docsRefusal = documentRequestsRefusal(
    draft.documentRequests ?? [],
    docItems.map((i) => i.lineNo)
  );
  /** @param {Partial<RfqAuthoringDraft>} patch */
  const updateAuthoring = (patch) => setDraft((d) => ({ ...d, ...patch }));

  /**
   * @param {number} step
   * @returns {boolean}
   */
  const isStepValid = (step) => {
    if (step === 0) {
      return (
        draft.title.trim().length > 0 &&
        draft.category !== '' &&
        // B1 review fix (a) — "Specific material(s)" is OPTIONAL. Every RFQ
        // this wizard raises has an Items step (one item at least, refused by
        // name otherwise), and the items describe what is sourced; the
        // hard-coded catalogue has no sticker, mold or box entry to pick.
        // A requisition pre-fill never carried materials, so it is unchanged.

        // The quantity must be READABLE and positive. The positivity half is the
        // pre-existing `Number(draft.totalQty) > 0` guard, preserved verbatim in
        // meaning: this batch makes the reading honest, it does not relax what
        // the wizard already refused. Whether a zero-quantity RFQ deserves a
        // NAMED refusal (the ZERO_PRICE / ZERO_MOQ precedent) instead of an
        // anonymous disabled button is 4a-FIND-02 — a commercial ruling, not a
        // parsing one, and not taken here.
        rfqNumbers.ok &&
        rfqNumbers.value.totalQty > 0
      );
    }
    // The three authoring steps are judged by the SAME rules the create verb
    // binds (`rfq_create_valid`), so a step that lets the buyer through is one
    // the dispatch will accept — and each says why when it does not.
    if (step === 1) return itemsRefusal === null;
    if (step === 2) return tiersRefusal === null;
    if (step === 3) return optionsRefusal === null;
    if (step === 4) return draft.invitedSupplierIds.length > 0;
    if (step === 5) {
      if (!draft.responseDeadline || !draft.awardDeadline) return false;
      return new Date(draft.awardDeadline) > new Date(draft.responseDeadline);
    }
    // NR-1 BR-02 — the create verb's own rule (`rfqCreateRefusal` calls it).
    if (step === 6) return docsRefusal === null;
    return true;
  };

  // Raise the RFQ through the dispatcher (t_rfq_create) — the SAME governed path
  // the award/cancel/reopen verbs use, NOT a client-fabricated peer. The number is
  // store-assigned (honest); a non-failed outcome invalidates the reads so the new
  // Open RFQ arrives on the board via getRFQs. Both failure channels leave the
  // board unchanged and surface an honest toast.
  // BL-93 — save the edited draft (`t_rfq_revise_draft`, compare-and-set on
  // Draft), and with `send` publish it in the same act. The payload is the one
  // create builds, from the same parsed numbers, so an edit cannot store a
  // shape the create verb would have refused.
  /** @param {boolean} send */
  const saveEdit = (send) => {
    if (!editingRfqId) return;
    if (!rfqNumbers.ok) {
      toast({
        variant: 'error',
        title: t('sourcing.toast.numberRefused.title'),
        description: t(rfqRefusalKey(rfqNumbers))
      });
      return;
    }
    reviseMutation.mutate(
      {
        rfqId: editingRfqId,
        publish: send,
        payload: {
          ...buildRfqCreatePayload(draft, rfqNumbers.value),
          ...buildRfqAuthoringPayload(draft)
        }
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.createFailed.title'),
              description:
                draftEditRefusal(t, result.reason) ??
                refusalText(result.reason) ??
                (result.reason
                  ? refusalMessage(t, result.reason)
                  : t('sourcing.toast.createFailed.default'))
            });
            return;
          }
          closeWizard();
          toast({
            variant: 'success',
            title: t(send ? 'rfxEdit.toast.sent' : 'rfxEdit.toast.saved')
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.createFailed.title'),
            description: t('sourcing.toast.createFailed.dispatch')
          })
      }
    );
  };

  const submitWizard = () => {
    // The parse gate fires FIRST and it BLOCKS. `isStepValid(0)` already keeps
    // the wizard from reaching this step, so this is the SECOND lock: a
    // programmatic or race-y submit cannot slip an unreadable quantity into a
    // store-minted RFQ, where it would become the multiplicand of every
    // quotation's total price. The refusal is NAMED rather than folded into the
    // generic create-failed toast — "we cannot tell which number you mean" and
    // "you left this blank" ask the buyer for different things.
    if (!rfqNumbers.ok) {
      toast({
        variant: 'error',
        title: t('sourcing.toast.numberRefused.title'),
        description: t(rfqRefusalKey(rfqNumbers))
      });
      return;
    }
    if (editingRfqId) {
      saveEdit(false);
      return;
    }
    const invitedCount = draft.invitedSupplierIds.length;
    createMutation.mutate(
      // The SAME parsed values the gate above judged — the builder can no longer
      // re-read the strings and reach a different number (CP-0 §4).
      {
        payload: {
          ...buildRfqCreatePayload(draft, rfqNumbers.value),
          // The authoring half — items, breaks, questions, options, files,
          // provenance, and the CURRENCY the buyer chose (the store used to
          // write 'IDR' whatever it was).
          ...buildRfqAuthoringPayload(draft)
        }
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.createFailed.title'),
              // A `rfq_create_valid` refusal is named, so it is said in the
              // buyer's language; anything else keeps the prior fallback chain.
              description:
                refusalText(result.reason) ??
                (result.reason
                  ? refusalMessage(t, result.reason)
                  : t('sourcing.toast.createFailed.default'))
            });
            return;
          }
          setWizardOpen(false);
          toast({
            variant: 'success',
            title: t('sourcing.toast.created.title', { rfqNumber: result.entityId }),
            description: t(
              invitedCount === 1
                ? 'sourcing.toast.created.desc.one'
                : 'sourcing.toast.created.desc.other',
              { count: invitedCount }
            )
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.createFailed.title'),
            description: t('sourcing.toast.createFailed.dispatch')
          })
      }
    );
  };

  // ── REQ-E03-01 — THE INVITEE SEARCH ────────────────────────────────────
  //
  // The candidates come from the read model, NOT from `suppliers`: the read
  // applies the status gate (`isSelectableSupplier`), so a suspended,
  // deactivated or blacklisted supplier is not a candidate at all rather than
  // a row this page has to remember to filter. The category filter still maps
  // the RFQ category onto the master's own category vocabulary here, because
  // that mapping is this wizard's and not the master's.
  /** @type {readonly string[]} */
  const cats = draft.category ? CATEGORY_TO_SUPPLIER_CATEGORY[draft.category] : [];
  // Material G2 (MR-10 BR-06) — the event's type comes from its category; the
  // buyer never types it. It travels with the search so each candidate carries
  // its eligibility (BR-05).
  const sourcingMap = useSourcingTypeMap();
  const draftSourcingType = draft.category
    ? mappedSourcingType({ kind: 'rfq', materialCategory: draft.category }, sourcingMap)
    : undefined;
  // CR-23 / BR-06 — the chosen materials travel with the search so each
  // candidate carries its compliance gate: a failing supplier stays selectable
  // (it can be invited and can quote) and is marked as not awardable.
  const inviteeCandidatesQuery = useInviteeCandidates({
    ...(inviteeGroup ? { purchasingGroup: inviteeGroup } : {}),
    materialCodes: draft.materials,
    ...(draftSourcingType ? { sourcingType: draftSourcingType } : {})
  });
  const inviteePool = useMemo(
    () =>
      (inviteeCandidatesQuery.data?.items ?? []).filter((c) =>
        draft.category ? cats.includes(c.category) : true
      ),
    [inviteeCandidatesQuery.data, draft.category, cats]
  );

  const aiRecommendedSuppliers = useMemo(() => {
    if (!draft.category) return [];
    // A supplier with NO history sorts last rather than bottom-of-the-league:
    // `-1` is outside the 0..100 axis, so it can never be confused with a
    // measured zero, and the list never recommends a supplier on a number that
    // does not exist.
    // Material G2 — never recommend a vendor the event cannot invite.
    return inviteePool
      .filter((c) => c.eligibility?.state !== 'refused')
      .sort((a, b) => (b.otif ?? -1) - (a.otif ?? -1))
      .slice(0, 4);
  }, [draft.category, inviteePool]);

  /** BL-52 — the countries this pool can offer, before the BR-05 filters narrow it. */
  const inviteeCountries = useMemo(
    () => [...new Set(inviteePool.map((c) => c.country))].sort(),
    [inviteePool]
  );

  const supplierTableFiltered = useMemo(
    () =>
      inviteePool.filter((s) => {
        // BL-52 / BR-05 — composes with category and purchasing group (AND).
        if (!matchesSupplierFilters(s, inviteeFilters)) return false;
        if (!supplierSearch) return true;
        const q = supplierSearch.toLowerCase();
        return s.supplierName.toLowerCase().includes(q) || s.country.toLowerCase().includes(q);
      }),
    [supplierSearch, inviteePool, inviteeFilters]
  );

  /** The filters in force, in business language — what the empty state shows. */
  const activeInviteeFilters = useMemo(() => {
    /** @type {string[]} */
    const parts = [];
    if (draft.category) parts.push(draft.category);
    if (inviteeGroup) {
      const key = purchasingGroupNameKey(inviteeGroup);
      parts.push(`${inviteeGroup}${key ? ` · ${t(key)}` : ''}`);
    }
    parts.push(...inviteeFilterLabels(inviteeFilters));
    return parts;
  }, [draft.category, inviteeGroup, t, inviteeFilters, inviteeFilterLabels]);

  const clearInviteeFilters = () => {
    setInviteeGroup('');
    setSupplierSearch('');
    setInviteeFilters({});
  };

  const authoringRows = authoringReviewRows(t, draft, draft.origin);

  /** @type {WizardStep[]} */
  const wizardSteps = [
    {
      id: 'scope',
      title: t('sourcing.wizard.step.scope.title'),
      shortTitle: t('sourcing.wizard.step.scope.short'),
      description: t('sourcing.wizard.step.scope.desc'),
      content: (
        <div className="space-y-5">
          {/* ⚠️ C.2 — THE REQUISITION ENTRANCE, AND IT IS OPTIONAL BY DESIGN.
              Most RFQs are not raised from a requisition, so this is the FIRST
              field but never a required one: leaving it alone is the ordinary
              path and cascades onto nothing. Choosing one fills the fields it
              can carry and sets `sourceRequisitionId`, which is the payload key
              the dispatcher's cascade resolver reads. */}
          {/* B6 — where this wizard's content came from, one line, named by the
              event page's own resolver. BL-93 — an edit says which draft it is
              instead, and offers no requisition entrance: a requisition is
              linked once, when the RFQ is raised. */}
          {editingRfq ? (
            <div
              className="text-sm text-text-secondary bg-bg-hover border border-border-subtle rounded-md px-3 py-2"
              data-testid="rfq-edit-banner"
            >
              <span className="font-semibold text-text-primary">
                {t('rfxEdit.editing', { number: editingRfq.rfqNumber })}
              </span>{' '}
              {t('rfxEdit.editing.hint')}
            </div>
          ) : (
            draft.origin && <RfqPrefillBanner kind={draft.origin.kind} refs={draft} rfqs={rfqs} />
          )}
          {!editingRfqId && (
            <div>
              <label
                htmlFor="rfq-source-requisition"
                className="text-label text-text-tertiary uppercase block mb-1.5"
              >
                {t('sourcing.wizard.field.sourceRequisition')}
              </label>
              {sourceablePrs.length === 0 ? (
                /* ⚠️ AN HONEST EMPTY STATE, NOT A BLANK CONTROL. A `<select>` with
                 only a placeholder looks broken and says nothing; this names WHY
                 there is nothing to choose — a sourcing event is raised from an
                 APPROVED requisition, and none is waiting. */
                <p
                  className="text-sm text-text-tertiary border border-border-subtle rounded-md px-3 py-2 bg-bg-hover"
                  data-testid="rfq-source-empty"
                >
                  {t('sourcing.wizard.sourceRequisition.none')}
                </p>
              ) : (
                <>
                  <select
                    id="rfq-source-requisition"
                    data-testid="rfq-source-select"
                    value={draft.sourceRequisitionId ?? ''}
                    onChange={(e) =>
                      applySource(
                        sourceablePrs
                          .filter((pr) => pr.id === e.target.value)
                          .map(prefillFromRequisition)[0] ?? null
                      )
                    }
                    className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                  >
                    <option value="">{t('sourcing.wizard.sourceRequisition.placeholder')}</option>
                    {sourceablePrs.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.prNumber} · {pr.material}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-tertiary mt-1">
                    {t('sourcing.wizard.sourceRequisition.help')}
                  </p>
                </>
              )}
            </div>
          )}
          <div>
            <label className="block">
              <span className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.title')} <span className="text-danger">*</span>
              </span>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateDraft('title', e.target.value)}
                placeholder={t('sourcing.wizard.placeholder.title')}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
            </label>
          </div>
          <div>
            <label
              htmlFor="rfq-project-name"
              className="text-label text-text-tertiary uppercase block mb-1.5"
            >
              {t('rfqAuthoring.field.projectName')}
            </label>
            <input
              id="rfq-project-name"
              type="text"
              value={draft.projectName}
              onChange={(e) => updateDraft('projectName', e.target.value)}
              placeholder={t('rfqAuthoring.placeholder.projectName')}
              className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase block mb-1.5">
                  {t('sourcing.wizard.field.category')} <span className="text-danger">*</span>
                </span>
                <select
                  value={draft.category}
                  onChange={(e) => {
                    updateDraft('category', /** @type {RFQCategory} */ (e.target.value));
                    updateDraft('materials', []);
                  }}
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                >
                  <option value="">{t('sourcing.wizard.select.category')}</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(t, c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.budget')}
              </label>
              {/* Ruling 6.2 — and load-bearing here in the worst way, because a
                  blank is LEGAL on this field. `type="number"` erases a token it
                  cannot parse to "" before React sees it, so the browser would
                  quietly convert a budget the buyer typed into the "not
                  specified" default with nobody told — the same silent
                  downgrade the MOQ field was rescued from in 2e-b-2. */}
              <input
                type="text"
                inputMode="decimal"
                value={draft.budget}
                onChange={(e) => updateDraft('budget', e.target.value)}
                placeholder={t('sourcing.wizard.placeholder.budget')}
                aria-label={t('sourcing.wizard.field.budget')}
                aria-invalid={!budgetRead.ok}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
              {/* An untouched blank does not nag — it is this field's answer,
                  so `readRfqBudget` never refuses one. */}
              {!budgetRead.ok && (
                <div
                  role="alert"
                  data-testid="rfq-budget-refusal"
                  className="mt-1 text-[11px] text-danger"
                >
                  {t(RFQ_BUDGET_REFUSAL_KEY[budgetRead.reason])}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'QtyRefusalReason', term: budgetRead.reason }}
                  />
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('sourcing.wizard.field.materials')}{' '}
              <span className="normal-case text-text-tertiary">
                {t('rfqCompare.wizard.optional')}
              </span>
            </label>
            <p
              className="text-xs text-text-tertiary mb-1.5"
              data-testid="wizard-materials-optional"
            >
              {t('rfqCompare.wizard.materialsOptional')}
            </p>
            {draft.category ? (
              <div className="flex flex-wrap gap-2">
                {MATERIAL_CATALOG[/** @type {RFQCategory} */ (draft.category)].map((m) => {
                  const selected = draft.materials.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMaterial(m)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selected
                          ? 'bg-action text-white border border-action'
                          : 'bg-bg-surface text-text-secondary border border-border-input hover:border-action'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">
                {t('sourcing.wizard.materials.selectFirst')}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.totalQty')} <span className="text-danger">*</span>
              </label>
              {/* Ruling 6.2 — the parse CANNOT fire behind `type="number"`,
                  which is what 2e-b-4a's smoke proved on a live id-ID browser:
                  "2.400" reached Review as 2,4 because the number input had
                  already rewritten the value per browser locale before React
                  saw it. The gate cannot refuse what it never sees. `min="0"`
                  goes with it — it was part of the number-input contract and
                  the positivity rule now lives in `isStepValid`, where it is
                  actually enforced. `type="text"` returns `.value` VERBATIM in
                  every locale, which is what makes the parser load-bearing. */}
              <input
                type="text"
                inputMode="decimal"
                value={draft.totalQty}
                onChange={(e) => updateDraft('totalQty', e.target.value)}
                placeholder={t('sourcing.wizard.placeholder.qty')}
                aria-label={t('sourcing.wizard.field.totalQty')}
                aria-invalid={draft.totalQty.trim() !== '' && !qtyRead.ok}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
              {/* An untouched blank does not nag on sight — it refuses at the
                  gate (Next stays disabled) and says so on the field once the
                  buyer has typed something (the 2e-a price precedent). */}
              {draft.totalQty.trim() !== '' && !qtyRead.ok && (
                <div
                  role="alert"
                  data-testid="rfq-qty-refusal"
                  className="mt-1 text-[11px] text-danger"
                >
                  {t(RFQ_QTY_REFUSAL_KEY[qtyRead.reason])}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'QtyRefusalReason', term: qtyRead.reason }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase block mb-1.5">
                  {t('sourcing.wizard.field.uom')}
                </span>
                <select
                  value={draft.uom}
                  onChange={(e) =>
                    updateDraft('uom', /** @type {(typeof UOM_OPTIONS)[number]} */ (e.target.value))
                  }
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                >
                  {UOM_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'items',
      title: t('rfqAuthoring.step.items.title'),
      shortTitle: t('rfqAuthoring.step.items.short'),
      description: t('rfqAuthoring.step.items.desc'),
      content: (
        <ItemsStep
          items={draft.items}
          // NR-1 BR-02 — a request names its item by position, so removing an
          // item remaps the requests in the SAME update, never after it.
          onChange={(items) =>
            setDraft((d) => {
              if (!d.documentRequests) return { ...d, items };
              const remap = remapRequestsOnItemsChanged(
                d.documentRequests,
                d.items.map((i) => i.uid),
                items.map((i) => i.uid)
              );
              return {
                ...d,
                items,
                documentRequests: [...remap.requests],
                unlinkedDocRequestIds: [...(d.unlinkedDocRequestIds ?? []), ...remap.unlinked]
              };
            })
          }
          refusal={itemsRefusal}
        />
      )
    },
    {
      id: 'tiers',
      title: t('rfqAuthoring.step.tiers.title'),
      shortTitle: t('rfqAuthoring.step.tiers.short'),
      description: t('rfqAuthoring.step.tiers.desc'),
      content: (
        <div className="space-y-4">
          <TierEditor
            tiers={draft.tiers}
            onChange={(tiers) => updateAuthoring({ tiers })}
            testId="rfq-tiers"
          />
          <StepRefusal reason={tiersRefusal} testId="rfq-tiers-step-refusal" />
        </div>
      )
    },
    {
      id: 'options',
      title: t('rfqAuthoring.step.questions.title'),
      shortTitle: t('rfqAuthoring.step.questions.short'),
      description: t('rfqAuthoring.step.questions.desc'),
      content: (
        <QuestionsOptionsStep draft={draft} update={updateAuthoring} refusal={optionsRefusal} />
      )
    },
    {
      id: 'suppliers',
      title: t('sourcing.wizard.step.suppliers.title'),
      shortTitle: t('sourcing.wizard.step.suppliers.short'),
      description: t('sourcing.wizard.step.suppliers.desc'),
      content: (
        <div className="space-y-5">
          {aiRecommendedSuppliers.length > 0 && (
            <div className="bg-teal-soft border border-teal/20 rounded-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-teal" />
                <h4 className="text-sm font-semibold text-text-primary">
                  {t('sourcing.wizard.ai.title')}
                </h4>
                <span className="text-xs text-text-tertiary">{t('sourcing.wizard.ai.basis')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiRecommendedSuppliers.map((s) => {
                  const selected = draft.invitedSupplierIds.includes(s.supplierId);
                  return (
                    <label
                      key={s.supplierId}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selected
                          ? 'bg-bg-surface border-action'
                          : 'bg-bg-surface border-border-subtle hover:border-action'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSupplier(s.supplierId)}
                        className="mt-0.5 accent-teal"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-text-primary truncate">
                          {s.supplierName}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {s.country} · {t('rfx.otif')}{' '}
                          {s.otif === null ? t('rfx.noHistory') : `${s.otif}%`}
                          {s.purchasingGroup ? ` · ${s.purchasingGroup}` : ''}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* REQ-E03-01 BR-01 — category (taken from the event) and purchasing
              group, usable alone or together. */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem]">
              <label
                className="block text-xs font-semibold text-text-secondary mb-1"
                htmlFor="invitee-group"
              >
                {t('rfx.invite.purchasingGroup')}
              </label>
              <select
                id="invitee-group"
                data-testid="invitee-group-filter"
                value={inviteeGroup}
                onChange={(e) => setInviteeGroup(e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                <option value="">{t('rfx.pg.all')}</option>
                {PURCHASING_GROUPS.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.code} · {t(g.nameKey)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[14rem]">
              <SearchBar
                value={supplierSearch}
                onChange={setSupplierSearch}
                placeholder={t('sourcing.wizard.search.supplier')}
              />
            </div>
          </div>
          {/* BL-52 / REQ-E03-01 BR-05 — after category and purchasing group. */}
          <SupplierFilterBar
            filters={inviteeFilters}
            onChange={setInviteeFilters}
            countries={inviteeCountries}
            testIdPrefix="rfq-invitee"
          />
          <p className="text-xs text-text-tertiary -mt-3">{t('rfx.invite.onlyActive')}</p>
          <p className="text-xs text-text-tertiary -mt-3">{t('rfx.gate.inviteNote')}</p>
          {/* Material G2 — the event's type, and who it lets through. */}
          {!!draftSourcingType && (
            <div className="-mt-2 space-y-1">
              <SourcingTypePill type={draftSourcingType} testId="rfq-sourcing-type" />
              <p className="text-xs text-text-tertiary">{t('elig.invite.note')}</p>
            </div>
          )}

          <div className="relative min-w-0 border border-border-subtle rounded-md max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider text-xs sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold w-10" />
                  <th className="px-3 py-2 text-left font-semibold">
                    {t('sourcing.wizard.col.supplier')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">{t('rfx.invite.col.group')}</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    {t('sourcing.wizard.col.country')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    {t('supFilter.col.certificates')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">{t('supFilter.col.band')}</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {t('sourcing.wizard.col.otif')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {supplierTableFiltered.map((s) => {
                  const selected = draft.invitedSupplierIds.includes(s.supplierId);
                  // Material G2 — below the level against a real list: listed
                  // greyed with its missing documents, never selectable.
                  const offered = s.eligibility?.state !== 'refused';
                  return (
                    <tr
                      key={s.supplierId}
                      data-testid={`invitee-row-${s.supplierId}`}
                      data-offered={offered}
                      className={`border-t border-border-subtle ${offered ? 'hover:bg-bg-hover cursor-pointer' : 'opacity-60'}`}
                      onClick={offered ? () => toggleSupplier(s.supplierId) : undefined}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={
                            offered
                              ? s.supplierName
                              : `${s.supplierName} — ${t('elig.invite.notOffered')}`
                          }
                          checked={selected && offered}
                          disabled={!offered}
                          onChange={() => toggleSupplier(s.supplierId)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-teal"
                        />
                      </td>
                      <td className="px-3 py-2 text-text-primary">
                        {s.supplierName}
                        <div className="mt-1">
                          <GateMarker gate={s.gate} testId={`invitee-gate-${s.supplierId}`} />
                        </div>
                        <div className="mt-1">
                          <EligibilityMarker
                            eligibility={s.eligibility}
                            testId={`invitee-elig-${s.supplierId}`}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-text-secondary">
                        <Data>{s.purchasingGroup ?? '—'}</Data>
                      </td>
                      <td className="px-3 py-2 text-text-secondary">{s.country}</td>
                      {/* BL-52 — the two BR-05 facts the filters read, on the row. */}
                      <td
                        className="px-3 py-2 text-text-secondary"
                        data-testid={`invitee-cert-${s.supplierId}`}
                      >
                        {certLabel(t, s.certificates)}
                      </td>
                      <td
                        className="px-3 py-2 text-text-secondary"
                        data-testid={`invitee-band-${s.supplierId}`}
                      >
                        {bandLabel(t, s.band)}
                      </td>
                      {/* REQ-E03-01 AC-02 — the OTIF, or "No history". NEVER 0%:
                          a supplier nothing has been measured against is not a
                          supplier that failed every delivery. */}
                      <td
                        className="px-3 py-2 text-right text-text-secondary"
                        data-testid={`invitee-otif-${s.supplierId}`}
                      >
                        {s.otif === null ? (
                          <span className="text-text-tertiary">{t('rfx.noHistory')}</span>
                        ) : (
                          <Data>{s.otif}%</Data>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {supplierTableFiltered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-sm text-text-tertiary py-6">
                      {/* REQ-E03-01 edge case — the empty state NAMES the active
                          filters and offers to clear them, because "no results"
                          without saying what was asked for is a dead end. */}
                      <div data-testid="invitee-empty">
                        <div>{t('rfx.invite.empty')}</div>
                        <div className="mt-1 text-xs">
                          {activeInviteeFilters.length > 0
                            ? t('rfx.invite.activeFilters', {
                                filters: activeInviteeFilters.join(', ')
                              })
                            : t('rfx.invite.noFilters')}
                        </div>
                        <Button
                          variant="secondary"
                          className="mt-3"
                          onClick={clearInviteeFilters}
                          data-testid="invitee-clear-filters"
                        >
                          {t('rfx.invite.clear')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-text-secondary">
            <span className="inline-flex items-center gap-1.5 bg-teal-soft text-teal-hover rounded-full px-3 py-1 text-xs font-semibold">
              {t(
                draft.invitedSupplierIds.length === 1
                  ? 'sourcing.wizard.selectedCount.one'
                  : 'sourcing.wizard.selectedCount.other',
                { count: draft.invitedSupplierIds.length }
              )}
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'terms',
      title: t('sourcing.wizard.step.terms.title'),
      shortTitle: t('sourcing.wizard.step.terms.short'),
      description: t('sourcing.wizard.step.terms.desc'),
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase block mb-1.5">
                  {t('sourcing.wizard.field.responseDeadline')}{' '}
                  <span className="text-danger">*</span>
                </span>
                <input
                  type="date"
                  value={draft.responseDeadline}
                  onChange={(e) => updateDraft('responseDeadline', e.target.value)}
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
              </label>
            </div>
            <div>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase block mb-1.5">
                  {t('sourcing.wizard.field.awardDeadline')} <span className="text-danger">*</span>
                </span>
                <input
                  type="date"
                  value={draft.awardDeadline}
                  onChange={(e) => updateDraft('awardDeadline', e.target.value)}
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
              </label>
              {draft.responseDeadline &&
                draft.awardDeadline &&
                new Date(draft.awardDeadline) <= new Date(draft.responseDeadline) && (
                  <p className="text-xs text-danger mt-1">
                    {t('sourcing.wizard.awardAfterResponse')}
                  </p>
                )}
            </div>
            <div>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase block mb-1.5">
                  {t('sourcing.wizard.field.incoterms')}
                </span>
                <select
                  value={draft.incoterms}
                  onChange={(e) => updateDraft('incoterms', e.target.value)}
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                >
                  {INCOTERMS_OPTIONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase block mb-1.5">
                  {t('sourcing.wizard.field.paymentTerms')}
                </span>
                <select
                  value={draft.paymentTerms}
                  onChange={(e) => updateDraft('paymentTerms', e.target.value)}
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                >
                  {PAYMENT_TERMS_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('sourcing.wizard.field.currency')}
            </label>
            <div className="flex gap-4">
              {/* Every currency the bid policy permits, and the one chosen is
                  now STORED — the create handler used to write 'IDR'. */}
              {BID_CURRENCIES.map((cur) => (
                <label key={cur} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="currency"
                    value={cur}
                    checked={draft.currency === cur}
                    onChange={() => updateDraft('currency', cur)}
                    className="accent-teal"
                  />
                  <span className="text-sm text-text-secondary">{cur}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'documents',
      title: t('rfxa.step.documents'),
      shortTitle: t('rfxa.step.documents.short'),
      description: t('rfxa.step.documents.desc'),
      content: (
        <DocumentRequestsEditor
          value={draft.documentRequests ?? []}
          onChange={(next) => updateAuthoring({ documentRequests: [...next] })}
          items={docItems}
          unlinked={draft.unlinkedDocRequestIds ?? []}
          onUnlinkedChange={(next) => setDraft((d) => ({ ...d, unlinkedDocRequestIds: [...next] }))}
          testIdPrefix="rfq-new"
        />
      )
    },
    {
      id: 'review',
      title: t('sourcing.wizard.step.review.title'),
      shortTitle: t('sourcing.wizard.step.review.short'),
      description: t('sourcing.wizard.step.review.desc'),
      content: (
        <div className="space-y-5 text-sm">
          <ReviewSection
            label={t('sourcing.wizard.review.section.scope')}
            onEdit={() => setWizardStep(0)}
            rows={[
              ...authoringRows.basics,
              // ⚠️ C.2 — THE PROVENANCE LINE. Present ONLY when the buyer chose a
              // requisition, so an ordinary RFQ gains no empty row claiming
              // there might have been one.
              //
              // ⚠️ **IT NAMES THE ORIGIN, IT DOES NOT REASSIGN AUTHORSHIP.** The
              // wording is "raised from", not "created by": this RFQ is being
              // created by the buyer standing in this wizard, and the
              // requisition is where its requirement came from. The distinction
              // is the same one `attribution` draws — a document's SOURCE is not
              // its ACTOR — and it matters here because the cascade that follows
              // will move that requisition on this buyer's authority.
              ...(sourcePrefill
                ? /** @type {[string, React.ReactNode][]} */ ([
                    [t('sourcing.wizard.review.row.sourceRequisition'), sourcePrefill.label]
                  ])
                : []),
              // What the requisition could NOT carry, named rather than left to
              // look carried. Inside a prefilled form an untouched default is
              // indistinguishable from a derived value, so silence here would
              // let 'KG' read as the requisition's answer when it is only the
              // wizard's.
              ...(sourcePrefill && sourcePrefill.uncarried.length > 0
                ? /** @type {[string, React.ReactNode][]} */ ([
                    [
                      t('sourcing.wizard.review.row.notCarried'),
                      sourcePrefill.uncarried
                        .map((f) => t(`sourcing.wizard.review.notCarried.${f}`))
                        .join(', ')
                    ]
                  ])
                : []),
              [t('sourcing.wizard.review.row.title'), draft.title || '—'],
              [
                t('sourcing.wizard.review.row.category'),
                draft.category ? categoryLabel(t, draft.category) : '—'
              ],
              [t('sourcing.wizard.review.row.materials'), draft.materials.join(', ') || '—'],
              // 2e-b-4a — the review reads the SAME parsed numbers the payload
              // ships, so what the buyer confirms here is definitionally what
              // gets minted. It used to re-run `Number(draft.totalQty)`, which
              // is how a buyer could confirm "2.400 KG" on this very screen and
              // raise an event for 2.4 KG.
              [
                t('sourcing.wizard.review.row.quantity'),
                rfqNumbers.ok ? `${formatNumber(rfqNumbers.value.totalQty)} ${draft.uom}` : '—'
              ],
              [
                t('sourcing.wizard.review.row.budget'),
                // "Not specified" is reserved for a genuine blank — an
                // unreadable budget is not an unstated one, so it reads as the
                // em dash. (Unreachable in practice: the step-0 gate blocks a
                // refusal from ever reaching this step.)
                !rfqNumbers.ok
                  ? '—'
                  : rfqNumbers.value.estimatedValue === undefined
                    ? t('sourcing.wizard.review.budgetUnspecified')
                    : formatIDR(rfqNumbers.value.estimatedValue)
              ]
            ]}
          />
          <ReviewSection
            label={t('rfqAuthoring.review.section.items')}
            onEdit={() => setWizardStep(1)}
            rows={authoringRows.items}
          />
          <ReviewSection
            label={t('rfqAuthoring.review.section.options')}
            onEdit={() => setWizardStep(2)}
            rows={authoringRows.options}
          />
          <ReviewSection
            label={t('sourcing.wizard.review.section.suppliers')}
            onEdit={() => setWizardStep(4)}
            rows={[
              [
                t('sourcing.wizard.review.row.invited'),
                draft.invitedSupplierIds.length > 0
                  ? t(
                      draft.invitedSupplierIds.length === 1
                        ? 'sourcing.wizard.review.invited.one'
                        : 'sourcing.wizard.review.invited.other',
                      { count: draft.invitedSupplierIds.length }
                    )
                  : '—'
              ],
              [
                t('sourcing.wizard.review.row.names'),
                draft.invitedSupplierIds.map((id) => supplierNameById.get(id) ?? id).join(', ') ||
                  '—'
              ]
            ]}
          />
          <ReviewSection
            label={t('sourcing.wizard.review.section.terms')}
            onEdit={() => setWizardStep(5)}
            rows={[
              [t('sourcing.wizard.review.row.responseDeadline'), draft.responseDeadline || '—'],
              [t('sourcing.wizard.review.row.awardDeadline'), draft.awardDeadline || '—'],
              [t('sourcing.wizard.review.row.incoterms'), draft.incoterms],
              [t('sourcing.wizard.review.row.paymentTerms'), draft.paymentTerms],
              [t('sourcing.wizard.review.row.currency'), draft.currency]
            ]}
          />
          <ReviewSection
            label={t('rfxa.doc.review')}
            onEdit={() => setWizardStep(6)}
            rows={[
              [
                t('rfxa.step.documents.short'),
                <DocumentRequestsSummary
                  key="docs"
                  value={draft.documentRequests ?? []}
                  items={docItems}
                  testIdPrefix="rfq-new"
                />
              ]
            ]}
          />
          {/* D2 — the draft's content kept as a template in this browser: items,
              sheets, breaks, costs, questions and options. Not invitees, not
              dates, not files. */}
          {/* BL-93 — an edited draft may also be SENT from here, in the same
              act as the save. Sending is `rfq:publish`; a seat without it reads
              whose act it is in the button's own slot, and can still save. */}
          {editingRfqId && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {rfqVerbs.publish.kind === 'held' ? (
                <Button
                  variant="outline"
                  icon={Send}
                  disabled={reviseMutation.isPending || ![0, 1, 2, 3, 4, 5, 6].every(isStepValid)}
                  onClick={() => saveEdit(true)}
                  data-testid="rfq-edit-send"
                >
                  {t('rfxEdit.saveAndSend')}
                </Button>
              ) : (
                <HandoffNotice availability={rfqVerbs.publish} testId="handoff-rfq-edit-send" />
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() =>
                setTemplateToSave({
                  content: templateContentFromDraft(draft),
                  name: draft.projectName.trim() || draft.title.trim()
                })
              }
              data-testid="rfq-review-save-template"
            >
              {t('rfqAuthoring.template.saveAs')}
            </Button>
          </div>
        </div>
      )
    }
  ];

  const lastUpdated = useMemo(
    () =>
      rfqs.reduce((acc, r) => (r.createdAt > acc ? r.createdAt : acc), rfqs[0]?.createdAt ?? ''),
    [rfqs]
  );

  const counts = useMemo(() => {
    const open = rfqs.filter((r) => r.status === 'Open' && !isAllResponded(r)).length;
    const pending = rfqs.filter((r) => r.status === 'Open' && isAllResponded(r)).length;
    const awarded = rfqs.filter((r) => r.status === 'Awarded').length;
    const closed = rfqs.filter((r) => r.status === 'Closed' || r.status === 'Cancelled').length;
    return {
      all: rfqs.length,
      open,
      pending,
      awarded,
      closed
    };
  }, [rfqs]);

  const kpis = useMemo(() => {
    const active = rfqs.filter((r) => r.status === 'Open').length;
    const awaiting = rfqs.filter((r) => {
      if (r.status !== 'Open') return false;
      const d = daysUntil(r.responseDeadline, nowIso);
      // An unreadable deadline is not evidence a response is due this week.
      if (d === null) return false;
      return d <= 7 && d >= 0;
    }).length;
    const readyToAward = rfqs.filter((r) => r.status === 'Open' && isAllResponded(r)).length;
    const awardedQuarter = rfqs.filter((r) => {
      if (r.status !== 'Awarded') return false;
      const d = daysUntil(r.createdAt, nowIso);
      if (d === null) return false;
      return -d <= 90;
    }).length;
    return { active, awaiting, readyToAward, awardedQuarter };
  }, [rfqs, nowIso]);

  const activeFiltered = useMemo(() => {
    return rfqs
      .filter((r) => r.status !== 'Awarded')
      .filter((r) => matchesGroup(r, group))
      .filter((r) => (selectedCats.length === 0 ? true : selectedCats.includes(r.materialCategory)))
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.rfqNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.materialIds.join(' ').toLowerCase().includes(q)
        );
      });
  }, [rfqs, group, selectedCats, search]);

  const awarded = useMemo(() => rfqs.filter((r) => r.status === 'Awarded'), [rfqs]);

  /** @param {RFQCategory} cat */
  const toggleCategory = (cat) =>
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  return (
    <AppShellV2>
      <PageHeader
        // The eyebrow is the menu section alone: "Sourcing". It read
        // "Sourcing · Sourcing & RFQ" — a leftover from the one-module era,
        // naming the section twice (NV-05 replaces the first crumb anyway).
        breadcrumb={[t('hub.nav.section.sourcing')]}
        title={t('sourcing.header.title')}
        count={rfqs.length}
        subtitle={t('sourcing.header.subtitle')}
        actions={
          // §73 — the page-level create, WITHHELD rather than disabled. A seat
          // without `rfq:create` reads whose act it is instead of pressing a
          // button that opens a wizard the dispatcher will refuse at the end.
          // Export is a read holding no atom; it is not gated. TEMPLATES IS NOW
          // AN ENTRANCE TO CREATE — both of its choices open the wizard that
          // ends in `t_rfq_create` — so it is withheld with "New RFQ" rather
          // than offered to a seat the dispatcher will refuse at the end (the
          // entrance is the unit, §84).
          <div className="flex items-center gap-3">
            <HandoffNotice availability={rfqCreateAvailability} testId="handoff-rfq-create" />
            <BulkActionsBar
              actions={[
                {
                  label: t('sourcing.action.export'),
                  icon: FileSpreadsheet,
                  onClick: () => exportComparison(rfqs, `rfq-comparison-${TODAY}.csv`)
                },
                ...(rfqCreateAvailability.kind === 'held'
                  ? [
                      {
                        label: t('sourcing.action.templates'),
                        icon: FileText,
                        onClick: () => setPickerOpen(true)
                      }
                    ]
                  : [])
              ]}
              {...(rfqCreateAvailability.kind === 'held'
                ? {
                    primary: {
                      label: t('sourcing.action.newRfq'),
                      icon: Plus,
                      // ⚠️ WRAPPED, NOT PASSED BARE. `openWizard` now takes an
                      // optional prefill, and a bare handler reference hands it
                      // React's click EVENT as that argument — truthy, so every
                      // "New RFQ" press would prefill the draft from a
                      // SyntheticEvent and blank the fields the parser reads.
                      // Caught by the wizard's own numeric specs, which is why
                      // an optional first parameter on a handler is worth this
                      // comment rather than a silent arrow.
                      onClick: () => openWizard()
                    }
                  }
                : {})}
            />
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(kpis.active === 1 ? 'sourcing.meta.summary.one' : 'sourcing.meta.summary.other', {
          count: kpis.active,
          date: formatDate(lastUpdated)
        })}
        {/* D-CENSUS-8 — MARKER-SCOPE-01. The existing pills here are scoped to the
            commodity / market-intel panels; the RFQ pipeline itself was unmarked.
            PARTLY REAL: award genuinely dispatches through the wired `rfq` target
            and drives the quotation cascade, over a fixture RFQ set. */}
        <ProvenanceMarker capability="rfqs" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow={t('sourcing.kpi.active.eyebrow')}
          value={kpis.active.toString()}
          subtitle={t('sourcing.kpi.active.subtitle')}
          icon={FileText}
        />
        <KpiCard
          eyebrow={t('sourcing.kpi.awaiting.eyebrow')}
          value={kpis.awaiting.toString()}
          subtitle={t('sourcing.kpi.awaiting.subtitle')}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('sourcing.kpi.ready.eyebrow')}
          value={kpis.readyToAward.toString()}
          subtitle={t('sourcing.kpi.ready.subtitle')}
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow={t('sourcing.kpi.awarded.eyebrow')}
          value={kpis.awardedQuarter.toString()}
          subtitle={t('sourcing.kpi.awarded.subtitle')}
          icon={Award}
        />
      </div>

      <SubTabs
        options={[
          { id: 'all', label: t('sourcing.tab.all'), count: counts.all },
          { id: 'open', label: t('sourcing.tab.open'), count: counts.open },
          {
            id: 'pending',
            label: t('sourcing.tab.pending'),
            count: counts.pending
          },
          {
            id: 'awarded',
            label: t('sourcing.tab.awarded'),
            count: counts.awarded
          },
          {
            id: 'closed',
            label: t('sourcing.tab.closed'),
            count: counts.closed
          }
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('sourcing.filter.byCategory')}
          </div>
          <FilterChipsBar
            options={CATEGORY_OPTIONS.map((c) => ({
              id: c,
              label: categoryLabel(t, c)
            }))}
            value={selectedCats}
            onChange={toggleCategory}
            multiSelect
          />
        </div>
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('sourcing.search.placeholder')}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-8">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('sourcing.table.col.rfq')}</TableHeaderCell>
            <TableHeaderCell>{t('sourcing.table.col.category')}</TableHeaderCell>
            <TableHeaderCell>{t('sourcing.table.col.responses')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('sourcing.table.col.qty')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('sourcing.table.col.estValue')}
            </TableHeaderCell>
            <TableHeaderCell>{t('sourcing.table.col.responseDeadline')}</TableHeaderCell>
            <TableHeaderCell>{t('sourcing.table.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('sourcing.table.col.actions')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {activeFiltered.map((r) => {
              const responded = r.respondedSupplierIds.length;
              const invited = r.invitedSupplierIds.length;
              const pct = invited === 0 ? 0 : (responded / invited) * 100;
              const days = daysUntil(r.responseDeadline, nowIso);
              const deadlineTone =
                r.status !== 'Open' || days === null
                  ? 'text-text-secondary'
                  : days < 3
                    ? 'text-danger font-semibold'
                    : days < 7
                      ? 'text-warning-hover font-semibold'
                      : 'text-text-secondary';
              return (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => openRfq(r)}>
                  <TableCell>
                    <Data as="div" className="font-semibold text-text-primary">
                      {r.rfqNumber}
                    </Data>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {r.projectName && (
                        <span
                          className="inline-block mr-1.5 px-1.5 py-px rounded border border-border-subtle bg-bg-hover text-[11px] text-text-secondary"
                          data-testid={`rfq-project-tag-${r.id}`}
                        >
                          {r.projectName}
                        </span>
                      )}
                      {r.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {categoryLabel(t, r.materialCategory)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary font-medium">
                      {responded} / {invited}
                    </div>
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-bg-hover overflow-hidden">
                      <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-text-secondary whitespace-nowrap">
                    <Data>
                      {formatNumber(r.totalQty)} {r.uom}
                    </Data>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    <Data>{formatIDR(r.estimatedValue)}</Data>
                  </TableCell>
                  <TableCell>
                    <Data as="div" className={`text-sm whitespace-nowrap ${deadlineTone}`}>
                      {formatDate(r.responseDeadline)}
                    </Data>
                    {r.status === 'Open' && days !== null && (
                      <div
                        className={`text-xs mt-0.5 ${
                          days < 0
                            ? 'text-danger'
                            : days < 3
                              ? 'text-danger'
                              : days < 7
                                ? 'text-warning-hover'
                                : 'text-text-tertiary'
                        }`}
                      >
                        {days < 0
                          ? t('sourcing.deadline.overdue', {
                              count: Math.abs(days)
                            })
                          : days === 0
                            ? t('sourcing.deadline.dueToday')
                            : t('sourcing.deadline.remaining', { count: days })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[r.status]}>{r.status}</StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight size={16} className="text-text-tertiary inline-block" />
                  </TableCell>
                </TableRow>
              );
            })}
            {activeFiltered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-sm text-text-tertiary py-10">
                  {t('sourcing.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Awards history */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setAwardsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-hover transition-colors"
        >
          <div className="text-left">
            <h2 className="text-section text-text-primary">{t('sourcing.awards.title')}</h2>
            <p className="text-meta text-text-tertiary">
              {t(
                awarded.length === 1 ? 'sourcing.awards.count.one' : 'sourcing.awards.count.other',
                { count: awarded.length }
              )}
            </p>
          </div>
          {awardsOpen ? (
            <ChevronUp size={16} className="text-text-tertiary" />
          ) : (
            <ChevronDown size={16} className="text-text-tertiary" />
          )}
        </button>
        {awardsOpen && (
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('sourcing.awards.col.rfq')}</TableHeaderCell>
              <TableHeaderCell>{t('sourcing.awards.col.title')}</TableHeaderCell>
              <TableHeaderCell>{t('sourcing.awards.col.supplier')}</TableHeaderCell>
              <TableHeaderCell>{t('sourcing.awards.col.date')}</TableHeaderCell>
              <TableHeaderCell className="text-right">
                {t('sourcing.awards.col.value')}
              </TableHeaderCell>
              <TableHeaderCell className="text-right">
                {t('sourcing.awards.col.actions')}
              </TableHeaderCell>
            </TableHeader>
            <tbody>
              {awarded.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => openRfq(r)}>
                  <TableCell className="font-semibold text-text-primary">
                    <Data>{r.rfqNumber}</Data>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">{r.title}</TableCell>
                  <TableCell
                    className="text-sm text-text-primary"
                    data-testid={`award-history-supplier-${r.id}`}
                  >
                    {/* BL-37 — a split names EVERY awarded supplier, read from
                        the award record; the principal alone would hide the
                        rest of the split. */}
                    {(() => {
                      const rec = awardByRfq.get(r.id);
                      const names = rec
                        ? [...new Set(rec.lines.map((l) => l.supplierId))].map(
                            (id) => supplierNameById.get(id) ?? id
                          )
                        : [];
                      if (names.length > 1) {
                        return (
                          <>
                            {names.join(', ')}
                            <div className="text-xs text-text-tertiary">
                              {
                                /** @type {import('@services/sourcing/views').AwardView} */ (
                                  rec
                                ).lines.some((l) => l.itemLineNo !== undefined) && isTieredRfq(r)
                                  ? t('rfqCompare.history.split')
                                  : null
                              }
                            </div>
                          </>
                        );
                      }
                      return r.awardedSupplierId
                        ? (supplierNameById.get(r.awardedSupplierId) ?? '—')
                        : '—';
                    })()}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                    <Data>{formatDate(r.awardDeadline)}</Data>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    <Data>{formatIDR(r.estimatedValue)}</Data>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight size={16} className="text-text-tertiary inline-block" />
                  </TableCell>
                </TableRow>
              ))}
              {awarded.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-text-tertiary py-10">
                    {t('sourcing.awards.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </section>

      <SidePanel
        open={selectedRfq !== null}
        onClose={closePanel}
        title={
          selectedRfq
            ? t('sourcing.panel.title', {
                number: selectedRfq.rfqNumber,
                title: selectedRfq.title
              })
            : ''
        }
        footerActions={
          selectedRfq && (
            <>
              <Button
                variant="secondary"
                icon={Download}
                data-testid="panel-export-comparison"
                onClick={() =>
                  exportComparison([selectedRfq], `${selectedRfq.rfqNumber}-comparison.csv`)
                }
              >
                {t('sourcing.panel.exportComparison')}
              </Button>
              {FOOTER_ACTION(selectedRfq) && (
                <Button
                  variant={FOOTER_VARIANT(selectedRfq)}
                  data-testid="panel-footer-action"
                  onClick={() =>
                    navigate(
                      /** @type {NonNullable<ReturnType<typeof FOOTER_ACTION>>} */ (
                        FOOTER_ACTION(selectedRfq)
                      ).to
                    )
                  }
                >
                  {FOOTER_LABEL(selectedRfq, t)}
                </Button>
              )}
            </>
          )
        }
      >
        {selectedRfq && (
          <div className="space-y-6">
            {/* REQ-E03-05 — the comparison, negotiation rounds and the split
                award live on the event's own page, where a round and an award
                can be read beside the bids they act on. */}
            <Link
              to={`/buyer/rfq/${selectedRfq.id}`}
              className="text-sm text-action hover:underline"
              data-testid="open-sourcing-event"
            >
              {t('rfx.cmp.title')} · {t('rfx.neg.title')} · {t('rfx.award.title')}
            </Link>
            {/* D2 — keep this RFQ's content as a template. Holds no atom: a
                template is the buyer's own authoring aid in this browser, and
                starting an RFQ from it is what the create gate guards. */}
            <div>
              <Button
                variant="secondary"
                data-testid="panel-save-template"
                onClick={() => {
                  const content = templateContentFromRfq(selectedRfq);
                  if (!content) {
                    toast({
                      variant: 'error',
                      title: t('rfqAuthoring.template.save.failed'),
                      description: t('rfqAuthoring.template.save.nothing')
                    });
                    return;
                  }
                  setTemplateToSave({
                    content,
                    name: selectedRfq.projectName ?? selectedRfq.title
                  });
                }}
              >
                {t('rfqAuthoring.template.saveAs')}
              </Button>
            </div>
            <RfqEngagementSection
              rfq={selectedRfq}
              nameOf={(id) => supplierNameById.get(id) ?? id}
            />
            {selectedRfq.status === 'Awarded' && (
              <section className="bg-success-soft border border-success/30 rounded-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={16} className="text-success" />
                  <h3 className="text-section text-text-primary">
                    {t('sourcing.panel.awardSummary')}
                  </h3>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-text-tertiary">{t('sourcing.panel.awardedTo')}</dt>
                    <dd className="text-text-primary font-semibold">
                      {selectedRfq.awardedSupplierId
                        ? (supplierNameById.get(selectedRfq.awardedSupplierId) ??
                          selectedRfq.awardedSupplierId)
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('sourcing.panel.awardedValue')}</dt>
                    <Data as="dd" className="text-text-primary font-semibold">
                      {/* 2e-c-4 — was an unconditional `formatIDR`, so an awarded USD or
                          EUR quote had its contract value restated in rupiah on
                          the ONE row recording what Paragon actually committed
                          to. The award summary is the last place a currency may
                          be assumed. */}
                      {awardedQuote
                        ? formatMoney(awardedQuote.totalPrice, awardedQuote.currency)
                        : '—'}
                    </Data>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('sourcing.panel.awardDate')}</dt>
                    <Data as="dd" className="text-text-primary font-medium">
                      {formatDate(selectedRfq.awardDeadline)}
                    </Data>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">{t('sourcing.panel.poIssued')}</dt>
                    {/* Award mints no PO — issuance is a separate buyer verb. */}
                    <dd className="text-text-tertiary font-medium">—</dd>
                  </div>
                </dl>
              </section>
            )}

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('sourcing.panel.summary')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('sourcing.panel.field.category')}</dt>
                  <dd className="text-text-primary font-medium">
                    {categoryLabel(t, selectedRfq.materialCategory)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('sourcing.panel.field.status')}</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selectedRfq.status]}>
                      {selectedRfq.status}
                    </StatusPill>
                    <span className="mt-1 block">
                      <NextActLine act={nextAct} testId="next-act-buyer-rfq" />
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('sourcing.panel.field.created')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedRfq.createdAt)}
                  </Data>
                  <DraftRevisionNote revisions={selectedRfq.revisions} testId="rfq-last-edited" />
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.responseDeadline')}
                  </dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedRfq.responseDeadline)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('sourcing.panel.field.awardDeadline')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedRfq.awardDeadline)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('sourcing.panel.field.totalQty')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatNumber(selectedRfq.totalQty)} {selectedRfq.uom}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('sourcing.panel.field.estValue')}</dt>
                  <Data as="dd" className="text-text-primary font-semibold">
                    {formatIDR(selectedRfq.estimatedValue)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('sourcing.panel.field.currency')}</dt>
                  <dd className="text-text-primary font-medium">{selectedRfq.currency}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('sourcing.panel.field.incoterms')}</dt>
                  <dd className="text-text-primary font-medium">{selectedRfq.incoterms}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('sourcing.panel.field.paymentTerms')}</dt>
                  <dd className="text-text-primary font-medium">{selectedRfq.paymentTerms}</dd>
                </div>
              </dl>
            </section>

            {/* Lifecycle actions (F0.3): the non-award sourcing verbs, gated on
                the machine's legal from-states — cancel from Draft/Open/Closed
                (not a terminal Awarded/Cancelled), reopen from Closed only. */}
            {(selectedRfq.status === 'Draft' ||
              selectedRfq.status === 'Open' ||
              selectedRfq.status === 'Closed') && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('sourcing.lifecycle.actions')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {/* PF-1a — PUBLISH. Wired here and not deferred to the surface
                      batch because D-1 made `Draft` the state EVERY newly-raised
                      RFQ lands in: without this button the buyer creates events
                      only suppliers cannot see, and the draft lane would be a
                      trap whose only exit is cancel.
                      ⚠️ OUTLINE, NOT SOLID (DP2-BUTTON-01, operator-corrected).
                      PF-1a shipped this solid, reasoning that publish "exposes
                      the event to the invited list" and therefore qualifies as
                      the irreversible commit. The reserved list is NAMED —
                      Award, Release payment, Post-to-SAP, Reject/Dispute,
                      Override-hold — and publish is not on it. Award already
                      holds the one solid on this surface. */}
                  {/* PUBLISH — Draft only. The notice takes the button's OWN
                      slot, inside the same state condition: a seat withheld
                      from publishing reads that on a Draft, where the act
                      exists, and reads nothing on an Open RFQ, where it does
                      not. A notice outside the from-state would advertise a
                      wait for an act the machine would refuse anyway. */}
                  {/* BL-93 — EDIT DRAFT, Draft only. It is `rfq:create` (the seat
                      that may draft may finish its draft), so a seat without
                      it reads the owner here, in the button's own slot. */}
                  {selectedRfq.status === 'Draft' &&
                    (rfqCreateAvailability.kind === 'held' ? (
                      <Button
                        variant="secondary"
                        icon={Pencil}
                        onClick={() => openWizardForEdit(selectedRfq)}
                        data-testid="rfq-edit-draft"
                      >
                        {t('rfxEdit.edit')}
                      </Button>
                    ) : (
                      <HandoffNotice
                        availability={rfqCreateAvailability}
                        testId="handoff-rfq-edit"
                      />
                    ))}
                  {selectedRfq.status === 'Draft' &&
                    (rfqVerbs.publish.kind === 'held' ? (
                      <Button
                        variant="outline"
                        icon={Send}
                        disabled={publishMutation.isPending}
                        onClick={handlePublish}
                      >
                        {publishMutation.isPending
                          ? t('sourcing.publish.submitting')
                          : t('sourcing.publish.submit')}
                      </Button>
                    ) : (
                      <HandoffNotice availability={rfqVerbs.publish} testId="handoff-rfq-publish" />
                    ))}
                  {/* REOPEN — Closed only, state-exclusive with publish. Two
                      acts, two notices, and never both on one RFQ. */}
                  {selectedRfq.status === 'Closed' &&
                    (rfqVerbs.reopen.kind === 'held' ? (
                      <Button
                        variant="outline"
                        icon={RotateCcw}
                        disabled={reopenMutation.isPending}
                        onClick={handleReopen}
                      >
                        {reopenMutation.isPending
                          ? t('sourcing.reopen.submitting')
                          : t('sourcing.reopen.submit')}
                      </Button>
                    ) : (
                      <HandoffNotice availability={rfqVerbs.reopen} testId="handoff-rfq-reopen" />
                    ))}
                  {/* CANCEL — legal from all three of this section's states,
                      so its notice is the one a withheld seat always reads
                      here, beside whichever of publish/reopen applies. */}
                  {rfqVerbs.cancel.kind === 'held' ? (
                    <Button
                      variant="secondary"
                      icon={Ban}
                      className="text-danger"
                      disabled={cancelMutation.isPending}
                      onClick={handleCancel}
                    >
                      {cancelMutation.isPending
                        ? t('sourcing.cancel.submitting')
                        : t('sourcing.cancel.submit')}
                    </Button>
                  ) : (
                    <HandoffNotice availability={rfqVerbs.cancel} testId="handoff-rfq-cancel" />
                  )}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('sourcing.panel.lifecycle')}
              </h3>
              <Timeline events={buildTimeline(selectedRfq, t)} />
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t(
                  quotesForSelected.length === 1
                    ? 'sourcing.cmp.title.one'
                    : 'sourcing.cmp.title.other',
                  { count: quotesForSelected.length }
                )}
              </h3>
              {panelEvalQty !== null && (
                <p className="mb-3 text-xs text-text-secondary" data-testid="panel-eval-break">
                  {t('rfqCompare.panel.atBreak', { qty: panelEvalQty.toLocaleString('en-US') })}{' '}
                  <Link
                    to={`/buyer/rfq/${selectedRfq.id}`}
                    className="text-action hover:underline"
                    data-testid="panel-compare-by-break"
                  >
                    {t('rfqCompare.panel.compareByBreak')}
                  </Link>
                </p>
              )}
              {/* 2e-c-3 — the refusal, stated ABOVE the table it applies to.
                  The bids are still shown (they are facts the supplier stated);
                  what is withheld is the RANKING, because ranking them would
                  mean comparing prices in currencies with no recorded basis.
                  Names the currencies, so the buyer knows exactly which pin to
                  record rather than being told something is wrong. */}
              {scoring.kind === 'refused' && (
                <div
                  role="status"
                  data-testid="fx-refusal"
                  className="mb-3 text-xs text-warning-hover bg-warning-soft border border-warning rounded-md px-3 py-2"
                >
                  {t(FX_REFUSAL_KEY[scoring.reason], {
                    currencies: scoring.currencies.join(', '),
                    // 2e-c-4 — a STALE refusal names the vintage it is judging.
                    // "Too old" without saying how old leaves the buyer unable
                    // to tell a rate from this morning apart from one from
                    // January. Empty for FX_UNPINNED, where no pin exists to
                    // have a vintage; that message does not interpolate it.
                    asOf: scoring.currencies
                      .map((c) => effectivePin(selectedRfq.fxPins, c)?.asOf)
                      .filter(Boolean)
                      .map((d) => formatDate(/** @type {string} */ (d)))
                      .join(', ')
                  })}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'FxRefusalReason', term: scoring.reason }}
                  />
                </div>
              )}
              {/* 2e-c-4 — THE RECORDED BASIS, on screen. A buyer must be able to
                  answer "what rate ranked this comparison, and how old is it?"
                  from the surface, not from an audit query. Rendered whenever a
                  foreign bid exists — including while the comparison is refused,
                  because that is exactly when a buyer needs to see what is
                  missing and act on it. */}
              {foreignCurrencies.length > 0 && (
                <FxBasisPanel
                  currencies={foreignCurrencies}
                  pins={selectedRfq.fxPins}
                  onPin={(c) => setPinDraft(blankPinDraft(c, effectivePin(selectedRfq.fxPins, c)))}
                  t={t}
                />
              )}
              {quotesForSelected.length === 0 ? (
                <div className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center">
                  {t('sourcing.cmp.empty')}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  {/* RFQ-DRAWER-01: one horizontally-scrolling table, no sticky
                      criterion column. The criterion (row-header) column and the
                      quote columns each carry a min-width and scroll together, so
                      they can never overlap — the pinned column previously
                      collided with the first quote and clipped its composite dial
                      (position:sticky + border-collapse). */}
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left px-2 py-2 font-semibold text-text-tertiary uppercase tracking-wider align-bottom w-36 min-w-[9rem]">
                          {t('sourcing.cmp.criterion')}
                        </th>
                        {quotesForSelected.map((q) => {
                          const supplier = supplierNameById.get(q.supplierId) ?? q.supplierId;
                          return (
                            <th
                              key={q.id}
                              data-testid={`panel-cmp-head-${q.supplierId}`}
                              className={`align-bottom px-2 pt-2 pb-2 font-semibold text-text-primary text-left min-w-[10rem] ${
                                q.id === topRankedId
                                  ? 'border-2 border-action rounded-t-md bg-action-soft/40'
                                  : ''
                              }`}
                            >
                              {q.id === topRankedId && (
                                <span className="flex flex-col items-start gap-0.5 mb-1">
                                  <span className="inline-flex items-center gap-1 text-label text-teal-hover uppercase">
                                    <Trophy size={10} /> {t('sourcing.cmp.topRanked')}
                                  </span>
                                  {COMPOSITE_LIVENESS === 'simulated' && (
                                    <span
                                      title={t('sourcing.cmp.simulatedTitle')}
                                      className="inline-block normal-case text-[9px] font-medium text-text-tertiary border border-border-subtle rounded px-1 py-px"
                                    >
                                      {t('sourcing.cmp.simulated')}
                                    </span>
                                  )}
                                </span>
                              )}
                              <div className="text-sm">{supplier}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="text-text-secondary">
                      <ComparisonRow label={t('sourcing.cmp.row.unitPrice')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <Data
                              as="span"
                              className="font-semibold text-text-primary whitespace-nowrap"
                            >
                              {formatMoney(q.unitPrice, q.currency)}/{selectedRfq.uom}
                            </Data>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      {/* CI-2 — the should-cost-vs-quote spread, read-only, right
                          under unit price. Per quote: the resolver joins the RFQ
                          material to a SIMULATED basket and returns a MODELED,
                          banded spread — or honest silence (tail / unit-mismatch /
                          unmapped). Never fed into the score; never a verdict. */}
                      <ComparisonRow label={t('sourcing.cmp.row.spread')}>
                        {pricedQuotes.map((q) => {
                          // 2e-c-1 — the policy/capability gate, ahead of the
                          // resolver. A bid in a currency the engine cannot
                          // price gets the same honest silence every other
                          // missing reference gets, with its OWN reason: the
                          // material is mapped, is not tail, and is priced by
                          // weight, so none of the other three would be true.
                          //
                          // 2e-c-5 — the currency now goes STRAIGHT to the
                          // resolver, which owns the gate. The surface no longer
                          // decides what the engine can price.
                          return (
                            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                              <SpreadCell
                                result={spreadForQuote(
                                  selectedRfq.materialIds[0],
                                  selectedRfq.uom,
                                  q.unitPrice,
                                  q.currency,
                                  SPREAD_DEPS
                                )}
                                t={t}
                              />
                            </ComparisonCell>
                          );
                        })}
                      </ComparisonRow>
                      <ComparisonRow label={t('sourcing.cmp.row.totalPrice')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <Data
                              as="span"
                              className="font-semibold text-text-primary whitespace-nowrap"
                            >
                              {formatMoney(q.totalPrice, q.currency)}
                            </Data>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      {/* CP-0 2e-b-1a — the lead time is a REQUIRED ESTIMATE at
                          quote stage, not a commitment: a supplier cannot firmly
                          commit before final quantity, PO date and capacity are
                          known, and forcing "firm" here would buy false
                          precision. It is still scored and still ranked on — the
                          buyer simply sees it for what it is. The firm date is
                          confirmed at PO (a separate arc). */}
                      <ComparisonRow
                        label={t('sourcing.cmp.row.leadTime')}
                        tag={t('sourcing.cmp.estimated')}
                        tagTitle={t('sourcing.cmp.estimatedTitle')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <Data as="span" className="whitespace-nowrap">
                              {t('sourcing.cmp.leadTimeDays', {
                                count: q.leadTimeDays
                              })}
                            </Data>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      {/* CP-0 2e-b-2 (FIND-02) — the supplier's minimum order
                          quantity. It has always been collected on the quote
                          form and dropped before the payload, so until now this
                          comparison could not show it: a buyer weighing two
                          quotes had no way to see that one of them cannot be
                          ordered at the quantity being sourced. Rendered as the
                          fact it is — no verdict, no comparison against
                          `selectedRfq.totalQty`; that ruling is MOQ-FIND-01. */}
                      <ComparisonRow label={t('sourcing.cmp.row.moq')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            {q.moq === undefined ? (
                              // An ABSENT minimum is a real answer ("same as the
                              // RFQ quantity"), not missing data — so it reads as
                              // a sentence, never as a 0 or a dash.
                              <span className="text-text-tertiary">
                                {t('sourcing.cmp.moqNone')}
                              </span>
                            ) : (
                              <Data as="span" className="whitespace-nowrap">
                                {formatNumber(q.moq)} {selectedRfq.uom}
                              </Data>
                            )}
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label={t('sourcing.cmp.row.paymentTerms')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            {q.paymentTermsOffered}
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label={t('sourcing.cmp.row.priceScore')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreOrSilence score={scoreById.get(q.id)?.priceScore} />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.leadTimeScore')}
                        tag={t('sourcing.cmp.estimated')}
                        tagTitle={t('sourcing.cmp.estimatedTitle')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreOrSilence score={scoreById.get(q.id)?.leadTimeScore} />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      {/* CR-23 — compliance is a GATE, not a weighted axis: it
                          decides who is scored, and names why a supplier is not. */}
                      <ComparisonRow label={t('sourcing.cmp.row.compliance')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <GateMarker
                              gate={gateOf(q.supplierId)}
                              showPass
                              testId={`drawer-gate-${q.supplierId}`}
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.reliability')}
                        tag={
                          AXIS_LIVENESS.reliability === 'simulated'
                            ? t('sourcing.cmp.simulated')
                            : undefined
                        }
                        tagTitle={t('sourcing.cmp.simulatedTitle')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreOrSilence score={scoreById.get(q.id)?.reliabilityScore} />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.composite')}
                        tag={
                          COMPOSITE_LIVENESS === 'simulated'
                            ? t('sourcing.cmp.simulated')
                            : undefined
                        }
                        tagTitle={t('sourcing.cmp.simulatedTitle')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            {/* The composite is the number the recommendation is
                                argmax'd over, so a refused comparison must be
                                silent HERE above all — a 0 composite would read
                                as "scored, and worst". */}
                            {scoreById.get(q.id) === undefined ? (
                              <span className="text-text-tertiary">—</span>
                            ) : (
                              <ScoreBadge
                                score={
                                  /** @type {import('@lib/quoteScore').QuoteScore} */ (
                                    scoreById.get(q.id)
                                  ).composite
                                }
                                size="md"
                                variant="circular"
                              />
                            )}
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      {selectedRfq.status === 'Awarded' ? (
                        // Awarded: the picker is moot — show the ACTUAL outcome
                        // per quote (winner Awarded, others Rejected), winner
                        // column highlighted. No re-award affordance.
                        <ComparisonRow label={t('sourcing.cmp.row.result')}>
                          {quotesForSelected.map((q) => (
                            <ComparisonCell
                              key={q.id}
                              highlight={q.id === selectedRfq.awardedQuotationId}
                            >
                              <StatusPill
                                variant={
                                  q.status === 'Awarded'
                                    ? 'success'
                                    : q.status === 'Rejected'
                                      ? 'danger'
                                      : 'neutral'
                                }
                              >
                                {q.status}
                              </StatusPill>
                            </ComparisonCell>
                          ))}
                        </ComparisonRow>
                      ) : (
                        <>
                          {/* Per-quote lifecycle status + the buyer's review move.
                            A freshly-submitted quote (t_quotation_submit) reads
                            'Submitted'; "Move to review" fires t_quotation_review
                            (Submitted → Under Review) in place. */}
                          <ComparisonRow label={t('sourcing.cmp.row.status')}>
                            {quotesForSelected.map((q) => (
                              <ComparisonCell key={q.id}>
                                <div className="flex flex-col items-center gap-1.5">
                                  <StatusPill
                                    variant={q.status === 'Under Review' ? 'info' : 'neutral'}
                                  >
                                    {q.status}
                                  </StatusPill>
                                  {/* MOVE TO REVIEW — one act PER QUOTE, so one
                                    notice per quote. The cell either offers
                                    the move or names its owner; a single
                                    notice for the column would answer about a
                                    quote the reader did not pick. Only a
                                    `Submitted` quote has the act at all. */}
                                  {q.status === 'Submitted' &&
                                    (rfqVerbs.review.kind === 'held' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleReview(q.id)}
                                        disabled={reviewMutation.isPending}
                                        className="text-xs font-semibold text-action hover:text-action-hover disabled:opacity-50"
                                      >
                                        {t('sourcing.cmp.moveToReview')}
                                      </button>
                                    ) : (
                                      <HandoffNotice
                                        availability={rfqVerbs.review}
                                        testId="handoff-rfq-review"
                                      />
                                    ))}
                                </div>
                              </ComparisonCell>
                            ))}
                          </ComparisonRow>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* RFx C3 (AR-03, NR-3 BR-07) — THE PANEL'S AWARD IS THE EVENT
                PAGE'S, FOR EVERY RFQ. The one-winner pick and its
                single-winner dispatch are gone: a legacy RFQ awarded from here
                skipped the split rules. Every RFQ that can still be awarded
                (Open, Closed, Partly awarded) links to the one award panel,
                as a tiered RFQ always did. The seat's award authority is read
                here too, so a seat without it is told whose act it is. */}
            {(selectedRfq.status === 'Open' ||
              selectedRfq.status === 'Closed' ||
              selectedRfq.status === 'Partly awarded') &&
              quotesForSelected.length > 0 && (
                <section
                  className="bg-teal-soft border border-teal/20 rounded-md p-4"
                  data-testid="panel-tiered-award"
                >
                  <h3 className="text-section text-text-primary mb-2">
                    {t('sourcing.award.title')}
                  </h3>
                  {/* BL-64 / BR-01a — no quoting supplier passes the gate: the
                      award is impossible, and the panel says so. */}
                  {noneAwardable ? (
                    <p
                      className="text-sm text-warning-hover mb-2"
                      role="status"
                      data-testid="drawer-award-none-qualified"
                    >
                      {t('rfx.gate.noAward')}
                    </p>
                  ) : (
                    <p className="text-sm text-text-secondary mb-2">
                      {t('rfqCompare.panel.awardOnEvent')}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to={`/buyer/rfq/${selectedRfq.id}`}
                      className="text-sm text-action hover:underline"
                      data-testid="panel-open-tiered-award"
                    >
                      {t('rfqCompare.panel.openAward')}
                    </Link>
                    {rfqVerbs.award.kind !== 'held' && (
                      <HandoffNotice availability={rfqVerbs.award} testId="handoff-rfq-award" />
                    )}
                  </div>
                </section>
              )}
          </div>
        )}
      </SidePanel>

      {/* CP-0 · 2e-c-4 — CONFIRM BEFORE COMMIT. Recording the basis a contract
          will be awarded on is a governed act that lands in the DR-10 trail, so
          it gets the same deliberate confirmation every other governed act on
          this surface gets. A SUPERSEDE reads as a NEW RECORDED ACT throughout —
          different title, different body, and an explicit statement that the
          prior basis is kept — because "edit" would describe a mutation that
          cannot happen and would misrepresent what the trail will show. */}
      {pinDraft && selectedRfq && (
        <ModalOverlay
          onClose={() => setPinDraft(null)}
          label={t(
            pinDraft.superseding
              ? 'sourcing.fx.dialog.title.supersede'
              : 'sourcing.fx.dialog.title.record',
            { currency: pinDraft.currency }
          )}
          testId="fx-pin-dialog"
        >
          <div className="w-full max-w-md bg-white rounded-lg border border-border-subtle p-5">
            <h3 className="text-section text-text-primary mb-1">
              {t(
                pinDraft.superseding
                  ? 'sourcing.fx.dialog.title.supersede'
                  : 'sourcing.fx.dialog.title.record',
                { currency: pinDraft.currency }
              )}
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              {t(
                pinDraft.superseding
                  ? 'sourcing.fx.dialog.body.supersede'
                  : 'sourcing.fx.dialog.body.record',
                { currency: pinDraft.currency, base: BASE_CURRENCY }
              )}
            </p>

            {/* What is being replaced, stated in full — a buyer superseding a
                rate must see the one they are superseding, or they cannot tell
                whether they are correcting a typo or reacting to a real move. */}
            {pinDraft.superseding && (
              <div
                data-testid="fx-supersede-prior"
                className="mb-4 rounded-md border border-border-subtle bg-surface-subtle px-3 py-2 text-xs"
              >
                <span className="text-text-tertiary">{t('sourcing.fx.dialog.prior')} </span>
                <Data as="span" className="font-semibold">
                  {formatMoney(pinDraft.superseding.rate, pinDraft.superseding.base)}
                </Data>
                <span className="text-text-secondary">
                  {' '}
                  {t('sourcing.cmp.fx.basis.asOf', {
                    date: formatDate(pinDraft.superseding.asOf)
                  })}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass} htmlFor="fx-rate">
                  {t('sourcing.fx.dialog.rate', {
                    currency: pinDraft.currency,
                    base: BASE_CURRENCY
                  })}
                </label>
                {/* type="text", NOT number (Ruling 6.2): a number input lets the
                    BROWSER rewrite the value per its own locale before React
                    sees it, which is how a locale-ambiguous rate would bypass
                    the one parse entirely. */}
                <input
                  id="fx-rate"
                  type="text"
                  inputMode="decimal"
                  // Not "17.250": a placeholder must never model a token the
                  // field would refuse as ambiguous.
                  placeholder="17250"
                  aria-invalid={pinDraft.rate.trim() !== '' && !readFxRate(pinDraft.rate).ok}
                  value={pinDraft.rate}
                  onChange={(e) => setPinDraft({ ...pinDraft, rate: e.target.value })}
                  className={inputClass}
                />
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {t('sourcing.fx.dialog.rateHint')}
                </div>
                {/* An untouched blank does not nag; a TYPED rate that cannot be
                    read says so, and says what to do about it. */}
                <FieldRefusal
                  messageKey={fxRateRefusalKey(pinDraft.rate)}
                  testId="fx-rate-refusal"
                  t={t}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="fx-asof">
                  {t('sourcing.fx.dialog.asOf')}
                </label>
                <input
                  id="fx-asof"
                  type="date"
                  value={pinDraft.asOf}
                  onChange={(e) => setPinDraft({ ...pinDraft, asOf: e.target.value })}
                  className={inputClass}
                />
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {t('sourcing.fx.dialog.asOfHint', { days: FX_PIN_MAX_AGE_DAYS })}
                </div>
                <FieldRefusal
                  messageKey={fxVintageRefusalKey(pinDraft.asOf)}
                  testId="fx-asof-refusal"
                  t={t}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="fx-source">
                  {t('sourcing.fx.dialog.source')}
                </label>
                <select
                  id="fx-source"
                  value={pinDraft.source}
                  onChange={(e) =>
                    setPinDraft({
                      ...pinDraft,
                      source: /** @type {FxPinSource} */ (e.target.value)
                    })
                  }
                  className={inputClass}
                >
                  <option value="MANUAL">{t('sourcing.cmp.fx.basis.source.MANUAL')}</option>
                  <option value="SAP_EXHGRATE">
                    {t('sourcing.cmp.fx.basis.source.SAP_EXHGRATE')}
                  </option>
                </select>
              </div>

              {/* Only meaningful for an SAP-sourced rate: a MANUAL pin has no
                  rate type, and offering the field would invite a buyer to
                  dress a typed number as an SAP-governed one. */}
              {pinDraft.source === 'SAP_EXHGRATE' && (
                <div>
                  <label className={labelClass} htmlFor="fx-ratetype">
                    {t('sourcing.fx.dialog.rateType')}
                  </label>
                  <input
                    id="fx-ratetype"
                    type="text"
                    placeholder="M"
                    value={pinDraft.rateType}
                    onChange={(e) => setPinDraft({ ...pinDraft, rateType: e.target.value })}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setPinDraft(null)}>
                {t('sourcing.fx.dialog.cancel')}
              </Button>
              {/* DP2-BUTTON-01: SOLID is reserved for the irreversible commit,
                  and this is one — an appended pin cannot be taken back, only
                  superseded. */}
              <HandoffNotice availability={rfqVerbs.fxPin} testId="handoff-rfq-fxpin" />
              {rfqVerbs.fxPin.kind === 'held' && (
                <Button
                  variant="outline"
                  onClick={handlePinConfirm}
                  disabled={
                    !readFxRate(pinDraft.rate).ok ||
                    !readFxVintage(pinDraft.asOf).ok ||
                    fxPinMutation.isPending
                  }
                >
                  {fxPinMutation.isPending
                    ? t('sourcing.fx.dialog.submitting')
                    : t(
                        pinDraft.superseding
                          ? 'sourcing.fx.dialog.confirm.supersede'
                          : 'sourcing.fx.dialog.confirm.record'
                      )}
                </Button>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {pickerOpen && rfqCreateAvailability.kind === 'held' && (
        <TemplatePicker
          rfqs={rfqs}
          onClose={() => setPickerOpen(false)}
          onStart={openWizardFromSeed}
        />
      )}
      {templateToSave && (
        <SaveTemplateDialog
          content={templateToSave.content}
          defaultName={templateToSave.name}
          onClose={() => setTemplateToSave(null)}
        />
      )}

      {wizardOpen && rfqCreateAvailability.kind === 'held' && (
        <ModalOverlay onClose={closeWizard}>
          <Wizard
            steps={wizardSteps}
            currentStep={wizardStep}
            onStepChange={setWizardStep}
            onCancel={closeWizard}
            onComplete={submitWizard}
            isStepValid={isStepValid}
            completeLabel={t(editingRfqId ? 'rfxEdit.saveChanges' : 'sourcing.wizard.complete')}
          />
        </ModalOverlay>
      )}
    </AppShellV2>
  );
};

// Wrapper: reads the buyer-side sourcing aggregates through the scoped hooks and
// renders the four honest states; the workspace inner keeps its local (Phase-2′,
// non-persisting) RFQ-creation wizard state seeded from the resolved reads.
/** @type {React.FC} */
const BuyerSourcing = () => {
  const { t } = useTranslation();
  const sourcingCrumb = [t('hub.nav.section.sourcing')];
  const rfqsQuery = useRFQs();
  const quotationsQuery = useQuotations();
  const suppliersQuery = useSuppliers();
  // ⚠️ **THE ELIGIBLE STATES ARE DERIVED FROM THE MACHINE, NOT TYPED HERE.** A
  // literal `'Approved'` would be a second copy of the flow and would go stale
  // the day it gains an edge — offering a requisition the dispatcher then
  // refuses, or withholding one it would have accepted. The filter runs at the
  // SEAM (`PRFilter`), not over a list in this component.
  const requisitionsQuery = useRequisitions({
    status: /** @type {PRStatus[]} */ (requisitionSourcingStates())
  });

  if (rfqsQuery.isPending || quotationsQuery.isPending || suppliersQuery.isPending)
    return <LoadingState breadcrumb={sourcingCrumb} />;
  if (rfqsQuery.isError || quotationsQuery.isError || suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={sourcingCrumb}
        error={rfqsQuery.error ?? quotationsQuery.error ?? suppliersQuery.error}
        onRetry={() => {
          rfqsQuery.refetch();
          quotationsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );

  const baseRfqs = rfqsQuery.data?.items ?? [];
  if (baseRfqs.length === 0)
    return (
      <EmptyState
        breadcrumb={sourcingCrumb}
        title={t('sourcing.state.empty.title')}
        subtitle={t('sourcing.state.empty.subtitle')}
        message={t('sourcing.state.empty.message')}
      />
    );

  return (
    <SourcingWorkspace
      baseRfqs={baseRfqs}
      quotations={quotationsQuery.data?.items ?? []}
      suppliers={suppliersQuery.data?.items ?? []}
      // ⚠️ NOT part of the page's loading/error gate, deliberately. The
      // requisition picker is an OPTIONAL entrance; a sourcing board that
      // refused to render because the requisition read failed would take the
      // whole page down for a convenience. An unavailable read yields an empty
      // set, which the picker states honestly as "none available" — the same
      // rendering as "none qualifies", because from the buyer's side both mean
      // there is nothing here to start from.
      sourceableRequisitions={requisitionsQuery.data?.items ?? []}
    />
  );
};

export default BuyerSourcing;
