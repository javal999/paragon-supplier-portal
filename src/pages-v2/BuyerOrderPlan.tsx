import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import FilterChipsBar from '@components/ui-v2/FilterChipsBar';
import KpiCard from '@components/ui-v2/KpiCard';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import Button from '@components/ui-v2/Button';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { HandoffNotice } from '@components/ui-v2/HandoffNotice';
import DataHealthChip from '@components/forecast/DataHealthChip';
import PurposeHeader from '@components/forecast/PurposeHeader';
import CycleSteps from '@components/forecast/CycleSteps';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import WhyQuantityPanel from '@components/forecast/WhyQuantityPanel';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { useToast } from '@hooks/useToast';
import { useRefusalText } from '@hooks/useRefusalText';
import { useVerbAvailability } from '@hooks/useVerbAvailability';
import { formatDate, formatIDR, formatNumber } from '@lib/format';
import { CHART_AXIS, CHART_GRID, CHART_SEMANTIC, CHART_SERIES } from '@lib/chartPalette';
import { useOrderPlan, usePurchaseOrders } from '@services/query/hooks';
import { useCallOffCommand } from '@services/query/commandHooks';
import { CALL_OFF_PO_STATES } from '@services/transitions/callOffRules';
import type { MaterialOrderPlanView, WarehousePlanView } from '@services/data/types';
import type { Recommendation } from '@services/engine/orderSizing';
import type { WarehouseKind } from '@services/engine/types';
import { isoWeek } from '@services/engine/dates';
import { sdcClock } from '@services/sdc/clock';
import { isLive } from '@services/liveness';
import { qtyOf } from './materialPlan/planDisplay';
import { draftNeedDate, umbrellaLineFor } from './orderPlan/orderPlanRelease';

// ─────────────────────────────────────────────────────────────────────────────
// ORDER PLAN — REQ-E14-05, the Material Planner's view.
//
// A page of its own rather than a column on Material requirement: that page is
// one material's netting, week by week; this one is a WAREHOUSE's plan — every
// material sharing the space, the projected fill against owned capacity and the
// 80% standard, the rented space it costs, and why each order has its size.
// The two agree by construction: Material requirement nets on these orders.
//
// Per warehouse (ENG-D7: packaging and raw material are separate): the fill
// per week under this plan, under the interim round-up it replaces, and the
// lowest any plan could reach; rented pallets and their cost at the
// PLACEHOLDER rate (ENG-D6), labelled as such; each recommendation with the
// constraint that bound it and what it saved (BR-04), last week's plan for the
// same week (BR-03) and the method that sized it (BR-02 fallback marked).
//
// BR-05: a recommendation becomes a call-off only by the planner's act. The act
// here is the EXISTING draft verb on the supplier's open umbrella line
// (`orderPlanRelease.js`); release, with the umbrella-balance check, stays on
// the Call-offs page. A seat without `calloff:plan` sees who acts instead.
// The draft carries `origin: 'engine'`; while the engine dataset is not live the
// release verb refuses it (X-03, owner decision 2026-09-23), and this page says
// so beside the button rather than letting the planner find out on release.
//
// Edge case (BL-117): a week where no plan fits even with the most rented space
// the administrator allows is counted here, with a link to Make warehouse room,
// where the planner's decision for it is recorded (FUX-D3, F-10).
//
// FUX2 B3 (F-07, F-17): each recommended order opens a "Why this quantity"
// panel (`components/forecast/WhyQuantityPanel.tsx`) with its material's
// Material requirement and Safety stock figures and its sizing, so the planner
// sees why without leaving the page. The 2 full pages stay linked above.
//
// Every figure is computed by the forecast engine at read time on its
// SYNTHETIC dataset (the `engineDataset` pill, X-03).
// ─────────────────────────────────────────────────────────────────────────────

const weekLabel = (w: string) => `W${isoWeek(w)}`;
// Chart paint, from the palette (DP2-PALETTE-01).
const TOKEN_PLAN = CHART_SERIES[0];
const TOKEN_INTERIM = CHART_SERIES[3];
const TOKEN_LOWEST = CHART_SERIES[4];
const TOKEN_CAPACITY = CHART_SEMANTIC.danger;
const TOKEN_STANDARD = CHART_SEMANTIC.warning;
const pct = (x: number | null) => (x === null ? '—' : `${formatNumber(Math.round(x * 100))}%`);
const STANDARD = 0.8;

const FillChart: React.FC<{ w: WarehousePlanView }> = ({ w }) => {
  const { t } = useTranslation();
  const data = w.weeks.map((wk) => ({
    week: weekLabel(wk.weekStart),
    plan: wk.fill === null ? null : Math.round(wk.fill * 1000) / 10,
    interim: wk.interimFill === null ? null : Math.round(wk.interimFill * 1000) / 10,
    lowest: wk.lowestFill === null ? null : Math.round(wk.lowestFill * 1000) / 10,
  }));
  const top = Math.max(120, ...data.map((d) => Math.max(d.plan ?? 0, d.interim ?? 0)));
  return (
    <div className="h-64" data-testid="op-fill-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: CHART_AXIS }} interval={1} />
          <YAxis domain={[0, Math.ceil(top / 10) * 10]} tick={{ fontSize: 10, fill: CHART_AXIS }} unit="%" />
          <Tooltip formatter={(v) => `${String(v)}%`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine
            y={100}
            stroke={TOKEN_CAPACITY}
            strokeDasharray="4 2"
            label={{ value: t('op.fill.line.capacity'), fill: TOKEN_CAPACITY, fontSize: 9, position: 'insideTopRight' }}
          />
          <ReferenceLine
            y={STANDARD * 100}
            stroke={TOKEN_STANDARD}
            strokeDasharray="4 2"
            label={{ value: t('op.fill.line.standard'), fill: TOKEN_STANDARD, fontSize: 9, position: 'insideBottomRight' }}
          />
          <Line type="monotone" dataKey="plan" name={t('op.fill.series.plan')} stroke={TOKEN_PLAN} strokeWidth={2} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="interim" name={t('op.fill.series.interim')} stroke={TOKEN_INTERIM} strokeDasharray="5 3" dot={false} />
          <Line type="monotone" dataKey="lowest" name={t('op.fill.series.lowest')} stroke={TOKEN_LOWEST} strokeDasharray="2 2" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const FillTable: React.FC<{ w: WarehousePlanView }> = ({ w }) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('op.fill.col.week')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.plan')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.interim')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.lowest')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.status')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.rented')}</TableHeaderCell>
          <TableHeaderCell>{t('op.fill.col.rentCost')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {w.weeks.map((wk) => {
            const status = wk.fill === null ? null : wk.fill > 1 ? 'over' : wk.fill > STANDARD ? 'above' : 'within';
            return (
              <TableRow key={wk.weekStart} data-testid={`op-fill-${wk.weekStart}`}>
                <TableCell className="whitespace-nowrap">
                  <Data>{weekLabel(wk.weekStart)}</Data>
                  <div className="text-xs text-text-tertiary">
                    <Data>{formatDate(wk.weekStart)}</Data>
                  </div>
                </TableCell>
                <TableCell>
                  <Data data-testid={`op-fill-plan-${wk.weekStart}`}>{pct(wk.fill)}</Data>
                  <div className="text-xs text-text-tertiary">
                    <Data>{t('op.warehouse.pallets', { value: formatNumber(Math.round(wk.pallets)) })}</Data>
                  </div>
                </TableCell>
                <TableCell>
                  <Data className="text-text-secondary">{pct(wk.interimFill)}</Data>
                </TableCell>
                <TableCell>
                  <Data className="text-text-secondary">{pct(wk.lowestFill)}</Data>
                </TableCell>
                <TableCell>
                  {status && (
                    <StatusPill variant={status === 'over' ? 'danger' : status === 'above' ? 'warning' : 'success'}>
                      {t(`op.fill.status.${status}`)}
                    </StatusPill>
                  )}
                </TableCell>
                <TableCell>
                  <Data data-testid={`op-rented-${wk.weekStart}`}>{formatNumber(Math.round(wk.rentedPallets))}</Data>
                  {wk.beyondCapPallets > 0 && (
                    <div className="text-xs text-danger" data-testid={`op-beyond-${wk.weekStart}`}>
                      {t('op.fill.beyondCap', { value: formatNumber(Math.round(wk.beyondCapPallets)) })}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Data data-testid={`op-rent-${wk.weekStart}`}>{formatIDR(Math.round(wk.rentIdr))}</Data>
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

interface RecRow {
  readonly rec: Recommendation;
  readonly material: MaterialOrderPlanView;
}

const BuyerOrderPlan: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const query = useOrderPlan();
  const posQuery = usePurchaseOrders({ status: [...CALL_OFF_PO_STATES] });
  const command = useCallOffCommand();
  const planAvailability = useVerbAvailability('calloff:plan');
  const [kind, setKind] = useState<WarehouseKind>('packaging');
  const [drafted, setDrafted] = useState<ReadonlySet<string>>(new Set());
  // FUX2 B3 — the one recommendation whose "Why this quantity" panel is open.
  const [whyOpen, setWhyOpen] = useState<string | null>(null);
  const crumb = forecastCrumb(t, 'whatToOrder');
  const run = query.data ?? null;
  const today = sdcClock.now().slice(0, 10);
  // X-03 — the registry's own answer, read at render; the verb reads it again at release.
  const releaseWithheld = !isLive('engineDataset');

  const w = run?.warehouses.find((x) => x.kind === kind) ?? run?.warehouses[0] ?? null;
  const rows: RecRow[] = useMemo(
    () =>
      (w?.materials ?? [])
        .flatMap((m) => m.recommendations.map((rec) => ({ rec, material: m })))
        .sort((a, b) => a.rec.weekStart.localeCompare(b.rec.weekStart) || a.rec.materialCode.localeCompare(b.rec.materialCode)),
    [w],
  );

  if (query.isPending || posQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError || posQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={query.error ?? posQuery.error}
        onRetry={() => {
          void query.refetch();
          void posQuery.refetch();
        }}
      />
    );

  const pos = posQuery.data?.items ?? [];
  const kinds: { id: WarehouseKind; label: string }[] = (run?.warehouses ?? []).map((x) => ({
    id: x.kind,
    label: t(`op.warehouse.${x.kind}`),
  }));
  const peak = w ? Math.max(...w.weeks.map((wk) => wk.fill ?? 0)) : 0;
  const keyOf = (r: Recommendation) => `${r.materialCode}|${r.weekStart}`;
  const whyId = (r: Recommendation) => `op-wq-${r.materialCode}-${r.weekStart}`;
  const closeWhy = (r: Recommendation) => {
    setWhyOpen(null);
    // Focus goes back to the control that opened the panel.
    requestAnimationFrame(() => document.getElementById(`${whyId(r)}-toggle`)?.focus());
  };

  const createDraft = async (r: Recommendation, line: NonNullable<ReturnType<typeof umbrellaLineFor>>) => {
    try {
      const res = await command.mutateAsync({
        verb: 'draft',
        poId: line.po.id,
        poLineId: line.line.id,
        quantity: r.quantity,
        needDate: draftNeedDate(r.weekStart, today),
        type: 'forecast',
        origin: 'engine',
      });
      if (res.status === 'failed') {
        toast({ variant: 'warning', title: t('op.toast.refused'), description: refusalText(res.reason) ?? res.reason ?? '' });
        return;
      }
      setDrafted((prev) => new Set(prev).add(keyOf(r)));
      toast({
        variant: 'success',
        title: t('op.toast.drafted'),
        description: t(releaseWithheld ? 'op.toast.draftedDescWithheld' : 'op.toast.draftedDesc'),
      });
    } catch {
      toast({ variant: 'error', title: t('op.toast.refused') });
    }
  };

  const costs = run?.costs;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'whatToOrder')} />
      <PurposeHeader page="whatToOrder" />
      <CycleSteps current="whatToOrder" />
      <SimulatedDataBanner capability="engineDataset" />
      <DataAsOf
        date={run?.planMadeAt ?? null}
        detail={
          <>
            {run?.planMadeAt ? (
              <>
                <span data-testid="op-plan-source">
                  {t('op.meta.plan')} <Data>{formatDate(run.planMadeAt)}</Data>
                </span>{' '}
                · {t('op.meta.horizon')} {t('op.meta.weeks', { count: run.weeks.length })}
              </>
            ) : (
              t('op.meta.noPlan')
            )}
            {run?.previousAsOf && (
              <>
                {' '}
                · {t('op.meta.previous')} <Data>{formatDate(run.previousAsOf)}</Data>
              </>
            )}
          </>
        }
      />
      <DataHealthChip step="E14-05" className="mb-3" />

      <div className="mb-4">
        <FilterChipsBar<WarehouseKind> options={kinds} value={w?.kind ?? kind} onChange={setKind} />
      </div>

      {w && (
        <>
          <p className="text-sm text-text-secondary mb-3" data-testid="op-capacity">
            {t(`op.warehouse.${w.kind}`)} · <Data>{w.warehouseId ?? '—'}</Data> · {t('op.warehouse.capacity')}{' '}
            <Data>{w.capacityPallets === null ? '—' : t('op.warehouse.pallets', { value: formatNumber(w.capacityPallets) })}</Data>
            {w.maxRentedPallets !== null && (
              <>
                {' '}
                · {t('op.warehouse.maxRented')}{' '}
                <Data data-testid="op-max-rented">{t('op.warehouse.pallets', { value: formatNumber(Math.round(w.maxRentedPallets)) })}</Data>
              </>
            )}
          </p>
          {w.method === 'fallback' && (
            <p className="text-sm text-warning-hover mb-3" data-testid="op-fallback">
              {t('op.fallback', { reason: w.fallbackReason ?? '' })}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6" data-testid="op-kpis">
            <KpiCard
              eyebrow={t('op.kpi.orders')}
              value={<span data-testid="op-kpi-orders">{w.after.orders}</span>}
              subtitle={<span className="text-text-tertiary">{t('op.kpi.orders.sub', { count: w.before.orders })}</span>}
            />
            <KpiCard
              eyebrow={t('op.kpi.peak')}
              value={<span data-testid="op-kpi-peak">{pct(peak)}</span>}
              subtitle={<span className="text-text-tertiary">{t('op.kpi.peak.sub')}</span>}
            />
            <KpiCard
              eyebrow={t('op.kpi.rented')}
              value={<span data-testid="op-kpi-rented">{formatNumber(Math.round(w.after.rentedPalletWeeks))}</span>}
              subtitle={
                <span className="text-text-tertiary">
                  {t('op.kpi.rented.sub', { value: formatNumber(Math.round(w.before.rentedPalletWeeks)) })}
                </span>
              }
            />
            <KpiCard
              eyebrow={t('op.kpi.rentCost')}
              value={<span data-testid="op-kpi-rent-cost">{formatIDR(Math.round(w.after.rentIdr), { compact: true })}</span>}
              subtitle={<span className="text-warning-hover">{t('op.kpi.rentCost.sub')}</span>}
            />
          </div>

          <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="op-recs">
            <h2 className="text-section text-text-primary mb-1">{t('op.recs.title')}</h2>
            <p className="text-xs text-text-tertiary mb-3">{t('op.recs.intro')}</p>
            <p className="text-xs text-text-secondary mb-3" data-testid="op-why">
              {t('op.why')}{' '}
              <Link to="/buyer/material-requirement" className="text-action underline" data-testid="op-why-requirement">
                {t('op.why.requirement')}
              </Link>{' '}
              ·{' '}
              <Link to="/buyer/safety-stock" className="text-action underline" data-testid="op-why-safety">
                {t('op.why.safety')}
              </Link>
            </p>
            {rows.length === 0 ? (
              <p className="text-sm text-text-tertiary py-6 text-center" data-testid="op-recs-empty">
                {t('op.recs.empty')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableHeaderCell>{t('op.col.material')}</TableHeaderCell>
                    <TableHeaderCell>{t('op.col.supplier')}</TableHeaderCell>
                    <TableHeaderCell>{t('op.col.week')}</TableHeaderCell>
                    <TableHeaderCell>{t('op.col.release')}</TableHeaderCell>
                    <TableHeaderCell>{t('op.col.quantity')}</TableHeaderCell>
                    <TableHeaderCell>{t('op.col.reason')}</TableHeaderCell>
                    <TableHeaderCell>{t('op.col.previous')}</TableHeaderCell>
                    <TableHeaderCell>{t('op.col.method')}</TableHeaderCell>
                    <TableHeaderCell>{t('op.col.action')}</TableHeaderCell>
                  </TableHeader>
                  <tbody>
                    {rows.map(({ rec: r, material: m }) => {
                      const key = keyOf(r);
                      const line = umbrellaLineFor(pos, r.supplierId, r.materialCode);
                      const changed = r.previousQuantity !== null && r.previousQuantity !== r.quantity;
                      const whyIsOpen = whyOpen === key;
                      return (
                        <React.Fragment key={key}>
                        <TableRow data-testid={`op-rec-${r.materialCode}-${r.weekStart}`}>
                          <TableCell className="align-top">
                            <div className="text-sm text-text-primary">{m.materialLabel}</div>
                            <Data className="text-xs text-text-tertiary">{m.materialCode}</Data>
                            {m.moqExceedsHorizonDemand && (
                              <div>
                                <StatusPill variant="warning">{t('op.moqFlag')}</StatusPill>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top">{m.supplierName ?? '—'}</TableCell>
                          <TableCell className="align-top whitespace-nowrap">
                            <Data>{weekLabel(r.weekStart)}</Data>
                            <div className="text-xs text-text-tertiary">
                              <Data>{formatDate(r.weekStart)}</Data>
                            </div>
                          </TableCell>
                          <TableCell className="align-top whitespace-nowrap">
                            <Data>{weekLabel(r.releaseWeek)}</Data>
                            {r.lateToRelease && (
                              <div>
                                <StatusPill variant="danger">{t('op.late')}</StatusPill>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <Data data-testid={`op-qty-${r.materialCode}-${r.weekStart}`}>{`${qtyOf(r.quantity, m.uom)} ${m.uom}`}</Data>
                            <div className="text-xs text-text-tertiary">
                              <Data>{t('op.pallets', { value: formatNumber(Math.round(r.pallets * 10) / 10) })}</Data> ·{' '}
                              {t('op.cover', { count: r.coverWeeks })}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="text-sm text-text-primary" data-testid={`op-binding-${r.materialCode}-${r.weekStart}`}>
                              {t(`op.binding.${r.binding}`)}
                            </div>
                            <div className="text-xs text-text-tertiary" data-testid={`op-saved-${r.materialCode}-${r.weekStart}`}>
                              {r.savedIdr === null || r.alternativeQuantity === null ? (
                                t('op.saved.none')
                              ) : (
                                <>
                                  {t('op.saved', {
                                    // BL-83 — a rupiah amount is formatIDR's, not a plain number's.
                                    value: formatIDR(Math.round(r.savedIdr)),
                                    quantity: `${qtyOf(r.alternativeQuantity, m.uom)} ${m.uom}`,
                                  })}
                                </>
                              )}
                            </div>
                            <button
                              type="button"
                              id={`${whyId(r)}-toggle`}
                              className="mt-1 text-xs text-action underline"
                              aria-expanded={whyIsOpen}
                              aria-controls={whyId(r)}
                              aria-label={t('op.wq.openAria', { material: m.materialLabel, week: weekLabel(r.weekStart) })}
                              onClick={() => (whyIsOpen ? closeWhy(r) : setWhyOpen(key))}
                              data-testid={`op-wq-open-${r.materialCode}-${r.weekStart}`}
                            >
                              {t('op.wq.open')}
                            </button>
                          </TableCell>
                          <TableCell className="align-top">
                            {r.previousQuantity === null ? (
                              <span className="text-text-tertiary">—</span>
                            ) : r.previousQuantity === 0 ? (
                              <span className="text-xs text-text-tertiary">{t('op.previous.none')}</span>
                            ) : (
                              <Data>{qtyOf(r.previousQuantity, m.uom)}</Data>
                            )}
                            {changed && r.insideLeadTime && (
                              <div>
                                <StatusPill variant="warning">{t('op.previous.changed')}</StatusPill>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <span className={r.method === 'joint' ? 'text-sm' : 'text-sm text-warning-hover'} data-testid={`op-method-${r.materialCode}-${r.weekStart}`}>
                              {t(`op.method.${r.method}`)}
                            </span>
                          </TableCell>
                          <TableCell className="align-top">
                            {!line ? (
                              <span title={t('op.action.noPo.hint')}>
                                <StatusPill variant="neutral">{t('op.action.noPo')}</StatusPill>
                              </span>
                            ) : drafted.has(key) ? (
                              <StatusPill variant="success">{t('op.action.drafted')}</StatusPill>
                            ) : planAvailability.kind === 'held' ? (
                              <div>
                                <Button
                                  variant="outline"
                                  onClick={() => void createDraft(r, line)}
                                  disabled={command.isPending}
                                  data-testid={`op-draft-${r.materialCode}-${r.weekStart}`}
                                >
                                  {t('op.action.draft')}
                                </Button>
                                <div className="text-xs text-text-tertiary mt-1">
                                  {t('op.action.onPo', { po: line.po.poNumber })}
                                </div>
                                {releaseWithheld && (
                                  <div
                                    className="text-xs text-warning-hover mt-1 max-w-[16rem]"
                                    data-testid={`op-release-withheld-${r.materialCode}-${r.weekStart}`}
                                  >
                                    {t('op.action.releaseWithheld')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <HandoffNotice availability={planAvailability} testId="handoff-orderplan-draft" />
                            )}
                          </TableCell>
                        </TableRow>
                        {whyIsOpen ? (
                          <tr>
                            <td colSpan={9} className="px-4 pb-4">
                              <WhyQuantityPanel id={whyId(r)} rec={r} material={m} onClose={() => closeWhy(r)} />
                            </td>
                          </tr>
                        ) : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            )}
          </section>

          {/* FUX-D3 (F-10): the decision for these weeks is made and saved on Make warehouse room. */}
          {w.shortfallWeeks.length > 0 && (
            <p className="text-sm text-text-primary bg-bg-surface border border-danger rounded-lg px-4 py-3 mb-6" data-testid="op-shortfall-count">
              {t('op.short.count', { count: w.shortfallWeeks.length })}{' '}
              <Link to="/buyer/reschedule" className="text-action underline">
                {t('op.short.decide')}
              </Link>
            </p>
          )}

          <details className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="op-fill">
            <summary className="cursor-pointer">
              <h2 className="inline text-section text-text-primary">{t('op.fill.title')}</h2>
            </summary>
            <p className="text-xs text-text-secondary mt-3 mb-1" data-testid="op-fill-basis">
              {t('op.fill.basis')}
            </p>
            <p className="text-xs text-text-tertiary mb-3">{t('op.fill.intro')}</p>
            <FillChart w={w} />
            <FillTable w={w} />
          </details>
        </>
      )}

      {costs && (
        <details className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-5" data-testid="op-costs">
          <summary className="cursor-pointer">
            <h2 className="inline text-section text-text-primary">{t('op.costs.title')}</h2>
          </summary>
          <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
            {(
              [
                ['holding', t('op.costs.holdingValue', { value: formatNumber(costs.holdingRatePerYear * 100) }), 'op.costs.placeholder'],
                ['order', formatIDR(costs.orderCostIdr), 'op.costs.placeholder'],
                ['rent', formatIDR(costs.rentIdrPerPalletWeek), 'op.costs.placeholder'],
                ['penalty', formatIDR(costs.changePenaltyIdrPerPallet), 'op.costs.placeholderPenalty'],
                ...(costs.maxRentedShare !== undefined
                  ? ([['maxRent', t('op.costs.maxRentValue', { value: formatNumber(Math.round(costs.maxRentedShare * 1000) / 10) }), 'op.costs.placeholderWarehouse']] as const)
                  : []),
              ] as const
            ).map(([k, value, note]) => (
              <div key={k} data-testid={`op-cost-${k}`}>
                <dt className="text-text-secondary">{t(`op.costs.${k}`)}</dt>
                <dd>
                  <Data>{value}</Data>
                  <div className="text-xs text-warning-hover" data-testid={`op-cost-placeholder-${k}`}>
                    {t(note)}
                  </div>
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-text-tertiary mt-2">{t('op.costs.where')}</p>
        </details>
      )}

      <details className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2" data-testid="op-definitions">
        <summary className="cursor-pointer">
          <h2 className="inline text-section text-text-primary">{t('op.def.title')}</h2>
        </summary>
        <p>{t('op.method')}</p>
        <p>{t('op.def.cost')}</p>
        <p>{t('op.def.constraints')}</p>
        <p>{t('op.def.fill')}</p>
        <p>{t('op.def.fallback')}</p>
        <p>{t('op.def.cap')}</p>
      </details>

      <AboutThisPage>
        <p>{t('op.subtitle')}</p>
        <p data-testid="op-synthetic-note">{t('op.synthetic')}</p>
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerOrderPlan;