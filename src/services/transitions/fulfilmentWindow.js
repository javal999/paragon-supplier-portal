// ─────────────────────────────────────────────────────────────────────────────
// FULFILMENT WINDOW ON A SUPPLIER CONFIRMATION — PEX-10 (BL-273), [M04 2].
//
// BR-01: every supplier confirmation shows the fulfilment window, from the
// confirmation date to that date + the material's lead time (DRC-6).
// BR-02: the format is "Fulfil by 3 Dec 2026 (lead time 28 days)".
//
// The confirmation date is its calendar day in Asia/Jakarta (WIB, UTC+7, no
// daylight saving), the hub's zone; the lead time is in calendar days, the unit
// DRC-6 states it in. A bare `YYYY-MM-DD` is taken as that day.
//
// Pure: no clock, no store. The caller passes the instant and the lead time.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
const WIB_OFFSET_MS = 7 * 3_600_000;

/**
 * The calendar day of an instant in Asia/Jakarta, `YYYY-MM-DD`.
 * @param {string} value An ISO timestamp, or a bare `YYYY-MM-DD`.
 * @returns {string}
 */
export function jakartaDay(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(Date.parse(value) + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * `from`: the confirmation day. `by`: `from` + `leadTimeDays`. Both `YYYY-MM-DD`.
 * @typedef {{ readonly from: string; readonly by: string; readonly leadTimeDays: number }} FulfilmentWindow
 */

/**
 * PEX-10 BR-01 — the window a confirmation commits the supplier to, or null
 * when the material has no lead time on record (nothing to count from).
 * @param {string} confirmedAt The confirmation instant (or day).
 * @param {number | null | undefined} leadTimeDays
 * @returns {FulfilmentWindow | null}
 */
export function fulfilmentWindow(confirmedAt, leadTimeDays) {
  if (typeof leadTimeDays !== 'number' || !Number.isFinite(leadTimeDays) || leadTimeDays < 0) {
    return null;
  }
  const from = jakartaDay(confirmedAt);
  const by = new Date(Date.parse(`${from}T00:00:00.000Z`) + leadTimeDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
  return { from, by, leadTimeDays };
}
