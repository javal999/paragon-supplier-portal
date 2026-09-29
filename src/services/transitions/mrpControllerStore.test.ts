// ────────────────────────────────────────────────────────────────────────────
// Material C4 — the MRP controller rules, pure (MR-5 BR-02, BR-04, AC-02).
// Every refusal code fires once and passes once; the resolver and the filter
// are probed on both sides.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import {
  PIC_FILTER_MINE,
  SAMPLE_MRP_CONTROLLERS,
  mrpControllerRef,
  mrpControllerRefusal,
  mrpControllerStore,
  picFilterMatches,
  userLabelsOf,
} from './mrpControllerStore';
import { NO_PERSON } from '../../context/noPerson';

beforeEach(() => mrpControllerStore.reset());

describe('mrpControllerRefusal — the rule the verb and the admin page share', () => {
  it('MRP_CONTROLLER_CODE_INVALID fires on a malformed code; a SAP-shaped code passes', () => {
    expect(mrpControllerRefusal('p12', 'Desk', ['Planner'])).toMatch(/^MRP_CONTROLLER_CODE_INVALID/);
    expect(mrpControllerRefusal('P123', 'Desk', ['Planner'])).toMatch(/^MRP_CONTROLLER_CODE_INVALID/);
    expect(mrpControllerRefusal('', 'Desk', ['Planner'])).toMatch(/^MRP_CONTROLLER_CODE_INVALID/);
    expect(mrpControllerRefusal('P12', 'Desk', ['Planner'])).toBeNull();
  });

  it('MRP_CONTROLLER_NAME_REQUIRED fires on a blank name; a name passes', () => {
    expect(mrpControllerRefusal('P12', '  ', ['Planner'])).toMatch(/^MRP_CONTROLLER_NAME_REQUIRED/);
    expect(mrpControllerRefusal('P12', 'Packaging desk', ['Planner'])).toBeNull();
  });

  it('MRP_CONTROLLER_USERS_REQUIRED fires with no hub user; one passes (BR-02: one or more)', () => {
    expect(mrpControllerRefusal('P12', 'Desk', [])).toMatch(/^MRP_CONTROLLER_USERS_REQUIRED/);
    expect(mrpControllerRefusal('P12', 'Desk', ['  ', ''])).toMatch(/^MRP_CONTROLLER_USERS_REQUIRED/);
    expect(mrpControllerRefusal('P12', 'Desk', ['Planner'])).toBeNull();
  });

  it('user labels are trimmed, blanks dropped and duplicates removed', () => {
    expect(userLabelsOf([' A ', '', 'B', 'A', 7])).toEqual(['A', 'B']);
    expect(userLabelsOf('A')).toEqual([]);
  });
});

describe('mrpControllerRef — what each reader may see (BR-02, BR-04)', () => {
  it('PTI sees the code and the name of a mapped code', () => {
    expect(mrpControllerRef('P12', 'buyer')).toEqual({ code: 'P12', name: 'Packaging planning desk (sample)' });
  });

  it('an unmapped code shows the code only to PTI, and nothing to a supplier', () => {
    expect(SAMPLE_MRP_CONTROLLERS.map((r) => r.code)).not.toContain('P13');
    expect(mrpControllerRef('P13', 'buyer')).toEqual({ code: 'P13' });
    expect(mrpControllerRef('P13', 'supplier')).toBeUndefined();
  });

  it('a supplier sees the name and never the code (AC-03)', () => {
    const ref = mrpControllerRef('P12', 'supplier');
    expect(ref).toEqual({ name: 'Packaging planning desk (sample)' });
    expect(ref && 'code' in ref).toBe(false);
  });

  it('a material with no code gives nothing to show', () => {
    expect(mrpControllerRef(undefined, 'buyer')).toBeUndefined();
  });

  it('the latest change per code wins, over the sample list', () => {
    mrpControllerStore.append({ code: 'P13', name: 'Fragrance desk', userLabels: ['FR planner'], setBy: NO_PERSON, setAt: 't1' });
    mrpControllerStore.append({ code: 'P13', name: 'Fragrance desk B', userLabels: ['FR planner'], setBy: NO_PERSON, setAt: 't2' });
    expect(mrpControllerRef('P13', 'buyer')).toEqual({ code: 'P13', name: 'Fragrance desk B' });
    expect(mrpControllerStore.changes()).toHaveLength(2);
  });
});

describe('picFilterMatches — the PIC filter and "My materials" (AC-02)', () => {
  const p12 = { code: 'P12', name: 'Packaging planning desk (sample)' };
  const p10 = { code: 'P10', name: 'Base raw material planning desk (sample)' };

  it('"My materials" for P12 keeps P12 rows and drops every other', () => {
    expect(picFilterMatches(p12, PIC_FILTER_MINE, 'P12')).toBe(true);
    expect(picFilterMatches(p10, PIC_FILTER_MINE, 'P12')).toBe(false);
    expect(picFilterMatches(undefined, PIC_FILTER_MINE, 'P12')).toBe(false);
  });

  it('"My materials" with no chosen code shows nothing rather than everything', () => {
    expect(picFilterMatches(p12, PIC_FILTER_MINE, null)).toBe(false);
  });

  it('no filter keeps every row; a code filter keeps that code; a supplier filters by name', () => {
    expect(picFilterMatches(undefined, '', null)).toBe(true);
    expect(picFilterMatches(p10, 'P10', null)).toBe(true);
    expect(picFilterMatches(p12, 'P10', null)).toBe(false);
    expect(picFilterMatches({ name: p12.name }, p12.name, null)).toBe(true);
  });
});
