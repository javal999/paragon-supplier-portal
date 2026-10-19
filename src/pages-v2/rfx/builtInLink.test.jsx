// BL-215 — a STORED link from a buyer question to the built-in field it repeats
// (`RfiQuestion.builtIn`): set in the RFP and RFQ question editors, read FIRST
// by `builtInDuplicates`, with the word match kept only for questions without
// the link. The answer still fills the built-in field on send.
import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { renderWithProviders } from '@test/test-utils';
import { builtInRefusal, RFX_BUILT_IN_FIELDS } from '@services/sourcing/rfxBuiltIn';
import { rfiQuestionRefusal } from '@services/transitions/rfxRules';
import { rfqCreateRefusal } from '@services/sourcing/rfqModel';
import { builtInDuplicates, builtInLabels, copyAnsweredFields } from './builtInDuplicates';
import { EMPTY_PRICING_ANSWER } from './RfpPricing';
import RfxQuestionEditor from './RfxQuestionEditor';
import { QuestionsOptionsStep } from '../sourcing/RfqAuthoring/components/QuestionsOptionsStep';
/** @import { RfiQuestion } from '@services/sourcing/types' */

const t = /** @type {(k: string, o?: Record<string, unknown>) => string} */ (i18n.t.bind(i18n));
const LABELS = builtInLabels(t, 'rfxa.pricing.sampleDate', 'rfxa.pricing.timeline');

/** A date question whose words do NOT name the sample date — only the link does. @type {RfiQuestion} */
const LINKED_DATE = {
  id: 'q-proto',
  sectionId: 'event',
  promptKey: 'When can the first prototype reach our lab?',
  type: 'date',
  required: true,
  builtIn: 'sampleReadyDate'
};
/** @type {RfiQuestion} */
const LINKED_PLAN = {
  id: 'q-plan',
  sectionId: 'event',
  promptKey: 'Walk us through your plan',
  type: 'longText',
  required: true,
  builtIn: 'developmentTimeline'
};
/** A date question the word match WOULD pick (unlinked). @type {RfiQuestion} */
const WORDED_DATE = {
  id: 'q-sample-ready',
  sectionId: 'event',
  promptKey: 'Sample ready date',
  type: 'date',
  required: true
};

describe('builtInRefusal — BUILT_IN_MISMATCH', () => {
  it('KNOWN-GOOD — a link that fits its question type, or no link, passes', () => {
    expect(builtInRefusal(LINKED_DATE)).toBeNull();
    expect(builtInRefusal(LINKED_PLAN)).toBeNull();
    expect(builtInRefusal({ ...LINKED_PLAN, type: 'text' })).toBeNull();
    expect(builtInRefusal(WORDED_DATE)).toBeNull();
  });
  it('KNOWN-BAD — a link the type cannot give, or an unknown field, is refused', () => {
    expect(builtInRefusal({ ...LINKED_DATE, type: 'text' })).toMatch(/^BUILT_IN_MISMATCH: q-proto/);
    expect(builtInRefusal({ ...LINKED_PLAN, type: 'date' })).toMatch(/^BUILT_IN_MISMATCH/);
    expect(builtInRefusal({ ...LINKED_DATE, builtIn: 'deliveryDate' })).toMatch(
      /^BUILT_IN_MISMATCH/
    );
  });
  it('the RFI/RFP question rule and the RFQ create rule refuse it by the same function', () => {
    expect(rfiQuestionRefusal(LINKED_DATE)).toBeNull();
    expect(rfiQuestionRefusal({ ...LINKED_DATE, type: 'text' })).toMatch(/^BUILT_IN_MISMATCH/);
    const rfq = { questions: [{ ...LINKED_DATE, type: 'yesNo' }] };
    expect(rfqCreateRefusal(rfq)).toMatch(/^BUILT_IN_MISMATCH/);
    expect(rfqCreateRefusal({ questions: [LINKED_DATE] })).toBeNull();
  });
});

describe('builtInDuplicates — the link first, the words only without it', () => {
  it('a linked question is found though its words name nothing', () => {
    const found = builtInDuplicates([LINKED_DATE, LINKED_PLAN], (q) => q.promptKey, LABELS);
    expect(found.sampleReadyDate?.id).toBe('q-proto');
    expect(found.timeline?.id).toBe('q-plan');
  });
  it('the link wins over a word-matching question listed before it', () => {
    const found = builtInDuplicates([WORDED_DATE, LINKED_DATE], (q) => q.promptKey, LABELS);
    expect(found.sampleReadyDate?.id).toBe('q-proto');
  });
  it('FALLBACK — with no link anywhere the word match still finds the seeded question', () => {
    const found = builtInDuplicates([WORDED_DATE], (q) => q.promptKey, LABELS);
    expect(found.sampleReadyDate?.id).toBe('q-sample-ready');
  });
  it('a question linked elsewhere is not word-matched to this field', () => {
    const linkedToTimeline = {
      ...WORDED_DATE,
      type: /** @type {const} */ ('text'),
      builtIn: /** @type {const} */ ('developmentTimeline')
    };
    const found = builtInDuplicates([linkedToTimeline], (q) => q.promptKey, LABELS);
    expect(found.sampleReadyDate).toBeUndefined();
    expect(found.timeline?.id).toBe('q-sample-ready');
  });
  it('the linked question’s answer still fills the built-in fields on send', () => {
    const dups = builtInDuplicates([LINKED_DATE, LINKED_PLAN], (q) => q.promptKey, LABELS);
    const sent = copyAnsweredFields(
      { ...EMPTY_PRICING_ANSWER, sample: { canSample: true } },
      dups,
      [
        { questionId: 'q-proto', value: '2026-11-09' },
        { questionId: 'q-plan', value: 'Brief to lab sample in 4 weeks.' }
      ]
    );
    expect(sent.sample).toEqual({ canSample: true, readyDate: '2026-11-09' });
    expect(sent.timelineNote).toBe('Brief to lab sample in 4 weeks.');
  });
});

/** The editor in a parent that keeps its value, so an added question shows. */
const Harness = () => {
  const [value, setValue] = useState(
    /** @type {{ questions: readonly RfiQuestion[]; customSections: readonly never[] }} */ ({
      questions: [],
      customSections: []
    })
  );
  return (
    <RfxQuestionEditor
      value={value}
      onChange={(next) => setValue({ questions: next.questions, customSections: [] })}
      defaultCurrency="IDR"
      testIdPrefix="ed"
      builtIns={RFX_BUILT_IN_FIELDS}
    />
  );
};

describe('the RFP question editor — set the link', () => {
  it('a date question offers the sample ready date only, and the added question carries the link', () => {
    renderWithProviders(<Harness />);
    fireEvent.change(screen.getByTestId('ed-oneoff-type'), { target: { value: 'date' } });
    const select = /** @type {HTMLSelectElement} */ (screen.getByTestId('ed-oneoff-builtin'));
    expect([...select.options].map((o) => o.value)).toEqual(['', 'sampleReadyDate']);
    fireEvent.change(screen.getByLabelText('What to ask'), {
      target: { value: 'When can the first prototype reach our lab?' }
    });
    fireEvent.change(select, { target: { value: 'sampleReadyDate' } });
    fireEvent.click(screen.getByTestId('ed-oneoff-add'));
    expect(screen.getByTestId('ed-builtin-event-1')).toHaveTextContent('Fills: Sample ready date');
  });
  it('a number question offers no link; the RFI editor (no builtIns) offers none either', () => {
    renderWithProviders(<Harness />);
    fireEvent.change(screen.getByTestId('ed-oneoff-type'), {
      target: { value: 'numberWithUnit' }
    });
    expect(screen.queryByTestId('ed-oneoff-builtin')).not.toBeInTheDocument();
  });
});

/** The RFQ wizard's questions step in a parent that keeps the draft. */
const RfqHarness = () => {
  const [draft, setDraft] = useState(
    /** @type {import('../sourcing/rfqDraft').RfqAuthoringDraft} */ (
      /** @type {unknown} */ ({
        questions: [],
        allowAlternatives: false,
        samplesOn: false,
        samplesQty: '',
        samplesNeededBy: '',
        confidential: false,
        attachments: []
      })
    )
  );
  return (
    <QuestionsOptionsStep
      draft={draft}
      update={(patch) => setDraft((d) => ({ ...d, ...patch }))}
      refusal={null}
    />
  );
};

describe('the RFQ question editor — set the link', () => {
  it('a date question offers the sample ready date, and the listed question says what it fills', () => {
    renderWithProviders(<RfqHarness />);
    expect(screen.queryByTestId('rfq-q-builtin')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Answer type'), { target: { value: 'date' } });
    const select = /** @type {HTMLSelectElement} */ (screen.getByTestId('rfq-q-builtin'));
    expect([...select.options].map((o) => o.value)).toEqual(['', 'sampleReadyDate']);
    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'When can the first prototype reach our lab?' }
    });
    fireEvent.change(select, { target: { value: 'sampleReadyDate' } });
    fireEvent.click(screen.getByTestId('rfq-q-add'));
    expect(screen.getByTestId('rfq-questions')).toHaveTextContent('Fills: Sample ready date');
  });
});
