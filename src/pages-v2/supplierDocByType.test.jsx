// ────────────────────────────────────────────────────────────────────────────
// UCX-P5 (BL-366) — THE SURFACE HALF: ANSWER A REQUEST BY ITS TYPE, RENEW FROM
// THE RECORD, ASK FOR A RENEWAL FROM THE EXPIRING ROW.
//
// The spine half is `services/data/mock/supplierDocumentByType.test.js`. This
// file asserts what only a rendered surface can: WHICH form a row opens, what
// the form is prefilled from, what the reviewer is told to check, and that the
// two sides cross through the one store.
//
// ⚠️ **THE CONTROLS AND THE DERIVED MEMBERS RUN FIRST.** A fixture change that
// moved the COA row or the expiring certificate out of the state these tests
// need must go red as a precondition, not pass over nothing.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { NO_PERSON } from '@context/noPerson';
import { supplierDocumentStore } from '@services/data/mock/stores/supplierDocumentStore';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';
import { documentDisplayState } from '@services/data/documentDisplayState';
import { computeStatus } from '@services/data/complianceProjection';
import { COMPLIANCE_REGISTRY } from '@services/data/mock/fixtures/complianceRegistry';
import { CERT_TYPE_TO_CATEGORY } from '@lib/complianceView';
import { formatDate } from '@lib/format';
import i18n from '@lib/i18n';
import SupplierDocuments from './SupplierDocuments';
import BuyerCompliance from './BuyerCompliance';

/** The supplier's back office — the lane that holds both supply verbs. */
/** @type {CurrentIdentity} */
const BACK_OFFICE = {
  personaType: 'supplier',
  supplierId: 'sup-007',
  supplierName: 'PT Sample Packaging Indonesia',
  businessRoles: ['back_office'],
  actor: NO_PERSON
};

/** A supplier lane without the supply verbs — the handoff case. */
/** @type {CurrentIdentity} */
const COMMERCIAL = { ...BACK_OFFICE, businessRoles: ['commercial'] };

/** The buyer's compliance seat — holds request, verify and reject. */
/** @type {CurrentIdentity} */
const COMPLIANCE = {
  personaType: 'buyer',
  supplierId: null,
  supplierName: null,
  businessRoles: ['compliance'],
  actor: NO_PERSON
};

/** A buyer lane without `supplierdoc:request` — the renewal ask is withheld. */
/** @type {CurrentIdentity} */
const FINANCE = { ...COMPLIANCE, businessRoles: ['finance'] };

const COA_NUMBER = 'SAMPLE-COA-0001';
const COA_ISSUER = 'Sample Lab Services';

/** The row element whose text matches, ignoring the same name in a banner.
 * @param {RegExp} pattern
 * @returns {HTMLTableRowElement}
 */
function rowFor(pattern) {
  return /** @type {HTMLTableRowElement} */ (
    screen
      .getAllByText(pattern)
      .map((el) => el.closest('tr'))
      .find((tr) => tr !== null)
  );
}

/** The seeded COA request's row, reached by the fixture's own name. */
function coaRow() {
  return rowFor(/COA — Batch PKG-2025-441/);
}

/** The seeded expiring halal certificate's row. */
function halalRow() {
  return rowFor(/Halal Certificate — MUI No\. 01011234561020/);
}

beforeEach(async () => {
  supplierDocumentStore.reset();
  await i18n.changeLanguage('en');
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('UCX-P5 · CONTROLS — the walk is not vacuous', () => {
  it('CONTROL — the COA request is the seeded one, and its batch comes from the request', () => {
    const doc = supplierDocumentStore.get('doc-006');
    expect(doc?.requestKind).toBe('COA');
    expect(doc?.requestBatch).toBe('PKG-2025-441');
    expect(doc?.status).toBe('Awaiting Upload');
  });

  it('CONTROL — doc-001 renders in the expiring state, so “Renew” is offered', () => {
    const doc = supplierDocumentStore.get('doc-001');
    expect(doc, 'doc-001 is this walk’s subject').toBeTruthy();
    expect(
      documentDisplayState(/** @type {NonNullable<typeof doc>} */ (doc), DECLARED_PRESENT)
    ).toBe('expiring');
  });

  it('CONTROL — creg-0003 is the expiring registry row the ask starts from', () => {
    const entry = COMPLIANCE_REGISTRY.find((e) => e.id === 'creg-0003');
    expect(entry, 'creg-0003 is this walk’s subject').toBeTruthy();
    expect(computeStatus(/** @type {NonNullable<typeof entry>} */ (entry), DECLARED_PRESENT)).toBe(
      'Expiring'
    );
  });
});

describe('UCX-P5 · a COA request opens its own form', () => {
  it('⚠️ BATCH, NUMBER, ISSUER, DATE — AND NO CERTIFICATE SCHEME LIST', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    const row = await waitFor(() => coaRow());
    fireEvent.click(within(row).getByRole('button', { name: /^answer$/i }));

    // The batch comes from the REQUEST, not from parsing the ask's prose.
    const batch = /** @type {HTMLInputElement} */ (screen.getByTestId('coa-batch'));
    expect(batch.value).toBe('PKG-2025-441');
    expect(screen.getByTestId('coa-number')).toBeInTheDocument();
    expect(screen.getByTestId('coa-issuer')).toBeInTheDocument();
    expect(screen.getByTestId('coa-issuedOn')).toBeInTheDocument();
    // ⚠️ THE FINDING (UCX-F14): no scheme list on a COA form.
    expect(screen.queryByTestId('declare-certType')).toBeNull();
    expect(screen.getByTestId('coa-kind')).toHaveTextContent('Certificate of analysis (COA)');
    // And no file control anywhere on the form (BL-27 waits).
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByTestId('coa-nofile-notice')).toHaveTextContent(
      /does not receive, store or forward the document itself/i
    );
  });

  it('records the answer and says what happens next', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    const row = await waitFor(() => coaRow());
    fireEvent.click(within(row).getByRole('button', { name: /^answer$/i }));

    fireEvent.change(screen.getByTestId('coa-number'), { target: { value: COA_NUMBER } });
    fireEvent.change(screen.getByTestId('coa-issuer'), { target: { value: COA_ISSUER } });
    fireEvent.change(screen.getByTestId('coa-issuedOn'), { target: { value: '2026-08-12' } });
    fireEvent.click(screen.getByRole('button', { name: /send answer/i }));

    expect(await screen.findByTestId('declaration-recorded')).toHaveTextContent(
      /compliance team will review it/i
    );
    const doc = supplierDocumentStore.get('doc-006');
    expect(doc?.status).toBe('Under Review');
    expect(doc?.coaDeclaration?.coaNumber).toBe(COA_NUMBER);
    expect(doc?.coaDeclaration?.batch).toBe('PKG-2025-441');
    expect(doc?.declaration).toBeUndefined();
  });

  it('a lane without the supply verb sees whose act it is, not an absent button', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: COMMERCIAL });
    const row = await waitFor(() => coaRow());
    fireEvent.click(within(row).getByRole('button', { name: /^answer$/i }));
    expect(screen.getByTestId('handoff-supplierdoc-supply')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send answer/i })).toBeNull();
  });
});

describe('UCX-P5 · “Renew” opens the declaration filled from the expiring record', () => {
  it('prefills the record’s scheme, issuer and scope, and leaves the NEW number and date empty', async () => {
    const doc = /** @type {NonNullable<ReturnType<typeof supplierDocumentStore.get>>} */ (
      supplierDocumentStore.get('doc-001')
    );
    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    const row = await waitFor(() => halalRow());
    fireEvent.click(within(row).getByRole('button', { name: /^renew$/i }));

    expect(await screen.findByText('Renew your Halal Certificate')).toBeInTheDocument();
    const scheme = /** @type {HTMLSelectElement} */ (screen.getByTestId('declare-certType'));
    expect(scheme.value).toBe('HALAL_BPJPH');
    const issuer = /** @type {HTMLInputElement} */ (screen.getByTestId('declare-issuer'));
    expect(issuer.value).toBe(doc.issuedBy);
    const scope = /** @type {HTMLTextAreaElement} */ (screen.getByTestId('declare-scopeText'));
    expect(scope.value).toBe(doc.linkedTo);
    // The new certificate's own facts are the supplier's to state.
    expect(/** @type {HTMLInputElement} */ (screen.getByTestId('declare-certNumber')).value).toBe(
      ''
    );
    expect(/** @type {HTMLInputElement} */ (screen.getByTestId('declare-issuedOn')).value).toBe('');
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('lands the SAME record Under Review, and says so (UCX-SG10)', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    const row = await waitFor(() => halalRow());
    fireEvent.click(within(row).getByRole('button', { name: /^renew$/i }));

    const certNumber = 'SAMPLE-BPJPH-RENEW-0001';
    fireEvent.change(screen.getByTestId('declare-certNumber'), {
      target: { value: certNumber }
    });
    fireEvent.change(screen.getByTestId('declare-issuedOn'), {
      target: { value: '2026-08-01' }
    });
    fireEvent.click(screen.getByRole('button', { name: /record declaration/i }));

    expect(await screen.findByTestId('declaration-recorded')).toBeInTheDocument();
    expect(screen.getByTestId('renewal-recorded')).toHaveTextContent(
      /Renewal under review.*until PTI confirms/i
    );
    const doc = supplierDocumentStore.get('doc-001');
    expect(doc?.status).toBe('Under Review');
    expect(doc?.declaration?.certNumber).toBe(certNumber);
    // The renewal sits on the expiring record itself — no second row carries it.
    expect(
      supplierDocumentStore
        .all()
        .filter((d) => d.declaration?.certNumber === certNumber)
        .map((d) => d.id)
    ).toEqual(['doc-001']);
  });
});

describe('UCX-P5 · PTI asks for a renewal from the expiring row (UCX-F31)', () => {
  it('starts from the row with the supplier, the kind and the reason prefilled', async () => {
    const entry = /** @type {NonNullable<typeof COMPLIANCE_REGISTRY[number]>} */ (
      COMPLIANCE_REGISTRY.find((e) => e.id === 'creg-0003')
    );
    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE
    });
    const ask = await screen.findByTestId('ask-renewal-creg-0003');
    fireEvent.click(ask);

    expect(await screen.findByTestId('renewal-ask')).toBeInTheDocument();
    expect(screen.getByTestId('renewal-supplier')).toHaveTextContent(entry.supplierName);
    expect(screen.getByTestId('renewal-supplier')).toHaveTextContent(entry.supplierId);
    expect(screen.getByTestId('renewal-kind')).toHaveTextContent('Halal (BPJPH)');
    const note = /** @type {HTMLTextAreaElement} */ (screen.getByTestId('renewal-note'));
    const expected = i18n.t('compliance.renewal.note', {
      certificate: i18n.t('compliance.certType.HALAL_BPJPH'),
      date: formatDate(entry.expiryDate)
    });
    expect(note.value).toBe(expected);
  });

  it('“Open the request” crosses to the supplier’s queue, as a certificate ask', async () => {
    // The CONTROL: no seeded row carries this renewal's composed reason.
    expect(
      supplierDocumentStore
        .all()
        .some((d) => (d.notes ?? '').startsWith('Renewal of the Halal (BPJPH) certificate'))
    ).toBe(false);

    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE
    });
    fireEvent.click(await screen.findByTestId('ask-renewal-creg-0003'));
    fireEvent.click(await screen.findByRole('button', { name: /open the request/i }));

    await waitFor(() => {
      const created = supplierDocumentStore
        .all()
        .find(
          (d) =>
            d.supplierId === 'sup-002' &&
            (d.notes ?? '').startsWith('Renewal of the Halal (BPJPH) certificate')
        );
      expect(created, 'the request crossed to the supplier’s queue').toBeTruthy();
      expect(created?.status).toBe('Awaiting Upload');
      expect(created?.category).toBe(CERT_TYPE_TO_CATEGORY.HALAL_BPJPH);
      expect(created?.requestKind).toBe('CERTIFICATE');
    });
  });

  it('is withheld from a seat without `supplierdoc:request`', async () => {
    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: FINANCE
    });
    // The registry renders for this seat; the ask's control does not.
    expect(await screen.findByTestId('sap-sync-note')).toBeInTheDocument();
    expect(screen.queryByTestId('ask-renewal-creg-0003')).toBeNull();
    expect(screen.queryByTestId('renewal-ask')).toBeNull();
  });
});

describe('UCX-P5 · the confirm panel lists what to check (UCX-F18)', () => {
  it('a COA answer reaches the reviewer with the check line and the COA’s own fields', async () => {
    const supplier = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    const row = await waitFor(() => coaRow());
    fireEvent.click(within(row).getByRole('button', { name: /^answer$/i }));
    fireEvent.change(screen.getByTestId('coa-number'), { target: { value: COA_NUMBER } });
    fireEvent.change(screen.getByTestId('coa-issuer'), { target: { value: COA_ISSUER } });
    fireEvent.change(screen.getByTestId('coa-issuedOn'), { target: { value: '2026-08-12' } });
    fireEvent.click(screen.getByRole('button', { name: /send answer/i }));
    await screen.findByTestId('declaration-recorded');
    supplier.unmount();

    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE
    });
    const item = await screen.findByTestId('doc-review-doc-006');
    expect(within(item).getByTestId('review-check')).toHaveTextContent(
      /Nothing was uploaded\. Check these details against the document itself/
    );
    expect(within(item).getByText('Certificate of analysis (COA)')).toBeInTheDocument();
    expect(within(item).getByText('PKG-2025-441')).toBeInTheDocument();
    // The number appears in the id line AND in the checked details — both are
    // the reviewer's evidence, so the claim is membership, not a count.
    expect(within(item).getAllByText(COA_NUMBER).length).toBeGreaterThan(0);
    expect(within(item).getByText(COA_ISSUER)).toBeInTheDocument();
    // The supplier is named, not only its tenancy id.
    expect(within(item).getByText(/PT Sample Packaging Indonesia/)).toBeInTheDocument();
    // The review verbs are unchanged: both are offered.
    expect(within(item).getByRole('button', { name: /^confirm$/i })).toBeInTheDocument();
    expect(within(item).getByRole('button', { name: /^refuse$/i })).toBeInTheDocument();
  });
});

describe('UCX-P5 · the new labels in Indonesian', () => {
  it('the COA form and the renewal ask render ID, with no English leaking through', async () => {
    await i18n.changeLanguage('id');
    const supplier = renderWithProviders(<SupplierDocuments />, { identity: BACK_OFFICE });
    const row = await waitFor(() => coaRow());
    fireEvent.click(within(row).getByRole('button', { name: /^jawab$/i }));
    expect(screen.getByText('Jenis dokumen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kirim jawaban/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send answer/i })).toBeNull();
    supplier.unmount();

    renderWithProviders(<BuyerCompliance />, {
      route: '/buyer/compliance',
      identity: COMPLIANCE
    });
    fireEvent.click(await screen.findByTestId('ask-renewal-creg-0003'));
    expect(await screen.findByTestId('renewal-ask')).toBeInTheDocument();
    // The row's button and the panel's title carry the same label.
    expect(screen.getAllByText('Minta pembaruan').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /buka permintaan/i })).toBeInTheDocument();
  });
});
