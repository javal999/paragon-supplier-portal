// ────────────────────────────────────────────────────────────────────────────
// BL-326 — the quote's lead-time field (MR !151 follow-up). The field was
// marked invalid on a pristine blank form while its message — and therefore
// its `aria-describedby` — waited for a unit price to be typed.
// ────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import QuoteTermsSection from './components/QuoteTermsSection';
import { emptyQuoteForm } from './const';

/** @type {import('./const').QuoteForm} */
const FORM = { ...emptyQuoteForm };

/**
 * @param {import('./const').QuoteForm} form
 */
const renderSection = (form) =>
  renderWithProviders(
    <QuoteTermsSection
      form={form}
      setForm={() => {}}
      leadTime={{ ok: false, reason: 'EMPTY_QTY' }}
      moq={{ ok: true, moq: null }}
    />
  );

describe('BL-326 · the lead-time field is invalid only while its refusal is shown', () => {
  it('a pristine blank form neither marks the field invalid nor describes anything', () => {
    renderSection(FORM);
    const lead = screen.getByLabelText('Lead time');
    expect(lead).not.toHaveAttribute('aria-invalid');
    expect(lead).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByTestId('quote-leadtime-refusal')).toBeNull();
  });

  it('once the supplier has typed a price, the field is invalid and describes the refusal', () => {
    renderSection({ ...FORM, unitPrice: '12000' });
    const lead = screen.getByLabelText('Lead time');
    expect(lead).toHaveAttribute('aria-invalid', 'true');
    expect(lead).toHaveAttribute('aria-describedby', 'quote-leadtime-refusal');
    expect(document.getElementById(lead.getAttribute('aria-describedby') ?? '')).toHaveTextContent(
      'Give your estimated lead time'
    );
  });

  it('KNOWN-GOOD: a readable lead time is not invalid, price or no price', () => {
    renderWithProviders(
      <QuoteTermsSection
        form={{ ...FORM, unitPrice: '12000' }}
        setForm={() => {}}
        leadTime={{ ok: true, days: 14, requiresSameDayAck: false }}
        moq={{ ok: true, moq: null }}
      />
    );
    fireEvent.change(screen.getByLabelText('Lead time'), { target: { value: '14' } });
    const lead = screen.getByLabelText('Lead time');
    expect(lead).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByTestId('quote-leadtime-refusal')).toBeNull();
  });
});
