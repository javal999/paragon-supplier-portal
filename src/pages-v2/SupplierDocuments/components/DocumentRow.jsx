/** @import React from 'react' */
/** @import { SupplierDocument } from '@services/data/types' */
/** @import { UseToastReturn } from '@hooks/useToast' */
import { Eye, FileText, RefreshCw, Upload } from 'lucide-react';
import StatusPill from '@components/ui-v2/StatusPill';
import TableRow from '@components/ui-v2/TableRow';
import TableCell from '@components/ui-v2/TableCell';
import Button from '@components/ui-v2/Button';
import Data from '@components/ui-v2/Data';
import { daysUntil, DOCUMENT_EXPIRING_WINDOW_DAYS } from '@services/data/dayProjection';
import {
  documentDisplayState,
  DISPLAY_STATE_LABEL_KEY,
  DISPLAY_STATE_TONE
} from '@services/data/documentDisplayState';
import { formatDate } from '@lib/format';
import { useTranslation } from 'react-i18next';
import RefusalBlock from './RefusalBlock';

/**
 * @typedef {object} DocumentRowProps
 * @property {SupplierDocument} doc
 * @property {string} nowIso  The page's ONE clock read; every expiry figure on
 *   the row is answered against it.
 * @property {(doc: SupplierDocument) => void} openUploadFor  Opens the
 *   certificate declaration panel (awaiting upload or refused).
 * @property {(doc: SupplierDocument) => void} openAnswerFor  UCX-P5 — opens the
 *   COA form for a row PTI asked for as a COA.
 * @property {(doc: SupplierDocument) => void} openRenewFor  UCX-P5 — opens the
 *   declaration filled from this expiring record.
 * @property {UseToastReturn['toast']} toast  The page's toast function ("View").
 */

/**
 * One document row: name, notes, refusal block and linked-to line; category,
 * issuer, issued date, expiry with days remaining, the computed status badge,
 * version, and the answer / declare / view / renew actions. Moved out of
 * `SupplierDocuments.jsx` by the Phase 5 page split (no behaviour change).
 *
 * UCX-P5 — "Renew" opens the declaration filled from this record (it used to
 * open a read-only guide that could not be submitted), and a COA request's
 * remedy is "Answer", which opens the COA form rather than the certificate one.
 * @type {React.FC<DocumentRowProps>}
 */
const DocumentRow = ({ doc, nowIso, openUploadFor, openAnswerFor, openRenewFor, toast }) => {
  const { t } = useTranslation();
  const days = daysUntil(doc.expiryDate, nowIso);
  // ONE decision per row, read by the badge below. Every surface
  // that renders this document calls the SAME function with the
  // same instant, which is what stops the page and the dashboard
  // disagreeing about a certificate the way they could before.
  const display = documentDisplayState(doc, nowIso);
  const expiryColor =
    days === null
      ? 'text-text-tertiary'
      : days <= 0
        ? 'text-danger'
        : days <= 90
          ? 'text-warning-hover'
          : 'text-text-tertiary';
  return (
    <TableRow>
      <TableCell>
        <div className="font-semibold text-text-primary text-sm max-w-[18rem]">{doc.name}</div>
        {doc.notes && (
          <div className="text-xs text-warning-hover mt-0.5 max-w-[18rem]">⚠ {doc.notes}</div>
        )}
        <RefusalBlock doc={doc} />
        <div className="text-xs text-text-tertiary mt-0.5">
          {t('supplierDocuments.row.linked', { value: doc.linkedTo })}
        </div>
      </TableCell>
      <TableCell>
        {/* Category pill renders the canonical EN token: no central
            category-label map yet (filter-vs-pill split, see fragment header). */}
        <StatusPill variant="neutral">{doc.category}</StatusPill>
      </TableCell>
      <TableCell className="text-text-tertiary text-xs max-w-[12rem]">{doc.issuedBy}</TableCell>
      <TableCell className="text-text-tertiary text-xs whitespace-nowrap">
        <Data>{formatDate(doc.issuedDate)}</Data>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {doc.expiryDate ? (
          <div>
            <Data
              as="div"
              className={`text-xs ${
                days !== null && days <= 90 ? 'text-warning-hover' : 'text-text-tertiary'
              }`}
            >
              {formatDate(doc.expiryDate)}
            </Data>
            {days !== null && (
              <div className={`text-xs ${expiryColor}`}>
                {days > 0
                  ? t('supplierDocuments.expiry.remaining', { count: days })
                  : t('supplierDocuments.expiry.expiredAgo', {
                      count: Math.abs(days)
                    })}
              </div>
            )}
          </div>
        ) : (
          <span className="text-text-tertiary text-xs">{t('supplierDocuments.expiry.none')}</span>
        )}
      </TableCell>
      <TableCell>
        {/* ⚠️ **THE BADGE IS COMPUTED AND THE LABEL COMES FROM A
            KEY, NOT FROM THE ROW.** It rendered `doc.status`
            verbatim and leaned on `StatusPill` to localize the
            canonical token; that still works, and is exactly why
            the stored read was invisible — EN output was
            identical either way. Resolving `t(…)` here says
            WHICH state was decided, and by what. */}
        <StatusPill variant={DISPLAY_STATE_TONE[display]}>
          {display === 'under-review' ? (
            <span className="inline-flex items-center gap-1">
              <RefreshCw size={10} />
              {t(DISPLAY_STATE_LABEL_KEY[display])}
            </span>
          ) : (
            t(DISPLAY_STATE_LABEL_KEY[display])
          )}
        </StatusPill>
      </TableCell>
      <TableCell className="text-text-tertiary text-xs">
        <Data>{doc.version}</Data>
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex gap-1.5">
          {/* ⚠️ **THE REFUSED ROW GAINS A REMEDY, AND §80's REASON
              FOR WITHHOLDING ONE IS THE REASON IT CAN NOW HAVE IT.**
              That batch wrote: *"a resubmit button here would be a
              forward promise with no handler: `supplierdoc:upload`
              is unauthored"* (`FORWARD-PROMISE-HAS-NO-HANDLER-01`).
              The verb exists as of §82, so the promise has a
              handler — `t_supplierdoc_submit` accepts `Rejected` as
              a `from` precisely so a refusal is not a dead end. */}
          {doc.status === 'Awaiting Upload' || doc.status === 'Rejected' ? (
            doc.requestKind === 'COA' ? (
              // UCX-P5 · UCX-F14 — a COA request's remedy is its own form: batch,
              // number, issuer, date. "Declare again" would reopen the certificate
              // form and repeat the finding.
              <Button variant="outline" icon={FileText} onClick={() => openAnswerFor(doc)}>
                {t('supplierDocuments.action.answer')}
              </Button>
            ) : (
              <Button variant="outline" icon={Upload} onClick={() => openUploadFor(doc)}>
                {doc.status === 'Rejected'
                  ? t('supplierDocuments.action.redeclare')
                  : t('supplierDocuments.action.declare')}
              </Button>
            )
          ) : (
            <Button
              variant="secondary"
              icon={Eye}
              onClick={() =>
                toast({
                  title: t('supplierDocuments.toast.downloading', {
                    name: doc.name
                  })
                })
              }
            >
              {t('supplierDocuments.action.view')}
            </Button>
          )}
          {/* ⚠️ `180` STOOD HERE AS A LITERAL, a fourth clock
              opinion on one page. Same window, one declaration.
              ⚠️ UCX-P5 — THE CONTROL CHECKS THE COMPUTED STATE, not the raw day
              count: after a renewal the record reads `under-review` and the
              declaration already exists, so a second "Renew" would open a form
              the verb refuses. Before the renewal the state is expiring/expired
              and the control is offered (UCX-F21). */}
          {doc.expiryDate &&
            days !== null &&
            days <= DOCUMENT_EXPIRING_WINDOW_DAYS &&
            (display === 'expiring' || display === 'expired') && (
              <Button variant="secondary" onClick={() => openRenewFor(doc)}>
                {t('supplierDocuments.action.renew')}
              </Button>
            )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default DocumentRow;
