/** @import React from 'react' */
/** @import { CallOff, CapacityPlan, InventoryAlert, InventoryAlertRule, InventoryPosition, PurchaseOrder, StockSimulationRow } from '@services/data/types' */
/** @import { SupplierAskTopic } from '@services/transitions/supplierAskRules' */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { gapWeeks } from '@services/transitions/capacityRules';
import { NO_DAYS_TO_IMPACT } from '@services/transitions/inventoryAlertRules';
import AskSupplierButton from './AskSupplierButton';
import { qty } from './inventoryDisplay';
import { callOffHref, poRequestHref, stockSimulationHref } from './inventoryLinks';
import { agreementLineFor, isOverCalled } from './stockSimulationDisplay';
import { weekLabel } from '../BuyerDemandAnticipation/display';

// ─────────────────────────────────────────────────────────────────────────────
// Inventory UX P-03 and P-08 on the PTI Alerts page.
//
// P-03 (INV-D5) — each alert says by when ("Impact in N days", the
// `daysToImpact` the list is sorted on) and what to do: a one-line next step
// per rule and the actions that fit it. "Create call-off" shows only where the
// pair has an agreement line with quantity left and is not over-called — the
// rule the material drawer and Stock simulation use (`agreementLineFor`,
// `isOverCalled`); otherwise "Create PO request". "Ask supplier" is the hub
// ask (INV-D9) on the topic that fits the rule.
//
// P-08 (INV-D1) — each rule shows its own basis instead of one "Cover N days"
// line: PTI stock against the PTI ROP for the PTI-stock rules, the shortfall
// and first gap week for capacity, and "Supplier cover" with the lead time for
// the rules the CR-24 class is decided on. The class rule itself is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What each rule offers. `simulation`: "Open stock simulation"; `order`:
 * "Create call-off" or "Create PO request"; `ask`: the "Ask supplier" topic;
 * `link`: the page link the rule already had (`alertHref`).
 * @typedef {{
 *   readonly simulation?: true;
 *   readonly order?: true;
 *   readonly ask?: SupplierAskTopic;
 *   readonly link?: true;
 * }} AlertPlan
 */

/** @type {Readonly<Record<InventoryAlertRule, AlertPlan>>} */
export const ALERT_PLAN = {
  ptiBelowRop: { simulation: true, order: true, ask: 'productionDate' },
  // PSC-5 BR-02 (BL-341) — excess stock: PTI reviews the level at its ROP home.
  ptiAtOrAboveMax: { link: true },
  projectedStockOut: { simulation: true, order: true, ask: 'productionDate' },
  coverage: { simulation: true, order: true, ask: 'productionDate' },
  supplierBelowRop: { simulation: true, ask: 'productionDate' },
  callOffNotCovered: { simulation: true, ask: 'productionDate' },
  staleData: { ask: 'stockFigures', link: true },
  leadTimeMissing: { ask: 'other', link: true },
  capacityBelowDemand: { ask: 'capacityGap', link: true },
  commitmentBelowForecast: { link: true },
  supplyDiscontinued: { link: true },
  blanketPoRunOut: { link: true },
  demandAnticipationUnabsorbed: { link: true }
};

/** Rules whose `daysToImpact` is not computed (it defaults to 0): no impact line. */
const NO_IMPACT_RULES = /** @type {readonly InventoryAlertRule[]} */ ([
  'commitmentBelowForecast',
  'leadTimeMissing',
  // PSC-5 BR-02 (BL-341) — excess stock has no day it bites: no impact line.
  'ptiAtOrAboveMax'
]);

/** Rules about PTI's own stock: their basis is PTI stock against the PTI ROP (INV-D1). */
const PTI_STOCK_RULES = /** @type {readonly InventoryAlertRule[]} */ ([
  'ptiBelowRop',
  'projectedStockOut'
]);

/**
 * The figures the page reads once and every alert row looks up.
 * @typedef {object} AlertContext
 * @property {readonly InventoryPosition[]} positions
 * @property {readonly CapacityPlan[]} plans
 * @property {readonly PurchaseOrder[]} pos
 * @property {readonly CallOff[]} callOffs
 * @property {readonly StockSimulationRow[]} simulation
 * @property {boolean} ordersReady  False while the POs or call-offs load: no order action yet.
 */

/**
 * The first gap week of a capacity alert's plan, with how much is short.
 * @param {InventoryAlert} a
 * @param {readonly CapacityPlan[]} plans
 * @returns {{ week: string; short: number; uom: string } | null}
 */
export function firstGap(a, plans) {
  const plan = plans.find((p) => p.supplierId === a.supplierId && p.planningGroupId === a.subject);
  const w = plan ? gapWeeks(plan)[0] : undefined;
  if (!plan || !w || !w.entry) return null;
  return { week: w.week, short: w.demand - w.entry.allocated, uom: plan.uom };
}

/**
 * P-03 — the order action that fits the pair: a call-off on an agreement line
 * with quantity left that is not over-called, else a PO request.
 * @param {InventoryAlert} a
 * @param {AlertContext} ctx
 * @returns {'callOff' | 'po' | 'overCalled'}
 */
export function orderActionFor(a, ctx) {
  const line = agreementLineFor(ctx.pos, ctx.callOffs, a.supplierId, a.subject);
  if (line.state !== 'line') return 'po';
  const row = ctx.simulation.find(
    (r) => r.supplierId === a.supplierId && r.materialCode === a.subject
  );
  return isOverCalled(row?.simulation ?? null) ? 'overCalled' : 'callOff';
}

/**
 * P-03 — "Impact in N days", or how long a stale figure has been out of date.
 * @type {React.FC<{ alert: InventoryAlert }>}
 */
export const AlertImpact = ({ alert: a }) => {
  const { t } = useTranslation();
  if (NO_IMPACT_RULES.includes(a.rule) || a.daysToImpact === NO_DAYS_TO_IMPACT) return null;
  let text;
  if (a.rule === 'staleData')
    text =
      a.daysToImpact === -NO_DAYS_TO_IMPACT
        ? t('inv.alerts.impact.neverSent')
        : a.daysToImpact === 0
          ? t('inv.alerts.impact.staleToday')
          : t('inv.alerts.impact.stale', { count: -a.daysToImpact });
  else {
    const days = Math.floor(a.daysToImpact);
    text = days <= 0 ? t('inv.alerts.impact.now') : t('inv.alerts.impact', { count: days });
  }
  return (
    <Data className="text-xs whitespace-nowrap" data-testid={`alert-impact-${a.key}`}>
      {text}
    </Data>
  );
};

/**
 * P-08 — the basis the rule itself rests on.
 * @param {(k: string, o?: Record<string, unknown>) => string} t
 * @param {InventoryAlert} a
 * @param {AlertContext} ctx
 * @returns {string | null}
 */
export function alertBasisText(t, a, ctx) {
  // PSC-5 BR-02 (BL-341) — PTI stock against the DRC-10 Max, its own basis:
  // "at or above Max" is page copy, not a new `RiskBasis` kind.
  if (a.rule === 'ptiAtOrAboveMax') {
    const p = ctx.positions.find(
      (x) => x.supplierId === a.supplierId && x.materialCode === a.subject
    );
    if (!p || p.ptiSoh === null) return t('inv.alerts.basis.ptiNone');
    const max = p.systemMax?.value ?? null;
    if (max === null) return null;
    return t('inv.alerts.basis.atMax', {
      pti: qty(p.ptiSoh),
      max: qty(max),
      uom: p.uom
    });
  }
  if (PTI_STOCK_RULES.includes(a.rule)) {
    const p = ctx.positions.find(
      (x) => x.supplierId === a.supplierId && x.materialCode === a.subject
    );
    if (!p || p.ptiSoh === null) return t('inv.alerts.basis.ptiNone');
    return t('inv.alerts.basis.pti', {
      pti: qty(p.ptiSoh),
      rop: p.ptiRop === null ? '—' : qty(p.ptiRop),
      uom: p.uom
    });
  }
  if (a.rule === 'capacityBelowDemand') {
    const gap = firstGap(a, ctx.plans);
    return gap
      ? t('inv.alerts.basis.short', {
          qty: qty(gap.short),
          uom: gap.uom,
          week: weekLabel(gap.week)
        })
      : null;
  }
  if (a.rule === 'commitmentBelowForecast')
    return t(a.riskClass === 'high' ? 'inv.alerts.basis.firm' : 'inv.alerts.basis.tradeOff');
  const b = a.riskBasis;
  if (b.kind === 'leadTime')
    return t('inv.alerts.basis.supplierCover', {
      cover: Math.floor(b.daysOfCover),
      lead: b.leadTimeDays
    });
  if (b.kind === 'fallbackBands')
    // "No lead time on record" is said once, by the pair's own lead-time alert
    // (same supplier group); every basis line on the fallback names the bands only.
    return t('inv.alerts.basis.supplierCoverBands', {
      cover: Math.floor(b.daysOfCover),
      band: t(`inv.band.${b.band}`)
    });
  return null;
}

/**
 * P-08 — the basis line under the rule sentence.
 * @type {React.FC<{ alert: InventoryAlert; ctx: AlertContext }>}
 */
export const AlertBasis = ({ alert: a, ctx }) => {
  const { t } = useTranslation();
  const text = alertBasisText(t, a, ctx);
  if (text === null) return null;
  return (
    <Data
      className={`block text-xs ${a.riskBasis.kind === 'fallbackBands' ? 'text-warning-hover' : 'text-text-secondary'}`}
      data-testid={`alert-basis-${a.key}`}
      data-basis={a.rule}
    >
      {text}
    </Data>
  );
};

/**
 * P-03 — the next step sentence and the actions that fit an open alert.
 * @type {React.FC<{ alert: InventoryAlert; ctx: AlertContext }>}
 */
export const AlertNextStep = ({ alert: a, ctx }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const plan = ALERT_PLAN[a.rule];
  const gap = a.rule === 'capacityBelowDemand' ? firstGap(a, ctx.plans) : null;
  const order = plan.order && ctx.ordersReady ? orderActionFor(a, ctx) : null;
  const sentence = [
    t(`inv.alerts.next.${a.rule}`, { week: gap ? weekLabel(gap.week) : '' }),
    order ? t(`inv.alerts.next.order.${order}`) : ''
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="mt-2" data-testid={`alert-next-${a.key}`}>
      <p className="text-xs text-text-secondary">
        <span className="text-label text-text-tertiary uppercase mr-2">
          {t('inv.alerts.nextStep')}
        </span>
        <span data-testid={`alert-next-text-${a.key}`}>{sentence}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {plan.simulation ? (
          <Button
            variant="outline"
            onClick={() => navigate(stockSimulationHref(a.supplierId, a.subject))}
            data-testid={`alert-simulation-${a.key}`}
          >
            {t('inv.drawer.action.simulation')}
          </Button>
        ) : null}
        {order === 'callOff' ? (
          <Button
            variant="outline"
            onClick={() => navigate(callOffHref(a.supplierId, a.subject))}
            data-testid={`alert-calloff-${a.key}`}
          >
            {t('inv.drawer.action.callOff')}
          </Button>
        ) : null}
        {order === 'po' || order === 'overCalled' ? (
          <Button
            variant="outline"
            onClick={() => navigate(poRequestHref(a.supplierId, a.subject))}
            data-testid={`alert-po-${a.key}`}
          >
            {t('inv.drawer.action.po')}
          </Button>
        ) : null}
        {plan.ask && (a.rule !== 'capacityBelowDemand' || gap) ? (
          <span data-testid={`alert-ask-${a.key}`} data-topic={plan.ask}>
            {a.rule === 'capacityBelowDemand' && gap ? (
              <AskSupplierButton
                supplierId={a.supplierId}
                planningGroupId={a.subject}
                week={gap.week}
                topic={plan.ask}
                riskClass={a.riskClass}
                testId={`alert-ask-${a.key}`}
              />
            ) : (
              <AskSupplierButton
                supplierId={a.supplierId}
                materialCode={a.subject}
                topic={plan.ask}
                riskClass={a.riskClass}
                defaultQuestion={
                  a.rule === 'leadTimeMissing' ? t('inv.alerts.ask.leadTime') : undefined
                }
                testId={`alert-ask-${a.key}`}
              />
            )}
          </span>
        ) : null}
      </div>
    </div>
  );
};
