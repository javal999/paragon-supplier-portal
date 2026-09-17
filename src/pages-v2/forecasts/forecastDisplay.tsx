import React from 'react';
import { useTranslation } from 'react-i18next';
import StatusPill from '../../components/ui-v2/StatusPill';
import Data from '../../components/ui-v2/Data';
import { useToast } from '../../hooks/useToast';
import { useRefusalText } from '../../hooks/useRefusalText';
import { formatDate } from '../../lib/format';
import type { StatusTone } from '../../lib/statusTone';
import { sdcClock } from '../../services/sdc';
import type { ForecastCommitmentLine, ForecastZone } from '../../services/data/types';
import {
  commitmentGap,
  deadlineState,
  periodKindOf,
  type GapColour,
} from '../../services/transitions/forecastRules';
import { useForecastCommand, type ForecastCommandVars, type ForecastLineRef } from '../../services/query/commandHooks';

// ─────────────────────────────────────────────────────────────────────────────
// Shared forecast collaboration display (REQ-E06-01 to REQ-E06-03). Every state
// comes from `forecastRules` on the one simulated clock the commands stamp
// with, so the supplier page, the planner pages and Home agree.
// ─────────────────────────────────────────────────────────────────────────────

/** "Now" for forecast pages: the simulated clock the commitment commands stamp with. */
export const forecastNow = (): string => sdcClock.now();

export const qtyText = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export const pctText = (n: number) => `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;

/** A week reads "Week of 31 Aug 2026"; a month "Sep 2026". */
export function usePeriodLabel() {
  const { t, i18n } = useTranslation();
  return (bucket: string): string => {
    if (periodKindOf(bucket) === 'week') return t('fc.period.week', { date: formatDate(bucket) });
    const [y, m] = bucket.split('-').map(Number);
    return new Intl.DateTimeFormat(i18n.language.startsWith('id') ? 'id-ID' : 'en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, 1)));
  };
}

const ZONE_TONE: Record<ForecastZone, StatusTone> = { firm: 'info', tradeOff: 'neutral', forecast: 'neutral' };

export const ZonePill: React.FC<{ zone: ForecastZone }> = ({ zone }) => {
  const { t } = useTranslation();
  return <StatusPill variant={ZONE_TONE[zone]}>{t(`fc.zone.${zone}`)}</StatusPill>;
};

/** The line's commitment state, with the deadline state while it is awaited. */
export const CommitmentStatePill: React.FC<{ line: ForecastCommitmentLine; nowIso: string }> = ({ line, nowIso }) => {
  const { t } = useTranslation();
  const deadline = deadlineState(line, nowIso);
  if (line.state === 'awaiting') {
    const key = line.zone === 'forecast' ? 'fc.state.awaitingAck' : 'fc.state.awaiting';
    if (deadline === 'overdue') return <StatusPill variant="danger">{t('fc.deadline.overdue')}</StatusPill>;
    if (deadline === 'dueSoon') return <StatusPill variant="warning">{t('fc.deadline.dueSoon')}</StatusPill>;
    return <StatusPill variant="neutral">{t(key)}</StatusPill>;
  }
  const tone: Record<Exclude<ForecastCommitmentLine['state'], 'awaiting'>, StatusTone> = {
    acknowledged: 'success',
    accepted: 'success',
    exception: 'warning',
    acceptedByPlanner: 'success',
    revisionRequested: 'warning',
  };
  return <StatusPill variant={tone[line.state]}>{t(`fc.state.${line.state}`)}</StatusPill>;
};

const GAP_TONE: Record<GapColour, StatusTone> = { green: 'success', amber: 'warning', red: 'danger' };

/** REQ-E06-03 BR-01 / BR-02 — gap quantity and percentage, coloured per CR-22. */
export const GapCell: React.FC<{ line: ForecastCommitmentLine }> = ({ line }) => {
  const { t } = useTranslation();
  if (line.zone === 'forecast') return <span className="text-xs text-text-tertiary">{t('fc.gap.ackOnly')}</span>;
  if (line.committedQty === null || line.state === 'awaiting') {
    return <span className="text-xs text-text-tertiary">{t('fc.gap.none')}</span>;
  }
  const gap = commitmentGap(line.zone, line.forecastQty, line.committedQty);
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid={`gap-${line.key}`} data-colour={gap.colour}>
      <StatusPill variant={GAP_TONE[gap.colour]}>
        {t(`fc.gap.colour.${gap.colour}`)} · <Data>{pctText(gap.pct)}</Data>
      </StatusPill>
      <Data className="text-xs">{`${gap.qty > 0 ? '+' : ''}${qtyText(gap.qty)}`}</Data>
      {gap.overCommit && (
        <span data-testid={`overcommit-${line.key}`}>
          <StatusPill variant="info">{t('fc.gap.overCommit')}</StatusPill>
        </span>
      )}
    </div>
  );
};

export const lineRef = (l: ForecastCommitmentLine): ForecastLineRef => ({
  publicationId: l.publicationId,
  planVersion: l.planVersion,
  supplierId: l.supplierId,
  materialCode: l.materialCode,
  periodBucket: l.periodBucket,
});

/** Business wording for a refusal from a forecast verb. */
function refusalKey(reason: string | undefined): string | null {
  if (!reason) return null;
  const table: [string, string][] = [
    ['BELOW_FORECAST_NEEDS_REASON', 'fc.refusal.reasonRequired'],
    ['OTHER_REASON_NEEDS_NOTE', 'fc.refusal.noteRequired'],
    ['COMMITMENT_DATE_REQUIRED', 'fc.refusal.dateRequired'],
    ['NOT_QUALIFIED', 'fc.refusal.notQualified'],
    ['NOTE_REQUIRED', 'fc.refusal.noteRequiredPlanner'],
    ['NOT_CURRENT_VERSION', 'fc.refusal.notCurrent'],
    ['disputeReason', 'fc.refusal.noteRequiredPlanner'],
  ];
  return table.find(([needle]) => reason.includes(needle))?.[1] ?? null;
}

/** Run a forecast act with a toast; resolves with whether it landed. */
export function useForecastRunner() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useForecastCommand();
  const run = async (vars: ForecastCommandVars, success?: string): Promise<{ ok: boolean; reason?: string }> => {
    try {
      const res = await command.mutateAsync(vars);
      if (res.status === 'failed') {
        const key = refusalKey(res.reason);
        const reason = key ? t(key) : (refusalText(res.reason) ?? t('fc.refusal.generic'));
        if (success !== undefined) toast({ variant: 'warning', title: t('fc.toast.refused'), description: reason });
        return { ok: false, reason };
      }
      if (success) toast({ variant: 'success', title: success });
      return { ok: true };
    } catch {
      const reason = t('fc.refusal.generic');
      if (success !== undefined) toast({ variant: 'error', title: t('fc.toast.refused'), description: reason });
      return { ok: false, reason };
    }
  };
  return { run, pending: command.isPending };
}

/** Hand a generated text file to the browser (a Blob link, nothing sent). */
export function downloadText(filename: string, text: string): void {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
