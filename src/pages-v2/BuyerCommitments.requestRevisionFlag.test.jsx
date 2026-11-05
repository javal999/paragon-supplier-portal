// ─────────────────────────────────────────────────────────────────────────────
// CAP-7 (BL-176) — Request revision is HIDDEN, not deleted ("hide first",
// owner, 2026-10-12). `REQUEST_REVISION_ENABLED` is false in the shipped code;
// this file flips it to true so the planner's revision walk stays tested and
// the one-line revert is known to bring the button back. The flag-off case
// (no exception shows the button) is in ForecastCollaboration.test.jsx.
// ─────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { requirementResponseStore } from '@services/data/mock/stores/requirementResponseStore';
import {
  forecastVersionStore,
  forecastViewStore
} from '@services/data/mock/stores/forecastHubStores';
import { inventoryAlertLedger } from '@services/data/mock/stores/inventoryHubStores';
import { SEEDED_PACKAGING_WEEKS as W } from '@services/data/mock/fixtures/forecastHub';
import { sdcClock } from '@services/sdc';
import { formatDate } from '@lib/format';
import { REQUEST_REVISION_ENABLED } from '@services/transitions/forecastConfig';
import BuyerCommitments from './BuyerCommitments';

vi.mock('@services/transitions/forecastConfig', async (importOriginal) => ({
  .../** @type {object} */ (await importOriginal()),
  REQUEST_REVISION_ENABLED: true
}));

beforeEach(() => {
  requirementResponseStore.reset();
  forecastVersionStore.reset();
  forecastViewStore.reset();
  inventoryAlertLedger.reset();
  sdcClock.reset();
});

const PLANNER = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const panel = () =>
  within(/** @type {HTMLElement} */ (document.querySelector('aside[role="dialog"]')));
/** @param {string} bucket */
const week = (bucket) => `Week of ${formatDate(bucket)}`;

describe('CAP-7 — REQUEST_REVISION_ENABLED = true brings Request revision back', () => {
  it('the mock took: the flag reads true in this file', () => {
    expect(REQUEST_REVISION_ENABLED).toBe(true);
  });

  it('request revision needs a note, which is kept for the supplier', async () => {
    renderWithProviders(<BuyerCommitments />, { identity: PLANNER });
    // PEX-D22 — sup-007's Zone Liability exception (8801, W[1]); it used the
    // Trade-off week 8802 W[3], whose answer is an acknowledgement now.
    const what = `PT Sample Packaging Indonesia PK-PETB-8801 ${week(W[1])}`;
    // Accept and Move demand are unaffected by the flag.
    expect(await screen.findByRole('button', { name: `Accept ${what}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Move demand for ${what}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Request revision for ${what}` }));
    expect(panel().getByTestId('fc-action-submit')).toBeDisabled();
    fireEvent.change(panel().getByLabelText('Note'), {
      target: { value: 'Please cover the launch week' }
    });
    fireEvent.click(panel().getByTestId('fc-action-submit'));
    const id = requirementResponseStore
      .all()
      .filter(
        (r) =>
          r.supplierId === 'sup-007' && r.materialCode === 'PK-PETB-8801' && r.periodBucket === W[1]
      )[0].id;
    await waitFor(() => expect(requirementResponseStore.get(id)?.status).toBe('Disputed'));
    expect((requirementResponseStore.get(id)?.disputeResponse ?? []).map((e) => e.text)).toEqual([
      'Please cover the launch week'
    ]);
  });
});
