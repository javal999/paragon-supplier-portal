import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '../test/test-utils';
import CommHubInbound from './CommHubInbound';
import { inventoryDeclarationStore } from '../services/data/mock/stores/inventoryDeclarationStore';
import { commandAuditSink } from '../services/data/mock/MockCommandService';
import { channelProvenanceStore } from '../services/channel/provenanceStore';
import { outboundRequestStore } from '../services/channel';
import i18n from '../lib/i18n';

// ────────────────────────────────────────────────────────────────────────────
// Comm Hub C2 — the inbound triage surface. The honesty crux: a parsed reply is
// an INFERENCE until a human acts; NOTHING dispatches from the parse; supplierId
// comes from the identity, never the message.
//
// ⚠️ PREMISE CHANGED (BL-73 · REQ-E08-02 BR-09). This page used to confirm a
// parsed row through its OWN path (a material select + a quantity box →
// `parseGrid` → `useInventoryDeclare`): one field, its own number rules. That
// was a second stock entry point. A row now only PRE-FILLS the Stock page's
// entry form (`StockEntryPanel`, supplier mode), and that form's submit is the
// act. So "confirm" below is: open the form from the row, check it, save. What
// held before still holds (identity-bound supplier, master unit, locale-correct
// quantity, channel-side provenance); what the old path's own refusals proved
// (INVALID / AMBIGUOUS quantity) is now proved by the FORM's CR-18 check, and
// the form's full field set is pinned beside it.
//
// Default persona is sup-007 (PT Sample Packaging) — it holds PK-PETB-8810 (uom
// PCS) + PK-CAPF-8820, so a STOK reply for those pre-fills a real stock row.
// ────────────────────────────────────────────────────────────────────────────

const MAT = 'PK-PETB-8810';

beforeEach(() => {
  inventoryDeclarationStore.reset();
  channelProvenanceStore.reset();
  commandAuditSink.clear();
});

const renderPage = () =>
  renderWithProviders(<CommHubInbound />, { identity: SUPPLIER, route: '/supplier/comm-hub' });

const panel = () => within(document.querySelector('aside[role="dialog"]') as HTMLElement);

const typeMessage = (text: string) =>
  fireEvent.change(screen.getByTestId('commhub-message-input'), { target: { value: text } });
const clickParse = () => fireEvent.click(screen.getByTestId('commhub-parse'));

/** Parse a reply once the supplier's stock rows have loaded (the match needs them). */
async function parseWhenReady(text: string) {
  await screen.findByTestId('commhub-needs');
  typeMessage(text);
  // The exact-match suggestion reads the supplier's own stock rows; parse only
  // once they are there, else a real material would read as unmatched.
  await waitFor(() => {
    clickParse();
    expect(screen.getByTestId('commhub-row-0')).not.toHaveTextContent(/No material of yours/);
  });
}

async function openEntryFromRow() {
  fireEvent.click(await screen.findByTestId('commhub-enter-0'));
  await screen.findByTestId('stock-entry-panel');
}
// MAT-D4 — in production is required (0 allowed). A message that names only the
// stock reports nothing in production, so the user types 0 before saving.
const nothingInProductionIfBlank = () => {
  const field = panel().getByLabelText('In production (PCS)') as HTMLInputElement;
  if (field.value === '') fireEvent.change(field, { target: { value: '0' } });
};
const save = () => {
  nothingInProductionIfBlank();
  fireEvent.click(panel().getByTestId('stock-entry-submit'));
};

const countFor = (material: string) =>
  inventoryDeclarationStore.all().filter((d) => d.supplierId === 'sup-007' && d.materialCode === material).length;

describe('CommHubInbound — parse renders the inference', () => {
  it('shows the message echo, recognized tokens, and a row read from it', async () => {
    renderPage();
    await parseWhenReady('STOK PK-PETB-8810 2.400 KG');
    // Recognized tokens shown; uom parsed as a DIAGNOSTIC (never a payload field).
    const inf = screen.getByTestId('commhub-inference');
    expect(within(inf).getByText('STOK')).toBeInTheDocument();
    expect(within(inf).getByText(/reference only|rujukan saja/i)).toBeInTheDocument();
    // The quantity read is the locale-normalized 2400 (never 2.4), and the row
    // names the supplier's own material it matched.
    const row = screen.getByTestId('commhub-row-0');
    expect(row).toHaveTextContent('2400');
    expect(row).toHaveTextContent(`Matches your material ${MAT}`);
  });

  it('unparseable text → honest diagnostics, NO row, nothing to enter', async () => {
    renderPage();
    typeMessage('halo pak, apa kabar hari ini?');
    clickParse();
    await screen.findByText(/could not interpret|tidak dapat menafsirkan/i);
    expect(screen.queryByTestId('commhub-rows')).not.toBeInTheDocument();
    expect(screen.queryByTestId('commhub-enter-0')).not.toBeInTheDocument();
  });
});

describe('CommHubInbound — the Stock page’s entry form is the only act', () => {
  it('does NOT dispatch before the form is saved (the gate lock)', async () => {
    renderPage();
    const before = inventoryDeclarationStore.all().length;
    await parseWhenReady('STOK PK-PETB-8810 2400 KG');
    await openEntryFromRow();
    // Parsed, form open and pre-filled — but not saved → nothing dispatched.
    expect(inventoryDeclarationStore.all().length).toBe(before);
    expect(commandAuditSink.all()).toHaveLength(0);
  });

  it('on save the reply lands as a governed declaration (locale 2400, master uom, entered on screen)', async () => {
    renderPage();
    const base = countFor(MAT);
    await parseWhenReady('STOK PK-PETB-8810 2.400 KG');
    await openEntryFromRow();
    expect((panel().getByLabelText('Material') as HTMLSelectElement).value).toBe(MAT);
    expect((panel().getByLabelText('Stock on hand (PCS)') as HTMLInputElement).value).toBe('2400');
    save();
    await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
    const minted = inventoryDeclarationStore.latestFor('sup-007', MAT)!;
    expect(minted.supplierId).toBe('sup-007'); // from identity
    expect(minted.totalQty).toBe(2400); // locale-correct, never 2.4
    expect(minted.uom).toBe('PCS'); // master uom — the message's "KG" never entered the payload
    expect(minted.channel).toBe('manual'); // the supplier entered it — never "Entered by PTI"
    expect(commandAuditSink.byEvent('t_inventorydeclaration_declare')).toHaveLength(1);
    // The Stock page's own number format — never the id-ID "2.400" in an English UI.
    expect(await screen.findByTestId('commhub-result')).toHaveTextContent(`Recorded: ${MAT} — 2,400 PCS`);
  });

  it('the user’s EDIT in the form changes what dispatches', async () => {
    renderPage();
    const base = countFor(MAT);
    await parseWhenReady('STOK PK-PETB-8810 2400 KG');
    await openEntryFromRow();
    fireEvent.change(panel().getByLabelText('Stock on hand (PCS)'), { target: { value: '5000' } });
    save();
    await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
    expect(inventoryDeclarationStore.latestFor('sup-007', MAT)!.totalQty).toBe(5000);
  });

  it('supplierId comes from the identity, never the message (spoof is inert)', async () => {
    renderPage();
    const base = countFor(MAT);
    await parseWhenReady('STOK PK-PETB-8810 2400 supplierId=sup-999');
    await openEntryFromRow();
    save();
    await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
    expect(inventoryDeclarationStore.latestFor('sup-007', MAT)!.supplierId).toBe('sup-007');
    expect(inventoryDeclarationStore.all().some((d) => d.supplierId === 'sup-999')).toBe(false);
  });

  it('CR-18 — a quantity that is not a number blocks the save and says so', async () => {
    renderPage();
    await parseWhenReady('STOK PK-PETB-8810 2400 KG');
    await openEntryFromRow();
    fireEvent.change(panel().getByLabelText('Stock on hand (PCS)'), { target: { value: 'abc' } });
    expect(panel().getByText('Not a number')).toBeInTheDocument();
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    expect(commandAuditSink.all()).toHaveLength(0);
  });

  // The operator-typed qty is never resolved by our locale when it reads two ways.
  // The load-bearing half is the reason: a refusal that renders no reason is not
  // honest silence, it is just silence.
  it('CR-18 — an AMBIGUOUS quantity refuses AND says why — a reason is never blank', async () => {
    renderPage();
    await parseWhenReady('STOK PK-PETB-8810 2400 KG');
    await openEntryFromRow();
    fireEvent.change(panel().getByLabelText('Stock on hand (PCS)'), { target: { value: '2.400' } });
    expect(panel().getByText(/can be read two ways/i)).toBeInTheDocument();
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    expect(commandAuditSink.all()).toHaveLength(0);
  });

  it('records provenance on the channel side after dispatch (never in the payload)', async () => {
    renderPage();
    const base = countFor(MAT);
    expect(channelProvenanceStore.all()).toHaveLength(0);
    await parseWhenReady('STOK PK-PETB-8810 2400 KG');
    await openEntryFromRow();
    save();
    await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
    await waitFor(() => expect(channelProvenanceStore.all()).toHaveLength(1));
    const ref = channelProvenanceStore.all()[0];
    expect(ref.channelMessageId).toMatch(/^cm-/);
    expect(ref.sessionId).toMatch(/^ss-c2-/);
    expect(ref.causationAnchor).toBeTruthy(); // the anchor of the dispatch it produced
  });
});

// ────────────────────────────────────────────────────────────────────────────
// BL-73 — IT IS THE STOCK PAGE'S FORM: the full field set and CR-19.
// ────────────────────────────────────────────────────────────────────────────
describe('BL-73 · CommHubInbound enters stock through the Stock page’s form', () => {
  it('carries the full field set: ROP, in production, completion date, batches with manufacturing and expiry', async () => {
    renderPage();
    await parseWhenReady('STOK PK-PETB-8810 1000');
    await openEntryFromRow();
    fireEvent.change(panel().getByLabelText('Supplier reorder point (PCS)'), { target: { value: '300' } });
    fireEvent.change(panel().getByLabelText('In production (PCS)'), { target: { value: '5000' } });
    fireEvent.change(panel().getByLabelText('Expected production completion'), { target: { value: '2026-09-30' } });
    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    fireEvent.change(panel().getByLabelText('Batch number'), { target: { value: 'WA-1' } });
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '1000' } });
    fireEvent.change(panel().getByLabelText('Manufacturing date'), { target: { value: '2026-06-01' } });
    fireEvent.change(panel().getByLabelText('Expiry date'), { target: { value: '2028-06-01' } });
    save();
    await waitFor(() => expect(countFor(MAT)).toBe(1));
    expect(inventoryDeclarationStore.latestFor('sup-007', MAT)).toMatchObject({
      totalQty: 1000,
      supplierRop: 300,
      inProductionQty: 5000,
      productionCompletionDate: '2026-09-30',
      channel: 'manual',
      batches: [{ batchNumber: 'WA-1', qty: 1000, uom: 'PCS', manufacturingDate: '2026-06-01', expiryDate: '2028-06-01' }],
    });
  });

  it('CR-19 — batches that do not add up to the stock on hand block the save; the known-good twin saves', async () => {
    renderPage();
    await parseWhenReady('STOK PK-PETB-8810 1000');
    await openEntryFromRow();
    fireEvent.click(panel().getByRole('button', { name: 'Add batch' }));
    fireEvent.change(panel().getByLabelText('Batch number'), { target: { value: 'WA-1' } });
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '900' } });
    expect(panel().getByTestId('stock-entry-batch-mismatch')).toBeInTheDocument();
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    fireEvent.change(panel().getByLabelText('Quantity'), { target: { value: '1000' } });
    save();
    await waitFor(() => expect(countFor(MAT)).toBe(1));
  });
});

describe('CommHubInbound — material alias is a visible suggestion, never auto-resolved', () => {
  it('an unknown material does not pre-select, and the form cannot save until one is chosen', async () => {
    renderPage();
    await screen.findByTestId('commhub-needs');
    // MAT-10234 is code-like (parses as a material token) but is NOT one of
    // sup-007's materials — so it must never silently resolve.
    typeMessage('STOK MAT-10234 2400 KG');
    clickParse();
    const row = await screen.findByTestId('commhub-row-0');
    // The raw token is shown for reference, but nothing was silently resolved.
    expect(within(row).getByText('MAT-10234')).toBeInTheDocument();
    expect(row).toHaveTextContent(/No material of yours matches/);
    await openEntryFromRow();
    const material = panel().getByLabelText('Material') as HTMLSelectElement;
    expect(material.value).toBe('');
    expect(panel().getByTestId('stock-entry-submit')).toBeDisabled();
    // Choosing the material in the form unlocks the save.
    fireEvent.change(material, { target: { value: MAT } });
    nothingInProductionIfBlank();
    expect(panel().getByTestId('stock-entry-submit')).not.toBeDisabled();
  });
});

describe('CommHubInbound — i18n (ID)', () => {
  it('localizes the header and honesty banner to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderPage();
      expect(await screen.findByText(/Kotak Masuk Kanal — triase balasan/)).toBeInTheDocument();
      expect(screen.getByText(/Kotak masuk diisi operator/)).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

// ─── Comm Hub C5 — the "what Paragon needs from you" section + honest note ─────
describe('CommHubInbound — C5 own obligations section', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders the supplier’s OWN overdue + upcoming deliveries in own-facing tone', async () => {
    renderPage();
    const section = await screen.findByTestId('commhub-needs');
    expect(within(section).getByText('What Paragon needs from you')).toBeInTheDocument();
    // sup-007's own obligations render (await the own-scoped read) with the own-facing
    // gloss — never buyer wording.
    await waitFor(() =>
      expect(within(section).getAllByTestId('commhub-needs-row').length).toBeGreaterThan(0),
    );
    expect(within(section).getAllByText(/Overdue|Upcoming/).length).toBeGreaterThan(0);
    expect(
      within(section).getAllByText(/Paragon is (waiting on|expecting) this delivery/).length,
    ).toBeGreaterThan(0);
  });

  it('is own-only — never another supplier’s material (isolation)', async () => {
    renderPage();
    const section = await screen.findByTestId('commhub-needs');
    // sup-007's own code appears (await the read); other suppliers' codes never do.
    await waitFor(() => expect(within(section).getAllByText('PK-PETB-8810').length).toBeGreaterThan(0));
    expect(within(section).queryByText('AI-NIAC-6601')).toBeNull();
    expect(within(section).queryByText('RM-EMUL-3310')).toBeNull();
  });

  it('NO buyer chase vocabulary leaks into the C5 section', async () => {
    renderPage();
    const section = await screen.findByTestId('commhub-needs');
    await waitFor(() =>
      expect(within(section).getAllByTestId('commhub-needs-row').length).toBeGreaterThan(0),
    );
    for (const word of [/\bchase\b/i, /\bnudge\b/i, /non-compliance/i, /\bdrift\b/i, /\bUrgent\b/, /\bAdvisory\b/]) {
      expect(within(section).queryByText(word)).toBeNull();
    }
  });

  it('CONTRACT: the supplier surface reads NO global channel store (no leak, no fabricated ask)', async () => {
    // The outbound ask store must never be surfaced to a supplier (every record is
    // "composed — not sent"); the global provenance list must never be read own-side
    // (its refs carry no supplierId — reading .all() would leak every supplier's).
    const outAll = vi.spyOn(outboundRequestStore, 'all');
    const outForSupplier = vi.spyOn(outboundRequestStore, 'forSupplier');
    const provAll = vi.spyOn(channelProvenanceStore, 'all');
    renderPage();
    const section = await screen.findByTestId('commhub-needs');
    await waitFor(() =>
      expect(within(section).getAllByTestId('commhub-needs-row').length).toBeGreaterThan(0),
    );
    expect(outAll).not.toHaveBeenCalled();
    expect(outForSupplier).not.toHaveBeenCalled();
    expect(provAll).not.toHaveBeenCalled();
  });

  it('shows the honest "recorded here, never sent from here" note', async () => {
    renderPage();
    const note = await screen.findByTestId('commhub-note');
    expect(within(note).getByText(/Recorded here, never sent from here/i)).toBeInTheDocument();
    expect(within(note).getByText(/nothing is auto-sent or auto-received/i)).toBeInTheDocument();
  });

  it('localizes the C5 section title to Indonesian', async () => {
    await i18n.changeLanguage('id');
    try {
      renderPage();
      const section = await screen.findByTestId('commhub-needs');
      expect(within(section).getByText('Yang Paragon butuhkan dari Anda')).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ⚠️ THE LANE GATE ON THE ONE ACT THIS SURFACE PERFORMS.
//
// `t_inventorydeclaration_declare` needs `inventorydeclaration:declare`, which is
// FULFILMENT's since the supplier lanes were seeded at #263. This page shipped
// with NO guard at all — its buyer twin `BuyerChannelTriage` has gated the
// identical control on `inventorydeclaration:record` since §74, and the reason
// recorded for skipping the supplier side ("a supplier seat is exactly
// ['supplier'], so every notice is a dead branch") stopped being true the day the
// lanes landed. Derived: NO supplier atom is held by all three lanes, so that
// reason can never be the right one on this side again.
//
// Both directions in the same block: the withheld seat AND the held one.
// ──────────────────────────────────────────────────────────────────────────────
describe('⚠️ CommHubInbound — `inventorydeclaration:declare` is FULFILMENT’s', () => {
  const lane = (roles: readonly string[]) => ({ ...SUPPLIER, businessRoles: roles });
  const renderAs = (roles: readonly string[]) =>
    renderWithProviders(<CommHubInbound />, {
      identity: lane(roles),
      route: '/supplier/comm-hub',
    });
  const parseAReply = async () => {
    await screen.findByTestId('commhub-needs');
    typeMessage('STOK PK-PETB-8810 2400 KG');
    clickParse();
    await screen.findByTestId('commhub-row-0');
  };

  it('⚠️ a COMMERCIAL-only seat reads the WAIT, and the way into the form is GONE', async () => {
    renderAs(['supplier', 'commercial']);
    await parseAReply();
    const notice = await screen.findByTestId('handoff-commhub-declare');
    expect(notice).toHaveTextContent(i18n.t('roles.owner.fulfilment'));
    expect(notice).toHaveAttribute('data-handoff', 'withheld');
    expect(screen.queryByTestId('commhub-enter-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stock-entry-panel')).not.toBeInTheDocument();
  });

  it('…and nothing dispatches for that seat even though the row parsed', async () => {
    renderAs(['supplier', 'back_office']);
    const base = countFor(MAT);
    await parseAReply();
    // The inference is still shown — reading is ungoverned (§75e). Only the
    // COMMIT is withheld, and no declaration exists for a seat that cannot make one.
    expect(screen.getByTestId('commhub-inference')).toBeInTheDocument();
    // ⚠️ The absence of the CONTROL is the assertion that probes the guard.
    // Asserting only that the count did not move would pass against a LIVE
    // control that this test simply never clicks.
    expect(screen.queryByTestId('commhub-enter-0')).not.toBeInTheDocument();
    expect(await screen.findByTestId('handoff-commhub-declare')).toHaveTextContent(
      i18n.t('roles.owner.fulfilment'),
    );
    expect(countFor(MAT)).toBe(base);
  });

  it('…and a FULFILMENT seat still enters end to end — not an always-off', async () => {
    renderAs(['supplier', 'fulfilment']);
    const base = countFor(MAT);
    await parseAReply();
    expect(screen.queryByTestId('handoff-commhub-declare')).not.toBeInTheDocument();
    await openEntryFromRow();
    // The pre-fill needs the stock rows; set the material explicitly so the
    // assertion is about the gate, not about load order.
    fireEvent.change(panel().getByLabelText('Material'), { target: { value: MAT } });
    fireEvent.change(panel().getByLabelText('Stock on hand (PCS)'), { target: { value: '2400' } });
    save();
    await waitFor(() => expect(countFor(MAT)).toBe(base + 1));
  });
});
