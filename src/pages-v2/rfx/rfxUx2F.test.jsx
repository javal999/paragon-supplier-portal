// ─────────────────────────────────────────────────────────────────────────────
// RFx UX 2F — five defects from the final preview review.
//
// 1 · the RFP "Jump to" counts come from the data each section lists: Terms =
//     the term rows the comparison shows (it read the proposal count, "0" beside
//     6 terms sent); Firm up the prices = the firm-offer rounds, no count before
//     the first one (it read "0").
// 2 · the RFI and RFP "About the event" card no longer repeats the number,
//     title and status the page header already shows.
// 3 · the RFQ side panel title is "RFQ-2026-021 — <title>", not "RFQ RFQ-…".
// 4 · an open supplier RFI/RFP row's toggle reads "Collapse" ("Ciutkan"), not
//     "Close", which reads like the lifecycle act.
// 5 · the supplier award history uses one placeholder, "—", at one weight, in
//     both empty columns.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER, SUPPLIER } from '@test/test-utils';
import BuyerRfxRoutes, { selectEventTab } from '@test/buyerRfxRoutes';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import {
  resetRfxStores,
  rfpEventStore,
  rfpOfferRoundStore
} from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { rfxEn, rfxId } from '@lib/i18n/rfx';
import { sourcingEn, sourcingId } from '@lib/i18n/sourcing';
import BuyerSourcingPage from '../BuyerSourcing';
import SupplierRfi from '../SupplierRfi';
import SupplierRfp from '../SupplierRfp';
import SupplierRFQs from '../SupplierRFQs';
import { rfxNow } from './rfxDisplay';

/** @type {CurrentIdentity} */
const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {CurrentIdentity} */
const SUP_007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  supplierName: 'sup-007',
  businessRoles: SEEDED_SEAT_ROLES.supplier,
  actor: NO_PERSON
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

/** @param {string} route */
const at = (route) => renderWithProviders(<BuyerRfxRoutes />, { identity: BUYER_SEAT, route });

/**
 * The count beside a nav entry: the entry's text minus its label.
 * @param {string} id
 * @param {string} label
 */
const navCount = (id, label) =>
  (screen.getByTestId(`event-nav-${id}`).textContent ?? '').replace(label, '');

describe('1 — the RFP nav counts are what each section lists', () => {
  it('ICY (rfp-003, Open, 0 proposals): Terms = the rows of "Terms sent", never the proposal count', async () => {
    at('/buyer/rfp/rfp-003');
    const sent = await screen.findByTestId('rfp-terms-sent-rfp-003');
    const rows = within(sent)
      .getAllByRole('row')
      .filter((r) => (r.getAttribute('data-testid') ?? '').startsWith('rfp-term-'));
    expect(rows.length).toBeGreaterThan(0);
    // RFx UX 2G — "Terms sent" is the Overview tab's Terms section
    // (`rfp-event-terms`); `rfp-event-comparison` is the Compare grid.
    expect(navCount('rfp-event-terms', 'Terms')).toBe(String(rows.length));
    // KNOWN-BAD — the old count was the proposals, 0 here.
    expect(navCount('rfp-event-terms', 'Terms')).not.toBe('0');
    const event = rfpEventStore.get('rfp-003');
    expect(rows).toHaveLength(event?.terms.length ?? -1);
  });

  it('Firm up the prices: no count before the first round, the round count after it', async () => {
    const first = at('/buyer/rfp/rfp-003');
    await screen.findByTestId('rfp-firmup-rfp-003');
    expect(navCount('rfp-event-firmup', 'Firm up the prices')).toBe('');
    first.unmount();

    rfpEventStore.update('rfp-002', (e) => ({ ...e, status: /** @type {const} */ ('Closed') }));
    rfpOfferRoundStore.add({
      id: 'rfp-round-2f',
      rfpId: 'rfp-002',
      roundNumber: 1,
      optionRefs: ['opt-full-set'],
      quantityPoints: [50_000],
      invitedSupplierIds: ['sup-007'],
      deadline: rfxNow().slice(0, 10),
      openedAt: rfxNow()
    });
    at('/buyer/rfp/rfp-002');
    // RFx UX 2G — "Firm up the prices" is on the Overview tab.
    await selectEventTab('Overview');
    await screen.findByTestId('rfp-round-rfp-round-2f');
    expect(navCount('rfp-event-firmup', 'Firm up the prices')).toBe('1');
  });

  it('the RFI nav: Answers = the answers listed', async () => {
    at('/buyer/rfi/rfi-001');
    const detail = await screen.findByTestId('rfi-detail-rfi-001');
    const section = /** @type {HTMLElement} */ (detail.querySelector('#rfi-event-answers'));
    const listed = (within(section).getByText(/^\d+ responses?$/).textContent ?? '').match(
      /\d+/
    )?.[0];
    expect(listed).toBeDefined();
    expect(navCount('rfi-event-answers', 'Answers')).toBe(listed);
  });
});

describe('2 — the About card does not repeat the page header', () => {
  it('RFP: number, title and status are in the header only; the sourcing type stays in the card', async () => {
    at('/buyer/rfp/rfp-003');
    await screen.findByTestId('rfp-detail-rfp-003');
    const event = rfpEventStore.get('rfp-003');
    if (!event) throw new Error('rfp-003 missing');
    const card = /** @type {HTMLElement} */ (document.getElementById('rfp-event-about'));
    expect(within(card).queryByText(event.eventNumber)).not.toBeInTheDocument();
    expect(within(card).queryByText(event.title)).not.toBeInTheDocument();
    expect(within(card).queryByText(rfxEn[`rfx.status.${event.status}`])).not.toBeInTheDocument();
    expect(within(card).getByTestId('rfp-sourcing-type-rfp-003')).toBeInTheDocument();
    // KNOWN-GOOD twin — the header still carries all three.
    expect(screen.getAllByText(event.eventNumber).length).toBeGreaterThan(0);
    expect(screen.getByTestId('rfp-event-status')).toHaveTextContent(
      rfxEn[`rfx.status.${event.status}`]
    );
  });

  it('RFI: the same', async () => {
    at('/buyer/rfi/rfi-001');
    await screen.findByTestId('rfi-detail-rfi-001');
    // RFx UX 2G — the About card is on the Overview tab.
    await selectEventTab('Overview');
    const card = /** @type {HTMLElement} */ (document.getElementById('rfi-event-about'));
    const header = screen.getByRole('heading', { level: 1 });
    const title = header.textContent ?? '';
    expect(title.length).toBeGreaterThan(0);
    expect(within(card).queryByText(title)).not.toBeInTheDocument();
    expect(within(card).queryByText('Open', { selector: 'span' })).not.toBeInTheDocument();
    expect(within(card).getByTestId('rfi-sourcing-type-rfi-001')).toBeInTheDocument();
    expect(screen.getByTestId('rfi-event-status')).toHaveTextContent('Open');
  });
});

describe('3 — the RFQ side panel title carries the acronym once', () => {
  it('reads "RFQ-2026-021 — <title>"', async () => {
    renderWithProviders(<BuyerSourcingPage />, {
      identity: { ...BUYER, businessRoles: ['procurement'] }
    });
    fireEvent.click(await screen.findByText('RFQ-2026-021'));
    const panel = await screen.findByRole('dialog');
    const title = within(panel).getByRole('heading', { level: 2 });
    expect(title).toHaveTextContent(/^RFQ-2026-021 — Oslo variant stickers/);
    expect(title).not.toHaveTextContent('RFQ RFQ-');
  });

  it('EN and ID both start with the number', () => {
    expect(sourcingEn['sourcing.panel.title']).toBe('{{number}} — {{title}}');
    expect(sourcingId['sourcing.panel.title']).toBe('{{number}} — {{title}}');
  });
});

describe('4 — an open supplier row collapses; it does not "Close"', () => {
  it('RFI: the open row reads "Collapse", and "Answer" again once collapsed', async () => {
    renderWithProviders(<SupplierRfi />, { identity: SUPPLIER });
    const toggle = await screen.findByTestId('supplier-rfi-open-rfi-002');
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent(/^Collapse$/);
    expect(toggle).not.toHaveTextContent('Close');
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent('Answer');
  });

  it('RFP: the open row reads "Collapse"', async () => {
    renderWithProviders(<SupplierRfp />, { identity: SUPPLIER });
    const toggles = await screen.findAllByTestId(/^supplier-rfp-open-/);
    fireEvent.click(toggles[0]);
    expect(toggles[0]).toHaveTextContent(/^Collapse$/);
  });

  it('EN "Collapse", ID "Ciutkan"; the old "Close" key is gone', () => {
    expect(rfxEn['rfx.collapse']).toBe('Collapse');
    expect(rfxId['rfx.collapse']).toBe('Ciutkan');
    expect(rfxEn).not.toHaveProperty('rfx.close');
    expect(rfxId).not.toHaveProperty('rfx.close');
  });
});

describe('5 — one placeholder in the award history', () => {
  it('a not-awarded row shows "—" in both columns, in the same element and weight', async () => {
    renderWithProviders(<SupplierRFQs />, { identity: SUP_007 });
    fireEvent.click(await screen.findByRole('tab', { name: /Awards & history/ }));
    await screen.findByTestId('award-row-rfq-015');
    const value = screen.getByTestId('award-none-value-rfq-015');
    const po = screen.getByTestId('award-none-po-rfq-015');
    expect(value.textContent).toBe('—');
    expect(po.textContent).toBe('—');
    expect(value.className).toBe(po.className);
    // KNOWN-BAD — the value placeholder is not the bold mono data token any more.
    expect(value.className).not.toMatch(/font-semibold|font-bold|font-mono/);
    expect(value.closest('td')?.className ?? '').not.toMatch(/font-semibold/);
  });
});
