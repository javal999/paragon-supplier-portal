import React, { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import PageMetaLine from '@components/ui-v2/PageMetaLine';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDate, formatDateTime } from '@lib/format';
import { useCalendarDaySet } from '@services/query/commandHooks';
import { useForecastVersions } from '@services/query/hooks';
import { commitmentDueAt } from '@services/transitions/forecastRules';
import {
  SAP_FACTORY_CALENDAR,
  hubWorkingCalendar,
  listedCalendarDays,
  workingCalendarStore,
  type CalendarDayView,
} from '@services/transitions/workingCalendarStore';
import type { CalendarDayKind } from '@lib/workingCalendar';
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · WORKING CALENDAR — BL-50, REQUIREMENTS §3.4 (ADM persona).
//
// Reached from the user menu, not the main menu (NV-01): administration is not
// a working area. The first page of the admin screen BL-32 describes.
//
//   · THE SAP LOAD, marked "Sample data" (SC-04). There is no SAP connection,
//     and there is deliberately no "Load from SAP" button: a button that
//     re-read a fixture would claim a fetch that never happens.
//   · THE DEADLINES THE CALENDAR DECIDES NOW — the current forecast versions'
//     commitment deadlines, computed on the calendar in force, so a ruling is
//     seen to move them on the page that made it.
//   · THE NON-WORKING DAYS, each with where its answer came from; a ruling that
//     contradicts SAP says so.
//   · ONE FORM, and it is the only entrance to `t_calendar_day_set`. The row
//     buttons only PRE-FILL it; the gate sits on the form (§84: gate the mode,
//     not the door). A seat without `calendar:set` reads everything and is told
//     whose act a ruling is — the wait, never a missing button.
//   · THE RULINGS ON RECORD, with who and when — including the honest "not
//     attributed", because the platform cannot name a person.
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

/** Subscribe to the calendar so a ruling re-renders this page at once. */
function useCalendarVersion(): number {
  return useSyncExternalStore(workingCalendarStore.subscribe, workingCalendarStore.version, workingCalendarStore.version);
}

function useWeekday(): (date: string) => string {
  const { i18n } = useTranslation();
  const fmt = useMemo(
    () => new Intl.DateTimeFormat(i18n.language === 'id' ? 'id-ID' : 'en-GB', { weekday: 'long', timeZone: 'UTC' }),
    [i18n.language],
  );
  return (date: string) => fmt.format(new Date(`${date}T00:00:00.000Z`));
}

/** The current forecast versions' commitment deadlines, on the calendar in force. */
const DeadlinesPanel: React.FC<{ calendarVersion: number }> = ({ calendarVersion }) => {
  const { t } = useTranslation();
  const versions = useForecastVersions();
  const current = useMemo(
    () => (versions.data?.items ?? []).filter((v) => v.isCurrent).sort((a, b) => a.stream.localeCompare(b.stream)),
    [versions.data],
  );
  return (
    <section
      className="rounded-lg border border-border-subtle bg-bg-surface p-5 shadow-sm mb-5"
      data-testid="admin-cal-deadlines"
      data-calendar-version={calendarVersion}
    >
      <h2 className="text-section text-text-primary">{t('adminCal.deadlines.title')}</h2>
      <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminCal.deadlines.intro')}</p>
      {current.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('adminCal.deadlines.none')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {current.map((v) => (
            <div
              key={v.publicationId}
              className="rounded-md border border-border-subtle bg-bg-hover px-4 py-3"
              data-testid={`admin-cal-deadline-${v.stream}`}
            >
              <div className="text-sm font-medium text-text-primary">
                {t(`fc.stream.${v.stream}`)} · <Data>{t('fc.version', { version: v.version })}</Data>
              </div>
              <div className="text-xs text-text-tertiary mb-2">
                {t('adminCal.deadlines.published', { date: formatDateTime(v.publishedAt) })}
              </div>
              {/* Label above value: side by side, the long label squeezed the
                  date into a column that wrapped word by word (seen at 800px). */}
              <dl className="flex flex-col gap-2 text-sm">
                <div>
                  <dt className="text-xs text-text-secondary">{t('adminCal.deadlines.firm')}</dt>
                  <dd className="whitespace-nowrap" data-testid={`admin-cal-due-${v.stream}-firm`}>
                    <Data>{formatDateTime(commitmentDueAt('firm', v.publishedAt))}</Data>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-secondary">{t('adminCal.deadlines.other')}</dt>
                  <dd className="whitespace-nowrap" data-testid={`admin-cal-due-${v.stream}-other`}>
                    <Data>{formatDateTime(commitmentDueAt('tradeOff', v.publishedAt))}</Data>
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

interface Draft {
  date: string;
  kind: CalendarDayKind;
  reason: string;
}

const EMPTY_DRAFT: Draft = { date: '', kind: 'non-working', reason: '' };

const AdminWorkingCalendar: React.FC = () => {
  const { t } = useTranslation();
  const weekday = useWeekday();
  const refusalText = useRefusalText();
  const { toast } = useToast();
  const setDay = useCalendarDaySet();
  const availability = useVerbAvailability('calendar:set');
  const held = availability.kind === 'held';
  const calendarVersion = useCalendarVersion();
  const formRef = useRef<HTMLElement>(null);

  // Re-derived whenever the calendar in force changes.
  const days = useMemo(() => listedCalendarDays(), [calendarVersion]);
  const rulings = useMemo(() => [...workingCalendarStore.rulings()].reverse(), [calendarVersion]);
  const readState = useMemo(() => workingCalendarStore.readState(), [calendarVersion]);
  const cal = hubWorkingCalendar();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const prefill = (day: CalendarDayView) => {
    setDraft({ date: day.date, kind: day.working ? 'non-working' : 'working', reason: '' });
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await setDay.mutateAsync({ date: draft.date, kind: draft.kind, reason: draft.reason });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title: refusalText(result.reason) ?? t('adminCal.toast.refused', { reason: result.reason ?? '' }),
      });
      return;
    }
    toast({
      variant: 'success',
      title: t(draft.kind === 'working' ? 'adminCal.toast.nowWorking' : 'adminCal.toast.nowNonWorking', {
        date: formatDate(draft.date),
      }),
    });
    setDraft(EMPTY_DRAFT);
  };

  const CRUMB = [t('adminCal.crumb.administration'), t('adminCal.crumb.calendar')];

  return (
    <AppShellV2>
      <PageHeader breadcrumb={CRUMB} title={t('adminCal.title')} subtitle={t('adminCal.subtitle')} />
      <PageMetaLine className="-mt-6 mb-6">
        <span data-testid="admin-cal-source">
          {t('adminCal.meta.source', {
            id: SAP_FACTORY_CALENDAR.calendarId,
            date: formatDateTime(SAP_FACTORY_CALENDAR.loadedAt),
          })}
        </span>{' '}
        ·{' '}
        {t('adminCal.meta.covers', {
          from: formatDate(SAP_FACTORY_CALENDAR.coversFrom),
          to: formatDate(SAP_FACTORY_CALENDAR.coversTo),
        })}{' '}
        · {t('adminCal.meta.hours', { start: cal.startHour, end: cal.endHour })}
        {/* The SAP load is a fixture: there is no SAP connection (SC-04). */}
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      <AdminSectionNav />

      {readState.unreadable && (
        <section
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-4 flex gap-3"
          data-testid="admin-cal-store-unreadable"
        >
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">{t('adminCal.store.unreadableTitle')}</div>
            <p className="text-xs text-text-secondary mt-1">{t('adminCal.store.unreadableBody')}</p>
          </div>
        </section>
      )}
      {readState.rejected.length > 0 && (
        <section
          className="mb-5 rounded-lg border border-warning/30 bg-warning-soft p-4 flex gap-3"
          data-testid="admin-cal-store-rejected"
        >
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">{t('adminCal.store.rejectedTitle')}</div>
            <p className="text-xs text-text-secondary mt-1">{t('adminCal.store.rejectedBody')}</p>
            <ul className="text-xs text-text-secondary mt-1 list-disc pl-4">
              {readState.rejected.map((r) => (
                <li key={`${r.row}-${r.reason}`}>
                  <Data>{r.row}</Data>: {r.reason}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <DeadlinesPanel calendarVersion={calendarVersion} />

      {/* ── The one entrance to the verb ─────────────────────────────────── */}
      {held ? (
        <section
          ref={formRef}
          className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
          data-testid="admin-cal-form"
        >
          <h2 className="text-section text-text-primary">{t('adminCal.form.title')}</h2>
          <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminCal.form.intro')}</p>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_220px_1fr] gap-3">
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">{t('adminCal.form.date')}</span>
                <input
                  type="date"
                  className={`${INPUT_CLASS} font-mono`}
                  data-testid="admin-cal-date"
                  aria-label={t('adminCal.form.date')}
                  min={SAP_FACTORY_CALENDAR.coversFrom}
                  max={SAP_FACTORY_CALENDAR.coversTo}
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                  required
                />
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">{t('adminCal.form.kind')}</span>
                <select
                  className={INPUT_CLASS}
                  data-testid="admin-cal-kind"
                  aria-label={t('adminCal.form.kind')}
                  value={draft.kind}
                  onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as CalendarDayKind }))}
                >
                  <option value="non-working">{t('adminCal.form.kind.nonWorking')}</option>
                  <option value="working">{t('adminCal.form.kind.working')}</option>
                </select>
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">{t('adminCal.form.reason')}</span>
                <input
                  className={INPUT_CLASS}
                  data-testid="admin-cal-reason"
                  aria-label={t('adminCal.form.reason')}
                  value={draft.reason}
                  onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
                  required
                />
                <span className="block text-[11px] text-text-tertiary mt-0.5">{t('adminCal.form.reasonHint')}</span>
              </label>
            </div>
            <p className="text-xs text-text-tertiary" data-testid="admin-cal-attribution">
              {t('adminCal.form.attribution')}
            </p>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" disabled={setDay.isPending} data-testid="admin-cal-submit">
                {t('adminCal.form.submit')}
              </Button>
              {draft.date !== '' && (
                <Button type="button" variant="secondary" onClick={() => setDraft(EMPTY_DRAFT)}>
                  {t('adminCal.form.cancel')}
                </Button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <section
          className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
          data-testid="admin-cal-gate"
        >
          <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{t('adminCal.gate.title')}</span>
              <HandoffNotice availability={availability} testId="handoff-calendar-set" />
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('adminCal.gate.body')}</p>
          </div>
        </section>
      )}

      {/* ── The non-working days ─────────────────────────────────────────── */}
      <section className="mb-5" data-testid="admin-cal-list">
        <h2 className="text-section text-text-primary">{t('adminCal.list.title')}</h2>
        <p className="text-xs text-text-secondary mt-1 mb-3">{t('adminCal.list.weekends')}</p>
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('adminCal.col.date')}</TableHeaderCell>
              <TableHeaderCell>{t('adminCal.col.day')}</TableHeaderCell>
              <TableHeaderCell>{t('adminCal.col.status')}</TableHeaderCell>
              <TableHeaderCell>{t('adminCal.col.source')}</TableHeaderCell>
              <TableHeaderCell>{t('adminCal.col.reason')}</TableHeaderCell>
              {held && <TableHeaderCell>{t('adminCal.col.action')}</TableHeaderCell>}
            </TableHeader>
            <tbody>
              {days.map((d) => (
                <TableRow key={d.date} data-testid={`admin-cal-day-${d.date}`}>
                  <TableCell className="whitespace-nowrap">
                    <Data>{formatDate(d.date)}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-text-secondary">{weekday(d.date)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusPill variant={d.working ? 'success' : 'neutral'}>
                      {t(d.working ? 'adminCal.status.working' : 'adminCal.status.nonWorking')}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {t(d.source === 'sap' ? 'adminCal.source.sap' : 'adminCal.source.administrator')}
                    {d.source === 'administrator' && d.working !== d.sapWorking && (
                      <StatusPill variant="info" className="ml-2">
                        {t('adminCal.overridesSap')}
                      </StatusPill>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">{d.ruling?.reason ?? ''}</TableCell>
                  {held && (
                    <TableCell className="whitespace-nowrap">
                      <Button
                        type="button"
                        variant="secondary"
                        data-testid={`admin-cal-prefill-${d.date}`}
                        onClick={() => prefill(d)}
                      >
                        {t(d.working ? 'adminCal.action.makeNonWorking' : 'adminCal.action.makeWorking')}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </tbody>
          </Table>
        </div>
      </section>

      {/* ── The rulings on record ────────────────────────────────────────── */}
      <section data-testid="admin-cal-history">
        <h2 className="text-section text-text-primary mb-3">{t('adminCal.history.title')}</h2>
        {rulings.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="admin-cal-history-empty">
            {t('adminCal.history.empty')}
          </p>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('adminCal.history.col.date')}</TableHeaderCell>
                <TableHeaderCell>{t('adminCal.history.col.ruled')}</TableHeaderCell>
                <TableHeaderCell>{t('adminCal.history.col.reason')}</TableHeaderCell>
                <TableHeaderCell>{t('adminCal.history.col.by')}</TableHeaderCell>
                <TableHeaderCell>{t('adminCal.history.col.at')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {rulings.map((r) => (
                  <TableRow key={`${r.date}-${r.setAt}`} data-testid={`admin-cal-ruling-${r.date}`}>
                    <TableCell className="whitespace-nowrap">
                      <Data>{formatDate(r.date)}</Data>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {t(r.kind === 'working' ? 'adminCal.status.working' : 'adminCal.status.nonWorking')}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">{r.reason}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {r.setBy.kind === 'RESOLVED' ? r.setBy.person.displayName : t('adminCal.by.unattributed')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Data>{formatDateTime(r.setAt)}</Data>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </section>
    </AppShellV2>
  );
};

export default AdminWorkingCalendar;
