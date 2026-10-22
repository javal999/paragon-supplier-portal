/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
/** @import { Persona } from '@components/layout-v2/navConfig' */
import { drillPath } from './orderSummaryDrill';

// ─────────────────────────────────────────────────────────────────────────────
// P-02 — ORDER SUMMARY IS THE DEFAULT VIEW OF PURCHASE ORDERS.
//
// `/<persona>/orders` holds two views: Summary (is each order secured?) and
// List (the PO worklist). The view lives in the address (`?view=`), so a
// bookmark, the back button and "Back to order summary" all land on the view
// they name.
//
// ⚠️ **ANY OTHER PARAMETER MEANS THE LIST, AND THAT IS WHAT KEEPS EVERY EXISTING
// LINK WORKING.** My tasks, Home, alerts and the summary's own drill cells link
// to `/<persona>/orders?tab=…`, `?po=…` or `?focus=…`. All of those were written
// for the list. Only a bare visit (the menu) opens the summary.
//
// ⚠️ **THE VIEW IS DERIVED FROM THE ADDRESS ON EVERY RENDER, NOT HELD IN STATE.**
// `useUrlEnumParam` is a one-way read into state that acts only when its own
// parameter changes. A summary drill cell navigates to `?po=…` on the SAME route,
// so the page does not remount and `view` is absent before and after: a state
// copy would keep showing the summary. `view` is still whitelist-checked the
// way that hook checks it, so an unknown value changes nothing.
// ─────────────────────────────────────────────────────────────────────────────

/** @typedef {'summary' | 'list'} OrdersView */

// i18n-defer: view identifiers, not copy — each renders through t(`oc.view.<id>`)
/** @type {readonly OrdersView[]} */
export const ORDERS_VIEWS = ['summary', 'list'];

export const VIEW_PARAM = 'view';

/**
 * Which view an address opens: `view` when it names one, else List when any
 * other parameter is present, else Summary.
 * @param {URLSearchParams} params
 * @returns {OrdersView}
 */
export function ordersViewOf(params) {
  const raw = params.get(VIEW_PARAM);
  if (raw !== null && /** @type {readonly string[]} */ (ORDERS_VIEWS).includes(raw))
    return /** @type {OrdersView} */ (raw);
  for (const key of params.keys()) if (key !== VIEW_PARAM) return 'list';
  return 'summary';
}

/**
 * The view the current address opens.
 * @returns {OrdersView}
 */
export function useOrdersView() {
  const [params] = useSearchParams();
  return ordersViewOf(params);
}

/**
 * The address of one view of Purchase orders.
 * @param {Persona} persona
 * @param {OrdersView} view
 * @returns {string}
 */
export const ordersViewPath = (persona, view) =>
  `${drillPath('po', persona)}?${VIEW_PARAM}=${view}`;

/**
 * The Purchase orders header both views share: the list's own title keys, so
 * the page reads the same in either view.
 * @type {Record<Persona, { readonly title: string; readonly crumb: readonly string[] }>}
 */
export const PURCHASE_ORDERS_HEADER = {
  buyer: {
    title: 'buyerOrders.header.title',
    crumb: ['buyerOrders.crumb.transact', 'buyerOrders.crumb.purchaseOrders']
  },
  supplier: {
    title: 'supplierOrders.header.title',
    crumb: ['supplierOrders.crumb.transact', 'supplierOrders.crumb.myOrders']
  }
};

/**
 * "Summary | List" under the page header. Each option is a link, so the view
 * is in the address and the browser's back button returns to the last one.
 * @type {React.FC<{ persona: Persona; view: OrdersView }>}
 */
const OrdersViewSwitch = ({ persona, view }) => {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('oc.view.label')} className="mb-4" data-testid="orders-view-switch">
      <div className="inline-flex items-center gap-1 bg-bg-hover border border-border-subtle rounded-md p-1">
        {ORDERS_VIEWS.map((v) => {
          const active = v === view;
          return (
            <Link
              key={v}
              to={ordersViewPath(persona, v)}
              aria-current={active ? 'page' : undefined}
              data-testid={`orders-view-${v}`}
              className={`px-3 py-1.5 text-sm font-medium rounded-[6px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-action ${
                active
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'bg-transparent text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {t(`oc.view.${v}`)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default OrdersViewSwitch;
