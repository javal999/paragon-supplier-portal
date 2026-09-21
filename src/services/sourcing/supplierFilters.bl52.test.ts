// ─────────────────────────────────────────────────────────────────────────────
// BL-52 · SUPPLIER FILTERS — REQ-E03-01 BR-05, pinned by NAMED suppliers.
//
// Every filter value has a named member it must return AND a named member it
// must not, so a filter that returns everything (or nothing) cannot pass.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockSuppliers } from '../../data/mockSuppliers';
import { COMPLIANCE_REGISTRY } from '../data/mock/fixtures/complianceRegistry';
import { EXPIRING_WINDOW_DAYS } from '../data/complianceProjection';
import { sdcClock } from '../sdc/clock';
import { inviteeCandidates, matchingInvitees } from '../data/mock/rfxReadModel';
import {
  CERT_EXPIRING_WITHIN_DAYS,
  bandOfLetter,
  certificateValidity,
  readSupplierFilters,
  writeSupplierFilters,
  type CertValidity,
  type PerformanceBand,
} from './supplierFilters';

const NOW = sdcClock.now();
const sup = (id: string) => {
  const s = mockSuppliers.find((x) => x.id === id);
  if (!s) throw new Error(`${id} is gone — the case it pinned is gone with it`);
  return s;
};
const validity = (id: string) => certificateValidity(sup(id), COMPLIANCE_REGISTRY, NOW);
const idsWith = (cert: CertValidity) =>
  mockSuppliers.filter((s) => certificateValidity(s, COMPLIANCE_REGISTRY, NOW) === cert).map((s) => s.id);
const bandIds = (band: PerformanceBand) =>
  inviteeCandidates().filter((c) => c.band === band).map((c) => c.supplierId);

describe('BL-52 · certificate validity, through the existing projection', () => {
  it('"expiring" means the compliance projection’s own window — restated nowhere', () => {
    expect(CERT_EXPIRING_WITHIN_DAYS).toBe(EXPIRING_WINDOW_DAYS);
  });

  it('valid: sup-001 (master halal to 2027-03-09, BPOM held) — and never an expiring or expired one', () => {
    expect(validity('sup-001')).toBe('valid');
    expect(idsWith('valid')).toContain('sup-001');
    expect(idsWith('valid')).not.toContain('sup-017');
    expect(idsWith('valid')).not.toContain('sup-018');
  });

  it('expiring: sup-017 (halal expires ON the present) and sup-003 (within the window)', () => {
    expect(sup('sup-017').certExpiryDate).toBe(NOW.slice(0, 10));
    expect(validity('sup-017')).toBe('expiring');
    expect(validity('sup-003')).toBe('expiring');
    expect(idsWith('expiring')).not.toContain('sup-001');
  });

  it('expired or missing: sup-018 (expired yesterday), sup-008 (nothing on file), sup-007 (BPOM not yet verified)', () => {
    expect(validity('sup-018')).toBe('expiredOrMissing');
    expect(validity('sup-008')).toBe('expiredOrMissing');
    expect(COMPLIANCE_REGISTRY.some((c) => c.supplierId === 'sup-007' && c.certType === 'BPOM' && c.lifecycleState === 'Under Review')).toBe(true);
    expect(validity('sup-007')).toBe('expiredOrMissing');
    expect(idsWith('expiredOrMissing')).not.toContain('sup-001');
  });

  it('the registry decides over the master, as in the compliance gate: sup-002', () => {
    // Control: the master alone says "expiring" (halal to 2026-09-10) …
    expect(certificateValidity(sup('sup-002'), [], NOW)).toBe('expiring');
    // … and the registry, which holds a Missing halal row for it, overrides that.
    expect(validity('sup-002')).toBe('expiredOrMissing');
  });

  it('is derived from the clock, never stored: the same supplier ages out of "valid"', () => {
    expect(certificateValidity(sup('sup-001'), COMPLIANCE_REGISTRY, '2027-03-10T12:00:00.000Z')).toBe('expiredOrMissing');
  });
});

describe('BL-52 · performance band, from the calculated grade', () => {
  it('each band has a named member: A sup-016 · B sup-019 · C sup-020 · D sup-001 · No history sup-006', () => {
    expect(bandIds('A')).toEqual(['sup-016']);
    expect(bandIds('B')).toContain('sup-019');
    expect(bandIds('C')).toContain('sup-020');
    expect(bandIds('D')).toContain('sup-001');
    expect(bandIds('noHistory')).toContain('sup-006');
    // No-history is never folded into D.
    expect(bandIds('D')).not.toContain('sup-006');
  });

  it('the supplier master’s projected letter reads the same band', () => {
    expect(bandOfLetter(undefined)).toBe('noHistory');
    expect(bandOfLetter('A')).toBe('A');
    expect(bandOfLetter('D')).toBe('D');
  });
});

describe('BL-52 · the filters compose with purchasing group, and live in the address', () => {
  it('group 101 + expired-or-missing + band B → exactly sup-019', () => {
    const rows = matchingInvitees({ purchasingGroup: '101', cert: 'expiredOrMissing', band: 'B' });
    expect(rows.map((r) => r.supplierId)).toEqual(['sup-019']);
  });

  it('country DE → sup-005 (active); the suspended sup-012 stays out, as every status gate says', () => {
    const rows = matchingInvitees({ country: 'DE' });
    expect(rows.map((r) => r.supplierId)).toEqual(['sup-005']);
  });

  it('reads known values, IGNORES unknown ones, and keeps every other parameter on write', () => {
    const f = readSupplierFilters(new URLSearchParams('cert=expiring&band=Z&country=de&po=PO-1'));
    expect(f).toEqual({ cert: 'expiring' });
    const written = writeSupplierFilters(new URLSearchParams('po=PO-1&band=A'), { band: 'noHistory', country: 'ID' });
    expect(written.get('po')).toBe('PO-1');
    expect(written.get('band')).toBe('noHistory');
    expect(written.get('country')).toBe('ID');
    expect(written.has('cert')).toBe(false);
  });
});
