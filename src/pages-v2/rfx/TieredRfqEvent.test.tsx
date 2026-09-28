// ────────────────────────────────────────────────────────────────────────────
// The tiered RFQ on its event page and on the board (RFx spec 2026-09-21,
// "Evaluation and award", and the B1 review fixes): the RFQ content is shown,
// the comparison is per item and per break at a chosen evaluation break, the
// award is per item split by %, refused by name while an item is short of 100%,
// the export hands over the comparison, the panel defers to the event page,
// the award history names every supplier of a split, and the wizard no longer
// demands a catalogue material.
// ────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import { SEEDED_SEAT_ROLES } from '../../services/transitions/businessRoles';
import { resetRfxStores, awardStore } from '../../services/data/mock/stores/rfxStores';
import { rfqStore } from '../../services/data/mock/stores/rfqStore';
import { quotationStore } from '../../services/data/mock/stores/quotationStore';
import { sdcClock } from '../../services/sdc';
import { rfqCompareEn, rfqCompareId } from '../../lib/i18n/rfqCompare';
import Toaster from '../../components/ui-v2/Toaster';
import BuyerSourcingEvent from '../BuyerSourcingEvent';
import BuyerSourcingPage from '../BuyerSourcing';
import { buildComparisonCsv } from './comparisonExport';
import { MockCommandService } from '../../services/data/mock/MockCommandService';
import { PERSONA_SYSTEM_ROLES } from '../../services/transitions/businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import type { QueryScope } from '../../services/data/types';
import type { AwardLine } from '../../services/sourcing/types';

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

const renderEvent = (rfqId: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
      </Routes>
      <Toaster />
    </>,
    { identity: BUYER_SEAT, route: `/buyer/rfq/${rfqId}` },
  );

const share = (lineNo: number, supplierId: string, value: string) =>
  fireEvent.change(
    within(screen.getByTestId(`award-input-${lineNo}-${supplierId}`)).getByLabelText(/Share/i),
    { target: { value } },
  );

describe('i18n — every key has an ID twin, and vice versa', () => {
  it('the rfqCompare fragment is bilingual', () => {
    expect(Object.keys(rfqCompareEn).length).toBeGreaterThan(60); // population control
    expect(Object.keys(rfqCompareEn).sort()).toEqual(Object.keys(rfqCompareId).sort());
  });
});

describe('the event page shows the RFQ content (Oslo, rfq-021)', () => {
  it('items with their buyer spec, requested one-time costs and files; the breaks; questions; flags', async () => {
    renderEvent('rfq-021');
    const content = await screen.findByTestId('rfq-content');
    expect(within(content).getByTestId('rfq-content-item-1')).toHaveTextContent('Oslo front sticker');
    expect(within(content).getByTestId('rfq-content-item-2')).toHaveTextContent('Oslo back sticker (ingredients)');
    expect(screen.getByTestId('spec-1-material')).toHaveTextContent('PP white gloss 60 mic');
    // a choice value reads as its label
    expect(screen.getByTestId('spec-1-form')).toHaveTextContent('Roll');
    expect(screen.getByTestId('rfq-content-costs-1')).toHaveTextContent('Die-cut plate');
    expect(screen.getByTestId('rfq-content-costs-1')).toHaveTextContent('Printing plate or cylinder');
    // attachments are session-only, and the page says so
    expect(screen.getByTestId('rfq-content-attachments-1-note')).toHaveTextContent(/for this session/i);
    expect(screen.getByTestId('rfq-content-breaks')).toHaveTextContent('50,000');
    expect(screen.getByTestId('rfq-content-questions')).toHaveTextContent('Can goods ship in the 2nd week of October?');
    const flags = screen.getByTestId('rfq-content-flags');
    expect(flags).toHaveTextContent('Alternative offers allowed');
    expect(flags).toHaveTextContent('Samples requested: 20');
    expect(flags).toHaveTextContent('Not confidential');
  });

  it('the eyebrow reads "Sourcing" alone', async () => {
    renderEvent('rfq-021');
    await screen.findByTestId('rfq-content');
    expect(screen.queryByText('Sourcing event')).not.toBeInTheDocument();
    expect(screen.getAllByText('Sourcing').length).toBeGreaterThan(0);
  });

  it('a legacy RFQ (rfq-014) has no tiered content and no evaluation break', async () => {
    renderEvent('rfq-014');
    expect(await screen.findByTestId('cmp-row-rfx.cmp.row.unitPrice')).toHaveTextContent('Unit price');
    expect(screen.queryByTestId('rfq-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('eval-break')).not.toBeInTheDocument();
    // RFx C3 (NR-3 BR-07) — and it is awarded through the SAME panel, per line.
    const form = screen.getByTestId('award-form');
    expect(within(form).getByTestId('award-item-PK-PETB-8802')).toBeInTheDocument();
    expect(within(form).getByTestId('award-item-PK-CAPF-8820')).toBeInTheDocument();
  });
});

describe('the per-item comparison at the evaluation break', () => {
  it('marks the lowest price per break, shows supplier spec, one-time costs and alternatives apart', async () => {
    renderEvent('rfq-021');
    const item1 = await screen.findByTestId('item-cmp-1');
    // sup-013 is cheaper at 3K; sup-015 from 25K
    expect(within(item1).getByTestId('item-price-1-sup-013-3000')).toHaveAttribute('data-best', 'true');
    expect(within(item1).getByTestId('item-price-1-sup-015-3000')).not.toHaveAttribute('data-best');
    expect(within(item1).getByTestId('item-price-1-sup-015-25000')).toHaveAttribute('data-best', 'true');
    // supplier-filled spec values
    expect(within(item1).getByTestId('item-spec-1-sup-015')).toHaveTextContent('Label stock brand: Avery Dennison');
    expect(within(item1).getByTestId('item-spec-1-sup-015')).toHaveTextContent('Die-cut type: Flexible');
    // total at the default break (3K per variant): 420 × 24,000 + 3,900,000
    expect(within(item1).getByTestId('item-total-1-sup-015')).toHaveTextContent('IDR 13,980,000');
    expect(within(item1).getByTestId('item-cmp-1-sup-015')).toHaveTextContent('Die-cut plate');
    // the alternative is shown apart, under item 2, and not ranked
    const alt = within(screen.getByTestId('item-alternatives-2')).getByTestId('item-alt-2-sup-013');
    expect(alt).toHaveTextContent('Paper label instead of PP clear');
  });

  it('changing the evaluation break changes the ranking, per item and overall', async () => {
    renderEvent('rfq-021');
    const select = (await screen.findByTestId('eval-break')) as HTMLSelectElement;
    expect(select.value).toBe('3000'); // nearest totalQty
    expect(screen.getByTestId('item-best-2-sup-013')).toBeInTheDocument();
    expect(screen.queryByTestId('item-best-2-sup-015')).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: '50000' } });
    await waitFor(() => expect(screen.getByTestId('item-best-2-sup-015')).toBeInTheDocument());
    expect(screen.queryByTestId('item-best-2-sup-013')).not.toBeInTheDocument();
    // the event-level rows say which break they read
    expect(screen.getByTestId('cmp-row-rfx.cmp.row.totalPrice')).toHaveTextContent('Total cost at 50,000');
  });
});

describe('the Documents row (RFx B5, NR-1 buyer step 6)', () => {
  it('reads "Missing: Halal certificate" for a supplier without that required document', async () => {
    rfqStore.update('rfq-021', (r) => ({
      ...r,
      documentRequests: [{ id: 'dr-halal', name: 'Halal certificate', type: 'certificate', required: true }],
    }));
    // sup-015 answers the request; sup-013 sends nothing against it.
    quotationStore.update('qt-021a', (q) => ({
      ...q,
      documents: [
        {
          id: 'd-halal',
          requestId: 'dr-halal',
          attachment: { id: 'att-halal', name: 'halal.pdf', size: 1024, type: 'application/pdf', addedAt: '2026-09-20T00:00:00.000Z' },
          uploadedAt: '2026-09-20T00:00:00.000Z',
          certificate: { number: 'HLL-1', issuer: 'BPJPH', expiresOn: '2099-01-01' },
        },
      ],
    }));
    renderEvent('rfq-021');
    const row = await screen.findByTestId('tiered-documents');
    expect(within(row).getByTestId('tiered-documents-status-sup-013')).toHaveTextContent('Missing: Halal certificate');
    expect(within(row).getByTestId('tiered-documents-status-sup-015')).toHaveTextContent('Complete');
    // the event's documents panel lists the file under its supplier
    expect(screen.getByTestId('event-documents-sup-015')).toHaveTextContent('halal.pdf');
  });
});

describe('the award, item by item', () => {
  it('refuses by name while an item is short of 100%, then records the split with its break', async () => {
    renderEvent('rfq-021');
    await screen.findByTestId('award-form');
    expect(screen.getByTestId('award-confirm')).toBeDisabled();
    share(1, 'sup-015', '70');
    share(1, 'sup-013', '30');
    expect(screen.getByTestId('award-item-refusal')).toHaveTextContent(
      // RFx C1 — this form sends the FINAL award, so an item with no share is
      // refused as open (AWARD_ITEMS_OPEN), as the verb refuses it.
      'item 2 (Oslo back sticker (ingredients)) has no share yet. Give every item shares that total 100%.',
    );
    share(2, 'sup-013', '90');
    expect(screen.getByTestId('award-item-refusal')).toHaveTextContent('totals 90%');
    expect(screen.getByTestId('award-confirm')).toBeDisabled();
    share(2, 'sup-013', '100');
    await waitFor(() => expect(screen.queryByTestId('award-item-refusal')).not.toBeInTheDocument());
    // the quantity follows the share: 70% of 3K × 8 variants
    expect(screen.getByTestId('award-qty-1-sup-015')).toHaveTextContent('16,800 PCS');
    expect(screen.getByTestId('award-item-total-1')).toHaveTextContent('100% of 100%');
    // both items follow their best score, so no reason is asked
    expect(screen.queryByTestId('award-reason-required')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('award-confirm'));
    const recorded = await screen.findByTestId('award-recorded');
    expect(within(recorded).getByTestId('award-line-1-sup-015')).toHaveTextContent('70%');
    expect(within(recorded).getByTestId('award-line-1-sup-015')).toHaveTextContent('3,000');
    expect(within(recorded).getByTestId('award-line-2-sup-013')).toHaveTextContent('100%');
    expect(awardStore.all().find((a) => a.eventId === 'rfq-021')!.lines.every((l) => l.awardTierQty === 3_000)).toBe(true);
  });

  it('asks for a reason when an item does not follow its best score, and names the item', async () => {
    renderEvent('rfq-021');
    await screen.findByTestId('award-form');
    // Item 1 ties at 3K (B5), so the departure is item 2's: its best is sup-013.
    share(1, 'sup-015', '100');
    share(2, 'sup-015', '100');
    const reason = await screen.findByTestId('award-reason-required');
    expect(reason).toHaveTextContent('item 2 (Oslo back sticker (ingredients))');
    expect(screen.getByTestId('award-confirm')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Award reason'), { target: { value: 'One printer keeps the colours matched.' } });
    expect(screen.getByTestId('award-confirm')).toBeEnabled();
  });

  it('a supplier failing the gate gets no share field, and the reason instead', async () => {
    quotationStore.add({ ...quotationStore.get('qt-021a')!, id: 'qt-021x', supplierId: 'sup-008' });
    renderEvent('rfq-021');
    const row = await screen.findByTestId('award-input-1-sup-008');
    expect(within(row).queryByLabelText(/Share/i)).not.toBeInTheDocument();
    expect(within(row).getByTestId('award-gate-1-sup-008')).toHaveTextContent('Cannot be awarded');
    // KNOWN-GOOD twin — a passing supplier has one
    expect(within(screen.getByTestId('award-input-1-sup-013')).getByLabelText(/Share/i)).toBeInTheDocument();
    // listed in the comparison, not ranked
    expect(within(screen.getByTestId('item-cmp-1-sup-008')).getByText('Not scored')).toBeInTheDocument();
  });

  it('the seeded Amplify award (rfq-024) shows its per-item split with the break', async () => {
    renderEvent('rfq-024');
    const recorded = await screen.findByTestId('award-recorded');
    expect(within(recorded).getByTestId('award-line-1-sup-013')).toHaveTextContent('60%');
    expect(within(recorded).getByTestId('award-line-1-sup-015')).toHaveTextContent('40%');
    expect(within(recorded).getByTestId('award-line-2-sup-015')).toHaveTextContent('70%');
    expect(within(recorded).getByTestId('award-line-2-sup-013')).toHaveTextContent('10,000');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RFx C3 — the one award panel on a LEGACY RFQ: split by quantity, a partial
// award, "Will not award the rest", cancel and "Raised in SAP" (NR-3 AC-01 to
// AC-06). rfq-014 is a Closed legacy tender; for these specs its bottle line is
// 100,000 pieces and a third line (a label) is added, so an item can be left
// open. sup-013 and sup-015 both pass CR-23 on it.
// ─────────────────────────────────────────────────────────────────────────────

describe('RFx C3 — the award panel on a legacy RFQ (rfq-014)', () => {
  const BOTTLE = 'PK-PETB-8802';
  const CAP = 'PK-CAPF-8820';
  const LABEL = 'PK-LBL-0001';
  const svc = new MockCommandService();
  const buyerScope: QueryScope = {
    personaType: 'buyer',
    supplierId: null,
    businessRoles: PERSONA_SYSTEM_ROLES.buyer,
    actor: NO_PERSON,
  };

  const withLines = (three: boolean) =>
    rfqStore.update('rfq-014', (r) => ({
      ...r,
      lineItems: [
        { ...r.lineItems![0]!, quantity: 100_000 },
        r.lineItems![1]!,
        ...(three ? [{ lineNo: 3, materialCode: LABEL, description: 'Front label', quantity: 50_000, uom: 'PCS' as const }] : []),
      ],
    }));
  const input = (key: string, supplierId: string, label: RegExp) =>
    within(screen.getByTestId(`award-input-${key}-${supplierId}`)).getByLabelText(label);
  const type = (key: string, supplierId: string, value: string, label: RegExp = /Share/i) =>
    fireEvent.change(input(key, supplierId, label), { target: { value } });
  /** The legacy best score may or may not be among the lines; give a reason when asked. */
  const reasonIfAsked = () => {
    const field = screen.queryByLabelText('Award reason');
    if (field) fireEvent.change(field, { target: { value: 'Dual sourced for supply security.' } });
  };
  const awardsOf014 = () => awardStore.all().filter((a) => a.eventId === 'rfq-014');
  const recordAward = (transitionId: 't_rfq_award' | 't_rfq_award_partial', lines: AwardLine[], extra = {}) =>
    svc.dispatch(buyerScope, {
      transitionId,
      entity: 'rfq',
      entityId: 'rfq-014',
      payload: {
        awardedQuotationId: lines[0]!.quotationId,
        awardedSupplierId: lines[0]!.supplierId,
        awardLines: lines,
        awardReason: 'Single source.',
        ...extra,
      },
    });
  const whole = (itemCode: string, quantity: number): AwardLine => ({
    supplierId: 'sup-013',
    quotationId: 'qt-014c',
    itemCode,
    sharePct: 100,
    quantity,
  });

  it('AC-01 — item 1 split 70,000 / 30,000 by quantity and item 2 at 60/40, dispatched and shown', async () => {
    withLines(false);
    renderEvent('rfq-014');
    await screen.findByTestId('award-form');
    fireEvent.click(screen.getByTestId(`award-basis-${BOTTLE}-qty`));
    type(BOTTLE, 'sup-015', '70000', /Quantity/i);
    type(BOTTLE, 'sup-013', '30000', /Quantity/i);
    // the derived side is shown read-only: the share each quantity is
    expect(screen.getByTestId(`award-qty-${BOTTLE}-sup-015`)).toHaveTextContent('70%');
    expect(screen.getByTestId(`award-item-total-${BOTTLE}`)).toHaveTextContent('100,000 of 100,000');
    type(CAP, 'sup-015', '60');
    type(CAP, 'sup-013', '40');
    expect(screen.getByTestId(`award-qty-${CAP}-sup-013`)).toHaveTextContent('120,000 PCS');
    reasonIfAsked();
    expect(screen.queryByTestId('award-item-refusal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('award-confirm'));

    const recorded = await screen.findByTestId('award-recorded');
    expect(within(recorded).getByTestId(`award-line-${BOTTLE}-sup-015`)).toHaveTextContent('70,000');
    expect(within(recorded).getByTestId(`award-line-${BOTTLE}-sup-015`)).toHaveTextContent('70%');
    expect(within(recorded).getByTestId(`award-line-${CAP}-sup-013`)).toHaveTextContent('40%');
    expect(rfqStore.get('rfq-014')!.status).toBe('Awarded');
    const [rec] = awardsOf014();
    const saved = rec!.lines.map((l) => [l.itemCode, l.supplierId, l.sharePct, l.quantity, l.splitBasis].join(' '));
    expect(saved.sort()).toEqual([
      `${CAP} sup-013 40 120000 pct`,
      `${CAP} sup-015 60 180000 pct`,
      `${BOTTLE} sup-013 30 30000 qty`,
      `${BOTTLE} sup-015 70 70000 qty`,
    ]);
  });

  it('AC-02 — a quantity split that does not total the break is refused AWARD_SPLIT_INCOMPLETE, naming the item', async () => {
    withLines(false);
    renderEvent('rfq-014');
    await screen.findByTestId('award-form');
    fireEvent.click(screen.getByTestId(`award-basis-${BOTTLE}-qty`));
    type(BOTTLE, 'sup-015', '70000', /Quantity/i);
    type(BOTTLE, 'sup-013', '20000', /Quantity/i);
    const refusal = screen.getByTestId('award-item-refusal');
    expect(refusal).toHaveAttribute('data-code', 'AWARD_SPLIT_INCOMPLETE');
    expect(refusal).toHaveTextContent('item 1 (PET Bottle 100ml Clear — Emina Series) totals 90,000, not 100,000');
    expect(screen.getByTestId('award-confirm')).toBeDisabled();
    // KNOWN-GOOD twin — the full 100,000 clears it (item 2 is then the open item)
    type(BOTTLE, 'sup-013', '30000', /Quantity/i);
    expect(screen.getByTestId('award-item-refusal')).toHaveAttribute('data-code', 'AWARD_ITEMS_OPEN');
  });

  it('AC-03 — item 3 left "Not awarded now" gives Partly awarded; awarding it later gives Awarded', async () => {
    withLines(true);
    renderEvent('rfq-014');
    await screen.findByTestId('award-form');
    type(BOTTLE, 'sup-013', '100');
    type(CAP, 'sup-015', '100');
    fireEvent.change(screen.getByTestId(`award-choice-${LABEL}`), { target: { value: 'open' } });
    expect(screen.getByTestId('award-partial-note')).toBeInTheDocument();
    expect(screen.getByTestId('award-confirm')).toHaveTextContent('Award these items');
    reasonIfAsked();
    fireEvent.click(screen.getByTestId('award-confirm'));
    await waitFor(() => expect(rfqStore.get('rfq-014')!.status).toBe('Partly awarded'));

    // The panel starts afresh over the open item; the awarded ones name their award.
    const labelRow = await screen.findByTestId(`award-input-${LABEL}-sup-015`);
    expect(labelRow).toBeInTheDocument();
    expect(screen.getByTestId(`award-item-awarded-${BOTTLE}`)).toHaveTextContent(awardsOf014()[0]!.id);
    type(LABEL, 'sup-015', '100');
    reasonIfAsked();
    fireEvent.click(screen.getByTestId('award-confirm'));
    await waitFor(() => expect(rfqStore.get('rfq-014')!.status).toBe('Awarded'));
    expect(awardsOf014()).toHaveLength(2);
  });

  it('"Will not award the rest" on a Partly awarded RFQ settles it with no new lines', async () => {
    withLines(true);
    const partial = await recordAward('t_rfq_award_partial', [whole(BOTTLE, 100_000), whole(CAP, 300_000)]);
    expect(partial.status, partial.reason).toBe('done');
    renderEvent('rfq-014');
    fireEvent.click(await screen.findByTestId('award-will-not-rest'));
    await waitFor(() => expect(rfqStore.get('rfq-014')!.status).toBe('Awarded'));
    const final = awardsOf014().find((a) => a.lines.length === 0)!;
    expect(await screen.findByTestId(`award-no-lines-${final.id}`)).toBeInTheDocument();
    // the final award's cascade still ran: a quote no award named is Rejected
    expect(quotationStore.get('qt-014a')!.status).toBe('Rejected');
  });

  it('AC-05 — cancel needs a reason, keeps the record, and returns the panel to awardable', async () => {
    withLines(false);
    const res = await recordAward('t_rfq_award', [whole(BOTTLE, 100_000), whole(CAP, 300_000)]);
    expect(res.status, res.reason).toBe('done');
    const id = awardsOf014()[0]!.id;
    renderEvent('rfq-014');
    expect(await screen.findByTestId(`award-status-${id}`)).toHaveTextContent('Active');
    expect(screen.queryByTestId('award-form')).not.toBeInTheDocument(); // Awarded: nothing to award
    fireEvent.click(screen.getByTestId(`award-cancel-${id}`));
    expect(screen.getByTestId(`award-cancel-confirm-${id}`)).toBeDisabled(); // no reason yet
    fireEvent.change(screen.getByLabelText('Reason for cancelling'), { target: { value: 'Wrong split entered.' } });
    fireEvent.click(screen.getByTestId(`award-cancel-confirm-${id}`));
    await waitFor(() => expect(screen.getByTestId(`award-status-${id}`)).toHaveTextContent('Cancelled'));
    expect(screen.getByTestId(`award-cancelled-${id}`)).toHaveTextContent('Wrong split entered.');
    expect(rfqStore.get('rfq-014')!.status).toBe('Closed');
    expect(await screen.findByTestId('award-form')).toBeInTheDocument();
    expect(screen.getByTestId(`award-input-${BOTTLE}-sup-013`)).toBeInTheDocument();
  });

  it('AC-06 — once marked "Raised in SAP", cancel is no longer offered', async () => {
    withLines(false);
    await recordAward('t_rfq_award', [whole(BOTTLE, 100_000), whole(CAP, 300_000)]);
    const id = awardsOf014()[0]!.id;
    renderEvent('rfq-014');
    // KNOWN-GOOD twin first: an active award offers cancel
    expect(await screen.findByTestId(`award-cancel-${id}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`award-sap-mark-${id}`));
    expect(screen.getByTestId(`award-sap-confirm-${id}`)).toBeDisabled();
    fireEvent.change(screen.getByLabelText('SAP document number'), { target: { value: '4500012345' } });
    fireEvent.click(screen.getByTestId(`award-sap-confirm-${id}`));
    await waitFor(() => expect(screen.getByTestId(`award-status-${id}`)).toHaveTextContent('Raised in SAP'));
    expect(screen.getByTestId(`award-sap-${id}`)).toHaveTextContent('4500012345');
    expect(screen.queryByTestId(`award-cancel-${id}`)).not.toBeInTheDocument();
  });

  it('a seat without the cancel and SAP atoms reads whose act each is', async () => {
    withLines(false);
    await recordAward('t_rfq_award', [whole(BOTTLE, 100_000), whole(CAP, 300_000)]);
    const id = awardsOf014()[0]!.id;
    renderWithProviders(
      <Routes>
        <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
      </Routes>,
      { identity: { ...BUYER, businessRoles: ['receiving'] }, route: '/buyer/rfq/rfq-014' },
    );
    expect(await screen.findByTestId('handoff-rfq-award-cancel')).toHaveTextContent('Awaiting Procurement');
    expect(screen.getByTestId('handoff-rfq-award-sap')).toHaveTextContent('Awaiting Procurement');
    expect(screen.queryByTestId(`award-cancel-${id}`)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// The board
// ─────────────────────────────────────────────────────────────────────────────

const BuyerSourcing: React.FC = () => (
  <>
    <BuyerSourcingPage />
    <Toaster />
  </>
);

describe('the comparison export', () => {
  const t = ((k: string) => rfqCompareEn[k] ?? k) as unknown as TFunction;
  const name = (id: string) => id;

  it('a tiered RFQ exports items × suppliers × breaks; a legacy RFQ one row per quote', () => {
    const oslo = buildComparisonCsv([rfqStore.get('rfq-021')!], quotationStore.all(), name, t);
    // 2 items × 2 suppliers × 6 breaks
    expect(oslo.rows).toBe(24);
    const lines = oslo.csv.split('\n');
    expect(lines[0]).toBe(
      'RFQ,Item,Supplier,Break quantity,Break basis,Unit price,Currency,One-time costs,Lead time (days)',
    );
    expect(lines).toContain('RFQ-2026-021,1 Oslo front sticker,sup-015,3000,perVariant,420,IDR,3900000,18');
    expect(lines).toContain('RFQ-2026-021,2 Oslo back sticker (ingredients),sup-013,50000,perVariant,226,IDR,3100000,20');
    const legacy = buildComparisonCsv([rfqStore.get('rfq-014')!], quotationStore.all(), name, t);
    // current versions only: sup-015's superseded original is not a row
    expect(legacy.csv).not.toMatch(/qt-014d,/);
    expect(legacy.rows).toBeGreaterThan(0);
  });

  describe('on the board', () => {
    const created: Blob[] = [];
    beforeEach(() => {
      created.length = 0;
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: vi.fn((b: Blob) => {
          created.push(b);
          return 'blob:test';
        }),
      });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    });
    afterEach(() => {
      delete (URL as unknown as Record<string, unknown>).createObjectURL;
      delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
    });

    it('the header Export hands over a CSV file and says so', async () => {
      renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
      fireEvent.click(await screen.findByRole('button', { name: 'Export' }));
      expect(await screen.findByText('Comparison exported to CSV')).toBeInTheDocument();
      expect(created).toHaveLength(1);
      expect(created[0]!.type).toMatch(/text\/csv/);
    });
  });
});

describe('the RFQ panel defers a tiered award to the event page', () => {
  it('Oslo: no one-winner pick in the panel, and a link to the per-item award', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByText('RFQ-2026-021'));
    const box = await screen.findByTestId('panel-tiered-award');
    expect(within(box).getByTestId('panel-open-tiered-award')).toHaveAttribute('href', expect.stringMatching(/\/buyer\/rfq\/rfq-021$/));
    expect(document.querySelector('input[name="award-select"]')).toBeNull();
  });

  it('the panel ranks Oslo at the default break, and agrees with the event page', async () => {
    const { bestScoredQuotationId, rfxNow } = await import('../../services/data/mock/rfxReadModel');
    const { defaultEvaluationTierQty } = await import('../../services/sourcing/rfqComparison');
    const oslo = rfqStore.get('rfq-021')!;
    const best = bestScoredQuotationId(oslo, rfxNow(), defaultEvaluationTierQty(oslo)!);
    expect(best).toBe('qt-021b'); // population control: the event page's best at 3K
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByText('RFQ-2026-021'));
    const note = await screen.findByTestId('panel-eval-break');
    expect(note).toHaveTextContent('3,000 break');
    expect(within(note).getByTestId('panel-compare-by-break')).toHaveAttribute(
      'href',
      expect.stringMatching(/\/buyer\/rfq\/rfq-021$/),
    );
    await waitFor(() => expect(screen.getByTestId('panel-cmp-head-sup-013')).toHaveTextContent('Top-ranked'));
    expect(screen.getByTestId('panel-cmp-head-sup-015')).not.toHaveTextContent('Top-ranked');
  });

  it('⚠️ where the default break is NOT the first break, the panel follows the break, not the stored header', async () => {
    // 400,000 pieces = 25K per variant × 8 × 2, so the default break is 25K,
    // where sup-015 ranks first — while the first-break header would rank sup-013.
    rfqStore.update('rfq-021', (r) => ({ ...r, totalQty: 400_000 }));
    const { bestScoredQuotationId, rfxNow } = await import('../../services/data/mock/rfxReadModel');
    expect(bestScoredQuotationId(rfqStore.get('rfq-021')!, rfxNow(), 25_000)).toBe('qt-021a');
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByText('RFQ-2026-021'));
    expect(await screen.findByTestId('panel-eval-break')).toHaveTextContent('25,000 break');
    await waitFor(() => expect(screen.getByTestId('panel-cmp-head-sup-015')).toHaveTextContent('Top-ranked'));
    expect(screen.getByTestId('panel-cmp-head-sup-013')).not.toHaveTextContent('Top-ranked');
  });

  it('the footer offers only acts that exist: none for an Open RFQ still awaiting bids', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByText('RFQ-2026-021'));
    await screen.findByTestId('panel-tiered-award');
    expect(screen.queryByTestId('panel-footer-action')).not.toBeInTheDocument();
    expect(screen.queryByText('Send reminder')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject all')).not.toBeInTheDocument();
  });

  it('KNOWN-GOOD twin — an awarded RFQ’s footer opens its award on the event page', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<BuyerSourcing />} />
        <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
      </Routes>,
      { identity: BUYER_SEAT, route: '/' },
    );
    fireEvent.click(await screen.findByText('RFQ-2026-024'));
    const action = await screen.findByTestId('panel-footer-action');
    expect(action).toHaveTextContent('View award details');
    fireEvent.click(action);
    expect(await screen.findByTestId('award-recorded')).toBeInTheDocument();
  });

  it('RFx C3 (AR-03) — a legacy RFQ now gets the same box, and no one-winner pick', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByText('RFQ-2026-011'));
    await screen.findByText(/QUOTE COMPARISON/i);
    expect(document.querySelector('input[name="award-select"]')).toBeNull();
    expect(within(screen.getByTestId('panel-tiered-award')).getByTestId('panel-open-tiered-award')).toHaveAttribute(
      'href',
      expect.stringMatching(/\/buyer\/rfq\/rfq-011$/),
    );
  });
});

describe('the wizard: "Specific material(s)" is optional, because the Items step exists', () => {
  const scope = async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByText('New RFQ'));
    fireEvent.change(await screen.findByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i), {
      target: { value: 'Oslo stickers' },
    });
    const category = screen
      .getAllByRole('combobox')
      .find((el) => within(el).queryByRole('option', { name: 'Packaging' }) !== null)!;
    fireEvent.change(category, { target: { value: 'Packaging' } });
  };

  it('Next opens with no material chosen once a quantity is readable', async () => {
    await scope();
    expect(screen.getByTestId('wizard-materials-optional')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Total quantity'), { target: { value: '48000' } });
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('KNOWN-BAD twin — the step still refuses without a quantity', async () => {
    await scope();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});

describe('the board: panel and award history', () => {
  it('the award history names both suppliers of the Amplify split', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    const cell = await screen.findByTestId('award-history-supplier-rfq-024');
    // the award record arrives on its own read; the split is named once it has
    await waitFor(() => expect(cell).toHaveTextContent('PT Sample Flexible Packaging'));
    expect(cell).toHaveTextContent('PT Sample Preform Works');
    expect(cell).toHaveTextContent('Split per item');
  });
});
