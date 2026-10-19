// ────────────────────────────────────────────────────────────────────────────
// RFx UX 1C (B-05) — close, cancel and award confirm before they dispatch.
// Each act opens an inline sheet that restates its effects; nothing reaches
// a store until the sheet's own button is pressed, and "Back to edit" closes
// the sheet with nothing dispatched and the typed values kept.
// ────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@lib/i18n';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerRfxRoutes from '@test/buyerRfxRoutes';
import { everyVendorQualified } from '@test/everyVendorQualified';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import {
  resetRfxStores,
  awardStore,
  rfiEventStore,
  rfpEventStore
} from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { rfxEn, rfxId } from '@lib/i18n/rfx';
import BuyerSourcingEvent from '../BuyerSourcingEvent';
import { awardEffects, closeEffects, notAwardedOnFinal } from './ConfirmSheet';

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const BOTTLE = 'PK-PETB-8802';
const CAP = 'PK-CAPF-8820';

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  everyVendorQualified();
});

const t = i18n.getFixedT('en');

/** @param {string} rfqId */
const renderEvent = (rfqId) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: BUYER_SEAT, route: `/buyer/rfq/${rfqId}` }
  );

/**
 * @param {string} key
 * @param {string} supplierId
 * @param {string} value
 */
const share = (key, supplierId, value) =>
  fireEvent.change(
    within(screen.getByTestId(`award-input-${key}-${supplierId}`)).getByLabelText(/Share/i),
    { target: { value } }
  );
const reasonIfAsked = () => {
  const field = screen.queryByLabelText('Award reason');
  if (field) fireEvent.change(field, { target: { value: 'Split by plant.' } });
};
const awardsOf014 = () => awardStore.all().filter((a) => a.eventId === 'rfq-014');

describe('B-05 — the strings, in both languages', () => {
  it('the sheet buttons read "Record the award" / "Catat pemenang" and "Back to edit" / "Kembali"', () => {
    expect(rfxEn['rfx.confirm.award.record']).toBe('Record the award');
    expect(rfxId['rfx.confirm.award.record']).toBe('Catat pemenang');
    expect(rfxEn['rfx.confirm.back']).toBe('Back to edit');
    expect(rfxId['rfx.confirm.back']).toBe('Kembali');
  });
});

describe('B-05 — the effect lines', () => {
  it('a final award names every invitee no award in force names; a partial award names nobody', () => {
    const lines = [{ supplierId: 'sup-013' }];
    const inForce = [{ lines: [{ supplierId: 'sup-015' }] }];
    const pool = ['sup-007', 'sup-013', 'sup-015'];
    expect(notAwardedOnFinal({ final: true, lines }, inForce, pool)).toEqual(['sup-007']);
    expect(notAwardedOnFinal({ final: false, lines }, inForce, pool)).toEqual([]);
  });

  it('one line per item with its split, the reason on record, and what can still be undone', () => {
    const effects = awardEffects(t, {
      award: {
        final: true,
        reason: 'Dual source.',
        notAwardedItems: [],
        lines: [
          { supplierId: 'a', optionRef: 'o1', firmOfferId: 'f', sharePct: 60, quantity: 600 },
          { supplierId: 'b', optionRef: 'o1', firmOfferId: 'g', sharePct: 40, quantity: 400 }
        ]
      },
      notAwarded: ['c'],
      supplierName: (id) => `Supplier ${id.toUpperCase()}`,
      lineItem: (l) => ({ key: l.optionRef, label: 'Option 1' }),
      itemLabel: (k) => k
    });
    expect(effects.map((e) => e.key)).toEqual(['item-o1', 'notAwarded', 'reason', 'after']);
    expect(effects[0]?.text).toBe('Option 1 → Supplier A 60% (600), Supplier B 40% (400)');
    expect(effects[1]?.text).toBe('Recorded as not awarded: Supplier C');
    expect(effects[2]?.text).toBe('Reason on record: "Dual source."');
  });

  it('closing states the invitees and responses, and that extending reopens it', () => {
    const effects = closeEffects(t, { invited: 4, responded: 3 });
    expect(effects.map((e) => e.text)).toEqual([
      '4 suppliers invited; 3 sent a response.',
      'Suppliers can no longer send or change a response.',
      'To reopen the event, extend the response deadline.'
    ]);
  });
});

describe('B-05 — the RFQ award waits for the sheet (rfq-014)', () => {
  it('"Award the event" opens the sheet and records nothing; "Back to edit" keeps the split', async () => {
    renderEvent('rfq-014');
    await screen.findByTestId('award-form');
    share(BOTTLE, 'sup-013', '100');
    share(CAP, 'sup-015', '100');
    reasonIfAsked();
    fireEvent.click(screen.getByTestId('award-confirm'));

    const sheet = await screen.findByTestId('award-sheet');
    expect(within(sheet).getByText('Confirm the award')).toBeInTheDocument();
    expect(within(sheet).getByTestId(`award-sheet-item-${BOTTLE}`)).toHaveTextContent('100%');
    expect(within(sheet).getByTestId('award-sheet-notAwarded')).toHaveTextContent(
      'Recorded as not awarded'
    );
    expect(within(sheet).getByTestId('award-sheet-confirm')).toHaveTextContent('Record the award');
    // Nothing dispatched yet.
    expect(awardsOf014()).toHaveLength(0);
    expect(rfqStore.get('rfq-014')?.status).toBe('Closed');

    fireEvent.click(within(sheet).getByTestId('award-sheet-back'));
    expect(screen.queryByTestId('award-sheet')).not.toBeInTheDocument();
    expect(awardsOf014()).toHaveLength(0);
    // The split the buyer typed is kept.
    expect(
      within(screen.getByTestId(`award-input-${BOTTLE}-sup-013`)).getByLabelText(/Share/i)
    ).toHaveValue(100);
  });

  it('"Record the award" dispatches the award the sheet restated', async () => {
    renderEvent('rfq-014');
    await screen.findByTestId('award-form');
    share(BOTTLE, 'sup-013', '100');
    share(CAP, 'sup-015', '100');
    reasonIfAsked();
    fireEvent.click(screen.getByTestId('award-confirm'));
    fireEvent.click(await screen.findByTestId('award-sheet-confirm'));
    await waitFor(() => expect(rfqStore.get('rfq-014')?.status).toBe('Awarded'));
    expect(awardsOf014()).toHaveLength(1);
  });
});

describe('B-05 — cancelling an award is a sheet too', () => {
  it('names the suppliers, keeps the record, and waits for a reason', async () => {
    renderEvent('rfq-024');
    const recorded = await screen.findByTestId('award-recorded');
    const cancel = within(recorded).getAllByTestId(/^award-cancel-aw-/)[0];
    const id = /** @type {HTMLElement} */ (cancel).dataset.testid?.replace('award-cancel-', '');
    fireEvent.click(/** @type {HTMLElement} */ (cancel));
    const sheet = screen.getByTestId(`award-cancel-form-${id}`);
    expect(within(sheet).getByText('Confirm cancelling the award')).toBeInTheDocument();
    expect(within(sheet).getByTestId(`award-cancel-form-${id}-kept`)).toHaveTextContent(
      'marked Cancelled'
    );
    expect(within(sheet).getByTestId(`award-cancel-form-${id}-who`)).toBeInTheDocument();
    expect(screen.getByTestId(`award-cancel-confirm-${id}`)).toBeDisabled();
    fireEvent.change(within(sheet).getByRole('textbox'), { target: { value: 'Wrong break.' } });
    expect(screen.getByTestId(`award-cancel-confirm-${id}`)).toBeEnabled();
    fireEvent.click(screen.getByTestId(`award-cancel-form-${id}-back`));
    expect(screen.queryByTestId(`award-cancel-form-${id}`)).not.toBeInTheDocument();
  });
});

describe('B-05 — closing an RFI or RFP waits for the sheet', () => {
  it('RFI: "Close the event" opens the sheet; Back leaves it Open; the sheet closes it', async () => {
    renderWithProviders(<BuyerRfxRoutes />, { identity: BUYER_SEAT, route: '/buyer/rfi' });
    fireEvent.click(await screen.findByTestId('rfi-open-rfi-001'));
    fireEvent.click(await screen.findByTestId('rfi-close-rfi-001'));
    const sheet = await screen.findByTestId('rfi-close-sheet-rfi-001');
    expect(within(sheet).getByText('Confirm closing the event')).toBeInTheDocument();
    expect(within(sheet).getByTestId('rfi-close-sheet-rfi-001-who')).toHaveTextContent(
      /suppliers invited/
    );
    expect(rfiEventStore.get('rfi-001')?.status).toBe('Open');
    fireEvent.click(within(sheet).getByTestId('rfi-close-sheet-rfi-001-back'));
    expect(screen.queryByTestId('rfi-close-sheet-rfi-001')).not.toBeInTheDocument();
    expect(rfiEventStore.get('rfi-001')?.status).toBe('Open');

    fireEvent.click(screen.getByTestId('rfi-close-rfi-001'));
    fireEvent.click(await screen.findByTestId('rfi-close-confirm-rfi-001'));
    await waitFor(() => expect(rfiEventStore.get('rfi-001')?.status).toBe('Closed'));
  });

  it('RFP: the close is dispatched only from the sheet', async () => {
    renderWithProviders(<BuyerRfxRoutes />, { identity: BUYER_SEAT, route: '/buyer/rfp' });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-001'));
    fireEvent.click(await screen.findByTestId('rfp-close-rfp-001'));
    expect(await screen.findByTestId('rfp-close-sheet-rfp-001')).toBeInTheDocument();
    expect(rfpEventStore.get('rfp-001')?.status).toBe('Open');
    fireEvent.click(screen.getByTestId('rfp-close-confirm-rfp-001'));
    await waitFor(() => expect(rfpEventStore.get('rfp-001')?.status).toBe('Closed'));
  });
});
