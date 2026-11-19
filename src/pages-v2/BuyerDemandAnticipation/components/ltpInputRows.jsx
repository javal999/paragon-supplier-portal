import Data from '@components/ui-v2/Data';
import TermLabel from '@components/ui-v2/TermLabel';
import { formatNumber } from '@lib/format';
/** @import { RowLtpInputs } from '@services/data/mock/demandAnticipationReadModel' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */

// ─────────────────────────────────────────────────────────────────────────────
// PSC-4 BR-09 (BL-339) — the rows LTP inputs add to the Demand anticipation
// grid: LTP A (DA's series), LTP Festive and LTP B, each as an INPUT.
// ⚠️ THE CHOSEN-LTP MARKER IS GONE (BR-09): DA reads LTP A (BR-01, BR-02), so a
// marker would name a choice that no longer decides anything. The per-week
// buffer rows are gone too — model A's buffers are quantities on Safety stock
// targets, and ROP Order adds them once, not week by week.
// Shown for a material that has an upload; otherwise the grid is as it was.
// Every number is the read's (`withLtpInputsRead`); none is computed here.
// ─────────────────────────────────────────────────────────────────────────────

const dash = <span className="text-text-tertiary">—</span>;

/**
 * @param {{ ltpInputs?: RowLtpInputs; uom: string }} row
 * @param {string} rowKey
 * @returns {{ aRow: Partial<WeekGridRow> | null; extra: WeekGridRow[] }}
 */
export function ltpInputRows(row, rowKey) {
  const li = row.ltpInputs;
  if (!li || !li.hasUpload) return { aRow: null, extra: [] };
  /** @param {string} week */
  const at = (week) => li.byWeek[week];
  /**
   * @param {string} id
   * @param {'ltpFestive' | 'ltpB'} term
   * @param {'Festive' | 'B'} s
   * @param {'festive' | 'b'} field
   * @returns {WeekGridRow}
   */
  const series = (id, term, s, field) => ({
    id,
    label: <TermLabel term={term} />,
    unit: row.uom,
    combine: 'sum',
    value: (week) => at(week)?.[field] ?? 0,
    cell: (week) => {
      const v = at(week)?.[field];
      return v === null || v === undefined ? (
        dash
      ) : (
        <Data data-testid={`dant-ltp${s}-${rowKey}-${week}`}>{formatNumber(v)}</Data>
      );
    }
  });
  return {
    aRow: {
      label: <TermLabel term="ltpA" />,
      value: (week) => at(week)?.a ?? 0,
      cell: (week) => (
        <Data data-testid={`dant-ltp-${rowKey}-${week}`}>{formatNumber(at(week)?.a ?? 0)}</Data>
      )
    },
    extra: [
      series('ltpFestive', 'ltpFestive', 'Festive', 'festive'),
      series('ltpB', 'ltpB', 'B', 'b')
    ]
  };
}
