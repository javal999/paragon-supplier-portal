// ────────────────────────────────────────────────────────────────────────────
// The RFx rules (REQ-E03-01 to REQ-E03-05), probed as the pure functions they
// are — no store, no clock of their own, an injected `now` everywhere a date is
// judged.
//
// The two things worth saying about what is asserted here:
//   · THE BOUNDARIES, not the middle. A scoring rule that is right at 50 and
//     wrong at 0 and 100 is wrong where it decides anything.
//   · "NO HISTORY" IS NOT ZERO, in both directions: a supplier with nothing
//     measured scores 50, and a supplier MEASURED at 0 scores 0.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { SupplierStatus } from '@app-types/supplier.types';
import {
  NO_HISTORY_RELIABILITY,
  awardFollowsBestScore,
  complianceScoreFor,
  daysToDeadline,
  deviationsWithoutComment,
  effectiveDeadline,
  filterInvitees,
  isClosingSoon,
  isExtension,
  isInvitedToRound,
  isPastDeadline,
  isSelectableSupplier,
  missingRequiredAnswers,
  questionPoints,
  quoteLinesRefusal,
  quoteLinesTotal,
  reliabilityScoreFor,
  rfiResponseScore,
  unansweredTerms,
  type InviteeCandidate,
} from './rfxRules';
import type { RfiQuestion } from '../sourcing/types';

const NOW = '2026-08-31T03:00:00.000Z';

const candidate = (
  supplierId: string,
  category: string,
  purchasingGroup: string | undefined,
  status: SupplierStatus,
  otif: number | null,
): InviteeCandidate => ({
  supplierId,
  supplierName: supplierId,
  category,
  purchasingGroup,
  status,
  otif,
  country: 'ID',
  // BL-52 — every candidate now carries its certificate validity and band. The
  // values here are neutral: no BR-01 assertion below sets a BR-05 filter.
  certificates: 'valid',
  band: 'noHistory',
});

const POOL: readonly InviteeCandidate[] = [
  candidate('a', 'Packaging', '101', SupplierStatus.ACTIVE, 90),
  candidate('b', 'Packaging', '104', SupplierStatus.ACTIVE, 79),
  candidate('c', 'Packaging', '101', SupplierStatus.ACTIVE, null),
  candidate('d', 'Packaging', '101', SupplierStatus.SUSPENDED, 75),
  candidate('e', 'Packaging', '101', SupplierStatus.BLACKLISTED, 54),
  candidate('f', 'Packaging', '101', SupplierStatus.ONBOARDING, 80),
  candidate('g', 'Raw Material', '102', SupplierStatus.ACTIVE, 91),
  candidate('h', 'Packaging', undefined, SupplierStatus.ACTIVE, 88),
];

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-01 — the invitee filter
// ─────────────────────────────────────────────────────────────────────────────

describe('REQ-E03-01 — who may be invited', () => {
  it('CONTROL — the pool holds each status the rule discriminates on', () => {
    expect(POOL.map((c) => c.status)).toContain(SupplierStatus.ACTIVE);
    expect(POOL.map((c) => c.status)).toContain(SupplierStatus.SUSPENDED);
    expect(POOL.map((c) => c.status)).toContain(SupplierStatus.BLACKLISTED);
  });

  it('AC-03 — suspended, blacklisted and not-yet-active suppliers are not candidates at all', () => {
    expect(isSelectableSupplier(SupplierStatus.ACTIVE)).toBe(true);
    expect(isSelectableSupplier(SupplierStatus.SUSPENDED)).toBe(false);
    expect(isSelectableSupplier(SupplierStatus.BLACKLISTED)).toBe(false);
    // The status gate runs with NO filter set, which is the case a
    // filter-shaped implementation would miss.
    expect(filterInvitees(POOL).map((c) => c.supplierId)).toEqual(['a', 'b', 'c', 'g', 'h']);
  });

  it('AC-01 — category and purchasing group, alone and combined', () => {
    expect(filterInvitees(POOL, { category: 'Packaging' }).map((c) => c.supplierId)).toEqual([
      'a',
      'b',
      'c',
      'h',
    ]);
    expect(filterInvitees(POOL, { purchasingGroup: '101' }).map((c) => c.supplierId)).toEqual(['a', 'c']);
    expect(
      filterInvitees(POOL, { category: 'Packaging', purchasingGroup: '104' }).map((c) => c.supplierId),
    ).toEqual(['b']);
    // KNOWN-BAD — a combination nothing satisfies is EMPTY, never everything.
    expect(filterInvitees(POOL, { category: 'Raw Material', purchasingGroup: '101' })).toEqual([]);
  });

  it('a supplier the master has assigned to no group matches no group filter, and is still a candidate', () => {
    expect(filterInvitees(POOL, { purchasingGroup: '101' }).map((c) => c.supplierId)).not.toContain('h');
    expect(filterInvitees(POOL).map((c) => c.supplierId)).toContain('h');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CR-15 — the reliability axis
// ─────────────────────────────────────────────────────────────────────────────

describe('CR-15 — reliability comes from OTIF, and "No history" is not zero', () => {
  it('a measured OTIF passes through, at both ends of the scale', () => {
    expect(reliabilityScoreFor(100)).toBe(100);
    expect(reliabilityScoreFor(82)).toBe(82);
  });

  it('⚠️ THE ONE THAT MATTERS — a MEASURED zero scores 0, and no history scores 50', () => {
    // `|| 50` would promote a supplier that failed every delivery to the
    // middle of the field. `?? 50` is what keeps the two apart.
    expect(reliabilityScoreFor(0)).toBe(0);
    expect(reliabilityScoreFor(null)).toBe(NO_HISTORY_RELIABILITY);
    expect(reliabilityScoreFor(undefined)).toBe(NO_HISTORY_RELIABILITY);
    expect(NO_HISTORY_RELIABILITY).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Deadlines
// ─────────────────────────────────────────────────────────────────────────────

describe('deadlines are derived from an injected clock, never stored', () => {
  it('the deadline DAY is inclusive — the boundary, not the middle', () => {
    expect(isPastDeadline('2026-08-31', NOW)).toBe(false); // the day itself
    expect(isPastDeadline('2026-09-01', NOW)).toBe(false);
    expect(isPastDeadline('2026-08-30', NOW)).toBe(true);
  });

  it('closing-soon is a window, and a passed deadline is never "closing soon"', () => {
    expect(isClosingSoon('2026-09-02', NOW)).toBe(true);
    expect(isClosingSoon('2026-09-10', NOW)).toBe(false);
    expect(isClosingSoon('2026-08-20', NOW)).toBe(false);
    expect(daysToDeadline('2026-09-03', NOW)).toBe(3);
  });

  it('an invitee’s own extension is the deadline in force; otherwise the event’s', () => {
    const invitees = [{ supplierId: 'a' }, { supplierId: 'b', deadline: '2026-09-20' }];
    expect(effectiveDeadline('2026-09-05', invitees, 'a')).toBe('2026-09-05');
    expect(effectiveDeadline('2026-09-05', invitees, 'b')).toBe('2026-09-20');
    // A supplier the list does not name falls back to the event's, not to undefined.
    expect(effectiveDeadline('2026-09-05', invitees, 'z')).toBe('2026-09-05');
  });

  it('an extension moves LATER — both directions', () => {
    expect(isExtension('2026-09-05', '2026-09-10')).toBe(true);
    expect(isExtension('2026-09-05', '2026-09-01')).toBe(false);
    expect(isExtension('2026-09-05', '2026-09-05')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-02 — required answers and the response score
// ─────────────────────────────────────────────────────────────────────────────

const q = (over: Partial<RfiQuestion> & Pick<RfiQuestion, 'id' | 'type'>): RfiQuestion => ({
  sectionId: 'capability',
  promptKey: `rfx.q.${over.id}`,
  required: false,
  ...over,
} as RfiQuestion);

describe('REQ-E03-02 — a required question blocks sending', () => {
  const questions = [
    q({ id: 'r1', type: 'text', required: true }),
    q({ id: 'r2', type: 'numberWithUnit', required: true }),
    q({ id: 'o1', type: 'text', required: false }),
  ];

  it('names the unanswered required questions, and only those', () => {
    expect(missingRequiredAnswers(questions, [])).toEqual(['r1', 'r2']);
    expect(missingRequiredAnswers(questions, [{ questionId: 'r1', value: 'stated' }])).toEqual(['r2']);
    expect(
      missingRequiredAnswers(questions, [
        { questionId: 'r1', value: 'stated' },
        { questionId: 'r2', value: 3 },
      ]),
    ).toEqual([]);
  });

  it('⚠️ whitespace and an empty list are NOT answers; a typed 0 IS one', () => {
    expect(missingRequiredAnswers(questions, [{ questionId: 'r1', value: '   ' }])).toContain('r1');
    expect(missingRequiredAnswers(questions, [{ questionId: 'r1', value: [] }])).toContain('r1');
    // A stated zero is a real answer — the same distinction the quantity floor
    // draws elsewhere in this tree.
    expect(missingRequiredAnswers(questions, [{ questionId: 'r2', value: 0 }])).not.toContain('r2');
  });
});

describe('REQ-E03-02 — the response score shortlists, and says so by refusing to exist', () => {
  it('returns null when the event weights nothing — never a 0 that reads as a bad supplier', () => {
    expect(rfiResponseScore([q({ id: 'a', type: 'text' })], [{ questionId: 'a', value: 'x' }])).toBeNull();
  });

  it('a yes/no question scores its option map at both ends', () => {
    const question = q({ id: 'y', type: 'yesNo', weight: 2, optionScores: { yes: 100, no: 0 } });
    expect(questionPoints(question, { questionId: 'y', value: 'yes' })).toBe(100);
    expect(questionPoints(question, { questionId: 'y', value: 'no' })).toBe(0);
    // Unanswered is 0 — a weighted question nobody answered earns nothing.
    expect(questionPoints(question, undefined)).toBe(0);
  });

  it('a numeric scale is LINEAR AND CLAMPED, and works when best sits BELOW worst', () => {
    const higher = q({ id: 'n', type: 'numberWithUnit', weight: 1, scale: { worst: 0, best: 10 } });
    expect(questionPoints(higher, { questionId: 'n', value: 0 })).toBe(0);
    expect(questionPoints(higher, { questionId: 'n', value: 5 })).toBe(50);
    expect(questionPoints(higher, { questionId: 'n', value: 10 })).toBe(100);
    // Past the best value the score CLAMPS rather than running past 100.
    expect(questionPoints(higher, { questionId: 'n', value: 25 })).toBe(100);

    // Fewer days is better: `best` below `worst`, same function, no flag.
    const lower = q({ id: 'd', type: 'numberWithUnit', weight: 1, scale: { worst: 60, best: 7 } });
    expect(questionPoints(lower, { questionId: 'd', value: 7 })).toBe(100);
    expect(questionPoints(lower, { questionId: 'd', value: 60 })).toBe(0);
    expect(questionPoints(lower, { questionId: 'd', value: 90 })).toBe(0);
  });

  it('a question with no weight is NOT scored — it is read, and returns null', () => {
    expect(questionPoints(q({ id: 'p', type: 'text' }), { questionId: 'p', value: 'prose' })).toBeNull();
    // Text, date and attachment carry no comparable value even WITH a weight.
    expect(
      questionPoints(q({ id: 'p', type: 'text', weight: 3 }), { questionId: 'p', value: 'prose' }),
    ).toBeNull();
  });

  it('the composite is the weighted mean of the scored questions only', () => {
    const questions = [
      q({ id: 'y', type: 'yesNo', weight: 3, optionScores: { yes: 100, no: 0 } }),
      q({ id: 'n', type: 'numberWithUnit', weight: 1, scale: { worst: 0, best: 10 } }),
      q({ id: 'p', type: 'text' }),
    ];
    const score = rfiResponseScore(questions, [
      { questionId: 'y', value: 'yes' },
      { questionId: 'n', value: 5 },
      { questionId: 'p', value: 'prose' },
    ])!;
    // (3×100 + 1×50) / 4 = 87.5 → 88. The unweighted question is not in the mean.
    expect(score.score).toBe(88);
    expect(score.weightedQuestions).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-04 — terms
// ─────────────────────────────────────────────────────────────────────────────

describe('REQ-E03-04 — a deviation carries a comment, and compliance is a share', () => {
  it('names the deviations with no comment, and only those', () => {
    const answers = [
      { termId: 'a', proposedValue: '1', stance: 'deviate' as const },
      { termId: 'b', proposedValue: '2', stance: 'deviate' as const, comment: '   ' },
      { termId: 'c', proposedValue: '3', stance: 'deviate' as const, comment: 'because' },
      { termId: 'd', proposedValue: '4', stance: 'comply' as const },
    ];
    expect(deviationsWithoutComment(answers)).toEqual(['a', 'b']);
    expect(complianceScoreFor(answers)).toBe(25);
  });

  it('an unanswered or blank term is unanswered; a stated one is not', () => {
    const terms = [
      { termId: 'a', requestedValue: 'x' },
      { termId: 'b', requestedValue: 'y' },
    ];
    expect(unansweredTerms(terms, [])).toEqual(['a', 'b']);
    expect(unansweredTerms(terms, [{ termId: 'a', proposedValue: '  ', stance: 'comply' }])).toEqual([
      'a',
      'b',
    ]);
    expect(
      unansweredTerms(terms, [
        { termId: 'a', proposedValue: 'ok', stance: 'comply' },
        { termId: 'b', proposedValue: 'ok', stance: 'comply' },
      ]),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-05 — rounds, split and quote lines
// ─────────────────────────────────────────────────────────────────────────────

describe('REQ-E03-05 — the shortlist and the split', () => {
  it('only an invited supplier may revise', () => {
    expect(isInvitedToRound(['a', 'b'], 'a')).toBe(true);
    expect(isInvitedToRound(['a', 'b'], 'c')).toBe(false);
    expect(isInvitedToRound([], 'a')).toBe(false);
  });

  it('BR-07 — a split that INCLUDES the best quote follows it; one that leaves it out does not', () => {
    const lines = [
      { supplierId: 'a', quotationId: 'q1', itemCode: 'X', sharePct: 70, quantity: 7 },
      { supplierId: 'b', quotationId: 'q2', itemCode: 'X', sharePct: 30, quantity: 3 },
    ];
    expect(awardFollowsBestScore(lines, 'q1')).toBe(true);
    expect(awardFollowsBestScore(lines, 'q2')).toBe(true);
    expect(awardFollowsBestScore(lines, 'q3')).toBe(false);
    // ⚠️ An UNRANKABLE set has nothing to depart from, so no reason is demanded.
    expect(awardFollowsBestScore(lines, null)).toBe(true);
  });
});

describe('REQ-E03-03 — a quote per item', () => {
  const lines = [
    { lineNo: 1, materialCode: 'X', quantity: 100, unitPrice: 10 },
    { lineNo: 2, materialCode: 'Y', quantity: 50, unitPrice: 4 },
  ];

  it('the total is the sum of the lines', () => {
    expect(quoteLinesTotal(lines)).toBe(1_200);
    expect(quoteLinesTotal([])).toBe(0);
  });

  it('absent lines are LEGAL; malformed lines are refused by name', () => {
    expect(quoteLinesRefusal([])).toBeNull();
    expect(quoteLinesRefusal(lines)).toBeNull();
    expect(quoteLinesRefusal([{ ...lines[0], quantity: 0 }])).toMatch(/QUOTE_LINE_QTY/);
    expect(quoteLinesRefusal([{ ...lines[0], unitPrice: -1 }])).toMatch(/QUOTE_LINE_PRICE/);
    expect(quoteLinesRefusal([{ ...lines[0], materialCode: '' }])).toMatch(/QUOTE_LINE_MATERIAL/);
    expect(quoteLinesRefusal([lines[0], { ...lines[1], materialCode: 'X' }])).toMatch(
      /QUOTE_LINE_DUPLICATE/,
    );
  });
});
