// ────────────────────────────────────────────────────────────────────────────
// UCX-P5 (BL-366) — ANSWER A DOCUMENT REQUEST BY ITS TYPE; RENEW FROM THE RECORD
//
// The SPINE half. The surface half is `pages-v2/supplierDocByType.test.jsx`.
// What a rendered walk cannot assert lives here: that the request's KIND
// decides the record shape, that the kind guards refuse a mismatched verb BY
// NAME, and that the renewal moves the expiring RECORD ITSELF to `Under Review`
// (UCX-SG10) rather than minting a second row beside it.
//
// ⚠️ **THE CONTROLS RUN FIRST.** Every assertion below acts on a seeded row;
// if the seed were empty or the target unregistered, most of them would pass
// over nothing (`EMPTY-INPUT-REPORTS-CLEAN-01`).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCommandService, WIRED_COMMAND_TARGETS } from './MockCommandService';
import { supplierDocumentStore } from './stores/supplierDocumentStore';
import { NO_PERSON } from '@context/noPerson';
/** @import { QueryScope } from '../types' */

const svc = new MockCommandService();

/** The supplier's back office — the lane that holds both supply verbs. */
/** @type {QueryScope} */
const backOffice = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: ['back_office'],
  actor: NO_PERSON
};

/** A supplier lane that holds NEITHER supply verb. */
/** @type {QueryScope} */
const commercial = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  businessRoles: ['commercial'],
  actor: NO_PERSON
};

/** The buyer's compliance lane — verify and reject. */
/** @type {QueryScope} */
const complianceSeat = {
  personaType: 'buyer',
  supplierId: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON
};

const COA_ANSWER = {
  batch: 'PKG-2025-441',
  coaNumber: 'SAMPLE-COA-0001',
  issuer: 'Sample Lab Services',
  issuedOn: '2026-08-12',
  scopeText: 'PET resin, food contact'
};

const RENEWAL = {
  certType: 'HALAL_BPJPH',
  certNumber: 'SAMPLE-BPJPH-RENEW-0001',
  issuer: 'BPJPH',
  issuedOn: '2026-08-01',
  expiresOn: '2030-08-01',
  scopeText: 'Same scope as the expiring certificate'
};

beforeEach(() => {
  supplierDocumentStore.reset();
});

describe('UCX-P5 · supplierDocument — population controls', () => {
  it('CONTROL — the target is wired, and a known-absent one is still absent', () => {
    expect(WIRED_COMMAND_TARGETS).toContain('supplierDocument');
    expect(WIRED_COMMAND_TARGETS).not.toContain('contract');
  });

  it('CONTROL — the seed holds the COA request and the expiring certificate', () => {
    const coa = supplierDocumentStore.get('doc-006');
    expect(coa, 'doc-006 is the COA request').toBeTruthy();
    expect(coa?.requestKind).toBe('COA');
    expect(coa?.requestBatch).toBe('PKG-2025-441');
    expect(coa?.status).toBe('Awaiting Upload');

    const expiring = supplierDocumentStore.get('doc-001');
    expect(expiring, 'doc-001 is the expiring certificate').toBeTruthy();
    // The renewal verb declares `from: ['Valid']`, and doc-001's STORED cursor
    // must be that member — a clock word here would exclude it silently.
    expect(expiring?.status).toBe('Valid');
    expect(expiring?.expiryDate).toBeTruthy();
  });
});

describe('UCX-P5 · the COA answer, on the request’s own fields', () => {
  it('records the COA declaration and leaves the certificate shape absent', async () => {
    const result = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_answer_coa',
      entity: 'supplierDocument',
      entityId: 'doc-006',
      payload: { ...COA_ANSWER }
    });
    expect(result.status).not.toBe('failed');
    expect(result.reason).toBeUndefined();

    const doc = supplierDocumentStore.get('doc-006');
    expect(doc?.status).toBe('Under Review');
    expect(doc?.coaDeclaration).toEqual(
      expect.objectContaining({
        batch: COA_ANSWER.batch,
        coaNumber: COA_ANSWER.coaNumber,
        issuer: COA_ANSWER.issuer,
        issuedOn: COA_ANSWER.issuedOn,
        scopeText: COA_ANSWER.scopeText
      })
    );
    // ⚠️ THE TWO RECORD SHAPES DO NOT COEXIST: a COA answer records no
    // certificate scheme, so the certificate declaration is absent.
    expect(doc?.declaration).toBeUndefined();
    // The display fields follow the declaration (no disagreement on the row).
    expect(doc?.name).toBe(COA_ANSWER.coaNumber);
    expect(doc?.issuedBy).toBe(COA_ANSWER.issuer);
    expect(doc?.issuedDate).toBe(COA_ANSWER.issuedOn);
  });

  it('stores the batch the supplier STATES, not a re-read of the ask’s prose', async () => {
    // The certificate in hand names another batch than the ask (kit K8's probe).
    const result = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_answer_coa',
      entity: 'supplierDocument',
      entityId: 'doc-006',
      payload: { ...COA_ANSWER, batch: 'PKG-2025-414' }
    });
    expect(result.status).not.toBe('failed');
    expect(supplierDocumentStore.get('doc-006')?.coaDeclaration?.batch).toBe('PKG-2025-414');
    // The ask's own batch is untouched: the request still says what PTI asked.
    expect(supplierDocumentStore.get('doc-006')?.requestBatch).toBe('PKG-2025-441');
  });

  it('requires its own COA fields — a missing number is refused by name', async () => {
    const result = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_answer_coa',
      entity: 'supplierDocument',
      entityId: 'doc-006',
      payload: { ...COA_ANSWER, coaNumber: '' }
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/MISSING_FIELDS/);
    expect(supplierDocumentStore.get('doc-006')?.status).toBe('Awaiting Upload');
  });

  it('refuses the COA verb on a row that was not asked for as a COA', async () => {
    // A certificate request, minted through the real verb (no requestKind).
    const created = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_request',
      entity: 'supplierDocument',
      payload: { supplierId: 'sup-007', category: 'Quality', note: 'A certificate, please.' }
    });
    expect(created.status).not.toBe('failed');
    const id = /** @type {string} */ (created.entityId);
    expect(supplierDocumentStore.get(id)?.requestKind).toBeUndefined();

    const result = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_answer_coa',
      entity: 'supplierDocument',
      entityId: id,
      payload: { ...COA_ANSWER }
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/POLICY_REJECTED:supplierdoc_coa_request/);
    expect(supplierDocumentStore.get(id)?.status).toBe('Awaiting Upload');
  });

  it('refuses the CERTIFICATE verb on the COA request (the mirror guard)', async () => {
    const result = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_submit',
      entity: 'supplierDocument',
      entityId: 'doc-006',
      payload: { ...RENEWAL }
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/POLICY_REJECTED:supplierdoc_certificate_request/);
    expect(supplierDocumentStore.get('doc-006')?.status).toBe('Awaiting Upload');
  });

  it('is withheld from a lane without the supply verb', async () => {
    const result = await svc.dispatch(commercial, {
      transitionId: 't_supplierdoc_answer_coa',
      entity: 'supplierDocument',
      entityId: 'doc-006',
      payload: { ...COA_ANSWER }
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

describe('UCX-P5 · the renewal, from the expiring record', () => {
  it('lands the SAME record Under Review with the renewed certificate (UCX-SG10)', async () => {
    const before = supplierDocumentStore.get('doc-001');
    expect(before?.status).toBe('Valid');

    const result = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_renew',
      entity: 'supplierDocument',
      entityId: 'doc-001',
      payload: { ...RENEWAL }
    });
    expect(result.status).not.toBe('failed');

    const doc = supplierDocumentStore.get('doc-001');
    expect(doc?.status).toBe('Under Review');
    expect(doc?.declaration).toEqual(
      expect.objectContaining({
        certType: RENEWAL.certType,
        certNumber: RENEWAL.certNumber,
        expiresOn: RENEWAL.expiresOn
      })
    );
    // The renewal did not mint a second row: the renewed number is reached
    // through ONE named member, and it is the expiring record itself.
    const holding = supplierDocumentStore
      .all()
      .filter((d) => d.declaration?.certNumber === RENEWAL.certNumber)
      .map((d) => d.id);
    expect(holding).toEqual(['doc-001']);
  });

  it('is illegal on a document that is not Valid', async () => {
    const result = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_renew',
      entity: 'supplierDocument',
      entityId: 'doc-012', // Rejected
      payload: { ...RENEWAL }
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/ILLEGAL_TRANSITION/);
  });

  it('refuses a renewal of a COA record once it is Valid (the kind guard)', async () => {
    const answered = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_answer_coa',
      entity: 'supplierDocument',
      entityId: 'doc-006',
      payload: { ...COA_ANSWER }
    });
    expect(answered.status).not.toBe('failed');
    const verified = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_verify',
      entity: 'supplierDocument',
      entityId: 'doc-006',
      payload: {}
    });
    expect(verified.status).not.toBe('failed');

    const result = await svc.dispatch(backOffice, {
      transitionId: 't_supplierdoc_renew',
      entity: 'supplierDocument',
      entityId: 'doc-006',
      payload: { ...RENEWAL }
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/POLICY_REJECTED:supplierdoc_certificate_request/);
  });

  it('is withheld from a lane without `supplierdoc:upload`', async () => {
    const result = await svc.dispatch(commercial, {
      transitionId: 't_supplierdoc_renew',
      entity: 'supplierDocument',
      entityId: 'doc-001',
      payload: { ...RENEWAL }
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toMatch(/ROLE_NOT_PERMITTED/);
  });
});

describe('UCX-P5 · a request kind with its own fields (UCX-D23)', () => {
  it('a COA request carries its kind and batch; a certificate request carries neither', async () => {
    const coa = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_request',
      entity: 'supplierDocument',
      payload: {
        supplierId: 'sup-005',
        category: 'Quality',
        note: 'Please send the COA.',
        requestKind: 'COA',
        batch: 'PKG-2026-002'
      }
    });
    expect(coa.status).not.toBe('failed');
    const coaRow = supplierDocumentStore.get(/** @type {string} */ (coa.entityId));
    expect(coaRow?.requestKind).toBe('COA');
    expect(coaRow?.requestBatch).toBe('PKG-2026-002');

    const cert = await svc.dispatch(complianceSeat, {
      transitionId: 't_supplierdoc_request',
      entity: 'supplierDocument',
      payload: { supplierId: 'sup-005', category: 'Quality', note: 'Please send it.' }
    });
    expect(cert.status).not.toBe('failed');
    const certRow = supplierDocumentStore.get(/** @type {string} */ (cert.entityId));
    expect(certRow?.requestKind).toBeUndefined();
    expect(certRow?.requestBatch).toBeUndefined();
  });
});
