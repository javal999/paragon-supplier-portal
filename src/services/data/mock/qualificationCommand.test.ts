// ────────────────────────────────────────────────────────────────────────────
// Material G1 — vendor qualification from documents (MR-10 BR-01 to BR-04,
// AC-01, AC-02, AC-06, edge cases 2 and 3; plan AD-2, AR-18), dispatched
// through the REAL MockCommandService and read back through the read model and
// the supplier read service. Every refusal code of the rule verb is probed
// both ways.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService, commandAuditSink } from './MockCommandService';
import { MockSupplierService } from './MockSupplierService';
import { MockProcurementService } from './MockProcurementService';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { qualificationFor, qualificationHistory } from './qualificationReadModel';
import { qualificationRuleStore } from '../../transitions/qualificationRuleStore';
import { PLACEHOLDER_RULES } from '../../transitions/qualificationRules';
import type { QualificationRequiredDoc, QueryScope } from '../types';
import { PERSONA_SYSTEM_ROLES, SYSTEM_ROLES, rolesHolding } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '../../../context/noPerson';

const svc = new MockCommandService();
const suppliers = new MockSupplierService();
const procurement = new MockProcurementService();

const buyerSeat = (...businessRoles: string[]): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles,
  actor: NO_PERSON,
});
const quality = buyerSeat('compliance');
const procurementSeat = buyerSeat('procurement');
const supplierSeat = (supplierId: string): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON,
});

const placeholder = (level: 'approved' | 'preferred') =>
  PLACEHOLDER_RULES.find((r) => r.level === level)!.requiredDocs.map((r) => ({ ...r }));

const setRule = (level: string, requiredDocs: unknown, scope: QueryScope = quality) =>
  svc.dispatch(scope, {
    transitionId: 't_qualification_rule_set',
    entity: 'qualificationRule',
    entityId: level,
    payload: { requiredDocs },
  });

const declare = (supplierId: string, certType: string, certNumber: string, expiresOn: string | null = null) =>
  svc.dispatch(supplierSeat(supplierId), {
    transitionId: 't_supplierdoc_declare',
    entity: 'supplierDocument',
    payload: {
      supplierId,
      certType,
      certNumber,
      issuer: 'Sample issuer',
      issuedOn: '2026-08-01',
      scopeText: 'All materials',
      ...(expiresOn ? { expiresOn } : {}),
    },
  });

const verify = (docId: string) =>
  svc.dispatch(quality, { transitionId: 't_supplierdoc_verify', entity: 'supplierDocument', entityId: docId, payload: {} });

const BPJPH: QualificationRequiredDoc = { category: 'Halal Compliance', certType: 'HALAL_BPJPH', label: 'Halal certificate (BPJPH)' };

beforeEach(() => {
  qualificationRuleStore.reset();
  supplierDocumentStore.reset();
  sdcClock.reset();
});

describe('the fixture cases this file rests on (population control)', () => {
  it('sup-007 holds valid Tax & Legal, Halal, Quality and BPOM documents; its halal certificate is doc-001', () => {
    const valid = supplierDocumentStore.all().filter((d) => d.supplierId === 'sup-007' && d.status === 'Valid');
    expect(valid.map((d) => d.category)).toEqual(
      expect.arrayContaining(['Tax & Legal', 'Halal Compliance', 'Quality', 'BPOM Regulatory']),
    );
    expect(valid.filter((d) => d.category === 'Halal Compliance').map((d) => d.id)).toEqual(['doc-001']);
    // No seeded row carries a declared certificate type (AR-18).
    expect(supplierDocumentStore.all().filter((d) => d.status === 'Valid' && d.declaration)).toEqual([]);
  });

  it('under the placeholder lists sup-007 is Preferred, sup-002 lacks Tax & Legal, and sup-013 has no documents', () => {
    expect(qualificationFor('sup-007').level).toBe('preferred');
    expect(qualificationFor('sup-002').missingFor.approved.map((r) => r.category)).toEqual(['Tax & Legal']);
    expect(supplierDocumentStore.all().some((d) => d.supplierId === 'sup-013')).toBe(false);
  });
});

describe('the level (BR-01 to BR-03)', () => {
  it('edge case 3: a vendor with no documents is Registered and lacks every listed document', () => {
    const q = qualificationFor('sup-013');
    expect(q.level).toBe('registered');
    expect(q.missingFor.approved.map((r) => r.category)).toEqual(['Tax & Legal', 'Halal Compliance']);
    expect(q.missingFor.preferred).toHaveLength(4);
    expect(qualificationHistory('sup-013')).toEqual([]);
  });

  it('when its only halal certificate expires, the vendor drops below Approved to Registered', () => {
    expect(qualificationFor('sup-007').level).toBe('preferred');
    const doc001 = supplierDocumentStore.get('doc-001')!;
    const expiry = doc001.expiryDate!;
    expect(qualificationFor('sup-007', `${expiry}T00:00:00.000Z`).level).toBe('registered');
    // The day before, it still counts — and it is listed as expiring (AC-06).
    const dayBefore = new Date(Date.parse(expiry) - 86_400_000).toISOString();
    const before = qualificationFor('sup-007', dayBefore);
    expect(before.level).toBe('preferred');
    expect(before.expiringSoon.map((d) => d.documentId)).toContain('doc-001');
    // The history, read after the expiry, names the document that dropped it.
    const history = qualificationHistory('sup-007', `${expiry}T12:00:00.000Z`);
    expect(history[history.length - 1]).toEqual({
      at: expiry,
      from: 'preferred',
      to: 'registered',
      causeDocumentId: 'doc-001',
    });
  });

  it('AC-02 with an Approved vendor: the expired Approved document moves it from Approved to Registered', async () => {
    // Preferred asks for a BPJPH certificate sup-007 does not hold, so it sits at Approved.
    expect((await setRule('preferred', [...placeholder('preferred'), BPJPH])).status).toBe('done');
    expect(qualificationFor('sup-007').level).toBe('approved');
    const expiry = supplierDocumentStore.get('doc-001')!.expiryDate!;
    expect(qualificationFor('sup-007', `${expiry}T00:00:00.000Z`).level).toBe('registered');
  });

  it('a requirement naming a certificate type is met only by a declared, verified certificate of that type (AR-18)', async () => {
    await setRule('preferred', [...placeholder('preferred'), BPJPH]);
    expect(qualificationFor('sup-007').missingFor.preferred).toEqual([BPJPH]);
    const declared = await declare('sup-007', 'HALAL_MUI_LEGACY', 'MUI-0001');
    await verify(declared.entityId!);
    // Same category, other certificate type: still missing.
    expect(qualificationFor('sup-007').missingFor.preferred).toEqual([BPJPH]);
  });
});

describe('AC-01: verifying the last missing Preferred document moves the vendor to Preferred at once', () => {
  it('and the replayed history names the document', async () => {
    // Edge case 2: adding a document to the Preferred list drops the vendor at once.
    sdcClock.set('2026-09-01T02:00:00.000Z');
    expect((await setRule('preferred', [...placeholder('preferred'), BPJPH])).status).toBe('done');
    expect(qualificationFor('sup-007').level).toBe('approved');

    sdcClock.set('2026-09-02T02:00:00.000Z');
    const declared = await declare('sup-007', 'HALAL_BPJPH', 'BPJPH-0007');
    expect(declared.status, declared.reason).toBe('done');
    const docId = declared.entityId!;
    // Declared is not verified: still Approved.
    expect(qualificationFor('sup-007').level).toBe('approved');

    sdcClock.set('2026-09-03T02:00:00.000Z');
    expect((await verify(docId)).status).toBe('done');
    expect(supplierDocumentStore.get(docId)?.verifiedAt).toBe('2026-09-03T02:00:00.000Z');
    expect(qualificationFor('sup-007').level).toBe('preferred');
    expect(qualificationFor('sup-007').missingFor.preferred).toEqual([]);

    const history = qualificationHistory('sup-007');
    expect(history.slice(-2)).toEqual([
      { at: '2026-09-01T02:00:00.000Z', from: 'preferred', to: 'approved', causeDocumentId: null, causeRuleLevel: 'preferred' },
      { at: '2026-09-03T02:00:00.000Z', from: 'approved', to: 'preferred', causeDocumentId: docId },
    ]);
    // The projection on the supplier read follows at once.
    expect((await suppliers.getById(procurementSeat, 'sup-007'))?.qualification).toBe('preferred');
  });

  it('on one simulated instant, the list change still comes before the verification it is followed by', async () => {
    await setRule('preferred', [...placeholder('preferred'), BPJPH]);
    const declared = await declare('sup-007', 'HALAL_BPJPH', 'BPJPH-0007');
    await verify(declared.entityId!);
    const history = qualificationHistory('sup-007');
    expect(history.slice(-2).map((c) => [c.from, c.to, c.causeDocumentId ?? c.causeRuleLevel])).toEqual([
      ['preferred', 'approved', 'preferred'],
      ['approved', 'preferred', declared.entityId],
    ]);
  });
});

describe('the history is replayed, not written (plan AD-2)', () => {
  it('two reads return the identical history, and no store grew', () => {
    const docsBefore = supplierDocumentStore.all().length;
    const rulesBefore = qualificationRuleStore.changes().length;
    const eventsBefore = commandAuditSink.all().length;
    const first = qualificationHistory('sup-007');
    const second = qualificationHistory('sup-007');
    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
    expect(supplierDocumentStore.all().length).toBe(docsBefore);
    expect(qualificationRuleStore.changes().length).toBe(rulesBefore);
    expect(commandAuditSink.all().length).toBe(eventsBefore);
  });

  it('the replay of sup-007 under the placeholder lists names each rise by its document', () => {
    // Tax & Legal from 2010 and BPOM from 2023 do not make a level on their own;
    // the halal certificate makes Approved, the quality certificate Preferred.
    const history = qualificationHistory('sup-007', '2026-09-01T00:00:00.000Z');
    expect(history.map((c) => [c.from, c.to, c.causeDocumentId])).toEqual([
      ['registered', 'approved', 'doc-001'],
      ['approved', 'preferred', 'doc-005'],
    ]);
  });
});

describe('t_qualification_rule_set (BR-04)', () => {
  it('PREFERRED_MISSING_APPROVED: a Preferred list missing an Approved document is refused; a full one passes', async () => {
    const bad = await setRule('preferred', placeholder('preferred').filter((r) => r.category !== 'Tax & Legal'));
    expect(bad.status).toBe('failed');
    expect(bad.reason).toMatch(/:PREFERRED_MISSING_APPROVED: /);
    expect(qualificationRuleStore.changes()).toEqual([]);
    expect((await setRule('preferred', placeholder('preferred'))).status).toBe('done');
  });

  it('PREFERRED_MISSING_APPROVED: an Approved document the Preferred list lacks is refused; one it holds passes', async () => {
    const bad = await setRule('approved', [...placeholder('approved'), BPJPH]);
    expect(bad.reason).toMatch(/:PREFERRED_MISSING_APPROVED: /);
    expect((await setRule('approved', [...placeholder('approved'), { category: 'Quality', label: 'ISO 9001' }])).status).toBe(
      'done',
    );
  });

  it('QUALIFICATION_RULE_INVALID: an unknown category, a blank label or a repeat is refused; a clean list passes', async () => {
    const unknown = await setRule('preferred', [...placeholder('preferred'), { category: 'Nope', label: 'x' }]);
    expect(unknown.reason).toMatch(/:QUALIFICATION_RULE_INVALID: /);
    const blank = await setRule('preferred', [...placeholder('preferred'), { category: 'Contract', label: '  ' }]);
    expect(blank.reason).toMatch(/:QUALIFICATION_RULE_INVALID: /);
    const repeat = await setRule('preferred', [...placeholder('preferred'), { category: 'Quality', label: 'again' }]);
    expect(repeat.reason).toMatch(/:QUALIFICATION_RULE_INVALID: the same document/);
    expect(qualificationRuleStore.changes()).toEqual([]);
    expect((await setRule('preferred', [...placeholder('preferred'), { category: 'Contract', label: 'Supply agreement' }])).status).toBe(
      'done',
    );
  });

  it('an empty list is refused as missing; an unknown level is NOT_FOUND', async () => {
    expect((await setRule('approved', [])).reason).toMatch(/MISSING_FIELDS/);
    await expect(setRule('gold', placeholder('approved'))).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(qualificationRuleStore.changes()).toEqual([]);
  });

  it('a saved list is no longer the placeholder, and the change is recorded with who and when', async () => {
    sdcClock.set('2026-09-05T03:00:00.000Z');
    await setRule('approved', placeholder('approved'));
    expect(qualificationRuleStore.get('approved').placeholder).toBe(false);
    expect(qualificationRuleStore.get('preferred').placeholder).toBe(true);
    expect(qualificationRuleStore.changes()[0]).toMatchObject({ level: 'approved', setAt: '2026-09-05T03:00:00.000Z', setBy: NO_PERSON });
  });
});

describe('who may set the lists', () => {
  it('the atom sits in compliance only, and admin holds it by derivation', () => {
    expect(rolesHolding('qualification:manage')).toEqual(['compliance']);
    expect(SYSTEM_ROLES.admin).toContain('qualification:manage');
    expect(SYSTEM_ROLES.procurement).not.toContain('qualification:manage');
  });

  it('procurement alone is refused; the compliance seat passes', async () => {
    const refused = await setRule('preferred', placeholder('preferred'), procurementSeat);
    expect(refused.reason).toMatch(/ROLE_NOT_PERMITTED/);
    expect((await setRule('preferred', placeholder('preferred'), quality)).status).toBe('done');
  });

  it('a supplier is refused at scope', async () => {
    await expect(setRule('approved', placeholder('approved'), supplierSeat('sup-007'))).rejects.toMatchObject({
      code: 'SCOPE_DENIED',
    });
  });
});

describe('the reads (MAT-R4, BR-09)', () => {
  it('a supplier sees its own level and missing documents only; the buyer sees every vendor', async () => {
    const mine = (await suppliers.getVendorQualifications(supplierSeat('sup-002'))).items;
    expect(mine.map((r) => r.supplierId)).toEqual(['sup-002']);
    expect(mine[0]).toMatchObject({ level: 'registered', placeholderRules: true });
    expect(mine[0].missingFor.approved.map((r) => r.category)).toEqual(['Tax & Legal']);
    const all = (await suppliers.getVendorQualifications(procurementSeat)).items;
    expect(all.map((r) => r.supplierId)).toEqual(expect.arrayContaining(['sup-002', 'sup-007', 'sup-013']));
    expect((await suppliers.getCurrent(supplierSeat('sup-002')))?.qualification).toBe('registered');
  });

  it('the scorecard carries the computed level, not a typed status', async () => {
    const cards = (await procurement.getSupplierScorecards(procurementSeat)).items;
    const card7 = cards.find((c) => c.id === 'sup-007')!;
    expect(card7.qualification).toBe('preferred');
    expect(Object.keys(card7)).not.toContain('status');
    expect(cards.find((c) => c.id === 'sup-009')?.qualification).toBe('registered');
  });
});
