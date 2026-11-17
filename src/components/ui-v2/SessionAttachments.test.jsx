/** @import * as React from 'react' */
/** @import { IDataService, IFileService } from '@services/data/types' */
/** @import { AttachmentMeta } from '@services/attachments/sessionAttachments' */
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@test/test-utils';
import { mockDataService } from '@services/data/mock/mockDataService';
import SessionAttachments from './SessionAttachments';

// A stub file seam: `put` hands back fixed metadata and marks the file held;
// anything not put in this test is not held.
/**
 * @returns {{ files: IFileService; service: IDataService; }}
 */
function stubFiles() {
  const held = /** @type {Map<string, string>} */ (new Map());
  /** @type {IFileService} */
  const files = {
    put: vi.fn(
      /**
       * @param {File} file
       * @returns {Promise<AttachmentMeta>}
       */
      async (file) => {
        const id = `stub-${file.name}`;
        held.set(id, `blob:stub/${id}`);
        return {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          addedAt: '2026-09-25T00:00:00Z'
        };
      }
    ),
    urlFor: vi.fn((/** @type {string} */ id) => held.get(id) ?? null),
    release: vi.fn((/** @type {string} */ id) => {
      held.delete(id);
    }),
    isHeld: vi.fn((/** @type {string} */ id) => held.has(id)),
    recordAccess: vi.fn(),
    accessLog: vi.fn(() => [])
  };
  /** @type {IDataService} */
  const service = { ...mockDataService, files };
  return { files, service };
}

/**
 * @param {{ initial?: readonly AttachmentMeta[]; }} props
 * @returns {React.ReactNode}
 */
const Harness = ({ initial = [] }) => {
  const [value, setValue] = useState(/** @type {readonly AttachmentMeta[]} */ (initial));
  return <SessionAttachments value={value} onChange={setValue} label="Files" testId="att" />;
};

describe('SessionAttachments — reads files through the data service', () => {
  it('picking a file calls `put` and lists the file by name, as a link', async () => {
    const { files, service } = stubFiles();
    renderWithProviders(<Harness />, { service });
    const file = new File(['%PDF'], 'die-line.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('att-input'), { target: { files: [file] } });

    const row = await screen.findByTestId('att-row');
    expect(files.put).toHaveBeenCalledTimes(1);
    expect(files.put).toHaveBeenCalledWith(file);
    expect(row).toHaveTextContent('die-line.pdf');
    expect(within(row).getByRole('link', { name: 'die-line.pdf' })).toHaveAttribute(
      'href',
      'blob:stub/stub-die-line.pdf'
    );
    expect(screen.getByTestId('att-note')).toHaveTextContent(
      'Stored for this session; permanent storage comes with the backend.'
    );
  });

  it('a file the service no longer holds is listed with the not-held note, not a link', () => {
    const { service } = stubFiles();
    /** @type {AttachmentMeta} */
    const lost = {
      id: 'att-from-before-reload',
      name: 'drawing.dwg',
      size: 2048,
      type: '',
      addedAt: '2026-09-24T00:00:00Z'
    };
    renderWithProviders(<Harness initial={[lost]} />, { service });

    const row = screen.getByTestId('att-row');
    expect(row).toHaveTextContent('drawing.dwg');
    expect(row).toHaveTextContent('not available in this session');
    expect(within(row).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByTestId('att-note')).toHaveTextContent(
      'Stored for this session; permanent storage comes with the backend.'
    );
  });

  it('removing a file releases it through the service', async () => {
    const { files, service } = stubFiles();
    renderWithProviders(<Harness />, { service });
    fireEvent.change(screen.getByTestId('att-input'), {
      target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] }
    });
    await screen.findByTestId('att-row');
    fireEvent.click(screen.getByRole('button', { name: 'Remove a.pdf' }));
    expect(files.release).toHaveBeenCalledWith('stub-a.pdf');
    expect(screen.queryByTestId('att-row')).not.toBeInTheDocument();
  });

  // BL-142 [Proposed] — a file that arrived on the list from a saved record may
  // still be listed by an earlier version of it, so removing it from the revision
  // must not free it for the session.
  it('removing a file that arrived on the record does NOT release it (an earlier version may list it)', () => {
    const { files, service } = stubFiles();
    /** @type {AttachmentMeta} */
    const carried = {
      id: 'stub-carried.pdf',
      name: 'carried.pdf',
      size: 10,
      type: 'application/pdf',
      addedAt: '2026-09-24T00:00:00Z'
    };
    renderWithProviders(<Harness initial={[carried]} />, { service });
    fireEvent.click(screen.getByRole('button', { name: 'Remove carried.pdf' }));
    expect(files.release).not.toHaveBeenCalled();
    expect(screen.queryByTestId('att-row')).not.toBeInTheDocument();
  });

  it('a file picked in this edit is still freed when removed, and a carried one beside it is kept', async () => {
    const { files, service } = stubFiles();
    /** @type {AttachmentMeta} */
    const carried = {
      id: 'stub-carried.pdf',
      name: 'carried.pdf',
      size: 10,
      type: 'application/pdf',
      addedAt: '2026-09-24T00:00:00Z'
    };
    renderWithProviders(<Harness initial={[carried]} />, { service });
    fireEvent.change(screen.getByTestId('att-input'), {
      target: { files: [new File(['x'], 'new.pdf', { type: 'application/pdf' })] }
    });
    await screen.findByText('new.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Remove new.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove carried.pdf' }));
    expect(files.release).toHaveBeenCalledTimes(1);
    expect(files.release).toHaveBeenCalledWith('stub-new.pdf');
  });

  // BL-84 (WCAG 3.3.1) — a refused file is announced with the control that
  // refused it, not only listed under it.
  it('a refused file is tied to the file control', async () => {
    const { service } = stubFiles();
    renderWithProviders(
      <SessionAttachments
        value={[]}
        onChange={() => {}}
        label="Files"
        testId="att"
        refuse={() => 'Too large'}
      />,
      { service }
    );
    fireEvent.change(screen.getByTestId('att-input'), {
      target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] }
    });
    const refusal = await screen.findByTestId('att-refusal');
    expect(refusal).toHaveAttribute('id', 'att-refusal');
    expect(refusal).toHaveTextContent('Too large');
    expect(screen.getByTestId('att-input')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('att-input')).toHaveAttribute('aria-describedby', 'att-refusal');
  });
});
