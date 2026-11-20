// ────────────────────────────────────────────────────────────────────────────
// RFx verbs (REQ-E03-01 to REQ-E03-05) dispatched through the REAL
// MockCommandService and read back through the REAL MockProcurementService.
//
// ⚠️ **EVERY POLICY IS PROBED BOTH WAYS.** A refusal spec on its own proves the
// verb can say no; it cannot tell "the rule fired" from "the verb refuses
// everything" — which is the shape `PROBE THE GUARD BOTH WAYS` exists for. So
// each rule below is a KNOWN-BAD that is refused BY NAME and a KNOWN-GOOD,
// differing in the one field the rule is about, that goes through.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import {
  awardStore,
  negotiationRoundStore,
  resetRfxStores,
  rfiEventStore,
  rfiResponseStore,
  rfpEventStore,
  rfpResponseStore
} from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfxNow } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { rfpTermKindOf } from '../../sourcing/rfxConfig';

const svc = new MockCommandService();
const reads = new MockProcurementService();

/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplier = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

const sup007 = supplier('sup-007');
const sup008 = supplier('sup-008');
const sup013 = supplier('sup-013');
const sup015 = supplier('sup-015');

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const DAY_MS = 86_400_000;
/** @param {number} offset */
const dayFromNow = (offset) =>
  new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
// POPULATION CONTROL — nothing below means anything without this.
// ─────────────────────────────────────────────────────────────────────────────

describe('RFx — the fixtures the rules are probed against exist', () => {
  it('the sample events, responses, round and award are all present', () => {
    expect(rfiEventStore.get('rfi-001')?.status).toBe('Open');
    expect(rfpEventStore.get('rfp-001')?.status).toBe('Open');
    expect(rfqStore.get('rfq-014')?.status).toBe('Closed');
    expect(negotiationRoundStore.get('nr-0001')?.closed).toBe(false);
    expect(awardStore.get('aw-0001')?.lines).toHaveLength(2);
    // known-bad: a document the tree does not hold
    expect(rfiEventStore.get('rfi-999')).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-03 AC-05 — a quote is refused after the response deadline.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} rfqId
 * @param {string} supplierId
 */
const quotePayload = (rfqId, supplierId) => ({
  rfqId,
  supplierId,
  unitPrice: 1_000,
  leadTimeDays: 20,
  currency: 'IDR',
  paymentTermsOffered: 'Net 30',
  validUntil: dayFromNow(30)
});

describe('REQ-E03-03 AC-05 — the response deadline is enforced at the verb', () => {
  it('KNOWN-BAD — a quote after the deadline is refused by name, and mints nothing', async () => {
    const before = quotationStore.forRfq('rfq-014').length;
    const res = await svc.dispatch(sup007, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: quotePayload('rfq-014', 'sup-007')
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/PAST_DEADLINE/);
    expect(quotationStore.forRfq('rfq-014')).toHaveLength(before);
  });

  it('KNOWN-GOOD — the same quote on an event still open goes through', async () => {
    const open = /** @type {import('@data/mockRfqs').RFQ} */ (
      rfqStore.all().find((r) => r.status === 'Open' && r.invitedSupplierIds.includes('sup-007'))
    );
    const res = await svc.dispatch(sup007, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: quotePayload(open.id, 'sup-007')
    });
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (
        quotationStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
      ).rfqId
    ).toBe(open.id);
  });

  it('BR-05 — an extension granted to ONE invitee reopens it for that invitee alone', async () => {
    const extended = await svc.dispatch(buyer, {
      transitionId: 't_rfq_extend',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: { deadline: dayFromNow(7), supplierIds: ['sup-007'] }
    });
    expect(extended.status, extended.reason).toBe('done');
    // The event's own deadline did NOT move — only sup-007's did.
    expect(
      /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).responseDeadline
    ).toBe(dayFromNow(-2));

    const mine = await svc.dispatch(sup007, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: quotePayload('rfq-014', 'sup-007')
    });
    expect(mine.status, mine.reason).toBe('done');

    // KNOWN-BAD twin — a supplier that was NOT named is still past the deadline.
    const theirs = await svc.dispatch(sup008, {
      transitionId: 't_quotation_submit',
      entity: 'quotation',
      payload: quotePayload('rfq-014', 'sup-008')
    });
    expect(theirs.status).toBe('failed');
    expect(theirs.reason).toMatch(/PAST_DEADLINE/);
  });

  it('KNOWN-BAD — a deadline that moves EARLIER is refused: it is not an extension', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfi_extend',
      entity: 'rfiEvent',
      entityId: 'rfi-001',
      payload: { deadline: dayFromNow(1), supplierIds: [] }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/NOT_AN_EXTENSION/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-05 BR-03 — only a supplier INVITED TO THE ROUND may revise.
// ─────────────────────────────────────────────────────────────────────────────

/** @param {string} supplierId */
const revisePayload = (supplierId) => ({
  roundId: 'nr-0001',
  rfqId: 'rfq-014',
  supplierId,
  roundNumber: 1,
  unitPrice: 1_000,
  leadTimeDays: 18,
  currency: 'IDR'
});

describe('REQ-E03-05 BR-03 — a negotiation round is a shortlist, not an invitation to all', () => {
  it('KNOWN-BAD — a bidder NOT in the round is refused by name', async () => {
    // sup-008 quoted on rfq-014 and is NOT on the round's shortlist.
    const res = await svc.dispatch(sup008, {
      transitionId: 't_quotation_revise',
      entity: 'quotation',
      payload: revisePayload('sup-008')
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/NOT_IN_ROUND/);
  });

  it('KNOWN-GOOD — a shortlisted supplier revises, and the earlier version is KEPT', async () => {
    const before = quotationStore.forRfq('rfq-014').length;
    const res = await svc.dispatch(sup007, {
      transitionId: 't_quotation_revise',
      entity: 'quotation',
      payload: { ...revisePayload('sup-007'), supersedesQuotationId: 'qt-014a' }
    });
    expect(res.status, res.reason).toBe('done');
    expect(quotationStore.forRfq('rfq-014')).toHaveLength(before + 1);
    // AC-03 — the superseded version is still readable, not overwritten.
    expect(quotationStore.get('qt-014a')).toBeDefined();
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (
        quotationStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
      ).supersedesQuotationId
    ).toBe('qt-014a');
  });

  it('KNOWN-BAD — a round whose shortlist names a supplier that never quoted is refused', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_negotiationround_open',
      entity: 'negotiationRound',
      payload: { rfqId: 'rfq-014', deadline: dayFromNow(5), invitedSupplierIds: ['sup-001'] }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/NOT_A_BIDDER/);
  });

  it('KNOWN-GOOD — a shortlist drawn from the bidders opens a round', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_negotiationround_open',
      entity: 'negotiationRound',
      payload: {
        rfqId: 'rfq-014',
        deadline: dayFromNow(5),
        invitedSupplierIds: ['sup-008', 'sup-013'],
        message: 'Sharpen the closure line.',
        targetUnitPrice: 700
      }
    });
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').NegotiationRound} */ (
        negotiationRoundStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
      ).roundNumber
    ).toBe(2);
  });

  it('BR-05 — a supplier reads its own thread, never another supplier’s', async () => {
    const mine = (await reads.getNegotiationRounds(sup015)).items;
    expect(mine.map((r) => r.id)).toEqual(['nr-0001']);
    expect([...mine[0].invitedSupplierIds]).toEqual(['sup-015']);
    expect(mine[0].participants.map((p) => p.supplierId)).toEqual(['sup-015']);
    // known-good twin: the buyer DOES see both sides of the same round.
    const theirs = /** @type {import('../../sourcing/views').NegotiationRoundView} */ (
      (await reads.getNegotiationRounds(buyer)).items.find((r) => r.id === 'nr-0001')
    );
    expect([...theirs.invitedSupplierIds].sort()).toEqual(['sup-007', 'sup-015']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-05 BR-06 / BR-07 — the split and the reason.
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️ RFx C1 (AR-04, NR-3 AC-04): rfq-014 is a legacy RFQ with TWO line items,
// and a legacy RFQ is now awarded per line — every line awarded or the final
// award refuses AWARD_ITEMS_OPEN. These specs used to award the first line only
// (the old rule read `lineItems[0]`); the split is now applied to both lines,
// which is what the event page sends. Each rule below is unchanged.
const RFQ_014_LINES = /** @type {const} */ ([
  ['PK-PETB-8802', 600_000],
  ['PK-CAPF-8820', 300_000]
]);
/** @param {readonly [string, string, number][]} split */
const awardLines = (split) =>
  RFQ_014_LINES.flatMap(([itemCode, lineQty]) =>
    split.map(([supplierId, quotationId, sharePct]) => ({
      supplierId,
      quotationId,
      itemCode,
      sharePct,
      quantity: Math.round((lineQty * sharePct) / 100)
    }))
  );

describe('REQ-E03-05 BR-06 — each item’s shares must total 100%', () => {
  it('KNOWN-BAD — a split totalling 90% is refused by name, and awards nothing', async () => {
    const lines = awardLines([
      ['sup-015', 'qt-014d-r1', 60],
      ['sup-007', 'qt-014a', 30]
    ]);
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: 'qt-014d-r1',
        awardedSupplierId: 'sup-015',
        awardLines: lines,
        awardReason: 'Dual sourced.'
      }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_SPLIT_INCOMPLETE/);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Closed'
    );
    expect(awardStore.all().some((a) => a.eventId === 'rfq-014')).toBe(false);
  });

  it('KNOWN-GOOD — the SAME award at 70/30 is recorded, with the loser named', async () => {
    // ⚠️ PREMISE CHANGE (BL-43): the 30% line used to name sup-007, which then
    // failed the compliance gate on OTIF (50% < 80%; it passes at 86% since
    // BL-94). The split rule is unchanged; the second supplier is one that passes.
    const lines = awardLines([
      ['sup-015', 'qt-014d-r1', 70],
      ['sup-013', 'qt-014c', 30]
    ]);
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: 'qt-014d-r1',
        awardedSupplierId: 'sup-015',
        awardLines: lines,
        awardReason: 'Dual sourced for supply security.'
      }
    });
    expect(res.status, res.reason).toBe('done');
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Awarded'
    );
    const recorded = /** @type {import('../../sourcing/types').AwardRecord} */ (
      awardStore.all().find((a) => a.eventId === 'rfq-014')
    );
    expect(recorded.lines.map((l) => [l.itemCode, l.supplierId, l.sharePct])).toEqual([
      ['PK-PETB-8802', 'sup-015', 70],
      ['PK-PETB-8802', 'sup-013', 30],
      ['PK-CAPF-8820', 'sup-015', 70],
      ['PK-CAPF-8820', 'sup-013', 30]
    ]);
    // BR-08 — every other invited supplier is recorded as not awarded.
    expect([...recorded.notAwardedSupplierIds].sort()).toEqual(['sup-007', 'sup-008']);
  });
});

describe('REQ-E03-05 BR-07 — an award that leaves the best-scored quote out states why', () => {
  /** The quotation CR-15 ranks first on rfq-014, derived rather than assumed. */
  const bestOf014 = async () => {
    const { bestScoredQuotationId } = await import('./rfxReadModel');
    return bestScoredQuotationId(
      /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')),
      rfxNow()
    );
  };

  /**
   * A current quote on rfq-014 that is NOT the best-scored one and whose supplier
   * PASSES the compliance gate. BL-43: before the gate, any other quote would do;
   * now a failing supplier is refused on CR-23 before BR-07 is ever reached.
   * @param {string} best
   */
  const qualifiedLoserOf014 = async (best) => {
    const { currentQuotesFor, rfqSupplierGate } = await import('./rfxReadModel');
    const rfq = /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014'));
    return /** @type {import('@data/mockQuotations').Quotation} */ (
      currentQuotesFor('rfq-014').find(
        (q) => q.id !== best && rfqSupplierGate(rfq, q.supplierId, rfxNow()).passes
      )
    );
  };

  it('CONTROL — the set IS rankable, so the rule below has something to depart from', async () => {
    const best = await bestOf014();
    expect(best).not.toBeNull();
    expect(
      /** @type {import('@data/mockQuotations').Quotation} */ (
        quotationStore.get(/** @type {NonNullable<typeof best>} */ (best))
      ).rfqId
    ).toBe('rfq-014');
  });

  it('KNOWN-BAD — awarding around the best-scored quote with no reason is refused by name', async () => {
    const best = /** @type {NonNullable<Awaited<ReturnType<typeof bestOf014>>>} */ (
      await bestOf014()
    );
    const loser = await qualifiedLoserOf014(best);
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: loser.id,
        awardedSupplierId: loser.supplierId,
        awardLines: awardLines([[loser.supplierId, loser.id, 100]])
      }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_REASON_REQUIRED/);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Closed'
    );
  });

  it('KNOWN-GOOD — the SAME award with a reason is recorded, and the reason is kept', async () => {
    const best = /** @type {NonNullable<Awaited<ReturnType<typeof bestOf014>>>} */ (
      await bestOf014()
    );
    const loser = await qualifiedLoserOf014(best);
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: loser.id,
        awardedSupplierId: loser.supplierId,
        awardLines: awardLines([[loser.supplierId, loser.id, 100]]),
        awardReason: 'Only supplier able to hold the launch window.'
      }
    });
    expect(res.status, res.reason).toBe('done');
    const recorded = /** @type {import('../../sourcing/types').AwardRecord} */ (
      awardStore.all().find((a) => a.eventId === 'rfq-014')
    );
    expect(recorded.reason).toMatch(/launch window/);
    expect(recorded.bestScoredQuotationId).toBe(best);
  });

  it('POSITIVE TWIN — an award that DOES follow the best-scored quote needs no reason', async () => {
    const best = /** @type {NonNullable<Awaited<ReturnType<typeof bestOf014>>>} */ (
      await bestOf014()
    );
    const winner = /** @type {import('@data/mockQuotations').Quotation} */ (
      quotationStore.get(best)
    );
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: best,
        awardedSupplierId: winner.supplierId,
        awardLines: awardLines([[winner.supplierId, best, 100]])
      }
    });
    expect(res.status, res.reason).toBe('done');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-02 — required questions, and the invisible draft.
// ─────────────────────────────────────────────────────────────────────────────

describe('REQ-E03-02 — a required question blocks sending, and a draft stays private', () => {
  it('KNOWN-BAD — submitting a half-answered response is refused, and NAMES the questions', async () => {
    const draft = /** @type {import('../../sourcing/types').RfiResponse} */ (
      rfiResponseStore.all().find((r) => r.supplierId === 'sup-013')
    );
    const res = await svc.dispatch(sup013, {
      transitionId: 't_rfiresponse_submit',
      entity: 'rfiResponse',
      entityId: draft.id,
      payload: {}
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/REQUIRED_UNANSWERED/);
    // The refusal names them, so it is actionable rather than a scavenger hunt.
    expect(res.reason).toMatch(/a-description/);
    expect(
      /** @type {import('../../sourcing/types').RfiResponse} */ (rfiResponseStore.get(draft.id))
        .status
    ).toBe('Draft');
  });

  it('KNOWN-GOOD — the SAME response with every required question answered is sent', async () => {
    const event = /** @type {import('../../sourcing/types').RfiEvent} */ (
      rfiEventStore.get('rfi-001')
    );
    const answers = event.questions
      .filter((q) => q.required)
      // Each answer is of its question's KIND — the submit verb now refuses an
      // answer that does not fit (`ANSWER_INVALID`), so "stated" for a yes/no
      // question is no longer a way to clear the required rule.
      .map((q) => ({
        questionId: q.id,
        value:
          q.type === 'numberWithUnit'
            ? 10
            : q.type === 'multipleChoice'
              ? [/** @type {NonNullable<typeof q.options>} */ (q.options)[0]]
              : q.type === 'yesNo'
                ? 'yes'
                : (q.options?.[0] ?? 'stated')
      }));
    const saved = await svc.dispatch(sup013, {
      transitionId: 't_rfiresponse_save',
      entity: 'rfiResponse',
      payload: { rfiId: 'rfi-001', supplierId: 'sup-013', answers }
    });
    expect(saved.status, saved.reason).toBe('done');
    const sent = await svc.dispatch(sup013, {
      transitionId: 't_rfiresponse_submit',
      entity: 'rfiResponse',
      entityId: /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId),
      payload: {}
    });
    expect(sent.status, sent.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfiResponse} */ (
        rfiResponseStore.get(/** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId))
      ).status
    ).toBe('Submitted');
  });

  it('BR-10 shape — PTI reads the two SUBMITTED responses and not the draft', async () => {
    const seen = /** @type {import('../../sourcing/views').RfiEventView} */ (
      (await reads.getRfiEvents(buyer)).items.find((e) => e.id === 'rfi-001')
    );
    expect(seen.responses.map((r) => r.supplierId).sort()).toEqual(['sup-007', 'sup-008']);
    // known-good twin: the draft's author still reads its own.
    const mine = /** @type {import('../../sourcing/views').RfiEventView} */ (
      (await reads.getRfiEvents(sup013)).items.find((e) => e.id === 'rfi-001')
    );
    expect(mine.responses.map((r) => r.status)).toEqual(['Draft']);
  });

  it('KNOWN-BAD — a supplier that was not invited cannot answer at all', async () => {
    // ⚠️ THE REFUSAL ARRIVES AS A THROW, NOT AS A STATUS, AND THAT IS THE
    // STRONGER ANSWER. Membership folds into `creationOwner`, so an uninvited
    // supplier fails the SCOPE gate — upstream of the role gate and of every
    // policy hook — and the dispatcher throws `SCOPE_DENIED` rather than
    // returning a refusal a caller could mistake for a soft no.
    await expect(
      svc.dispatch(supplier('sup-001'), {
        transitionId: 't_rfiresponse_save',
        entity: 'rfiResponse',
        payload: { rfiId: 'rfi-001', supplierId: 'sup-001', answers: [] }
      })
    ).rejects.toThrow(/denied for scope/);
    expect(rfiResponseStore.all().some((r) => r.supplierId === 'sup-001')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-04 — a deviation carries a comment.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {'comply' | 'deviate'} stanceOnFirst
 * @param {string} [comment]
 */
const answersFor = (stanceOnFirst, comment) => {
  const event = /** @type {import('../../sourcing/types').RfpEvent} */ (
    rfpEventStore.get('rfp-001')
  );
  return event.terms.map((row, i) => ({
    termId: row.termId,
    // A number-kind term (price basis, lead time) is answered with a number:
    // the submit verb refuses a value that does not read as the term's kind.
    proposedValue: rfpTermKindOf(row) === 'numberWithUnit' ? '10' : 'as requested',
    stance: i === 0 ? stanceOnFirst : /** @type {const} */ ('comply'),
    ...(i === 0 && comment ? { comment } : {})
  }));
};

describe('REQ-E03-04 — a deviation nobody explained is not an answer', () => {
  // sup-013 is an invitee of rfp-001 that has NOT answered — the fixture's own
  // "still to propose" row, and the one this rule is probed through.

  it('KNOWN-BAD — a Deviate with no comment is refused by name, and NAMES the term', async () => {
    const saved = await svc.dispatch(sup013, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: { rfpId: 'rfp-001', supplierId: 'sup-013', answers: answersFor('deviate') }
    });
    expect(saved.status, saved.reason).toBe('done');
    const sent = await svc.dispatch(sup013, {
      transitionId: 't_rfpresponse_submit',
      entity: 'rfpResponse',
      entityId: /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId),
      payload: {}
    });
    expect(sent.status).toBe('failed');
    expect(sent.reason).toMatch(/DEVIATION_NEEDS_COMMENT/);
    expect(sent.reason).toMatch(/priceBasis/);
    expect(
      /** @type {import('../../sourcing/types').RfpResponse} */ (
        rfpResponseStore.get(/** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId))
      ).status
    ).toBe('Draft');
  });

  it('KNOWN-GOOD — the SAME deviation WITH a comment is sent', async () => {
    const saved = await svc.dispatch(sup013, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: {
        rfpId: 'rfp-001',
        supplierId: 'sup-013',
        answers: answersFor('deviate', 'Resin is index-linked; we cannot hold a fixed basis.')
      }
    });
    const sent = await svc.dispatch(sup013, {
      transitionId: 't_rfpresponse_submit',
      entity: 'rfpResponse',
      entityId: /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId),
      payload: {}
    });
    expect(sent.status, sent.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpResponse} */ (
        rfpResponseStore.get(/** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId))
      ).status
    ).toBe('Submitted');
  });

  it('KNOWN-BAD — an RFP naming a term the standard list does not hold is refused', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfp_create',
      entity: 'rfpEvent',
      payload: {
        title: 'Made-up terms',
        scope: 'probe',
        materialCategory: 'Packaging',
        responseDeadline: dayFromNow(14),
        currency: 'IDR',
        invitedSupplierIds: ['sup-007'],
        terms: [{ termId: 'inventedTerm', requestedValue: '1' }]
      }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/UNKNOWN_TERM/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-01 BR-04 — publication re-reads the supplier statuses.
// ─────────────────────────────────────────────────────────────────────────────

describe('REQ-E03-01 BR-04 — a suspended or blacklisted invitee stops publication', () => {
  it('KNOWN-BAD — an event whose invitee list holds a suspended supplier is refused by name', async () => {
    const created = await svc.dispatch(buyer, {
      transitionId: 't_rfi_create',
      entity: 'rfiEvent',
      payload: {
        title: 'Probe',
        templateId: 'packaging',
        materialCategory: 'Packaging',
        responseDeadline: dayFromNow(14),
        // sup-012 is Suspended and sup-014 is Blacklisted in the master.
        invitedSupplierIds: ['sup-007', 'sup-012', 'sup-014']
      }
    });
    expect(created.status, created.reason).toBe('done');
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfi_publish',
      entity: 'rfiEvent',
      entityId: /** @type {NonNullable<typeof created.entityId>} */ (created.entityId),
      payload: {}
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/SUPPLIER_NOT_SELECTABLE/);
    expect(res.reason).toMatch(/sup-012/);
    expect(res.reason).toMatch(/sup-014/);
    expect(
      /** @type {import('../../sourcing/types').RfiEvent} */ (
        rfiEventStore.get(/** @type {NonNullable<typeof created.entityId>} */ (created.entityId))
      ).status
    ).toBe('Draft');
  });

  it('KNOWN-GOOD — the SAME event with only active invitees publishes', async () => {
    const created = await svc.dispatch(buyer, {
      transitionId: 't_rfi_create',
      entity: 'rfiEvent',
      payload: {
        title: 'Probe',
        templateId: 'packaging',
        materialCategory: 'Packaging',
        responseDeadline: dayFromNow(14),
        invitedSupplierIds: ['sup-007', 'sup-013']
      }
    });
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfi_publish',
      entity: 'rfiEvent',
      entityId: /** @type {NonNullable<typeof created.entityId>} */ (created.entityId),
      payload: {}
    });
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfiEvent} */ (
        rfiEventStore.get(/** @type {NonNullable<typeof created.entityId>} */ (created.entityId))
      ).status
    ).toBe('Open');
  });

  it('KNOWN-BAD — an unknown question template is refused, so no empty form is sent', async () => {
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfi_create',
      entity: 'rfiEvent',
      payload: {
        title: 'Probe',
        templateId: 'not-a-template',
        materialCategory: 'Packaging',
        responseDeadline: dayFromNow(14),
        invitedSupplierIds: ['sup-007']
      }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/UNKNOWN_TEMPLATE/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-01 — the invitee search, read through the real service.
// ─────────────────────────────────────────────────────────────────────────────

describe('REQ-E03-01 — the invitee read', () => {
  it('AC-03 — a suspended and a blacklisted supplier never appear, filtered or not', async () => {
    const all = (await reads.getInviteeCandidates(buyer)).items;
    expect(all.length).toBeGreaterThan(5); // population control
    expect(all.map((c) => c.supplierId)).toContain('sup-007'); // known-good
    expect(all.map((c) => c.supplierId)).not.toContain('sup-012'); // suspended
    expect(all.map((c) => c.supplierId)).not.toContain('sup-014'); // blacklisted
  });

  it('AC-01 — the purchasing-group filter narrows, and combines with the category', async () => {
    const group = (await reads.getInviteeCandidates(buyer, { purchasingGroup: '101' })).items;
    // BL-64 — the gate demo adds four packaging suppliers to group 101: the two
    // ACTIVE ones (sup-019, OTIF 80%; sup-020, OTIF 79%) are candidates; the
    // SUSPENDED sup-021 and BLACKLISTED sup-022 are not, like sup-012 and sup-014.
    expect(group.map((c) => c.supplierId).sort()).toEqual([
      'sup-007',
      'sup-013',
      'sup-015',
      'sup-019',
      'sup-020'
    ]);
    expect(group.map((c) => c.supplierId)).not.toContain('sup-021');
    expect(group.map((c) => c.supplierId)).not.toContain('sup-022');
    const both = (
      await reads.getInviteeCandidates(buyer, { purchasingGroup: '104', category: 'Packaging' })
    ).items;
    expect(both.map((c) => c.supplierId)).toEqual(['sup-008']);
    // KNOWN-BAD twin — a combination nothing satisfies returns EMPTY, not everything.
    const none = (
      await reads.getInviteeCandidates(buyer, { purchasingGroup: '101', category: 'Fragrance' })
    ).items;
    expect(none).toEqual([]);
  });

  it('AC-02 — a supplier with no measured history reads `null`, never 0', async () => {
    const all = (await reads.getInviteeCandidates(buyer)).items;
    expect(
      /** @type {import('../../transitions/rfxRules').InviteeCandidate} */ (
        all.find((c) => c.supplierId === 'sup-013')
      ).otif
    ).toBeNull();
    // PREMISE CHANGED (REQ-E10-01): the figure is CALCULATED from the seeded
    // call-offs and receipts — sup-007 has seven measured deliveries in the
    // window, six met and one late (BL-94; it read 50% on two) — not read off
    // the master.
    expect(
      /** @type {import('../../transitions/rfxRules').InviteeCandidate} */ (
        all.find((c) => c.supplierId === 'sup-007')
      ).otif
    ).toBe(86);
  });

  it('the invitee roster is PTI’s — a supplier reads nothing', async () => {
    expect((await reads.getInviteeCandidates(sup007)).items).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-05 BR-01a / CR-23 — the compliance gate at award (BL-43).
// ─────────────────────────────────────────────────────────────────────────────

describe('REQ-E03-05 BR-01a — an award line naming a supplier that fails the compliance gate is refused', () => {
  /** @param {ReturnType<typeof awardLines>} lines */
  const award014 = (lines) =>
    svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: lines[0].quotationId,
        awardedSupplierId: lines[0].supplierId,
        awardLines: lines,
        awardReason: 'Chosen on supply security.'
      }
    });

  // ⚠️ PREMISE CHANGE (BL-94): the failing bidder here was sup-007 (OTIF 50%).
  // It passes at 86% now, so the refusals name sup-008 (OTIF 0%), rfq-014's
  // other failing bidder. The rule and its twins are unchanged.
  it('KNOWN-BAD — awarding 100% to sup-008 (OTIF 0% < 80%) is refused by name, and awards nothing', async () => {
    const res = await award014(awardLines([['sup-008', 'qt-014b', 100]]));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-008 .*\(otif\)/);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Closed'
    );
    expect(awardStore.all().some((a) => a.eventId === 'rfq-014')).toBe(false);
  });

  it('KNOWN-GOOD — the SAME award to sup-013, which passes, is recorded', async () => {
    const res = await award014(awardLines([['sup-013', 'qt-014c', 100]]));
    expect(res.status, res.reason).toBe('done');
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status).toBe(
      'Awarded'
    );
  });

  it('a split with ONE failing line is refused whole — the passing share does not carry it', async () => {
    const res = await award014(
      awardLines([
        ['sup-015', 'qt-014d-r1', 70],
        ['sup-008', 'qt-014b', 30]
      ])
    );
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-008/);
  });

  it('a line cannot launder a failing bid under a passing supplier id — the quote author is judged', async () => {
    const res = await award014(awardLines([['sup-013', 'qt-014b', 100]]));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-008/);
  });

  it('the seeded demo: on rfq-003 sup-010 fails on its expired halal certificate; sup-001 is awarded', async () => {
    /**
     * @param {string} supplierId
     * @param {string} quotationId
     */
    const line = (supplierId, quotationId) => ({
      supplierId,
      quotationId,
      itemCode: '',
      sharePct: 100,
      quantity: /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-003')).totalQty
    });
    const bad = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-003',
      payload: {
        awardedQuotationId: 'qt-003c',
        awardedSupplierId: 'sup-010',
        awardLines: [line('sup-010', 'qt-003c')],
        awardReason: 'Local supplier.'
      }
    });
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-010 .*\(halal\)/);

    const good = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-003',
      payload: {
        awardedQuotationId: 'qt-003a',
        awardedSupplierId: 'sup-001',
        awardLines: [line('sup-001', 'qt-003a')],
        awardReason: 'Local supplier.'
      }
    });
    expect(good.status, good.reason).toBe('done');
  });
});
