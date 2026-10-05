// MR-6 BR-05 to BR-09 — the pure shelf-life rules the ASN form and verbs share.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  addCalendarMonths,
  asnLineRefusal,
  etaNeedsReapproval,
  monthsLeftAt,
  onlyShelfLifeRefused,
  shelfLifeExceptionOf,
  shelfLifeMet,
  shelfLifeWaivedFor
} from './fulfilmentRules';
import { shelfLifeRuleFor } from './fulfilmentConfig';
import { materialOverlayStore } from '../data/mock/stores/materialOverlayStore';
import { NO_PERSON } from '@context/noPerson';
/** @import { ASN, AsnShelfLifeEvent, PurchaseOrder } from '../data/types' */

/**
 * @param {string} materialCode
 * @returns {Pick<PurchaseOrder, 'poNumber' | 'lineItems'>}
 */
const poFor = (materialCode) => ({
  poNumber: 'PO-X',
  lineItems: [
    /** @type {PurchaseOrder['lineItems'][number]} */ ({
      id: 'li-1',
      materialCode,
      description: '',
      quantity: 1000,
      confirmedQty: 1000,
      uom: 'KG',
      unitPrice: 0
    })
  ]
});

beforeEach(() => materialOverlayStore.reset());

describe('calendar months (MR-6 BR-05)', () => {
  it('adds calendar months, and clamps to the last day of a shorter month', () => {
    expect(addCalendarMonths('2026-10-15', 6)).toBe('2027-04-15');
    expect(addCalendarMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(addCalendarMonths('2027-08-31', 6)).toBe('2028-02-29');
  });

  it('edge case 3 — expiry the same day as ETA + minimum passes; one day earlier fails', () => {
    expect(shelfLifeMet('2027-04-15', '2026-10-15', 6)).toBe(true);
    expect(shelfLifeMet('2027-04-14', '2026-10-15', 6)).toBe(false);
  });

  it('months left at ETA carries the part month as a fraction', () => {
    expect(monthsLeftAt('2026-10-15', '2027-03-15')).toBe(5);
    expect(monthsLeftAt('2026-09-01', '2027-04-16')).toBeCloseTo(7.5, 1);
    expect(monthsLeftAt('2026-10-15', '2026-09-15')).toBe(-1);
  });
});

describe('the minimum (MR-6 BR-06, BR-07)', () => {
  it('master minimum where maintained, else the hub default; packaging off unless switched on', () => {
    expect(shelfLifeRuleFor('AI-NIAC-6601')).toEqual({ relevant: true, minMonths: 12 });
    expect(shelfLifeRuleFor('RM-EMUL-3310')).toEqual({ relevant: true, minMonths: 6 });
    expect(shelfLifeRuleFor('PK-PETB-8801')).toEqual({ relevant: false, minMonths: 6 });
    expect(shelfLifeRuleFor('NOT-A-CODE')).toBeNull();
  });
});

describe('asnLineRefusal — expiryRequired and shelfLife', () => {
  const line = { materialCode: 'RM-EMUL-3310', shippedQty: 100, lotNumber: 'B', eta: '2026-10-15' };
  const po = poFor('RM-EMUL-3310');

  it('`expiryRequired` fires at submission for a relevant material; a draft may leave it out', () => {
    expect(asnLineRefusal(line, po, [], { requireBatch: true })).toBe('expiryRequired');
    expect(asnLineRefusal(line, po, [], { requireBatch: false })).toBeNull();
    expect(
      asnLineRefusal({ ...line, expiryDate: '2027-04-15' }, po, [], { requireBatch: true })
    ).toBeNull();
  });

  it('`shelfLife` fires on expiry before ETA + minimum, passes at it, and is waived on request', () => {
    expect(
      asnLineRefusal({ ...line, expiryDate: '2027-03-15' }, po, [], { requireBatch: true })
    ).toBe('shelfLife');
    expect(
      asnLineRefusal({ ...line, expiryDate: '2027-04-15' }, po, [], { requireBatch: true })
    ).toBeNull();
    expect(
      asnLineRefusal({ ...line, expiryDate: '2027-03-15' }, po, [], {
        requireBatch: true,
        waiveShelfLife: true
      })
    ).toBeNull();
  });

  it('a material with shelfLifeRelevant false needs no expiry and is never short', () => {
    const pk = { ...line, materialCode: 'PK-PETB-8801' };
    expect(asnLineRefusal(pk, poFor('PK-PETB-8801'), [], { requireBatch: true })).toBeNull();
    expect(
      asnLineRefusal({ ...pk, expiryDate: '2026-11-01' }, poFor('PK-PETB-8801'), [], {
        requireBatch: true
      })
    ).toBeNull();
    // Switched on by an administrator (A2 overlay), the same packaging is checked.
    materialOverlayStore.append({
      materialCode: 'PK-PETB-8801',
      shelfLifeRelevant: true,
      setAt: 'x',
      setBy: 'test'
    });
    expect(asnLineRefusal(pk, poFor('PK-PETB-8801'), [], { requireBatch: true })).toBe(
      'expiryRequired'
    );
  });

  it('onlyShelfLifeRefused — at least one shelf-life line and nothing else wrong', () => {
    expect(onlyShelfLifeRefused(['shelfLife', null])).toBe(true);
    expect(onlyShelfLifeRefused(['shelfLife', 'batch'])).toBe(false);
    expect(onlyShelfLifeRefused([null, null])).toBe(false);
  });
});

describe('the exception record (MR-6 BR-08, BR-09, edge case 1)', () => {
  const at = '2026-10-01T00:00:00.000Z';
  /** @type {AsnShelfLifeEvent} */
  const requested = {
    kind: 'requested',
    at,
    by: NO_PERSON,
    reason: 'why',
    eta: '2026-10-15',
    lines: [
      { materialCode: 'RM-EMUL-3310', lotNumber: 'B', expiryDate: '2027-03-15', minMonths: 6 }
    ]
  };
  /**
   * @param {AsnShelfLifeEvent[]} events
   * @returns {Pick<ASN, 'shelfLifeException' | 'lineItems' | 'status'>}
   */
  const asn = (events) => ({
    status: 'Submitted',
    shelfLifeException: events,
    lineItems: [
      {
        materialCode: 'RM-EMUL-3310',
        description: '',
        orderedQty: 1,
        shippedQty: 1,
        lotNumber: 'B',
        expiryDate: '2027-03-15'
      }
    ]
  });
  const line = {
    materialCode: 'RM-EMUL-3310',
    lotNumber: 'B',
    expiryDate: '2027-03-15',
    eta: '2026-10-15'
  };

  it('derives pending → approved → reopened, keeping every entry', () => {
    expect(shelfLifeExceptionOf({})).toBeNull();
    expect(
      /** @type {NonNullable<ReturnType<typeof shelfLifeExceptionOf>>} */ (
        shelfLifeExceptionOf(asn([requested]))
      ).state
    ).toBe('pending');
    const approved = asn([requested, { kind: 'approved', at, by: NO_PERSON }]);
    expect(
      /** @type {NonNullable<ReturnType<typeof shelfLifeExceptionOf>>} */ (
        shelfLifeExceptionOf(approved)
      ).state
    ).toBe('approved');
    const reopened = asn([
      requested,
      { kind: 'approved', at, by: NO_PERSON },
      {
        kind: 'etaChanged',
        at,
        by: NO_PERSON,
        previousEta: '2026-10-15',
        eta: '2026-10-25',
        lines: requested.lines
      }
    ]);
    const view = /** @type {NonNullable<ReturnType<typeof shelfLifeExceptionOf>>} */ (
      shelfLifeExceptionOf(reopened)
    );
    expect(view.state).toBe('pending');
    expect(view.history).toHaveLength(3);
    expect(view.reason).toBe('why');
  });

  it('the waiver covers the named line at an ETA no later than asked; not another batch, not a later ETA', () => {
    const a = asn([requested]);
    expect(shelfLifeWaivedFor(a, line)).toBe(true);
    expect(shelfLifeWaivedFor(a, { ...line, lotNumber: 'OTHER' })).toBe(false);
    expect(shelfLifeWaivedFor(a, { ...line, eta: '2026-10-16' })).toBe(false);
    expect(
      shelfLifeWaivedFor(
        asn([requested, { kind: 'rejected', at, by: NO_PERSON, reason: 'no' }]),
        line
      )
    ).toBe(false);
  });

  it('a later ETA needs a new decision only when a line still fails there', () => {
    const approved = asn([requested, { kind: 'approved', at, by: NO_PERSON }]);
    expect(etaNeedsReapproval(approved, '2026-10-25')).toBe(true);
    expect(etaNeedsReapproval(approved, '2026-10-15')).toBe(false);
    expect(etaNeedsReapproval(asn([requested]), '2026-10-25')).toBe(false);
  });
});
