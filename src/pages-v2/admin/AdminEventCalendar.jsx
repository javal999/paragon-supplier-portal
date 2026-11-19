/** @import React from 'react' */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import SampleDataBadge from '@components/ui-v2/SampleDataBadge';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { useRefusalText } from '@hooks/useRefusalText';
import { useToast } from '@hooks/useToast';
import { formatDate, formatDateTime } from '@lib/format';
import { useEventCalendarSet } from '@services/query/commandHooks';
import {
  MATERIAL_BUFFER_EVENTS,
  TYPHOON_WINDOW_DAYS,
  defaultTyphoonWindow,
  eventRefusal,
  isCalendarDate
} from '@services/transitions/eventCalendarRules';
/** @import { MaterialBufferEventKind } from '@services/transitions/eventCalendarRules' */
import { eventCalendarStore } from '@services/transitions/eventCalendarStore';
import AdminSectionNav from './AdminSectionNav';

// ─────────────────────────────────────────────────────────────────────────────
// ADMINISTRATION · EVENT CALENDAR — PSC-4 BR-07 (BL-339), REQUIREMENTS §PSC-4.
//
// The CNY and Typhoon windows that switch the Material Buffer on. ADM
// maintains it; the planner overrides the switch per material, with a reason,
// on Safety stock targets.
//
//   · The Typhoon form offers LANDFALL and defaults the window to the 14 days
//     before it (BL-332); either end can still be set by hand.
//   · ONE form, and it is the only entrance to `t_eventcalendar_set`. A seat
//     without `eventcalendar:set` reads every window and is told whose act it
//     is — the wait, never a missing button (§84, §72).
//   · The seed is SAMPLE DATA: there is no feed, and the page says so.
//   · BR-10 — a window moves ROP Order only; the change is recorded with the
//     figure's stored inputs and rules version (DRC-D16), never a DA version.
// ─────────────────────────────────────────────────────────────────────────────

const INPUT_CLASS = 'w-full mt-1 px-3 py-2 text-sm border border-border-subtle rounded-md bg-white';

/** @typedef {{ kind: MaterialBufferEventKind; startsOn: string; endsOn: string; landfall: string; reason: string }} Draft */

/** @returns {Draft} */
const emptyDraft = () => ({ kind: 'CNY', startsOn: '', endsOn: '', landfall: '', reason: '' });

/** @type {React.FC} */
const AdminEventCalendar = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const setWindow = useEventCalendarSet();
  const availability = useVerbAvailability('eventcalendar:set');
  const held = availability.kind === 'held';
  const [draft, setDraft] = useState(/** @type {Draft} */ (emptyDraft()));
  const [, setTick] = useState(0);
  const rows = eventCalendarStore.inForce();

  /** A Typhoon draft reads its landfall into the default window (BL-332). */
  const typhoonWindow =
    draft.kind === 'Typhoon' && isCalendarDate(draft.landfall)
      ? defaultTyphoonWindow(draft.landfall)
      : null;
  const startsOn = draft.kind === 'Typhoon' ? (typhoonWindow?.startsOn ?? '') : draft.startsOn;
  const endsOn = draft.kind === 'Typhoon' ? (typhoonWindow?.endsOn ?? '') : draft.endsOn;
  const refusal = eventRefusal({ kind: draft.kind, startsOn, endsOn, reason: draft.reason });

  /** @param {React.FormEvent} e */
  const submit = async (e) => {
    e.preventDefault();
    if (refusal !== null) return;
    const result = await setWindow.mutateAsync({
      kind: draft.kind,
      startsOn,
      endsOn,
      reason: draft.reason
    });
    if (result.status === 'failed') {
      toast({
        variant: 'error',
        title:
          refusalText(result.reason) ?? t('eventCal.toast.refused', { reason: result.reason ?? '' })
      });
      return;
    }
    toast({
      variant: 'success',
      title: t('eventCal.toast.saved', { kind: t(`eventCal.kind.${draft.kind}`) })
    });
    setDraft(emptyDraft());
    setTick((n) => n + 1);
  };

  const CRUMB = [t('eventCal.crumb.administration'), t('eventCal.crumb.eventCalendar')];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('eventCal.title')}
        subtitle={t('eventCal.subtitle')}
      />
      <AdminSectionNav />

      <section
        className="mb-5 rounded-lg border border-border-subtle bg-bg-hover p-4"
        data-testid="event-cal-note"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">{t('eventCal.note.title')}</h2>
          <SampleDataBadge />
        </div>
        <p className="text-xs text-text-secondary mt-1">{t('eventCal.intro')}</p>
      </section>

      {held ? (
        <section
          className="mb-5 rounded-lg border border-border-subtle bg-white p-5 shadow-sm"
          data-testid="event-cal-form"
        >
          <h2 className="text-section text-text-primary">{t('eventCal.form.title')}</h2>
          <p className="text-xs text-text-secondary mt-1 mb-3">{t('eventCal.form.intro')}</p>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <div className="grid grid-cols-1 sm:grid-cols-[160px_180px_180px_1fr] gap-3">
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('eventCal.form.kind')}
                </span>
                <select
                  className={INPUT_CLASS}
                  data-testid="event-cal-kind"
                  value={draft.kind}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      kind: /** @type {MaterialBufferEventKind} */ (e.target.value)
                    }))
                  }
                >
                  {MATERIAL_BUFFER_EVENTS.map((k) => (
                    <option key={k} value={k}>
                      {t(`eventCal.kind.${k}`)}
                    </option>
                  ))}
                </select>
              </label>
              {draft.kind === 'Typhoon' ? (
                <label className="block">
                  <span className="text-label text-text-tertiary uppercase">
                    {t('eventCal.form.landfall')}
                  </span>
                  <input
                    type="date"
                    className={`${INPUT_CLASS} font-mono`}
                    data-testid="event-cal-landfall"
                    value={draft.landfall}
                    onChange={(e) => setDraft((d) => ({ ...d, landfall: e.target.value }))}
                  />
                  <span className="block text-xs text-text-tertiary mt-1">
                    {t('eventCal.form.landfallHint', { days: TYPHOON_WINDOW_DAYS })}
                  </span>
                </label>
              ) : null}
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('eventCal.form.from')}
                </span>
                <input
                  type="date"
                  className={`${INPUT_CLASS} font-mono`}
                  data-testid="event-cal-from"
                  value={startsOn}
                  onChange={(e) => setDraft((d) => ({ ...d, startsOn: e.target.value }))}
                  readOnly={draft.kind === 'Typhoon'}
                />
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('eventCal.form.to')}
                </span>
                <input
                  type="date"
                  className={`${INPUT_CLASS} font-mono`}
                  data-testid="event-cal-to"
                  value={endsOn}
                  onChange={(e) => setDraft((d) => ({ ...d, endsOn: e.target.value }))}
                  readOnly={draft.kind === 'Typhoon'}
                />
              </label>
              <label className="block">
                <span className="text-label text-text-tertiary uppercase">
                  {t('eventCal.form.reason')}
                </span>
                <input
                  className={INPUT_CLASS}
                  data-testid="event-cal-reason"
                  value={draft.reason}
                  onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
                  required
                />
              </label>
            </div>
            {refusal !== null && draft.reason !== '' ? (
              <p className="text-xs text-warning-hover" data-testid="event-cal-refusal">
                {refusal}
              </p>
            ) : null}
            <p className="text-xs text-text-tertiary" data-testid="event-cal-attribution">
              {t('eventCal.form.attribution')}
            </p>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={refusal !== null || setWindow.isPending}
                data-testid="event-cal-submit"
              >
                {t('eventCal.form.submit')}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setDraft(emptyDraft())}>
                {t('eventCal.form.cancel')}
              </Button>
            </div>
          </form>
        </section>
      ) : (
        <section
          className="mb-5 border border-border-subtle rounded-lg bg-bg-hover p-4 flex gap-3"
          data-testid="event-cal-gate"
        >
          <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {t('eventCal.gate.title')}
              </span>
              <HandoffNotice availability={availability} testId="handoff-event-calendar" />
            </div>
            <p className="text-xs text-text-secondary mt-1">{t('eventCal.gate.body')}</p>
          </div>
        </section>
      )}

      <section data-testid="event-cal-list">
        <h2 className="text-section text-text-primary mb-3">{t('eventCal.list.title')}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-text-tertiary" data-testid="event-cal-empty">
            {t('eventCal.list.empty')}
          </p>
        ) : (
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('eventCal.col.kind')}</TableHeaderCell>
                <TableHeaderCell>{t('eventCal.col.from')}</TableHeaderCell>
                <TableHeaderCell>{t('eventCal.col.to')}</TableHeaderCell>
                <TableHeaderCell>{t('eventCal.col.reason')}</TableHeaderCell>
                <TableHeaderCell>{t('eventCal.col.by')}</TableHeaderCell>
                <TableHeaderCell>{t('eventCal.col.at')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {rows.map((r) => (
                  <TableRow key={r.id} data-testid={`event-cal-row-${r.id}`}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {t(`eventCal.kind.${r.kind}`)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Data>{formatDate(r.startsOn)}</Data>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Data>{formatDate(r.endsOn)}</Data>
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">{r.reason}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {r.setBy.kind === 'RESOLVED'
                        ? r.setBy.person.displayName
                        : t('eventCal.by.unattributed')}
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

      {rows.length === 0 ? null : (
        <p className="text-xs text-text-tertiary mt-3 flex items-center gap-2">
          <AlertTriangle size={14} aria-hidden="true" />
          {t('eventCal.footnote')}
        </p>
      )}
    </AppShellV2>
  );
};

export default AdminEventCalendar;
