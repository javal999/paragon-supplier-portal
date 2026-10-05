import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import KpiCard from '@components/ui-v2/KpiCard';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Data from '@components/ui-v2/Data';
import LoadingState from '@components/ui-v2/LoadingState';
import ErrorState from '@components/ui-v2/ErrorState';
import { formatDate, formatNumber } from '@lib/format';
import { useSafetyStock } from '@services/query/hooks';
import type { MaterialSafetyStockView } from '@services/data/types';
import { qtyOf } from './materialPlan/planDisplay';
import PurposeHeader from '@components/forecast/PurposeHeader';
import SimulatedDataBanner from '@components/forecast/SimulatedDataBanner';
import AboutThisPage from '@components/forecast/AboutThisPage';
import DataAsOf from '@components/forecast/DataAsOf';
import TermTip from '@components/forecast/TermTip';
import { forecastCrumb, forecastTitle } from '@components/forecast/forecastPages';

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY STOCK AND REORDER POINT — REQ-E14-04, the Material Planner's view.
//
// Read-only. Per material (AC-01): the safety stock, the safety lead time and
// the reorder point, with the fill-rate target and tier behind them (the tier
// MARKED as the volume default until ENG-D14), the history window and method,
// and SAP's safety stock beside it — how much the new calculation frees, in
// units and pallets. A material with too little history shows SAP's value,
// marked (AC-02). Selecting a material shows the errors the figure was read
// from, so it can be recalculated by hand (AC-03). BR-06 (BL-116): each
// material shows its change since the last run of its stream and the cause,
// read off the two runs' inputs (engine `safetyStockChanges`).
//
// Computed by the forecast engine at read time on its SYNTHETIC dataset, with
// the administrator's targets in force (the `engineDataset` pill, X-03).
// ─────────────────────────────────────────────────────────────────────────────

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 1000) / 10}%`);
const pallets = (x: number) => formatNumber(Math.round(x));
/** F-21 — a quantity rounded to its unit, with the unit named. */
const qtyIn = (x: number, uom: MaterialSafetyStockView['uom']) => `${qtyOf(x, uom)} ${uom}`;
/** A change with its sign: +417, −295, 0. */
const signed = (x: number, uom: MaterialSafetyStockView['uom']) => (x > 0 ? `+${qtyOf(x, uom)}` : x < 0 ? `−${qtyOf(-x, uom)}` : qtyOf(0, uom));

/** BR-06 (BL-116) — the change since the last run and why, per material. */
const ChangeCell: React.FC<{ m: MaterialSafetyStockView }> = ({ m }) => {
  const { t } = useTranslation();
  const c = m.change;
  const p = c.previous;
  if (c.causes.length === 0) {
    return (
      <span className="text-xs text-text-tertiary" data-testid={`sst-change-${m.materialCode}`}>
        {t('sst.change.none')}
      </span>
    );
  }
  const text = (cause: (typeof c.causes)[number]) => {
    switch (cause) {
      case 'tier':
        return t('sst.cause.tier', { from: p ? t(`sst.tier.${p.tier}`) : '—', to: t(`sst.tier.${m.tier}`) });
      case 'target':
        return t('sst.cause.target', { from: pct(p?.target ?? null), to: pct(m.target) });
      case 'errors':
        return t('sst.cause.errors', { added: c.originsAdded, dropped: c.originsDropped });
      case 'orderLot':
        return t('sst.cause.orderLot', { from: p ? qtyOf(p.orderQtyPerCycle, m.uom) : '—', to: qtyOf(m.orderQtyPerCycle, m.uom) });
      case 'window':
        return t('sst.cause.window', { from: p?.riskWeeks ?? '—', to: m.riskWeeks });
      default:
        return t(`sst.cause.${cause}`);
    }
  };
  return (
    <div data-testid={`sst-change-${m.materialCode}`}>
      <div>
        <Data data-testid={`sst-change-ss-${m.materialCode}`}>{signed(c.safetyStockDelta, m.uom)}</Data>
        {p && (
          <span className="text-xs text-text-tertiary">
            {' '}
            {t('sst.change.from', { value: qtyOf(p.safetyStock, m.uom) })}
          </span>
        )}
      </div>
      <div className="text-xs text-text-tertiary">
        {t('sst.change.rop')} <Data data-testid={`sst-change-rop-${m.materialCode}`}>{signed(c.reorderPointDelta, m.uom)}</Data>
      </div>
      <ul className="text-xs text-text-secondary mt-1 list-disc pl-4" data-testid={`sst-causes-${m.materialCode}`}>
        {c.causes.map((cause) => (
          <li key={cause} data-testid={`sst-cause-${m.materialCode}-${cause}`}>
            {text(cause)}
          </li>
        ))}
      </ul>
    </div>
  );
};

const HistoryPanel: React.FC<{ m: MaterialSafetyStockView }> = ({ m }) => {
  const { t } = useTranslation();
  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 mb-6" data-testid="sst-detail">
      <h2 className="text-section text-text-primary mb-1">
        {t('sst.detail.title')} · <Data>{m.materialCode}</Data>
      </h2>
      <p className="text-xs text-text-tertiary mb-3">{t('sst.detail.window', { weeks: m.riskWeeks })}</p>
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4">
        <div>
          <dt className="text-text-tertiary text-xs">{t('sst.detail.q')}</dt>
          <dd>
            <Data data-testid="sst-detail-q">{qtyOf(m.orderQtyPerCycle, m.uom)}</Data>
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary text-xs">{t('sst.detail.fillRate')}</dt>
          <dd>
            <Data data-testid="sst-detail-engine">{qtyOf(m.engineSafetyStock, m.uom)}</Data>
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary text-xs">{t('sst.detail.quantile', { share: pct(1 - m.target) })}</dt>
          <dd>
            <Data>{m.quantileSafetyStock === null ? '—' : qtyOf(m.quantileSafetyStock, m.uom)}</Data>
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary text-xs">{t('sst.detail.rop')}</dt>
          <dd>
            <Data>{qtyOf(m.expectedDemandOverRisk, m.uom)}</Data>
          </dd>
        </div>
      </dl>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('sst.err.origin')}</TableHeaderCell>
            <TableHeaderCell>{t('sst.err.planned')}</TableHeaderCell>
            <TableHeaderCell>{t('sst.err.actual')}</TableHeaderCell>
            <TableHeaderCell>{t('sst.err.error')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {m.errors.map((e) => (
              <TableRow key={e.origin} data-testid={`sst-err-${e.origin}`}>
                <TableCell>
                  <Data>{formatDate(e.origin)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{qtyOf(e.planned, m.uom)}</Data>
                </TableCell>
                <TableCell>
                  <Data>{qtyOf(e.actual, m.uom)}</Data>
                </TableCell>
                <TableCell>
                  <Data className={e.error > 0 ? 'text-danger' : ''}>{qtyOf(e.error, m.uom)}</Data>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>
    </section>
  );
};

const BuyerSafetyStock: React.FC = () => {
  const { t } = useTranslation();
  const query = useSafetyStock();
  const crumb = forecastCrumb(t, 'safetyStock');
  const run = query.data ?? null;
  const materials = useMemo(() => run?.materials ?? [], [run]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = materials.find((m) => m.materialCode === selected) ?? null;

  if (query.isPending) return <LoadingState breadcrumb={crumb} />;
  if (query.isError) return <ErrorState breadcrumb={crumb} error={query.error} onRetry={() => query.refetch()} />;

  const sapPallets = materials.reduce((s, m) => s + (m.sapPallets ?? 0), 0);
  const enginePallets = materials.reduce((s, m) => s + (m.safetyStockPallets ?? 0), 0);
  const tierCount = (tier: string) => materials.filter((m) => m.tier === tier).length;
  const fallback = materials.filter((m) => m.source === 'sap').length;
  const groupDefault = materials.filter((m) => m.safetyLeadTimeSource === 'groupDefault').length;
  const changedSs = materials.filter((m) => m.change.safetyStockDelta !== 0).length;
  const params = run?.parameters;

  return (
    <AppShellV2>
      <PageHeader breadcrumb={crumb} title={forecastTitle(t, 'safetyStock')} />
      <PurposeHeader page="safetyStock" />
      <SimulatedDataBanner capability="engineDataset" />
      <DataAsOf
        date={run?.planMadeAt ?? null}
        detail={
          run?.previousAsOf ? (
            <span data-testid="sst-last-run">
              {t('sst.change.lastRun', { count: changedSs })} {t('sst.change.lastRunPackaging')}{' '}
              <Data>{formatDate(run.previousAsOf.packaging)}</Data> · {t('sst.change.lastRunRaw')}{' '}
              <Data>{formatDate(run.previousAsOf.rawMaterial)}</Data>
            </span>
          ) : null
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6" data-testid="sst-kpis">
        <KpiCard
          eyebrow={t('sst.kpi.freed')}
          value={<span data-testid="sst-kpi-freed">{t('sst.pallets', { value: pallets(sapPallets - enginePallets) })}</span>}
          subtitle={
            <span className="text-text-tertiary">
              {t('sst.kpi.freed.sub', { sap: pallets(sapPallets), engine: pallets(enginePallets) })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('sst.kpi.tiers')}
          value={<span data-testid="sst-kpi-tiers">{materials.length}</span>}
          subtitle={
            <span className="text-text-tertiary">
              {t('sst.kpi.tiers.sub', { high: tierCount('high'), standard: tierCount('standard'), slow: tierCount('slow') })}
            </span>
          }
        />
        <KpiCard
          eyebrow={t('sst.kpi.fallback')}
          value={<span data-testid="sst-kpi-fallback">{fallback}</span>}
          subtitle={<span className="text-text-tertiary">{t('sst.kpi.fallback.sub', { min: params?.minOrigins ?? 0 })}</span>}
        />
        <KpiCard
          eyebrow={t('sst.kpi.groupDefault')}
          value={<span data-testid="sst-kpi-group-default">{groupDefault}</span>}
          subtitle={<span className="text-text-tertiary">{t('sst.kpi.groupDefault.sub', { min: params?.minReceipts ?? 0 })}</span>}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('sst.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('sst.col.tier')}</TableHeaderCell>
            <TableHeaderCell>{t('sst.col.safetyStock')}</TableHeaderCell>
            <TableHeaderCell>{t('sst.col.sap')}</TableHeaderCell>
            <TableHeaderCell>{t('sst.col.freed')}</TableHeaderCell>
            <TableHeaderCell>{t('sst.col.slt')}</TableHeaderCell>
            <TableHeaderCell>
              <TermTip term="Reorder point">{t('sst.col.rop')}</TermTip>
            </TableHeaderCell>
            <TableHeaderCell>{t('sst.col.change')}</TableHeaderCell>
            <TableHeaderCell>{t('sst.col.history')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {materials.map((m) => (
              <TableRow
                key={m.materialCode}
                data-testid={`sst-row-${m.materialCode}`}
                onClick={() => setSelected(m.materialCode)}
                aria-selected={current?.materialCode === m.materialCode}
                className={current?.materialCode === m.materialCode ? 'bg-action-soft' : ''}
              >
                <TableCell className="align-top">
                  <div className="text-sm text-text-primary">{m.materialLabel}</div>
                  <Data className="text-xs text-text-tertiary">{m.materialCode}</Data>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <div className="text-sm">{t(`sst.tier.${m.tier}`)}</div>
                  <Data className="text-xs" data-testid={`sst-target-${m.materialCode}`}>
                    {pct(m.target)}
                  </Data>{' '}
                  {m.tierSource === 'defaultByVolume' && (
                    <span className="text-xs text-text-tertiary" data-testid={`sst-tier-source-${m.materialCode}`}>
                      ({t('sst.tier.default')})
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <Data data-testid={`sst-ss-${m.materialCode}`}>{qtyIn(m.safetyStock, m.uom)}</Data>
                  <div className="text-xs" data-testid={`sst-source-${m.materialCode}`}>
                    {m.source === 'sap' ? (
                      <StatusPill variant="warning">{t('sst.source.sap')}</StatusPill>
                    ) : (
                      <span className="text-text-tertiary">{t('sst.source.engine')}</span>
                    )}
                  </div>
                  {m.reliesOnOrderLot && (
                    <div className="text-xs text-warning-hover" data-testid={`sst-lot-${m.materialCode}`}>
                      {t('sst.reliesOnLot')}
                    </div>
                  )}
                  {m.oneSidedErrors && (
                    <div className="text-xs text-warning-hover" data-testid={`sst-bias-${m.materialCode}`}>
                      {t('sst.bias')}
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <Data data-testid={`sst-sap-${m.materialCode}`}>{qtyIn(m.sapSafetyStock, m.uom)}</Data>
                </TableCell>
                <TableCell className="align-top">
                  <Data data-testid={`sst-freed-${m.materialCode}`}>{qtyIn(m.freedUnits, m.uom)}</Data>
                  {m.freedPallets !== null && (
                    <div className="text-xs text-text-tertiary">{t('sst.pallets', { value: pallets(m.freedPallets) })}</div>
                  )}
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <span data-testid={`sst-slt-${m.materialCode}`}>{t('sst.slt.days', { count: m.safetyLeadTimeDays })}</span>
                  <div className="text-xs text-text-tertiary" data-testid={`sst-slt-source-${m.materialCode}`}>
                    {m.safetyLeadTimeSource === 'supplier'
                      ? t('sst.slt.supplier', { count: m.safetyLeadTimeReceipts })
                      : m.safetyLeadTimeSource === 'groupDefault'
                        ? t('sst.slt.groupDefault')
                        : t('sst.slt.none')}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Data data-testid={`sst-rop-${m.materialCode}`}>{qtyIn(m.reorderPoint, m.uom)}</Data>
                </TableCell>
                <TableCell className="align-top min-w-[12rem]">
                  <ChangeCell m={m} />
                </TableCell>
                <TableCell className="align-top text-xs text-text-secondary">
                  {m.errors.length > 0 ? (
                    <>
                      <div data-testid={`sst-origins-${m.materialCode}`}>{t('sst.history.origins', { count: m.errors.length })}</div>
                      <div>
                        <Data>{formatDate(m.firstOrigin)}</Data> – <Data>{formatDate(m.lastOrigin)}</Data>
                      </div>
                      <div>{t('sst.history.fillRate', { value: pct(m.historicalFillRate) })}</div>
                    </>
                  ) : (
                    t('sst.history.none')
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      {current ? <HistoryPanel m={current} /> : <p className="text-sm text-text-tertiary mb-6">{t('sst.detail.select')}</p>}

      <section className="bg-bg-surface border border-border-subtle rounded-lg p-4 text-sm text-text-secondary space-y-2" data-testid="sst-definitions">
        <h2 className="text-section text-text-primary">{t('sst.def.title')}</h2>
        <p>{t('sst.def.errors')}</p>
        <p>{t('sst.def.fillRate')}</p>
        <p>{t('sst.def.fallback')}</p>
        <p>{t('sst.def.slt')}</p>
        <p>{t('sst.def.rop')}</p>
        <p>{t('sst.def.change')}</p>
      </section>

      <AboutThisPage>
        <p>{t('sst.subtitle')}</p>
        <p>{t('sst.meta.method')}</p>
        <p data-testid="sst-synthetic-note">{t('sst.synthetic')}</p>
        <p data-testid="sst-tier-default-note">{t('sst.tierDefault')}</p>
        {params && (
          <p data-testid="sst-targets">
            {t('sst.targets', { high: pct(params.targets.high), standard: pct(params.targets.standard), slow: pct(params.targets.slow) })}
          </p>
        )}
        {run?.previousAsOf && <p>{t('sst.change.recomputed')}</p>}
      </AboutThisPage>
    </AppShellV2>
  );
};

export default BuyerSafetyStock;
