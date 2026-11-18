// AIB-1 (BL-348) — the 4 ZWME021 sequence rules, probed both ways: a known-GOOD
// ASN passes before each known-BAD line is refused BY NAME, and the compare
// itself is exercised through the real dispatcher on the submit verb.
import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from '../data/mock/MockCommandService';
import { asnStore } from '../data/mock/stores/asnStore';
import { purchaseOrderStore } from '../data/mock/stores/purchaseOrderStore';
import { goodsReceiptStore } from '../data/mock/stores/goodsReceiptStore';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import { asnSequenceRead } from './fulfilmentRules/asnSequence';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope } from '../data/types' */

const svc = new MockCommandService();
/** @type {QueryScope} */
const sup = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

beforeEach(() => {
  purchaseOrderStore.reset();
  asnStore.reset();
  goodsReceiptStore.reset();
});

const PO = 'PO-2025-00108';
const MAT = 'PK-PETB-8802';
const ETA = '2026-09-20';

// PO-2025-00108 carries one line (PK-PETB-8802 × 150,000), so the verb probes
// submit one line; the AC-02 to AC-04 line pairs are the PURE probes below,
// which is where a second line's differing value belongs.
const LINES = [{ materialCode: MAT, shippedQty: 1_000 }];

/** @param {Record<string, unknown>} patch */
const read = (patch = {}) =>
  asnSequenceRead({
    sequence: '1',
    externalId: 'SURAT JALAN 1',
    poReference: 'PO-1',
    deliveryDate: '2026-08-21',
    lines: [{ materialCode: 'MAT-A' }, { materialCode: 'MAT-B' }],
    ...patch
  });

describe('AC-01 — the slide’s 2 lines pass', () => {
  it('one PO, one delivery date, one External ID and a sequence is accepted', () => {
    const res = read();
    expect(res.ok).toBe(true);
    expect(res.sequenceMissing).toBe(false);
    expect(res.externalIdMissing).toBe(false);
    expect(res.lines).toEqual([]);
  });
});

describe('AC-02 — two POs in one sequence are refused, naming BOTH numbers', () => {
  it('the second line carries its own PO and the error names both', () => {
    const res = read({
      lines: [
        { materialCode: 'MAT-A', poReference: '4200000113' },
        { materialCode: 'MAT-B', poReference: '4200000199' }
      ]
    });
    expect(res.ok).toBe(false);
    expect(res.lines).toEqual([
      { materialCode: 'MAT-B', code: 'po', value: '4200000199', expected: '4200000113' }
    ]);
  });

  it('the same two POs still pass when the lines agree (the known-GOOD control)', () => {
    expect(
      read({
        lines: [
          { materialCode: 'MAT-A', poReference: '4200000113' },
          { materialCode: 'MAT-B', poReference: '4200000113' }
        ]
      }).lines
    ).toEqual([]);
  });
});

describe('AC-03 — two delivery dates in one sequence are refused', () => {
  it('names the line’s date and the sequence’s date', () => {
    const res = read({
      lines: [
        { materialCode: 'MAT-A', deliveryDate: '2026-08-21' },
        { materialCode: 'MAT-B', deliveryDate: '2026-08-22' }
      ]
    });
    expect(res.ok).toBe(false);
    expect(res.lines).toEqual([
      { materialCode: 'MAT-B', code: 'deliveryDate', value: '2026-08-22', expected: '2026-08-21' }
    ]);
  });
});

describe('AC-04 — two External IDs in one sequence are refused', () => {
  it('names the line’s External ID and the sequence’s', () => {
    const res = read({
      lines: [
        { materialCode: 'MAT-A', externalId: 'SURAT JALAN 1' },
        { materialCode: 'MAT-B', externalId: 'SURAT JALAN 2' }
      ]
    });
    expect(res.ok).toBe(false);
    expect(res.lines).toEqual([
      {
        materialCode: 'MAT-B',
        code: 'externalId',
        value: 'SURAT JALAN 2',
        expected: 'SURAT JALAN 1'
      }
    ]);
  });
});

describe('AC-05 — a blank sequence is refused, and so is a blank SJ', () => {
  it('a blank sequence fails the read', () => {
    const res = read({ sequence: '   ' });
    expect(res.ok).toBe(false);
    expect(res.sequenceMissing).toBe(true);
  });

  it('a blank External ID (Surat Jalan) fails the read', () => {
    const res = read({ externalId: '' });
    expect(res.ok).toBe(false);
    expect(res.externalIdMissing).toBe(true);
  });

  it('the blank checks do not blame individual lines — the field is the failure', () => {
    expect(read({ sequence: '' }).lines).toEqual([]);
  });
});

describe('one sequence = one ASN (AIB-D1) — the peer check', () => {
  const PEER = (patch = {}) => ({
    asnNumber: 'ASN-2026-9001',
    sequence: '1',
    poReference: 'PO-1',
    eta: '2026-08-21',
    externalId: 'SURAT JALAN 1',
    ...patch
  });

  it('a peer on the same sequence with a different PO is refused, naming both POs', () => {
    const res = read({ peers: [PEER({ poReference: 'PO-9' })] });
    expect(res.ok).toBe(false);
    expect(res.lines[0]).toMatchObject({ code: 'po', value: 'PO-1', expected: 'PO-9' });
  });

  it('a peer with the same values is the same sequence twice — refused by name', () => {
    const res = read({ peers: [PEER()] });
    expect(res.ok).toBe(false);
    expect(res.alreadyUsedBy).toBe('ASN-2026-9001');
  });

  it('a DIFFERENT sequence is not a peer; a cancelled ASN is not filtered here (the caller does)', () => {
    expect(read({ peers: [PEER({ sequence: '2' })] }).ok).toBe(true);
  });
});

// ── The verb — the same rule below the surface (AR-11) ──────────────────────
describe('submit — a failed sequence validation BLOCKS the submit (AIB-1 BR-05)', () => {
  const confirmPo = () =>
    svc.dispatch(sup, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: 'po-008',
      payload: { confirmedQuantities: [150000] }
    });

  /** @param {Record<string, unknown>} patch */
  const create = async (patch = {}) => {
    await confirmPo();
    return svc.dispatch(sup, {
      transitionId: 't_asn_create',
      entity: 'advanceShipNotice',
      payload: {
        poReference: PO,
        carrier: 'Sample Courier',
        trackingNumber: 'SMPL-1',
        eta: ETA,
        shipDate: '2026-09-18',
        lines: LINES,
        ...patch
      }
    });
  };

  /** @param {string} asnNumber @param {Record<string, unknown>} patch */
  const submit = (asnNumber, patch = {}) =>
    svc.dispatch(sup, {
      transitionId: 't_asn_submit',
      entity: 'advanceShipNotice',
      entityId: asnNumber,
      payload: {
        carrier: 'Sample Courier',
        trackingNumber: 'SMPL-1',
        eta: ETA,
        shipDate: '2026-09-18',
        lines: LINES.map((l) => ({ ...l, batchNumber: 'BATCH-1' })),
        ...patch
      }
    });

  it('a submission with no sequence is refused and the ASN stays Draft', async () => {
    const created = await create();
    expect(created.status).toBe('done');
    const res = await submit(/** @type {string} */ (created.entityId));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/SEQUENCE_RULES/);
    expect(res.reason).toMatch(/sequence is required/);
    expect(asnStore.get(/** @type {string} */ (created.entityId))?.status).toBe('Draft');
  });

  it('a blank SJ is refused by name', async () => {
    const created = await create({ sequence: '71' });
    const res = await submit(/** @type {string} */ (created.entityId), {
      sequence: '71',
      externalId: '  '
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/Surat Jalan/);
  });

  it('a sequence already used on another PO is refused, naming BOTH PO numbers', async () => {
    // ASN-2025-00211 is sup-007's seeded In-Transit ASN with sequence 1 on
    // PO-2025-00107. The new ASN is on PO-2025-00108 — 2 POs in one sequence.
    const created = await create({ sequence: '1', externalId: 'SJ-71' });
    const res = await submit(/** @type {string} */ (created.entityId), {
      sequence: '1',
      externalId: 'SJ-71'
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toContain(PO);
    expect(res.reason).toContain('PO-2025-00107');
  });

  it('the same sequence sent twice with the same values is refused (one sequence = one ASN)', async () => {
    const first = await create({ sequence: '72', externalId: 'SJ-72' });
    expect((await submit(/** @type {string} */ (first.entityId))).status).toBe('done');
    const second = await create({ sequence: '72', externalId: 'SJ-72' });
    const res = await submit(/** @type {string} */ (second.entityId));
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/one sequence is one ASN/);
  });

  it('a complete submission with a unique sequence and the SJ is accepted', async () => {
    const created = await create({ sequence: '73', externalId: 'SJ-73' });
    const res = await submit(/** @type {string} */ (created.entityId));
    expect(res.status, res.reason).toBe('done');
    const stored = asnStore.get(/** @type {string} */ (created.entityId));
    expect(stored?.status).toBe('Submitted');
    expect(stored?.sequence).toBe('73');
    expect(stored?.externalId).toBe('SJ-73');
  });
});
