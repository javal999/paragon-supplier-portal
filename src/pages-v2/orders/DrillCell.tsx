import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { EmptyContract } from './orderSummaryDrill';

// ─────────────────────────────────────────────────────────────────────────────
// THE TWO KINDS OF SUMMARY CELL — REQ-E07-03 BR-02 and BR-03.
//
// A cell with a record behind it is a link. A cell with nothing behind it is
// NOT a link: it is a statement of the empty condition, with the reason on hover
// and to assistive technology.
//
// ⚠️ **A `<span>`, NOT A DISABLED `<button>` OR AN `<a>` WITHOUT `href`, AND
// AC-05 IS WHY.** "A cell with nothing behind it cannot be selected by mouse or
// keyboard." A disabled button is still in the accessibility tree as a control
// the user is being refused; an anchor with no `href` is not focusable but still
// announces as a link in some readers. A span with text carries no affordance to
// withdraw. The reason rides along twice — `title` for the pointer, visually
// hidden text for the reader — because `title` alone reaches neither a keyboard
// user nor a screen reader reliably.
// ─────────────────────────────────────────────────────────────────────────────

const LINK_CLASS =
  'text-action hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded';

export const DrillLink: React.FC<{
  to: string;
  /** The accessible name — the PO and what this cell is, never just a number. */
  label: string;
  children: React.ReactNode;
  /** Records the summary's scroll position before leaving (BR-04). */
  onNavigate?: () => void;
  className?: string;
  testId?: string;
}> = ({ to, label, children, onNavigate, className = '', testId }) => (
  <Link
    to={to}
    aria-label={label}
    onClick={onNavigate}
    data-testid={testId}
    data-drill="link"
    className={`${LINK_CLASS} ${className}`.trim()}
  >
    {children}
  </Link>
);

export const EmptyCell: React.FC<{
  contract: EmptyContract;
  testId?: string;
}> = ({ contract, testId }) => {
  const { t } = useTranslation();
  const reason = t(contract.reasonKey);
  return (
    <span
      className="text-xs text-text-tertiary"
      title={reason}
      data-testid={testId}
      data-drill="empty"
    >
      {t(contract.labelKey)}
      <span className="sr-only"> — {reason}</span>
    </span>
  );
};
