// ────────────────────────────────────────────────────────────────────────────
// Shared RFx display helpers — the pieces every RFx surface renders the same
// way, kept in one module so the five pages cannot drift from each other.
//
// Nothing here decides a rule. The rules live in `transitions/rfxRules`; this is
// how their answers are drawn.
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { formatDate } from '../../lib/format';
import { sdcClock } from '../../services/sdc/clock';
import { isClosingSoon, isPastDeadline } from '../../services/transitions/rfxRules';
import type { InviteeResponseState } from '../../services/sourcing/views';

/** The RFx lane's "now" — the same simulated clock the read model uses. */
export const rfxNow = (): string => sdcClock.now();

/**
 * REQ-E03-01 AC-02 — a supplier's OTIF, or "No history".
 *
 * ⚠️ **ONE COMPONENT, EVERY SITE.** The rule is not "show a dash when it is
 * missing" — it is that a supplier with nothing measured must never be rendered
 * as 0%, and a per-page `?? 0` is exactly how that happens. A component takes
 * the decision away from the page.
 */
export const OtifOrNoHistory: React.FC<{ otif: number | null | undefined; testId?: string }> = ({
  otif,
  testId,
}) => {
  const { t } = useTranslation();
  if (otif === null || otif === undefined) {
    return (
      <span className="text-text-tertiary text-sm" data-testid={testId}>
        {t('rfx.noHistory')}
      </span>
    );
  }
  return (
    <span data-testid={testId}>
      <Data>{otif}%</Data>
    </span>
  );
};

/** A deadline with its derived state — overdue, closing soon, or neither. */
export const DeadlinePill: React.FC<{ deadline: string; done?: boolean; testId?: string }> = ({
  deadline,
  done = false,
  testId,
}) => {
  const { t } = useTranslation();
  const now = rfxNow();
  if (!done && isPastDeadline(deadline, now)) {
    return (
      <span data-testid={testId}>
        <StatusPill variant="danger">
          {t('rfx.overdue')} <Data>{formatDate(deadline)}</Data>
        </StatusPill>
      </span>
    );
  }
  if (!done && isClosingSoon(deadline, now)) {
    return (
      <span data-testid={testId}>
        <StatusPill variant="warning">
          {t('rfx.dueSoon')} <Data>{formatDate(deadline)}</Data>
        </StatusPill>
      </span>
    );
  }
  return (
    <span className="text-sm text-text-secondary" data-testid={testId}>
      <Data>{formatDate(deadline)}</Data>
    </span>
  );
};

const RESPONSE_VARIANT: Record<InviteeResponseState, 'success' | 'info' | 'neutral'> = {
  submitted: 'success',
  draft: 'info',
  notStarted: 'neutral',
};

/** What an invitee has done with its invitation. */
export const ResponseStatePill: React.FC<{ state: InviteeResponseState }> = ({ state }) => {
  const { t } = useTranslation();
  return <StatusPill variant={RESPONSE_VARIANT[state]}>{t(`rfx.response.${state}`)}</StatusPill>;
};

/** A plain empty row spanning a table. */
export const EmptyRow: React.FC<{ colSpan: number; children: React.ReactNode; testId?: string }> = ({
  colSpan,
  children,
  testId,
}) => (
  <tr>
    <td colSpan={colSpan} className="text-center text-sm text-text-tertiary py-10" data-testid={testId}>
      {children}
    </td>
  </tr>
);

/** A number the reader should read as money, in the event's own currency. */
export const money = (value: number, currency: string): string =>
  `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/** A plain quantity. */
export const qty = (value: number): string => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
