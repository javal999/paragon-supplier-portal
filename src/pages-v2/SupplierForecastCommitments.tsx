import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import {
  OrderNotFound,
  PoFilterBanner,
  usePoDrillFilter,
} from './orders/PoDrillFilter';
import { Download, Upload } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SampleDataBadge from '../components/ui-v2/SampleDataBadge';
import SubTabs from '../components/ui-v2/SubTabs';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import SupplierReliabilityPanel from './reliability/SupplierReliabilityPanel';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { formatDate, formatDateTime } from '../lib/format';
import { useCapacityPlans, useForecastCommitments, useForecastVersions } from '../services/query/hooks';
import { useToast } from '../hooks/useToast';
import {
  commitmentCapacityRefusal,
  horizonWeeks,
  periodCapacityCheck,
  type CommitmentCapacityRefusal,
  type PeriodCapacityCheck,
} from '../services/transitions/capacityRules';
import { LtpCheckPill } from './inventory/inventoryDisplay';
import { parseWorkbook } from '../services/sdc';
import type { CapacityReason, ForecastCommitmentLine } from '../services/data/types';
import type { ForecastStream } from '../services/sdc/types';
import { commitmentDeadlineWorkingDays } from '../services/transitions/forecastConfig';
import { useActiveReasonCodes, useReasonLabel } from './admin/reasonCodeDisplay';
import {
  commitmentTemplateCsv,
  deadlineState,
  forecastCsv,
  readCommitmentNumber,
  shortfallRefusal,
  validateCommitmentRows,
  type CommitmentRowRefusal,
} from '../services/transitions/forecastRules';
import { parseCsv } from '../services/transitions/inventoryRules';
import { inputClass, readFileText } from './inventory/inventoryDisplay';

import {
  CommitmentDeadline,
  CommitmentStatePill,
  GapCell,
  ZonePill,
  downloadText,
  forecastNow,
  lineRef,
  qtyText,
  useForecastRunner,
  usePeriodLabel,
} from './forecasts/forecastDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER FORECAST & COMMITMENTS — REQ-E06-01 (SUP) and REQ-E06-02.
//
// The supplier's own materials only (BR-07), per forecast stream: the current
// version with each period's zone, what changed since the previous version
// (BR-06), a spreadsheet download (AC-03), and the commitment per period —
// quantity and date for Firm and Trade-off, acknowledgement for Forecast
// (BR-08), pre-filled with the forecast quantity (BR-09), a starter reason
// below forecast (BR-04), and an optional upside. Commitments can also come
// from the spreadsheet template, checked row by row (BR-06). Opening a version
// records the view PTI sees. The verbs' policies decide; the form mirrors them.
//
// BL-133 (ENG-D18, ENG-D19) — capacity before the LTP. Commitments are
// SUBMITTED one period at a time with "Submit all", every material of the
// period together (a row keeps only Save draft). A period cannot be submitted
// until the supplier has confirmed capacity for every horizon week it touches,
// and a period whose group LTP is above BE (capacity + extra capacity) needs a
// reason. The submit verb's policy (`rr_promote_capacity_confirmed`) refuses
// both by name; this panel mirrors it so the supplier sees why before trying.
// ─────────────────────────────────────────────────────────────────────────────

type ViewMode = 'forecast' | 'changes';

interface RowDraft {
  qty: string;
  date: string;
  upside: string;
  reason: CapacityReason | '';
  note: string;
}

const draftOf = (l: ForecastCommitmentLine): RowDraft => {
  const src = l.draft ?? l.response;
  const c = src?.forecastConfirmation;
  return {
    qty: String(c?.confirmedQty ?? l.forecastQty),
    date: c?.committedDate ?? l.periodStart,
    upside: c?.upsideQty !== undefined ? String(c.upsideQty) : '',
    reason: (src?.rootCause?.level1 as CapacityReason | undefined) ?? '',
    note: src?.rootCause?.note ?? '',
  };
};

interface WeekReason {
  reason: CapacityReason | '';
  note: string;
}

type PeriodRefusal =
  | { kind: CommitmentCapacityRefusal; group: string }
  | { kind: 'row' }
  | { kind: 'nothing' };

interface UploadResult {
  saved: number;
  refused: { row: number; materialCode: string; period: string; reason?: CommitmentRowRefusal; message?: string }[];
}

const SupplierForecastCommitments: React.FC = () => {
  const { t, i18n } = useTranslation();
  // BL-32 — the administrator's list in force: only active codes are offered.
  const commitmentReasons = useActiveReasonCodes('commitmentShortfall');
  const reasonLabel = useReasonLabel();
  const { identity } = useCurrentIdentity();
  const [params] = useSearchParams();
  const linesQuery = useForecastCommitments();
  const plansQuery = useCapacityPlans();
  const { toast } = useToast();
  const [weekReasons, setWeekReasons] = useState<Record<string, WeekReason>>({});
  const versionsQuery = useForecastVersions();
  const submitAvail = useVerbAvailability('requirementresponse:submit');
  const ackAvail = useVerbAvailability('requirementresponse:acknowledge');
  const viewAvail = useVerbAvailability('forecast:view');
  const { run, pending } = useForecastRunner();
  const periodLabel = usePeriodLabel();
  const nowIso = forecastNow();
  const crumb = [t('hub.nav.section.planning'), t('fc.sup.title')];

  // REQ-E07-03 BR-05 — a PO's foresight destination is its supplier's own
  // commitments for that PO's materials. A supplier addressing another
  // supplier's PO gets `notFound`: its PO read never returned it (BR-06).
  const drill = usePoDrillFilter();
  const drillMaterials = drill.kind === 'filtered' ? drill.materials : null;
  const [stream, setStream] = useState<ForecastStream | null>(null);
  const [mode, setMode] = useState<ViewMode>('forecast');
  const [material, setMaterial] = useState<string>(params.get('material') ?? '');
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorded = useRef<Set<string>>(new Set());

  const lines = useMemo(() => linesQuery.data?.items ?? [], [linesQuery.data]);
  const versions = useMemo(() => versionsQuery.data?.items ?? [], [versionsQuery.data]);
  const streams = [...new Set(lines.map((l) => l.stream))];
  const activeStream: ForecastStream | null =
    stream && streams.includes(stream)
      ? stream
      : (lines.find((l) => l.materialCode === material)?.stream ?? streams[0] ?? null);
  const streamLines = lines.filter((l) => l.stream === activeStream);
  const current = versions.find((v) => v.stream === activeStream && v.isCurrent) ?? null;
  const previous = current ? (versions.find((v) => v.stream === activeStream && v.version === current.version - 1) ?? null) : null;
  const supplierId = identity.supplierId;

  // REQ-E06-01 — opening a version is recorded once, for PTI to see who viewed it.
  useEffect(() => {
    if (!current || !supplierId || viewAvail.kind !== 'held') return;
    const mine = current.suppliers.find((s) => s.supplierId === supplierId);
    if (!mine || mine.viewedAt !== null || recorded.current.has(current.publicationId)) return;
    recorded.current.add(current.publicationId);
    void run({ verb: 'recordView', publicationId: current.publicationId, supplierId });
  }, [current?.publicationId, supplierId, viewAvail.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!supplierId) return <NoSupplierIdentity />;
  if (linesQuery.isPending || versionsQuery.isPending || plansQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (drill.kind === 'pending') return <LoadingState breadcrumb={crumb} />;
  // AC-07 / AC-08 — identical refusal for an unknown PO and another supplier's.
  if (drill.kind === 'notFound') return <OrderNotFound persona="supplier" breadcrumb={crumb} />;
  if (linesQuery.isError)
    return <ErrorState breadcrumb={crumb} error={linesQuery.error} onRetry={() => linesQuery.refetch()} />;
  if (lines.length === 0 || !activeStream)
    return <EmptyState breadcrumb={crumb} title={t('fc.sup.title')} subtitle={t('fc.sup.subtitle')} message={t('fc.sup.empty')} />;

  const materials = [...new Set(streamLines.map((l) => l.materialCode))];
  const shownMaterials = materials
    .filter((m) => material === '' || !materials.includes(material) || m === material)
    // A PO spanning several materials narrows to all of them at once.
    .filter((m) => drillMaterials === null || drillMaterials.length === 0 || drillMaterials.includes(m));
  const rowDraft = (l: ForecastCommitmentLine) => drafts[l.key] ?? draftOf(l);
  const setRow = (l: ForecastCommitmentLine, patch: Partial<RowDraft>) =>
    setDrafts((prev) => ({ ...prev, [l.key]: { ...rowDraft(l), ...patch } }));
  const overdue = streamLines.filter((l) => deadlineState(l, nowIso) === 'overdue').length;
  const awaiting = streamLines.filter((l) => l.state === 'awaiting' || l.state === 'revisionRequested').length;
  const changed = streamLines.filter((l) => l.previousQty !== null && l.previousQty !== l.forecastQty);
  const added = previous ? streamLines.filter((l) => l.previousQty === null) : [];
  const language = i18n.language.startsWith('id') ? 'id' : 'en';

  const readRow = (l: ForecastCommitmentLine) => {
    const d = rowDraft(l);
    const qty = readCommitmentNumber(d.qty);
    const upside = readCommitmentNumber(d.upside);
    const qtyValue = qty.ok ? qty.value : null;
    const refusal =
      qtyValue === null
        ? 'qtyRequired'
        : !upside.ok
          ? 'upsideInvalid'
          : !/^\d{4}-\d{2}-\d{2}$/.test(d.date)
            ? 'dateRequired'
            : shortfallRefusal(l.forecastQty, qtyValue, d.reason ? { level1: d.reason, note: d.note } : undefined);
    return { d, qtyValue, upsideValue: upside.ok ? upside.value : null, refusal };
  };

  const commitRow = async (l: ForecastCommitmentLine, draftOnly: boolean) => {
    const { d, qtyValue, upsideValue } = readRow(l);
    if (qtyValue === null) return;
    const res = await run(
      {
        verb: 'commit',
        line: lineRef(l),
        committedQty: qtyValue,
        commitmentDate: d.date,
        ...(upsideValue !== null ? { upsideQty: upsideValue } : {}),
        ...(qtyValue < l.forecastQty && d.reason ? { reason: d.reason, ...(d.note.trim() ? { note: d.note.trim() } : {}) } : {}),
        draftOnly,
      },
      t(draftOnly ? 'fc.sup.toast.drafted' : 'fc.sup.toast.submitted'),
    );
    if (res.ok) setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== l.key)));
  };

  const acknowledge = (l: ForecastCommitmentLine) =>
    void run({ verb: 'acknowledge', line: lineRef(l) }, t('fc.sup.toast.acknowledged'));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setFileError(null);
    setUpload(null);
    let rows: Record<string, string>[];
    if (file.name.toLowerCase().endsWith('.xlsx')) {
      const book = await parseWorkbook(file);
      if (!book.ok) {
        setFileError(t('fc.upload.error.unreadable'));
        setBusy(false);
        return;
      }
      rows = [...book.rows];
    } else {
      rows = parseCsv(await readFileText(file)).rows;
    }
    if (rows.length === 0) {
      setFileError(t('fc.upload.error.empty'));
      setBusy(false);
      return;
    }
    const checked = validateCommitmentRows(rows, streamLines);
    const out: UploadResult = { saved: 0, refused: checked.refused.map((r) => ({ ...r })) };
    for (const draft of checked.accepted) {
      const res =
        draft.kind === 'acknowledge'
          ? await run({ verb: 'acknowledge', line: lineRef(draft.line), ...(draft.note ? { note: draft.note } : {}) })
          : await run({
              verb: 'commit',
              line: lineRef(draft.line),
              committedQty: draft.committedQty,
              commitmentDate: draft.commitmentDate,
              ...(draft.upsideQty !== undefined ? { upsideQty: draft.upsideQty } : {}),
              ...(draft.reason ? { reason: draft.reason, ...(draft.note ? { note: draft.note } : {}) } : {}),
            });
      if (res.ok) out.saved += 1;
      else out.refused.push({ row: draft.row, materialCode: draft.line.materialCode, period: draft.line.periodBucket, message: res.reason });
    }
    out.refused.sort((a, b) => a.row - b.row);
    setUpload(out);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const canCommit = submitAvail.kind === 'held';
  const canAck = ackAvail.kind === 'held';

  // ── BL-133 — Submit all, one period at a time ────────────────────────────
  const plans = plansQuery.data?.items ?? [];
  const horizon = horizonWeeks(nowIso);
  const commitLines = streamLines.filter((l) => l.zone !== 'forecast');
  /** A line the period's Submit all sends: awaiting, sent back, drafted, or edited here. */
  const isPending = (l: ForecastCommitmentLine) =>
    l.state === 'awaiting' || l.state === 'revisionRequested' || l.draft !== null || drafts[l.key] !== undefined;
  const periodFirsts = [...new Map(commitLines.map((l) => [l.periodBucket, l])).values()].sort((a, b) =>
    a.periodStart.localeCompare(b.periodStart),
  );
  const periodRows = periodFirsts.map((first) => {
    const bucket = first.periodBucket;
    const all = commitLines.filter((l) => l.periodBucket === bucket);
    const pending = all.filter(isPending);
    const groups = [...new Set(all.map((l) => l.materialGroup))].sort();
    const checks: { group: string; check: PeriodCapacityCheck }[] = groups.map((group) => ({
      group,
      check: periodCapacityCheck(
        plans.find((p) => p.supplierId === supplierId && p.materialGroup === group) ?? null,
        lines,
        supplierId,
        group,
        first.periodStart,
        first.periodEnd,
        horizon,
      ),
    }));
    const red = checks.some((c) => c.check.redWeek !== null);
    const wr = weekReasons[bucket] ?? { reason: '', note: '' };
    /** The row's own reason, else the period's reason when the period is above BE. */
    const rootFor = (l: ForecastCommitmentLine) => {
      const d = rowDraft(l);
      if (d.reason) return { level1: d.reason, note: d.note };
      if (red && wr.reason) return { level1: wr.reason, note: wr.note };
      return undefined;
    };
    const rowBlocked = (l: ForecastCommitmentLine) => {
      const r = readRow(l);
      if (r.qtyValue === null || r.refusal === 'upsideInvalid' || r.refusal === 'dateRequired' || r.refusal === 'qtyRequired') return true;
      return shortfallRefusal(l.forecastQty, r.qtyValue, rootFor(l)) !== null;
    };
    let refusal: PeriodRefusal | null = null;
    const unconfirmed = checks.find((c) => c.check.unconfirmedWeek !== null);
    if (pending.length === 0) refusal = { kind: 'nothing' };
    else if (unconfirmed) refusal = { kind: 'capacityNotConfirmed', group: unconfirmed.group };
    else {
      for (const l of pending) {
        const c = checks.find((x) => x.group === l.materialGroup)?.check;
        const capRefusal = c ? commitmentCapacityRefusal(c, rootFor(l)) : null;
        if (capRefusal) {
          refusal = { kind: capRefusal.refusal, group: l.materialGroup };
          break;
        }
      }
      if (!refusal && pending.some(rowBlocked)) refusal = { kind: 'row' };
    }
    return { first, bucket, pending, checks, red, wr, rootFor, refusal };
  });

  const submitAll = async (row: (typeof periodRows)[number]) => {
    let done = 0;
    for (const l of row.pending) {
      const { d, qtyValue, upsideValue } = readRow(l);
      if (qtyValue === null) continue;
      const rc = row.rootFor(l);
      const res = await run({
        verb: 'commit',
        line: lineRef(l),
        committedQty: qtyValue,
        commitmentDate: d.date,
        ...(upsideValue !== null ? { upsideQty: upsideValue } : {}),
        ...(rc ? { reason: rc.level1, ...(rc.note.trim() ? { note: rc.note.trim() } : {}) } : {}),
      });
      if (!res.ok) {
        toast({
          variant: 'warning',
          title: t('fc.toast.refused'),
          description: t('fc.sup.week.toast.partial', { done, total: row.pending.length, reason: res.reason ?? '' }),
        });
        return;
      }
      done += 1;
      setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== l.key)));
    }
    setWeekReasons((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== row.bucket)));
    toast({ variant: 'success', title: t('fc.sup.week.toast.submitted', { count: done }) });
  };

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={t('fc.sup.title')} subtitle={t('fc.sup.subtitle')} />
      <PageMetaLine className="-mt-6 mb-4">
        {t('fc.asOf')} <Data>{formatDate(nowIso)}</Data>
        <SampleDataBadge className="ml-3 align-middle" />
      </PageMetaLine>

      {/* REQ-E07-03 BR-04 / BR-05 — the filter, why these rows, and the way back. */}
      <PoFilterBanner drill={drill} persona="supplier" count={shownMaterials.length} reason="foresight" />

      {awaiting > 0 && (
        <div
          role="status"
          data-testid="fc-sup-banner"
          className={`${overdue > 0 ? 'bg-danger-soft border-danger text-danger' : 'bg-warning-soft border-warning text-warning-hover'} border-l-2 rounded px-4 py-3 mb-4 text-sm`}
        >
          {t('fc.sup.banner', { count: awaiting })}
          {overdue > 0 && ` ${t('fc.sup.bannerOverdue', { count: overdue })}`}
        </div>
      )}

      {streams.length > 1 && (
        <SubTabs<ForecastStream>
          options={streams.map((s) => ({ id: s, label: t(`fc.stream.${s}`) }))}
          value={activeStream}
          onChange={(s) => {
            setStream(s);
            setMaterial('');
          }}
          className="mb-4"
        />
      )}

      {current && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-4" data-testid="fc-sup-version">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-section text-text-primary">
                {t(`fc.stream.${activeStream}`)} · {t('fc.version', { version: current.version })}
                {current.emergency && (
                  <StatusPill variant="warning" className="ml-2 align-middle">
                    {t('fc.emergency')}
                  </StatusPill>
                )}
              </h2>
              <p className="text-sm text-text-secondary">
                {t('fc.publishedAt')} <Data>{formatDateTime(current.publishedAt)}</Data> · {t(`fc.cadence.${activeStream}`)}
                {previous && (
                  <>
                    {' '}
                    · {t('fc.previousVersion', { version: previous.version })} <Data>{formatDate(previous.publishedAt)}</Data>
                  </>
                )}
              </p>
              {current.changeNote && (
                <p className="text-sm text-text-secondary" data-testid="fc-sup-change-note">
                  {t('fc.changeNote')} {current.changeNote}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={Download}
                data-testid="fc-download-forecast"
                onClick={() =>
                  downloadText(
                    `forecast-${activeStream}-v${current.version}.csv`,
                    forecastCsv(
                      streamLines,
                      {
                        materialCode: t('fc.csv.materialCode'),
                        material: t('fc.csv.material'),
                        period: t('fc.csv.period'),
                        periodStart: t('fc.csv.periodStart'),
                        zone: t('fc.csv.zone'),
                        forecastQty: t('fc.csv.forecastQty'),
                        unit: t('fc.csv.unit'),
                        previousQty: t('fc.csv.previousQty'),
                        dueAt: t('fc.csv.dueAt'),
                      },
                      (z) => t(`fc.zone.${z}`),
                    ),
                  )
                }
              >
                {t('fc.sup.downloadForecast')}
              </Button>
              <Button
                variant="secondary"
                icon={Download}
                data-testid="fc-download-template"
                onClick={() => downloadText(`commitments-${activeStream}-v${current.version}.csv`, commitmentTemplateCsv(streamLines, language))}
              >
                {t('fc.upload.template')}
              </Button>
              {canCommit && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,text/csv"
                    className="hidden"
                    data-testid="fc-upload-file"
                    aria-label={t('fc.upload.choose')}
                    onChange={(e) => void handleFile(e.target.files?.[0])}
                  />
                  <Button variant="outline" icon={Upload} disabled={busy} onClick={() => fileRef.current?.click()}>
                    {t('fc.upload.choose')}
                  </Button>
                </>
              )}
            </div>
          </div>
          {busy && <p className="mt-3 text-sm text-text-tertiary">{t('fc.upload.checking')}</p>}
          {fileError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {fileError}
            </p>
          )}
          {upload && (
            <div className="mt-4 space-y-2" data-testid="fc-upload-result">
              <p className="text-sm text-text-primary" data-testid="fc-upload-saved">
                {t('fc.upload.saved', { count: upload.saved })}
              </p>
              {upload.refused.length > 0 && (
                <table className="w-full text-sm" data-testid="fc-upload-refused">
                  <thead>
                    <tr className="text-label text-text-tertiary uppercase">
                      <th className="text-left py-1">{t('fc.upload.col.row')}</th>
                      <th className="text-left py-1">{t('fc.col.material')}</th>
                      <th className="text-left py-1">{t('fc.col.period')}</th>
                      <th className="text-left py-1">{t('fc.upload.col.reason')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upload.refused.map((r, i) => (
                      <tr key={`${r.row}-${i}`} className="border-t border-border-subtle" data-testid={`fc-upload-refused-row-${r.row}`}>
                        <td className="py-1.5">
                          <Data>{r.row}</Data>
                        </td>
                        <td className="py-1.5">
                          <Data>{r.materialCode || '—'}</Data>
                        </td>
                        <td className="py-1.5">
                          <Data>{r.period || '—'}</Data>
                        </td>
                        <td className="py-1.5 text-text-secondary">{r.reason ? t(`fc.upload.reason.${r.reason}`) : r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      )}

      {/* REQ-E14-02 BR-07 — the supplier's own reliability and PTI's plan changes on its materials. */}
      <SupplierReliabilityPanel />

      {/* BL-133 (ENG-D19) — capacity before the LTP; one Submit all per period. */}
      {periodRows.length > 0 && (
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4" data-testid="fc-sup-weeks">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h2 className="text-section text-text-primary">{t('fc.sup.week.title')}</h2>
            <p className="text-xs text-text-tertiary mt-1">{t('fc.sup.week.help')}</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('fc.sup.week.col.period')}</TableHeaderCell>
                <TableHeaderCell>{t('fc.sup.week.col.lines')}</TableHeaderCell>
                <TableHeaderCell>{t('fc.sup.week.col.capacity')}</TableHeaderCell>
                <TableHeaderCell>{t('fc.sup.week.col.reason')}</TableHeaderCell>
                <TableHeaderCell>
                  <span className="sr-only">{t('fc.col.actions')}</span>
                </TableHeaderCell>
              </TableHeader>
              <tbody>
                {periodRows.map((row) => {
                  const label = periodLabel(row.bucket);
                  const setWr = (patch: Partial<WeekReason>) =>
                    setWeekReasons((prev) => ({ ...prev, [row.bucket]: { ...row.wr, ...patch } }));
                  return (
                    <TableRow
                      key={row.bucket}
                      data-testid={`fc-week-${row.bucket}`}
                      className={row.red ? 'bg-danger-soft' : ''}
                    >
                      <TableCell className="whitespace-nowrap">{label}</TableCell>
                      <TableCell>
                        {row.pending.length > 0 ? (
                          <span className="text-sm text-text-secondary">{t('fc.sup.week.lines', { count: row.pending.length })}</span>
                        ) : (
                          <span className="text-xs text-text-tertiary">{t('fc.sup.week.nothing')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {row.checks.map(({ group, check }) => (
                            <div key={group} className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-text-secondary">{t(`inv.group.${group}`)}</span>
                              {check.level === null ? (
                                <span className="text-text-tertiary">{t('fc.sup.week.outsideHorizon')}</span>
                              ) : (
                                <LtpCheckPill level={check.level} testId={`fc-week-check-${row.bucket}-${group}`} />
                              )}
                              {check.level === 'unconfirmed' && (
                                <Link to="/supplier/capacity" className="text-action-hover hover:underline">
                                  {t('fc.sup.week.confirmCapacity')}
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.red ? (
                          <div className="space-y-1 min-w-[160px]">
                            <select
                              aria-label={t('fc.sup.week.reasonFor', { period: label })}
                              className={inputClass}
                              disabled={!canCommit}
                              value={row.wr.reason}
                              onChange={(e) => setWr({ reason: e.target.value as CapacityReason | '' })}
                            >
                              <option value="">{t('fc.reason.select')}</option>
                              {commitmentReasons.map((r) => (
                                <option key={r} value={r}>
                                  {reasonLabel('commitmentShortfall', r)}
                                </option>
                              ))}
                            </select>
                            {row.wr.reason === 'other' && (
                              <input
                                aria-label={t('fc.sup.week.noteFor', { period: label })}
                                className={inputClass}
                                placeholder={t('fc.reason.notePlaceholder')}
                                disabled={!canCommit}
                                value={row.wr.note}
                                onChange={(e) => setWr({ note: e.target.value })}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canCommit ? (
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            <Button
                              variant="outline"
                              disabled={pending || row.refusal !== null}
                              onClick={() => void submitAll(row)}
                              aria-label={t('fc.sup.week.submitAllFor', { period: label })}
                              data-testid={`fc-week-submit-${row.bucket}`}
                            >
                              {t('fc.sup.week.submitAll')}
                            </Button>
                            {row.refusal && row.refusal.kind !== 'nothing' && (
                              <span role="status" className="text-xs text-warning-hover" data-testid={`fc-week-refusal-${row.bucket}`}>
                                {row.refusal.kind === 'row'
                                  ? t('fc.sup.week.refusal.row')
                                  : t(`fc.sup.week.refusal.${row.refusal.kind}`, { group: t(`inv.group.${row.refusal.group}`) })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <HandoffNotice availability={submitAvail} testId="handoff-forecast-commit-week" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <SubTabs<ViewMode>
          options={[
            { id: 'forecast', label: t('fc.sup.tab.forecast') },
            { id: 'changes', label: t('fc.sup.tab.changes'), count: changed.length + added.length },
          ]}
          value={mode}
          onChange={setMode}
        />
        <label className="text-sm text-text-secondary flex items-center gap-2">
          {t('fc.col.material')}
          <select className={`${inputClass} w-auto`} value={material} onChange={(e) => setMaterial(e.target.value)} data-testid="fc-material-filter">
            <option value="">{t('fc.allMaterials')}</option>
            {materials.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode === 'changes' ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto" data-testid="fc-changes">
          {!previous ? (
            <p className="text-sm text-text-tertiary py-8 text-center">{t('fc.changes.firstVersion')}</p>
          ) : changed.length + added.length === 0 ? (
            <p className="text-sm text-text-tertiary py-8 text-center">{t('fc.changes.none')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('fc.col.material')}</TableHeaderCell>
                <TableHeaderCell>{t('fc.col.period')}</TableHeaderCell>
                <TableHeaderCell>{t('fc.col.zone')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('fc.col.previous', { version: previous.version })}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('fc.col.current', { version: current?.version ?? '' })}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('fc.col.change')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {[...changed, ...added]
                  .filter((l) => shownMaterials.includes(l.materialCode))
                  .sort((a, b) => a.materialCode.localeCompare(b.materialCode) || a.periodStart.localeCompare(b.periodStart))
                  .map((l) => (
                    <TableRow key={l.key} data-testid={`fc-change-${l.materialCode}-${l.periodBucket}`}>
                      <TableCell>
                        <Data>{l.materialCode}</Data>
                      </TableCell>
                      <TableCell>{periodLabel(l.periodBucket)}</TableCell>
                      <TableCell>
                        <ZonePill zone={l.zone} />
                      </TableCell>
                      <TableCell className="text-right">
                        {l.previousQty === null ? <span className="text-xs text-text-tertiary">{t('fc.changes.new')}</span> : <Data>{qtyText(l.previousQty)}</Data>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Data>{qtyText(l.forecastQty)}</Data>
                      </TableCell>
                      <TableCell className="text-right">
                        {l.previousQty === null ? '—' : <Data>{`${l.forecastQty > l.previousQty ? '+' : ''}${qtyText(l.forecastQty - l.previousQty)}`}</Data>}
                      </TableCell>
                    </TableRow>
                  ))}
              </tbody>
            </Table>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {shownMaterials.map((code) => {
            const mine = streamLines.filter((l) => l.materialCode === code);
            const first = mine[0];
            return (
              <section key={code} className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm" data-testid={`fc-sup-material-${code}`}>
                <div className="px-4 py-3 border-b border-border-subtle">
                  <Data className="font-semibold">{code}</Data> <span className="text-sm text-text-primary">· {first.materialLabel}</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableHeaderCell>{t('fc.col.period')}</TableHeaderCell>
                      <TableHeaderCell>{t('fc.col.zone')}</TableHeaderCell>
                      <TableHeaderCell className="text-right">{t('fc.col.forecast', { uom: first.uom })}</TableHeaderCell>
                      <TableHeaderCell>
                        <span title={t('fc.col.dueRule', { firm: t('adminSet.unit.workingDays', { count: commitmentDeadlineWorkingDays().firm }), other: t('adminSet.unit.workingDays', { count: commitmentDeadlineWorkingDays().other }) })}>{t('fc.col.due')}</span>
                      </TableHeaderCell>
                      <TableHeaderCell>{t('fc.col.commitment', { uom: first.uom })}</TableHeaderCell>
                      <TableHeaderCell>{t('fc.col.date')}</TableHeaderCell>
                      <TableHeaderCell>{t('fc.col.upside', { uom: first.uom })}</TableHeaderCell>
                      <TableHeaderCell>{t('fc.col.reason')}</TableHeaderCell>
                      <TableHeaderCell>{t('fc.col.status')}</TableHeaderCell>
                      <TableHeaderCell>
                        <span className="sr-only">{t('fc.col.actions')}</span>
                      </TableHeaderCell>
                    </TableHeader>
                    <tbody>
                      {mine.map((l) => {
                        const label = periodLabel(l.periodBucket);
                        if (l.zone === 'forecast') {
                          return (
                            <TableRow key={l.key} data-testid={`fc-sup-row-${l.materialCode}-${l.periodBucket}`}>
                              <TableCell className="whitespace-nowrap">{label}</TableCell>
                              <TableCell>
                                <ZonePill zone={l.zone} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Data>{qtyText(l.forecastQty)}</Data>
                              </TableCell>
                              <TableCell>
                                <CommitmentDeadline line={l} nowIso={nowIso} testId={`fc-due-${l.materialCode}-${l.periodBucket}`} />
                              </TableCell>
                              <TableCell colSpan={4}>
                                <span className="text-xs text-text-tertiary">{t('fc.sup.ackOnly')}</span>
                              </TableCell>
                              <TableCell>
                                <CommitmentStatePill line={l} nowIso={nowIso} />
                              </TableCell>
                              <TableCell>
                                {l.state === 'awaiting' &&
                                  (canAck ? (
                                    <Button variant="outline" disabled={pending} onClick={() => acknowledge(l)} aria-label={t('fc.sup.acknowledgeFor', { period: label })}>
                                      {t('fc.sup.acknowledge')}
                                    </Button>
                                  ) : (
                                    <HandoffNotice availability={ackAvail} testId="handoff-forecast-acknowledge" />
                                  ))}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        const { d, qtyValue, refusal } = readRow(l);
                        const below = qtyValue !== null && qtyValue < l.forecastQty;
                        return (
                          <React.Fragment key={l.key}>
                            <TableRow data-testid={`fc-sup-row-${l.materialCode}-${l.periodBucket}`} className={below ? 'bg-warning-soft' : ''}>
                              <TableCell className="whitespace-nowrap">{label}</TableCell>
                              <TableCell>
                                <ZonePill zone={l.zone} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Data>{qtyText(l.forecastQty)}</Data>
                                {l.previousQty !== null && l.previousQty !== l.forecastQty && (
                                  <div className="text-xs text-text-tertiary">
                                    {t('fc.was')} <Data>{qtyText(l.previousQty)}</Data>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <CommitmentDeadline line={l} nowIso={nowIso} testId={`fc-due-${l.materialCode}-${l.periodBucket}`} />
                              </TableCell>
                              <TableCell>
                                <input
                                  aria-label={t('fc.sup.qtyFor', { period: label })}
                                  inputMode="decimal"
                                  className={`${inputClass} min-w-[110px]`}
                                  disabled={!canCommit}
                                  value={d.qty}
                                  onChange={(e) => setRow(l, { qty: e.target.value })}
                                />
                              </TableCell>
                              <TableCell>
                                <input
                                  aria-label={t('fc.sup.dateFor', { period: label })}
                                  type="date"
                                  className={inputClass}
                                  disabled={!canCommit}
                                  value={d.date}
                                  onChange={(e) => setRow(l, { date: e.target.value })}
                                />
                              </TableCell>
                              <TableCell>
                                <input
                                  aria-label={t('fc.sup.upsideFor', { period: label })}
                                  inputMode="decimal"
                                  className={`${inputClass} min-w-[90px]`}
                                  disabled={!canCommit}
                                  value={d.upside}
                                  onChange={(e) => setRow(l, { upside: e.target.value })}
                                />
                              </TableCell>
                              <TableCell>
                                {below ? (
                                  <div className="space-y-1 min-w-[160px]">
                                    <select
                                      aria-label={t('fc.sup.reasonFor', { period: label })}
                                      className={inputClass}
                                      disabled={!canCommit}
                                      value={d.reason}
                                      onChange={(e) => setRow(l, { reason: e.target.value as CapacityReason | '' })}
                                    >
                                      <option value="">{t('fc.reason.select')}</option>
                                      {commitmentReasons.map((r) => (
                                        <option key={r} value={r}>
                                          {reasonLabel('commitmentShortfall', r)}
                                        </option>
                                      ))}
                                    </select>
                                    {d.reason === 'other' && (
                                      <input
                                        aria-label={t('fc.sup.noteFor', { period: label })}
                                        className={inputClass}
                                        placeholder={t('fc.reason.notePlaceholder')}
                                        disabled={!canCommit}
                                        value={d.note}
                                        onChange={(e) => setRow(l, { note: e.target.value })}
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-tertiary">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <CommitmentStatePill line={l} nowIso={nowIso} />
                                  {l.draft && <div className="text-xs text-text-tertiary">{t('fc.sup.draftSaved')}</div>}
                                  <GapCell line={l} />
                                </div>
                              </TableCell>
                              <TableCell>
                                {canCommit ? (
                                  <div className="flex flex-col gap-1 min-w-[120px]">
                                    <Button
                                      variant="secondary"
                                      disabled={pending || qtyValue === null}
                                      onClick={() => void commitRow(l, true)}
                                      aria-label={t('fc.sup.draftFor', { period: label })}
                                    >
                                      {t('fc.sup.saveDraft')}
                                    </Button>
                                    {refusal && (
                                      <span role="status" className="text-xs text-warning-hover">
                                        {t(`fc.sup.refusal.${refusal}`)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <HandoffNotice availability={submitAvail} testId="handoff-forecast-commit" />
                                )}
                              </TableCell>
                            </TableRow>
                            {l.log.length > 0 && (
                              <tr className="border-t border-border-subtle" data-testid={`fc-sup-log-${l.materialCode}-${l.periodBucket}`}>
                                <td colSpan={10} className="px-4 py-2 text-xs text-text-secondary">
                                  {l.log.map((e, i) => (
                                    <div key={i}>
                                      <span className="font-semibold">{t(e.kind === 'raised' ? 'fc.log.revision' : 'fc.log.resolved')}</span>{' '}
                                      <Data>{formatDateTime(e.at)}</Data> — {e.text}
                                    </div>
                                  ))}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-sm">
        <Link to="/supplier/forecasts/responses" className="text-action-hover hover:underline">
          {t('fc.sup.earlierResponses')}
        </Link>
      </p>
    </AppShellV2>
  );
};

export default SupplierForecastCommitments;
