// ────────────────────────────────────────────────────────────────────────────
// BL-326 — an attachment ANSWER names the caller's note (MR !151 follow-up).
// The file branch forwarded neither `aria-invalid` nor `aria-describedby`, so
// the refusal under the question was announced with no control at all.
// ────────────────────────────────────────────────────────────────────────────

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import RfqQuestionField from './RfqQuestionField';

/** @type {import('@services/sourcing/types').RfiQuestion} */
const ATTACHMENT_QUESTION = {
  id: 'q-att',
  sectionId: 'compliance',
  type: 'attachment',
  required: true,
  promptKey: 'rfxLibrary.q.attachment'
};

describe('BL-326 · an attachment answer carries the refusal that explains it', () => {
  it('the file control is invalid and describes the caller’s note', () => {
    renderWithProviders(
      <>
        <RfqQuestionField
          question={ATTACHMENT_QUESTION}
          answer={undefined}
          onChange={() => {}}
          aria-invalid
          aria-describedby="q-att-note"
        />
        <p id="q-att-note">Attach the datasheet before you send.</p>
      </>
    );
    const file = screen.getByTestId('rfq-q-att-q-att-input');
    expect(file).toHaveAttribute('aria-invalid', 'true');
    expect(file).toHaveAttribute('aria-describedby', 'q-att-note');
    expect(document.getElementById(file.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      'Attach the datasheet before you send.'
    );
  });

  it('KNOWN-GOOD: with no refusal the control is neither invalid nor described', () => {
    renderWithProviders(
      <RfqQuestionField question={ATTACHMENT_QUESTION} answer={undefined} onChange={() => {}} />
    );
    const file = screen.getByTestId('rfq-q-att-q-att-input');
    expect(file).not.toHaveAttribute('aria-invalid');
    expect(file).not.toHaveAttribute('aria-describedby');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// BL-326 — a multiple-choice answer is a GROUP of checkboxes. The old markup
// put `aria-invalid` and `aria-describedby` on the wrapping <div> and pointed
// a `<label htmlFor>` at that div, which labels nothing: no checkbox carried
// the mark or the description, and the prompt named no control.
// ────────────────────────────────────────────────────────────────────────────
/** @type {import('@services/sourcing/types').RfiQuestion} */
const MULTI_QUESTION = {
  id: 'q-multi',
  sectionId: 'compliance',
  type: 'multipleChoice',
  required: true,
  promptKey: 'Pick the certificates you hold',
  options: ['halal', 'bpom', 'iso']
};

describe('BL-326 · a multiple-choice answer carries the refusal on its controls', () => {
  it('every checkbox is invalid and describes the caller’s note', () => {
    renderWithProviders(
      <>
        <RfqQuestionField
          question={MULTI_QUESTION}
          answer={undefined}
          onChange={() => {}}
          aria-invalid
          aria-describedby="q-multi-note"
        />
        <p id="q-multi-note">Pick at least one certificate.</p>
      </>
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(3);
    for (const box of boxes) {
      expect(box).toHaveAttribute('aria-invalid', 'true');
      expect(box).toHaveAttribute('aria-describedby', 'q-multi-note');
    }
    // The prompt names the group (htmlFor pointed at a div before BL-326).
    const group = screen.getByRole('group', { name: 'Pick the certificates you hold *' });
    expect(group).toBeInTheDocument();
  });

  it('KNOWN-GOOD: with no refusal no checkbox is marked or described', () => {
    renderWithProviders(
      <RfqQuestionField question={MULTI_QUESTION} answer={undefined} onChange={() => {}} />
    );
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).not.toHaveAttribute('aria-invalid');
      expect(box).not.toHaveAttribute('aria-describedby');
    }
  });
});
