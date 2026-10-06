// BL-32 — an invoice's match result is recorded when it is checked. When the
// administrator later changes a CR-12 value, the lines section re-evaluates the
// prices under the values in force and says so when the two disagree, without
// rewriting the recorded result. Pinned on INV-2026-BRL-0064 (+Rp 600.000,
// 1.95%, held only by the Rp 500.000 cap).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { InvoiceLinesSection } from './InvoiceCollaboration';
import { INVOICES } from '@services/data/mock/fixtures/invoices';
import { hubSettingsStore } from '@services/transitions/hubSettingsStore';

const NO_PERSON = /** @type {const} */ ({ kind: 'UNATTRIBUTED', reason: 'NO_PERSON_IN_SESSION' });
const inv = /** @type {import('@services/data/types').Invoice} */ (
  INVOICES.find((i) => i.invoiceNumber === 'INV-2026-BRL-0064')
);

/** @param {typeof inv.matchStatus} matchStatus */
function renderLines(matchStatus) {
  return renderWithProviders(
    <InvoiceLinesSection
      lines={/** @type {NonNullable<typeof inv.lines>} */ (inv.lines)}
      invoiceDate={inv.invoiceDate ?? null}
      taxInvoiceFile={inv.taxInvoiceFile ?? null}
      amount={inv.amount}
      matchStatus={matchStatus}
    />,
    { identity: BUYER }
  );
}

beforeEach(() => hubSettingsStore.reset());
afterEach(() => hubSettingsStore.reset());

describe("BL-32 · the invoice says when its recorded match differs from today's tolerances", () => {
  it('population control: the pinned invoice is the cap case, recorded as Price Variance', () => {
    expect(inv.matchStatus).toBe('Price Variance');
    expect(inv.lines).toHaveLength(1);
  });

  it('at the default values the recorded result agrees, so no note is shown', () => {
    renderLines('Price Variance');
    expect(screen.queryByTestId('invoice-tolerance-changed')).toBeNull();
  });

  it('after the cap is raised above the difference, the note says the prices now pass', () => {
    const ok = hubSettingsStore.append({
      key: 'invoice.standardCapIdr',
      value: 700_000,
      setBy: NO_PERSON,
      setAt: '2026-09-22T09:00:00+07:00'
    });
    expect(ok).toBe(true);
    renderLines('Price Variance');
    expect(screen.getByTestId('invoice-tolerance-changed').textContent).toMatch(
      /under the values in force now its prices pass/
    );
  });

  it("a recorded Matched result that today's values would hold says so", () => {
    renderLines('Matched');
    expect(screen.getByTestId('invoice-tolerance-changed').textContent).toMatch(
      /a price would be held/
    );
  });
});
