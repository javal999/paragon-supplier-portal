// ────────────────────────────────────────────────────────────────────────────
// BL-147 (FU-14) — the qualification warnings kept in warn-only mode
// (MAT-D19), on screen: the event page's "Published with N vendors not
// qualified (placeholder rules)" note (RFQ, RFI, RFP), the award record card's
// vendors awarded below the level with the reason given, and G2's
// "Not qualified (placeholder rules)" marker on the RFI and RFP invitee tables.
// Placeholder lists are the seed, so every spec here runs in warn-only mode.
// ────────────────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom';
import { screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { awardStore, resetRfxStores, rfpEventStore } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { qualificationRuleStore } from '@services/transitions/qualificationRuleStore';
import { sourcingTypeStore } from '@services/transitions/sourcingTypeStore';
import { sdcClock } from '@services/sdc';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope } from '@services/data/types' */
import BuyerSourcingEvent from '../BuyerSourcingEvent';
import BuyerRfi from '../BuyerRfi';
import BuyerRfp from '../BuyerRfp';

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
/** @type {QueryScope} */
const procurement = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['procurement'],
  actor: NO_PERSON
};
const svc = new MockCommandService();

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  qualificationRuleStore.reset();
  sourcingTypeStore.reset();
  sdcClock.reset();
});

/** @param {string} rfqId */
const renderEvent = (rfqId) =>
  renderWithProviders(
    <Routes>
      <Route path="/buyer/rfq/:rfqId" element={<BuyerSourcingEvent />} />
    </Routes>,
    { identity: BUYER_SEAT, route: `/buyer/rfq/${rfqId}` }
  );

describe('BL-147 — RFQ event page and award record', () => {
  it('a published RFQ names the invitee let through below the level', async () => {
    const id = /** @type {import('../../data/mockRfqs').RFQ} */ (
      rfqStore.all().find((r) => r.status === 'Draft')
    ).id;
    rfqStore.update(id, (r) => ({ ...r, invitedSupplierIds: ['sup-005', 'sup-007'] }));
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: id
    });
    expect(res.status, res.reason).toBe('done');
    renderEvent(id);
    const note = await screen.findByTestId('event-published-warnings');
    expect(note).toHaveTextContent('Published with 1 vendor not qualified (placeholder rules)');
    expect(within(note).getByTestId('event-published-warnings-sup-005')).toHaveTextContent(
      /needs Preferred/
    );
    expect(within(note).queryByTestId('event-published-warnings-sup-007')).toBeNull();
  });

  it('KNOWN-GOOD twin: an RFQ published before G2 shows no note', async () => {
    renderEvent('rfq-001');
    await screen.findByTestId('event-sourcing-type');
    expect(screen.queryByTestId('event-published-warnings')).toBeNull();
  });

  it('the award record lists the vendor awarded below the level, with the reason given', async () => {
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfq_award',
      entity: 'rfq',
      entityId: 'rfq-003',
      payload: {
        awardedQuotationId: 'qt-003b',
        awardedSupplierId: 'sup-002',
        awardReason: 'Second source for continuity.'
      }
    });
    expect(res.status, res.reason).toBe('done');
    const rec = /** @type {import('../../services/sourcing/types').AwardRecord} */ (
      awardStore.all().find((a) => a.eventId === 'rfq-003')
    );
    renderEvent('rfq-003');
    const block = await screen.findByTestId(`award-qualification-${rec.id}`);
    expect(block).toHaveTextContent('Awarded to 1 vendor not qualified (placeholder rules)');
    expect(within(block).getByTestId(`award-qualification-${rec.id}-sup-002`)).toHaveTextContent(
      /needs Preferred/
    );
    expect(block).toHaveTextContent('Reason given: Second source for continuity.');
  });
});

describe('BL-147 — RFI and RFP detail', () => {
  it('RFI: the publish note and the "Not qualified (placeholder rules)" marker on the invitee row', async () => {
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfi_publish',
      entity: 'rfiEvent',
      entityId: 'rfi-003'
    });
    expect(res.status, res.reason).toBe('done');
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfi-open-rfi-003'));
    const detail = await screen.findByTestId('rfi-detail-rfi-003');
    expect(within(detail).getByTestId('rfi-published-warnings-rfi-003')).toHaveTextContent(
      'Published with 1 vendor not qualified (placeholder rules)'
    );
    const marker = within(detail).getByTestId('rfi-invitee-elig-rfi-003-sup-013');
    expect(marker).toHaveAttribute('data-state', 'warn');
    expect(marker).toHaveTextContent('Not qualified (placeholder rules)');
    // sup-007 is Preferred: no marker on its row.
    expect(within(detail).queryByTestId('rfi-invitee-elig-rfi-003-sup-007')).toBeNull();
  });

  it('RFP: the publish note and the marker on the invitee row', async () => {
    rfpEventStore.update('rfp-004', (e) => ({
      ...e,
      invitees: [{ supplierId: 'sup-005' }, { supplierId: 'sup-007' }]
    }));
    const res = await svc.dispatch(procurement, {
      transitionId: 't_rfp_publish',
      entity: 'rfpEvent',
      entityId: 'rfp-004'
    });
    expect(res.status, res.reason).toBe('done');
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByTestId('rfp-open-rfp-004'));
    const detail = await screen.findByTestId('rfp-detail-rfp-004');
    expect(within(detail).getByTestId('rfp-published-warnings-rfp-004')).toHaveTextContent(
      'Published with 1 vendor not qualified (placeholder rules)'
    );
    expect(within(detail).getByTestId('rfp-invitee-elig-sup-005')).toHaveAttribute(
      'data-state',
      'warn'
    );
    expect(within(detail).queryByTestId('rfp-invitee-elig-sup-007')).toBeNull();
  });
});
