// ─────────────────────────────────────────────────────────────────────────────
// BL-93 — "Edit draft" on the RFI, RFP and RFQ boards, end to end through the
// real dispatcher and stores, and the B6 pre-fill banner.
//
// THE ROUND TRIP IS THE LOCK. Each event type is first given a RICH draft (every
// optional field present) through the verb, then opened in the wizard and saved
// WITHOUT a change: the stored record must come back identical, field for field,
// apart from the edit trail. A wizard that dropped any stored field on the way
// in or out fails here, which "the title changed" never could.
// ─────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders, BUYER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { customRoleStore } from '@services/transitions/customRoles';
import { NO_PERSON } from '@context/noPerson';
import { resetRfxStores, rfiEventStore, rfpEventStore } from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { rfqTemplateStore } from '@services/sourcing/rfqTemplates';
import { MockCommandService } from '@services/data/mock/MockCommandService';
import { sdcClock } from '@services/sdc';
import { rfiTemplate } from '@services/sourcing/rfxConfig';
import Toaster from '@components/ui-v2/Toaster';
import BuyerRfi from '../BuyerRfi';
import BuyerRfp from '../BuyerRfp';
import BuyerSourcingPage from '../BuyerSourcing';
/** @import { QueryScope } from '@services/data/types' */

/** @type {CurrentIdentity} */
const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };
const DRAFTER_ROLE = 'rfx-drafter';
/**
 * Create without publish (CE-06): a custom role on the zero-atom buyer anchor.
 * @type {CurrentIdentity}
 */
const DRAFTER_SEAT = {
  ...BUYER,
  businessRoles: /** @type {CurrentIdentity['businessRoles']} */ (
    /** @type {unknown} */ ([DRAFTER_ROLE])
  )
};
/** @type {CurrentIdentity} */
const RECEIVING = { ...BUYER, businessRoles: ['receiving'] };

const svc = new MockCommandService();
/** @type {QueryScope} */
const scope = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: SEEDED_SEAT_ROLES.buyer,
  actor: NO_PERSON
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  rfqTemplateStore.reset();
  customRoleStore.reset();
  sdcClock.reset();
  customRoleStore.append({
    id: DRAFTER_ROLE,
    parent: 'buyer',
    displayName: 'RFx drafter',
    description: 'Drafts sourcing events; somebody else sends them.',
    adds: ['rfq:create', 'rfi:create', 'rfp:create'],
    parentAtomsAtGrant: [],
    grantedBy: NO_PERSON,
    grantedAt: '2026-09-22T00:00:00.000Z'
  });
});

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
/**
 * Walk to the review step by pressing Next `n` times.
 * @param {number} n
 */
const walk = (n) => {
  for (let i = 0; i < n; i += 1) next();
};
/**
 * A stored record minus the edit trail.
 * @template {{ revisions?: unknown }} T
 * @param {T | undefined} r
 */
const withoutTrail = (r) => {
  if (!r) return undefined;
  const { revisions: _r, ...rest } = r;
  void _r;
  return rest;
};

const ATT = {
  id: 'att-x',
  name: 'brief.pdf',
  size: 1000,
  type: 'application/pdf',
  addedAt: '2026-09-22T00:00:00.000Z'
};

// ── RFQ ─────────────────────────────────────────────────────────────────────

/** @type {React.FC} */
const BuyerSourcing = () => (
  <>
    <BuyerSourcingPage />
    <Toaster />
  </>
);

const RFQ_ID = 'rfq-025';

/** Make the seeded Iron draft RICH: every optional authored field present. */
const enrichRfq = async () => {
  const seed = /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ_ID));
  const res = await svc.dispatch(scope, {
    transitionId: 't_rfq_revise_draft',
    entity: 'rfq',
    entityId: RFQ_ID,
    expectedState: 'Draft',
    payload: {
      title: seed.title,
      materialCategory: 'Packaging',
      materialIds: ['PK-CART-9910'],
      invitedSupplierIds: ['sup-008', 'sup-015'],
      responseDeadline: seed.responseDeadline,
      awardDeadline: seed.awardDeadline,
      totalQty: 5_000,
      uom: 'PCS',
      estimatedValue: 40_000_000,
      incoterms: 'DDP Jakarta',
      paymentTerms: 'Net 45',
      currency: 'USD',
      projectName: 'Iron',
      items: [
        {
          .../** @type {import('@services/sourcing/rfqModel').RfqItem} */ (
            /** @type {NonNullable<typeof seed.items>} */ (seed.items)[0]
          ),
          attachments: [ATT],
          tiers: [{ qty: 6_000, basis: 'total' }]
        }
      ],
      tiers: seed.tiers,
      questions: [
        {
          id: 'q1',
          sectionId: 'event',
          promptKey: 'Ship in October?',
          type: 'yesNo',
          required: true
        }
      ],
      allowAlternatives: true,
      confidential: true,
      samplesRequested: { qty: 10, neededBy: seed.responseDeadline },
      attachments: [ATT]
    }
  });
  expect(res.status).toBe('done');
};

/** @param {CurrentIdentity} identity */
const openRfqPanel = async (identity, rfqNumber = 'RFQ-2026-025') => {
  renderWithProviders(<BuyerSourcing />, { identity });
  fireEvent.click(await screen.findByText(rfqNumber));
};

describe('BL-93 · RFQ — Edit draft on the side panel', () => {
  it('ROUND TRIP — opened and saved unchanged, every stored field comes back identical', async () => {
    await enrichRfq();
    const before = withoutTrail(rfqStore.get(RFQ_ID));
    await openRfqPanel(BUYER_SEAT);
    fireEvent.click(await screen.findByTestId('rfq-edit-draft'));
    expect(await screen.findByTestId('rfq-edit-banner')).toHaveTextContent(
      'Editing draft RFQ-2026-025'
    );
    // No requisition entrance on an edit: a requisition is linked once, at create.
    expect(screen.queryByTestId('rfq-source-select')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rfq-source-empty')).not.toBeInTheDocument();
    walk(7); // + the Documents step (B3)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(
        /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ_ID)).revisions
      ).toHaveLength(2)
    );
    expect(withoutTrail(rfqStore.get(RFQ_ID))).toEqual(before);
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ_ID)).status).toBe('Draft');
    // CE-08 — the panel names the edit.
    expect(await screen.findByTestId('rfq-last-edited')).toHaveTextContent('Last edited');
  });

  it('change a break, save — it stays Draft; reopen and Save and send — it is Open', async () => {
    await openRfqPanel(BUYER_SEAT);
    fireEvent.click(await screen.findByTestId('rfq-edit-draft'));
    walk(2);
    fireEvent.click(screen.getByRole('button', { name: /Remove break 30/ }));
    fireEvent.change(screen.getByTestId('rfq-tiers-input'), { target: { value: '12000' } });
    fireEvent.click(screen.getByTestId('rfq-tiers-add'));
    walk(5); // + the Documents step (B3)
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(
        /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ_ID)).revisions
      ).toHaveLength(1)
    );
    const saved = /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ_ID));
    expect(saved.status).toBe('Draft');
    expect(/** @type {NonNullable<typeof saved.tiers>} */ (saved.tiers).map((t) => t.qty)).toEqual([
      5_000, 10_000, 12_000, 15_000, 20_000
    ]);
    expect(
      await screen.findByText('Draft saved. Suppliers still see nothing of it.')
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByTestId('rfq-edit-draft'));
    walk(7); // + the Documents step (B3)
    fireEvent.click(screen.getByTestId('rfq-edit-send'));
    await waitFor(() =>
      expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ_ID)).status).toBe('Open')
    );
    expect(
      /** @type {NonNullable<(NonNullable<ReturnType<typeof rfqStore.get>>)['tiers']>} */ (
        /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ_ID)).tiers
      ).map((t) => t.qty)
    ).toContain(12_000);
  });

  it('a seat with create but not publish can edit and save, and reads whose act sending is', async () => {
    await openRfqPanel(DRAFTER_SEAT);
    fireEvent.click(await screen.findByTestId('rfq-edit-draft'));
    walk(7); // + the Documents step (B3)
    expect(screen.queryByTestId('rfq-edit-send')).not.toBeInTheDocument();
    expect(screen.getByTestId('handoff-rfq-edit-send')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(
        /** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ_ID)).revisions
      ).toHaveLength(1)
    );
    expect(/** @type {import('@data/mockRfqs').RFQ} */ (rfqStore.get(RFQ_ID)).status).toBe('Draft');
  });

  it('a seat without create reads whose act editing is, in the button’s own slot', async () => {
    await openRfqPanel(RECEIVING);
    expect(await screen.findByTestId('handoff-rfq-edit')).toBeInTheDocument();
    expect(screen.queryByTestId('rfq-edit-draft')).not.toBeInTheDocument();
  });

  it('KNOWN-BAD twin — no Edit on an RFQ that is not a Draft', async () => {
    await openRfqPanel(BUYER_SEAT, 'RFQ-2026-022');
    // The panel is open on the Open RFQ (its next-act line renders there).
    await screen.findByTestId('next-act-buyer-rfq');
    expect(screen.queryByTestId('rfq-edit-draft')).not.toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfq-edit')).not.toBeInTheDocument();
  });

  it('a draft sent by someone else while the wizard was open is refused, not overwritten', async () => {
    await openRfqPanel(BUYER_SEAT);
    fireEvent.click(await screen.findByTestId('rfq-edit-draft'));
    walk(7); // + the Documents step (B3)
    await svc.dispatch(scope, { transitionId: 't_rfq_publish', entity: 'rfq', entityId: RFQ_ID });
    const sent = withoutTrail(rfqStore.get(RFQ_ID));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/no longer a draft/)).toBeInTheDocument();
    expect(withoutTrail(rfqStore.get(RFQ_ID))).toEqual(sent);
  });
});

describe('B6 · the RFQ wizard says where its content came from', () => {
  it('from an RFI — "Pre-filled from RFI-2026-002 · everything is editable"', async () => {
    renderWithProviders(<BuyerSourcing />, {
      identity: BUYER_SEAT,
      route: '/buyer/rfq?rfi=rfi-002'
    });
    expect(await screen.findByTestId('rfq-prefill-banner')).toHaveTextContent(
      'Pre-filled from RFI-2026-002 · everything is editable'
    );
  });

  it('from a copied RFQ — the RFQ it copied, by number', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByText('Templates'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Copy a past RFQ' }));
    fireEvent.click(screen.getByTestId('rfq-copy-use-rfq-021'));
    expect(await screen.findByTestId('rfq-prefill-banner')).toHaveTextContent(
      'Pre-filled from RFQ-2026-021'
    );
  });

  it('KNOWN-BAD twin — a blank New RFQ has no banner', async () => {
    renderWithProviders(<BuyerSourcing />, { identity: BUYER_SEAT });
    fireEvent.click(await screen.findByText('New RFQ'));
    await screen.findByRole('button', { name: 'Next' });
    expect(screen.queryByTestId('rfq-prefill-banner')).not.toBeInTheDocument();
  });
});

// ── RFI ─────────────────────────────────────────────────────────────────────

const RFI_ID = 'rfi-003';
const enrichRfi = async () => {
  const seed = /** @type {import('@services/sourcing/types').RfiEvent} */ (
    rfiEventStore.get(RFI_ID)
  );
  const res = await svc.dispatch(scope, {
    transitionId: 't_rfi_revise_draft',
    entity: 'rfiEvent',
    entityId: RFI_ID,
    expectedState: 'Draft',
    payload: {
      title: seed.title,
      description: seed.description,
      templateId: 'packaging',
      materialCategory: 'Packaging',
      purchasingGroup: '104',
      responseDeadline: seed.responseDeadline,
      invitedSupplierIds: ['sup-007', 'sup-013'],
      questions: [
        .../** @type {import('@services/sourcing/types').RfiTemplate} */ (rfiTemplate('packaging'))
          .questions,
        {
          id: 'custom-q1',
          sectionId: 'custom-tooling',
          promptKey: 'Hot runner?',
          type: 'yesNo',
          required: true
        }
      ],
      customSections: [{ id: 'custom-tooling', title: 'Tooling' }],
      attachments: [ATT],
      confidentiality: { terms: 'Do not share the drawings.' }
    }
  });
  expect(res.status).toBe('done');
};

describe('BL-93 · RFI — Edit draft on the event detail', () => {
  it('ROUND TRIP — every stored field comes back identical; Save and send then opens it', async () => {
    await enrichRfi();
    const before = withoutTrail(rfiEventStore.get(RFI_ID));
    renderWithProviders(
      <>
        <BuyerRfi />
        <Toaster />
      </>,
      { identity: BUYER_SEAT, route: `/buyer/rfi?open=${RFI_ID}` }
    );
    fireEvent.click(await screen.findByTestId(`rfi-edit-${RFI_ID}`));
    expect(await screen.findByTestId('rfi-edit-banner')).toHaveTextContent(
      'Editing draft RFI-2026-003'
    );
    walk(4); // + the Documents step (B3)
    fireEvent.click(screen.getByTestId('rfi-new-save-draft'));
    await waitFor(() =>
      expect(
        /** @type {import('@services/sourcing/types').RfiEvent} */ (rfiEventStore.get(RFI_ID))
          .revisions
      ).toHaveLength(2)
    );
    expect(withoutTrail(rfiEventStore.get(RFI_ID))).toEqual(before);
    expect(await screen.findByTestId(`rfi-last-edited-${RFI_ID}`)).toHaveTextContent('Last edited');

    fireEvent.click(screen.getByTestId(`rfi-edit-${RFI_ID}`));
    fireEvent.change(await screen.findByLabelText('Title'), {
      target: { value: 'Redwood 2.0 mold makers' }
    });
    walk(4); // + the Documents step (B3)
    fireEvent.click(screen.getByRole('button', { name: 'Save and send' }));
    await waitFor(() =>
      expect(
        /** @type {import('@services/sourcing/types').RfiEvent} */ (rfiEventStore.get(RFI_ID))
          .status
      ).toBe('Open')
    );
    expect(
      /** @type {import('@services/sourcing/types').RfiEvent} */ (rfiEventStore.get(RFI_ID)).title
    ).toBe('Redwood 2.0 mold makers');
    // Sent: the Edit affordance is gone, because the verb would refuse it.
    await waitFor(() => expect(screen.queryByTestId(`rfi-edit-${RFI_ID}`)).not.toBeInTheDocument());
  });

  it('a drafter seat can save the edit and cannot send it', async () => {
    renderWithProviders(<BuyerRfi />, {
      identity: DRAFTER_SEAT,
      route: `/buyer/rfi?open=${RFI_ID}`
    });
    fireEvent.click(await screen.findByTestId(`rfi-edit-${RFI_ID}`));
    walk(4); // + the Documents step (B3)
    expect(screen.getByRole('button', { name: 'Save and send' })).toBeDisabled();
    fireEvent.click(screen.getByTestId('rfi-new-save-draft'));
    await waitFor(() =>
      expect(
        /** @type {import('@services/sourcing/types').RfiEvent} */ (rfiEventStore.get(RFI_ID))
          .revisions
      ).toHaveLength(1)
    );
    expect(
      /** @type {import('@services/sourcing/types').RfiEvent} */ (rfiEventStore.get(RFI_ID)).status
    ).toBe('Draft');
  });

  it('a seat without rfi:create reads whose act it is; an Open RFI offers no Edit', async () => {
    const { unmount } = renderWithProviders(<BuyerRfi />, {
      identity: RECEIVING,
      route: `/buyer/rfi?open=${RFI_ID}`
    });
    expect(await screen.findByTestId(`handoff-rfi-edit-${RFI_ID}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`rfi-edit-${RFI_ID}`)).not.toBeInTheDocument();
    unmount();
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT, route: '/buyer/rfi?open=rfi-001' });
    await screen.findByTestId('rfi-detail-rfi-001');
    expect(screen.queryByTestId('rfi-edit-rfi-001')).not.toBeInTheDocument();
    expect(screen.queryByTestId('handoff-rfi-edit-rfi-001')).not.toBeInTheDocument();
  });
});

// ── RFP ─────────────────────────────────────────────────────────────────────

const RFP_ID = 'rfp-004';
const enrichRfp = async () => {
  const seed = /** @type {import('@services/sourcing/types').RfpEvent} */ (
    rfpEventStore.get(RFP_ID)
  );
  const res = await svc.dispatch(scope, {
    transitionId: 't_rfp_revise_draft',
    entity: 'rfpEvent',
    entityId: RFP_ID,
    expectedState: 'Draft',
    payload: {
      title: seed.title,
      scope: seed.scope,
      materialCategory: 'Packaging',
      purchasingGroup: '104',
      responseDeadline: seed.responseDeadline,
      currency: 'USD',
      invitedSupplierIds: ['sup-007', 'sup-013'],
      terms: [
        { termId: 'paymentTerms', requestedValue: '60' },
        {
          termId: 'custom-trial',
          requestedValue: 'Two trial runs',
          label: 'Trial runs included',
          group: 'contract',
          valueKind: 'text'
        }
      ],
      questions: [
        {
          id: 'rq1',
          sectionId: 'event',
          promptKey: 'Tool steel grade?',
          type: 'text',
          required: true
        }
      ],
      pricing: {
        options: [{ id: 'opt-1', title: 'Steel mold, 4 cavities' }],
        quantityPoints: [100_000, 200_000],
        quantityBasis: 'total',
        samplesRequested: true
      },
      attachments: [ATT],
      confidentiality: {},
      termsDocument: { text: 'Standard PTI tooling T&C.', attachment: ATT }
    }
  });
  expect(res.status, res.reason).toBe('done');
};

describe('BL-93 · RFP — Edit draft on the event detail', () => {
  it('ROUND TRIP — terms (custom too), pricing, T&C, files and invitees come back identical', async () => {
    await enrichRfp();
    const before = withoutTrail(rfpEventStore.get(RFP_ID));
    renderWithProviders(
      <>
        <BuyerRfp />
        <Toaster />
      </>,
      { identity: BUYER_SEAT, route: `/buyer/rfp?open=${RFP_ID}` }
    );
    fireEvent.click(await screen.findByTestId(`rfp-edit-${RFP_ID}`));
    expect(await screen.findByTestId('rfp-edit-banner')).toHaveTextContent(
      'Editing draft RFP-2026-004'
    );
    walk(6); // + the Documents step (B3)
    fireEvent.click(screen.getByTestId('rfp-new-save-draft'));
    await waitFor(() =>
      expect(
        /** @type {import('@services/sourcing/types').RfpEvent} */ (rfpEventStore.get(RFP_ID))
          .revisions
      ).toHaveLength(2)
    );
    expect(withoutTrail(rfpEventStore.get(RFP_ID))).toEqual(before);
  });

  it('a seat without rfp:create reads whose act it is; an Open RFP offers no Edit', async () => {
    const { unmount } = renderWithProviders(<BuyerRfp />, {
      identity: RECEIVING,
      route: `/buyer/rfp?open=${RFP_ID}`
    });
    expect(await screen.findByTestId(`handoff-rfp-edit-${RFP_ID}`)).toBeInTheDocument();
    unmount();
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT, route: '/buyer/rfp?open=rfp-001' });
    await screen.findByTestId('rfp-detail-rfp-001');
    expect(screen.queryByTestId('rfp-edit-rfp-001')).not.toBeInTheDocument();
  });
});

// ── Discard draft — the existing cancel verbs, which are legal from Draft ───

describe('BL-93 · Discard draft (t_rfi_cancel / t_rfp_cancel from Draft)', () => {
  it('RFI — the draft is Cancelled, nothing was sent, and Edit is gone', async () => {
    renderWithProviders(
      <>
        <BuyerRfi />
        <Toaster />
      </>,
      { identity: BUYER_SEAT, route: `/buyer/rfi?open=${RFI_ID}` }
    );
    fireEvent.click(await screen.findByTestId(`rfi-discard-${RFI_ID}`));
    await waitFor(() =>
      expect(
        /** @type {import('@services/sourcing/types').RfiEvent} */ (rfiEventStore.get(RFI_ID))
          .status
      ).toBe('Cancelled')
    );
    await waitFor(() => expect(screen.queryByTestId(`rfi-edit-${RFI_ID}`)).not.toBeInTheDocument());
    expect(screen.queryByTestId(`rfi-discard-${RFI_ID}`)).not.toBeInTheDocument();
  });

  it('RFP — the same, and a seat without rfp:publish cannot press it', async () => {
    const { unmount } = renderWithProviders(<BuyerRfp />, {
      identity: DRAFTER_SEAT,
      route: `/buyer/rfp?open=${RFP_ID}`
    });
    expect(await screen.findByTestId(`rfp-discard-${RFP_ID}`)).toBeDisabled();
    unmount();
    renderWithProviders(<BuyerRfp />, { identity: BUYER_SEAT, route: `/buyer/rfp?open=${RFP_ID}` });
    fireEvent.click(await screen.findByTestId(`rfp-discard-${RFP_ID}`));
    await waitFor(() =>
      expect(
        /** @type {import('@services/sourcing/types').RfpEvent} */ (rfpEventStore.get(RFP_ID))
          .status
      ).toBe('Cancelled')
    );
  });

  it('KNOWN-BAD twin — an Open event offers no Discard', async () => {
    renderWithProviders(<BuyerRfi />, { identity: BUYER_SEAT, route: '/buyer/rfi?open=rfi-001' });
    await screen.findByTestId('rfi-detail-rfi-001');
    expect(screen.queryByTestId('rfi-discard-rfi-001')).not.toBeInTheDocument();
  });
});
