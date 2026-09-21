// ────────────────────────────────────────────────────────────────────────────
// SESSION-ONLY ATTACHMENTS — BL-27, stated rather than hidden.
//
// There is no file store. A file a buyer or supplier attaches is kept IN THIS
// BROWSER SESSION ONLY: the record it is attached to stores its metadata (name,
// size, type) and nothing else, and the bytes are reachable through an object
// URL for as long as the page lives. A reload keeps the metadata on the record
// and loses the file, and the surface says so rather than offering a link that
// no longer opens (`urlFor` returns `null`, and the component renders that
// honestly).
//
// Shared by the RFQ authoring, the RFI and RFP authoring and the supplier's
// quote: one store, one note, one behaviour.
// ────────────────────────────────────────────────────────────────────────────

import type { AttachmentMeta } from '../sourcing/rfqModel';

export type { AttachmentMeta };

const urls = new Map<string, string>();
let seq = 0;

const makeUrl = (file: Blob): string | null => {
  try {
    return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : null;
  } catch {
    return null;
  }
};

export const sessionAttachments = {
  /** Keep a file for this session and return the metadata a record stores. */
  add(file: File): AttachmentMeta {
    seq += 1;
    const id = `att-${Date.now().toString(36)}-${seq}`;
    const url = makeUrl(file);
    if (url) urls.set(id, url);
    return { id, name: file.name, size: file.size, type: file.type ?? '', addedAt: new Date().toISOString() };
  },
  /** The object URL, or `null` when the file is not held in this session. */
  urlFor(id: string): string | null {
    return urls.get(id) ?? null;
  },
  /** Release a file's object URL. The record's metadata is the caller's to drop. */
  release(id: string): void {
    const url = urls.get(id);
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // nothing to release
      }
    }
    urls.delete(id);
  },
  /** Test isolation. */
  reset(): void {
    for (const id of [...urls.keys()]) sessionAttachments.release(id);
    seq = 0;
  },
};

/** A size in bytes, for display: `12 KB`, `1.4 MB`. */
export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
