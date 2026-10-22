/** @import React from 'react' */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import Data from '@components/ui-v2/Data';
import LivenessPill from '@components/ui-v2/LivenessPill';
import { formatDateTime } from '@lib/format';
/** @import { InventoryPosition } from '@services/data/types' */
import { stockSyncIntervalHours, updateCycleSettings } from '@services/transitions/inventoryConfig';
import { stockFreshness } from '@services/transitions/inventoryRules';
/** @import { WeeklyUpdateStatus } from '@services/transitions/updateCycle' */
import {
  activeUpdateReminder,
  nextSyncAt,
  weeklyUpdateStatus
} from '@services/transitions/updateCycle';
import { hubWorkingCalendar } from '@services/transitions/workingCalendarStore';

// ─────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER'S WEEKLY-UPDATE PANEL — Material B2 (MR-1 d, AC-01, BR-06).
//
// On the supplier Home and at the top of the supplier Stock page.
//
//   · Manual supplier: Inventory UX S-02 (INV-D4) — ONE weekly status on the
//     stock-update cutoff, the same two lines the To do Stock row shows
//     (`useWeeklyStatusText`): "Weekly stock update · 2 of 4 sent · due Thu 3
//     Sept 23:59 WIB", then "2 out of date since 13 Aug" when any figure is
//     past its update SLA. No second deadline, no SOP line, no "Missed" strip.
//     Below them, the materials still to send this cycle — each opening the
//     stock entry form on that material. From 09:00 WIB on the working day
//     before the cutoff, and again on the cutoff day, an in-hub reminder lists
//     what is still missing (d step 2).
//   · API supplier: the last sync attempt and the next scheduled one (last
//     attempt + `stockSync.intervalHours`), with the note that the schedule is
//     not running in the prototype and its liveness pill (MAT-R14).
//
// Everything is derived at read from the positions the supplier already reads
// and the calendar and settings in force (`updateCycle.js`); nothing is stored.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `reminder`:  The reminder in force now, or null (none yet, or nothing missing).
 *
 * @typedef {{
 *     readonly status: WeeklyUpdateStatus;
 *     readonly reminder: string | null;
 *   }} WeeklyUpdateView
 */

/**
 * The weekly-update state for one supplier's positions at `nowIso`.
 * @param {string} supplierId
 * @param {readonly InventoryPosition[]} positions
 * @param {string} nowIso
 * @returns {WeeklyUpdateView}
 */
export function weeklyUpdateView(supplierId, positions, nowIso) {
  const calendar = hubWorkingCalendar();
  const status = weeklyUpdateStatus(supplierId, positions, nowIso, calendar, updateCycleSettings());
  const reminder =
    status.missing.length > 0 ? activeUpdateReminder(status.cycle, nowIso, calendar) : null;
  return { status, reminder };
}

/**
 * The stock entry form on the supplier Stock page, pre-filled with one material.
 * @param {string} materialCode
 * @returns {string}
 */
export const stockEntryLink = (materialCode) =>
  `/supplier/inventory?enter=${encodeURIComponent(materialCode)}`;

const JAKARTA = 'Asia/Jakarta';

/**
 * `headline`:  "Weekly stock update · 2 of 4 sent · due Thu 3 Sept 23:59 WIB".
 * `outOfDate`:  "2 out of date since 13 Aug", or null when every figure is current.
 * `sent`, `total`, `due`:  The headline's parts, for a render that sets the
 *   due date in the mono face (DP-3).
 *
 * @typedef {{
 *     readonly headline: string;
 *     readonly outOfDate: string | null;
 *     readonly sent: number;
 *     readonly total: number;
 *     readonly due: string;
 *   }} WeeklyStatusText
 */

/**
 * Inventory UX S-02 (INV-D4) — the one weekly status, worded once for the
 * panel and the To do Stock row. "Out of date" is the stock freshness rule
 * (`stockFreshness`, past the update SLA or never sent); "since" is the
 * earliest instant one of those figures turned stale, when one is on record.
 * @returns {(status: WeeklyUpdateStatus, positions: readonly InventoryPosition[], nowIso: string) => WeeklyStatusText}
 */
export function useWeeklyStatusText() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('id') ? 'id-ID' : 'en-GB';
  return useCallback(
    (status, positions, nowIso) => {
      const day = (/** @type {Intl.DateTimeFormatOptions} */ opts) =>
        new Intl.DateTimeFormat(locale, { timeZone: JAKARTA, ...opts });
      const cutoff = new Date(status.cycle.cutoff);
      const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: JAKARTA,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(cutoff);
      const due = `${day({ weekday: 'short', day: 'numeric', month: 'short' }).format(cutoff)} ${time} WIB`;
      const out = positions.filter((p) => stockFreshness(p, nowIso) !== 'current');
      const staleTimes = out
        .flatMap((p) => (p.staleAt ? [Date.parse(p.staleAt)] : []))
        .filter(Number.isFinite);
      const since =
        staleTimes.length === 0
          ? null
          : day({ day: 'numeric', month: 'short' }).format(new Date(Math.min(...staleTimes)));
      const sent = status.updated.length;
      const headline = [
        t('inv.weekly.title'),
        t('inv.weekly.sent', { sent, total: status.total }),
        `${t('inv.weekly.dueOn')} ${due}`
      ].join(' · ');
      const outOfDate =
        out.length === 0
          ? null
          : since === null
            ? t('inv.weekly.outOfDate', { count: out.length })
            : t('inv.weekly.outOfDateSince', { count: out.length, date: since });
      return { headline, outOfDate, sent, total: status.total, due };
    },
    [t, locale]
  );
}

/** @type {React.FC<{ positions: readonly InventoryPosition[]; view: WeeklyUpdateView; nowIso: string }>} */
const ManualPanel = ({ positions, view, nowIso }) => {
  const { t } = useTranslation();
  const statusText = useWeeklyStatusText();
  const { status, reminder } = view;
  const text = statusText(status, positions, nowIso);
  /** @param {string} code */
  const labelOf = (code) => positions.find((p) => p.materialCode === code)?.materialLabel ?? '';

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6 space-y-3"
      data-testid="weekly-update"
    >
      <div>
        {/* S-02 — the same two lines as the To do Stock row; data in mono (DP-3). */}
        <h2 className="text-section text-text-primary" data-testid="weekly-status">
          {t('inv.weekly.title')} · {t('inv.weekly.sent', { sent: text.sent, total: text.total })} ·{' '}
          {t('inv.weekly.dueOn')} <Data>{text.due}</Data>
        </h2>
        {text.outOfDate !== null && (
          <p className="text-sm text-warning-hover" data-testid="weekly-out-of-date">
            {text.outOfDate}
          </p>
        )}
      </div>
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
      {status.missing.length === 0 ? (
        <p className="text-sm text-success" data-testid="weekly-all-done">
          {t('inv.weekly.allDone')}
        </p>
      ) : (
        <div data-testid="weekly-missing">
          <h3 className="text-label text-text-tertiary uppercase mb-1">
            {t('inv.weekly.missingTitle')}
          </h3>
          <ul className="divide-y divide-border-subtle">
            {status.missing.map((code) => (
              <li
                key={code}
                className="py-1.5 flex flex-wrap items-center justify-between gap-3"
                data-testid={`weekly-missing-${code}`}
              >
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
    </section>
  );
};

/** @type {React.FC<{ positions: readonly InventoryPosition[] }>} */
const ApiPanel = ({ positions }) => {
  const { t } = useTranslation();
  // Every row of one supplier carries the same latest attempt.
  const last = positions.find((p) => p.lastSync !== null)?.lastSync ?? null;
  const next = nextSyncAt(last?.at ?? null, stockSyncIntervalHours());
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6 space-y-2"
      data-testid="weekly-api"
    >
      <h2 className="text-section text-text-primary">
        {t('inv.weekly.api.title')}
        <LivenessPill capability="stockSyncSchedule" className="ml-3 align-middle" />
      </h2>
      <p className="text-sm text-text-secondary" data-testid="weekly-api-sync">
        {t('inv.weekly.api.last')}{' '}
        <Data>{last === null ? t('inv.sync.never') : formatDateTime(last.at)}</Data>
        {last?.outcome === 'failed' && (
          <span className="text-danger"> ({t('inv.freshness.pullFailed')})</span>
        )}
        {' · '}
        {t('inv.weekly.api.next')} <Data>{next === null ? '—' : formatDateTime(next)}</Data>
      </p>
      <p className="text-xs text-text-tertiary" data-testid="weekly-api-not-active">
        {t('inv.weekly.api.notActive')}
      </p>
    </section>
  );
};

/**
 * @typedef {object} WeeklyUpdatePanelProps
 * @property {string} supplierId
 * @property {readonly InventoryPosition[]} positions
 * @property {string} nowIso
 */

/** @type {React.FC<WeeklyUpdatePanelProps>} */
const WeeklyUpdatePanel = ({ supplierId, positions, nowIso }) => {
  const own = positions.filter((p) => p.supplierId === supplierId);
  if (own.length === 0) return null;
  if (own.some((p) => p.apiConnected)) return <ApiPanel positions={own} />;
  return (
    <ManualPanel positions={own} view={weeklyUpdateView(supplierId, own, nowIso)} nowIso={nowIso} />
  );
};

export default WeeklyUpdatePanel;
