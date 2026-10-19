// ────────────────────────────────────────────────────────────────────────────
// RFX-D15 (owner ruling 2026-09-28, closes FU-7 / BL-128) — a firm-offer round
// may open on a PARTLY AWARDED RFP, for the options still open, and the
// remaining options are then awarded on the new round's firm prices through the
// existing final award (`t_rfp_award`), which moves the RFP to Awarded.
//
// Dispatched through the REAL MockCommandService and read back through the REAL
// MockProcurementService, with the helpers of `rfpOfferRoundCommand.test.js`
// and `rfpAwardCommand.test.js`.
//
// ⚠️ **EVERY REFUSAL IS PROBED BOTH WAYS (RFX-R8).** Each known-bad differs
// from a known-good in the one thing its rule is about, and the known-good
// goes through, so "the rule fired" cannot be read as "the verb refuses
// everything".
//
// The sample RFP is rfp-002 (Tundra): PTI's options `opt-full-set` and
// `opt-pump-cap` at 10K/50K/100K. sup-007 proposed on it in the seed; the setup
// adds a submitted response for sup-015 (passes CR-23).
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import {
  awardStore,
  resetRfxStores,
  rfpEventStore,
  rfpOfferRoundStore,
  rfpResponseStore
} from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfxNow } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { isRfpAward } from '../../sourcing/rfpAward';
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
const REASON = 'Dual source on the full set; the pump and cap go to the lowest firm offer.';

/** @typedef {Record<string, readonly { optionRef: string; qty: number; unitPrice: number }[]>} Prices */

/**
 * sup-015 answered rfp-002 too: the FIXTURE, not an act under test.
 * @returns {void}
 */
function seedResponses() {
  rfpResponseStore.add({
    id: 'rfp-resp-d15-sup-015',
    rfpId: 'rfp-002',
    supplierId: 'sup-015',
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
 * @param {string} transitionId
 * @param {Record<string, unknown>} [payload]
 */
const dispatch = (transitionId, payload = {}) =>
  svc.dispatch(buyer, { transitionId, entity: 'rfpEvent', entityId: 'rfp-002', payload });

const statusOf = () =>
  /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status;

/**
 * Open a firm-offer round on rfp-002 as it stands (the result, unchecked).
 * @param {readonly string[]} optionRefs
 * @param {readonly number[]} [quantityPoints]
 */
const openRound = (optionRefs, quantityPoints = [50_000]) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfp_round_open',
    entity: 'rfpOfferRound',
    payload: {
      rfpId: 'rfp-002',
      optionRefs,
      quantityPoints,
      invitedSupplierIds: ['sup-007', 'sup-015'],
      deadline: dayFromNow(5)
    }
  });

/**
 * Open a round on rfp-002 as it stands, let each supplier send the prices it is
 * given, then close the round. Returns each supplier's firm offer id.
 * @param {readonly string[]} optionRefs
 * @param {Prices} prices
 * @param {readonly number[]} [quantityPoints]
 * @returns {Promise<Record<string, string>>}
 */
async function runRound(optionRefs, prices, quantityPoints = [50_000]) {
  const round = await openRound(optionRefs, quantityPoints);
  expect(round.status, round.reason).toBe('done');
  /** @type {Record<string, string>} */
  const offers = {};
  for (const [supplierId, ps] of Object.entries(prices)) {
    const res = await svc.dispatch(supplier(supplierId), {
      transitionId: 't_rfpfirmoffer_submit',
      entity: 'rfpFirmOffer',
      payload: { roundId: round.entityId, supplierId, prices: ps, validUntil: dayFromNow(60) }
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

/**
 * Round 1 on both options (the RFP closed first), both suppliers pricing the full set.
 * @returns {Promise<Record<string, string>>}
 */
async function firstRound() {
  const closed = await dispatch('t_rfp_close');
  expect(closed.status, closed.reason).toBe('done');
  return runRound([FULL_SET, PUMP_CAP], {
    'sup-007': [
      { optionRef: FULL_SET, qty: 50_000, unitPrice: 4_100 },
      { optionRef: PUMP_CAP, qty: 50_000, unitPrice: 2_250 }
    ],
    'sup-015': [{ optionRef: FULL_SET, qty: 50_000, unitPrice: 4_180 }]
  });
}

/**
 * The full set 60/40 at the 50,000 point, on the two round-1 firm offers.
 * @param {Record<string, string>} offers
 * @returns {RfpAwardLine[]}
 */
const fullSet6040 = (offers) => [
  {
    supplierId: 'sup-007',
    optionRef: FULL_SET,
    firmOfferId: /** @type {NonNullable<(typeof offers)['sup-007']>} */ (offers['sup-007']),
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
 * The pump and cap 100% to one supplier at 50,000, on the named offer.
 * @param {string} supplierId
 * @param {string} firmOfferId
 * @returns {RfpAwardLine[]}
 */
const pumpTo = (supplierId, firmOfferId) => [
  {
    supplierId,
    optionRef: PUMP_CAP,
    firmOfferId,
    sharePct: 100,
    quantity: 50_000,
    awardTierQty: 50_000
  }
];

/**
 * Round 1, then the full set awarded partially: rfp-002 is Partly awarded, the pump and cap open.
 * @returns {Promise<Record<string, string>>}
 */
async function partlyAwarded() {
  const offers = await firstRound();
  const partial = await dispatch('t_rfp_award_partial', {
    awardLines: fullSet6040(offers),
    awardReason: REASON
  });
  expect(partial.status, partial.reason).toBe('done');
  expect(statusOf()).toBe('Partly awarded');
  return offers;
}

/**
 * A legacy RFQ created from rfp-002 for the named option refs (NR-2 BR-08).
 * @param {readonly string[]} sourceRfpOptionRefs
 */
const rfqFromRfp = (sourceRfpOptionRefs) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'Tundra — firm prices by RFQ',
      materialCategory: 'Packaging',
      invitedSupplierIds: ['sup-007'],
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
 * no option refs, then given the refs it was recorded with. Round 1 names
 * both options, so this is the only way an RFQ can still source one of them.
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

describe('RFX-D15 — the fixture the rule is probed against exists', () => {
  it('rfp-002 is Open with both PTI options, no round and no award', () => {
    const rfp = /** @type {import('../../sourcing/types').RfpEvent} */ (
      rfpEventStore.get('rfp-002')
    );
    expect(rfp.status).toBe('Open');
    expect(rfp.pricing?.options.map((o) => o.id)).toEqual([FULL_SET, PUMP_CAP]);
    expect(rfpOfferRoundStore.all()).toEqual([]);
    expect(awardStore.all().filter(isRfpAward)).toEqual([]);
  });
});

describe('RFX-D15 — a firm-offer round on a Partly awarded RFP', () => {
  it('(a) KNOWN-GOOD — after a partial award of the full set, a round on the open pump and cap opens and the RFP stays Partly awarded', async () => {
    await partlyAwarded();
    const res = await openRound([PUMP_CAP]);
    expect(res.status, res.reason).toBe('done');
    expect(
      rfpOfferRoundStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
    ).toMatchObject({ rfpId: 'rfp-002', roundNumber: 2, optionRefs: [PUMP_CAP] });
    expect(statusOf()).toBe('Partly awarded');
  });

  it('(b) KNOWN-BAD — a round naming the awarded full set is refused ROUND_OPTION_SETTLED, naming it, and mints nothing', async () => {
    await partlyAwarded();
    const res = await openRound([PUMP_CAP, FULL_SET]);
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('ROUND_OPTION_SETTLED');
    expect(res.reason).toContain(FULL_SET);
    expect(res.reason).not.toContain(PUMP_CAP);
    expect(rfpOfferRoundStore.all().map((r) => r.roundNumber)).toEqual([1]);
  });

  it('(c) new firm offers on the pump and cap in round 2 → the final t_rfp_award on it → Awarded', async () => {
    await partlyAwarded();
    const second = await runRound([PUMP_CAP], {
      'sup-007': [{ optionRef: PUMP_CAP, qty: 50_000, unitPrice: 2_150 }],
      'sup-015': [{ optionRef: PUMP_CAP, qty: 50_000, unitPrice: 2_120 }]
    });
    // The partial award is the wrong verb now: it would settle every option.
    const partial = await dispatch('t_rfp_award_partial', {
      awardLines: pumpTo(
        'sup-015',
        /** @type {NonNullable<(typeof second)['sup-015']>} */ (second['sup-015'])
      ),
      awardReason: REASON
    });
    expect(codeOf(partial.reason)).toBe('AWARD_NOTHING_OPEN');
    const final = await dispatch('t_rfp_award', {
      awardLines: pumpTo(
        'sup-015',
        /** @type {NonNullable<(typeof second)['sup-015']>} */ (second['sup-015'])
      ),
      awardReason: REASON
    });
    expect(final.status, final.reason).toBe('done');
    expect(statusOf()).toBe('Awarded');
    const awards = awardStore
      .all()
      .filter(isRfpAward)
      .filter((a) => a.eventId === 'rfp-002');
    expect(
      awards.map((a) => a.lines.map((l) => [l.optionRef, l.supplierId, l.firmOfferId]))
    ).toEqual(
      expect.arrayContaining([
        [[PUMP_CAP, 'sup-015', second['sup-015']]],
        [
          [FULL_SET, 'sup-007', expect.any(String)],
          [FULL_SET, 'sup-015', expect.any(String)]
        ]
      ])
    );
  });

  it('(d) the newer round’s firm price supersedes the older one for the same supplier and option', async () => {
    const first = await partlyAwarded();
    const second = await runRound([PUMP_CAP], {
      'sup-007': [{ optionRef: PUMP_CAP, qty: 50_000, unitPrice: 2_150 }]
    });
    // The award read: sup-007's price in force on the pump and cap is round 2's.
    const round2 = /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (
      (await reads.getRfpOfferRounds(buyer)).items.find((r) => r.roundNumber === 2)
    );
    const inForce = round2.firmPrices.filter(
      (p) => p.supplierId === 'sup-007' && p.optionRef === PUMP_CAP
    );
    expect(inForce.map((p) => [p.roundNumber, p.qty, p.unitPrice])).toEqual([[2, 50_000, 2_150]]);
    // The award path: the round-1 offer no longer holds the supplier's price.
    const stale = await dispatch('t_rfp_award', {
      awardLines: pumpTo(
        'sup-007',
        /** @type {NonNullable<(typeof first)['sup-007']>} */ (first['sup-007'])
      ),
      awardReason: REASON
    });
    expect(stale.status).toBe('failed');
    expect(codeOf(stale.reason)).toBe('AWARD_ITEM_NOT_QUOTED');
    const fresh = await dispatch('t_rfp_award', {
      awardLines: pumpTo(
        'sup-007',
        /** @type {NonNullable<(typeof second)['sup-007']>} */ (second['sup-007'])
      ),
      awardReason: REASON
    });
    expect(fresh.status, fresh.reason).toBe('done');
    expect(statusOf()).toBe('Awarded');
  });

  it('(e) KNOWN-BAD — an option an RFQ created from this RFP sources is refused ROUND_OPTION_SETTLED; once the RFQ is cancelled it opens', async () => {
    await partlyAwarded();
    // Owner ruling Q1: round 1 names the pump and cap, so a new RFQ for it is
    // refused; one recorded before the ruling still sources it.
    expect(codeOf((await rfqFromRfp([PUMP_CAP])).reason)).toBe('RFQ_OPTION_IN_FIRM_ROUND');
    const rfq = await legacyRfqFromRfp([PUMP_CAP]);
    const refused = await openRound([PUMP_CAP]);
    expect(refused.status).toBe('failed');
    expect(codeOf(refused.reason)).toBe('ROUND_OPTION_SETTLED');
    expect(refused.reason).toContain(PUMP_CAP);
    // A cancelled RFQ sources nothing (`rfqSourcedOptionRefs`), so the option is open again.
    rfqStore.update(/** @type {NonNullable<typeof rfq.entityId>} */ (rfq.entityId), (r) => ({
      ...r,
      status: 'Cancelled'
    }));
    const reopened = await openRound([PUMP_CAP]);
    expect(reopened.status, reopened.reason).toBe('done');
  });
});

describe('RFX-D15 — the same "open options only" rule on a Closed RFP', () => {
  it('a Closed RFP holds no award in force (the full cancel is the one that returns it there), so the cancelled award’s option is open to a round', async () => {
    await partlyAwarded();
    const [rec] = awardStore
      .all()
      .filter(isRfpAward)
      .filter((a) => a.eventId === 'rfp-002');
    const cancel = await dispatch('t_rfp_award_cancel', {
      awardId: /** @type {import('../../sourcing/types').RfpAwardRecord} */ (rec).id,
      cancelReason: 'Wrong split typed'
    });
    expect(cancel.status, cancel.reason).toBe('done');
    expect(statusOf()).toBe('Closed');
    const res = await openRound([FULL_SET]);
    expect(res.status, res.reason).toBe('done');
  });

  it('KNOWN-BAD — on a Closed RFP an option an RFQ already sources is refused too; the other option opens', async () => {
    await firstRound();
    expect(statusOf()).toBe('Closed');
    await legacyRfqFromRfp([FULL_SET]);
    const refused = await openRound([FULL_SET]);
    expect(codeOf(refused.reason)).toBe('ROUND_OPTION_SETTLED');
    const ok = await openRound([PUMP_CAP]);
    expect(ok.status, ok.reason).toBe('done');
  });
});

describe('RFX-D15 (f) — any other RFP status still refuses a round', () => {
  it('Open is refused RFP_NOT_ROUND_READY, naming the status', async () => {
    const res = await openRound([FULL_SET]);
    expect(codeOf(res.reason)).toBe('RFP_NOT_ROUND_READY');
    expect(res.reason).toContain('this one is Open');
    expect(rfpOfferRoundStore.all()).toEqual([]);
  });

  it('Awarded is refused RFP_NOT_ROUND_READY', async () => {
    const offers = await firstRound();
    const final = await dispatch('t_rfp_award', {
      awardLines: [
        ...fullSet6040(offers),
        ...pumpTo(
          'sup-007',
          /** @type {NonNullable<(typeof offers)['sup-007']>} */ (offers['sup-007'])
        )
      ],
      awardReason: REASON
    });
    expect(final.status, final.reason).toBe('done');
    expect(statusOf()).toBe('Awarded');
    const res = await openRound([PUMP_CAP]);
    expect(codeOf(res.reason)).toBe('RFP_NOT_ROUND_READY');
    expect(res.reason).toContain('this one is Awarded');
  });

  it('Cancelled is refused RFP_NOT_ROUND_READY', async () => {
    expect((await dispatch('t_rfp_close')).status).toBe('done');
    expect((await dispatch('t_rfp_cancel')).status).toBe('done');
    const res = await openRound([FULL_SET]);
    expect(codeOf(res.reason)).toBe('RFP_NOT_ROUND_READY');
    expect(res.reason).toContain('this one is Cancelled');
  });
});
