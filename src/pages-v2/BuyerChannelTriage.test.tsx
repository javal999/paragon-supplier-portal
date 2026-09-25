import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER, pickSelectFieldOption } from '../test/test-utils';
import BuyerChannelTriage from './BuyerChannelTriage';
import SupplierInventory from './SupplierInventory';
import { commandAuditSink } from '../services/data/mock/MockCommandService';
import { inventoryDeclarationStore } from '../services/data/mock/stores/inventoryDeclarationStore';
import { channelProvenanceStore } from '../services/channel/provenanceStore';
import i18n from '../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// Comm Hub C4d — the buyer in-place triage. The SUBJECT supplier is bound at
// capture; the dispatch is the C4c RECORDING verb (t_inventorydeclaration_record)
// — actor = the buyer, truthfully. Default identity is BUYER (renderWithProviders),
// so the record verb passes its role gate; sup-007 (PT Sample Packaging) holds
// PK-PETB-8810 (uom PCS).
//
// ⚠️ PREMISE CHANGED (BL-73 · REQ-E08-02 BR-08 / BR-09). This panel used to
// confirm through its OWN path (a material select + a quantity box → `parseGrid`
// → `useInventoryRecord`). It now only PRE-FILLS the Inventory page's entry form
// (`StockEntryPanel`, PTI mode) with the supplier LOCKED, and that form's submit
// is the act. So "confirm" below is: open the form from the row, check it, save.
// Every assertion that held before still holds — the verb, the actor, the store
// mint, the provenance — and the new ones pin that it is the SAME form: its
// fields, its CR-18 / CR-19 checks, and the "Entered by PTI" record the supplier
// then reads on its own Stock page.
//
// NB the tests render against the REAL MockCommandService, so the dispatch, the
// store mint, and the DR-10 event are all real — no hook is mocked here.
// ────────────────────────────────────────────────────────────────────────────

const SUBJECT = 'sup-007';
const MAT = 'PK-PETB-8810';

beforeEach(() => {
  inventoryDeclarationStore.reset();
  channelProvenanceStore.reset();
  commandAuditSink.clear();
});
afterEach(() => {
  inventoryDeclarationStore.reset();
  channelProvenanceStore.reset();
  commandAuditSink.clear();
});

const panel = () => within(document.querySelector('aside[role="dialog"]') as HTMLElement);

// The supplier picker is populated by an async read — pickSelectFieldOption
// waits for it, and works whether the fixture size renders a plain <select>
// or (as it does here, at 22 suppliers) a searchable combobox.
const pickSupplier = (id: string) => pickSelectFieldOption('triage-supplier', id);
const typeMessage = (text: string) =>
  fireEvent.change(screen.getByTestId('triage-message'), { target: { value: text } });
const clickParse = () => fireEvent.click(screen.getByTestId('triage-parse'));

/** Open the entry form from parsed row 0 (the subject's stock rows must have loaded). */
async function openEntryFromRow() {
  const enter = await screen.findByTestId('triage-enter-0');
  fireEvent.click(enter);
  await screen.findByTestId('stock-entry-panel');
}

const countFor = (material: string) =>
  inventoryDeclarationStore.all().filter((d) => d.supplierId === SUBJECT && d.materialCode === material).length;

// Land a recorded declaration (the happy path) — reused across assertions.
async function recordOne(msg = 'STOK PK-PETB-8810 2400 KG') {
  const base = countFor(MAT);
  await pickSupplier(SUBJECT);
  typeMessage(msg);
  clickParse();
  await openEntryFromRow();
  fireEvent.click(panel().getByTestId('stock-entry-submit'));
  await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
}

describe('BuyerChannelTriage — the binding is first, and never a free supplierId field', () => {
  it('gates on picking a supplier; the subject is bound (a select), never a typed supplierId', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    // Before a supplier is picked there is no message field.
    expect(screen.queryByTestId('triage-message')).not.toBeInTheDocument();
    await pickSupplier(SUBJECT);
    // Now the paste field appears, bound to the chosen supplier.
    expect(screen.getByTestId('triage-message')).toBeInTheDocument();
    expect(screen.getByText(/Recording for/i)).toBeInTheDocument();
    // The subject is PICKED from a SelectField (a plain <select> at ≤10
    // suppliers, a searchable-combobox <input> above it — 22 in this fixture,
    // so an INPUT here), and there is NEVER a free-typed supplierId field.
    // Typing garbage into the combobox without picking a row never binds it
    // (SelectField's own suite covers that); this only re-asserts no OTHER,
    // separate raw-id field exists on this surface.
    expect(['SELECT', 'INPUT']).toContain(screen.getByTestId('triage-supplier').tagName);
    expect(screen.queryByLabelText(/supplier id/i)).not.toBeInTheDocument();
    // Parse, then open the entry form: the supplier is SHOWN, locked — the form's
    // own supplier select is not offered here.
    typeMessage('STOK PK-PETB-8810 2400 KG');
    clickParse();
    await openEntryFromRow();
    expect(panel().getByTestId('stock-entry-supplier-locked')).toHaveTextContent('PT Sample Packaging');
    expect(panel().queryByLabelText('Supplier')).toBeNull();
    expect(panel().queryByLabelText(/supplier id/i)).toBeNull();
  });
});

describe('BuyerChannelTriage — the entry form + the RECORD verb', () => {
  it('does NOT dispatch before the form is saved (the gate lock)', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    const base = countFor(MAT);
    await pickSupplier(SUBJECT);
    typeMessage('STOK PK-PETB-8810 2400 KG');
    clickParse();
    await openEntryFromRow();
    // Parsed, form open and pre-filled — but not saved → nothing dispatched.
    expect(countFor(MAT)).toBe(base);
    expect(commandAuditSink.all()).toHaveLength(0);
  });

  it('the message PRE-FILLS the form: the material and the locale-correct quantity', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await pickSupplier(SUBJECT);
    typeMessage('STOK PK-PETB-8810 2.400 KG');
    clickParse();
    await openEntryFromRow();
    expect((panel().getByLabelText('Material') as HTMLSelectElement).value).toBe(MAT);
    expect((panel().getByLabelText('Stock on hand (PCS)') as HTMLInputElement).value).toBe('2400');
  });

  it('on save it dispatches the RECORD verb (not declare) and the object lands as "Entered by PTI"', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await recordOne('STOK PK-PETB-8810 2.400 KG');
    const minted = inventoryDeclarationStore.latestFor(SUBJECT, MAT)!;
    expect(minted.totalQty).toBe(2400);
    expect(minted.uom).toBe('PCS'); // master uom — the message's "KG" never entered
    expect(minted.channel).toBe('pti'); // BR-08 — the record shows it was entered by PTI
    // The RECORD verb fired — NOT the supplier declare verb.
    expect(commandAuditSink.byEvent('t_inventorydeclaration_record')).toHaveLength(1);
    expect(commandAuditSink.byEvent('t_inventorydeclaration_declare')).toHaveLength(0);
  });

  it('THE C4c CRUX AT THE SURFACE: the DR-10 actor is the BUYER, not the supplier', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await recordOne();
    const ev = commandAuditSink.byEvent('t_inventorydeclaration_record')[0];
    expect(ev.actor).toBe('buyer:all');
    expect(ev.scope.personaType).toBe('buyer');
  });

  it('records channel-side provenance after dispatch (never in the payload)', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    expect(channelProvenanceStore.all()).toHaveLength(0);
    await recordOne();
    await waitFor(() => expect(channelProvenanceStore.all()).toHaveLength(1));
    const ref = channelProvenanceStore.all()[0];
    expect(ref.channelMessageId).toMatch(/^cm-c4d-/);
    expect(ref.sessionId).toMatch(/^ss-c4d-/);
    expect(ref.causationAnchor).toBeTruthy();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// BL-73 — IT IS THE STOCK PAGE'S FORM: the same fields and the same checks.
// ────────────────────────────────────────────────────────────────────────────
describe('BL-73 · BuyerChannelTriage records through the Inventory page’s entry form', () => {
  it('carries the full field set: ROP, in production, completion date, batches with manufacturing and expiry', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await pickSupplier(SUBJECT);
    typeMessage('STOK PK-PETB-8810 1000');
    clickParse();
    await openEntryFromRow();
    fireEvent.change(panel().getByLabelText('Supplier reorder point (PCS)'), { target: { value: '300' } });
    fireEvent.change(panel().getByLabelText('In production (PCS)'), { target: { value: '5000' } });
    fireEvent.change(panel().getByLabelText('Expected production completion'), { target: { value: '2026-09-30' } });
    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    fireEvent.change(panel().getByLabelText('Batch number'), { target: { value: 'WA-1' } });
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '1000' } });
    fireEvent.change(panel().getByLabelText('Manufacturing date'), { target: { value: '2026-06-01' } });
    fireEvent.change(panel().getByLabelText('Expiry date'), { target: { value: '2028-06-01' } });
    fireEvent.click(panel().getByTestId('stock-entry-submit'));
    await waitFor(() => expect(countFor(MAT)).toBe(1));
    expect(inventoryDeclarationStore.latestFor(SUBJECT, MAT)).toMatchObject({
      totalQty: 1000,
      supplierRop: 300,
      inProductionQty: 5000,
      productionCompletionDate: '2026-09-30',
      channel: 'pti',
      batches: [{ batchNumber: 'WA-1', qty: 1000, uom: 'PCS', manufacturingDate: '2026-06-01', expiryDate: '2028-06-01' }],
    });
  });

  it('CR-18 — an ambiguous quantity from the message is refused in the form, not guessed', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await pickSupplier(SUBJECT);
    typeMessage('STOK PK-PETB-8810 1000');
    clickParse();
    await openEntryFromRow();
    fireEvent.change(panel().getByLabelText('Stock on hand (PCS)'), { target: { value: '2.400' } });
    expect(panel().getByText(/can be read two ways/i)).toBeInTheDocument();
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    expect(commandAuditSink.all()).toHaveLength(0);
  });

  it('CR-19 — batches that do not add up to the stock on hand block the save', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await pickSupplier(SUBJECT);
    typeMessage('STOK PK-PETB-8810 1000');
    clickParse();
    await openEntryFromRow();
    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    fireEvent.change(panel().getByLabelText('Batch number'), { target: { value: 'WA-1' } });
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '900' } });
    expect(panel().getByTestId('stock-entry-batch-mismatch')).toBeInTheDocument();
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    // Known-good twin: once they add up, the same form saves.
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '1000' } });
    fireEvent.click(panel().getByTestId('stock-entry-submit'));
    await waitFor(() => expect(countFor(MAT)).toBe(1));
  });

  it('BR-08 — the supplier sees it on its own Stock page, marked "Entered by PTI"', async () => {
    const triage = renderWithProviders(<BuyerChannelTriage />);
    await recordOne('STOK PK-PETB-8810 777');
    triage.unmount();
    renderWithProviders(<SupplierInventory />, { identity: SUPPLIER });
    const row = await screen.findByTestId(`sup-stock-row-${MAT}`);
    await waitFor(() => expect(row).toHaveTextContent('777'));
    expect(row).toHaveTextContent('Entered by PTI');
  });
});

describe('BuyerChannelTriage — honesty: recorded-by-Paragon, no silent resolution', () => {
  it('the result reads "Recorded by Paragon", never "submitted by the supplier"', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await recordOne();
    const result = await screen.findByTestId('triage-result');
    expect(within(result).getByText(/Recorded by Paragon/i)).toBeInTheDocument();
    expect(result).toHaveTextContent('PK-PETB-8810 — 2,400 PCS'); // the Stock page's number format
    expect(within(result).queryByText(/submitted by the supplier/i)).not.toBeInTheDocument();
    expect(within(result).queryByText(/self-submitted/i)).not.toBeInTheDocument();
  });

  it('an unknown material (not held by the subject) is never pre-selected — and cannot be chosen', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await pickSupplier(SUBJECT);
    // RM-EMUL-3310 is code-like but is NOT one of sup-007's materials.
    typeMessage('STOK RM-EMUL-3310 1000');
    clickParse();
    // The raw token is shown for reference, and the row says nothing matched…
    const row = await screen.findByTestId('triage-row-0');
    expect(within(row).getByText('RM-EMUL-3310')).toBeInTheDocument();
    expect(row).toHaveTextContent(/No material of .* matches/);
    // …and the form opens with NO material selected, and does not offer it.
    await openEntryFromRow();
    const material = panel().getByLabelText('Material') as HTMLSelectElement;
    expect(material.value).toBe('');
    expect(within(material).queryByText(/RM-EMUL-3310/)).not.toBeInTheDocument();
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    expect(countFor('RM-EMUL-3310')).toBe(0);
  });

  it('gibberish → honest diagnostics, no row, nothing dispatched', async () => {
    renderWithProviders(<BuyerChannelTriage />);
    await pickSupplier(SUBJECT);
    typeMessage('halo pak, apa kabar hari ini?');
    clickParse();
    await screen.findByText(/could not interpret/i);
    expect(screen.queryByTestId('triage-rows')).not.toBeInTheDocument();
    expect(screen.queryByTestId('triage-enter-0')).not.toBeInTheDocument();
    expect(commandAuditSink.all()).toHaveLength(0);
  });
});

describe('BuyerChannelTriage — i18n (ID)', () => {
  it('localizes the panel title and the binding prompt to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderWithProviders(<BuyerChannelTriage />);
      expect(await screen.findByText('Triase balasan kanal')).toBeInTheDocument();
      expect(screen.getByText('Ini percakapan siapa?')).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
