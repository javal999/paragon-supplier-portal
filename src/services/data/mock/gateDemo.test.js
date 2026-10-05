// ────────────────────────────────────────────────────────────────────────────
// BL-64 — THE COMPLIANCE GATE DEMO, PINNED BY NAME.
//
// Every scenario the gate can produce (CR-23, `sourcing/complianceGate.js`) is
// carried by a NAMED supplier on a NAMED sample RFQ (`fixtures/gateDemo.js`),
// and each is asserted here through the SAME read the pages use
// (`rfqGateViews`), as the exact list of failed criteria — never a count.
//
// Where a scenario turns on ONE fact (a date, a registry row, a delivery), a
// control removes or moves that fact and shows the answer flip, so the pin is
// on the mechanism and not on a coincidence of the fixture.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { mockSuppliers } from '@data/mockSuppliers';
import { DECLARED_PRESENT } from '../fixturePresent';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { sdcClock } from '../../sdc';
/** @import { GateCriterion } from '../../sourcing/complianceGate' */
import { complianceGate, gateRequirementFor } from '../../sourcing/complianceGate';
import { gateMinOtifPct } from '../../sourcing/complianceGateConfig';
import { COMPLIANCE_REGISTRY } from './fixtures/complianceRegistry';
import { MockCommandService } from './MockCommandService';
import { masterMeasure } from './supplierMeasureReadModel';
import {
  bestScoredQuotationId,
  currentQuotesFor,
  rfqGateViews,
  rfqMaterialCodes,
  rfqScoring,
  rfxNow,
  rfxSupplierOtif
} from './rfxReadModel';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { awardStore, resetRfxStores } from './stores/rfxStores';

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

const DAY_MS = 86_400_000;
/** @param {number} offset */
const day = (offset) =>
  new Date(Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`) + offset * DAY_MS)
    .toISOString()
    .slice(0, 10);

/**
 * supplierId → failed criteria, for every invitee and bidder of one RFQ, as the pages read it.
 * @param {string} rfqId
 */
const gatesOf = (rfqId, nowIso = rfxNow()) =>
  Object.fromEntries(
    rfqGateViews(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get(rfqId)),
      nowIso
    ).map((g) => [g.supplierId, [...g.failed]])
  );

/** @param {string} id */
const supplier = (id) =>
  /** @type {import('../../../data/mockSuppliers').SupplierExtended} */ (
    mockSuppliers.find((s) => s.id === id)
  );

// ── Population control ──────────────────────────────────────────────────────

describe('BL-64 — the demo exists where a buyer will look for it', () => {
  it('the five sample RFQs are on the sourcing board, labelled as samples, in the states the demo needs', () => {
    const rows = ['rfq-016', 'rfq-017', 'rfq-018', 'rfq-019', 'rfq-020'].map((id) =>
      rfqStore.get(id)
    );
    expect(rows.map((r) => r?.status)).toEqual(['Closed', 'Closed', 'Open', 'Closed', 'Closed']);
    expect(
      rows.every(
        (r) =>
          /** @type {import('../../../data/mockRfqs').RFQ} */ (r).title.startsWith(
            'Compliance gate demo'
          ) && /** @type {import('../../../data/mockRfqs').RFQ} */ (r).title.endsWith('(sample)')
      )
    ).toBe(true);
    // KNOWN-BAD twin — an id the demo does not hold. PREMISE CHANGED (RFx spec
    // 2026-09-21): rfq-021 is now the Oslo sample RFQ, so the absent id moved.
    expect(rfqStore.get('rfq-099')).toBeUndefined();
  });

  it('the seven demo suppliers are in the master and marked illustrative', () => {
    const ids = ['sup-016', 'sup-017', 'sup-018', 'sup-019', 'sup-020', 'sup-021', 'sup-022'];
    expect(ids.map((id) => supplier(id)?.name.endsWith('(illustrative)'))).toEqual(
      ids.map(() => true)
    );
  });

  it('the demo date is the declared present the whole sample set is dated from', () => {
    expect(rfxNow().slice(0, 10)).toBe(DECLARED_PRESENT);
  });
});

// ── Each RFQ, whole ─────────────────────────────────────────────────────────

describe('BL-64 — each sample RFQ, every invitee and bidder by name', () => {
  it('rfq-016 (Closed, glycerin): halal dates, halal missing and GMP missing beside two passes', () => {
    expect(gatesOf('rfq-016')).toEqual({
      'sup-001': [],
      'sup-017': [],
      'sup-018': ['halal'],
      'sup-009': ['halal'],
      'sup-013': ['gmp']
    });
  });

  it('rfq-017 (Closed, niacinamide): BPOM alone, a registry pass, and three criteria at once', () => {
    expect(gatesOf('rfq-017')).toEqual({
      'sup-005': [],
      'sup-006': [],
      'sup-016': ['bpom'],
      'sup-011': ['halal', 'bpom', 'gmp']
    });
  });

  it('rfq-018 (Open, lauric acid): an expired registry row fails a supplier whose master is valid', () => {
    expect(gatesOf('rfq-018')).toEqual({ 'sup-001': [], 'sup-002': ['halal'], 'sup-017': [] });
  });

  it('rfq-019 (Closed, packaging): OTIF boundary, status alone, and a supplier with no certificate', () => {
    expect(gatesOf('rfq-019')).toEqual({
      'sup-019': [],
      'sup-020': ['otif'],
      'sup-021': ['status'],
      'sup-022': ['status'],
      'sup-011': []
    });
  });

  it('rfq-020 (Closed, salicylic acid): every bidder fails', () => {
    expect(gatesOf('rfq-020')).toEqual({
      'sup-011': ['halal', 'bpom', 'gmp'],
      'sup-004': ['halal', 'bpom'],
      'sup-009': ['halal']
    });
  });
});

// ── Each scenario, one row each ─────────────────────────────────────────────

/** @type {readonly (readonly [scenario: string, rfqId: string, supplierId: string, failed: GateCriterion[]])[]} */
const SCENARIOS = [
  ['halal EXPIRED alone (the day before the present)', 'rfq-016', 'sup-018', ['halal']],
  ['halal MISSING alone (master holds none)', 'rfq-016', 'sup-009', ['halal']],
  ['BPOM missing alone where BPOM applies', 'rfq-017', 'sup-016', ['bpom']],
  ['GMP / ISO 22716 missing alone on a raw material', 'rfq-016', 'sup-013', ['gmp']],
  ['SUSPENDED alone', 'rfq-019', 'sup-021', ['status']],
  ['BLACKLISTED alone', 'rfq-019', 'sup-022', ['status']],
  ['OTIF below the minimum alone (79%)', 'rfq-019', 'sup-020', ['otif']],
  ['several criteria at once (halal + BPOM + GMP)', 'rfq-020', 'sup-011', ['halal', 'bpom', 'gmp']],
  ['several criteria at once (halal + BPOM)', 'rfq-020', 'sup-004', ['halal', 'bpom']],
  ['OTIF EXACTLY at the minimum (80%) passes', 'rfq-019', 'sup-019', []],
  ['"No history" passes', 'rfq-019', 'sup-011', []],
  ['registry VALID overrides a master holding no halal cert — passes', 'rfq-017', 'sup-005', []],
  ['registry EXPIRED overrides a master saying valid — fails', 'rfq-018', 'sup-002', ['halal']],
  ['halal expiring ON the present is still valid — passes', 'rfq-016', 'sup-017', []],
  ['a material needing no certificate: no certs at all, passes', 'rfq-019', 'sup-011', []]
];

describe('BL-64 — every gate scenario, by named supplier on a named RFQ', () => {
  it.each(SCENARIOS)('%s — %s / %s', (_scenario, rfqId, supplierId, failed) => {
    const view = rfqGateViews(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get(rfqId)),
      rfxNow()
    ).find((g) => g.supplierId === supplierId);
    expect(view, `${supplierId} is not an invitee or bidder of ${rfqId}`).toBeDefined();
    expect(/** @type {import('../../sourcing/views').RfqSupplierGateView} */ (view).failed).toEqual(
      failed
    );
    expect(/** @type {import('../../sourcing/views').RfqSupplierGateView} */ (view).passes).toBe(
      failed.length === 0
    );
  });
});

// ── The mechanisms behind the boundary scenarios ────────────────────────────

describe('BL-64 — the OTIF boundary is a real delivery history, not a typed number', () => {
  it('sup-019 measures 4 met of 5 = 80%, and the minimum is 80', () => {
    const m = masterMeasure('sup-019').otif;
    expect({ met: m.met, measured: m.measured, pct: m.pct }).toEqual({
      met: 4,
      measured: 5,
      pct: 80
    });
    expect(gateMinOtifPct()).toBe(80);
  });

  it('sup-020 measures 11 met of 14 = 78.6%, shown 79% — one point under', () => {
    const m = masterMeasure('sup-020').otif;
    expect({ met: m.met, measured: m.measured, pct: m.pct }).toEqual({
      met: 11,
      measured: 14,
      pct: 79
    });
  });

  it('the gate reads the SAME figure the invitee list and comparison show', () => {
    expect(rfxSupplierOtif('sup-019')).toBe(80);
    expect(rfxSupplierOtif('sup-020')).toBe(79);
    expect(rfxSupplierOtif('sup-011')).toBeNull(); // "No history"
  });
});

describe('BL-64 — the halal expiry boundary moves with the clock', () => {
  it('sup-017 expires ON the present and sup-018 the day before — offsets, not literals', () => {
    expect(supplier('sup-017').certExpiryDate).toBe(day(0));
    expect(supplier('sup-018').certExpiryDate).toBe(day(-1));
  });

  it('CONTROL — one day later sup-017 fails halal too; the pass was the date, not the supplier', () => {
    const tomorrow = new Date(Date.parse(rfxNow()) + DAY_MS).toISOString();
    expect(gatesOf('rfq-016', tomorrow)['sup-017']).toEqual(['halal']);
  });
});

describe('BL-64 — the compliance registry overrides the supplier master, both ways', () => {
  /** @param {string} rfqId */
  const materials = (rfqId) =>
    rfqMaterialCodes(/** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get(rfqId)));

  it('sup-002: master says certified and in date; registry creg-0017 for RM-LAURIC-7200 expired — fails halal', () => {
    const s = supplier('sup-002');
    expect(s.halalCertified).toBe(true);
    expect(s.certExpiryDate >= DECLARED_PRESENT).toBe(true);
    const row = /** @type {import('../types').ComplianceRegistryEntry} */ (
      COMPLIANCE_REGISTRY.find((c) => c.id === 'creg-0017')
    );
    expect(row).toMatchObject({
      supplierId: 'sup-002',
      materialCodes: ['RM-LAURIC-7200'],
      expiryDate: '2026-07-31'
    });
    // CONTROL — the same gate WITHOUT the registry row: the master alone passes.
    const withoutRow = COMPLIANCE_REGISTRY.filter((c) => c.id !== 'creg-0017');
    expect(
      complianceGate(s, rfxSupplierOtif('sup-002'), materials('rfq-018'), rfxNow(), withoutRow)
        .failed
    ).toEqual([]);
    expect(
      complianceGate(
        s,
        rfxSupplierOtif('sup-002'),
        materials('rfq-018'),
        rfxNow(),
        COMPLIANCE_REGISTRY
      ).failed
    ).toEqual(['halal']);
  });

  it('sup-005: master holds no halal cert; registry creg-0015 for AI-NIAC-6601 is valid — passes', () => {
    const s = supplier('sup-005');
    expect(s.halalCertified).toBe(false);
    expect(
      /** @type {import('../types').ComplianceRegistryEntry} */ (
        COMPLIANCE_REGISTRY.find((c) => c.id === 'creg-0015')
      ).materialCodes
    ).toContain('AI-NIAC-6601');
    // CONTROL — without the registry, the master decides and fails halal.
    expect(
      complianceGate(s, rfxSupplierOtif('sup-005'), materials('rfq-017'), rfxNow(), []).failed
    ).toEqual(['halal']);
    expect(
      complianceGate(
        s,
        rfxSupplierOtif('sup-005'),
        materials('rfq-017'),
        rfxNow(),
        COMPLIANCE_REGISTRY
      ).failed
    ).toEqual([]);
  });
});

describe('BL-64 — a material that asks for no certificate', () => {
  it('rfq-019 sources packaging whose master rows require neither halal, BPOM nor GMP', () => {
    expect(
      gateRequirementFor(
        rfqMaterialCodes(
          /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-019'))
        )
      )
    ).toEqual({ halal: false, bpom: false, gmp: false });
    // KNOWN-GOOD twin — the raw-material RFQ asks for halal and GMP.
    expect(
      gateRequirementFor(
        rfqMaterialCodes(
          /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-016'))
        )
      )
    ).toEqual({ halal: true, bpom: false, gmp: true });
  });

  it('sup-011 holds no certificate at all and still passes there', () => {
    const s = supplier('sup-011');
    expect([s.halalCertified, s.bpomRegistered, s.gmpIso22716 === true]).toEqual([
      false,
      false,
      false
    ]);
    expect(gatesOf('rfq-019')['sup-011']).toEqual([]);
  });
});

// ── Award: impossible on rfq-020, a split among passers on rfq-016 ──────────

describe('BL-64 — what can and cannot be awarded', () => {
  it('rfq-020: nothing is scored and there is no best score to follow — the award is impossible', () => {
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
    // The bids are still there — visible, just not scorable.
    expect(currentQuotesFor('rfq-020').map((q) => q.supplierId)).toEqual([
      'sup-011',
      'sup-004',
      'sup-009'
    ]);
  });

  it('rfq-016: only the two passing suppliers are scored', () => {
    const outcome = rfqScoring(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-016')),
      rfxNow()
    );
    const scored = outcome.kind === 'scored' ? outcome.scores.map((s) => s.quoteId).sort() : [];
    expect(scored).toEqual(['qt-016a', 'qt-016b']);
  });

  /** @param {readonly [string, string, number][]} lines */
  const award016 = (lines) =>
    svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-016',
      payload: {
        awardedQuotationId: lines[0][1],
        awardedSupplierId: lines[0][0],
        awardLines: lines.map(([supplierId, quotationId, sharePct]) => ({
          supplierId,
          quotationId,
          itemCode: '',
          sharePct,
          quantity: Math.round((60_000 * sharePct) / 100)
        })),
        awardReason: 'Dual source for supply security.'
      }
    });

  it('rfq-016: a 60/40 split between sup-001 and sup-017 (halal expiring today) is recorded', async () => {
    const res = await award016([
      ['sup-001', 'qt-016a', 60],
      ['sup-017', 'qt-016b', 40]
    ]);
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-016')).status
    ).toBe('Awarded');
    const award = /** @type {import('../../sourcing/types').AwardRecord} */ (
      awardStore.all().find((a) => a.eventId === 'rfq-016')
    );
    expect(award.lines.map((l) => [l.supplierId, l.sharePct])).toEqual([
      ['sup-001', 60],
      ['sup-017', 40]
    ]);
  });

  it('KNOWN-BAD twin — the same split with sup-018 (expired yesterday) is refused by name, whole', async () => {
    const res = await award016([
      ['sup-001', 'qt-016a', 60],
      ['sup-018', 'qt-016c', 40]
    ]);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/COMPLIANCE_GATE_FAILED: sup-018 .*\(halal\)/);
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-016')).status
    ).toBe('Closed');
  });

  it('rfq-018 is Open and still collecting: sup-017 is invited and has not quoted', () => {
    const rfq = /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-018'));
    expect(rfq.responseDeadline > DECLARED_PRESENT).toBe(true);
    expect(rfq.invitedSupplierIds).toContain('sup-017');
    expect(currentQuotesFor('rfq-018').map((q) => q.supplierId)).toEqual(['sup-001', 'sup-002']);
  });
});
