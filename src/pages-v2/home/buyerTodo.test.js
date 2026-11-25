import { describe, expect, it } from 'vitest';
import { buyerTodoTasks } from './buyerTodo';
import { withSeverity } from './severityDisplay';
import { sortTasks } from './TaskList';
/** @import { BuyerTodoInput } from './buyerTodo' */
/** @import { TFunction } from 'i18next' */

// BL-361 — the derivation the Home page and the PTI bell share. These cases pin
// it as a PURE function of its reads: what is open, who each row is shown to,
// and that every row carries a destination. The bell's own suite proves the
// shell wiring; this one proves the predicate list.

const NOW = '2026-09-01T12:00:00.000Z';

/**
 * Seller-free translation stub: the label a row carries IS its key, so a case
 * can assert which label the page would render without loading i18n.
 * @type {TFunction}
 */
const t = /** @type {TFunction} */ (
  /** @type {unknown} */ (/** @type {(key: string) => string} */ ((key) => key))
);

/**
 * Every field empty: the known-empty input. Each case overrides only the reads
 * it needs, so an accidental dependency on another read shows up as a count.
 * @type {BuyerTodoInput}
 */
const emptyInput = {
  t,
  role: 'ALL',
  holdsInboundAck: false,
  nowIso: NOW,
  purchaseOrders: undefined,
  buyerInvoices: undefined,
  rfqs: undefined,
  requisitions: undefined,
  documents: undefined,
  goodsReceipts: undefined,
  asns: undefined,
  chase: undefined,
  callOffViews: [],
  missingAsnChase: undefined,
  inventoryAlerts: undefined,
  capacityPlans: undefined,
  forecastLines: undefined,
  negotiationRounds: undefined,
  sapFailures: [],
  npdReviews: undefined,
  ropFisikPrs: undefined
};

/** @param {string} id */
const row = (id) => {
  const found = buyerTodoTasks(emptyInput).find((task) => task.id === id);
  if (!found) throw new Error(`no row ${id}`);
  return found;
};

/**
 * The fixture input for the known-good case: one row on each side of the split.
 * The partial fixtures are cast past the full DTO types — the case is about
 * which fields the derivation READS, not about re-authoring each record.
 * @type {BuyerTodoInput}
 */
const goodInput = /** @type {BuyerTodoInput} */ (
  /** @type {unknown} */ ({
    ...emptyInput,
    documents: { items: [{ id: 'doc-1', status: 'Under Review' }] },
    requisitions: { items: [{ id: 'pr-1', status: 'Pending Approval', requiredDate: NOW }] },
    inventoryAlerts: {
      items: [
        {
          id: 'alert-1',
          status: 'open',
          riskClass: 'high',
          daysToImpact: 3,
          riskBasis: { kind: 'none' }
        }
      ]
    }
  })
);

describe('buyerTodoTasks — known-empty reads (BL-361)', () => {
  it('every row counts zero, and the rendered To do is empty', () => {
    const rows = buyerTodoTasks(emptyInput);
    // Population control: the list of task types is real, not an empty array.
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.every((task) => task.count === 0)).toBe(true);
    // `withSeverity` and `sortTasks` drop zero-count rows: an empty read set
    // renders the page's "Nothing needs your action" state, not phantom work.
    expect(withSeverity(rows, NOW, t)).toEqual([]);
    expect(sortTasks(withSeverity(rows, NOW, t))).toEqual([]);
  });
});

describe('buyerTodoTasks — known-good reads (BL-361)', () => {
  it('carries the page label and the deep link for each open row', () => {
    const rows = buyerTodoTasks(goodInput);
    const byId = Object.fromEntries(rows.map((task) => [task.id, task]));
    expect(byId['certs-to-review'].count).toBe(1);
    expect(byId['certs-to-review'].label).toBe('hub.home.task.certsToReview');
    expect(byId['certs-to-review'].to).toBe('/buyer/compliance?section=review');
    expect(byId['requisitions-to-approve'].count).toBe(1);
    expect(byId['requisitions-to-approve'].to).toBe('/buyer/purchase-requisition?open=pr-1');
    expect(byId['inventory-high-alerts'].count).toBe(1);
    expect(byId['inventory-high-alerts'].to).toBe('/buyer/alerts?tab=open&risk=high');
    // Every row names a destination: nothing the bell lists is a dead end.
    expect(rows.every((task) => task.to.startsWith('/'))).toBe(true);
  });

  it('filters by the PTI role the menu is showing (REQ §3.7)', () => {
    const mp = buyerTodoTasks({ ...goodInput, role: 'MP' });
    const buy = buyerTodoTasks({ ...goodInput, role: 'BUY' });
    const fin = buyerTodoTasks({ ...goodInput, role: 'FIN' });
    const mpIds = mp.map((task) => task.id);
    const buyIds = buy.map((task) => task.id);
    expect(mpIds).toContain('inventory-high-alerts');
    expect(mpIds).not.toContain('certs-to-review');
    expect(buyIds).toContain('certs-to-review');
    expect(buyIds).toContain('requisitions-to-approve');
    expect(buyIds).not.toContain('inventory-high-alerts');
    expect(fin.every((task) => task.count === 0 || task.id === 'overdue-invoices')).toBe(true);
    // No row reaches a role it is not shown to.
    expect(mp.every((task) => task.roles.includes('MP'))).toBe(true);
    expect(buy.every((task) => task.roles.includes('BUY'))).toBe(true);
  });

  it('shows the Expeditor acknowledgment task only to a seat that holds the atom', () => {
    expect(buyerTodoTasks(emptyInput).map((task) => task.id)).not.toContain(
      'inbound-acknowledgment'
    );
    expect(
      buyerTodoTasks({ ...emptyInput, holdsInboundAck: true }).map((task) => task.id)
    ).toContain('inbound-acknowledgment');
  });

  it('zero-count rows are dropped from what the page and the bell list', () => {
    // The good input opens three tasks; every other task stays at zero.
    const shown = sortTasks(withSeverity(buyerTodoTasks(goodInput), NOW, t));
    expect(shown.map((task) => task.id).sort()).toEqual([
      'certs-to-review',
      'inventory-high-alerts',
      'requisitions-to-approve'
    ]);
    const total = shown.reduce((n, task) => n + task.count, 0);
    expect(total).toBe(3);
  });

  it('an unknown row is not invented', () => {
    // Population control for the finder: a name that is not a task returns none.
    expect(buyerTodoTasks(emptyInput).some((task) => task.id === 'not-a-task')).toBe(false);
    // And the finder really finds a known one.
    expect(row('escalated-po').count).toBe(0);
  });
});
