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
    expect(screen.queryByTestId('tiered-award-form')).not.toBeInTheDocument();
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

describe('the award, item by item', () => {
  it('refuses by name while an item is short of 100%, then records the split with its break', async () => {
    renderEvent('rfq-021');
    await screen.findByTestId('tiered-award-form');
    expect(screen.getByTestId('award-confirm')).toBeDisabled();
    share(1, 'sup-015', '70');
    share(1, 'sup-013', '30');
    expect(screen.getByTestId('award-item-refusal')).toHaveTextContent(
      'item 2 (Oslo back sticker (ingredients)) totals 0%. Each item must total 100%.',
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
    expect(awardStore.all().find((a) => a.rfqId === 'rfq-021')!.lines.every((l) => l.awardTierQty === 3_000)).toBe(true);
  });

  it('asks for a reason when an item does not follow its best score, and names the item', async () => {
    renderEvent('rfq-021');
    await screen.findByTestId('tiered-award-form');
    share(1, 'sup-013', '100');
    share(2, 'sup-013', '100');
    const reason = await screen.findByTestId('award-reason-required');
    expect(reason).toHaveTextContent('item 1 (Oslo front sticker)');
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

  it('KNOWN-GOOD twin — a legacy RFQ keeps its pick and has no such box', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByText('RFQ-2026-011'));
    await screen.findByText(/QUOTE COMPARISON/i);
    expect(document.querySelector('input[name="award-select"]')).not.toBeNull();
    expect(screen.queryByTestId('panel-tiered-award')).not.toBeInTheDocument();
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
