// ────────────────────────────────────────────────────────────────────────────
// RFx B5 — THE BUYER'S "SUPPLIER DOCUMENTS" VIEW (NR-1 buyer steps 5 and 6,
// BR-04, BR-07, BR-10, BR-12; closes F-02 in the session).
//
// One place per event where the buyer opens every supplier file:
//
//   · SUBMITTED RESPONSES ONLY. A Draft response's files are not PTI's to read
//     (BR-07); the panel drops a Draft even if a caller hands one in.
//   · EVERY OPEN OR DOWNLOAD IS RECORDED through the file seam's access log
//     (`files.recordAccess`), and each file shows who opened it and when
//     (BR-10). A download changes no state, so it is a log entry, not a verb.
//   · A FILE THE SESSION NO LONGER HOLDS is listed with the session-only note
//     instead of a link that would open nothing (BR-12, CE-11).
//   · A CERTIFICATE shows its number, issuer and expiry, and "Expired" when it
//     had expired by the deadline in force for that supplier
//     (`certificateExpired`, D-9: flagged, never refused).
//   · The VERSION column appears only when a response carries `versions`
//     (task B2), so it lights up once version history exists.
//   · UPLOADED BY (CE-11i): the actor the store stamped when the file arrived,
//     with the supplier it belongs to. While no person can be resolved that is
//     the RFx lane's own "unnamed user" wording (`rfxActorName`), never a
//     name; a file stored before the stamp existed reads "Not recorded".
//
// No "Download all" control: the ZIP waits for BL-27, and a control that
// cannot do what it says is a defect.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';
/** @import { TFunction } from 'i18next' */
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import Table from '@components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '@components/ui-v2/TableHeader';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import { useDataService } from '@services/data/DataServiceContext';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { formatDate, formatDateTime } from '@lib/format';
/** @import { ActorAttribution, UnattributedReason } from '@lib/enforcement' */
/** @import { AttachmentMeta } from '@services/attachments/sessionAttachments' */
import { formatBytes } from '@services/attachments/sessionAttachments';
/** @import { DocumentRequest, ResponseDocument } from '@services/sourcing/types' */
import {
  certificateExpired,
  missingRequiredDocuments
} from '@services/transitions/rfxDocumentRules';
import { rfxActorName } from './draftEdit';

// ── The open action (shared with the RFI/RFP answer cells) ──────────────────

/**
 * A supplier file as a link that records each open and download in the
 * access log. When the session no longer holds the file, its name and the
 * session-only note instead (BR-12). `onOpened` lets a caller re-read the log.
 * `withDownload`:  Also offer a Download link (the panel does; an answer cell does not).
 * @type {React.FC<{ file: AttachmentMeta; testId: string; withDownload?: boolean; onOpened?: () => void; }>}
 */
export const FileOpenLink = ({ file, testId, withDownload = false, onOpened }) => {
  const { t } = useTranslation();
  const { files } = useDataService();
  const { identity } = useCurrentIdentity();
  const url = files.urlFor(file.id);
  if (!url) {
    return (
      <span data-testid={testId}>
        <span className="text-text-primary">{file.name}</span>{' '}
        <span className="text-xs text-text-tertiary" data-testid={`${testId}-not-held`}>
          {t('attachments.notHeld')}
        </span>
      </span>
    );
  }
  const record = () => {
    files.recordAccess(file.id, identity.actor);
    onOpened?.();
  };
  return (
    <span data-testid={testId}>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={record}
        className="text-action hover:underline"
        data-testid={`${testId}-open`}
      >
        {file.name}
      </a>
      {withDownload ? (
        <a
          href={url}
          download={file.name}
          onClick={record}
          className="ml-2 text-xs text-action hover:underline"
          data-testid={`${testId}-download`}
        >
          {t('rfxFiles.download')}
        </a>
      ) : null}
    </span>
  );
};

// ── The "Documents" comparison cell ─────────────────────────────────────────

/**
 * "Complete", or "Missing: <request names>" against the required requests
 * (NR-1 buyer step 6). Reads `missingRequiredDocuments`, the list the submit
 * refusal reads (RFX-R2).
 * @type {React.FC<{ requests: readonly DocumentRequest[]; documents: readonly Pick<ResponseDocument, 'requestId'>[]; testId: string; }>}
 */
export const DocumentsStatus = ({ requests, documents, testId }) => {
  const { t } = useTranslation();
  if (!requests.some((r) => r.required)) {
    return (
      <span className="text-xs text-text-tertiary" data-testid={testId}>
        {t('rfxFiles.docs.noRequests')}
      </span>
    );
  }
  const missing = missingRequiredDocuments(requests, documents);
  return (
    <span data-testid={testId}>
      {missing.length === 0 ? (
        <StatusPill variant="success">{t('rfxFiles.docs.complete')}</StatusPill>
      ) : (
        <StatusPill variant="warning">
          {t('rfxFiles.docs.missing', { names: missing.map((r) => r.name).join(', ') })}
        </StatusPill>
      )}
    </span>
  );
};

// ── The panel ───────────────────────────────────────────────────────────────

/** A version as B2 records it; only what the panel reads. */
/**
 * @typedef {{
 *     readonly number: number;
 *     readonly documents?: readonly ResponseDocument[];
 *   }} VersionLike
 */

/** One supplier's response, as the panel reads it. */
/**
 * `status`:  A `Draft` is never shown (BR-07).
 * `versions`:  B2's version history, oldest first. Absent until B2.
 *
 * @typedef {{
 *     readonly id: string;
 *     readonly supplierId: string;
 *     readonly supplierName: string;
 *     readonly status: string;
 *     readonly documents?: readonly ResponseDocument[];
 *     readonly versions?: readonly VersionLike[];
 *   }} SupplierDocumentsResponse
 */

/**
 * @typedef {object} PanelProps
 * @property {readonly DocumentRequest[]} [requests]
 * @property {readonly SupplierDocumentsResponse[]} responses
 * @property {(supplierId: string) => string} deadlineFor -  The deadline in force for a supplier: a certificate is judged against it.
 * @property {string} testId
 */

/** @type {Record<UnattributedReason, string>} */
const UNATTRIBUTED_KEY = {
  NO_PERSON_IN_SESSION: 'rfxFiles.who.noPerson',
  IDENTITY_PROVIDER_UNAVAILABLE: 'rfxFiles.who.idpDown'
};

/**
 * @param {TFunction} t
 * @param {ActorAttribution} actor
 * @returns {string}
 */
const who = (t, actor) =>
  actor.kind === 'RESOLVED' ? actor.person.displayName : t(UNATTRIBUTED_KEY[actor.reason]);

/**
 * The version a file arrived with: the first version holding it, else the latest.
 * @param {ResponseDocument} doc
 * @param {readonly VersionLike[]} versions
 * @returns {number | null}
 */
const versionOf = (doc, versions) => {
  const first = versions.find((v) =>
    (v.documents ?? []).some((d) => d.attachment.id === doc.attachment.id)
  );
  return first?.number ?? versions[versions.length - 1]?.number ?? null;
};

/** @type {React.FC<PanelProps>} */
export const SupplierDocumentsPanel = ({ requests = [], responses, deadlineFor, testId }) => {
  const { t } = useTranslation();
  // The access log lives in the file seam; a recorded open re-reads it.
  const [, reread] = useReducer(/** @param {number} n */ (n) => n + 1, 0);
  const submitted = responses.filter((r) => r.status !== 'Draft');
  const showVersion = submitted.some((r) => (r.versions?.length ?? 0) > 0);

  return (
    <section
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-x-auto"
      data-testid={testId}
    >
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-text-primary">{t('rfxFiles.title')}</h3>
        <p className="text-xs text-text-tertiary mt-1">{t('rfxFiles.subtitle')}</p>
      </div>
      {submitted.length === 0 ? (
        <p
          className="px-4 py-6 text-center text-sm text-text-tertiary"
          data-testid={`${testId}-empty`}
        >
          {t('rfxFiles.empty')}
        </p>
      ) : (
        submitted.map((r) => (
          <SupplierFiles
            key={r.id}
            response={r}
            requests={requests}
            deadline={deadlineFor(r.supplierId)}
            showVersion={showVersion}
            testId={`${testId}-${r.supplierId}`}
            onOpened={reread}
          />
        ))
      )}
      <p
        className="px-4 py-3 text-xs text-text-tertiary border-t border-border-subtle"
        data-testid={`${testId}-note`}
      >
        {t('attachments.sessionOnly')}
      </p>
    </section>
  );
};

/** @type {React.FC<{ response: SupplierDocumentsResponse; requests: readonly DocumentRequest[]; deadline: string; showVersion: boolean; testId: string; onOpened: () => void; }>} */
const SupplierFiles = ({ response, requests, deadline, showVersion, testId, onOpened }) => {
  const { t } = useTranslation();
  const documents = response.documents ?? [];
  return (
    <div className="border-t border-border-subtle first:border-t-0" data-testid={testId}>
      <div className="px-4 py-2 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-text-primary">{response.supplierName}</span>
        <DocumentsStatus requests={requests} documents={documents} testId={`${testId}-status`} />
      </div>
      {documents.length === 0 ? (
        <p className="px-4 pb-3 text-xs text-text-tertiary">{t('rfxFiles.noFiles')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfxFiles.col.request')}</TableHeaderCell>
            <TableHeaderCell>{t('rfxFiles.col.file')}</TableHeaderCell>
            <TableHeaderCell>{t('rfxFiles.col.type')}</TableHeaderCell>
            <TableHeaderCell>{t('rfxFiles.col.size')}</TableHeaderCell>
            <TableHeaderCell>{t('rfxFiles.col.uploaded')}</TableHeaderCell>
            <TableHeaderCell>{t('rfxFiles.col.uploadedBy')}</TableHeaderCell>
            {showVersion ? <TableHeaderCell>{t('rfxFiles.col.version')}</TableHeaderCell> : null}
            <TableHeaderCell>{t('rfxFiles.col.certificate')}</TableHeaderCell>
            <TableHeaderCell>{t('rfxFiles.col.openedBy')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                request={requests.find((q) => q.id === doc.requestId)}
                supplierName={response.supplierName}
                deadline={deadline}
                version={showVersion ? versionOf(doc, response.versions ?? []) : undefined}
                testId={`${testId}-file-${doc.id}`}
                onOpened={onOpened}
              />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

/**
 * `supplierName`:  The supplier the file belongs to (the response's own), shown beside the uploader.
 * `version`:  `undefined` = no version column; `null` = a column with no version known.
 * @type {React.FC<{ doc: ResponseDocument; request: DocumentRequest | undefined; supplierName: string; deadline: string; version: number | null | undefined; testId: string; onOpened: () => void; }>}
 */
const DocumentRow = ({ doc, request, supplierName, deadline, version, testId, onOpened }) => {
  const { t } = useTranslation();
  return (
    <TableRow data-testid={testId}>
      <TableCell className="text-sm text-text-primary">
        {request?.name ?? t('rfxFiles.otherDocuments')}
      </TableCell>
      <TableCell className="text-sm">
        <FileOpenLink
          file={doc.attachment}
          testId={`${testId}-link`}
          withDownload
          onOpened={onOpened}
        />
      </TableCell>
      <TableCell className="text-sm text-text-secondary">
        {request ? t(`rfxFiles.type.${request.type}`) : '—'}
      </TableCell>
      <TableCell>
        <Data>{formatBytes(doc.attachment.size)}</Data>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Data>{formatDateTime(doc.uploadedAt)}</Data>
      </TableCell>
      <TableCell className="text-xs text-text-secondary" data-testid={`${testId}-uploaded-by`}>
        {doc.uploadedBy
          ? t('rfxFiles.uploadedByLine', {
              who: rfxActorName(t, doc.uploadedBy),
              supplier: supplierName
            })
          : t('rfxFiles.uploadedByNotRecorded')}
      </TableCell>
      {version !== undefined && (
        <TableCell data-testid={`${testId}-version`}>
          <Data>{version === null ? '—' : t('rfxFiles.version', { n: version })}</Data>
        </TableCell>
      )}
      <TableCell className="text-xs text-text-secondary" data-testid={`${testId}-cert`}>
        <CertificateCell doc={doc} deadline={deadline} testId={`${testId}-cert`} />
      </TableCell>
      <TableCell className="text-xs text-text-secondary">
        <OpenedBy fileId={doc.attachment.id} testId={`${testId}-opened`} />
      </TableCell>
    </TableRow>
  );
};

/** @type {React.FC<{ doc: ResponseDocument; deadline: string; testId: string }>} */
const CertificateCell = ({ doc, deadline, testId }) => {
  const { t } = useTranslation();
  const c = doc.certificate;
  if (!c) return <span>—</span>;
  const expired = certificateExpired(doc, deadline);
  return (
    <div>
      {c.number ? <div>{t('rfxFiles.cert.number', { number: c.number })}</div> : null}
      {c.issuer ? <div>{t('rfxFiles.cert.issuer', { issuer: c.issuer })}</div> : null}
      {c.expiresOn ? (
        <div>
          {t('rfxFiles.cert.expires')} <Data>{formatDate(c.expiresOn)}</Data>
          {expired ? (
            <span
              className="ml-1"
              data-testid={`${testId}-expired`}
              title={t('rfxFiles.cert.expiredHint')}
            >
              <StatusPill variant="danger">{t('rfxFiles.cert.expired')}</StatusPill>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

/** @type {React.FC<{ fileId: string; testId: string }>} */
const OpenedBy = ({ fileId, testId }) => {
  const { t } = useTranslation();
  const { files } = useDataService();
  const log = files.accessLog(fileId);
  if (log.length === 0) return <span data-testid={testId}>{t('rfxFiles.notOpened')}</span>;
  // One line per person: how many times, and the latest. The log itself stays
  // whole in the seam; this is only how it reads.
  const byWho = /** @type {Map<string, { count: number; last: string }>} */ (new Map());
  for (const entry of log) {
    const name = who(t, entry.by);
    const prior = byWho.get(name);
    byWho.set(name, { count: (prior?.count ?? 0) + 1, last: entry.at });
  }
  return (
    <ul data-testid={testId}>
      {[...byWho.entries()].map(([name, { count, last }]) => (
        <li key={name} data-testid={`${testId}-entry`}>
          {t('rfxFiles.openedLine', { who: name, count })} <Data>{formatDateTime(last)}</Data>
        </li>
      ))}
    </ul>
  );
};

export default SupplierDocumentsPanel;
