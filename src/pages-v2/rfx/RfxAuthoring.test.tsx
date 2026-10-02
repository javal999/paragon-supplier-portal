// ─────────────────────────────────────────────────────────────────────────────
// RFx AUTHORING, END TO END THROUGH THE REAL DISPATCHER AND STORES.
//
// The option editor, the supplier form over every kind, the confidentiality and
// T&C gates as the supplier meets them, indicative pricing on both sides, and
// "Create a proposal request from this" landing in a pre-filled RFP wizard.
// ─────────────────────────────────────────────────────────────────────────────

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import type { CurrentIdentity } from '@context/CurrentIdentityContext';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import {
  resetRfxStores,
  rfiEventStore,
  rfpEventStore,
  rfpResponseStore,
} from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { resetRfxTemplatesForTest } from '@services/sourcing/rfxTemplates';
import BuyerRfi from '../BuyerRfi';
import BuyerRfp from '../BuyerRfp';
import SupplierRfi from '../SupplierRfi';
import SupplierRfp from '../SupplierRfp';
import { rfxNow } from './rfxDisplay';

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  window.localStorage.clear();
  resetRfxTemplatesForTest();
});

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const SUP_007: CurrentIdentity = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON,
};

const dayFromNow = (days: number): string =>
  new Date(Date.parse(rfxNow()) + days * 86_400_000).toISOString().slice(0, 10);
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

describe('the option editor (BL-36) — a choice question is written, refused, then sent', () => {
  it('one option is refused by name; a second unblocks it; the supplier picks from the buyer’s words', async () => {
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfi-new'));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Sticker converters 2027' } });
    fireEvent.change(screen.getByTestId('rfi-new-family'), { target: { value: 'packaging' } });
    fireEvent.change(screen.getByLabelText('Response deadline'), { target: { value: dayFromNow(14) } });
    next();
    await screen.findByTestId('rfi-new-question-a-categories');

    fireEvent.change(screen.getByTestId('rfi-new-oneoff-type'), { target: { value: 'singleChoice' } });
    fireEvent.change(screen.getByLabelText('What to ask'), { target: { value: 'Which form do you supply?' } });
    fireEvent.change(screen.getByTestId('rfi-new-option-0'), { target: { value: 'Roll' } });
    // KNOWN-BAD — option 2 is blank: refused BY NAME, and the add is shut.
    expect(await screen.findByTestId('rfi-new-oneoff-refusal')).toHaveTextContent('Every option needs a label');
    expect(screen.getByTestId('rfi-new-oneoff-add')).toBeDisabled();
    // A repeated label is its own refusal.
    fireEvent.change(screen.getByTestId('rfi-new-option-1'), { target: { value: 'roll' } });
    expect(screen.getByTestId('rfi-new-oneoff-refusal')).toHaveTextContent('Two options have the same label');
    // POSITIVE TWIN.
    fireEvent.change(screen.getByTestId('rfi-new-option-1'), { target: { value: 'Sheet' } });
    await waitFor(() => expect(screen.getByTestId('rfi-new-oneoff-add')).not.toBeDisabled());
    // A third option is addable and removable.
    fireEvent.click(screen.getByTestId('rfi-new-option-add'));
    expect(screen.getByTestId('rfi-new-option-2')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfi-new-option-remove-2'));
    fireEvent.click(screen.getByTestId('rfi-new-oneoff-add'));
    expect(await screen.findByTestId('rfi-new-question-event-1')).toHaveTextContent('Roll · Sheet');

    next();
    fireEvent.click(await screen.findByTestId('rfi-new-invitee-row-sup-007'));
    next();
    next(); // + the Documents step (B3), optional, so it passes empty
    await screen.findByTestId('rfi-new-review');
    fireEvent.click(screen.getByRole('button', { name: 'Send to suppliers' }));
    await screen.findByTestId('rfi-detail-rfi-0004');
    const stored = rfiEventStore.get('rfi-0004')!.questions.find((q) => q.id === 'event-1')!;
    expect(stored.optionLabels).toEqual({ o1: 'Roll', o2: 'Sheet' });

    cleanup();
    renderWithProviders(<SupplierRfi />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-0004'));
    const field = await screen.findByTestId('rfi-field-event-1');
    expect(within(field).getByRole('option', { name: 'Sheet' })).toBeInTheDocument();
  });
});

describe('the supplier form renders and validates every kind (the Oslo RFI)', () => {
  it('each kind is drawn; a misfit answer is named and blocks sending; the price range says Indicative', async () => {
    renderWithProviders(<SupplierRfi />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-002'));
    for (const id of [
      'oslo-machine',
      'oslo-dieCut',
      'oslo-finishing',
      'oslo-colours',
      'oslo-process',
      'oslo-defect',
      'oslo-plate',
      'oslo-price',
      'oslo-sample',
      'oslo-halal',
      'oslo-portfolio',
    ]) {
      expect(await screen.findByTestId(`rfi-field-${id}`)).toBeInTheDocument();
    }
    // The buyer-added section and the buyer's documents are there.
    expect(screen.getByText('Printing and finishing')).toBeInTheDocument();
    expect(screen.getByTestId('supplier-rfi-attachments-rfi-002')).toHaveTextContent(/not available in this session/i);
    expect(screen.getByTestId('rfi-field-indicative-oslo-price')).toHaveTextContent('Indicative');
    expect(screen.getByTestId('rfi-field-oslo-machine')).toHaveTextContent('Brand and model of the press');

    // KNOWN-BAD — 7 colours is fine, 12 is above the max, and says so.
    fireEvent.change(screen.getByLabelText(/How many printing colours/, { selector: 'input[type="number"]' }), { target: { value: '12' } });
    expect(await screen.findByTestId('rfi-field-invalid-oslo-colours')).toHaveTextContent('above the maximum');
    expect(screen.getByTestId('supplier-rfi-invalid-rfi-002')).toBeInTheDocument();
    expect(screen.getByTestId('supplier-rfi-submit-rfi-002')).toBeDisabled();
    // POSITIVE TWIN.
    fireEvent.change(screen.getByLabelText(/How many printing colours/, { selector: 'input[type="number"]' }), { target: { value: '7' } });
    await waitFor(() => expect(screen.queryByTestId('rfi-field-invalid-oslo-colours')).not.toBeInTheDocument());

    // An inverted indicative range is named.
    fireEvent.change(screen.getByLabelText(/indicative price range per sticker\? — From/), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText(/indicative price range per sticker\? — To/), { target: { value: '200' } });
    expect(await screen.findByTestId('rfi-field-invalid-oslo-price')).toHaveTextContent('must not be above');
  });

  it('the buyer reads the answers in their kind — labels, range, percent', async () => {
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfi-open-rfi-002'));
    expect(await screen.findByTestId('rfi-answer-oslo-dieCut-sup-008')).toHaveTextContent('Flexible (rotary) die');
    expect(screen.getByTestId('rfi-answer-oslo-finishing-sup-008')).toHaveTextContent('Matte lamination, Hot stamping');
    expect(screen.getByTestId('rfi-answer-oslo-price-sup-008')).toHaveTextContent(/210.*260/);
    expect(screen.getByTestId('rfi-answer-oslo-defect-sup-008')).toHaveTextContent('0.5%');
  });
});

describe('RFI → RFP (D3)', () => {
  it('offered on an Open RFI, and absent on a Draft one', async () => {
    rfiEventStore.update('rfi-002', (e) => ({ ...e, status: 'Draft' }));
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfi-open-rfi-001'));
    expect(await screen.findByTestId('rfi-to-rfp-rfi-001')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfi-open-rfi-002'));
    await screen.findByTestId('rfi-detail-rfi-002');
    expect(screen.queryByTestId('rfi-to-rfp-rfi-002')).not.toBeInTheDocument();
  });

  it('?rfi= opens the wizard pre-filled, and the sent RFP shows "Created from RFI-…"', async () => {
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT, route: '/buyer/rfp?rfi=rfi-002' });
    expect(await screen.findByTestId('rfp-new-from-rfi')).toHaveTextContent('Pre-filled from RFI-2026-002');
    expect(screen.getByLabelText('Title')).toHaveValue('Oslo sticker capability — variant labels 2027');
    const scope = screen.getByLabelText('Scope') as HTMLTextAreaElement;
    expect(scope.value).toMatch(/8 variant stickers/);
    expect(scope.value).toMatch(/Which die-cut type do you use\?/);

    fireEvent.change(screen.getByLabelText('Response deadline'), { target: { value: dayFromNow(20) } });
    next();
    const row = await screen.findByTestId('rfp-new-term-paymentTerms');
    fireEvent.click(within(row).getByLabelText('Payment terms (days) — Ask for this term'));
    fireEvent.change(within(row).getByLabelText('Payment terms (days) — PTI asks for'), { target: { value: '60' } });
    next();
    next();
    next();
    // The responder (sup-008) arrives already invited.
    await screen.findByTestId('rfp-new-invitee-row-sup-008');
    next();
    next(); // + the Documents step (B3), optional, so it passes empty
    await screen.findByTestId('rfp-new-review');
    fireEvent.click(screen.getByRole('button', { name: 'Send to suppliers' }));
    const detail = await screen.findByTestId('rfp-detail-rfp-0005');
    expect(within(detail).getByTestId('rfp-from-rfi-rfp-0005')).toHaveTextContent('Created from RFI-2026-002');
    expect(rfpEventStore.get('rfp-0005')!.sourceRfiId).toBe('rfi-002');
    expect(rfpEventStore.get('rfp-0005')!.invitees.map((i) => i.supplierId)).toEqual(['sup-008']);
  });
});

describe('custom terms and indicative pricing on the RFP surfaces', () => {
  it('the wizard refuses a custom number term asked in words, and takes it as a number', async () => {
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-new'));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Custom-term probe' } });
    fireEvent.change(screen.getByTestId('rfp-new-family'), { target: { value: 'packaging' } });
    fireEvent.change(screen.getByLabelText('Response deadline'), { target: { value: dayFromNow(20) } });
    next();
    await screen.findByTestId('rfp-new-custom-terms');
    fireEvent.change(screen.getByLabelText('Term'), { target: { value: 'Shelf life' } });
    fireEvent.change(screen.getByTestId('rfp-new-custom-kind'), { target: { value: 'numberWithUnit' } });
    fireEvent.change(screen.getByTestId('rfp-new-custom-requested'), { target: { value: 'two years' } });
    expect(await screen.findByTestId('rfp-new-custom-refusal')).toHaveTextContent('does not fit');
    expect(screen.getByTestId('rfp-new-custom-add')).toBeDisabled();
    fireEvent.change(screen.getByTestId('rfp-new-custom-requested'), { target: { value: '24' } });
    await waitFor(() => expect(screen.getByTestId('rfp-new-custom-add')).not.toBeDisabled());
    fireEvent.click(screen.getByTestId('rfp-new-custom-add'));
    expect(await screen.findByTestId('rfp-new-custom-custom-1')).toHaveTextContent('Shelf life');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled());
  });

  it('the buyer compares Tundra options × suppliers, Indicative, with the supplier’s own option', async () => {
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-002'));
    const cmp = await screen.findByTestId('rfp-pricing-rfp-002');
    expect(within(cmp).getByTestId('rfp-pricing-rfp-002-indicative')).toHaveTextContent('Indicative');
    expect(within(cmp).getByTestId('rfp-pricing-rfp-002-cell-opt-full-set-sup-007')).toHaveTextContent(/10,000.*4\.850/);
    expect(within(cmp).getByTestId('rfp-pricing-rfp-002-row-sup-opt-1')).toHaveTextContent(
      'Proposed by PT Sample Packaging Indonesia',
    );
    // Custom terms sit in the comparison with the buyer's label.
    expect(screen.getByTestId('rfp-term-custom-dosage')).toHaveTextContent('Pump dosage per stroke');
    expect(screen.getByTestId('rfp-cell-custom-dosage-sup-007')).toHaveTextContent('1.5 ml');
  });
});

describe('the gates as the supplier meets them (ICY)', () => {
  it('confidentiality first, then the T&C tick, then the form — and the buyer sees both acceptances', async () => {
    renderWithProviders(<SupplierRfp />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId('supplier-rfp-open-rfp-003'));
    const gate = await screen.findByTestId('supplier-rfp-gate-rfp-003');
    expect(gate).toHaveTextContent('PTI confidential');
    // KNOWN-BAD — nothing of the brief is on the page before accepting.
    expect(screen.queryByText(/Formula option 1/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('supplier-rfp-term-custom-formula-owner')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('supplier-rfp-gate-rfp-003-accept'));
    expect(await screen.findByTestId('supplier-rfp-accepted-rfp-003')).toBeInTheDocument();
    expect(await screen.findByTestId('supplier-rfp-term-custom-formula-owner')).toBeInTheDocument();
    expect(screen.getByTestId('supplier-rfp-rfp-003-pricing-indicative')).toHaveTextContent('Indicative');

    // The T&C is unaccepted: the boxes are shut and Accept needs the tick.
    expect(screen.getByTestId('supplier-rfp-save-rfp-003')).toBeDisabled();
    expect(screen.getByTestId('supplier-rfp-tc-accept-rfp-003')).toBeDisabled();
    fireEvent.click(screen.getByTestId('supplier-rfp-tc-tick-rfp-003'));
    fireEvent.click(screen.getByTestId('supplier-rfp-tc-accept-rfp-003'));
    expect(await screen.findByTestId('supplier-rfp-tc-accepted-rfp-003')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('supplier-rfp-save-rfp-003')).not.toBeDisabled());

    // The supplier proposes an option of its own, labelled as its own.
    fireEvent.change(screen.getByLabelText('Propose an option of your own'), { target: { value: 'Pump and cap only' } });
    fireEvent.click(screen.getByTestId('supplier-rfp-rfp-003-own-add'));
    expect(await screen.findByTestId('supplier-rfp-rfp-003-pricing-row-sup-opt-1')).toHaveTextContent('Your own option');

    const row = rfpResponseStore.all().find((r) => r.rfpId === 'rfp-003' && r.supplierId === 'sup-007')!;
    expect(row.confidentialityAcceptedAt).toBeDefined();
    expect(row.termsAcceptedAt).toBeDefined();

    cleanup();
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-003'));
    expect(await screen.findByTestId('rfp-accepted-rfp-003-sup-007')).not.toHaveTextContent('Not yet');
    expect(screen.getByTestId('rfp-tc-accepted-rfp-003-sup-007')).not.toHaveTextContent('Not yet');
    expect(screen.getByTestId('rfp-accepted-rfp-003-sup-015')).toHaveTextContent('Not yet');
  });
});

describe('templates from the wizard (D2)', () => {
  it('save as template, then start a new RFI from it', async () => {
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfi-open-rfi-002'));
    fireEvent.change(await screen.findByLabelText('Save as a template', { selector: '#rfi-rfi-002-template-name' }), {
      target: { value: 'Sticker converter survey' },
    });
    fireEvent.click(screen.getByTestId('rfi-rfi-002-template-save'));

    fireEvent.click(screen.getByTestId('rfi-new'));
    const pick = await screen.findByTestId('rfi-new-start-pick');
    const option = within(pick).getByRole('option', { name: 'Sticker converter survey' }) as HTMLOptionElement;
    fireEvent.change(pick, { target: { value: option.value } });
    fireEvent.click(screen.getByTestId('rfi-new-start-apply'));
    await waitFor(() => expect(screen.getByTestId('rfi-new-family')).toHaveValue('packaging'));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'From my template' } });
    fireEvent.change(screen.getByLabelText('Response deadline'), { target: { value: dayFromNow(14) } });
    next();
    expect(await screen.findByTestId('rfi-new-question-oslo-price')).toBeInTheDocument();
    expect(screen.getByTestId('rfi-new-section-custom-printing')).toHaveTextContent('Printing and finishing');
  });
});
