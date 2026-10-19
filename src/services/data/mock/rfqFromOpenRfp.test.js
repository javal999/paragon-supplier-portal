// BL-216 (RFX-D16) — "Create RFQ from this RFP" is refused AT THE VERB while
// the source RFP is Open (RFQ_SOURCE_RFP_OPEN), not only held on the RFP page.
// The pure rule is `rfqFromOpenRfpRefusal`, which the RFP page reads too.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { resetRfxStores, rfpEventStore } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { rfxNow } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';
import { rfqFromOpenRfpRefusal } from '../../sourcing/rfpAward';

const svc = new MockCommandService();
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});
afterEach(() => resetRfxStores());

/** @param {string | undefined} reason */
const codeOf = (reason) => (reason ?? '').replace(/^POLICY_REJECTED:[a-z_]+:/, '').split(':')[0];

const DAY_MS = 86_400_000;
/** @param {number} offset */
const dayFromNow = (offset) =>
  new Date(Date.parse(rfxNow()) + offset * DAY_MS).toISOString().slice(0, 10);

const rfqFromTundra = () =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_create',
    entity: 'rfq',
    payload: {
      title: 'Tundra — pump and cap, firm prices',
      materialCategory: 'Packaging',
      invitedSupplierIds: ['sup-007'],
      responseDeadline: dayFromNow(10),
      awardDeadline: dayFromNow(20),
      totalQty: 10_000,
      uom: 'PCS',
      sourceRfpId: 'rfp-002',
      sourceRfpOptionRefs: ['opt-pump-cap']
    }
  });

describe('rfqFromOpenRfpRefusal — the pure rule', () => {
  it('KNOWN-BAD — an Open RFP refuses, naming the RFP', () => {
    expect(rfqFromOpenRfpRefusal('Open', 'RFP-2026-002')).toBe(
      'RFQ_SOURCE_RFP_OPEN: RFP-2026-002 is still Open; close it before creating an RFQ from it'
    );
  });
  it('KNOWN-GOOD — a Closed or Partly awarded RFP passes', () => {
    expect(rfqFromOpenRfpRefusal('Closed', 'RFP-2026-002')).toBeNull();
    expect(rfqFromOpenRfpRefusal('Partly awarded', 'RFP-2026-002')).toBeNull();
  });
});

describe('t_rfq_create from an RFP — RFQ_SOURCE_RFP_OPEN', () => {
  it('the fixture premise: Tundra (rfp-002) is Open', () => {
    expect(rfpEventStore.get('rfp-002')?.status).toBe('Open');
  });

  it('KNOWN-BAD — from the Open RFP the create is refused and no RFQ is stored', async () => {
    const before = rfqStore.all().length;
    const res = await rfqFromTundra();
    expect(res.status).toBe('failed');
    expect(codeOf(res.reason)).toBe('RFQ_SOURCE_RFP_OPEN');
    expect(res.reason).toContain('RFP-2026-002');
    expect(rfqStore.all()).toHaveLength(before);
  });

  it('KNOWN-GOOD — once the RFP is Closed the same create goes through', async () => {
    rfpEventStore.update('rfp-002', (e) => ({ ...e, status: /** @type {const} */ ('Closed') }));
    const res = await rfqFromTundra();
    expect(res.status, res.reason).toBe('done');
  });
});
