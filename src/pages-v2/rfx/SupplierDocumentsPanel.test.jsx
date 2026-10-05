// ────────────────────────────────────────────────────────────────────────────
// RFx B5 — the buyer's "Supplier documents" panel, the RFP "Documents"
// comparison row and the file access log (NR-1 BR-04, BR-07, BR-10, BR-12).
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders, BUYER } from '@test/test-utils';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { mockDataService } from '@services/data/mock/mockDataService';
import { SessionFileService } from '@services/data/mock/SessionFileService';
/** @import { IDataService } from '@services/data/types' */
import {
  resetRfxStores,
  rfpEventStore,
  rfpResponseStore
} from '@services/data/mock/stores/rfxStores';
import { rfqStore } from '@services/data/mock/stores/rfqStore';
import { quotationStore } from '@services/data/mock/stores/quotationStore';
import { sdcClock } from '@services/sdc';
import { sessionAttachments } from '@services/attachments/sessionAttachments';
/** @import { AttachmentMeta } from '@services/attachments/sessionAttachments' */
/** @import { DocumentRequest, ResponseDocument } from '@services/sourcing/types' */
import BuyerRfp from '../BuyerRfp';
import { NO_PERSON } from '@context/noPerson';
import { SupplierDocumentsPanel } from './SupplierDocumentsPanel';

const BUYER_SEAT = { ...BUYER, businessRoles: SEEDED_SEAT_ROLES.buyer };

/** @type {DocumentRequest} */
const HALAL = { id: 'dr-halal', name: 'Halal certificate', type: 'certificate', required: true };

/**
 * @param {string} id
 * @param {string} name
 * @returns {AttachmentMeta}
 */
const meta = (id, name) => ({
  id,
  name,
  size: 2048,
  type: 'application/pdf',
  addedAt: '2026-09-20T02:00:00.000Z'
});

/**
 * @param {string} id
 * @param {string} expiresOn
 * @returns {ResponseDocument}
 */
const certDoc = (id, expiresOn) => ({
  id,
  requestId: HALAL.id,
  attachment: meta(`att-${id}`, `${id}.pdf`),
  uploadedAt: '2026-09-20T02:00:00.000Z',
  certificate: { number: 'HLL-0042', issuer: 'BPJPH', expiresOn }
});

/**
 * A fresh file seam per test, so the access log starts empty.
 * @returns {{ service: IDataService; files: SessionFileService }}
 */
const freshService = () => {
  const files = new SessionFileService();
  return { service: { ...mockDataService, files }, files };
};

beforeEach(() => {
  resetRfxStores();
  rfqStore.reset();
  quotationStore.reset();
  sdcClock.reset();
  sessionAttachments.reset();
});

afterEach(() => {
  sessionAttachments.reset();
  delete (/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (URL)).createObjectURL);
  delete (/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (URL)).revokeObjectURL);
});

describe('the RFP detail lists every supplier file (rfp-001)', () => {
  beforeEach(() => {
    rfpEventStore.update('rfp-001', (e) => ({ ...e, documentRequests: [HALAL] }));
    // sup-007's certificate expired years before the deadline; its expiry is flagged, not refused.
    rfpResponseStore.update('rfp-resp-001', (r) => ({
      ...r,
      documents: [certDoc('d-old', '2020-01-31')]
    }));
    // sup-015's is valid past the deadline.
    rfpResponseStore.update('rfp-resp-003', (r) => ({
      ...r,
      documents: [certDoc('d-new', '2099-12-31')]
    }));
  });

  it('a submitted response with a Certificate shows its number, and Expired when it expired before the deadline', async () => {
    const { service } = freshService();
    renderWithProviders(<BuyerRfp />, {
      identity: BUYER_SEAT,
      route: '/buyer/rfp?open=rfp-001',
      service
    });
    const panel = await screen.findByTestId('rfp-documents-rfp-001');

    const expired = within(panel).getByTestId('rfp-documents-rfp-001-sup-007-file-d-old-cert');
    expect(expired).toHaveTextContent('HLL-0042');
    expect(expired).toHaveTextContent('BPJPH');
    expect(
      within(expired).getByTestId('rfp-documents-rfp-001-sup-007-file-d-old-cert-expired')
    ).toHaveTextContent('Expired');

    // The control: a certificate valid at the deadline carries no flag.
    const valid = within(panel).getByTestId('rfp-documents-rfp-001-sup-015-file-d-new-cert');
    expect(valid).toHaveTextContent('HLL-0042');
    expect(
      within(valid).queryByTestId('rfp-documents-rfp-001-sup-015-file-d-new-cert-expired')
    ).toBeNull();
  });

  it('CE-11i — a document stored before the uploader was recorded reads "Not recorded", never a name', async () => {
    // `certDoc` is the shape every document had before CE-11i: no `uploadedBy`.
    const { service } = freshService();
    renderWithProviders(<BuyerRfp />, {
      identity: BUYER_SEAT,
      route: '/buyer/rfp?open=rfp-001',
      service
    });
    const panel = await screen.findByTestId('rfp-documents-rfp-001');
    const cell = within(panel).getByTestId('rfp-documents-rfp-001-sup-007-file-d-old-uploaded-by');
    expect(cell).toHaveTextContent(/^Not recorded$/);
    expect(cell).not.toHaveTextContent('unnamed user');
  });

  it('the comparison has a Documents row: Complete, or Missing with the request named', async () => {
    const { service } = freshService();
    renderWithProviders(<BuyerRfp />, {
      identity: BUYER_SEAT,
      route: '/buyer/rfp?open=rfp-001',
      service
    });
    await screen.findByTestId('rfp-documents-row');
    expect(screen.getByTestId('rfp-documents-sup-007')).toHaveTextContent('Complete');
    // sup-008 sent nothing against the required request.
    expect(screen.getByTestId('rfp-documents-sup-008')).toHaveTextContent(
      'Missing: Halal certificate'
    );
  });
});

describe('the panel itself', () => {
  /**
   * @param {Parameters<typeof SupplierDocumentsPanel>[0]['responses']} responses
   * @param {IDataService} service
   */
  const panel = (responses, service) =>
    renderWithProviders(
      <SupplierDocumentsPanel
        requests={[HALAL]}
        responses={responses}
        deadlineFor={() => '2026-10-01'}
        testId="docs"
      />,
      { identity: BUYER_SEAT, service }
    );

  it('opening a file adds 1 entry to the access log, and the row says who opened it', async () => {
    // jsdom has no object URLs; the session store needs one to hold a file.
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:held')
    });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const { service, files } = freshService();
    const held = await files.put(new File(['%PDF'], 'halal.pdf', { type: 'application/pdf' }));
    /** @type {ResponseDocument} */
    const doc = { id: 'd-1', requestId: HALAL.id, attachment: held, uploadedAt: held.addedAt };
    panel(
      [
        {
          id: 'r-1',
          supplierId: 'sup-007',
          supplierName: 'PT Kemas',
          status: 'Submitted',
          documents: [doc]
        }
      ],
      service
    );

    expect(files.accessLog(held.id)).toHaveLength(0);
    expect(screen.getByTestId('docs-sup-007-file-d-1-opened')).toHaveTextContent('Not opened yet');

    fireEvent.click(screen.getByTestId('docs-sup-007-file-d-1-link-open'));

    const log = files.accessLog(held.id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ fileId: held.id, by: BUYER_SEAT.actor, at: sdcClock.now() });
    expect(screen.getByTestId('docs-sup-007-file-d-1-opened')).toHaveTextContent(
      'PTI (no person in this session), once, last'
    );
  });

  it("a Draft response's files do not appear", () => {
    const { service } = freshService();
    panel(
      [
        {
          id: 'r-d',
          supplierId: 'sup-008',
          supplierName: 'PT Draft',
          status: 'Draft',
          documents: [certDoc('d-draft', '2099-01-01')]
        },
        {
          id: 'r-s',
          supplierId: 'sup-007',
          supplierName: 'PT Sent',
          status: 'Submitted',
          documents: [certDoc('d-sent', '2099-01-01')]
        }
      ],
      service
    );
    expect(screen.getByTestId('docs-sup-007')).toHaveTextContent('d-sent.pdf');
    expect(screen.queryByTestId('docs-sup-008')).toBeNull();
    expect(screen.queryByText('d-draft.pdf')).toBeNull();
  });

  it('a file the session no longer holds shows the session-only note instead of a link', () => {
    const { service } = freshService();
    panel(
      [
        {
          id: 'r-1',
          supplierId: 'sup-007',
          supplierName: 'PT Kemas',
          status: 'Submitted',
          documents: [certDoc('d-gone', '2099-01-01')]
        }
      ],
      service
    );
    const cell = screen.getByTestId('docs-sup-007-file-d-gone-link');
    expect(within(cell).getByTestId('docs-sup-007-file-d-gone-link-not-held')).toHaveTextContent(
      'not available in this session'
    );
    expect(within(cell).queryByRole('link')).toBeNull();
    expect(screen.getByTestId('docs-note')).toHaveTextContent(/for this session/i);
  });

  it('CE-11i — "Uploaded by": the unattributed wording with the supplier, a resolved name, or "Not recorded"', () => {
    const { service } = freshService();
    /** @type {ResponseDocument} */
    const unattributed = { ...certDoc('d-u', '2099-01-01'), uploadedBy: NO_PERSON };
    /** @type {ResponseDocument} */
    const resolved = {
      ...certDoc('d-r', '2099-01-01'),
      uploadedBy: {
        kind: 'RESOLVED',
        person: { personId: 'p-panel-test', displayName: 'Rina Kusuma' }
      }
    };
    const legacy = certDoc('d-l', '2099-01-01');
    panel(
      [
        {
          id: 'r-1',
          supplierId: 'sup-007',
          supplierName: 'PT Kemas',
          status: 'Submitted',
          documents: [unattributed, resolved, legacy]
        }
      ],
      service
    );
    // The RFx lane's own wording for NO_PERSON_IN_SESSION (`rfxEdit.who.noPerson`),
    // with the supplier the file belongs to — never "PTI", which is the buyer.
    const u = screen.getByTestId('docs-sup-007-file-d-u-uploaded-by');
    expect(u).toHaveTextContent('an unnamed user (sign-in names nobody yet) at PT Kemas');
    expect(u).not.toHaveTextContent('PTI');
    expect(screen.getByTestId('docs-sup-007-file-d-r-uploaded-by')).toHaveTextContent(
      'Rina Kusuma at PT Kemas'
    );
    expect(screen.getByTestId('docs-sup-007-file-d-l-uploaded-by')).toHaveTextContent(
      /^Not recorded$/
    );
  });

  it('shows the version column only when a response carries versions (B2)', () => {
    const { service } = freshService();
    const doc = certDoc('d-v', '2099-01-01');
    const { unmount } = panel(
      [
        {
          id: 'r-1',
          supplierId: 'sup-007',
          supplierName: 'PT Kemas',
          status: 'Submitted',
          documents: [doc]
        }
      ],
      service
    );
    expect(screen.queryByTestId('docs-sup-007-file-d-v-version')).toBeNull();
    unmount();
    panel(
      [
        {
          id: 'r-1',
          supplierId: 'sup-007',
          supplierName: 'PT Kemas',
          status: 'Submitted',
          documents: [doc],
          versions: [
            { number: 1, documents: [] },
            { number: 2, documents: [doc] }
          ]
        }
      ],
      service
    );
    expect(screen.getByTestId('docs-sup-007-file-d-v-version')).toHaveTextContent('v2');
  });
});
