/** @import React from 'react' */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { useHubRole } from './hubRole';
import { useServiceQuery } from '@services/query/useServiceQuery';
import { callOffViews } from '@services/transitions/callOffRules';
import { atomsForSeat } from '@services/transitions/customRoles';
import { sdcClock } from '@services/sdc/clock';
/** @import { SupplierChaseView } from '@services/chase' */
/** @import { HomeTask } from '@pages-v2/home/TaskList' */
import { sapInterfaceObjects } from '@pages-v2/interface/sapInterfaceDisplay';
import { buyerTodoTasks } from '@pages-v2/home/buyerTodo';
import { withSeverity } from '@pages-v2/home/severityDisplay';
import { sortTasks } from '@pages-v2/home/TaskList';
import { ordersNow } from '@pages-v2/orders/PoCollaboration';

// ─────────────────────────────────────────────────────────────────────────────
// The PTI bell (BL-361) — the buyer's To-do count, from the To-do BuyerHome
// already derives.
//
// BL-213 removed the fixed "3" because no buyer notice source existed. The
// owner chose the source on 2026-11-25: the same `buyerTodoTasks` derivation
// `BuyerHome` renders. This bell calls THAT function, so it cannot drift from
// the page: one predicate list, two surfaces.
//
// The count is OPEN WORK, not notices — so there is no read/unread state and
// nothing is stored. Opening the panel lists the same rows with their links.
//
// ── THE SHELL'S READS ────────────────────────────────────────────────────────
// SAME KEYS as the page hooks in `services/query/hooks.js`, so the bell shares
// the page's cache, but with `retryOnMount: false`: the shell remounts when a
// page swaps its Loading shell for its Error shell, and a shell read that
// re-fetched an errored query on mount would flip that page back to Loading,
// for ever. And `gcTime: Infinity`: these reads back the bell on every buyer
// page, so they are never garbage-collected (a finite gcTime would leave one
// pending timer per read on unmount).
// ─────────────────────────────────────────────────────────────────────────────

const SHELL = { retryOnMount: false, gcTime: Infinity };
const useShellPurchaseOrders = () =>
  useServiceQuery(
    ['procurement', 'purchaseOrders', undefined],
    (svc, scope) => svc.procurement.getPurchaseOrders(scope, undefined),
    SHELL
  );
const useShellBuyerInvoices = () =>
  useServiceQuery(
    ['procurement', 'buyerInvoices', undefined],
    (svc, scope) => svc.procurement.getBuyerInvoices(scope, undefined),
    SHELL
  );
const useShellRfqs = () =>
  useServiceQuery(
    ['procurement', 'rfqs', undefined],
    (svc, scope) => svc.procurement.getRFQs(scope, undefined),
    SHELL
  );
const useShellRequisitions = () =>
  useServiceQuery(
    ['procurement', 'requisitions', undefined],
    (svc, scope) => svc.procurement.getRequisitions(scope, undefined),
    SHELL
  );
const useShellDocuments = () =>
  useServiceQuery(
    ['procurement', 'documents'],
    (svc, scope) => svc.procurement.getDocuments(scope),
    SHELL
  );
const useShellGoodsReceipts = () =>
  useServiceQuery(
    ['procurement', 'goodsReceipts', undefined],
    (svc, scope) => svc.procurement.getGoodsReceipts(scope, undefined),
    SHELL
  );
const useShellAsns = () =>
  useServiceQuery(
    ['procurement', 'asns', undefined],
    (svc, scope) => svc.procurement.getASNs(scope, undefined),
    SHELL
  );
const useShellCallOffs = () =>
  useServiceQuery(
    ['procurement', 'callOffs'],
    (svc, scope) => svc.procurement.getCallOffs(scope),
    SHELL
  );
const useShellCallOffChase = () =>
  useServiceQuery(
    ['procurement', 'callOffChase'],
    (svc, scope) => svc.procurement.getCallOffChase(scope),
    SHELL
  );
const useShellInventoryAlerts = () =>
  useServiceQuery(
    ['procurement', 'inventoryAlerts'],
    (svc, scope) => svc.procurement.getInventoryAlerts(scope),
    SHELL
  );
const useShellCapacityPlans = () =>
  useServiceQuery(
    ['procurement', 'capacityPlans'],
    (svc, scope) => svc.procurement.getCapacityPlans(scope),
    SHELL
  );
const useShellForecastCommitments = () =>
  useServiceQuery(
    ['procurement', 'forecastCommitments'],
    (svc, scope) => svc.procurement.getForecastCommitments(scope),
    SHELL
  );
const useShellNegotiationRounds = () =>
  useServiceQuery(
    ['procurement', 'negotiationRounds'],
    (svc, scope) => svc.procurement.getNegotiationRounds(scope),
    SHELL
  );
const useShellNpdReviews = () =>
  useServiceQuery(
    ['procurement', 'npdReviews'],
    (svc, scope) => svc.procurement.getNpdReviews(scope),
    SHELL
  );
const useShellRopFisikPrs = () =>
  useServiceQuery(
    ['procurement', 'ropFisikPrRecommendations'],
    (svc, scope) => svc.procurement.getRopFisikPrRecommendations(scope),
    SHELL
  );
// Same key and shape as `useUnifiedChase()`; the cast is the one chaseHooks uses
// because the fetcher unwraps `.items`.
const useShellUnifiedChase = () =>
  /** @type {typeof useServiceQuery<readonly SupplierChaseView[]>} */ (useServiceQuery)(
    ['chase', 'unified'],
    async (svc, scope) => (await svc.chase.getUnifiedChase(scope)).items,
    SHELL
  );

/**
 * The buyer's To-do rows, in the same order and with the same labels the page
 * renders, derived from the shell's reads.
 * @returns {HomeTask[]}
 */
function usePtiTodoRows() {
  const { t } = useTranslation();
  const [role] = useHubRole();
  const { identity } = useCurrentIdentity();
  const holdsInboundAck = atomsForSeat(identity.businessRoles).includes('inbound:acknowledge');
  const pos = useShellPurchaseOrders();
  const invoices = useShellBuyerInvoices();
  const rfqs = useShellRfqs();
  const requisitions = useShellRequisitions();
  const documents = useShellDocuments();
  const receipts = useShellGoodsReceipts();
  const asns = useShellAsns();
  const chase = useShellUnifiedChase();
  const callOffs = useShellCallOffs();
  const missingAsn = useShellCallOffChase();
  const alerts = useShellInventoryAlerts();
  const capacity = useShellCapacityPlans();
  const forecastLines = useShellForecastCommitments();
  const rounds = useShellNegotiationRounds();
  const npdReviews = useShellNpdReviews();
  const ropFisikPrs = useShellRopFisikPrs();

  // REQ-E09-03 / REQ-E09-04 — the view projection BuyerHome's `useCallOffViews`
  // computes, over the shell's reads.
  const views = useMemo(
    () =>
      callOffViews(
        callOffs.data?.items ?? [],
        asns.data?.items ?? [],
        receipts.data?.items ?? [],
        sdcClock.now()
      ),
    [callOffs.data, asns.data, receipts.data]
  );
  // REQ-E07-08 — the same monitor objects, so the "SAP messages failed" task
  // counts what the monitor counts.
  const sapFailures = useMemo(
    () =>
      sapInterfaceObjects({
        purchaseOrders: pos.data,
        goodsReceipts: receipts.data,
        asns: asns.data,
        invoices: invoices.data,
        nowIso: sdcClock.now()
      }).flatMap((o) => o.failures),
    [pos.data, receipts.data, asns.data, invoices.data]
  );

  return useMemo(() => {
    const nowIso = ordersNow();
    return sortTasks(
      withSeverity(
        buyerTodoTasks({
          t,
          role,
          holdsInboundAck,
          nowIso,
          purchaseOrders: pos.data,
          buyerInvoices: invoices.data,
          rfqs: rfqs.data,
          requisitions: requisitions.data,
          documents: documents.data,
          goodsReceipts: receipts.data,
          asns: asns.data,
          chase: chase.data,
          callOffViews: views,
          missingAsnChase: missingAsn.data,
          inventoryAlerts: alerts.data,
          capacityPlans: capacity.data,
          forecastLines: forecastLines.data,
          negotiationRounds: rounds.data,
          sapFailures,
          npdReviews: npdReviews.data,
          ropFisikPrs: ropFisikPrs.data
        }),
        nowIso,
        t
      )
    );
  }, [
    t,
    role,
    holdsInboundAck,
    pos.data,
    invoices.data,
    rfqs.data,
    requisitions.data,
    documents.data,
    receipts.data,
    asns.data,
    chase.data,
    views,
    missingAsn.data,
    alerts.data,
    capacity.data,
    forecastLines.data,
    rounds.data,
    sapFailures,
    npdReviews.data,
    ropFisikPrs.data
  ]);
}

/**
 * The PTI bell for a buyer seat (BL-361): the badge is the number of open To-do
 * items — the SAME rows `BuyerHome` renders — and opening it lists them with
 * their links. No read/unread state: this is actionable work, not notices.
 * @type {React.FC}
 */
export const PtiTodoBell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rows = usePtiTodoRows();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const todoCount = rows.reduce((n, row) => n + row.count, 0);

  useEffect(() => {
    if (!open) return undefined;
    /** @param {MouseEvent} e */
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(/** @type {Node} */ (e.target))) {
        setOpen(false);
      }
    };
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        // BL-84 (WCAG 4.1.2): the badge number is in the name, INCLUDING 0 —
        // the name and the badge never disagree. BL-361 — the number is the
        // derived To-do count, never a literal.
        aria-label={t('topbar.todo.count', { count: todoCount })}
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="relative p-2 rounded-md text-text-secondary hover:bg-bg-hover"
        data-testid="pti-notice-bell"
        data-todo-count={todoCount}
      >
        <Bell size={18} />
        {todoCount > 0 ? (
          <span
            aria-hidden="true"
            data-testid="pti-todo-badge"
            className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center"
          >
            {todoCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute right-0 mt-1 w-80 max-w-[calc(100vw-2rem)] z-50 bg-bg-surface border border-border-subtle rounded-lg shadow-md"
          data-testid="pti-todo-panel"
        >
          <p className="px-4 pt-3 pb-1 text-label uppercase text-text-tertiary">
            {t('hub.home.pti.title')}
          </p>
          {rows.length === 0 ? (
            <div className="px-4 pb-3">
              <p className="text-sm font-semibold text-text-primary">{t('hub.home.empty.title')}</p>
              <p className="text-sm text-text-secondary">{t('hub.home.empty.body')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    data-testid={`pti-todo-${row.id}`}
                    data-count={row.count}
                    onClick={() => {
                      setOpen(false);
                      navigate(row.to);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-bg-hover"
                  >
                    <span className="w-8 shrink-0 text-right text-sm font-semibold text-data-navy">
                      {row.count}
                    </span>
                    <span className="flex-1 min-w-0 text-sm text-text-primary">{row.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
};
