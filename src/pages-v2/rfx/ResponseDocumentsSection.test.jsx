// ────────────────────────────────────────────────────────────────────────────
// NR-1 · the supplier's Documents section (B4), at the SURFACE. The rules are
// probed at the verb in `rfxDocumentsCommand.test.js`; what these add is that
// the section says them by slot, with the same functions, before anything is
// sent. The harness disables Submit exactly as the pages do: with
// `responseDocumentsRefusal` over the section's value.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
/** @import { IDataService, IFileService } from '@services/data/types' */
/** @import { AttachmentMeta } from '@services/attachments/sessionAttachments' */
import { MAX_FILE_BYTES } from '@services/attachments/fileRules';
import { responseDocumentsRefusal } from '@services/transitions/rfxDocumentRules';
/** @import { DocumentRequest } from '@services/sourcing/types' */
/** @import { DocumentDraft } from './ResponseDocumentsSection' */
import ResponseDocumentsSection from './ResponseDocumentsSection';

function stubFiles() {
  /** @type {IFileService} */
  const files = {
    put: vi.fn(
      /** @param {File} file @returns {Promise<AttachmentMeta>} */ async (file) => ({
        id: `stub-${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
        addedAt: '2026-09-25T00:00:00Z'
      })
    ),
    urlFor: vi.fn(() => null),
    release: vi.fn(),
    isHeld: vi.fn(() => false),
    // The access log (RFx B5) is on the seam too, so the typed stub implements it.
    recordAccess: vi.fn(),
    accessLog: vi.fn(() => [])
  };
  /** @type {IDataService} */
  const service = { ...mockDataService, files };
  return { files, service };
}

/** @type {DocumentRequest} */
const HALAL = { id: 'dr-halal', name: 'Halal certificate', type: 'certificate', required: true };
/** @type {DocumentRequest} */
const DIELINE = { id: 'dr-dieline', name: 'Dieline drawing', type: 'drawing', required: true };
/** @type {DocumentRequest} */
const PROFILE = {
  id: 'dr-profile',
  name: 'Company profile',
  type: 'companyProfile',
  required: false
};

/** @type {React.FC<{ requests: readonly DocumentRequest[] }>} */
const Harness = ({ requests }) => {
  const [value, setValue] = useState(/** @type {readonly DocumentDraft[]} */ ([]));
  const refusal = responseDocumentsRefusal(requests, value, 0);
  return (
    <>
      <ResponseDocumentsSection
        requests={requests}
        value={value}
        onChange={setValue}
        testId="docs"
      />
      <button type="button" disabled={refusal !== null} data-testid="submit">
        Submit
      </button>
    </>
  );
};

/**
 * @param {string} name
 * @returns {File}
 */
const pdf = (name, size = 120_000) => {
  const f = new File(['%PDF'], name, { type: 'application/pdf' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

/**
 * @param {string} testId
 * @param {File} file
 */
const pick = (testId, file) =>
  fireEvent.change(screen.getByTestId(`${testId}-input`), { target: { files: [file] } });

describe('NR-1 BR-03 — a required slot blocks submit, and the refusal names it', () => {
  it('an empty required slot is named under that slot, and Submit is refused', () => {
    const { service } = stubFiles();
    renderWithProviders(<Harness requests={[DIELINE, PROFILE]} />, { service });
    expect(screen.getByTestId('docs-slot-dr-dieline')).toHaveTextContent('Required');
    expect(screen.getByTestId('docs-slot-dr-profile')).toHaveTextContent('Optional');
    expect(screen.getByTestId('docs-slot-dr-dieline-refusal')).toHaveTextContent(
      'Required: Dieline drawing. Add a file before you send.'
    );
    // An optional slot left empty refuses nothing.
    expect(screen.queryByTestId('docs-slot-dr-profile-refusal')).toBeNull();
    expect(screen.getByTestId('submit')).toBeDisabled();
  });

  it('KNOWN-GOOD: a file in the required slot clears its refusal and Submit is offered', async () => {
    const { service } = stubFiles();
    renderWithProviders(<Harness requests={[DIELINE, PROFILE]} />, { service });
    pick('docs-slot-dr-dieline-files', pdf('dieline-v3.pdf'));
    expect(await screen.findByText('dieline-v3.pdf')).toBeInTheDocument();
    expect(screen.queryByTestId('docs-slot-dr-dieline-refusal')).toBeNull();
    expect(screen.getByTestId('submit')).not.toBeDisabled();
  });
});

describe('NR-1 BR-04 — a Certificate slot needs number, issuer and expiry date', () => {
  it('a certificate file without its fields is refused by name; filling all three clears it', async () => {
    const { service } = stubFiles();
    renderWithProviders(<Harness requests={[HALAL]} />, { service });
    pick('docs-slot-dr-halal-files', pdf('halal.pdf'));
    await screen.findByText('halal.pdf');
    expect(screen.getByTestId('docs-slot-dr-halal-refusal')).toHaveTextContent(
      'Halal certificate needs its certificate number, issuer and expiry date.'
    );
    expect(screen.getByTestId('submit')).toBeDisabled();

    fireEvent.change(screen.getByTestId('docs-slot-dr-halal-cert-number'), {
      target: { value: 'ID00410000123' }
    });
    fireEvent.change(screen.getByTestId('docs-slot-dr-halal-cert-issuer'), {
      target: { value: 'BPJPH' }
    });
    // Two of three is still refused.
    expect(screen.getByTestId('docs-slot-dr-halal-refusal')).toBeInTheDocument();
    expect(screen.getByTestId('submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('docs-slot-dr-halal-cert-expiresOn'), {
      target: { value: '2027-06-30' }
    });
    await waitFor(() => expect(screen.queryByTestId('docs-slot-dr-halal-refusal')).toBeNull());
    expect(screen.getByTestId('submit')).not.toBeDisabled();
  });
});

describe('NR-1 BR-05 / AC-03 — a file over the limit is refused on pick', () => {
  it('a 26 MB file is refused with the limit named and never put; the other files stay', async () => {
    const { files, service } = stubFiles();
    renderWithProviders(<Harness requests={[]} />, { service });
    pick('docs-other', pdf('brochure.pdf'));
    await screen.findByText('brochure.pdf');
    expect(files.put).toHaveBeenCalledTimes(1);

    pick('docs-other', pdf('mold-drawing.pdf', 26 * 1024 * 1024));
    expect(await screen.findByTestId('docs-other-refusal')).toHaveTextContent(
      `mold-drawing.pdf is larger than ${MAX_FILE_BYTES / (1024 * 1024)} MB and was not added.`
    );
    expect(files.put).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('mold-drawing.pdf')).toBeNull();
    expect(screen.getByText('brochure.pdf')).toBeInTheDocument();
  });

  it('a .zip is refused on pick; KNOWN-GOOD: a 25 MB PDF is taken', async () => {
    const { files, service } = stubFiles();
    renderWithProviders(<Harness requests={[]} />, { service });
    pick('docs-other', new File(['PK'], 'samples.zip', { type: 'application/zip' }));
    expect(await screen.findByTestId('docs-other-refusal')).toHaveTextContent(
      'samples.zip is not a file type PTI accepts and was not added.'
    );
    expect(files.put).not.toHaveBeenCalled();
    pick('docs-other', pdf('spec.pdf', MAX_FILE_BYTES));
    expect(await screen.findByText('spec.pdf')).toBeInTheDocument();
    expect(files.put).toHaveBeenCalledTimes(1);
  });
});

describe('read-only', () => {
  it('without onChange the files and certificate are listed, and nothing can be added', () => {
    const { service } = stubFiles();
    /** @type {DocumentDraft[]} */
    const value = [
      {
        id: 'd-1',
        requestId: HALAL.id,
        attachment: {
          id: 'a-1',
          name: 'halal.pdf',
          size: 1000,
          type: 'application/pdf',
          addedAt: '2026-09-20T00:00:00Z'
        },
        certificate: { number: 'ID00410000123', issuer: 'BPJPH', expiresOn: '2027-06-30' }
      }
    ];
    renderWithProviders(
      <ResponseDocumentsSection requests={[HALAL]} value={value} testId="docs" />,
      { service }
    );
    expect(screen.getByText('halal.pdf')).toBeInTheDocument();
    expect(screen.getByTestId('docs-slot-dr-halal-cert')).toHaveTextContent('BPJPH');
    expect(screen.queryByTestId('docs-slot-dr-halal-files-add')).toBeNull();
    expect(screen.queryByTestId('docs-other-add')).toBeNull();
    expect(screen.queryByTestId('docs-slot-dr-halal-cert-number')).toBeNull();
  });
});
