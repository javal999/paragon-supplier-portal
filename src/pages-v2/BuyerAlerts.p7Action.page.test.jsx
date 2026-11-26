// ─────────────────────────────────────────────────────────────────────────────
// UCX-P7 (BL-368) · UCX-F19, UCX-D21 — an alert's own action records itself
// and fills the close reason "Asked the supplier", editable; "Other" still
// needs a note. BL-150's per-supplier × material grouping is unchanged (its own
// spec covers it).
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { supplierAskStore } from '@services/data/mock/stores/supplierAskStore';
import BuyerAlerts from './BuyerAlerts';

beforeEach(() => {
  supplierAskStore.reset();
});

describe('UCX-P7 — the alert’s action fills its close reason', () => {
  it('raising the ask records it, and the close dialog preselects "Asked the supplier"', async () => {
    renderWithProviders(<BuyerAlerts />, { identity: BUYER, route: '/buyer/alerts' });
    const askSpans = await screen.findAllByTestId(/^alert-ask-/, {}, { timeout: 15000 });
    // The wrapper span carries `data-topic`; the button testids end `-open`.
    const wrapper = askSpans.find((el) => el.dataset.topic !== undefined);
    expect(wrapper).toBeTruthy();
    const key = (wrapper?.dataset.testid ?? '').replace('alert-ask-', '');
    const row = /** @type {HTMLElement} */ (wrapper?.closest('li'));
    const askButton = within(row).getByTestId(`alert-ask-${key}-open`);
    fireEvent.click(askButton);
    fireEvent.click(await screen.findByTestId(`alert-ask-${key}-submit`, {}, { timeout: 8000 }));
    await waitFor(() => expect(supplierAskStore.all().length).toBeGreaterThan(0));
    // The close dialog for the same alert opens with the reason prefilled.
    fireEvent.click(within(row).getByRole('button', { name: /Close alert/ }));
    const select = await screen.findByLabelText('Reason', {}, { timeout: 8000 });
    expect(select).toHaveValue('asked-supplier');
    // Editable, and "Other" still requires its note (MR-9 BR-04).
    fireEvent.change(select, { target: { value: 'other' } });
    expect(screen.getByTestId('alert-close-submit')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('What was done'), {
      target: { value: 'Explained by phone.' }
    });
    expect(screen.getByTestId('alert-close-submit')).not.toBeDisabled();
  });
});
