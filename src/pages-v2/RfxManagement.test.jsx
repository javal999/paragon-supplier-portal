// ─────────────────────────────────────────────────────────────────────────────
// RFx management on the screens (REQ-E03-01 to REQ-E03-05): the invitee filter
// on the RFQ wizard, the RFI board and answer form, the RFP terms comparison,
// the CR-15 bid comparison with its negotiation rounds and split award, the
// supplier's own thread, and the Home tasks on both sides.
//
// Every assertion that matters here is one a `?? 0` would have made pass on the
// wrong data: "No history" where nothing is measured, a DRAFT that PTI cannot
// read, a rival's price that is not on the supplier's page.
// ─────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import {
  awardCancellationStore,
  awardStore,
  resetRfxStores,
  rfpEventStore,
  rfpFirmOfferStore,
  rfpOfferRoundStore,
  rfpResponseStore
} from '@services/data/mock/stores/rfxStores';
import { mockDataService } from '@services/data/mock/mockDataService';
import { rfxNow } from './rfx/rfxDisplay';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
/** @import { QueryScope } from '@services/data/types' */
/** @import { DocumentRequest } from '@services/sourcing/types' */
import { formatDate } from '@lib/format';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { rfxEn, rfxId } from '@lib/i18n/rfx';
import BuyerRfi from './BuyerRfi';
import BuyerRfp from './BuyerRfp';
import BuyerSourcingEvent from './BuyerSourcingEvent';
import SupplierRfi from './SupplierRfi';
import SupplierRfp from './SupplierRfp';
import SupplierNegotiations from './SupplierNegotiations';
import BuyerSourcing from './BuyerSourcing';
import BuyerHome from './BuyerHome';
import SupplierHome from './SupplierHome';

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {QueryScope} */
const BUYER_SCOPE = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
/**
 * @param {string} supplierId
 * @param {string} supplierName
 * @returns {CurrentIdentity}
 */
const supplierSeat = (supplierId, supplierName) => ({
  personaType: 'supplier',
  supplierId,
  supplierName,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
});
const SUP_007 = supplierSeat('sup-007', 'PT Sample Packaging Indonesia');
const SUP_013 = supplierSeat('sup-013', 'PT Sample Preform Works');
const SUP_015 = supplierSeat('sup-015', 'PT Sample Flexible Packaging');

// ─────────────────────────────────────────────────────────────────────────────
// i18n — every key this phase added exists in BOTH locales.
// ─────────────────────────────────────────────────────────────────────────────

describe('RFx — the strings are bilingual, both directions', () => {
  it('every EN key has an ID twin, and vice versa', () => {
    expect(Object.keys(rfxEn).length).toBeGreaterThan(150); // population control
    // ⚠️ PLURAL-AWARE, for the reason `fragments.test.js` gives: English has a
    // `_one` form and Indonesian has only `_other`, so `rfx.rfp.proposals_one`
    // existing in EN alone is correct i18next, not a missing translation. The
    // EN `_one` of a key whose `_other` exists is dropped before comparing.
    const enComparable = Object.keys(rfxEn).filter(
      (k) => !(k.endsWith('_one') && `${k.slice(0, -4)}_other` in rfxEn)
    );
    expect(enComparable.sort()).toEqual(Object.keys(rfxId).sort());
    // known-good plural: the `_one` exists in EN only, the `_other` in both
    expect(rfxEn['rfx.rfp.proposals_one']).toBeDefined();
    expect(rfxId['rfx.rfp.proposals_one']).toBeUndefined();
    expect(rfxId['rfx.rfp.proposals_other']).toBeDefined();
    expect(Object.values(rfxId).every((v) => v.trim().length > 0)).toBe(true);
    // known-good / known-bad on the instrument itself
    expect(rfxEn['rfx.noHistory']).toBeDefined();
    expect(rfxEn['rfx.not.a.key']).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-01 — the invitee filter on the RFQ wizard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Open the wizard and walk to the invitee step. The scope step is filled
 * properly rather than bypassed: the wizard refuses to advance without a title,
 * a category, a material and a readable quantity, and that refusal is somebody
 * else's spec — walking THROUGH it is what proves this test is looking at the
 * real step and not at a component rendered out of context.
 */
const openInviteStep = async () => {
  renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
  fireEvent.click(await screen.findByText('New RFQ'));
  fireEvent.change(await screen.findByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i), {
    target: { value: 'Q4 2026 bottle tender' }
  });
  // The category select is the one offering the categories — found by its own
  // option rather than by a label the markup does not associate.
  const category = /** @type {HTMLElement} */ (
    screen
      .getAllByRole('combobox')
      .find((el) => within(el).queryByRole('option', { name: 'Packaging' }) !== null)
  );
  fireEvent.change(category, { target: { value: 'Packaging' } });
  fireEvent.click(await screen.findByRole('button', { name: 'PET Bottle 100ml' }));
  fireEvent.change(await screen.findByLabelText('Total quantity'), { target: { value: '120000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  // PREMISE CHANGED (RFx spec 2026-09-21): three authoring steps now sit
  // between the scope and the invitees — items, quantity breaks, and questions
  // and options. They are walked THROUGH, filled properly, for the reason the
  // scope step is: each refuses to advance until it is sound.
  fireEvent.change(await screen.findByTestId('rfq-item-1-description'), {
    target: { value: 'PET bottle 100ml' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.change(await screen.findByTestId('rfq-tiers-input'), { target: { value: '120000' } });
  fireEvent.click(screen.getByTestId('rfq-tiers-add'));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByTestId('rfq-options-step');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
};

describe('REQ-E03-01 — the invitee search on the sourcing wizard', () => {
  it('shows an active packaging supplier, and NEVER the suspended or blacklisted ones', async () => {
    await openInviteStep();
    await screen.findByTestId('invitee-group-filter');
    expect(screen.getByTestId('invitee-row-sup-007')).toBeInTheDocument();
    expect(screen.getByTestId('invitee-row-sup-013')).toBeInTheDocument();
    // sup-012 is Suspended, sup-014 Blacklisted. Neither is a candidate.
    expect(screen.queryByTestId('invitee-row-sup-012')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invitee-row-sup-014')).not.toBeInTheDocument();
  });

  it('CR-23 / BR-06 — a supplier failing the compliance gate is still listed and selectable, and marked with why', async () => {
    await openInviteStep();
    // ⚠️ PREMISE CHANGE (BL-94): this named sup-007, whose OTIF was 50%. BL-94
    // gave sup-007 a real delivery history (83%), so it passes now; the failing
    // supplier is sup-008, whose measured OTIF is 0%, under the 80% gate
    // minimum (BL-55 placeholder). The rule under test is unchanged.
    const row = await screen.findByTestId('invitee-row-sup-008');
    expect(within(row).getByTestId('invitee-gate-sup-008')).toHaveTextContent('Cannot be awarded');
    expect(within(row).getByTestId('invitee-gate-sup-008')).toHaveTextContent('OTIF below 80%');
    const box = within(row).getByRole('checkbox');
    fireEvent.click(box);
    expect(box).toBeChecked();
    // KNOWN-GOOD twin — "No history" passes the gate, so sup-013 is unmarked.
    expect(screen.queryByTestId('invitee-gate-sup-013')).not.toBeInTheDocument();
  });

  it('⚠️ a supplier with nothing measured reads "No history", never 0%', async () => {
    await openInviteStep();
    const row = await screen.findByTestId('invitee-row-sup-013');
    // PREMISE CHANGED (BL-52): the row now also carries the performance BAND,
    // which for this supplier reads "No history" too — so the assertion is aimed
    // at the OTIF cell itself rather than at the first "No history" in the row.
    expect(
      within(screen.getByTestId('invitee-otif-sup-013')).getByText('No history')
    ).toBeInTheDocument();
    expect(within(row).queryByText('0%')).not.toBeInTheDocument();
    // POSITIVE TWIN — a measured supplier still shows its number.
    // PREMISE CHANGED (REQ-E10-01): the positive twin's figure is CALCULATED
    // from sup-007's own deliveries (six measured, five met since BL-94) rather
    // than read off the master, so it is 83% where the authored master said 82%.
    expect(within(screen.getByTestId('invitee-row-sup-007')).getByText('83%')).toBeInTheDocument();
  });

  it('the purchasing-group filter narrows the result, and the empty state names the filters', async () => {
    await openInviteStep();
    fireEvent.change(await screen.findByTestId('invitee-group-filter'), {
      target: { value: '104' }
    });
    await waitFor(() => expect(screen.getByTestId('invitee-row-sup-008')).toBeInTheDocument());
    expect(screen.queryByTestId('invitee-row-sup-007')).not.toBeInTheDocument();

    // A combination nothing satisfies — the empty state states what was asked.
    fireEvent.change(screen.getByTestId('invitee-group-filter'), { target: { value: '102' } });
    const empty = await screen.findByTestId('invitee-empty');
    expect(empty).toHaveTextContent(/No supplier matches these filters/);
    expect(empty).toHaveTextContent(/Active filters/);
    expect(empty).toHaveTextContent(/Packaging/);
    expect(empty).toHaveTextContent(/102/);

    // ...and clearing them brings the pool back.
    fireEvent.click(screen.getByTestId('invitee-clear-filters'));
    await waitFor(() => expect(screen.getByTestId('invitee-row-sup-007')).toBeInTheDocument());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-02 — the RFI, both sides
// ─────────────────────────────────────────────────────────────────────────────

describe('REQ-E03-02 — the information request', () => {
  it('PTI reads the event, its invitees with OTIF, and the two SUBMITTED responses', async () => {
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT });
    expect(await screen.findByTestId('rfi-row-rfi-001')).toHaveTextContent('RFI-2026-001');
    fireEvent.click(screen.getByTestId('rfi-open-rfi-001'));
    const detail = await screen.findByTestId('rfi-detail-rfi-001');
    // PREMISE CHANGED (REQ-E10-01) — calculated, not authored.
    expect(within(detail).getByTestId('rfi-otif-sup-007')).toHaveTextContent('83%');
    // ⚠️ the new supplier's OTIF is a sentence, not a zero.
    expect(within(detail).getByTestId('rfi-otif-sup-013')).toHaveTextContent('No history');
    // BR-10 shape — the DRAFT author is listed as an invitee but its answers
    // are NOT in the comparison.
    expect(detail).toHaveTextContent('PT Sample Packaging Indonesia');
    expect(detail).toHaveTextContent('2 responses');
  });

  it('the supplier answers its own event, and its draft says PTI cannot see it', async () => {
    renderWithProviders(<SupplierRfi />, { identity: SUP_013 });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-001'));
    expect(await screen.findByTestId('supplier-rfi-draft-rfi-001')).toHaveTextContent(
      /PTI cannot see it until you send it/
    );
    // A half-filled response cannot be sent, and the page says why.
    expect(screen.getByTestId('supplier-rfi-submit-rfi-001')).toBeDisabled();
    expect(screen.getByTestId('supplier-rfi-missing-rfi-001')).toBeInTheDocument();
    // Saving a draft is NOT blocked — that is the point of a draft.
    expect(screen.getByTestId('supplier-rfi-save-rfi-001')).not.toBeDisabled();
  });

  it('company identity is never asked again — it comes from the company profile', async () => {
    renderWithProviders(<SupplierRfi />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId('supplier-rfi-open-rfi-001'));
    expect(await screen.findByText(/come from your company profile/i)).toBeInTheDocument();
    // The form starts at capability, and asks for no tax number or bank.
    expect(screen.getByTestId('rfi-field-a-categories')).toBeInTheDocument();
    // ...and no question asks for one: the sentence above is the only place the
    // words appear, which is exactly the point it is making.
    expect(screen.queryByTestId('rfi-field-tax-id')).not.toBeInTheDocument();
  });

  it('a supplier that was not invited reads nothing on this board', async () => {
    renderWithProviders(<SupplierRfi />, {
      identity: supplierSeat('sup-002', 'PT Sample Specialty Fats')
    });
    expect(await screen.findByTestId('supplier-rfi-empty')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-04 — the RFP terms comparison
// ─────────────────────────────────────────────────────────────────────────────

describe('REQ-E03-04 — terms as rows, suppliers as columns, deviations highlighted', () => {
  it('renders every asked term, and marks the deviations with their comment', async () => {
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-001'));
    const detail = await screen.findByTestId('rfp-detail-rfp-001');
    expect(within(detail).getByTestId('rfp-term-paymentTerms')).toBeInTheDocument();
    // sup-008 deviates on payment terms and explained why; sup-007 complies.
    const deviated = within(detail).getByTestId('rfp-cell-paymentTerms-sup-008');
    expect(deviated).toHaveTextContent('Deviate');
    expect(deviated).toHaveTextContent(/working capital facility/);
    expect(within(detail).getByTestId('rfp-cell-paymentTerms-sup-007')).toHaveTextContent('Comply');
    // The free-text "other terms" row is present for the supplier that added one.
    expect(within(detail).getByTestId('rfp-other-terms')).toHaveTextContent(/Tooling amortised/);
  });

  it('the proposals are scored with CR-15 because the request carries price and lead time', async () => {
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-001'));
    const detail = await screen.findByTestId('rfp-detail-rfp-001');
    expect(within(detail).getAllByText(/Weighted score/).length).toBeGreaterThan(0);
    expect(within(detail).getByText('Best scored')).toBeInTheDocument();
    // ...and the page does NOT claim the request is unscorable.
    expect(screen.queryByTestId('rfp-not-scorable')).not.toBeInTheDocument();
  });

  it('the supplier answers term by term, and a Deviate without a comment blocks sending', async () => {
    renderWithProviders(<SupplierRfp />, { identity: SUP_015 });
    fireEvent.click(await screen.findByTestId('supplier-rfp-open-rfp-001'));
    const row = await screen.findByTestId('supplier-rfp-term-priceValidity');
    const stance = within(row).getByLabelText(/Price validity period — Comply/i);
    fireEvent.change(stance, { target: { value: 'deviate' } });
    await waitFor(() =>
      expect(screen.getByTestId('supplier-rfp-comment-required-priceValidity')).toBeInTheDocument()
    );
    expect(screen.getByTestId('supplier-rfp-submit-rfp-001')).toBeDisabled();
    // POSITIVE TWIN — writing the comment clears the block.
    fireEvent.change(within(row).getByLabelText(/Price validity period — Comment/i), {
      target: { value: 'Board prices are re-quoted twice a year.' }
    });
    await waitFor(() =>
      expect(
        screen.queryByTestId('supplier-rfp-comment-required-priceValidity')
      ).not.toBeInTheDocument()
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NR-1 BR-08 (B4) — the Documents section and "Revise response" on the RFP form
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
/** @param {number} offset */
const dayFromNow = (offset) =>
  new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);
/** @type {DocumentRequest} */
const DIELINE = { id: 'dr-dieline', name: 'Dieline drawing', type: 'drawing', required: true };
const buyerScope = /** @type {const} */ ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles: SEEDED_SEAT_ROLES.buyer,
  actor: NO_PERSON
});
const sup007Scope = /** @type {const} */ ({
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
});

/**
 * A published RFP inviting sup-007, deadline in 14 days, asking for 1 required drawing; sup-007's terms saved as a draft.
 * @returns {Promise<{ rfpId: string; responseId: string }>}
 */
async function rfpWithDraft() {
  const created = await mockDataService.commands.dispatch(buyerScope, {
    transitionId: 't_rfp_create',
    entity: 'rfpEvent',
    payload: {
      title: 'Lip tint packaging',
      scope: 'Tube and cap',
      materialCategory: 'Packaging',
      responseDeadline: dayFromNow(14),
      currency: 'IDR',
      invitedSupplierIds: ['sup-007'],
      terms: [{ termId: 'paymentTerms', requestedValue: 'Net 30' }],
      documentRequests: [DIELINE]
    }
  });
  expect(created.status, created.reason).toBe('done');
  const rfpId = /** @type {NonNullable<typeof created.entityId>} */ (created.entityId);
  const published = await mockDataService.commands.dispatch(buyerScope, {
    transitionId: 't_rfp_publish',
    entity: 'rfpEvent',
    entityId: rfpId,
    payload: {}
  });
  expect(published.status, published.reason).toBe('done');
  const saved = await mockDataService.commands.dispatch(sup007Scope, {
    transitionId: 't_rfpresponse_save',
    entity: 'rfpResponse',
    payload: {
      rfpId,
      supplierId: 'sup-007',
      answers: [{ termId: 'paymentTerms', proposedValue: 'Net 30', stance: 'comply' }]
    }
  });
  expect(saved.status, saved.reason).toBe('done');
  return { rfpId, responseId: /** @type {NonNullable<typeof saved.entityId>} */ (saved.entityId) };
}

describe('NR-1 BR-08 — the supplier revises a submitted RFP before the deadline', () => {
  it('submits with a document, revises before the deadline, and sees version 2', async () => {
    const { rfpId, responseId } = await rfpWithDraft();
    renderWithProviders(<SupplierRfp />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId(`supplier-rfp-open-${rfpId}`));

    // The required slot blocks sending, by name, until a file is in it.
    expect(
      await screen.findByTestId(`supplier-rfp-docs-${rfpId}-slot-dr-dieline-refusal`)
    ).toHaveTextContent('Required: Dieline drawing.');
    expect(screen.getByTestId(`supplier-rfp-submit-${rfpId}`)).toBeDisabled();
    fireEvent.change(screen.getByTestId(`supplier-rfp-docs-${rfpId}-slot-dr-dieline-files-input`), {
      target: { files: [new File(['%PDF'], 'dieline-v1.pdf', { type: 'application/pdf' })] }
    });
    expect(await screen.findByText('dieline-v1.pdf')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId(`supplier-rfp-submit-${rfpId}`)).not.toBeDisabled()
    );
    fireEvent.click(screen.getByTestId(`supplier-rfp-submit-${rfpId}`));

    // Version 1, with the file; Save is shut (the save verb refuses a Submitted
    // response) and "Revise response" is offered.
    expect(await screen.findByTestId(`supplier-rfp-version-${rfpId}`)).toHaveTextContent(
      'Version 1'
    );
    await waitFor(() =>
      expect(rfpResponseStore.get(responseId)?.documents?.map((d) => d.attachment.name)).toEqual([
        'dieline-v1.pdf'
      ])
    );
    expect(screen.getByTestId(`supplier-rfp-save-${rfpId}`)).toBeDisabled();

    fireEvent.click(screen.getByTestId(`supplier-rfp-${rfpId}-revise`));
    expect(await screen.findByTestId(`supplier-rfp-${rfpId}-revising`)).toHaveTextContent(
      'version 2'
    );
    fireEvent.change(screen.getByLabelText('Other terms'), {
      target: { value: 'Tooling amortised over 12 months.' }
    });
    fireEvent.click(screen.getByTestId(`supplier-rfp-${rfpId}-revise-send`));

    expect(await screen.findByText(/Version 2/)).toBeInTheDocument();
    const stored = /** @type {import('../services/sourcing/types').RfpResponse} */ (
      rfpResponseStore.get(responseId)
    );
    expect(stored.status).toBe('Submitted');
    expect(stored.versions?.map((v) => v.number)).toEqual([1, 2]);
    // Version 1 is kept with its file, and without the later words.
    expect(stored.versions?.[0]?.otherTerms ?? '').toBe('');
    expect(stored.versions?.[0]?.documents?.map((d) => d.attachment.name)).toEqual([
      'dieline-v1.pdf'
    ]);
    expect(stored.versions?.[1]?.otherTerms).toBe('Tooling amortised over 12 months.');
  });

  it('after the deadline the form is read-only and "Revise response" is absent', async () => {
    const { rfpId, responseId } = await rfpWithDraft();
    const doc = {
      id: 'd-dieline',
      requestId: DIELINE.id,
      attachment: {
        id: 'a-dieline',
        name: 'dieline-v1.pdf',
        size: 1200,
        type: 'application/pdf',
        addedAt: rfxNow()
      }
    };
    const saved = await mockDataService.commands.dispatch(sup007Scope, {
      transitionId: 't_rfpresponse_save',
      entity: 'rfpResponse',
      payload: {
        rfpId,
        supplierId: 'sup-007',
        answers: [{ termId: 'paymentTerms', proposedValue: 'Net 30', stance: 'comply' }],
        documents: [doc]
      }
    });
    expect(saved.status, saved.reason).toBe('done');
    const sent = await mockDataService.commands.dispatch(sup007Scope, {
      transitionId: 't_rfpresponse_submit',
      entity: 'rfpResponse',
      entityId: responseId,
      payload: {}
    });
    expect(sent.status, sent.reason).toBe('done');
    sdcClock.set(new Date(Date.parse(rfxNow()) + 20 * DAY_MS).toISOString());

    renderWithProviders(<SupplierRfp />, { identity: SUP_007 });
    fireEvent.click(await screen.findByTestId(`supplier-rfp-open-${rfpId}`));
    expect(await screen.findByTestId(`supplier-rfp-${rfpId}-readonly`)).toHaveTextContent(
      /read-only/
    );
    expect(screen.getByTestId(`supplier-rfp-version-${rfpId}`)).toHaveTextContent('Version 1');
    expect(screen.queryByTestId(`supplier-rfp-${rfpId}-revise`)).toBeNull();
    // The file is listed; nothing can be added, removed or typed.
    const docs = screen.getByTestId(`supplier-rfp-docs-${rfpId}`);
    expect(within(docs).getByText('dieline-v1.pdf')).toBeInTheDocument();
    expect(within(docs).queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('Other terms')).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-05 — comparison, rounds, award
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mount the event page under a matching route so `useParams` resolves.
 * @param {string} rfqId
 */
const renderEvent = (rfqId) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: BUYER_SEAT, route: `/buyer/rfq/${rfqId}` }
  );

const openEvent = () => renderEvent('rfq-014');

describe('REQ-E03-05 — the bid comparison', () => {
  it('AC-01 — every criterion score, the weighted score, and the best one marked', async () => {
    openEvent();
    expect(await screen.findByTestId('cmp-row-rfx.cmp.row.priceScore')).toBeInTheDocument();
    expect(screen.getByTestId('cmp-row-rfx.cmp.row.leadTimeScore')).toBeInTheDocument();
    // ⚠️ PREMISE CHANGE (BL-43): compliance is no longer a weighted score row;
    // it is the CR-23 gate row (CR-15 re-weighted to price 40 / lead 20 / reliability 40).
    expect(screen.queryByTestId('cmp-row-rfx.cmp.row.complianceScore')).not.toBeInTheDocument();
    expect(screen.getByTestId('cmp-row-gate')).toBeInTheDocument();
    expect(screen.getByTestId('cmp-row-reliability')).toBeInTheDocument();
    expect(screen.getByTestId('cmp-row-weighted')).toBeInTheDocument();
    expect(screen.getByText('Best scored')).toBeInTheDocument();
    // BR-02 — the page says out loud that nothing is awarded automatically.
    expect(screen.getByText(/Nothing is awarded automatically/i)).toBeInTheDocument();
  });

  it('⚠️ the reliability axis names its source — "No history" beside the 50 it scores', async () => {
    openEvent();
    const row = await screen.findByTestId('cmp-row-reliability');
    expect(within(row).getByTestId('cmp-otif-sup-013')).toHaveTextContent('No history');
    // PREMISE CHANGED (REQ-E10-01) — calculated, not authored.
    expect(within(row).getByTestId('cmp-otif-sup-007')).toHaveTextContent('83%');
  });

  it('AC-03 — every quote version is kept and readable, rounds and all', async () => {
    openEvent();
    // sup-015 revised in round 1; BOTH versions are listed.
    expect(await screen.findByTestId('quote-version-qt-014d')).toBeInTheDocument();
    expect(screen.getByTestId('quote-version-qt-014d-r1')).toBeInTheDocument();
    expect(screen.getByTestId('quote-version-qt-014d-r1')).toHaveTextContent('Round 1');
  });

  it('the open round shows who has answered and who has not', async () => {
    openEvent();
    const round = await screen.findByTestId('round-nr-0001');
    expect(within(round).getByTestId('round-participant-nr-0001-sup-015')).toHaveTextContent(
      'Revised'
    );
    expect(within(round).getByTestId('round-participant-nr-0001-sup-007')).toHaveTextContent(
      'Not revised'
    );
    expect(round).toHaveTextContent('1 still to answer');
  });

  it('AC-04 — the award button stays disabled until each item’s shares total 100%', async () => {
    openEvent();
    const confirm = await screen.findByTestId('award-confirm');
    expect(confirm).toBeDisabled(); // nothing entered yet
    // RFx C3 — the legacy form is gone: rfq-014 is awarded per LINE on the one
    // panel, so the shares are typed per line item.
    const share = within(screen.getByTestId('award-input-PK-PETB-8802-sup-015')).getByLabelText(
      /Share/i
    );
    fireEvent.change(share, { target: { value: '70' } });
    await waitFor(() =>
      expect(screen.getByTestId('award-item-refusal')).toHaveAttribute(
        'data-code',
        'AWARD_SPLIT_INCOMPLETE'
      )
    );
    expect(screen.getByTestId('award-confirm')).toBeDisabled();
    // POSITIVE TWIN — completing the split to 100% enables it. ⚠️ PREMISE
    // CHANGE (BL-43): the second share used to go to sup-007, which then failed
    // the compliance gate (OTIF 50% < 80%; it passes at 83% since BL-94);
    // sup-013 passes.
    const second = within(screen.getByTestId('award-input-PK-PETB-8802-sup-013')).getByLabelText(
      /Share/i
    );
    fireEvent.change(second, { target: { value: '30' } });
    // The bottle line totals 100%; the refusal moves on to the cap line, still open.
    await waitFor(() =>
      expect(screen.getByTestId('award-item-refusal')).toHaveAttribute(
        'data-code',
        'AWARD_ITEMS_OPEN'
      )
    );
    fireEvent.change(
      within(screen.getByTestId('award-input-PK-CAPF-8820-sup-013')).getByLabelText(/Share/i),
      {
        target: { value: '100' }
      }
    );
    await waitFor(() => expect(screen.queryByTestId('award-item-refusal')).not.toBeInTheDocument());
  });

  it('BR-09 — a recorded award shows the split and says SAP raises the order', async () => {
    renderEvent('rfq-015');
    const recorded = await screen.findByTestId('award-recorded');
    expect(within(recorded).getByTestId('award-line-PK-CART-9910-sup-015')).toHaveTextContent(
      '70%'
    );
    expect(within(recorded).getByTestId('award-line-PK-CART-9910-sup-008')).toHaveTextContent(
      '30%'
    );
    expect(within(recorded).getByTestId('award-not-awarded')).toHaveTextContent(
      'PT Sample Packaging Indonesia'
    );
    expect(recorded).toHaveTextContent(/purchase order or contract is raised in SAP/i);
  });
});

describe('CR-23 — the compliance gate is shown on the event (BL-43)', () => {
  // ⚠️ PREMISE CHANGE (BL-94): the three specs below named sup-007 as rfq-014's
  // failing bidder (OTIF 50%). sup-007 now passes at 83%, so they name sup-008
  // (OTIF 0%), rfq-014's other failing bidder; each rule is unchanged.
  it('BR-06 — the invitee list marks a failing supplier and names why; a passing one is unmarked', async () => {
    openEvent();
    const marker = await screen.findByTestId('event-gate-sup-008');
    expect(marker).toHaveTextContent('Cannot be awarded');
    expect(marker).toHaveTextContent('OTIF below 80%');
    expect(screen.queryByTestId('event-gate-sup-013')).not.toBeInTheDocument();
    expect(screen.queryByTestId('event-gate-sup-007')).not.toBeInTheDocument();
    // Still an invitee — the row is there and still selectable for an extension.
    expect(within(screen.getByTestId('event-invitee-sup-008')).getByRole('checkbox')).toBeEnabled();
  });

  it('BR-01a — the comparison keeps the failing quote visible, marks it, and does not score it', async () => {
    openEvent();
    const row = await screen.findByTestId('cmp-row-gate');
    expect(within(row).getByTestId('cmp-gate-sup-008')).toHaveTextContent('Cannot be awarded');
    expect(within(row).getByTestId('cmp-gate-sup-013')).toHaveTextContent('Passes');
    expect(screen.getByTestId('cmp-not-scored-sup-008')).toHaveTextContent('Not scored');
    expect(screen.queryByTestId('cmp-not-scored-sup-013')).not.toBeInTheDocument();
    // The quote itself is still shown (its unit price row has a cell per bidder).
    expect(
      within(screen.getByTestId('cmp-row-rfx.cmp.row.unitPrice')).getAllByRole('cell')
    ).toHaveLength(5);
  });

  it('BR-01a — the award form offers no share for a failing supplier and shows the reason instead', async () => {
    openEvent();
    const failing = await screen.findByTestId('award-input-PK-PETB-8802-sup-008');
    expect(within(failing).queryByLabelText(/Share/i)).not.toBeInTheDocument();
    expect(within(failing).getByTestId('award-gate-PK-PETB-8802-sup-008')).toHaveTextContent(
      'OTIF below 80%'
    );
    // KNOWN-GOOD twin — a passing supplier can be given a share.
    expect(
      within(screen.getByTestId('award-input-PK-PETB-8802-sup-013')).getByLabelText(/Share/i)
    ).toBeInTheDocument();
  });

  it('BL-64 — when EVERY bidder fails (rfq-020), the award section says it cannot be awarded and offers no confirm', async () => {
    renderEvent('rfq-020');
    const notice = await screen.findByTestId('award-none-qualified');
    expect(notice).toHaveTextContent(rfxEn['rfx.gate.noAward']);
    expect(screen.queryByTestId('award-confirm')).not.toBeInTheDocument();
    // The reasons stay visible, by supplier — the notice does not replace them.
    expect(screen.getByTestId('award-gate-event-sup-011')).toHaveTextContent('no GMP / ISO 22716');
    expect(screen.getByTestId('award-gate-event-sup-004')).toHaveTextContent(
      'no valid BPOM registration'
    );
    expect(screen.getByTestId('award-gate-event-sup-009')).toHaveTextContent(
      'no valid halal certificate'
    );
    // ID locale carries the same notice.
    expect(rfxId['rfx.gate.noAward']).toMatch(/tidak dapat dimenangkan/);
  });

  it('BL-64 — KNOWN-GOOD twin: a mixed RFQ (rfq-016) shows the form and no such notice', async () => {
    renderEvent('rfq-016');
    expect(await screen.findByTestId('award-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('award-none-qualified')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('award-input-event-sup-017')).getByLabelText(/Share/i)
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('award-input-event-sup-018')).queryByLabelText(/Share/i)
    ).not.toBeInTheDocument();
  });
});

describe('REQ-E03-05 BR-05 — a supplier sees only its own thread and its own outcome', () => {
  it('the round page carries this supplier’s participation and no rival price', async () => {
    renderWithProviders(<SupplierNegotiations />, { identity: SUP_015 });
    const round = await screen.findByTestId('supplier-round-nr-0001');
    expect(round).toHaveTextContent('RFQ-2026-014');
    expect(round).toHaveTextContent(/looking for a bottle price/);
    // The other invitee is NOT named anywhere on this page.
    expect(screen.queryByText(/PT Sample Packaging Indonesia/)).not.toBeInTheDocument();
  });

  it('AC-05 — an awarded supplier reads its OWN share', async () => {
    renderWithProviders(<SupplierNegotiations />, { identity: SUP_015 });
    const award = await screen.findByTestId('supplier-outcome-rfq-015-PK-CART-9910');
    expect(award).toHaveTextContent('Your share: 70%');
    // KNOWN-BAD twin — the OTHER winner's 30% is not on this page.
    expect(award).not.toHaveTextContent('30%');
  });

  it('AC-05 — a supplier that lost reads "Not awarded", and no share at all', async () => {
    renderWithProviders(<SupplierNegotiations />, { identity: SUP_007 });
    const loser = await screen.findByTestId('supplier-outcome-rfq-015-PK-CART-9910');
    expect(loser).toHaveTextContent('Not awarded');
    expect(loser).not.toHaveTextContent('Your share');
  });

  // RFx C3 (NR-3 BR-12, AC-07) — per item: Awarded, Pending while an item is
  // open, and "Award withdrawn" with its date after a cancel. rfq-014 (legacy,
  // 2 lines): the bottle line goes 60/40 to sup-015 / sup-013 in a PARTIAL
  // award, so the cap line stays open.
  const partialOn014 = async () => {
    const svc = new MockCommandService();
    const res = await svc.dispatch(BUYER_SCOPE, {
      transitionId: 't_rfq_award_partial',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: 'qt-014d-r1',
        awardedSupplierId: 'sup-015',
        awardReason: 'Dual sourced.',
        awardLines: [
          {
            supplierId: 'sup-015',
            quotationId: 'qt-014d-r1',
            itemCode: 'PK-PETB-8802',
            sharePct: 60,
            quantity: 360_000
          },
          {
            supplierId: 'sup-013',
            quotationId: 'qt-014c',
            itemCode: 'PK-PETB-8802',
            sharePct: 40,
            quantity: 240_000
          }
        ]
      }
    });
    expect(res.status, res.reason).toBe('done');
    return {
      svc,
      awardId: /** @type {import('../services/sourcing/types').AwardRecord} */ (
        awardStore.all().find((a) => a.eventId === 'rfq-014')
      ).id
    };
  };

  it('AC-07 — the supplier reads its share on the awarded item and Pending on the open one', async () => {
    await partialOn014();
    renderWithProviders(<SupplierNegotiations />, { identity: SUP_015 });
    const bottle = await screen.findByTestId('supplier-outcome-rfq-014-PK-PETB-8802');
    expect(bottle).toHaveTextContent('Your share: 60% (360,000) at the 600,000 break');
    expect(bottle).not.toHaveTextContent('40%'); // the other winner's share is not here
    expect(screen.getByTestId('supplier-outcome-rfq-014-PK-CAPF-8820')).toHaveTextContent(
      'Pending'
    );
  });

  it('AC-07 — after a cancel the supplier reads "Award withdrawn" with the date, and the open item stays Pending', async () => {
    const { svc, awardId } = await partialOn014();
    const cancel = await svc.dispatch(BUYER_SCOPE, {
      transitionId: 't_rfq_award_cancel',
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: { awardId, cancelReason: 'Wrong split entered.' }
    });
    expect(cancel.status, cancel.reason).toBe('done');
    renderWithProviders(<SupplierNegotiations />, { identity: SUP_015 });
    const bottle = await screen.findByTestId('supplier-outcome-rfq-014-PK-PETB-8802');
    const withdrawnAt = /** @type {import('../services/sourcing/types').AwardCancellation} */ (
      awardCancellationStore.all()[0]
    ).cancelledAt;
    expect(bottle).toHaveTextContent(`Award withdrawn ${formatDate(withdrawnAt)}`);
    expect(bottle).not.toHaveTextContent('Your share');
    expect(screen.getByTestId('supplier-outcome-rfq-014-PK-CAPF-8820')).toHaveTextContent(
      'Pending'
    );
    // the buyer's reason stays on the buyer's read
    expect(screen.queryByText(/Wrong split entered/)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RFx D3 (NR-2) — the RFP screens: firm-offer rounds and the award
//
// rfp-002 (Tundra) is the fixture: PTI's options "Full set: bottle, pump and
// cap" (`opt-full-set`) and `opt-pump-cap` at 10K / 50K / 100K, and sup-007's
// submitted proposal. sup-015 (passes CR-23) and sup-008 (OTIF 0%: fails it)
// are added as submitted responders, as in rfpAwardCommand.test, and the RFP
// is closed by its verb.
// ─────────────────────────────────────────────────────────────────────────────

const FULL_SET = 'opt-full-set';
const FULL_SET_TITLE = 'Full set: bottle, pump and cap';
const PUMP_CAP = 'opt-pump-cap';
/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplierScope = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
});
// `dayFromNow` is the helper declared with the B4 cases above (same definition).

/**
 * @param {MockCommandService} svc
 * @returns {Promise<void>}
 */
async function closedTundra(svc) {
  rfpEventStore.update('rfp-002', (e) => ({
    ...e,
    invitees: [...e.invitees, { supplierId: 'sup-008' }]
  }));
  for (const supplierId of ['sup-015', 'sup-008']) {
    rfpResponseStore.add({
      id: `rfp-resp-d3-${supplierId}`,
      rfpId: 'rfp-002',
      supplierId,
      status: 'Submitted',
      updatedAt: rfxNow(),
      submittedAt: rfxNow(),
      answers: []
    });
  }
  const closed = await svc.dispatch(BUYER_SCOPE, {
    transitionId: 't_rfp_close',
    entity: 'rfpEvent',
    entityId: 'rfp-002',
    payload: {}
  });
  expect(closed.status, closed.reason).toBe('done');
}

/**
 * A round on the full set at 10K and 50K asking sup-007 and sup-015; returns its id.
 * @param {MockCommandService} svc
 * @returns {Promise<string>}
 */
async function fullSetRound(svc) {
  const round = await svc.dispatch(BUYER_SCOPE, {
    transitionId: 't_rfp_round_open',
    entity: 'rfpOfferRound',
    payload: {
      rfpId: 'rfp-002',
      optionRefs: [FULL_SET],
      quantityPoints: [10_000, 50_000],
      invitedSupplierIds: ['sup-007', 'sup-015'],
      deadline: dayFromNow(5)
    }
  });
  expect(round.status, round.reason).toBe('done');
  return /** @type {NonNullable<typeof round.entityId>} */ (round.entityId);
}

/**
 * Both suppliers send firm prices on the full set, and the buyer closes the round.
 * @param {MockCommandService} svc
 * @returns {Promise<Record<string, string>>}
 */
async function fullSetOffersClosed(svc) {
  const roundId = await fullSetRound(svc);
  /** @type {Record<string, string>} */
  const offers = {};
  for (const [supplierId, p10, p50] of /** @type {const} */ ([
    ['sup-007', 4_500, 4_100],
    ['sup-015', 4_600, 4_180]
  ])) {
    const res = await svc.dispatch(supplierScope(supplierId), {
      transitionId: 't_rfpfirmoffer_submit',
      entity: 'rfpFirmOffer',
      payload: {
        roundId,
        supplierId,
        prices: [
          { optionRef: FULL_SET, qty: 10_000, unitPrice: p10 },
          { optionRef: FULL_SET, qty: 50_000, unitPrice: p50 }
        ],
        validUntil: dayFromNow(60)
      }
    });
    expect(res.status, res.reason).toBe('done');
    offers[supplierId] = /** @type {NonNullable<typeof res.entityId>} */ (res.entityId);
  }
  const close = await svc.dispatch(BUYER_SCOPE, {
    transitionId: 't_rfp_round_close',
    entity: 'rfpOfferRound',
    entityId: roundId,
    payload: {}
  });
  expect(close.status, close.reason).toBe('done');
  return offers;
}

/**
 * Round 1 names both options; both suppliers price the full set, which is then
 * awarded partially (60/40 at 50,000), leaving the pump and cap open.
 * @param {MockCommandService} svc
 * @returns {Promise<void>}
 */
async function partlyAwardedTundra(svc) {
  const round = await svc.dispatch(BUYER_SCOPE, {
    transitionId: 't_rfp_round_open',
    entity: 'rfpOfferRound',
    payload: {
      rfpId: 'rfp-002',
      optionRefs: [FULL_SET, PUMP_CAP],
      quantityPoints: [50_000],
      invitedSupplierIds: ['sup-007', 'sup-015'],
      deadline: dayFromNow(5)
    }
  });
  expect(round.status, round.reason).toBe('done');
  /** @type {Record<string, string>} */
  const offers = {};
  for (const [supplierId, price] of /** @type {const} */ ([
    ['sup-007', 4_100],
    ['sup-015', 4_180]
  ])) {
    const res = await svc.dispatch(supplierScope(supplierId), {
      transitionId: 't_rfpfirmoffer_submit',
      entity: 'rfpFirmOffer',
      payload: {
        roundId: round.entityId,
        supplierId,
        prices: [{ optionRef: FULL_SET, qty: 50_000, unitPrice: price }],
        validUntil: dayFromNow(60)
      }
    });
    expect(res.status, res.reason).toBe('done');
    offers[supplierId] = /** @type {NonNullable<typeof res.entityId>} */ (res.entityId);
  }
  const close = await svc.dispatch(BUYER_SCOPE, {
    transitionId: 't_rfp_round_close',
    entity: 'rfpOfferRound',
    entityId: /** @type {NonNullable<typeof round.entityId>} */ (round.entityId),
    payload: {}
  });
  expect(close.status, close.reason).toBe('done');
  const partial = await svc.dispatch(BUYER_SCOPE, {
    transitionId: 't_rfp_award_partial',
    entity: 'rfpEvent',
    entityId: 'rfp-002',
    payload: {
      awardReason: 'Dual source on the full set.',
      awardLines: [
        {
          supplierId: 'sup-007',
          optionRef: FULL_SET,
          firmOfferId: offers['sup-007'],
          sharePct: 60,
          quantity: 30_000,
          splitBasis: 'pct',
          awardTierQty: 50_000
        },
        {
          supplierId: 'sup-015',
          optionRef: FULL_SET,
          firmOfferId: offers['sup-015'],
          sharePct: 40,
          quantity: 20_000,
          splitBasis: 'pct',
          awardTierQty: 50_000
        }
      ]
    }
  });
  expect(partial.status, partial.reason).toBe('done');
  expect(
    /** @type {import('../services/sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002'))
      .status
  ).toBe('Partly awarded');
}

describe('RFx D3 — the RFP screens for firm-offer rounds and award (NR-2)', () => {
  it('buyer steps 2–4 / BR-02 — the buyer opens a firm-offer round; a supplier failing CR-23 cannot be selected', async () => {
    await closedTundra(new MockCommandService());
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-002'));
    fireEvent.click(await screen.findByTestId('rfp-ask-firm-rfp-002'));
    const form = await screen.findByTestId('rfp-round-form-rfp-002');
    // sup-008 is listed with the reason and cannot be picked; sup-015 can.
    await waitFor(() =>
      expect(within(form).getByTestId('rfp-round-supplier-sup-008')).toBeDisabled()
    );
    expect(within(form).getByTestId('rfp-round-gate-sup-008')).toHaveTextContent('OTIF below 80%');
    expect(within(form).getByTestId('rfp-round-supplier-sup-015')).toBeEnabled();
    // Nothing picked yet: the verb's own rule holds the button.
    expect(within(form).getByTestId('rfp-round-open-rfp-002')).toBeDisabled();
    fireEvent.click(within(form).getByTestId(`rfp-round-option-${FULL_SET}`));
    fireEvent.click(within(form).getByTestId('rfp-round-supplier-sup-007'));
    fireEvent.click(within(form).getByTestId('rfp-round-supplier-sup-015'));
    fireEvent.change(within(form).getByLabelText('Round deadline'), {
      target: { value: dayFromNow(5) }
    });
    await waitFor(() => expect(within(form).getByTestId('rfp-round-open-rfp-002')).toBeEnabled());
    fireEvent.click(within(form).getByTestId('rfp-round-open-rfp-002'));
    await waitFor(() => expect(rfpOfferRoundStore.all()).toHaveLength(1));
    const [round] = rfpOfferRoundStore.all();
    expect(
      /** @type {import('../services/sourcing/types').RfpOfferRound} */ (round).invitedSupplierIds
    ).toEqual(['sup-007', 'sup-015']);
    expect(
      /** @type {import('../services/sourcing/types').RfpOfferRound} */ (round).optionRefs
    ).toEqual([FULL_SET]);
    expect(
      await screen.findByTestId(
        `rfp-round-${/** @type {import('../services/sourcing/types').RfpOfferRound} */ (round).id}`
      )
    ).toHaveTextContent('Round 1');
  });

  it('supplier steps 2–3 / BR-03 — the supplier sends a firm offer and reads it labelled Firm with its validity', async () => {
    const svc = new MockCommandService();
    await closedTundra(svc);
    const roundId = await fullSetRound(svc);
    renderWithProviders(<SupplierRfp />, { identity: SUP_007 });
    expect(await screen.findByTestId(`supplier-round-notice-${roundId}`)).toHaveTextContent(
      'Prices you give in this round are firm offers until the validity date you set.'
    );
    fireEvent.change(screen.getByLabelText(`${FULL_SET_TITLE} — 10,000`), {
      target: { value: '4500' }
    });
    fireEvent.change(screen.getByLabelText(`${FULL_SET_TITLE} — 50,000`), {
      target: { value: '4100' }
    });
    // The validity date is required: without it the send waits.
    expect(screen.getByTestId(`supplier-round-send-${roundId}`)).toBeDisabled();
    const validUntil = dayFromNow(60);
    fireEvent.change(screen.getByLabelText('Valid until'), { target: { value: validUntil } });
    fireEvent.click(screen.getByTestId(`supplier-round-send-${roundId}`));
    const offer = await screen.findByTestId(`supplier-round-offer-${roundId}`);
    expect(offer).toHaveTextContent('Firm');
    expect(offer).toHaveTextContent(`Valid until ${formatDate(validUntil)}`);
    // Sent once, the same form now revises it.
    expect(screen.getByTestId(`supplier-round-send-${roundId}`)).toHaveTextContent(
      'Revise firm offer'
    );
  });

  it('buyer steps 5–7 / BR-08 — the buyer awards option 1 at 60/40: the RFP reads Awarded, "Create RFQ" is gone for option 1 and kept for option 2', async () => {
    const svc = new MockCommandService();
    await closedTundra(svc);
    await fullSetOffersClosed(svc);
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-002'));
    // BR-03 — the firm prices sit beside the indicative ones, labelled Firm.
    expect(
      await screen.findByTestId(`rfp-pricing-rfp-002-firm-${FULL_SET}-sup-015`)
    ).toHaveTextContent('Firm');
    const item = await screen.findByTestId(`award-item-${FULL_SET}`);
    fireEvent.change(
      within(within(item).getByTestId(`award-input-${FULL_SET}-sup-007`)).getByLabelText(/Share/i),
      {
        target: { value: '60' }
      }
    );
    fireEvent.change(
      within(within(item).getByTestId(`award-input-${FULL_SET}-sup-015`)).getByLabelText(/Share/i),
      {
        target: { value: '40' }
      }
    );
    // BR-06 — every RFP award needs a reason: the confirm waits for it.
    expect(screen.getByTestId('award-confirm')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Award reason'), {
      target: { value: 'Dual source on the full set.' }
    });
    await waitFor(() => expect(screen.getByTestId('award-confirm')).toBeEnabled());
    fireEvent.click(screen.getByTestId('award-confirm'));
    await waitFor(() =>
      expect(
        /** @type {import('../services/sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002'))
          .status
      ).toBe('Awarded')
    );
    await waitFor(() => expect(screen.getByTestId('rfp-row-rfp-002')).toHaveTextContent('Awarded'));
    expect(await screen.findByTestId(`award-line-${FULL_SET}-sup-007`)).toHaveTextContent('60%');
    const toRfq = screen.getByTestId('rfp-to-rfq-rfp-002');
    expect(within(toRfq).queryByTestId(`rfp-to-rfq-option-${FULL_SET}`)).not.toBeInTheDocument();
    expect(within(toRfq).getByTestId('rfp-to-rfq-option-opt-pump-cap')).toBeInTheDocument();
  });

  it('BR-09 / AC-07 — the supplier reads its own share on option 1, and no rival share', async () => {
    const svc = new MockCommandService();
    await closedTundra(svc);
    const offers = await fullSetOffersClosed(svc);
    const res = await svc.dispatch(BUYER_SCOPE, {
      transitionId: 't_rfp_award',
      entity: 'rfpEvent',
      entityId: 'rfp-002',
      payload: {
        awardReason: 'Dual source on the full set.',
        awardLines: [
          {
            supplierId: 'sup-007',
            optionRef: FULL_SET,
            firmOfferId: offers['sup-007'],
            sharePct: 60,
            quantity: 6_000,
            splitBasis: 'pct',
            awardTierQty: 10_000
          },
          {
            supplierId: 'sup-015',
            optionRef: FULL_SET,
            firmOfferId: offers['sup-015'],
            sharePct: 40,
            quantity: 4_000,
            splitBasis: 'pct',
            awardTierQty: 10_000
          }
        ]
      }
    });
    expect(res.status, res.reason).toBe('done');
    renderWithProviders(<SupplierRfp />, { identity: SUP_007 });
    const outcome = await screen.findByTestId(`supplier-rfp-outcome-rfp-002-${FULL_SET}`);
    expect(outcome).toHaveTextContent('Your share: 60% (6,000) at the 10,000 quantity point');
    expect(outcome).not.toHaveTextContent('40%');
    // The buyer's reason stays on the buyer's read.
    expect(screen.queryByText(/Dual source on the full set/)).not.toBeInTheDocument();
  });

  it('RFX-D15 — a Partly awarded RFP offers "Ask for firm offers" with only the open option selectable', async () => {
    const svc = new MockCommandService();
    await closedTundra(svc);
    await partlyAwardedTundra(svc);

    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-002'));
    fireEvent.click(await screen.findByTestId('rfp-ask-firm-rfp-002'));
    const form = await screen.findByTestId('rfp-round-form-rfp-002');
    // The awarded full set is listed, disabled, saying why; the pump and cap can be picked.
    await waitFor(() =>
      expect(within(form).getByTestId(`rfp-round-option-${FULL_SET}`)).toBeDisabled()
    );
    expect(within(form).getByTestId(`rfp-round-option-settled-${FULL_SET}`)).toHaveTextContent(
      'Awarded on this RFP'
    );
    expect(within(form).getByTestId(`rfp-round-option-${PUMP_CAP}`)).toBeEnabled();
    expect(
      within(form).queryByTestId(`rfp-round-option-settled-${PUMP_CAP}`)
    ).not.toBeInTheDocument();
    fireEvent.click(within(form).getByTestId(`rfp-round-option-${PUMP_CAP}`));
    fireEvent.click(within(form).getByTestId('rfp-round-supplier-sup-007'));
    fireEvent.change(within(form).getByLabelText('Round deadline'), {
      target: { value: dayFromNow(5) }
    });
    await waitFor(() => expect(within(form).getByTestId('rfp-round-open-rfp-002')).toBeEnabled());
    fireEvent.click(within(form).getByTestId('rfp-round-open-rfp-002'));
    await waitFor(() => expect(rfpOfferRoundStore.all()).toHaveLength(2));
    const second = /** @type {import('../services/sourcing/types').RfpOfferRound} */ (
      rfpOfferRoundStore.all().find((r) => r.roundNumber === 2)
    );
    expect(second.optionRefs).toEqual([PUMP_CAP]);
    expect(
      /** @type {import('../services/sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002'))
        .status
    ).toBe('Partly awarded');
  });

  it('BL-130 / BR-16f — a Partly awarded RFP is closed out with "Will not award the rest", which waits for the reason', async () => {
    const svc = new MockCommandService();
    await closedTundra(svc);
    await partlyAwardedTundra(svc);
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-002'));
    const settle = await screen.findByTestId('award-settle-rest');
    expect(settle).toHaveTextContent('Marks every open option “Will not award”');
    // NR-2 BR-06 — the close-out is an RFP award too: it waits for the reason.
    expect(within(settle).getByTestId('award-will-not-rest')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Award reason'), {
      target: { value: 'Pump and cap stays with the current supplier.' }
    });
    await waitFor(() => expect(within(settle).getByTestId('award-will-not-rest')).toBeEnabled());
    fireEvent.click(within(settle).getByTestId('award-will-not-rest'));
    await waitFor(() =>
      expect(
        /** @type {import('../services/sourcing/types').RfpEvent} */ (rfpEventStore.get('rfp-002'))
          .status
      ).toBe('Awarded')
    );
    const closeOut = /** @type {import('../services/sourcing/types').AwardRecord} */ (
      awardStore.all().find((a) => a.eventType === 'rfp' && a.lines.length === 0)
    );
    expect(closeOut.reason).toBe('Pump and cap stays with the current supplier.');
    await waitFor(() => expect(screen.getByTestId('rfp-row-rfp-002')).toHaveTextContent('Awarded'));
  });

  it('BL-130 — "Will not award the rest" is not offered on a Closed RFP with nothing awarded yet', async () => {
    const svc = new MockCommandService();
    await closedTundra(svc);
    await fullSetOffersClosed(svc);
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-002'));
    // Population control: the award panel is on the page.
    expect(await screen.findByTestId(`award-item-${FULL_SET}`)).toBeInTheDocument();
    expect(screen.queryByTestId('award-settle-rest')).not.toBeInTheDocument();
  });

  it('BL-129 / CE-11h — the supplier attaches a file to its firm offer, and the buyer sees it on the round', async () => {
    const svc = new MockCommandService();
    await closedTundra(svc);
    const roundId = await fullSetRound(svc);
    const first = renderWithProviders(<SupplierRfp />, { identity: SUP_007 });
    await screen.findByTestId(`supplier-round-notice-${roundId}`);
    fireEvent.change(screen.getByLabelText(`${FULL_SET_TITLE} — 10,000`), {
      target: { value: '4500' }
    });
    fireEvent.change(screen.getByLabelText(`${FULL_SET_TITLE} — 50,000`), {
      target: { value: '4100' }
    });
    fireEvent.change(screen.getByLabelText('Valid until'), { target: { value: dayFromNow(60) } });
    const docs = screen.getByTestId(`supplier-round-docs-${roundId}`);
    expect(docs).toHaveTextContent('Documents with this firm offer');
    fireEvent.change(within(docs).getByTestId(`supplier-round-docs-${roundId}-input`), {
      target: { files: [new File(['%PDF'], 'revised-drawing.pdf', { type: 'application/pdf' })] }
    });
    await waitFor(() => expect(within(docs).getByText('revised-drawing.pdf')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId(`supplier-round-send-${roundId}`));
    await screen.findByTestId(`supplier-round-offer-${roundId}`);
    const [offer] = rfpFirmOfferStore.all().filter((o) => o.roundId === roundId);
    expect(
      /** @type {import('../services/sourcing/types').RfpFirmOffer} */ (offer).documents?.map(
        (d) => d.name
      )
    ).toEqual(['revised-drawing.pdf']);
    expect(
      /** @type {import('../services/sourcing/types').RfpFirmOfferVersion} */ (
        /** @type {import('../services/sourcing/types').RfpFirmOffer} */ (offer).versions[
          /** @type {import('../services/sourcing/types').RfpFirmOffer} */ (offer).versions.length -
            1
        ]
      ).documents?.map((d) => d.name)
    ).toEqual(['revised-drawing.pdf']);

    // A revision that leaves the files untouched keeps them in force.
    fireEvent.change(screen.getByLabelText(`${FULL_SET_TITLE} — 50,000`), {
      target: { value: '4050' }
    });
    fireEvent.click(screen.getByTestId(`supplier-round-send-${roundId}`));
    await waitFor(() =>
      expect(
        /** @type {import('../services/sourcing/types').RfpFirmOffer} */ (
          rfpFirmOfferStore.get(
            /** @type {import('../services/sourcing/types').RfpFirmOffer} */ (offer).id
          )
        ).versions
      ).toHaveLength(2)
    );
    expect(
      /** @type {import('../services/sourcing/types').RfpFirmOffer} */ (
        rfpFirmOfferStore.get(
          /** @type {import('../services/sourcing/types').RfpFirmOffer} */ (offer).id
        )
      ).documents?.map((d) => d.name)
    ).toEqual(['revised-drawing.pdf']);
    first.unmount();

    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-002'));
    const seen = await screen.findByTestId(`rfp-round-docs-${roundId}-sup-007`);
    expect(seen).toHaveTextContent('Documents from');
    expect(seen).toHaveTextContent('revised-drawing.pdf');
    // Read-only on the buyer's side: no add control.
    expect(
      within(seen).queryByTestId(`rfp-round-docs-${roundId}-sup-007-add`)
    ).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3.8 SC-01 — the Home tasks
// ─────────────────────────────────────────────────────────────────────────────

describe('Home tasks — RFx work reaches the task list on both sides', () => {
  it('PTI sees negotiation rounds closing soon, and still sees events ready to award', async () => {
    renderWithProviders(<BuyerHome />, { identity: BUYER_SEAT });
    expect(await screen.findByTestId('home-task-negotiation-closing')).toHaveTextContent(
      'Negotiation rounds closing soon'
    );
    // The task that already existed still works — Phase 6a added to this list
    // rather than replacing it.
    expect(screen.getByTestId('home-task-rfq-award')).toBeInTheDocument();
  });

  it('the supplier still to answer sees BOTH requests on its list', async () => {
    // sup-013 holds a DRAFT on the information request and has not opened the
    // proposal request at all — a draft is still "to answer".
    renderWithProviders(<SupplierHome />, { identity: SUP_013 });
    expect(await screen.findByTestId('home-task-rfi-answer')).toHaveTextContent(
      'Information requests to answer'
    );
    expect(screen.getByTestId('home-task-rfp-answer')).toHaveTextContent(
      'Proposal requests to answer'
    );
  });

  it('the supplier PTI is waiting on sees "Revised quote requested"; the one that answered does not', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUP_007 });
    expect(await screen.findByTestId('home-task-revised-quote')).toHaveTextContent(
      'Revised quote requested'
    );
  });

  it('POSITIVE TWIN — a supplier that HAS revised is not asked again', async () => {
    // sup-015 answered round 1, so the task has nothing to count and the list
    // does not carry it. A task that appeared anyway would be asking for work
    // already done.
    renderWithProviders(<SupplierHome />, { identity: SUP_015 });
    // Wait for the list to RESOLVE — either a task list or the nothing-to-do
    // state — so the absence below is a rendered absence and not a page that
    // has simply not finished loading.
    await waitFor(() =>
      expect(
        screen.queryByTestId('home-tasks') ?? screen.queryByTestId('home-empty')
      ).not.toBeNull()
    );
    expect(screen.queryByTestId('home-task-revised-quote')).not.toBeInTheDocument();
  });
});
