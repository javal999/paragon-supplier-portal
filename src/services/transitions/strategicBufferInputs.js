// ─────────────────────────────────────────────────────────────────────────────
// PEX-D10 / PEX-5 BR-05 — THE STRATEGIC BUFFER FROM THE LTP INPUTS, on the
// Capacity page's DRC-9a section.
//
//   strategic buffer = LTP Festive − LTP A, when LTP Festive is given;
//   the DRC-9a calculation (LTP − baseline) stays as the fallback when it is not.
//
// The DA grid shows the buffer per week (`ltpWeeks`). The DRC-9a section shows
// it per calendar month, so the weekly figures are summed over the Mondays of
// each month (the capacity heads-up's week-to-month rule). A month none of whose
// weeks the Festive upload covers keeps the DRC-9a figure [my call]: the
// fallback is per month, so a partial upload never blanks a month.
//
// Pure: weekly figures in, monthly figures out; rows in, rows out.
// ─────────────────────────────────────────────────────────────────────────────

/** @import { StrategicBufferRow } from './drcBufferRules' */

/**
 * `buffer`: the month's strategic buffer from LTP Festive − LTP A.
 * `weeks`: how many Mondays of the month the Festive upload covers.
 * @typedef {{ readonly buffer: number; readonly weeks: number }} FestiveMonth
 */

/**
 * Sum the weekly buffers into months by the month of each week's Monday. A
 * week with no Festive quantity (null) does not count.
 * @param {readonly string[]} weeks hub Mondays
 * @param {readonly (number | null)[]} weeklyBuffer same length as `weeks`
 * @returns {Record<string, FestiveMonth>}
 */
export function festiveBufferByMonth(weeks, weeklyBuffer) {
  /** @type {Record<string, FestiveMonth>} */
  const out = {};
  weeks.forEach((week, i) => {
    const v = weeklyBuffer[i];
    if (v === null || v === undefined) return;
    const month = week.slice(0, 7);
    const was = out[month] ?? { buffer: 0, weeks: 0 };
    out[month] = { buffer: was.buffer + v, weeks: was.weeks + 1 };
  });
  return out;
}

/**
 * A DRC-9a month with where its buffer came from, and the window and row that carry it.
 * @typedef {import('./drcBufferRules').FestiveMonth & { readonly source: StrategicBufferSource }} SourcedMonth
 * @typedef {Omit<import('./drcBufferRules').WindowBuffer, 'months'> & { readonly months: readonly SourcedMonth[] }} SourcedWindow
 * @typedef {Omit<StrategicBufferRow, 'windows'> & { readonly windows: readonly SourcedWindow[] }} SourcedRow
 */

/**
 * The source of a month's figure: `festive` when LTP Festive gave it, `drc9a`
 * (LTP − baseline) otherwise.
 * @typedef {'festive' | 'drc9a'} StrategicBufferSource
 */

/**
 * Put LTP Festive − LTP A into the DRC-9a rows where a month has it. Every other
 * month, and every pair with no Festive upload, keeps the DRC-9a figure.
 * @param {readonly StrategicBufferRow[]} rows
 * @param {ReadonlyMap<string, Readonly<Record<string, FestiveMonth>>>} festive `supplierId|materialCode` → months
 * @returns {SourcedRow[]}
 */
export function withFestiveBuffer(rows, festive) {
  return rows.map((r) => {
    const mine = festive.get(`${r.supplierId}|${r.materialCode}`) ?? {};
    return {
      ...r,
      windows: r.windows.map((w) => ({
        ...w,
        months: w.months.map((m) => {
          const f = mine[m.month];
          return f
            ? { ...m, buffer: f.buffer, source: /** @type {const} */ ('festive') }
            : { ...m, source: /** @type {const} */ ('drc9a') };
        })
      }))
    };
  });
}
