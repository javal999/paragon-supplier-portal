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

/** @typedef {import('../sourcing/rfqModel').AttachmentMeta} AttachmentMeta */
import { sdcClock } from '../sdc/clock';

const urls = /** @type {Map<string, string>} */ (new Map());
let seq = 0;

/**
 * @param {Blob} file
 * @returns {string | null}
 */
const makeUrl = (file) => {
  try {
    return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
      ? URL.createObjectURL(file)
      : null;
  } catch {
    return null;
  }
};

export const sessionAttachments = {
  /**
   * Keep a file for this session and return the metadata a record stores.
   * @param {File} file
   * @returns {AttachmentMeta}
   */
  add(file) {
    seq += 1;
    const id = `att-${Date.now().toString(36)}-${seq}`;
    const url = makeUrl(file);
    if (url) urls.set(id, url);
    return { id, name: file.name, size: file.size, type: file.type ?? '', addedAt: sdcClock.now() };
  },
  /**
   * The object URL, or `null` when the file is not held in this session.
   * @param {string} id
   * @returns {string | null}
   */
  urlFor(id) {
    return urls.get(id) ?? null;
  },
  /**
   * Release a file's object URL. The record's metadata is the caller's to drop.
   * @param {string} id
   * @returns {void}
   */
  release(id) {
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
  /**
   * Test isolation.
   * @returns {void}
   */
  reset() {
    for (const id of [...urls.keys()]) sessionAttachments.release(id);
    seq = 0;
  }
};

/**
 * Is this a well-formed metadata record? The RFI/RFP create verbs and the
 * typed-answer rule read attachments back through it, so a hand-made payload
 * cannot store a "file" with no name.
 * @param {unknown} v
 * @returns {v is AttachmentMeta}
 */
export function isAttachmentMeta(v) {
  if (!v || typeof v !== 'object') return false;
  const o = /** @type {Record<string, unknown>} */ (v);
  return (
    typeof o.id === 'string' &&
    o.id.length > 0 &&
    typeof o.name === 'string' &&
    o.name.trim().length > 0 &&
    typeof o.size === 'number' &&
    Number.isFinite(o.size) &&
    o.size >= 0 &&
    typeof o.type === 'string' &&
    typeof o.addedAt === 'string'
  );
}

/**
 * A size in bytes, for display: `12 KB`, `1.4 MB`.
 * @param {number} size
 * @returns {string}
 */
export function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
