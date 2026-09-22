// ────────────────────────────────────────────────────────────────────────────
// The rebuilt RFQ wizard, end to end through the real dispatcher (RFx spec
// 2026-09-21): a multi-item tiered RFQ is authored and stored whole, the chosen
// currency survives, the RFI pre-fill lands in the wizard and on the record,
// templates start and save, a copy carries its invitees and drops its dates,
// and the page header reads "Sourcing".
// ────────────────────────────────────────────────────────────────────────────

import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders, BUYER } from '../../test/test-utils';
import type { CurrentIdentity } from '../../context/CurrentIdentityContext';
import BuyerSourcingPage from '../BuyerSourcing';
import Toaster from '../../components/ui-v2/Toaster';
import { rfqStore } from '../../services/data/mock/stores/rfqStore';
import { quotationStore } from '../../services/data/mock/stores/quotationStore';
import { rfqTemplateStore } from '../../services/sourcing/rfqTemplates';

// `<Toaster />` lives in AppRouter, not in the page, so it is mounted here for
// the toasts these specs read (the BuyerComplianceRequest precedent).
const BuyerSourcing: React.FC = () => (
  <>
    <BuyerSourcingPage />
    <Toaster />
  </>
);

const RECEIVING: CurrentIdentity = { ...BUYER, businessRoles: ['receiving'] };

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  rfqTemplateStore.reset();
});

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
const newest = () => rfqStore.all().find((r) => r.id.startsWith('RFQ-2026-9'));

/** Fill the scope step the way a buyer does. */
const fillScope = async (opts: { title?: string; qty?: string } = {}) => {
  if (opts.title !== undefined) {
    fireEvent.change(await screen.findByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i), {
      target: { value: opts.title },
    });
  }
  const category = screen
    .getAllByRole('combobox')
    .find((el) => within(el).queryByRole('option', { name: 'Packaging' }) !== null)!;
  if ((category as HTMLSelectElement).value !== 'Packaging') {
    fireEvent.change(category, { target: { value: 'Packaging' } });
  }
  fireEvent.click(await screen.findByRole('button', { name: 'PET Bottle 100ml' }));
  if (opts.qty !== undefined) {
    fireEvent.change(screen.getByLabelText('Total quantity'), { target: { value: opts.qty } });
  }
};

const addTier = (qty: string, testId = 'rfq-tiers') => {
  fireEvent.change(screen.getByTestId(`${testId}-input`), { target: { value: qty } });
  fireEvent.click(screen.getByTestId(`${testId}-add`));
};

const fillTerms = () => {
  const [response, award] = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
  fireEvent.change(response!, { target: { value: '2026-10-10' } });
  fireEvent.change(award!, { target: { value: '2026-10-20' } });
};

describe('the RFQ wizard authors a multi-item tiered RFQ', () => {
  it('THE LOCK — two items, spec values, breaks, options and the chosen currency all land on the record', async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('New RFQ'));
    await fillScope({ title: 'Oslo stickers — launch', qty: '48000' });
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Oslo' } });
    next();

    // Item 1 — a sticker. Next is held until every required BUYER field is filled.
    fireEvent.change(await screen.findByTestId('rfq-item-1-type'), { target: { value: 'sticker' } });
    fireEvent.change(screen.getByTestId('rfq-item-1-description'), { target: { value: 'Front sticker' } });
    fireEvent.change(screen.getByTestId('rfq-item-1-variants'), { target: { value: '8' } });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByTestId('rfq-items-refusal')).toHaveTextContent('Fill every required field marked with *.');
    // The supplier half of the sheet is not the buyer's to fill.
    expect(within(screen.getByTestId('rfq-item-1-field-dieCutType')).getByText('Supplier fills')).toBeInTheDocument();
    expect(screen.queryByTestId('rfq-item-1-value-dieCutType')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('rfq-item-1-value-material'), { target: { value: 'PP white 60 mic' } });
    fireEvent.change(screen.getByTestId('rfq-item-1-value-size'), { target: { value: '50 × 80' } });
    fireEvent.change(screen.getByTestId('rfq-item-1-value-printingColours'), { target: { value: '4C' } });
    fireEvent.change(screen.getByTestId('rfq-item-1-value-form'), { target: { value: 'roll' } });
    // The buyer removes an optional field and adds a custom one.
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ink standard' }));
    expect(screen.queryByTestId('rfq-item-1-field-inkStandard')).not.toBeInTheDocument();
    // A REQUIRED library field offers no remove control.
    expect(screen.queryByRole('button', { name: 'Remove Material' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'Core size' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    expect(screen.getByTestId('rfq-item-1-field-custom-1')).toHaveTextContent('Core size');
    expect(screen.queryByTestId('rfq-items-refusal')).not.toBeInTheDocument();

    // Item 2 — "Other", with its own breaks.
    fireEvent.click(screen.getByTestId('rfq-item-add'));
    fireEvent.change(screen.getByTestId('rfq-item-2-description'), { target: { value: 'Back sticker' } });
    fireEvent.click(screen.getByTestId('rfq-item-2-own-tiers'));
    addTier('100K', 'rfq-item-2-tiers');
    next();

    // The RFQ's breaks: refused until there is one, strictly increasing by construction.
    expect(await screen.findByTestId('rfq-tiers-step-refusal')).toHaveTextContent('Add one to eight quantity breaks.');
    addTier('5000');
    addTier('3K');
    addTier('3000');
    expect(screen.getByTestId('rfq-tiers-refusal')).toHaveTextContent('That break is already in the list.');
    addTier('2.400');
    expect(screen.getByTestId('rfq-tiers-refusal')).toHaveTextContent('can be read two ways');
    expect(screen.getAllByTestId('rfq-tiers-chip').map((c) => c.textContent)).toEqual([
      expect.stringContaining('3.000'),
      expect.stringContaining('5.000'),
    ]);
    next();

    // Questions and options.
    fireEvent.change(await screen.findByLabelText('Question'), { target: { value: 'Can goods ship in October?' } });
    fireEvent.click(screen.getByTestId('rfq-q-add'));
    fireEvent.click(screen.getByTestId('rfq-opt-alternatives'));
    fireEvent.click(screen.getByTestId('rfq-opt-samples'));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Sample quantity'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Needed by'), { target: { value: '2026-10-05' } });
    fireEvent.click(screen.getByTestId('rfq-opt-confidential'));
    next();

    // Invitees, then terms with a NON-BASE currency.
    fireEvent.click(within(await screen.findByTestId('invitee-row-sup-008')).getByRole('checkbox'));
    next();
    fillTerms();
    fireEvent.click(screen.getByRole('radio', { name: 'USD' }));
    next();

    // Review names the items and the breaks.
    expect(await screen.findByTestId('rfq-review-item-1')).toHaveTextContent('Sticker / label · Front sticker · variants: 8');
    expect(screen.getByTestId('rfq-review-tiers')).toHaveTextContent('3.000 per variant · 5.000 per variant');
    fireEvent.click(screen.getByRole('button', { name: 'Save RFQ draft' }));

    await waitFor(() => expect(newest()).toBeDefined());
    const rfq = newest()!;
    expect(rfq.currency).toBe('USD');
    expect(rfq.projectName).toBe('Oslo');
    expect(rfq.items!.map((i) => [i.itemType, i.description, i.variantCount])).toEqual([
      ['sticker', 'Front sticker', 8],
      ['other', 'Back sticker', 1],
    ]);
    const sheet = rfq.items![0]!.specFields;
    expect(sheet.find((f) => f.key === 'material')?.value).toBe('PP white 60 mic');
    expect(sheet.some((f) => f.key === 'inkStandard')).toBe(false);
    expect(sheet.find((f) => f.key === 'custom-1')).toMatchObject({ label: 'Core size', filledBy: 'buyer' });
    expect(rfq.items![0]!.oneTimeCosts).toEqual(['dieCutPlate', 'printingPlate']);
    expect(rfq.items![1]!.tiers).toEqual([{ qty: 100_000, basis: 'perVariant' }]);
    expect(rfq.tiers).toEqual([
      { qty: 3_000, basis: 'perVariant' },
      { qty: 5_000, basis: 'perVariant' },
    ]);
    expect(rfq.questions![0]).toMatchObject({ promptKey: 'Can goods ship in October?', type: 'yesNo' });
    expect(rfq.allowAlternatives).toBe(true);
    expect(rfq.confidential).toBe(true);
    expect(rfq.samplesRequested).toEqual({ qty: 20, neededBy: '2026-10-05' });
    expect(rfq.invitedSupplierIds).toEqual(['sup-008']);
  }, 20000); // a long wizard walk; at the default 5s it timed out under full-suite load (5.2s measured)
});

describe('attachments are session-only, and say so', () => {
  it('a file attached to an item is listed with the honest note, and removable', async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('New RFQ'));
    await fillScope({ title: 'With files', qty: '1000' });
    next();
    const files = await screen.findByTestId('rfq-item-1-files');
    expect(within(files).getByTestId('rfq-item-1-files-note')).toHaveTextContent(
      'Stored for this session; permanent storage comes with the backend.',
    );
    const file = new File(['%PDF'], 'die-line.pdf', { type: 'application/pdf' });
    fireEvent.change(within(files).getByTestId('rfq-item-1-files-input'), { target: { files: [file] } });
    expect(within(files).getByTestId('rfq-item-1-files-row')).toHaveTextContent('die-line.pdf');
    fireEvent.click(within(files).getByRole('button', { name: 'Remove die-line.pdf' }));
    expect(within(files).queryByTestId('rfq-item-1-files-row')).not.toBeInTheDocument();
  });
});

describe('RFI → RFQ pre-fill (/buyer/rfq?rfi=<id>)', () => {
  it('opens the wizard pre-filled from the RFI, and the RFQ records where it came from', async () => {
    renderWithProviders(<BuyerSourcing />, { route: '/buyer/rfq?rfi=rfi-001' });
    const title = await screen.findByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i);
    expect(title).toHaveValue('Packaging capability — 2027 bottle programme');
    await fillScope();
    next();
    // One item per distinct product a SUBMITTED responder named; the draft
    // response (sup-013) contributes nothing.
    expect(screen.getByTestId('rfq-item-1-description')).toHaveValue('PET bottle 100ml airless pump');
    expect(screen.getByTestId('rfq-item-2-description')).toHaveValue('Folding carton 12s shipper');
    expect(screen.getByTestId('rfq-item-1-value-specification')).toHaveValue('PET, 28mm neck, airless pump, 100ml fill');
    expect(screen.queryByTestId('rfq-item-3')).not.toBeInTheDocument();
    next();
    addTier('50000');
    next();
    next();
    // The responders are the invitees.
    expect(within(await screen.findByTestId('invitee-row-sup-007')).getByRole('checkbox')).toBeChecked();
    expect(within(screen.getByTestId('invitee-row-sup-008')).getByRole('checkbox')).toBeChecked();
    next();
    fillTerms();
    next();
    expect(await screen.findByText('RFI RFI-2026-001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save RFQ draft' }));
    await waitFor(() => expect(newest()).toBeDefined());
    expect(newest()!.sourceRfiId).toBe('rfi-001');
    expect(newest()!.invitedSupplierIds).toEqual(['sup-007', 'sup-008']);
  });

  it('KNOWN-BAD twin — an unknown RFI opens nothing and says so', async () => {
    renderWithProviders(<BuyerSourcing />, { route: '/buyer/rfq?rfi=rfi-999' });
    expect(await screen.findByText('RFI not found')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i)).not.toBeInTheDocument();
  });

  it('with no parameter the page opens no wizard', async () => {
    renderWithProviders(<BuyerSourcing />, { route: '/buyer/rfq' });
    await screen.findByText('RFQ-2026-021');
    expect(screen.queryByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i)).not.toBeInTheDocument();
  });
});

describe('RFP → RFQ pre-fill (/buyer/rfq?rfp=<id>&options=<ids>, spec D3)', () => {
  it('Tundra: "pump and cap only" and the supplier-proposed stock bottle land as items, points as breaks, responders invited', async () => {
    renderWithProviders(<BuyerSourcing />, { route: '/buyer/rfq?rfp=rfp-002&options=opt-pump-cap,sup-opt-1' });
    const title = await screen.findByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i);
    expect(title).toHaveValue('Tundra — open-spec bottle and pump');
    // The first break across both items: 10,000 × 2.
    expect(screen.getByLabelText('Total quantity')).toHaveValue('20000');
    await fillScope();
    next();
    // One item per chosen option; the description is the title plus its detail,
    // and the type is the obvious one (bottle and closure) for both.
    expect(screen.getByTestId('rfq-item-1-description')).toHaveValue(
      'Pump and cap only — PTI sources the bottle; you supply a matching pump and over-cap.',
    );
    expect(screen.getByTestId('rfq-item-2-description')).toHaveValue(
      'Stock 150 ml bottle with 24/410 lotion pump — Our existing mould, so no bottle tooling cost; shape differs slightly from the reference.',
    );
    expect(screen.getByTestId('rfq-item-1-type')).toHaveValue('bottleClosure');
    expect(screen.queryByTestId('rfq-item-3')).not.toBeInTheDocument();
    // The RFP asked suppliers to RECOMMEND the spec, so the required buyer
    // fields are the buyer's to fill — the step holds until they are.
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    for (const n of [1, 2]) {
      fireEvent.change(screen.getByTestId(`rfq-item-${n}-value-component`), { target: { value: 'Pump and over-cap' } });
      fireEvent.change(screen.getByTestId(`rfq-item-${n}-value-material`), { target: { value: 'PP' } });
      fireEvent.change(screen.getByTestId(`rfq-item-${n}-value-colour`), { target: { value: 'White' } });
      fireEvent.change(screen.getByTestId(`rfq-item-${n}-value-netVolume`), { target: { value: '150' } });
    }
    next();
    // The quantity points are the breaks, already there.
    expect(screen.getAllByTestId('rfq-tiers-chip').map((c) => c.textContent)).toEqual([
      expect.stringContaining('10.000'),
      expect.stringContaining('50.000'),
      expect.stringContaining('100.000'),
    ]);
    next();
    next();
    // The responder (sup-007) is invited; the invitee who never answered is not.
    expect(within(await screen.findByTestId('invitee-row-sup-007')).getByRole('checkbox')).toBeChecked();
    expect(within(screen.getByTestId('invitee-row-sup-015')).getByRole('checkbox')).not.toBeChecked();
    next();
    fillTerms();
    next();
    expect(await screen.findByText('RFP RFP-2026-002')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save RFQ draft' }));
    await waitFor(() => expect(newest()).toBeDefined());
    const rfq = newest()!;
    expect(rfq.sourceRfpId).toBe('rfp-002');
    expect(rfq.currency).toBe('IDR');
    expect(rfq.uom).toBe('PCS');
    expect(rfq.invitedSupplierIds).toEqual(['sup-007']);
    expect(rfq.tiers).toEqual([
      { qty: 10_000, basis: 'total' },
      { qty: 50_000, basis: 'total' },
      { qty: 100_000, basis: 'total' },
    ]);
    // No indicative price travels: an RFQ asks for firm ones (D4).
    expect(JSON.stringify(rfq)).not.toMatch(/2650|3600/);
  });

  it('KNOWN-BAD twin — options that name nothing on the RFP open nothing and say so', async () => {
    renderWithProviders(<BuyerSourcing />, { route: '/buyer/rfq?rfp=rfp-002&options=opt-nope' });
    expect(await screen.findByText('RFP options not found')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i)).not.toBeInTheDocument();
  });

  it('a seat without rfq:create gets no wizard from the link (the entrance is the unit)', async () => {
    renderWithProviders(<BuyerSourcing />, {
      identity: RECEIVING,
      route: '/buyer/rfq?rfp=rfp-002&options=opt-pump-cap',
    });
    expect(await screen.findByTestId('handoff-rfq-create')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i)).not.toBeInTheDocument();
  });
});

describe('templates and copying (D2)', () => {
  it('"Templates" is a working action: Start from template opens the wizard pre-filled', async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByRole('button', { name: 'Templates' }));
    const picker = await screen.findByTestId('rfq-template-picker');
    expect(within(picker).getByText('Sticker, roll, tiered')).toBeInTheDocument();
    expect(within(picker).getByText('Unit box, papercard')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rfq-template-use-sys-sticker-roll-tiered'));
    expect(screen.queryByTestId('rfq-template-picker')).not.toBeInTheDocument();
    await fillScope({ title: 'From template', qty: '15000' });
    next();
    expect(screen.getByTestId('rfq-item-1-type')).toHaveValue('sticker');
    expect(screen.getByTestId('rfq-item-1-value-form')).toHaveValue('roll');
    // A template keeps the sheet, not the answers: the buyer still owes material.
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('Copy a past RFQ carries the items and the invitees, and clears the dates', async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByRole('button', { name: 'Templates' }));
    fireEvent.click(await screen.findByRole('tab', { name: 'Copy a past RFQ' }));
    fireEvent.change(screen.getByLabelText('Search past RFQs'), { target: { value: 'Oslo' } });
    fireEvent.click(screen.getByTestId('rfq-copy-use-rfq-021'));
    expect(await screen.findByPlaceholderText(/e\.g\. Q3 2026 Fragrance Sourcing/i)).toHaveValue('Oslo variant stickers — launch run');
    expect(screen.getByLabelText('Project name')).toHaveValue('Oslo');
    await fillScope();
    next();
    expect(screen.getByTestId('rfq-item-2-description')).toHaveValue('Oslo back sticker (ingredients)');
    next();
    expect(screen.getAllByTestId('rfq-tiers-chip')).toHaveLength(6);
    next();
    // The sample request is carried, but its DATE is a date and is cleared, so
    // the step holds until the buyer names a new one.
    expect(screen.getByLabelText('Sample quantity')).toHaveValue('20');
    expect(screen.getByLabelText('Needed by')).toHaveValue('');
    expect(screen.getByTestId('rfq-options-refusal')).toHaveTextContent('needs a quantity and the date');
    fireEvent.change(screen.getByLabelText('Needed by'), { target: { value: '2026-10-05' } });
    next();
    expect(within(await screen.findByTestId('invitee-row-sup-007')).getByRole('checkbox')).toBeChecked();
    next();
    const dates = [...document.querySelectorAll<HTMLInputElement>('input[type="date"]')].map((d) => d.value);
    expect(dates).toEqual(['', '']);
  });

  it('Save as template from the RFQ side panel, then start from it', async () => {
    renderWithProviders(<BuyerSourcing />);
    fireEvent.click(await screen.findByText('RFQ-2026-022'));
    fireEvent.click(await screen.findByTestId('panel-save-template'));
    const dialog = await screen.findByTestId('rfq-save-template-dialog');
    expect(within(dialog).getByLabelText('Template name')).toHaveValue('Iron');
    fireEvent.click(within(dialog).getByTestId('rfq-save-template-confirm'));
    expect(await screen.findByText('Template "Iron" saved')).toBeInTheDocument();
    expect(rfqTemplateStore.readState().saved.map((t) => t.name)).toEqual(['Iron']);
    const saved = rfqTemplateStore.readState().saved[0]!;
    // Not kept: invitees and dates are not part of a template's shape at all.
    expect(Object.keys(saved.content)).not.toContain('invitedSupplierIds');
    expect(saved.content.tiers).toHaveLength(5);
  });

  it('WITHHELD — a seat without rfq:create gets neither New RFQ nor Templates', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: RECEIVING });
    await screen.findByText('RFQ-2026-001');
    expect(screen.queryByRole('button', { name: 'Templates' })).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-rfq-create')).toHaveAttribute('data-handoff', 'withheld');
  });
});

describe('the board', () => {
  it('the eyebrow reads "Sourcing", once', async () => {
    renderWithProviders(<BuyerSourcing />, { route: '/buyer/rfq' });
    await screen.findByText('RFQ-2026-001');
    const eyebrow = document.querySelector('.text-eyebrow');
    expect(eyebrow?.textContent).toBe('Sourcing');
  });

  it('a project name shows as a tag on its RFQ', async () => {
    renderWithProviders(<BuyerSourcing />);
    expect(await screen.findByTestId('rfq-project-tag-rfq-021')).toHaveTextContent('Oslo');
    expect(screen.queryByTestId('rfq-project-tag-rfq-001')).not.toBeInTheDocument();
  });
});
