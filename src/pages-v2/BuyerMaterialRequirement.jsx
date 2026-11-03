import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
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
import { formatDate, formatNumber } from '@lib/format';
import DataHealthChip from '@components/forecast/DataHealthChip';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import BasisLine from '@components/forecast/BasisLine';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';
import { TOUCH_TARGET } from '@components/forecast/focusRing';
import { useMaterialRequirement } from '@services/query/hooks';
/** @import { MaterialPlanView, MaterialRequirementView } from '@services/data/types' */
/** @import { MaterialWeek } from '@services/engine/requirement' */
import { isoWeek } from '@services/engine/dates';
import { qtyOf } from './materialPlan/planDisplay';
import LeadTimeSteps from './materialPlan/LeadTimeSteps';

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL REQUIREMENT — REQ-E14-03, the Material Planner's view.
//
// Read-only. Per material: its source, lead time, safety stock (and where that
// came from), stock and the flag of the stock-accuracy check; per material and
// week: gross requirement, stock at start, confirmed receipts, safety stock,
// net requirement, planned order, release week and stock at end — which
// reconcile by the formula the definitions state (AC-01). The gross
// requirement opens onto the finished goods behind it (AC-03), each part with
// the scrap and yield of the BOM line it came through (BR-03, BL-115). The planner may
// count unconfirmed order lines, and they are then marked (AC-02).
//
// Every figure is computed by the forecast engine at read time on its
// SYNTHETIC dataset (the `engineDataset` pill, X-03). Planned orders are sized
// by E14-05 (the Order plan page); the page says which sizing the run used.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'confirmed' | 'include'} ReceiptsMode */

/** @param {string} w */
const weekLabel = (w) => `W${isoWeek(w)}`;

/** The page address parameter that keeps the "Needs order" filter (F-17). */
const NEEDS_PARAM = 'needs';
const NEEDS_ORDER = 'order';

/**
 * F-17 — by need, not by code: late to release first, then the larger net
 * requirement, then a stock-accuracy review flag; the code breaks ties so the
 * order is stable. Presentation only: the engine's own order is unchanged.
 * @param {MaterialPlanView} a
 * @param {MaterialPlanView} b
 * @returns {number}
 */
const byNeed = (a, b) =>
  b.totals.lateToRelease - a.totals.lateToRelease ||
  b.totals.net - a.totals.net ||
  Number(b.reviewRequired) - Number(a.reviewRequired) ||
  a.materialCode.localeCompare(b.materialCode);
/**
 * A BOM fraction as a percentage, to 0.1% (2.35% scrap reads 2.4%); — when the part came through no BOM line.
 * @param {number | undefined} x
 */
const pctOf = (x) => (x === undefined ? '—' : `${formatNumber(Math.round(x * 1000) / 10)}%`);

/** @type {React.FC<{ week: MaterialWeek; plan: MaterialPlanView; names: MaterialRequirementView['finishedGoodNames']; onClose: () => void; }>} */
const PegsPanel = ({ week, plan, names, onClose }) => {
  const { t } = useTranslation();
  return (
    <section
      className="mt-4 border border-border-subtle rounded-md p-4 bg-bg-hover"
      data-testid="mrq-pegs"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-text-primary">
          {t('mrq.pegs.title')} · <Data>{plan.materialCode}</Data> ·{' '}
          <Data>{weekLabel(week.weekStart)}</Data>
        </h3>
        <Button variant="secondary" onClick={onClose}>
          {t('mrq.pegs.close')}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('mrq.pegs.sku')}</TableHeaderCell>
          <TableHeaderCell>{t('mrq.pegs.week')}</TableHeaderCell>
          <TableHeaderCell term="pegFgQty" />
          <TableHeaderCell term="pegScrap" />
          <TableHeaderCell term="pegYield" />
          <TableHeaderCell term="pegRequirement" />
        </TableHeader>
        <tbody>
          {/* Peg has no id: the same SKU + FG week appears twice when the
              material reaches it through two BOM paths. The list is engine
              output, replaced whole per week and never edited, so the index
              suffix only separates those repeats. */}
          {week.pegs.map((p, i) => (
            // eslint-disable-next-line react/no-array-index-key -- read-only engine output; SKU + week can repeat across BOM paths
            <TableRow key={`${p.skuCode}-${p.fgWeek}-${i}`} data-testid={`mrq-peg-${p.skuCode}`}>
              <TableCell>
                <div className="text-sm text-text-primary">{names[p.skuCode] ?? p.skuCode}</div>
                <Data className="text-xs text-text-tertiary">{p.skuCode}</Data>
              </TableCell>
              <TableCell>
                <Data>{weekLabel(p.fgWeek)}</Data>
              </TableCell>
              <TableCell>
                <Data>{qtyOf(p.fgQuantity, 'PCS')}</Data>
              </TableCell>
              <TableCell>
                <Data data-testid={`mrq-peg-scrap-${p.skuCode}`}>{pctOf(p.scrapPct)}</Data>
              </TableCell>
              <TableCell>
                <Data
                  data-testid={`mrq-peg-yield-${p.skuCode}`}
                  className={p.yieldPct !== undefined && p.yieldPct < 1 ? 'text-warning-hover' : ''}
                >
                  {pctOf(p.yieldPct)}
                </Data>
              </TableCell>
              <TableCell>
                <Data>{qtyOf(p.quantity, plan.uom)}</Data>
              </TableCell>
            </TableRow>
          ))}
          <tr>
            <td className="py-2 px-4 text-sm text-text-secondary" colSpan={5}>
              {t('mrq.pegs.total')}
            </td>
            <td className="py-2 px-4">
              <Data data-testid="mrq-pegs-total">{qtyOf(week.gross, plan.uom)}</Data>
            </td>
          </tr>
        </tbody>
      </Table>
    </section>
  );
};

/** @type {React.FC<{ plan: MaterialPlanView; names: MaterialRequirementView['finishedGoodNames'] }>} */
const WeekGrid = ({ plan, names }) => {
  const { t } = useTranslation();
  const [pegWeek, setPegWeek] = useState(/** @type {string | null} */ (null));
  const open = plan.weeks.find((w) => w.weekStart === pegWeek) ?? null;
  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6"
      data-testid="mrq-detail"
    >
      <h2 className="text-section text-text-primary mb-1">
        {t('mrq.detail.title')} · <Data>{plan.materialCode}</Data>
      </h2>
      <p className="text-xs text-text-tertiary mb-3">
        {plan.stockDate ? (
          <>
            {t('mrq.detail.stockDate')} <Data>{formatDate(plan.stockDate)}</Data>
          </>
        ) : (
          t('mrq.detail.noStock')
        )}
      </p>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('mrq.wk.week')}</TableHeaderCell>
            <TableHeaderCell term="mrpGross" />
            <TableHeaderCell term="mrpStockStart" />
            <TableHeaderCell term="mrpReceipts" />
            <TableHeaderCell term="mrpSafetyStock" />
            <TableHeaderCell term="mrpNet" />
            <TableHeaderCell term="mrpPlannedOrder" />
            <TableHeaderCell term="mrpRelease" />
            <TableHeaderCell term="mrpStockEnd" />
          </TableHeader>
          <tbody>
            {plan.weeks.map((w) => (
              <React.Fragment key={w.weekStart}>
                <TableRow data-testid={`mrq-week-${w.weekStart}`}>
                  <TableCell className="whitespace-nowrap">
                    <Data>{weekLabel(w.weekStart)}</Data>
                    <div className="text-xs text-text-tertiary">
                      <Data>{formatDate(w.weekStart)}</Data>
                    </div>
                  </TableCell>
                  <TableCell>
                    {w.gross > 0 ? (
                      <button
                        type="button"
                        className={`underline decoration-dotted hover:text-action-hover ${TOUCH_TARGET}`}
                        onClick={() => setPegWeek(w.weekStart)}
                        aria-label={t('mrq.wk.openPegs', { qty: qtyOf(w.gross, plan.uom) })}
                        data-testid={`mrq-gross-${w.weekStart}`}
                      >
                        <Data>{qtyOf(w.gross, plan.uom)}</Data>
                      </button>
                    ) : (
                      <Data className="text-text-tertiary">{qtyOf(0, plan.uom)}</Data>
                    )}
                  </TableCell>
                  <TableCell>
                    <Data>{qtyOf(w.projectedStart, plan.uom)}</Data>
                  </TableCell>
                  <TableCell>
                    <Data>{qtyOf(w.receipts, plan.uom)}</Data>
                    {w.unconfirmedReceipts > 0 && (
                      <div
                        className="text-xs text-warning-hover"
                        data-testid={`mrq-unconfirmed-${w.weekStart}`}
                      >
                        {t('mrq.wk.unconfirmed', { qty: qtyOf(w.unconfirmedReceipts, plan.uom) })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Data>{qtyOf(w.safetyStock, plan.uom)}</Data>
                  </TableCell>
                  <TableCell>
                    <Data data-testid={`mrq-net-${w.weekStart}`}>{qtyOf(w.net, plan.uom)}</Data>
                  </TableCell>
                  <TableCell>
                    <Data data-testid={`mrq-planned-${w.weekStart}`}>
                      {qtyOf(w.plannedReceipt, plan.uom)}
                    </Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {w.releaseWeek ? (
                      <>
                        <Data>{weekLabel(w.releaseWeek)}</Data>
                        {w.lateToRelease && (
                          <div>
                            <StatusPill variant="danger">{t('mrq.wk.late')}</StatusPill>
                          </div>
                        )}
                      </>
                    ) : (
                      <Data className="text-text-tertiary">—</Data>
                    )}
                  </TableCell>
                  <TableCell>
                    <Data>{qtyOf(w.projectedEnd, plan.uom)}</Data>
                  </TableCell>
                </TableRow>
                {open?.weekStart === w.weekStart && (
                  <tr>
                    <td colSpan={9} className="px-4 pb-4">
                      <PegsPanel
                        week={open}
                        plan={plan}
                        names={names}
                        onClose={() => setPegWeek(null)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

/** @type {React.FC} */
const BuyerMaterialRequirement = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState(/** @type {ReceiptsMode} */ ('confirmed'));
  const query = useMaterialRequirement(mode === 'include');
  const crumb = forecastCrumb(t, 'materialRequirement');
  const run = query.data ?? null;
  const materials = useMemo(() => run?.materials ?? [], [run]);
  const [params, setParams] = useSearchParams();
  const needsOrder = params.get(NEEDS_PARAM) === NEEDS_ORDER;
  const rows = useMemo(
    () => [...materials].sort(byNeed).filter((m) => !needsOrder || m.totals.net > 0),
    [materials, needsOrder]
  );
  const [selected, setSelected] = useState(/** @type {string | null} */ (null));
  const current =
    materials.find((m) => m.materialCode === selected) ??
    rows.find((m) => m.totals.net > 0) ??
    rows[0] ??
    null;
  /** @param {boolean} on */
  const toggleNeedsOrder = (on) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (on) next.set(NEEDS_PARAM, NEEDS_ORDER);
        else next.delete(NEEDS_PARAM);
        return next;
      },
      { replace: true }
    );

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError)
    return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const withNet = materials.filter((m) => m.totals.net > 0).length;
  const orders = materials.reduce((s, m) => s + m.totals.plannedOrders, 0);
  const late = materials.reduce((s, m) => s + m.totals.lateToRelease, 0);
  const review = materials.filter((m) => m.reviewRequired).length;
  /** @type {{ id: ReceiptsMode; label: string }[]} */
  const modeOptions = [
    { id: 'confirmed', label: t('mrq.receipts.confirmed') },
    { id: 'include', label: t('mrq.receipts.include') }
  ];

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'materialRequirement')} />
      <PurposeHeader page="materialRequirement" />
      <SimulatedDataBanner capability="engineDataset" />
      <DataAsOf
        date={run?.planMadeAt ?? null}
        detail={
          run?.planMadeAt ? (
            <>
              {t('mrq.meta.horizon')} {t('mrq.meta.weeks', { count: run.weeks.length })}
            </>
          ) : (
            t('mrq.meta.noPlan')
          )
        }
      />
      <DataHealthChip step="E14-03" className="mb-3" />
      {/* FSR-D1 (BL-237, C-01): the netting and its stock on hand are the engine's
          synthetic dataset, the challenger; the hub sample is the plan of record. */}
      <BasisLine standing="challenger" className="mb-3" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FilterChipsBar options={modeOptions} value={mode} onChange={setMode} />
        {mode === 'include' && (
          <span className="text-xs text-warning-hover" data-testid="mrq-included-note">
            {t('mrq.receipts.includedNote')}
          </span>
        )}
        {/* A11y finding 15: the label carries the 44 px coarse-pointer tap area. */}
        <label className="touch-target inline-flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            className="accent-action"
            checked={needsOrder}
            onChange={(e) => toggleNeedsOrder(e.target.checked)}
            data-testid="mrq-needs-order"
          />
          {t('mrq.filter.needsOrder')}
        </label>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6"
        data-testid="mrq-kpis"
      >
        <KpiCard
          term="mrqNetMaterials"
          value={<span data-testid="mrq-kpi-net">{withNet}</span>}
          subtitle={
            <span className="text-text-tertiary">
              {t('mrq.kpi.net.sub', { total: materials.length })}
            </span>
          }
        />
        <KpiCard
          term="mrqPlannedOrdersKpi"
          value={<span data-testid="mrq-kpi-orders">{orders}</span>}
          subtitle={<span className="text-text-tertiary">{t('mrq.kpi.orders.sub')}</span>}
        />
        <KpiCard
          term="mrqLateKpi"
          value={<span data-testid="mrq-kpi-late">{late}</span>}
          subtitle={<span className="text-text-tertiary">{t('mrq.kpi.late.sub')}</span>}
        />
        <KpiCard
          term="mrqReview"
          value={<span data-testid="mrq-kpi-review">{review}</span>}
          subtitle={<span className="text-text-tertiary">{t('mrq.kpi.review.sub')}</span>}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('mrq.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('mrq.col.supplier')}</TableHeaderCell>
            <TableHeaderCell term="mrpLeadTime" />
            <TableHeaderCell term="mrpSafetyStock" />
            <TableHeaderCell term="mrpStockOnHand" />
            <TableHeaderCell term="mrpNet" />
            <TableHeaderCell term="mrpPlannedOrders" />
            <TableHeaderCell term="mrpLate" />
          </TableHeader>
          <tbody>
            {rows.map((m) => (
              <TableRow
                key={m.materialCode}
                data-testid={`mrq-row-${m.materialCode}`}
                onClick={() => setSelected(m.materialCode)}
                // C2 (WCAG 4.1.2): aria-selected is not exposed on a plain table row; aria-current is.
                aria-current={current?.materialCode === m.materialCode}
                className={current?.materialCode === m.materialCode ? 'bg-action-soft' : ''}
              >
                <TableCell className="align-top">
                  <div className="text-sm text-text-primary">{m.materialLabel}</div>
                  <Data className="text-xs text-text-tertiary">{m.materialCode}</Data>
                </TableCell>
                <TableCell className="align-top">
                  {m.supplierName ?? (
                    <span className="text-text-tertiary">{t('mrq.noSource')}</span>
                  )}
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  {t('mrq.days', { count: m.leadTimeDays })}
                  {m.safetyLeadTimeDays > 0 && (
                    <div className="text-xs text-text-tertiary">
                      {t('mrq.plusSafetyLead', { count: m.safetyLeadTimeDays })}
                    </div>
                  )}
                  {/* DRC-6 (BL-192) — the lead time by step, read only. */}
                  <LeadTimeSteps
                    breakdown={m.leadTimeSteps}
                    testId={`mrq-lt-steps-${m.materialCode}`}
                  />
                </TableCell>
                <TableCell className="align-top">
                  <Data data-testid={`mrq-ss-${m.materialCode}`}>
                    {qtyOf(m.safetyStock, m.uom)}
                  </Data>
                  <div
                    className="text-xs text-text-tertiary"
                    data-testid={`mrq-ss-source-${m.materialCode}`}
                  >
                    {t(`mrq.ssSource.${m.safetyStockSource}`)}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Data>{qtyOf(m.startStock, m.uom)}</Data>
                  {m.reviewRequired && (
                    <div title={t('mrq.review.hint')}>
                      <StatusPill variant="warning">{t('mrq.review')}</StatusPill>
                      {/* C2 (WCAG 1.3.1): the reason is read out too, not only shown on hover. */}
                      <span className="sr-only">{t('mrq.review.hint')}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <Data data-testid={`mrq-total-net-${m.materialCode}`}>
                    {qtyOf(m.totals.net, m.uom)}
                  </Data>
                </TableCell>
                <TableCell className="align-top">
                  <Data>{m.totals.plannedOrders}</Data>
                </TableCell>
                <TableCell className="align-top">
                  <Data className={m.totals.lateToRelease > 0 ? 'text-danger' : ''}>
                    {m.totals.lateToRelease}
                  </Data>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-sm text-text-tertiary py-10"
                  data-testid="mrq-empty"
                >
                  {materials.length === 0 ? t('mrq.empty') : t('mrq.filter.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {current ? (
        <WeekGrid
          key={`${current.materialCode}-${mode}`}
          plan={current}
          names={run?.finishedGoodNames ?? {}}
        />
      ) : (
        <p className="text-sm text-text-tertiary mb-6">{t('mrq.detail.select')}</p>
      )}

      <section
        className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2"
        data-testid="mrq-definitions"
      >
        <h2 className="text-section text-text-primary">{t('mrq.def.title')}</h2>
        <p>{t('mrq.def.gross')}</p>
        <p>{t('mrq.def.net')}</p>
        <p>{t('mrq.def.planned')}</p>
        <p>{t('mrq.def.end')}</p>
      </section>

      <AboutThisPage>
        <p>{t('mrq.subtitle')}</p>
        <p data-testid="mrq-synthetic-note">{t('mrq.synthetic')}</p>
        <p>{t('mrq.planSource')}</p>
        {run?.sizing === 'orderSizing' ? (
          <p data-testid="mrq-sized-note">
            {t('mrq.sized')}{' '}
            <Link to="/buyer/order-plan" className="text-action underline">
              {t('mrq.sized.link')}
            </Link>
          </p>
        ) : (
          <p data-testid="mrq-interim-note">{t('mrq.interim')}</p>
        )}
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerMaterialRequirement;
