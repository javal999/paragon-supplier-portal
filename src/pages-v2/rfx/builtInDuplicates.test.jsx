// ────────────────────────────────────────────────────────────────────────────
// S-06 (RFx UX 2026-10) — the sample asked as Yes or No, and a buyer question
// that asks what a built-in field asks shown once, its answer copied.
// ────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import i18n from '@lib/i18n';
import { renderWithProviders } from '@test/test-utils';
import { builtInDuplicates, builtInLabels, copyAnsweredFields } from './builtInDuplicates';
import { EMPTY_PRICING_ANSWER, RfpPricingForm } from './RfpPricing';
/** @import { RfiQuestion, RfpPricingRequest } from '@services/sourcing/types' */

const t = /** @type {(k: string, o?: Record<string, unknown>) => string} */ (i18n.t.bind(i18n));
const LABELS = builtInLabels(t, 'rfxa.pricing.sampleDate', 'rfxa.pricing.timeline');

/** @type {RfiQuestion} */
const SAMPLE_DATE = {
  id: 'q-sample-ready',
  sectionId: 'event',
  promptKey: 'Sample ready date',
  type: 'date',
  required: true
};
/** @type {RfiQuestion} */
const TIMELINE = {
  id: 'icy-timeline',
  sectionId: 'event',
  promptKey: 'rfx.q.icy-timeline',
  type: 'longText',
  required: true
};
/** @type {RfiQuestion} */
const UNRELATED = {
  id: 'q-ship',
  sectionId: 'event',
  promptKey: 'Can goods ship in the 2nd week of October?',
  type: 'yesNo',
  required: true
};

describe('builtInDuplicates', () => {
  it('KNOWN-GOOD: finds the sample-date and timeline questions, in either language', () => {
    const found = builtInDuplicates(
      [UNRELATED, SAMPLE_DATE, TIMELINE],
      (q) => t(q.promptKey),
      LABELS
    );
    expect(found.sampleReadyDate?.id).toBe('q-sample-ready');
    expect(found.timeline?.id).toBe('icy-timeline');
    const id = builtInDuplicates(
      [{ ...SAMPLE_DATE, promptKey: 'Tanggal sampel siap' }],
      (q) => q.promptKey,
      LABELS
    );
    expect(id.sampleReadyDate?.id).toBe('q-sample-ready');
  });

  it('KNOWN-BAD: a question of another kind, or about something else, is left alone', () => {
    const found = builtInDuplicates(
      [UNRELATED, { ...SAMPLE_DATE, type: 'text' }, { ...TIMELINE, type: 'date' }],
      (q) => t(q.promptKey),
      LABELS
    );
    expect(found).toEqual({});
  });

  it('copies the answer into the built-in field: the timeline always, the date only on a Yes', () => {
    const answers = [
      { questionId: 'icy-timeline', value: 'Brief to lab sample 4 weeks.' },
      { questionId: 'q-sample-ready', value: '2026-11-02' }
    ];
    const dups = { timeline: TIMELINE, sampleReadyDate: SAMPLE_DATE };
    const yes = copyAnsweredFields(
      { ...EMPTY_PRICING_ANSWER, timelineNote: 'old', sample: { canSample: true } },
      dups,
      answers
    );
    expect(yes.timelineNote).toBe('Brief to lab sample 4 weeks.');
    expect(yes.sample).toEqual({ canSample: true, readyDate: '2026-11-02' });
    const no = copyAnsweredFields(
      { ...EMPTY_PRICING_ANSWER, sample: { canSample: false } },
      dups,
      answers
    );
    expect(no.sample).toEqual({ canSample: false });
  });
});

/** @type {RfpPricingRequest} */
const REQUEST = {
  options: [{ id: 'opt-1', title: 'Full set' }],
  quantityPoints: [10_000],
  quantityBasis: 'total',
  samplesRequested: true
};

describe('RfpPricingForm — the sample asked as Yes or No (S-06)', () => {
  it('KNOWN-BAD: unanswered, it says to choose; there is no tick box', () => {
    renderWithProviders(
      <RfpPricingForm
        request={REQUEST}
        currency="IDR"
        value={EMPTY_PRICING_ANSWER}
        onChange={() => {}}
        disabled={false}
        testIdPrefix="p"
        sampleMissing
      />
    );
    expect(screen.getByTestId('p-sample-missing')).toHaveTextContent('Choose Yes or No.');
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByText('Can you provide a sample?')).toBeInTheDocument();
  });

  it('KNOWN-GOOD: "No" is an answer, sent as canSample false', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <RfpPricingForm
        request={REQUEST}
        currency="IDR"
        value={EMPTY_PRICING_ANSWER}
        onChange={onChange}
        disabled={false}
        testIdPrefix="p"
      />
    );
    fireEvent.click(screen.getByTestId('p-can-sample-no'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sample: { canSample: false } })
    );
    expect(screen.queryByTestId('p-sample-missing')).toBeNull();
  });

  it('a field a buyer question already asks is not asked again', () => {
    renderWithProviders(
      <RfpPricingForm
        request={REQUEST}
        currency="IDR"
        value={{ ...EMPTY_PRICING_ANSWER, sample: { canSample: true } }}
        onChange={() => {}}
        disabled={false}
        testIdPrefix="p"
        answeredIn={{ timeline: 'Give a timeline', sampleReadyDate: 'Sample ready date' }}
      />
    );
    expect(screen.queryByLabelText('Timeline')).toBeNull();
    expect(screen.getByTestId('p-timeline-copied')).toHaveTextContent('Give a timeline');
    expect(screen.queryByLabelText('Sample ready date')).toBeNull();
    expect(screen.getByTestId('p-sample-date-copied')).toHaveTextContent('Sample ready date');
  });

  it('KNOWN-GOOD twin — with no such question, the fields are asked here', () => {
    renderWithProviders(
      <RfpPricingForm
        request={REQUEST}
        currency="IDR"
        value={{ ...EMPTY_PRICING_ANSWER, sample: { canSample: true } }}
        onChange={() => {}}
        disabled={false}
        testIdPrefix="p"
      />
    );
    expect(screen.getByLabelText('Timeline')).toBeInTheDocument();
    expect(screen.getByLabelText('Sample ready date')).toBeInTheDocument();
  });
});
