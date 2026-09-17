import React from 'react';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { formatDate } from '../../lib/format';
import type { StatusTone } from '../../lib/statusTone';
import type { InvoiceLine, InvoiceMatchStatus } from '../../services/data/types';
import { normalizeQty } from '../../lib/localeNumber';

// ─────────────────────────────────────────────────────────────────────────────
// Invoice collaboration pieces shared by the supplier and Finance screens
// (REQ-E07-07): the match result in business words, and the invoiced lines.
// ─────────────────────────────────────────────────────────────────────────────

const MATCH_KEY: Record<InvoiceMatchStatus, string> = {
  Matched: 'matched',
  'Price Variance': 'priceVariance',
  'Qty Mismatch': 'qtyMismatch',
  Pending: 'pending',
  'Pending GR': 'pendingGr',
};

const MATCH_TONE: Record<InvoiceMatchStatus, StatusTone> = {
  Matched: 'success',
  'Price Variance': 'danger',
  'Qty Mismatch': 'danger',
  Pending: 'neutral',
  'Pending GR': 'neutral',
};

/** "Matched" / "Exception: price variance" / … as a pill. */
export const MatchPill: React.FC<{ status: InvoiceMatchStatus }> = ({ status }) => {
  const { t } = useTranslation();
  return <StatusPill variant={MATCH_TONE[status]}>{t(`fc.inv.match.${MATCH_KEY[status]}`)}</StatusPill>;
};

/** The match result with its one-line explanation (CR-12 / CR-13). */
export const MatchResult: React.FC<{ status: InvoiceMatchStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const explain = status === 'Pending GR' ? 'pending' : MATCH_KEY[status];
  return (
    <section data-testid="invoice-match-result">
      <h3 className="text-label text-text-tertiary uppercase mb-2">{t('fc.inv.match.title')}</h3>
      <MatchPill status={status} />
      <p className="mt-1 text-xs text-text-secondary">{t(`fc.inv.match.explain.${explain}`)}</p>
    </section>
  );
};

export const fmtIdr = (n: number): string => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

/** A typed quantity read by the one legal parser; NaN when unreadable. */
export const readQty = (raw: string): number => {
  const r = normalizeQty(raw);
  return r.ok ? r.value : Number.NaN;
};

/** Invoiced lines, read-only, with the documents the supplier attached. */
export const InvoiceLinesSection: React.FC<{
  lines: readonly InvoiceLine[];
  invoiceDate: string | null;
  taxInvoiceFile: string | null;
}> = ({ lines, invoiceDate, taxInvoiceFile }) => {
  const { t } = useTranslation();
  return (
    <section data-testid="invoice-lines">
      <h3 className="text-label text-text-tertiary uppercase mb-2">{t('fc.inv.detail.lines')}</h3>
      {lines.length === 0 ? (
        <p className="text-xs text-text-tertiary">{t('fc.inv.detail.noLines')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-tertiary uppercase">
                <th className="text-left py-1 pr-2">{t('fc.inv.new.col.receipt')}</th>
                <th className="text-left py-1 pr-2">{t('fc.inv.new.col.material')}</th>
                <th className="text-right py-1 pr-2">{t('fc.inv.new.col.quantity')}</th>
                <th className="text-right py-1 pr-2">{t('fc.inv.new.col.unitPrice')}</th>
                <th className="text-right py-1">{t('fc.inv.new.col.value')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={`${l.receiptId}|${l.materialCode}`} className="border-t border-border-subtle">
                  <td className="py-1.5 pr-2">
                    <Data>{l.grNumber}</Data>
                  </td>
                  <td className="py-1.5 pr-2">
                    <Data as="div" className="text-[11px] text-text-tertiary">
                      {l.materialCode}
                    </Data>
                    <div className="text-text-primary">{l.description}</div>
                  </td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                    <Data>{`${l.quantity.toLocaleString('en-US')} ${l.uom ?? ''}`}</Data>
                  </td>
                  <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                    <Data>{fmtIdr(l.unitPrice)}</Data>
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    <Data>{fmtIdr(l.quantity * l.unitPrice)}</Data>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(invoiceDate || taxInvoiceFile) && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-text-tertiary">{t('fc.inv.detail.invoiceDate')}</dt>
            <dd>
              <Data>{formatDate(invoiceDate)}</Data>
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('fc.inv.detail.taxInvoice')}</dt>
            <dd className="text-text-primary break-all">{taxInvoiceFile ?? '—'}</dd>
          </div>
        </dl>
      )}
    </section>
  );
};
