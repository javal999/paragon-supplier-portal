import { describe, it, expect } from 'vitest';
import { targetStatus, TARGET_STATUS } from './chartPalette';

// DP2-TARGET-01 guard: the ONE target-status system. Locks the meeting/near/
// missing thresholds and the state → colour map so the seven scattered target-
// bar systems can't creep back. `near` must be the DP2-WARN-01 amber split
// (bright fill #D97706 for the bar, dark #8A5606 for text on light).
describe('DP2-TARGET-01 — targetStatus thresholds', () => {
  it('at/above target is meeting', () => {
    expect(targetStatus(95, 95)).toBe('meeting');
    expect(targetStatus(100, 90)).toBe('meeting');
  });

  it('within the near band (default 10) below target is near', () => {
    expect(targetStatus(89, 90)).toBe('near');
    expect(targetStatus(80, 90)).toBe('near');
  });

  it('beyond the near band is missing', () => {
    expect(targetStatus(79, 90)).toBe('missing');
    expect(targetStatus(40, 75)).toBe('missing');
  });

  it('honours a custom near band', () => {
    expect(targetStatus(85, 95, 10)).toBe('near');
    expect(targetStatus(84, 95, 10)).toBe('missing');
  });
});

// Paradise stage 2 (paradise-migration-plan.md): the map now points at Paradise
// feedback tokens. Paradise has one warning ink, so `near` uses it for both the
// fill and the text; the DP2-WARN-01 bright/dark split has no Paradise token.
describe('DP2-TARGET-01 — state → colour map', () => {
  it('near is the Paradise warning token (fill and text)', () => {
    expect(TARGET_STATUS.near.fill).toBe('var(--pds-color-feedback-warning)');
    expect(TARGET_STATUS.near.text).toBe('var(--pds-color-feedback-warning)');
  });

  it('meeting is the Paradise success token, missing is the Paradise danger token', () => {
    expect(TARGET_STATUS.meeting.fill).toBe('var(--pds-color-feedback-success)');
    expect(TARGET_STATUS.missing.fill).toBe('var(--pds-color-feedback-danger)');
  });
});
