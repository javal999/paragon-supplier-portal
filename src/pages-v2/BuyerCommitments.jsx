/** @import React from 'react' */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReasonLabel } from './admin/reasonCodeDisplay';
import { Link, useSearchParams } from 'react-router-dom';
import { OrderNotFound, PoFilterBanner, usePoDrillFilter } from './orders/PoDrillFilter';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import SubTabs from '@components/ui-v2/SubTabs';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import SidePanel from '@components/ui-v2/SidePanel';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import PurposeHeader from '@components/forecast/PurposeHeader';
import CycleSteps from '@components/forecast/CycleSteps';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import TermTip from '@components/forecast/TermTip';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDateTime } from '@lib/format';
import { CHART_SERIES } from '@lib/chartPalette';
import { useForecastCommitments, useForecastCoverage, useInventory } from '@services/query/hooks';
/** @import { ForecastCommitmentLine } from '@services/data/types' */
/** @import { ForecastStream } from '@services/sdc/types' */
import { positionDays } from '@services/transitions/inventoryRules';
import {
  commitmentGap,
  cumulativeCommitment,
  deadlineState,
  rankExceptions
} from '@services/transitions/forecastRules';
import { inputClass, labelClass } from './inventory/inventoryDisplay';
import {
  commitmentDeadlineWorkingDays,
  gapColourThresholds
} from '@services/transitions/forecastConfig';
import { coverageThresholds } from '@services/transitions/inventoryConfig';
import {
  CommitmentDeadline,
  CommitmentStatePill,
  GapCell,
  ZonePill,
  forecastNow,
  pctText,
  qtyText,
  useForecastRunner,
  usePeriodLabel
} from './forecasts/forecastDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// PTI COMMITMENTS & GAPS — REQ-E06-03 (with REQ-E06-02 from the planner's side).
//
// Per stream: a ranked exception list (overdue first, then Firm, then lowest
// days of supply — BR-04) with the planner's three actions (accept, request
// revision with a note the supplier reads, move the period's demand to another
// qualified supplier with a note — BR-05); the material × period grid of
// commitment against forecast coloured per CR-22 (BR-01, BR-02); cumulative
// commitment against cumulative forecast per material (BR-03); and supplier
// coverage per material with distributor lead times, labelled an estimate
// (BR-07). Commitments within tolerance need no action (REQ-E06-02 BR-05), and
// drafts never appear (BR-10). The supplier follow-up list stays available.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {{ kind: 'accept' | 'revise' | 'reassign'; line: ForecastCommitmentLine }} Action */

/**
 * A threshold held as a fraction, shown as a percentage without rounding it away.
 * @param {number} ratio
 * @returns {string}
 */
const thresholdPct = (ratio) => String(Math.round(ratio * 100_000) / 1000);

/** @type {React.FC} */
const BuyerCommitments = () => {
  const { t, i18n } = useTranslation();
  const reasonLabel = useReasonLabel();
  // BL-32 — the rule texts state the administrator's values in force, never a
  // number written into the sentence.
  const dueDays = commitmentDeadlineWorkingDays();
  const dueRule = t('fc.col.dueRule', {
    firm: t('adminSet.unit.workingDays', { count: dueDays.firm }),
    other: t('adminSet.unit.workingDays', { count: dueDays.other })
  });
  /**
   * @param {number} n
   * @returns {string}
   */
  const ratioText = (n) =>
    n.toLocaleString(i18n.language === 'id' ? 'id-ID' : 'en-GB', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 3
    });
  const [params] = useSearchParams();
  const linesQuery = useForecastCommitments();
  const coverageQuery = useForecastCoverage();
  const inventory = useInventory();
  const review = useVerbAvailability('requirementresponse:dispute');
  const publish = useVerbAvailability('forecast:publish');
  const { run, pending } = useForecastRunner();
  const periodLabel = usePeriodLabel();
  const nowIso = forecastNow();
  const crumb = forecastCrumb(t, 'responses');

  // ── REQ-E07-03 BR-05 / AC-04 ──────────────────────────────────────────────
  // Foresight is agreed per material and period, not per order, so a PO's
  // destination is its SUPPLIER and its MATERIALS. The `material` parameter this
  // page already read is the singular case of that; `materials` carries the rest
  // when a PO spans several.
  const drill = usePoDrillFilter();
  const drillMaterials = drill.kind === 'filtered' ? drill.materials : null;
  const [stream, setStream] = useState(/** @type {ForecastStream | null} */ (null));
  const [supplier, setSupplier] = useState(drill.kind === 'filtered' ? drill.po.supplierId : '');
  const [material, setMaterial] = useState(params.get('material') ?? '');
  const [action, setAction] = useState(/** @type {Action | null} */ (null));
  const [note, setNote] = useState('');
  const [toSupplier, setToSupplier] = useState('');

  const lines = useMemo(() => linesQuery.data?.items ?? [], [linesQuery.data]);

  if (linesQuery.isPending || drill.kind === 'pending') return <LoadingState breadcrumb={crumb} />;
  // AC-08 — an address naming a PO that does not exist, with a way back.
  if (drill.kind === 'notFound') return <OrderNotFound persona="buyer" breadcrumb={crumb} />;
  if (linesQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={linesQuery.error}
        onRetry={() => linesQuery.refetch()}
      />
    );

  /** @type {ForecastStream} */
  const activeStream =
    stream ?? lines.find((l) => l.materialCode === material)?.stream ?? 'packaging';
  const streamLines = lines.filter((l) => l.stream === activeStream);
  const suppliers = [...new Map(streamLines.map((l) => [l.supplierId, l.supplierName])).entries()];
  const materials = [...new Set(streamLines.map((l) => l.materialCode))];
  const shown = streamLines.filter(
    (l) =>
      (supplier === '' || l.supplierId === supplier) &&
      (material === '' || !materials.includes(material) || l.materialCode === material) &&
      // A PO spanning several materials narrows to all of them at once.
      (drillMaterials === null ||
        drillMaterials.length === 0 ||
        drillMaterials.includes(l.materialCode))
  );

  // CR-01 — the lowest days of supply across the material's positions.
  const positions = inventory.data?.items ?? [];
  /**
   * @param {string} code
   * @returns {number | null}
   */
  const daysOfSupplyOf = (code) => {
    const days = positions
      .filter((p) => p.materialCode === code)
      .map(positionDays)
      .filter(/** @returns {d is number} */ (d) => d !== null);
    return days.length > 0 ? Math.min(...days) : null;
  };
  const exceptions = rankExceptions(shown, nowIso, daysOfSupplyOf);
  const missing = streamLines.filter((l) => deadlineState(l, nowIso) === 'overdue').length;
  const outside = streamLines.filter((l) => l.state === 'exception').length;
  const periods = [...new Map(shown.map((l) => [l.periodBucket, l.periodStart])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1])
  );
  const rows = [...new Map(shown.map((l) => [`${l.supplierId}|${l.materialCode}`, l])).values()];
  const coverage = (coverageQuery.data?.items ?? []).filter(
    (c) =>
      c.stream === activeStream &&
      (supplier === '' || c.supplierId === supplier) &&
      (material === '' || !materials.includes(material) || c.materialCode === material)
  );

  /**
   * @param {Action['kind']} kind
   * @param {ForecastCommitmentLine} line
   */
  const openAction = (kind, line) => {
    setAction({ kind, line });
    setNote('');
    setToSupplier('');
  };

  const submitAction = async () => {
    if (!action) return;
    const { kind, line } = action;
    const res =
      kind === 'accept'
        ? await run(
            {
              verb: 'accept',
              responseId: /** @type {import('../services/sdc/types').RequirementResponse} */ (
                line.response
              ).id,
              status: /** @type {import('../services/sdc/types').RequirementResponse} */ (
                line.response
              ).status
            },
            t('fc.pti.gaps.toast.accepted')
          )
        : kind === 'revise'
          ? await run(
              {
                verb: 'requestRevision',
                responseId: /** @type {import('../services/sdc/types').RequirementResponse} */ (
                  line.response
                ).id,
                status: /** @type {import('../services/sdc/types').RequirementResponse} */ (
                  line.response
                ).status,
                note
              },
              t('fc.pti.gaps.toast.revision')
            )
          : await run(
              {
                verb: 'reassign',
                publicationId: line.publicationId,
                materialCode: line.materialCode,
                periodBucket: line.periodBucket,
                fromSupplierId: line.supplierId,
                toSupplierId: toSupplier,
                note
              },
              t('fc.pti.gaps.toast.reassigned')
            );
    if (res.ok) setAction(null);
  };

  /**
   * @param {string} supplierId
   * @param {string} code
   * @param {string} period
   */
  const cell = (supplierId, code, period) =>
    shown.find(
      (l) => l.supplierId === supplierId && l.materialCode === code && l.periodBucket === period
    );

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'responses')} />
      <PurposeHeader page="responses" />
      <CycleSteps current="responses" />
      <SimulatedDataBanner capability="forecastPublications" />
      <DataAsOf date={nowIso} />

      {(missing > 0 || outside > 0) && (
        <div
          role="status"
          data-testid="fc-pti-gaps-banner"
          className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-4 text-sm text-danger"
        >
          {t('fc.pti.gaps.banner', { exceptions: outside, missing })}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <SubTabs
          options={
            /** @type {ForecastStream[]} */ (['packaging', 'rawMaterial']).map((s) => ({
              id: s,
              label: t(`fc.stream.${s}`)
            }))
          }
          value={activeStream}
          onChange={(s) => {
            setStream(s);
            setSupplier('');
            setMaterial('');
          }}
        />
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-text-secondary flex items-center gap-2">
            {t('fc.col.supplier')}
            <select
              className={`${inputClass} w-auto`}
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              data-testid="fc-supplier-filter"
            >
              <option value="">{t('fc.allSuppliers')}</option>
              {suppliers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-text-secondary flex items-center gap-2">
            {t('fc.col.material')}
            <select
              className={`${inputClass} w-auto`}
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              data-testid="fc-material-filter"
            >
              <option value="">{t('fc.allMaterials')}</option>
              {materials.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <Link to="/buyer/chase" className="text-sm text-action-hover hover:underline self-center">
            {t('fc.pti.gaps.followUp')}
          </Link>
          <Link
            to="/buyer/collaboration/responses"
            className="text-sm text-action-hover hover:underline self-center"
          >
            {t('fc.pti.gaps.earlierResponses')}
          </Link>
        </div>
      </div>

      {/* REQ-E07-03 BR-04 / BR-05 — the filter, why these rows, and the way back. */}
      <PoFilterBanner drill={drill} persona="buyer" count={shown.length} reason="foresight" />

      {/* BR-04 / BR-05 — the ranked exception list and the planner's actions. */}
      <section className="mb-6" data-testid="fc-exceptions">
        <h2 className="text-section text-text-primary mb-2">
          {t('fc.pti.gaps.exceptions', { count: exceptions.length })}
        </h2>
        <p className="text-sm text-text-secondary mb-3">{t('fc.pti.gaps.exceptionsHint')}</p>
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>#</TableHeaderCell>
              <TableHeaderCell>{t('fc.col.supplier')}</TableHeaderCell>
              <TableHeaderCell>{t('fc.col.material')}</TableHeaderCell>
              <TableHeaderCell>{t('fc.col.period')}</TableHeaderCell>
              <TableHeaderCell>
                <span className="inline-flex items-center gap-1">
                  {t('fc.col.zone')} <TermTip term="Firm" /> <TermTip term="Trade-off" />
                </span>
              </TableHeaderCell>
              <TableHeaderCell className="text-right">{t('fc.col.forecastShort')}</TableHeaderCell>
              <TableHeaderCell className="text-right">
                {t('fc.col.commitmentShort')}
              </TableHeaderCell>
              <TableHeaderCell>{t('fc.col.gap')}</TableHeaderCell>
              <TableHeaderCell>{t('fc.col.status')}</TableHeaderCell>
              <TableHeaderCell>
                <span title={dueRule}>{t('fc.col.due')}</span>
              </TableHeaderCell>
              <TableHeaderCell>{t('fc.col.daysOfSupply')}</TableHeaderCell>
              <TableHeaderCell>{t('fc.col.actions')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {exceptions.map((l, i) => {
                const reason = l.response?.rootCause;
                const days = daysOfSupplyOf(l.materialCode);
                const label = `${l.supplierName} ${l.materialCode} ${periodLabel(l.periodBucket)}`;
                return (
                  <TableRow
                    key={l.key}
                    data-testid={`fc-exception-${l.supplierId}-${l.materialCode}-${l.periodBucket}`}
                  >
                    <TableCell>
                      <Data>{i + 1}</Data>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-text-primary">{l.supplierName}</div>
                    </TableCell>
                    <TableCell>
                      <Data>{l.materialCode}</Data>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {periodLabel(l.periodBucket)}
                    </TableCell>
                    <TableCell>
                      <ZonePill zone={l.zone} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Data>{qtyText(l.forecastQty)}</Data>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.committedQty !== null && l.state !== 'awaiting' ? (
                        <Data>{qtyText(l.committedQty)}</Data>
                      ) : (
                        '—'
                      )}
                      {reason && (
                        <div className="text-xs text-text-secondary ml-auto">
                          {reasonLabel('commitmentShortfall', reason.level1)}
                          {reason.note ? ` — ${reason.note}` : ''}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <GapCell line={l} />
                    </TableCell>
                    <TableCell>
                      <CommitmentStatePill line={l} nowIso={nowIso} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <CommitmentDeadline
                        line={l}
                        nowIso={nowIso}
                        testId={`fc-due-exception-${l.supplierId}-${l.materialCode}-${l.periodBucket}`}
                      />
                    </TableCell>
                    <TableCell>
                      {days === null ? (
                        '—'
                      ) : (
                        <Data>{t('fc.days', { count: Math.floor(days) })}</Data>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 min-w-[220px]">
                        {l.state === 'exception' &&
                          l.response &&
                          (review.kind === 'held' ? (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => openAction('accept', l)}
                                aria-label={t('fc.pti.gaps.acceptFor', { what: label })}
                              >
                                {t('fc.pti.gaps.accept')}
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => openAction('revise', l)}
                                aria-label={t('fc.pti.gaps.reviseFor', { what: label })}
                              >
                                {t('fc.pti.gaps.revise')}
                              </Button>
                            </>
                          ) : (
                            <HandoffNotice
                              availability={review}
                              testId="handoff-commitment-review"
                            />
                          ))}
                        {publish.kind === 'held' ? (
                          <Button
                            variant="secondary"
                            onClick={() => openAction('reassign', l)}
                            aria-label={t('fc.pti.gaps.reassignFor', { what: label })}
                          >
                            {t('fc.pti.gaps.reassign')}
                          </Button>
                        ) : (
                          <HandoffNotice
                            availability={publish}
                            testId="handoff-forecast-reassign"
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {exceptions.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center text-sm text-text-tertiary py-8">
                    {t('fc.pti.gaps.noExceptions')}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </section>

      {/* F-23 — the exceptions drive action; the grid and the cumulative chart
          are context, collapsed below them. Same data, same order inside. */}
      <details
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
        data-testid="fc-coverage-details"
      >
        <summary className="text-section text-text-primary cursor-pointer">
          {t('fc.pti.gaps.coverageDetails')}
        </summary>
        <p className="text-sm text-text-secondary mt-1 mb-4">
          {t('fc.pti.gaps.coverageDetailsHint')}
        </p>
        {/* BR-01 / BR-02 — the grid of commitment against forecast. */}
        <section className="mb-6" data-testid="fc-grid">
          <h2 className="text-section text-text-primary mb-2">{t('fc.pti.gaps.grid')}</h2>
          <p className="text-sm text-text-secondary mb-3">
            {t('fc.pti.gaps.gridHint', {
              green: thresholdPct(gapColourThresholds().greenFrom),
              amber: thresholdPct(gapColourThresholds().amberFrom)
            })}
          </p>
          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
            <table className="text-sm min-w-full">
              <thead>
                <tr className="bg-bg-hover text-label text-text-tertiary uppercase">
                  <th scope="col" className="text-left px-3 py-2 sticky left-0 bg-bg-hover">
                    {t('fc.col.supplierMaterial')}
                  </th>
                  {periods.map(([p]) => (
                    <th key={p} scope="col" className="text-left px-3 py-2 whitespace-nowrap">
                      {periodLabel(p)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={`${r.supplierId}|${r.materialCode}`}
                    className="border-t border-border-subtle"
                  >
                    <th
                      scope="row"
                      className="text-left px-3 py-2 sticky left-0 bg-bg-surface font-normal whitespace-nowrap"
                    >
                      <div className="text-text-primary">{r.supplierName}</div>
                      <Data className="text-xs">{r.materialCode}</Data>
                    </th>
                    {periods.map(([p]) => {
                      const l = cell(r.supplierId, r.materialCode, p);
                      if (!l)
                        return (
                          <td key={p} className="px-3 py-2 text-text-tertiary">
                            —
                          </td>
                        );
                      const committed =
                        l.committedQty !== null && l.state !== 'awaiting' && l.zone !== 'forecast';
                      const gap = committed
                        ? commitmentGap(
                            l.zone,
                            l.forecastQty,
                            /** @type {NonNullable<typeof l.committedQty>} */ (l.committedQty)
                          )
                        : null;
                      const tint = gap
                        ? gap.colour === 'green'
                          ? 'bg-success-soft'
                          : gap.colour === 'amber'
                            ? 'bg-warning-soft'
                            : 'bg-danger-soft'
                        : '';
                      return (
                        <td
                          key={p}
                          className={`px-3 py-2 align-top whitespace-nowrap ${tint}`}
                          data-testid={`fc-cell-${l.supplierId}-${l.materialCode}-${l.periodBucket}`}
                          data-colour={gap?.colour ?? 'none'}
                        >
                          <div>
                            <Data>
                              {committed
                                ? qtyText(
                                    /** @type {NonNullable<typeof l.committedQty>} */ (
                                      l.committedQty
                                    )
                                  )
                                : '—'}
                            </Data>
                            <span className="text-text-tertiary"> / </span>
                            <Data>{qtyText(l.forecastQty)}</Data>
                          </div>
                          <div className="text-xs text-text-secondary">
                            {t(`fc.zone.${l.zone}`)}
                            {gap && (
                              <>
                                {' · '}
                                <Data>{pctText(gap.pct)}</Data>
                                {gap.overCommit ? ` · ${t('fc.gap.overCommit')}` : ''}
                              </>
                            )}
                            {!gap && l.zone !== 'forecast' && ` · ${t('fc.state.awaiting')}`}
                            {l.zone === 'forecast' &&
                              l.state === 'acknowledged' &&
                              ` · ${t('fc.state.acknowledged')}`}
                          </div>
                          {/* CR-26 · BL-48 — time left or how late, per cell. */}
                          <CommitmentDeadline
                            line={l}
                            nowIso={nowIso}
                            compact
                            testId={`fc-due-cell-${l.supplierId}-${l.materialCode}-${l.periodBucket}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* BR-03 — cumulative commitment against cumulative forecast per material. */}
        <section className="mb-6" data-testid="fc-cumulative">
          <h2 className="text-section text-text-primary mb-2">{t('fc.pti.gaps.cumulative')}</h2>
          <p className="text-sm text-text-secondary mb-3">{t('fc.pti.gaps.cumulativeHint')}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {[...new Set(shown.map((l) => l.materialCode))].map((code) => {
              const series = cumulativeCommitment(shown.filter((l) => l.materialCode === code)).map(
                (p) => ({
                  ...p,
                  label: periodLabel(p.periodBucket)
                })
              );
              const last = series[series.length - 1];
              const behind =
                last && last.cumulativeForecast > 0
                  ? (last.cumulativeCommitment - last.cumulativeForecast) / last.cumulativeForecast
                  : 0;
              return (
                <div
                  key={code}
                  className="bg-bg-surface border border-border-subtle rounded-lg p-4"
                  data-testid={`fc-cumulative-${code}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <Data className="font-semibold">{code}</Data>
                    {last && (
                      <span
                        className="text-xs text-text-secondary"
                        data-testid={`fc-cumulative-summary-${code}`}
                      >
                        {t('fc.pti.gaps.cumulativeSummary', {
                          commit: qtyText(last.cumulativeCommitment),
                          forecast: qtyText(last.cumulativeForecast),
                          pct: pctText(behind),
                          period: last.label
                        })}
                      </span>
                    )}
                  </div>
                  {series.length > 0 ? (
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer>
                        <LineChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} width={64} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="cumulativeForecast"
                            name={t('fc.pti.gaps.cumForecast')}
                            stroke={CHART_SERIES[1]}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="cumulativeCommitment"
                            name={t('fc.pti.gaps.cumCommitment')}
                            stroke={CHART_SERIES[0]}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-text-tertiary">{t('fc.pti.gaps.cumulativeNone')}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </details>

      {/* BR-07 — supplier coverage per material (CR-03), an estimate. */}
      <section data-testid="fc-coverage">
        <h2 className="text-section text-text-primary mb-2">
          {t('fc.pti.gaps.coverage')}{' '}
          <StatusPill variant="neutral" className="align-middle">
            {t('fc.pti.gaps.estimate')}
          </StatusPill>
        </h2>
        <p className="text-sm text-text-secondary mb-3">
          {t('fc.pti.gaps.coverageHint', {
            covered: ratioText(coverageThresholds().coveredFrom),
            atRisk: ratioText(coverageThresholds().atRiskFrom)
          })}
        </p>
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('fc.col.material')}</TableHeaderCell>
              <TableHeaderCell>{t('fc.col.supplier')}</TableHeaderCell>
              <TableHeaderCell className="text-right">{t('fc.col.firmDemand')}</TableHeaderCell>
              <TableHeaderCell>{t('fc.col.coverage')}</TableHeaderCell>
              <TableHeaderCell>{t('fc.col.principalLeadTime')}</TableHeaderCell>
            </TableHeader>
            <tbody>
              {coverage.map((c) => (
                <TableRow
                  key={`${c.supplierId}|${c.materialCode}`}
                  data-testid={`fc-coverage-${c.supplierId}-${c.materialCode}`}
                >
                  <TableCell>
                    <Data>{c.materialCode}</Data>
                    <div className="text-xs text-text-secondary">{c.materialLabel}</div>
                  </TableCell>
                  <TableCell className="text-sm text-text-primary">{c.supplierName}</TableCell>
                  <TableCell className="text-right">
                    <Data>{`${qtyText(c.firmDemandQty)} ${c.uom}`}</Data>
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      variant={
                        c.status === 'covered'
                          ? 'success'
                          : c.status === 'atRisk'
                            ? 'warning'
                            : c.status === 'uncovered'
                              ? 'danger'
                              : 'neutral'
                      }
                    >
                      {t(`fc.coverage.${c.status}`)}
                      {c.ratio !== null && (
                        <>
                          {' · '}
                          <Data>{c.ratio.toFixed(2)}</Data>
                        </>
                      )}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.supplierType === 'distributor' ? (
                      <>
                        {t('fc.coverage.distributor', { days: c.principalLeadTimeDays ?? '—' })}
                        {c.unbridgeable && (
                          <StatusPill variant="danger" className="ml-2">
                            {t('fc.coverage.unbridgeable')}
                          </StatusPill>
                        )}
                      </>
                    ) : (
                      <span className="text-text-tertiary">{t('fc.coverage.manufacturer')}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {coverage.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-sm text-text-tertiary py-8">
                    {t('fc.pti.gaps.coverageNone')}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </section>

      <AboutThisPage>
        <p>{t('fc.pti.gaps.subtitle')}</p>
      </AboutThisPage>

      <SidePanel
        open={action !== null}
        onClose={() => setAction(null)}
        title={action ? t(`fc.pti.gaps.panel.${action.kind}`) : ''}
        footerActions={
          action ? (
            <Button
              variant="outline"
              data-testid="fc-action-submit"
              disabled={
                pending ||
                (action.kind !== 'accept' && note.trim() === '') ||
                (action.kind === 'reassign' && toSupplier === '')
              }
              onClick={() => void submitAction()}
            >
              {t(`fc.pti.gaps.panel.confirm.${action.kind}`)}
            </Button>
          ) : undefined
        }
      >
        {action && (
          <div className="space-y-3">
            <p className="text-sm text-text-primary">
              {action.line.supplierName} · <Data>{action.line.materialCode}</Data> ·{' '}
              {periodLabel(action.line.periodBucket)} · {t(`fc.zone.${action.line.zone}`)}
            </p>
            <p className="text-sm text-text-secondary">
              {t('fc.col.forecastShort')} <Data>{qtyText(action.line.forecastQty)}</Data>
              {action.line.committedQty !== null && action.line.state !== 'awaiting' && (
                <>
                  {' · '}
                  {t('fc.col.commitmentShort')} <Data>{qtyText(action.line.committedQty)}</Data>
                </>
              )}
            </p>
            {action.line.log.length > 0 && (
              <ul className="text-xs text-text-secondary space-y-1">
                {/* DisputeEntry has no id and `at` repeats (fixed simulated SDC
                    clock); text can repeat too. Rows are stateless text, so a
                    positional key cannot carry state to the wrong entry. */}
                {action.line.log.map((e, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- no identity field; read-only, stateless rows
                  <li key={i}>
                    <Data>{formatDateTime(e.at)}</Data> — {e.text}
                  </li>
                ))}
              </ul>
            )}
            {action.kind === 'accept' && (
              <p className="text-sm text-text-secondary">{t('fc.pti.gaps.panel.acceptHint')}</p>
            )}
            {action.kind === 'reassign' && (
              <div>
                <label htmlFor="fc-reassign-to" className={labelClass}>
                  {t('fc.pti.gaps.panel.toSupplier')}
                </label>
                <select
                  id="fc-reassign-to"
                  className={inputClass}
                  value={toSupplier}
                  onChange={(e) => setToSupplier(e.target.value)}
                >
                  <option value="">{t('fc.pti.gaps.panel.chooseSupplier')}</option>
                  {action.line.otherQualifiedSuppliers.map((q) => (
                    <option key={q.supplierId} value={q.supplierId}>
                      {q.supplierName}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-tertiary mt-1">
                  {t('fc.pti.gaps.panel.reassignHint')}
                </p>
              </div>
            )}
            {action.kind !== 'accept' && (
              <div>
                <label htmlFor="fc-action-note" className={labelClass}>
                  {t('fc.pti.gaps.panel.note')}
                </label>
                <textarea
                  id="fc-action-note"
                  rows={4}
                  className={inputClass}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <p className="text-xs text-text-tertiary mt-1">{t('fc.pti.gaps.panel.noteHint')}</p>
              </div>
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerCommitments;
