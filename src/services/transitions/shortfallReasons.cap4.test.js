// ─────────────────────────────────────────────────────────────────────────────
// CAP-4 (BL-173) and CAP-5 (BL-174) — the rules half.
//
// CAP-4 BR-01 / BR-02: Force Majeure and Discontinued join both shortfall
// lists and need a note, like Other, in every rule that asks for one (the
// capacity submission, the commitment row, the Submit all period).
// CAP-4 BR-03 (CAP-D2): Discontinued raises a "find another source" alert.
// CAP-5: the reason filter's matching, options and counts, and the PTI
// Capacity address parameter. Every guard is probed both ways.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
/** @import { CapacityPlan } from '../data/types' */
import {
  NOTE_REQUIRED_CODE,
  SHORTFALL_NOTE_REQUIRED_CODES,
  activeReasonCodes,
  reasonCodeStore,
  shortfallReasonNeedsNote
} from './reasonCodes';
import { capacitySubmissionRefusal, commitmentCapacityRefusal } from './capacityRules';
import { shortfallRefusal } from './forecastRules';
import {
  ALERT_RULES,
  PTI_ONLY_RULES,
  deriveAlertConditions,
  discontinuedSubjects
} from './inventoryAlertRules';
import {
  NO_REASON,
  parseReasonParam,
  reasonFilterOptions,
  reasonMatches,
  toggleReason
} from '../../pages-v2/inventory/reasonFilterRules';
import {
  planMatches,
  readCapacityFilters,
  weekMatches,
  withCapacityFilter
} from '../../pages-v2/inventory/capacityFilters';

beforeEach(() => reasonCodeStore.reset());

const NEW_CODES = /** @type {const} */ (['force-majeure', 'discontinued']);

describe('CAP-4 BR-01 — both shortfall lists carry the two new codes, in order', () => {
  it('Capacity, Material, Logistics, Quality, Force Majeure, Discontinued, Other — on both lists', () => {
    for (const list of /** @type {const} */ (['capacityShortfall', 'commitmentShortfall'])) {
      expect(activeReasonCodes(list)).toEqual([
        'capacity',
        'material',
        'logistics',
        'quality',
        'force-majeure',
        'discontinued',
        'other'
      ]);
    }
    // Known-false: the PO adjust list is not a shortfall list and did not change.
    expect(activeReasonCodes('poAdjust')).not.toContain('force-majeure');
  });
});

describe('CAP-4 BR-02 — the note predicate', () => {
  it('Force Majeure, Discontinued and Other need a note; the rest do not', () => {
    expect([...SHORTFALL_NOTE_REQUIRED_CODES]).toEqual(['force-majeure', 'discontinued', 'other']);
    for (const c of [...NEW_CODES, NOTE_REQUIRED_CODE])
      expect(shortfallReasonNeedsNote(c)).toBe(true);
    for (const c of ['capacity', 'material', 'logistics', 'quality', 'machine-breakdown', '', null])
      expect(shortfallReasonNeedsNote(c)).toBe(false);
  });

  const HORIZON = ['2026-09-07', '2026-09-14'];
  /** @param {Record<string, unknown>} w */
  const weeks = (w) => [
    { week: HORIZON[0], allocated: 100 },
    { week: HORIZON[1], ...w }
  ];
  const demand = () => 100;

  it.each(NEW_CODES)(
    'capacity: %s below the LTP is refused without a note, accepted with one',
    (code) => {
      expect(
        capacitySubmissionRefusal(weeks({ allocated: 50, reason: code }), demand, HORIZON)
      ).toEqual({
        refusal: 'noteRequired',
        week: HORIZON[1]
      });
      expect(
        capacitySubmissionRefusal(
          weeks({ allocated: 50, reason: code, note: '  ' }),
          demand,
          HORIZON
        )?.refusal
      ).toBe('noteRequired');
      expect(
        capacitySubmissionRefusal(
          weeks({ allocated: 50, reason: code, note: 'Flood at the plant' }),
          demand,
          HORIZON
        )
      ).toBeNull();
    }
  );

  it('capacity, known-good control: a reason that needs no note passes without one', () => {
    expect(
      capacitySubmissionRefusal(weeks({ allocated: 50, reason: 'material' }), demand, HORIZON)
    ).toBeNull();
  });

  it.each(NEW_CODES)('commitment row: %s below forecast needs a note', (code) => {
    expect(shortfallRefusal(1000, 500, { level1: code })).toBe('noteRequired');
    expect(shortfallRefusal(1000, 500, { level1: code, note: 'Line closed' })).toBeNull();
    // At forecast nothing is asked, whatever the reason.
    expect(shortfallRefusal(1000, 1000, { level1: code })).toBeNull();
  });

  it.each(NEW_CODES)('Submit all period above BE: %s needs a note', (code) => {
    const check = /** @type {Parameters<typeof commitmentCapacityRefusal>[0]} */ ({
      level: 'cannotSupply',
      weeks: [],
      unconfirmedWeek: null,
      redWeek: '2026-09-14'
    });
    expect(commitmentCapacityRefusal(check, { level1: code })).toEqual({
      refusal: 'aboveBeNoteRequired',
      week: '2026-09-14'
    });
    expect(commitmentCapacityRefusal(check, { level1: code, note: 'Plant fire' })).toBeNull();
    expect(commitmentCapacityRefusal(check, { level1: 'capacity' })).toBeNull();
  });

  it('a retired new code is refused as a reason before a note is asked (BL-32)', () => {
    const ok = reasonCodeStore.append({
      list: 'capacityShortfall',
      code: 'force-majeure',
      labelEn: 'Force Majeure',
      labelId: 'Keadaan kahar',
      active: false,
      setBy: { kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' },
      setAt: '2026-10-12T00:00:00.000Z'
    });
    expect(ok).toBe(true);
    expect(
      capacitySubmissionRefusal(
        [
          { week: '2026-09-07', allocated: 100 },
          { week: '2026-09-14', allocated: 50, reason: 'force-majeure', note: 'x' }
        ],
        () => 100,
        ['2026-09-07', '2026-09-14']
      )?.refusal
    ).toBe('reasonRequired');
  });
});

// ── CAP-4 BR-03 (CAP-D2) — the Discontinued alert ───────────────────────────

/**
 * @param {Partial<CapacityPlan>} over
 * @returns {CapacityPlan}
 */
const plan = (over) =>
  /** @type {CapacityPlan} */ ({
    supplierId: 'sup-007',
    supplierName: 'PT Sample Packaging Indonesia',
    planningGroupId: 'pg-MG-20',
    materials: ['PK-PETB-8801', 'PK-PETB-8802'],
    uom: 'PCS',
    weeks: [
      { week: '2026-09-07', demand: 100, entry: { week: '2026-09-07', allocated: 100 } },
      {
        week: '2026-09-21',
        demand: 100,
        entry: { week: '2026-09-21', allocated: 0, reason: 'discontinued', note: 'Mould retired' }
      }
    ],
    latest: null,
    ...over
  });
const NOW = '2026-09-07T03:00:00.000Z';
/** @param {string} c */
const label = (c) => `label ${c}`;

/**
 * @param {Record<string, unknown>} over
 */
const line = (over) =>
  /** @type {Parameters<typeof discontinuedSubjects>[1][number]} */ (
    /** @type {unknown} */ ({
      supplierId: 'sup-005',
      supplierName: 'PT Sample Oils',
      materialCode: 'RM-OIL-1',
      materialLabel: 'Oil',
      periodStart: '2026-09-14',
      forecastQty: 1000,
      committedQty: 0,
      response: { rootCause: { level1: 'discontinued', note: 'Plant closed' } },
      ...over
    })
  );

describe('CAP-4 BR-03 — Discontinued raises "find another source", per supplier × material', () => {
  it('a capacity week below the LTP with Discontinued: one subject per material of the group', () => {
    const subjects = discontinuedSubjects([plan({})], [], label, NOW);
    expect(subjects).toEqual([
      {
        supplierId: 'sup-007',
        supplierName: 'PT Sample Packaging Indonesia',
        materialCode: 'PK-PETB-8801',
        materialLabel: 'label PK-PETB-8801',
        daysToImpact: 14
      },
      {
        supplierId: 'sup-007',
        supplierName: 'PT Sample Packaging Indonesia',
        materialCode: 'PK-PETB-8802',
        materialLabel: 'label PK-PETB-8802',
        daysToImpact: 14
      }
    ]);
  });

  it('known-false: another reason, or a week no longer short, raises nothing', () => {
    const material = plan({
      weeks: [
        {
          week: '2026-09-21',
          demand: 100,
          entry: { week: '2026-09-21', allocated: 0, reason: 'material' }
        }
      ]
    });
    const notShort = plan({
      weeks: [
        {
          week: '2026-09-21',
          demand: 100,
          entry: { week: '2026-09-21', allocated: 100, reason: 'discontinued', note: 'x' }
        }
      ]
    });
    expect(discontinuedSubjects([material, notShort], [], label, NOW)).toEqual([]);
  });

  it('a submitted commitment below forecast with Discontinued; not a draft-less, at-forecast or other-reason line', () => {
    expect(discontinuedSubjects([], [line({})], label, NOW).map((s) => s.materialCode)).toEqual([
      'RM-OIL-1'
    ]);
    expect(
      discontinuedSubjects(
        [],
        [
          line({ committedQty: 1000 }),
          line({ committedQty: null }),
          line({ response: { rootCause: { level1: 'capacity' } } }),
          line({ response: null })
        ],
        label,
        NOW
      )
    ).toEqual([]);
  });

  it('capacity and commitment on the same supplier × material are ONE alert, High, PTI only', () => {
    const both = discontinuedSubjects(
      [plan({})],
      [line({ supplierId: 'sup-007', materialCode: 'PK-PETB-8801', periodStart: '2026-09-07' })],
      label,
      NOW
    );
    expect(both.find((s) => s.materialCode === 'PK-PETB-8801')?.daysToImpact).toBe(0);
    const conditions = deriveAlertConditions([], [], NOW, [], [], both).filter(
      (c) => c.rule === 'supplyDiscontinued'
    );
    expect(conditions.map((c) => c.key)).toEqual([
      'supplyDiscontinued|PK-PETB-8801|sup-007',
      'supplyDiscontinued|PK-PETB-8802|sup-007'
    ]);
    expect(conditions.every((c) => c.riskClass === 'high')).toBe(true);
    expect(ALERT_RULES).toContain('supplyDiscontinued');
    expect(PTI_ONLY_RULES).toContain('supplyDiscontinued');
    // Known-good control: without subjects, no such alert.
    expect(
      deriveAlertConditions([], [], NOW).filter((c) => c.rule === 'supplyDiscontinued')
    ).toEqual([]);
  });
});

// ── CAP-5 — the reason filter ────────────────────────────────────────────────

describe('CAP-5 — the reason filter, pure', () => {
  it('nothing chosen passes everything; a choice passes only its reasons; "No reason" passes the blank ones', () => {
    expect(reasonMatches('discontinued', [])).toBe(true);
    expect(reasonMatches(undefined, [])).toBe(true);
    expect(reasonMatches('discontinued', ['discontinued'])).toBe(true);
    expect(reasonMatches('force-majeure', ['discontinued'])).toBe(false);
    expect(reasonMatches(undefined, ['discontinued'])).toBe(false);
    expect(reasonMatches(undefined, [NO_REASON])).toBe(true);
    expect(reasonMatches('other', [NO_REASON])).toBe(false);
    expect(toggleReason(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleReason(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('BR-03 — the options are the active codes in order, any other code a record carries, then "No reason", each with its count', () => {
    const opts = reasonFilterOptions(activeReasonCodes('commitmentShortfall'), [
      'force-majeure',
      'discontinued',
      'force-majeure',
      undefined,
      'retired-code',
      'force-majeure'
    ]);
    expect(opts).toEqual([
      { id: 'capacity', count: 0 },
      { id: 'material', count: 0 },
      { id: 'logistics', count: 0 },
      { id: 'quality', count: 0 },
      { id: 'force-majeure', count: 3 },
      { id: 'discontinued', count: 1 },
      { id: 'other', count: 0 },
      { id: 'retired-code', count: 1 },
      { id: NO_REASON, count: 1 }
    ]);
  });

  it('the address parameter: codes and "No reason" read back; anything else is malformed', () => {
    expect(parseReasonParam(null)).toEqual({ kind: 'absent' });
    expect(parseReasonParam('force-majeure,_none')).toEqual({
      kind: 'ok',
      value: ['force-majeure', NO_REASON]
    });
    expect(parseReasonParam('force-majeure,<script>')).toEqual({ kind: 'malformed' });
    const f = readCapacityFilters(new URLSearchParams('reason=discontinued'));
    expect(f.reasons).toEqual(['discontinued']);
    expect(f.ignoredMalformed).toBe(false);
    expect(readCapacityFilters(new URLSearchParams('reason=%3Cx%3E')).ignoredMalformed).toBe(true);
    const written = withCapacityFilter(new URLSearchParams('gapsOnly=1'), 'reason', [
      'force-majeure',
      'discontinued'
    ]);
    expect(written.get('reason')).toBe('force-majeure,discontinued');
    expect(withCapacityFilter(written, 'reason', []).has('reason')).toBe(false);
    expect(written.get('gapsOnly')).toBe('1');
  });

  it('BR-02 — a week shows when it passes Gaps only AND the reason; a plan shows when one week does', () => {
    const p = plan({});
    const f = readCapacityFilters(new URLSearchParams('reason=discontinued'));
    expect(p.weeks.filter((w) => weekMatches(w, f)).map((w) => w.week)).toEqual(['2026-09-21']);
    expect(planMatches(p, f)).toBe(true);
    const fm = readCapacityFilters(new URLSearchParams('reason=force-majeure&gapsOnly=1'));
    expect(p.weeks.filter((w) => weekMatches(w, fm))).toEqual([]);
    expect(planMatches(p, fm)).toBe(false);
    // "No reason" with Gaps only: a gap week without a reason — none here.
    const none = readCapacityFilters(new URLSearchParams('reason=_none&gapsOnly=1'));
    expect(p.weeks.filter((w) => weekMatches(w, none))).toEqual([]);
    // Known-good control: no reason filter leaves every week.
    const all = readCapacityFilters(new URLSearchParams(''));
    expect(p.weeks.filter((w) => weekMatches(w, all))).toHaveLength(2);
  });
});
