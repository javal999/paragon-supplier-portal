import React from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import type { StatusTone } from '../../lib/statusTone';
import type {
  CallOffDeliveryStatus,
  CallOffView,
  ToleranceCheck,
  ToleranceFinding,
} from '../../services/transitions/callOffRules';
import { useCallOffs, useASNs, useGoodsReceipts } from '../../services/query/hooks';
import { callOffViews } from '../../services/transitions/callOffRules';
import { formatDate } from '../../lib/format';
import type { CallOffConfirmation } from '../../services/data/types';
import { sdcClock } from '../../services/sdc';
import { normalizeQty } from '../../lib/localeNumber';

// ─────────────────────────────────────────────────────────────────────────────
// Call-off status pills and the shared read (REQ-E09-03, REQ-E09-04). Both the
// planner and the supplier page read the same projection, on the same clock
// the call-off commands stamp with, so a deadline and its escalation agree.
// ─────────────────────────────────────────────────────────────────────────────

type ConfirmationStatus = CallOffView['confirmation'];

/** i18n key suffix per confirmation status. */
const CONFIRMATION_KEY: Record<ConfirmationStatus, string> = {
  Draft: 'draft',
  'Awaiting Confirmation': 'awaitingConfirmation',
  Confirmed: 'confirmed',
  'Confirmed with New Date': 'confirmedNewDate',
  'Confirmed with Changes': 'confirmedChanges',
  'Partially Confirmed': 'partiallyConfirmed',
  Rejected: 'rejected',
  Dismissed: 'dismissed',
  'Awaiting Approval': 'awaitingApproval',
  Escalated: 'escalated',
};

const CONFIRMATION_TONE: Record<ConfirmationStatus, StatusTone> = {
  Draft: 'neutral',
  'Awaiting Confirmation': 'neutral',
  Confirmed: 'success',
  'Confirmed with New Date': 'success',
  'Confirmed with Changes': 'success',
  'Partially Confirmed': 'success',
  Rejected: 'danger',
  Dismissed: 'neutral',
  'Awaiting Approval': 'warning',
  Escalated: 'danger',
};

const DELIVERY_TONE: Record<CallOffDeliveryStatus, StatusTone> = {
  notDue: 'neutral',
  dispatched: 'info',
  atRisk: 'warning',
  deliveredOnTime: 'success',
  late: 'danger',
  missed: 'danger',
};

export const ConfirmationPill: React.FC<{ status: ConfirmationStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return <StatusPill variant={CONFIRMATION_TONE[status]}>{t(`co.status.${CONFIRMATION_KEY[status]}`)}</StatusPill>;
};

export const DeliveryPill: React.FC<{ status: CallOffDeliveryStatus | null }> = ({ status }) => {
  const { t } = useTranslation();
  if (!status) return <span className="text-xs text-text-tertiary">{t('co.delivery.none')}</span>;
  return <StatusPill variant={DELIVERY_TONE[status]}>{t(`co.delivery.${status}`)}</StatusPill>;
};

// ── CR-05 · the applied tolerance rule, said out loud (BL-47) ───────────────
//
// The planner and the supplier read the SAME findings the verb decided on, so a
// screen can never explain a rule the dispatcher did not apply. Each finding is
// one sentence: which rule applied, on what figures, and what follows from it.

/** The i18n key per finding — an early date inside the allowance reads differently. */
const findingKey = (f: ToleranceFinding): string =>
  f.kind === 'early' && !f.needsApproval ? 'co.tol.earlyWithin' : `co.tol.${f.kind}`;

const findingParams = (f: ToleranceFinding, uom: string, needDate: string) => ({
  qty: f.qty === undefined ? '' : `${qty(f.qty)} ${uom}`,
  pct: f.pct ?? 0,
  limit: f.limit ?? 0,
  days: f.days ?? 0,
  date: f.date ? formatDate(f.date) : '',
  needDate: formatDate(needDate),
});

/** The rules applied to one confirmation, with their reasons. */
export const ToleranceFindings: React.FC<{
  check: ToleranceCheck;
  uom: string;
  needDate: string;
  testId?: string;
}> = ({ check, uom, needDate, testId }) => {
  const { t } = useTranslation();
  return (
    <div data-testid={testId} className="space-y-1">
      <h4 className="text-label text-text-tertiary uppercase">{t('co.tol.title')}</h4>
      <ul className="text-xs space-y-1">
        {check.findings.map((f, i) => (
          <li key={i} className={f.needsApproval ? 'text-warning-hover' : 'text-text-secondary'}>
            {t(findingKey(f), findingParams(f, uom, needDate))}
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * The same findings as short tags, for a table row. The finding is the rule's;
 * the verdict beside it is the call-off's own: a finding that needs approval
 * reads "approved by PTI" once the planner has approved it, never "needs
 * approval" on an answer that is already accepted.
 */
export const ToleranceTags: React.FC<{
  check: ToleranceCheck;
  uom: string;
  approval: CallOffConfirmation['approval'];
  testId?: string;
}> = ({ check, uom, approval, testId }) => {
  const { t } = useTranslation();
  const tags = check.findings.filter((f) => f.kind !== 'asRequested');
  if (tags.length === 0) return null;
  // BL-32 — the verdict is the one RECORDED when the supplier sent the answer.
  // The findings are re-read under the values in force, so after an
  // administrator changes CR-05 they can disagree with the record; the record
  // wins on the tag and a note says what today's values would decide.
  const drift = toleranceDrift(check, approval);
  const verdictOf = (f: ToleranceFinding) => {
    if (approval === 'approved') return f.needsApproval ? 'approved' : 'accepted';
    if (approval === 'auto') return 'accepted';
    return f.needsApproval || (drift === 'nowAccepted' && f.kind !== 'short') ? 'needsApproval' : 'accepted';
  };
  return (
    <div data-testid={testId} className="mt-1 space-y-0.5">
      {tags.map((f, i) => (
        <div
          key={i}
          className={`text-[11px] ${verdictOf(f) === 'needsApproval' ? 'text-warning-hover' : 'text-text-tertiary'}`}
        >
          {t('co.tol.tagLine', {
            finding: t(`co.tol.tag.${f.kind}`, {
              qty: f.qty === undefined ? '' : `${qty(f.qty)} ${uom}`,
              pct: f.pct ?? 0,
            }),
            verdict: t(`co.tol.verdict.${verdictOf(f)}`),
          })}
        </div>
      ))}
      {drift && (
        <div className="text-[11px] text-text-tertiary" data-testid={testId ? `${testId}-changed` : undefined}>
          {t(`co.tol.changedSince.${drift}`)}
        </div>
      )}
    </div>
  );
};

/**
 * BL-32 — whether today's CR-05 values would decide this answer differently
 * from what was recorded when it was sent. `null` when they agree.
 */
export function toleranceDrift(
  check: ToleranceCheck,
  approval: CallOffConfirmation['approval'],
): 'nowAccepted' | 'nowNeedsApproval' | null {
  const needsNow = check.findings.some((f) => f.needsApproval);
  if (approval === 'awaiting' && !needsNow) return 'nowAccepted';
  if (approval === 'auto' && needsNow) return 'nowNeedsApproval';
  return null;
}

/** The call-off projection for the current scope, with its loading state. */
export function useCallOffViews() {
  const callOffs = useCallOffs();
  const asns = useASNs();
  const receipts = useGoodsReceipts();
  const nowIso = sdcClock.now();
  const views = React.useMemo(
    () =>
      callOffViews(callOffs.data?.items ?? [], asns.data?.items ?? [], receipts.data?.items ?? [], nowIso),
    [callOffs.data, asns.data, receipts.data, nowIso],
  );
  return {
    views,
    nowIso,
    asns: asns.data?.items ?? [],
    isPending: callOffs.isPending || asns.isPending || receipts.isPending,
    error: callOffs.error ?? asns.error ?? receipts.error,
    refetch: () => {
      callOffs.refetch();
      asns.refetch();
      receipts.refetch();
    },
  };
}

export const qty = (n: number) => n.toLocaleString('en-US');

export const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action';

export const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

/** A typed quantity, read by the one legal parser (CR-18); NaN when unreadable. */
export const numberOf = (raw: string): number => {
  if (raw.trim() === '') return Number.NaN;
  const r = normalizeQty(raw);
  return r.ok ? r.value : Number.NaN;
};
