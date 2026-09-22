import React from 'react';
import { useTranslation } from 'react-i18next';
import Data from '../../components/ui-v2/Data';
import { formatNumber } from '../../lib/format';
import type { RFQ } from '../../data/mockRfqs';
import type { Quotation } from '../../data/mockQuotations';
import { deriveQuoteHeader, tiersForItem, type QuotationItemQuote } from '../../services/sourcing/rfqModel';
import { headerLeadTimeDays } from '../../services/sourcing/rfqResponse';
import { readBidPrice } from './quotationPrice';

// ─────────────────────────────────────────────────────────────────────────────
// A NEGOTIATION ROUND ON A TIERED RFQ (RFx working spec, 2026-09-21): the
// supplier re-prices per item and per quantity break, not only the header unit
// price. Every other part of its last version — spec values, one-time costs,
// lead times, answers, sample offer — is carried forward unchanged, and the
// header is derived from the new prices as it is on a first quote.
// ─────────────────────────────────────────────────────────────────────────────

/** Typed prices by `<itemLineNo>:<tierQty>`. */
export type RevisionPrices = Readonly<Record<string, string>>;

const key = (lineNo: number, qty: number) => `${lineNo}:${qty}`;

/** The last version's prices, as editable text. */
export const revisionPricesFrom = (last: Quotation | null): RevisionPrices =>
  Object.fromEntries(
    (last?.itemQuotes ?? []).flatMap((q) => q.tierPrices.map((p) => [key(q.itemLineNo, p.tierQty), String(p.unitPrice)])),
  );

/**
 * The revision's fields, or `null` when a typed price cannot be read or a break
 * is left empty. The last version supplies everything but the prices.
 */
export function readRevision(
  rfq: RFQ,
  last: Quotation,
  typed: RevisionPrices,
): { unitPrice: number; leadTimeDays: number; itemQuotes: QuotationItemQuote[] } | null {
  const itemQuotes: QuotationItemQuote[] = [];
  for (const item of rfq.items ?? []) {
    const prev = last.itemQuotes?.find((q) => q.itemLineNo === item.lineNo);
    if (!prev) return null;
    const tierPrices = [];
    for (const tier of tiersForItem(rfq, item)) {
      const read = readBidPrice(typed[key(item.lineNo, tier.qty)] ?? '');
      if (!read.ok) return null;
      tierPrices.push({ tierQty: tier.qty, unitPrice: read.value });
    }
    itemQuotes.push({ ...prev, tierPrices });
  }
  const header = deriveQuoteHeader(rfq, itemQuotes);
  const lead = headerLeadTimeDays(itemQuotes) ?? last.leadTimeDays;
  return header ? { unitPrice: header.unitPrice, leadTimeDays: lead, itemQuotes } : null;
}

const TieredRevisionFields: React.FC<{
  rfq: RFQ;
  roundId: string;
  prices: RevisionPrices;
  disabled: boolean;
  onChange: (next: RevisionPrices) => void;
}> = ({ rfq, roundId, prices, disabled, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 w-full" data-testid={`tiered-revision-${roundId}`}>
      {(rfq.items ?? []).map((item) => (
        <div key={item.lineNo}>
          <div className="text-xs font-semibold text-text-secondary mb-1">
            {t('rfqResponse.grid.itemLabel', { n: item.lineNo, description: item.description })}
          </div>
          <div className="flex flex-wrap gap-2">
            {tiersForItem(rfq, item).map((tier) => {
              const k = key(item.lineNo, tier.qty);
              return (
                <label key={k} className="block">
                  <span className="block text-[11px] text-text-tertiary">
                    <Data>{formatNumber(tier.qty)}</Data>{' '}
                    {t(tier.basis === 'perVariant' ? 'rfqResponse.basis.perVariant' : 'rfqResponse.basis.total')}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={disabled}
                    aria-label={t('rfqResponse.grid.priceAt', {
                      prefix: t('rfqResponse.grid.itemNo', { n: item.lineNo }),
                      qty: formatNumber(tier.qty),
                    })}
                    data-testid={`revision-${roundId}-${k}`}
                    value={prices[k] ?? ''}
                    onChange={(e) => onChange({ ...prices, [k]: e.target.value })}
                    className="w-28 bg-white border border-border-input rounded-md px-2 h-9 text-sm focus:outline-none focus:border-action disabled:bg-bg-hover"
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TieredRevisionFields;
