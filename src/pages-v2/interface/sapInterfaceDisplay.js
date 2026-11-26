// ─────────────────────────────────────────────────────────────────────────────
// The shared SAP-interface read (REQ-E07-08) — ONE rules module, ONE read.
//
// The monitor page and the data-age banner both come through here, so a screen
// can never disagree with the monitor about when SAP data last arrived.
//
// ⚠️ WHAT IS REAL AND WHAT IS SIMULATED, STATED AT THE SITE.
//   · OUTBOUND failures are REAL: they are the dispatcher's own settle failures,
//     read back out of the in-memory command trail and classified by the settle
//     boundary's vocabulary. Retrying one calls `settle()` on the SAME
//     correlationId — the pending-settle queue the dispatcher deliberately keeps
//     undeleted after a failed settle — so a retry that succeeds emits a `done`
//     event and the failure leaves the monitor with nothing deleted.
//   · INBOUND arrivals are SIMULATED, because the prototype has no SAP. Each
//     inbound object's "last received" is the newest document of that family in
//     the fixtures; the failed inbound records are the deterministic seed in
//     `sapMessageStore`.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  useASNs,
  useBuyerInvoices,
  useGoodsReceipts,
  usePurchaseOrders
} from '@services/query/hooks';
import { sdcClock } from '@services/sdc';
import { commandAuditSink } from '@services/data/mock/MockCommandService';
import { sapMessageStore } from '@services/data/mock/stores/sapMessageStore';
import { getKnownFlows } from '@services/transitions';
/** @import { SapDataAge, SapFailedMessage, SapObjectId, SapObjectStatus, SapPageKey } from '@services/data/sapInterfaceRules' */
import {
  SAP_PAGE_OBJECT,
  failuresFromEvents,
  newestInstant,
  sapDataAge,
  sapMonitor
} from '@services/data/sapInterfaceRules';

/**
 * A date-only fixture field, read as 09:00 WIB — the same hour the seeds use.
 * @param {string | null | undefined} day
 * @returns {string | null}
 */
const asInstant = (day) => (day ? `${day.slice(0, 10)}T02:00:00.000Z` : null);

/**
 * The entity a transition belongs to, built ONCE from the flow registry so the
 * mapping cannot drift from the flows. The id's own prefix is never parsed —
 * that would be a second, silently drifting vocabulary.
 * @type {ReadonlyMap<string, string>}
 */
const TRANSITION_ENTITY = (() => {
  const m = /** @type {Map<string, string>} */ (new Map());
  for (const flow of getKnownFlows()) {
    for (const t of flow.transitions) m.set(t.id, flow.entity);
  }
  return m;
})();

/**
 * @param {string} transitionId
 * @returns {string | null}
 */
const entityOfTransition = (transitionId) => TRANSITION_ENTITY.get(transitionId) ?? null;

/**
 * `failures`:  Every open failure across the objects — the Home task reads this.
 *
 * @typedef {{
 *     readonly objects: readonly SapObjectStatus[];
 *     readonly nowIso: string;
 *     readonly isPending: boolean;
 *     readonly failures: readonly SapFailedMessage[];
 *     readonly refetch: () => void;
 *   }} SapInterfaceRead
 */

/**
 * The monitor's objects for one set of reads and the current message stores.
 * BL-361 — the hook below and the top bar's PTI bell both call this, so the
 * bell's "SAP messages failed" task and the monitor cannot disagree. The
 * message stores are process singletons, read at call time; a caller that
 * needs a retry to show re-renders, which is what `useSapInterface`'s `tick`
 * is for.
 * @param {{
 *   purchaseOrders: ReturnType<typeof usePurchaseOrders>['data'];
 *   goodsReceipts: ReturnType<typeof useGoodsReceipts>['data'];
 *   asns: ReturnType<typeof useASNs>['data'];
 *   invoices: ReturnType<typeof useBuyerInvoices>['data'];
 *   nowIso: string;
 * }} input
 * @returns {ReturnType<typeof sapMonitor>}
 */
export function sapInterfaceObjects({ purchaseOrders, goodsReceipts, asns, invoices, nowIso }) {
  const cleared = sapMessageStore.clearedAt();
  /** @type {Partial<Record<SapObjectId, string | null>>} */
  const lastSeen = {
    umbrellaPo: newestInstant((purchaseOrders?.items ?? []).map((p) => asInstant(p.orderDate))),
    goodsReceipt: newestInstant([
      ...(goodsReceipts?.items ?? []).map((g) => asInstant(g.receivedDate)),
      ...cleared.map((c) => c.at)
    ]),
    invoiceStatus: newestInstant([
      ...(invoices?.items ?? []).map((i) => asInstant(i.paymentDate ?? i.receivedDate)),
      ...cleared.map((c) => c.at)
    ]),
    poResponse: newestInstant(
      (purchaseOrders?.items ?? []).map((p) => p.response?.respondedAt ?? null)
    ),
    inboundDelivery: newestInstant((asns?.items ?? []).map((a) => asInstant(a.shipDate ?? a.eta))),
    invoiceOut: newestInstant((invoices?.items ?? []).map((i) => asInstant(i.receivedDate)))
  };
  const messages = [
    ...sapMessageStore.open(),
    ...failuresFromEvents(commandAuditSink.all(), entityOfTransition, nowIso)
  ];
  return sapMonitor({ lastSeen, messages });
}

/**
 * The whole monitor for the current scope.
 * @returns {SapInterfaceRead}
 */
export function useSapInterface() {
  const pos = usePurchaseOrders();
  const receipts = useGoodsReceipts();
  const asns = useASNs();
  const invoices = useBuyerInvoices();
  const nowIso = sdcClock.now();
  // The audit trail and the simulated inbound store are process singletons, so
  // they are read on every render rather than cached — a retry must be visible
  // immediately, and nothing here is expensive.
  const [tick, setTick] = React.useState(0);

  const objects = React.useMemo(
    () =>
      sapInterfaceObjects({
        purchaseOrders: pos.data,
        goodsReceipts: receipts.data,
        asns: asns.data,
        invoices: invoices.data,
        nowIso
      }),
    // `tick` is the retry signal: the stores are singletons, so nothing else in
    // this dependency list changes when a message clears.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tick` is the retry signal; the stores are singletons
    [pos.data, receipts.data, asns.data, invoices.data, tick]
  );

  return {
    objects,
    nowIso,
    isPending: pos.isPending || receipts.isPending || asns.isPending || invoices.isPending,
    failures: objects.flatMap((o) => o.failures),
    refetch: () => setTick((n) => n + 1)
  };
}

/**
 * The data age for one screen (BR-04, AC-03).
 * @param {SapPageKey} page
 * @returns {SapDataAge}
 */
export function useSapDataAge(page) {
  const { objects, nowIso } = useSapInterface();
  const object = SAP_PAGE_OBJECT[page];
  const row = objects.find((o) => o.object === object) ?? null;
  return sapDataAge(row?.lastSuccessAt ?? null, nowIso);
}
