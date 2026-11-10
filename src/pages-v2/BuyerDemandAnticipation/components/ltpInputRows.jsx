/** @import { TFunction } from 'i18next' */
import Data from '@components/ui-v2/Data';
import StatusPill from '@components/ui-v2/StatusPill';
import TermLabel from '@components/ui-v2/TermLabel';
import { formatNumber } from '@lib/format';
/** @import { RowLtpInputs } from '@services/data/mock/demandAnticipationReadModel' */
/** @import { WeekGridRow } from '@components/ui-v2/WeekGrid' */

// ─────────────────────────────────────────────────────────────────────────────
// BL-267 (PEX-5 BR-03) — the rows LTP inputs add to the Demand anticipation
// grid: LTP A (as today), LTP Festive and LTP B, the one DA reads marked "in
// use", and the buffers they give (BR-05, BR-06). Shown for a material that has
// an upload; otherwise the grid is as it was. Every number is the read's
// (`withLtpInputsRead`); none is computed here.
// ─────────────────────────────────────────────────────────────────────────────

const dash = <span className="text-text-tertiary">—</span>;

/**
 * @param {{ ltpInputs?: RowLtpInputs; uom: string }} row
 * @param {string} rowKey
 * @param {TFunction} t
 * @returns {{ aRow: Partial<WeekGridRow> | null; extra: WeekGridRow[] }}
 */
export function ltpInputRows(row, rowKey, t) {
  const li = row.ltpInputs;
  if (!li || !li.hasUpload) return { aRow: null, extra: [] };
  /** @param {string} week */
  const at = (week) => li.byWeek[week];
  /** @param {'A' | 'Festive' | 'B'} s */
  const marker = (s) =>
    li.choice === s ? (
      <span data-testid={`dant-ltp-inuse-${rowKey}-${s}`}>
        <StatusPill variant="neutral">{t('ltpIn.inUse')}</StatusPill>
      </span>
    ) : null;
  /**
   * @param {string} id
   * @param {'ltpFestive' | 'ltpB'} term
   * @param {'Festive' | 'B'} s
   * @param {'festive' | 'b'} field
   * @returns {WeekGridRow}
   */
  const series = (id, term, s, field) => ({
    id,
    label: (
      <span>
        <TermLabel term={term} /> {marker(s)}
      </span>
    ),
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
  /**
   * @param {string} id
   * @param {'strategicBuffer' | 'protectionBuffer'} term
   * @param {'strategicBuffer' | 'protectionBuffer'} field
   * @param {boolean} fromInputs
   * @returns {WeekGridRow}
   */
  const buffer = (id, term, field, fromInputs) => ({
    id,
    label: (
      <span>
        <TermLabel term={term} />
        <span className="block text-xs text-text-tertiary">
          {fromInputs
            ? t('ltpIn.fromInputs')
            : term === 'strategicBuffer'
              ? t('ltpIn.fallbackSb')
              : ''}
        </span>
      </span>
    ),
    unit: row.uom,
    combine: 'sum',
    value: (week) => at(week)?.[field] ?? 0,
    cell: (week) => {
      const v = at(week)?.[field];
      return v === null || v === undefined ? (
        dash
      ) : (
        <Data data-testid={`dant-${id}-${rowKey}-${week}`}>{formatNumber(v)}</Data>
      );
    }
  });
  return {
    aRow: {
      label: (
        <span>
          <TermLabel term="ltpA" /> {marker('A')}
        </span>
      ),
      value: (week) => at(week)?.a ?? 0,
      cell: (week) => (
        <Data data-testid={`dant-ltp-${rowKey}-${week}`}>{formatNumber(at(week)?.a ?? 0)}</Data>
      )
    },
    extra: [
      series('ltpFestive', 'ltpFestive', 'Festive', 'festive'),
      series('ltpB', 'ltpB', 'B', 'b'),
      ...(li.strategicFromFestive
        ? [buffer('strategicBuffer', 'strategicBuffer', 'strategicBuffer', true)]
        : []),
      ...(li.protectionFromB
        ? [buffer('protectionBuffer', 'protectionBuffer', 'protectionBuffer', true)]
        : [])
    ]
  };
}
