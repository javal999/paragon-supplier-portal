import { describe, expect, it } from 'vitest';
import { RFI_QUESTION_LIBRARY, RFI_TEMPLATES } from '../sourcing/rfxConfig';
import {
  MASTER_DATA_ENFORCEMENT,
  MASTER_FIELD_GROUPS,
  buildMasterFieldCatalogue,
  missingMandatory,
  saveVerdict
} from './masterDataCatalogue';

const catalogue = buildMasterFieldCatalogue(RFI_QUESTION_LIBRARY);

describe('PEX-14 master data field catalogue [Proposed]', () => {
  it('seeds one row per existing RFI question (each template question is in it) after the planning fields', () => {
    const rfiIds = catalogue.filter((f) => f.source === 'rfi').map((f) => f.id);
    for (const tpl of RFI_TEMPLATES) for (const q of tpl.questions) expect(rfiIds).toContain(q.id);
    expect(rfiIds).toEqual(RFI_QUESTION_LIBRARY.map((q) => q.id));
    expect(catalogue.slice(0, 3).map((f) => f.id)).toEqual([
      'leadTimeDays',
      'moq',
      'orderMultiple'
    ]);
    expect(new Set(catalogue.map((f) => f.id)).size).toBe(catalogue.length);
  });

  it("carries the RFI question's required flag as mandatory, and its section as the group", () => {
    for (const q of RFI_QUESTION_LIBRARY) {
      const f = catalogue.find((x) => x.id === q.id);
      expect(f?.mandatory).toBe(q.required);
      expect(f?.group).toBe(q.sectionId);
    }
    // Control: the catalogue holds both marks, so the marker is not vacuous.
    expect(catalogue.some((f) => f.mandatory)).toBe(true);
    expect(catalogue.some((f) => !f.mandatory)).toBe(true);
  });

  it('puts every field in a known group and keeps the planning fields mandatory', () => {
    for (const f of catalogue) expect(MASTER_FIELD_GROUPS).toContain(f.group);
    expect(catalogue.filter((f) => f.group === 'planning').every((f) => f.mandatory)).toBe(true);
  });

  it('lists the mandatory fields a record leaves empty; 0 and false are values', () => {
    expect(missingMandatory({}, catalogue.slice(0, 3))).toEqual([
      'leadTimeDays',
      'moq',
      'orderMultiple'
    ]);
    expect(
      missingMandatory({ leadTimeDays: 0, moq: '  ', orderMultiple: [] }, catalogue.slice(0, 3))
    ).toEqual(['moq', 'orderMultiple']);
    expect(
      missingMandatory({ leadTimeDays: 14, moq: 100, orderMultiple: 10 }, catalogue.slice(0, 3))
    ).toEqual([]);
  });

  it('marks first: nothing is blocked now; block mode refuses only with a field missing', () => {
    expect(MASTER_DATA_ENFORCEMENT.mode).toBe('mark');
    expect(saveVerdict(['moq'])).toBe('allow');
    expect(saveVerdict(['moq'], 'block')).toBe('block');
    expect(saveVerdict([], 'block')).toBe('allow');
  });
});
