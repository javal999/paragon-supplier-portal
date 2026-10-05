// ────────────────────────────────────────────────────────────────────────────
// RFx DOCUMENT RULES — buyer document requests and supplier response documents
// (NR-1 BR-01 to BR-05, BR-11).
//
// Pure, the `rfxRules` contract: no store, no clock of its own. The authoring
// policies (RFI, RFP, RFQ create and revise-draft) call
// `documentRequestsRefusal`; the submit policies (RFI response, RFP response,
// quotation) call `responseDocumentsRefusal`; a draft save calls only
// `documentLimitsRefusal`. A screen's pre-check calls the same functions
// (RFX-R2).
//
// A certificate's expiry is judged when read (`certificateExpired`) and never
// refuses a submission (D-9): a supplier renewing its certificate is not locked
// out, and the buyer sees the flag. No expiry status is ever stored (law 0.5).
// ────────────────────────────────────────────────────────────────────────────

/** @import { AttachmentMeta } from '../attachments/sessionAttachments' */
import { isAttachmentMeta } from '../attachments/sessionAttachments';
import { fileLimitRefusal } from '../attachments/fileRules';
/** @import { DocumentRequest, ResponseDocument } from '../sourcing/types' */
import { DOCUMENT_TYPES } from '../sourcing/types';
import { isCalendarDate } from '@lib/workingCalendar';
/** @import { ActorAttribution } from '@lib/enforcement' */

// ── Authoring ───────────────────────────────────────────────────────────────

/**
 * Why a set of document requests is refused, or `null`. Refused, naming the
 * request: a malformed row, a blank name, a name used twice in the event
 * (case and spacing ignored), or an `itemLineNo` that is not an item of the
 * RFQ. `itemLines` are the RFQ's item line numbers; an RFI or RFP passes none,
 * so any `itemLineNo` there is refused (only an RFQ has items).
 * @param {unknown} requests
 * @param {readonly number[]} [itemLines]
 * @returns {string | null}
 */
export function documentRequestsRefusal(requests, itemLines = []) {
  if (!Array.isArray(requests))
    return 'DOCUMENT_REQUEST_INVALID: the document requests are not a list';
  const names = /** @type {Set<string>} */ (new Set());
  const ids = /** @type {Set<string>} */ (new Set());
  for (const [i, raw] of /** @type {unknown[]} */ (requests).entries()) {
    const r = /** @type {Partial<DocumentRequest> | null} */ (raw);
    const label =
      r && typeof r.name === 'string' && r.name.trim() ? `"${r.name.trim()}"` : `request ${i + 1}`;
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id.trim()) {
      return `DOCUMENT_REQUEST_INVALID: ${label} has no id`;
    }
    if (ids.has(r.id)) return `DOCUMENT_REQUEST_INVALID: ${label} repeats the id ${r.id}`;
    ids.add(r.id);
    if (typeof r.name !== 'string' || !r.name.trim()) {
      return `DOCUMENT_REQUEST_INVALID: ${label} has no name`;
    }
    const key = r.name.trim().replace(/\s+/g, ' ').toLowerCase();
    if (names.has(key)) return `DOCUMENT_REQUEST_INVALID: ${label} is asked for twice`;
    names.add(key);
    if (!DOCUMENT_TYPES.includes(/** @type {DocumentRequest['type']} */ (r.type))) {
      return `DOCUMENT_REQUEST_INVALID: ${label} names no document type`;
    }
    if (typeof r.required !== 'boolean') {
      return `DOCUMENT_REQUEST_INVALID: ${label} is neither required nor optional`;
    }
    if (r.itemLineNo !== undefined && !itemLines.includes(r.itemLineNo)) {
      return `DOCUMENT_REQUEST_INVALID: ${label} names item ${String(r.itemLineNo)}, which is not an item of the RFQ`;
    }
  }
  return null;
}

// ── Submit and save ─────────────────────────────────────────────────────────

/**
 * A response document's shape, as a payload carries it (`uploadedAt` and `uploadedBy` are the store's).
 * @param {unknown} v
 * @returns {boolean}
 */
export function isResponseDocumentInput(v) {
  if (!v || typeof v !== 'object') return false;
  const d = /** @type {Record<string, unknown>} */ (v);
  if (typeof d.id !== 'string' || !d.id.trim()) return false;
  if (d.requestId !== undefined && typeof d.requestId !== 'string') return false;
  if (!isAttachmentMeta(d.attachment)) return false;
  if (d.certificate !== undefined) {
    const c = /** @type {Record<string, unknown> | null} */ (d.certificate);
    if (!c || typeof c !== 'object') return false;
    for (const k of ['number', 'issuer', 'expiresOn']) {
      if (c[k] !== undefined && typeof c[k] !== 'string') return false;
    }
  }
  return true;
}

/**
 * The file limits alone (NR-1 BR-05, D-3), over every document in order.
 * `filesAlready` is how many files the response holds outside `documents`
 * (files on attachment answers, a quote's legacy attachments), so the 30-file
 * limit counts the whole response. What a draft save checks.
 * @param {readonly Pick<ResponseDocument, 'attachment'>[]} documents
 * @param {number} filesAlready
 * @returns {string | null}
 */
export function documentLimitsRefusal(documents, filesAlready) {
  for (const [i, doc] of documents.entries()) {
    const code = fileLimitRefusal(doc.attachment, filesAlready + i);
    if (code) return `${code}: ${doc.attachment.name}`;
  }
  return null;
}

/**
 * The required requests no document answers (NR-1 BR-03), in request order.
 * The submit refusal below and the buyer's "Documents" comparison row read
 * the same list (RFX-R2).
 * @param {readonly DocumentRequest[]} requests
 * @param {readonly Pick<ResponseDocument, 'requestId'>[]} documents
 * @returns {readonly DocumentRequest[]}
 */
export function missingRequiredDocuments(requests, documents) {
  return requests.filter((r) => r.required && !documents.some((d) => d.requestId === r.id));
}

/**
 * @param {string | undefined} v
 * @returns {boolean}
 */
const blank = (v) => typeof v !== 'string' || v.trim() === '';

/**
 * Why a response's documents may not be submitted, or `null` (NR-1 BR-03 to
 * BR-05). In this order, so a supplier fixes the cause before the detail:
 *
 * 1. `DOCUMENT_REQUEST_UNKNOWN` — a document names a request the event does not have
 * 2. `DOCUMENT_REQUIRED_MISSING` — a required request has no file, named
 * 3. `CERTIFICATE_FIELDS_MISSING` — a Certificate document without its number,
 *    issuer or expiry date
 * 4. the file-limit codes (`FILE_COUNT_EXCEEDED`, `FILE_TYPE_NOT_ALLOWED`,
 *    `FILE_TOO_LARGE`)
 *
 * An expired certificate is NOT refused (D-9); see `certificateExpired`.
 * @param {readonly DocumentRequest[]} requests
 * @param {readonly Pick<ResponseDocument, 'requestId' | 'attachment' | 'certificate'>[]} documents
 * @param {number} filesAlready
 * @returns {string | null}
 */
export function responseDocumentsRefusal(requests, documents, filesAlready) {
  const byId = new Map(requests.map((r) => [r.id, r]));
  const unknown = documents.find((d) => d.requestId !== undefined && !byId.has(d.requestId));
  if (unknown) {
    return `DOCUMENT_REQUEST_UNKNOWN: ${unknown.attachment.name} answers ${String(unknown.requestId)}, which this event does not ask for`;
  }
  const missing = missingRequiredDocuments(requests, documents);
  if (missing.length > 0) {
    return `DOCUMENT_REQUIRED_MISSING: ${missing.map((r) => r.name).join(', ')}`;
  }
  const uncertified = documents.find((d) => {
    if (d.requestId === undefined || byId.get(d.requestId)?.type !== 'certificate') return false;
    const c = d.certificate;
    return !c || blank(c.number) || blank(c.issuer) || !isCalendarDate(c.expiresOn);
  });
  if (uncertified) {
    return `CERTIFICATE_FIELDS_MISSING: ${/** @type {NonNullable<ReturnType<typeof byId.get>>} */ (byId.get(/** @type {NonNullable<typeof uncertified.requestId>} */ (uncertified.requestId))).name} needs its number, issuer and expiry date`;
  }
  return documentLimitsRefusal(documents, filesAlready);
}

// ── Reads ───────────────────────────────────────────────────────────────────

/**
 * True when a certificate had expired by the response deadline (NR-1 BR-04,
 * D-9): its expiry date is before the deadline day. A flag for the buyer,
 * computed when read; it never refuses. A document with no certificate is
 * never expired.
 * @param {Pick<ResponseDocument, 'certificate'>} doc
 * @param {string} deadline
 * @returns {boolean}
 */
export function certificateExpired(doc, deadline) {
  const expiresOn = doc.certificate?.expiresOn;
  if (!expiresOn || !isCalendarDate(expiresOn)) return false;
  return expiresOn < deadline.slice(0, 10);
}

/**
 * A quotation's files, as documents (RFX-R9): its `documents`, then any
 * legacy `attachments` as documents answering no request. The legacy files
 * keep their own id and time, so nothing is migrated or re-stamped.
 * @param {{ readonly documents?: readonly ResponseDocument[]; readonly attachments?: readonly AttachmentMeta[]; }} quotation
 * @returns {readonly ResponseDocument[]}
 */
export function documentsOf(quotation) {
  return [
    ...(quotation.documents ?? []),
    ...(quotation.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      attachment,
      uploadedAt: attachment.addedAt
    }))
  ];
}

/**
 * Stamp the documents a save, submit or revise carries (NR-1 BR-10, CE-11i):
 * WHEN a file arrived and WHO sent it.
 *
 * - A document already held (same id, same file) is CARRIED: it keeps its
 *   stored `uploadedAt` and `uploadedBy` exactly as stored. A carried document
 *   stored before `uploadedBy` existed stays without one, which reads as "not
 *   recorded" — it is never back-filled with today's actor.
 * - Any other document is NEW (a new id, or a new file under an old id): it is
 *   stamped `now` and `actor`.
 *
 * Both stamps are the store's and the SESSION's (C10 §6.2). A payload's own
 * `uploadedAt` / `uploadedBy` is IGNORED AND OVERWRITTEN, never trusted and not
 * refused — the `declaredBy` / `declaredAt` precedent on
 * `t_supplierdoc_declare`, where a caller "naming whoever it likes as the
 * declarer" is ignored rather than refused. Every path that stores response
 * documents calls this one function, so "stamp new, keep carried" has one home.
 * @param {readonly unknown[]} incoming
 * @param {readonly ResponseDocument[]} prior
 * @param {string} now
 * @param {ActorAttribution} actor
 * @returns {readonly ResponseDocument[]}
 */
export function stampDocuments(incoming, prior, now, actor) {
  return incoming.map((raw) => {
    const d = /** @type {Omit<ResponseDocument, 'uploadedAt' | 'uploadedBy'>} */ (raw);
    const held = prior.find((p) => p.id === d.id && p.attachment.id === d.attachment.id);
    const uploadedBy = held ? held.uploadedBy : actor;
    return {
      id: d.id,
      ...(d.requestId !== undefined ? { requestId: d.requestId } : {}),
      attachment: d.attachment,
      uploadedAt: held ? held.uploadedAt : now,
      ...(uploadedBy !== undefined ? { uploadedBy } : {}),
      ...(d.certificate ? { certificate: d.certificate } : {})
    };
  });
}
