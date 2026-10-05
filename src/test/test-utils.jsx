/** @import React from 'react' */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '@lib/i18n';
import { DataServiceProvider } from '@services/data/DataServiceContext';
import { mockDataService } from '@services/data/mock/mockDataService';
/** @import { IDataService } from '@services/data/types' */
import { AdaptiveProvider } from '@context/AdaptiveContext';
import { ToastProvider } from '@hooks/useToast';
import { CurrentIdentityProvider } from '@context/CurrentIdentityContext';
/** @import { CurrentIdentity, IdentitySource } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';

// Default persona for page tests that don't care about identity.
//
// ⚠️ NOW EXPORTED, AND IT WAS ALREADY BEING IMPORTED. `buyerWidgets.test.jsx`
//   imported `BUYER` from here while it was module-local, so at runtime the
//   import was `undefined` — and the test worked ONLY because the `identity =
//   BUYER` DEFAULT PARAMETER below fires on `undefined` and substituted this very
//   constant. RIGHT RESULT, WRONG REASON, and one edit to that default away from
//   silently testing a different persona. `tsc` says so; nothing else could.
/** @type {CurrentIdentity} */
export const BUYER = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  // THE SEEDED buyer seat — every LANE on that side, which is what a real seat
  // opens holding. Specs that want a NARROWED seat pass their own identity;
  // this default keeps the ~200 specs that predate the role split asserting
  // exactly what they asserted before.
  //
  // ⚠️ **IT READS THE SEED, NOT THE OFFER, AND THAT IS LOAD-BEARING.** They
  // were one constant until `buyer_all` landed; pointing this at the OFFER
  // would hand every default test seat the manager's role — silently widening
  // ~200 specs into asserting against a seat no user ever has.
  businessRoles: SEEDED_SEAT_ROLES.buyer,
  // The portal has no persons; UNATTRIBUTED is the measured fact, not a stub.
  actor: NO_PERSON
};

// The seeded supplier (sup-007) — pass to renderWithProviders for pages that
// gate on a supplier identity (e.g. SupplierWhatsApp -> NoSupplierIdentity).
/** @type {CurrentIdentity} */
export const SUPPLIER = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};

/**
 * @param {CurrentIdentity} identity
 * @returns {IdentitySource}
 */
const stubSource = (identity) => ({
  load: () => identity,
  save: () => {}
});

/**
 * @typedef {object} RenderOptions
 * @property {CurrentIdentity} [identity]
 * @property {string} [route]
 * @property {IDataService} [service] Override the data service — e.g. pass withChaos(mockDataService, {failureRate: 1})
 *   to exercise error states deterministically. Defaults to the plain mock.
 * @property {QueryClient} [queryClient] Share a QueryClient across renders (e.g. to inspect the cache in a
 *   scoping test). Defaults to a fresh per-render client.
 */

// One wrapper every page test reuses: mirrors the real main.jsx -> AppRouter
// provider nesting, swapping HashRouter for MemoryRouter. A fresh QueryClient
// per call keeps the cache isolated between tests.
/**
 * @param {React.ReactNode} ui
 * @param {RenderOptions} [arg1]
 */
export function renderWithProviders(
  ui,
  { identity = BUYER, route = '/', service = mockDataService, queryClient } = {}
) {
  const client = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <DataServiceProvider service={service}>
          <AdaptiveProvider>
            <MemoryRouter initialEntries={[route]}>
              <ToastProvider>
                <CurrentIdentityProvider source={stubSource(identity)}>
                  {ui}
                </CurrentIdentityProvider>
              </ToastProvider>
            </MemoryRouter>
          </AdaptiveProvider>
        </DataServiceProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

// Picks an option on a `SelectField` (src/components/ui-v2/SelectField.jsx)
// by its VALUE, whichever mode it's currently rendering in — a plain
// <select> (≤10 options) or a searchable combobox (>10). A test that only
// knows the id (not the label) can't target a combobox row by visible text,
// so SelectField carries `data-value` on every rendered option for exactly
// this. Async because the combobox path waits for its portaled listbox.
/**
 * @param {string} testId
 * @param {string} value
 */
export async function pickSelectFieldOption(testId, value) {
  // Re-queries by testid on every retry, not once up front — while the
  // supplying data is still loading, SelectField renders a disabled
  // placeholder (see its `loading` short-circuit), which a stale element
  // reference would click inertly once the real control replaces it.
  const control = await waitFor(() => {
    const el = screen.getByTestId(testId);
    if (el.tagName === 'SELECT') {
      if (within(el).getAllByRole('option').length <= 1)
        throw new Error('select not populated yet');
      return /** @type {HTMLSelectElement} */ (el);
    }
    if (el.tagName === 'INPUT' && !(/** @type {HTMLInputElement} */ (el).disabled))
      return /** @type {HTMLInputElement} */ (el);
    throw new Error('SelectField not interactive yet');
  });
  if (control.tagName === 'SELECT') {
    // Native <option> values are indexes; the SelectField value rides in
    // `data-value`. A value with no option must be refused, not "picked" —
    // jsdom would otherwise fall back silently and the test would "pass"
    // against an unbound state (review G5).
    const opt = /** @type {HTMLOptionElement | null} */ (
      control.querySelector(`option[data-value="${value}"]`)
    );
    if (!opt) throw new Error(`SelectField "${testId}": no option with value "${value}"`);
    fireEvent.change(control, { target: { value: opt.value } });
    const bound = /** @type {HTMLSelectElement} */ (control).selectedOptions[0]?.dataset.value;
    if (bound !== value)
      throw new Error(`SelectField "${testId}": value did not bind to "${value}"`);
    return;
  }
  fireEvent.click(control);
  const row = await waitFor(() => {
    const el = document.querySelector(`[role="option"][data-value="${value}"]`);
    if (!el) throw new Error(`SelectField "${testId}": no option with value "${value}"`);
    return /** @type {HTMLElement} */ (el);
  });
  fireEvent.click(row);
}
