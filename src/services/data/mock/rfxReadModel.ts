// ────────────────────────────────────────────────────────────────────────────
// The RFx read model over the mock stores (REQ-E03-01 to REQ-E03-05).
//
// ONE place gathers the event, response, round and award stores, resolves
// supplier names and OTIF from the master, and hands the facts to the pure
// rules (`transitions/rfxRules`). Nothing computed here is stored: the deadline
// state, the response score, the CR-15 ranking and the "No history" marker are
// all derived at read.
//
// ⚠️ **THE DRAFT RULE LIVES HERE, ONCE.** A partial RFI or RFP answer is
// invisible to PTI until it is submitted (REQ-E03-02 / -04 edge cases). That is
// a READ rule, not a screen rule: every buyer-facing surface reads through this
// module, so there is no second path that could show one.
// ────────────────────────────────────────────────────────────────────────────

import { mockSuppliers } from '../../../data/mockSuppliers';
import { masterMeasure } from './supplierMeasureReadModel';
import { sdcClock } from '../../sdc/clock';
import type { Quotation } from '../../../data/mockQuotations';
import type { RFQ } from '../../../data/mockRfqs';
import { BASE_CURRENCY } from '../../../lib/currencyPolicy';
import { scoreQuotations, type ScoringOutcome } from '../../../lib/quoteScore';
import { complianceGate, type GateResult } from '../../sourcing/complianceGate';
import { COMPLIANCE_REGISTRY } from './fixtures/complianceRegistry';
import {
  bestScoredByItemAt,
  defaultEvaluationTierQty,
  isTieredRfq,
  scoreRfqAt,
  topRankedOf,
} from '../../sourcing/rfqComparison';
import { bandOf, certificateValidity } from '../../sourcing/supplierFilters';
import {
  complianceScoreFor,
  effectiveDeadline,
  filterInvitees,
  isPastDeadline,
  reliabilityScoreFor,
  rfiResponseScore,
  type InviteeCandidate,
  type InviteeFilter,
} from '../../transitions/rfxRules';
import type {
  AwardView,
  InviteeResponseState,
  NegotiationRoundView,
  RfiEventView,
  RfpEventView,
  RfpAwardView,
  RfpOfferRoundView,
  RfpRoundOptionView,
  RfqSupplierGateView,
  RfxInviteeView,
} from '../../sourcing/views';
import { awardStatusOf, cancellationOf, sapMarkOf, type AwardTrail } from '../../sourcing/awardStatus';
import type { AwardLine, RfiResponse, RfpEvent, RfpResponse, RfqAwardRecord } from '../../sourcing/types';
import { isRfpAward } from '../../sourcing/rfpAward';
import { firmPricesInForce, parseRfpOptionRef, rfpOptionRef } from '../../sourcing/rfpFirmOffer';
import { awardItemsOf, itemOfAwardLine } from '../../sourcing/awardShape';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import {
  awardCancellationStore,
  awardSapMarkStore,
  awardStore,
  negotiationRoundStore,
  rfiEventStore,
  rfiResponseStore,
  rfpEventStore,
  rfpFirmOfferStore,
  rfpOfferRoundStore,
  rfpResponseStore,
} from './stores/rfxStores';

/**
 * The RFx lane's "now".
 *
 * The SAME simulated clock the SDC loop uses, because the RFx sample data is
 * dated relative to `DECLARED_PRESENT` and `sdcClock` derives from it. A second
 * clock here would be the two-presents defect that `sdcClock`'s own header
 * records — two clocks disagreeing by accident rather than by ruling.
 */
export const rfxNow = (): string => sdcClock.now();

export const rfxSupplierName = (supplierId: string): string =>
  mockSuppliers.find((s) => s.id === supplierId)?.name ?? supplierId;

/**
 * The supplier's OTIF, or `null` when nothing has ever been measured.
 *
 * REQ-E10-01 — CALCULATED, not read off the master: the same projection the
 * supplier list and profile read, so CR-15's reliability axis and the invitee
 * list quote the same figure as the performance dashboard.
 */
export const rfxSupplierOtif = (supplierId: string): number | null =>
  masterMeasure(supplierId).otif.pct;

// ── REQ-E03-01 — the invitee search ─────────────────────────────────────────

/** Every supplier master row as an invitee candidate, before any filter. */
export function inviteeCandidates(materialCodes: readonly string[] = []): readonly InviteeCandidate[] {
  const now = rfxNow();
  return mockSuppliers.map((s) => {
    const measure = masterMeasure(s.id);
    return {
      supplierId: s.id,
      supplierName: s.name,
      category: s.category,
      purchasingGroup: s.purchasingGroup,
      status: s.status,
      otif: measure.otif.pct,
      country: s.country,
      // BL-52 / BR-05 — the same certificate projection and grade the supplier
      // list filters on, read at the same "now" the gate below is judged at.
      certificates: certificateValidity(s, COMPLIANCE_REGISTRY, now),
      band: bandOf(measure.grade),
      // CR-23 / BR-06 — the gate travels WITH the candidate: a failing supplier
      // is still a candidate (it can be invited and can quote), and the list
      // says it cannot be awarded and why.
      gate: supplierGate(s.id, materialCodes, now),
    };
  });
}

/** The candidates matching the buyer's active filters (BR-01, BR-04). */
export const matchingInvitees = (filter: InviteeFilter): readonly InviteeCandidate[] =>
  filterInvitees(inviteeCandidates(filter.materialCodes ?? []), filter);

// ── CR-23 — the compliance gate ─────────────────────────────────────────────

/** Every material code a sourcing event sources: its ids and its line items. */
export const rfqMaterialCodes = (rfq: RFQ): readonly string[] => [
  ...new Set([...rfq.materialIds, ...(rfq.lineItems ?? []).map((l) => l.materialCode)]),
];

/**
 * CR-23 — one supplier against a set of materials, from the master, the measured
 * OTIF and the compliance registry. A supplier the master does not know cannot
 * be shown to pass anything, so it fails on status rather than passing blind.
 */
export function supplierGate(supplierId: string, materialCodes: readonly string[], nowIso: string): GateResult {
  const supplier = mockSuppliers.find((s) => s.id === supplierId);
  if (!supplier) return { passes: false, failed: ['status'] };
  return complianceGate(supplier, rfxSupplierOtif(supplierId), materialCodes, nowIso, COMPLIANCE_REGISTRY);
}

/** CR-23 — the gate for every invitee and every bidder of one RFQ. */
export function rfqGateViews(rfq: RFQ, nowIso: string): readonly RfqSupplierGateView[] {
  const ids = [...new Set([...rfq.invitedSupplierIds, ...currentQuotesFor(rfq.id).map((q) => q.supplierId)])];
  return ids.map((supplierId) => ({ supplierId, ...rfqSupplierGate(rfq, supplierId, nowIso) }));
}

/** CR-23 — one supplier against one sourcing event. */
export const rfqSupplierGate = (rfq: RFQ, supplierId: string, nowIso: string): GateResult =>
  supplierGate(supplierId, rfqMaterialCodes(rfq), nowIso);

/**
 * CR-23 — one supplier on an RFP (NR-2 BR-02). An RFP names a material
 * CATEGORY and no material codes, so no material asks for a certificate here:
 * the gate judges status and OTIF. It is the same gate, over the materials the
 * event actually names, never a guess at which ones it might mean.
 */
export const rfpSupplierGate = (supplierId: string, nowIso: string): GateResult =>
  supplierGate(supplierId, [], nowIso);

// ── REQ-E03-02 / REQ-E03-04 — the event views ───────────────────────────────

/** What the invitee read needs from a response, whichever event type it answers. */
interface InviteeResponseFacts {
  readonly status: string;
  readonly submittedAt?: string;
  readonly confidentialityAcceptedAt?: string;
  readonly termsAcceptedAt?: string;
  /** True when the row holds nothing but an acceptance (no answer of any kind). */
  readonly empty: boolean;
}

const inviteeViews = (
  event: { responseDeadline: string; invitees: readonly { supplierId: string; deadline?: string }[] },
  responseFor: (supplierId: string) => InviteeResponseFacts | undefined,
  nowIso: string,
): readonly RfxInviteeView[] =>
  event.invitees.map((invitee) => {
    const deadline = effectiveDeadline(event.responseDeadline, event.invitees, invitee.supplierId);
    const response = responseFor(invitee.supplierId);
    // A Draft that holds only an acceptance (the confidentiality gate or the
    // T&C) is not a started answer: reading it as "Draft" would tell the buyer
    // the supplier had begun answering when it had only agreed to read.
    const responseState: InviteeResponseState =
      response?.status === 'Submitted'
        ? 'submitted'
        : response && !response.empty
          ? 'draft'
          : 'notStarted';
    return {
      supplierId: invitee.supplierId,
      supplierName: rfxSupplierName(invitee.supplierId),
      deadline,
      responseState,
      submittedAt: response?.submittedAt ?? null,
      otif: rfxSupplierOtif(invitee.supplierId),
      overdue: responseState !== 'submitted' && isPastDeadline(deadline, nowIso),
      confidentialityAcceptedAt: response?.confidentialityAcceptedAt ?? null,
      termsAcceptedAt: response?.termsAcceptedAt ?? null,
    };
  });

const rfiFacts = (r: RfiResponse | undefined): InviteeResponseFacts | undefined =>
  r && { ...r, empty: r.status !== 'Submitted' && r.answers.length === 0 && (r.documents ?? []).length === 0 };

const rfpFacts = (r: RfpResponse | undefined): InviteeResponseFacts | undefined =>
  r && {
    ...r,
    empty:
      r.status !== 'Submitted' &&
      r.answers.length === 0 &&
      (r.questionAnswers ?? []).length === 0 &&
      !r.pricing &&
      !r.otherTerms &&
      (r.documents ?? []).length === 0,
  };

/**
 * The RFI board for a scope.
 *
 * `supplierId` null = the buyer: every event, and only SUBMITTED responses.
 * `supplierId` set = that supplier: only events it was invited to, only its own
 * response, and a Draft stays visible to its author.
 */
export function rfiEventViews(nowIso: string, supplierId: string | null): readonly RfiEventView[] {
  const responses = rfiResponseStore.all();
  return rfiEventStore
    .all()
    .filter((e) => (supplierId ? e.invitees.some((i) => i.supplierId === supplierId) && e.status !== 'Draft' : true))
    .map((event) => {
      const mine = responses.filter((r) => r.rfiId === event.id);
      const visible = supplierId
        ? mine.filter((r) => r.supplierId === supplierId)
        : mine.filter((r) => r.status === 'Submitted');
      // ⚠️ THE CONFIDENTIALITY GATE IS A READ RULE. A supplier that has not
      // accepted is handed the event WITHOUT its description, attachments and
      // questions — not a screen that hides them, a view that never held them.
      const locked =
        !!supplierId && !!event.confidentiality && !visible[0]?.confidentialityAcceptedAt;
      return {
        ...event,
        ...(locked
          ? { description: undefined, questions: [], customSections: [], attachments: [], documentRequests: [] }
          : {}),
        confidentialityLocked: locked,
        invitedSuppliers: inviteeViews(
          event,
          (sid) => rfiFacts(mine.find((r) => r.supplierId === sid)),
          nowIso,
        ),
        responses: visible.map((r) => ({
          ...r,
          supplierName: rfxSupplierName(r.supplierId),
          score: rfiResponseScore(event.questions, r.answers)?.score ?? null,
        })),
        closed: event.status === 'Closed' || event.status === 'Cancelled',
      };
    });
}

/** The RFP board for a scope. Same draft and invitation rules as the RFI one. */
export function rfpEventViews(nowIso: string, supplierId: string | null): readonly RfpEventView[] {
  const responses = rfpResponseStore.all();
  return rfpEventStore
    .all()
    .filter((e) => (supplierId ? e.invitees.some((i) => i.supplierId === supplierId) && e.status !== 'Draft' : true))
    .map((event) => {
      const mine = responses.filter((r) => r.rfpId === event.id);
      const visible = supplierId
        ? mine.filter((r) => r.supplierId === supplierId)
        : mine.filter((r) => r.status === 'Submitted');
      // The same read rule as the RFI: an unaccepted confidential RFP reaches
      // the supplier without its scope, terms, questions, pricing, T&C or files.
      const locked =
        !!supplierId && !!event.confidentiality && !visible[0]?.confidentialityAcceptedAt;
      const source = event.sourceRfiId ? rfiEventStore.get(event.sourceRfiId) : undefined;
      return {
        ...event,
        ...(locked
          ? {
              scope: '',
              terms: [],
              questions: [],
              customSections: [],
              attachments: [],
              termsDocument: undefined,
              pricing: undefined,
              documentRequests: [],
            }
          : {}),
        confidentialityLocked: locked,
        sourceRfiNumber: source?.eventNumber ?? null,
        invitedSuppliers: inviteeViews(
          event,
          (sid) => rfpFacts(mine.find((r) => r.supplierId === sid)),
          nowIso,
        ),

        responses: visible.map((r) => ({
          ...r,
          supplierName: rfxSupplierName(r.supplierId),
          complianceScore: complianceScoreFor(r.answers),
          deviationCount: r.answers.filter((a) => a.stance === 'deviate').length,
        })),
        closed: event.status === 'Closed' || event.status === 'Cancelled',
      };
    });
}

// ── REQ-E03-05 — comparison, rounds and awards ──────────────────────────────

/**
 * The scorable shape of one quotation for CR-15.
 *
 * ⚠️ **RELIABILITY COMES FROM THE SUPPLIER'S OTIF, NOT FROM THE QUOTE.** CR-15
 * names OTIF (REQ-E10-01) as the reliability source, and the stored
 * `reliabilityScore` on a quotation is the retired hand-authored axis. A quote
 * cannot state how reliable its author is; the performance record does.
 */
export const scorableQuote = (q: Quotation) => ({
  id: q.id,
  unitPrice: q.unitPrice,
  currency: q.currency ?? BASE_CURRENCY,
  leadTimeDays: q.leadTimeDays,
  reliabilityScore: reliabilityScoreFor(rfxSupplierOtif(q.supplierId)),
});

/**
 * The quotations that COUNT for an RFQ's comparison: the latest version of each
 * supplier's bid. Superseded versions are kept in the store and read separately
 * (AC-03) — ranking them beside their own successors would show one supplier
 * twice and let a stale price win.
 */
export function currentQuotesFor(rfqId: string): readonly Quotation[] {
  const all = quotationStore.all().filter((q) => q.rfqId === rfqId);
  const superseded = new Set(all.map((q) => q.supersedesQuotationId).filter(Boolean) as string[]);
  return all.filter((q) => !superseded.has(q.id));
}

/** Every version of one supplier's bid on an RFQ, oldest first (AC-03). */
export function quoteVersionsFor(rfqId: string, supplierId: string): readonly Quotation[] {
  return quotationStore
    .all()
    .filter((q) => q.rfqId === rfqId && q.supplierId === supplierId)
    .slice()
    .sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0) || a.submittedAt.localeCompare(b.submittedAt));
}

/** REQ-E03-05 BR-01a — the current quotes whose supplier passes the gate (CR-23). */
const qualifiedQuotesFor = (rfq: RFQ, nowIso: string): readonly Quotation[] =>
  currentQuotesFor(rfq.id).filter((q) => rfqSupplierGate(rfq, q.supplierId, nowIso).passes);

/** CR-15's reliability input for a supplier: its measured OTIF, scored. */
const reliabilityOf = (supplierId: string): number => reliabilityScoreFor(rfxSupplierOtif(supplierId));

/**
 * The CR-15 outcome for an RFQ's current quotes from QUALIFIED suppliers,
 * honouring CR-16 (FX).
 *
 * A TIERED RFQ (one with items) scores PRICE AS TOTAL COST AT THE EVALUATION
 * BREAK (`rfqComparison.scoreRfqAt`), at `evalTierQty` or, absent, the default
 * break nearest `totalQty`. The weights are unchanged. A legacy RFQ scores its
 * header unit price exactly as before.
 */
export function rfqScoring(rfq: RFQ, nowIso: string, evalTierQty?: number): ScoringOutcome {
  const qualified = qualifiedQuotesFor(rfq, nowIso);
  const opts = { pins: rfq.fxPins, now: new Date(nowIso) };
  if (isTieredRfq(rfq)) {
    const qty = evalTierQty ?? defaultEvaluationTierQty(rfq);
    if (qty !== null) return scoreRfqAt(rfq, qualified, qty, reliabilityOf, opts);
  }
  return scoreQuotations(qualified.map(scorableQuote), opts);
}

/** The best-scored quotation id for an RFQ, or null when the set is unrankable. */
export function bestScoredQuotationId(rfq: RFQ, nowIso: string, evalTierQty?: number): string | null {
  // A genuine tie has no single best to follow (`topRankedOf`).
  return topRankedOf(rfqScoring(rfq, nowIso, evalTierQty));
}

/**
 * A tiered RFQ's best-scored quote PER ITEM at the evaluation break, from
 * qualified suppliers only. The award's reason rule is judged item by item
 * against this. Empty for a legacy RFQ.
 */
export function bestScoredByItem(
  rfq: RFQ,
  nowIso: string,
  evalTierQty: number,
): ReadonlyMap<number, string | null> {
  if (!isTieredRfq(rfq)) return new Map();
  return bestScoredByItemAt(rfq, qualifiedQuotesFor(rfq, nowIso), evalTierQty, reliabilityOf, {
    pins: rfq.fxPins,
    now: new Date(nowIso),
  });
}

/**
 * The negotiation rounds a scope may read.
 *
 * ⚠️ **BR-05 IS ENFORCED BY NARROWING THE ROW, NOT BY HIDING A COLUMN.** A
 * supplier's row carries ONLY ITS OWN participation — not the other invitees'
 * names, not their revised prices, not the count of who has answered. A view
 * that carried the full participant list and left the surface to render one of
 * them would be one careless map away from leaking a rival's bid.
 */
export function negotiationRoundViews(nowIso: string, supplierId: string | null): readonly NegotiationRoundView[] {
  return negotiationRoundStore
    .all()
    .filter((r) => (supplierId ? r.invitedSupplierIds.includes(supplierId) : true))
    .map((round) => {
      const rfq = rfqStore.get(round.rfqId);
      const visible = supplierId ? [supplierId] : round.invitedSupplierIds;
      const participants = visible.map((sid) => {
        const revision = quotationStore
          .all()
          .find((q) => q.rfqId === round.rfqId && q.supplierId === sid && q.roundNumber === round.roundNumber);
        return {
          supplierId: sid,
          supplierName: rfxSupplierName(sid),
          revisedQuotationId: revision?.id ?? null,
          revisedAt: revision?.submittedAt ?? null,
        };
      });
      const awaitingAll = round.invitedSupplierIds.filter(
        (sid) =>
          !quotationStore
            .all()
            .some((q) => q.rfqId === round.rfqId && q.supplierId === sid && q.roundNumber === round.roundNumber),
      );
      return {
        ...round,
        // A supplier reads its own thread; the invitee list is the buyer's.
        invitedSupplierIds: visible,
        rfqNumber: rfq?.rfqNumber ?? round.rfqId,
        rfqTitle: rfq?.title ?? '',
        participants,
        overdue: !round.closed && isPastDeadline(round.deadline, nowIso),
        awaiting: supplierId ? (participants[0]?.revisedQuotationId ? 0 : 1) : awaitingAll.length,
      };
    });
}

// ── NR-2 — firm-offer rounds on an RFP ──────────────────────────────────────

/** Suppliers with a SUBMITTED response to one RFP. */
export const rfpRespondedSupplierIds = (rfpId: string): readonly string[] =>
  rfpResponseStore
    .all()
    .filter((r) => r.rfpId === rfpId && r.status === 'Submitted')
    .map((r) => r.supplierId);

/**
 * The options a firm-offer round may name on one RFP (edge case 3): the RFP's
 * own, then those suppliers proposed in a SUBMITTED response, in their words.
 * A draft's proposal is invisible to PTI, so it cannot enter a round either.
 */
export function rfpRoundOptions(rfp: RfpEvent): readonly RfpRoundOptionView[] {
  const own = (rfp.pricing?.options ?? []).map((o) => ({ ...o, ref: rfpOptionRef(o.id), supplierProposed: false }));
  // Each proposed option keeps its PROPOSER: `sup-opt-1` from two suppliers is
  // two options, told apart by the ref.
  const proposed = rfpResponseStore
    .all()
    .filter((r) => r.rfpId === rfp.id && r.status === 'Submitted')
    .flatMap((r) =>
      (r.pricing?.proposedOptions ?? []).map((o) => ({
        ...o,
        ref: rfpOptionRef(o.id, r.supplierId),
        supplierProposed: true,
        proposerSupplierId: r.supplierId,
      })),
    );
  return [...own, ...proposed];
}

/**
 * NR-2 — the firm-offer rounds a scope may read.
 *
 * `supplierId` null = the buyer: every round, every invitee, every offer.
 * `supplierId` set = that supplier: only rounds it was invited to, only itself
 * as invitee, and only its own offers and firm prices (RFX-R4, AC-01).
 */
export function rfpOfferRoundViews(nowIso: string, supplierId: string | null): readonly RfpOfferRoundView[] {
  const rounds = rfpOfferRoundStore.all();
  const numberOf = new Map(rounds.map((r) => [r.id, r.roundNumber] as const));
  const visibleOffers = rfpFirmOfferStore
    .all()
    .filter((o) => (supplierId ? o.supplierId === supplierId : true));
  return rounds
    .filter((r) => (supplierId ? r.invitedSupplierIds.includes(supplierId) : true))
    .map((round) => {
      const rfp = rfpEventStore.get(round.rfpId);
      const invited = supplierId ? [supplierId] : round.invitedSupplierIds;
      const offers = visibleOffers.filter((o) => o.roundId === round.id);
      const byRef = new Map((rfp ? rfpRoundOptions(rfp) : []).map((o) => [o.ref, o] as const));
      const closed = round.closedAt !== undefined;
      const onRfp = visibleOffers
        .filter((o) => o.rfpId === round.rfpId && numberOf.has(o.roundId))
        .map((o) => ({ ...o, roundNumber: numberOf.get(o.roundId)! }));
      return {
        ...round,
        invitedSupplierIds: invited,
        rfpNumber: rfp?.eventNumber ?? round.rfpId,
        rfpTitle: rfp?.title ?? '',
        currency: rfp?.currency ?? BASE_CURRENCY,
        options: round.optionRefs.map((ref) => {
          const known = byRef.get(ref);
          if (known) return known;
          const { optionId, proposerSupplierId } = parseRfpOptionRef(ref);
          return {
            ref,
            id: optionId,
            title: optionId,
            supplierProposed: proposerSupplierId !== undefined,
            ...(proposerSupplierId ? { proposerSupplierId } : {}),
          };
        }),
        closed,
        overdue: !closed && isPastDeadline(round.deadline, nowIso),
        offers,
        awaiting: invited.filter((sid) => !offers.some((o) => o.supplierId === sid)).length,
        firmPrices: firmPricesInForce(onRfp).map((p) => ({ ...p, supplierName: rfxSupplierName(p.supplierId) })),
      };
    });
}

/** RFx C3 — the item keys an award's lines settled (see `AwardView.settledItemKeys`). */
function settledKeysOf(rfq: RFQ | undefined, lines: readonly AwardLine[]): string[] {
  if (!rfq) return [];
  const items = awardItemsOf(rfq);
  return [...new Set(lines.flatMap((l) => itemOfAwardLine(items, l)?.key ?? []))];
}

/** The awards a scope may read. A supplier reads only awards it is named on. */
export function awardViews(supplierId: string | null): readonly AwardView[] {
  // RFx C2 (AR-08) — each award's status is derived from the appended trail.
  const trail: AwardTrail = { cancellations: awardCancellationStore.all(), sapMarks: awardSapMarkStore.all() };
  return awardStore
    .all()
    // AR-02 — the record names its event type. This is the RFQ arm; the RFP
    // arm is `rfpAwardViews` below (RFx D2), whose lines name an option and a
    // firm offer rather than an item and a quote.
    .filter((a): a is RfqAwardRecord => a.eventType === 'rfq')
    .filter((a) =>
      supplierId
        ? a.lines.some((l) => l.supplierId === supplierId) || a.notAwardedSupplierIds.includes(supplierId)
        : true,
    )
    .map((award) => {
      const rfq = rfqStore.get(award.eventId);
      const cancellation = cancellationOf(award.id, trail);
      const sapMark = sapMarkOf(award.id, trail);
      // BR-05 / AC-05 — a supplier sees ONLY ITS OWN OUTCOME. The share another
      // supplier won is another supplier's commercial position.
      const lines = supplierId ? award.lines.filter((l) => l.supplierId === supplierId) : award.lines;
      const bySupplier = new Map<string, { sharePct: number; quantity: number }>();
      for (const line of lines) {
        const prev = bySupplier.get(line.supplierId) ?? { sharePct: 0, quantity: 0 };
        bySupplier.set(line.supplierId, {
          sharePct: prev.sharePct + line.sharePct,
          quantity: prev.quantity + line.quantity,
        });
      }
      return {
        ...award,
        lines,
        notAwardedSupplierIds: supplierId
          ? award.notAwardedSupplierIds.filter((s) => s === supplierId)
          : award.notAwardedSupplierIds,
        rfqNumber: rfq?.rfqNumber ?? award.eventId,
        rfqTitle: rfq?.title ?? '',
        uom: rfq?.uom ?? '',
        awardedSuppliers: [...bySupplier.entries()].map(([sid, agg]) => ({
          supplierId: sid,
          supplierName: rfxSupplierName(sid),
          sharePct: Math.round(agg.sharePct / (lines.filter((l) => l.supplierId === sid).length || 1)),
          quantity: agg.quantity,
        })),
        // A PER-ITEM award (a tiered RFQ) departs when ANY item's lines leave
        // out that item's best-scored quote; an event-level award departs when
        // its lines leave out the event's.
        departedFromBestScore: award.bestScoredByItem
          ? award.bestScoredByItem.some(
              (b) => !award.lines.some((l) => l.itemLineNo === b.itemLineNo && l.quotationId === b.quotationId),
            )
          : award.bestScoredQuotationId !== undefined &&
            !award.lines.some((l) => l.quotationId === award.bestScoredQuotationId),
        // RFx C2 (NR-3 BR-12, AC-07) — a supplier reads the status and the
        // date its award was withdrawn, and only on an award it already reads
        // (its own lines, or its own "not awarded"). The buyer's reason, the
        // actor and the SAP document number stay on the buyer's read.
        status: awardStatusOf(award.id, trail),
        ...(cancellation ? { withdrawnAt: cancellation.cancelledAt } : {}),
        ...(!supplierId && cancellation ? { cancellation } : {}),
        ...(!supplierId && sapMark ? { sapMark } : {}),
        // RFx C3 (NR-3 BR-12; RFX-R4) — WHICH items this award settled, read
        // from the FULL record: item keys only, never whose line or what share,
        // so a supplier on the award can read "Not awarded" on an item another
        // supplier won without learning who won it or how much.
        settledItemKeys: settledKeysOf(rfq, award.lines),
      };
    });
}

/**
 * RFx D2 (NR-2 BR-09, AC-07; NR-3 BR-12) — the RFP awards a scope may read.
 *
 * `supplierId` null = the buyer: every award, every line, the reason, the
 * cancellation and the SAP marking. `supplierId` set = that supplier: only an
 * award it is named on (a line, or the final award's "not awarded"), only its
 * OWN lines, and its outcome — `Withdrawn` once the award is cancelled. There
 * is no cascade onto the RFP responses; this read IS each responder's outcome.
 */
export function rfpAwardViews(supplierId: string | null): readonly RfpAwardView[] {
  const trail: AwardTrail = { cancellations: awardCancellationStore.all(), sapMarks: awardSapMarkStore.all() };
  return awardStore
    .all()
    .filter(isRfpAward)
    .filter((a) =>
      supplierId
        ? a.lines.some((l) => l.supplierId === supplierId) || a.notAwardedSupplierIds.includes(supplierId)
        : true,
    )
    .map((award) => {
      const rfp = rfpEventStore.get(award.eventId);
      const titles = new Map((rfp ? rfpRoundOptions(rfp) : []).map((o) => [o.ref, o.title] as const));
      const status = awardStatusOf(award.id, trail);
      const cancellation = cancellationOf(award.id, trail);
      const sapMark = sapMarkOf(award.id, trail);
      const lines = (supplierId ? award.lines.filter((l) => l.supplierId === supplierId) : award.lines).map(
        (l) => ({
          ...l,
          supplierName: rfxSupplierName(l.supplierId),
          optionTitle: titles.get(l.optionRef) ?? l.optionRef,
        }),
      );
      return {
        id: award.id,
        eventType: 'rfp' as const,
        eventId: award.eventId,
        rfpNumber: rfp?.eventNumber ?? award.eventId,
        rfpTitle: rfp?.title ?? '',
        awardedAt: award.awardedAt,
        lines,
        notAwardedSupplierIds: supplierId
          ? award.notAwardedSupplierIds.filter((s) => s === supplierId)
          : award.notAwardedSupplierIds,
        status,
        ...(cancellation ? { withdrawnAt: cancellation.cancelledAt } : {}),
        ...(!supplierId ? { reason: award.reason } : {}),
        ...(!supplierId && cancellation ? { cancellation } : {}),
        ...(!supplierId && sapMark ? { sapMark } : {}),
        ...(supplierId
          ? { outcome: status === 'Cancelled' ? 'Withdrawn' : lines.length > 0 ? 'Awarded' : 'Not awarded' }
          : {}),
        // RFx D3 (RFX-R4) — WHICH options this award settled, from the FULL
        // record: refs only, never whose line or what share.
        settledOptionRefs: [...new Set(award.lines.map((l) => l.optionRef))],
      } satisfies RfpAwardView;
    });
}
