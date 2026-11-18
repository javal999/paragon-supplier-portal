// AIB-2 (BL-350) — the Expeditor's inbound review, acknowledgment, GR display
// and To-Do, plus the deadline rule. The page runs over the real mock service,
// the real stores and the real seat resolution.
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@test/test-utils';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { asnStore } from '@services/data/mock/stores/asnStore';
import { goodsReceiptStore } from '@services/data/mock/stores/goodsReceiptStore';
import { receiptDiscrepancyStore } from '@services/data/mock/stores/receiptDiscrepancyStore';
import { inboundAcknowledgmentStore } from '@services/data/mock/stores/inboundAcknowledgmentStore';
import { inboundDueAt, inboundRows, outstandingInbounds } from '@services/transitions/inboundRules';
import { PERSONA_SYSTEM_ROLES, SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
/** @import { QueryScope } from '@services/data/types' */
import BuyerInbound from './BuyerInbound';
import BuyerHome from './BuyerHome';

/** The Expeditor seat: a buyer seat holding the new role, and nothing else. */
/** @type {CurrentIdentity} */
const EXP = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['expeditor'],
  actor: NO_PERSON
};

/** A buyer seat WITHOUT the Expeditor role — it reads the list and waits. */
/** @type {CurrentIdentity} */
const BUYER = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: SEEDED_SEAT_ROLES.buyer,
  actor: NO_PERSON
};

const svc = new MockCommandService();
/** @type {QueryScope} */
const sup007 = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

beforeEach(() => {
  asnStore.reset();
  goodsReceiptStore.reset();
  receiptDiscrepancyStore.reset();
  inboundAcknowledgmentStore.reset();
});

describe('AC-01 / AC-02 — an EXP seat sees the list, acknowledges, and the record names the seat and time', () => {
  it('the list shows the submitted inbounds and the seeded acknowledgment', async () => {
    renderWithProviders(<BuyerInbound />, { identity: EXP, route: '/buyer/inbound' });
    expect(await screen.findByTestId('inbound-table')).toBeInTheDocument();
    expect(screen.getByTestId('inbound-row-ASN-2025-00211')).toBeInTheDocument();
    // The seeded acknowledgment (ASN-2025-00198) renders who and when.
    const acked = screen.getByTestId('inbound-row-ASN-2025-00198');
    expect(acked).toHaveTextContent('Acknowledged by Expeditor at');
  });

  it('acknowledging records the seat and the time, and the row re-reads it', async () => {
    renderWithProviders(<BuyerInbound />, { identity: EXP, route: '/buyer/inbound' });
    const button = await screen.findByTestId('inbound-ack-ASN-2025-00211');
    fireEvent.click(button);
    await waitFor(() =>
      expect(inboundAcknowledgmentStore.get('ASN-2025-00211')?.asnNumber).toBe('ASN-2025-00211')
    );
    const rec = inboundAcknowledgmentStore.get('ASN-2025-00211');
    expect(rec?.seatRoles).toEqual(['expeditor']);
    expect(rec?.acknowledgedBy).toEqual(NO_PERSON);
    expect(rec?.acknowledgedAt).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId('inbound-row-ASN-2025-00211')).toHaveTextContent(
        'Acknowledged by Expeditor at'
      )
    );
    expect(screen.queryByTestId('inbound-ack-ASN-2025-00211')).not.toBeInTheDocument();
  });

  it('a seat WITHOUT the atom reads the wait, naming the owner — never a missing action', async () => {
    renderWithProviders(<BuyerInbound />, { identity: BUYER, route: '/buyer/inbound' });
    const row = await screen.findByTestId('inbound-row-ASN-2025-00211');
    expect(row).toHaveTextContent('Awaiting Expeditor');
    expect(screen.queryByTestId('inbound-ack-ASN-2025-00211')).not.toBeInTheDocument();
  });
});

describe('AC-03 — SAP holds the GR; the hub displays it and adds no record', () => {
  it('shows the GR result and the rejected quantity, and acknowledging writes no GR', async () => {
    // SAP's receipt for an inbound (a fixture mutation, exactly the read the
    // hub makes — nothing here posts or re-records the inspection).
    goodsReceiptStore.update('gr-006', (g) => ({
      ...g,
      asnId: 'ASN-2025-00201',
      asnNumber: 'ASN-2025-00201',
      supplierId: 'sup-007',
      supplierName: 'PT Sample Packaging Indonesia'
    }));
    const before = goodsReceiptStore.all().length;
    renderWithProviders(<BuyerInbound />, { identity: EXP, route: '/buyer/inbound' });
    const row = await screen.findByTestId('inbound-row-ASN-2025-00201');
    expect(row).toHaveTextContent('GR-2026-006');
    expect(row).toHaveTextContent('Posted to SAP');
    expect(row).toHaveTextContent('5,000 rejected');
    fireEvent.click(within(row).getByTestId('inbound-ack-ASN-2025-00201'));
    await waitFor(() => expect(inboundAcknowledgmentStore.get('ASN-2025-00201')).toBeTruthy());
    // No receipt was created, edited or posted by the acknowledgment.
    expect(goodsReceiptStore.all().length).toBe(before);
  });

  it('an inbound with no receipt says so, rather than inventing one', async () => {
    renderWithProviders(<BuyerInbound />, { identity: EXP, route: '/buyer/inbound' });
    const row = await screen.findByTestId('inbound-row-ASN-2025-00211');
    expect(row).toHaveTextContent('Not posted in SAP yet');
  });
});

describe('AC-04 — the supplier’s GR acknowledge/dispute does not wait on the Expeditor', () => {
  it('the supplier answers a discrepancy with no inbound acknowledgment on record', async () => {
    // GR-2026-006 rejected 5,000 of a posted receipt → a discrepancy (CR-11).
    goodsReceiptStore.update('gr-006', (g) => ({
      ...g,
      asnId: 'ASN-2025-00211',
      asnNumber: 'ASN-2025-00211',
      supplierId: 'sup-007',
      supplierName: 'PT Sample Packaging Indonesia'
    }));
    expect(inboundAcknowledgmentStore.get('ASN-2025-00211')).toBeUndefined();
    const res = await svc.dispatch(sup007, {
      transitionId: 't_receiptdiscrepancy_acknowledge',
      entity: 'receiptDiscrepancy',
      payload: { receiptId: 'gr-006', comment: 'We agree with the rejected quantity.' }
    });
    expect(res.status, res.reason).toBe('done');
    expect(receiptDiscrepancyStore.get('gr-006')?.status).toBe('Acknowledged');
    expect(inboundAcknowledgmentStore.get('ASN-2025-00211')).toBeUndefined();
  });
});

describe('AC-05 / AIB-2 BR-05 — one working day, on the hub calendar; the To-Do is the Expeditor’s', () => {
  it('the deadline is one working day after the ETA’s working day, not one calendar day', () => {
    // Friday 21 Aug 2026 → due Monday 24 Aug at 08:00 WIB (01:00Z).
    const due = inboundDueAt('2026-08-21');
    expect(due?.toISOString()).toBe('2026-08-24T01:00:00.000Z');
    // Sunday 9 Aug 2026 → Monday 10 Aug 08:00 WIB + 1 working day = Tue 11 Aug 08:00 WIB.
    expect(inboundDueAt('2026-08-09')?.toISOString()).toBe('2026-08-11T01:00:00.000Z');
    // An unreadable ETA has no deadline — the probe on the other side.
    expect(inboundDueAt('')).toBeNull();
  });

  it('an unacknowledged inbound is overdue only AFTER its due instant', () => {
    const asn = /** @type {import('@services/data/types').ASN} */ (asnStore.get('ASN-2025-00211'));
    expect(inboundDueAt(asn.eta)?.toISOString()).toBeTruthy();
    const due = /** @type {Date} */ (inboundDueAt(asn.eta));
    const before = outstandingInbounds(
      inboundRows(asnStore.all(), [], new Date(due.getTime() - 60_000).toISOString())
    ).filter((r) => r.asn.asnNumber === asn.asnNumber);
    expect(before).toHaveLength(0);
    const after = outstandingInbounds(
      inboundRows(asnStore.all(), [], new Date(due.getTime() + 60_000).toISOString())
    ).filter((r) => r.asn.asnNumber === asn.asnNumber);
    expect(after).toHaveLength(1);
  });

  it('the Expeditor’s Home task counts the overdue inbounds and opens the list', async () => {
    renderWithProviders(<BuyerHome />, { identity: EXP, route: '/buyer/home' });
    const task = await screen.findByTestId('home-task-inbound-acknowledgment');
    expect(task).toHaveTextContent('Inbounds awaiting acknowledgment');
    // The count is the derived overdue set, so it is at least the two seeded
    // unacknowledged inbounds (their ETAs pre-date the declared present).
    expect(Number(within(task).getByText(/^\d+$/).textContent)).toBeGreaterThanOrEqual(2);
  });

  it('a seat without the atom is not handed the Expeditor’s task', async () => {
    renderWithProviders(<BuyerHome />, { identity: BUYER, route: '/buyer/home' });
    await screen.findByTestId('home-task-inbound-asn');
    expect(screen.queryByTestId('home-task-inbound-acknowledgment')).not.toBeInTheDocument();
  });
});
