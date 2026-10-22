/** @import React from 'react' */
/** @import { SupplierDocument } from '@services/data/types' */
/** @import { UseToastReturn } from '@hooks/useToast' */
import { Eye, RefreshCw, Upload } from 'lucide-react';
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
 *   declaration panel for this document (awaiting upload or refused).
 * @property {(open: boolean) => void} setLessonOpen  Opens the halal-renewal walkthrough
 *   (page state: the BPJPH notice opens it too).
 * @property {UseToastReturn['toast']} toast  The page's toast function ("View").
 */

/**
 * One document row: name, notes, refusal block and linked-to line; category,
 * issuer, issued date, expiry with days remaining, the computed status badge,
 * version, and the declare / view / renew actions. Moved out of
 * `SupplierDocuments.jsx` by the Phase 5 page split (no behaviour change).
 * @type {React.FC<DocumentRowProps>}
 */
const DocumentRow = ({ doc, nowIso, openUploadFor, setLessonOpen, toast }) => {
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
            <Button variant="outline" icon={Upload} onClick={() => openUploadFor(doc)}>
              {doc.status === 'Rejected'
                ? t('supplierDocuments.action.redeclare')
                : t('supplierDocuments.action.declare')}
            </Button>
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
              opinion on one page. Same window, one declaration. */}
          {doc.expiryDate && days !== null && days <= DOCUMENT_EXPIRING_WINDOW_DAYS && (
            <Button variant="secondary" onClick={() => setLessonOpen(true)}>
              {t('supplierDocuments.action.renew')}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default DocumentRow;
