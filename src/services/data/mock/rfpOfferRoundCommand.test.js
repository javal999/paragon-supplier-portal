// ────────────────────────────────────────────────────────────────────────────
// NR-2 (D-1, option A) — the firm-offer round on an RFP and the supplier's firm
// offer, dispatched through the REAL MockCommandService and read back through
// the REAL MockProcurementService.
//
// ⚠️ **EVERY REFUSAL IS PROBED BOTH WAYS (RFX-R8).** Each code below is fired by
// a KNOWN-BAD that differs from the shared KNOWN-GOOD in the one field its rule
// is about, and the known-good goes through — so "the rule fired" cannot be
// mistaken for "the verb refuses everything".
//
// The sample RFP is rfp-002 (Tundra): PTI's options `opt-full-set` and
// `opt-pump-cap` at 10K/50K/100K, and sup-007's submitted proposal with its own
// option `sup-opt-1`. It is Open in the seed, so the setup closes it by verb.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { MockProcurementService } from './MockProcurementService';
import {
  resetRfxStores,
  rfpEventStore,
  rfpFirmOfferStore,
  rfpOfferRoundStore,
  rfpResponseStore
} from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { DataError } from '../types';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfpSupplierGate, rfxNow } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import {
  firmOfferRefusal,
  firmPricesInForce,
  parseRfpOptionRef,
  rfpOfferRoundRefusal,
  rfpOptionRef
} from '../../sourcing/rfpFirmOffer';

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
const sup015 = supplier('sup-015');

/**
 * The refusal code a policy reason carries (`POLICY_REJECTED:<hook>:<CODE>: …`).
 * @param {string | undefined} reason
 */
const codeOf = (reason) => (reason ?? '').replace(/^POLICY_REJECTED:[a-z_]+:/, '').split(':')[0];

const DAY_MS = 86_400_000;
/** @param {number} offset */
const dayFromNow = (offset) =>
  new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);

/**
 * sup-015 (passes CR-23) and sup-008 (fails it on OTIF) also proposed on
 * rfp-002, so a round can invite a passing second supplier and a failing one.
 * Added to the stores directly: this is the FIXTURE the rule is probed against,
 * not an act under test (the RFP response verbs are covered in rfxCommand.test).
 * @returns {void}
 */
function seedSecondResponses() {
  rfpEventStore.update('rfp-002', (e) => ({
    ...e,
    invitees: [...e.invitees, { supplierId: 'sup-008' }]
  }));
  for (const supplierId of ['sup-015', 'sup-008']) {
    rfpResponseStore.add({
      id: `rfp-resp-probe-${supplierId}`,
      rfpId: 'rfp-002',
      supplierId,
      status: 'Submitted',
      updatedAt: rfxNow(),
      submittedAt: rfxNow(),
      answers: []
    });
  }
}

beforeEach(async () => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const closeRfp002 = async () => {
  const res = await svc.dispatch(buyer, {
    transitionId: 't_rfp_close',
    entity: 'rfpEvent',
    entityId: 'rfp-002'
  });
  expect(res.status, res.reason).toBe('done');
};

/** The known-good round: two options (one supplier-proposed) at 50K, sup-007 asked. */
const goodRound = () => ({
  rfpId: 'rfp-002',
  optionRefs: ['opt-full-set', 'sup-007:sup-opt-1'],
  quantityPoints: [50_000],
  invitedSupplierIds: ['sup-007'],
  deadline: dayFromNow(5),
  message: 'Firm prices for the full set and your stock bottle, please.'
});

/** @param {Record<string, unknown>} payload */
const openRound = (payload) =>
  svc.dispatch(buyer, { transitionId: 't_rfp_round_open', entity: 'rfpOfferRound', payload });

/**
 * Close rfp-002, open the known-good round, return its id.
 * @param {Record<string, unknown>} [overrides]
 * @returns {Promise<string>}
 */
async function openGoodRound(overrides = {}) {
  await closeRfp002();
  const res = await openRound({ ...goodRound(), ...overrides });
  expect(res.status, res.reason).toBe('done');
  return /** @type {NonNullable<typeof res.entityId>} */ (res.entityId);
}

/**
 * The known-good offer from sup-007 on the known-good round.
 * @param {string} roundId
 */
const goodOffer = (roundId) => ({
  roundId,
  supplierId: 'sup-007',
  prices: [
    { optionRef: 'opt-full-set', qty: 50_000, unitPrice: 4_150 },
    { optionRef: 'sup-007:sup-opt-1', qty: 50_000, unitPrice: 3_550 }
  ],
  validUntil: dayFromNow(60)
});

/**
 * @param {QueryScope} scope
 * @param {Record<string, unknown>} payload
 */
const submit = (scope, payload) =>
  svc.dispatch(scope, { transitionId: 't_rfpfirmoffer_submit', entity: 'rfpFirmOffer', payload });

// ─────────────────────────────────────────────────────────────────────────────
// POPULATION CONTROL — nothing below means anything without this.
// ─────────────────────────────────────────────────────────────────────────────

describe('NR-2 — the fixture the round is probed against exists', () => {
  it('rfp-002 is Open with PTI options, sup-007 proposed sup-opt-1, and both stores start empty', () => {
    const rfp = /** @type {import('../../sourcing/types').RfpEvent} */ (
      rfpEventStore.get('rfp-002')
    );
    expect(rfp.status).toBe('Open');
    expect(rfp.pricing?.options.map((o) => o.id)).toEqual(['opt-full-set', 'opt-pump-cap']);
    const proposal = /** @type {import('../../sourcing/types').RfpResponse} */ (
      rfpResponseStore.get('rfp-resp-004')
    );
    expect(proposal.status).toBe('Submitted');
    expect(proposal.pricing?.proposedOptions.map((o) => o.id)).toEqual(['sup-opt-1']);
    expect(rfpOfferRoundStore.all()).toEqual([]);
    expect(rfpFirmOfferStore.all()).toEqual([]);
    // CR-23 on an RFP judges status and OTIF: sup-007 passes, sup-008 fails on OTIF.
    expect(rfpSupplierGate('sup-007', rfxNow()).passes).toBe(true);
    expect(rfpSupplierGate('sup-008', rfxNow()).failed).toEqual(['otif']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NR-2 BR-02 / AC-01 — who and what a round may name.
// ─────────────────────────────────────────────────────────────────────────────

describe('NR-2 BR-02 — t_rfp_round_open', () => {
  it('KNOWN-BAD — opening a round on an Open RFP is refused RFP_NOT_ROUND_READY, and mints nothing', async () => {
    const res = await openRound(goodRound());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/:RFP_NOT_ROUND_READY/);
    expect(rfpOfferRoundStore.all()).toEqual([]);
  });

  it('KNOWN-GOOD — the same round on the RFP once Closed opens, and the RFP stays Closed', async () => {
    const id = await openGoodRound();
    const round = /** @type {import('../../sourcing/types').RfpOfferRound} */ (
      rfpOfferRoundStore.get(id)
    );
    expect(round).toMatchObject({
      rfpId: 'rfp-002',
      roundNumber: 1,
      optionRefs: ['opt-full-set', 'sup-007:sup-opt-1'],
      quantityPoints: [50_000],
      invitedSupplierIds: ['sup-007'],
      message: 'Firm prices for the full set and your stock bottle, please.'
    });
    expect(round.closedAt).toBeUndefined();
    expect(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002')).status
    ).toBe('Closed');
  });

  it('KNOWN-BAD — a round inviting a supplier that failed CR-23 is refused, naming it', async () => {
    seedSecondResponses();
    await closeRfp002();
    const res = await openRound({ ...goodRound(), invitedSupplierIds: ['sup-007', 'sup-008'] });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/:COMPLIANCE_GATE_FAILED: sup-008 .*otif/);
    expect(rfpOfferRoundStore.all()).toEqual([]);
  });

  it('KNOWN-GOOD — the same round with a passing second supplier opens', async () => {
    seedSecondResponses();
    await closeRfp002();
    const res = await openRound({ ...goodRound(), invitedSupplierIds: ['sup-007', 'sup-015'] });
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpOfferRound} */ (
        rfpOfferRoundStore.get(/** @type {NonNullable<typeof res.entityId>} */ (res.entityId))
      ).invitedSupplierIds
    ).toEqual(['sup-007', 'sup-015']);
  });

  // Each row changes ONE field of the known-good round; the known-good above opens.
  it.each(
    /** @type {const} */ ([
      ['ROUND_NOT_RESPONDED', { invitedSupplierIds: ['sup-007', 'sup-015'] }],
      ['ROUND_OPTION_UNKNOWN', { optionRefs: ['opt-full-set', 'opt-nobody-asked'] }],
      ['ROUND_QTY_INVALID', { quantityPoints: [50_000, 0] }],
      ['BAD_DEADLINE', { deadline: 'next week' }],
      ['RFP_NOT_FOUND', { rfpId: 'rfp-999' }]
    ])
  )('KNOWN-BAD — %s is refused by name', async (code, change) => {
    await closeRfp002();
    const res = await openRound({ ...goodRound(), ...change });
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe(code);
    expect(rfpOfferRoundStore.all()).toEqual([]);
  });

  it('a supplier seat cannot open a round: the round names no supplier owner', async () => {
    await closeRfp002();
    const attempt = svc.dispatch(sup007, {
      transitionId: 't_rfp_round_open',
      entity: 'rfpOfferRound',
      payload: goodRound()
    });
    await expect(attempt).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
    expect(rfpOfferRoundStore.all()).toEqual([]);
  });

  it('BR-04 — rounds repeat and number themselves; closing one keeps it', async () => {
    const first = await openGoodRound();
    const closed = await svc.dispatch(buyer, {
      transitionId: 't_rfp_round_close',
      entity: 'rfpOfferRound',
      entityId: first
    });
    expect(closed.status, closed.reason).toBe('done');
    const second = await openRound(goodRound());
    expect(second.status, second.reason).toBe('done');
    expect(
      /** @type {import('../../sourcing/types').RfpOfferRound} */ (rfpOfferRoundStore.get(first))
        .closedAt
    ).toBeDefined();
    expect(
      /** @type {import('../../sourcing/types').RfpOfferRound} */ (
        rfpOfferRoundStore.get(/** @type {NonNullable<typeof second.entityId>} */ (second.entityId))
      ).roundNumber
    ).toBe(2);
    expect(rfpOfferRoundStore.all()).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NR-2 BR-01 / BR-03 / BR-04 — the firm offer.
// ─────────────────────────────────────────────────────────────────────────────

describe('NR-2 BR-03 / BR-04 — t_rfpfirmoffer_submit and t_rfpfirmoffer_revise', () => {
  it('an invited supplier submits and revises a firm offer, and both versions are kept', async () => {
    const roundId = await openGoodRound();
    const sent = await submit(sup007, goodOffer(roundId));
    expect(sent.status, sent.reason).toBe('done');
    const offerId = /** @type {NonNullable<typeof sent.entityId>} */ (sent.entityId);

    sdcClock.set(new Date(Date.parse(rfxNow()) + DAY_MS).toISOString());
    const revised = await svc.dispatch(sup007, {
      transitionId: 't_rfpfirmoffer_revise',
      entity: 'rfpFirmOffer',
      entityId: offerId,
      payload: {
        prices: [
          { optionRef: 'opt-full-set', qty: 50_000, unitPrice: 4_050 },
          { optionRef: 'sup-007:sup-opt-1', qty: 50_000, unitPrice: 3_500 }
        ],
        validUntil: dayFromNow(90)
      }
    });
    expect(revised.status, revised.reason).toBe('done');

    const offer = /** @type {import('../../sourcing/types').RfpFirmOffer} */ (
      rfpFirmOfferStore.get(offerId)
    );
    expect(rfpFirmOfferStore.all()).toHaveLength(1);
    expect(offer.versions.map((v) => v.version)).toEqual([1, 2]);
    expect(
      /** @type {import('../../sourcing/types').RfpFirmPrice} */ (
        /** @type {import('../../sourcing/types').RfpFirmOfferVersion} */ (
          offer.versions[0]
        ).prices.find((p) => p.optionRef === 'opt-full-set')
      ).unitPrice
    ).toBe(4_150);
    expect(
      /** @type {import('../../sourcing/types').RfpFirmPrice} */ (
        /** @type {import('../../sourcing/types').RfpFirmOfferVersion} */ (
          offer.versions[1]
        ).prices.find((p) => p.optionRef === 'opt-full-set')
      ).unitPrice
    ).toBe(4_050);
    // The fields in force are the last version's.
    expect(offer.prices).toEqual(
      /** @type {import('../../sourcing/types').RfpFirmOfferVersion} */ (offer.versions[1]).prices
    );
    expect(offer.validUntil).toBe(
      /** @type {import('../../sourcing/types').RfpFirmOfferVersion} */ (offer.versions[1])
        .validUntil
    );
    expect(offer.submittedAt).toBe(
      /** @type {import('../../sourcing/types').RfpFirmOfferVersion} */ (offer.versions[1])
        .submittedAt
    );
    expect(
      /** @type {import('../../sourcing/types').RfpFirmOfferVersion} */ (offer.versions[0])
        .submittedAt <
        /** @type {import('../../sourcing/types').RfpFirmOfferVersion} */ (offer.versions[1])
          .submittedAt
    ).toBe(true);
  });

  it('sending again in the same round appends a version to the one offer, never a second row', async () => {
    const roundId = await openGoodRound();
    const first = await submit(sup007, goodOffer(roundId));
    const again = await submit(sup007, { ...goodOffer(roundId), validUntil: dayFromNow(70) });
    expect(again.status, again.reason).toBe('done');
    expect(again.entityId).toBe(first.entityId);
    expect(
      /** @type {import('../../sourcing/types').RfpFirmOffer} */ (
        rfpFirmOfferStore.get(/** @type {NonNullable<typeof first.entityId>} */ (first.entityId))
      ).versions
    ).toHaveLength(2);
  });

  it('KNOWN-BAD — an offer after the round deadline is refused ROUND_CLOSED', async () => {
    const roundId = await openGoodRound({ deadline: dayFromNow(2) });
    sdcClock.set(new Date(Date.parse(rfxNow()) + 3 * DAY_MS).toISOString());
    const res = await submit(sup007, goodOffer(roundId));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/:ROUND_CLOSED/);
    expect(rfpFirmOfferStore.all()).toEqual([]);
  });

  it('KNOWN-BAD — an offer in a round the buyer closed is refused ROUND_CLOSED', async () => {
    const roundId = await openGoodRound();
    await svc.dispatch(buyer, {
      transitionId: 't_rfp_round_close',
      entity: 'rfpOfferRound',
      entityId: roundId
    });
    const res = await submit(sup007, goodOffer(roundId));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/:ROUND_CLOSED/);
  });

  it('KNOWN-BAD — a revise after the deadline is refused ROUND_CLOSED, and the offer keeps one version', async () => {
    const roundId = await openGoodRound({ deadline: dayFromNow(2) });
    const sent = await submit(sup007, goodOffer(roundId));
    sdcClock.set(new Date(Date.parse(rfxNow()) + 3 * DAY_MS).toISOString());
    const res = await svc.dispatch(sup007, {
      transitionId: 't_rfpfirmoffer_revise',
      entity: 'rfpFirmOffer',
      entityId: /** @type {NonNullable<typeof sent.entityId>} */ (sent.entityId),
      payload: { prices: goodOffer(roundId).prices, validUntil: dayFromNow(60) }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/:ROUND_CLOSED/);
    expect(
      /** @type {import('../../sourcing/types').RfpFirmOffer} */ (
        rfpFirmOfferStore.get(/** @type {NonNullable<typeof sent.entityId>} */ (sent.entityId))
      ).versions
    ).toHaveLength(1);
  });

  it('KNOWN-BAD — an offer for an option outside the round is refused OFFER_OUTSIDE_ROUND', async () => {
    const roundId = await openGoodRound();
    // `opt-pump-cap` is on the RFP but not asked in THIS round.
    const res = await submit(sup007, {
      ...goodOffer(roundId),
      prices: [
        ...goodOffer(roundId).prices,
        { optionRef: 'opt-pump-cap', qty: 50_000, unitPrice: 2_250 }
      ]
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/:OFFER_OUTSIDE_ROUND: opt-pump-cap/);
    expect(rfpFirmOfferStore.all()).toEqual([]);
  });

  it('KNOWN-BAD — a missing validity is refused OFFER_VALIDITY_MISSING', async () => {
    const roundId = await openGoodRound();
    const { validUntil: _dropped, ...noValidity } = goodOffer(roundId);
    const res = await submit(sup007, noValidity);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/:OFFER_VALIDITY_MISSING/);
    expect(rfpFirmOfferStore.all()).toEqual([]);
  });

  it('KNOWN-BAD — a validity ending before the round deadline is refused OFFER_VALIDITY_MISSING (edge case 2)', async () => {
    const roundId = await openGoodRound({ deadline: dayFromNow(5) });
    const res = await submit(sup007, { ...goodOffer(roundId), validUntil: dayFromNow(4) });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/:OFFER_VALIDITY_MISSING/);
    // KNOWN-GOOD at the boundary: valid until the deadline day itself.
    const onDeadline = await submit(sup007, { ...goodOffer(roundId), validUntil: dayFromNow(5) });
    expect(onDeadline.status, onDeadline.reason).toBe('done');
  });

  // Each row changes ONE field of the known-good offer; the known-good submits (above).
  it.each(
    /** @type {const} */ ([
      [
        'OFFER_PRICE_INVALID',
        { prices: [{ optionRef: 'opt-full-set', qty: 50_000, unitPrice: 0 }] }
      ],
      [
        'OFFER_PRICE_DUPLICATE',
        {
          prices: [
            { optionRef: 'opt-full-set', qty: 50_000, unitPrice: 4_150 },
            { optionRef: 'opt-full-set', qty: 50_000, unitPrice: 4_100 }
          ]
        }
      ],
      [
        'OFFER_OUTSIDE_ROUND',
        { prices: [{ optionRef: 'opt-full-set', qty: 10_000, unitPrice: 4_850 }] }
      ],
      ['ATTACHMENT_MALFORMED', { documents: [{ name: 'offer.pdf' }] }]
    ])
  )('KNOWN-BAD — %s is refused by name', async (code, change) => {
    const roundId = await openGoodRound();
    const res = await submit(sup007, { ...goodOffer(roundId), ...change });
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe(code);
    expect(rfpFirmOfferStore.all()).toEqual([]);
  });

  it('KNOWN-BAD — a supplier not asked in the round is refused ROUND_NOT_INVITED, and so is an unknown round', async () => {
    seedSecondResponses();
    const roundId = await openGoodRound();
    const notAsked = await submit(sup015, { ...goodOffer(roundId), supplierId: 'sup-015' });
    expect(notAsked.status).toBe('failed');
    expect(notAsked.reason).toMatch(/:ROUND_NOT_INVITED/);
    // The same refusal for a round that does not exist: no existence oracle.
    const unknown = await submit(sup015, { ...goodOffer('fr-9999'), supplierId: 'sup-015' });
    expect(unknown.reason).toBe(notAsked.reason);
  });

  it('a supplier cannot send an offer in another supplier’s name (scope)', async () => {
    const roundId = await openGoodRound();
    await expect(submit(sup015, goodOffer(roundId))).rejects.toMatchObject({
      code: 'SCOPE_DENIED'
    });
  });

  it('supplier B cannot revise supplier A’s offer (scope)', async () => {
    const roundId = await openGoodRound();
    const sent = await submit(sup007, goodOffer(roundId));
    const attempt = svc.dispatch(sup015, {
      transitionId: 't_rfpfirmoffer_revise',
      entity: 'rfpFirmOffer',
      entityId: /** @type {NonNullable<typeof sent.entityId>} */ (sent.entityId),
      payload: { prices: goodOffer(roundId).prices, validUntil: dayFromNow(60) }
    });
    await expect(attempt).rejects.toBeInstanceOf(DataError);
    expect(
      /** @type {import('../../sourcing/types').RfpFirmOffer} */ (
        rfpFirmOfferStore.get(/** @type {NonNullable<typeof sent.entityId>} */ (sent.entityId))
      ).versions
    ).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RFX-R4 / AC-01 — the read: every round for the buyer, own rounds and offers
// for a supplier.
// ─────────────────────────────────────────────────────────────────────────────

describe('NR-2 — getRfpOfferRounds narrows the supplier read', () => {
  /** @returns {Promise<string>} */
  async function twoOffers() {
    seedSecondResponses();
    const roundId = await openGoodRound({ invitedSupplierIds: ['sup-007', 'sup-015'] });
    expect((await submit(sup007, goodOffer(roundId))).status).toBe('done');
    const b = await submit(sup015, {
      ...goodOffer(roundId),
      supplierId: 'sup-015',
      prices: [{ optionRef: 'opt-full-set', qty: 50_000, unitPrice: 3_990 }]
    });
    expect(b.status, b.reason).toBe('done');
    return roundId;
  }

  it('the buyer reads the round, both invitees and both offers', async () => {
    const roundId = await twoOffers();
    const [round] = (await reads.getRfpOfferRounds(buyer)).items.filter((r) => r.id === roundId);
    expect(
      /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (round).invitedSupplierIds
    ).toEqual(['sup-007', 'sup-015']);
    expect(
      /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (round).offers
        .map((o) => o.supplierId)
        .sort()
    ).toEqual(['sup-007', 'sup-015']);
    expect(/** @type {import('../../sourcing/views').RfpOfferRoundView} */ (round).awaiting).toBe(
      0
    );
    expect(/** @type {import('../../sourcing/views').RfpOfferRoundView} */ (round).rfpNumber).toBe(
      /** @type {import('../../sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002'))
        .eventNumber
    );
    // Edge case 3 — the supplier-proposed option enters in the supplier's words.
    expect(
      /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (round).options.find(
        (o) => o.ref === 'sup-007:sup-opt-1'
      )
    ).toMatchObject({
      title: 'Stock 150 ml bottle with 24/410 lotion pump',
      supplierProposed: true
    });
  });

  it('AC-01 — supplier A cannot read supplier B’s offer, and sees only itself as invitee', async () => {
    const roundId = await twoOffers();
    const [asA] = (await reads.getRfpOfferRounds(sup007)).items.filter((r) => r.id === roundId);
    expect(
      /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (asA).offers.map(
        (o) => o.supplierId
      )
    ).toEqual(['sup-007']);
    expect(
      /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (asA).invitedSupplierIds
    ).toEqual(['sup-007']);
    expect(
      /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (asA).firmPrices.map(
        (p) => p.supplierId
      )
    ).not.toContain('sup-015');
    expect(JSON.stringify(asA)).not.toContain('3990');
    const [asB] = (await reads.getRfpOfferRounds(sup015)).items.filter((r) => r.id === roundId);
    expect(
      /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (asB).offers.map(
        (o) => o.supplierId
      )
    ).toEqual(['sup-015']);
  });

  it('a supplier not asked reads no round at all', async () => {
    await openGoodRound();
    expect((await reads.getRfpOfferRounds(sup015)).items).toEqual([]);
    expect((await reads.getRfpOfferRounds(buyer)).items).toHaveLength(1);
  });

  it('BR-04 — the last firm offer per supplier and option counts, across rounds', async () => {
    const first = await openGoodRound();
    await submit(sup007, goodOffer(first));
    await svc.dispatch(buyer, {
      transitionId: 't_rfp_round_close',
      entity: 'rfpOfferRound',
      entityId: first
    });
    // Round 2 asks for opt-full-set only; sup-opt-1's price from round 1 stays in force.
    const second = await openRound({ ...goodRound(), optionRefs: ['opt-full-set'] });
    await submit(sup007, {
      roundId: /** @type {NonNullable<typeof second.entityId>} */ (second.entityId),
      supplierId: 'sup-007',
      prices: [{ optionRef: 'opt-full-set', qty: 50_000, unitPrice: 3_980 }],
      validUntil: dayFromNow(60)
    });
    const [view] = (await reads.getRfpOfferRounds(buyer)).items.filter(
      (r) => r.id === second.entityId
    );
    const inForce = /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (
      view
    ).firmPrices
      .map((p) => `${p.optionRef}@${p.qty}=${p.unitPrice}#${p.roundNumber}`)
      .sort();
    expect(inForce).toEqual(['opt-full-set@50000=3980#2', 'sup-007:sup-opt-1@50000=3550#1']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Option refs — a supplier's `sup-opt-N` is unique only within its own
// response, so a round and a firm price name it `<proposer>:sup-opt-N`.
// ─────────────────────────────────────────────────────────────────────────────

describe('NR-2 — two suppliers proposing the same sup-opt id stay two options', () => {
  /**
   * sup-015 also proposes a `sup-opt-1` on rfp-002, in its own words.
   * @returns {void}
   */
  function sup015ProposesSupOpt1() {
    rfpResponseStore.add({
      id: 'rfp-resp-probe-sup-015-opt',
      rfpId: 'rfp-002',
      supplierId: 'sup-015',
      status: 'Submitted',
      updatedAt: rfxNow(),
      submittedAt: rfxNow(),
      answers: [],
      pricing: {
        prices: [{ optionId: 'sup-opt-1', qty: 50_000, unitPrice: 3_700 }],
        proposedOptions: [{ id: 'sup-opt-1', title: 'Airless pump in recycled PP' }]
      }
    });
  }
  const bothRefs = ['sup-007:sup-opt-1', 'sup-015:sup-opt-1'];

  it('the buyer opens a round with both; each is a distinct ref with its own proposer’s title', async () => {
    sup015ProposesSupOpt1();
    const roundId = await openGoodRound({
      optionRefs: bothRefs,
      invitedSupplierIds: ['sup-007', 'sup-015']
    });
    expect(
      /** @type {import('../../sourcing/types').RfpOfferRound} */ (rfpOfferRoundStore.get(roundId))
        .optionRefs
    ).toEqual(bothRefs);
    const [round] = (await reads.getRfpOfferRounds(buyer)).items.filter((r) => r.id === roundId);
    expect(
      /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (round).options.map((o) => [
        o.ref,
        o.id,
        o.proposerSupplierId,
        o.title
      ])
    ).toEqual([
      ['sup-007:sup-opt-1', 'sup-opt-1', 'sup-007', 'Stock 150 ml bottle with 24/410 lotion pump'],
      ['sup-015:sup-opt-1', 'sup-opt-1', 'sup-015', 'Airless pump in recycled PP']
    ]);
  });

  it('firm prices on each ref stay distinct, and a supplier may price the other’s option in the round', async () => {
    sup015ProposesSupOpt1();
    const roundId = await openGoodRound({
      optionRefs: bothRefs,
      invitedSupplierIds: ['sup-007', 'sup-015']
    });
    const a = await submit(sup007, {
      roundId,
      supplierId: 'sup-007',
      prices: [
        { optionRef: 'sup-007:sup-opt-1', qty: 50_000, unitPrice: 3_550 },
        { optionRef: 'sup-015:sup-opt-1', qty: 50_000, unitPrice: 3_800 }
      ],
      validUntil: dayFromNow(60)
    });
    expect(a.status, a.reason).toBe('done');
    const b = await submit(sup015, {
      roundId,
      supplierId: 'sup-015',
      prices: [{ optionRef: 'sup-015:sup-opt-1', qty: 50_000, unitPrice: 3_650 }],
      validUntil: dayFromNow(60)
    });
    expect(b.status, b.reason).toBe('done');
    const [round] = (await reads.getRfpOfferRounds(buyer)).items.filter((r) => r.id === roundId);
    const inForce = /** @type {import('../../sourcing/views').RfpOfferRoundView} */ (
      round
    ).firmPrices
      .map((p) => `${p.supplierId}|${p.optionRef}=${p.unitPrice}`)
      .sort();
    expect(inForce).toEqual([
      'sup-007|sup-007:sup-opt-1=3550',
      'sup-007|sup-015:sup-opt-1=3800',
      'sup-015|sup-015:sup-opt-1=3650'
    ]);
  });

  it('KNOWN-BAD — a bare sup-opt-1 in a round payload is refused ROUND_OPTION_UNKNOWN', async () => {
    sup015ProposesSupOpt1();
    await closeRfp002();
    const res = await openRound({ ...goodRound(), optionRefs: ['sup-opt-1'] });
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('ROUND_OPTION_UNKNOWN');
    expect(rfpOfferRoundStore.all()).toEqual([]);
  });

  it('KNOWN-BAD — a bare sup-opt-1 in a firm price is refused OFFER_OUTSIDE_ROUND', async () => {
    const roundId = await openGoodRound();
    const res = await submit(sup007, {
      ...goodOffer(roundId),
      prices: [{ optionRef: 'sup-opt-1', qty: 50_000, unitPrice: 3_550 }]
    });
    expect(codeOf(res.reason)).toBe('OFFER_OUTSIDE_ROUND');
  });

  it('rfpOptionRef / parseRfpOptionRef — a buyer id is its own ref; a proposed one names its proposer', () => {
    expect(rfpOptionRef('opt-full-set')).toBe('opt-full-set');
    expect(rfpOptionRef('sup-opt-1', 'sup-015')).toBe('sup-015:sup-opt-1');
    expect(parseRfpOptionRef('sup-015:sup-opt-1')).toEqual({
      optionId: 'sup-opt-1',
      proposerSupplierId: 'sup-015'
    });
    expect(parseRfpOptionRef('opt-full-set')).toEqual({ optionId: 'opt-full-set' });
    // A colon alone does not make a proposed option; only `<supplier>:sup-opt-…` does.
    expect(parseRfpOptionRef('opt:a')).toEqual({ optionId: 'opt:a' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RFX-R2 — the rules are pure, so a page's pre-check reads the same answer.
// ─────────────────────────────────────────────────────────────────────────────

describe('NR-2 — the pure rules', () => {
  const facts = {
    rfpStatus: 'Closed',
    knownOptionRefs: ['a', 'b'],
    settledOptionRefs: ['b'],
    respondedSupplierIds: ['s1'],
    gate: () => ({ passes: true, failed: [] })
  };
  const req = {
    optionRefs: ['a'],
    quantityPoints: [10],
    invitedSupplierIds: ['s1'],
    deadline: '2026-10-01'
  };

  it('rfpOfferRoundRefusal — known-good is null, and one changed fact refuses', () => {
    expect(rfpOfferRoundRefusal(req, facts)).toBeNull();
    expect(rfpOfferRoundRefusal(req, { ...facts, rfpStatus: 'Open' })).toMatch(
      /^RFP_NOT_ROUND_READY/
    );
  });

  // RFX-D15 — Partly awarded is round-ready too; any other status is not, and
  // a settled option is refused by name on either round-ready status.
  it('rfpOfferRoundRefusal — Partly awarded passes, other statuses refuse, and a settled option refuses (RFX-D15)', () => {
    expect(rfpOfferRoundRefusal(req, { ...facts, rfpStatus: 'Partly awarded' })).toBeNull();
    for (const status of ['Draft', 'Open', 'Awarded', 'Cancelled']) {
      expect(rfpOfferRoundRefusal(req, { ...facts, rfpStatus: status })).toBe(
        `RFP_NOT_ROUND_READY: a firm-offer round opens on a Closed or Partly awarded RFP; this one is ${status}`
      );
    }
    for (const status of ['Closed', 'Partly awarded']) {
      expect(
        rfpOfferRoundRefusal({ ...req, optionRefs: ['a', 'b'] }, { ...facts, rfpStatus: status })
      ).toBe('ROUND_OPTION_SETTLED: b');
    }
  });

  // An empty list never reaches the policy through the dispatcher (it is a
  // MISSING_FIELDS refusal there), so these codes serve a page's pre-check and
  // are probed on the rule itself.
  it('rfpOfferRoundRefusal — an empty option list or shortlist is refused by name', () => {
    expect(rfpOfferRoundRefusal({ ...req, optionRefs: [] }, facts)).toMatch(/^ROUND_NO_OPTIONS/);
    expect(rfpOfferRoundRefusal({ ...req, invitedSupplierIds: [] }, facts)).toMatch(
      /^ROUND_NO_INVITEES/
    );
  });

  it('firmOfferRefusal — known-good is null, and one changed field refuses', () => {
    const round = {
      optionRefs: ['a'],
      quantityPoints: [10],
      invitedSupplierIds: ['s1'],
      deadline: '2026-10-01',
      closed: false
    };
    const offer = { prices: [{ optionRef: 'a', qty: 10, unitPrice: 5 }], validUntil: '2026-10-01' };
    const now = '2026-09-20T00:00:00.000Z';
    expect(firmOfferRefusal(round, 's1', offer, now)).toBeNull();
    expect(firmOfferRefusal(round, 's1', { ...offer, validUntil: undefined }, now)).toMatch(
      /^OFFER_VALIDITY_MISSING/
    );
    expect(firmOfferRefusal(round, 's1', { ...offer, prices: [] }, now)).toMatch(/^OFFER_EMPTY/);
  });

  it('firmPricesInForce — a later round replaces an option’s prices, whatever the points', () => {
    const base = { rfpId: 'r', supplierId: 's1', versions: [], validUntil: '2026-12-01' };
    const inForce = firmPricesInForce([
      {
        ...base,
        id: 'o1',
        roundId: 'fr1',
        roundNumber: 1,
        submittedAt: '2026-09-01',
        prices: [
          { optionRef: 'a', qty: 10, unitPrice: 5 },
          { optionRef: 'a', qty: 20, unitPrice: 4 }
        ]
      },
      {
        ...base,
        id: 'o2',
        roundId: 'fr2',
        roundNumber: 2,
        submittedAt: '2026-09-05',
        prices: [{ optionRef: 'a', qty: 20, unitPrice: 3 }]
      }
    ]);
    expect(inForce.map((p) => `${p.qty}=${p.unitPrice}`)).toEqual(['20=3']);
  });
});
