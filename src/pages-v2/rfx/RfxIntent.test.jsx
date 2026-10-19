// ────────────────────────────────────────────────────────────────────────────
// BL-132 (RFx UX S-13) — intent on the RFI and the RFP, at the surface.
//   · the supplier row carries the RFQ card's strip and "I will respond" /
//     "Decline"; the answer form opens once it says it will respond;
//   · a decline takes a reason from the list and words, is final, and the row
//     then reads "Declined" with no form;
//   · "Decline after all" turns a "respond" into a decline until it is sent;
//   · a seat without the atom reads the wait in the controls' slot;
//   · the buyer's invitee table reads "Will respond" / "Declined: <reason> —
//     <words>" instead of "Not started".
// ────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUYER, renderWithProviders } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import {
  resetRfxStores,
  rfiIntentStore,
  rfpIntentStore
} from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import SupplierRfi from '../SupplierRfi';
import SupplierRfp from '../SupplierRfp';
import BuyerRfi from '../BuyerRfi';
import BuyerRfp from '../BuyerRfp';
import { MockProcurementService } from '@services/data/mock/MockProcurementService';
import { supplierSourcingQueue } from '@services/sourcing/supplierOutcome';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { SystemRoleId } from '@services/transitions/businessRoles' */

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});
afterEach(() => vi.restoreAllMocks());

/**
 * @param {string} supplierId
 * @param {readonly SystemRoleId[]} [roles]
 * @returns {CurrentIdentity}
 */
const seat = (supplierId, roles = SEEDED_SEAT_ROLES.supplier) => ({
  personaType: 'supplier',
  supplierId,
  supplierName: supplierId,
  businessRoles: roles,
  actor: NO_PERSON
});
const SUP_007 = seat('sup-007');
const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

describe('the supplier RFI row (rfi-002, sup-007 has said nothing)', () => {
  const open = async () => {
    renderWithProviders(<SupplierRfi />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-002'));
    return screen.findByTestId('supplier-rfi-rfi-002-intent');
  };

  it('shows the strip at step 1 and no form until "I will respond"; then the form opens', async () => {
    await open();
    const strip = screen.getByTestId('supplier-rfi-rfi-002-steps');
    expect(strip).toHaveTextContent('Step 1: Say if you will respond');
    expect(strip).toHaveTextContent('Step 2: Answer');
    expect(screen.getByTestId('supplier-rfi-rfi-002-steps-respond')).toHaveAttribute(
      'data-state',
      'current'
    );
    // KNOWN-BAD — nothing to answer yet, and the page says why.
    expect(screen.queryByTestId('rfi-field-oslo-machine')).not.toBeInTheDocument();
    expect(screen.getByTestId('supplier-rfi-intent-first-rfi-002')).toHaveTextContent(
      'Say if you will respond first'
    );

    fireEvent.click(screen.getByTestId('supplier-rfi-rfi-002-intent-respond'));
    // KNOWN-GOOD — the form opens and the strip moves on.
    expect(await screen.findByTestId('rfi-field-oslo-machine')).toBeInTheDocument();
    expect(screen.getByTestId('supplier-rfi-rfi-002-intent-responding')).toHaveTextContent(
      'You will respond'
    );
    expect(screen.getByTestId('supplier-rfi-rfi-002-steps-answer')).toHaveAttribute(
      'data-state',
      'current'
    );
    expect(
      rfiIntentStore.all().find((r) => r.eventId === 'rfi-002' && r.supplierId === 'sup-007')
    ).toMatchObject({ intent: 'respond' });
  });

  it('declines with a reason and words: the row reads Declined, no form, no strip', async () => {
    await open();
    fireEvent.click(screen.getByTestId('supplier-rfi-rfi-002-intent-decline'));
    const form = screen.getByTestId('supplier-rfi-rfi-002-decline-form');
    const confirm = within(form).getByTestId('supplier-rfi-rfi-002-decline-form-confirm');
    expect(confirm).toHaveTextContent('Decline this information request');
    // KNOWN-BAD — no reason, no words: the confirm stays off.
    expect(confirm).toBeDisabled();
    fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'notOurProduct' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(form).getByRole('textbox'), {
      target: { value: 'We print labels but not on rolls.' }
    });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);

    const declined = await screen.findByTestId('supplier-rfi-rfi-002-intent-declined');
    expect(declined).toHaveTextContent('Declined');
    expect(declined).toHaveTextContent('Not a product we make — We print labels but not on rolls.');
    expect(screen.queryByTestId('supplier-rfi-rfi-002-steps')).not.toBeInTheDocument();
    expect(screen.getByTestId('supplier-rfi-intent-first-rfi-002')).toHaveTextContent(
      'You declined this request'
    );
    expect(screen.queryByTestId('supplier-rfi-save-rfi-002')).not.toBeInTheDocument();
    // A decline is final: nothing offers to take it back.
    expect(screen.queryByTestId('supplier-rfi-rfi-002-intent-respond')).not.toBeInTheDocument();
  });

  it('"Decline after all" turns a stated "respond" into a decline', async () => {
    await open();
    fireEvent.click(screen.getByTestId('supplier-rfi-rfi-002-intent-respond'));
    fireEvent.click(await screen.findByTestId('supplier-rfi-rfi-002-intent-withdraw'));
    const form = screen.getByTestId('supplier-rfi-rfi-002-decline-form');
    fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'noCapacity' } });
    fireEvent.change(within(form).getByRole('textbox'), { target: { value: 'Press is full.' } });
    fireEvent.click(within(form).getByTestId('supplier-rfi-rfi-002-decline-form-confirm'));
    await screen.findByTestId('supplier-rfi-rfi-002-intent-declined');
    await waitFor(() =>
      expect(
        rfiIntentStore.all().find((r) => r.eventId === 'rfi-002' && r.supplierId === 'sup-007')
      ).toMatchObject({ intent: 'decline', reason: 'noCapacity' })
    );
  });

  it('a sent response offers no decline: rfi-001 is already submitted by sup-007', async () => {
    renderWithProviders(<SupplierRfi />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-001'));
    await screen.findByTestId('supplier-rfi-rfi-001-intent');
    expect(screen.queryByTestId('supplier-rfi-rfi-001-intent-decline')).not.toBeInTheDocument();
    // KNOWN-GOOD — the sent answers stay readable.
    expect(await screen.findByTestId('supplier-rfi-version-rfi-001')).toBeInTheDocument();
  });

  it("a seat without the intent atom reads the wait in the controls' slot", async () => {
    renderWithProviders(<SupplierRfi />, { identity: seat('sup-007', ['fulfilment']) });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-002'));
    expect(await screen.findByTestId('handoff-rfiintent-declare')).toBeInTheDocument();
    expect(screen.queryByTestId('supplier-rfi-rfi-002-intent-respond')).not.toBeInTheDocument();
  });
});

describe('the supplier RFP row', () => {
  it('rfp-003 is confidential: the strip starts at step 0 and "I will respond" opens nothing hidden', async () => {
    renderWithProviders(<SupplierRfp />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId('supplier-rfp-open-rfp-003'));
    expect(await screen.findByTestId('supplier-rfp-rfp-003-steps-terms')).toHaveAttribute(
      'data-state',
      'current'
    );
    expect(screen.getByTestId('supplier-rfp-rfp-003-steps-answer')).toHaveTextContent(
      'Step 2: Send your proposal'
    );
    fireEvent.click(screen.getByTestId('supplier-rfp-rfp-003-intent-respond'));
    await screen.findByTestId('supplier-rfp-rfp-003-intent-responding');
    // The gate still stands: the brief arrives only after the terms.
    expect(screen.getByTestId('supplier-rfp-gate-rfp-003')).toBeInTheDocument();
    expect(screen.queryByTestId('supplier-rfp-term-custom-formula-owner')).not.toBeInTheDocument();
  });

  it('declines rfp-002 with its own confirm, and the row stays listed as Declined', async () => {
    renderWithProviders(<SupplierRfp />, { identity: seat('sup-015') });
    fireEvent.click(await screen.findByTestId('supplier-rfp-open-rfp-002'));
    fireEvent.click(await screen.findByTestId('supplier-rfp-rfp-002-intent-decline'));
    const form = screen.getByTestId('supplier-rfp-rfp-002-decline-form');
    expect(within(form).getByTestId('supplier-rfp-rfp-002-decline-form-confirm')).toHaveTextContent(
      'Decline this proposal request'
    );
    fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'specUnclear' } });
    fireEvent.change(within(form).getByRole('textbox'), {
      target: { value: 'The pump spec is open; we only supply fixed designs.' }
    });
    fireEvent.click(within(form).getByTestId('supplier-rfp-rfp-002-decline-form-confirm'));
    expect(await screen.findByTestId('supplier-rfp-rfp-002-intent-declined')).toHaveTextContent(
      'Specification unclear'
    );
    expect(screen.getByTestId('supplier-rfp-open-rfp-002')).toBeInTheDocument();
    expect(
      rfpIntentStore.all().find((r) => r.eventId === 'rfp-002' && r.supplierId === 'sup-015')
    ).toMatchObject({ intent: 'decline', reason: 'specUnclear' });
  });
});

describe('the buyer invitee table', () => {
  it('RFP: sup-015 reads "Declined: <reason> — <words>" on rfp-003; sup-007 still "Not started"', async () => {
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-003'));
    const declined = await screen.findByTestId('rfp-invitee-sup-015');
    expect(within(declined).getByTestId('invitee-intent-declined')).toHaveTextContent(
      'Declined Not a product we make — We fill lip products but do not develop formulas.'
    );
    // KNOWN-GOOD — the silent invitee is still "Not started".
    expect(screen.getByTestId('rfp-invitee-sup-007')).toHaveTextContent('Not started');
    expect(
      within(screen.getByTestId('rfp-invitee-sup-007')).queryByTestId('invitee-intent-declined')
    ).not.toBeInTheDocument();
  });

  it('RFI: a "respond" with nothing sent reads "Will respond"; a draft reads Draft', async () => {
    // sup-007 says it will respond on rfi-002 (nothing saved yet).
    rfiIntentStore.add({
      id: 'rfii-0100',
      eventId: 'rfi-002',
      supplierId: 'sup-007',
      intent: 'respond',
      at: sdcClock.now()
    });
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfi-open-rfi-002'));
    const row = await screen.findByTestId('rfi-invitee-rfi-002-sup-007');
    expect(within(row).getByTestId('invitee-intent-responding')).toHaveTextContent('Will respond');
    // sup-008 sent its answers: "Submitted", whatever was said.
    expect(screen.getByTestId('rfi-invitee-rfi-002-sup-008')).toHaveTextContent('Submitted');
  });
});

describe('the To do queue — a declined RFI or RFP no longer waits on the supplier', () => {
  it('sup-015: rfp-003 (declined) leaves "Proposal requests to answer"; rfp-002 (silent) stays', async () => {
    const reads = new MockProcurementService();
    const scope = { ...seat('sup-015'), businessRoles: SEEDED_SEAT_ROLES.supplier };
    const rfps = (await reads.getRfpEvents(scope)).items;
    // POPULATION — both events reach sup-015, unanswered.
    expect(rfps.map((e) => e.id)).toEqual(expect.arrayContaining(['rfp-002', 'rfp-003']));
    const { openRfps } = supplierSourcingQueue({
      rfqs: [],
      rfis: [],
      rfps,
      rounds: [],
      supplierId: 'sup-015'
    });
    const ids = openRfps.map((e) => e.id);
    expect(ids).toContain('rfp-002');
    expect(ids).not.toContain('rfp-003');
  });
});
