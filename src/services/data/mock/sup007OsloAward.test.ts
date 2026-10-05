// ────────────────────────────────────────────────────────────────────────────
// BL-94 — the main supplier persona can win part of the Oslo award.
//
// sup-007 ("PT Sample Packaging Indonesia") used to fail the compliance gate on
// rfq-021 on OTIF alone (50%: one met, one late). BL-94 gave it a real delivery
// history — four past call-offs received on their date and in full — so its
// calculated 90-day OTIF clears the 80% minimum. This file pins that outcome BY
// NAME at the declared present, and keeps the bilateral control: sup-008 (OTIF
// 0%) still fails, and a share for it is still refused.
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
import type { QueryScope } from '../types';
import type { AwardLine } from '../../sourcing/types';

const svc = new MockCommandService();
const buyer: QueryScope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON,
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const oslo = () => rfqStore.get('rfq-021')!;
const item = (lineNo: number) => oslo().items!.find((i) => i.lineNo === lineNo)!;
const gateOf = (supplierId: string) => rfqGateViews(oslo(), rfxNow()).find((g) => g.supplierId === supplierId);

/** A tiered Oslo quote from `supplierId`, priced as sup-015's (qt-021a). */
const addQuote = (id: string, supplierId: string) =>
  quotationStore.add({ ...quotationStore.get('qt-021a')!, id, supplierId, status: 'Submitted' });

const line = (supplierId: string, quotationId: string, lineNo: number, sharePct: number): AwardLine => ({
  supplierId,
  quotationId,
  itemCode: '',
  itemLineNo: lineNo,
  sharePct,
  quantity: awardQuantity(oslo(), item(lineNo), 3_000, sharePct),
  awardTierQty: 3_000,
});

const award = (lines: readonly AwardLine[]) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_award',
    entity: 'rfq',
    entityId: 'rfq-021',
    payload: {
      awardedQuotationId: lines[0]!.quotationId,
      awardedSupplierId: lines[0]!.supplierId,
      awardLines: lines.map((l) => ({ ...l })),
      awardReason: 'Third source for the Oslo stickers.',
    },
  });

describe('BL-94 — sup-007 passes the compliance gate on Oslo at the declared present', () => {
  it('population control: the clock is the declared present, and sup-007 is invited to Oslo', () => {
    expect(rfxNow().slice(0, 10)).toBe(DECLARED_PRESENT);
    expect(oslo().invitedSupplierIds).toContain('sup-007');
  });

  it('sup-007’s calculated OTIF is 5 met of 6 = 83%, at or above the gate minimum', () => {
    const m = masterMeasure('sup-007');
    expect(m.otif).toEqual({ pct: 83, measured: 6, met: 5, pending: 0 });
    expect(m.otif.pct!).toBeGreaterThanOrEqual(gateMinOtifPct());
  });

  it('sup-007 passes every criterion on rfq-021; sup-008 still fails on OTIF', () => {
    // Material G2 — the view also carries the vendor's eligibility beside the
    // gate (never inside it); sup-007 is Preferred, so it is qualified too.
    const { eligibility, ...gate } = gateOf('sup-007')!;
    expect(gate).toEqual({ supplierId: 'sup-007', passes: true, failed: [] });
    expect(eligibility?.state).toBe('qualified');
    // BILATERAL CONTROL — the same read still refuses a supplier below the minimum.
    expect(masterMeasure('sup-008').otif.pct).toBe(0);
    expect(gateOf('sup-008')?.passes).toBe(false);
    expect(gateOf('sup-008')?.failed).toEqual(['otif']);
  });
});

describe('BL-94 — a split award giving sup-007 a share of an Oslo item is accepted', () => {
  it('KNOWN-GOOD — 50/50 on item 1 between sup-015 and sup-007 is recorded, and sup-007’s quote is Awarded', async () => {
    addQuote('qt-021s7', 'sup-007');
    const res = await award([
      line('sup-015', 'qt-021a', 1, 50),
      line('sup-007', 'qt-021s7', 1, 50),
      line('sup-013', 'qt-021b', 2, 100),
    ]);
    expect(res.status, res.reason).toBe('done');
    const rec = awardStore.all().find((a) => a.eventId === 'rfq-021')!;
    expect(rec.lines.filter((l) => l.supplierId === 'sup-007').map((l) => [l.itemLineNo, l.sharePct, l.quantity])).toEqual([
      [1, 50, 12_000],
    ]);
    expect(rec.notAwardedSupplierIds).not.toContain('sup-007');
    expect(quotationStore.get('qt-021s7')!.status).toBe('Awarded');
  });

  it('the award is stamped on the hub clock (the declared present), never the machine clock', async () => {
    addQuote('qt-021s7', 'sup-007');
    const res = await award([
      line('sup-015', 'qt-021a', 1, 50),
      line('sup-007', 'qt-021s7', 1, 50),
      line('sup-013', 'qt-021b', 2, 100),
    ]);
    expect(res.status, res.reason).toBe('done');
    const rec = awardStore.all().find((a) => a.eventId === 'rfq-021')!;
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
      line('sup-013', 'qt-021b', 2, 100),
    ]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-008/);
    expect(awardStore.all().some((a) => a.eventId === 'rfq-021')).toBe(false);
    expect(oslo().status).toBe('Open');
  });
});
