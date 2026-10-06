// ────────────────────────────────────────────────────────────────────────────
// RFx A1 (AR-01) — the RFQ target branches on the TRANSITION ID, not on the
// payload. Before A1 the target could not see which verb it applied, so a
// `deadline` field in ANY payload sent the verb down the extension branch: an
// award carrying a stray `deadline` moved the response deadline, appended an
// extension and returned without awarding. The verb now decides the branch.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';

import { MockCommandService } from './MockCommandService';
import { resetRfxStores } from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { sdcClock } from '../../sdc';
import { NO_PERSON } from '@context/noPerson';

const svc = new MockCommandService();
/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};

// RFQ-003 is Open with three Under Review quotations (see rfqAwardCommand.test.js).
const RFQ = 'rfq-003';

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
});

describe('RFQ target — the transition id is the discriminator (AR-01)', () => {
  it('awards on t_rfq_award even when the payload carries a stray deadline', async () => {
    const before = /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ));
    expect(before.status).toBe('Open');

    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: RFQ,
      payload: {
        awardedQuotationId: 'qt-003a',
        awardedSupplierId: 'sup-001',
        awardReason: 'Awarded to the incumbent for continuity.',
        deadline: '2099-12-31'
      }
    });
    expect(res.status).toBe('done');

    const after = /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ));
    expect(after.status).toBe('Awarded');
    expect(after.awardedQuotationId).toBe('qt-003a');
    expect(after.responseDeadline).toBe(before.responseDeadline);
    expect(after.extensions).toEqual(before.extensions);
    expect(after.inviteeDeadlines).toEqual(before.inviteeDeadlines);
  });
});
