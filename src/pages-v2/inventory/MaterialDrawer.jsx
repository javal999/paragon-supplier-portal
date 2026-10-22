/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquarePlus, RefreshCw } from 'lucide-react';
import SidePanel from '@components/ui-v2/SidePanel';
import Button from '@components/ui-v2/Button';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import { formatNumber } from '@lib/format';
import {
  useCallOffs,
  useInventoryAlerts,
  usePurchaseOrders,
  useStockSimulation
} from '@services/query/hooks';
/** @import { InventoryPosition, RiskBasis, RiskClass } from '@services/data/types' */
import { CALL_OFF_PO_STATES } from '@services/transitions/callOffRules';
import { dayOf, incomingTotals } from '@services/transitions/inventoryRules';
import { Figure, RiskPill, inventoryNow, labelClass } from './inventoryDisplay';
import FeedstockLine from './FeedstockLine';
import { agreementLineFor } from './stockSimulationDisplay';
import { PicCell, PicHeader } from '../materials/picDisplay';
import { TradeNameBeside } from '../materials/tradeNameDisplay';

// ─────────────────────────────────────────────────────────────────────────────
// Inventory UX P-02 — the material drawer a PTI inventory row opens: one place
// to decide. Why the risk class is what it is (CR-24 on supplier cover, INV-D1,
// with PTI cover beside it), the figures the table no longer carries (PIC, this
// cycle, supplier ROP and the system ROP Supplier, feedstock — P-01), the open
// alerts on the pair, the supplier's stock update mode (INV-D6: shown, changed
// only on the admin page), and the actions that work for the pair.
//
// "Create call-off" shows only when the pair has an agreement line with
// quantity left — `agreementLineFor`, the rule Stock simulation uses (P-06);
// otherwise "Create PO request", with the call-off page's own "No agreement
// line" sentence as the reason.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ api: true } | { api: false; updated: number; total: number }} CycleValue
 */

/**
 * Material B2 — the supplier's weekly update this cycle, or "API".
 * @type {React.FC<{ value: CycleValue | undefined; testId?: string }>}
 */
export const CycleCell = ({ value, testId }) => {
  const { t } = useTranslation();
  if (!value) return null;
  if (value.api)
    return (
      <span className="text-xs text-text-secondary" data-testid={testId}>
        {t('inv.thisCycle.api')}
      </span>
    );
  return (
    <Data
      className={`text-xs ${value.updated < value.total ? 'text-warning-hover' : ''}`}
      data-testid={testId}
    >
      {t('inv.thisCycle.count', { updated: value.updated, total: value.total })}
    </Data>
  );
};

/**
 * The one-sentence reason for the class (CR-24 basis), plus the incoming note.
 * @type {React.FC<{ position: InventoryPosition; riskClass: RiskClass; basis: RiskBasis }>}
 */
const Reason = ({ position: p, riskClass, basis }) => {
  const { t } = useTranslation();
  const risk = t(`inv.risk.${riskClass}`);
  const text =
    basis.kind === 'leadTime'
      ? t('inv.drawer.why.leadTime', {
          risk,
          cover: Math.floor(basis.daysOfCover),
          lead: basis.leadTimeDays
        })
      : basis.kind === 'fallbackBands'
        ? t('inv.drawer.why.fallback', {
            risk,
            cover: Math.floor(basis.daysOfCover),
            band: t(`inv.band.${basis.band}`)
          })
        : p.supplierSoh === null
          ? t('inv.drawer.why.noFigures')
          : t('inv.drawer.why.noDemand');
  const nothingIncoming = incomingTotals(p.incoming).total === 0;
  return (
    <p
      className="text-sm text-text-primary bg-bg-hover border border-border-subtle rounded px-3 py-2"
      data-testid="material-drawer-why"
      data-risk={riskClass}
    >
      {text}
      {nothingIncoming ? ` ${t('inv.drawer.why.nothingIncoming')}` : ''}
    </p>
  );
};

/** @type {React.FC<{ label: React.ReactNode; children: React.ReactNode; testId?: string }>} */
const Tile = ({ label, children, testId }) => (
  <div className="border border-border-subtle rounded px-3 py-2" data-testid={testId}>
    <div className={labelClass}>{label}</div>
    <div className="text-sm">{children}</div>
  </div>
);

/**
 * @typedef {object} MaterialDrawerProps
 * @property {InventoryPosition} position
 * @property {{ riskClass: RiskClass; basis: RiskBasis }} risk  CR-24, read by the page from `positionRisk`.
 * @property {number | null} ptiCover  INV-D1 — PTI stock ÷ the material's daily demand, the second figure.
 * @property {CycleValue | undefined} cycle
 * @property {(() => void) | null} onRecord  Opens the stock entry on this pair; null without the verb.
 * @property {(() => void) | null} onSync  Pulls this API supplier's stock; null for a manual supplier or without the verb.
 * @property {boolean} syncPending
 * @property {() => void} onClose
 */

/** @type {React.FC<MaterialDrawerProps>} */
const MaterialDrawer = ({
  position: p,
  risk,
  ptiCover,
  cycle,
  onRecord,
  onSync,
  syncPending,
  onClose
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pair = `${p.supplierId}-${p.materialCode}`;
  const alertsQuery = useInventoryAlerts();
  const posQuery = usePurchaseOrders({ status: [...CALL_OFF_PO_STATES] });
  const simQuery = useStockSimulation(dayOf(inventoryNow()), { supplierId: p.supplierId });

  const alerts = (alertsQuery.data?.items ?? []).filter(
    (a) => a.status === 'open' && a.supplierId === p.supplierId && a.subject === p.materialCode
  );
  const callOffsQuery = useCallOffs();
  // One rule with Stock simulation (P-06): a call-off only on a line with quantity left.
  const hasAgreementLine =
    agreementLineFor(
      posQuery.data?.items ?? [],
      callOffsQuery.data?.items ?? [],
      p.supplierId,
      p.materialCode
    ).state === 'line';
  const simRow = (simQuery.data?.items ?? []).find((r) => r.materialCode === p.materialCode);
  const free = simRow?.simulation?.freeToCallOff ?? null;
  const ptiBelow = p.ptiSoh !== null && p.ptiRop !== null && p.ptiSoh < p.ptiRop;
  const supplierCover = risk.basis.kind === 'leadTime' || risk.basis.kind === 'fallbackBands';
  const query = `supplier=${encodeURIComponent(p.supplierId)}&material=${encodeURIComponent(p.materialCode)}`;

  return (
    <SidePanel open onClose={onClose} title={`${p.materialCode} · ${p.materialLabel}`}>
      <div className="space-y-4" data-testid="material-drawer" data-pair={pair}>
        <div className="text-sm text-text-secondary space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-text-primary">{p.supplierName}</span>
            {p.consignment ? <StatusPill variant="info">{t('inv.consignment')}</StatusPill> : null}
          </div>
          <TradeNameBeside
            name={p.tradeName}
            viewer="pti"
            testId={`material-drawer-trade-name-${pair}`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label text-text-tertiary uppercase">
              <PicHeader />
            </span>
            <PicCell value={p.mrpController} testId={`pti-stock-pic-${pair}`} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label text-text-tertiary uppercase">
              {t('inv.col.thisCycle')}
            </span>
            <CycleCell value={cycle} testId={`pti-stock-cycle-${pair}`} />
          </div>
          {/* INV-D6 — the planner sees the mode; the administrator changes it. */}
          <div className="flex flex-wrap items-center gap-2" data-testid="material-drawer-mode">
            <span className="text-label text-text-tertiary uppercase">{t('inv.drawer.mode')}</span>
            <StatusPill variant={p.apiConnected ? 'info' : 'neutral'}>
              {t(`adminSup.mode.${p.apiConnected ? 'api' : 'manual'}`)}
            </StatusPill>
            <Link to="/buyer/admin/suppliers" className="text-xs text-action hover:underline">
              {t('inv.drawer.mode.link')}
            </Link>
          </div>
        </div>

        <Reason position={p} riskClass={risk.riskClass} basis={risk.basis} />

        <Tile label={t('inv.drawer.cover')} testId="material-drawer-cover">
          <div>
            {supplierCover ? (
              <Data>
                {t('inv.supplierCover', {
                  count: Math.floor(/** @type {{ daysOfCover: number }} */ (risk.basis).daysOfCover)
                })}
              </Data>
            ) : (
              <span className="text-xs text-text-tertiary">
                {p.supplierSoh === null ? t('inv.band.noFigures') : t('inv.band.noDemand')}
              </span>
            )}
          </div>
          <div className="text-xs text-text-secondary" data-testid="material-drawer-pti-cover">
            {ptiCover === null
              ? t('inv.ptiCover.none')
              : t('inv.ptiCover', { count: Math.floor(ptiCover) })}
          </div>
        </Tile>

        <div className="grid grid-cols-2 gap-2">
          <Tile label={t('inv.col.supplierSoh')} testId="material-drawer-supplier-soh">
            <Figure value={p.supplierSoh} uom={p.uom} absentKey="inv.figure.noSubmission" />
            {/* BL-194 (DRC-8 BR-c) — feedstock, its own line; never added to SOH. */}
            <FeedstockLine position={p} />
          </Tile>
          <Tile label={t('inv.drawer.fig.ptiSohRop')} testId="material-drawer-pti">
            {p.ptiSoh === null ? (
              <Figure value={null} absentKey="inv.figure.none" />
            ) : (
              <Data className={ptiBelow ? 'text-danger' : ''}>{formatNumber(p.ptiSoh)}</Data>
            )}{' '}
            / <Figure value={p.ptiRop} uom={p.uom} absentKey="inv.figure.none" />
          </Tile>
          <Tile
            label={
              <>
                {t('inv.col.supplierRop')}
                <span
                  className="block normal-case font-normal"
                  data-testid="inv-supplier-rop-display-only"
                >
                  {t('inv.col.supplierRop.displayOnly')}
                </span>
              </>
            }
          >
            <Figure value={p.supplierRop} uom={p.uom} absentKey="inv.figure.notProvided" />
            {/* DRC-D15 (BL-196) — the system's ROP Supplier, labelled. */}
            {p.systemRopSupplier !== undefined ? (
              <div
                className="text-xs text-text-tertiary"
                title={t('inv.systemRopSupplier.title')}
                data-testid={`inv-system-rop-${pair}`}
              >
                {p.systemRopSupplier?.value != null
                  ? t('inv.systemRopSupplier', {
                      value: `${formatNumber(p.systemRopSupplier.value)} ${p.uom}`
                    })
                  : t('inv.systemRopSupplier.none')}
              </div>
            ) : null}
          </Tile>
          <Tile label={t('inv.drawer.fig.free')} testId="material-drawer-free">
            {free === null ? (
              <Figure value={null} absentKey="inv.figure.none" />
            ) : (
              <Data
                className={free < 0 ? 'text-danger' : ''}
              >{`${formatNumber(free)} ${p.uom}`}</Data>
            )}
            <div className="text-xs text-text-tertiary">
              {simRow?.sample ? t('sim.sample') : t('inv.drawer.fig.freeSimulated')}
            </div>
          </Tile>
        </div>

        <section data-testid="material-drawer-alerts">
          <h3 className={labelClass}>{t('inv.drawer.alerts', { count: alerts.length })}</h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-text-tertiary">{t('inv.drawer.alerts.none')}</p>
          ) : (
            <ul className="space-y-1">
              {alerts.map((a) => (
                <li key={a.key} className="flex items-start gap-2 text-sm">
                  <RiskPill riskClass={a.riskClass} />
                  <span>{t(`inv.alerts.rule.${a.rule}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2" data-testid="material-drawer-actions">
          <h3 className={labelClass}>{t('inv.drawer.actions')}</h3>
          <div>
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/buyer/stock-simulation?q=${encodeURIComponent(p.materialCode)}&supplier=${encodeURIComponent(p.supplierId)}`
                )
              }
              data-testid="material-drawer-simulation"
            >
              {t('inv.drawer.action.simulation')}
            </Button>
            <p className="mt-1 text-xs text-text-tertiary">
              {t('inv.drawer.action.simulation.hint')}
            </p>
          </div>
          {posQuery.isPending || callOffsQuery.isPending ? null : hasAgreementLine ? (
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/buyer/call-offs?newFor=${encodeURIComponent(p.supplierId)}&material=${encodeURIComponent(p.materialCode)}`
                )
              }
              data-testid="material-drawer-calloff"
            >
              {t('inv.drawer.action.callOff')}
            </Button>
          ) : (
            <div>
              <Button
                variant="outline"
                onClick={() => navigate(`/buyer/purchase-requisition?new=1&${query}`)}
                data-testid="material-drawer-po"
              >
                {t('inv.drawer.action.po')}
              </Button>
              <p className="mt-1 text-xs text-text-tertiary" data-testid="material-drawer-no-line">
                {t('co.prefill.noLine', { supplier: p.supplierName, material: p.materialCode })}
              </p>
            </div>
          )}
          {onSync ? (
            <Button
              variant="outline"
              icon={RefreshCw}
              disabled={syncPending}
              onClick={onSync}
              aria-label={t('inv.sync.button', { supplier: p.supplierName })}
              data-testid="material-drawer-sync"
            >
              {t('inv.sync.action')}
            </Button>
          ) : null}
          {onRecord ? (
            <div>
              <Button
                variant="outline"
                icon={MessageSquarePlus}
                onClick={onRecord}
                data-testid="material-drawer-record"
              >
                {t('inv.pti.record')}
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </SidePanel>
  );
};

export default MaterialDrawer;
