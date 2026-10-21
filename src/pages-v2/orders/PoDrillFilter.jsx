/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { usePlanningGroupLabel } from '../inventory/planningGroupDisplay';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppShellV2 from '@components/layout-v2/AppShellV2';
import PageHeader from '@components/ui-v2/PageHeader';
import Data from '@components/ui-v2/Data';
import { usePurchaseOrders } from '@services/query/hooks';
/** @import { PurchaseOrder } from '@services/data/types' */
/** @import { Persona } from '@components/layout-v2/navConfig' */
/** @import { PoFocus } from './orderSummaryDrill' */
import {
  FROM_ORDER_SUMMARY,
  FROM_PARAM,
  FROM_PO,
  PO_PARAM,
  orderSummaryPath,
  purchaseOrderPath,
  parseIdParam,
  parseListParam,
  parseWeeksParam
} from './orderSummaryDrill';

// ─────────────────────────────────────────────────────────────────────────────
// THE DESTINATION HALF OF THE DRILL-THROUGH — REQ-E07-03 BR-04 to BR-07,
// AC-02, AC-07 and AC-08.
//
// Every page a summary cell can reach reads its PO filter from here, shows the
// same banner, and offers the same way back. Four states, and the requirement
// names all four:
//
//   · `none`        — no `po` in the address. NORMAL NAVIGATION FROM THE MENU IS
//                     UNTOUCHED, which is the constraint that rules out making
//                     the filter a route segment.
//   · `malformed`   — a `po` value that is not a document id. The filter is
//                     IGNORED and the page says it showed everything, rather
//                     than showing nothing and looking broken.
//   · `notFound`    — a `po` the scoped PO read does not return. ⚠️ **ONE STATE
//                     FOR TWO CAUSES, ON PURPOSE.** A PO that does not exist and
//                     another supplier's PO must be indistinguishable (AC-07:
//                     "no hint that the PO exists"). Because the read is already
//                     supplier-scoped (`applySupplierScope`), a supplier CANNOT
//                     reach the `filtered` branch for someone else's order — so
//                     tenancy is enforced by the data service and merely
//                     *reported* here. Nothing in this file compares supplier
//                     ids, and that is why it cannot leak one.
//   · `filtered`    — the PO, plus the secondary filters BR-05 needs.
//
// ⚠️ **NAVIGATION IS A READ (BR-07), SO NOTHING HERE CONSULTS A ROLE.** A user
// whose seat does not hold the destination's verbs still lands on the filtered
// records; the page's existing `useVerbAvailability` + `HandoffNotice` withhold
// the ACTIONS and name their owner. Gating the navigation on a role would delete
// the records instead of the buttons, which is the failure AC-09 pins.
// ─────────────────────────────────────────────────────────────────────────────

/**
 *  The PO read has not resolved yet, and an address named a PO.
 *  BR-05 — the material groups the capacity destination was sent.
 *  BR-05 — the Mondays the PO delivers into.
 *  BR-05 — the materials the foresight destination was sent.
 *  A secondary filter value could not be read, so it was ignored.
 *
 * @typedef {| { readonly kind: 'none' }
 *   | { readonly kind: 'pending' }
 *   | { readonly kind: 'malformed'; readonly fromSummary: boolean; readonly fromPo: boolean }
 *   | { readonly kind: 'notFound'; readonly fromSummary: boolean; readonly fromPo: boolean }
 *   | {
 *       readonly kind: 'filtered';
 *       readonly po: PurchaseOrder;
 *       readonly fromSummary: boolean;
 *       readonly fromPo: boolean;
 *       readonly focus: PoFocus | null;
 *       readonly groups: readonly string[] | null;
 *       readonly weeks: readonly string[] | null;
 *       readonly materials: readonly string[] | null;
 *       readonly partialMalformed: boolean;
 *     }} PoDrill
 */

/**
 * The PO's number when a filter is active, else `null` — the join key pages use.
 * @param {PoDrill} drill
 * @returns {string | null}
 */
export const drilledPoNumber = (drill) => (drill.kind === 'filtered' ? drill.po.poNumber : null);

/**
 * The PO's id when a filter is active, else `null`.
 * @param {PoDrill} drill
 * @returns {string | null}
 */
export const drilledPoId = (drill) => (drill.kind === 'filtered' ? drill.po.id : null);

/**
 * Read the PO filter off the address.
 *
 * The PO read it resolves against is the CALLER'S OWN SCOPE — the same
 * `usePurchaseOrders()` every page uses, deduplicated by react-query — so a
 * supplier resolving an id it does not hold gets `notFound` for free.
 * @returns {PoDrill}
 */
export function usePoDrillFilter() {
  const [params] = useSearchParams();
  const ordersQuery = usePurchaseOrders();
  const raw = params.get(PO_PARAM);
  const fromSummary = params.get(FROM_PARAM) === FROM_ORDER_SUMMARY;
  // P-01 — opened from a PO record's lifecycle step.
  const fromPo = params.get(FROM_PARAM) === FROM_PO;

  const parsed = parseIdParam(raw);
  if (parsed.kind === 'absent') return { kind: 'none' };
  if (parsed.kind === 'malformed') return { kind: 'malformed', fromSummary, fromPo };
  if (ordersQuery.isPending) return { kind: 'pending' };

  const po = (ordersQuery.data?.items ?? []).find((p) => p.id === parsed.value) ?? null;
  if (!po) return { kind: 'notFound', fromSummary, fromPo };

  const groups = parseListParam(params.get('groups'));
  const weeks = parseWeeksParam(params.get('weeks'));
  const materials = parseListParam(params.get('materials') ?? params.get('material'));
  const focusRaw = params.get('focus');
  /** @type {PoFocus | null} */
  const focus = focusRaw === 'response' || focusRaw === 'shipping' ? focusRaw : null;

  return {
    kind: 'filtered',
    po,
    fromSummary,
    fromPo,
    focus,
    groups: groups.kind === 'ok' ? groups.value : null,
    weeks: weeks.kind === 'ok' ? weeks.value : null,
    materials: materials.kind === 'ok' ? materials.value : null,
    partialMalformed:
      groups.kind === 'malformed' || weeks.kind === 'malformed' || materials.kind === 'malformed'
  };
}

/**
 * "Back to order summary" — BR-04. Rendered only when the user came from it.
 * @type {React.FC<{ persona: Persona }>}
 */
export const BackToOrderSummary = ({ persona }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={orderSummaryPath(persona)}
      data-testid="back-to-order-summary"
      className="inline-flex items-center gap-1 text-sm text-action hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {t('oc.drill.back')}
    </Link>
  );
};

/**
 * "Back to purchase order <PO number>" — P-01. Rendered only when the page was
 * opened from that PO's lifecycle steps; it reopens the PO on Purchase orders.
 * @type {React.FC<{ persona: Persona; po: PurchaseOrder }>}
 */
export const BackToPurchaseOrder = ({ persona, po }) => {
  const { t } = useTranslation();
  return (
    <Link
      to={purchaseOrderPath(persona, po.id)}
      data-testid="back-to-purchase-order"
      className="inline-flex items-center gap-1 text-sm text-action hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-action rounded"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {t('oc.drill.backToPo', { poNumber: po.poNumber })}
    </Link>
  );
};

/** Why capacity or foresight shows the rows it shows (BR-05, AC-04). */
/** @typedef {'capacity' | 'foresight'} DrillReason */

/**
 * The banner every destination shows: which PO it is filtered by, how many
 * records that is, why these rows (for the two per-group destinations), and the
 * way back. Renders nothing when no filter is in play, so a visit from the menu
 * looks exactly as it did.
 * `count`:  How many records the page is about to list — AC-10's visible half.
 * `reason`:  BR-05 — states the grain and the filter for capacity and foresight.
 * @type {React.FC<{ drill: PoDrill; persona: Persona; count?: number; reason?: DrillReason; testId?: string; }>}
 */
export const PoFilterBanner = ({
  drill,
  persona,
  count,
  reason,
  // i18n-defer: a `data-testid` value, not copy — it reaches a test hook, never a reader.
  testId = 'po-filter-banner'
}) => {
  const { t } = useTranslation();
  const groupLabel = usePlanningGroupLabel();
  if (drill.kind === 'none' || drill.kind === 'pending') return null;

  if (drill.kind === 'malformed') {
    return (
      <div
        role="status"
        data-testid={testId}
        data-drill-state="malformed"
        className="bg-bg-hover border-l-2 border-border-subtle rounded px-4 py-3 mb-4 text-sm text-text-secondary"
      >
        <div>{t('oc.drill.malformed')}</div>
        {drill.fromSummary && (
          <div className="mt-2">
            <BackToOrderSummary persona={persona} />
          </div>
        )}
      </div>
    );
  }

  if (drill.kind === 'notFound') {
    // The page itself renders `OrderNotFound`; a banner here would be a second
    // voice saying the same thing.
    return null;
  }

  const { po } = drill;
  return (
    <div
      role="status"
      data-testid={testId}
      data-drill-state="filtered"
      className="bg-action-soft border-l-2 border-action rounded px-4 py-3 mb-4 text-sm text-text-secondary"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span data-testid="po-filter-statement">
          {reason
            ? t('oc.drill.filtered.supplier', { supplier: po.supplierName, poNumber: po.poNumber })
            : t('oc.drill.filtered', { poNumber: po.poNumber })}
        </span>
        {count !== undefined && (
          <span className="text-text-tertiary" data-testid="po-filter-count">
            {count === 0
              ? t('oc.drill.count.zero')
              : count === 1
                ? t('oc.drill.single')
                : t('oc.drill.count.other', { count })}
          </span>
        )}
        {drill.fromSummary && (
          <span className="ml-auto">
            <BackToOrderSummary persona={persona} />
          </span>
        )}
        {drill.fromPo ? (
          <span className="ml-auto">
            <BackToPurchaseOrder persona={persona} po={po} />
          </span>
        ) : null}
      </div>
      {reason && (
        <div className="mt-1 text-text-tertiary" data-testid="po-filter-reason">
          {t(`oc.drill.reason.${reason}`, { supplier: po.supplierName })}
        </div>
      )}
      {reason === 'capacity' && drill.groups && drill.groups.length > 0 && (
        <div className="mt-1 text-text-tertiary">
          {t('oc.drill.groups')}: {drill.groups.map(groupLabel).join(', ')}
          {drill.weeks && drill.weeks.length > 0 && (
            <>
              {' · '}
              {t('oc.drill.weeks')}: <Data>{drill.weeks.join(', ')}</Data>
            </>
          )}
        </div>
      )}
      {reason === 'foresight' && drill.materials && drill.materials.length > 0 && (
        <div className="mt-1 text-text-tertiary">
          {t('oc.drill.materials')}: <Data>{drill.materials.join(', ')}</Data>
        </div>
      )}
      {drill.focus && (
        <div className="mt-1 text-text-tertiary" data-testid="po-filter-focus">
          {t(`oc.drill.focus.${drill.focus}`)}
        </div>
      )}
      {drill.partialMalformed && (
        <div className="mt-1 text-text-tertiary" data-testid="po-filter-partial-malformed">
          {t('oc.drill.malformed.partial', { poNumber: po.poNumber })}
        </div>
      )}
    </div>
  );
};

/**
 * AC-07 and AC-08 in one page. The copy names no supplier and admits no
 * existence: an unknown order and another supplier's order read identically,
 * which is the only way the refusal can avoid being an oracle.
 * @type {React.FC<{ persona: Persona; breadcrumb?: string[] }>}
 */
export const OrderNotFound = ({ persona, breadcrumb }) => {
  const { t } = useTranslation();
  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={breadcrumb ?? [t('oc.summary.title')]}
        title={t('oc.drill.notFound.title')}
        subtitle={t('oc.drill.notFound.body')}
      />
      <div
        className="py-12 px-6 flex flex-col items-center text-center gap-4"
        data-testid="order-not-found"
      >
        <div className="text-sm text-text-tertiary max-w-md">{t('oc.drill.notFound.body')}</div>
        <BackToOrderSummary persona={persona} />
      </div>
    </AppShellV2>
  );
};
