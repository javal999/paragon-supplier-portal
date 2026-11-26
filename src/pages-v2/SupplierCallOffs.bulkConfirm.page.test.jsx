// ─────────────────────────────────────────────────────────────────────────────
// UCX-P2 v2 (BL-363) · UCX-F27 — "confirm as requested" on Call-offs:
// nothing starts ticked; a call-off with a PTI delay waiting cannot be ticked;
// select-all takes only the eligible; each confirmed record ran its own verb
// (CR-05 is the call-off's, not a batch rule); one confirm for the batch.
// ─────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
import { callOffStore } from '@services/data/mock/stores/callOffStore';
import { commandAuditSink } from '@services/data/mock/MockCommandService';
import { pendingDelay } from '@services/transitions/callOffRules';
import { callOffNeedsDecision } from './SupplierCallOffs/bulkConfirm';
import SupplierCallOffs from './SupplierCallOffs';

beforeEach(() => {
  callOffStore.reset();
  commandAuditSink.clear();
});

const ROUTE = '/supplier/call-offs';

/** sup-007's call-offs still awaiting the supplier's answer. */
const awaiting = () =>
  callOffStore
    .all()
    .filter((c) => c.supplierId === SUPPLIER.supplierId && c.status === 'Awaiting Confirmation');

describe('UCX-P2 — the call-off eligibility rule', () => {
  it('refuses one with a PTI delay waiting and one already answered', () => {
    const [c] = awaiting();
    expect(c).toBeTruthy();
    expect(callOffNeedsDecision(/** @type {any} */ ({ callOff: c }))).toBeNull();
    const delayed = {
      ...c,
      delays: [{ id: 'd1', answer: null }]
    };
    expect(pendingDelay(/** @type {any} */ (delayed))).toBeTruthy();
    expect(callOffNeedsDecision(/** @type {any} */ ({ callOff: delayed }))).toBe('delayPending');
    expect(
      callOffNeedsDecision(/** @type {any} */ ({ callOff: { ...c, status: 'Confirmed' } }))
    ).toBe('answered');
  });
});

describe('UCX-P2 — the call-off bulk bar', () => {
  it('starts with nothing ticked; select-all takes only eligible; one confirm runs each verb', async () => {
    const eligible = awaiting().filter((c) => !pendingDelay(c));
    expect(eligible.length).toBeGreaterThan(0);
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER, route: ROUTE });
    const bar = await screen.findByTestId('calloffs-bulk-bar', {}, { timeout: 15000 });
    expect(within(bar).getByTestId('calloffs-bulk-count')).toHaveTextContent('0 selected');
    fireEvent.click(within(bar).getByTestId('calloffs-bulk-select-all'));
    fireEvent.click(within(bar).getByTestId('calloffs-bulk-open'));
    const dialog = await screen.findByTestId('bulk-confirm-dialog', {}, { timeout: 8000 });
    for (const c of eligible)
      expect(within(dialog).getByTestId(`bulk-confirm-row-${c.id}`)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('bulk-confirm-submit'));
    await waitFor(() => {
      for (const c of eligible) expect(callOffStore.get(c.id)?.status).toBe('Confirmed');
    });
    // Each record ran ITS OWN verb — the batch added no rule of its own.
    // Each record ran ITS OWN verb (`event` is the transition id, DR-10).
    expect(commandAuditSink.all().filter((e) => e.event === 't_calloff_confirm')).toHaveLength(
      eligible.length
    );
    expect(within(dialog).getByTestId('bulk-confirm-result')).toHaveTextContent(
      `${eligible.length} confirmed`
    );
  });

  it('a delay-pending call-off cannot be ticked, and its checkbox says why', async () => {
    const [c] = awaiting();
    callOffStore.update(c.id, (x) => ({
      ...x,
      delays: [
        {
          fromNeedDate: x.needDate,
          toNeedDate: x.needDate,
          quantity: x.quantity,
          reasonCode: 'ltp-dropped',
          reason: 'LTP dropped',
          proposedAt: x.needDate,
          proposedBy: /** @type {any} */ ({}),
          answer: null
        }
      ]
    }));
    renderWithProviders(<SupplierCallOffs />, { identity: SUPPLIER, route: ROUTE });
    // The row renders whether or not the bar does; its checkbox is the subject.
    const box = /** @type {HTMLInputElement} */ (
      await screen.findByTestId(`calloff-bulk-tick-${c.id}`, {}, { timeout: 15000 })
    );
    expect(box).toBeDisabled();
    expect(box.title).toMatch(/delay/);
  });
});
