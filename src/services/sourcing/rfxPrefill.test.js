// ────────────────────────────────────────────────────────────────────────────
// REQ-E03-03 BR-02 / AC-02 — the RFI pre-fills the RFQ, and only from answers
// the supplier actually SENT.
//
// The draft-invisibility rule (REQ-E03-02 edge case) is a read rule, and this is
// the one place it could be defeated by a WRITE path instead: pre-filling from a
// draft would put a supplier's unsent answers onto a document PTI then sends to
// everybody. Probed both ways.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { prefillRfqFromRfi } from './rfxPrefill';
import { RFI_EVENT_SEED, RFI_RESPONSE_SEED } from '../data/mock/fixtures/rfxHub';

const rfi = RFI_EVENT_SEED[0];
const responses = RFI_RESPONSE_SEED;

describe('REQ-E03-03 AC-02 — an RFQ created from an RFI arrives pre-filled', () => {
  it('CONTROL — the fixture holds two SUBMITTED responses and one DRAFT', () => {
    const forEvent = responses.filter((r) => r.rfiId === rfi.id);
    expect(forEvent.filter((r) => r.status === 'Submitted')).toHaveLength(2);
    expect(forEvent.filter((r) => r.status === 'Draft')).toHaveLength(1);
  });

  it('carries the invitees that ANSWERED, and the title and category of the event', () => {
    const draft = prefillRfqFromRfi(rfi, responses);
    expect(draft.title).toBe(rfi.title);
    expect(draft.materialCategory).toBe(rfi.materialCategory);
    expect(draft.sourceRfiId).toBe(rfi.id);
    expect([...draft.invitedSupplierIds].sort()).toEqual(['sup-007', 'sup-008']);
  });

  it('⚠️ A DRAFT ANSWER NEVER REACHES THE NEW EVENT — not as an invitee, not as an item', () => {
    const draft = prefillRfqFromRfi(rfi, responses);
    expect(draft.invitedSupplierIds).not.toContain('sup-013');
    // sup-013's draft names no product, so nothing of it could have leaked —
    // but the assertion is on the SUPPLIER, which is the fact that would.
    expect(draft.lineItems.every((li) => li.description.length > 0)).toBe(true);
  });

  it('pre-fills ONE item per distinct product, with its specification and minimum', () => {
    const draft = prefillRfqFromRfi(rfi, responses);
    expect(draft.lineItems.map((li) => li.description)).toEqual([
      'PET bottle 100ml airless pump',
      'Folding carton 12s shipper'
    ]);
    expect(draft.lineItems[0].specification).toMatch(/airless pump/);
    expect(draft.lineItems[0].quantity).toBe(50_000);
    expect(draft.lineItems.map((li) => li.lineNo)).toEqual([1, 2]);
  });

  it('two suppliers offering the SAME product make ONE item, not two', () => {
    const sameProduct = responses
      .filter((r) => r.status === 'Submitted')
      .map((r) => ({
        ...r,
        answers: r.answers.map((a) =>
          a.questionId === 'd-product' ? { ...a, value: 'PET bottle 100ml airless pump' } : a
        )
      }));
    const draft = prefillRfqFromRfi(rfi, sameProduct);
    expect(draft.lineItems).toHaveLength(1);
    // Both suppliers are still invited — it is the ITEM that merges, not them.
    expect([...draft.invitedSupplierIds].sort()).toEqual(['sup-007', 'sup-008']);
  });

  it('the buyer can drop an invitee before sending (REQ-E03-03 edge case)', () => {
    const draft = prefillRfqFromRfi(rfi, responses, ['sup-007']);
    expect(draft.invitedSupplierIds).toEqual(['sup-007']);
    expect(draft.lineItems.map((li) => li.description)).toEqual(['PET bottle 100ml airless pump']);
  });

  it('the placeholder item code is the RFI’s own number, never an invented master code', () => {
    const draft = prefillRfqFromRfi(rfi, responses);
    // A code minted from a supplier's prose would be a fabricated master key on
    // a sourcing document; the buyer replaces this with a real one.
    expect(draft.lineItems.map((li) => li.materialCode)).toEqual([
      `${rfi.eventNumber}-1`,
      `${rfi.eventNumber}-2`
    ]);
  });

  it('an RFI nobody answered pre-fills an EMPTY draft, not a fabricated one', () => {
    const draft = prefillRfqFromRfi(rfi, []);
    expect(draft.invitedSupplierIds).toEqual([]);
    expect(draft.lineItems).toEqual([]);
    expect(draft.title).toBe(rfi.title);
  });
});
