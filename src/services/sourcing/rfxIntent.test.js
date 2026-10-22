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
  kind: /** @type {const} */ ('rfi'),
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

describe('RFX-D31 — a shared core, plus the reasons that fit each event type', () => {
  const CORE = ['notOurProduct', 'noCapacity', 'complianceNotMet', 'specUnclear', 'other'];

  it('the three lists, in the order the forms show them', () => {
    expect(RFQ_DECLINE_REASONS).toEqual([
      'notOurProduct',
      'noCapacity',
      'complianceNotMet',
      'leadTimeTooShort',
      'quantityTooSmall',
      'specUnclear',
      'other'
    ]);
    expect(RFX_DECLINE_REASONS.rfi).toEqual([
      'notOurProduct',
      'noCapacity',
      'complianceNotMet',
      'termsNotAcceptable',
      'specUnclear',
      'other'
    ]);
    expect(RFX_DECLINE_REASONS.rfp).toEqual([
      'notOurProduct',
      'noCapacity',
      'complianceNotMet',
      'termsNotAcceptable',
      'commercialTermsNotMet',
      'cannotDevelop',
      'specUnclear',
      'other'
    ]);
    for (const list of [RFQ_DECLINE_REASONS, RFX_DECLINE_REASONS.rfi, RFX_DECLINE_REASONS.rfp])
      expect(list).toEqual(expect.arrayContaining(CORE));
  });

  /** @param {'rfi' | 'rfp'} kind @param {string} reason */
  const decline = (kind, reason) =>
    rfxIntentRefusal(input({ kind, act: 'decline', reason, text: 'Our own words' }));

  it('RFI — termsNotAcceptable passes; an RFP-only or RFQ-only reason is refused', () => {
    expect(decline('rfi', 'termsNotAcceptable')).toBeNull();
    expect(decline('rfi', 'cannotDevelop')).toMatch(/^DECLINE_REASON_UNKNOWN: .* RFI list/);
    expect(decline('rfi', 'leadTimeTooShort')).toMatch(/^DECLINE_REASON_UNKNOWN/);
  });

  it('RFP — cannotDevelop and commercialTermsNotMet pass; an RFQ-only reason is refused', () => {
    expect(decline('rfp', 'cannotDevelop')).toBeNull();
    expect(decline('rfp', 'commercialTermsNotMet')).toBeNull();
    expect(decline('rfp', 'quantityTooSmall')).toMatch(/^DECLINE_REASON_UNKNOWN: .* RFP list/);
  });

  it('the words stay required with every reason', () => {
    expect(
      rfxIntentRefusal(input({ kind: 'rfp', act: 'decline', reason: 'cannotDevelop', text: ' ' }))
    ).toMatch(/^DECLINE_TEXT_MISSING/);
  });
});
