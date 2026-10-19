// Owner ruling Q1 (2026-10-19, RFx UX B-07) — once an RFP option is in a
// firm-offer round, the RFQ path closes for it. The pure rule the RFQ create
// policy and the RFP page's option picker share (RFX-R2).
import { describe, expect, it } from 'vitest';
import { rfpRoundedOptionRefs, rfqOptionInRoundRefusal } from './rfpAward';

const ROUNDS = [
  { rfpId: 'rfp-002', roundNumber: 2, optionRefs: ['opt-full-set', 'sup-007:sup-opt-1'] },
  { rfpId: 'rfp-002', roundNumber: 1, optionRefs: ['opt-full-set'] },
  { rfpId: 'rfp-003', roundNumber: 1, optionRefs: ['opt-pump-cap'] }
];

describe('rfpRoundedOptionRefs — the options a round of THIS RFP names, with the first round', () => {
  it('maps each named ref to the first round that named it, and ignores other RFPs', () => {
    expect([...rfpRoundedOptionRefs(ROUNDS, 'rfp-002')]).toEqual([
      ['opt-full-set', 1],
      ['sup-007:sup-opt-1', 2]
    ]);
  });
});

describe('rfqOptionInRoundRefusal — RFQ_OPTION_IN_FIRM_ROUND', () => {
  const rounded = rfpRoundedOptionRefs(ROUNDS, 'rfp-002');
  const options = [{ ref: 'opt-full-set', title: 'Full set: bottle, pump and cap' }];

  it('KNOWN-BAD — an option in a round is refused, naming the option, the round and the RFP', () => {
    expect(
      rfqOptionInRoundRefusal(['opt-pump-cap', 'opt-full-set'], rounded, 'RFP-2026-002', options)
    ).toBe(
      'RFQ_OPTION_IN_FIRM_ROUND: option "Full set: bottle, pump and cap" is in firm-offer round 1 on RFP-2026-002; its prices are firmed up there, not in an RFQ'
    );
  });

  it('KNOWN-GOOD — an option no round of this RFP names passes (a round on another RFP does not count)', () => {
    expect(rfqOptionInRoundRefusal(['opt-pump-cap'], rounded, 'RFP-2026-002', options)).toBeNull();
  });
});
