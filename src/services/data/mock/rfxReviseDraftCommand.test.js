// ────────────────────────────────────────────────────────────────────────────
// BL-93 — EDITING A DRAFT RFI, RFP OR RFQ, through the REAL dispatcher.
//
// `t_rfi_revise_draft` / `t_rfp_revise_draft` / `t_rfq_revise_draft` replace a
// Draft's content with the wizard's whole payload. Every refusal is probed BOTH
// WAYS: the refused dispatch changes nothing, and the one-field-away sound
// dispatch passes. The screens that call these are covered in
// `pages-v2/rfx/RfxEditDraft.test.tsx`.
// ────────────────────────────────────────────────────────────────────────────

import { beforeEach, describe, expect, it } from 'vitest';
import { MockCommandService } from './MockCommandService';
import { rfqStore } from './stores/rfqStore';
import { resetRfxStores, rfiEventStore, rfpEventStore } from './stores/rfxStores';
import { quotationStore } from './stores/quotationStore';
/** @import { QueryScope } from '../types' */
import { PERSONA_SYSTEM_ROLES } from '../../transitions/businessRoles';
import { customRoleStore } from '../../transitions/customRoles';
import { NO_PERSON } from '@context/noPerson';
import { getKnownFlows } from '../../transitions';
import { rfiTemplate } from '../../sourcing/rfxConfig';
/** @import { RFQ } from '@data/mockRfqs' */

/** @type {QueryScope} */
const buyer = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: PERSONA_SYSTEM_ROLES.buyer,
  actor: NO_PERSON
};
const svc = new MockCommandService();

/** A seat that may DRAFT RFx events and not SEND them (CE-06). No seeded role
 *  splits the two atoms, so the seat is a custom role on the zero-atom anchor. */
const DRAFTER_ROLE = 'rfx-drafter';
/** @type {QueryScope} */
const drafter = {
  ...buyer,
  businessRoles: /** @type {QueryScope['businessRoles']} */ (
    /** @type {unknown} */ ([DRAFTER_ROLE])
  )
};
const grantDrafter = () =>
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

beforeEach(() => {
  rfqStore.reset();
  quotationStore.reset();
  resetRfxStores();
  customRoleStore.reset();
});

/**
 * Everything an RFQ stores except identity, lifecycle and the edit trail.
 * @param {RFQ | undefined} r
 */
const content = (r) => {
  if (!r) return undefined;
  const { revisions: _r, ...rest } = r;
  void _r;
  return rest;
};

// — the payloads ——————————————————————————————————————————————————————————

const RFQ_ID = 'rfq-025'; // the seeded Iron-shaped draft
/** @param {Record<string, unknown>} [over] */
const rfqPayload = (over = {}) => {
  const seed = /** @type {RFQ} */ (rfqStore.get(RFQ_ID));
  return {
    title: 'Iron refill carton — papercard, v2',
    materialCategory: 'Packaging',
    materialIds: ['PK-CART-9910'],
    invitedSupplierIds: ['sup-015'],
    responseDeadline: '2026-10-20',
    awardDeadline: '2026-10-30',
    totalQty: 8_000,
    uom: 'PCS',
    estimatedValue: 64_000_000,
    incoterms: 'FCA Tangerang',
    paymentTerms: 'Net 60',
    currency: 'USD',
    projectName: 'Iron',
    items: [
      {
        .../** @type {import('../../sourcing/rfqModel').RfqItem} */ (
          /** @type {NonNullable<typeof seed.items>} */ (seed.items)[0]
        ),
        description: 'Iron refill carton (two-colour)'
      }
    ],
    tiers: [
      { qty: 8_000, basis: 'total' },
      { qty: 16_000, basis: 'total' }
    ],
    questions: [
      { id: 'q1', sectionId: 'event', promptKey: 'Ship in October?', type: 'yesNo', required: true }
    ],
    allowAlternatives: true,
    confidential: true,
    samplesRequested: { qty: 10, neededBy: '2026-10-12' },
    attachments: [
      {
        id: 'att-1',
        name: 'dieline.pdf',
        size: 1200,
        type: 'application/pdf',
        addedAt: '2026-09-22T00:00:00.000Z'
      }
    ],
    // Provenance in a revise payload is ignored: the stored values are kept.
    copiedFromRfqId: 'rfq-021',
    ...over
  };
};
/**
 * @param {Record<string, unknown>} payload
 * @param {Record<string, unknown>} [extra]
 */
const reviseRfq = (payload, extra = {}, scope = buyer) =>
  svc.dispatch(scope, {
    transitionId: 't_rfq_revise_draft',
    entity: 'rfq',
    entityId: RFQ_ID,
    expectedState: 'Draft',
    payload,
    ...extra
  });

const RFI_ID = 'rfi-003'; // the seeded Redwood 2.0 draft
/** @param {Record<string, unknown>} [over] */
const rfiPayload = (over = {}) => ({
  title: 'Redwood 2.0 mold makers — capability check (v2)',
  description: 'Five components; hot-runner experience preferred.',
  templateId: 'packaging',
  materialCategory: 'Packaging',
  responseDeadline: '2026-10-15',
  invitedSupplierIds: ['sup-008'],
  questions: /** @type {import('../../sourcing/types').RfiTemplate} */ (
    rfiTemplate('packaging')
  ).questions.slice(0, 3),
  customSections: [{ id: 'custom-tooling', title: 'Tooling' }],
  attachments: [
    {
      id: 'att-2',
      name: 'redwood-cap.step',
      size: 5000,
      type: 'application/octet-stream',
      addedAt: '2026-09-22T00:00:00.000Z'
    }
  ],
  confidentiality: { terms: 'Do not share the drawings.' },
  ...over
});

const RFP_ID = 'rfp-004'; // the seeded Redwood 2.0 draft
/** @param {Record<string, unknown>} [over] */
const rfpPayload = (over = {}) => ({
  title: 'Redwood 2.0 — mold tooling terms (v2)',
  scope: 'Tooling ownership, trial runs and the mold payment schedule.',
  materialCategory: 'Packaging',
  responseDeadline: '2026-10-16',
  currency: 'USD',
  invitedSupplierIds: ['sup-013'],
  terms: [
    { termId: 'paymentTerms', requestedValue: '45' },
    { termId: 'contractDuration', requestedValue: '36 months' }
  ],
  pricing: {
    options: [{ id: 'opt-1', title: 'Steel mold, 4 cavities' }],
    quantityPoints: [100_000, 200_000],
    quantityBasis: 'total',
    samplesRequested: true
  },
  termsDocument: { text: 'Standard PTI tooling T&C.' },
  ...over
});

describe('POPULATION GUARD — the verbs and the seeded drafts exist', () => {
  it('each event type carries its revise verb, legal from Draft only, state-preserving', () => {
    const byId = new Map(
      getKnownFlows().flatMap((f) => f.transitions.map((t) => /** @type {const} */ ([t.id, t])))
    );
    for (const [id, create] of /** @type {const} */ ([
      ['t_rfi_revise_draft', 't_rfi_create'],
      ['t_rfp_revise_draft', 't_rfp_create'],
      ['t_rfq_revise_draft', 't_rfq_create']
    ])) {
      const t = /** @type {import('../../transitions/schema').TransitionDef} */ (byId.get(id));
      expect(t.from).toEqual(['Draft']);
      expect(t.statePreserving).toBe(true);
      // The SAME validation as create — the hook reused, the fields shared.
      expect(t.policyHooks).toEqual(
        /** @type {import('../../transitions/schema').TransitionDef} */ (byId.get(create))
          .policyHooks
      );
      expect(t.requiredFields).toEqual(
        /** @type {import('../../transitions/schema').TransitionDef} */ (byId.get(create))
          .requiredFields
      );
      expect(t.requiredRole).toBe(
        /** @type {import('../../transitions/schema').TransitionDef} */ (byId.get(create))
          .requiredRole
      );
    }
  });
  it('the three seeded drafts are Drafts', () => {
    expect(rfqStore.get(RFQ_ID)?.status).toBe('Draft');
    expect(rfiEventStore.get(RFI_ID)?.status).toBe('Draft');
    expect(rfpEventStore.get(RFP_ID)?.status).toBe('Draft');
  });
});

describe('BL-93 · an edit replaces every stored field and keeps identity and provenance', () => {
  it('RFQ — every authored field lands, the rest is the stored record', async () => {
    const before = /** @type {RFQ} */ (rfqStore.get(RFQ_ID));
    const res = await reviseRfq(rfqPayload());
    expect(res.status).toBe('done');
    const after = /** @type {RFQ} */ (rfqStore.get(RFQ_ID));
    expect(after).toMatchObject({
      id: before.id,
      rfqNumber: before.rfqNumber,
      status: 'Draft',
      createdAt: before.createdAt,
      title: 'Iron refill carton — papercard, v2',
      materialIds: ['PK-CART-9910'],
      invitedSupplierIds: ['sup-015'],
      responseDeadline: '2026-10-20',
      awardDeadline: '2026-10-30',
      totalQty: 8_000,
      estimatedValue: 64_000_000,
      incoterms: 'FCA Tangerang',
      paymentTerms: 'Net 60',
      currency: 'USD',
      tiers: [
        { qty: 8_000, basis: 'total' },
        { qty: 16_000, basis: 'total' }
      ],
      allowAlternatives: true,
      confidential: true,
      samplesRequested: { qty: 10, neededBy: '2026-10-12' }
    });
    expect(after.items?.[0]?.description).toBe('Iron refill carton (two-colour)');
    expect(after.items?.[0]?.specFields).toEqual(
      /** @type {import('../../sourcing/rfqModel').RfqItem} */ (
        /** @type {NonNullable<typeof before.items>} */ (before.items)[0]
      ).specFields
    );
    expect(after.questions?.map((q) => q.id)).toEqual(['q1']);
    expect(after.attachments?.map((a) => a.name)).toEqual(['dieline.pdf']);
    // Provenance is PINNED: the payload's `copiedFromRfqId` did not land.
    expect(after.copiedFromRfqId).toBeUndefined();
  });

  it('RFQ — a field the buyer cleared is gone, not carried from the old record', async () => {
    await reviseRfq(rfqPayload());
    const { estimatedValue: _e, samplesRequested: _s, attachments: _a, ...cleared } = rfqPayload();
    void _e;
    void _s;
    void _a;
    expect((await reviseRfq(cleared)).status).toBe('done');
    const after = /** @type {RFQ} */ (rfqStore.get(RFQ_ID));
    expect(after.estimatedValue).toBeUndefined();
    expect(after.samplesRequested).toBeUndefined();
    expect(after.attachments).toBeUndefined();
  });

  it('RFI — questions, sections, files, confidentiality, invitees and dates land', async () => {
    const before = /** @type {import('../../sourcing/types').RfiEvent} */ (
      rfiEventStore.get(RFI_ID)
    );
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfi_revise_draft',
      entity: 'rfiEvent',
      entityId: RFI_ID,
      expectedState: 'Draft',
      payload: rfiPayload()
    });
    expect(res.status).toBe('done');
    const after = /** @type {import('../../sourcing/types').RfiEvent} */ (
      rfiEventStore.get(RFI_ID)
    );
    expect(after).toMatchObject({
      id: before.id,
      eventNumber: before.eventNumber,
      status: 'Draft',
      createdAt: before.createdAt,
      title: 'Redwood 2.0 mold makers — capability check (v2)',
      description: 'Five components; hot-runner experience preferred.',
      responseDeadline: '2026-10-15',
      invitees: [{ supplierId: 'sup-008' }],
      customSections: [{ id: 'custom-tooling', title: 'Tooling' }],
      confidentiality: { terms: 'Do not share the drawings.' }
    });
    expect(after.questions).toHaveLength(3);
    expect(after.attachments?.map((a) => a.name)).toEqual(['redwood-cap.step']);
    // `purchasingGroup` was not in the payload, so the edit cleared it.
    expect(after.purchasingGroup).toBeUndefined();
  });

  it('RFP — terms, pricing options, T&C, currency and invitees land; the RFI source is pinned', async () => {
    rfpEventStore.update(RFP_ID, (e) => ({ ...e, sourceRfiId: 'rfi-002' }));
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfp_revise_draft',
      entity: 'rfpEvent',
      entityId: RFP_ID,
      expectedState: 'Draft',
      payload: rfpPayload({ sourceRfiId: 'rfi-001' })
    });
    expect(res.status).toBe('done');
    const after = /** @type {import('../../sourcing/types').RfpEvent} */ (
      rfpEventStore.get(RFP_ID)
    );
    expect(after).toMatchObject({
      status: 'Draft',
      title: 'Redwood 2.0 — mold tooling terms (v2)',
      currency: 'USD',
      responseDeadline: '2026-10-16',
      invitees: [{ supplierId: 'sup-013' }],
      terms: [
        { termId: 'paymentTerms', requestedValue: '45' },
        { termId: 'contractDuration', requestedValue: '36 months' }
      ],
      termsDocument: { text: 'Standard PTI tooling T&C.' },
      sourceRfiId: 'rfi-002'
    });
    expect(after.pricing?.options.map((o) => o.title)).toEqual(['Steel mold, 4 cavities']);
  });

  it('CE-08 — each edit appends WHO and WHEN, from the session, never the payload', async () => {
    await reviseRfq(
      rfqPayload({
        revisions: [
          {
            at: '2020-01-01',
            by: { kind: 'RESOLVED', person: { personId: 'x', displayName: 'Forged' } }
          }
        ]
      })
    );
    await reviseRfq(rfqPayload({ title: 'Second edit' }));
    const trail =
      /** @type {NonNullable<(NonNullable<ReturnType<typeof rfqStore.get>>)['revisions']>} */ (
        /** @type {RFQ} */ (rfqStore.get(RFQ_ID)).revisions
      );
    expect(trail).toHaveLength(2);
    expect(trail.every((r) => r.by.kind === 'UNATTRIBUTED')).toBe(true);
    expect(trail.some((r) => r.at.startsWith('2020'))).toBe(false);
  });
});

describe('BL-93 · refused by name', () => {
  it('on any state but Draft — ILLEGAL_TRANSITION, and the Open event is untouched', async () => {
    const open = /** @type {RFQ} */ (rfqStore.get('rfq-022')); // Iron, Open
    const res = await svc.dispatch(buyer, {
      transitionId: 't_rfq_revise_draft',
      entity: 'rfq',
      entityId: 'rfq-022',
      payload: rfqPayload()
    });
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('ILLEGAL_TRANSITION:Open->Draft');
    expect(content(rfqStore.get('rfq-022'))).toEqual(content(open));

    const rfi = await svc.dispatch(buyer, {
      transitionId: 't_rfi_revise_draft',
      entity: 'rfiEvent',
      entityId: 'rfi-001',
      payload: rfiPayload()
    });
    expect(rfi.reason).toBe('ILLEGAL_TRANSITION:Open->Draft');
    const rfp = await svc.dispatch(buyer, {
      transitionId: 't_rfp_revise_draft',
      entity: 'rfpEvent',
      entityId: 'rfp-001',
      payload: rfpPayload()
    });
    expect(rfp.reason).toBe('ILLEGAL_TRANSITION:Open->Draft');
  });

  it('a draft sent by someone else meanwhile — STALE_STATE, nothing overwritten; the fresh read passes', async () => {
    // Colleague publishes while this buyer is editing.
    expect(
      (
        await svc.dispatch(buyer, {
          transitionId: 't_rfq_publish',
          entity: 'rfq',
          entityId: RFQ_ID
        })
      ).status
    ).toBe('done');
    const sent = /** @type {RFQ} */ (rfqStore.get(RFQ_ID));
    const res = await reviseRfq(rfqPayload());
    expect(res.status).toBe('failed');
    expect(res.reason).toBe('STALE_STATE:Draft->Open');
    expect(content(rfqStore.get(RFQ_ID))).toEqual(content(sent));
  });

  it('a matching expectedState passes — the known-good half of the stale probe', async () => {
    expect((await reviseRfq(rfqPayload())).status).toBe('done');
  });

  it("the create policy's refusals fire on revise too — RFQ, RFI and RFP", async () => {
    const before = content(rfqStore.get(RFQ_ID));
    const tiers = await reviseRfq(
      rfqPayload({
        tiers: [
          { qty: 5_000, basis: 'total' },
          { qty: 3_000, basis: 'total' }
        ]
      })
    );
    expect(tiers.reason).toMatch(/^POLICY_REJECTED:rfq_create_valid:TIERS_NOT_INCREASING/);
    const currency = await reviseRfq(rfqPayload({ currency: 'JPY' }));
    expect(currency.reason).toMatch(/^POLICY_REJECTED:rfq_create_valid:CURRENCY_NOT_PERMITTED/);
    const noItems = await reviseRfq(rfqPayload({ items: [] }));
    expect(noItems.reason).toMatch(/^POLICY_REJECTED:rfq_create_valid:NO_ITEMS/);
    const { totalQty: _q, ...noQty } = rfqPayload();
    void _q;
    expect((await reviseRfq(noQty)).reason).toBe('MISSING_FIELDS:totalQty');
    expect(content(rfqStore.get(RFQ_ID))).toEqual(before);

    const rfi = await svc.dispatch(buyer, {
      transitionId: 't_rfi_revise_draft',
      entity: 'rfiEvent',
      entityId: RFI_ID,
      expectedState: 'Draft',
      payload: rfiPayload({ questions: [] })
    });
    expect(rfi.reason).toMatch(/^POLICY_REJECTED:rfi_create_valid:NO_QUESTIONS/);
    const rfiTpl = await svc.dispatch(buyer, {
      transitionId: 't_rfi_revise_draft',
      entity: 'rfiEvent',
      entityId: RFI_ID,
      expectedState: 'Draft',
      payload: rfiPayload({ templateId: 'no-such-template' })
    });
    expect(rfiTpl.reason).toMatch(/^POLICY_REJECTED:rfi_create_valid:UNKNOWN_TEMPLATE/);
    const rfp = await svc.dispatch(buyer, {
      transitionId: 't_rfp_revise_draft',
      entity: 'rfpEvent',
      entityId: RFP_ID,
      expectedState: 'Draft',
      payload: rfpPayload({ responseDeadline: 'soon' })
    });
    expect(rfp.reason).toMatch(/^POLICY_REJECTED:rfp_create_terms_known:BAD_DEADLINE/);
    expect(rfiEventStore.get(RFI_ID)?.title).toBe('Redwood 2.0 mold makers — capability check');
    expect(rfpEventStore.get(RFP_ID)?.title).toBe('Redwood 2.0 — mold tooling terms');
  });
});

describe('CE-06 · a seat with create but not publish can edit and cannot send', () => {
  it('RFQ, RFI and RFP — revise passes, publish is ROLE_NOT_PERMITTED', async () => {
    grantDrafter();
    expect((await reviseRfq(rfqPayload(), {}, drafter)).status).toBe('done');
    const send = await svc.dispatch(drafter, {
      transitionId: 't_rfq_publish',
      entity: 'rfq',
      entityId: RFQ_ID,
      expectedState: 'Draft'
    });
    expect(send.reason).toBe('ROLE_NOT_PERMITTED:rfq:publish');
    expect(rfqStore.get(RFQ_ID)?.status).toBe('Draft');

    expect(
      (
        await svc.dispatch(drafter, {
          transitionId: 't_rfi_revise_draft',
          entity: 'rfiEvent',
          entityId: RFI_ID,
          expectedState: 'Draft',
          payload: rfiPayload()
        })
      ).status
    ).toBe('done');
    expect(
      (
        await svc.dispatch(drafter, {
          transitionId: 't_rfi_publish',
          entity: 'rfiEvent',
          entityId: RFI_ID
        })
      ).reason
    ).toBe('ROLE_NOT_PERMITTED:rfi:publish');

    expect(
      (
        await svc.dispatch(drafter, {
          transitionId: 't_rfp_revise_draft',
          entity: 'rfpEvent',
          entityId: RFP_ID,
          expectedState: 'Draft',
          payload: rfpPayload()
        })
      ).status
    ).toBe('done');
    expect(
      (
        await svc.dispatch(drafter, {
          transitionId: 't_rfp_publish',
          entity: 'rfpEvent',
          entityId: RFP_ID
        })
      ).reason
    ).toBe('ROLE_NOT_PERMITTED:rfp:publish');
  });

  it('and a seat with neither is refused the edit itself', async () => {
    /** @type {QueryScope} */
    const nobody = {
      ...buyer,
      businessRoles: /** @type {QueryScope['businessRoles']} */ (/** @type {unknown} */ (['buyer']))
    };
    expect((await reviseRfq(rfqPayload(), {}, nobody)).reason).toBe(
      'ROLE_NOT_PERMITTED:rfq:create'
    );
  });
});
