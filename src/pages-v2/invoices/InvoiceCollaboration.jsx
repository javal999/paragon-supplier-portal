import React from 'react';
import { useTranslation } from 'react-i18next';
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import { formatDate } from '@lib/format';
/** @import { StatusTone } from '@lib/statusTone' */
/** @import { Invoice, InvoiceLine, InvoiceMatchStatus } from '@services/data/types' */
import { normalizeQty } from '@lib/localeNumber';
/** @import { InvoiceLinePriceCheck, PriceCheck } from '@services/transitions' */
import { invoicePriceTolerance, checkInvoicePrices } from '@services/transitions';

// ─────────────────────────────────────────────────────────────────────────────
// Invoice collaboration pieces shared by the supplier and Finance screens
// (REQ-E07-07): the match result in business words, and the invoiced lines.
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<InvoiceMatchStatus, string>} */
const MATCH_KEY = {
  Matched: 'matched',
  'Price Variance': 'priceVariance',
  'Qty Mismatch': 'qtyMismatch',
  Pending: 'pending',
  'Pending GR': 'pendingGr'
};

/** @type {Record<InvoiceMatchStatus, StatusTone>} */
const MATCH_TONE = {
  Matched: 'success',
  'Price Variance': 'danger',
  'Qty Mismatch': 'danger',
  Pending: 'neutral',
  'Pending GR': 'neutral'
};

/**
 * "Matched" / "Exception: price variance" / … as a pill.
 * @type {React.FC<{ status: InvoiceMatchStatus }>}
 */
export const MatchPill = ({ status }) => {
  const { t } = useTranslation();
  return (
    <StatusPill variant={MATCH_TONE[status]}>{t(`fc.inv.match.${MATCH_KEY[status]}`)}</StatusPill>
  );
};

/**
 * The match result with its one-line explanation (CR-12 / CR-13).
 * @type {React.FC<{ status: InvoiceMatchStatus }>}
 */
export const MatchResult = ({ status }) => {
  const { t } = useTranslation();
  const explain = status === 'Pending GR' ? 'pending' : MATCH_KEY[status];
  return (
    <section data-testid="invoice-match-result">
      <h3 className="text-label text-text-tertiary uppercase mb-2">{t('fc.inv.match.title')}</h3>
      <MatchPill status={status} />
      <p className="mt-1 text-xs text-text-secondary">
        {t(`fc.inv.match.explain.${explain}`, {
          contractPct: invoicePriceTolerance().contractPricePct,
          pct: invoicePriceTolerance().standardPct,
          cap: fmtIdr(invoicePriceTolerance().standardCapIdr)
        })}
      </p>
    </section>
  );
};

/**
 * @param {number} n
 * @returns {string}
 */
export function fmtIdr(n) {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

/**
 * A signed rupiah difference, so "more" and "less" are told apart on sight.
 * @param {number} n
 * @returns {string}
 */
const fmtSignedIdr = (n) => (n > 0 ? `+${fmtIdr(n)}` : `-${fmtIdr(Math.abs(n))}`);

/**
 * @param {number} n
 * @returns {string}
 */
const fmtPct = (n) => `${n.toFixed(2)}%`;

/**
 * CR-12 (BL-44) — which rule applied to one price, and what it decided. The
 * tolerances are read from `fulfilmentConfig.js`, never written here, so the
 * screen cannot disagree with the rule.
 * @type {React.FC<{ check: PriceCheck; contractNumber?: string | null; testId?: string; }>}
 */
export const PriceCheckCell = ({ check, contractNumber, testId }) => {
  const { t } = useTranslation();
  const rule =
    check.rule === 'contract'
      ? t('fc.inv.price.rule.contract', {
          contract: contractNumber ?? '',
          pct: invoicePriceTolerance().contractPricePct
        })
      : t('fc.inv.price.rule.standard', {
          pct: invoicePriceTolerance().standardPct,
          cap: fmtIdr(invoicePriceTolerance().standardCapIdr)
        });
  return (
    <div data-testid={testId}>
      <div className="text-[length:var(--fs-label-3)] text-text-tertiary">{rule}</div>
      <div className={check.held ? 'text-danger font-semibold' : 'text-success'}>
        {t(`fc.inv.price.outcome.${check.outcome}`, {
          diff: fmtSignedIdr(check.difference),
          percent: check.percent === null ? '' : fmtPct(check.percent),
          pct:
            check.rule === 'contract'
              ? invoicePriceTolerance().contractPricePct
              : invoicePriceTolerance().standardPct,
          cap: fmtIdr(invoicePriceTolerance().standardCapIdr)
        })}
      </div>
    </div>
  );
};

/**
 * A typed quantity read by the one legal parser; NaN when unreadable.
 * @param {string} raw
 * @returns {number}
 */
export const readQty = (raw) => {
  const r = normalizeQty(raw);
  return r.ok ? r.value : Number.NaN;
};

/**
 * Invoiced lines, read-only, with the documents the supplier attached — and,
 * per line, WHICH CR-12 rule applied and why the line passes or is held
 * (BL-44). `amount` is the invoice total: any part of it the lines do not
 * account for is checked on its own and shown under the table.
 * `matchStatus`: The match result RECORDED when the invoice was checked (BL-32). The line
 * checks above are re-read under the tolerances in force NOW, so when the
 * administrator has changed a tolerance since, the two can disagree — and the
 * page says so rather than showing two answers without comment.
 * @type {React.FC<{ lines: readonly InvoiceLine[]; invoiceDate: string | null; taxInvoiceFile: string | null; amount?: number; matchStatus?: InvoiceMatchStatus; }>}
 */
export const InvoiceLinesSection = ({
  lines,
  invoiceDate,
  taxInvoiceFile,
  amount,
  matchStatus
}) => {
  const { t } = useTranslation();
  const priced =
    amount === undefined
      ? null
      : checkInvoicePrices(
          /** @type {Pick<Invoice, 'amount' | 'lines'>} */ ({
            amount,
            lines: /** @type {InvoiceLine[]} */ (lines)
          })
        );
  /**
   * @param {InvoiceLine} l
   * @returns {InvoiceLinePriceCheck | undefined}
   */
  const checkFor = (l) =>
    priced?.lines.find((c) => c.receiptId === l.receiptId && c.materialCode === l.materialCode);
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
              {lines.map((l) => {
                const c = checkFor(l);
                return (
                  <React.Fragment key={`${l.receiptId}|${l.materialCode}`}>
                    <tr className="border-t border-border-subtle">
                      <td className="py-1.5 pr-2">
                        <Data>{l.grNumber}</Data>
                      </td>
                      <td className="py-1.5 pr-2">
                        <Data
                          as="div"
                          className="text-[length:var(--fs-label-3)] text-text-tertiary"
                        >
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
                    {/* CR-12 (BL-44) — the price check sits on its own row under
                        the line, full width, so the reason is never scrolled
                        out of a narrow panel. */}
                    {c && (
                      <tr>
                        <td colSpan={5} className="pb-2">
                          <div className="rounded bg-bg-hover px-2 py-1.5">
                            <div className="text-[length:var(--fs-label-3)] text-text-tertiary">
                              {t('fc.inv.price.col.check')} · {t('fc.inv.price.col.billed')}{' '}
                              <Data>{fmtIdr(c.billed)}</Data>
                            </div>
                            <PriceCheckCell
                              check={c}
                              contractNumber={c.contractNumber}
                              testId={`invoice-line-check-${l.receiptId}-${l.materialCode}`}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {priced?.unsplit && (
        <div className="mt-2 text-xs" data-testid="invoice-unsplit-check">
          <div className="text-text-secondary">
            {t('fc.inv.price.unsplit.title', { diff: fmtSignedIdr(priced.unsplit.difference) })}
          </div>
          <PriceCheckCell check={priced.unsplit} />
          <div className="text-text-tertiary">{t('fc.inv.price.unsplit.note')}</div>
        </div>
      )}
      {priced &&
        lines.length > 0 &&
        matchStatus !== undefined &&
        ((matchStatus === 'Price Variance' && !priced.held) ||
          (matchStatus === 'Matched' && priced.held)) && (
          <p className="mt-2 text-xs text-warning-hover" data-testid="invoice-tolerance-changed">
            {t(
              priced.held
                ? 'fc.inv.price.changedSince.nowHeld'
                : 'fc.inv.price.changedSince.nowPasses'
            )}
          </p>
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
