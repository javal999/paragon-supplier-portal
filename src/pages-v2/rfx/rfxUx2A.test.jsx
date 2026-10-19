// ─────────────────────────────────────────────────────────────────────────────
// RFx UX 2A — the buyer RFI and RFP pages (B-08, B-09, B-10).
//
// B-08 · the list row's button reads "Open" (it read "Answer", the supplier's
//        verb, and "Close" when expanded); "Compare proposals" only once a
//        proposal exists.
// B-09 · the detail is its own page (`/buyer/rfi/:rfiId`, `/buyer/rfp/:rfpId`,
//        owner ruling Q2 2026-10-19): header with status and days left, a stage
//        bar, a "Jump to" nav with counts; the old `?open=` link redirects.
// B-10 · one actions row; "Save as a template" is a menu item, not a prefilled
//        input on every detail; the live invitee table reads "Invited suppliers".
// B-11 is pinned in `RfiCreate.test.jsx` (the wizard's own helpers live there).
// ─────────────────────────────────────────────────────────────────────────────

import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import BuyerRfxRoutes from '@test/buyerRfxRoutes';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { rfiStageOf, rfpStageOf } from './rfxEventStage';

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

/** @param {string} route */
const at = (route) => renderWithProviders(<BuyerRfxRoutes />, { identity: BUYER_SEAT, route });

describe('B-08 — the list rows', () => {
  it('the RFI row reads "Open", never "Answer" or "Close"', async () => {
    at('/buyer/rfi');
    const open = await screen.findByTestId('rfi-open-rfi-001');
    expect(open).toHaveTextContent(/^Open$/);
    const row = screen.getByTestId('rfi-row-rfi-001');
    expect(within(row).queryByRole('button', { name: 'Answer' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('"Compare proposals" shows on an RFP with a proposal and not on one with none', async () => {
    at('/buyer/rfp');
    // PASSES — rfp-001 holds proposals.
    expect(await screen.findByTestId('rfp-compare-rfp-001')).toHaveTextContent('Compare proposals');
    // REFUSED — ICY (rfp-003) has 0 proposals: only "Open".
    expect(screen.queryByTestId('rfp-compare-rfp-003')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfp-open-rfp-003')).toHaveTextContent(/^Open$/);
  });
});

describe('B-09 — the RFI and RFP details are their own pages', () => {
  it('a row\'s "Open" goes to /buyer/rfi/:id: header, days left, stage bar, nav with counts', async () => {
    at('/buyer/rfi');
    fireEvent.click(await screen.findByTestId('rfi-open-rfi-001'));
    await screen.findByTestId('rfi-detail-rfi-001');
    // The list is gone: the detail is not under it any more.
    expect(screen.queryByTestId('rfi-row-rfi-001')).not.toBeInTheDocument();
    expect(screen.getByTestId('rfi-event-status')).toHaveTextContent('Open');
    expect(screen.getByTestId('rfi-event-days-left')).toHaveTextContent(/days? left|passed/);
    const stage = screen.getByTestId('rfi-event-stage');
    expect(within(stage).getByTestId('rfi-event-stage-sent')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('rfi-event-stage-next')).toHaveTextContent('Next:');
    const nav = screen.getByTestId('event-nav');
    expect(within(nav).getByTestId('event-nav-rfi-event-invitees')).toHaveTextContent(
      'Invited suppliers'
    );
    expect(within(nav).getByTestId('event-nav-rfi-event-answers')).toHaveTextContent(/Answers\d+/);
    // And back to the list.
    fireEvent.click(screen.getByTestId('rfi-event-back'));
    expect(await screen.findByTestId('rfi-row-rfi-001')).toBeInTheDocument();
  });

  it('the old ?open= deep link lands on the page; an unknown id is a 404, not an empty page', async () => {
    const first = at('/buyer/rfp?open=rfp-002');
    expect(await screen.findByTestId('rfp-detail-rfp-002')).toBeInTheDocument();
    expect(screen.getByTestId('rfp-event-stage')).toBeInTheDocument();
    first.unmount();
    at('/buyer/rfi/rfi-404');
    expect((await screen.findAllByText(/not found|404/i)).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('rfi-detail-rfi-404')).not.toBeInTheDocument();
  });

  it('"Compare proposals" lands on the RFP page', async () => {
    at('/buyer/rfp');
    fireEvent.click(await screen.findByTestId('rfp-compare-rfp-001'));
    expect(await screen.findByTestId('rfp-detail-rfp-001')).toBeInTheDocument();
    expect(screen.getByTestId('event-nav-rfp-event-comparison')).toBeInTheDocument();
  });

  it('the stage derivation names the step and the next act, by status', () => {
    const base = { invited: 3, responded: 1, deadlinePassed: false };
    expect(rfiStageOf({ ...base, status: 'Draft' })).toEqual({ current: 0, next: 'send' });
    expect(rfiStageOf({ ...base, status: 'Open' })).toEqual({ current: 1, next: 'answers' });
    expect(rfiStageOf({ ...base, status: 'Open', deadlinePassed: true })).toEqual({
      current: 2,
      next: 'close'
    });
    expect(rfiStageOf({ ...base, status: 'Closed' })).toEqual({ current: 3, next: 'carry' });
    expect(rfiStageOf({ ...base, status: 'Cancelled' })).toEqual({
      current: -1,
      next: 'cancelled'
    });
    expect(rfpStageOf({ ...base, status: 'Closed', priced: true })).toEqual({
      current: 3,
      next: 'award'
    });
    // An RFP with no pricing cannot be awarded: no award act is named.
    expect(rfpStageOf({ ...base, status: 'Closed', priced: false })).toEqual({
      current: 4,
      next: 'none'
    });
    expect(rfpStageOf({ ...base, status: 'Awarded', priced: true })).toEqual({
      current: 5,
      next: 'none'
    });
  });
});

describe('B-10 — one actions row; the template is a menu item', () => {
  it('RFI: Close, Extend, Create RFQ and Create RFP sit in one row; the template input waits for the menu', async () => {
    at('/buyer/rfi/rfi-001');
    const row = await screen.findByTestId('rfi-actions-rfi-001');
    for (const id of [
      'rfi-close-rfi-001',
      'rfi-extend-rfi-001',
      'rfi-to-rfq-rfi-001',
      'rfi-to-rfp-rfi-001',
      'rfi-more-rfi-001'
    ])
      expect(within(row).getByTestId(id)).toBeInTheDocument();
    // Not on every detail any more…
    expect(screen.queryByTestId('rfi-rfi-001-save-template')).not.toBeInTheDocument();
    // …only once chosen from "More actions".
    fireEvent.click(within(row).getByTestId('rfi-more-rfi-001'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Save as a template' }));
    expect(screen.getByTestId('rfi-rfi-001-save-template')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('the live invitee tables read "Invited suppliers", not "Invite suppliers"', async () => {
    const first = at('/buyer/rfi/rfi-001');
    expect(await screen.findByTestId('rfi-invitees-title-rfi-001')).toHaveTextContent(
      /^Invited suppliers$/
    );
    first.unmount();
    at('/buyer/rfp/rfp-001');
    expect(await screen.findByTestId('rfp-invitees-title-rfp-001')).toHaveTextContent(
      /^Invited suppliers$/
    );
    const row = screen.getByTestId('rfp-actions-rfp-001');
    expect(within(row).getByTestId('rfp-close-rfp-001')).toBeInTheDocument();
    expect(within(row).getByTestId('rfp-extend-btn-rfp-001')).toBeInTheDocument();
    expect(screen.queryByTestId('rfp-rfp-001-save-template')).not.toBeInTheDocument();
  });
});
