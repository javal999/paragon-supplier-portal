/** @import React from 'react' */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { deepLink } from '@lib/deepLink';
import { formatDate } from '@lib/format';
import { useServiceQuery } from '@services/query/useServiceQuery';
import {
  outcomeShareText,
  supplierAwardNotices,
  supplierSourcingQueue
} from '@services/sourcing/supplierOutcome';
import { markRead, readSeat, seatKeyFor } from '@services/stores/noticeReadsStore';
import { POStatus } from '@services/data/types';
/** @import { SupplierAwardNotice } from '@services/sourcing/supplierOutcome' */
/** @import { CallOff, PurchaseOrder, SupplierInvoice } from '@services/data/types' */
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { TFunction } from 'i18next' */

// ─────────────────────────────────────────────────────────────────────────────
// The supplier's in-hub notices and menu counts (RFx UX S-04, S-05, X-02;
// Inventory UX S-04; BL-213).
//
// Every POPULATION here is DERIVED at read from the supplier's own scoped
// reads, so the bell and the To do cannot disagree. The one STORED fact is
// which notices the seat has OPENED: `noticeReadsStore`, keyed per seat, holds
// ids only, and the unread count is `notices ∖ read`. Rendered only for a
// supplier seat; the PTI top bar and menu are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

// The shell's reads. SAME KEYS as `useRFQs()`, `useAwards()` … in
// `services/query/hooks.js`, so they share the page's cache, but with
// `retryOnMount: false`: the shell remounts whenever a page swaps its Loading
// shell for its Error shell, and a shell read that re-fetched an errored query
// on mount would flip that page back to Loading, for ever.
// And `gcTime: Infinity`: these six reads back the shell on every supplier page,
// so they are never garbage-collected — which also means unmounting the shell
// schedules no gc timer (a finite gcTime leaves one pending per read).
const SHELL = { retryOnMount: false, gcTime: Infinity };
const useShellRfqs = () =>
  useServiceQuery(
    ['procurement', 'rfqs', undefined],
    (svc, scope) => svc.procurement.getRFQs(scope, undefined),
    SHELL
  );
const useShellAwards = () =>
  useServiceQuery(
    ['procurement', 'awards'],
    (svc, scope) => svc.procurement.getAwards(scope),
    SHELL
  );
const useShellRfpAwards = () =>
  useServiceQuery(
    ['procurement', 'rfpAwards'],
    (svc, scope) => svc.procurement.getRfpAwards(scope),
    SHELL
  );
const useShellRfis = () =>
  useServiceQuery(
    ['procurement', 'rfiEvents'],
    (svc, scope) => svc.procurement.getRfiEvents(scope),
    SHELL
  );
const useShellRfps = () =>
  useServiceQuery(
    ['procurement', 'rfpEvents'],
    (svc, scope) => svc.procurement.getRfpEvents(scope),
    SHELL
  );
const useShellRfqEngagement = () =>
  useServiceQuery(
    ['procurement', 'rfqEngagement'],
    (svc, scope) => svc.procurement.getRfqEngagement(scope),
    SHELL
  );
const useShellRounds = () =>
  useServiceQuery(
    ['procurement', 'negotiationRounds'],
    (svc, scope) => svc.procurement.getNegotiationRounds(scope),
    SHELL
  );
// INV-D9 (S-04) — PTI's asks, for the Stock item's count. Same key as `useSupplierAsks()`.
const useShellSupplierAsks = () =>
  useServiceQuery(
    ['procurement', 'supplierAsks'],
    (svc, scope) => svc.procurement.getSupplierAsks(scope),
    SHELL
  );
// BL-213 — counts on the items that already have a derived "waiting on the
// supplier" population. SAME KEYS as `usePurchaseOrders()`, `useCallOffs()` and
// `useSupplierInvoices()`.
const useShellPurchaseOrders = () =>
  useServiceQuery(
    ['procurement', 'purchaseOrders', undefined],
    (svc, scope) => svc.procurement.getPurchaseOrders(scope, undefined),
    SHELL
  );
const useShellCallOffs = () =>
  useServiceQuery(
    ['procurement', 'callOffs'],
    (svc, scope) => svc.procurement.getCallOffs(scope),
    SHELL
  );
const useShellSupplierInvoices = () =>
  useServiceQuery(
    ['procurement', 'supplierInvoices', undefined],
    (svc, scope) => svc.procurement.getSupplierInvoices(scope, undefined),
    SHELL
  );

/**
 * A notice in words: "Awarded to you · RFQ-2026-021 · 60% of item 1" or
 * "Award withdrawn · RFQ-2026-021 · 05 Sept 2026".
 * @param {TFunction} t
 * @param {SupplierAwardNotice} n
 * @returns {string}
 */
export const noticeText = (t, n) =>
  n.kind === 'awarded'
    ? t('topbar.notices.awarded', { event: n.eventNumber, share: outcomeShareText(t, n.shares) })
    : t('topbar.notices.withdrawn', { event: n.eventNumber, date: formatDate(n.at) });

/** @returns {SupplierAwardNotice[]} */
function useSupplierAwardNotices() {
  const { identity } = useCurrentIdentity();
  const rfqs = useShellRfqs();
  const rfqAwards = useShellAwards();
  const rfpAwards = useShellRfpAwards();
  return supplierAwardNotices({
    rfqs: rfqs.data?.items ?? [],
    rfqAwards: rfqAwards.data?.items ?? [],
    rfpAwards: rfpAwards.data?.items ?? [],
    supplierId: identity.supplierId ?? ''
  });
}

/**
 * The bell for one supplier seat. Split from the exported wrapper so a seat
 * switch REMOUNTS it (`key={seatKey}`): the panel closes and the "new this
 * viewing" snapshot starts empty, which is the same isolation the store gives
 * the ids themselves. An award notice says the purchase order follows from SAP
 * until PTI raises it there (owner ruling Q3, 2026-10-19).
 * @type {React.FC<{ identity: CurrentIdentity }>}
 */
const SupplierNoticeBellForSeat = ({ identity }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notices = useSupplierAwardNotices();
  const seatKey = seatKeyFor(identity);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  // Read on every render: localStorage is the source, so a reload and an
  // identity switch both land here with no cache to invalidate. The write in
  // `toggleOpen` is followed by a state update, so the next render sees it.
  const readState = readSeat(seatKey);
  // The ids that were unread when the panel opened. Kept for THIS viewing so an
  // opened notice still reads as new until the panel closes — if the styling
  // came from the post-write store it would vanish on the click that showed it.
  const [openedAsNew, setOpenedAsNew] = useState(/** @type {ReadonlySet<string>} */ (new Set()));

  const unreadCount = notices.filter((n) => !readState.ids.has(n.id)).length;

  // BL-213 — OPENING marks the listed notices read. The badge clears at the
  // click, because the count is the unread count; the items stay marked "New"
  // for this viewing via `openedAsNew`, then read as read on the next open.
  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      setOpenedAsNew(new Set());
      return;
    }
    const unreadIds = notices.filter((n) => !readState.ids.has(n.id)).map((n) => n.id);
    markRead(
      seatKey,
      notices.map((n) => n.id)
    );
    setOpenedAsNew(new Set(unreadIds));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    /** @param {MouseEvent} e */
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(/** @type {Node} */ (e.target))) {
        setOpen(false);
        setOpenedAsNew(new Set());
      }
    };
    /** @param {KeyboardEvent} e */
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setOpenedAsNew(new Set());
      }
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
        // BL-84 (WCAG 4.1.2): the badge is the unread count, so the name says
        // the unread count and never the total. BL-213 — the TOTAL stays on
        // `data-total-count` for a test (and for a future surface) that must
        // tell "2 notices, both read" from "2 notices, one unread".
        aria-label={
          unreadCount > 0
            ? t('topbar.notices.unreadCount', { n: unreadCount })
            : t('topbar.notificationsCount', { n: 0 })
        }
        aria-expanded={open}
        onClick={toggleOpen}
        className="relative p-2 rounded-md text-text-secondary hover:bg-bg-hover"
        data-testid="supplier-notice-bell"
        data-unread-count={unreadCount}
        data-total-count={notices.length}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            data-testid="supplier-notice-badge"
            className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute right-0 mt-1 w-80 max-w-[calc(100vw-2rem)] z-50 bg-bg-surface border border-border-subtle rounded-lg shadow-md"
          data-testid="supplier-notices"
        >
          {notices.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-tertiary">{t('topbar.notices.empty')}</p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {notices.map((n) => {
                const isNew = openedAsNew.has(n.id) || !readState.ids.has(n.id);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      data-testid={`supplier-notice-${n.id}`}
                      data-new={isNew ? 'true' : 'false'}
                      onClick={() => {
                        setOpen(false);
                        setOpenedAsNew(new Set());
                        navigate(
                          n.eventType === 'rfq'
                            ? deepLink('/supplier/rfq', { tab: 'history' })
                            : '/supplier/rfp'
                        );
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-bg-hover"
                    >
                      {isNew ? (
                        <span className="mr-1 inline-flex items-center rounded-full bg-action-soft text-action-hover text-[10px] font-semibold px-1.5 py-0.5 align-middle">
                          {t('topbar.notices.new')}
                        </span>
                      ) : null}
                      <span className="block text-sm text-text-primary">{noticeText(t, n)}</span>
                      {n.kind === 'awarded' && !n.raisedInSap ? (
                        <span className="block text-xs text-text-secondary">
                          {t('hub.home.poFollowsFromSap')}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
};

/**
 * The bell for a supplier seat: the unread count of award and withdrawal
 * notices, and a list of them that opens on click (BL-213).
 * @type {React.FC}
 */
export const SupplierNoticeBell = () => {
  const { identity } = useCurrentIdentity();
  // `key` is the seat: switching seats remounts the bell, so an open panel and
  // its "new this viewing" snapshot cannot carry across tenancies.
  return <SupplierNoticeBellForSeat key={seatKeyFor(identity)} identity={identity} />;
};

/**
 * @param {number} n
 * @returns {string}
 */
const countText = (n) => (n > 0 ? String(n) : '');

/**
 * BL-213 — the menu items beyond sourcing that already carry a derived
 * "waiting on the supplier" population. Each rule is the SAME predicate the
 * item's own page counts with, so the menu cannot disagree with the page:
 *
 *   · Orders — the page's Action tab: Sent (acknowledge or confirm) and
 *     Acknowledged (confirm);
 *   · Call-offs — the page's `toConfirm`: Awaiting Confirmation;
 *   · Invoices — the supplier's own unsent Draft, or one PTI Returned
 *     (stored `Disputed`) for resubmission, which the page offers as
 *     "Submit" / "Resubmit".
 *
 * @param {{
 *   purchaseOrders: readonly PurchaseOrder[];
 *   callOffs: readonly CallOff[];
 *   invoices: readonly SupplierInvoice[];
 * }} input
 * @returns {{ orders: number; callOffs: number; invoices: number }}
 */
export const supplierMenuCounts = ({ purchaseOrders, callOffs, invoices }) => ({
  orders: purchaseOrders.filter(
    (po) => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED
  ).length,
  callOffs: callOffs.filter((c) => c.status === 'Awaiting Confirmation').length,
  invoices: invoices.filter((i) => i.stage === 'Draft' || i.stage === 'Returned').length
});

/** The supplier menu items that carry a count. */
export const SUPPLIER_COUNTED_PATHS = [
  '/supplier/rfi',
  '/supplier/rfq',
  '/supplier/rfp',
  // Inventory UX S-04 — the asks PTI is waiting on.
  '/supplier/inventory',
  // BL-213 — the derived populations above.
  '/supplier/orders',
  '/supplier/call-offs',
  '/supplier/invoices'
];

/**
 * The count beside a supplier menu item (RFx UX S-05, X-02; Inventory UX S-04;
 * BL-213): on Stock, the asks PTI is waiting on (INV-D9); RFIs and
 * RFPs still to answer; on RFQ invitations the open revision rounds ("1
 * round") when there are any, else the RFQs still to quote; on Orders,
 * Call-offs and Invoices the populations in `supplierMenuCounts`. Nothing when
 * zero. A path with no derived population gets no text — the default is
 * deliberately empty, not a guess.
 * @type {React.FC<{ path: string }>}
 */
export const SupplierMenuCount = ({ path }) => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const rfqs = useShellRfqs();
  const rfis = useShellRfis();
  const rfps = useShellRfps();
  const rounds = useShellRounds();
  const rfqEngagement = useShellRfqEngagement();
  const asks = useShellSupplierAsks();
  const purchaseOrders = useShellPurchaseOrders();
  const callOffs = useShellCallOffs();
  const invoices = useShellSupplierInvoices();
  const queue = supplierSourcingQueue({
    rfqs: rfqs.data?.items ?? [],
    rfis: rfis.data?.items ?? [],
    rfps: rfps.data?.items ?? [],
    rounds: rounds.data?.items ?? [],
    rfqEngagement: rfqEngagement.data?.items ?? [],
    supplierId: identity.supplierId
  });
  const openAsks = (asks.data?.items ?? []).filter(
    (a) => a.supplierId === identity.supplierId && a.state === 'Open'
  ).length;
  const counts = supplierMenuCounts({
    purchaseOrders: purchaseOrders.data?.items ?? [],
    callOffs: callOffs.data?.items ?? [],
    invoices: invoices.data?.items ?? []
  });
  /** @type {Record<string, string>} */
  const textByPath = {
    '/supplier/inventory': countText(openAsks),
    '/supplier/rfi': countText(queue.openRfis.length),
    '/supplier/rfp': countText(queue.openRfps.length),
    '/supplier/rfq':
      queue.openRounds.length > 0
        ? t('hub.nav.count.rounds', { count: queue.openRounds.length })
        : countText(queue.openRfqs.length),
    '/supplier/orders': countText(counts.orders),
    '/supplier/call-offs': countText(counts.callOffs),
    '/supplier/invoices': countText(counts.invoices)
  };
  const text = textByPath[path] ?? '';
  return text ? (
    <span
      className="ml-auto shrink-0 text-xs font-semibold text-warning-hover bg-warning-soft rounded-full px-2 py-0.5"
      data-testid={`nav-count-${path}`}
    >
      {text}
    </span>
  ) : null;
};
