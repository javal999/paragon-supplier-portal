/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { formatDate, formatDateTime } from '@lib/format';
/** @import { StatusTone } from '@lib/statusTone' */
import { sdcClock } from '@services/sdc';
/** @import { ForecastCommitmentLine, ForecastZone } from '@services/data/types' */
/** @import { GapColour } from '@services/transitions/forecastRules' */
import {
  commitmentGap,
  commitmentTiming,
  deadlineState,
  periodKindOf
} from '@services/transitions/forecastRules';
/** @import { ForecastCommandVars, ForecastLineRef } from '@services/query/commandHooks' */
import { useForecastCommand } from '@services/query/commandHooks';

// ─────────────────────────────────────────────────────────────────────────────
// Shared forecast collaboration display (REQ-E06-01 to REQ-E06-03). Every state
// comes from `forecastRules` on the one simulated clock the commands stamp
// with, so the supplier page, the planner pages and Home agree.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "Now" for forecast pages: the simulated clock the commitment commands stamp with.
 * @returns {string}
 */
export const forecastNow = () => sdcClock.now();

/** @param {number} n */
export const qtyText = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

/** @param {number} n */
export const pctText = (n) => `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;

/** A week reads "Week of 31 Aug 2026"; a month "Sep 2026". */
export function usePeriodLabel() {
  const { t, i18n } = useTranslation();
  return /** @param {string} bucket @returns {string} */ (bucket) => {
    if (periodKindOf(bucket) === 'week') return t('fc.period.week', { date: formatDate(bucket) });
    const [y, m] = bucket.split('-').map(Number);
    return new Intl.DateTimeFormat(i18n.language.startsWith('id') ? 'id-ID' : 'en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(new Date(Date.UTC(y, m - 1, 1)));
  };
}

/** @type {Record<ForecastZone, StatusTone>} */
const ZONE_TONE = { firm: 'info', tradeOff: 'neutral', forecast: 'neutral' };

/** @type {React.FC<{ zone: ForecastZone }>} */
export const ZonePill = ({ zone }) => {
  const { t } = useTranslation();
  return <StatusPill variant={ZONE_TONE[zone]}>{t(`fc.zone.${zone}`)}</StatusPill>;
};

/**
 * The line's commitment state, with the deadline state while it is awaited.
 * @type {React.FC<{ line: ForecastCommitmentLine; nowIso: string }>}
 */
export const CommitmentStatePill = ({ line, nowIso }) => {
  const { t } = useTranslation();
  const deadline = deadlineState(line, nowIso);
  if (line.state === 'awaiting') {
    const key = line.zone === 'forecast' ? 'fc.state.awaitingAck' : 'fc.state.awaiting';
    if (deadline === 'overdue')
      return <StatusPill variant="danger">{t('fc.deadline.overdue')}</StatusPill>;
    if (deadline === 'dueSoon')
      return <StatusPill variant="warning">{t('fc.deadline.dueSoon')}</StatusPill>;
    return <StatusPill variant="neutral">{t(key)}</StatusPill>;
  }
  /** @type {Record<Exclude<ForecastCommitmentLine['state'], 'awaiting'>, StatusTone>} */
  const tone = {
    acknowledged: 'success',
    accepted: 'success',
    exception: 'warning',
    acceptedByPlanner: 'success',
    revisionRequested: 'warning'
  };
  return <StatusPill variant={tone[line.state]}>{t(`fc.state.${line.state}`)}</StatusPill>;
};

/**
 * CR-26 · BL-48 — a duration as the deadline line says it: "2 d 5 h", "5 h",
 * "under 1 h". Units are abbreviations so neither language needs a plural.
 * @returns {(ms: number) => string}
 */
export function useDurationText() {
  const { t } = useTranslation();
  return /** @param {number} ms */ (ms) => {
    const hours = Math.floor(ms / 3_600_000);
    if (hours < 1) return t('fc.duration.underHour');
    const days = Math.floor(hours / 24);
    return days > 0
      ? t('fc.duration.daysHours', { days, hours: hours % 24 })
      : t('fc.duration.hours', { hours });
  };
}

/**
 * CR-26 · BL-48 — the deadline, and where the line stands against it: time left
 * while it is open, how late it is once past, or whether the commitment that
 * stands arrived in time. Derived from `commitmentTiming` on the page's clock;
 * nothing here is stored.
 * `compact`:  The grid's form: the timing line only, and nothing when it arrived in time.
 * @type {React.FC<{ line: ForecastCommitmentLine; nowIso: string; testId?: string; compact?: boolean; }>}
 */
export const CommitmentDeadline = ({ line, nowIso, testId, compact = false }) => {
  const { t } = useTranslation();
  const duration = useDurationText();
  const timing = commitmentTiming(line, nowIso);
  const due =
    line.response && line.state !== 'awaiting' && line.responseDueAt
      ? line.responseDueAt
      : line.dueAt;
  /** @type {string} */
  let text;
  let tone = 'text-text-tertiary';
  switch (timing.kind) {
    case 'open':
      text = t('fc.timing.left', { time: duration(timing.msLeft) });
      break;
    case 'late':
      text = t('fc.timing.lateBy', { time: duration(timing.msLate) });
      tone = 'text-danger font-medium';
      break;
    case 'submittedLate':
      text = t('fc.timing.submittedLate', { time: duration(timing.msLate) });
      tone = 'text-warning-hover font-medium';
      break;
    default:
      text = t('fc.timing.submittedOnTime');
  }
  if (compact) {
    if (timing.kind === 'submittedOnTime') return null;
    return (
      <div
        data-testid={testId}
        data-timing={timing.kind}
        className={`text-[11px] ${tone}`}
        title={formatDateTime(due)}
      >
        {text}
      </div>
    );
  }
  return (
    <div data-testid={testId} data-timing={timing.kind}>
      <Data className="text-xs">{formatDateTime(due)}</Data>
      <div className={`text-[11px] ${tone}`}>{text}</div>
    </div>
  );
};

/** @type {Record<GapColour, StatusTone>} */
const GAP_TONE = { green: 'success', amber: 'warning', red: 'danger' };

/**
 * REQ-E06-03 BR-01 / BR-02 — gap quantity and percentage, coloured per CR-22.
 * @type {React.FC<{ line: ForecastCommitmentLine }>}
 */
export const GapCell = ({ line }) => {
  const { t } = useTranslation();
  if (line.zone === 'forecast')
    return <span className="text-xs text-text-tertiary">{t('fc.gap.ackOnly')}</span>;
  if (line.committedQty === null || line.state === 'awaiting') {
    return <span className="text-xs text-text-tertiary">{t('fc.gap.none')}</span>;
  }
  const gap = commitmentGap(line.zone, line.forecastQty, line.committedQty);
  return (
    <div
      className="flex flex-wrap items-center gap-1"
      data-testid={`gap-${line.key}`}
      data-colour={gap.colour}
    >
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

/**
 * @param {ForecastCommitmentLine} l
 * @returns {ForecastLineRef}
 */
export const lineRef = (l) => ({
  publicationId: l.publicationId,
  planVersion: l.planVersion,
  supplierId: l.supplierId,
  materialCode: l.materialCode,
  periodBucket: l.periodBucket
});

/**
 * Business wording for a refusal from a forecast verb.
 * @param {string | undefined} reason
 * @returns {string | null}
 */
function refusalKey(reason) {
  if (!reason) return null;
  /** @type {[string, string][]} */
  const table = [
    ['BELOW_FORECAST_NEEDS_REASON', 'fc.refusal.reasonRequired'],
    ['CAPACITY_NOT_CONFIRMED', 'fc.refusal.capacityNotConfirmed'],
    ['ABOVE_BE_NEEDS_REASON', 'fc.refusal.aboveBeNeedsReason'],
    ['OTHER_REASON_NEEDS_NOTE', 'fc.refusal.noteRequired'],
    ['NOT_QUALIFIED', 'fc.refusal.notQualified'],
    ['NOTE_REQUIRED', 'fc.refusal.noteRequiredPlanner'],
    ['NOT_CURRENT_VERSION', 'fc.refusal.notCurrent'],
    ['disputeReason', 'fc.refusal.noteRequiredPlanner']
  ];
  return table.find(([needle]) => reason.includes(needle))?.[1] ?? null;
}

/** Run a forecast act with a toast; resolves with whether it landed. */
export function useForecastRunner() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const command = useForecastCommand();
  /**
   * @param {ForecastCommandVars} vars
   * @param {string} [success]
   * @returns {Promise<{ ok: boolean; reason?: string }>}
   */
  const run = async (vars, success) => {
    try {
      const res = await command.mutateAsync(vars);
      if (res.status === 'failed') {
        const key = refusalKey(res.reason);
        const reason = key ? t(key) : (refusalText(res.reason) ?? t('fc.refusal.generic'));
        if (success !== undefined)
          toast({ variant: 'warning', title: t('fc.toast.refused'), description: reason });
        return { ok: false, reason };
      }
      if (success) toast({ variant: 'success', title: success });
      return { ok: true };
    } catch {
      const reason = t('fc.refusal.generic');
      if (success !== undefined)
        toast({ variant: 'error', title: t('fc.toast.refused'), description: reason });
      return { ok: false, reason };
    }
  };
  return { run, pending: command.isPending };
}

/**
 * Hand a generated text file to the browser (a Blob link, nothing sent).
 * @param {string} filename
 * @param {string} text
 * @returns {void}
 */
export function downloadText(filename, text) {
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
