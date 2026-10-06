// ────────────────────────────────────────────────────────────────────────────
// RFx authoring rules — the pure predicates the verbs, the editors and the
// template store all read. Every rule is probed BOTH WAYS: a known-bad refused
// by name beside a known-good that differs in the one field the rule is about.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  answerRefusal,
  customSectionsRefusal,
  invalidAnswers,
  invalidTermAnswers,
  isAnswered,
  rfiQuestionRefusal,
  rfiQuestionsRefusal,
  rfpPricingAnswerRefusal,
  rfpPricingRequestRefusal,
  rfpTermsRefusal,
  termValueFits
} from './rfxRules';
import { RFX_QUESTION_TYPES } from '../sourcing/rfxConfig';
/** @import { RfiAnswer, RfiQuestion, RfiQuestionType, RfpPricingRequest, RfpTermRow } from '../sourcing/types' */

/**
 * @param {RfiQuestionType} type
 * @param {Partial<RfiQuestion>} [extra]
 * @returns {RfiQuestion}
 */
const q = (type, extra = {}) => ({
  id: `q-${type}`,
  sectionId: 'event',
  promptKey: `Ask ${type}`,
  type,
  required: true,
  ...(type === 'singleChoice' || type === 'multipleChoice'
    ? { options: ['o1', 'o2'], optionLabels: { o1: 'Roll', o2: 'Sheet' } }
    : {}),
  ...(type === 'money' || type === 'priceRange' ? { currency: /** @type {const} */ ('IDR') } : {}),
  ...extra
});

/**
 * One GOOD and one BAD answer for every kind the build renders.
 * @type {Record<RfiQuestionType, { good: Omit<RfiAnswer, 'questionId'>; bad: Omit<RfiAnswer, 'questionId'>; code: string }>}
 */
const CASES = {
  text: { good: { value: 'Mark Andy P5' }, bad: { value: 42 }, code: 'notText' },
  longText: {
    good: { value: 'Artwork, plate, print, die-cut, pack.' },
    bad: { value: 7 },
    code: 'notText'
  },
  yesNo: { good: { value: 'yes' }, bad: { value: 'maybe' }, code: 'notYesNo' },
  singleChoice: { good: { value: 'o1' }, bad: { value: 'o9' }, code: 'notAnOption' },
  multipleChoice: {
    good: { value: ['o1', 'o2'] },
    bad: { value: ['o1', 'o9'] },
    code: 'notAnOption'
  },
  numberWithUnit: { good: { value: 6 }, bad: { value: 'six' }, code: 'notANumber' },
  money: { good: { value: 1_250_000 }, bad: { value: -5 }, code: 'belowZero' },
  percentage: { good: { value: 0.5 }, bad: { value: 140 }, code: 'aboveHundred' },
  date: { good: { value: '2026-10-05' }, bad: { value: '2026-02-30' }, code: 'notADate' },
  priceRange: {
    good: { range: { min: 210, max: 260 } },
    bad: { range: { min: 300, max: 260 } },
    code: 'rangeInverted'
  },
  attachment: {
    good: {
      attachments: [
        {
          id: 'att-1',
          name: 'labels.pdf',
          size: 1200,
          type: 'application/pdf',
          addedAt: '2026-09-21T03:00:00.000Z'
        }
      ]
    },
    bad: {
      attachments: [
        { id: 'att-2', name: '', size: 1, type: '', addedAt: '2026-09-21T03:00:00.000Z' }
      ]
    },
    code: 'attachmentMalformed'
  }
};

describe('every question kind — answered, and validated both ways', () => {
  it('POPULATION — the cases cover EXACTLY the kinds the build offers', () => {
    expect(Object.keys(CASES).sort()).toEqual([...RFX_QUESTION_TYPES].sort());
    expect(RFX_QUESTION_TYPES).toContain('priceRange');
  });

  it.each(RFX_QUESTION_TYPES)(
    '%s — a fitting answer passes, a misfit is refused by code',
    (type) => {
      const question = q(type);
      const { good, bad, code } = CASES[type];
      expect(isAnswered({ questionId: question.id, ...good })).toBe(true);
      expect(answerRefusal(question, { questionId: question.id, ...good })).toBeNull();
      expect(answerRefusal(question, { questionId: question.id, ...bad })).toBe(code);
    }
  );

  it('an UNANSWERED optional question is legal — the missing-answer rule is a different rule', () => {
    expect(answerRefusal(q('date', { required: false }), undefined)).toBeNull();
    expect(
      answerRefusal(q('priceRange'), { questionId: 'x', range: { min: 5, max: Number.NaN } })
    ).toBeNull();
  });

  it('min / max bound a number, and the refusal names which end', () => {
    const colours = q('numberWithUnit', { min: 1, max: 10 });
    expect(answerRefusal(colours, { questionId: colours.id, value: 0 })).toBe('belowMin');
    expect(answerRefusal(colours, { questionId: colours.id, value: 11 })).toBe('aboveMax');
    expect(answerRefusal(colours, { questionId: colours.id, value: 10 })).toBeNull();
  });

  it('invalidAnswers names the questions, not a count', () => {
    const qs = [q('yesNo'), q('percentage')];
    expect(
      invalidAnswers(qs, [
        { questionId: 'q-yesNo', value: 'yes' },
        { questionId: 'q-percentage', value: 101 }
      ])
    ).toEqual(['q-percentage']);
  });
});

describe('the question editor rules (BL-36 option editor)', () => {
  it('KNOWN-GOOD — a choice with two distinct labelled options is accepted', () => {
    expect(rfiQuestionRefusal(q('singleChoice'))).toBeNull();
  });

  it('KNOWN-BAD — one option, a blank label, or a repeated label is refused by name', () => {
    expect(
      rfiQuestionRefusal(q('singleChoice', { options: ['o1'], optionLabels: { o1: 'Roll' } }))
    ).toMatch(/^CHOICE_NEEDS_OPTIONS/);
    expect(
      rfiQuestionRefusal(
        q('multipleChoice', { options: ['o1', 'o2'], optionLabels: { o1: 'Roll', o2: ' ' } })
      )
    ).toMatch(/^OPTION_BLANK/);
    expect(
      rfiQuestionRefusal(
        q('multipleChoice', { options: ['o1', 'o2'], optionLabels: { o1: 'Roll', o2: 'roll' } })
      )
    ).toMatch(/^OPTION_DUPLICATE/);
  });

  it('bounds only on number kinds, min ≤ max, a percentage inside 0–100', () => {
    expect(rfiQuestionRefusal(q('text', { min: 1 }))).toMatch(/^BOUNDS_NOT_APPLICABLE/);
    expect(rfiQuestionRefusal(q('numberWithUnit', { min: 9, max: 3 }))).toMatch(/^BAD_BOUNDS/);
    expect(rfiQuestionRefusal(q('percentage', { max: 120 }))).toMatch(/^BAD_BOUNDS/);
    expect(rfiQuestionRefusal(q('numberWithUnit', { min: 1, max: 10 }))).toBeNull();
  });

  it('money and the indicative price range name a currency PTI accepts', () => {
    expect(rfiQuestionRefusal(q('priceRange', { currency: undefined }))).toMatch(
      /^CURRENCY_REQUIRED/
    );
    expect(rfiQuestionRefusal(q('priceRange'))).toBeNull();
  });

  it('a custom section must exist on the event before a question can sit in it', () => {
    const inCustom = q('text', { sectionId: 'custom-1' });
    expect(rfiQuestionRefusal(inCustom)).toMatch(/^UNKNOWN_SECTION/);
    expect(
      rfiQuestionsRefusal([inCustom], [{ id: 'custom-1', title: 'Printing and finishing' }])
    ).toBeNull();
    expect(customSectionsRefusal([{ id: 'custom-1', title: '' }])).toMatch(
      /^SECTION_TITLE_REQUIRED/
    );
  });

  it('an off-list kind and a duplicate id are refused', () => {
    expect(
      rfiQuestionRefusal({ ...q('text'), type: /** @type {RfiQuestionType} */ ('essay') })
    ).toMatch(/^UNKNOWN_QUESTION_TYPE/);
    expect(rfiQuestionsRefusal([q('text'), q('text')])).toMatch(/^DUPLICATE_QUESTION/);
  });
});

describe('RFP custom terms — the refusals, both ways', () => {
  /** @type {RfpTermRow} */
  const dosage = {
    termId: 'custom-1',
    label: 'Pump dosage per stroke',
    group: 'quality',
    valueKind: 'numberWithUnit',
    unit: 'ml',
    requestedValue: '1.5'
  };

  it('KNOWN-GOOD — a labelled custom number term with a numeric request is accepted', () => {
    expect(rfpTermsRefusal([dosage])).toBeNull();
  });

  it('KNOWN-BAD — each missing piece is refused by its own name', () => {
    expect(rfpTermsRefusal([{ ...dosage, label: '  ' }])).toMatch(/^CUSTOM_TERM_LABEL_REQUIRED/);
    expect(rfpTermsRefusal([{ ...dosage, requestedValue: 'about one and a half' }])).toMatch(
      /^TERM_VALUE_INVALID/
    );
    expect(rfpTermsRefusal([{ ...dosage, requestedValue: '' }])).toMatch(/^TERM_VALUE_REQUIRED/);
    expect(
      rfpTermsRefusal([{ ...dosage, valueKind: /** @type {RfpTermRow['valueKind']} */ ('range') }])
    ).toMatch(/^UNKNOWN_VALUE_KIND/);
    expect(
      rfpTermsRefusal([{ ...dosage, group: /** @type {RfpTermRow['group']} */ ('misc') }])
    ).toMatch(/^UNKNOWN_TERM_GROUP/);
    expect(rfpTermsRefusal([dosage, dosage])).toMatch(/^DUPLICATE_TERM/);
  });

  it('a choice term needs two distinct options and asks for one of them', () => {
    /** @type {RfpTermRow} */
    const owner = {
      termId: 'custom-2',
      label: 'Formula ownership',
      valueKind: 'choice',
      options: ['PTI owns the formula', 'Shared'],
      requestedValue: 'PTI owns the formula'
    };
    expect(rfpTermsRefusal([owner])).toBeNull();
    expect(rfpTermsRefusal([{ ...owner, options: ['Shared'] }])).toMatch(
      /^CHOICE_TERM_NEEDS_OPTIONS/
    );
    expect(rfpTermsRefusal([{ ...owner, requestedValue: 'Nobody' }])).toMatch(
      /^TERM_VALUE_INVALID/
    );
  });

  it('⚠️ an off-list id WITHOUT the custom prefix is still refused — the standard list holds', () => {
    expect(rfpTermsRefusal([{ termId: 'inventedTerm', label: 'x', requestedValue: '1' }])).toMatch(
      /^UNKNOWN_TERM/
    );
    // KNOWN-GOOD twin: a standard term needs no label.
    expect(rfpTermsRefusal([{ termId: 'paymentTerms', requestedValue: '60 days' }])).toBeNull();
  });

  it('a standard number term reads its kind from the list; a supplier value must fit it', () => {
    expect(termValueFits({ termId: 'leadTime', requestedValue: '' }, '21')).toBe(true);
    expect(termValueFits({ termId: 'leadTime', requestedValue: '' }, 'three weeks')).toBe(false);
    expect(
      invalidTermAnswers(
        [{ termId: 'leadTime', requestedValue: '21' }, dosage],
        [
          { termId: 'leadTime', proposedValue: 'soon', stance: 'deviate', comment: 'c' },
          { termId: 'custom-1', proposedValue: '1.5', stance: 'comply' }
        ]
      )
    ).toEqual(['leadTime']);
  });
});

describe('RFP indicative pricing — the request and the answer', () => {
  /** @type {RfpPricingRequest} */
  const request = {
    options: [
      { id: 'opt-full-set', title: 'Full set' },
      { id: 'opt-pump-cap', title: 'Pump and cap only' }
    ],
    quantityPoints: [10_000, 50_000, 100_000],
    quantityBasis: 'total',
    samplesRequested: true
  };

  it('KNOWN-GOOD request, then each malformation refused by name', () => {
    expect(rfpPricingRequestRefusal(request)).toBeNull();
    expect(rfpPricingRequestRefusal({ ...request, options: [] })).toMatch(/^PRICING_NO_OPTIONS/);
    expect(rfpPricingRequestRefusal({ ...request, quantityPoints: [] })).toMatch(
      /^PRICING_QTY_COUNT/
    );
    expect(rfpPricingRequestRefusal({ ...request, quantityPoints: [50_000, 10_000] })).toMatch(
      /^PRICING_QTY_ORDER/
    );
    expect(rfpPricingRequestRefusal({ ...request, quantityPoints: [10.5] })).toMatch(
      /^PRICING_QTY_INVALID/
    );
    expect(rfpPricingRequestRefusal({ ...request, options: [{ id: 'a', title: '' }] })).toMatch(
      /^PRICING_OPTION_TITLE/
    );
  });

  it('a supplier prices a SUBSET, may add its OWN option, and states the sample offer', () => {
    const ok = {
      prices: [
        { optionId: 'opt-full-set', qty: 10_000, unitPrice: 4_850 },
        { optionId: 'sup-opt-1', qty: 50_000, unitPrice: 3_600 }
      ],
      proposedOptions: [{ id: 'sup-opt-1', title: 'Stock bottle with 24/410 pump' }],
      sample: { canSample: true, readyDate: '2026-10-20' },
      validUntil: '2027-01-31'
    };
    expect(rfpPricingAnswerRefusal(request, ok)).toBeNull();
    expect(rfpPricingAnswerRefusal(request, { ...ok, prices: [] })).toMatch(/^PRICING_EMPTY/);
    expect(rfpPricingAnswerRefusal(request, { ...ok, proposedOptions: [] })).toMatch(
      /^PRICE_UNKNOWN_OPTION/
    );
    expect(
      rfpPricingAnswerRefusal(request, {
        ...ok,
        prices: [{ optionId: 'opt-full-set', qty: 20_000, unitPrice: 1 }]
      })
    ).toMatch(/^PRICE_UNKNOWN_QTY/);
    expect(
      rfpPricingAnswerRefusal(request, {
        ...ok,
        prices: [{ optionId: 'opt-full-set', qty: 10_000, unitPrice: 0 }]
      })
    ).toMatch(/^PRICE_INVALID/);
    const { sample: _dropped, ...noSample } = ok;
    expect(rfpPricingAnswerRefusal(request, noSample)).toMatch(/^SAMPLE_OFFER_REQUIRED/);
    expect(rfpPricingAnswerRefusal({ ...request, samplesRequested: false }, noSample)).toBeNull();
    expect(
      rfpPricingAnswerRefusal(request, { ...ok, proposedOptions: [{ id: 'opt-mine', title: 'x' }] })
    ).toMatch(/^PROPOSED_OPTION_INVALID/);
  });

  it('an RFP that asks no pricing refuses a pricing answer, and needs none', () => {
    expect(rfpPricingAnswerRefusal(undefined, undefined)).toBeNull();
    expect(rfpPricingAnswerRefusal(undefined, { prices: [], proposedOptions: [] })).toMatch(
      /^PRICING_NOT_ASKED/
    );
  });
});
