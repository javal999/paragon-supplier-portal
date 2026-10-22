// Lane 2D follow-up — a declined RFQ leaves the supplier's To do "RFQ
// invitations to answer" (and the menu count), as a declined RFI or RFP
// already does. `supplierSourcingQueue` reads the supplier's own RFQ intent.
import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from '../data/mock/MockCommandService';
import { MockProcurementService } from '../data/mock/MockProcurementService';
import { rfqStore } from '../data/mock/stores/rfqStore';
import { quotationStore } from '../data/mock/stores/quotationStore';
import { resetRfqEngagementStores } from '../data/mock/stores/rfqEngagementStores';
import { resetRfxStores } from '../data/mock/stores/rfxStores';
/** @import { QueryScope } from '../data/types' */
import { PERSONA_SYSTEM_ROLES } from '../transitions/businessRoles';
import { sdcClock } from '../sdc';
import { NO_PERSON } from '@context/noPerson';
import { supplierSourcingQueue } from './supplierOutcome';

const svc = new MockCommandService();
const reads = new MockProcurementService();
/** @type {QueryScope} */
const sup007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  resetRfxStores();
  resetRfqEngagementStores();
  sdcClock.reset();
});

const queueFor = async () =>
  supplierSourcingQueue({
    rfqs: (await reads.getRFQs(sup007, undefined)).items,
    rfis: [],
    rfps: [],
    rounds: [],
    rfqEngagement: (await reads.getRfqEngagement(sup007)).items,
    supplierId: 'sup-007'
  }).openRfqs.map((r) => r.id);

describe('supplierSourcingQueue — a declined RFQ leaves the RFQs to answer', () => {
  it('KNOWN-GOOD — rfq-021 waits on sup-007 while it has said nothing, or said it will respond', async () => {
    expect(await queueFor()).toContain('rfq-021');
    const res = await svc.dispatch(sup007, {
      transitionId: 't_rfqintent_respond',
      entity: 'rfqIntent',
      payload: { rfqId: 'rfq-021', supplierId: 'sup-007' }
    });
    expect(res.status, res.reason).toBe('done');
    expect(await queueFor()).toContain('rfq-021');
  });

  it('KNOWN-BAD — once sup-007 declines rfq-021, it leaves the queue', async () => {
    const res = await svc.dispatch(sup007, {
      transitionId: 't_rfqintent_decline',
      entity: 'rfqIntent',
      payload: {
        rfqId: 'rfq-021',
        supplierId: 'sup-007',
        reason: 'noCapacity',
        text: 'Line is full until November'
      }
    });
    expect(res.status, res.reason).toBe('done');
    expect(await queueFor()).not.toContain('rfq-021');
  });

  it('another supplier’s decline does not take the RFQ off this supplier’s queue', () => {
    const rfq = /** @type {import('@services/data/types').RFQ} */ (rfqStore.get('rfq-021'));
    const ids = supplierSourcingQueue({
      rfqs: [rfq],
      rfis: [],
      rfps: [],
      rounds: [],
      rfqEngagement: [
        {
          rfqId: 'rfq-021',
          supplierId: 'sup-015',
          intent: {
            rfqId: 'rfq-021',
            supplierId: 'sup-015',
            intent: 'decline',
            reason: 'noCapacity',
            text: 'Line is full',
            at: '2026-10-01T00:00:00.000Z'
          }
        }
      ],
      supplierId: 'sup-007'
    }).openRfqs.map((r) => r.id);
    expect(ids).toEqual(['rfq-021']);
  });
});
