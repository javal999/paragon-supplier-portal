// ────────────────────────────────────────────────────────────────────────────
// NR-1 — the document rules, probed both ways: each refusal code has a case
// that fires it and a twin, differing in the one fact the rule is about, that
// passes (RFX-R8).
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  certificateExpired,
  documentLimitsRefusal,
  documentRequestsRefusal,
  documentsOf,
  responseDocumentsRefusal,
} from './rfxDocumentRules';
import { MAX_FILE_BYTES, MAX_FILES_PER_RESPONSE } from '../attachments/fileRules';
import type { DocumentRequest, ResponseDocument } from '../sourcing/types';
import type { AttachmentMeta } from '../attachments/sessionAttachments';

const file = (name: string, size = 1_000): AttachmentMeta => ({
  id: `f-${name}`,
  name,
  size,
  type: '',
  addedAt: '2026-09-20T00:00:00.000Z',
});

const req = (over: Partial<DocumentRequest> = {}): DocumentRequest => ({
  id: 'dr-1',
  name: 'Halal certificate',
  type: 'certificate',
  required: true,
  ...over,
});

const doc = (over: Partial<ResponseDocument> = {}): ResponseDocument => ({
  id: 'd-1',
  requestId: 'dr-1',
  attachment: file('halal.pdf'),
  uploadedAt: '2026-09-21T00:00:00.000Z',
  certificate: { number: 'ID-123', issuer: 'BPJPH', expiresOn: '2027-01-31' },
  ...over,
});

const code = (reason: string | null) => (reason ? reason.split(':')[0] : null);

describe('documentRequestsRefusal — DOCUMENT_REQUEST_INVALID, naming the request', () => {
  it('fires on a blank name, and passes with one', () => {
    expect(code(documentRequestsRefusal([req({ name: '  ' })]))).toBe('DOCUMENT_REQUEST_INVALID');
    expect(documentRequestsRefusal([req()])).toBeNull();
  });

  it('fires on a name used twice in the event (case and spacing ignored), naming it', () => {
    const reason = documentRequestsRefusal([req(), req({ id: 'dr-2', name: 'halal  Certificate' })]);
    expect(code(reason)).toBe('DOCUMENT_REQUEST_INVALID');
    expect(reason).toContain('halal  Certificate');
    expect(documentRequestsRefusal([req(), req({ id: 'dr-2', name: 'BPOM certificate' })])).toBeNull();
  });

  it('fires on an itemLineNo that is not an item of the RFQ, and passes on one that is', () => {
    const reason = documentRequestsRefusal([req({ itemLineNo: 3 })], [1, 2]);
    expect(code(reason)).toBe('DOCUMENT_REQUEST_INVALID');
    expect(reason).toContain('Halal certificate');
    expect(documentRequestsRefusal([req({ itemLineNo: 2 })], [1, 2])).toBeNull();
  });

  it('refuses any itemLineNo on an RFI or RFP, which has no items', () => {
    expect(code(documentRequestsRefusal([req({ itemLineNo: 1 })]))).toBe('DOCUMENT_REQUEST_INVALID');
  });

  it('refuses a type that is not a document type', () => {
    expect(code(documentRequestsRefusal([req({ type: 'invoice' as DocumentRequest['type'] })]))).toBe(
      'DOCUMENT_REQUEST_INVALID',
    );
  });
});

describe('responseDocumentsRefusal — each code, and the order they come in', () => {
  it('DOCUMENT_REQUEST_UNKNOWN fires on a document naming a request the event lacks', () => {
    expect(code(responseDocumentsRefusal([req()], [doc(), doc({ id: 'd-2', requestId: 'dr-9' })], 0))).toBe(
      'DOCUMENT_REQUEST_UNKNOWN',
    );
    // An "other document" answers no request and is legal.
    expect(responseDocumentsRefusal([req()], [doc(), doc({ id: 'd-2', requestId: undefined })], 0)).toBeNull();
  });

  it('DOCUMENT_REQUIRED_MISSING fires naming the request, and passes once it has a file', () => {
    const reason = responseDocumentsRefusal([req()], [], 0);
    expect(code(reason)).toBe('DOCUMENT_REQUIRED_MISSING');
    expect(reason).toContain('Halal certificate');
    expect(responseDocumentsRefusal([req()], [doc()], 0)).toBeNull();
    // An optional request may stay empty.
    expect(responseDocumentsRefusal([req({ required: false })], [], 0)).toBeNull();
  });

  it('CERTIFICATE_FIELDS_MISSING fires without the number, issuer or expiry date', () => {
    for (const certificate of [
      undefined,
      { number: '', issuer: 'BPJPH', expiresOn: '2027-01-31' },
      { number: 'ID-123', issuer: ' ', expiresOn: '2027-01-31' },
      { number: 'ID-123', issuer: 'BPJPH', expiresOn: 'soon' },
    ]) {
      expect(code(responseDocumentsRefusal([req()], [doc({ certificate })], 0))).toBe('CERTIFICATE_FIELDS_MISSING');
    }
    expect(responseDocumentsRefusal([req()], [doc()], 0)).toBeNull();
    // A document answering a non-certificate request needs no certificate fields.
    expect(
      responseDocumentsRefusal([req({ type: 'drawing', name: 'Dieline' })], [doc({ certificate: undefined })], 0),
    ).toBeNull();
  });

  it('FILE_TOO_LARGE fires above 25 MB, and passes at the limit', () => {
    const big = doc({ attachment: file('halal.pdf', MAX_FILE_BYTES + 1) });
    expect(code(responseDocumentsRefusal([req()], [big], 0))).toBe('FILE_TOO_LARGE');
    expect(responseDocumentsRefusal([req()], [doc({ attachment: file('halal.pdf', MAX_FILE_BYTES) })], 0)).toBeNull();
  });

  it('FILE_TYPE_NOT_ALLOWED fires on a ZIP, and passes on a PDF', () => {
    expect(code(responseDocumentsRefusal([req()], [doc({ attachment: file('halal.zip') })], 0))).toBe(
      'FILE_TYPE_NOT_ALLOWED',
    );
    expect(responseDocumentsRefusal([req()], [doc({ attachment: file('halal.pdf') })], 0)).toBeNull();
  });

  it('FILE_COUNT_EXCEEDED fires past 30 files in the response, counting the files held elsewhere', () => {
    expect(code(responseDocumentsRefusal([req()], [doc()], MAX_FILES_PER_RESPONSE))).toBe('FILE_COUNT_EXCEEDED');
    expect(responseDocumentsRefusal([req()], [doc()], MAX_FILES_PER_RESPONSE - 1)).toBeNull();
  });

  it('puts structural errors first: unknown, then missing, then certificate, then limits', () => {
    const zipNoCert = doc({ attachment: file('x.zip'), certificate: undefined });
    const second = req({ id: 'dr-2', name: 'Dieline', type: 'drawing' });
    expect(code(responseDocumentsRefusal([req(), second], [zipNoCert, doc({ id: 'd-3', requestId: 'dr-9' })], 0))).toBe(
      'DOCUMENT_REQUEST_UNKNOWN',
    );
    expect(code(responseDocumentsRefusal([req(), second], [zipNoCert], 0))).toBe('DOCUMENT_REQUIRED_MISSING');
    expect(code(responseDocumentsRefusal([req()], [zipNoCert], 0))).toBe('CERTIFICATE_FIELDS_MISSING');
    expect(code(responseDocumentsRefusal([req()], [doc({ attachment: file('x.zip') })], 0))).toBe(
      'FILE_TYPE_NOT_ALLOWED',
    );
  });
});

describe('documentLimitsRefusal — what a draft save checks', () => {
  it('checks the limits and nothing else: a missing required file is not its business', () => {
    expect(code(documentLimitsRefusal([doc({ attachment: file('a.exe') })], 0))).toBe('FILE_TYPE_NOT_ALLOWED');
    expect(documentLimitsRefusal([], 0)).toBeNull();
  });
});

describe('certificateExpired — a read-side flag that never refuses (D-9)', () => {
  it('is true when the certificate expired before the deadline, false on or after it', () => {
    expect(certificateExpired(doc({ certificate: { number: 'n', issuer: 'i', expiresOn: '2026-09-29' } }), '2026-09-30')).toBe(true);
    expect(certificateExpired(doc({ certificate: { number: 'n', issuer: 'i', expiresOn: '2026-09-30' } }), '2026-09-30')).toBe(false);
    expect(certificateExpired(doc({ certificate: undefined }), '2026-09-30')).toBe(false);
  });

  it('does not stop a submit: an expired certificate with its fields passes the submit rule', () => {
    const expired = doc({ certificate: { number: 'n', issuer: 'i', expiresOn: '2020-01-01' } });
    expect(responseDocumentsRefusal([req()], [expired], 0)).toBeNull();
  });
});

describe('documentsOf — a quotation\'s files as documents', () => {
  it('returns the documents, then the legacy attachments as documents answering no request', () => {
    const legacy = file('old-quote.pdf');
    const all = documentsOf({ documents: [doc()], attachments: [legacy] });
    expect(all.map((d) => d.attachment.name)).toEqual(['halal.pdf', 'old-quote.pdf']);
    expect(all[1]).toEqual({ id: legacy.id, attachment: legacy, uploadedAt: legacy.addedAt });
    expect(documentsOf({})).toEqual([]);
  });
});
