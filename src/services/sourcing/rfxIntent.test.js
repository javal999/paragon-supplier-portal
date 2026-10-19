// BL-132 — the pure intent rule, for the three refusals the dispatcher stops
// before the policy can speak (an unknown event or an uninvited supplier is
// refused at SCOPE; a withdraw from Declined is an illegal transition). Each is
// pinned here both ways; the reachable ones are pinned through the dispatcher in
// `rfxIntentCommand.test.js`.
import { describe, expect, it } from 'vitest';
import { RFX_DECLINE_REASONS, rfxDeclinedRefusal, rfxIntentRefusal } from './rfxIntent';
import { RFQ_DECLINE_REASONS } from './rfqModel';

const NOW = '2026-10-01T03:00:00.000Z';
const EVENT = {
  eventNumber: 'RFI-2026-099',
  status: 'Open',
  responseDeadline: '2026-10-10',
  invitees: [{ supplierId: 'sup-007' }]
};
/** @param {Partial<import('./rfxIntent').RfxIntentInput>} over */
const input = (over) => ({
  event: EVENT,
  supplierId: 'sup-007',
  act: /** @type {const} */ ('respond'),
  submitted: false,
  nowIso: NOW,
  ...over
});

describe('rfxIntentRefusal — the refusals only the pure rule can reach', () => {
  it('EVENT_NOT_FOUND — no event; the known event passes', () => {
    expect(rfxIntentRefusal(input({ event: undefined }))).toMatch(/^EVENT_NOT_FOUND/);
    expect(rfxIntentRefusal(input({}))).toBeNull();
  });

  it('NOT_INVITED — a stranger; the invitee passes', () => {
    expect(rfxIntentRefusal(input({ supplierId: 'sup-002' }))).toMatch(/^NOT_INVITED/);
    expect(rfxIntentRefusal(input({ supplierId: 'sup-007' }))).toBeNull();
  });

  it('NOT_RESPONDING — a withdraw needs a stated "respond"; with one it passes', () => {
    const decline = { reason: 'other', text: 'Changed plans' };
    expect(
      rfxIntentRefusal(input({ act: 'withdraw', existing: { intent: 'decline' }, ...decline }))
    ).toMatch(/^NOT_RESPONDING/);
    expect(rfxIntentRefusal(input({ act: 'withdraw', existing: undefined, ...decline }))).toMatch(
      /^NOT_RESPONDING/
    );
    expect(
      rfxIntentRefusal(input({ act: 'withdraw', existing: { intent: 'respond' }, ...decline }))
    ).toBeNull();
  });
});

describe("rfxDeclinedRefusal — the response verbs' guard, read by the page too", () => {
  it('names the supplier and the event on a decline; null on respond or nothing', () => {
    expect(rfxDeclinedRefusal({ intent: 'decline' }, 'sup-007', 'RFI-2026-099')).toBe(
      'INTENT_DECLINED: sup-007 declined RFI-2026-099'
    );
    expect(rfxDeclinedRefusal({ intent: 'respond' }, 'sup-007', 'RFI-2026-099')).toBeNull();
    expect(rfxDeclinedRefusal(undefined, 'sup-007', 'RFI-2026-099')).toBeNull();
  });
});

it('the RFI and RFP decline reasons are the RFQ list, one vocabulary for the buyer', () => {
  expect(RFX_DECLINE_REASONS).toBe(RFQ_DECLINE_REASONS);
  expect(RFX_DECLINE_REASONS).toContain('notOurProduct');
});
