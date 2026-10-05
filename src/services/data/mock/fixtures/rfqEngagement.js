// ────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA — the supplier-response records on Oslo (rfq-021), so the demo
// shows the new capability on the event the rest of the RFx sample is built
// around. The supplier names are the portal's sample suppliers.
//
//   · sup-013 and sup-015 said "I will respond" — they are the two that quoted.
//   · sup-008 DECLINED, with a reason from the list and its own words. The
//     buyer reads both on the RFQ side panel.
//   · sup-007 (the demo supplier persona) has not answered yet, so the whole
//     response path is open to it.
//   · On Redwood 2.0 (rfq-023, confidential) sup-013 has accepted the terms;
//     sup-007 has not, so it reads the RFQ with the spec withheld.
//   · Two clarifications: one PUBLISHED (every invitee reads it, the asker is
//     not named) and one PRIVATE (only sup-013, who asked, reads it).
//
// Dated relative to the declared present, the `rfqSamples.js` precedent.
// ────────────────────────────────────────────────────────────────────────────

import { DECLARED_PRESENT } from '../../fixturePresent';
/** @import { RfqClarification } from '../../../sourcing/rfqModel' */
/** @import { RfqConfidentialityRecord, RfqIntentRecord } from '../../../sourcing/rfqResponse' */

const DAY_MS = 86_400_000;
const P = Date.parse(`${DECLARED_PRESENT}T00:00:00.000Z`);
/**
 * @param {number} offset
 * @returns {string}
 */
const at = (offset, time = '09:00:00') =>
  `${new Date(P + offset * DAY_MS).toISOString().slice(0, 10)}T${time}.000Z`;

/** @type {readonly RfqIntentRecord[]} */
export const RFQ_INTENT_SEED = [
  { id: 'ri-0001', rfqId: 'rfq-021', supplierId: 'sup-015', intent: 'respond', at: at(-4) },
  {
    id: 'ri-0002',
    rfqId: 'rfq-021',
    supplierId: 'sup-013',
    intent: 'respond',
    at: at(-4, '14:30:00')
  },
  {
    id: 'ri-0003',
    rfqId: 'rfq-021',
    supplierId: 'sup-008',
    intent: 'decline',
    reason: 'leadTimeTooShort',
    text: 'Our flexo line is booked until the end of October. We could quote a November run.',
    at: at(-3)
  }
];

/**
 * sup-013 accepted Redwood 2.0's terms; sup-007, the persona, has not yet.
 * @type {readonly RfqConfidentialityRecord[]}
 */
export const RFQ_CONFIDENTIALITY_SEED = [
  { id: 'rca-0001', rfqId: 'rfq-023', supplierId: 'sup-013', acceptedAt: at(-2, '10:00:00') }
];

/** @type {readonly RfqClarification[]} */
export const RFQ_CLARIFICATION_SEED = [
  {
    id: 'rc-0001',
    rfqId: 'rfq-021',
    askedBy: 'sup-015',
    askedAt: at(-4, '10:15:00'),
    question: 'Does one die-cut plate serve all 8 variants, or is a plate needed per variant?',
    answer:
      'One die-cut plate serves all 8 variants, because the shape is the same. Printing plates are per variant.',
    answeredAt: at(-3, '11:00:00'),
    visibility: 'published'
  },
  {
    id: 'rc-0002',
    rfqId: 'rfq-021',
    askedBy: 'sup-013',
    askedAt: at(-2, '08:40:00'),
    question: 'May we offer a paper back label as an alternative to PP clear?',
    answer: 'Yes. Quote it as an alternative offer on item 2, beside your main price.',
    answeredAt: at(-2, '13:05:00'),
    visibility: 'private'
  }
];
