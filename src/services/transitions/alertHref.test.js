// ────────────────────────────────────────────────────────────────────────────
// REQ deep-link — an alert's link must land on a view that SHOWS the thing it
// names. Derived over every buyer alert the sample data raises, not a list:
// for each alert routed to the inventory page, the band the link selects must
// admit the position the link highlights (the page's own band predicate), and
// a capacity alert's group must round-trip through the capacity page's reader.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { MockProcurementService } from '../data/mock/MockProcurementService';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import { sdcClock } from '../sdc/clock';
import { alertHref } from './inventoryAlertRules';
import { positionRisk, stockFreshness } from './inventoryRules';
import { readCapacityFilters } from '../../pages-v2/inventory/capacityFilters';

/** @import { InventoryAlert, InventoryPosition, QueryScope } from '../data/types' */

/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

/** @param {string} href */
const query = (href) => new URLSearchParams(href.split('?')[1] ?? '');

/**
 * BuyerInventory's band predicate, as the page applies it.
 * @param {string} band
 * @param {InventoryPosition} p
 * @param {string} nowIso
 * @returns {boolean}
 */
const bandAdmits = (band, p, nowIso) =>
  band === 'all' ||
  (band === 'stale' ? stockFreshness(p, nowIso) !== 'current' : positionRisk(p).riskClass === band);

describe('alertHref — the inventory link selects a band that shows the highlighted row', () => {
  it('every buyer alert routed to /buyer/inventory lands on a band that admits its position', async () => {
    const reads = new MockProcurementService();
    const alerts = (await reads.getInventoryAlerts(buyer)).items;
    const positions = (await reads.getInventory(buyer)).items;
    const nowIso = sdcClock.now();
    const routed = alerts.filter((a) => alertHref(a, 'buyer').startsWith('/buyer/inventory?'));

    // Population guard (membership, not a count): the case that motivated this
    // spec — a stale-data alert whose position is NOT Low risk — must be present,
    // or a green result proves nothing.
    expect(
      routed.some((a) => {
        const p = positions.find(
          (x) => x.supplierId === a.supplierId && x.materialCode === a.subject
        );
        return a.rule === 'staleData' && p !== undefined && positionRisk(p).riskClass !== 'low';
      })
    ).toBe(true);

    const hidden = routed
      .filter((a) => {
        const q = query(alertHref(a, 'buyer'));
        const p = positions.find((x) => `${x.supplierId}-${x.materialCode}` === q.get('highlight'));
        return p !== undefined && !bandAdmits(q.get('band') ?? 'all', p, nowIso);
      })
      .map((a) => a.key);
    expect(hidden).toEqual([]);
  });

  it('a capacity alert names its planning group in the parameter the capacity page reads', async () => {
    const reads = new MockProcurementService();
    const capacity = (await reads.getInventoryAlerts(buyer)).items.filter(
      (a) => a.rule === 'capacityBelowDemand'
    );
    expect(capacity.length).toBeGreaterThan(0);
    for (const a of capacity) {
      const f = readCapacityFilters(query(alertHref(a, 'buyer')));
      expect(f.planningGroupId).toBe(a.subject);
      expect(f.supplierId).toBe(a.supplierId);
    }
  });
});

describe('alertHref — the PTI-only rules keep the destinations main gave them', () => {
  /**
   * A buyer alert of `rule` naming `subject`; only the fields alertHref reads.
   * @param {InventoryAlert['rule']} rule
   * @param {string} subject
   * @returns {InventoryAlert}
   */
  const alertOf = (rule, subject) =>
    /** @type {InventoryAlert} */ (
      /** @type {unknown} */ ({ rule, subject, supplierId: 'sup-001', riskClass: 'high' })
    );

  it('CAP-9 BR-05 — a blanket-PO run-out opens the call-off page filtered to that PO', () => {
    expect(alertHref(alertOf('blanketPoRunOut', 'po-0042'), 'buyer')).toBe(
      '/buyer/call-offs?po=po-0042'
    );
  });

  it('CAP-D2 — a discontinued supply opens the commitments page on that material', () => {
    expect(alertHref(alertOf('supplyDiscontinued', 'MAT 7/A'), 'buyer')).toBe(
      '/buyer/collaboration?material=MAT+7%2FA'
    );
  });

  it('CAP-11 BR-04 — unabsorbed demand anticipation opens that page on the supplier × material', () => {
    expect(alertHref(alertOf('demandAnticipationUnabsorbed', 'RM-1'), 'buyer')).toBe(
      '/buyer/demand-anticipation?supplier=sup-001&material=RM-1'
    );
  });

  it('none of these rules falls through to the inventory page (the regression a sync would cause)', () => {
    for (const rule of /** @type {const} */ ([
      'blanketPoRunOut',
      'supplyDiscontinued',
      'demandAnticipationUnabsorbed'
    ])) {
      expect(alertHref(alertOf(rule, 'x'), 'buyer').startsWith('/buyer/inventory')).toBe(false);
    }
  });
});
