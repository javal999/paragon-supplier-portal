import React from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import type { StatusTone } from '../../lib/statusTone';
import type { CallOffDeliveryStatus, CallOffView } from '../../services/transitions/callOffRules';
import { useCallOffs, useASNs, useGoodsReceipts } from '../../services/query/hooks';
import { callOffViews } from '../../services/transitions/callOffRules';
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
