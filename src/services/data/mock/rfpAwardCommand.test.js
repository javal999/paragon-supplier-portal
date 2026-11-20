// ────────────────────────────────────────────────────────────────────────────
// RFx D2 — awarding an RFP per option on firm offers (NR-2 BR-01, BR-05 to
// BR-10; NR-3), with cancel and "Raised in SAP", dispatched through the REAL
// MockCommandService and read back through the REAL MockProcurementService.
//
// ⚠️ **EVERY NEW REFUSAL IS PROBED BOTH WAYS (RFX-R8).** Each code is fired by
// a known-bad that differs from a known-good in the one thing its rule is
// about, and the known-good goes through.
//
// The sample RFP is rfp-002 (Tundra): PTI's options `opt-full-set` ("Full set:
// bottle, pump and cap") and `opt-pump-cap` at 10K/50K/100K, and sup-007's
// submitted proposal with its own `sup-opt-1`. The setup adds submitted
// responses for sup-013 and sup-015 (both pass CR-23) and sup-008 (a responder
// that is never awarded), closes the RFP by verb, runs a firm-offer round and
// closes it.
//
// ⚠️ THE ROUNDS NAME sup-013, NOT sup-007: the owner ruling of 2026-11-20
// (BL-55) raised the OTIF minimum to 90% and sup-007 measures 86%, so it can no
// longer join a firm-offer round. sup-013 has no OTIF history, which passes.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import {
  awardCancellationStore,
  awardStore,
  resetRfxStores,
  rfpEventStore,
  rfpFirmOfferStore,
  rfpOfferRoundStore,
  rfpResponseStore
} from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfpRoundOptions, rfpSupplierGate, rfxNow } from './rfxReadModel';
import { mockSuppliers } from '@data/mockSuppliers';
import { SupplierStatus } from '@app-types/supplier.types';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { awardItemsOfRfp, isRfpAward, rfpAwardedOptionRefs } from '../../sourcing/rfpAward';
import { rfpOptionRef } from '../../sourcing/rfpFirmOffer';
import { prefillRfqItemsFromRfp } from '../../sourcing/rfxPrefill';
/** @import { RfpAwardLine } from '../../sourcing/types' */

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

/**
 * The refusal code a policy reason carries (`POLICY_REJECTED:<hook>:<CODE>: …`).
 * @param {string | undefined} reason
 */
const codeOf = (reason) => (reason ?? '').replace(/^POLICY_REJECTED:[a-z_]+:/, '').split(':')[0];

const DAY_MS = 86_400_000;
/** @param {number} offset */
const dayFromNow = (offset) =>
  new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);

const FULL_SET = 'opt-full-set';
const PUMP_CAP = 'opt-pump-cap';
const REASON = 'Dual source: sup-013 is cheapest at 50K, sup-015 holds the second mould.';

/**
 * sup-013, sup-015 and sup-008 answered rfp-002 too (sup-015 proposes its OWN
 * `sup-opt-1`, a different option from sup-007's). Added to the stores
 * directly: this is the FIXTURE the award is probed against, not an act under
 * test (the RFP response verbs are covered in rfxCommand.test).
 * @returns {void}
 */
function seedResponses() {
  rfpEventStore.update('rfp-002', (e) => ({
    ...e,
    invitees: [...e.invitees, { supplierId: 'sup-013' }, { supplierId: 'sup-008' }]
  }));
  // Owner ruling 2026-11-20 (BL-55): sup-007 measures 86% and no longer passes
  // the 90% gate minimum, so it cannot join a firm-offer round. sup-013 has no
  // OTIF history (which passes); its response proposes no option of its own, so
  // the double-proposal case below still has its two suppliers.
  rfpResponseStore.add({
    id: 'rfp-resp-d2-sup-013',
    rfpId: 'rfp-002',
    supplierId: 'sup-013',
    status: 'Submitted',
    updatedAt: rfxNow(),
    submittedAt: rfxNow(),
    answers: []
  });
  rfpResponseStore.add({
    id: 'rfp-resp-d2-sup-015',
    rfpId: 'rfp-002',
    supplierId: 'sup-015',
    status: 'Submitted',
    updatedAt: rfxNow(),
    submittedAt: rfxNow(),
    answers: [],
    pricing: {
      prices: [{ optionId: 'sup-opt-1', qty: 50_000, unitPrice: 3_700 }],
      proposedOptions: [{ id: 'sup-opt-1', title: 'Airless 150 ml bottle, snap-on pump' }]
    }
  });
  rfpResponseStore.add({
    id: 'rfp-resp-d2-sup-008',
    rfpId: 'rfp-002',
    supplierId: 'sup-008',
    status: 'Submitted',
    updatedAt: rfxNow(),
    submittedAt: rfxNow(),
    answers: []
  });
}

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  seedResponses();
});

/**
 * @param {QueryScope} scope
 * @param {string} transitionId
 * @param {Record<string, unknown>} payload
 */
const dispatch = (scope, transitionId, payload, entityId = 'rfp-002') =>
  svc.dispatch(scope, { transitionId, entity: 'rfpEvent', entityId, payload });

/**
 * Close rfp-002, open a round for `optionRefs` at 10K and 50K asking sup-013 and
 * sup-015, let each supplier send the prices it is given, then close the round.
 * Returns each supplier's firm offer id.
 * @param {readonly string[]} optionRefs
 * @param {Record<string, readonly { optionRef: string; qty: number; unitPrice: number }[]>} prices
 * @returns {Promise<Record<string, string>>}
 */
async function roundWithOffers(
  optionRefs,
  prices,
  validUntil = dayFromNow(60),
  deadline = dayFromNow(5)
) {
  const closed = await dispatch(buyer, 't_rfp_close', {});
  expect(closed.status, closed.reason).toBe('done');
  const round = await svc.dispatch(buyer, {
    transitionId: 't_rfp_round_open',
    entity: 'rfpOfferRound',
    payload: {
      rfpId: 'rfp-002',
      optionRefs,
      quantityPoints: [10_000, 50_000],
      invitedSupplierIds: ['sup-013', 'sup-015'],
      deadline
    }
  });
  expect(round.status, round.reason).toBe('done');
  /** @type {Record<string, string>} */
  const offers = {};
  for (const [supplierId, ps] of Object.entries(prices)) {
    const res = await svc.dispatch(supplier(supplierId), {
      transitionId: 't_rfpfirmoffer_submit',
      entity: 'rfpFirmOffer',
      payload: { roundId: round.entityId, supplierId, prices: ps, validUntil }
    });
    expect(res.status, res.reason).toBe('done');
    offers[supplierId] = /** @type {NonNullable<typeof res.entityId>} */ (res.entityId);
  }
  const close = await svc.dispatch(buyer, {
    transitionId: 't_rfp_round_close',
    entity: 'rfpOfferRound',
    entityId: /** @type {NonNullable<typeof round.entityId>} */ (round.entityId)
  });
  expect(close.status, close.reason).toBe('done');
  return offers;
}

/** Both suppliers price the full set at 10K and 50K. */
const fullSetOffers = () =>
  roundWithOffers([FULL_SET], {
    'sup-013': [
      { optionRef: FULL_SET, qty: 10_000, unitPrice: 4_500 },
      { optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 }
    ],
    'sup-015': [
      { optionRef: FULL_SET, qty: 10_000, unitPrice: 4_600 },
      { optionRef: FULL_SET, qty: 50_000, unitPrice: 4_180 }
    ]
  });

/**
 * The full set 60/40 at the 50,000 point, on the two firm offers.
 * @param {Record<string, string>} offers
 * @returns {RfpAwardLine[]}
 */
const split6040 = (offers) => [
  {
    supplierId: 'sup-013',
    optionRef: FULL_SET,
    firmOfferId: /** @type {NonNullable<(typeof offers)['sup-013']>} */ (offers['sup-013']),
    sharePct: 60,
    quantity: 30_000,
    awardTierQty: 50_000
  },
  {
    supplierId: 'sup-015',
    optionRef: FULL_SET,
    firmOfferId: /** @type {NonNullable<(typeof offers)['sup-015']>} */ (offers['sup-015']),
    sharePct: 40,
    quantity: 20_000,
    awardTierQty: 50_000
  }
];

/**
 * @param {readonly RfpAwardLine[]} awardLines
 * @param {Record<string, unknown>} [extra]
 */
const award = (awardLines, extra = {}) =>
  dispatch(buyer, 't_rfp_award', { awardLines, awardReason: REASON, ...extra });
/**
 * @param {readonly RfpAwardLine[]} awardLines
 * @param {Record<string, unknown>} [extra]
 */
const awardPartial = (awardLines, extra = {}) =>
  dispatch(buyer, 't_rfp_award_partial', { awardLines, awardReason: REASON, ...extra });

const rfpAwards = () =>
  awardStore
    .all()
    .filter(isRfpAward)
    .filter((a) => a.eventId === 'rfp-002');

/**
 * A legacy RFQ create payload, created from rfp-002 for the named option refs.
 * @param {readonly string[]} sourceRfpOptionRefs
 */
const rfqFromRfp = (sourceRfpOptionRefs) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'Tundra — bottle and pump, firm prices',
      materialCategory: 'Packaging',
      invitedSupplierIds: ['sup-013'],
      responseDeadline: dayFromNow(10),
      awardDeadline: dayFromNow(20),
      totalQty: 50_000,
      uom: 'PCS',
      sourceRfpId: 'rfp-002',
      sourceRfpOptionRefs
    }
  });

/**
 * An RFQ created from rfp-002 BEFORE owner ruling Q1 (2026-10-19) closed the
 * RFQ path for an option in a firm-offer round: created through the verb with
 * no option refs, then given the refs it was recorded with. This is the only
 * way an RFQ can still source an option a round names, and the RFP award must
 * keep refusing to place that option twice.
 * @param {readonly string[]} sourceRfpOptionRefs
 */
const legacyRfqFromRfp = async (sourceRfpOptionRefs) => {
  const res = await rfqFromRfp([]);
  expect(res.status, res.reason).toBe('done');
  const id = /** @type {NonNullable<typeof res.entityId>} */ (res.entityId);
  rfqStore.update(id, (r) => ({ ...r, sourceRfpOptionRefs }));
  return res;
};

// ─────────────────────────────────────────────────────────────────────────────

describe('D2 — the fixture the award is probed against exists', () => {
  it('rfp-002 carries both PTI options and two suppliers each propose their own sup-opt-1', () => {
    const rfp = /** @type {import('../../sourcing/types').RfpEvent} */ (
      rfpEventStore.get('rfp-002')
    );
    expect(rfp.pricing?.options.map((o) => o.id)).toEqual([FULL_SET, PUMP_CAP]);
    expect(rfp.pricing?.quantityPoints).toContain(50_000);
    const refs = rfpRoundOptions(rfp).map((o) => o.ref);
    expect(refs).toEqual(expect.arrayContaining(['sup-007:sup-opt-1', 'sup-015:sup-opt-1']));
  });
});

describe('NR-2 AC-05 — an RFP is awarded per option, split on firm offers', () => {
  it('"Full set" 60/40 at the 50,000 point on 2 firm offers → Awarded, recording option, offers, shares, quantities, point and reason', async () => {
    const offers = await fullSetOffers();
    const res = await award(split6040(offers));
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Awarded');
    const [rec] = rfpAwards();
    expect(/** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).eventType).toBe(
      'rfp'
    );
    expect(/** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).reason).toBe(REASON);
    expect(
      /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).lines.map((l) => [
        l.supplierId,
        l.optionRef,
        l.firmOfferId,
        l.sharePct,
        l.quantity,
        l.awardTierQty,
        l.splitBasis
      ])
    ).toEqual([
      ['sup-013', FULL_SET, offers['sup-013'], 60, 30_000, 50_000, 'pct'],
      ['sup-015', FULL_SET, offers['sup-015'], 40, 20_000, 50_000, 'pct']
    ]);
    // An offer id is never stored as a quote id.
    expect(
      /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).lines.every(
        (l) => l.quotationId === undefined
      )
    ).toBe(true);
    // NR-2 BR-09 — the final award names every responder no award named:
    // sup-008, and sup-007 whose fixture response cannot be awarded at the 90%
    // gate minimum (BL-55, 2026-11-20).
    expect(
      /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).notAwardedSupplierIds
    ).toEqual(expect.arrayContaining(['sup-007', 'sup-008']));
    // No cascade: the responses stay Submitted.
    expect(
      rfpResponseStore
        .all()
        .filter((r) => r.rfpId === 'rfp-002')
        .every((r) => r.status === 'Submitted')
    ).toBe(true);
  });

  it('a split by quantity is recorded with its basis (NR-3 BR-02)', async () => {
    const offers = await fullSetOffers();
    const lines = split6040(offers).map((l) => ({
      ...l,
      splitBasis: /** @type {const} */ ('qty')
    }));
    const res = await award(lines);
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rfpAwards()[0]).lines.map(
        (l) => l.splitBasis
      )
    ).toEqual(['qty', 'qty']);
  });

  it('the C1 split rule applies: 60/45 is refused naming the option (AWARD_SPLIT_INCOMPLETE)', async () => {
    const offers = await fullSetOffers();
    const [a, b] = split6040(offers);
    const res = await award([
      /** @type {RfpAwardLine} */ (a),
      { .../** @type {RfpAwardLine} */ (b), sharePct: 45, quantity: 22_500 }
    ]);
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('AWARD_SPLIT_INCOMPLETE');
    expect(res.reason).toContain('Full set');
  });

  it('a point the round did not ask is refused (AWARD_TIER_UNKNOWN)', async () => {
    const offers = await fullSetOffers();
    const res = await award(
      split6040(offers).map((l) => ({ ...l, awardTierQty: 100_000, quantity: l.sharePct * 1_000 }))
    );
    expect(codeOf(res.reason)).toBe('AWARD_TIER_UNKNOWN');
  });
});

describe('NR-2 AC-03 — no firm offer on the option, no award', () => {
  it('a line whose supplier has no firm offer on the option is refused, naming the option; with both offers it passes', async () => {
    const offers = await roundWithOffers([FULL_SET, PUMP_CAP], {
      'sup-013': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 }],
      // sup-015 priced the pump-and-cap option only.
      'sup-015': [{ optionRef: PUMP_CAP, qty: 50_000, unitPrice: 2_250 }]
    });
    const refused = await awardPartial(split6040(offers));
    expect(refused.status).toBe('failed');
    expect(codeOf(refused.reason)).toBe('AWARD_ITEM_NOT_QUOTED');
    expect(refused.reason).toContain('Full set: bottle, pump and cap');
    expect(refused.reason).toContain('sup-015');
    // Known-good: the whole option to sup-013, whose firm offer prices it.
    const ok = await awardPartial([
      {
        supplierId: 'sup-013',
        optionRef: FULL_SET,
        firmOfferId: /** @type {NonNullable<(typeof offers)['sup-013']>} */ (offers['sup-013']),
        sharePct: 100,
        quantity: 50_000,
        awardTierQty: 50_000
      }
    ]);
    expect(ok.status, ok.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Partly awarded');
  });

  it("a line naming another supplier's offer is refused (the offer must be the line's supplier's)", async () => {
    const offers = await fullSetOffers();
    const [a, b] = split6040(offers);
    const res = await award([
      /** @type {RfpAwardLine} */ (a),
      {
        .../** @type {RfpAwardLine} */ (b),
        firmOfferId: /** @type {NonNullable<(typeof offers)['sup-013']>} */ (offers['sup-013'])
      }
    ]);
    expect(codeOf(res.reason)).toBe('AWARD_ITEM_NOT_QUOTED');
  });

  it('an option that no CLOSED round names is not an item (AWARD_ITEM_UNKNOWN, in RFP words)', async () => {
    const offers = await fullSetOffers();
    const res = await award([
      {
        .../** @type {RfpAwardLine} */ (split6040(offers)[0]),
        optionRef: PUMP_CAP,
        sharePct: 100,
        quantity: 50_000
      }
    ]);
    expect(codeOf(res.reason)).toBe('AWARD_ITEM_UNKNOWN');
    expect(res.reason).toContain('closed firm-offer round');
  });
});

describe('NR-2 AC-04 / BR-06 — every RFP award needs a reason', () => {
  it('no reason → AWARD_REASON_REQUIRED; the same award with a reason passes', async () => {
    const offers = await fullSetOffers();
    const blank = await dispatch(buyer, 't_rfp_award', {
      awardLines: split6040(offers),
      awardReason: '   '
    });
    expect(blank.status).toBe('failed');
    expect(codeOf(blank.reason)).toBe('AWARD_REASON_REQUIRED');
    const absent = await dispatch(buyer, 't_rfp_award', { awardLines: split6040(offers) });
    expect(codeOf(absent.reason)).toBe('AWARD_REASON_REQUIRED');
    expect((await award(split6040(offers))).status).toBe('done');
  });
});

describe('NR-2 edge case 2 — a lapsed firm offer cannot be awarded', () => {
  it('past its validity → AWARD_OFFER_EXPIRED; on its last valid day it passes', async () => {
    // The shortest validity a round allows (its own deadline), so the clock
    // moves as little as it can and nothing else the award reads changes.
    const validUntil = dayFromNow(1);
    const offers = await roundWithOffers(
      [FULL_SET],
      {
        'sup-013': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 }],
        'sup-015': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_180 }]
      },
      validUntil,
      validUntil
    );
    const start = rfxNow();
    sdcClock.set(`${validUntil}T12:00:00.000Z`);
    const lastDay = await award(split6040(offers));
    expect(lastDay.status, lastDay.reason).toBe('done');
    // Undo, and move a day past the validity.
    resetRfxStores();
    rfqStore.reset();
    sdcClock.set(start);
    seedResponses();
    const again = await roundWithOffers(
      [FULL_SET],
      {
        'sup-013': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 }],
        'sup-015': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_180 }]
      },
      validUntil,
      validUntil
    );
    sdcClock.set(new Date(Date.parse(`${validUntil}T12:00:00.000Z`) + DAY_MS).toISOString());
    const res = await award(split6040(again));
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('AWARD_OFFER_EXPIRED');
    expect(res.reason).toContain(
      /** @type {NonNullable<(typeof again)['sup-013']>} */ (again['sup-013'])
    );
  });
});

describe('NR-3 BR-06 / BR-09 — partial award, then cancel, returns the RFP to Closed', () => {
  it('partial on one option → Partly awarded; cancel with a reason → Closed, the record kept and read as Cancelled', async () => {
    const offers = await roundWithOffers([FULL_SET, PUMP_CAP], {
      'sup-013': [
        { optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 },
        { optionRef: PUMP_CAP, qty: 50_000, unitPrice: 2_250 }
      ],
      'sup-015': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_180 }]
    });
    const partial = await awardPartial(split6040(offers));
    expect(partial.status, partial.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Partly awarded');
    // A partial award tells nobody they lost.
    const [rec] = rfpAwards();
    expect(
      /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).notAwardedSupplierIds
    ).toEqual([]);
    // The final award is refused while the pump-and-cap option is open.
    const final = await award(split6040(offers));
    expect(codeOf(final.reason)).toBe('AWARD_ITEM_ALREADY_AWARDED');

    // The partial cancel is the wrong verb: no other award stays in force.
    const wrong = await dispatch(buyer, 't_rfp_award_cancel_partial', {
      awardId: /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id,
      cancelReason: 'Typo'
    });
    expect(codeOf(wrong.reason)).toBe('AWARD_CANCEL_TARGET_WRONG');
    expect(wrong.reason).toContain('t_rfp_award_cancel');
    const noReason = await dispatch(buyer, 't_rfp_award_cancel', {
      awardId: /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id,
      cancelReason: ' '
    });
    expect(codeOf(noReason.reason)).toBe('AWARD_REASON_REQUIRED');

    const cancel = await dispatch(buyer, 't_rfp_award_cancel', {
      awardId: /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id,
      cancelReason: 'Wrong split typed'
    });
    expect(cancel.status, cancel.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Closed');
    expect(
      awardStore.get(/** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id)
    ).toEqual(rec);
    expect(awardCancellationStore.all().map((c) => [c.awardId, c.reason])).toEqual([
      [/** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id, 'Wrong split typed']
    ]);
    const view = /** @type {import('../../sourcing/views').RfpAwardView} */ (
      (await reads.getRfpAwards(buyer)).items.find(
        (a) => a.id === /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id
      )
    );
    expect(view.status).toBe('Cancelled');
    expect(view.cancellation?.reason).toBe('Wrong split typed');
    // The cancelled award's option is open again.
    const again = await awardPartial(split6040(offers));
    expect(again.status, again.reason).toBe('done');
  });

  it('"Raised in SAP" needs the document number, and after it the award cannot be cancelled here', async () => {
    const offers = await fullSetOffers();
    expect((await award(split6040(offers))).status).toBe('done');
    const [rec] = rfpAwards();
    const blank = await dispatch(buyer, 't_rfp_award_sap_raised', {
      awardId: /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id,
      sapDocumentNo: '  '
    });
    expect(codeOf(blank.reason)).toBe('AWARD_SAP_DOCUMENT_REQUIRED');
    const mark = await dispatch(buyer, 't_rfp_award_sap_raised', {
      awardId: /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id,
      sapDocumentNo: '4500012345'
    });
    expect(mark.status, mark.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Awarded');
    const cancel = await dispatch(buyer, 't_rfp_award_cancel', {
      awardId: /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id,
      cancelReason: 'Too late'
    });
    expect(codeOf(cancel.reason)).toBe('AWARD_RAISED_IN_SAP');
    expect(cancel.reason).toContain('4500012345');
  });

  it('an RFQ award id is not an award of this RFP (AWARD_NOT_ACTIVE)', async () => {
    const offers = await fullSetOffers();
    expect((await award(split6040(offers))).status).toBe('done');
    const rfqAward = /** @type {import('../../sourcing/types').RfqAwardRecord} */ (
      awardStore.all().find((a) => a.eventType === 'rfq')
    );
    const res = await dispatch(buyer, 't_rfp_award_cancel', {
      awardId: rfqAward.id,
      cancelReason: 'Probe'
    });
    expect(codeOf(res.reason)).toBe('AWARD_NOT_ACTIVE');
  });
});

describe('NR-2 BR-08 / AC-06 — one option, one route', () => {
  it('after award, pre-fill leaves the awarded option out and the RFQ create policy refuses it; the other option passes', async () => {
    const offers = await roundWithOffers([FULL_SET, PUMP_CAP], {
      'sup-013': [
        { optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 },
        { optionRef: PUMP_CAP, qty: 50_000, unitPrice: 2_250 }
      ],
      'sup-015': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_180 }]
    });
    expect((await awardPartial(split6040(offers))).status).toBe('done');
    const awarded = [...rfpAwardedOptionRefs(rfpAwards()).keys()];
    expect(awarded).toEqual([FULL_SET]);

    const rfp = /** @type {import('../../sourcing/types').RfpEvent} */ (
      rfpEventStore.get('rfp-002')
    );
    const seed = prefillRfqItemsFromRfp(rfp, rfpResponseStore.all(), [FULL_SET, PUMP_CAP], awarded);
    expect(seed.items.map((i) => i.sourceOptionRef)).toEqual([PUMP_CAP]);
    expect(seed.sourceRfpOptionRefs).toEqual([PUMP_CAP]);

    const refused = await rfqFromRfp([FULL_SET]);
    expect(refused.status).toBe('failed');
    expect(codeOf(refused.reason)).toBe('AWARD_OPTION_SOURCED_ELSEWHERE');
    expect(refused.reason).toContain('RFP-2026-002');
    // PREMISE CHANGED (owner ruling Q1, 2026-10-19): the pump and cap was in
    // the same firm-offer round, so its RFQ path is closed as well; it is
    // firmed up in the RFP. (The pass case is in the Q1 describe below.)
    const inRound = await rfqFromRfp(seed.sourceRfpOptionRefs);
    expect(inRound.status).toBe('failed');
    expect(codeOf(inRound.reason)).toBe('RFQ_OPTION_IN_FIRM_ROUND');
  });

  it('an RFP award is refused for an option an RFQ created from the RFP already sources; the other option is awarded', async () => {
    const offers = await roundWithOffers([FULL_SET, PUMP_CAP], {
      'sup-013': [
        { optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 },
        { optionRef: PUMP_CAP, qty: 50_000, unitPrice: 2_250 }
      ],
      'sup-015': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_180 }]
    });
    // An RFQ recorded before ruling Q1 sources the full set (the verb now
    // refuses a new one: the option is in a firm-offer round).
    await legacyRfqFromRfp([FULL_SET]);
    const res = await award(split6040(offers));
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('AWARD_OPTION_SOURCED_ELSEWHERE');
    expect(res.reason).toMatch(/sourced by RFQ-/);
    // The option the RFQ sources is settled there, so awarding the other one
    // is the FINAL award.
    const pump = await award([
      {
        supplierId: 'sup-013',
        optionRef: PUMP_CAP,
        firmOfferId: /** @type {NonNullable<(typeof offers)['sup-013']>} */ (offers['sup-013']),
        sharePct: 100,
        quantity: 50_000,
        awardTierQty: 50_000
      }
    ]);
    expect(pump.status, pump.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Awarded');
  });
});

describe('owner ruling Q1 (2026-10-19) — once an option is in a firm-offer round, the RFQ path closes for it', () => {
  it('KNOWN-BAD — an RFQ from the RFP naming an option in round 1 is refused RFQ_OPTION_IN_FIRM_ROUND, naming the option, the round and the RFP', async () => {
    await roundWithOffers([FULL_SET], {
      'sup-013': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 }]
    });
    const res = await rfqFromRfp([FULL_SET]);
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('RFQ_OPTION_IN_FIRM_ROUND');
    expect(res.reason).toContain('firm-offer round 1');
    expect(res.reason).toContain('RFP-2026-002');
  });

  it('KNOWN-GOOD — the option no round names still goes to an RFQ', async () => {
    await roundWithOffers([FULL_SET], {
      'sup-013': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 }]
    });
    const res = await rfqFromRfp([PUMP_CAP]);
    expect(res.status, res.reason).toBe('done');
  });
});

describe('RULING — two suppliers both propose sup-opt-1, and they stay two options', () => {
  // The refs stay namespaced by their PROPOSER — sup-007's fixture proposal and
  // sup-015's — while the round and the award name sup-013, the passing
  // supplier that prices sup-007's option (BL-55, 2026-11-20).
  const SUP7 = rfpOptionRef('sup-opt-1', 'sup-007');
  const SUP15 = rfpOptionRef('sup-opt-1', 'sup-015');

  it('the items, the award lines, the double-award guard and the pre-fill keep them apart', async () => {
    expect([SUP7, SUP15]).toEqual(['sup-007:sup-opt-1', 'sup-015:sup-opt-1']);
    const offers = await roundWithOffers([SUP7, SUP15], {
      'sup-013': [{ optionRef: SUP7, qty: 50_000, unitPrice: 3_550 }],
      'sup-015': [{ optionRef: SUP15, qty: 50_000, unitPrice: 3_650 }]
    });
    const rfp = /** @type {import('../../sourcing/types').RfpEvent} */ (
      rfpEventStore.get('rfp-002')
    );
    const items = awardItemsOfRfp(rfp, rfpOfferRoundStore.all(), rfpFirmOfferStore.all(), {
      nowIso: rfxNow(),
      options: rfpRoundOptions(rfp)
    });
    expect(items.map((i) => [i.key, i.name])).toEqual([
      [SUP7, 'option "Stock 150 ml bottle with 24/410 lotion pump"'],
      [SUP15, 'option "Airless 150 ml bottle, snap-on pump"']
    ]);

    // sup-015's offer is on ITS sup-opt-1, not sup-013's: refused.
    const crossed = await awardPartial([
      {
        supplierId: 'sup-015',
        optionRef: SUP7,
        firmOfferId: /** @type {NonNullable<(typeof offers)['sup-015']>} */ (offers['sup-015']),
        sharePct: 100,
        quantity: 50_000,
        awardTierQty: 50_000
      }
    ]);
    expect(codeOf(crossed.reason)).toBe('AWARD_ITEM_NOT_QUOTED');

    // sup-013's own option, awarded to sup-013: a partial award (sup-015's stays open).
    const mine = await awardPartial([
      {
        supplierId: 'sup-013',
        optionRef: SUP7,
        firmOfferId: /** @type {NonNullable<(typeof offers)['sup-013']>} */ (offers['sup-013']),
        sharePct: 100,
        quantity: 50_000,
        awardTierQty: 50_000
      }
    ]);
    expect(mine.status, mine.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rfpAwards()[0]).lines.map(
        (l) => l.optionRef
      )
    ).toEqual([SUP7]);

    // The guard compares refs: sup-013's is awarded; sup-015's is not, and is
    // refused for its own reason — it is in the firm-offer round (owner
    // ruling Q1, 2026-10-19), which names it by ITS ref.
    expect(codeOf((await rfqFromRfp([SUP7])).reason)).toBe('AWARD_OPTION_SOURCED_ELSEWHERE');
    const inRound = await rfqFromRfp([SUP15]);
    expect(codeOf(inRound.reason)).toBe('RFQ_OPTION_IN_FIRM_ROUND');
    expect(inRound.reason).toContain('Airless 150 ml bottle, snap-on pump');

    // The pre-fill finds each option's own proposer by the ref.
    const seed = prefillRfqItemsFromRfp(rfp, rfpResponseStore.all(), [SUP7, SUP15], [SUP7]);
    expect(
      seed.items.map((i) => [i.sourceOptionRef, i.proposedBySupplierId, i.description])
    ).toEqual([[SUP15, 'sup-015', 'Airless 150 ml bottle, snap-on pump']]);
    expect(seed.invitedSupplierIds).toEqual(['sup-015']);
    // A BARE `sup-opt-1` names two options here, so it is skipped, never guessed.
    expect(prefillRfqItemsFromRfp(rfp, rfpResponseStore.all(), ['sup-opt-1']).items).toEqual([]);
  });
});

describe('NR-2 AC-07 / NR-3 BR-12 — each responder reads only its own outcome', () => {
  it('awarded suppliers read their own line, the other responder reads Not awarded, and all read Withdrawn after a cancel', async () => {
    const offers = await fullSetOffers();
    expect((await award(split6040(offers))).status).toBe('done');

    /** @param {string} sid */
    const own = async (sid) => (await reads.getRfpAwards(supplier(sid))).items;
    const s7 = await own('sup-013');
    expect(s7).toHaveLength(1);
    expect(
      /** @type {import('../../sourcing/views').RfpAwardView} */ (s7[0]).lines.map((l) => [
        l.supplierId,
        l.sharePct,
        l.quantity,
        l.awardTierQty,
        l.optionTitle
      ])
    ).toEqual([['sup-013', 60, 30_000, 50_000, 'Full set: bottle, pump and cap']]);
    expect(/** @type {import('../../sourcing/views').RfpAwardView} */ (s7[0]).outcome).toBe(
      'Awarded'
    );
    expect(
      /** @type {import('../../sourcing/views').RfpAwardView} */ (s7[0]).notAwardedSupplierIds
    ).toEqual([]);
    // The buyer's reason is the buyer's read.
    expect(
      /** @type {import('../../sourcing/views').RfpAwardView} */ (s7[0]).reason
    ).toBeUndefined();

    const s15 = await own('sup-015');
    expect(
      /** @type {import('../../sourcing/views').RfpAwardView} */ (s15[0]).lines.map(
        (l) => l.supplierId
      )
    ).toEqual(['sup-015']);

    const s8 = await own('sup-008');
    expect(/** @type {import('../../sourcing/views').RfpAwardView} */ (s8[0]).lines).toEqual([]);
    expect(
      /** @type {import('../../sourcing/views').RfpAwardView} */ (s8[0]).notAwardedSupplierIds
    ).toEqual(['sup-008']);
    expect(/** @type {import('../../sourcing/views').RfpAwardView} */ (s8[0]).outcome).toBe(
      'Not awarded'
    );

    // A supplier that did not respond reads nothing.
    expect(await own('sup-001')).toEqual([]);
    // The buyer reads every line and the reason.
    const b = /** @type {import('../../sourcing/views').RfpAwardView} */ (
      (await reads.getRfpAwards(buyer)).items[0]
    );
    expect(b.lines).toHaveLength(2);
    expect(b.reason).toBe(REASON);
    expect(b.outcome).toBeUndefined();

    const cancel = await dispatch(buyer, 't_rfp_award_cancel', {
      awardId: /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rfpAwards()[0]).id,
      cancelReason: 'Volume moved to Q1'
    });
    expect(cancel.status, cancel.reason).toBe('done');
    const after = /** @type {import('../../sourcing/views').RfpAwardView} */ (
      (await own('sup-013'))[0]
    );
    expect(after.outcome).toBe('Withdrawn');
    expect(after.withdrawnAt).toBeDefined();
    expect(after.cancellation).toBeUndefined();
  });

  it('the RFQ award read does not carry RFP awards', async () => {
    const offers = await fullSetOffers();
    expect((await award(split6040(offers))).status).toBe('done');
    const rfqRead = (await reads.getAwards(buyer)).items;
    expect(rfqRead.some((a) => a.eventId === 'rfp-002')).toBe(false);
    expect(rfqRead.length).toBeGreaterThan(0);
  });
});

describe('D2 — roles', () => {
  it('a buyer seat without rfp:award cannot award an RFP; procurement can', async () => {
    const offers = await fullSetOffers();
    /** @type {QueryScope} */
    const receiving = { ...buyer, businessRoles: ['receiving'] };
    const denied = await svc.dispatch(receiving, {
      transitionId: 't_rfp_award',
      entity: 'rfpEvent',
      entityId: 'rfp-002',
      payload: { awardLines: split6040(offers), awardReason: REASON }
    });
    expect(denied.status).toBe('failed');
    expect(denied.reason).toContain('rfp:award');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Closed');
    /** @type {QueryScope} */
    const procurement = { ...buyer, businessRoles: ['procurement'] };
    const ok = await svc.dispatch(procurement, {
      transitionId: 't_rfp_award',
      entity: 'rfpEvent',
      entityId: 'rfp-002',
      payload: { awardLines: split6040(offers), awardReason: REASON }
    });
    expect(ok.status, ok.reason).toBe('done');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BL-130 (REQ-E03-04 BR-16f) — "Will not award the rest" on an RFP: the final
// award with NO lines, legal only on a Partly awarded RFP and only when it
// marks every open option. Probed both ways: each known-bad differs from the
// known-good in the one thing its rule is about.
// ─────────────────────────────────────────────────────────────────────────────

/** Both options asked: sup-013 prices both, sup-015 only the full set, at 50K. */
const twoOptionOffers = () =>
  roundWithOffers([FULL_SET, PUMP_CAP], {
    'sup-013': [
      { optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 },
      { optionRef: PUMP_CAP, qty: 50_000, unitPrice: 2_250 }
    ],
    'sup-015': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_180 }]
  });

describe('BL-130 — a Partly awarded RFP is closed out with "Will not award the rest"', () => {
  /**
   * The full set awarded 60/40 as a PARTIAL award, leaving the pump and cap open.
   * @returns {Promise<void>}
   */
  async function partlyAwarded() {
    const offers = await twoOptionOffers();
    const partial = await awardPartial(split6040(offers));
    expect(partial.status, partial.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Partly awarded');
  }

  it('no lines, every open option "Will not award", a reason → Awarded, recorded with no lines and the responders not named', async () => {
    await partlyAwarded();
    const [first] = rfpAwards();
    const res = await award([], { notAwardedItems: [PUMP_CAP] });
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Awarded');
    const closeOut = /** @type {import('../../sourcing/types').RfpAwardRecord} */ (
      rfpAwards().find(
        (a) => a.id !== /** @type {import('../../sourcing/types').RfpAwardRecord} */ (first).id
      )
    );
    expect(closeOut.lines).toEqual([]);
    expect(closeOut.reason).toBe(REASON);
    // NR-2 BR-09 — the final award names every responder no award of the RFP
    // named: sup-008, and sup-007 (below the 90% gate minimum, BL-55).
    expect(closeOut.notAwardedSupplierIds).toEqual(expect.arrayContaining(['sup-007', 'sup-008']));
    // The partial award before it is untouched and still in force.
    expect(
      awardStore.get(/** @type {import('../../sourcing/types').RfpAwardRecord} */ (first).id)
    ).toEqual(first);
    const views = (await reads.getRfpAwards(buyer)).items.filter((a) => a.eventId === 'rfp-002');
    expect(views.map((v) => v.status)).not.toContain('Cancelled');
  });

  it('the same empty award on a Closed RFP (nothing awarded yet) is AWARD_EMPTY', async () => {
    await fullSetOffers();
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Closed');
    const res = await award([], { notAwardedItems: [FULL_SET] });
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('AWARD_EMPTY');
    // `awardLines` is no longer a required field of the final award, so an
    // absent one reaches the policy and is refused by name there.
    const absent = await dispatch(buyer, 't_rfp_award', { awardReason: REASON });
    expect(codeOf(absent.reason)).toBe('AWARD_EMPTY');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Closed');
  });

  it('an empty award that leaves an open option unmarked is AWARD_EMPTY', async () => {
    await partlyAwarded();
    const res = await award([]);
    expect(codeOf(res.reason)).toBe('AWARD_EMPTY');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Partly awarded');
  });

  it('the close-out needs a reason, as every RFP award does (NR-2 BR-06)', async () => {
    await partlyAwarded();
    const blank = await dispatch(buyer, 't_rfp_award', {
      awardLines: [],
      awardReason: ' ',
      notAwardedItems: [PUMP_CAP]
    });
    expect(codeOf(blank.reason)).toBe('AWARD_REASON_REQUIRED');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Partly awarded');
  });

  it('"Will not award" never rides on a partial award: an empty partial award is refused', async () => {
    await partlyAwarded();
    const res = await awardPartial([], { notAwardedItems: [PUMP_CAP] });
    expect(res.status).toBe('failed');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Partly awarded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BL-131 (REQ-E03-04 BR-16c) — CR-23 is judged AT AWARD, not only when the
// round opens. A supplier that passed when it was asked for a firm offer and
// fails by the time of the award is refused, naming the supplier and the
// criterion; the same award without it goes through.
// ─────────────────────────────────────────────────────────────────────────────

describe('BL-131 — a supplier that fails the compliance gate between the round and the award is refused', () => {
  const row = mockSuppliers.find((s) => s.id === 'sup-015');
  /** @type {SupplierStatus | undefined} */
  let was;

  beforeEach(() => {
    was = row?.status;
  });
  afterEach(() => {
    if (row && was !== undefined) row.status = was;
  });

  it('sup-015 passes when the round runs, is suspended before the award, and the award naming it is refused', async () => {
    // Population control: the supplier is in the master and passes today, so
    // the refusal below is caused by the change, not by a gate it always failed.
    expect(row).toBeDefined();
    expect(rfpSupplierGate('sup-015', rfxNow()).passes).toBe(true);

    // The round opens and closes while sup-015 passes (the round policy checks CR-23 too).
    const offers = await twoOptionOffers();
    /** @type {import('@data/mockSuppliers').SupplierExtended} */ (row).status =
      SupplierStatus.SUSPENDED;
    expect(rfpSupplierGate('sup-015', rfxNow())).toEqual({ passes: false, failed: ['status'] });

    // The final award, every other rule satisfied (the pump and cap marked "Will not award").
    const refused = await award(split6040(offers), { notAwardedItems: [PUMP_CAP] });
    expect(refused.status).toBe('failed');
    expect(codeOf(refused.reason)).toBe('COMPLIANCE_GATE_FAILED');
    expect(refused.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-015 .*\(status\)/);
    // The partial award is the same policy and refuses it too.
    const partial = await awardPartial(split6040(offers));
    expect(codeOf(partial.reason)).toBe('COMPLIANCE_GATE_FAILED');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Closed');
    expect(rfpAwards()).toEqual([]);

    // KNOWN-GOOD twin: the same option, all to sup-013, which still passes.
    const alone = await award(
      [
        {
          supplierId: 'sup-013',
          optionRef: FULL_SET,
          firmOfferId: /** @type {NonNullable<(typeof offers)['sup-013']>} */ (offers['sup-013']),
          sharePct: 100,
          quantity: 50_000,
          awardTierQty: 50_000
        }
      ],
      { notAwardedItems: [PUMP_CAP] }
    );
    expect(alone.status, alone.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Awarded');
  });
});
