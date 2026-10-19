// ────────────────────────────────────────────────────────────────────────────
// RFx UX 2026-10 — the supplier response forms, at the surface.
//   S-01 · what the supplier types survives leaving the page, the header says
//          when it was kept, and the page asks before leaving only when the
//          browser would not keep it;
//   S-02 · every missing answer is marked where it sits and listed at the top
//          with a jump link, and Send says why it is off.
// ────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { resetRfqEngagementStores } from '@services/data/mock/stores/rfqEngagementStores';
import SupplierRfi from '../SupplierRfi';
import SupplierRfp from '../SupplierRfp';
import SupplierRFQs from '../SupplierRFQs';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  resetRfqEngagementStores();
  sdcClock.reset();
});
afterEach(() => vi.restoreAllMocks());

/**
 * @param {string} supplierId
 * @returns {CurrentIdentity}
 */
const seat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  supplierName: supplierId,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
});
// sup-013 holds a half-filled DRAFT on rfi-001 (two required answers missing).
const SUP_013 = seat('sup-013');
// sup-015 is invited to rfp-002 (Tundra, samples requested) and has not answered.
const SUP_015 = seat('sup-015');

const openRfi = async () => {
  const view = renderWithProviders(<SupplierRfi />, { identity: SUP_013 });
  fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-001'));
  await screen.findByTestId('rfi-field-f-recycled-content');
  return view;
};
const recycled = () =>
  /** @type {HTMLInputElement} */ (
    within(screen.getByTestId('rfi-field-f-recycled-content')).getByRole('spinbutton')
  );

describe('S-01 — the RFI answers survive leaving the page', () => {
  it('KNOWN-GOOD: an answer typed, the page left and opened again, is still there', async () => {
    const view = await openRfi();
    expect(screen.queryByTestId('supplier-rfi-saved-rfi-001')).toBeNull();
    fireEvent.change(recycled(), { target: { value: '30' } });
    expect(screen.getByTestId('supplier-rfi-saved-rfi-001')).toHaveTextContent(
      /Draft saved on this device at \d\d:\d\d/
    );
    view.unmount();
    await openRfi();
    expect(recycled().value).toBe('30');
  });

  it('KNOWN-BAD: a browser that keeps nothing says so, and a reload is held', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    await openRfi();
    fireEvent.change(recycled(), { target: { value: '30' } });
    expect(screen.getByTestId('supplier-rfi-saved-rfi-001')).toHaveTextContent(/Not saved/);
    const e = new Event('beforeunload', { cancelable: true });
    globalThis.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });

  it('KNOWN-GOOD twin — a kept draft holds nothing back', async () => {
    await openRfi();
    fireEvent.change(recycled(), { target: { value: '30' } });
    const e = new Event('beforeunload', { cancelable: true });
    globalThis.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });
});

describe('S-02 — the RFI names every missing answer, where it sits', () => {
  it('KNOWN-BAD: each missing required answer says "Still missing", the banner lists them, Send says why it is off', async () => {
    await openRfi();
    const banner = screen.getByTestId('supplier-rfi-problems-rfi-001');
    const count = within(banner).getAllByRole('button').length;
    expect(count).toBeGreaterThan(1);
    expect(banner).toHaveTextContent(`${count} answers still missing or not valid`);
    expect(screen.getByTestId('rfi-field-missing-f-recycled-content')).toHaveTextContent(
      'Still missing'
    );
    expect(screen.getByTestId('supplier-rfi-send-reason-rfi-001')).toHaveTextContent(
      `Send is off until ${count} answers are given or fixed.`
    );
    expect(screen.getByTestId('supplier-rfi-submit-rfi-001')).toBeDisabled();
  });

  it('a jump link puts the cursor in the field it names', async () => {
    await openRfi();
    fireEvent.click(
      screen.getByTestId('supplier-rfi-problems-rfi-001-link-field-q-f-recycled-content')
    );
    expect(document.activeElement).toBe(recycled());
  });

  it('KNOWN-GOOD: answering one takes it off the field and off the list', async () => {
    await openRfi();
    const before = within(screen.getByTestId('supplier-rfi-problems-rfi-001')).getAllByRole(
      'button'
    ).length;
    fireEvent.change(recycled(), { target: { value: '30' } });
    expect(screen.queryByTestId('rfi-field-missing-f-recycled-content')).toBeNull();
    expect(
      within(screen.getByTestId('supplier-rfi-problems-rfi-001')).getAllByRole('button')
    ).toHaveLength(before - 1);
  });
});

describe('S-02 / S-06 — the RFP sample question', () => {
  const openTundra = async () => {
    renderWithProviders(<SupplierRfp />, { identity: SUP_015 });
    fireEvent.click(await screen.findByTestId('supplier-rfp-open-rfp-002'));
    return screen.findByTestId('supplier-rfp-rfp-002-pricing');
  };

  it('KNOWN-BAD: unanswered, the sample is marked and listed, all at once with the rest', async () => {
    await openTundra();
    expect(screen.getByTestId('supplier-rfp-rfp-002-sample-missing')).toHaveTextContent(
      'Choose Yes or No.'
    );
    const banner = screen.getByTestId('supplier-rfp-problems-rfp-002');
    expect(banner).toHaveTextContent('Can you provide a sample?');
    // The empty price grid is named in the same list, not after the sample.
    expect(banner).toHaveTextContent('Indicative prices');
    expect(screen.getByTestId('supplier-rfp-submit-rfp-002')).toBeDisabled();
  });

  it('KNOWN-GOOD: "No" answers it — no tick-then-untick needed', async () => {
    await openTundra();
    fireEvent.click(screen.getByTestId('supplier-rfp-rfp-002-can-sample-no'));
    await waitFor(() =>
      expect(screen.queryByTestId('supplier-rfp-rfp-002-sample-missing')).toBeNull()
    );
    expect(screen.getByTestId('supplier-rfp-problems-rfp-002')).not.toHaveTextContent(
      'Can you provide a sample?'
    );
  });
});

describe('S-01 / S-02 — the RFQ quote drawer', () => {
  const openLegacy = async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUPPLIER });
    expect(await screen.findByText('RFQ-2026-010')).toBeInTheDocument();
    // RFx UX S-07 — a legacy card opens its quote after step 1, like every card.
    fireEvent.click(screen.getByTestId('intent-respond-rfq-010'));
    fireEvent.click((await screen.findAllByRole('button', { name: /Submit Quote/i }))[0]);
    return /** @type {HTMLInputElement} */ (screen.getByLabelText('Unit price'));
  };
  const submit = () => screen.getByRole('button', { name: 'Submit quotation' });

  it('KNOWN-GOOD: a price typed, the panel closed and opened again, is still there', async () => {
    const price = await openLegacy();
    fireEvent.change(price, { target: { value: '15000' } });
    expect(screen.getByTestId('quote-saved')).toHaveTextContent(/Draft saved on this device at/);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Submit Quote/i })[0]);
    expect(/** @type {HTMLInputElement} */ (screen.getByLabelText('Unit price')).value).toBe(
      '15000'
    );
  });

  it('KNOWN-BAD: Send is off with the count from the start; the list appears once the supplier starts', async () => {
    const price = await openLegacy();
    expect(submit()).toBeDisabled();
    expect(screen.getByTestId('quote-send-reason')).toHaveTextContent(/answers are given or fixed/);
    // An untouched blank does not nag on sight.
    expect(screen.queryByTestId('quote-problems')).toBeNull();
    fireEvent.change(price, { target: { value: '15000' } });
    const banner = screen.getByTestId('quote-problems');
    expect(banner).toHaveTextContent('Lead time');
    expect(banner).toHaveTextContent('Quote valid until');
    expect(screen.getByTestId('quote-valid-until-missing')).toHaveTextContent('Still missing');
  });

  it('KNOWN-GOOD: with every field given, the list is gone and Send is on', async () => {
    const price = await openLegacy();
    fireEvent.change(price, { target: { value: '15000' } });
    fireEvent.change(screen.getByLabelText('Quote valid until'), {
      target: { value: '2026-06-30' }
    });
    fireEvent.change(screen.getByLabelText('Lead time'), { target: { value: '4' } });
    expect(screen.queryByTestId('quote-problems')).toBeNull();
    expect(screen.queryByTestId('quote-send-reason')).toBeNull();
    expect(submit()).toBeEnabled();
    fireEvent.click(submit());
    await waitFor(() => expect(quotationStore.forRfq('rfq-010')).toHaveLength(1));
  });
});
