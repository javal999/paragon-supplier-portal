// BL-223 — the PTI Call-offs page in Indonesian groups quantities the
// Indonesian way ("15.000 PCS"). English stays "15,000 PCS" (CallOffs.test.jsx).

import { screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { purchaseOrderStore } from '@services/data/mock/stores/purchaseOrderStore';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { callOffsId } from '@lib/i18n/callOffs';
import BuyerCallOffs from '../BuyerCallOffs';

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(async () => {
  callOffStore.reset();
  asnStore.reset();
  purchaseOrderStore.reset();
  await i18n.changeLanguage('id');
});

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('BL-223 — call-off quantities in Indonesian', () => {
  it('remaining on the umbrella PO line reads 15.000 PCS', async () => {
    renderWithProviders(<BuyerCallOffs />, { identity: PLANNER });
    fireEvent.click(await screen.findByRole('tab', { name: callOffsId['co.tab.all'] }));
    const pet = await screen.findByTestId('calloff-umbrella-po-007-li-007a');
    expect(within(pet).getByTestId('calloff-remaining-li-007a')).toHaveTextContent(/^15\.000 PCS$/);
  });
});
