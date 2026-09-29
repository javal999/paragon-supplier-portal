// ────────────────────────────────────────────────────────────────────────────
// Material C5 — the planning group rules, pure (MR-8 BR-01 to BR-05, AC-02,
// AC-04). Every refusal code fires once and passes once; the resolver derives
// a default group per SAP group; a split sums demand per group; a move marks
// the weeks it reaches and leaves past weeks alone.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  needsReEntry,
  planningGroupRefusal,
  resolvePlanningGroups,
  type PlanningGroupMaterial,
  type PlanningGroupWorld,
} from './planningGroupRules';
import { buildCapacityPlans } from './capacityRules';
import type { PlanningGroupEvent } from '../data/types';
import type { MaterialMasterEntry } from '../sdc/types';
import { NO_PERSON } from '../../context/noPerson';

const defaultId = (sap: string) => `pg-${sap}`;
const M = (materialCode: string, sapMaterialGroup: string, planningGroupId = defaultId(sapMaterialGroup)): PlanningGroupMaterial => ({
  materialCode,
  sapMaterialGroup,
  planningGroupId,
});
const MATERIALS = [M('A', 'MG-03'), M('B', 'MG-03'), M('C', 'MG-20')];
const world: PlanningGroupWorld = {
  sapGroups: ['MG-03', 'MG-20'],
  material: (code) => MATERIALS.find((m) => m.materialCode === code) ?? null,
};
const AT = '2026-09-10T03:00:00.000Z';

describe('resolvePlanningGroups — 1 default group per SAP group (MR-8 BR-02)', () => {
  it('with no change on record, each SAP group has its default group holding its materials', () => {
    const groups = resolvePlanningGroups([], MATERIALS, defaultId);
    expect(groups.map((g) => [g.id, g.sapMaterialGroup, g.materials, g.isDefault, g.named, g.state])).toEqual([
      ['pg-MG-03', 'MG-03', ['A', 'B'], true, false, 'active'],
      ['pg-MG-20', 'MG-20', ['C'], true, false, 'active'],
    ]);
    expect(groups[0].createdBy).toBeNull();
  });

  it('a created group joins its SAP group; renames and retirements apply; a move sits in both histories', () => {
    const events: PlanningGroupEvent[] = [
      { kind: 'created', groupId: 'pg-0001', name: 'Glycerin line', sapMaterialGroup: 'MG-03', at: AT, by: NO_PERSON },
      { kind: 'moved', groupId: 'pg-0001', fromGroupIds: ['pg-MG-03'], materialCodes: ['B'], at: AT, by: NO_PERSON },
      { kind: 'renamed', groupId: 'pg-MG-03', name: 'Glycol line', at: AT, by: NO_PERSON },
      { kind: 'retired', groupId: 'pg-MG-20', at: AT, by: NO_PERSON },
    ];
    const groups = resolvePlanningGroups(events, [M('A', 'MG-03'), M('B', 'MG-03', 'pg-0001'), M('C', 'MG-20')], defaultId);
    const byId = new Map(groups.map((g) => [g.id, g]));
    expect(byId.get('pg-0001')).toMatchObject({ name: 'Glycerin line', materials: ['B'], isDefault: false, named: true });
    expect(byId.get('pg-MG-03')).toMatchObject({ name: 'Glycol line', named: true, materials: ['A'] });
    expect(byId.get('pg-MG-20')!.state).toBe('retired');
    expect(byId.get('pg-MG-03')!.history.map((e) => e.kind)).toEqual(['moved', 'renamed']);
    expect(byId.get('pg-0001')!.history.map((e) => e.kind)).toEqual(['created', 'moved']);
  });
});

describe('planningGroupRefusal — each code fires once and passes once', () => {
  const g03 = { id: 'pg-0001', sapMaterialGroup: 'MG-03' };

  it('NAME_REQUIRED on create and rename', () => {
    expect(planningGroupRefusal({ kind: 'create', name: '  ', sapMaterialGroup: 'MG-03' }, world)?.code).toBe('NAME_REQUIRED');
    expect(planningGroupRefusal({ kind: 'create', name: 'Line B', sapMaterialGroup: 'MG-03' }, world)).toBeNull();
    expect(planningGroupRefusal({ kind: 'rename', name: '' }, world)?.code).toBe('NAME_REQUIRED');
    expect(planningGroupRefusal({ kind: 'rename', name: 'Line C' }, world)).toBeNull();
  });

  it('UNKNOWN_SAP_GROUP — a new group sits under an SAP group with materials', () => {
    expect(planningGroupRefusal({ kind: 'create', name: 'X', sapMaterialGroup: 'MG-99' }, world)?.code).toBe('UNKNOWN_SAP_GROUP');
    expect(planningGroupRefusal({ kind: 'create', name: 'X', sapMaterialGroup: 'MG-20' }, world)).toBeNull();
  });

  it('NO_MATERIALS and UNKNOWN_MATERIAL on a move', () => {
    expect(planningGroupRefusal({ kind: 'move', group: g03, materialCodes: [] }, world)?.code).toBe('NO_MATERIALS');
    expect(planningGroupRefusal({ kind: 'move', group: g03, materialCodes: ['ZZ'] }, world)?.code).toBe('UNKNOWN_MATERIAL');
    expect(planningGroupRefusal({ kind: 'move', group: g03, materialCodes: ['A'] }, world)).toBeNull();
  });

  it('MIXED_SAP_GROUP — a group never mixes 2 SAP groups (MR-8 AC-04)', () => {
    const r = planningGroupRefusal({ kind: 'move', group: g03, materialCodes: ['A', 'C'] }, world);
    expect(r?.code).toBe('MIXED_SAP_GROUP');
    expect(r?.detail).toContain('C is in SAP group MG-20');
    expect(planningGroupRefusal({ kind: 'move', group: g03, materialCodes: ['A', 'B'] }, world)).toBeNull();
  });

  it('ALREADY_IN_GROUP — a material already in the group', () => {
    const def = { id: 'pg-MG-03', sapMaterialGroup: 'MG-03' };
    expect(planningGroupRefusal({ kind: 'move', group: def, materialCodes: ['A'] }, world)?.code).toBe('ALREADY_IN_GROUP');
    expect(planningGroupRefusal({ kind: 'move', group: g03, materialCodes: ['A'] }, world)).toBeNull();
  });

  it('RETIRE_NOT_EMPTY — only an empty group retires (MR-8 BR-03)', () => {
    expect(planningGroupRefusal({ kind: 'retire', group: { id: 'pg-MG-03', materials: ['A'] } }, world)?.code).toBe('RETIRE_NOT_EMPTY');
    expect(planningGroupRefusal({ kind: 'retire', group: { id: 'pg-0001', materials: [] } }, world)).toBeNull();
  });
});

describe('MR-8 AC-02 — a split of MG-03 into 2 groups yields 2 plans, demand summed per group', () => {
  const HORIZON_NOW = '2026-09-09T03:00:00.000Z';
  const entry = (code: string, planningGroupId?: string): MaterialMasterEntry =>
    ({ materialCode: code, materialGroup: 'MG-03', canonicalUom: 'KG', planningGroupId }) as MaterialMasterEntry;
  const ltp = (materialCode: string, forecastQty: number) => ({
    supplierId: 's',
    materialCode,
    periodStart: '2026-09-07',
    periodEnd: '2026-09-13',
    forecastQty,
  });
  const input = (master: (c: string) => MaterialMasterEntry | null) => ({
    assignments: [
      { supplierId: 's', materialCode: 'A' },
      { supplierId: 's', materialCode: 'B' },
    ],
    master,
    supplierName: () => 'S',
    submissions: [],
    ltpLines: [ltp('A', 700), ltp('B', 300)],
  });

  it('before: one default plan for MG-03 with both materials; after: 2 plans whose demand adds up to it', () => {
    const before = buildCapacityPlans(input((c) => entry(c, 'pg-MG-03')), HORIZON_NOW);
    expect(before.map((p) => [p.planningGroupId, p.materials, p.weeks[0].demand])).toEqual([['pg-MG-03', ['A', 'B'], 1000]]);

    const split = buildCapacityPlans(input((c) => entry(c, c === 'B' ? 'pg-0001' : 'pg-MG-03')), HORIZON_NOW);
    expect(split.map((p) => [p.planningGroupId, p.materials, p.weeks[0].demand])).toEqual([
      ['pg-0001', ['B'], 300],
      ['pg-MG-03', ['A'], 700],
    ]);
    expect(split.reduce((s, p) => s + p.weeks[0].demand, 0)).toBe(before[0].weeks[0].demand);
  });
});

describe('needsReEntry — MR-8 BR-05, derived from the move time', () => {
  const move = (at: string, groupId = 'pg-0001', fromGroupIds = ['pg-MG-03']) =>
    ({ kind: 'moved', groupId, fromGroupIds, materialCodes: ['B'], at, by: NO_PERSON }) as const;
  const supplies = (c: string) => c === 'B';
  const MOVE_AT = '2026-09-16T03:00:00.000Z'; // a Wednesday

  it('marks the week of the move and every later week, on both groups, for a submission before the move', () => {
    for (const group of ['pg-0001', 'pg-MG-03']) {
      expect(needsReEntry([move(MOVE_AT)], supplies, group, '2026-09-10T00:00:00.000Z', '2026-09-14')).toBe(true);
      expect(needsReEntry([move(MOVE_AT)], supplies, group, '2026-09-10T00:00:00.000Z', '2026-10-05')).toBe(true);
    }
  });

  it('past weeks keep their group: a week that ended before the move is not marked', () => {
    expect(needsReEntry([move(MOVE_AT)], supplies, 'pg-MG-03', '2026-09-01T00:00:00.000Z', '2026-09-07')).toBe(false);
  });

  it('a submission at or after the move is the re-entry; another group or supplier is untouched', () => {
    expect(needsReEntry([move(MOVE_AT)], supplies, 'pg-MG-03', MOVE_AT, '2026-09-21')).toBe(false);
    expect(needsReEntry([move(MOVE_AT)], supplies, 'pg-MG-20', '2026-09-10T00:00:00.000Z', '2026-09-21')).toBe(false);
    expect(needsReEntry([move(MOVE_AT)], () => false, 'pg-MG-03', '2026-09-10T00:00:00.000Z', '2026-09-21')).toBe(false);
  });
});
