import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders, SUPPLIER } from '@test/test-utils';
/** @import { CurrentIdentity } from '@context/CurrentIdentityContext' */
import { mockDataService } from '@services/data/mock/mockDataService';
import { withChaos } from '@services/data/mock/withChaos';
import SupplierDocuments from './SupplierDocuments';
import { PERSONA_SYSTEM_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';
import { DOCUMENTS } from '@services/data/mock/fixtures/supplierDocuments';
import { formatDate } from '@lib/format';
import { documentDisplayState } from '@services/data/documentDisplayState';
import { DECLARED_PRESENT } from '@services/data/fixturePresent';

const alwaysFails = withChaos(mockDataService, { minMs: 0, maxMs: 0, failureRate: 1 });
const alwaysPending = withChaos(mockDataService, { minMs: 1e7, maxMs: 1e7, failureRate: 0 });

// A supplier with no documents on file (sup-007/002/005 have fixtures).
/** @type {CurrentIdentity} */
const SUPPLIER_NO_DOCS = {
  personaType: 'supplier',
  supplierId: 'sup-999',
  supplierName: 'PT Empty Supplier',
  businessRoles: PERSONA_SYSTEM_ROLES.supplier,
  actor: NO_PERSON
};

describe('SupplierDocuments — four honest states', () => {
  it('data: renders the scoped document table for the seeded supplier', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    expect(await screen.findByRole('heading', { name: 'Profile & documents' })).toBeInTheDocument();
    // The KPI header count is present once real data resolves.
    expect(await screen.findByText('Total Documents')).toBeInTheDocument();
  });

  it('loading: shows LoadingState while the read is pending', () => {
    renderWithProviders(<SupplierDocuments />, {
      identity: SUPPLIER,
      service: alwaysPending
    });
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Total Documents')).not.toBeInTheDocument();
  });

  it('error: shows ErrorState when the read throws', async () => {
    renderWithProviders(<SupplierDocuments />, {
      identity: SUPPLIER,
      service: alwaysFails
    });
    expect(await screen.findByText('Unable to load this page')).toBeInTheDocument();
  });

  it('empty: shows EmptyState for a supplier with no documents', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER_NO_DOCS });
    expect(await screen.findByText('No documents yet')).toBeInTheDocument();
  });
});

// ── The refusal, rendered ──────────────────────────────────────────────────
// ⚠️ **THIS IS THE HALF THE ARC WAS ABOUT.** A refusal the refused party cannot
// read is the dead end; these assert the party CAN read it — the reason, the
// date, and the line saying nobody can be named — and that no other supplier can.
describe('SupplierDocuments — the refused document', () => {
  /** @type {CurrentIdentity} */
  const OTHER_SUPPLIER = {
    personaType: 'supplier',
    supplierId: 'sup-002',
    supplierName: 'PT Sample Chemicals Indonesia',
    businessRoles: PERSONA_SYSTEM_ROLES.supplier,
    actor: NO_PERSON
  };

  it('renders the reason, the date and the unattributed line to its owner', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const block = await screen.findByTestId('doc-refusal-doc-012');
    expect(block).toHaveTextContent('Refused');
    // ⚠️ DERIVED, NOT RE-PINNED. This used to read `'18 Aug 2026'`, which was
    // doc-012's `rejectedAt` at the instant the spec was written. Under
    // FIXTURE-PRESENT-01 that date moves with the `supplierDocument` anchor,
    // and a spec re-pinned to the NEW literal would have learned nothing and
    // broken again at the next bump. The CLAIM is "the block renders doc-012's
    // refusal date" — so assert that, against the fixture the page reads.
    const doc012 = DOCUMENTS.find((d) => d.id === 'doc-012');
    expect(doc012?.rejectedAt, 'doc-012 is this assertion’s subject').toBeTruthy();
    expect(block).toHaveTextContent(
      formatDate(
        /** @type {NonNullable<(NonNullable<typeof doc012>)['rejectedAt']>} */ (
          /** @type {import('@services/data/types').SupplierDocument} */ (doc012).rejectedAt
        )
      )
    );
    expect(block).toHaveTextContent(/Certificate scope does not cover PK-PETB-8810/);
    expect(block).toHaveTextContent(
      'Recorded without a named person — the portal has no user directory yet.'
    );
  });

  it('leads with the refusal banner — the page exists for this row', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    expect(await screen.findByTestId('doc-refused-banner')).toHaveTextContent(
      '1 document was refused:'
    );
  });

  // WARN **THIS PIN INVERTED AT S82, AND S80's OWN REASON IS WHY IT COULD.**
  // It read: *"`supplierdoc:upload` is unauthored and the atom is the
  // back-office lane's by ruling, so a resubmit control here would name a verb
  // that does not exist"* - `FORWARD-PROMISE-HAS-NO-HANDLER-01`, correctly
  // applied. The verb exists now, so the promise has a handler and withholding
  // the control would be the dead end this page was built to end.
  //
  // The old assertion is KEPT, inverted, rather than deleted: if a later batch
  // un-wires the verb, the control must go with it.
  it('offers the remedy the refused row now has a verb for', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const block = await screen.findByTestId('doc-refusal-doc-012');
    const row = /** @type {HTMLTableRowElement} */ (block.closest('tr'));
    const remedy = within(row).getByRole('button', { name: /declare again/i });
    expect(remedy).toBeInTheDocument();
  });

  it('the remedy opens the declaration panel, and says no file is sent', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: SUPPLIER });
    const block = await screen.findByTestId('doc-refusal-doc-012');
    const row = /** @type {HTMLTableRowElement} */ (block.closest('tr'));
    fireEvent.click(within(row).getByRole('button', { name: /declare again/i }));
    // The honest sentence is present BEFORE the act, not after it.
    expect(await screen.findByTestId('declaration-nofile-notice')).toHaveTextContent(
      /does not receive, store or forward/i
    );
    // And the panel carries no file control of any kind - the claim above would
    // be false the moment one appeared.
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('another supplier sees neither the refusal nor its banner', async () => {
    renderWithProviders(<SupplierDocuments />, { identity: OTHER_SUPPLIER });
    // Non-vacuity: sup-002 HAS documents, so an absent refusal is isolation
    // rather than an empty render.
    expect(await screen.findByText('Total Documents')).toBeInTheDocument();
    expect(screen.queryByTestId('doc-refusal-doc-012')).toBeNull();
    expect(screen.queryByTestId('doc-refused-banner')).toBeNull();
    expect(screen.queryByText(/PK-PETB-8810/)).toBeNull();
  });
});

// D9 (deep-links PR #74 review): SupplierDocuments reads `?expiry=` from the
// URL (the "certificates expired or expiring" task's deep link), but had no
// page-level spec rendering the route with the param. The rows are derived
// via the SAME function + clock the page itself calls (FIXTURE-PRESENT-01:
// expiry status moves with the declared-present anchor), never re-pinned, so
// a later anchor bump cannot make this pass vacuously or go stale.
//
// No fixture row is currently `expired` at the declared present (checked:
// zero across all of `DOCUMENTS`), so this exercises the sibling value the
// same task and the same `expiry` enum carry — `expiring` — rather than
// asserting a population that doesn't exist today.
describe('D9 — the `?expiry=expiring` deep link SupplierDocuments reads', () => {
  const sup007Docs = () => DOCUMENTS.filter((d) => d.supplierId === 'sup-007');
  const expiringDoc = () =>
    sup007Docs().find((d) => documentDisplayState(d, DECLARED_PRESENT) === 'expiring');
  const validDoc = () =>
    sup007Docs().find((d) => documentDisplayState(d, DECLARED_PRESENT) === 'valid');
  // The page renders TWO radiogroups (category, then expiry) — the expiry
  // one is the second, and is the only one with an `Expiring soon` option.
  const expiryGroup = () => within(screen.getAllByRole('radiogroup')[1]);

  it('`?expiry=expiring` selects that chip and keeps only expiring certificates', async () => {
    const expiringRaw = expiringDoc();
    const validRaw = validDoc();
    expect(
      expiringRaw,
      'sup-007 must have an expiring cert for this assertion to mean anything'
    ).toBeTruthy();
    expect(validRaw, 'sup-007 must have a valid cert as the non-expiring contrast').toBeTruthy();
    const expiring = /** @type {NonNullable<typeof expiringRaw>} */ (expiringRaw);
    const valid = /** @type {NonNullable<typeof validRaw>} */ (validRaw);
    renderWithProviders(<SupplierDocuments />, {
      identity: SUPPLIER,
      route: '/supplier/documents?expiry=expiring'
    });
    expect(await screen.findByText(expiring.name)).toBeInTheDocument();
    expect(screen.queryByText(valid.name)).toBeNull();
    expect(expiryGroup().getByRole('radio', { name: /^Expiring/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('no `expiry` param renders exactly as before this feature — `All` selected, every row shown', async () => {
    const expiringRaw = expiringDoc();
    const validRaw = validDoc();
    const expiring = /** @type {NonNullable<typeof expiringRaw>} */ (expiringRaw);
    const valid = /** @type {NonNullable<typeof validRaw>} */ (validRaw);
    renderWithProviders(<SupplierDocuments />, {
      identity: SUPPLIER,
      route: '/supplier/documents'
    });
    expect(await screen.findByText(expiring.name)).toBeInTheDocument();
    expect(screen.getByText(valid.name)).toBeInTheDocument();
    expect(expiryGroup().getByRole('radio', { name: /^All/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
});
