// ────────────────────────────────────────────────────────────────────────────
// MR-6 BR-05 to BR-09 — what the ASN surfaces show about shelf life: the line
// note ("Expiry <date> · <n> months left at ETA"), the exception request, the
// exception record on an ASN, and the blocked-stock marker carried to receipt.
//
// Nothing here decides. Every figure comes from the rules in
// `services/transitions/fulfilmentRules.js`, the same functions the verbs call.
// ────────────────────────────────────────────────────────────────────────────

/** @import React from 'react' */
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import { formatDate, formatDateTime, formatNumber } from '@lib/format';
/** @import { AsnLineRefusal, ShelfLifeLineView } from '@services/transitions/fulfilmentRules' */
import {
  approvedShelfLifeLines,
  shelfLifeExceptionOf
} from '@services/transitions/fulfilmentRules';
/** @import { ASN, AsnShelfLifeEvent } from '@services/data/types' */

const textareaClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action resize-y';

/**
 * Months to one decimal, in the UI language's convention.
 * @param {number} months
 * @returns {string}
 */
export const monthsText = (months) => formatNumber(Math.round(months * 10) / 10);

/**
 * The note under a line's expiry: months left at ETA, and why it blocks.
 * @type {React.FC<{ view: ShelfLifeLineView | null; expiry: string; refusal: AsnLineRefusal | null; materialCode: string; }>}
 */
export const ShelfLifeLineNote = ({ view, expiry, refusal, materialCode }) => {
  const { t } = useTranslation();
  const noteId = `asn-expiry-${materialCode}-note`;
  if (refusal === 'expiryRequired') {
    return (
      // BL-84 — the expiry field names this note.
      <div id={noteId} className="mt-1 text-[length:var(--fs-label-3)] text-danger">
        {t('fc.asn.shelfLife.expiryRequired')}
      </div>
    );
  }
  if (!view || view.monthsLeft === null) return null;
  return (
    <div
      id={noteId}
      data-testid={`asn-shelf-life-${materialCode}`}
      className={`mt-1 text-[length:var(--fs-label-3)] ${view.ok ? 'text-text-tertiary' : 'text-danger'}`}
    >
      {t('fc.asn.shelfLife.left', {
        expiry: formatDate(expiry),
        months: monthsText(view.monthsLeft)
      })}
      {view.ok ? null : <div>{t('fc.asn.shelfLife.short', { min: view.minMonths })}</div>}
    </div>
  );
};

/**
 * MR-6 BR-08 — submit is blocked; the supplier may ask Quality instead.
 * @type {React.FC<{ reason: string; onReasonChange: (v: string) => void; }>}
 */
export const ShelfLifeRequestBox = ({ reason, onReasonChange }) => {
  const { t } = useTranslation();
  return (
    <div
      data-testid="asn-shelf-life-request"
      className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 space-y-2"
    >
      <p role="alert" className="text-xs text-warning-hover">
        <span className="font-semibold">{t('fc.asn.shelfLife.request.title')}.</span>{' '}
        {t('fc.asn.shelfLife.request.body')}
      </p>
      <label className="block">
        <span className="block text-label text-text-tertiary uppercase mb-1">
          {t('fc.asn.shelfLife.request.reason')}
        </span>
        <textarea
          rows={2}
          value={reason}
          onChange={(ev) => onReasonChange(ev.target.value)}
          className={textareaClass}
        />
      </label>
    </div>
  );
};

/**
 * MR-6 BR-08 / BR-09 — the marker carried from an approved exception to receipt.
 * @type {React.FC<{ testId: string }>}
 */
export const BlockedStockMarker = ({ testId }) => {
  const { t } = useTranslation();
  return (
    <span
      data-testid={testId}
      className="inline-block px-1.5 py-0.5 rounded border border-warning bg-warning-soft text-[length:var(--fs-label-3)] text-warning-hover"
    >
      {t('fc.asn.shelfLife.blocked')}
    </span>
  );
};

/**
 * Whether an ASN line was approved into blocked stock (by material, batch and expiry).
 * @param {Pick<ASN, 'status' | 'shelfLifeException'>} asn
 * @param {{ materialCode: string; lotNumber: string; expiryDate?: string }} line
 * @returns {boolean}
 */
export const approvedIntoBlockedStock = (asn, line) =>
  approvedShelfLifeLines(asn).some(
    (l) =>
      l.materialCode === line.materialCode &&
      l.lotNumber === line.lotNumber.trim() &&
      l.expiryDate === line.expiryDate
  );

/** @type {React.FC<{ e: AsnShelfLifeEvent }>} */
const EventLine = ({ e }) => {
  const { t } = useTranslation();
  const head =
    e.kind === 'requested'
      ? t('fc.asn.shelfLife.event.requested', { eta: formatDate(e.eta) })
      : e.kind === 'etaChanged'
        ? t('fc.asn.shelfLife.event.etaChanged', {
            from: formatDate(e.previousEta),
            to: formatDate(e.eta)
          })
        : e.kind === 'approved'
          ? t('fc.asn.shelfLife.event.approved')
          : t('fc.asn.shelfLife.event.rejected');
  const reason = 'reason' in e ? e.reason : undefined;
  return (
    <li className="text-text-secondary">
      <Data className="text-text-tertiary">{formatDateTime(e.at)}</Data> · {head}
      {reason ? (
        <div className="text-text-primary">{t('fc.asn.shelfLife.event.reason', { reason })}</div>
      ) : null}
    </li>
  );
};

/**
 * MR-6 BR-09 — the exception on an ASN: where it stands, the lines it covers,
 * and every entry of its record in order (an earlier approval stays visible
 * after an ETA change reopened it, edge case 1). Renders nothing for an ASN
 * that never asked.
 * @type {React.FC<{ asn: Pick<ASN, 'asnNumber' | 'status' | 'shelfLifeException'>; children?: React.ReactNode; }>}
 */
export const ShelfLifeExceptionDetail = ({ asn, children }) => {
  const { t } = useTranslation();
  const view = shelfLifeExceptionOf(asn);
  if (!view) return null;
  const approved = approvedShelfLifeLines(asn).length > 0;
  return (
    <div
      data-testid={`asn-shelf-life-exception-${asn.asnNumber}`}
      className="border border-border-subtle rounded-md p-3 space-y-2 text-xs"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label text-text-tertiary uppercase">
          {t('fc.asn.shelfLife.detail.title')}
        </span>
        <span className="text-text-primary font-semibold">
          {view.state === 'pending'
            ? t('fc.asn.shelfLife.state.pending')
            : view.state === 'approved'
              ? t('fc.asn.shelfLife.state.approved')
              : t('fc.asn.shelfLife.state.rejected')}
        </span>
      </div>
      <ul className="space-y-1">
        {view.request.lines.map((l) => (
          <li key={`${l.materialCode}-${l.lotNumber}`} className="text-text-secondary">
            {t('fc.asn.shelfLife.line', {
              material: l.materialCode,
              batch: l.lotNumber,
              expiry: formatDate(l.expiryDate),
              min: l.minMonths
            })}
            {approved ? (
              <span className="ml-2">
                <BlockedStockMarker
                  testId={`asn-blocked-stock-${asn.asnNumber}-${l.materialCode}`}
                />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <ol className="space-y-1 border-t border-border-subtle pt-2">
        {view.history.map((e, i) => (
          // The record is append-only and shown oldest first, so an entry's
          // position never shifts; kind + at alone can repeat (same instant).
          // eslint-disable-next-line react/no-array-index-key -- append-only record in stored order: index i is the entry's fixed position
          <EventLine key={`${e.kind}-${e.at}-${i}`} e={e} />
        ))}
      </ol>
      {children}
    </div>
  );
};
