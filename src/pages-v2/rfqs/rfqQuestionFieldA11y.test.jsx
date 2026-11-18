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
