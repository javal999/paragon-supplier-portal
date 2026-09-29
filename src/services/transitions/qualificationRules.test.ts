// Material G1 — the pure qualification rules (MR-10 BR-01 to BR-04, edge case 2;
// plan AD-2, AR-18). No store, no clock: every input is an argument.

import { describe, expect, it } from 'vitest';
import type { QualificationRule, SupplierDocument } from '../data/types';
import {
  PLACEHOLDER_RULES,
  levelChanges,
  meetsRequirement,
  qualificationFromDocuments,
  qualificationHistoryFrom,
  qualificationRuleRefusal,
  withRule,
} from './qualificationRules';

const doc = (id: string, over: Partial<SupplierDocument>): SupplierDocument => ({
  id,
  supplierId: 'sup-x',
  name: id,
  category: 'Other',
  status: 'Valid',
  issuedBy: 'Sample',
  issuedDate: '2025-01-01',
  expiryDate: null,
  fileType: 'PDF',
  fileSize: '1 KB',
  version: 'v1',
  linkedTo: 'All',
  ...over,
});

const NOW = '2026-09-01T12:00:00.000Z';
const tax = doc('t1', { category: 'Tax & Legal' });
const halal = doc('h1', { category: 'Halal Compliance', expiryDate: '2026-10-01' });
const quality = doc('q1', { category: 'Quality' });
const bpom = doc('b1', { category: 'BPOM Regulatory', issuedDate: '2025-06-01' });

describe('qualificationFromDocuments (BR-01 to BR-03)', () => {
  it('no documents: Registered', () => {
    expect(qualificationFromDocuments([], PLACEHOLDER_RULES, NOW).level).toBe('registered');
  });

  it('every Approved document: Approved, with the Preferred ones still missing', () => {
    const q = qualificationFromDocuments([tax, halal], PLACEHOLDER_RULES, NOW);
    expect(q.level).toBe('approved');
    expect(q.missingFor.approved).toEqual([]);
    expect(q.missingFor.preferred.map((r) => r.category)).toEqual(['Quality', 'BPOM Regulatory']);
  });

  it('every Preferred document: Preferred; the halal certificate inside 180 days is listed as expiring', () => {
    const q = qualificationFromDocuments([tax, halal, quality, bpom], PLACEHOLDER_RULES, NOW);
    expect(q.level).toBe('preferred');
    expect(q.expiringSoon.map((d) => d.documentId)).toEqual(['h1']);
  });

  it('a document that is not Valid, or is expired on the date, does not count', () => {
    const review = { ...halal, status: 'Under Review' as const };
    expect(qualificationFromDocuments([tax, review], PLACEHOLDER_RULES, NOW).level).toBe('registered');
    expect(qualificationFromDocuments([tax, halal], PLACEHOLDER_RULES, '2026-10-01T00:00:00.000Z').level).toBe('registered');
    expect(qualificationFromDocuments([tax, halal], PLACEHOLDER_RULES, '2026-09-30T23:00:00.000Z').level).toBe('approved');
  });

  it('a requirement naming a certificate type matches the declared type only', () => {
    const req = { category: 'Halal Compliance' as const, certType: 'HALAL_BPJPH' as const, label: 'BPJPH' };
    expect(meetsRequirement(halal, req)).toBe(false);
    const declared = doc('h2', {
      category: 'Halal Compliance',
      declaration: {
        certType: 'HALAL_BPJPH',
        certNumber: 'X',
        issuer: 'BPJPH',
        issuedOn: '2026-01-01',
        expiresOn: null,
        scopeText: 'All',
        declaredAt: NOW,
        declaredBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' } as never,
      },
    });
    expect(meetsRequirement(declared, req)).toBe(true);
    expect(meetsRequirement(declared, { category: 'Halal Compliance', label: 'any halal' })).toBe(true);
  });
});

describe('qualificationRuleRefusal (BR-04) — the rule the hook and the page share', () => {
  const approved = PLACEHOLDER_RULES[0].requiredDocs;
  const preferred = PLACEHOLDER_RULES[1].requiredDocs;

  it('passes the placeholder lists as they stand', () => {
    expect(qualificationRuleRefusal('approved', approved, PLACEHOLDER_RULES)).toBeNull();
    expect(qualificationRuleRefusal('preferred', preferred, PLACEHOLDER_RULES)).toBeNull();
  });

  it('QUALIFICATION_LEVEL_UNKNOWN fires on anything but the two levels', () => {
    expect(qualificationRuleRefusal('registered', approved, PLACEHOLDER_RULES)).toMatch(/^QUALIFICATION_LEVEL_UNKNOWN/);
  });

  it('QUALIFICATION_RULE_INVALID fires on an empty list, an unknown certificate type and a repeat', () => {
    expect(qualificationRuleRefusal('preferred', [], PLACEHOLDER_RULES)).toMatch(/^QUALIFICATION_RULE_INVALID/);
    expect(
      qualificationRuleRefusal('preferred', [...preferred, { category: 'Quality', certType: 'GMP', label: 'x' }], PLACEHOLDER_RULES),
    ).toMatch(/^QUALIFICATION_RULE_INVALID/);
    expect(qualificationRuleRefusal('preferred', [...preferred, preferred[0]], PLACEHOLDER_RULES)).toMatch(
      /^QUALIFICATION_RULE_INVALID/,
    );
  });

  it('PREFERRED_MISSING_APPROVED fires from either side, and names what is lacking', () => {
    expect(qualificationRuleRefusal('preferred', preferred.slice(1), PLACEHOLDER_RULES)).toMatch(
      /^PREFERRED_MISSING_APPROVED: .*Tax & Legal/,
    );
    expect(
      qualificationRuleRefusal('approved', [...approved, { category: 'Contract', label: 'Agreement' }], PLACEHOLDER_RULES),
    ).toMatch(/^PREFERRED_MISSING_APPROVED: .*Contract/);
  });
});

describe('levelChanges — what a save would move (edge case 2)', () => {
  it('adding a document to the Preferred list moves a Preferred vendor down, before anything is saved', () => {
    const docs = new Map([['sup-x', [tax, halal, quality, bpom]], ['sup-y', [tax, halal]]]);
    const proposed = withRule(PLACEHOLDER_RULES, 'preferred', [
      ...PLACEHOLDER_RULES[1].requiredDocs,
      { category: 'Contract', label: 'Supply agreement' },
    ]);
    expect(levelChanges(docs, ['sup-x', 'sup-y', 'sup-z'], PLACEHOLDER_RULES, proposed, NOW)).toEqual({ up: 0, down: 1 });
    expect(levelChanges(docs, ['sup-x', 'sup-y'], PLACEHOLDER_RULES, PLACEHOLDER_RULES, NOW)).toEqual({ up: 0, down: 0 });
  });
});

describe('qualificationHistoryFrom (plan AD-2)', () => {
  const seed = [{ at: null, rules: PLACEHOLDER_RULES }];

  it('replays rises and the lapse in date order, each named by its document', () => {
    const history = qualificationHistoryFrom([tax, halal, quality, bpom], seed, '2026-12-01T00:00:00.000Z');
    expect(history.map((c) => [c.at, c.from, c.to, c.causeDocumentId])).toEqual([
      ['2025-01-01', 'registered', 'approved', 'h1'],
      ['2025-06-01', 'approved', 'preferred', 'b1'],
      ['2026-10-01', 'preferred', 'registered', 'h1'],
    ]);
  });

  it('a list change is an event of its own, with no document', () => {
    const narrower: QualificationRule[] = withRule(PLACEHOLDER_RULES, 'preferred', [
      ...PLACEHOLDER_RULES[1].requiredDocs,
      { category: 'Contract', label: 'Supply agreement' },
    ]);
    const epochs = [...seed, { at: '2026-08-01T00:00:00.000Z', rules: narrower, changed: 'preferred' as const }];
    const history = qualificationHistoryFrom([tax, halal, quality, bpom], epochs, NOW);
    expect(history[history.length - 1]).toEqual({
      at: '2026-08-01T00:00:00.000Z',
      from: 'preferred',
      to: 'approved',
      causeDocumentId: null,
      causeRuleLevel: 'preferred',
    });
  });

  it('ends on the level qualificationFromDocuments gives for the same instant', () => {
    const docs = [tax, halal, quality];
    const history = qualificationHistoryFrom(docs, seed, NOW);
    expect(history[history.length - 1].to).toBe(qualificationFromDocuments(docs, PLACEHOLDER_RULES, NOW).level);
  });
});
