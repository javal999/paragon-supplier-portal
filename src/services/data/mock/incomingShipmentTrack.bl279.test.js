// PEX-16 (BL-279) — `t_incomingshipment_track` records a tracking link on a
// principal-to-supplier leg: https:// only, never on an ASN (to-paragon) leg,
// legal while Booked or Shipped, and it leaves the lifecycle where it is.

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { incomingShipmentStore } from './stores/incomingShipmentStore';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { personaCan } from '../../transitions';
/** @import { QueryScope } from '../types' */

/** @type {QueryScope} */
const sup005 = {
  personaType: 'supplier',
  supplierId: 'sup-005',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier
};
/** @type {QueryScope} */
const sup002 = { ...sup005, supplierId: 'sup-002' };

const svc = new MockCommandService();
/**
 * @param {QueryScope} scope
 * @param {string} entityId
 * @param {unknown} trackingUrl
 */
const track = (scope, entityId, trackingUrl) =>
  svc.dispatch(scope, {
    transitionId: 't_incomingshipment_track',
    entity: 'incomingShipment',
    entityId,
    payload: { trackingUrl }
  });

beforeEach(() => incomingShipmentStore.reset());

describe('BL-279 — tracking link on a shipment from the principal', () => {
  it('a supplier seat holds the verb', () => {
    expect(personaCan('supplier', 'incomingshipment:track')).toBe(true);
  });

  it('an https:// link is stored on the leg, and the leg stays Booked', async () => {
    const res = await track(sup005, 'ish-0002', '  https://track.example.com/AWB-1  ');
    expect(res.status).not.toBe('failed');
    const leg = incomingShipmentStore.get('ish-0002');
    expect(leg?.trackingUrl).toBe('https://track.example.com/AWB-1');
    expect(leg?.lifecycle).toBe('Booked');
  });

  it.each(['http://track.example.com/1', 'track.example.com', 'javascript:alert(1)', ''])(
    'refuses %j, and stores nothing',
    async (url) => {
      const res = await track(sup005, 'ish-0002', url);
      expect(res.status).toBe('failed');
      expect(incomingShipmentStore.get('ish-0002')?.trackingUrl).toBeUndefined();
    }
  );

  it('refuses a to-paragon leg: that one converges on the ASN', async () => {
    const res = await track(sup002, 'ish-0001', 'https://track.example.com/1');
    expect(res.status).toBe('failed');
    expect(incomingShipmentStore.get('ish-0001')?.trackingUrl).toBeUndefined();
  });

  it('another supplier cannot write on the leg', async () => {
    await expect(track(sup002, 'ish-0002', 'https://track.example.com/1')).rejects.toThrow();
    expect(incomingShipmentStore.get('ish-0002')?.trackingUrl).toBeUndefined();
  });

  it('a Shipped leg keeps Shipped; an arrived leg takes no link', async () => {
    incomingShipmentStore.update('ish-0002', (s) => ({ ...s, lifecycle: 'Shipped' }));
    await track(sup005, 'ish-0002', 'https://a.example/1');
    expect(incomingShipmentStore.get('ish-0002')?.lifecycle).toBe('Shipped');
    incomingShipmentStore.update('ish-0002', (s) => ({ ...s, lifecycle: 'Arrived' }));
    const res = await track(sup005, 'ish-0002', 'https://a.example/2');
    expect(res.status).toBe('failed');
    expect(incomingShipmentStore.get('ish-0002')?.trackingUrl).toBe('https://a.example/1');
  });
});
