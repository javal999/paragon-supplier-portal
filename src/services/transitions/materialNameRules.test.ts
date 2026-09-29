import { describe, expect, it } from 'vitest';
import {
  materialNameEntryRefusal,
  materialNameRefusalOf,
  materialNameRejectRefusal,
  parseTradeNameCsv,
} from './materialNameRules';

// Material C2 — the pure trade-name rules the hook and the pages share (MAT-R2).

describe('materialNameEntryRefusal', () => {
  it('checks assignment first, then the name, then the supplier number', () => {
    expect(materialNameEntryRefusal({ assigned: false, tradeName: 'x' })).toBe('NOT_ASSIGNED');
    expect(materialNameEntryRefusal({ assigned: true, tradeName: ' A ' })).toBe('NAME_LENGTH');
    expect(materialNameEntryRefusal({ assigned: true, tradeName: 'Ok', supplierMaterialNo: 'n'.repeat(41) })).toBe('SUPPLIER_NO_LENGTH');
    expect(materialNameEntryRefusal({ assigned: true, tradeName: 'Ok', supplierMaterialNo: '   ' })).toBeNull();
  });

  it('counts the cleaned name: runs of spaces collapse', () => {
    expect(materialNameEntryRefusal({ assigned: true, tradeName: `${'a'.repeat(40)}     ${'b'.repeat(39)}` })).toBeNull();
  });
});

describe('materialNameRejectRefusal and materialNameRefusalOf', () => {
  it('a blank or missing reason is REASON_REQUIRED; a real one passes', () => {
    expect(materialNameRejectRefusal(undefined)).toBe('REASON_REQUIRED');
    expect(materialNameRejectRefusal(' ')).toBe('REASON_REQUIRED');
    expect(materialNameRejectRefusal('Redundant')).toBeNull();
  });

  it('reads the code at the end of a dispatcher reason, and nothing else', () => {
    expect(materialNameRefusalOf('POLICY_REJECTED:material_name_valid:NOT_ASSIGNED')).toBe('NOT_ASSIGNED');
    expect(materialNameRefusalOf('ROLE_NOT_PERMITTED:materialname:review')).toBeNull();
  });
});

describe('parseTradeNameCsv', () => {
  it('skips the header and blank lines, keeps quoted commas, and reports lines with the wrong column count', () => {
    const csv = [
      'PTI code,Supplier ID,Trade name,Supplier material no',
      'PK-PETB-8801,sup-007,"Bottle, PET 250",SPP-250',
      '',
      'PK-PETB-8810,sup-007,ClearForm PET 110',
      'only,two',
    ].join('\n');
    const out = parseTradeNameCsv(csv);
    expect(out.rows).toEqual([
      { line: 2, materialCode: 'PK-PETB-8801', supplierId: 'sup-007', tradeName: 'Bottle, PET 250', supplierMaterialNo: 'SPP-250' },
      { line: 4, materialCode: 'PK-PETB-8810', supplierId: 'sup-007', tradeName: 'ClearForm PET 110' },
    ]);
    expect(out.badLines).toEqual([5]);
  });
});
