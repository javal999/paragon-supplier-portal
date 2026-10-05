// ────────────────────────────────────────────────────────────────────────────
// RFx C2 — cancel an award, "Raised in SAP", and quote reinstatement (NR-3
// BR-09 to BR-12, AC-05 to AC-07, edge case 4; AR-06, AR-08). Dispatched
// through the REAL MockCommandService.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import {
  awardCancellationStore,
  awardSapMarkStore,
  awardStore,
  resetRfxStores
} from './stores/rfxStores';
import { rfqStore } from './stores/rfqStore';
import { quotationStore } from './stores/quotationStore';
import { awardViews } from './rfxReadModel';
import { sdcClock } from '../../sdc';
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope } from '../types' */
/** @import { AwardLine } from '../../sourcing/types' */

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

/** @param {string} quotationId */
const status = (quotationId) =>
  /** @type {import('../../../data/mockQuotations').Quotation} */ (quotationStore.get(quotationId))
    .status;
/** @param {string} rfqId */
const awardsOf = (rfqId) =>
  awardStore.all().filter((a) => a.eventType === 'rfq' && a.eventId === rfqId);

/**
 * A legacy rfq-014 line at 100% of its only break.
 * @param {string} supplierId
 * @param {string} quotationId
 * @param {string} itemCode
 * @param {number} quantity
 * @returns {AwardLine}
 */
const line = (supplierId, quotationId, itemCode, quantity) => ({
  supplierId,
  quotationId,
  itemCode,
  sharePct: 100,
  quantity
});

/**
 * @param {'t_rfq_award' | 't_rfq_award_partial'} transitionId
 * @param {string} rfqId
 * @param {readonly AwardLine[]} lines
 */
const award = (transitionId, rfqId, lines) =>
  svc.dispatch(buyer, {
    transitionId,
    entity: 'rfq',
    entityId: rfqId,
    payload: {
      awardedQuotationId: /** @type {AwardLine} */ (lines[0]).quotationId,
      awardedSupplierId: /** @type {AwardLine} */ (lines[0]).supplierId,
      awardLines: lines.map((l) => ({ ...l })),
      awardReason: 'Chosen on lead time.'
    }
  });

/**
 * @param {'t_rfq_award_cancel' | 't_rfq_award_cancel_partial'} transitionId
 * @param {string} rfqId
 * @param {string} awardId
 * @param {string} [cancelReason]
 */
const cancel = (
  transitionId,
  rfqId,
  awardId,
  cancelReason = 'Wrong supplier picked for the bottle.'
) =>
  svc.dispatch(buyer, {
    transitionId,
    entity: 'rfq',
    entityId: rfqId,
    payload: { awardId, cancelReason }
  });

/**
 * @param {string} rfqId
 * @param {string} awardId
 * @param {string} sapDocumentNo
 */
const markSap = (rfqId, awardId, sapDocumentNo) =>
  svc.dispatch(buyer, {
    transitionId: 't_rfq_award_sap_raised',
    entity: 'rfq',
    entityId: rfqId,
    payload: { awardId, sapDocumentNo }
  });

/** rfq-014 awarded whole to sup-013 (qt-014c): every other quote is Rejected. */
const awardRfq014ToSup013 = async () => {
  const res = await award('t_rfq_award', 'rfq-014', [
    line('sup-013', 'qt-014c', 'PK-PETB-8802', 600_000),
    line('sup-013', 'qt-014c', 'PK-CAPF-8820', 300_000)
  ]);
  expect(res.status, res.reason).toBe('done');
  return /** @type {import('../../sourcing/types').AwardRecord} */ (awardsOf('rfq-014')[0]);
};

/** rfq-014 with a third line item, so 2 partial awards can leave one item open. */
const addThirdLine = () =>
  rfqStore.update('rfq-014', (r) => ({
    ...r,
    lineItems: [
      .../** @type {NonNullable<typeof r.lineItems>} */ (r.lineItems),
      {
        .../** @type {import('../../../data/mockRfqs').RfqLineItem} */ (
          /** @type {NonNullable<typeof r.lineItems>} */ (r.lineItems)[1]
        ),
        lineNo: 3,
        materialCode: 'PK-LBL-8830',
        description: 'Front label'
      }
    ]
  }));

describe('population control', () => {
  it('rfq-014 is a Closed legacy RFQ with every quote Under Review; rfq-024 is Awarded by aw-0002 to sup-013 and sup-015', () => {
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Closed');
    expect(quotationStore.forRfq('rfq-014').map((q) => [q.id, q.status])).toEqual([
      ['qt-014a', 'Under Review'],
      ['qt-014b', 'Under Review'],
      ['qt-014c', 'Under Review'],
      ['qt-014d', 'Under Review'],
      ['qt-014d-r1', 'Under Review']
    ]);
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-024')).status
    ).toBe('Awarded');
    expect(awardsOf('rfq-024').map((a) => a.id)).toEqual(['aw-0002']);
    expect(
      [
        ...new Set(
          /** @type {import('../../sourcing/types').AwardRecord} */ (
            awardsOf('rfq-024')[0]
          ).lines.map((l) => l.supplierId)
        )
      ].sort()
    ).toEqual(['sup-013', 'sup-015']);
    expect(awardCancellationStore.all()).toEqual([]);
    expect(awardSapMarkStore.all()).toEqual([]);
  });
});

describe('AC-05 — cancelling the only award', () => {
  it('returns the RFQ to Closed, keeps the award record, and returns the named and the rejected quotes to Under Review', async () => {
    const rec = await awardRfq014ToSup013();
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Awarded');
    expect(status('qt-014c')).toBe('Awarded');
    expect(['qt-014a', 'qt-014b', 'qt-014d', 'qt-014d-r1'].map(status)).toEqual([
      'Rejected',
      'Rejected',
      'Rejected',
      'Rejected'
    ]);

    const res = await cancel('t_rfq_award_cancel', 'rfq-014', rec.id);
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Closed');
    // The award record is kept, byte for byte; the cancellation is a new record.
    expect(awardStore.get(rec.id)).toEqual(rec);
    expect(awardCancellationStore.all().map((c) => [c.awardId, c.reason, c.by])).toEqual([
      [rec.id, 'Wrong supplier picked for the bottle.', NO_PERSON]
    ]);
    expect(quotationStore.forRfq('rfq-014').map((q) => q.status)).toEqual([
      'Under Review',
      'Under Review',
      'Under Review',
      'Under Review',
      'Under Review'
    ]);
    // Nothing is awarded any more, so the RFQ names no awarded supplier.
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014'))
        .awardedSupplierId
    ).toBeUndefined();
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014'))
        .awardedQuotationId
    ).toBeUndefined();
  });

  it('a seeded split award (aw-0002) cancelled: both awarded quotes go back to Under Review', async () => {
    const res = await cancel('t_rfq_award_cancel', 'rfq-024', 'aw-0002');
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-024')).status
    ).toBe('Closed');
    expect([status('qt-024a'), status('qt-024b')]).toEqual(['Under Review', 'Under Review']);
  });
});

describe('cancelling 1 of 2 partial awards leaves the RFQ Partly awarded', () => {
  it('only the cancelled award’s quote is reinstated; the other award stands', async () => {
    addThirdLine();
    expect(
      (
        await award('t_rfq_award_partial', 'rfq-014', [
          line('sup-013', 'qt-014c', 'PK-PETB-8802', 600_000)
        ])
      ).status
    ).toBe('done');
    const first = /** @type {import('../../sourcing/types').AwardRecord} */ (
      awardsOf('rfq-014')[0]
    );
    const second = await award('t_rfq_award_partial', 'rfq-014', [
      line('sup-015', 'qt-014d-r1', 'PK-CAPF-8820', 300_000)
    ]);
    expect(second.status, second.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Partly awarded');

    const res = await cancel('t_rfq_award_cancel_partial', 'rfq-014', first.id);
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Partly awarded');
    expect(status('qt-014c')).toBe('Under Review');
    expect(status('qt-014d-r1')).toBe('Awarded');
    // The RFQ's award pointer now names the award still in force.
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014'))
        .awardedQuotationId
    ).toBe('qt-014d-r1');
    // …and the cancelled award's item is open again, so it can be awarded anew.
    const again = await award('t_rfq_award_partial', 'rfq-014', [
      line('sup-013', 'qt-014c', 'PK-PETB-8802', 600_000)
    ]);
    expect(again.status, again.reason).toBe('done');
    expect(status('qt-014c')).toBe('Awarded');
  });

  it('a quote another award in force still names stays Awarded', async () => {
    addThirdLine();
    await award('t_rfq_award_partial', 'rfq-014', [
      line('sup-013', 'qt-014c', 'PK-PETB-8802', 600_000)
    ]);
    const first = /** @type {import('../../sourcing/types').AwardRecord} */ (
      awardsOf('rfq-014')[0]
    );
    await award('t_rfq_award_partial', 'rfq-014', [
      line('sup-013', 'qt-014c', 'PK-CAPF-8820', 300_000)
    ]);
    const res = await cancel('t_rfq_award_cancel_partial', 'rfq-014', first.id);
    expect(res.status, res.reason).toBe('done');
    expect(status('qt-014c')).toBe('Awarded');
  });

  it('cancelling the final award of an event with an earlier partial one: Partly awarded, and the quotes it rejected are reinstated', async () => {
    await award('t_rfq_award_partial', 'rfq-014', [
      line('sup-013', 'qt-014c', 'PK-PETB-8802', 600_000)
    ]);
    expect(
      (
        await award('t_rfq_award', 'rfq-014', [
          line('sup-015', 'qt-014d-r1', 'PK-CAPF-8820', 300_000)
        ])
      ).status
    ).toBe('done');
    expect(status('qt-014a')).toBe('Rejected');
    const final = /** @type {import('../../sourcing/types').AwardRecord} */ (
      awardsOf('rfq-014')[0]
    );
    const res = await cancel('t_rfq_award_cancel_partial', 'rfq-014', final.id);
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Partly awarded');
    expect(status('qt-014c')).toBe('Awarded'); // the partial award stands
    expect(['qt-014a', 'qt-014b', 'qt-014d', 'qt-014d-r1'].map(status)).toEqual([
      'Under Review',
      'Under Review',
      'Under Review',
      'Under Review'
    ]);
  });

  it('KNOWN-BAD — the full cancel while another award stays in force is refused AWARD_CANCEL_TARGET_WRONG', async () => {
    addThirdLine();
    await award('t_rfq_award_partial', 'rfq-014', [
      line('sup-013', 'qt-014c', 'PK-PETB-8802', 600_000)
    ]);
    const first = /** @type {import('../../sourcing/types').AwardRecord} */ (
      awardsOf('rfq-014')[0]
    );
    await award('t_rfq_award_partial', 'rfq-014', [
      line('sup-015', 'qt-014d-r1', 'PK-CAPF-8820', 300_000)
    ]);
    const res = await cancel('t_rfq_award_cancel', 'rfq-014', first.id);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(
      /rfq_award_cancel_governed:AWARD_CANCEL_TARGET_WRONG: 1 other award\(s\) of this event stay in force/
    );
    expect(awardCancellationStore.all()).toEqual([]);
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Partly awarded');
  });

  it('KNOWN-BAD — the partial cancel of the only award is refused AWARD_CANCEL_TARGET_WRONG', async () => {
    const rec = await awardRfq014ToSup013();
    const res = await cancel('t_rfq_award_cancel_partial', 'rfq-014', rec.id);
    expect(res.reason).toMatch(
      /AWARD_CANCEL_TARGET_WRONG: no other award of this event stays in force/
    );
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Awarded');
  });
});

describe('AC-06 / edge case 4 — "Raised in SAP"', () => {
  it('the marking is appended with the SAP document number and keeps the RFQ Awarded', async () => {
    const rec = await awardRfq014ToSup013();
    const res = await markSap('rfq-014', rec.id, ' 4500012345 ');
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Awarded');
    expect(awardSapMarkStore.all().map((m) => [m.awardId, m.sapDocumentNo, m.by])).toEqual([
      [rec.id, '4500012345', NO_PERSON]
    ]);
    expect(awardStore.get(rec.id)).toEqual(rec);
  });

  it('KNOWN-BAD — cancel after "Raised in SAP" is refused AWARD_RAISED_IN_SAP, naming the SAP document', async () => {
    const rec = await awardRfq014ToSup013();
    await markSap('rfq-014', rec.id, '4500012345');
    const res = await cancel('t_rfq_award_cancel', 'rfq-014', rec.id);
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_RAISED_IN_SAP: the award was raised in SAP as 4500012345/);
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Awarded');
    expect(awardCancellationStore.all()).toEqual([]);
    expect(status('qt-014c')).toBe('Awarded');
  });

  it('KNOWN-GOOD twin — the same cancel before any SAP marking is done', async () => {
    const rec = await awardRfq014ToSup013();
    expect((await cancel('t_rfq_award_cancel', 'rfq-014', rec.id)).status).toBe('done');
  });

  it('KNOWN-BAD — marking the same award twice is refused AWARD_RAISED_IN_SAP', async () => {
    const rec = await awardRfq014ToSup013();
    await markSap('rfq-014', rec.id, '4500012345');
    const res = await markSap('rfq-014', rec.id, '4500099999');
    expect(res.reason).toMatch(/AWARD_RAISED_IN_SAP: the award was raised in SAP as 4500012345/);
    expect(awardSapMarkStore.all()).toHaveLength(1);
  });

  it('KNOWN-BAD — a blank SAP document number is refused; an absent one is a missing field', async () => {
    const rec = await awardRfq014ToSup013();
    expect((await markSap('rfq-014', rec.id, '   ')).reason).toMatch(/AWARD_SAP_DOCUMENT_REQUIRED/);
    expect((await markSap('rfq-014', rec.id, '')).reason).toMatch(/^MISSING_FIELDS/);
    expect(awardSapMarkStore.all()).toEqual([]);
  });

  it('KNOWN-BAD — a cancelled award cannot be marked raised in SAP (AWARD_NOT_ACTIVE)', async () => {
    const rec = await awardRfq014ToSup013();
    await cancel('t_rfq_award_cancel', 'rfq-014', rec.id);
    // Closed is not a state the SAP verb leaves from, so the RFQ is re-awarded
    // first: the refusal is about the award, not the event's state.
    await award('t_rfq_award', 'rfq-014', [
      line('sup-015', 'qt-014d-r1', 'PK-PETB-8802', 600_000),
      line('sup-015', 'qt-014d-r1', 'PK-CAPF-8820', 300_000)
    ]);
    const res = await markSap('rfq-014', rec.id, '4500012345');
    expect(res.reason).toMatch(
      new RegExp(`AWARD_NOT_ACTIVE: ${rec.id} is not an active award of this event`)
    );
  });
});

describe('AWARD_REASON_REQUIRED — a cancel carries a reason', () => {
  it('KNOWN-BAD — a blank reason is refused and nothing is cancelled', async () => {
    const rec = await awardRfq014ToSup013();
    const res = await cancel('t_rfq_award_cancel', 'rfq-014', rec.id, '   ');
    expect(res.status).toBe('failed');
    expect(res.reason).toMatch(/AWARD_REASON_REQUIRED: cancelling an award needs a reason/);
    expect(awardCancellationStore.all()).toEqual([]);
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Awarded');
  });

  it('KNOWN-GOOD twin — the reason is stored trimmed', async () => {
    const rec = await awardRfq014ToSup013();
    expect((await cancel('t_rfq_award_cancel', 'rfq-014', rec.id, '  Price error.  ')).status).toBe(
      'done'
    );
    expect(
      /** @type {import('../../sourcing/types').AwardCancellation} */ (
        awardCancellationStore.all()[0]
      ).reason
    ).toBe('Price error.');
  });
});

describe('AWARD_NOT_ACTIVE — only an active award of this event is cancelled', () => {
  it('KNOWN-BAD — an award already cancelled, an unknown id, and another event’s award are refused', async () => {
    const rec = await awardRfq014ToSup013();
    await cancel('t_rfq_award_cancel', 'rfq-014', rec.id);
    await award('t_rfq_award', 'rfq-014', [
      line('sup-013', 'qt-014c', 'PK-PETB-8802', 600_000),
      line('sup-013', 'qt-014c', 'PK-CAPF-8820', 300_000)
    ]);
    expect((await cancel('t_rfq_award_cancel', 'rfq-014', rec.id)).reason).toMatch(
      /AWARD_NOT_ACTIVE/
    );
    expect((await cancel('t_rfq_award_cancel', 'rfq-014', 'aw-9999')).reason).toMatch(
      /AWARD_NOT_ACTIVE: aw-9999/
    );
    expect((await cancel('t_rfq_award_cancel', 'rfq-014', 'aw-0002')).reason).toMatch(
      /AWARD_NOT_ACTIVE: aw-0002/
    );
    expect(awardCancellationStore.all()).toHaveLength(1);
  });

  it('KNOWN-GOOD twin — the active award of the same event is cancelled', async () => {
    const res = await cancel('t_rfq_award_cancel', 'rfq-024', 'aw-0002');
    expect(res.status, res.reason).toBe('done');
  });
});

describe('the cancel is a procurement act', () => {
  it('a seat without `rfq:award-cancel` is refused at the role gate', async () => {
    /** @type {QueryScope} */
    const finance = { ...buyer, businessRoles: ['finance'] };
    const res = await svc.dispatch(finance, {
      transitionId: 't_rfq_award_cancel',
      entity: 'rfq',
      entityId: 'rfq-024',
      payload: { awardId: 'aw-0002', cancelReason: 'x' }
    });
    expect(res.reason).toMatch(/^ROLE_NOT_PERMITTED/);
    /** @type {QueryScope} */
    const proc = { ...buyer, businessRoles: ['procurement'] };
    expect(
      (
        await svc.dispatch(proc, {
          transitionId: 't_rfq_award_cancel',
          entity: 'rfq',
          entityId: 'rfq-024',
          payload: { awardId: 'aw-0002', cancelReason: 'x' }
        })
      ).status
    ).toBe('done');
  });
});

describe('AC-07 / BR-12 — the supplier reads "withdrawn" for its own award only', () => {
  it('each supplier sees the cancelled award as Cancelled with its date, only its own lines, and none of the buyer’s trail', async () => {
    await cancel('t_rfq_award_cancel', 'rfq-024', 'aw-0002', 'Split set on the wrong break.');
    const cancelledAt = /** @type {import('../../sourcing/types').AwardCancellation} */ (
      awardCancellationStore.all()[0]
    ).cancelledAt;
    for (const [me, other] of /** @type {const} */ ([
      ['sup-013', 'sup-015'],
      ['sup-015', 'sup-013']
    ])) {
      const mine = /** @type {import('../../sourcing/views').AwardView} */ (
        awardViews(me).find((a) => a.id === 'aw-0002')
      );
      expect(mine.status).toBe('Cancelled');
      expect(mine.withdrawnAt).toBe(cancelledAt);
      expect(mine.lines.length).toBeGreaterThan(0);
      expect(mine.lines.every((l) => l.supplierId === me)).toBe(true);
      expect(mine.awardedSuppliers.map((s) => s.supplierId)).toEqual([me]);
      expect(JSON.stringify(mine)).not.toContain(other);
      // The buyer's reason, actor and SAP number never reach a supplier.
      expect(mine.cancellation).toBeUndefined();
      expect(mine.sapMark).toBeUndefined();
      expect(JSON.stringify(mine)).not.toContain('Split set on the wrong break.');
    }
    // A supplier the award never named reads nothing of it.
    expect(awardViews('sup-007').some((a) => a.id === 'aw-0002')).toBe(false);
    // KNOWN-GOOD control — the buyer reads the whole trail.
    const buyerView = /** @type {import('../../sourcing/views').AwardView} */ (
      awardViews(null).find((a) => a.id === 'aw-0002')
    );
    expect(buyerView.status).toBe('Cancelled');
    expect(buyerView.cancellation?.reason).toBe('Split set on the wrong break.');
  });

  it('an award in force reads Active, and Raised in SAP once marked; only the buyer sees the SAP number', async () => {
    expect(
      /** @type {import('../../sourcing/views').AwardView} */ (
        awardViews('sup-013').find((a) => a.id === 'aw-0002')
      ).status
    ).toBe('Active');
    await markSap('rfq-024', 'aw-0002', '4500012345');
    const supplierView = /** @type {import('../../sourcing/views').AwardView} */ (
      awardViews('sup-013').find((a) => a.id === 'aw-0002')
    );
    expect(supplierView.status).toBe('Raised in SAP');
    expect(supplierView.withdrawnAt).toBeUndefined();
    expect(JSON.stringify(supplierView)).not.toContain('4500012345');
    expect(
      /** @type {import('../../sourcing/views').AwardView} */ (
        awardViews(null).find((a) => a.id === 'aw-0002')
      ).sapMark?.sapDocumentNo
    ).toBe('4500012345');
  });
});

describe('a new award after a cancel succeeds', () => {
  it('the event is awarded again, to another supplier, and the cancelled award stays on record', async () => {
    const rec = await awardRfq014ToSup013();
    await cancel('t_rfq_award_cancel', 'rfq-014', rec.id);
    const res = await award('t_rfq_award', 'rfq-014', [
      line('sup-015', 'qt-014d-r1', 'PK-PETB-8802', 600_000),
      line('sup-015', 'qt-014d-r1', 'PK-CAPF-8820', 300_000)
    ]);
    expect(res.status, res.reason).toBe('done');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014')).status
    ).toBe('Awarded');
    expect(
      /** @type {import('../../../data/mockRfqs').RFQ} */ (rfqStore.get('rfq-014'))
        .awardedSupplierId
    ).toBe('sup-015');
    expect(awardsOf('rfq-014').map((a) => a.id)).toEqual([expect.any(String), rec.id]);
    expect(status('qt-014d-r1')).toBe('Awarded');
    expect(status('qt-014c')).toBe('Rejected');
    const views = awardViews(null).filter((a) => a.eventId === 'rfq-014');
    expect(views.map((a) => a.status)).toEqual(['Active', 'Cancelled']);
  });
});
