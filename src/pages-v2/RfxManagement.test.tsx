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
import { renderWithProviders, BUYER } from '../test/test-utils';
import type { CurrentIdentity } from '../context/CurrentIdentityContext';
import { SEEDED_SEAT_ROLES } from '../services/transitions/businessRoles';
import { NO_PERSON } from '../context/noPerson';
import { resetRfxStores } from '../services/data/mock/stores/rfxStores';
import { rfqStore } from '../services/data/mock/stores/rfqStore';
import { quotationStore } from '../services/data/mock/stores/quotationStore';
import { sdcClock } from '../services/sdc';
import { rfxEn, rfxId } from '../lib/i18n/rfx';
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
const supplierSeat = (supplierId: string, supplierName: string): CurrentIdentity => ({
  personaType: 'supplier',
  supplierId,
  supplierName,
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON,
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
    // ⚠️ PLURAL-AWARE, for the reason `fragments.test.ts` gives: English has a
    // `_one` form and Indonesian has only `_other`, so `rfx.rfp.proposals_one`
    // existing in EN alone is correct i18next, not a missing translation. The
    // EN `_one` of a key whose `_other` exists is dropped before comparing.
    const enComparable = Object.keys(rfxEn).filter(
      (k) => !(k.endsWith('_one') && `${k.slice(0, -4)}_other` in rfxEn),
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
    target: { value: 'Q4 2026 bottle tender' },
  });
  // The category select is the one offering the categories — found by its own
  // option rather than by a label the markup does not associate.
  const category = screen
    .getAllByRole('combobox')
    .find((el) => within(el).queryByRole('option', { name: 'Packaging' }) !== null)!;
  fireEvent.change(category, { target: { value: 'Packaging' } });
  fireEvent.click(await screen.findByRole('button', { name: 'PET Bottle 100ml' }));
  fireEvent.change(await screen.findByLabelText('Total quantity'), { target: { value: '120000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  // PREMISE CHANGED (RFx spec 2026-09-21): three authoring steps now sit
  // between the scope and the invitees — items, quantity breaks, and questions
  // and options. They are walked THROUGH, filled properly, for the reason the
  // scope step is: each refuses to advance until it is sound.
  fireEvent.change(await screen.findByTestId('rfq-item-1-description'), { target: { value: 'PET bottle 100ml' } });
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
    const row = await screen.findByTestId('invitee-row-sup-007');
    // sup-007's measured OTIF is 50%, under the 80% gate minimum (BL-55 placeholder).
    expect(within(row).getByTestId('invitee-gate-sup-007')).toHaveTextContent('Cannot be awarded');
    expect(within(row).getByTestId('invitee-gate-sup-007')).toHaveTextContent('OTIF below 80%');
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
    expect(within(screen.getByTestId('invitee-otif-sup-013')).getByText('No history')).toBeInTheDocument();
    expect(within(row).queryByText('0%')).not.toBeInTheDocument();
    // POSITIVE TWIN — a measured supplier still shows its number.
    // PREMISE CHANGED (REQ-E10-01): the positive twin's figure is CALCULATED
    // from sup-007's own deliveries (two measured, one met) rather than read off
    // the master, so it is 50% where the authored master said 82%.
    expect(within(screen.getByTestId('invitee-row-sup-007')).getByText('50%')).toBeInTheDocument();
  });

  it('the purchasing-group filter narrows the result, and the empty state names the filters', async () => {
    await openInviteStep();
    fireEvent.change(await screen.findByTestId('invitee-group-filter'), { target: { value: '104' } });
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
    expect(within(detail).getByTestId('rfi-otif-sup-007')).toHaveTextContent('50%');
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
      /PTI cannot see it until you send it/,
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
    renderWithProviders(<SupplierRfi />, { identity: supplierSeat('sup-002', 'PT Sample Specialty Fats') });
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
      expect(screen.getByTestId('supplier-rfp-comment-required-priceValidity')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('supplier-rfp-submit-rfp-001')).toBeDisabled();
    // POSITIVE TWIN — writing the comment clears the block.
    fireEvent.change(within(row).getByLabelText(/Price validity period — Comment/i), {
      target: { value: 'Board prices are re-quoted twice a year.' },
    });
    await waitFor(() =>
      expect(screen.queryByTestId('supplier-rfp-comment-required-priceValidity')).not.toBeInTheDocument(),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REQ-E03-05 — comparison, rounds, award
// ─────────────────────────────────────────────────────────────────────────────

/** Mount the event page under a matching route so `useParams` resolves. */
const renderEvent = (rfqId: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: BUYER_SEAT, route: `/buyer/rfq/${rfqId}` },
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
    expect(within(row).getByTestId('cmp-otif-sup-007')).toHaveTextContent('50%');
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
    expect(within(round).getByTestId('round-participant-nr-0001-sup-015')).toHaveTextContent('Revised');
    expect(within(round).getByTestId('round-participant-nr-0001-sup-007')).toHaveTextContent('Not revised');
    expect(round).toHaveTextContent('1 still to answer');
  });

  it('AC-04 — the award button stays disabled until each item’s shares total 100%', async () => {
    openEvent();
    const confirm = await screen.findByTestId('award-confirm');
    expect(confirm).toBeDisabled(); // nothing entered yet
    const share = within(screen.getByTestId('award-input-sup-015')).getByLabelText(/Share/i);
    fireEvent.change(share, { target: { value: '70' } });
    await waitFor(() => expect(screen.getByTestId('award-split-invalid')).toBeInTheDocument());
    expect(screen.getByTestId('award-confirm')).toBeDisabled();
    // POSITIVE TWIN — completing the split to 100% enables it. ⚠️ PREMISE
    // CHANGE (BL-43): the second share used to go to sup-007, which now fails
    // the compliance gate (OTIF 50% < 80%) and has no share field; sup-013 passes.
    const second = within(screen.getByTestId('award-input-sup-013')).getByLabelText(/Share/i);
    fireEvent.change(second, { target: { value: '30' } });
    await waitFor(() => expect(screen.queryByTestId('award-split-invalid')).not.toBeInTheDocument());
  });

  it('BR-09 — a recorded award shows the split and says SAP raises the order', async () => {
    renderEvent('rfq-015');
    const recorded = await screen.findByTestId('award-recorded');
    expect(within(recorded).getByTestId('award-line-sup-015')).toHaveTextContent('70%');
    expect(within(recorded).getByTestId('award-line-sup-008')).toHaveTextContent('30%');
    expect(within(recorded).getByTestId('award-not-awarded')).toHaveTextContent(
      'PT Sample Packaging Indonesia',
    );
    expect(recorded).toHaveTextContent(/purchase order or contract is raised in SAP/i);
  });
});

describe('CR-23 — the compliance gate is shown on the event (BL-43)', () => {
  it('BR-06 — the invitee list marks a failing supplier and names why; a passing one is unmarked', async () => {
    openEvent();
    const marker = await screen.findByTestId('event-gate-sup-007');
    expect(marker).toHaveTextContent('Cannot be awarded');
    expect(marker).toHaveTextContent('OTIF below 80%');
    expect(screen.queryByTestId('event-gate-sup-013')).not.toBeInTheDocument();
    // Still an invitee — the row is there and still selectable for an extension.
    expect(within(screen.getByTestId('event-invitee-sup-007')).getByRole('checkbox')).toBeEnabled();
  });

  it('BR-01a — the comparison keeps the failing quote visible, marks it, and does not score it', async () => {
    openEvent();
    const row = await screen.findByTestId('cmp-row-gate');
    expect(within(row).getByTestId('cmp-gate-sup-007')).toHaveTextContent('Cannot be awarded');
    expect(within(row).getByTestId('cmp-gate-sup-013')).toHaveTextContent('Passes');
    expect(screen.getByTestId('cmp-not-scored-sup-007')).toHaveTextContent('Not scored');
    expect(screen.queryByTestId('cmp-not-scored-sup-013')).not.toBeInTheDocument();
    // The quote itself is still shown (its unit price row has a cell per bidder).
    expect(within(screen.getByTestId('cmp-row-rfx.cmp.row.unitPrice')).getAllByRole('cell')).toHaveLength(5);
  });

  it('BR-01a — the award form offers no share for a failing supplier and shows the reason instead', async () => {
    openEvent();
    const failing = await screen.findByTestId('award-input-sup-007');
    expect(within(failing).queryByLabelText(/Share/i)).not.toBeInTheDocument();
    expect(within(failing).getByTestId('award-gate-sup-007')).toHaveTextContent('OTIF below 80%');
    // KNOWN-GOOD twin — a passing supplier can be given a share.
    expect(within(screen.getByTestId('award-input-sup-013')).getByLabelText(/Share/i)).toBeInTheDocument();
  });

  it('BL-64 — when EVERY bidder fails (rfq-020), the award section says it cannot be awarded and offers no confirm', async () => {
    renderEvent('rfq-020');
    const notice = await screen.findByTestId('award-none-qualified');
    expect(notice).toHaveTextContent(rfxEn['rfx.gate.noAward']);
    expect(screen.queryByTestId('award-confirm')).not.toBeInTheDocument();
    // The reasons stay visible, by supplier — the notice does not replace them.
    expect(screen.getByTestId('award-gate-sup-011')).toHaveTextContent('no GMP / ISO 22716');
    expect(screen.getByTestId('award-gate-sup-004')).toHaveTextContent('no valid BPOM registration');
    expect(screen.getByTestId('award-gate-sup-009')).toHaveTextContent('no valid halal certificate');
    // ID locale carries the same notice.
    expect(rfxId['rfx.gate.noAward']).toMatch(/tidak dapat dimenangkan/);
  });

  it('BL-64 — KNOWN-GOOD twin: a mixed RFQ (rfq-016) shows the form and no such notice', async () => {
    renderEvent('rfq-016');
    expect(await screen.findByTestId('award-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('award-none-qualified')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('award-input-sup-017')).getByLabelText(/Share/i)).toBeInTheDocument();
    expect(within(screen.getByTestId('award-input-sup-018')).queryByLabelText(/Share/i)).not.toBeInTheDocument();
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
    const award = await screen.findByTestId('supplier-award-aw-0001');
    expect(award).toHaveTextContent('Your share: 70%');
    // KNOWN-BAD twin — the OTHER winner's 30% is not on this page.
    expect(award).not.toHaveTextContent('30%');
  });

  it('AC-05 — a supplier that lost reads "Not awarded", and no share at all', async () => {
    renderWithProviders(<SupplierNegotiations />, { identity: SUP_007 });
    const loser = await screen.findByTestId('supplier-award-aw-0001');
    expect(loser).toHaveTextContent('Not awarded');
    expect(loser).not.toHaveTextContent('Your share');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3.8 SC-01 — the Home tasks
// ─────────────────────────────────────────────────────────────────────────────

describe('Home tasks — RFx work reaches the task list on both sides', () => {
  it('PTI sees negotiation rounds closing soon, and still sees events ready to award', async () => {
    renderWithProviders(<BuyerHome />, { identity: BUYER_SEAT });
    expect(await screen.findByTestId('home-task-negotiation-closing')).toHaveTextContent(
      'Negotiation rounds closing soon',
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
      'Information requests to answer',
    );
    expect(screen.getByTestId('home-task-rfp-answer')).toHaveTextContent('Proposal requests to answer');
  });

  it('the supplier PTI is waiting on sees "Revised quote requested"; the one that answered does not', async () => {
    renderWithProviders(<SupplierHome />, { identity: SUP_007 });
    expect(await screen.findByTestId('home-task-revised-quote')).toHaveTextContent(
      'Revised quote requested',
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
      expect(screen.queryByTestId('home-tasks') ?? screen.queryByTestId('home-empty')).not.toBeNull(),
    );
    expect(screen.queryByTestId('home-task-revised-quote')).not.toBeInTheDocument();
  });
});
