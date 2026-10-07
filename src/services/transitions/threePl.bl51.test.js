// ─────────────────────────────────────────────────────────────────────────────
// BL-51 · THE 3PL TRACKING LINK — REQ-E07-04 BR-05 (D-03 decided 2026-09-21).
//
// Every case is pinned by a NAMED sample ASN, and every "no link" case is
// paired with a "link" case through the same resolver, so neither half can be
// believed alone (probe the guard both ways).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SAMPLE_THREE_PLS,
  asnThreePlRefusal,
  threePlIdFor,
  threePlStore,
  trackingPatternRefusal,
  trackingUrlFor
} from './threePlStore';
import { MOCK_ASNS } from '../data/mock/fixtures/supplierShipments';
import { MockCommandService, commandAuditSink } from '../data/mock/MockCommandService';
import { asnStore } from '../data/mock/stores/asnStore';
import { purchaseOrderStore } from '../data/mock/stores/purchaseOrderStore';
/** @import { QueryScope } from '../data/types' */
import { DataError } from '../data/types';
import { SYSTEM_ROLES, rolesHolding, PERSONA_SYSTEM_ROLES } from './businessRoles';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
/**
 * @param {...string} businessRoles
 * @returns {QueryScope}
 */
const buyerSeat = (...businessRoles) => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles,
  actor: NO_PERSON
});
/**
 * @param {string} supplierId
 * @returns {QueryScope}
 */
const supplierSeat = (supplierId) => ({
  personaType: 'supplier',
  supplierId,
  businessRoles: [...PERSONA_SYSTEM_ROLES.supplier],
  actor: NO_PERSON
});

/** @param {string} n */
const asn = (n) => {
  const row = MOCK_ASNS.find((a) => a.asnNumber === n);
  if (!row) throw new Error(`sample ASN ${n} is gone — the demo case it pinned is gone with it`);
  return row;
};
/** @param {string} n */
const linkOf = (n) => trackingUrlFor(asn(n).threePlId, asn(n).trackingNumber);

beforeEach(() => {
  threePlStore.reset();
  asnStore.reset();
  commandAuditSink.clear();
});

describe('BL-51 · the demo ASNs, each case by name', () => {
  it('ASN-2025-00211 names a listed, offered 3PL → its number links to that 3PL’s page', () => {
    expect(asn('ASN-2025-00211').threePlId).toBe('tpl-sample-express');
    expect(linkOf('ASN-2025-00211')).toBe(
      'https://track.sample-express.example/parcel/SMPL-EXP-882941-X'
    );
  });

  it('ASN-2025-00198 names a 3PL whose address carries the number in a query string', () => {
    expect(linkOf('ASN-2025-00198')).toBe(
      'https://sample-postal.example/tracking?awb=SMPL-PST-7723-BC-4401'
    );
  });

  it('ASN-2025-00301 names a 3PL no longer OFFERED — the existing ASN still links', () => {
    const row = SAMPLE_THREE_PLS.find((r) => r.id === asn('ASN-2025-00301').threePlId);
    expect(row?.active).toBe(false);
    expect(linkOf('ASN-2025-00301')).toBe(
      'https://sample-interisland.example/track/SMPL-ISL-4471-SBY'
    );
  });

  it('ASN-2025-00201 names a 3PL the list does NOT hold → plain text', () => {
    expect(asn('ASN-2025-00201').threePlId).toBe('tpl-sample-parcel');
    expect(SAMPLE_THREE_PLS.some((r) => r.id === 'tpl-sample-parcel')).toBe(false);
    expect(linkOf('ASN-2025-00201')).toBeNull();
  });

  it('ASN-2025-00302 names NO 3PL → plain text, although its typed carrier equals a listed name', () => {
    const row = asn('ASN-2025-00302');
    expect(row.threePlId).toBeUndefined();
    // The control that makes the null mean something: the name DOES match.
    expect(SAMPLE_THREE_PLS.map((r) => r.name)).toContain(row.carrier);
    expect(linkOf('ASN-2025-00302')).toBeNull();
  });

  it('ASN-2025-00215 (a Draft with no number yet) → plain text, never a link to "—"', () => {
    expect(asn('ASN-2025-00215').trackingNumber).toBe('—');
    expect(trackingUrlFor('tpl-sample-express', '—')).toBeNull();
    expect(trackingUrlFor('tpl-sample-express', '  ')).toBeNull();
  });
});

describe('BL-51 · the tracking number can never reshape the address', () => {
  it('is inserted percent-encoded: a slash, query or fragment in it stays inside the path segment', () => {
    const url = /** @type {NonNullable<ReturnType<typeof trackingUrlFor>>} */ (
      trackingUrlFor('tpl-sample-express', 'AB/../x?y=1#z')
    );
    expect(url).toBe('https://track.sample-express.example/parcel/AB%2F..%2Fx%3Fy%3D1%23z');
    expect(new URL(url).hostname).toBe('track.sample-express.example');
    expect(new URL(url).search).toBe('');
    expect(new URL(url).hash).toBe('');
  });

  it('the address rule refuses what it must and accepts what it should (both ways)', () => {
    // Known-good first: a guard that refuses everything would pass the rest.
    for (const r of SAMPLE_THREE_PLS)
      expect(trackingPatternRefusal(r.trackingUrlPattern), r.id).toBeNull();
    expect(trackingPatternRefusal('javascript:alert(1)//{tracking}')).toMatch(/https/);
    expect(trackingPatternRefusal('http://plain.example/{tracking}')).toMatch(/https/);
    expect(trackingPatternRefusal('https://no-placeholder.example/track')).toMatch(/exactly once/);
    expect(trackingPatternRefusal('https://twice.example/{tracking}/{tracking}')).toMatch(
      /exactly once/
    );
    expect(trackingPatternRefusal('')).toMatch(/required/);
  });

  it('a stored pattern that fails the rule is never linked', () => {
    const list = [
      { id: 'tpl-bad', name: 'Bad', trackingUrlPattern: 'javascript:x({tracking})', active: true }
    ];
    expect(trackingUrlFor('tpl-bad', 'SMPL-1', list)).toBeNull();
  });

  it('the sample list is fictional: Sample names on the reserved .example domain', () => {
    expect(SAMPLE_THREE_PLS.length).toBeGreaterThan(0);
    for (const r of SAMPLE_THREE_PLS) {
      expect(r.name).toMatch(/^Sample .*\(illustrative\)$/);
      expect(new URL(r.trackingUrlPattern.replace('{tracking}', 'X')).hostname).toMatch(
        /\.example$/
      );
    }
  });
});

describe('BL-51 · maintaining the list is a governed verb on an administration atom', () => {
  it('the atom is compliance’s (and admin’s by derivation) — never a supplier lane, never planning or receiving', () => {
    expect(rolesHolding('threepl:maintain')).toEqual(['compliance']);
    expect(SYSTEM_ROLES.admin).toContain('threepl:maintain');
    for (const lane of /** @type {const} */ ([
      'planning',
      'receiving',
      'procurement',
      'commercial',
      'fulfilment',
      'back_office'
    ])) {
      expect(SYSTEM_ROLES[lane], lane).not.toContain('threepl:maintain');
    }
  });

  it('the compliance seat ADDS a 3PL: it joins the list and the change is on record with its attribution', async () => {
    const id = threePlIdFor('Sample Night Courier (illustrative)');
    expect(id).toBe('tpl-sample-night-courier-illustrative');
    const res = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_threepl_set',
      entity: 'threePl',
      entityId: id,
      payload: {
        name: 'Sample Night Courier (illustrative)',
        trackingUrlPattern: 'https://night.sample.example/t/{tracking}',
        active: true,
        setBy: NO_PERSON
      }
    });
    expect(res.status, res.reason).toBe('done');
    expect(threePlStore.get(id)?.name).toBe('Sample Night Courier (illustrative)');
    expect(threePlStore.changes().map((c) => c.id)).toEqual([id]);
    expect(threePlStore.changes()[0].setBy).toEqual(NO_PERSON);
    expect(trackingUrlFor(id, 'SMPL-9')).toBe('https://night.sample.example/t/SMPL-9');
    expect(
      commandAuditSink.byEvent('t_threepl_set').filter((e) => e.outcome === 'done')
    ).toHaveLength(1);
  });

  it('a seat without the atom is refused at the ROLE gate and the list is unchanged', async () => {
    const res = await svc.dispatch(buyerSeat('procurement', 'planning', 'receiving'), {
      transitionId: 't_threepl_set',
      entity: 'threePl',
      entityId: 'tpl-sample-express',
      payload: {
        name: 'Renamed',
        trackingUrlPattern: 'https://x.example/{tracking}',
        active: true,
        setBy: NO_PERSON
      }
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/ROLE/);
    expect(threePlStore.changes()).toEqual([]);
  });

  it('a supplier is denied at SCOPE — the list is PTI’s', async () => {
    await expect(
      svc.dispatch(supplierSeat('sup-007'), {
        transitionId: 't_threepl_set',
        entity: 'threePl',
        entityId: 'tpl-sample-express',
        payload: {
          name: 'X',
          trackingUrlPattern: 'https://x.example/{tracking}',
          active: true,
          setBy: NO_PERSON
        }
      })
    ).rejects.toBeInstanceOf(DataError);
  });

  it('the policy refuses a non-https address, a clashing name and a malformed id — by name', async () => {
    /**
     * @param {string} entityId
     * @param {Record<string, unknown>} payload
     */
    const set = (entityId, payload) =>
      svc.dispatch(buyerSeat('compliance'), {
        transitionId: 't_threepl_set',
        entity: 'threePl',
        entityId,
        payload
      });
    const http = await set('tpl-new', {
      name: 'Sample New (illustrative)',
      trackingUrlPattern: 'http://x.example/{tracking}',
      active: true,
      setBy: NO_PERSON
    });
    expect(http.reason).toMatch(/https/);
    const clash = await set('tpl-other-id', {
      name: 'sample express courier (illustrative)',
      trackingUrlPattern: 'https://x.example/{tracking}',
      active: true,
      setBy: NO_PERSON
    });
    expect(clash.reason).toMatch(/already called Sample Express Courier/);
    // A malformed id is not an addressable 3PL at all: NOT_FOUND, never a new row.
    await expect(
      set('Not An Id', {
        name: 'Sample X',
        trackingUrlPattern: 'https://x.example/{tracking}',
        active: true,
        setBy: NO_PERSON
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(threePlStore.changes()).toEqual([]);
  });
});

describe('BL-51 · the ASN names its 3PL through the ASN verbs', () => {
  const sup = supplierSeat('sup-007');
  // PO-2025-00108 (po-008) is sup-007's; confirming it makes it a PO awaiting an ASN.
  const confirmPo = () =>
    svc.dispatch(sup, {
      transitionId: 't_po_confirm',
      entity: 'purchaseOrder',
      entityId: 'po-008',
      payload: { confirmedQuantities: [150000] }
    });
  /** @param {string} threePlId */
  const create = (threePlId) =>
    svc.dispatch(sup, {
      transitionId: 't_asn_create',
      entity: 'advanceShipNotice',
      payload: {
        poReference: 'PO-2025-00108',
        carrier: 'Sample Carrier (illustrative)',
        threePlId,
        trackingNumber: 'SMPL-1',
        eta: '2026-09-30'
      }
    });

  beforeEach(() => purchaseOrderStore.reset());

  it('a 3PL no longer offered is refused on a NEW ASN (THREE_PL_NOT_LISTED), by the verb', async () => {
    await confirmPo();
    const before = asnStore.all().length;
    const res = await create('tpl-sample-interisland');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/THREE_PL_NOT_LISTED/);
    expect(asnStore.all()).toHaveLength(before);
  });

  it('a listed 3PL is stored on the ASN; a submission sending "" clears it (carrier typed by name)', async () => {
    await confirmPo();
    const res = await create('tpl-sample-express');
    expect(res.status, res.reason).toBe('done');
    const id = /** @type {NonNullable<typeof res.entityId>} */ (res.entityId);
    expect(asnStore.get(id)?.threePlId).toBe('tpl-sample-express');
    const submitted = await svc.dispatch(sup, {
      transitionId: 't_asn_submit',
      entity: 'advanceShipNotice',
      entityId: id,
      payload: {
        carrier: 'Sample Own Truck (illustrative)',
        threePlId: '',
        trackingNumber: 'B 1234 XYZ',
        eta: '2026-09-30',
        shipDate: '2026-09-28',
        lines: /** @type {NonNullable<ReturnType<typeof asnStore.get>>} */ (
          asnStore.get(id)
        ).lineItems.map((l) => ({
          materialCode: l.materialCode,
          shippedQty: l.shippedQty,
          batchNumber: 'B-1'
        }))
      }
    });
    expect(submitted.status, submitted.reason).toBe('done');
    const after = /** @type {NonNullable<ReturnType<typeof asnStore.get>>} */ (asnStore.get(id));
    expect(after.threePlId).toBeUndefined();
    expect(trackingUrlFor(after.threePlId, after.trackingNumber)).toBeNull();
  });

  it('an unknown 3PL is refused, and naming none is untouched', () => {
    expect(asnThreePlRefusal('tpl-nowhere')).toMatch(/not on the 3PL list/);
    expect(asnThreePlRefusal(undefined)).toBeNull();
    expect(asnThreePlRefusal('')).toBeNull();
    expect(asnThreePlRefusal('tpl-sample-express')).toBeNull();
  });
});
