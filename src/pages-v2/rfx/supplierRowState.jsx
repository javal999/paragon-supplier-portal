/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import { daysUntil } from '@services/data/dayProjection';
import { daysLeftText } from '../SupplierRFQs/utils';
/** @import { RfpAwardView } from '@services/sourcing/views' */

// ─────────────────────────────────────────────────────────────────────────────
// RFx UX S-10 — what a supplier RFI or RFP row says before it is opened: the
// days left to its deadline, the button named for what the supplier can do on
// it, and on an RFP an "Awarded" pill once an award in force names it. The row
// header's action area takes these as separate pieces so the intent and
// decline controls (lane 2D, BL-132) can sit beside them.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'answer' | 'revise' | 'view'} SupplierRowAction */

/**
 * What the row's open button offers. "Answer" while the supplier can still
 * send; "Revise" once sent and the revise window is open (the verb's own
 * window, `responseWindowRefusal`); "View" for everything read-only: sent with
 * the window shut, a closed event, or a seat that does not hold the answer verb.
 * @param {{ submitted: boolean; windowOpen: boolean; closed: boolean; held: boolean }} s
 * @returns {SupplierRowAction}
 */
export const supplierRowAction = ({ submitted, windowOpen, closed, held }) => {
  if (!held || closed) return 'view';
  if (!submitted) return 'answer';
  return windowOpen ? 'revise' : 'view';
};

/**
 * Whether an RFP award in force names this supplier on any line. A withdrawn
 * (Cancelled) award does not count: the supplier was told it is withdrawn.
 * @param {readonly RfpAwardView[]} awards
 * @param {string} supplierId
 * @returns {boolean}
 */
export const rfpAwardedTo = (awards, supplierId) =>
  awards.some((a) => a.status !== 'Cancelled' && a.lines.some((l) => l.supplierId === supplierId));

/**
 * The days-left pill: "5 days left" or "due today" on a row still waiting on
 * the supplier. Nothing once the response is sent or the event is closed, and
 * nothing past the deadline, where the deadline pill already says "Overdue".
 * @type {React.FC<{ deadline: string; nowIso: string; done: boolean; testId: string }>}
 */
export const DaysLeftPill = ({ deadline, nowIso, done, testId }) => {
  const { t } = useTranslation();
  const days = daysUntil(deadline, nowIso);
  if (done || days === null || days < 0) return null;
  return (
    <span data-testid={testId}>
      <StatusPill variant="neutral">{daysLeftText(t, deadline, nowIso)}</StatusPill>
    </span>
  );
};
