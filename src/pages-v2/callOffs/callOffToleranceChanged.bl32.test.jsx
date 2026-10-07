// BL-32 — a call-off confirmation's approval is decided when the supplier sends
// it; the tolerance findings are re-read under the values in force. After an
// administrator changes CR-05 the two can disagree. The tag must show the
// RECORDED verdict and say what today's values would decide — never
// "Awaiting Approval" beside "accepted" with no explanation.
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { ToleranceTags, toleranceDrift } from './callOffDisplay';
/** @import { ToleranceCheck } from '@services/transitions/callOffRules' */

const overWithin = /** @type {ToleranceCheck} */ (
  /** @type {unknown} */ ({
    findings: [{ kind: 'overWithin', needsApproval: false, qty: 408, pct: 5.1 }]
  })
);
const overBeyond = /** @type {ToleranceCheck} */ (
  /** @type {unknown} */ ({
    findings: [{ kind: 'overBeyond', needsApproval: true, qty: 408, pct: 5.1 }]
  })
);

describe('BL-32 · call-off tags keep the recorded verdict when CR-05 changes', () => {
  it('toleranceDrift: agreement is null; both disagreements are named', () => {
    expect(toleranceDrift(overBeyond, 'awaiting')).toBeNull();
    expect(toleranceDrift(overWithin, 'auto')).toBeNull();
    expect(toleranceDrift(overWithin, 'awaiting')).toBe('nowAccepted');
    expect(toleranceDrift(overBeyond, 'auto')).toBe('nowNeedsApproval');
  });

  it('awaiting approval, now within tolerance: tag says "needs approval" and the note explains', () => {
    renderWithProviders(
      <ToleranceTags check={overWithin} uom="PCS" approval="awaiting" testId="t" />,
      { identity: BUYER }
    );
    expect(screen.getByTestId('t').textContent).toMatch(/needs approval/);
    expect(screen.getByTestId('t').textContent).not.toMatch(/, accepted/);
    expect(screen.getByTestId('t-changed').textContent).toMatch(/would be accepted/);
  });

  it('accepted automatically, now beyond tolerance: tag says "accepted" and the note explains', () => {
    renderWithProviders(<ToleranceTags check={overBeyond} uom="PCS" approval="auto" testId="t" />, {
      identity: BUYER
    });
    expect(screen.getByTestId('t').textContent).toMatch(/, accepted/);
    expect(screen.getByTestId('t-changed').textContent).toMatch(/would need approval/);
  });

  it('when record and rule agree, no note is shown (known-good control)', () => {
    renderWithProviders(
      <ToleranceTags check={overBeyond} uom="PCS" approval="awaiting" testId="t" />,
      { identity: BUYER }
    );
    expect(screen.getByTestId('t').textContent).toMatch(/needs approval/);
    expect(screen.queryByTestId('t-changed')).toBeNull();
  });
});
