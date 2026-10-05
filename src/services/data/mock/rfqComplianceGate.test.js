// ────────────────────────────────────────────────────────────────────────────
// CR-23 over the real fixtures (BL-43) — the read model, the ranking and the
// service read, against the seeded demo: on rfq-003 sup-010's halal certificate
// has expired; on rfq-014 sup-008 is under the OTIF minimum (sup-007 cleared it
// when BL-94 gave it a delivery history).
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import {
  bestScoredQuotationId,
  currentQuotesFor,
  matchingInvitees,
  rfqGateViews,
  rfqScoring,
  rfxNow
} from './rfxReadModel';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { MockProcurementService } from './MockProcurementService';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope } from '../types' */

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
});

/** @param {string} rfqId */
const gatesOf = (rfqId) =>
  Object.fromEntries(
    rfqGateViews(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get(rfqId)),
      rfxNow()
    ).map((g) => [g.supplierId, g.failed])
  );

describe('CR-23 — the seeded demo', () => {
  it('rfq-003 (Open): sup-010 fails on halal alone (expired 2026-08-20); sup-001 and sup-002 pass', () => {
    expect(gatesOf('rfq-003')).toEqual({ 'sup-001': [], 'sup-002': [], 'sup-010': ['halal'] });
  });

  it('rfq-014 (Closed): sup-008 (OTIF 0%) fails on OTIF; sup-007 (OTIF 83%, BL-94) and sup-013 ("No history") pass', () => {
    expect(gatesOf('rfq-014')).toEqual({
      'sup-007': [],
      'sup-008': ['otif'],
      'sup-013': [],
      'sup-015': []
    });
  });
});

describe('CR-15 / BR-01a — a failing supplier is not ranked', () => {
  it('rfq-003 scores only the qualified quotes, and the best is never the failing one', () => {
    const outcome = rfqScoring(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-003')),
      rfxNow()
    );
    expect(outcome.kind).toBe('scored');
    const scored = outcome.kind === 'scored' ? outcome.scores.map((s) => s.quoteId).sort() : [];
    expect(scored).toEqual(['qt-003a', 'qt-003b']);
    // CONTROL — the failing supplier DID quote; it is visible, just not scored.
    expect(currentQuotesFor('rfq-003').map((q) => q.supplierId)).toContain('sup-010');
    expect(
      bestScoredQuotationId(
        /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-003')),
        rfxNow()
      )
    ).not.toBe('qt-003c');
  });

  it('an RFQ whose every bidder fails ranks nothing — no best score to follow', () => {
    // ⚠️ PREMISE CHANGE (BL-94): this read rfq-005, whose two bidders (sup-007
    // and sup-008) were both under the OTIF minimum. sup-007 passes at 83% now,
    // so the every-bidder-fails case is rfq-020, the gate demo built for it
    // (sup-011, sup-004 and sup-009 each fail on certificates).
    expect(currentQuotesFor('rfq-020').length).toBeGreaterThan(0); // they DID quote
    const outcome = rfqScoring(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-020')),
      rfxNow()
    );
    expect(outcome.kind === 'scored' ? outcome.scores : null).toEqual([]);
    expect(
      bestScoredQuotationId(
        /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-020')),
        rfxNow()
      )
    ).toBeNull();
  });

  it('KNOWN-GOOD twin — rfq-005 now ranks sup-007 alone; sup-008 stays unranked', () => {
    const rfq = /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-005'));
    const outcome = rfqScoring(rfq, rfxNow());
    const byQuote = new Map(currentQuotesFor('rfq-005').map((q) => [q.id, q.supplierId]));
    const ranked =
      outcome.kind === 'scored' ? outcome.scores.map((sc) => byQuote.get(sc.quoteId)) : null;
    expect(ranked).toEqual(['sup-007']);
    expect(
      byQuote.get(
        /** @type {NonNullable<ReturnType<typeof bestScoredQuotationId>>} */ (
          bestScoredQuotationId(rfq, rfxNow())
        )
      )
    ).toBe('sup-007');
  });
});

describe('CR-23 — the reads', () => {
  it('BR-06 — an invitee candidate carries its gate against the materials asked for', () => {
    const halalMaterial = matchingInvitees({ materialCodes: ['RM-EMUL-3310'] });
    // sup-001 is Active with a current halal certificate and ISO 22716.
    expect(halalMaterial.find((c) => c.supplierId === 'sup-001')?.gate).toEqual({
      passes: true,
      failed: []
    });
    // sup-008 is still a CANDIDATE — only its gate says it cannot be awarded.
    expect(halalMaterial.find((c) => c.supplierId === 'sup-008')?.gate?.failed).toEqual([
      'halal',
      'gmp',
      'otif'
    ]);
  });

  it('the gate read is PTI’s — a supplier reads nothing', async () => {
    const svc = new MockProcurementService();
    /** @type {QueryScope} */
    const buyer = {
      personaType: 'buyer',
      supplierId: null,
      businessRoles: PERSONA_SYSTEM_ROLES.buyer,
      actor: NO_PERSON
    };
    /** @type {QueryScope} */
    const supplier = {
      personaType: 'supplier',
      supplierId: 'sup-007',
      businessRoles: PERSONA_SYSTEM_ROLES.supplier,
      actor: NO_PERSON
    };
    expect((await svc.getRfqComplianceGate(buyer, 'rfq-014')).items).toHaveLength(4);
    expect((await svc.getRfqComplianceGate(supplier, 'rfq-014')).items).toEqual([]);
    expect((await svc.getRfqComplianceGate(buyer, 'rfq-nope')).items).toEqual([]);
  });
});
