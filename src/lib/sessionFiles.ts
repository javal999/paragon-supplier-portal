// ────────────────────────────────────────────────────────────────────────────
// SESSION-HELD FILES — the honest attachment store (BL-27: there is no file
// store yet).
//
// A RECORD keeps only a file's METADATA (`SessionAttachmentMeta`: id, name,
// size, type). The file itself is held in THIS module, in memory, and opens
// through an object URL for as long as the browser session lasts. After a
// reload the record still names the file, and `sessionFileUrl` answers
// `undefined` — which every surface renders as "not available in this session"
// rather than as a dead link.
//
// ⚠️ **THE STORE NEVER INVENTS A FILE.** A seeded record (a reference image on
// a sample RFP) has metadata and no bytes, so it reads as unavailable from the
// first render. That is the honest state: the hub has never held that file.
//
// Built for the RFI/RFP authoring batch (B2). The RFQ batch (B1) builds its own
// session-attachment component in parallel; the two are meant to be merged into
// one when both have landed. Plain API on purpose, so merging is a rename.
// ────────────────────────────────────────────────────────────────────────────

/** What a record stores about an attached file. Never the bytes. */
export interface SessionAttachmentMeta {
  readonly id: string;
  readonly name: string;
  /** Size in bytes. */
  readonly size: number;
  /** MIME type as the browser reported it; `''` when it reported none. */
  readonly type: string;
}

const held = new Map<string, string>();
let seq = 0;

/** Hold a file for this session and return the metadata a record keeps. */
export function holdSessionFile(file: File): SessionAttachmentMeta {
  seq += 1;
  const id = `att-${Date.now().toString(36)}-${seq}`;
  const url =
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : '';
  if (url) held.set(id, url);
  return { id, name: file.name, size: file.size, type: file.type ?? '' };
}

/** The object URL for a held file, or undefined when this session never held it. */
export const sessionFileUrl = (id: string): string | undefined => held.get(id);

/** Let go of a held file (a removed attachment). Unknown ids are ignored. */
export function releaseSessionFile(id: string): void {
  const url = held.get(id);
  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }
  held.delete(id);
}

/** Is this a well-formed metadata record? Used where records are read back in. */
export function isSessionAttachmentMeta(v: unknown): v is SessionAttachmentMeta {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    o.id.length > 0 &&
    typeof o.name === 'string' &&
    o.name.trim().length > 0 &&
    typeof o.size === 'number' &&
    Number.isFinite(o.size) &&
    o.size >= 0 &&
    typeof o.type === 'string'
  );
}

/** A byte count as a reader wants it: B, KB or MB. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Test isolation: drop every held file. */
export function resetSessionFiles(): void {
  for (const id of [...held.keys()]) releaseSessionFile(id);
  seq = 0;
}
