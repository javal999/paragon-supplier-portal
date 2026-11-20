// ────────────────────────────────────────────────────────────────────────────
// BL-94 gave sup-007 ("PT Sample Packaging Indonesia") a real delivery history,
// and its calculated 90-day OTIF reached 86% — above the then-80% minimum.
//
// ⚠️ OWNER RULING 2026-11-20 (BL-55) RAISED THE MINIMUM TO 90%. sup-007 at 86%
// no longer passes the compliance gate on rfq-021, so it cannot take a share of
// the Oslo award. This file pins that outcome BY NAME at the declared present,
// and keeps the bilateral controls: sup-013 and sup-015 still pass and still
// split the award, sup-008 (OTIF 0%) is still refused.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { awardStore, resetRfxStores } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { rfqGateViews, rfxNow } from './rfxReadModel';
import { masterMeasure } from './supplierMeasureReadModel';
import { gateMinOtifPct } from '../../sourcing/complianceGateConfig';
import { awardQuantity } from '../../sourcing/rfqComparison';
import { DECLARED_PRESENT } from '../fixturePresent';
import { sdcClock } from '../../sdc';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope } from '../types' */
/** @import { AwardLine } from '../../sourcing/types' */

const svc = new MockCommandService();
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const oslo = () => /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get('rfq-021'));
/** @param {number} lineNo */
const item = (lineNo) =>
  /** @type {import('../../sourcing/rfqModel').RfqItem} */ (
    /** @type {NonNullable<(ReturnType<typeof oslo>)['items']>} */ (oslo().items).find(
      (i) => i.lineNo === lineNo
    )
  );
/** @param {string} supplierId */
const gateOf = (supplierId) =>
  rfqGateViews(oslo(), rfxNow()).find((g) => g.supplierId === supplierId);

/**
 * A tiered Oslo quote from `supplierId`, priced as sup-015's (qt-021a).
 * @param {string} id
 * @param {string} supplierId
 */
const addQuote = (id, supplierId) =>
  quotationStore.add({
    .../** @type {import('@data/mockQuotations').Quotation} */ (quotationStore.get('qt-021a')),
    id,
    supplierId,
    status: 'Submitted'
  });

/**
 * @param {string} supplierId
 * @param {string} quotationId
 * @param {number} lineNo
 * @param {number} sharePct
 * @returns {AwardLine}
 */
const line = (supplierId, quotationId, lineNo, sharePct) => ({
  supplierId,
  quotationId,
  itemCode: '',
  itemLineNo: lineNo,
  sharePct,
  quantity: awardQuantity(oslo(), item(lineNo), 3_000, sharePct),
  awardTierQty: 3_000
});

/** @param {readonly AwardLine[]} lines */
const award = (lines) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_award',
    entity: 'rfq',
    entityId: 'rfq-021',
    payload: {
      awardedQuotationId: /** @type {AwardLine} */ (lines[0]).quotationId,
      awardedSupplierId: /** @type {AwardLine} */ (lines[0]).supplierId,
      awardLines: lines.map((l) => ({ ...l })),
      awardReason: 'Third source for the Oslo stickers.'
    }
  });

describe('BL-55 2026-11-20 — sup-007 now fails the compliance gate on Oslo', () => {
  it('population control: the clock is the declared present, and sup-007 is invited to Oslo', () => {
    expect(rfxNow().slice(0, 10)).toBe(DECLARED_PRESENT);
    expect(oslo().invitedSupplierIds).toContain('sup-007');
  });

  it('sup-007’s calculated OTIF is 6 met of 7 = 86%, below the 90% minimum', () => {
    const m = masterMeasure('sup-007');
    // The walkthrough's open call-off is due 7 Sep, after the 90-day window.
    expect(m.otif).toEqual({ pct: 86, measured: 7, met: 6, pending: 0 });
    expect(gateMinOtifPct()).toBe(90);
    expect(/** @type {NonNullable<typeof m.otif.pct>} */ (m.otif.pct)).toBeLessThan(
      gateMinOtifPct()
    );
  });

  it('sup-007 fails on OTIF alone; sup-013 and sup-015 still pass, and sup-008 still fails', () => {
    // Material G2 — the view also carries the vendor's eligibility beside the
    // gate (never inside it); sup-007 is still Preferred, so it stays qualified
    // — eligibility and the gate are different answers.
    const { eligibility, ...gate } =
      /** @type {import('../../sourcing/views').RfqSupplierGateView} */ (gateOf('sup-007'));
    expect(gate).toEqual({ supplierId: 'sup-007', passes: false, failed: ['otif'] });
    expect(eligibility?.state).toBe('qualified');
    // BILATERAL CONTROLS — the same read passes two suppliers and refuses one.
    expect(gateOf('sup-013')?.passes).toBe(true);
    expect(gateOf('sup-015')?.passes).toBe(true);
    expect(masterMeasure('sup-008').otif.pct).toBe(0);
    expect(gateOf('sup-008')?.failed).toEqual(['otif']);
  });
});

describe('BL-55 2026-11-20 — a share for a failing supplier is refused; a split of passing ones is accepted', () => {
  it('KNOWN-BAD — a split giving sup-007 a share of item 1 is refused by name, and nothing is awarded', async () => {
    addQuote('qt-021s7', 'sup-007');
    const res = await award([
      line('sup-015', 'qt-021a', 1, 50),
      line('sup-007', 'qt-021s7', 1, 50),
      line('sup-013', 'qt-021b', 2, 100)
    ]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-007 .*\(otif\)/);
    expect(awardStore.all().some((a) => a.eventId === 'rfq-021')).toBe(false);
    expect(oslo().status).toBe('Open');
  });

  it('KNOWN-GOOD — the split between the two passing suppliers is recorded, on the hub clock', async () => {
    const res = await award([
      line('sup-015', 'qt-021a', 1, 100),
      line('sup-013', 'qt-021b', 2, 100)
    ]);
    expect(res.status, res.reason).toBe('done');
    const rec = /** @type {import('../../sourcing/types').AwardRecord} */ (
      awardStore.all().find((a) => a.eventId === 'rfq-021')
    );
    expect([...new Set(rec.lines.map((l) => l.supplierId))].sort()).toEqual(['sup-013', 'sup-015']);
    // The same clock the handler scored the quotes at, so the record and its
    // best-scored ids describe one moment.
    expect(rec.awardedAt).toBe(rfxNow());
    expect(rec.awardedAt.slice(0, 10)).toBe(DECLARED_PRESENT);
  });

  it('KNOWN-BAD twin — the SAME split with sup-008 in sup-007’s place is refused by name, and nothing is awarded', async () => {
    addQuote('qt-021s8', 'sup-008');
    const res = await award([
      line('sup-015', 'qt-021a', 1, 50),
      line('sup-008', 'qt-021s8', 1, 50),
      line('sup-013', 'qt-021b', 2, 100)
    ]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-008/);
    expect(awardStore.all().some((a) => a.eventId === 'rfq-021')).toBe(false);
    expect(oslo().status).toBe('Open');
  });
});
