/** @import React from 'react' */
import { useState } from 'react';
/** @import { TFunction } from 'i18next' */
import { useTranslation } from 'react-i18next';
import StatusPill from '@components/ui-v2/StatusPill';
import Data from '@components/ui-v2/Data';
import SessionAttachments from '@components/ui-v2/SessionAttachments';
import { formatDate } from '@lib/format';
import { isCalendarDate } from '@lib/workingCalendar';
import {
  fileLimitRefusal,
  MAX_FILE_BYTES,
  MAX_FILES_PER_RESPONSE
} from '@services/attachments/fileRules';
/** @import { AttachmentMeta } from '@services/attachments/sessionAttachments' */
import { responseDocumentsRefusal } from '@services/transitions/rfxDocumentRules';
/** @import { CertificateFields, DocumentRequest, ResponseDocument } from '@services/sourcing/types' */

// ─────────────────────────────────────────────────────────────────────────────
// NR-1 · THE SUPPLIER'S "DOCUMENTS" SECTION — one component for the RFI form,
// the RFP form and both RFQ quote forms, so the rules are the same wherever a
// supplier uploads (BR-01 to BR-05).
//
// One slot per document request, marked required or optional; a Certificate
// slot adds number, issuer and expiry date. "Other documents" follows, for what
// the buyer did not think to ask for. Files go through `SessionAttachments`.
//
// It only COLLECTS and SAYS. Each picked file is pre-checked with
// `fileLimitRefusal` and refused on pick; each slot is judged with
// `responseDocumentsRefusal`, the function the submit and revise verbs call
// (RFX-R2), and its refusal is shown under the slot it names. The page decides
// whether Submit is offered, with the same function.
// ─────────────────────────────────────────────────────────────────────────────

/** A document as a form holds it: the upload time is the store's, and absent until stored. */
/** @typedef {Omit<ResponseDocument, 'uploadedAt'> & { readonly uploadedAt?: string }} DocumentDraft */

const MB = MAX_FILE_BYTES / (1024 * 1024);

/**
 * A document refusal in the supplier's words, or `null` when the code is not a
 * document code. `reason` is a `CODE: detail` string from `rfxDocumentRules` or
 * a bare `fileLimitRefusal` code with the file name passed as `name`.
 * @param {TFunction} t
 * @param {string} reason
 * @param {string} [name]
 * @returns {string | null}
 */
export function documentRefusalText(t, reason, name) {
  const colon = reason.indexOf(':');
  const code = colon < 0 ? reason : reason.slice(0, colon);
  const detail = colon < 0 ? '' : reason.slice(colon + 1).trim();
  const key = `rfx.docs.refusal.${code}`;
  const subject =
    name ??
    (code === 'CERTIFICATE_FIELDS_MISSING'
      ? detail.replace(/ needs its .*$/, '')
      : code === 'DOCUMENT_REQUEST_UNKNOWN'
        ? detail.replace(/ answers .*$/, '')
        : detail);
  const text = t(key, { name: subject, mb: MB, count: MAX_FILES_PER_RESPONSE });
  return text === key ? null : text;
}

const inputClass =
  'w-full bg-white border border-border-input rounded-md px-3 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover';

/** @type {CertificateFields} */
const EMPTY_CERT = { number: '', issuer: '', expiresOn: '' };

/** The three fields a Certificate slot carries, in display order. */
/** @type {readonly (keyof CertificateFields)[]} */
const CERT_FIELDS = ['number', 'issuer', 'expiresOn'];

/**
 * A Certificate slot's number, issuer and expiry date (NR-1 BR-04).
 * @type {React.FC<{ value: CertificateFields; onChange?: (next: CertificateFields) => void; testId: string; describedBy?: string; invalidFields?: readonly (keyof CertificateFields)[]; }>}
 */
const CertificateInputs = ({ value, onChange, testId, describedBy, invalidFields = [] }) => {
  const { t } = useTranslation();
  if (!onChange) {
    return (
      <dl className="grid grid-cols-3 gap-2 text-xs" data-testid={`${testId}-cert`}>
        <div>
          <dt className="text-text-tertiary">{t('rfx.docs.cert.number')}</dt>
          <dd>
            <Data>{value.number || '—'}</Data>
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('rfx.docs.cert.issuer')}</dt>
          <dd className="text-text-primary">{value.issuer || '—'}</dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('rfx.docs.cert.expiresOn')}</dt>
          <dd>
            <Data>{value.expiresOn ? formatDate(value.expiresOn) : '—'}</Data>
          </dd>
        </div>
      </dl>
    );
  }
  /**
   * @param {keyof CertificateFields} key
   * @param {'text' | 'date'} type
   */
  const field = (key, type) => {
    // BL-326 — a missing-fields refusal marks the fields that ARE missing; a
    // file refusal never marks any of them.
    const invalid = invalidFields.includes(key);
    return (
      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t(`rfx.docs.cert.${key}`)}
          <span className="text-danger ml-1">*</span>
        </span>
        <input
          type={type}
          aria-label={t(`rfx.docs.cert.${key}`)}
          data-testid={`${testId}-cert-${key}`}
          // BL-84 — the slot's refusal is announced with the fields it names.
          aria-invalid={invalid ? true : undefined}
          aria-describedby={invalid ? describedBy : undefined}
          value={value[key]}
          onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          className={inputClass}
        />
      </label>
    );
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" data-testid={`${testId}-cert`}>
      {field('number', 'text')}
      {field('issuer', 'text')}
      {field('expiresOn', 'date')}
    </div>
  );
};

/**
 * One document request: its files, its certificate fields, and its refusal.
 * @type {React.FC<{ request: DocumentRequest; documents: readonly DocumentDraft[]; cert: CertificateFields; onFiles?: (next: readonly AttachmentMeta[]) => void; onCert?: (next: CertificateFields) => void; refuse: (file: File, acceptedBefore: number) => string | null; testId: string; }>}
 */
const DocumentSlot = ({ request, documents, cert, onFiles, onCert, refuse, testId }) => {
  const { t } = useTranslation();
  const isCertificate = request.type === 'certificate';
  // The verb's own rule, applied to this slot alone: it names this request.
  const refusal = onFiles
    ? responseDocumentsRefusal(
        [request],
        documents.map((d) => (isCertificate ? { ...d, certificate: cert } : d)),
        0
      )
    : null;
  // BL-326 — the refusal is ABOUT one control: a file refusal marks the file
  // control, a missing-certificate-fields refusal marks the blank fields. The
  // same predicates `rfxDocumentRules` uses, read once here.
  const code = refusal === null ? null : refusal.split(':', 1)[0];
  const fileRefused =
    code === 'DOCUMENT_REQUIRED_MISSING' ||
    code === 'DOCUMENT_REQUEST_UNKNOWN' ||
    (code?.startsWith('FILE_') ?? false);
  const certMissing = code === 'CERTIFICATE_FIELDS_MISSING';
  /** @type {(keyof CertificateFields)[]} */
  const blankCertFields = certMissing
    ? CERT_FIELDS.filter((k) =>
        k === 'expiresOn' ? !isCalendarDate(cert.expiresOn) : cert[k].trim() === ''
      )
    : [];
  return (
    <div
      className={`border rounded-md px-3 py-3 space-y-2 ${refusal ? 'border-danger' : 'border-border-subtle'}`}
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-text-primary">{request.name}</span>
        <StatusPill variant="neutral">{t(`rfx.docs.type.${request.type}`)}</StatusPill>
        <StatusPill variant="neutral">
          {t(request.required ? 'rfx.docs.required' : 'rfx.docs.optional')}
        </StatusPill>
      </div>
      <SessionAttachments
        value={documents.map((d) => d.attachment)}
        onChange={onFiles}
        refuse={refuse}
        label={request.name}
        testId={`${testId}-files`}
        describedBy={fileRefused ? `${testId}-refusal` : undefined}
      />
      {isCertificate && (
        <CertificateInputs
          value={cert}
          onChange={onCert}
          testId={testId}
          describedBy={certMissing ? `${testId}-refusal` : undefined}
          invalidFields={blankCertFields}
        />
      )}
      {!!refusal && (
        <p
          id={`${testId}-refusal`}
          role="alert"
          className="text-xs text-danger"
          data-testid={`${testId}-refusal`}
        >
          {documentRefusalText(t, refusal) ?? refusal}
        </p>
      )}
    </div>
  );
};

/**
 * @typedef {object} ResponseDocumentsSectionProps
 * @property {readonly DocumentRequest[]} requests -  The event's document requests; none = only "Other documents".
 * @property {readonly DocumentDraft[]} value
 * @property {(next: readonly DocumentDraft[]) => void} [onChange] -  Absent = read-only: the files are listed, nothing can be added or removed.
 * @property {number} [filesAlready] -  Files the response holds outside this section (attachment answers): they count toward the limit.
 * @property {string} testId
 */

/**
 * The first stored certificate of each Certificate request, as the fields start.
 * @param {readonly DocumentRequest[]} requests
 * @param {readonly DocumentDraft[]} value
 */
const certsOf = (requests, value) =>
  /** @type {Record<string, CertificateFields>} */ (
    Object.fromEntries(
      requests
        .filter((r) => r.type === 'certificate')
        .map((r) => [r.id, value.find((d) => d.requestId === r.id)?.certificate ?? EMPTY_CERT])
    )
  );

/** @type {React.FC<ResponseDocumentsSectionProps>} */
const ResponseDocumentsSection = ({ requests, value, onChange, filesAlready = 0, testId }) => {
  const { t } = useTranslation();
  // The certificate fields are the slot's, typed before or after its file: they
  // are written onto every document of the slot, and kept here so a supplier
  // may type them first.
  const [certs, setCerts] = useState(
    /** @type {() => Record<string, CertificateFields>} */ (() => certsOf(requests, value))
  );
  const byRequest = new Set(requests.map((r) => r.id));
  const others = value.filter((d) => d.requestId === undefined || !byRequest.has(d.requestId));

  // NR-1 BR-05 — the pick is judged against every file the response already holds.
  /**
   * @param {File} file
   * @param {number} acceptedBefore
   * @returns {string | null}
   */
  const refuse = (file, acceptedBefore) => {
    const code = fileLimitRefusal(file, filesAlready + value.length + acceptedBefore);
    return code ? documentRefusalText(t, code, file.name) : null;
  };

  /**
   * @param {string | undefined} requestId
   * @param {CertificateFields | undefined} cert
   */
  const withCert = (requestId, cert) =>
    requestId !== undefined && cert ? { certificate: cert } : {};

  /**
   * Replace the files of one slot (`requestId` undefined = "Other documents").
   * @param {string | undefined} requestId
   * @param {readonly AttachmentMeta[]} next
   */
  const setFiles = (requestId, next) => {
    if (!onChange) return;
    /** @param {DocumentDraft} d */
    const inSlot = (d) =>
      requestId === undefined
        ? d.requestId === undefined || !byRequest.has(d.requestId)
        : d.requestId === requestId;
    const kept = value.filter((d) => !inSlot(d));
    const held = value.filter(inSlot);
    const cert = requestId !== undefined ? certs[requestId] : undefined;
    const slot = next.map(
      /** @returns {DocumentDraft} */ (attachment) =>
        held.find((d) => d.attachment.id === attachment.id) ?? {
          id: `doc-${attachment.id}`,
          ...(requestId !== undefined ? { requestId } : {}),
          attachment,
          ...withCert(requestId, cert)
        }
    );
    onChange([...kept, ...slot]);
  };

  /**
   * @param {string} requestId
   * @param {CertificateFields} cert
   */
  const setCert = (requestId, cert) => {
    setCerts((prev) => ({ ...prev, [requestId]: cert }));
    if (!onChange) return;
    onChange(value.map((d) => (d.requestId === requestId ? { ...d, certificate: cert } : d)));
  };

  // The whole section, as the verb judges it: what no single slot names (the
  // file count across slots) is said once, under the section.
  const whole = onChange ? responseDocumentsRefusal(requests, value, filesAlready) : null;
  const wholeOnly = whole && /^FILE_/.test(whole) ? whole : null;

  return (
    <section className="space-y-3" data-testid={testId}>
      <div>
        <h4 className="text-sm font-semibold text-text-primary">{t('rfx.docs.title')}</h4>
        {!!onChange && (
          <p className="text-xs text-text-tertiary">
            {t('rfx.docs.hint')} {t('rfx.docs.limits', { mb: MB, count: MAX_FILES_PER_RESPONSE })}
          </p>
        )}
      </div>
      {requests.map((request) => (
        <DocumentSlot
          key={request.id}
          request={request}
          documents={value.filter((d) => d.requestId === request.id)}
          cert={certs[request.id] ?? EMPTY_CERT}
          onFiles={onChange ? (next) => setFiles(request.id, next) : undefined}
          onCert={onChange ? (next) => setCert(request.id, next) : undefined}
          refuse={refuse}
          testId={`${testId}-slot-${request.id}`}
        />
      ))}
      <div className="border border-border-subtle rounded-md px-3 py-3">
        <SessionAttachments
          value={others.map((d) => d.attachment)}
          onChange={onChange ? (next) => setFiles(undefined, next) : undefined}
          refuse={refuse}
          label={t('rfx.docs.other')}
          testId={`${testId}-other`}
        />
      </div>
      {!!wholeOnly && (
        <p role="alert" className="text-xs text-danger" data-testid={`${testId}-refusal`}>
          {documentRefusalText(t, wholeOnly) ?? wholeOnly}
        </p>
      )}
    </section>
  );
};

export default ResponseDocumentsSection;
