import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/test-utils';
import { mockDataService } from '../../services/data/mock/mockDataService';
import type { IDataService, IFileService } from '../../services/data/types';
import type { AttachmentMeta } from '../../services/attachments/sessionAttachments';
import SessionAttachments from './SessionAttachments';

// A stub file seam: `put` hands back fixed metadata and marks the file held;
// anything not put in this test is not held.
function stubFiles() {
  const held = new Map<string, string>();
  const files: IFileService = {
    put: vi.fn(async (file: File): Promise<AttachmentMeta> => {
      const id = `stub-${file.name}`;
      held.set(id, `blob:stub/${id}`);
      return { id, name: file.name, size: file.size, type: file.type, addedAt: '2026-09-25T00:00:00Z' };
    }),
    urlFor: vi.fn((id: string) => held.get(id) ?? null),
    release: vi.fn((id: string) => {
      held.delete(id);
    }),
    isHeld: vi.fn((id: string) => held.has(id)),
  };
  const service: IDataService = { ...mockDataService, files };
  return { files, service };
}

const Harness: React.FC<{ initial?: readonly AttachmentMeta[] }> = ({ initial = [] }) => {
  const [value, setValue] = useState<readonly AttachmentMeta[]>(initial);
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
      'blob:stub/stub-die-line.pdf',
    );
    expect(screen.getByTestId('att-note')).toHaveTextContent(
      'Stored for this session; permanent storage comes with the backend.',
    );
  });

  it('a file the service no longer holds is listed with the not-held note, not a link', () => {
    const { service } = stubFiles();
    const lost: AttachmentMeta = {
      id: 'att-from-before-reload',
      name: 'drawing.dwg',
      size: 2048,
      type: '',
      addedAt: '2026-09-24T00:00:00Z',
    };
    renderWithProviders(<Harness initial={[lost]} />, { service });

    const row = screen.getByTestId('att-row');
    expect(row).toHaveTextContent('drawing.dwg');
    expect(row).toHaveTextContent('not available in this session');
    expect(within(row).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByTestId('att-note')).toHaveTextContent(
      'Stored for this session; permanent storage comes with the backend.',
    );
  });

  it('removing a file releases it through the service', async () => {
    const { files, service } = stubFiles();
    renderWithProviders(<Harness />, { service });
    fireEvent.change(screen.getByTestId('att-input'), {
      target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] },
    });
    await screen.findByTestId('att-row');
    fireEvent.click(screen.getByRole('button', { name: 'Remove a.pdf' }));
    expect(files.release).toHaveBeenCalledWith('stub-a.pdf');
    expect(screen.queryByTestId('att-row')).not.toBeInTheDocument();
  });
});
