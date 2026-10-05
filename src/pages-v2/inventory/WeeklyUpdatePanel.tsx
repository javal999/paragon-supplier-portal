import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import LivenessPill from '@components/ui-v2/LivenessPill';
import { formatDateTime } from '@lib/format';
import type { InventoryPosition } from '@services/data/types';
import { stockSyncIntervalHours, updateCycleSettings } from '@services/transitions/inventoryConfig';
import {
  activeUpdateReminder,
  nextSyncAt,
  weeklyUpdateStatus,
  type WeeklyUpdateStatus,
} from '@services/transitions/updateCycle';
import { hubWorkingCalendar } from '@services/transitions/workingCalendarStore';
import { useDurationText } from '../forecasts/forecastDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER'S WEEKLY-UPDATE PANEL — Material B2 (MR-1 d, AC-01, BR-06).
//
// On the supplier Home and at the top of the supplier Stock page.
//
//   · Manual supplier: when the week's update is due and the time left, how
//     many materials are updated this cycle, and the ones still missing — each
//     opening the stock entry form on that material. After a cutoff, the
//     materials missed in the closed cycle read "Missed" until each is sent.
//     From 09:00 WIB on the working day before the cutoff, and again on the
//     cutoff day, an in-hub reminder lists what is still missing (d step 2).
//   · API supplier: the last sync attempt and the next scheduled one (last
//     attempt + `stockSync.intervalHours`), with the note that the schedule is
//     not running in the prototype and its liveness pill (MAT-R14).
//
// Everything is derived at read from the positions the supplier already reads
// and the calendar and settings in force (`updateCycle.ts`); nothing is stored.
// ─────────────────────────────────────────────────────────────────────────────

export interface WeeklyUpdateView {
  readonly status: WeeklyUpdateStatus;
  /** The reminder in force now, or null (none yet, or nothing missing). */
  readonly reminder: string | null;
}

/** The weekly-update state for one supplier's positions at `nowIso`. */
export function weeklyUpdateView(
  supplierId: string,
  positions: readonly InventoryPosition[],
  nowIso: string,
): WeeklyUpdateView {
  const calendar = hubWorkingCalendar();
  const status = weeklyUpdateStatus(supplierId, positions, nowIso, calendar, updateCycleSettings());
  const reminder = status.missing.length > 0 ? activeUpdateReminder(status.cycle, nowIso, calendar) : null;
  return { status, reminder };
}

/** The stock entry form on the supplier Stock page, pre-filled with one material. */
export const stockEntryLink = (materialCode: string): string =>
  `/supplier/inventory?enter=${encodeURIComponent(materialCode)}`;

const JAKARTA = 'Asia/Jakarta';

function useCutoffText(): (iso: string) => string {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith('id') ? 'id-ID' : 'en-GB';
  return (iso: string) => {
    const d = new Date(iso);
    const day = new Intl.DateTimeFormat(locale, { timeZone: JAKARTA, weekday: 'long', day: 'numeric', month: 'short' }).format(d);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: JAKARTA, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    return `${day} ${time} WIB`;
  };
}

const ManualPanel: React.FC<{ positions: readonly InventoryPosition[]; view: WeeklyUpdateView; nowIso: string }> = ({
  positions,
  view,
  nowIso,
}) => {
  const { t } = useTranslation();
  const duration = useDurationText();
  const cutoffText = useCutoffText();
  const { status, reminder } = view;
  const labelOf = (code: string) => positions.find((p) => p.materialCode === code)?.materialLabel ?? '';
  const msLeft = Date.parse(status.cycle.cutoff) - Date.parse(nowIso);

  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6 space-y-3" data-testid="weekly-update">
      <h2 className="text-section text-text-primary">{t('inv.weekly.title')}</h2>
      {status.missed.length > 0 && (
        <div
          role="status"
          data-testid="weekly-missed"
          className="bg-danger-soft border-l-2 border-danger rounded px-4 py-2 text-sm text-danger flex items-center gap-2"
        >
          <AlertTriangle size={14} aria-hidden="true" />
          {t('inv.weekly.missed', { count: status.missed.length })}
          <span className="text-xs text-text-secondary">{t('inv.weekly.missedHint')}</span>
        </div>
      )}
      {reminder !== null && (
        <div
          role="status"
          data-testid="weekly-reminder"
          className="bg-warning-soft border-l-2 border-warning rounded px-4 py-2 text-sm text-warning-hover flex items-center gap-2"
        >
          <BellRing size={14} aria-hidden="true" />
          {t('inv.weekly.reminder', { count: status.missing.length })}
        </div>
      )}
      <p className="text-sm text-text-primary" data-testid="weekly-due">
        {t('inv.weekly.due')} <Data>{cutoffText(status.cycle.cutoff)}</Data>
        <span className="text-text-tertiary"> · {t('inv.weekly.left', { time: duration(msLeft) })}</span>
      </p>
      <p className="text-sm text-text-secondary" data-testid="weekly-count">
        {t('inv.weekly.count', { updated: status.updated.length, total: status.total })}
      </p>
      {status.missing.length === 0 ? (
        <p className="text-sm text-success" data-testid="weekly-all-done">
          {t('inv.weekly.allDone')}
        </p>
      ) : (
        <div data-testid="weekly-missing">
          <h3 className="text-label text-text-tertiary uppercase mb-1">{t('inv.weekly.missingTitle')}</h3>
          <ul className="divide-y divide-border-subtle">
            {status.missing.map((code) => (
              <li key={code} className="py-1.5 flex flex-wrap items-center justify-between gap-3" data-testid={`weekly-missing-${code}`}>
                <span className="text-sm text-text-primary">
                  <Data className="text-xs font-bold">{code}</Data> {labelOf(code)}
                </span>
                <Link
                  to={stockEntryLink(code)}
                  className="text-sm text-action-hover hover:underline"
                  aria-label={t('inv.weekly.enterFor', { material: code })}
                  data-testid={`weekly-enter-${code}`}
                >
                  {t('inv.weekly.enter')}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* MR-1 BR-06 — no link until the SOP document exists. */}
      <p className="text-xs text-text-tertiary" data-testid="weekly-sop">
        {t('inv.weekly.sop')}
      </p>
    </section>
  );
};

const ApiPanel: React.FC<{ positions: readonly InventoryPosition[] }> = ({ positions }) => {
  const { t } = useTranslation();
  // Every row of one supplier carries the same latest attempt.
  const last = positions.find((p) => p.lastSync !== null)?.lastSync ?? null;
  const next = nextSyncAt(last?.at ?? null, stockSyncIntervalHours());
  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6 space-y-2" data-testid="weekly-api">
      <h2 className="text-section text-text-primary">
        {t('inv.weekly.api.title')}
        <LivenessPill capability="stockSyncSchedule" className="ml-3 align-middle" />
      </h2>
      <p className="text-sm text-text-secondary" data-testid="weekly-api-sync">
        {t('inv.weekly.api.last')} <Data>{last === null ? t('inv.sync.never') : formatDateTime(last.at)}</Data>
        {last?.outcome === 'failed' && <span className="text-danger"> ({t('inv.freshness.pullFailed')})</span>}
        {' · '}
        {t('inv.weekly.api.next')} <Data>{next === null ? '—' : formatDateTime(next)}</Data>
      </p>
      <p className="text-xs text-text-tertiary" data-testid="weekly-api-not-active">
        {t('inv.weekly.api.notActive')}
      </p>
    </section>
  );
};

export interface WeeklyUpdatePanelProps {
  supplierId: string;
  positions: readonly InventoryPosition[];
  nowIso: string;
}

const WeeklyUpdatePanel: React.FC<WeeklyUpdatePanelProps> = ({ supplierId, positions, nowIso }) => {
  const own = positions.filter((p) => p.supplierId === supplierId);
  if (own.length === 0) return null;
  if (own.some((p) => p.apiConnected)) return <ApiPanel positions={own} />;
  return <ManualPanel positions={own} view={weeklyUpdateView(supplierId, own, nowIso)} nowIso={nowIso} />;
};

export default WeeklyUpdatePanel;
