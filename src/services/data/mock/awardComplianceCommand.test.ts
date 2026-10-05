// ────────────────────────────────────────────────────────────────────────────
// Material B4 — update compliance at award (MR-2 BR-06, BR-07, AC-04, AC-05),
// dispatched through the REAL MockCommandService.
//
// The figures the requirement names (59%, 79%) cannot come out of a 13-week
// window (k of n weeks never rounds to either), so this spec pins a supplier's
// figure at the ONE seam the read model computes it through (`complianceOver`)
// and leaves every other supplier on the real rule and the sample history.
//
// Every refusal is a KNOWN-BAD beside a KNOWN-GOOD twin that differs only in
// the supplier's figure or the reason.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { everyVendorQualified } from '@test/everyVendorQualified';
import { MockCommandService } from './MockCommandService';
import { awardStore, resetRfxStores, rfpEventStore, rfpResponseStore } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { awardViews, rfpAwardViews, rfxNow } from './rfxReadModel';
import { updateCompliance } from './updateComplianceReadModel';
import { sdcClock } from '../../sdc';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { hubSettingsStore } from '../../transitions/hubSettingsStore';
import { NO_PERSON } from '@context/noPerson';
import { awardQuantity } from '../../sourcing/rfqComparison';
import { isRfpAward } from '../../sourcing/rfpAward';
import type { QueryScope } from '../types';
import type { AwardLine, RfpAwardLine } from '../../sourcing/types';

const PCT = vi.hoisted(() => new Map<string, number | null>());

vi.mock('../../transitions/updateCompliance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../transitions/updateCompliance')>();
  return {
    ...actual,
    complianceOver: (...args: Parameters<typeof actual.complianceOver>) => {
      const supplierId = args[1];
      return PCT.has(supplierId) ? { supplierId, pct: PCT.get(supplierId)!, weeks: [] } : actual.complianceOver(...args);
    },
  };
});

const svc = new MockCommandService();
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};
const supplier = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});

beforeEach(() => {
  PCT.clear();
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  hubSettingsStore.reset();
  // G2 is not the subject: every vendor qualifies, so no placeholder reason fires.
  everyVendorQualified();
});

// ── The RFQ: Oslo (rfq-021), a split that FOLLOWS the best score ─────────────

const oslo = () => rfqStore.get('rfq-021')!;
const item = (lineNo: number) => oslo().items!.find((i) => i.lineNo === lineNo)!;
const lineFor = (supplierId: string, quotationId: string, lineNo: number, sharePct: number): AwardLine => ({
  supplierId,
  quotationId,
  itemCode: '',
  itemLineNo: lineNo,
  sharePct,
  quantity: awardQuantity(oslo(), item(lineNo), 3_000, sharePct),
  awardTierQty: 3_000,
});
/** 70/30 on item 1, 100% sup-013 on item 2, at 3K: the best score on both items. */
const goodSplit = (): AwardLine[] => [
  lineFor('sup-015', 'qt-021a', 1, 70),
  lineFor('sup-013', 'qt-021b', 1, 30),
  lineFor('sup-013', 'qt-021b', 2, 100),
];
const awardRfq = (lines: readonly AwardLine[], reason?: string) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_award',
    entity: 'rfq',
    entityId: 'rfq-021',
    payload: {
      awardedQuotationId: lines[0]!.quotationId,
      awardedSupplierId: lines[0]!.supplierId,
      awardLines: lines.map((l) => ({ ...l })),
      ...(reason ? { awardReason: reason } : {}),
    },
  });
const osloAward = () => awardStore.all().find((a) => a.eventId === 'rfq-021');

describe('population control — the seam and the sample history', () => {
  it('a pinned figure is read back; an unpinned supplier keeps the real rule (sup-007 92% on the sample)', () => {
    PCT.set('sup-013', 59);
    expect(updateCompliance('sup-013').pct).toBe(59);
    expect(updateCompliance('sup-007').pct).toBe(92);
    expect(updateCompliance('sup-015').pct).toBeNull();
  });

  it('the split follows the best score, so no reason is owed for that', async () => {
    const res = await awardRfq(goodSplit());
    expect(res.status, res.reason).toBe('done');
  });
});

describe('MR-2 AC-04 / BR-06 — a share to a red-flagged supplier needs a reason, refused by the VERB', () => {
  it('KNOWN-BAD — sup-013 at 59% gets a share and no reason is given', async () => {
    PCT.set('sup-013', 59);
    const res = await awardRfq(goodSplit());
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_REASON_COMPLIANCE_FLAG: sup-013 is below the update-compliance flag and gets a share of item 1/);
    expect(osloAward()).toBeUndefined();
    expect(oslo().status).toBe('Open');
  });

  it('KNOWN-GOOD (AC-05) — the same award with a reason passes and keeps the compliance each supplier had', async () => {
    PCT.set('sup-013', 59);
    const res = await awardRfq(goodSplit(), 'Only halal-certified printer for the back sticker.');
    expect(res.status, res.reason).toBe('done');
    expect(osloAward()!.complianceAtAward).toEqual([
      { supplierId: 'sup-015', pct: null },
      { supplierId: 'sup-013', pct: 59 },
    ]);
  });

  it('KNOWN-GOOD — a supplier at 79% (amber) needs no reason', async () => {
    PCT.set('sup-013', 79);
    const res = await awardRfq(goodSplit());
    expect(res.status, res.reason).toBe('done');
    expect(osloAward()!.complianceAtAward).toContainEqual({ supplierId: 'sup-013', pct: 79 });
  });

  it('KNOWN-GOOD — "No history" is never flagged and needs no reason', async () => {
    PCT.set('sup-013', null);
    const res = await awardRfq(goodSplit());
    expect(res.status, res.reason).toBe('done');
    expect(osloAward()!.complianceAtAward).toContainEqual({ supplierId: 'sup-013', pct: null });
  });

  it('MR-2 BR-07 — the flag never blocks: both suppliers flagged, with a reason, are awarded', async () => {
    PCT.set('sup-013', 10);
    PCT.set('sup-015', 20);
    const res = await awardRfq(goodSplit(), 'Both printers are behind on updates; award stands on price.');
    expect(res.status, res.reason).toBe('done');
    expect(osloAward()!.complianceAtAward).toEqual([
      { supplierId: 'sup-015', pct: 20 },
      { supplierId: 'sup-013', pct: 10 },
    ]);
  });

  it('the flag is the hub setting: at compliance.flagPct 50, the same 59% is amber and needs no reason', async () => {
    PCT.set('sup-013', 59);
    // Fixture, not the act under test: the setting's own verb is covered in hubSettings.bl32.
    hubSettingsStore.append({ key: 'compliance.flagPct', value: 50, setBy: NO_PERSON, setAt: rfxNow() });
    const res = await awardRfq(goodSplit());
    expect(res.status, res.reason).toBe('done');
  });
});

describe('MAT-R4 — a supplier reads only its own compliance at award', () => {
  it('the buyer reads every row; sup-013 reads only its own', async () => {
    PCT.set('sup-013', 59);
    expect((await awardRfq(goodSplit(), 'Reason.')).status).toBe('done');
    const id = osloAward()!.id;
    expect(awardViews(null).find((a) => a.id === id)!.complianceAtAward).toHaveLength(2);
    expect(awardViews('sup-013').find((a) => a.id === id)!.complianceAtAward).toEqual([
      { supplierId: 'sup-013', pct: 59 },
    ]);
  });
});

// ── The RFP: rfp-002, a closed firm-offer round, sup-007 and sup-015 ─────────

const DAY_MS = 86_400_000;
const dayFromNow = (offset: number) => new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);
const FULL_SET = 'opt-full-set';

async function rfpWithOffers(): Promise<Record<string, string>> {
  rfpResponseStore.add({
    id: 'rfp-resp-b4-sup-015',
    rfpId: 'rfp-002',
    supplierId: 'sup-015',
    status: 'Submitted',
    updatedAt: rfxNow(),
    submittedAt: rfxNow(),
    answers: [],
  });
  const closed = await svc.dispatch(buyer, { transitionId: 't_rfp_close', entity: 'rfpEvent', entityId: 'rfp-002' });
  expect(closed.status, closed.reason).toBe('done');
  const round = await svc.dispatch(buyer, {
    transitionId: 't_rfp_round_open',
    entity: 'rfpOfferRound',
    payload: {
      rfpId: 'rfp-002',
      optionRefs: [FULL_SET],
      quantityPoints: [10_000, 50_000],
      invitedSupplierIds: ['sup-007', 'sup-015'],
      deadline: dayFromNow(5),
    },
  });
  expect(round.status, round.reason).toBe('done');
  const offers: Record<string, string> = {};
  for (const [supplierId, unitPrice] of [['sup-007', 4_100], ['sup-015', 4_180]] as const) {
    const res = await svc.dispatch(supplier(supplierId), {
      transitionId: 't_rfpfirmoffer_submit',
      entity: 'rfpFirmOffer',
      payload: {
        roundId: round.entityId,
        supplierId,
        prices: [
          { optionRef: FULL_SET, qty: 10_000, unitPrice: unitPrice + 400 },
          { optionRef: FULL_SET, qty: 50_000, unitPrice },
        ],
        validUntil: dayFromNow(60),
      },
    });
    expect(res.status, res.reason).toBe('done');
    offers[supplierId] = res.entityId!;
  }
  const close = await svc.dispatch(buyer, { transitionId: 't_rfp_round_close', entity: 'rfpOfferRound', entityId: round.entityId! });
  expect(close.status, close.reason).toBe('done');
  return offers;
}

const rfpSplit = (offers: Record<string, string>): RfpAwardLine[] => [
  { supplierId: 'sup-007', optionRef: FULL_SET, firmOfferId: offers['sup-007']!, sharePct: 60, quantity: 30_000, awardTierQty: 50_000 },
  { supplierId: 'sup-015', optionRef: FULL_SET, firmOfferId: offers['sup-015']!, sharePct: 40, quantity: 20_000, awardTierQty: 50_000 },
];
const awardRfp = (awardLines: readonly RfpAwardLine[], awardReason?: string) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfp_award',
    entity: 'rfpEvent',
    entityId: 'rfp-002',
    payload: { awardLines, ...(awardReason ? { awardReason } : {}) },
  });

describe('MR-2 BR-06 on an RFP — the snapshot; the reason rule is the RFP\'s own', () => {
  it('an RFP award stores the compliance each awarded supplier had (sup-007 92% on the sample, sup-015 No history)', async () => {
    const offers = await rfpWithOffers();
    const res = await awardRfp(rfpSplit(offers), 'Dual source on the full set.');
    expect(res.status, res.reason).toBe('done');
    const rec = awardStore.all().filter(isRfpAward).find((a) => a.eventId === 'rfp-002')!;
    expect(rec.complianceAtAward).toEqual([
      { supplierId: 'sup-007', pct: 92 },
      { supplierId: 'sup-015', pct: null },
    ]);
    expect(rfpAwardViews('sup-015').find((a) => a.id === rec.id)!.complianceAtAward).toEqual([
      { supplierId: 'sup-015', pct: null },
    ]);
    expect(rfpEventStore.get('rfp-002')!.status).toBe('Awarded');
  });

  it('a red-flagged supplier without a reason reads AWARD_REASON_REQUIRED, as every blank RFP reason always has', async () => {
    PCT.set('sup-015', 40);
    const offers = await rfpWithOffers();
    const res = await awardRfp(rfpSplit(offers));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_REASON_REQUIRED: every RFP award needs a reason/);
    expect(res.reason).not.toMatch(/COMPLIANCE_FLAG/);
  });
});
