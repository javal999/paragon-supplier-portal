// ────────────────────────────────────────────────────────────────────────────
// The comparison export (RFx spec, B1 review fix (c)): the board's "Export" and
// the RFQ panel's "Export comparison" hand the buyer a CSV of the comparison —
// items × suppliers × breaks for a tiered RFQ, one row per quote for a legacy
// one. Current bid versions only. The file is built in the browser and nothing
// is sent anywhere.
// ────────────────────────────────────────────────────────────────────────────

/** @import { TFunction } from 'i18next' */
/** @import { RFQ } from '@data/mockRfqs' */
/** @import { Quotation } from '@data/mockQuotations' */
import { COMPARISON_CSV_HEADER_KEYS } from '@lib/i18n/rfqCompare';
import { comparisonCsv, comparisonRows, currentVersions } from '@services/sourcing/rfqComparison';
import { downloadText } from '../forecasts/forecastDisplay';

/**
 * The CSV text for these RFQs' comparisons, and how many rows it holds.
 * @param {readonly RFQ[]} rfqs
 * @param {readonly Quotation[]} quotes
 * @param {(id: string) => string} supplierName
 * @param {TFunction} t
 * @returns {{ csv: string; rows: number }}
 */
export function buildComparisonCsv(rfqs, quotes, supplierName, t) {
  const rows = rfqs.flatMap((rfq) =>
    comparisonRows(rfq, currentVersions(quotes.filter((q) => q.rfqId === rfq.id)), supplierName)
  );
  return {
    csv: comparisonCsv(
      rows,
      COMPARISON_CSV_HEADER_KEYS.map((k) => t(k))
    ),
    rows: rows.length
  };
}

/**
 * Download the comparison. Returns the row count so the caller can say, rather
 * than download an empty file, that there was nothing to export.
 * @param {string} filename
 * @param {readonly RFQ[]} rfqs
 * @param {readonly Quotation[]} quotes
 * @param {(id: string) => string} supplierName
 * @param {TFunction} t
 * @returns {number}
 */
export function downloadComparison(filename, rfqs, quotes, supplierName, t) {
  const { csv, rows } = buildComparisonCsv(rfqs, quotes, supplierName, t);
  if (rows > 0) downloadText(filename, csv);
  return rows;
}
