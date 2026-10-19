// ────────────────────────────────────────────────────────────────────────────
// RFx UX 1C (B-01) — the RFQ event page says where the event stands: a stage
// bar (Sent · Quotes in · Round · Award · Raised in SAP · Done) derived from
// state the event already has, a "Next" pill, days left on the response
// window, a sticky "Jump to" nav with counts, and the per-break tables folded
// behind "Show every break". `?section=award` still lands on the award.
// ────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { everyVendorQualified } from '@test/everyVendorQualified';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { resetRfxStores } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { rfxEn, rfxId } from '@lib/i18n/rfx';
import BuyerSourcingEvent from '.';
import { STAGE_STEPS, rfqStageOf } from './utils';

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  everyVendorQualified();
});
// jsdom has no scrollIntoView; the nav specs install a spy and this puts back what was there.
const originalScroll = Element.prototype.scrollIntoView;
afterEach(() => {
  Element.prototype.scrollIntoView = originalScroll;
});

/** @param {string} route */
const renderAt = (route) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: BUYER_SEAT, route }
  );

describe('B-01 — rfqStageOf, from the state the event already has', () => {
  const base = { invited: 4, quoted: 4, rounds: [], inForce: [] };
  it('Open with quotes still out waits for quotes; all quoted is ready to award', () => {
    expect(rfqStageOf({ ...base, status: 'Open', quoted: 3 })).toEqual({
      current: 1,
      next: 'quotes',
      roundSkipped: false
    });
    expect(rfqStageOf({ ...base, status: 'Open' }).next).toBe('award');
  });
  it('an open round is the current step; a Closed event with none skips it', () => {
    expect(rfqStageOf({ ...base, status: 'Closed', rounds: [{ closed: false }] })).toEqual({
      current: 2,
      next: 'round',
      roundSkipped: false
    });
    expect(rfqStageOf({ ...base, status: 'Closed' })).toEqual({
      current: 3,
      next: 'award',
      roundSkipped: true
    });
  });
  it('Awarded waits for SAP until every award with lines is raised there, then it is done', () => {
    const active = { status: 'Active', lines: [1] };
    const raised = { status: 'Raised in SAP', lines: [1] };
    expect(rfqStageOf({ ...base, status: 'Awarded', inForce: [active, raised] }).next).toBe('sap');
    expect(rfqStageOf({ ...base, status: 'Awarded', inForce: [raised] })).toEqual({
      current: STAGE_STEPS.length,
      next: 'none',
      roundSkipped: true
    });
  });
  it('a Cancelled event is on no step', () => {
    expect(rfqStageOf({ ...base, status: 'Cancelled' }).current).toBe(-1);
  });
});

describe('B-01 — the labels, in both languages', () => {
  it('"Stage" / "Tahap", "Next" / "Berikutnya", "Jump to" / "Lompat ke"', () => {
    expect([rfxEn['rfx.stage.label'], rfxId['rfx.stage.label']]).toEqual(['Stage', 'Tahap']);
    expect([rfxEn['rfx.stage.next'], rfxId['rfx.stage.next']]).toEqual(['Next', 'Berikutnya']);
    expect([rfxEn['rfx.stage.jumpTo'], rfxId['rfx.stage.jumpTo']]).toEqual([
      'Jump to',
      'Lompat ke'
    ]);
  });
});

describe('B-01 — the event page (rfq-014: Closed, round 1 open)', () => {
  it('the stage bar marks Round current and the Next pill names closing it', async () => {
    renderAt('/buyer/rfq/rfq-014');
    const stage = await screen.findByTestId('event-stage');
    expect(within(stage).getByTestId('event-stage-sent')).toHaveAttribute('data-state', 'done');
    expect(within(stage).getByTestId('event-stage-round')).toHaveAttribute('data-state', 'current');
    expect(within(stage).getByTestId('event-stage-award')).toHaveAttribute('data-state', 'todo');
    expect(screen.getByTestId('event-next')).toHaveTextContent('Next: Close the round');
    // Closed: no days-left counter on a window that is shut.
    expect(screen.queryByTestId('event-days-left')).not.toBeInTheDocument();
  });

  it('the nav lists the sections with counts and scrolls to the one clicked', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    renderAt('/buyer/rfq/rfq-014');
    const nav = await screen.findByTestId('event-nav');
    expect(within(nav).getByText('Jump to')).toBeInTheDocument();
    expect(within(nav).getByTestId('event-nav-event-invitees')).toHaveTextContent('Invitees4');
    expect(within(nav).getByTestId('event-nav-event-rounds')).toHaveTextContent('Rounds1 open');
    expect(within(nav).getByTestId('event-nav-event-award')).toHaveTextContent('Awardnot yet');
    fireEvent.click(within(nav).getByTestId('event-nav-event-rounds'));
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(document.getElementById('event-rounds'));
  });

  it('?section=award still lands on the award section', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    renderAt('/buyer/rfq/rfq-014?section=award');
    await screen.findByTestId('event-stage');
    expect(scroll.mock.contexts).toContain(document.getElementById('event-award'));
  });
});

describe('B-01 — the per-break tables fold behind the summary (rfq-021, tiered)', () => {
  it('"Show every break" starts folded and holds the per-item comparison', async () => {
    renderAt('/buyer/rfq/rfq-021');
    const fold = await screen.findByTestId('cmp-every-break');
    expect(fold.tagName).toBe('DETAILS');
    expect(fold).not.toHaveAttribute('open');
    expect(within(fold).getByText('Show every break')).toBeInTheDocument();
    expect(within(fold).getByTestId('tiered-comparison')).toBeInTheDocument();
  });
});
