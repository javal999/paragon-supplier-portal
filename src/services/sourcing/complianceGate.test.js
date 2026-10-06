import { describe, expect, it } from 'vitest';
import { SupplierStatus } from '@app-types/supplier.types';
/** @import { ComplianceRegistryEntry } from '../data/types' */
/** @import { MaterialMaster, MaterialMasterEntry } from '../sdc/types' */
/** @import { GateSupplier } from './complianceGate' */
import { complianceGate, gateRequirementFor, otifPassesGate } from './complianceGate';
import { gateMinOtifPct, gateNoHistoryPasses } from './complianceGateConfig';

// CR-23 — each criterion is failed ON ITS OWN against a supplier that otherwise
// passes, so a red test names exactly one rule.

const NOW = '2026-08-31T12:00:00.000Z';

/**
 * @param {string} materialCode
 * @param {Partial<MaterialMasterEntry>} [over]
 * @returns {MaterialMasterEntry}
 */
const row = (materialCode, over = {}) => ({
  materialCode,
  label: materialCode,
  materialType: 'ROH',
  materialGroup: 'MG-00',
  canonicalUom: 'KG',
  bpomApplicable: 'APPLICABLE',
  halalApplicable: 'REQUIRED',
  ...over
});

/** @type {MaterialMaster} */
const MASTER = {
  'RM-ALL': row('RM-ALL'),
  'RM-UNDET': row('RM-UNDET', { halalApplicable: 'UNDETERMINED', bpomApplicable: 'UNDETERMINED' }),
  'PK-BOTTLE': row('PK-BOTTLE', {
    materialType: 'VERP',
    halalApplicable: 'NOT_REQUIRED',
    bpomApplicable: 'NOT_APPLICABLE'
  })
};

/** @type {GateSupplier} */
const good = {
  id: 'sup-x',
  status: SupplierStatus.ACTIVE,
  halalCertified: true,
  certExpiryDate: '2027-01-01',
  bpomRegistered: true,
  gmpIso22716: true
};

/**
 * @param {Partial<GateSupplier>} s
 * @param {number | null} [otif]
 * @param {ComplianceRegistryEntry[]} [certs]
 */
const gate = (s, otif = 95, codes = ['RM-ALL'], certs = []) =>
  complianceGate({ ...good, ...s }, otif, codes, NOW, certs, MASTER);

/**
 * @param {Partial<ComplianceRegistryEntry>} over
 * @returns {ComplianceRegistryEntry}
 */
const cert = (over) => ({
  id: 'c-1',
  supplierId: 'sup-x',
  supplierName: 'X',
  materialCodes: ['RM-ALL'],
  materialCategory: 'actives',
  certType: 'HALAL_BPJPH',
  certNumber: 'SAMPLE',
  issuer: '(illustrative)',
  issueDate: '2025-01-01',
  expiryDate: null,
  lifecycleState: 'Valid',
  sapSync: 'AWAITING_SYNC',
  scopeText: '',
  notes: '',
  ...over
});

describe('CR-23 — complianceGate', () => {
  it('passes when every criterion holds', () => {
    expect(gate({})).toEqual({ passes: true, failed: [] });
  });

  it('fails halal alone on an expired halal certificate', () => {
    expect(gate({ certExpiryDate: '2026-08-30' })).toEqual({ passes: false, failed: ['halal'] });
  });

  it('a halal certificate expiring today is still valid', () => {
    expect(gate({ certExpiryDate: '2026-08-31' }).passes).toBe(true);
  });

  it('fails halal alone when no halal certificate is held', () => {
    expect(gate({ halalCertified: false }).failed).toEqual(['halal']);
  });

  it('fails bpom alone without a BPOM registration', () => {
    expect(gate({ bpomRegistered: false }).failed).toEqual(['bpom']);
  });

  it('fails gmp alone without ISO 22716 on cosmetic raw material — absence is not "held"', () => {
    expect(gate({ gmpIso22716: false }).failed).toEqual(['gmp']);
    expect(gate({ gmpIso22716: undefined }).failed).toEqual(['gmp']);
  });

  it('fails status alone when Suspended or Blacklisted, and not for Onboarding', () => {
    expect(gate({ status: SupplierStatus.SUSPENDED }).failed).toEqual(['status']);
    expect(gate({ status: SupplierStatus.BLACKLISTED }).failed).toEqual(['status']);
    expect(gate({ status: SupplierStatus.ONBOARDING }).passes).toBe(true);
  });

  it('fails otif alone below the minimum; the minimum itself passes (80% boundary)', () => {
    expect(gateMinOtifPct()).toBe(80);
    expect(gate({}, 79.9).failed).toEqual(['otif']);
    expect(gate({}, 80).passes).toBe(true);
    expect(gate({}, 0).failed).toEqual(['otif']);
  });

  it('"No history" passes (BL-55 placeholder)', () => {
    expect(gateNoHistoryPasses()).toBe(true);
    expect(otifPassesGate(null)).toBe(true);
    expect(otifPassesGate(undefined)).toBe(true);
    expect(gate({}, null).passes).toBe(true);
  });

  it('lists every failed criterion, in reading order', () => {
    expect(
      gate(
        {
          halalCertified: false,
          bpomRegistered: false,
          gmpIso22716: false,
          status: SupplierStatus.SUSPENDED
        },
        10
      ).failed
    ).toEqual(['halal', 'bpom', 'gmp', 'status', 'otif']);
  });

  it('asks nothing of a material that needs nothing — packaging, UNDETERMINED, or an unknown code', () => {
    const bare = { halalCertified: false, bpomRegistered: false, gmpIso22716: false };
    expect(gate(bare, 95, ['PK-BOTTLE']).passes).toBe(true);
    expect(gate(bare, 95, ['NOT-IN-MASTER']).passes).toBe(true);
    // UNDETERMINED asks for no halal / BPOM, but ROH still asks for GMP.
    expect(gate(bare, 95, ['RM-UNDET']).failed).toEqual(['gmp']);
  });

  it('a registry certificate for the material decides over the master flag', () => {
    // Master says no halal; a valid registry cert on the material passes it.
    expect(gate({ halalCertified: false }, 95, ['RM-ALL'], [cert({})]).passes).toBe(true);
    // Master says halal; an expired registry cert on the material fails it.
    expect(gate({}, 95, ['RM-ALL'], [cert({ expiryDate: '2026-01-01' })]).failed).toEqual([
      'halal'
    ]);
    // Another supplier's cert is ignored.
    expect(
      gate({ halalCertified: false }, 95, ['RM-ALL'], [cert({ supplierId: 'sup-y' })]).failed
    ).toEqual(['halal']);
    // A BPOM row under review is not a valid registration.
    expect(
      gate({}, 95, ['RM-ALL'], [cert({ certType: 'BPOM', lifecycleState: 'Under Review' })]).failed
    ).toEqual(['bpom']);
  });

  it('reads the requirement off the material master', () => {
    expect(gateRequirementFor(['PK-BOTTLE'], MASTER)).toEqual({
      halal: false,
      bpom: false,
      gmp: false
    });
    expect(gateRequirementFor(['RM-ALL', 'PK-BOTTLE'], MASTER)).toEqual({
      halal: true,
      bpom: true,
      gmp: true
    });
  });
});
