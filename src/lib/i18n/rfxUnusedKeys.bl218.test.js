// BL-218 — the i18n keys the RFx build left with no reader are removed, in
// both languages. "No reader" was derived before deleting: no literal use of
// the key anywhere in `src/` outside its definition, and no dynamic
// construction of its prefix (template string or prefix + variable).
import { describe, expect, it } from 'vitest';
import { rfxEn, rfxId } from './rfx';
import { rfxAuthoringEn, rfxAuthoringId } from './rfxAuthoring';
import { sourcingEn, sourcingId } from './sourcing';

const REMOVED = [
  'rfx.rfi.missing',
  'rfx.cmp.refused',
  'rfxa.answer.fixInvalid',
  'rfxa.blocker.terms',
  'rfxa.blocker.termValues',
  'rfxa.blocker.comments',
  'rfxa.blocker.questions',
  'rfxa.blocker.answers',
  'sourcing.cmp.title.one',
  'sourcing.cmp.title.other',
  'sourcing.cmp.empty',
  'sourcing.cmp.criterion',
  'sourcing.cmp.topRanked',
  'sourcing.cmp.row.unitPrice',
  'sourcing.cmp.row.totalPrice',
  'sourcing.cmp.row.leadTime',
  'sourcing.cmp.row.moq',
  'sourcing.cmp.row.paymentTerms',
  'sourcing.cmp.row.compliance',
  'sourcing.cmp.row.priceScore',
  'sourcing.cmp.row.leadTimeScore',
  'sourcing.cmp.row.reliability',
  'sourcing.cmp.row.composite',
  'sourcing.cmp.leadTimeDays_one',
  'sourcing.cmp.leadTimeDays_other'
];

const EN = { ...rfxEn, ...rfxAuthoringEn, ...sourcingEn };
const ID = { ...rfxId, ...rfxAuthoringId, ...sourcingId };

describe('BL-218 — unused RFx keys are gone, EN and ID in step', () => {
  it.each(REMOVED)('%s is in neither language', (key) => {
    expect(EN).not.toHaveProperty([key]);
    expect(ID).not.toHaveProperty([key]);
  });

  it('KNOWN-GOOD — the sibling keys the event page still reads stay, in both languages', () => {
    for (const key of ['sourcing.cmp.row.status', 'sourcing.cmp.moveToReview', 'rfx.cmp.round']) {
      expect(EN).toHaveProperty([key]);
      expect(ID).toHaveProperty([key]);
    }
  });
});
