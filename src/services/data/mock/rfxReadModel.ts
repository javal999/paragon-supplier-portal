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
import { sdcClock } from '../../sdc/clock';
import type { Quotation } from '../../../data/mockQuotations';
import type { RFQ } from '../../../data/mockRfqs';
import { BASE_CURRENCY } from '../../../lib/currencyPolicy';
import { scoreQuotations, type ScoringOutcome } from '../../../lib/quoteScore';
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
  RfxInviteeView,
} from '../../sourcing/views';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import {
  awardStore,
  negotiationRoundStore,
  rfiEventStore,
  rfiResponseStore,
  rfpEventStore,
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

/** The supplier's OTIF, or `null` when nothing has ever been measured. */
export const rfxSupplierOtif = (supplierId: string): number | null =>
  mockSuppliers.find((s) => s.id === supplierId)?.otif ?? null;

// ── REQ-E03-01 — the invitee search ─────────────────────────────────────────

/** Every supplier master row as an invitee candidate, before any filter. */
export function inviteeCandidates(): readonly InviteeCandidate[] {
  return mockSuppliers.map((s) => ({
    supplierId: s.id,
    supplierName: s.name,
    category: s.category,
    purchasingGroup: s.purchasingGroup,
    status: s.status,
    otif: s.otif ?? null,
    country: s.country,
  }));
}

/** The candidates matching the buyer's active filters (BR-01, BR-04). */
export const matchingInvitees = (filter: InviteeFilter): readonly InviteeCandidate[] =>
  filterInvitees(inviteeCandidates(), filter);

// ── REQ-E03-02 / REQ-E03-04 — the event views ───────────────────────────────

const inviteeViews = (
  event: { responseDeadline: string; invitees: readonly { supplierId: string; deadline?: string }[] },
  responseFor: (supplierId: string) => { status: string; submittedAt?: string } | undefined,
  nowIso: string,
): readonly RfxInviteeView[] =>
  event.invitees.map((invitee) => {
    const deadline = effectiveDeadline(event.responseDeadline, event.invitees, invitee.supplierId);
    const response = responseFor(invitee.supplierId);
    const responseState: InviteeResponseState =
      response?.status === 'Submitted' ? 'submitted' : response ? 'draft' : 'notStarted';
    return {
      supplierId: invitee.supplierId,
      supplierName: rfxSupplierName(invitee.supplierId),
      deadline,
      responseState,
      submittedAt: response?.submittedAt ?? null,
      otif: rfxSupplierOtif(invitee.supplierId),
      overdue: responseState !== 'submitted' && isPastDeadline(deadline, nowIso),
    };
  });

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
      return {
        ...event,
        invitedSuppliers: inviteeViews(
          event,
          (sid) => mine.find((r) => r.supplierId === sid),
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
      return {
        ...event,
        invitedSuppliers: inviteeViews(
          event,
          (sid) => mine.find((r) => r.supplierId === sid),
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
  complianceScore: q.complianceScore,
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

/** The CR-15 outcome for an RFQ's current quotes, honouring CR-16 (FX). */
export function rfqScoring(rfq: RFQ, nowIso: string): ScoringOutcome {
  return scoreQuotations(currentQuotesFor(rfq.id).map(scorableQuote), {
    pins: rfq.fxPins,
    now: new Date(nowIso),
  });
}

/** The best-scored quotation id for an RFQ, or null when the set is unrankable. */
export function bestScoredQuotationId(rfq: RFQ, nowIso: string): string | null {
  const outcome = rfqScoring(rfq, nowIso);
  if (outcome.kind !== 'scored') return null;
  return outcome.scores.find((s) => s.topRanked)?.quoteId ?? null;
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

/** The awards a scope may read. A supplier reads only awards it is named on. */
export function awardViews(supplierId: string | null): readonly AwardView[] {
  return awardStore
    .all()
    .filter((a) =>
      supplierId
        ? a.lines.some((l) => l.supplierId === supplierId) || a.notAwardedSupplierIds.includes(supplierId)
        : true,
    )
    .map((award) => {
      const rfq = rfqStore.get(award.rfqId);
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
        rfqNumber: rfq?.rfqNumber ?? award.rfqId,
        rfqTitle: rfq?.title ?? '',
        uom: rfq?.uom ?? '',
        awardedSuppliers: [...bySupplier.entries()].map(([sid, agg]) => ({
          supplierId: sid,
          supplierName: rfxSupplierName(sid),
          sharePct: Math.round(agg.sharePct / (lines.filter((l) => l.supplierId === sid).length || 1)),
          quantity: agg.quantity,
        })),
        departedFromBestScore:
          award.bestScoredQuotationId !== undefined &&
          !award.lines.some((l) => l.quotationId === award.bestScoredQuotationId),
      };
    });
}
